"use client";

import { useCallback, useState } from "react";
import { HERO_IMAGE_URL } from "@/lib/storage";
import { useStore } from "@/lib/store";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Database,
  HandHeart,
  Leaf,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { apiGet, isSetupRequired, productsUrl, type Product } from "../api";
import { shippingPolicyText, useCategories, useContent, useShipping } from "../hooks";
import { ProductCard, ProductCardSkeleton } from "../product-card";
import { ProductBrowser } from "../product-browser";
import { HeroCarousel } from "../hero-carousel";
import { heroSlides } from "@/lib/hero";
import { SHIPPING_TOKEN, trustItemsFromContent } from "@/lib/trust";
import { trustIcon } from "../trust-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

/** Columns for the highlights strip on wide screens, by item count. */
const TRUST_COLS: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-3 lg:grid-cols-6",
  7: "md:grid-cols-4",
  8: "md:grid-cols-4",
};

export const craftValues = [
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
  const shipping = useShipping();

  const brandName = content?.brandName ?? "Fankari Maison";
  const heroTitle = content?.heroTitle ?? "Carried by Hand, Made with Heart";
  const heroSubtitle =
    content?.heroSubtitle ??
    "Small-batch tote bags handcrafted from natural canvas, jute and full-grain leather.";
  const heroImages = heroSlides(content, HERO_IMAGE_URL);
  const trustItems = trustItemsFromContent(content);
  const aboutTitle = content?.aboutTitle ?? "Crafted Slowly, Made to Last";
  const aboutText = content?.aboutText ?? "";
  const aboutImage = HERO_IMAGE_URL;

  const navigate = useStore((s) => s.navigate);
  const { data: categoryTiles = [] } = useCategories();
  const [catalogueError, setCatalogueError] = useState<unknown>(null);
  const onCatalogueError = useCallback((error: unknown) => setCatalogueError(error), []);

  const featured = useQuery({
    queryKey: ["products", { featured: true, sort: "new" }],
    queryFn: () =>
      apiGet<{ products: Product[] }>(productsUrl({ featured: true })).then(
        (d) => d.products
      ),
    retry: false, // fail fast so the Supabase setup banner appears immediately
  });

  const featuredProducts = (featured.data ?? []).slice(0, 4);

  // Backend Setup guard: the Supabase schema hasn't been applied yet
  // (503 { error, setupRequired: true }) — show the connect-database banner.
  const setupRequired = isSetupRequired(catalogueError) || isSetupRequired(featured.error);

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
                  checkout and admin panel will come alive immediately.
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
                onClick={() => navigate({ name: "about" })}
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
            <HeroCarousel
              images={heroImages}
              alt="Handcrafted tote bags from the Fankari Maison collection"
            />
            <div className="absolute -bottom-4 left-5 rounded-full bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-md ring-1 ring-border">
              🧶 New batch just landed
            </div>
          </motion.div>
        </div>
      </section>

      {/* -------------- Trust strip (Admin → Content → Highlights) -------------- */}
      {trustItems.length > 0 && (
        <section aria-label="Why shop with us" className="border-y border-border/70 bg-card">
          <div
            className={cn(
              "mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-5 px-4 py-6 sm:px-6 lg:px-8",
              TRUST_COLS[trustItems.length]
            )}
          >
            {trustItems.map(({ icon, text }, i) => {
              const Icon = trustIcon(icon);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <p className="text-[13px] font-medium leading-tight text-foreground/90">
                    {text.replaceAll(SHIPPING_TOKEN, shippingPolicyText(shipping, true))}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

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

      {/* ------------------------- Shop by category -------------------------- */}
      {categoryTiles.length > 0 && (
        <section
          aria-labelledby="categories-heading"
          className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8 lg:pt-16"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Find your carry
          </p>
          <h2
            id="categories-heading"
            className="font-display mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Shop by Category
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {categoryTiles.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => navigate({ name: "category", category: c.name })}
                  className="group relative block w-full overflow-hidden rounded-xl bg-muted text-left shadow-sm ring-1 ring-stone-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {c.image ? (
                    <img
                      src={c.image}
                      alt=""
                      loading="lazy"
                      className="block aspect-square w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="flex aspect-square w-full items-center justify-center bg-secondary">
                      <ShoppingBag className="size-10 text-secondary-foreground/60" aria-hidden />
                    </span>
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-stone-900/70 via-stone-900/10 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3 text-white">
                    <span className="font-display text-base font-semibold leading-tight sm:text-lg">
                      {c.name}
                    </span>
                    <ArrowRight
                      className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

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

        <ProductBrowser onError={onCatalogueError} />
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
              alt="Artisan workshop where Fankari Maison totes are handmade"
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
            <Button
              variant="outline"
              className="mt-7 min-h-11 rounded-full px-6"
              onClick={() => navigate({ name: "about" })}
            >
              Meet the founders <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
