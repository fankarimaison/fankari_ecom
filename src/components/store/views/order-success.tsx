"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, MessageCircle, PackageSearch } from "lucide-react";
import { type Order } from "../api";
import { useContent } from "../hooks";
import { whatsAppOrderUrl } from "../whatsapp-order";
import { formatDate, formatPrice } from "@/lib/format";
import { PriceSummary } from "../price-summary";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function OrderSuccessView({ orderId }: { orderId: string }) {
  const navigate = useStore((s) => s.navigate);

  // Shoppers have no account to read orders back with, so this is the order
  // checkout just placed (updates happen on WhatsApp).
  const { data: content } = useContent();
  const { data: order } = useQuery<Order>({
    queryKey: ["order", orderId],
    queryFn: () => Promise.reject(new Error("Order not found")),
    enabled: false,
  });

  if (!order) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
        <PackageSearch className="size-10 text-muted-foreground" aria-hidden />
        <div>
          <p className="font-display text-xl font-semibold">Order not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            For questions about an order, message us on WhatsApp with your
            order number.
          </p>
        </div>
        <div className="flex gap-3">
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
          One last step: send your order to us on WhatsApp. We&apos;ll confirm it
          there and share payment details.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-5 min-h-12 rounded-full bg-[#25D366] px-8 text-base text-white hover:bg-[#1ebe5b]"
        >
          <a
            href={whatsAppOrderUrl(
              order,
              content?.whatsappNumber,
              content?.brandName ?? "Fankari Maison"
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-5" aria-hidden />
            Send order on WhatsApp
          </a>
        </Button>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Badge
            variant="outline"
            className="font-mono text-sm tracking-wider border-border"
          >
            {order.orderNumber}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Keep your order number — mention it when you message us on WhatsApp.
        </p>
      </div>

      <Card className="mt-8">
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
          className="min-h-12 rounded-full px-7"
          onClick={() => navigate({ name: "home" })}
        >
          Continue shopping
        </Button>
      </div>
    </div>
  );
}
