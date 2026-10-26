"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Megaphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HERO_IMAGE_URL } from "@/lib/storage";
import { heroSlides } from "@/lib/hero";
import { ImageField } from "./image-field";
import { HeroImagesField } from "./hero-images-field";
import { TrustItemsField } from "./trust-items-field";
import { parseTrustItems } from "@/lib/trust";
import { apiPut, type SiteContent } from "../api";
import { useContent } from "../hooks";
import { PanelLoading } from "../views/admin";
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
import { Textarea } from "@/components/ui/textarea";

const FIELDS: {
  key: string;
  label: string;
  multiline?: boolean;
  image?: boolean;
  heroImages?: boolean;
  trustItems?: boolean;
  placeholder?: string;
  hint?: string;
}[] = [
  { key: "brandName", label: "Brand name", hint: "Shown in the header and footer." },
  {
    key: "whatsappNumber",
    label: "Orders WhatsApp number",
    placeholder: "919876543210",
    hint: "With country code. After checkout, buyers send their order details to this number on WhatsApp.",
  },
  {
    key: "announcement",
    label: "Announcement bar",
    multiline: true,
    hint: "Sticky bar above the header.",
  },
  { key: "heroTitle", label: "Hero title" },
  { key: "heroSubtitle", label: "Hero subtitle", multiline: true },
  // Banner images are edited with HeroImagesField (below the hero copy)
  { key: "heroImages", label: "Banner images", heroImages: true },
  // Edited with TrustItemsField
  { key: "trustItems", label: "Highlights", trustItems: true },
  {
    key: "footerText",
    label: "Footer description",
    multiline: true,
    hint: "Short text under the logo in the footer.",
  },
  {
    key: "contactEmail",
    label: "Get in touch — email",
    placeholder: "hello@fankarimaison.com",
    hint: "Leave any “Get in touch” field empty to hide it from the footer.",
  },
  { key: "contactPhone", label: "Get in touch — phone", placeholder: "+91 98765 43210" },
  {
    key: "contactAddress",
    label: "Get in touch — address",
    multiline: true,
    placeholder: "Studio address",
  },
  {
    key: "defaultCareInstructions",
    label: "Default care instructions",
    multiline: true,
    hint: "One tip per line. Shown on every product page that has no care instructions of its own (Products → edit a product to set its own).",
  },
];

export function AdminContent() {
  const { data: content, isLoading } = useContent();

  if (isLoading || !content) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  // Mounted only once content exists → no setState-in-effect needed.
  return <ContentForm initial={content} />;
}

function ContentForm({ initial }: { initial: SiteContent }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SiteContent>(initial);

  const save = useMutation({
    mutationFn: async (values: SiteContent) => {
      const data = await apiPut<{ content: SiteContent }>("/api/content", values);
      return data.content;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["content"] });
      toast({
        title: "Content saved",
        description: "The header, hero and footer update live.",
      });
    },
    onError: (error) => {
      toast({
        title: "Could not save content",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2 text-lg">
          <Megaphone className="size-5 text-primary" aria-hidden /> Storefront
          content
        </CardTitle>
        <CardDescription>
          Edit the copy customers see. Changes go live immediately after saving.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {FIELDS.map(({ key, label, multiline, image, heroImages, trustItems, placeholder, hint }) =>
            trustItems ? (
              <TrustItemsField
                key={key}
                // unfiltered, so a just-added row with no text yet stays visible
                value={parseTrustItems(form.trustItems) ?? []}
                onChange={(items) => setForm((f) => ({ ...f, trustItems: JSON.stringify(items) }))}
              />
            ) : heroImages ? (
              <HeroImagesField
                key={key}
                value={heroSlides(form, HERO_IMAGE_URL)}
                onChange={(urls) => setForm((f) => ({ ...f, heroImages: JSON.stringify(urls) }))}
              />
            ) : image ? (
              <ImageField
                key={key}
                id={`content-${key}`}
                label={label}
                folder="site"
                placeholder={placeholder}
                value={form[key] ?? ""}
                onChange={(url) => setForm((f) => ({ ...f, [key]: url }))}
              />
            ) : (
              <div key={key}>
                <Label htmlFor={`content-${key}`}>{label}</Label>
                {multiline ? (
                  <Textarea
                    id={`content-${key}`}
                    rows={key === "defaultCareInstructions" ? 5 : 2}
                    className="mt-1.5"
                    placeholder={placeholder}
                    value={form[key] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    id={`content-${key}`}
                    className="mt-1.5 min-h-10"
                    placeholder={placeholder}
                    value={form[key] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                )}
                {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
              </div>
            ),
          )}
        </div>
        <Button
          size="lg"
          className="mt-6 min-h-11 w-full rounded-full sm:w-auto sm:px-10"
          disabled={save.isPending}
          onClick={() => save.mutate(form)}
        >
          {save.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Save content
        </Button>
      </CardContent>
    </Card>
  );
}
