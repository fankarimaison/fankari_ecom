"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isAmount, shippingFromContent, type ShippingSettings } from "@/lib/pricing";
import { apiPut, type SiteContent } from "../api";
import { shippingPolicyText, useContent } from "../hooks";
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
import { Switch } from "@/components/ui/switch";

export function AdminShipping() {
  const { data: content, isLoading } = useContent();

  if (isLoading || !content) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  // Mounted only once content exists → no setState-in-effect needed.
  return <ShippingForm initial={shippingFromContent(content)} />;
}

function ShippingForm({ initial }: { initial: ShippingSettings }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ShippingSettings>(initial);

  const save = useMutation({
    mutationFn: (s: ShippingSettings) =>
      apiPut<{ content: SiteContent }>("/api/content", {
        shippingFee: String(s.fee),
        freeShippingEnabled: String(s.freeShippingEnabled),
        // a cleared (hidden) threshold field keeps the saved value
        freeShippingThreshold: String(
          isAmount(s.freeShippingThreshold) ? s.freeShippingThreshold : initial.freeShippingThreshold,
        ),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["content"] });
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast({ title: "Shipping saved", description: "New orders use these settings." });
    },
    onError: (error) => {
      toast({
        title: "Could not save shipping",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const invalid =
    !isAmount(form.fee) || (form.freeShippingEnabled && !isAmount(form.freeShippingThreshold));

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2 text-lg">
          <Truck className="size-5 text-primary" aria-hidden /> Shipping charges
        </CardTitle>
        <CardDescription>
          Applied at checkout to every order. Changes affect new orders only.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div>
          <Label htmlFor="shipping-fee">Shipping charge per order (₹)</Label>
          <Input
            id="shipping-fee"
            type="number"
            min={0}
            step="0.01"
            className="mt-1.5 min-h-10 max-w-xs"
            value={Number.isNaN(form.fee) ? "" : form.fee}
            onChange={(e) => setForm((f) => ({ ...f, fee: parseFloat(e.target.value) }))}
          />
          <p className="mt-1 text-xs text-muted-foreground">Set to 0 to always ship free.</p>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
          <div>
            <Label htmlFor="shipping-waive">Waive shipping above a threshold</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Orders whose items total (after discount, incl. VAT) reaches the
              threshold ship free.
            </p>
          </div>
          <Switch
            id="shipping-waive"
            checked={form.freeShippingEnabled}
            onCheckedChange={(v) => setForm((f) => ({ ...f, freeShippingEnabled: v }))}
          />
        </div>

        {form.freeShippingEnabled && (
          <div>
            <Label htmlFor="shipping-threshold">Free shipping threshold (₹)</Label>
            <Input
              id="shipping-threshold"
              type="number"
              min={0}
              step="0.01"
              className="mt-1.5 min-h-10 max-w-xs"
              value={Number.isNaN(form.freeShippingThreshold) ? "" : form.freeShippingThreshold}
              onChange={(e) =>
                setForm((f) => ({ ...f, freeShippingThreshold: parseFloat(e.target.value) }))
              }
            />
          </div>
        )}

        {!invalid && (
          <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
            Customers see: {shippingPolicyText(form)}
          </p>
        )}

        <Button
          size="lg"
          className="min-h-11 w-full rounded-full sm:w-auto sm:justify-self-start sm:px-10"
          disabled={save.isPending || invalid}
          onClick={() => save.mutate(form)}
        >
          {save.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Save shipping
        </Button>
      </CardContent>
    </Card>
  );
}
