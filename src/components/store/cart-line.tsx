"use client";

import { useCallback } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBag } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { type Product } from "./api";
import { useCart } from "./hooks";
import { Button } from "@/components/ui/button";

/**
 * Shared bag actions (drawer + cart view + product detail). The bag lives in
 * the browser, so these are instant; useCart re-prices it.
 */
export function useCartMutations() {
  const { toast } = useToast();
  const setQuantity = useBag((s) => s.setQuantity);
  const remove = useBag((s) => s.remove);

  /** Add then (optionally) run a follow-up, e.g. go to checkout. */
  const addToCart = useCallback(
    (product: Product, quantity = 1, onDone?: () => void) => {
      const inBag =
        useBag.getState().lines.find((l) => l.productId === product.id)?.quantity ?? 0;
      if (inBag + quantity > product.stock) {
        toast({
          title: "Not enough stock",
          description:
            inBag > 0
              ? `Only ${product.stock} left — you already have ${inBag} in your bag.`
              : `Only ${product.stock} left in stock.`,
          variant: "destructive",
        });
        return;
      }
      useBag.getState().add(product.id, quantity);
      toast({
        title: "Added to your bag",
        description: `${product.name} × ${quantity}`,
      });
      onDone?.();
    },
    [toast]
  );

  return { addToCart, setQuantity, remove };
}

interface CartLineItemProps {
  itemId: string;
  name: string;
  image: string | null;
  price: number;
  quantity: number;
  maxQuantity: number;
  compact?: boolean;
}

/** One cart line — image, name, price, stepper, remove. */
export function CartLineItem({
  itemId,
  name,
  image,
  price,
  quantity,
  maxQuantity,
  compact,
}: CartLineItemProps) {
  const { setQuantity, remove } = useCartMutations();

  return (
    <div className="flex gap-3 py-3">
      <div
        className={`shrink-0 overflow-hidden rounded-lg bg-muted ${
          compact ? "size-16" : "size-20 sm:size-24"
        }`}
      >
        {image ? (
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Minus className="size-4" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatPrice(price)} each
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-foreground">
            {formatPrice(price * quantity)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center rounded-full border border-input bg-card">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 rounded-full"
              disabled={quantity <= 1}
              onClick={() => setQuantity(itemId, quantity - 1)}
              aria-label={`Decrease ${name} quantity`}
            >
              <Minus className="size-3.5" />
            </Button>
            <span className="min-w-6 text-center text-sm font-semibold tabular-nums">
              {quantity}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 rounded-full"
              disabled={quantity >= Math.max(1, maxQuantity)}
              onClick={() => setQuantity(itemId, quantity + 1)}
              aria-label={`Increase ${name} quantity`}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-full text-muted-foreground hover:text-destructive"
            onClick={() => remove(itemId)}
            aria-label={`Remove ${name} from bag`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Convenience: priced bag for drawer/cart view/checkout. */
export function useCartState() {
  const { data: cart, isLoading } = useCart();
  return { cart, isLoading };
}
