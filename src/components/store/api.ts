"use client";

import type { MediaItem } from "@/lib/media";

/**
 * Typed API client for the Fankari Maison storefront.
 * Written against docs/api-contract.md EXACTLY — all URLs are relative.
 */

export class ApiError extends Error {
  status: number;
  /**
   * True when the backend reports the Supabase schema hasn't been applied yet
   * (`503 { error, setupRequired: true }` — the Setup guard in docs/api-contract.md).
   */
  setupRequired?: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Type guard — true when the error is the backend's "database not set up" signal. */
export function isSetupRequired(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err as Error & { setupRequired?: unknown }).setupRequired === true
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: "same-origin",
      ...init,
      headers: {
        ...(typeof init?.body === "string" ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError("Network error — please try again", 0);
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let setupRequired = false;
    try {
      const data = (await res.json()) as {
        error?: string;
        setupRequired?: boolean;
      };
      if (data?.error) message = data.error;
      if (data?.setupRequired === true) setupRequired = true;
    } catch {
      // ignore body parse errors
    }
    const err = new ApiError(message, res.status);
    if (setupRequired) err.setupRequired = true;
    throw err;
  }

  return (await res.json()) as T;
}

export const apiGet = <T,>(path: string) => request<T>(path);
export const apiPost = <T,>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
export const apiPut = <T,>(path: string, body?: unknown) =>
  request<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) });
export const apiPatch = <T,>(path: string, body?: unknown) =>
  request<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) });
export const apiDelete = <T,>(path: string) => request<T>(path, { method: "DELETE" });

/** Upload an image to Supabase Storage (admin only); resolves to its public URL. */
export async function uploadImage(
  file: File,
  folder: "products" | "site" | "categories"
): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  body.append("folder", folder);
  const data = await request<{ url: string }>("/api/admin/upload", { method: "POST", body });
  return data.url;
}

/**
 * Upload a product gallery photo or video (admin only). The file goes straight
 * from the browser to Supabase Storage through a signed URL, so large videos
 * never pass through the app server.
 */
export async function uploadMedia(file: File): Promise<MediaItem> {
  const { uploadUrl, url, type } = await request<{
    uploadUrl: string;
    url: string;
    type: MediaItem["type"];
  }>("/api/admin/upload-url", {
    method: "POST",
    body: JSON.stringify({ contentType: file.type, size: file.size }),
  });

  let res: Response;
  try {
    res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type, "cache-control": "max-age=31536000", "x-upsert": "false" },
      body: file,
    });
  } catch {
    throw new ApiError("Network error — please try again", 0);
  }
  if (!res.ok) throw new ApiError(`Upload failed (${res.status})`, res.status);
  return { type, url };
}

/* ---------------------------------- DTOs ---------------------------------- */

export type { MediaItem };

export type Role = "CUSTOMER" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** before VAT and discount */
  price: number;
  discountPercent: number;
  vatRate: number;
  stock: number;
  category: string;
  /** main image — cover in cards, the bag and order snapshots */
  image: string;
  /** extra photos and videos for the product page, in order */
  gallery: MediaItem[];
  materials: string | null;
  dimensions: string | null;
  /** one tip per line */
  careInstructions: string;
  featured: boolean;
  active: boolean;
  createdAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
}

export interface CartResponse {
  items: CartItem[];
  subtotal: number;
  discount: number;
  vat: number;
  itemsTotal: number;
  shipping: number;
  total: number;
  count: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  /** unit price charged — after discount, incl. VAT */
  price: number;
  quantity: number;
  image: string | null;
  discountPercent: number;
  vatRate: number;
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus | string;
  subtotal: number;
  discount: number;
  vat: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  customerName: string;
  email: string;
  phone: string | null;
  address: string;
  city: string;
  postalCode: string | null;
  notes: string | null;
  createdAt: string;
  courierName: string;
  trackingNumber: string;
  trackingUrl: string;
  /** YYYY-MM-DD */
  estimatedDelivery: string | null;
  items: OrderItem[];
  /** oldest first */
  events: OrderEvent[];
}

export interface OrderEvent {
  id: string;
  status: OrderStatus | string;
  note: string;
  createdAt: string;
}

/** A "Contact us" request (GET /api/admin/contact). */
export interface ContactRequest {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  handled: boolean;
  createdAt: string;
}

export interface AdminOrder extends Order {
  user: { name: string; email: string };
}

export interface AdminStats {
  revenue: number;
  orders: number;
  customers: number;
  products: number;
  lowStock: number;
  pending: number;
}

export type SiteContent = Record<string, string>;

/* -------------------------------- Queries --------------------------------- */

export interface ProductListParams {
  category?: string;
  search?: string;
  featured?: boolean;
  sort?: "new" | "price_asc" | "price_desc";
}

export function productsUrl(params: ProductListParams = {}): string {
  const qs = new URLSearchParams();
  if (params.category) qs.set("category", params.category);
  if (params.search) qs.set("search", params.search);
  if (params.featured) qs.set("featured", "1");
  if (params.sort) qs.set("sort", params.sort);
  const q = qs.toString();
  return `/api/products${q ? `?${q}` : ""}`;
}

/** A FAQ entry (Admin → FAQ). */
export interface Faq {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  published: boolean;
}

/** A product category (Admin → Categories). */
export interface Category {
  id: string;
  name: string;
  /** picture for the category tile; "" when none */
  image: string;
  sortOrder: number;
}
