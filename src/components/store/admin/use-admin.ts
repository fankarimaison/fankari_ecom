"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { statusLabel } from "@/lib/format";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  ApiError,
  type AdminOrder,
  type AdminStats,
  type Product,
} from "../api";

/**
 * Admin product list. GET /api/products is contract-defined as active-only;
 * we optimistically ask for inactive products too (?includeInactive=1). If the
 * backend ignores the flag we simply render what returns.
 */
export function useAdminProducts() {
  return useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => {
      const data = await apiGet<{ products: Product[] }>(
        "/api/products?includeInactive=1"
      );
      return data.products;
    },
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const data = await apiGet<{ stats: AdminStats }>("/api/admin/stats");
      return data.stats;
    },
  });
}

export function useAdminOrders() {
  return useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const data = await apiGet<{ orders: AdminOrder[] }>("/api/admin/orders");
      return data.orders;
    },
  });
}

function useInvalidateAdmin() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["products"] });
    void queryClient.invalidateQueries({ queryKey: ["product"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    void queryClient.invalidateQueries({ queryKey: ["cart"] });
  }, [queryClient]);
}

export interface AdminProductInput {
  name: string;
  description: string;
  price: number;
  discountPercent: number;
  vatRate: number;
  stock: number;
  category: string;
  image: string;
  materials?: string;
  dimensions?: string;
  featured?: boolean;
  active?: boolean;
}

export function useAdminProductMutations() {
  const { toast } = useToast();
  const invalidate = useInvalidateAdmin();

  const onForbidden = useCallback(
    (error: unknown, fallback: string) => {
      if (error instanceof ApiError && error.status === 403) {
        toast({
          title: "Admin access required",
          description: "Sign in with an admin account.",
          variant: "destructive",
        });
      } else {
        toast({
          title: fallback,
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const create = useMutation({
    mutationFn: async (input: AdminProductInput) => {
      const data = await apiPost<{ product: Product }>("/api/products", input);
      return data.product;
    },
    onSuccess: (product) => {
      invalidate();
      toast({ title: "Product created", description: product.name });
    },
    onError: (e) => onForbidden(e, "Could not create product"),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<AdminProductInput>) => {
      const data = await apiPut<{ product: Product }>(`/api/products/${id}`, input);
      return data.product;
    },
    onSuccess: (product) => {
      invalidate();
      toast({ title: "Product updated", description: product.name });
    },
    onError: (e) => onForbidden(e, "Could not update product"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => apiDelete<{ success: boolean }>(`/api/products/${id}`),
    onSuccess: () => {
      invalidate();
      toast({ title: "Product deleted" });
    },
    onError: (e) => onForbidden(e, "Could not delete product"),
  });

  return { create, update, remove };
}

/** Fields an admin can change on an order; status changes and notes join the timeline. */
export interface AdminOrderPatch {
  status?: string;
  courierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  /** YYYY-MM-DD, or null to clear */
  estimatedDelivery?: string | null;
  note?: string;
}

export function useAdminOrderStatusMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & AdminOrderPatch) => {
      const data = await apiPatch<{ order: AdminOrder }>(`/api/admin/orders/${id}`, patch);
      return data.order;
    },
    onSuccess: (order, patch) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["track"] });
      toast({
        title:
          patch.status !== undefined && Object.keys(patch).length === 1
            ? `Order ${order.orderNumber} → ${statusLabel(String(order.status))}`
            : `Order ${order.orderNumber} updated`,
      });
    },
    onError: (error) => {
      toast({
        title: "Could not update order",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });
}
