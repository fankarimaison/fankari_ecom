"use client";

import { Lock, Loader2 } from "lucide-react";
import { useStore, type View } from "@/lib/store";
import { useAdminStats } from "../admin/use-admin";
import { useMe } from "../hooks";
import { AdminDashboard } from "../admin/dashboard";
import { AdminProducts } from "../admin/products-panel";
import { AdminInventory } from "../admin/inventory-panel";
import { AdminOrders } from "../admin/orders-panel";
import { AdminContent } from "../admin/content-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type AdminTab = NonNullable<Extract<View, { name: "admin" }>["tab"]>;

const TABS: { key: AdminTab; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "products", label: "Products" },
  { key: "inventory", label: "Inventory" },
  { key: "orders", label: "Orders" },
  { key: "content", label: "Content" },
];

export function AdminView({ tab }: { tab?: AdminTab }) {
  const navigate = useStore((s) => s.navigate);
  const { data: user, isLoading } = useMe();
  const active: AdminTab = tab ?? "dashboard";

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-56" />
        <div className="mt-6 flex gap-2">
          {TABS.map((t) => (
            <Skeleton key={t.key} className="h-9 w-24 rounded-full" />
          ))}
        </div>
        <Skeleton className="mt-6 h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-24 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-muted">
          <Lock className="size-7 text-muted-foreground" aria-hidden />
        </span>
        <div>
          <p className="font-display text-2xl font-semibold">Admin access required</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            This area is for the Terra &amp; Thread studio team. Sign in with an
            admin account (demo: admin@terrathread.com / admin123).
          </p>
        </div>
        <Button
          size="lg"
          className="mt-2 min-h-11 rounded-full px-8"
          onClick={() => navigate({ name: "account" })}
        >
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Sub-header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Studio Admin
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage products, inventory, orders and storefront content.
          </p>
        </div>
      </div>

      {/* Tab nav */}
      <nav
        aria-label="Admin sections"
        className="mt-5 flex gap-2 overflow-x-auto pb-1"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => navigate({ name: "admin", tab: t.key })}
            aria-current={active === t.key ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
              active === t.key
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-foreground/80 hover:bg-accent"
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {active === "dashboard" && <AdminDashboard onNavigate={navigate} />}
        {active === "products" && <AdminProducts />}
        {active === "inventory" && <AdminInventory />}
        {active === "orders" && <AdminOrders />}
        {active === "content" && <AdminContent />}
      </div>
    </div>
  );
}

/** Small loading row used by panels. */
export function PanelLoading() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span className="text-sm">Loading…</span>
    </div>
  );
}
