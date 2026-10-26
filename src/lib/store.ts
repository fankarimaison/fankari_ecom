"use client";

import { create } from "zustand";

/**
 * Client-side view navigation for the single-page storefront.
 * Views are switched in memory; each one is mirrored to a URL (/about,
 * /product/<id>…) with the History API so refresh, back and shared links work.
 * "/" is app/page.tsx; every other path is the catch-all app/[...slug].
 */
export type View =
  | { name: "home" }
  | { name: "product"; productId: string }
  | { name: "cart" }
  | { name: "checkout" }
  | { name: "order-success"; orderId: string }
  | { name: "contact" }
  | { name: "faq" }
  | { name: "about" }
  /** one category's products (from the home page category tiles) */
  | { name: "category"; category: string }
  | {
      name: "admin";
      tab?:
        | "dashboard"
        | "products"
        | "categories"
        | "inventory"
        | "orders"
        | "messages"
        | "faq"
        | "about"
        | "shipping"
        | "content";
    };

export interface StoreState {
  view: View;
  /** false until StoreApp has read the view from the browser's URL */
  ready: boolean;
  navigate: (view: View) => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
}

export const useStore = create<StoreState>((set) => ({
  view: { name: "home" },
  ready: false,
  navigate: (view) => {
    const path = viewPath(view);
    if (typeof window !== "undefined" && path !== window.location.pathname) {
      window.history.pushState(null, "", path);
    }
    set({ view, cartOpen: false });
  },
  cartOpen: false,
  setCartOpen: (open) => set({ cartOpen: open }),
}));

const ADMIN_TABS = [
  "dashboard",
  "products",
  "categories",
  "inventory",
  "orders",
  "messages",
  "faq",
  "about",
  "shipping",
  "content",
] as const;

/** URL path for a view. */
export function viewPath(view: View): string {
  const seg = encodeURIComponent;
  switch (view.name) {
    case "home":
      return "/";
    case "product":
      return `/product/${seg(view.productId)}`;
    case "category":
      return `/category/${seg(view.category)}`;
    case "admin":
      return view.tab && view.tab !== "dashboard" ? `/admin/${view.tab}` : "/admin";
    // The order summary only exists right after checkout — a reload goes home
    case "order-success":
      return "/";
    default:
      return `/${view.name}`;
  }
}

/** View for decoded path segments (unknown paths → home). */
export function viewFromSegments(segments: string[]): View {
  const [first, second] = segments;
  switch (first) {
    case undefined:
      return { name: "home" };
    case "product":
      return second ? { name: "product", productId: second } : { name: "home" };
    case "category":
      return second ? { name: "category", category: second } : { name: "home" };
    case "admin": {
      const tab = ADMIN_TABS.find((t) => t === second);
      return tab ? { name: "admin", tab } : { name: "admin" };
    }
    case "cart":
    case "checkout":
    case "contact":
    case "faq":
    case "about":
      return { name: first };
    default:
      return { name: "home" };
  }
}

/** View for a browser pathname such as "/category/Straw%20%26%20Jute". */
export function viewFromPathname(pathname: string): View {
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });
  return viewFromSegments(segments);
}

/** Stable string key for a view (used for animation keys / comparisons). */
export function viewKey(view: View): string {
  switch (view.name) {
    case "product":
      return `product:${view.productId}`;
    case "category":
      return `category:${view.category}`;
    case "order-success":
      return `order-success:${view.orderId}`;
    case "admin":
      return `admin:${view.tab ?? "dashboard"}`;
    default:
      return view.name;
  }
}
