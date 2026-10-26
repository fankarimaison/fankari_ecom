"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Mail, MapPin, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { apiPost } from "../api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Please tell us your name").max(120),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v.replace(/\D/g, "").length >= 8, "Please enter a valid phone number"),
  email: z.string().trim().email("Please enter a valid email").max(200),
  message: z
    .string()
    .trim()
    .min(1, "Please write a message")
    .max(4000, "Please keep it under 4000 characters"),
});

type ContactForm = z.infer<typeof contactSchema>;

/** "Contact us" — requests land in Admin → Messages. */
export function ContactView() {
  const { toast } = useToast();
  const navigate = useStore((s) => s.navigate);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", phone: "", email: "", message: "" },
  });

  const send = useMutation({
    mutationFn: (values: ContactForm) => apiPost<{ success: boolean }>("/api/contact", values),
    onSuccess: () => reset(),
    onError: (error) => {
      toast({
        title: "Could not send your message",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const fieldError = (field: keyof ContactForm) =>
    errors[field] ? (
      <p className="mt-1 text-xs font-medium text-destructive" role="alert">
        {errors[field]?.message}
      </p>
    ) : null;

  if (send.isSuccess) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-secondary">
          <CheckCircle2 className="size-9 text-secondary-foreground" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold">Thank you — message received</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            We&apos;ll get back to you by phone or email soon.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="outline"
            className="min-h-11 rounded-full"
            onClick={() => send.reset()}
          >
            Send another message
          </Button>
          <Button className="min-h-11 rounded-full" onClick={() => navigate({ name: "home" })}>
            Continue shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        Contact us
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Questions, custom orders or bulk requests — send us a message and we&apos;ll get back
        to you.
      </p>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Send a message</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((values) => send.mutate(values))}
              className="grid gap-4 sm:grid-cols-2"
              noValidate
            >
              <div className="sm:col-span-2">
                <Label htmlFor="contact-name">Name</Label>
                <Input
                  id="contact-name"
                  className="mt-1.5 min-h-11"
                  autoComplete="name"
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
                {fieldError("name")}
              </div>
              <div>
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  className="mt-1.5 min-h-11"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  aria-invalid={!!errors.phone}
                  {...register("phone")}
                />
                {fieldError("phone")}
              </div>
              <div>
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  className="mt-1.5 min-h-11"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                {fieldError("email")}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="contact-message">Message</Label>
                <Textarea
                  id="contact-message"
                  rows={6}
                  className="mt-1.5"
                  placeholder="How can we help?"
                  aria-invalid={!!errors.message}
                  {...register("message")}
                />
                {fieldError("message")}
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  size="lg"
                  disabled={send.isPending}
                  className="min-h-12 w-full rounded-full text-base sm:w-auto sm:px-10"
                >
                  {send.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Send className="size-4" aria-hidden />
                  )}
                  {send.isPending ? "Sending…" : "Send message"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Other ways to reach us</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
