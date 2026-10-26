"use client";

import { ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { useCategories } from "../hooks";
import { ProductBrowser } from "../product-browser";

/** One category's products — opened from the home page category tiles. */
export function CategoryView({ category }: { category: string }) {
  const navigate = useStore((s) => s.navigate);
  const { data: categories } = useCategories();
  const image = categories?.find((c) => c.name === category)?.image ?? "";

  const backToCategories = () => {
    navigate({ name: "home" });
    setTimeout(
      () => document.getElementById("categories-heading")?.scrollIntoView({ behavior: "smooth" }),
      180
    );
  };

  return (
    <div>
      {/* Banner */}
      <section className="relative overflow-hidden bg-paper">
        {image && (
          <>
            <img
              src={image}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-stone-900/75 via-stone-900/45 to-stone-900/10" />
          </>
        )}
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <button
            type="button"
            onClick={backToCategories}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-medium transition-colors ${
              image ? "text-white/85 hover:text-white" : "text-muted-foreground hover:text-accent-foreground"
            }`}
          >
            <ArrowLeft className="size-4" aria-hidden />
            All categories
          </button>
          <p
            className={`mt-3 text-xs font-semibold uppercase tracking-[0.2em] ${
              image ? "text-white/80" : "text-primary"
            }`}
          >
            Category
          </p>
          <h1
            className={`font-display mt-1.5 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl ${
              image ? "text-white" : "text-stone-900"
            }`}
          >
            {category}
          </h1>
        </div>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
        <ProductBrowser key={category} category={category} />
      </section>
    </div>
  );
}
