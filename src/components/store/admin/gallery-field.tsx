"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ImagePlus, Link2, Loader2, Play, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { IMAGE_TYPES, MAX_GALLERY_ITEMS, VIDEO_TYPES, type MediaItem } from "@/lib/media";
import { uploadMedia } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ACCEPT = [...Object.keys(IMAGE_TYPES), ...Object.keys(VIDEO_TYPES)].join(",");

/**
 * Extra product photos and videos, shown on the product page after the main
 * image. Upload several at once, reorder with the arrows, or paste a link.
 */
export function GalleryField({
  value,
  onChange,
}: {
  value: MediaItem[];
  onChange: (items: MediaItem[]) => void;
}) {
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  const room = MAX_GALLERY_ITEMS - value.length;

  const upload = useMutation({
    // One at a time keeps the order the files were picked in
    mutationFn: async (files: File[]) => {
      const uploaded: MediaItem[] = [];
      for (const file of files) uploaded.push(await uploadMedia(file));
      return uploaded;
    },
    onSuccess: (uploaded) => {
      onChange([...value, ...uploaded]);
      toast({
        title: uploaded.length === 1 ? "File uploaded" : `${uploaded.length} files uploaded`,
        description: "Save the product to apply the gallery.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const move = (from: number, to: number) => {
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const addLink = () => {
    const url = link.trim();
    if (!/^https?:\/\//i.test(url)) {
      toast({
        title: "Not a web link",
        description: "Links must start with http:// or https://",
        variant: "destructive",
      });
      return;
    }
    const type = /\.(mp4|webm|mov)(\?|#|$)/i.test(url) ? "video" : "image";
    onChange([...value, { type, url }]);
    setLink("");
  };

  return (
    <div>
      <Label>More photos &amp; videos</Label>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Shown on the product page after the main image. Up to {MAX_GALLERY_ITEMS} — photos up
        to 5 MB, videos (MP4, WebM, MOV) up to 50 MB.
      </p>

      {value.length > 0 && (
        <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((item, i) => (
            <li
              key={`${item.url}-${i}`}
              className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
            >
              {item.type === "video" ? (
                <>
                  <video
                    src={item.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-1 top-1 flex size-6 items-center justify-center rounded-full bg-stone-900/70 text-white">
                    <Play className="size-3" aria-hidden />
                  </span>
                </>
              ) : (
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-stone-900/60 p-0.5">
                <button
                  type="button"
                  className="flex size-7 items-center justify-center rounded text-white disabled:opacity-30"
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  aria-label="Move earlier"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  className="flex size-7 items-center justify-center rounded text-white"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  aria-label="Remove"
                >
                  <X className="size-4" />
                </button>
                <button
                  type="button"
                  className="flex size-7 items-center justify-center rounded text-white disabled:opacity-30"
                  disabled={i === value.length - 1}
                  onClick={() => move(i, i + 1)}
                  aria-label="Move later"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={fileInput}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length > room) {
            toast({
              title: "Too many files",
              description: `You can add ${room} more (up to ${MAX_GALLERY_ITEMS}).`,
              variant: "destructive",
            });
            return;
          }
          if (files.length) upload.mutate(files);
        }}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-9 rounded-full"
          disabled={upload.isPending || room <= 0}
          onClick={() => fileInput.current?.click()}
        >
          {upload.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="size-4" aria-hidden />
          )}
          {upload.isPending ? "Uploading…" : "Add photos / videos"}
        </Button>
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          className="min-h-9"
          placeholder="…or paste an image / video link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (link.trim()) addLink();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-9 rounded-full"
          disabled={!link.trim() || room <= 0}
          onClick={addLink}
        >
          <Link2 className="size-4" aria-hidden /> Add
        </Button>
      </div>
    </div>
  );
}
