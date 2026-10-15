"use client";

import { format } from "date-fns";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

/** Format a number as Indian Rupees, e.g. 4200 → "₹4,200.00" */
export function formatPrice(value: number): string {
  return inr.format(value);
}

/** Format an ISO date string / Date as "Jan 3, 2025" */
export function formatDate(value: string | Date): string {
  return format(new Date(value), "MMM d, yyyy");
}

/** Format an ISO timestamp as "Jan 3, 2025 · 4:05 PM" */
export function formatDateTime(value: string | Date): string {
  return format(new Date(value), "MMM d, yyyy · h:mm a");
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
    case "OUT_FOR_DELIVERY":
      return "Out for delivery";
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
    case "OUT_FOR_DELIVERY":
      return "bg-yellow-100 text-yellow-900 border-yellow-200";
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
