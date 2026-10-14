"use client";

import { useState } from "react";
import { Minus, PackageOpen, Plus } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useAdminProductMutations, useAdminProducts } from "./use-admin";
import { PanelLoading } from "../views/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function AdminInventory() {
  const { data: products, isLoading } = useAdminProducts();
  const { update } = useAdminProductMutations();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (isLoading) return <PanelLoading />;

  const list = products ?? [];
  const totalValue = list.reduce((sum, p) => sum + p.price * p.stock, 0);

  const draftFor = (p: { id: string; stock: number }) =>
    drafts[p.id] ?? String(p.stock);

  const setDraft = (id: string, value: string) =>
    setDrafts((d) => ({ ...d, [id]: value }));

  const commit = (id: string, stock: number) => {
    const raw = drafts[id];
    if (raw === undefined) return;
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n >= 0 && n !== stock) {
      update.mutate({ id, stock: n });
    }
    setDrafts((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });
  };

  const bump = (id: string, stock: number, delta: number) => {
    const n = Math.max(0, stock + delta);
    update.mutate({ id, stock: n });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Edit stock inline — changes save when you leave the field. Quick
          buttons adjust instantly.
        </p>
        <Badge
          variant="outline"
          className="border-border px-3 py-1.5 text-sm"
        >
          Inventory value:{" "}
          <span className="ml-1 font-semibold text-primary">
            {formatPrice(totalValue)}
          </span>
        </Badge>
      </div>

      <div className="mt-4 max-h-[32rem] overflow-y-auto rounded-xl border border-border/80 bg-card">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="min-w-56">Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Quick set</TableHead>
              <TableHead className="text-right">Line value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <PackageOpen className="size-8 text-muted-foreground" aria-hidden />
                    <p className="text-sm text-muted-foreground">
                      No products to stock yet.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              list.map((p) => {
                const low = p.stock <= 5;
                return (
                  <TableRow
                    key={p.id}
                    className={cn(low && "bg-amber-50/70 hover:bg-amber-50")}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-11 shrink-0 overflow-hidden rounded-md bg-muted">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <span className="line-clamp-2 max-w-48 text-sm font-medium">
                          {p.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.category}</TableCell>
                    <TableCell className="text-sm">{formatPrice(p.price)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-9 rounded-full"
                          disabled={update.isPending}
                          onClick={() => bump(p.id, p.stock, -1)}
                          aria-label={`Decrease stock of ${p.name} by 1`}
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <input
                          type="number"
                          min={0}
                          value={draftFor(p)}
                          onChange={(e) => setDraft(p.id, e.target.value)}
                          onBlur={() => commit(p.id, p.stock)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              commit(p.id, p.stock);
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          aria-label={`Stock for ${p.name}`}
                          className={cn(
                            "h-9 w-16 rounded-md border border-input bg-background px-2 text-center text-sm font-semibold tabular-nums outline-none focus:ring-2 focus:ring-ring",
                            low && "border-amber-300 text-amber-800"
                          )}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-9 rounded-full"
                          disabled={update.isPending}
                          onClick={() => bump(p.id, p.stock, 1)}
                          aria-label={`Increase stock of ${p.name} by 1`}
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        {[5, 10, 25].map((delta) => (
                          <Button
                            key={delta}
                            size="sm"
                            variant="outline"
                            className="min-h-9 rounded-full px-2.5"
                            disabled={update.isPending}
                            onClick={() => bump(p.id, p.stock, delta)}
                            aria-label={`Add ${delta} units to ${p.name}`}
                          >
                            +{delta}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatPrice(p.price * p.stock)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
