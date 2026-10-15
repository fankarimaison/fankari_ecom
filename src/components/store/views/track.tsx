"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, PackageSearch } from "lucide-react";
import { formatDate, formatPrice, statusBadgeClass, statusLabel } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/pricing";
import { ApiError, apiPost, type TrackedOrder } from "../api";
import { OrderTracking } from "../order-tracking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Public order tracking — works without signing in. Needs the order number
 * and the email used at checkout. Prefilled values (from order pages) look the
 * order up straight away.
 */
export function TrackView({ orderNumber = "", email = "" }: { orderNumber?: string; email?: string }) {
  const [form, setForm] = useState({ orderNumber, email });
  const [lookup, setLookup] = useState(
    orderNumber && email ? { orderNumber, email } : null,
  );

  const result = useQuery({
    queryKey: ["track", lookup?.orderNumber.toUpperCase(), lookup?.email.toLowerCase()],
    queryFn: async () => {
      const data = await apiPost<{ order: TrackedOrder }>("/api/track", lookup);
      return data.order;
    },
    enabled: lookup !== null,
    retry: false,
  });

  const notFound = result.error instanceof ApiError && result.error.status === 404;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6 lg:py-14">
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-2xl">
            <PackageSearch className="size-6 text-primary" aria-hidden /> Track your order
          </CardTitle>
          <CardDescription>
            Enter your order number (e.g. FM-ABC123) and the email you used at checkout.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              const next = { orderNumber: form.orderNumber.trim(), email: form.email.trim() };
              if (next.orderNumber && next.email) setLookup(next);
            }}
          >
            <div>
              <Label htmlFor="track-number">Order number</Label>
              <Input
                id="track-number"
                required
                className="mt-1.5 min-h-11 font-mono uppercase"
                placeholder="FM-ABC123"
                value={form.orderNumber}
                onChange={(e) => setForm((f) => ({ ...f, orderNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="track-email">Email</Label>
              <Input
                id="track-email"
                type="email"
                required
                autoComplete="email"
                className="mt-1.5 min-h-11"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="min-h-11 rounded-full px-6"
              disabled={result.isFetching}
            >
              {result.isFetching && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Track
            </Button>
          </form>
          {result.isError && (
            <p className="mt-3 text-sm font-medium text-destructive" role="alert">
              {notFound
                ? "We couldn't find an order with that number and email. Check both and try again."
                : result.error instanceof Error
                  ? result.error.message
                  : "Something went wrong — please try again."}
            </p>
          )}
        </CardContent>
      </Card>

      {result.data && <TrackedOrderCard order={result.data} />}
    </div>
  );
}

function TrackedOrderCard({ order }: { order: TrackedOrder }) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="font-mono text-lg">{order.orderNumber}</CardTitle>
          <CardDescription>
            Placed {formatDate(order.createdAt)} · {formatPrice(Number(order.total))} ·{" "}
            {paymentMethodLabel(order.paymentMethod)}
            {order.city ? ` · Delivering to ${order.city}` : ""}
          </CardDescription>
        </div>
        <Badge className={cn(statusBadgeClass(String(order.status)))}>
          {statusLabel(String(order.status))}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <OrderTracking order={order} />
        <div>
          <p className="text-sm font-semibold">Items</p>
          <ul className="mt-2 space-y-2">
            {order.items.map((item, i) => (
              <li key={`${item.name}-${i}`} className="flex items-center gap-3">
                <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.image && (
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <p className="min-w-0 flex-1 truncate text-sm">{item.name}</p>
                <p className="text-sm text-muted-foreground">× {item.quantity}</p>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
