"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ImagePlus, Link2, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { IMAGE_TYPES } from "@/lib/media";
import { MAX_HERO_IMAGES } from "@/lib/hero";
import { uploadImage } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Home page banner carousel images — upload several, reorder, remove. */
export function HeroImagesField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  const room = MAX_HERO_IMAGES - value.length;

  const upload = useMutation({
    // One at a time keeps the order the files were picked in
    mutationFn: async (files: File[]) => {
      const urls: string[] = [];
      for (const file of files) urls.push(await uploadImage(file, "site"));
      return urls;
    },
    onSuccess: (urls) => {
      onChange([...value, ...urls]);
      toast({
        title: urls.length === 1 ? "Image uploaded" : `${urls.length} images uploaded`,
        description: "Save content to update the banner.",
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
    const [url] = next.splice(from, 1);
    next.splice(to, 0, url);
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
    onChange([...value, url]);
    setLink("");
  };

  return (
    <div>
      <Label>Banner images</Label>
      <p className="mt-0.5 text-xs text-muted-foreground">
        The home page banner rotates through these in order (up to {MAX_HERO_IMAGES}). Wide
        landscape photos work best — about 1600 × 1000.
      </p>

      {value.length > 0 && (
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {value.map((url, i) => (
            <li
              key={`${url}-${i}`}
              className="relative aspect-[16/10] overflow-hidden rounded-md border border-border bg-muted"
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
              <span className="absolute left-1 top-1 rounded-full bg-stone-900/70 px-2 py-0.5 text-[11px] font-medium text-white">
                {i + 1}
              </span>
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
                  className="flex size-7 items-center justify-center rounded text-white disabled:opacity-30"
                  disabled={value.length === 1}
                  title={value.length === 1 ? "The banner needs at least one image" : undefined}
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
        accept={Object.keys(IMAGE_TYPES).join(",")}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length > room) {
            toast({
              title: "Too many images",
              description: `You can add ${room} more (up to ${MAX_HERO_IMAGES}).`,
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
          {upload.isPending ? "Uploading…" : "Add images"}
        </Button>
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          className="min-h-9"
          placeholder="…or paste an image link"
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
