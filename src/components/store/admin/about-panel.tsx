"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { foundersFromContent, MAX_FOUNDERS, type Founder } from "@/lib/about";
import { ImageField } from "./image-field";
import { apiPut, type SiteContent } from "../api";
import { useContent } from "../hooks";
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

const EMPTY_FOUNDER: Founder = { name: "", role: "", image: "", bio: "", quote: "" };

type AboutForm = {
  aboutTitle: string;
  aboutTagline: string;
  aboutText: string;
  aboutImage: string;
  aboutMission: string;
  founders: Founder[];
};

/** Admin → About page: the story copy and the founders. */
export function AdminAbout() {
  const { data: content, isLoading } = useContent();

  if (isLoading || !content) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return <AboutEditor initial={content} />;
}

function AboutEditor({ initial }: { initial: SiteContent }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useStore((s) => s.navigate);
  const [form, setForm] = useState<AboutForm>({
    aboutTitle: initial.aboutTitle ?? "",
    aboutTagline: initial.aboutTagline ?? "",
    aboutText: initial.aboutText ?? "",
    aboutImage: initial.aboutImage ?? "",
    aboutMission: initial.aboutMission ?? "",
    founders: foundersFromContent(initial),
  });

  const set = <K extends keyof AboutForm>(key: K, value: AboutForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const setFounder = (i: number, patch: Partial<Founder>) =>
    setForm((f) => ({
      ...f,
      founders: f.founders.map((p, j) => (j === i ? { ...p, ...patch } : p)),
    }));
  const moveFounder = (i: number, by: -1 | 1) =>
    setForm((f) => {
      const list = [...f.founders];
      [list[i], list[i + by]] = [list[i + by], list[i]];
      return { ...f, founders: list };
    });

  const save = useMutation({
    mutationFn: (values: AboutForm) =>
      apiPut<{ content: SiteContent }>("/api/content", {
        ...values,
        founders: JSON.stringify(values.founders),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["content"] });
      toast({ title: "About page saved", description: "Changes are live on the About Us page." });
    },
    onError: (error) => {
      toast({
        title: "Could not save the About page",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Story */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Our story</CardTitle>
          <CardDescription>
            The title and story also appear in the &ldquo;Our story&rdquo; section of the home page.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <TextField id="about-title" label="Title" value={form.aboutTitle} onChange={(v) => set("aboutTitle", v)} />
          <TextField
            id="about-tagline"
            label="Intro line"
            hint="One sentence under the title at the top of the page."
            rows={2}
            value={form.aboutTagline}
            onChange={(v) => set("aboutTagline", v)}
          />
          <TextField
            id="about-text"
            label="Story"
            hint="Leave a blank line between paragraphs."
            rows={7}
            value={form.aboutText}
            onChange={(v) => set("aboutText", v)}
          />
          <ImageField
            id="about-image"
            label="Story photo"
            folder="site"
            value={form.aboutImage}
            onChange={(url) => set("aboutImage", url)}
          />
          <TextField
            id="about-mission"
            label="Mission quote"
            hint="Shown large in the middle of the page."
            rows={3}
            value={form.aboutMission}
            onChange={(v) => set("aboutMission", v)}
          />
        </CardContent>
      </Card>

      {/* Founders */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-lg">
            <Users className="size-5 text-primary" aria-hidden /> Founders
          </CardTitle>
          <CardDescription>
            Portrait photos work best (taller than wide, e.g. 800 × 1000). Up to {MAX_FOUNDERS}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {form.founders.map((f, i) => (
            <fieldset key={i} className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <legend className="text-sm font-semibold">Founder {i + 1}</legend>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={i === 0}
                    onClick={() => moveFounder(i, -1)}
                    aria-label={`Move founder ${i + 1} up`}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={i === form.founders.length - 1}
                    onClick={() => moveFounder(i, 1)}
                    aria-label={`Move founder ${i + 1} down`}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() =>
                      setForm((s) => ({ ...s, founders: s.founders.filter((_, j) => j !== i) }))
                    }
                    aria-label={`Remove founder ${i + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid gap-4">
                <ImageField
                  id={`founder-${i}-image`}
                  label="Photo"
                  folder="site"
                  value={f.image}
                  onChange={(url) => setFounder(i, { image: url })}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    id={`founder-${i}-name`}
                    label="Name"
                    maxLength={80}
                    value={f.name}
                    onChange={(v) => setFounder(i, { name: v })}
                  />
                  <TextField
                    id={`founder-${i}-role`}
                    label="Role"
                    placeholder="Co-founder · Design"
                    maxLength={80}
                    value={f.role}
                    onChange={(v) => setFounder(i, { role: v })}
                  />
                </div>
                <TextField
                  id={`founder-${i}-bio`}
                  label="About them"
                  rows={4}
                  maxLength={1500}
                  value={f.bio}
                  onChange={(v) => setFounder(i, { bio: v })}
                />
                <TextField
                  id={`founder-${i}-quote`}
                  label="Favourite saying (optional)"
                  maxLength={300}
                  value={f.quote}
                  onChange={(v) => setFounder(i, { quote: v })}
                />
              </div>
            </fieldset>
          ))}

          {form.founders.length === 0 && (
            <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              No founders yet — the founders section is hidden until you add one.
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            className="min-h-10 rounded-full"
            disabled={form.founders.length >= MAX_FOUNDERS}
            onClick={() => set("founders", [...form.founders, { ...EMPTY_FOUNDER }])}
          >
            <Plus className="size-4" aria-hidden /> Add founder
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          size="lg"
          className="min-h-11 rounded-full px-10"
          disabled={save.isPending}
          onClick={() => save.mutate(form)}
        >
          {save.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Save About page
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="min-h-11 rounded-full"
          onClick={() => navigate({ name: "about" })}
        >
          View page
        </Button>
      </div>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  rows,
  placeholder,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {rows ? (
        <Textarea
          id={id}
          rows={rows}
          className="mt-1.5"
          placeholder={placeholder}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          id={id}
          className="mt-1.5 min-h-10"
          placeholder={placeholder}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
