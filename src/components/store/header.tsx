"use client";

import { Menu, ShoppingBag, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { LOGO_URL } from "@/lib/storage";
import { useCart, useContent, useGoToSection, useMe } from "./hooks";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

export function Header() {
  const { data: content } = useContent();
  const { data: user } = useMe();
  const { data: cart } = useCart();
  const navigate = useStore((s) => s.navigate);
  const setCartOpen = useStore((s) => s.setCartOpen);
  const goToSection = useGoToSection();
  const [menuOpen, setMenuOpen] = useState(false);

  const brandName = content?.brandName ?? "Fankari Maison";
  const announcement = content?.announcement ?? "";
  const count = cart?.count ?? 0;

  const goHomeShop = () => goToSection("shop");

  const navItems = (
    <>
      <button
        type="button"
        onClick={goHomeShop}
        className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground min-h-[44px]"
      >
        Shop
      </button>
      <button
        type="button"
        onClick={() => navigate({ name: "about" })}
        className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground min-h-[44px]"
      >
        About us
      </button>
      <button
        type="button"
        onClick={() => navigate({ name: "faq" })}
        className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground min-h-[44px]"
      >
        FAQ
      </button>
      <button
        type="button"
        onClick={() => navigate({ name: "contact" })}
        className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground min-h-[44px]"
      >
        Contact us
      </button>
      {user?.role === "ADMIN" && (
        <button
          type="button"
          onClick={() => navigate({ name: "admin" })}
          className="rounded-md px-3 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent hover:text-accent-foreground min-h-[44px]"
        >
          Admin
        </button>
      )}
    </>
  );

  return (
    <div className="sticky top-0 z-40">
      {announcement && (
        <div className="bg-teal px-4 py-2 text-center text-xs font-medium tracking-wide text-white sm:text-[13px]">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{announcement}</span>
          </span>
        </div>
      )}
      <header className="border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <button
            type="button"
            onClick={() => navigate({ name: "home" })}
            className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${brandName} — go to home`}
          >
            <img
              src={LOGO_URL}
              alt=""
              aria-hidden
              className="size-9 rounded-full object-cover"
            />
            <span className="font-display text-lg font-semibold tracking-tight text-brand sm:text-xl">
              {brandName}
            </span>
          </button>

          {/* Desktop nav */}
          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Main navigation"
          >
            {navItems}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="relative size-11 rounded-full"
              onClick={() => setCartOpen(true)}
              aria-label={`Open bag (${count} item${count === 1 ? "" : "s"})`}
            >
              <ShoppingBag className="size-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Button>

            {/* Mobile menu */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-full md:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72" aria-describedby={undefined}>
                <SheetHeader>
                  <SheetTitle className="font-display text-lg text-brand">
                    {brandName}
                  </SheetTitle>
                </SheetHeader>
                <nav
                  className="flex flex-col gap-1 px-4"
                  aria-label="Mobile navigation"
                  onClick={() => setMenuOpen(false)}
                >
                  {navItems}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </div>
  );
}
