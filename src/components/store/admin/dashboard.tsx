"use client";

import {
  CircleDollarSign,
  Clock,
  Plus,
  ShoppingBag,
  TriangleAlert,
  Users,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import type { View } from "@/lib/store";
import {
  useAdminOrders,
  useAdminProducts,
  useAdminProductMutations,
  useAdminStats,
} from "./use-admin";
import { PanelLoading } from "../views/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AdminDashboard({
  onNavigate,
}: {
  onNavigate: (view: View) => void;
}) {
  const stats = useAdminStats();
  const products = useAdminProducts();
  const orders = useAdminOrders();
  const { update } = useAdminProductMutations();

  if (stats.isLoading || products.isLoading || orders.isLoading) {
    return <PanelLoading />;
  }

  const s = stats.data;
  const lowStock = (products.data ?? []).filter(
    (p) => p.stock <= 5 && p.active
  );
  const recentOrders = (orders.data ?? []).slice(0, 5);

  const cards = [
    {
      label: "Revenue",
      value: s ? formatPrice(s.revenue) : "—",
      icon: CircleDollarSign,
      hint: "Non-cancelled orders",
    },
    {
      label: "Orders",
      value: s ? String(s.orders) : "—",
      icon: ShoppingBag,
      hint: s ? `${s.pending} awaiting fulfilment` : "",
    },
    {
      label: "Customers",
      value: s ? String(s.customers) : "—",
      icon: Users,
      hint: "Unique checkout emails",
    },
    {
      label: "Low stock",
      value: s ? String(s.lowStock) : "—",
      icon: TriangleAlert,
      hint: "Active products ≤ 5 left",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, hint }) => (
          <Card key={label}>
            <CardContent className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  {label}
                </p>
                <p className="font-display mt-1.5 text-2xl font-semibold">{value}</p>
                {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
              </div>
              <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Icon className="size-5" aria-hidden />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low stock */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-lg">Low stock</CardTitle>
            <Button
              variant="link"
              className="text-primary"
              onClick={() => onNavigate({ name: "admin", tab: "inventory" })}
            >
              Manage inventory
            </Button>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Everything is well stocked. 🎉
              </p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {lowStock.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.stock} left in stock
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-9 shrink-0 rounded-full border-amber-300 bg-card hover:bg-amber-100"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ id: p.id, stock: p.stock + 5 })}
                      aria-label={`Restock ${p.name} with 5 more units`}
                    >
                      <Plus className="size-3.5" aria-hidden /> 5
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent orders */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-lg">Recent orders</CardTitle>
            <Button
              variant="link"
              className="text-primary"
              onClick={() => onNavigate({ name: "admin", tab: "orders" })}
            >
              All orders
            </Button>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No orders yet — they will appear here.
              </p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {recentOrders.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold">{o.orderNumber}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {o.user?.name ?? o.customerName} · {o.items.length} item
                        {o.items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {String(o.status) === "PENDING" && (
                        <Badge variant="outline" className="gap-1 border-amber-300 text-amber-800">
                          <Clock className="size-3" aria-hidden /> Pending
                        </Badge>
                      )}
                      <span className="text-sm font-semibold">{formatPrice(o.total)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
