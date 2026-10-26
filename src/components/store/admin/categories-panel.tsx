"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Loader2, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiDelete, apiPost, apiPut, type Category } from "../api";
import { useCategories } from "../hooks";
import { useAdminProducts } from "./use-admin";
import { ImageField } from "./image-field";
import { PanelLoading } from "../views/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

/** Admin → Categories: create, rename, picture, order and delete categories. */
export function AdminCategories() {
  const { data: categories, isLoading } = useCategories();
  const { data: products } = useAdminProducts();
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/api/categories/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Category deleted" });
      setDeleting(null);
    },
    onError: (error) => {
      toast({
        title: "Could not delete the category",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      setDeleting(null);
    },
  });

  if (isLoading) return <PanelLoading />;

  const countFor = (name: string) => (products ?? []).filter((p) => p.category === name).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Categories appear as picture tiles on the home page and as shop filters.
        </p>
        <Button className="min-h-10 rounded-full" onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden /> Add category
        </Button>
      </div>

      {!categories || categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card py-14 text-center">
          <Tags className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">No categories yet</p>
          <p className="text-sm text-muted-foreground">Add one to start organising products.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => {
            const count = countFor(c.name);
            return (
              <li key={c.id}>
                <Card className="gap-0 overflow-hidden p-0">
                  <div className="aspect-square bg-muted">
                    {c.image ? (
                      <img
                        src={c.image}
                        alt={c.name}
                        className="block h-full w-full object-cover object-center"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ImageIcon className="size-8" aria-hidden />
                      </div>
                    )}
                  </div>
                  <CardContent className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {count} product{count === 1 ? "" : "s"} · #{c.sortOrder}
                      </p>
                    </div>
                    <div className="flex shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-full"
                        onClick={() => setEditing(c)}
                        aria-label={`Edit ${c.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-full text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleting(c)}
                        aria-label={`Delete ${c.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <CategoryDialog
          key={editing === "new" ? "new" : editing.id}
          category={editing === "new" ? null : editing}
          productCount={editing === "new" ? 0 : countFor(editing.name)}
          onClose={() => setEditing(null)}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && countFor(deleting.name) > 0
                ? `${countFor(deleting.name)} product(s) are still in this category — move them to another category first.`
                : "The category is removed from the shop. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending || (!!deleting && countFor(deleting.name) > 0)}
              onClick={(e) => {
                e.preventDefault();
                if (deleting) remove.mutate(deleting.id);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
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

function CategoryDialog({
  category,
  productCount,
  onClose,
}: {
  category: Category | null;
  productCount: number;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(category?.name ?? "");
  const [image, setImage] = useState(category?.image ?? "");
  const [sortOrder, setSortOrder] = useState<string>(
    category ? String(category.sortOrder) : ""
  );

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name,
        image,
        ...(sortOrder.trim() ? { sortOrder: parseInt(sortOrder, 10) } : {}),
      };
      return category
        ? apiPut<{ category: Category }>(`/api/categories/${category.id}`, body)
        : apiPost<{ category: Category }>("/api/categories", body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      // A rename moves the category's products along with it
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["product"] });
      toast({ title: category ? "Category saved" : "Category added" });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Could not save the category",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const renaming = !!category && name.trim() !== category.name && productCount > 0;
  const invalid = !name.trim() || (sortOrder.trim() !== "" && !/^-?\d+$/.test(sortOrder.trim()));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {category ? "Edit category" : "Add category"}
          </DialogTitle>
          <DialogDescription>
            Name and picture shown in the shop. Square pictures (e.g. 800 × 800) fit best.
          </DialogDescription>
        </DialogHeader>
        <form
          id="category-form"
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!invalid) save.mutate();
          }}
        >
          <div>
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              className="mt-1.5 min-h-10"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {renaming && (
              <p className="mt-1 text-xs text-muted-foreground">
                Its {productCount} product{productCount === 1 ? "" : "s"} will move to the new name.
              </p>
            )}
          </div>
          <ImageField
            id="cat-image"
            label="Picture"
            folder="categories"
            placeholder="Upload a picture or paste an image link"
            value={image}
            onChange={setImage}
          />
          <div>
            <Label htmlFor="cat-order">Display order</Label>
            <Input
              id="cat-order"
              type="number"
              step="1"
              className="mt-1.5 min-h-10"
              placeholder={category ? undefined : "Last"}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">Lower numbers appear first.</p>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" className="min-h-10 rounded-full" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="category-form"
            className="min-h-10 rounded-full px-6"
            disabled={invalid || save.isPending}
          >
            {save.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {category ? "Save" : "Add category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
