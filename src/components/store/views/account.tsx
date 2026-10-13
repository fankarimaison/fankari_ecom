"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Loader2,
  LogOut,
  Mail,
  PackageOpen,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { formatDate, formatPrice, statusBadgeClass, statusLabel } from "@/lib/format";
import {
  apiGet,
  apiPost,
  type Order,
  type User,
} from "../api";
import { useMe } from "../hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function AccountView() {
  const { data: user, isLoading } = useMe();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="mt-6 h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-14">
      {user ? <SignedIn user={user} /> : <SignedOut />}
    </div>
  );
}

/* ------------------------------ Signed out ------------------------------- */

function SignedOut() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary">
          <UserRound className="size-6 text-secondary-foreground" aria-hidden />
        </span>
        <CardTitle className="font-display text-2xl">Welcome to your studio account</CardTitle>
        <CardDescription>
          Sign in to use your bag, track orders and check out faster.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signin">
          <TabsList className="grid h-11 w-full grid-cols-2">
            <TabsTrigger value="signin" className="min-h-9">Sign in</TabsTrigger>
            <TabsTrigger value="register" className="min-h-9">Create account</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="mt-4">
            <LoginForm />
          </TabsContent>
          <TabsContent value="register" className="mt-4">
            <RegisterForm />
          </TabsContent>
        </Tabs>

        <div className="mt-5 rounded-lg border border-dashed border-amber-300 bg-accent p-3 text-xs leading-relaxed text-accent-foreground">
          <p className="font-semibold">Demo accounts</p>
          <p className="mt-1">
            Customer: <span className="font-mono">customer@example.com</span> /{" "}
            <span className="font-mono">customer123</span>
          </p>
          <p>
            Admin: <span className="font-mono">admin@terrathread.com</span> /{" "}
            <span className="font-mono">admin123</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function LoginForm() {
  const { toast } = useToast();
  const navigate = useStore((s) => s.navigate);
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: async () => {
      const data = await apiPost<{ user: User }>("/api/auth/login", {
        email: email.trim(),
        password,
      });
      return data.user;
    },
    onSuccess: (user) => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: `Welcome back, ${user.name.split(" ")[0]}!` });
      navigate({ name: "home" });
    },
    onError: (error) => {
      toast({
        title: "Sign in failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        login.mutate();
      }}
    >
      <div>
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          required
          autoComplete="email"
          className="mt-1.5 min-h-11"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1.5 min-h-11"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button
        type="submit"
        size="lg"
        disabled={login.isPending}
        className="min-h-11 w-full rounded-full"
      >
        {login.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Sign in
      </Button>
    </form>
  );
}

function RegisterForm() {
  const { toast } = useToast();
  const navigate = useStore((s) => s.navigate);
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const register = useMutation({
    mutationFn: async () => {
      const data = await apiPost<{ user: User }>("/api/auth/register", {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      return data.user;
    },
    onSuccess: (user) => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast({ title: `Welcome, ${user.name.split(" ")[0]}!`, description: "Your account is ready." });
      navigate({ name: "home" });
    },
    onError: (error) => {
      toast({
        title: "Could not create account",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        register.mutate();
      }}
    >
      <div>
        <Label htmlFor="register-name">Name</Label>
        <Input
          id="register-name"
          required
          autoComplete="name"
          className="mt-1.5 min-h-11"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          type="email"
          required
          autoComplete="email"
          className="mt-1.5 min-h-11"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="register-password">Password</Label>
        <Input
          id="register-password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="mt-1.5 min-h-11"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="mt-1 text-xs text-muted-foreground">At least 6 characters.</p>
      </div>
      <Button
        type="submit"
        size="lg"
        disabled={register.isPending}
        className="min-h-11 w-full rounded-full"
      >
        {register.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Create account
      </Button>
    </form>
  );
}

/* ------------------------------- Signed in ------------------------------- */

function SignedIn({ user }: { user: User }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useStore((s) => s.navigate);

  const logout = useMutation({
    mutationFn: () => apiPost<{ success: boolean }>("/api/auth/logout"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Signed out. See you soon!" });
      navigate({ name: "home" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Greeting card */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary">
              <UserRound className="size-6 text-secondary-foreground" aria-hidden />
            </span>
            <div>
              <p className="font-display text-xl font-semibold">
                Hello, {user.name.split(" ")[0]}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-3.5" aria-hidden /> {user.email}
              </p>
            </div>
            {user.role === "ADMIN" && (
              <Badge className="bg-primary text-primary-foreground">
                <ShieldCheck className="size-3.5" aria-hidden /> Admin
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {user.role === "ADMIN" && (
              <Button
                variant="outline"
                className="min-h-11 rounded-full"
                onClick={() => navigate({ name: "admin" })}
              >
                Studio admin
              </Button>
            )}
            <Button
              variant="outline"
              className="min-h-11 rounded-full"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              <LogOut className="size-4" aria-hidden /> Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Order history */}
      <OrderHistory />
    </div>
  );
}

function OrderHistory() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const data = await apiGet<{ orders: Order[] }>("/api/orders");
      return data.orders;
    },
  });

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section aria-labelledby="orders-heading">
      <h2 id="orders-heading" className="font-display text-xl font-semibold tracking-tight">
        Order history
      </h2>

      {isLoading ? (
        <div className="mt-4 space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card py-14 text-center">
          <PackageOpen className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">No orders yet</p>
          <p className="text-sm text-muted-foreground">
            When you place an order it will appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((order) => {
            const isOpen = expanded.has(order.id);
            return (
              <li key={order.id}>
                <Card className="overflow-hidden p-0 gap-0">
                  <button
                    type="button"
                    onClick={() => toggle(order.id)}
                    aria-expanded={isOpen}
                    className="flex w-full flex-wrap items-center gap-3 p-4 text-left transition-colors hover:bg-accent/50"
                  >
                    <div className="flex min-w-40 flex-1 flex-col gap-0.5">
                      <span className="font-mono text-sm font-semibold tracking-wide">
                        {order.orderNumber}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt)} · {order.items.length} item
                        {order.items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={statusBadgeClass(String(order.status))}>
                        {statusLabel(String(order.status))}
                      </Badge>
                      <span className="text-sm font-semibold">
                        {formatPrice(order.total)}
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-4 text-muted-foreground transition-transform",
                          isOpen && "rotate-180"
                        )}
                        aria-hidden
                      />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-border/60 bg-muted/40 p-4">
                      <ul className="space-y-3">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex items-center gap-3">
                            <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatPrice(item.price)} × {item.quantity}
                              </p>
                            </div>
                            <p className="text-sm font-semibold">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
                        <p>
                          <span className="font-medium text-foreground">Ship to: </span>
                          {order.customerName}, {order.address}, {order.city}
                          {order.postalCode ? ` ${order.postalCode}` : ""}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Summary: </span>
                          {formatPrice(order.subtotal)} +{" "}
                          {order.shipping === 0 ? "free shipping" : formatPrice(order.shipping)}{" "}
                          shipping = {formatPrice(order.total)}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
