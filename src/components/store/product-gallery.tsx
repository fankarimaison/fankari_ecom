"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Play, X, ZoomIn, ZoomOut } from "lucide-react";
import type { MediaItem } from "@/lib/media";
import { cn } from "@/lib/utils";

/**
 * Product page media: the main image first, then the gallery's photos and
 * videos. Arrows, swipe or thumbnails switch between them; photos magnify on
 * hover and open a full-screen zoom viewer on click / tap.
 */
export function ProductGallery({
  name,
  image,
  gallery,
  soldOut,
}: {
  name: string;
  image: string;
  gallery: MediaItem[];
  soldOut?: boolean;
}) {
  const media: MediaItem[] = [{ type: "image", url: image }, ...gallery];
  const [index, setIndex] = useState(0);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const touchX = useRef<number | null>(null);
  // a swipe also fires a click — don't open the viewer for it
  const swiped = useRef(false);
  const current = media[Math.min(index, media.length - 1)];
  const many = media.length > 1;

  const go = (i: number) => {
    setHover(null);
    setIndex((i + media.length) % media.length);
  };

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-2xl bg-muted shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5"
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
          swiped.current = false;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null || !many) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 40) {
            swiped.current = true;
            go(index + (dx < 0 ? 1 : -1));
          }
        }}
      >
        {current.type === "video" ? (
          <video
            key={current.url}
            src={current.url}
            controls
            playsInline
            preload="metadata"
            className="aspect-square w-full bg-black object-contain"
          />
        ) : (
          // Hover (mouse) magnifies under the cursor; click / tap opens the viewer
          <button
            type="button"
            className="block w-full cursor-zoom-in overflow-hidden"
            aria-label="Zoom photo"
            onClick={() => {
              if (swiped.current) return;
              setViewerOpen(true);
            }}
            onPointerMove={(e) => {
              if (e.pointerType !== "mouse") return;
              const r = e.currentTarget.getBoundingClientRect();
              setHover({
                x: ((e.clientX - r.left) / r.width) * 100,
                y: ((e.clientY - r.top) / r.height) * 100,
              });
            }}
            onPointerLeave={() => setHover(null)}
          >
            <img
              src={current.url}
              alt={index === 0 ? name : `${name} — photo ${index + 1}`}
              className="block aspect-square w-full object-cover transition-transform duration-200 ease-out"
              style={
                hover
                  ? { transform: "scale(2)", transformOrigin: `${hover.x}% ${hover.y}%` }
                  : undefined
              }
              draggable={false}
            />
          </button>
        )}

        {current.type === "image" && (
          <button
            type="button"
            onClick={() => setViewerOpen(true)}
            className="absolute bottom-3 right-3 flex size-10 items-center justify-center rounded-full bg-background/85 text-foreground shadow-md backdrop-blur transition hover:bg-background"
            aria-label="Open full-screen zoom"
          >
            <ZoomIn className="size-5" />
          </button>
        )}

        {soldOut && current.type === "image" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-stone-900/40">
            <span className="rounded-full bg-stone-900/85 px-5 py-2 text-sm font-semibold uppercase tracking-wider text-stone-100">
              Sold out
            </span>
          </div>
        )}

        {many && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              className="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-md backdrop-blur transition hover:bg-background"
              aria-label="Previous photo"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-md backdrop-blur transition hover:bg-background"
              aria-label="Next photo"
            >
              <ChevronRight className="size-5" />
            </button>
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-stone-900/70 px-2.5 py-1 text-xs font-medium text-white">
              {index + 1} / {media.length}
            </span>
          </>
        )}
      </div>

      {many && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Product photos and videos">
          {media.map((item, i) => (
            <li key={`${item.url}-${i}`} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={item.type === "video" ? `Play video ${i + 1}` : `Show photo ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-lg border-2 bg-muted transition sm:size-20",
                  i === index ? "border-primary" : "border-transparent opacity-75 hover:opacity-100"
                )}
              >
                {item.type === "video" ? (
                  <>
                    <video
                      src={`${item.url}#t=0.1`}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-stone-900/30">
                      <Play className="size-5 fill-white text-white" aria-hidden />
                    </span>
                  </>
                ) : (
                  <img src={item.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {viewerOpen && (
        <ZoomViewer
          name={name}
          media={media}
          index={index}
          onIndexChange={go}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
}

const VIEWER_ZOOM = 2.5;

/**
 * Full-screen viewer. Click / tap zooms in at that point and again to zoom
 * out; while zoomed, moving the mouse or dragging a finger pans. Arrows,
 * swipe (when not zoomed) and ← / → switch photos; Esc closes.
 */
function ZoomViewer({
  name,
  media,
  index,
  onIndexChange,
  onClose,
}: {
  name: string;
  media: MediaItem[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const touchX = useRef<number | null>(null);
  const pressAt = useRef<{ x: number; y: number } | null>(null);
  const current = media[index];
  const many = media.length > 1;

  const go = (i: number) => {
    setZoom(null);
    onIndexChange(i);
  };

  // Keyboard + no page scroll behind the viewer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (many && e.key === "ArrowRight") go(index + 1);
      else if (many && e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  });

  const pointAt = (el: HTMLElement, clientX: number, clientY: number) => {
    const r = el.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)),
      y: Math.min(100, Math.max(0, ((clientY - r.top) / r.height) * 100)),
    };
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name} — photos`}
      className="fixed inset-0 z-[100] flex flex-col bg-stone-950/95 text-white"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-white/80">
          {many ? `${index + 1} / ${media.length}` : name}
        </span>
        <div className="flex items-center gap-1">
          {current.type === "image" && (
            <button
              type="button"
              onClick={() => setZoom(zoom ? null : { x: 50, y: 50 })}
              className="flex size-11 items-center justify-center rounded-full hover:bg-white/10"
              aria-label={zoom ? "Zoom out" : "Zoom in"}
            >
              {zoom ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-full hover:bg-white/10"
            aria-label="Close"
            autoFocus
          >
            <X className="size-6" />
          </button>
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 pb-4"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null || zoom || !many) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        {current.type === "video" ? (
          <video
            key={current.url}
            src={current.url}
            controls
            autoPlay
            playsInline
            className="max-h-full max-w-full"
          />
        ) : (
          <div
            className={cn(
              "relative flex h-full w-full items-center justify-center overflow-hidden",
              zoom ? "cursor-zoom-out touch-none" : "cursor-zoom-in"
            )}
            onPointerDown={(e) => (pressAt.current = { x: e.clientX, y: e.clientY })}
            onClick={(e) => {
              // Releasing after a drag is panning, not a tap
              const p = pressAt.current;
              pressAt.current = null;
              if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) return;
              setZoom(zoom ? null : pointAt(e.currentTarget, e.clientX, e.clientY));
            }}
            onPointerMove={(e) => {
              if (!zoom) return;
              setZoom(pointAt(e.currentTarget, e.clientX, e.clientY));
            }}
          >
            <img
              src={current.url}
              alt={index === 0 ? name : `${name} — photo ${index + 1}`}
              draggable={false}
              className="max-h-full max-w-full select-none object-contain transition-transform duration-200 ease-out"
              style={
                zoom
                  ? { transform: `scale(${VIEWER_ZOOM})`, transformOrigin: `${zoom.x}% ${zoom.y}%` }
                  : undefined
              }
            />
          </div>
        )}

        {many && !zoom && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              className="absolute left-3 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 backdrop-blur transition hover:bg-white/20"
              aria-label="Previous photo"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              className="absolute right-3 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 backdrop-blur transition hover:bg-white/20"
              aria-label="Next photo"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>

      {current.type === "image" && (
        <p className="pb-4 text-center text-xs text-white/60">
          {zoom ? "Move or drag to look around · tap to zoom out" : "Tap the photo to zoom in"}
        </p>
      )}
    </div>,
    document.body
  );
}
