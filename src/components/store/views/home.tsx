"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Database,
  HandHeart,
  Leaf,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";
import {
  apiGet,
  categories,
  isSetupRequired,
  productsUrl,
  type Product,
  type ProductListParams,
} from "../api";
import { useContent, useDebounce } from "../hooks";
import { ProductCard, ProductCardSkeleton } from "../product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const trustItems = [
  { icon: HandHeart, title: "Handcrafted in small batches" },
  { icon: Leaf, title: "Natural materials" },
  { icon: Truck, title: "Free shipping over $75" },
  { icon: ShieldCheck, title: "Built to last" },
];

const craftValues = [
  {
    icon: HandHeart,
    title: "Made by hand",
    text: "Every bag is cut, stitched and finished by skilled artisans — no factory lines.",
  },
  {
    icon: Leaf,
    title: "Honest materials",
    text: "Natural cotton canvas, rustic jute and full-grain leather that age beautifully.",
  },
  {
    icon: ShieldCheck,
    title: "Built to last",
    text: "Reinforced stress points and saddle stitching mean decades of daily carry.",
  },
];

export function HomeView() {
  const { data: content } = useContent();

  const brandName = content?.brandName ?? "Terra & Thread";
  const heroTitle = content?.heroTitle ?? "Carried by Hand, Made with Heart";
  const heroSubtitle =
    content?.heroSubtitle ??
    "Small-batch tote bags handcrafted from natural canvas, jute and full-grain leather.";
  const heroImage = content?.heroImage ?? "/images/hero.jpg";
  const aboutTitle = content?.aboutTitle ?? "Crafted Slowly, Made to Last";
  const aboutText = content?.aboutText ?? "";
  const aboutImage = "/images/hero.jpg";

  const [category, setCategory] = useState<string>("All");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<ProductListParams["sort"]>("new");
  const search = useDebounce(searchInput.trim(), 300);

  const featured = useQuery({
    queryKey: ["products", { featured: true, sort: "new" }],
    queryFn: () =>
      apiGet<{ products: Product[] }>(productsUrl({ featured: true })).then(
        (d) => d.products
      ),
    retry: false, // fail fast so the Supabase setup banner appears immediately
  });

  const listParams = useMemo<ProductListParams>(
    () => ({
      category: category === "All" ? undefined : category,
      search: search || undefined,
      sort,
    }),
    [category, search, sort]
  );

  const catalogue = useQuery({
    queryKey: ["products", listParams],
    queryFn: () =>
      apiGet<{ products: Product[] }>(productsUrl(listParams)).then(
        (d) => d.products
      ),
    retry: false, // fail fast so the Supabase setup banner appears immediately
  });

  const featuredProducts = (featured.data ?? []).slice(0, 4);
  const products = catalogue.data ?? [];

  // Backend Setup guard: the Supabase schema hasn't been applied yet
  // (503 { error, setupRequired: true }) — show the connect-database banner.
  const setupRequired =
    isSetupRequired(catalogue.error) || isSetupRequired(featured.error);

  return (
    <div>
      {/* ----------------------- Setup required banner ----------------------- */}
      {setupRequired && (
        <section
          aria-label="Database setup required"
          className="border-b border-amber-200 bg-amber-50"
        >
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start sm:gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 ring-1 ring-amber-300">
                <Database className="size-5 text-amber-800" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-display text-base font-semibold text-amber-900 sm:text-lg">
                  Connect your Supabase database
                </p>
                <p className="mt-1 text-sm leading-relaxed text-amber-900/80">
                  This store now runs on Supabase. Open your Supabase Dashboard
                  → SQL Editor, paste the contents of{" "}
                  <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[0.8em] text-amber-900 ring-1 ring-amber-200">
                    supabase/schema.sql
                  </code>{" "}
                  (found in the project root), and press Run. The store, cart,
                  accounts and admin panel will come alive immediately.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-amber-900/70">
                  The demo logins{" "}
                  <span className="font-mono">
                    admin@terrathread.com / admin123
                  </span>{" "}
                  and{" "}
                  <span className="font-mono">
                    customer@example.com / customer123
                  </span>{" "}
                  are created by the same script.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------- Hero ------------------------------- */}
      <section className="bg-paper">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {brandName} · Handcrafted totes
            </p>
            <h1 className="font-display mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
              {heroTitle}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg">
              {heroSubtitle}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="min-h-12 rounded-full px-7 text-base"
                onClick={() =>
                  document
                    .getElementById("shop")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Shop the Collection
                <ArrowRight className="size-4" aria-hidden />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="min-h-12 rounded-full bg-card/60 px-7 text-base hover:bg-card"
                onClick={() =>
                  document
                    .getElementById("about")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Our Story
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="relative"
          >
            <div className="overflow-hidden rounded-2xl shadow-xl shadow-stone-900/10 ring-1 ring-stone-900/5">
              <img
                src={heroImage}
                alt="Handcrafted tote bags from the Terra & Thread collection"
                className="aspect-[2/1] w-full object-cover sm:aspect-[16/10]"
              />
            </div>
            <div className="absolute -bottom-4 left-5 rounded-full bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-md ring-1 ring-border">
              🧶 New batch just landed
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------------------- Trust strip ---------------------------- */}
      <section aria-label="Why shop with us" className="border-y border-border/70 bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-5 px-4 py-6 sm:px-6 md:grid-cols-4 lg:px-8">
          {trustItems.map(({ icon: Icon, title }) => (
            <div key={title} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Icon className="size-5" aria-hidden />
              </span>
              <p className="text-[13px] font-medium leading-tight text-foreground/90">
                {title}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------- Featured ------------------------------ */}
      <section aria-labelledby="featured-heading" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8 lg:pt-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Small batch · Big heart
            </p>
            <h2 id="featured-heading" className="font-display mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
              Artisan Favorites
            </h2>
          </div>
          <Button
            variant="link"
            className="hidden text-primary sm:inline-flex"
            onClick={() =>
              document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            View all <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {featured.isLoading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : featuredProducts.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* ---------------------------- Catalogue ------------------------------ */}
      <section
        id="shop"
        aria-labelledby="shop-heading"
        className="mx-auto max-w-7xl scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
      >
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            The collection
          </p>
          <h2 id="shop-heading" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Shop All Totes
          </h2>
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap"
            role="group"
            aria-label="Filter by category"
          >
            {["All", ...categories].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
                  category === c
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground/80 hover:border-accent-foreground/40 hover:bg-accent"
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 lg:w-56 lg:flex-none">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search totes…"
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
              <p className="font-medium">No totes match your search</p>
              <p className="text-sm text-muted-foreground">
                Try a different keyword or category.
              </p>
              <Button
                variant="outline"
                className="mt-1 min-h-11 rounded-full"
                onClick={() => {
                  setSearchInput("");
                  setCategory("All");
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------ About ------------------------------- */}
      <section
        id="about"
        aria-labelledby="about-heading"
        className="scroll-mt-24 border-t border-border/70 bg-card"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-20">
          <div className="overflow-hidden rounded-2xl shadow-lg shadow-stone-900/10 ring-1 ring-stone-900/5 order-2 lg:order-1">
            <img
              src={aboutImage}
              alt="Artisan workshop where Terra & Thread totes are handmade"
              className="aspect-[4/3] w-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Our story
            </p>
            <h2 id="about-heading" className="font-display mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
              {aboutTitle}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-stone-600 sm:text-base">
              {aboutText}
            </p>
            <ul className="mt-7 space-y-4">
              {craftValues.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3.5">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                      {text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
