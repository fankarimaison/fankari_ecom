"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBag } from "@/lib/cart";
import { useStore } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import { PAYMENT_METHODS, unitPrice } from "@/lib/pricing";
import { PriceSummary } from "../price-summary";
import { apiPost, type Order } from "../api";
import { useCartState } from "../cart-line";
import { useContent } from "../hooks";
import { whatsAppOrderUrl } from "../whatsapp-order";
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
  phone: z
    .string()
    .refine((v) => v.replace(/\D/g, "").length >= 8, "Please enter your WhatsApp number"),
  address: z.string().min(1, "A shipping address is required"),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
});

/** Payment is arranged with the seller on WhatsApp (see PAYMENT_METHODS). */
const PAYMENT_METHOD = PAYMENT_METHODS[0];

type CheckoutForm = z.infer<typeof checkoutSchema>;

export function CheckoutView() {
  const { toast } = useToast();
  const navigate = useStore((s) => s.navigate);
  const queryClient = useQueryClient();
  const { cart, isLoading: cartLoading } = useCartState();
  const clearBag = useBag((s) => s.clear);
  const { data: content } = useContent();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      notes: "",
    },
  });

  const placeOrder = useMutation({
    mutationFn: async (values: CheckoutForm) => {
      // Check out exactly the priced lines shown in the summary
      const items = (cart?.items ?? []).map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      }));
      const data = await apiPost<{ order: Order }>("/api/orders", {
        ...values,
        items,
        paymentMethod: PAYMENT_METHOD.id,
      });
      return data.order;
    },
    onSuccess: (order) => {
      // No account to read the order back with — the confirmation page shows
      // the order returned here.
      queryClient.setQueryData(["order", order.id], order);
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({
        title: "Order saved — now send it on WhatsApp",
        description: `Order ${order.orderNumber}: send the message to confirm it.`,
      });
      // Open the pre-filled chat with the seller. Browsers may block this
      // after the request, so the confirmation page also has the button.
      window.open(
        whatsAppOrderUrl(order, content?.whatsappNumber, content?.brandName ?? "Fankari Maison"),
        "_blank",
        "noopener"
      );
      navigate({ name: "order-success", orderId: order.id });
      clearBag();
    },
    onError: (error) => {
      toast({
        title: "Could not place your order",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (cartLoading) {
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
  const total = cart?.total ?? 0;

  if (items.length === 0) {
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
        No account needed — after placing your order you&apos;ll send it to us on
        WhatsApp to confirm.
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
              <Label htmlFor="phone">WhatsApp number</Label>
              <Input
                id="phone"
                type="tel"
                className="mt-1.5 min-h-11"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                aria-invalid={!!errors.phone}
                {...register("phone")}
              />
              {fieldError("phone")}
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

        {/* Payment — arranged with the seller on WhatsApp */}
        <Card className="lg:col-start-1">
          <CardHeader>
            <CardTitle className="font-display text-lg">Confirm on WhatsApp</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 rounded-lg border-2 border-primary bg-accent/40 p-4">
              <MessageCircle className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div className="text-sm">
                <p className="font-semibold">{PAYMENT_METHOD.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  When you place your order, WhatsApp opens with your order details
                  ready to send to us. We confirm it there and share payment details.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="sticky top-32 lg:col-start-2 lg:row-span-2 lg:row-start-1">
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
                      {formatPrice(unitPrice(item.product) * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Separator />
            {cart && <PriceSummary totals={cart} paymentMethod={PAYMENT_METHOD.id} />}
            <Button
              type="submit"
              size="lg"
              disabled={placeOrder.isPending || cartLoading}
              className="mt-2 min-h-12 w-full rounded-full text-base"
            >
              {placeOrder.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <MessageCircle className="size-4" aria-hidden />
              )}
              {placeOrder.isPending
                ? "Placing order…"
                : `Order on WhatsApp · ${formatPrice(total)}`}
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
