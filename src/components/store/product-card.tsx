"use client";

import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import type { Product } from "./api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/** Product grid card — square image, serif name, price, stock badges. */
export function ProductCard({ product }: { product: Product }) {
  const navigate = useStore((s) => s.navigate);
  const soldOut = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  return (
    <motion.button
      type="button"
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      onClick={() => navigate({ name: "product", productId: product.id })}
      disabled={soldOut}
      className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
      aria-label={`${product.name} — ${formatPrice(product.price)}${soldOut ? " (sold out)" : ""}`}
    >
      <Card className="overflow-hidden border-border/80 bg-card pt-0 gap-0 shadow-sm transition-shadow group-hover:shadow-md">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-900/45">
              <span className="rounded-full bg-stone-900/85 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-stone-100">
                Sold out
              </span>
            </div>
          )}
          {product.featured && !soldOut && (
            <Badge className="absolute left-2 top-2 bg-accent text-accent-foreground border border-amber-200/60 shadow-sm">
              Featured
            </Badge>
          )}
          {lowStock && (
            <Badge className="absolute right-2 top-2 bg-amber-600 text-amber-50 border-amber-600 shadow-sm">
              Only {product.stock} left
            </Badge>
          )}
        </div>
        <CardContent className="p-3 sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {product.category}
          </p>
          <h3 className="font-display mt-1 line-clamp-2 min-h-[2.5rem] text-[15px] leading-snug font-semibold text-foreground sm:text-base">
            {product.name}
          </h3>
          <p className="mt-1.5 text-sm font-semibold text-primary sm:text-[15px]">
            {formatPrice(product.price)}
          </p>
        </CardContent>
      </Card>
    </motion.button>
  );
}

/** Skeleton matching ProductCard layout. */
export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
      <div className="aspect-square animate-pulse bg-muted" />
      <div className="p-3 space-y-2 sm:p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
