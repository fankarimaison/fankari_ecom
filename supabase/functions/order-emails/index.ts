// Supabase Edge Function: order emails via Brevo.
//
// Called by the notify_order_emails trigger (supabase/schema.sql) whenever an
// order is inserted. Sends:
//   1. an order confirmation to the customer
//   2. a new-order alert to the shop (ADMIN_EMAIL)
//
// Secrets (supabase secrets set â€¦):
//   BREVO_API_KEY                Brevo â†’ SMTP & API â†’ API keys
//   EMAIL_FROM                   sender verified in Brevo, e.g. orders@fankarimaison.com
//   EMAIL_FROM_NAME              optional, default "Fankari Maison"
//   ADMIN_EMAIL                  where new-order alerts go
//   ORDER_EMAIL_WEBHOOK_SECRET   same value as the Vault secret the trigger sends
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
//
// Deploy without JWT verification (the trigger authenticates with the secret):
//   npx supabase functions deploy order-emails --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2.117.3";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  discount: number;
  vat: number;
  shipping: number;
  total: number;
  payment_method: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  notes: string;
  created_at: string;
  items: OrderItem[];
}

const PAYMENT_LABELS: Record<string, string> = {
  WHATSAPP: "Arranged on WhatsApp",
  COD: "Cash on Delivery",
};

const env = (name: string) => Deno.env.get(name) ?? "";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const money = (n: number | string) => inr.format(Number(n));

/** Escape customer-entered text before putting it in HTML. */
function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Constant-time string comparison for the webhook secret. */
function safeEqual(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function itemsTable(order: Order): string {
  const rows = order.items
    .map(
      (i) => `<tr>
        <td style="padding:6px 0">${esc(i.name)} Ã— ${i.quantity}</td>
        <td style="padding:6px 0;text-align:right">${money(Number(i.price) * i.quantity)}</td>
      </tr>`,
    )
    .join("");
  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:3px 0;color:#5f6b6a${bold ? ";font-weight:600;color:#1f2a29" : ""}">${label}</td>
      <td style="padding:3px 0;text-align:right${bold ? ";font-weight:600" : ""}">${value}</td></tr>`;
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">
    ${rows}
    <tr><td colspan="2" style="border-top:1px solid #eddfd8;padding-top:6px"></td></tr>
    ${line("Subtotal (excl. VAT)", money(order.subtotal))}
    ${Number(order.discount) > 0 ? line("Discount", `âˆ’${money(order.discount)}`) : ""}
    ${line("VAT", money(order.vat))}
    ${line("Shipping", Number(order.shipping) === 0 ? "Free" : money(order.shipping))}
    ${line("Payment", PAYMENT_LABELS[order.payment_method] ?? esc(order.payment_method))}
    ${line("Total", money(order.total), true)}
  </table>`;
}

function address(order: Order): string {
  return `${esc(order.customer_name)}<br>${esc(order.address)}, ${esc(order.city)}${
    order.postal_code ? ` ${esc(order.postal_code)}` : ""
  }${order.phone ? `<br>${esc(order.phone)}` : ""}`;
}

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#fdf9f7;font-family:Georgia,'Times New Roman',serif;color:#1f2a29">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <p style="font-size:22px;font-weight:600;color:#cd2a00;margin:0 0 16px">Fankari Maison</p>
    <div style="background:#ffffff;border:1px solid #eddfd8;border-radius:12px;padding:24px;font-family:Arial,Helvetica,sans-serif">
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      ${body}
    </div>
  </div></body></html>`;
}

function customerEmail(order: Order): { subject: string; html: string } {
  return {
    subject: `Your Fankari Maison order ${order.order_number}`,
    html: layout(
      `Thank you, ${esc(order.customer_name.split(" ")[0] || order.customer_name)}!`,
      `<p style="font-size:14px;line-height:1.6">We've received your order
        <strong>${esc(order.order_number)}</strong> for
        <strong>${money(order.total)}</strong>. We'll confirm it and share payment
        details with you on WhatsApp.</p>
      ${itemsTable(order)}
      <p style="font-size:14px;margin:18px 0 4px;font-weight:600">Delivering to</p>
      <p style="font-size:14px;line-height:1.6;margin:0">${address(order)}</p>
      <p style="font-size:12px;color:#5f6b6a;margin-top:22px">Keep your order number â€”
        mention it when you message us on WhatsApp.</p>`,
    ),
  };
}

function adminEmail(order: Order): { subject: string; html: string } {
  return {
    subject: `New order ${order.order_number} â€” ${money(order.total)}`,
    html: layout(
      `New order ${esc(order.order_number)}`,
      `<p style="font-size:14px;line-height:1.6">${esc(order.customer_name)} (${esc(order.email)})
        placed an order for <strong>${money(order.total)}</strong>,
        ${PAYMENT_LABELS[order.payment_method] ?? esc(order.payment_method)}.</p>
      ${itemsTable(order)}
      <p style="font-size:14px;margin:18px 0 4px;font-weight:600">Ship to</p>
      <p style="font-size:14px;line-height:1.6;margin:0">${address(order)}</p>
      ${order.notes ? `<p style="font-size:14px;margin:12px 0 0"><strong>Notes:</strong> ${esc(order.notes)}</p>` : ""}
      <p style="font-size:12px;color:#5f6b6a;margin-top:22px">Manage it in the studio: Admin â†’ Orders.</p>`,
    ),
  };
}

async function sendBrevo(to: { email: string; name?: string }, mail: { subject: string; html: string }) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": env("BREVO_API_KEY"),
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: env("EMAIL_FROM"), name: env("EMAIL_FROM_NAME") || "Fankari Maison" },
      to: [to],
      subject: mail.subject,
      htmlContent: mail.html,
    }),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!safeEqual(req.headers.get("x-webhook-secret") ?? "", env("ORDER_EMAIL_WEBHOOK_SECRET"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { orderId } = (await req.json().catch(() => ({}))) as { orderId?: string };
  if (!orderId) return new Response("orderId required", { status: 400 });

  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: order, error } = await supabase
    .from("orders")
    .select("*, items:order_items(name, price, quantity)")
    .eq("id", orderId)
    .maybeSingle<Order>();
  if (error || !order) {
    console.error("order-emails: order lookup failed", orderId, error?.message);
    return new Response("Order not found", { status: 404 });
  }

  const results = await Promise.allSettled([
    sendBrevo({ email: order.email, name: order.customer_name }, customerEmail(order)),
    env("ADMIN_EMAIL")
      ? sendBrevo({ email: env("ADMIN_EMAIL") }, adminEmail(order))
      : Promise.resolve(),
  ]);
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  for (const f of failures) console.error("order-emails:", order.order_number, String(f.reason));

  return new Response(JSON.stringify({ sent: results.length - failures.length, failed: failures.length }), {
    status: failures.length ? 502 : 200,
    headers: { "content-type": "application/json" },
  });
});
