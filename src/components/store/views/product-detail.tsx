"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Droplets,
  Layers,
  PackageCheck,
  Ruler,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { apiGet, productsUrl, type Product } from "../api";
import { useCartMutations } from "../cart-line";
import { ProductCard, ProductCardSkeleton } from "../product-card";
import { QtyStepper } from "../qty-stepper";
import { ProductPrice } from "../product-price";
import { ProductGallery } from "../product-gallery";
import { shippingPolicyText, useContent, useShipping } from "../hooks";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export function ProductDetailView({ productId }: { productId: string }) {
  const navigate = useStore((s) => s.navigate);
  const [qty, setQty] = useState(1);
  const shipping = useShipping();
  const { data: content } = useContent();
  const { data: product, isLoading, isError, error } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const data = await apiGet<{ product: Product }>(`/api/products/${productId}`);
      return data.product;
    },
  });

  const related = useQuery({
    queryKey: ["products", { category: product?.category, related: productId }],
    queryFn: async () => {
      const data = await apiGet<{ products: Product[] }>(
        productsUrl({ category: product?.category })
      );
      return data.products.filter((p) => p.id !== productId).slice(0, 4);
    },
    enabled: !!product?.category,
  });

  const { addToCart } = useCartMutations();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-5 w-40" />
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-24 text-center">
        <PackageCheck className="size-10 text-muted-foreground" aria-hidden />
        <div>
          <p className="font-display text-xl font-semibold">Product not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "It may have sold out or been retired."}
          </p>
        </div>
        <Button className="min-h-11 rounded-full" onClick={() => navigate({ name: "home" })}>
          Back to the shop
        </Button>
      </div>
    );
  }

  // The product's own care instructions, else the default from Admin →
  // Content. One tip per line; a leading "-", "•" or "*" is dropped.
  const careText = product.careInstructions?.trim() || content?.defaultCareInstructions || "";
  const careTips = careText
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);

  const soldOut = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={() => navigate({ name: "home" })}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-accent-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to the shop
      </button>

      <div className="mt-4 grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Photos & videos */}
        <ProductGallery
          name={product.name}
          image={product.image}
          gallery={product.gallery ?? []}
          soldOut={soldOut}
        />

        {/* Details */}
        <div className="flex flex-col">
          <Badge
            variant="outline"
            className="w-fit border-accent-foreground/30 text-accent-foreground"
          >
            {product.category}
          </Badge>
          <h1 className="font-display mt-3 text-3xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-4xl">
            {product.name}
          </h1>
          <ProductPrice product={product} showVatNote className="mt-3 text-2xl" />

          <div className="mt-2">
            {soldOut ? (
              <Badge variant="secondary" className="bg-stone-200 text-stone-700">
                Sold out
              </Badge>
            ) : lowStock ? (
              <Badge className="bg-amber-600 text-amber-50">
                Only {product.stock} left in stock
              </Badge>
            ) : (
              <Badge className="bg-secondary text-secondary-foreground">
                In stock · ships in 2–3 days
              </Badge>
            )}
          </div>

          <p className="mt-5 leading-relaxed text-stone-600">{product.description}</p>

          {product.materials || product.dimensions ? (
            <div className="mt-5 space-y-2.5 rounded-xl border border-border/80 bg-card p-4 text-sm">
              {product.materials && (
                <div className="flex items-start gap-3">
                  <Layers className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <p>
                    <span className="font-medium text-foreground">Materials: </span>
                    <span className="text-muted-foreground">{product.materials}</span>
                  </p>
                </div>
              )}
              {product.dimensions && (
                <div className="flex items-start gap-3">
                  <Ruler className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <p>
                    <span className="font-medium text-foreground">Dimensions: </span>
                    <span className="text-muted-foreground">{product.dimensions}</span>
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {careTips.length > 0 && (
            <section
              aria-labelledby="care-heading"
              className="mt-4 rounded-xl border border-teal/15 bg-teal-light p-4 text-sm"
            >
              <h2
                id="care-heading"
                className="flex items-center gap-2 font-semibold text-teal"
              >
                <Droplets className="size-4 shrink-0" aria-hidden />
                Care instructions
              </h2>
              <ul className="mt-2 space-y-1.5 text-foreground/80">
                {careTips.map((tip, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal" aria-hidden />
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Separator className="my-6" />

          {/* Quantity + actions */}
          <div className="flex flex-wrap items-center gap-4">
            {!soldOut && (
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Quantity
                </p>
                <QtyStepper
                  value={qty}
                  max={product.stock}
                  onChange={setQty}
                />
              </div>
            )}
            <div className="flex flex-1 flex-wrap gap-3">
              <Button
                size="lg"
                disabled={soldOut}
                className="min-h-12 min-w-44 flex-1 rounded-full text-base"
                onClick={() => addToCart(product, qty)}
              >
                <ShoppingBag className="size-4.5" aria-hidden />
                Add to Cart
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={soldOut}
                className="min-h-12 min-w-36 flex-1 rounded-full bg-card text-base"
                onClick={() =>
                  addToCart(product, qty, () => navigate({ name: "checkout" }))
                }
              >
                Buy Now
              </Button>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="size-4 text-primary" aria-hidden />
            {shippingPolicyText(shipping)}
          </div>
        </div>
      </div>

      {/* Related */}
      <section aria-labelledby="related-heading" className="mt-14 lg:mt-20">
        <h2 id="related-heading" className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
          You may also like
        </h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {related.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
          ) : (related.data ?? []).length === 0 ? (
            <p className="col-span-full text-sm text-muted-foreground">
              Explore the rest of the collection from the shop page.
            </p>
          ) : (
            (related.data ?? []).map((p) => <ProductCard key={p.id} product={p} />)
          )}
        </div>
      </section>
    </div>
  );
}
