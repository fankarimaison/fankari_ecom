"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";

/** Refetch session-scoped data whenever the Clerk user signs in, out or switches. */
function AuthSync() {
  const { isLoaded, userId } = useAuth();
  const queryClient = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    if (previous.current !== undefined && previous.current !== userId) {
      for (const key of ["me", "cart", "orders"]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    }
    previous.current = userId ?? null;
  }, [isLoaded, userId, queryClient]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync />
      {children}
    </QueryClientProvider>
  );
}
