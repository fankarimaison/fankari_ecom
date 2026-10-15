"use client";

import { create } from "zustand";

/**
 * Client-side view navigation for the single-page storefront.
 * The whole shop lives on the `/` route — views are switched in memory,
 * never via URL routing.
 */
export type View =
  | { name: "home" }
  | { name: "product"; productId: string }
  | { name: "cart" }
  | { name: "checkout" }
  | { name: "order-success"; orderId: string }
  | { name: "account" }
  | {
      name: "admin";
      tab?: "dashboard" | "products" | "inventory" | "orders" | "shipping" | "content";
    };

export interface StoreState {
  view: View;
  navigate: (view: View) => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
}

export const useStore = create<StoreState>((set) => ({
  view: { name: "home" },
  navigate: (view) => set({ view, cartOpen: false }),
  cartOpen: false,
  setCartOpen: (open) => set({ cartOpen: open }),
}));

/** Stable string key for a view (used for animation keys / comparisons). */
export function viewKey(view: View): string {
  switch (view.name) {
    case "product":
      return `product:${view.productId}`;
    case "order-success":
      return `order-success:${view.orderId}`;
    case "admin":
      return `admin:${view.tab ?? "dashboard"}`;
    default:
      return view.name;
  }
}
