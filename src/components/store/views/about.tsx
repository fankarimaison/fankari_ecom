"use client";

import { motion } from "framer-motion";
import { ArrowRight, Quote, Sparkles } from "lucide-react";
import { HERO_IMAGE_URL } from "@/lib/storage";
import { useStore } from "@/lib/store";
import { foundersFromContent, initials, type Founder } from "@/lib/about";
import { useContent } from "../hooks";
import { craftValues } from "./home";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Fade-and-rise as a block scrolls into view. */
const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: "easeOut" },
} as const;

/** About Us — story, founders and values (Admin → About page). */
export function AboutView() {
  const navigate = useStore((s) => s.navigate);
  const { data: content } = useContent();

  const brandName = content?.brandName ?? "Fankari Maison";
  const title = content?.aboutTitle || "Crafted Slowly, Made to Last";
  const tagline = content?.aboutTagline ?? "";
  const story = (content?.aboutText ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const storyImage = content?.aboutImage || HERO_IMAGE_URL;
  const mission = content?.aboutMission ?? "";
  const founders = foundersFromContent(content);

  return (
    <div className="overflow-x-clip">
      {/* ------------------------------- Hero ------------------------------- */}
      <section className="relative isolate overflow-hidden bg-teal text-white">
        <div aria-hidden className="absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-brand/40 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 -left-20 -z-10 size-96 rounded-full bg-teal-light/15 blur-3xl" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[0.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]"
        />
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] ring-1 ring-white/20"
          >
            <Sparkles className="size-3.5" aria-hidden /> About {brandName}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="font-display mt-6 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
          >
            {title}
          </motion.h1>
          {tagline && (
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg"
            >
              {tagline}
            </motion.p>
          )}
        </div>
        {/* Soft wave into the page */}
        <svg
          aria-hidden
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          className="block h-8 w-full fill-background sm:h-12"
        >
          <path d="M0 60V30C240 0 480 0 720 22s480 38 720 8v30H0Z" />
        </svg>
      </section>

      {/* ------------------------------- Story ------------------------------ */}
      {story.length > 0 && (
        <section aria-labelledby="story-heading" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <motion.div {...reveal} className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div aria-hidden className="absolute -left-4 -top-4 h-full w-full rounded-3xl bg-brand-light sm:-left-6 sm:-top-6" />
              <img
                src={storyImage}
                alt={`Inside the ${brandName} studio`}
                loading="lazy"
                className="relative aspect-[4/5] w-full rounded-3xl object-cover shadow-xl shadow-stone-900/15 ring-1 ring-stone-900/5 sm:aspect-[4/3] lg:aspect-[4/5]"
              />
              <div className="absolute -bottom-5 right-5 rounded-2xl bg-card px-5 py-3 shadow-lg ring-1 ring-border">
                <p className="font-display text-lg font-semibold text-brand">Handmade</p>
                <p className="text-xs text-muted-foreground">in small batches</p>
              </div>
            </motion.div>

            <motion.div {...reveal}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Our story</p>
              <h2 id="story-heading" className="font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                How it all began
              </h2>
              <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-stone-600 sm:text-base">
                {story.map((p, i) => (
                  <p
                    key={i}
                    className={cn(
                      i === 0 &&
                        "first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-5xl first-letter:font-semibold first-letter:leading-[0.9] first-letter:text-brand"
                    )}
                  >
                    {p}
                  </p>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ----------------------------- Founders ----------------------------- */}
      {founders.length > 0 && (
        <section aria-labelledby="founders-heading" className="bg-teal-light/60">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <motion.div {...reveal} className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">The people behind the bags</p>
              <h2 id="founders-heading" className="font-display mt-2 text-3xl font-semibold tracking-tight text-teal sm:text-4xl">
                Meet the {founders.length === 1 ? "Founder" : "Founders"}
              </h2>
            </motion.div>

            <div className="mt-12 space-y-16 lg:space-y-24">
              {founders.map((f, i) => (
                <FounderFeature key={`${f.name}-${i}`} founder={f} flip={i % 2 === 1} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------ Mission ----------------------------- */}
      {mission && (
        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:py-24">
          <motion.figure {...reveal}>
            <Quote className="mx-auto size-10 text-brand/30" aria-hidden />
            <blockquote className="font-display mt-4 text-2xl font-medium leading-snug tracking-tight text-stone-800 sm:text-3xl lg:text-4xl">
              {mission}
            </blockquote>
            <figcaption className="mt-6 flex items-center justify-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal">
              <span aria-hidden className="h-px w-10 bg-teal/40" />
              Our promise
              <span aria-hidden className="h-px w-10 bg-teal/40" />
            </figcaption>
          </motion.figure>
        </section>
      )}

      {/* ------------------------------ Values ------------------------------ */}
      <section aria-labelledby="values-heading" className="border-t border-border/70 bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <h2 id="values-heading" className="font-display text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            What we believe in
          </h2>
          <ul className="mt-10 grid gap-5 sm:grid-cols-3">
            {craftValues.map(({ icon: Icon, title, text }, i) => (
              <motion.li
                key={title}
                {...reveal}
                transition={{ ...reveal.transition, delay: i * 0.1 }}
                className="group rounded-2xl border border-border/70 bg-background p-6 transition-shadow hover:shadow-lg hover:shadow-stone-900/5"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-light text-brand transition-transform group-hover:-rotate-6 group-hover:scale-110">
                  <Icon className="size-6" aria-hidden />
                </span>
                <p className="font-display mt-4 text-lg font-semibold">{title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* -------------------------------- CTA ------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          {...reveal}
          className="relative isolate overflow-hidden rounded-3xl bg-brand px-6 py-12 text-center text-white sm:px-12"
        >
          <div aria-hidden className="absolute -right-16 -top-16 -z-10 size-64 rounded-full bg-white/10" />
          <div aria-hidden className="absolute -bottom-20 -left-10 -z-10 size-56 rounded-full bg-teal/30" />
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Find a tote you&apos;ll carry for years
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            Every piece is made by hand, in small batches — when a batch is gone, it&apos;s gone.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              className="min-h-12 rounded-full bg-white px-7 text-base text-brand hover:bg-white/90"
              onClick={() => navigate({ name: "home" })}
            >
              Shop the collection <ArrowRight className="size-4" aria-hidden />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="min-h-12 rounded-full border-white/60 bg-transparent px-7 text-base text-white hover:bg-white/10 hover:text-white"
              onClick={() => navigate({ name: "contact" })}
            >
              Say hello
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

/** One founder: portrait on one side, their story on the other (alternating). */
function FounderFeature({ founder, flip }: { founder: Founder; flip: boolean }) {
  const bio = founder.bio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <motion.article
      {...reveal}
      className="grid items-center gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12"
    >
      <div className={cn("relative mx-auto w-full max-w-sm", flip && "md:order-2")}>
        {/* Offset brand frame behind the portrait */}
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 translate-x-3 translate-y-3 rounded-[2rem] border-2",
            flip ? "border-teal/40 -translate-x-3" : "border-brand/40"
          )}
        />
        <div className="relative overflow-hidden rounded-[2rem] bg-card shadow-xl shadow-stone-900/15 ring-1 ring-stone-900/5">
          {founder.image ? (
            <img
              src={founder.image}
              alt={founder.name ? `Portrait of ${founder.name}` : "Founder portrait"}
              loading="lazy"
              className="aspect-[4/5] w-full object-cover transition-transform duration-700 hover:scale-105"
            />
          ) : (
            <div
              aria-hidden
              className={cn(
                "flex aspect-[4/5] w-full items-center justify-center bg-gradient-to-br",
                flip ? "from-teal to-teal-dark" : "from-brand to-brand-dark"
              )}
            >
              <span className="font-display text-7xl font-semibold text-white/90">
                {initials(founder.name)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className={cn("text-center md:text-left", flip && "md:order-1 md:text-right")}>
        {founder.role && (
          <p className={cn("text-xs font-semibold uppercase tracking-[0.2em]", flip ? "text-teal" : "text-brand")}>
            {founder.role}
          </p>
        )}
        <h3 className="font-display mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          {founder.name}
        </h3>
        <span
          aria-hidden
          className={cn(
            "mt-4 block h-1 w-14 rounded-full mx-auto md:mx-0",
            flip ? "bg-teal md:ml-auto" : "bg-brand"
          )}
        />
        <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-stone-600 sm:text-base">
          {bio.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {founder.quote && (
          <blockquote
            className={cn(
              "font-display mt-6 border-l-4 bg-card/70 py-3 pl-4 pr-4 text-lg italic text-stone-800 text-left rounded-r-xl",
              flip ? "border-teal md:ml-auto md:max-w-md" : "border-brand md:max-w-md"
            )}
          >
            &ldquo;{founder.quote}&rdquo;
          </blockquote>
        )}
      </div>
    </motion.article>
  );
}
