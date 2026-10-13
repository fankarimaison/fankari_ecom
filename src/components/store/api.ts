"use client";

/**
 * Typed API client for the Terra & Thread storefront.
 * Written against docs/api-contract.md EXACTLY — all URLs are relative.
 */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: "same-origin",
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError("Network error — please try again", 0);
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // ignore body parse errors
    }
    throw new ApiError(message, res.status);
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

/* ---------------------------------- DTOs ---------------------------------- */

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
  price: number;
  stock: number;
  category: string;
  image: string;
  materials: string | null;
  dimensions: string | null;
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
  count: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus | string;
  subtotal: number;
  shipping: number;
  total: number;
  customerName: string;
  email: string;
  phone: string | null;
  address: string;
  city: string;
  postalCode: string | null;
  notes: string | null;
  createdAt: string;
  items: OrderItem[];
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

export const categories = [
  "Canvas",
  "Straw & Jute",
  "Leather Trim",
  "Linen",
  "Special Edition",
] as const;
