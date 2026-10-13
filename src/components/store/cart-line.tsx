"use client";

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import {
  apiDelete,
  apiPost,
  apiPut,
  ApiError,
  type CartResponse,
  type Product,
} from "./api";
import { useCart, useMe } from "./hooks";
import { Button } from "@/components/ui/button";

/** Shared cart mutation logic (drawer + cart view + product detail). */
export function useCartMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useStore((s) => s.navigate);

  const applyCart = useCallback(
    (data: CartResponse) => {
      queryClient.setQueryData(["cart"], data);
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    [queryClient]
  );

  /** 401 → friendly toast + account view (per spec). */
  const onAuthError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        toast({
          title: "Please sign in",
          description: "You need an account to use your bag.",
          variant: "destructive",
        });
        navigate({ name: "account" });
      } else {
        toast({
          title: "Something went wrong",
          description:
            error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    },
    [toast, navigate]
  );

  const addItem = useMutation({
    mutationFn: async ({
      productId,
      quantity = 1,
    }: {
      productId: string;
      quantity?: number;
    }) => apiPost<CartResponse>("/api/cart", { productId, quantity }),
    onSuccess: applyCart,
    onError: onAuthError,
  });

  const updateQty = useMutation({
    mutationFn: async ({
      itemId,
      quantity,
    }: {
      itemId: string;
      quantity: number;
    }) => apiPut<CartResponse>(`/api/cart/${itemId}`, { quantity }),
    onSuccess: applyCart,
    onError: onAuthError,
  });

  const removeItem = useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) =>
      apiDelete<CartResponse>(`/api/cart/${itemId}`),
    onSuccess: applyCart,
    onError: onAuthError,
  });

  /** Add then (optionally) run a follow-up, e.g. navigate to cart. */
  const addToCart = useCallback(
    async (product: Product, quantity = 1, onDone?: () => void) => {
      try {
        const data = await addItem.mutateAsync({ productId: product.id, quantity });
        toast({
          title: "Added to your bag",
          description: `${product.name} × ${quantity}`,
        });
        onDone?.();
        return data;
      } catch {
        // error handling done in onError
        return undefined;
      }
    },
    [addItem, toast]
  );

  return { addItem, updateQty, removeItem, addToCart };
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
  const { updateQty, removeItem } = useCartMutations();

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
              disabled={updateQty.isPending || quantity <= 1}
              onClick={() => updateQty.mutate({ itemId, quantity: quantity - 1 })}
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
              disabled={
                updateQty.isPending || quantity >= Math.max(1, maxQuantity)
              }
              onClick={() => updateQty.mutate({ itemId, quantity: quantity + 1 })}
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
            disabled={removeItem.isPending}
            onClick={() => removeItem.mutate({ itemId })}
            aria-label={`Remove ${name} from bag`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Convenience: cart state + login flag for drawer/cart view. */
export function useCartState() {
  const { data: user } = useMe();
  const { data: cart, isLoading } = useCart(!!user);
  return { user, cart, isLoading };
}
