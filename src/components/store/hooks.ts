"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useBag } from "@/lib/cart";
import { useStore } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import { shippingFromContent, type ShippingSettings } from "@/lib/pricing";
import {
  apiGet,
  apiPost,
  type CartResponse,
  type Category,
  type Faq,
  type SiteContent,
  type User,
} from "./api";

/** Signed-in studio admin, if any — null for shoppers (who never sign in). */
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const data = await apiGet<{ user: User | null }>("/api/auth/me");
      return data.user;
    },
    staleTime: 30_000,
  });
}

/**
 * Editable site content (brand name, hero copy, announcement…).
 * Resilient by design: on ANY error (network, auth, or the Supabase setup
 * guard) the query fails fast and `data` stays undefined — consumers render
 * their built-in defaults instead of breaking.
 */
export function useContent() {
  return useQuery({
    queryKey: ["content"],
    queryFn: async () => {
      const data = await apiGet<{ content: SiteContent }>("/api/content");
      return data.content;
    },
    staleTime: 60_000,
    retry: false,
  });
}

/** FAQs in display order (hidden ones are included only for a signed-in admin). */
export function useFaqs() {
  return useQuery({
    queryKey: ["faqs"],
    queryFn: async () => {
      const data = await apiGet<{ faqs: Faq[] }>("/api/faqs");
      return data.faqs;
    },
    staleTime: 60_000,
  });
}

/** Built-in categories — used when /api/categories can't be reached. */
const FALLBACK_CATEGORIES: Category[] = [
  "Canvas",
  "Straw & Jute",
  "Leather Trim",
  "Linen",
  "Special Edition",
].map((name, i) => ({ id: name, name, image: "", sortOrder: i + 1 }));

/** Product categories in display order (Admin → Categories). */
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      try {
        const data = await apiGet<{ categories: Category[] }>("/api/categories");
        return data.categories.length ? data.categories : FALLBACK_CATEGORIES;
      } catch {
        // Never leave the shop without categories
        return FALLBACK_CATEGORIES;
      }
    },
    staleTime: 60_000,
  });
}

/** Shipping settings from Admin → Content (defaults until content loads). */
export function useShipping(): ShippingSettings {
  const { data: content } = useContent();
  return shippingFromContent(content);
}

/** Customer-facing shipping policy, e.g. "Free shipping over ₹75 · otherwise ₹6.99". */
export function shippingPolicyText(s: ShippingSettings, short = false): string {
  if (s.fee === 0 || (s.freeShippingEnabled && s.freeShippingThreshold === 0)) {
    return short ? "Free shipping" : "Free shipping on every order.";
  }
  if (!s.freeShippingEnabled) {
    return short
      ? `Flat ${formatPrice(s.fee)} shipping`
      : `Flat ${formatPrice(s.fee)} shipping on every order.`;
  }
  return short
    ? `Free shipping over ${formatPrice(s.freeShippingThreshold)}`
    : `Free shipping on orders over ${formatPrice(s.freeShippingThreshold)} — otherwise ${formatPrice(s.fee)} flat.`;
}

const EMPTY_CART: CartResponse = {
  items: [],
  subtotal: 0,
  discount: 0,
  vat: 0,
  itemsTotal: 0,
  shipping: 0,
  total: 0,
  count: 0,
};

/** The shopper's bag (kept in the browser), priced by the API. */
export function useCart() {
  const lines = useBag((s) => s.lines);
  return useQuery({
    queryKey: ["cart", lines],
    queryFn: () =>
      lines.length
        ? apiPost<CartResponse>("/api/cart", { items: lines })
        : Promise.resolve(EMPTY_CART),
    // keep showing the last totals while a quantity change is re-priced
    placeholderData: keepPreviousData,
  });
}

/** Debounce any fast-changing value (search inputs etc.). */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Smooth-scroll to a section id, navigating home first if needed. */
export function useGoToSection() {
  const navigate = useStore((s) => s.navigate);
  const view = useStore((s) => s.view);
  return (sectionId: string) => {
    const scroll = () => {
      requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      });
    };
    if (view.name !== "home") {
      navigate({ name: "home" });
      setTimeout(scroll, 180);
    } else {
      scroll();
    }
  };
}
