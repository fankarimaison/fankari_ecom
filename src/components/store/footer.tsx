"use client";

import { Copyright, Mail, MapPin, Phone } from "lucide-react";
import { useStore } from "@/lib/store";
import { LOGO_URL } from "@/lib/storage";
import { useContent, useGoToSection } from "./hooks";

export function Footer() {
  const { data: content } = useContent();
  const navigate = useStore((s) => s.navigate);
  const goToSection = useGoToSection();
  const brandName = content?.brandName ?? "Fankari Maison";
  // Edited in Admin → Content; an empty value hides that line
  const footerText = content?.footerText?.trim() ?? "";
  const contactEmail = content?.contactEmail?.trim() ?? "";
  const contactPhone = content?.contactPhone?.trim() ?? "";
  const contactAddress = content?.contactAddress?.trim() ?? "";

  return (
    <footer className="mt-auto border-t border-teal/15 bg-teal-light">
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
            {footerText && (
              <p className="mt-3 max-w-xs whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {footerText}
              </p>
            )}
          </div>

          {/* Quick links */}
          <nav aria-label="Footer navigation">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-teal">
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
                  onClick={() => navigate({ name: "about" })}
                  className="rounded px-1 py-1.5 text-sm text-muted-foreground transition-colors hover:text-accent-foreground"
                >
                  About us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ name: "faq" })}
                  className="rounded px-1 py-1.5 text-sm text-muted-foreground transition-colors hover:text-accent-foreground"
                >
                  FAQ
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ name: "contact" })}
                  className="rounded px-1 py-1.5 text-sm text-muted-foreground transition-colors hover:text-accent-foreground"
                >
                  Contact us
                </button>
              </li>
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-teal">
              Get in touch
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {contactEmail && (
                <li className="flex items-center gap-2">
                  <Mail className="size-4 shrink-0 text-teal" aria-hidden />
                  <a
                    href={`mailto:${contactEmail}`}
                    className="break-all transition-colors hover:text-accent-foreground"
                  >
                    {contactEmail}
                  </a>
                </li>
              )}
              {contactPhone && (
                <li className="flex items-center gap-2">
                  <Phone className="size-4 shrink-0 text-teal" aria-hidden />
                  <a
                    href={`tel:${contactPhone.replace(/[^\d+]/g, "")}`}
                    className="transition-colors hover:text-accent-foreground"
                  >
                    {contactPhone}
                  </a>
                </li>
              )}
              {contactAddress && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
                  <span className="whitespace-pre-line">{contactAddress}</span>
                </li>
              )}
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ name: "contact" })}
                  className="rounded py-1 text-sm font-medium text-teal underline-offset-2 hover:underline"
                >
                  Send us a message →
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-teal/15 pt-5 text-xs text-muted-foreground sm:flex-row">
          <p className="inline-flex items-center gap-1">
            <Copyright className="size-3.5 shrink-0 text-teal" aria-label="Copyright" />
            {new Date().getFullYear()} {brandName}. All rights reserved.
          </p>
          <p>
            Handcrafted in small batches · Natural materials · Fair wages
            {/* Studio team only — shoppers never sign in */}
            {" · "}
            <button
              type="button"
              onClick={() => navigate({ name: "admin" })}
              className="underline-offset-2 transition-colors hover:text-accent-foreground hover:underline"
            >
              Admin login
            </button>
          </p>
        </div>
      </div>
      {/* Safe area for notched devices */}
      <div className="h-[env(safe-area-inset-bottom)]" aria-hidden />
    </footer>
  );
}
