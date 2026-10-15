"use client";

import { Mail, MapPin } from "lucide-react";
import { useStore } from "@/lib/store";
import { LOGO_URL } from "@/lib/storage";
import { useContent, useGoToSection } from "./hooks";

export function Footer() {
  const { data: content } = useContent();
  const navigate = useStore((s) => s.navigate);
  const goToSection = useGoToSection();
  const brandName = content?.brandName ?? "Fankari Maison";

  return (
    <footer className="mt-auto border-t border-border/70 bg-card">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand blurb */}
          <div>
            <div className="flex items-center gap-2.5">
              <img
                src={LOGO_URL}
                alt=""
                aria-hidden
                className="size-8 rounded-full object-cover"
              />
              <span className="font-display text-lg font-semibold text-brand">
                {brandName}
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Small-batch totes handcrafted from natural canvas, jute and
              full-grain leather. Made slowly, carried daily, built to last.
            </p>
          </div>

          {/* Quick links */}
          <nav aria-label="Footer navigation">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-foreground/70">
              Explore
            </h3>
            <ul className="mt-3 space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => goToSection("shop")}
                  className="rounded px-1 py-1.5 text-sm text-muted-foreground transition-colors hover:text-accent-foreground"
                >
                  Shop the collection
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => goToSection("about")}
                  className="rounded px-1 py-1.5 text-sm text-muted-foreground transition-colors hover:text-accent-foreground"
                >
                  Our story
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ name: "account" })}
                  className="rounded px-1 py-1.5 text-sm text-muted-foreground transition-colors hover:text-accent-foreground"
                >
                  My account
                </button>
              </li>
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-foreground/70">
              Get in touch
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-primary" aria-hidden />
                <a
                  href="mailto:hello@fankarimaison.com"
                  className="transition-colors hover:text-accent-foreground"
                >
                  hello@fankarimaison.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
                <span>The Artisan Workshop, Portland, OR</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border/70 pt-5 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {brandName}. All rights reserved.
          </p>
          <p>Handcrafted in small batches · Natural materials · Fair wages</p>
        </div>
      </div>
      {/* Safe area for notched devices */}
      <div className="h-[env(safe-area-inset-bottom)]" aria-hidden />
    </footer>
  );
}
