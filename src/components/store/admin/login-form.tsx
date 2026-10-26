"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { apiPost, type User } from "../api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Studio admin sign-in — Supabase Auth email + password (no sign-up). */
export function AdminLoginForm() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: () => apiPost<{ user: User }>("/api/auth/login", { email, password }),
    onSuccess: ({ user }) => {
      setPassword("");
      queryClient.setQueryData(["me"], user);
    },
  });

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary">
            <Lock className="size-5 text-secondary-foreground" aria-hidden />
          </span>
          <CardTitle className="font-display mt-2 text-2xl">Admin login</CardTitle>
          <CardDescription>For the Fankari Maison studio team only.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim() && password) login.mutate();
            }}
          >
            <div>
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                className="mt-1.5 min-h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                className="mt-1.5 min-h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {login.isError && (
              <p className="text-sm font-medium text-destructive" role="alert">
                {login.error instanceof Error ? login.error.message : "Could not sign in"}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              className="min-h-11 rounded-full"
              disabled={login.isPending || !email.trim() || !password}
            >
              {login.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {login.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/** Ends the admin session and returns to the shop. */
export function AdminSignOutButton() {
  const queryClient = useQueryClient();
  const navigate = useStore((s) => s.navigate);
  const { toast } = useToast();

  const logout = useMutation({
    mutationFn: () => apiPost<{ success: boolean }>("/api/auth/logout"),
    onSuccess: () => {
      queryClient.setQueryData(["me"], null);
      for (const key of ["admin-stats", "admin-orders", "admin-messages"]) {
        queryClient.removeQueries({ queryKey: [key] });
      }
      toast({ title: "Signed out" });
      navigate({ name: "home" });
    },
    onError: (error) => {
      toast({
        title: "Could not sign out",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      variant="outline"
      className="min-h-10 rounded-full"
      disabled={logout.isPending}
      onClick={() => logout.mutate()}
    >
      <LogOut className="size-4" aria-hidden /> Sign out
    </Button>
  );
}
