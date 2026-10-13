"use client";

import { useState } from "react";
import { ChevronDown, PackageOpen } from "lucide-react";
import { formatDate, formatPrice, statusBadgeClass, statusLabel } from "@/lib/format";
import { useAdminOrderStatusMutation, useAdminOrders } from "./use-admin";
import { PanelLoading } from "../views/admin";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const STATUSES = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

export function AdminOrders() {
  const { data: orders, isLoading } = useAdminOrders();
  const setStatus = useAdminOrderStatusMutation();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (isLoading) return <PanelLoading />;

  const list = orders ?? [];

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="max-h-[36rem] overflow-y-auto rounded-xl border border-border/80 bg-card">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead className="w-10" aria-label="Expand row" />
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <PackageOpen className="size-8 text-muted-foreground" aria-hidden />
                  <p className="text-sm text-muted-foreground">
                    No orders yet. They will appear here as customers check out.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            list.map((o) => {
              const isOpen = expanded.has(o.id);
              return (
                <TableRow key={o.id} className={cn(isOpen && "bg-accent/40")}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => toggle(o.id)}
                      aria-expanded={isOpen}
                      aria-label={`Toggle details for ${o.orderNumber}`}
                      className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-accent"
                    >
                      <ChevronDown
                        className={cn(
                          "size-4 text-muted-foreground transition-transform",
                          isOpen && "rotate-180"
                        )}
                        aria-hidden
                      />
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm font-semibold">
                      {o.orderNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{o.user?.name ?? o.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.user?.email ?? o.email}
                    </p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDate(o.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm">{o.items.length}</TableCell>
                  <TableCell className="text-sm font-semibold">
                    {formatPrice(o.total)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("hidden xl:inline-flex", statusBadgeClass(String(o.status)))}>
                        {statusLabel(String(o.status))}
                      </Badge>
                      <Select
                        value={String(o.status)}
                        onValueChange={(v) => setStatus.mutate({ id: o.id, status: v })}
                        disabled={setStatus.isPending}
                      >
                        <SelectTrigger
                          size="sm"
                          className="min-h-9 w-[130px] rounded-full"
                          aria-label={`Change status of ${o.orderNumber}`}
                        >
                          {statusLabel(String(o.status))}
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {statusLabel(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Expanded item details */}
      {list.some((o) => expanded.has(o.id)) && (
        <div className="border-t border-border/70 bg-muted/40">
          {list
            .filter((o) => expanded.has(o.id))
            .map((o) => (
              <div key={o.id} className="border-b border-border/50 p-4 last:border-b-0">
                <p className="font-mono text-sm font-semibold">{o.orderNumber}</p>
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  <ul className="space-y-2">
                    {o.items.map((item) => (
                      <li key={item.id} className="flex items-center gap-2.5">
                        <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
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
                  <div className="rounded-lg border border-border/70 bg-card p-3 text-xs leading-relaxed text-muted-foreground">
                    <p className="font-medium text-foreground">Shipping address</p>
                    <p className="mt-1">
                      {o.customerName}
                      <br />
                      {o.address}, {o.city}
                      {o.postalCode ? ` ${o.postalCode}` : ""}
                      <br />
                      {o.email}
                      {o.phone ? ` · ${o.phone}` : ""}
                    </p>
                    {o.notes && (
                      <>
                        <p className="mt-2 font-medium text-foreground">Notes</p>
                        <p className="mt-1">{o.notes}</p>
                      </>
                    )}
                    <p className="mt-2">
                      Subtotal {formatPrice(o.subtotal)} · Shipping{" "}
                      {o.shipping === 0 ? "free" : formatPrice(o.shipping)} · Total{" "}
                      <span className="font-semibold text-foreground">
                        {formatPrice(o.total)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
