"use client";

import { HelpCircle, MessageCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { useFaqs } from "../hooks";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Frequently asked questions — managed in Admin → FAQ. */
export function FaqView() {
  const navigate = useStore((s) => s.navigate);
  const { data, isLoading } = useFaqs();
  // A signed-in admin also receives hidden questions — never show them here
  const faqs = (data ?? []).filter((f) => f.published);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-14">
      <div className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary">
          <HelpCircle className="size-6 text-secondary-foreground" aria-hidden />
        </span>
        <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Frequently asked questions
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything you need to know about ordering, shipping and caring for your tote.
        </p>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : faqs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card py-12 text-center text-sm text-muted-foreground">
            No questions here yet.
          </p>
        ) : (
          <Accordion
            type="single"
            collapsible
            className="divide-y divide-border/70 rounded-xl border border-border/70 bg-card px-4 sm:px-6"
          >
            {faqs.map((f) => (
              <AccordionItem key={f.id} value={f.id} className="border-b-0">
                <AccordionTrigger className="py-4 text-left text-base font-medium hover:no-underline">
                  {f.question}
                </AccordionTrigger>
                <AccordionContent className="whitespace-pre-line pb-4 text-sm leading-relaxed text-muted-foreground">
                  {f.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 rounded-xl bg-teal-light px-6 py-8 text-center">
        <MessageCircle className="size-6 text-teal" aria-hidden />
        <p className="font-display text-lg font-semibold text-teal">Still have a question?</p>
        <p className="text-sm text-muted-foreground">Send us a message and we&apos;ll get back to you.</p>
        <Button className="mt-1 min-h-11 rounded-full px-8" onClick={() => navigate({ name: "contact" })}>
          Contact us
        </Button>
      </div>
    </div>
  );
}
