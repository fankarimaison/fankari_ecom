"use client";

import { formatPrice } from "@/lib/format";
import { isWhatsAppNumber, normalizeWhatsAppNumber } from "@/lib/whatsapp";
import type { Order } from "./api";

/** Pre-filled message the buyer sends the seller to confirm an order. */
export function whatsAppOrderMessage(order: Order, brandName: string): string {
  const lines = [
    `Hello ${brandName}! I'd like to confirm my order *${order.orderNumber}*.`,
    "",
    "*Items*",
    ...order.items.map(
      (i) => `• ${i.name} × ${i.quantity} — ${formatPrice(i.price * i.quantity)}`
    ),
    "",
    `Subtotal: ${formatPrice(order.subtotal)}`,
    ...(order.discount > 0 ? [`Discount: −${formatPrice(order.discount)}`] : []),
    `VAT: ${formatPrice(order.vat)}`,
    `Shipping: ${order.shipping === 0 ? "Free" : formatPrice(order.shipping)}`,
    `*Total: ${formatPrice(order.total)}*`,
    "",
    "*Deliver to*",
    order.customerName,
    `${order.address}, ${order.city}${order.postalCode ? ` ${order.postalCode}` : ""}`,
    ...(order.phone ? [`WhatsApp: ${order.phone}`] : []),
    `Email: ${order.email}`,
    ...(order.notes ? ["", `Notes: ${order.notes}`] : []),
  ];
  return lines.join("\n");
}

/**
 * wa.me link that opens a chat with the seller with the order pre-filled.
 * Without a configured seller number WhatsApp asks the buyer to pick a chat.
 */
export function whatsAppOrderUrl(
  order: Order,
  sellerNumber: string | undefined,
  brandName: string
): string {
  const digits = normalizeWhatsAppNumber(sellerNumber);
  const text = encodeURIComponent(whatsAppOrderMessage(order, brandName));
  return `https://wa.me/${isWhatsAppNumber(digits) ? digits : ""}?text=${text}`;
}
