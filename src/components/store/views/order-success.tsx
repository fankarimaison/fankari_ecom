"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, PackageSearch } from "lucide-react";
import { apiGet, type Order } from "../api";
import { formatDate, formatPrice, statusBadgeClass, statusLabel } from "@/lib/format";
import { PriceSummary } from "../price-summary";
import { OrderTracking } from "../order-tracking";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export function OrderSuccessView({ orderId }: { orderId: string }) {
  const navigate = useStore((s) => s.navigate);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const data = await apiGet<{ order: Order }>(`/api/orders/${orderId}`);
      return data.order;
    },
    // refetch so delivery updates from the studio show up
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Skeleton className="mx-auto size-16 rounded-full" />
        <Skeleton className="mx-auto mt-4 h-8 w-72" />
        <Skeleton className="mt-8 h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
        <PackageSearch className="size-10 text-muted-foreground" aria-hidden />
        <div>
          <p className="font-display text-xl font-semibold">Order not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to view your orders, or head back to the shop.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="min-h-11 rounded-full"
            onClick={() => navigate({ name: "account" })}
          >
            Sign in
          </Button>
          <Button
            className="min-h-11 rounded-full"
            onClick={() => navigate({ name: "home" })}
          >
            Continue shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="flex flex-col items-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-secondary">
          <CheckCircle2 className="size-9 text-secondary-foreground" aria-hidden />
        </span>
        <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Thank you, {order.customerName.split(" ")[0]}!
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Your handcrafted totes are being prepared with care. We emailed a
          receipt to <span className="font-medium text-foreground">{order.email}</span>.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Badge
            variant="outline"
            className="font-mono text-sm tracking-wider border-border"
          >
            {order.orderNumber}
          </Badge>
          <Badge className={statusBadgeClass(String(order.status))}>
            {statusLabel(String(order.status))}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Keep your order number — you can track delivery any time from “Track order”.
        </p>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-display text-lg">Delivery tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTracking order={order} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-display text-lg">Order summary</CardTitle>
          <p className="text-xs text-muted-foreground">
            Placed {formatDate(order.createdAt)}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(item.price)} × {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
          <Separator />
          <PriceSummary totals={order} paymentMethod={order.paymentMethod} />
          <Separator />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Shipping to</p>
            <p className="mt-1 leading-relaxed">
              {order.customerName}
              <br />
              {order.address}, {order.city}
              {order.postalCode ? ` ${order.postalCode}` : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button
          size="lg"
          variant="outline"
          className="min-h-12 rounded-full px-7"
          onClick={() =>
            navigate({ name: "track", orderNumber: order.orderNumber, email: order.email })
          }
        >
          Track this order
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="min-h-12 rounded-full px-7"
          onClick={() => navigate({ name: "account" })}
        >
          View my orders
        </Button>
        <Button
          size="lg"
          className="min-h-12 rounded-full px-7"
          onClick={() => navigate({ name: "home" })}
        >
          Continue shopping
        </Button>
      </div>
    </div>
  );
}
