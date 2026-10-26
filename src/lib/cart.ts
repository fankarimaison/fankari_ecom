"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * The shopper's bag. Shoppers never sign in, so the bag lives in the browser
 * (localStorage) as product ids + quantities; POST /api/cart prices it and
 * POST /api/orders checks it out.
 */
export interface BagLine {
  productId: string;
  quantity: number;
}

interface BagState {
  lines: BagLine[];
  add: (productId: string, quantity: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

export const useBag = create<BagState>()(
  persist(
    (set) => ({
      lines: [],
      add: (productId, quantity) =>
        set((s) =>
          s.lines.some((l) => l.productId === productId)
            ? {
                lines: s.lines.map((l) =>
                  l.productId === productId ? { ...l, quantity: l.quantity + quantity } : l
                ),
              }
            : { lines: [...s.lines, { productId, quantity }] }
        ),
      setQuantity: (productId, quantity) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.productId === productId ? { ...l, quantity } : l)),
        })),
      remove: (productId) =>
        set((s) => ({ lines: s.lines.filter((l) => l.productId !== productId) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: "fankari-bag",
      // Private windows / blocked storage throw — fall back to an in-memory bag
      storage: createJSONStorage(() => {
        try {
          return window.localStorage;
        } catch {
          const memory = new Map<string, string>();
          return {
            getItem: (k) => memory.get(k) ?? null,
            setItem: (k, v) => void memory.set(k, v),
            removeItem: (k) => void memory.delete(k),
          };
        }
      }),
      partialize: (s) => ({ lines: s.lines }),
      // The server renders an empty bag; StoreApp rehydrates after mount so
      // the first client render matches it.
      skipHydration: true,
    }
  )
);
