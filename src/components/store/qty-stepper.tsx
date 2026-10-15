"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QtyStepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

/** Accessible quantity stepper with ≥44px touch targets. */
export function QtyStepper({
  value,
  min = 1,
  max,
  onChange,
  disabled,
  className,
}: QtyStepperProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-input bg-card shadow-xs",
        className
      )}
      role="group"
      aria-label="Quantity"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 rounded-full hover:bg-accent"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease quantity"
      >
        <Minus className="size-4" />
      </Button>
      <span
        className="min-w-8 text-center text-sm font-semibold tabular-nums"
        aria-live="polite"
        aria-label={`Quantity ${value}`}
      >
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 rounded-full hover:bg-accent"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Increase quantity"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
