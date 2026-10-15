"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SignIn, useClerk } from "@clerk/nextjs";
import {
  ChevronDown,
  LogOut,
  Mail,
  PackageOpen,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { formatDate, formatPrice, statusBadgeClass, statusLabel } from "@/lib/format";
import {
  apiGet,
  type Order,
  type User,
} from "../api";
import { useMe } from "../hooks";
import { priceSummaryText } from "../price-summary";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AccountView() {
  const { data: user, isLoading } = useMe();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="mt-6 h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-14">
      {user ? <SignedIn user={user} /> : <SignedOut />}
    </div>
  );
}

/* ------------------------------ Signed out ------------------------------- */

// Clerk handles sign-in and sign-up inline (hash routing keeps the SPA view);
// AuthSync in providers.tsx refetches the session data once it completes.
function SignedOut() {
  return (
    <div className="flex flex-col items-center">
      <div className="mb-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary">
          <UserRound className="size-6 text-secondary-foreground" aria-hidden />
        </span>
        <h1 className="font-display mt-3 text-2xl font-semibold">
          Welcome to your studio account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to use your bag, track orders and check out faster.
        </p>
      </div>
      <SignIn routing="hash" withSignUp />
    </div>
  );
}

/* ------------------------------- Signed in ------------------------------- */

function SignedIn({ user }: { user: User }) {
  const { toast } = useToast();
  const { signOut } = useClerk();
  const navigate = useStore((s) => s.navigate);

  const logout = useMutation({
    mutationFn: () => signOut(),
    onSuccess: () => {
      toast({ title: "Signed out. See you soon!" });
      navigate({ name: "home" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Greeting card */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary">
              <UserRound className="size-6 text-secondary-foreground" aria-hidden />
            </span>
            <div>
              <p className="font-display text-xl font-semibold">
                Hello, {user.name.split(" ")[0]}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-3.5" aria-hidden /> {user.email}
              </p>
            </div>
            {user.role === "ADMIN" && (
              <Badge className="bg-primary text-primary-foreground">
                <ShieldCheck className="size-3.5" aria-hidden /> Admin
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {user.role === "ADMIN" && (
              <Button
                variant="outline"
                className="min-h-11 rounded-full"
                onClick={() => navigate({ name: "admin" })}
              >
                Studio admin
              </Button>
            )}
            <Button
              variant="outline"
              className="min-h-11 rounded-full"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              <LogOut className="size-4" aria-hidden /> Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Order history */}
      <OrderHistory />
    </div>
  );
}

function OrderHistory() {
  const navigate = useStore((s) => s.navigate);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const data = await apiGet<{ orders: Order[] }>("/api/orders");
      return data.orders;
    },
  });

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section aria-labelledby="orders-heading">
      <h2 id="orders-heading" className="font-display text-xl font-semibold tracking-tight">
        Order history
      </h2>

      {isLoading ? (
        <div className="mt-4 space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card py-14 text-center">
          <PackageOpen className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">No orders yet</p>
          <p className="text-sm text-muted-foreground">
            When you place an order it will appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((order) => {
            const isOpen = expanded.has(order.id);
            return (
              <li key={order.id}>
                <Card className="overflow-hidden p-0 gap-0">
                  <button
                    type="button"
                    onClick={() => toggle(order.id)}
                    aria-expanded={isOpen}
                    className="flex w-full flex-wrap items-center gap-3 p-4 text-left transition-colors hover:bg-accent/50"
                  >
                    <div className="flex min-w-40 flex-1 flex-col gap-0.5">
                      <span className="font-mono text-sm font-semibold tracking-wide">
                        {order.orderNumber}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt)} · {order.items.length} item
                        {order.items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={statusBadgeClass(String(order.status))}>
                        {statusLabel(String(order.status))}
                      </Badge>
                      <span className="text-sm font-semibold">
                        {formatPrice(order.total)}
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-4 text-muted-foreground transition-transform",
                          isOpen && "rotate-180"
                        )}
                        aria-hidden
                      />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-border/60 bg-muted/40 p-4">
                      <ul className="space-y-3">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex items-center gap-3">
                            <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
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
                      <div className="mt-4 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
                        <p>
                          <span className="font-medium text-foreground">Ship to: </span>
                          {order.customerName}, {order.address}, {order.city}
                          {order.postalCode ? ` ${order.postalCode}` : ""}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Summary: </span>
                          {priceSummaryText(order)} · Total {formatPrice(order.total)}
                        </p>
                      </div>
                      <div className="mt-4 rounded-lg border border-border/70 bg-card p-4">
                        <p className="mb-3 text-sm font-semibold">Delivery tracking</p>
                        <OrderTracking order={order} />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 min-h-9 rounded-full"
                        onClick={() => navigate({ name: "order-success", orderId: order.id })}
                      >
                        Open order page
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
