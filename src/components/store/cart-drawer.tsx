"use client";

import { ShoppingBag, Truck } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import { amountToFreeShipping, unitPrice } from "@/lib/pricing";
import { useShipping } from "./hooks";
import { useCartState, CartLineItem } from "./cart-line";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

/** Right-side bag drawer, shared across every view. */
export function CartDrawer() {
  const cartOpen = useStore((s) => s.cartOpen);
  const setCartOpen = useStore((s) => s.setCartOpen);
  const navigate = useStore((s) => s.navigate);
  const { user, cart, isLoading } = useCartState();

  const items = cart?.items ?? [];
  // After discount, incl. VAT — what free shipping is measured against
  const itemsTotal = cart?.itemsTotal ?? 0;
  const count = cart?.count ?? 0;
  const shipping = useShipping();
  // null when the free-shipping waiver is switched off in Admin
  const toFree = amountToFreeShipping(itemsTotal, shipping);

  const goCheckout = () => {
    setCartOpen(false);
    if (!user) {
      navigate({ name: "account" });
      return;
    }
    navigate({ name: "checkout" });
  };

  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md p-0">
        <SheetHeader className="border-b border-border/70 p-4 sm:p-5">
          <SheetTitle className="font-display text-lg">
            Your Bag {count > 0 && <span className="text-muted-foreground">({count})</span>}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Review the items in your shopping bag.
          </SheetDescription>
        </SheetHeader>

        {!user ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="size-6 text-muted-foreground" aria-hidden />
            </span>
            <div>
              <p className="font-medium">Sign in to see your bag</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your bag is saved to your account.
              </p>
            </div>
            <Button
              size="lg"
              className="min-h-11 rounded-full px-8"
              onClick={() => {
                setCartOpen(false);
                navigate({ name: "account" });
              }}
            >
              Sign in
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex-1 space-y-4 p-5">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-16 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-8 w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="size-6 text-muted-foreground" aria-hidden />
            </span>
            <div>
              <p className="font-medium">Your bag is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Fill it with something handmade.
              </p>
            </div>
            <Button
              size="lg"
              variant="outline"
              className="min-h-11 rounded-full px-8"
              onClick={() => {
                setCartOpen(false);
                navigate({ name: "home" });
              }}
            >
              Continue shopping
            </Button>
          </div>
        ) : (
          <>
            {/* Free shipping progress */}
            {toFree !== null && shipping.fee > 0 && (
              <div className="border-b border-border/70 px-5 py-3">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground/80">
                  <Truck className="size-4 shrink-0 text-primary" aria-hidden />
                  {toFree > 0 ? (
                    <span>
                      {formatPrice(toFree)} away from{" "}
                      <span className="font-semibold text-primary">free shipping</span>
                    </span>
                  ) : (
                    <span className="text-secondary-foreground">
                      You&apos;ve unlocked <span className="font-semibold">free shipping!</span>
                    </span>
                  )}
                </div>
                <Progress
                  value={
                    shipping.freeShippingThreshold > 0
                      ? Math.min(100, (itemsTotal / shipping.freeShippingThreshold) * 100)
                      : 100
                  }
                  className="mt-2 h-1.5"
                />
              </div>
            )}

            <div className="flex-1 divide-y divide-border/60 overflow-y-auto px-5">
              {items.map((item) => (
                <CartLineItem
                  key={item.id}
                  itemId={item.id}
                  name={item.product.name}
                  image={item.product.image}
                  price={unitPrice(item.product)}
                  quantity={item.quantity}
                  maxQuantity={item.product.stock}
                  compact
                />
              ))}
            </div>

            <div className="border-t border-border/70 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Items total (incl. VAT)</span>
                <span className="font-semibold">{formatPrice(itemsTotal)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Shipping calculated at checkout. Payment: Cash on Delivery.
              </p>
              <Button
                size="lg"
                className="mt-4 min-h-11 w-full rounded-full text-base"
                onClick={goCheckout}
              >
                Checkout
              </Button>
              <Button
                variant="ghost"
                className="mt-1 min-h-11 w-full rounded-full"
                onClick={() => setCartOpen(false)}
              >
                Continue shopping
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
