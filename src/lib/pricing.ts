/**
 * Pricing rules shared by the API and the storefront. Mirrors place_order()
 * in supabase/schema.sql — keep the two in step.
 *
 *   price             admin-entered price, before VAT
 *   discountPercent   % off the price
 *   vatRate           VAT % added on top of the discounted price
 *
 * Unit price paid = price × (1 − discount%) × (1 + VAT%).
 */

/**
 * Payment methods offered at checkout. To add one, append it here and add its
 * id to the array in place_order() and orders_payment_method_check in
 * supabase/schema.sql.
 *
 * WHATSAPP: the buyer sends the order to the seller on WhatsApp and they
 * settle payment there (see src/lib/whatsapp.ts).
 */
export const PAYMENT_METHODS = [
  {
    id: 'WHATSAPP',
    label: 'Arranged on WhatsApp',
    description: 'Send your order to us on WhatsApp — we confirm it and share payment details there.',
  },
] as const

/** Labels for methods no longer offered but present on older orders. */
const LEGACY_PAYMENT_LABELS: Record<string, string> = { COD: 'Cash on Delivery' }

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]['id']

export function isPaymentMethod(value: unknown): value is PaymentMethodId {
  return PAYMENT_METHODS.some((m) => m.id === value)
}

export function paymentMethodLabel(id: string): string {
  return PAYMENT_METHODS.find((m) => m.id === id)?.label ?? LEGACY_PAYMENT_LABELS[id] ?? id
}

/**
 * Shipping is configured in Admin → Content and stored as site_content rows
 * (shippingFee, freeShippingEnabled, freeShippingThreshold). place_order()
 * reads the same rows with the same defaults.
 */
export interface ShippingSettings {
  /** flat charge per order */
  fee: number
  /** waive the charge once the items total reaches the threshold */
  freeShippingEnabled: boolean
  /** items total (after discount, incl. VAT) that ships free */
  freeShippingThreshold: number
}

export const DEFAULT_SHIPPING: ShippingSettings = {
  fee: 6.99,
  freeShippingEnabled: true,
  freeShippingThreshold: 75,
}

export const SHIPPING_CONTENT_DEFAULTS: Record<string, string> = {
  shippingFee: String(DEFAULT_SHIPPING.fee),
  freeShippingEnabled: String(DEFAULT_SHIPPING.freeShippingEnabled),
  freeShippingThreshold: String(DEFAULT_SHIPPING.freeShippingThreshold),
}

/** A finite, non-negative amount in rupees. */
export function isAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Read shipping settings from site content, falling back to the defaults. */
export function shippingFromContent(content: Record<string, string> | undefined): ShippingSettings {
  const amount = (key: string, fallback: number) => {
    const n = Number(content?.[key])
    return content?.[key] !== undefined && isAmount(n) ? round2(n) : fallback
  }
  return {
    fee: amount('shippingFee', DEFAULT_SHIPPING.fee),
    freeShippingEnabled:
      content?.freeShippingEnabled === undefined
        ? DEFAULT_SHIPPING.freeShippingEnabled
        : content.freeShippingEnabled === 'true',
    freeShippingThreshold: amount('freeShippingThreshold', DEFAULT_SHIPPING.freeShippingThreshold),
  }
}

export interface Priced {
  price: number
  discountPercent: number
  vatRate: number
}

/** A finite number from 0 to 100 — discount and VAT rates. */
export function isPercent(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
}

export const round2 = (n: number) => Math.round(n * 100) / 100

/** Price before any discount, incl. VAT — the struck-through "was" price. */
export function listPrice(p: Priced): number {
  return round2(p.price * (1 + p.vatRate / 100))
}

/** Price the customer pays per unit: discounted, incl. VAT. */
export function unitPrice(p: Priced): number {
  return round2(p.price * (1 - p.discountPercent / 100) * (1 + p.vatRate / 100))
}

export function shippingFor(itemsTotal: number, settings: ShippingSettings): number {
  if (settings.freeShippingEnabled && itemsTotal >= settings.freeShippingThreshold) return 0
  return settings.fee
}

/** Amount still needed for free shipping, or null when the waiver is off. */
export function amountToFreeShipping(itemsTotal: number, settings: ShippingSettings): number | null {
  if (!settings.freeShippingEnabled) return null
  return Math.max(0, round2(settings.freeShippingThreshold - itemsTotal))
}

export interface PriceTotals {
  /** Σ price × qty, before discount and VAT */
  subtotal: number
  discount: number
  vat: number
  /** subtotal − discount + VAT */
  itemsTotal: number
  shipping: number
  total: number
}

/** Order totals, rounded per line exactly like place_order(). */
export function priceTotals(
  lines: (Priced & { quantity: number })[],
  shippingSettings: ShippingSettings,
): PriceTotals {
  let subtotal = 0
  let discount = 0
  let vat = 0
  for (const line of lines) {
    const base = round2(line.price * line.quantity)
    const lineDiscount = round2((base * line.discountPercent) / 100)
    subtotal += base
    discount += lineDiscount
    vat += round2(((base - lineDiscount) * line.vatRate) / 100)
  }
  subtotal = round2(subtotal)
  discount = round2(discount)
  vat = round2(vat)
  const itemsTotal = round2(subtotal - discount + vat)
  const shipping = lines.length ? shippingFor(itemsTotal, shippingSettings) : 0
  return { subtotal, discount, vat, itemsTotal, shipping, total: round2(itemsTotal + shipping) }
}
