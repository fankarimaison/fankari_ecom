"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { apiGet, productsUrl, type Product, type ProductListParams } from "./api";
import { useDebounce } from "./hooks";
import { ProductCard, ProductCardSkeleton } from "./product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Search + sort + product grid. Shows every product, or only one category's
 * (the category page). Reports query errors so the home page can show the
 * Supabase setup banner.
 */
export function ProductBrowser({
  category,
  onError,
}: {
  category?: string;
  onError?: (error: unknown) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<ProductListParams["sort"]>("new");
  const search = useDebounce(searchInput.trim(), 300);

  const listParams = useMemo<ProductListParams>(
    () => ({ category, search: search || undefined, sort }),
    [category, search, sort]
  );

  const catalogue = useQuery({
    queryKey: ["products", listParams],
    queryFn: () =>
      apiGet<{ products: Product[] }>(productsUrl(listParams)).then((d) => d.products),
    retry: false, // fail fast so the Supabase setup banner appears immediately
  });
  useEffect(() => {
    onError?.(catalogue.error);
  }, [catalogue.error, onError]);

  const products = catalogue.data ?? [];

  return (
    <>
      {/* Controls */}
      <div className="mt-6 flex gap-2 sm:justify-end">
        <div className="relative flex-1 sm:w-64 sm:flex-none">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={category ? `Search ${category}…` : "Search totes…"}
            aria-label="Search products"
            className="min-h-11 rounded-full border-border bg-card pl-9"
          />
        </div>
        <Select value={sort ?? "new"} onValueChange={(v) => setSort(v as ProductListParams["sort"])}>
          <SelectTrigger
            className="min-h-11 w-[150px] shrink-0 rounded-full border-border bg-card"
            aria-label="Sort products"
          >
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">Newest</SelectItem>
            <SelectItem value="price_asc">Price: low → high</SelectItem>
            <SelectItem value="price_desc">Price: high → low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      <div className="mt-7">
        {catalogue.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center">
            <Search className="size-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">
              {search ? "No totes match your search" : "No totes here yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {search ? "Try a different keyword." : "New pieces are on the way — check back soon."}
            </p>
            {search && (
              <Button
                variant="outline"
                className="mt-1 min-h-11 rounded-full"
                onClick={() => setSearchInput("")}
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
