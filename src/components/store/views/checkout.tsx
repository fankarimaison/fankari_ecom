"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { formatPrice, shippingFor } from "@/lib/format";
import { apiPost, type Order } from "../api";
import { useCartState } from "../cart-line";
import { useMe } from "../hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const checkoutSchema = z.object({
  customerName: z.string().min(1, "Please tell us your name"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  address: z.string().min(1, "A shipping address is required"),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export function CheckoutView() {
  const { toast } = useToast();
  const navigate = useStore((s) => s.navigate);
  const queryClient = useQueryClient();
  const { data: user, isLoading: meLoading } = useMe();
  const { cart, isLoading: cartLoading } = useCartState();

  // Prefill from the signed-in user — RHF re-syncs when `values` changes.
  const prefill = useMemo<CheckoutForm>(
    () => ({
      customerName: user?.name ?? "",
      email: user?.email ?? "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      notes: "",
    }),
    [user]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    values: prefill,
  });

  // Redirect signed-out visitors to the account view (per spec).
  useEffect(() => {
    if (!meLoading && !user) {
      toast({
        title: "Please sign in",
        description: "You need an account to check out.",
        variant: "destructive",
      });
      navigate({ name: "account" });
    }
  }, [meLoading, user, toast, navigate]);

  const placeOrder = useMutation({
    mutationFn: async (values: CheckoutForm) => {
      const data = await apiPost<{ order: Order }>("/api/orders", values);
      return data.order;
    },
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({
        title: "Order placed — thank you!",
        description: `Order ${order.orderNumber} is confirmed.`,
      });
      navigate({ name: "order-success", orderId: order.id });
    },
    onError: (error) => {
      toast({
        title: "Could not place your order",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (meLoading || !user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-9 w-40" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const shipping = shippingFor(subtotal);
  const total = subtotal + shipping;

  if (!cartLoading && items.length === 0) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-24 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-muted">
          <ShoppingBag className="size-6 text-muted-foreground" aria-hidden />
        </span>
        <p className="font-display text-xl font-semibold">Your bag is empty</p>
        <p className="text-sm text-muted-foreground">
          Add a tote before checking out.
        </p>
        <Button
          size="lg"
          className="min-h-11 rounded-full px-8"
          onClick={() => navigate({ name: "home" })}
        >
          Browse the collection
        </Button>
      </div>
    );
  }

  const fieldError = (field: keyof CheckoutForm) =>
    errors[field] ? (
      <p className="mt-1 text-xs font-medium text-destructive" role="alert">
        {errors[field]?.message}
      </p>
    ) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        Checkout
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{user.email}</span>
      </p>

      <form
        onSubmit={handleSubmit((values) => placeOrder.mutate(values))}
        className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_380px]"
        noValidate
      >
        {/* Shipping details */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Shipping details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="customerName">Full name</Label>
              <Input
                id="customerName"
                className="mt-1.5 min-h-11"
                autoComplete="name"
                aria-invalid={!!errors.customerName}
                {...register("customerName")}
              />
              {fieldError("customerName")}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                className="mt-1.5 min-h-11"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {fieldError("email")}
            </div>
            <div>
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                className="mt-1.5 min-h-11"
                autoComplete="tel"
                {...register("phone")}
              />
            </div>
            <div>
              <Label htmlFor="postalCode">Postal code (optional)</Label>
              <Input
                id="postalCode"
                className="mt-1.5 min-h-11"
                autoComplete="postal-code"
                {...register("postalCode")}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address">Street address</Label>
              <Input
                id="address"
                className="mt-1.5 min-h-11"
                autoComplete="street-address"
                aria-invalid={!!errors.address}
                {...register("address")}
              />
              {fieldError("address")}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                className="mt-1.5 min-h-11"
                autoComplete="address-level2"
                aria-invalid={!!errors.city}
                {...register("city")}
              />
              {fieldError("city")}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notes">Order notes (optional)</Label>
              <Textarea
                id="notes"
                rows={3}
                className="mt-1.5"
                placeholder="Gift wrapping, delivery hints…"
                {...register("notes")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="sticky top-32">
          <CardHeader>
            <CardTitle className="font-display text-lg">Your order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cartLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <ul className="max-h-56 space-y-3 overflow-y-auto pr-1">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {item.quantity}
                      </span>
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">
                      {item.product.name}
                    </p>
                    <p className="text-sm font-semibold">
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="font-medium">
                {shipping === 0 ? (
                  <span className="text-secondary-foreground">FREE</span>
                ) : (
                  formatPrice(shipping)
                )}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={placeOrder.isPending || cartLoading}
              className="mt-2 min-h-12 w-full rounded-full text-base"
            >
              {placeOrder.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {placeOrder.isPending ? "Placing order…" : `Place order · ${formatPrice(total)}`}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 w-full rounded-full"
              onClick={() => navigate({ name: "cart" })}
            >
              Back to bag
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
