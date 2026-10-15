"use client";

import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { ImageUp, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadImage } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Image picker for admin forms: preview + upload/replace to Supabase Storage,
 * with the URL still editable for images hosted elsewhere.
 */
export function ImageField({
  id,
  label,
  value,
  onChange,
  folder,
  placeholder,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: "products" | "site";
  placeholder?: string;
  required?: boolean;
}) {
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: (file: File) => uploadImage(file, folder),
    onSuccess: (url) => {
      onChange(url);
      toast({ title: "Image uploaded", description: "Save to apply the new image." });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1.5 flex gap-3">
        <div className="size-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
          {value && (
            <img src={value} alt={`${label} preview`} className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            id={id}
            className="min-h-10"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
          />
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) upload.mutate(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9 rounded-full"
            disabled={upload.isPending}
            onClick={() => fileInput.current?.click()}
          >
            {upload.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ImageUp className="size-4" aria-hidden />
            )}
            {value ? "Replace image" : "Upload image"}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WebP, AVIF or GIF up to 5 MB — stored in Supabase.
          </p>
        </div>
      </div>
    </div>
  );
}
