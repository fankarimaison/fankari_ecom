"use client";

import { ArrowRight, ShoppingBag } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import { amountToFreeShipping, unitPrice } from "@/lib/pricing";
import { useShipping } from "../hooks";
import { PriceSummary } from "../price-summary";
import { CartLineItem, useCartState } from "../cart-line";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CartView() {
  const navigate = useStore((s) => s.navigate);
  const { user, cart, isLoading } = useCartState();
  const shipping = useShipping();

  const items = cart?.items ?? [];
  // null when the free-shipping waiver is switched off in Admin
  const toFree = cart ? amountToFreeShipping(cart.itemsTotal, shipping) : null;

  if (!user) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-24 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-muted">
          <ShoppingBag className="size-6 text-muted-foreground" aria-hidden />
        </span>
        <div>
          <p className="font-display text-xl font-semibold">Sign in to see your bag</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your bag is saved to your account so you can pick up where you left off.
          </p>
        </div>
        <Button
          size="lg"
          className="min-h-11 rounded-full px-8"
          onClick={() => navigate({ name: "account" })}
        >
          Sign in
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-9 w-36" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="size-24 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-9 w-32" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-24 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-muted">
          <ShoppingBag className="size-7 text-muted-foreground" aria-hidden />
        </span>
        <div>
          <p className="font-display text-2xl font-semibold">Your bag is empty</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Handmade totes are waiting — go find your favorite.
          </p>
        </div>
        <Button
          size="lg"
          className="mt-2 min-h-11 rounded-full px-8"
          onClick={() => navigate({ name: "home" })}
        >
          Browse the collection
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        Your Bag <span className="text-muted-foreground">({cart?.count ?? 0})</span>
      </h1>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        {/* Lines */}
        <Card className="p-0 gap-0">
          <CardContent className="divide-y divide-border/60 p-2 sm:p-4">
            {items.map((item) => (
              <CartLineItem
                key={item.id}
                itemId={item.id}
                name={item.product.name}
                image={item.product.image}
                price={unitPrice(item.product)}
                quantity={item.quantity}
                maxQuantity={item.product.stock}
              />
            ))}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="sticky top-32">
          <CardHeader>
            <CardTitle className="font-display text-lg">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cart && <PriceSummary totals={cart} />}
            {cart && cart.shipping > 0 && toFree !== null && toFree > 0 && (
              <p className="rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">
                Add {formatPrice(toFree)} more for free
                shipping.
              </p>
            )}
            <Button
              size="lg"
              className="mt-2 min-h-12 w-full rounded-full text-base"
              onClick={() => navigate({ name: "checkout" })}
            >
              Proceed to Checkout
              <ArrowRight className="size-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              className="min-h-11 w-full rounded-full"
              onClick={() => navigate({ name: "home" })}
            >
              Continue shopping
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
