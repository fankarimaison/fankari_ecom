"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { apiGet, type CartResponse, type SiteContent, type User } from "./api";

/** Current session user — null when signed out. */
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

/** Logged-in user's cart. Disabled while signed out (API would 401). */
export function useCart(enabled: boolean) {
  return useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const data = await apiGet<CartResponse>("/api/cart");
      return data;
    },
    enabled,
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
