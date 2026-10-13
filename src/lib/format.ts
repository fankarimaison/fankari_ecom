"use client";

import { format } from "date-fns";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Format a number as USD currency, e.g. 42 → "$42.00" */
export function formatPrice(value: number): string {
  return usd.format(value);
}

/** Format an ISO date string / Date as "Jan 3, 2025" */
export function formatDate(value: string | Date): string {
  return format(new Date(value), "MMM d, yyyy");
}

/** Free-shipping threshold shared with the API contract. */
export const FREE_SHIPPING_THRESHOLD = 75;
export const FLAT_SHIPPING_RATE = 6.99;

/** Shipping for a subtotal: free over $75, else $6.99 flat. */
export function shippingFor(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE;
}

/** Human label for an order status. */
export function statusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "CONFIRMED":
      return "Confirmed";
    case "SHIPPED":
      return "Shipped";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

/** Tailwind classes per order status (warm palette — no blue/indigo/purple). */
export function statusBadgeClass(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "SHIPPED":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "DELIVERED":
      return "bg-lime-100 text-lime-800 border-lime-200";
    case "CANCELLED":
      return "bg-red-100 text-red-800 border-red-200";
    case "PENDING":
    default:
      return "bg-stone-100 text-stone-700 border-stone-200";
  }
}

/** Truncate a name to two lines' worth for cards. */
export function clampName(name: string, max = 48): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}
