"use client";

import { formatPrice } from "@/lib/format";
import { listPrice, unitPrice, type Priced } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/**
 * Customer-facing price: discounted and incl. VAT, with the original price
 * struck through and a "−20%" tag when the product is on sale.
 */
export function ProductPrice({
  product,
  className,
  showVatNote = false,
}: {
  product: Priced;
  className?: string;
  showVatNote?: boolean;
}) {
  const onSale = product.discountPercent > 0;
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className="font-semibold text-primary">{formatPrice(unitPrice(product))}</span>
      {onSale && (
        <>
          <span className="text-[0.85em] text-muted-foreground line-through">
            {formatPrice(listPrice(product))}
          </span>
          <span className="rounded-full bg-brand px-1.5 py-0.5 text-[0.7em] font-semibold leading-none text-white">
            −{product.discountPercent}%
          </span>
        </>
      )}
      {showVatNote && (
        <span className="basis-full text-xs font-normal text-muted-foreground">
          {product.vatRate > 0 ? `Incl. ${product.vatRate}% VAT` : "No VAT"}
        </span>
      )}
    </div>
  );
}
