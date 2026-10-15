"use client";

import { useState } from "react";
import { Loader2, PackageOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { isPercent, listPrice, unitPrice } from "@/lib/pricing";
import { DEFAULT_PRODUCT_IMAGE_URL } from "@/lib/storage";
import { ImageField } from "./image-field";
import { categories } from "../api";
import type { Product } from "../api";
import {
  useAdminProductMutations,
  useAdminProducts,
  type AdminProductInput,
} from "./use-admin";
import { PanelLoading } from "../views/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export function AdminProducts() {
  const { data: products, isLoading } = useAdminProducts();
  const { update, remove } = useAdminProductMutations();
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [search, setSearch] = useState("");

  if (isLoading) return <PanelLoading />;

  const list = (products ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            aria-label="Search admin products"
            className="min-h-10 rounded-full pl-9"
          />
        </div>
        <Button
          className="min-h-11 rounded-full"
          onClick={() => setEditing("new")}
        >
          <Plus className="size-4" aria-hidden /> Add product
        </Button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Inactive products are hidden from the storefront.
      </p>

      <div className="mt-3 max-h-[32rem] overflow-y-auto rounded-xl border border-border/80 bg-card">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="min-w-56">Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <PackageOpen className="size-8 text-muted-foreground" aria-hidden />
                    <p className="text-sm text-muted-foreground">
                      No products found. Add your first tote!
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              list.map((p) => (
                <TableRow key={p.id}>
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
                  <TableCell className="text-sm">
                    <span className="font-medium">{formatPrice(unitPrice(p))}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatPrice(p.price)} + {p.vatRate}% VAT
                      {p.discountPercent > 0 && ` · −${p.discountPercent}%`}
                    </span>
                  </TableCell>
                  <TableCell>
                    {p.stock <= 5 ? (
                      <Badge className="bg-amber-600 text-amber-50">{p.stock}</Badge>
                    ) : (
                      <span className="text-sm">{p.stock}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={p.featured}
                      disabled={update.isPending}
                      onCheckedChange={(v) => update.mutate({ id: p.id, featured: v })}
                      aria-label={`Toggle featured for ${p.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={p.active}
                      disabled={update.isPending}
                      onCheckedChange={(v) => update.mutate({ id: p.id, active: v })}
                      aria-label={`Toggle active for ${p.name}`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-9 rounded-full"
                        onClick={() => setEditing(p)}
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-9 rounded-full text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleting(p)}
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProductDialog
        key={editing === "new" ? "new" : (editing?.id ?? "none")}
        product={editing === "new" ? null : editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name} will be removed from the store permanently. Past
              orders keep their item snapshots.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-10 rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-10 rounded-full bg-destructive text-white hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleting) remove.mutate(deleting.id);
                setDeleting(null);
              }}
            >
              {remove.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ------------------------------ Product form ------------------------------ */

function ProductDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = product !== null;
  const { create, update } = useAdminProductMutations();

  // Initialized from props; the parent remounts this dialog (via key) so the
  // form resets cleanly on each open without setState-in-effect.
  const [form, setForm] = useState<AdminProductInput>(() => ({
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product?.price ?? 0,
    discountPercent: product?.discountPercent ?? 0,
    vatRate: product?.vatRate ?? 0,
    stock: product?.stock ?? 0,
    category: product?.category ?? "Canvas",
    image: product?.image ?? DEFAULT_PRODUCT_IMAGE_URL,
    materials: product?.materials ?? "",
    dimensions: product?.dimensions ?? "",
    featured: product?.featured ?? false,
    active: product?.active ?? true,
  }));

  const set = <K extends keyof AdminProductInput>(key: K, value: AdminProductInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const pending = create.isPending || update.isPending;

  const submit = () => {
    if (!form.name.trim() || !form.description.trim() || !form.image.trim()) return;
    if (isEdit && product) {
      update.mutate(
        { id: product.id, ...form },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      create.mutate(form, { onSuccess: () => onOpenChange(false) });
    }
  };

  const invalid =
    !form.name.trim() || !form.description.trim() || !form.image.trim() ||
    Number.isNaN(form.price) || form.price < 0 ||
    Number.isNaN(form.stock) || form.stock < 0 ||
    !isPercent(form.discountPercent) || !isPercent(form.vatRate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEdit ? "Edit product" : "Add product"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details of this handmade tote."
              : "Describe a new handmade tote for the storefront."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label htmlFor="p-name">Name</Label>
            <Input
              id="p-name"
              className="mt-1.5 min-h-10"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="p-desc">Description</Label>
            <Textarea
              id="p-desc"
              rows={3}
              className="mt-1.5"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="p-price">Price before VAT (₹)</Label>
              <Input
                id="p-price"
                type="number"
                min={0}
                step="0.01"
                className="mt-1.5 min-h-10"
                value={Number.isNaN(form.price) ? "" : form.price}
                onChange={(e) => set("price", parseFloat(e.target.value))}
                required
              />
            </div>
            <div>
              <Label htmlFor="p-stock">Stock</Label>
              <Input
                id="p-stock"
                type="number"
                min={0}
                step="1"
                className="mt-1.5 min-h-10"
                value={Number.isNaN(form.stock) ? "" : form.stock}
                onChange={(e) => set("stock", parseInt(e.target.value, 10))}
                required
              />
            </div>
            <div>
              <Label htmlFor="p-vat">VAT (%)</Label>
              <Input
                id="p-vat"
                type="number"
                min={0}
                max={100}
                step="0.01"
                className="mt-1.5 min-h-10"
                value={Number.isNaN(form.vatRate) ? "" : form.vatRate}
                onChange={(e) => set("vatRate", parseFloat(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="p-discount">Discount (%)</Label>
              <Input
                id="p-discount"
                type="number"
                min={0}
                max={100}
                step="0.01"
                className="mt-1.5 min-h-10"
                value={Number.isNaN(form.discountPercent) ? "" : form.discountPercent}
                onChange={(e) => set("discountPercent", parseFloat(e.target.value))}
              />
            </div>
          </div>
          {!Number.isNaN(form.price) && isPercent(form.discountPercent) && isPercent(form.vatRate) && (
            <p className="-mt-2 text-xs text-muted-foreground">
              Customers pay{" "}
              <span className="font-semibold text-foreground">{formatPrice(unitPrice(form))}</span>{" "}
              incl. VAT
              {form.discountPercent > 0 && <> (was {formatPrice(listPrice(form))})</>}.
            </p>
          )}
          <div>
            <Label htmlFor="p-category">Category</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger id="p-category" className="mt-1.5 min-h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ImageField
            id="p-image"
            label="Product image"
            folder="products"
            placeholder={`${DEFAULT_PRODUCT_IMAGE_URL} or any image URL`}
            value={form.image}
            onChange={(url) => set("image", url)}
            required
          />
          <div>
            <Label htmlFor="p-materials">Materials</Label>
            <Input
              id="p-materials"
              className="mt-1.5 min-h-10"
              placeholder="14oz cotton canvas, leather handles…"
              value={form.materials ?? ""}
              onChange={(e) => set("materials", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="p-dimensions">Dimensions</Label>
            <Input
              id="p-dimensions"
              className="mt-1.5 min-h-10"
              placeholder="38 × 35 × 12 cm"
              value={form.dimensions ?? ""}
              onChange={(e) => set("dimensions", e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2.5">
            <Label htmlFor="p-featured" className="cursor-pointer">
              Featured on the homepage
            </Label>
            <Switch
              id="p-featured"
              checked={!!form.featured}
              onCheckedChange={(v) => set("featured", v)}
            />
          </div>
          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2.5">
              <Label htmlFor="p-active" className="cursor-pointer">
                Active (visible in storefront)
              </Label>
              <Switch
                id="p-active"
                checked={form.active !== false}
                onCheckedChange={(v) => set("active", v)}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="min-h-10 rounded-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="min-h-10 rounded-full"
            disabled={invalid || pending}
            onClick={submit}
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {isEdit ? "Save changes" : "Create product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminProductsSkeleton() {
  return <Skeleton className="h-96 w-full rounded-xl" />;
}
