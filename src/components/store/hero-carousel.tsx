"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 5000;

/**
 * Home page banner: slides through the banner images every few seconds.
 * Pauses while hovered or focused, and stays still for visitors who prefer
 * reduced motion. Arrows, dots and swipe switch slides by hand.
 */
export function HeroCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const many = images.length > 1;
  const active = Math.min(index, images.length - 1);

  const go = (i: number) => setIndex((i + images.length) % images.length);

  useEffect(() => {
    if (!many || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % images.length), INTERVAL_MS);
    return () => clearTimeout(t);
  }, [index, many, paused, images.length]);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl shadow-xl shadow-stone-900/10 ring-1 ring-stone-900/5"
      role={many ? "region" : undefined}
      aria-roledescription={many ? "carousel" : undefined}
      aria-label={many ? "Featured photos" : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null || !many) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1));
      }}
    >
      {/* Slides side by side on one track; the track slides to the active one */}
      <div className="relative aspect-[2/1] w-full overflow-hidden sm:aspect-[16/10]">
        <div
          className="flex h-full transition-transform duration-700 ease-in-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {images.map((src, i) => (
            <img
              key={`${src}-${i}`}
              src={src}
              alt={i === active ? alt : ""}
              aria-hidden={i !== active}
              loading={i === 0 ? "eager" : "lazy"}
              draggable={false}
              className="h-full w-full min-w-full shrink-0 select-none object-cover"
            />
          ))}
        </div>
      </div>

      {many && (
        <>
          <button
            type="button"
            onClick={() => go(active - 1)}
            className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 shadow-md backdrop-blur transition group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100"
            aria-label="Previous photo"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(active + 1)}
            className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 shadow-md backdrop-blur transition group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100"
            aria-label="Next photo"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1} of ${images.length}`}
                aria-current={i === active ? "true" : undefined}
                className="flex h-6 items-center px-0.5"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full bg-white shadow transition-all",
                    i === active ? "w-6" : "w-1.5 opacity-60 hover:opacity-90"
                  )}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
