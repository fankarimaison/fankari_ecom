"use client";

import { Check, Copy, ExternalLink, Truck, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDateTime, statusLabel } from "@/lib/format";
import type { OrderEvent } from "./api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = ["CONFIRMED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

export interface TrackingInfo {
  status: string;
  courierName: string;
  trackingNumber: string;
  trackingUrl: string;
  estimatedDelivery: string | null;
  events: OrderEvent[];
}

/** Delivery progress, courier details and the order timeline. */
export function OrderTracking({ order }: { order: TrackingInfo }) {
  return (
    <div className="space-y-5">
      <ProgressSteps status={order.status} />
      <CourierDetails order={order} />
      <Timeline events={order.events} />
    </div>
  );
}

function ProgressSteps({ status }: { status: string }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800">
        <XCircle className="size-4 shrink-0" aria-hidden /> This order was cancelled.
      </div>
    );
  }
  // PENDING sits before the first step
  const reached = STEPS.indexOf(status as (typeof STEPS)[number]);

  return (
    <ol className="grid grid-cols-4 gap-1" aria-label="Delivery progress">
      {STEPS.map((step, i) => {
        const done = i <= reached;
        return (
          <li key={step} className="flex flex-col items-center gap-1.5 text-center">
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "invisible" : done ? "bg-primary" : "bg-border")} />
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                )}
                aria-current={i === reached ? "step" : undefined}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span
                className={cn(
                  "h-0.5 flex-1",
                  i === STEPS.length - 1 ? "invisible" : i < reached ? "bg-primary" : "bg-border",
                )}
              />
            </div>
            <span className={cn("text-[11px] leading-tight sm:text-xs", done ? "font-semibold" : "text-muted-foreground")}>
              {statusLabel(step)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function CourierDetails({ order }: { order: TrackingInfo }) {
  const { toast } = useToast();
  const hasCourier = order.courierName || order.trackingNumber || order.trackingUrl;

  if (!hasCourier && !order.estimatedDelivery) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Truck className="size-4 shrink-0" aria-hidden />
        Courier details will appear here once your order ships.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border/80 bg-muted/40 p-3 text-sm">
      <dl className="grid gap-2 sm:grid-cols-2">
        {order.courierName && (
          <div>
            <dt className="text-xs text-muted-foreground">Courier</dt>
            <dd className="font-medium">{order.courierName}</dd>
          </div>
        )}
        {order.trackingNumber && (
          <div>
            <dt className="text-xs text-muted-foreground">Tracking number</dt>
            <dd className="flex items-center gap-1.5 font-mono font-medium">
              {order.trackingNumber}
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Copy tracking number"
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(order.trackingNumber)
                    .then(() => toast({ title: "Tracking number copied" }));
                }}
              >
                <Copy className="size-3.5" aria-hidden />
              </button>
            </dd>
          </div>
        )}
        {order.estimatedDelivery && (
          <div>
            <dt className="text-xs text-muted-foreground">Estimated delivery</dt>
            <dd className="font-medium">{formatDate(`${order.estimatedDelivery}T00:00:00`)}</dd>
          </div>
        )}
      </dl>
      {order.trackingUrl && (
        <Button asChild variant="outline" size="sm" className="mt-3 min-h-9 rounded-full">
          <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer">
            Track with courier <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </Button>
      )}
    </div>
  );
}

function Timeline({ events }: { events: OrderEvent[] }) {
  if (events.length === 0) return null;
  // newest first reads best on a tracking page
  const list = [...events].reverse();
  return (
    <div>
      <p className="text-sm font-semibold">Updates</p>
      <ol className="mt-2 space-y-3 border-l border-border pl-4">
        {list.map((e, i) => (
          <li key={e.id} className="relative">
            <span
              className={cn(
                "absolute -left-[21px] top-1 size-2.5 rounded-full",
                i === 0 ? "bg-primary" : "bg-border",
              )}
              aria-hidden
            />
            <p className="text-sm font-medium">{statusLabel(String(e.status))}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</p>
            {e.note && <p className="mt-0.5 text-sm text-foreground/80">{e.note}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
