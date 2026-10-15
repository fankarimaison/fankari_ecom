"use client";

import { formatPrice } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/** Subtotal → discount → VAT → shipping → total rows for cart, checkout and orders. */
export function PriceSummary({
  totals,
  paymentMethod,
  className,
}: {
  totals: { subtotal: number; discount: number; vat: number; shipping: number; total: number };
  /** shows a Payment row; "" renders "Not selected" */
  paymentMethod?: string;
  className?: string;
}) {
  return (
    <dl className={cn("space-y-2 text-sm", className)}>
      <Row label="Subtotal (excl. VAT)" value={formatPrice(totals.subtotal)} />
      {totals.discount > 0 && (
        <Row
          label="Discount"
          value={`−${formatPrice(totals.discount)}`}
          valueClassName="text-emerald-700"
        />
      )}
      <Row label="VAT" value={formatPrice(totals.vat)} />
      <Row
        label="Shipping"
        value={totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)}
        valueClassName={totals.shipping === 0 ? "text-emerald-700" : undefined}
      />
      {paymentMethod !== undefined && (
        <Row
          label="Payment"
          value={paymentMethod ? paymentMethodLabel(paymentMethod) : "Not selected"}
          valueClassName={paymentMethod ? undefined : "text-muted-foreground"}
        />
      )}
      <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
        <dt>Total</dt>
        <dd>{formatPrice(totals.total)}</dd>
      </div>
    </dl>
  );
}

/** One-line version for compact order lists: "Subtotal ₹… · VAT ₹… · Shipping free · Cash on Delivery". */
export function priceSummaryText(order: {
  subtotal: number;
  discount: number;
  vat: number;
  shipping: number;
  paymentMethod: string;
}): string {
  return [
    `Subtotal ${formatPrice(order.subtotal)}`,
    order.discount > 0 && `Discount −${formatPrice(order.discount)}`,
    `VAT ${formatPrice(order.vat)}`,
    `Shipping ${order.shipping === 0 ? "free" : formatPrice(order.shipping)}`,
    paymentMethodLabel(order.paymentMethod),
  ]
    .filter(Boolean)
    .join(" · ");
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-medium", valueClassName)}>{value}</dd>
    </div>
  );
}
