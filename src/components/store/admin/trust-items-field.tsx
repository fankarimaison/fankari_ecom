"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  MAX_TRUST_ITEMS,
  MAX_TRUST_TEXT,
  SHIPPING_TOKEN,
  TRUST_ICONS,
  type TrustItem,
} from "@/lib/trust";
import { TRUST_ICON_MAP, trustIcon } from "../trust-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Editor for the highlights strip under the home banner: icon + text rows. */
export function TrustItemsField({
  value,
  onChange,
}: {
  value: TrustItem[];
  onChange: (items: TrustItem[]) => void;
}) {
  const update = (i: number, patch: Partial<TrustItem>) =>
    onChange(value.map((item, j) => (j === i ? { ...item, ...patch } : item)));
  const move = (i: number, by: -1 | 1) => {
    const list = [...value];
    [list[i], list[i + by]] = [list[i + by], list[i]];
    onChange(list);
  };

  return (
    <div>
      <Label>Highlights under the banner</Label>
      <p className="mt-1 text-xs text-muted-foreground">
        Short points like &ldquo;Built to last&rdquo;, each with an icon. Up to {MAX_TRUST_ITEMS}. Write{" "}
        <code className="rounded bg-muted px-1">{SHIPPING_TOKEN}</code> to show the current shipping offer.
      </p>

      <ul className="mt-3 space-y-2">
        {value.map((item, i) => {
          const Icon = trustIcon(item.icon);
          return (
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
              <Select value={item.icon} onValueChange={(icon) => update(i, { icon })}>
                <SelectTrigger className="min-h-10 w-[150px] bg-background" aria-label={`Icon for highlight ${i + 1}`}>
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <Icon className="size-4 text-primary" aria-hidden />
                      {TRUST_ICON_MAP[item.icon as (typeof TRUST_ICONS)[number]]?.label ?? item.icon}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {TRUST_ICONS.map((key) => {
                    const { Icon: Option, label } = TRUST_ICON_MAP[key];
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <Option className="size-4 text-primary" aria-hidden />
                          {label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Input
                className="min-h-10 min-w-0 flex-1 basis-48 bg-background"
                value={item.text}
                maxLength={MAX_TRUST_TEXT}
                placeholder="e.g. Built to last"
                aria-label={`Text for highlight ${i + 1}`}
                onChange={(e) => update(i, { text: e.target.value })}
              />
              <div className="flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label={`Move highlight ${i + 1} up`}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  disabled={i === value.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={`Move highlight ${i + 1} down`}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 text-destructive hover:text-destructive"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  aria-label={`Remove highlight ${i + 1}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {value.length === 0 && (
        <p className="mt-2 rounded-lg border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
          No highlights — the strip is hidden from the home page.
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 min-h-9 rounded-full"
        disabled={value.length >= MAX_TRUST_ITEMS}
        onClick={() => onChange([...value, { icon: "sparkles", text: "" }])}
      >
        <Plus className="size-4" aria-hidden /> Add highlight
      </Button>
    </div>
  );
}
