"use client";

import {
  Award,
  BadgeCheck,
  Clock,
  Flower2,
  Gem,
  Gift,
  Globe,
  HandHeart,
  Heart,
  Leaf,
  Lock,
  MapPin,
  MessageCircle,
  Package,
  Palette,
  Recycle,
  RotateCcw,
  Scissors,
  ShieldCheck,
  Smile,
  Sparkles,
  Star,
  Sun,
  Tag,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { TRUST_ICONS } from "@/lib/trust";

/** Lucide icon + friendly name for each highlight icon key. */
export const TRUST_ICON_MAP: Record<(typeof TRUST_ICONS)[number], { Icon: LucideIcon; label: string }> = {
  "hand-heart": { Icon: HandHeart, label: "Handmade" },
  leaf: { Icon: Leaf, label: "Leaf" },
  truck: { Icon: Truck, label: "Delivery" },
  "shield-check": { Icon: ShieldCheck, label: "Shield" },
  sparkles: { Icon: Sparkles, label: "Sparkles" },
  heart: { Icon: Heart, label: "Heart" },
  gift: { Icon: Gift, label: "Gift" },
  package: { Icon: Package, label: "Package" },
  recycle: { Icon: Recycle, label: "Recycle" },
  award: { Icon: Award, label: "Award" },
  star: { Icon: Star, label: "Star" },
  gem: { Icon: Gem, label: "Gem" },
  scissors: { Icon: Scissors, label: "Scissors" },
  palette: { Icon: Palette, label: "Palette" },
  globe: { Icon: Globe, label: "Globe" },
  clock: { Icon: Clock, label: "Clock" },
  "rotate-ccw": { Icon: RotateCcw, label: "Returns" },
  "badge-check": { Icon: BadgeCheck, label: "Verified" },
  smile: { Icon: Smile, label: "Smile" },
  sun: { Icon: Sun, label: "Sun" },
  flower: { Icon: Flower2, label: "Flower" },
  "map-pin": { Icon: MapPin, label: "Location" },
  "message-circle": { Icon: MessageCircle, label: "Chat" },
  lock: { Icon: Lock, label: "Secure" },
  tag: { Icon: Tag, label: "Price tag" },
};

/** Icon component for a key (falls back to sparkles). */
export function trustIcon(key: string): LucideIcon {
  return (TRUST_ICON_MAP as Record<string, { Icon: LucideIcon }>)[key]?.Icon ?? Sparkles;
}
