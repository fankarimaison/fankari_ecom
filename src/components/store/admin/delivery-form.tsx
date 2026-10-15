"use client";

import { useState } from "react";
import { Loader2, Truck } from "lucide-react";
import { statusLabel } from "@/lib/format";
import type { AdminOrder } from "../api";
import { OrderTracking } from "../order-tracking";
import { useAdminOrderStatusMutation, type AdminOrderPatch } from "./use-admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

/** Statuses that need the courier and tracking ID filled in. */
const NEEDS_TRACKING = new Set(["SHIPPED", "OUT_FOR_DELIVERY"]);

interface TrackingValues {
  courierName: string;
  trackingNumber: string;
  trackingUrl: string;
  /** YYYY-MM-DD or "" */
  estimatedDelivery: string;
  note: string;
}

function trackingValuesOf(order: AdminOrder): TrackingValues {
  return {
    courierName: order.courierName,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    estimatedDelivery: order.estimatedDelivery ?? "",
    note: "",
  };
}

/** Problems that block saving, or null. */
function trackingProblem(status: string, v: TrackingValues): string | null {
  if (NEEDS_TRACKING.has(status) && (!v.courierName.trim() || !v.trackingNumber.trim())) {
    return `${statusLabel(status)} orders need a courier and tracking ID.`;
  }
  if (v.trackingUrl.trim() && !/^https?:\/\//i.test(v.trackingUrl.trim())) {
    return "The tracking link must start with http:// or https://";
  }
  return null;
}

/** Only the fields that differ from the order (plus a non-empty note). */
function trackingPatch(order: AdminOrder, v: TrackingValues): AdminOrderPatch {
  const before = trackingValuesOf(order);
  const patch: AdminOrderPatch = {};
  if (v.courierName.trim() !== before.courierName) patch.courierName = v.courierName;
  if (v.trackingNumber.trim() !== before.trackingNumber) patch.trackingNumber = v.trackingNumber;
  if (v.trackingUrl.trim() !== before.trackingUrl) patch.trackingUrl = v.trackingUrl;
  if (v.estimatedDelivery !== before.estimatedDelivery)
    patch.estimatedDelivery = v.estimatedDelivery || null;
  if (v.note.trim()) patch.note = v.note;
  return patch;
}

function TrackingFields({
  idPrefix,
  value,
  onChange,
  required,
}: {
  idPrefix: string;
  value: TrackingValues;
  onChange: (v: TrackingValues) => void;
  required: boolean;
}) {
  const set = (key: keyof TrackingValues) => (e: { target: { value: string } }) =>
    onChange({ ...value, [key]: e.target.value });
  const mark = required ? " *" : "";

  return (
    <>
      <div>
        <Label htmlFor={`${idPrefix}-courier`}>Courier{mark}</Label>
        <Input
          id={`${idPrefix}-courier`}
          className="mt-1.5 min-h-10"
          placeholder="e.g. Delhivery, Blue Dart, India Post"
          maxLength={200}
          required={required}
          value={value.courierName}
          onChange={set("courierName")}
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-awb`}>Tracking ID{mark}</Label>
        <Input
          id={`${idPrefix}-awb`}
          className="mt-1.5 min-h-10 font-mono"
          placeholder="AWB / consignment no."
          maxLength={200}
          required={required}
          value={value.trackingNumber}
          onChange={set("trackingNumber")}
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-url`}>Courier tracking link</Label>
        <Input
          id={`${idPrefix}-url`}
          type="url"
          className="mt-1.5 min-h-10"
          placeholder="https://…"
          maxLength={200}
          value={value.trackingUrl}
          onChange={set("trackingUrl")}
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-eta`}>Estimated delivery</Label>
        <Input
          id={`${idPrefix}-eta`}
          type="date"
          className="mt-1.5 min-h-10"
          value={value.estimatedDelivery}
          onChange={set("estimatedDelivery")}
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={`${idPrefix}-note`}>Update note (optional)</Label>
        <Textarea
          id={`${idPrefix}-note`}
          rows={2}
          className="mt-1.5"
          placeholder="Shown to the customer on the order timeline, e.g. “Handed to courier in Jaipur”"
          maxLength={200}
          value={value.note}
          onChange={set("note")}
        />
      </div>
    </>
  );
}

/**
 * Asked when an admin picks Shipped / Out for delivery from the orders table:
 * the status only changes once the courier and tracking ID are entered.
 */
export function ShipDialog({
  order,
  status,
  onClose,
}: {
  order: AdminOrder | null;
  status: string;
  onClose: () => void;
}) {
  const update = useAdminOrderStatusMutation();
  const [value, setValue] = useState<TrackingValues | null>(null);
  const v = value ?? (order ? trackingValuesOf(order) : null);

  const close = () => {
    setValue(null);
    onClose();
  };

  const problem = v ? trackingProblem(status, v) : null;

  return (
    <Dialog open={order !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Mark {order?.orderNumber} as {statusLabel(status).toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            Add the courier’s tracking details — the customer sees them on their order and the
            Track order page.
          </DialogDescription>
        </DialogHeader>
        {order && v && (
          <form
            id="ship-form"
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (problem) return;
              update.mutate(
                { id: order.id, status, ...trackingPatch(order, v) },
                { onSuccess: close },
              );
            }}
          >
            <TrackingFields idPrefix="ship" value={v} onChange={setValue} required />
          </form>
        )}
        {problem && <p className="text-xs text-muted-foreground">{problem}</p>}
        <DialogFooter>
          <Button variant="outline" className="min-h-10 rounded-full" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="ship-form"
            className="min-h-10 rounded-full px-6"
            disabled={!!problem || update.isPending}
          >
            {update.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Save & mark {statusLabel(status).toLowerCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Delivery status + courier details for one order. Saving a status change or
 * a note adds an entry to the timeline customers see on "Track order".
 */
export function DeliveryForm({ order }: { order: AdminOrder }) {
  const update = useAdminOrderStatusMutation();
  const cancelled = order.status === "CANCELLED";
  const [status, setStatus] = useState(String(order.status));
  const [value, setValue] = useState<TrackingValues>(() => trackingValuesOf(order));

  const patch: AdminOrderPatch = trackingPatch(order, value);
  if (status !== order.status) patch.status = status;
  const dirty = Object.keys(patch).length > 0;
  const problem = trackingProblem(status, value);

  return (
    <div className="rounded-lg border border-border/70 bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Truck className="size-4 text-primary" aria-hidden /> Delivery & tracking
      </p>

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!dirty || problem) return;
            update.mutate({ id: order.id, ...patch });
          }}
        >
          <div className="sm:col-span-2">
            <Label htmlFor={`status-${order.id}`}>Delivery status</Label>
            <Select value={status} onValueChange={setStatus} disabled={cancelled}>
              <SelectTrigger id={`status-${order.id}`} className="mt-1.5 min-h-10 w-full sm:w-1/2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cancelled && (
              <p className="mt-1 text-xs text-muted-foreground">Cancelled orders can’t be reopened.</p>
            )}
          </div>
          <TrackingFields
            idPrefix={`order-${order.id}`}
            value={value}
            onChange={setValue}
            required={NEEDS_TRACKING.has(status)}
          />
          <div className="sm:col-span-2">
            {problem && dirty && (
              <p className="mb-2 text-xs font-medium text-destructive">{problem}</p>
            )}
            <Button
              type="submit"
              className="min-h-10 rounded-full px-6"
              disabled={!dirty || !!problem || update.isPending}
            >
              {update.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Save delivery update
            </Button>
          </div>
        </form>

        <div className="rounded-lg bg-muted/40 p-3">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            What the customer sees
          </p>
          <OrderTracking order={order} />
        </div>
      </div>
    </div>
  );
}
