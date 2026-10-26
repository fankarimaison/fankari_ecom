import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { parseGallery, type MediaItem } from '@/lib/media'
import {
  priceTotals,
  SHIPPING_CONTENT_DEFAULTS,
  shippingFromContent,
  type PriceTotals,
  type ShippingSettings,
} from '@/lib/pricing'

/**
 * Shared DTO mapping + small route helpers for the Supabase-backed API.
 *
 * Supabase rows are snake_case; the API contract (docs/api-contract.md)
 * requires camelCase responses with numeric money fields. Every mapper here
 * takes a raw PostgREST row and returns the contracted DTO shape.
 */

// ---------------------------------------------------------------------------
// Response DTO shapes
// ---------------------------------------------------------------------------

export interface UserDTO {
  id: string
  name: string
  email: string
  role: 'CUSTOMER' | 'ADMIN'
}

export interface ProductDTO {
  id: string
  name: string
  slug: string
  description: string
  /** before VAT and discount */
  price: number
  discountPercent: number
  vatRate: number
  stock: number
  category: string
  /** main image — cover in cards, the bag and order snapshots */
  image: string
  /** extra photos and videos for the product page, in order */
  gallery: MediaItem[]
  materials: string
  dimensions: string
  /** one tip per line */
  careInstructions: string
  featured: boolean
  active: boolean
  createdAt: string
}

export interface CartItemDTO {
  id: string
  productId: string
  quantity: number
  product: ProductDTO
}

export interface OrderItemDTO {
  id: string
  productId: string | null
  name: string
  /** unit price charged — after discount, incl. VAT */
  price: number
  quantity: number
  image: string
  discountPercent: number
  vatRate: number
}

export interface OrderDTO {
  id: string
  orderNumber: string
  status: string
  subtotal: number
  discount: number
  vat: number
  shipping: number
  total: number
  paymentMethod: string
  customerName: string
  email: string
  phone: string
  address: string
  city: string
  postalCode: string
  notes: string
  createdAt: string
  courierName: string
  trackingNumber: string
  trackingUrl: string
  /** YYYY-MM-DD */
  estimatedDelivery: string | null
  items: OrderItemDTO[]
  /** oldest first */
  events: OrderEventDTO[]
}

export interface OrderEventDTO {
  id: string
  status: string
  note: string
  createdAt: string
}

export interface AdminOrderDTO extends OrderDTO {
  user: { name: string; email: string }
}

// ---------------------------------------------------------------------------
// Raw (snake_case) Supabase row shapes. Money columns are `numeric`, which
// PostgREST may deliver as number or string — the mappers coerce with Number().
// ---------------------------------------------------------------------------

export interface ProductRow {
  id: string
  name: string
  slug: string
  description: string
  price: number | string
  discount_percent: number | string | null
  vat_rate: number | string | null
  stock: number
  category: string
  image: string
  gallery?: unknown
  materials: string | null
  dimensions: string | null
  care_instructions?: string | null
  featured: boolean
  active: boolean
  created_at: string
}

export interface OrderItemRow {
  id: string
  order_id: string
  product_id: string | null
  name: string
  price: number | string
  quantity: number
  image: string
  discount_percent: number | string | null
  vat_rate: number | string | null
}

export interface OrderRow {
  id: string
  /** null for guest orders */
  user_id: string | null
  order_number: string
  status: string
  subtotal: number | string
  discount: number | string | null
  vat: number | string | null
  shipping: number | string
  total: number | string
  payment_method: string | null
  customer_name: string
  email: string
  phone: string
  address: string
  city: string
  postal_code: string
  notes: string
  created_at: string
  courier_name?: string | null
  tracking_number?: string | null
  tracking_url?: string | null
  estimated_delivery?: string | null
  items?: OrderItemRow[] | null
  events?: OrderEventRow[] | null
}

export interface OrderEventRow {
  id: string
  status: string
  note: string | null
  created_at: string
}

export interface AdminOrderRow extends OrderRow {
  user?: { name: string; email: string } | null
}

export interface ProfileRow {
  id: string
  name: string
  email: string
  role: string
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

export function mapProduct(row: ProductRow): ProductDTO {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: Number(row.price),
    discountPercent: Number(row.discount_percent ?? 0),
    vatRate: Number(row.vat_rate ?? 0),
    stock: Number(row.stock),
    category: row.category,
    image: row.image,
    // before schema.sql adds the column, or if a row was edited by hand
    gallery: parseGallery(row.gallery ?? []) ?? [],
    materials: row.materials ?? '',
    dimensions: row.dimensions ?? '',
    careInstructions: row.care_instructions ?? '',
    featured: row.featured,
    active: row.active,
    createdAt: row.created_at,
  }
}

export function mapOrderItem(row: OrderItemRow): OrderItemDTO {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    price: Number(row.price),
    quantity: Number(row.quantity),
    image: row.image,
    discountPercent: Number(row.discount_percent ?? 0),
    vatRate: Number(row.vat_rate ?? 0),
  }
}

export function mapOrder(row: OrderRow): OrderDTO {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount ?? 0),
    vat: Number(row.vat ?? 0),
    shipping: Number(row.shipping),
    total: Number(row.total),
    paymentMethod: row.payment_method ?? 'COD',
    customerName: row.customer_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    postalCode: row.postal_code,
    notes: row.notes,
    createdAt: row.created_at,
    courierName: row.courier_name ?? '',
    trackingNumber: row.tracking_number ?? '',
    trackingUrl: row.tracking_url ?? '',
    estimatedDelivery: row.estimated_delivery ?? null,
    items: (row.items ?? []).map(mapOrderItem),
    events: (row.events ?? [])
      .map((e) => ({ id: e.id, status: e.status, note: e.note ?? '', createdAt: e.created_at }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  }
}

/** Embed used by every order read: line items + timeline. */
export const ORDER_SELECT = '*, items:order_items(*), events:order_events(*)'
export const ADMIN_ORDER_SELECT = `${ORDER_SELECT}, user:profiles(name,email)`

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const

export function mapAdminOrder(row: AdminOrderRow): AdminOrderDTO {
  return {
    ...mapOrder(row),
    // Guest orders have no profile — fall back to the checkout details
    user: {
      name: row.user?.name || row.customer_name,
      email: row.user?.email || row.email,
    },
  }
}

// ---------------------------------------------------------------------------
// Shared cart payload — used by every /api/cart handler response
// ---------------------------------------------------------------------------

export interface CartPayload extends PriceTotals {
  items: CartItemDTO[]
  count: number
}

/** Shipping settings from site_content (defaults when unset or unreadable). */
export async function fetchShippingSettings(supabase: SupabaseClient): Promise<ShippingSettings> {
  const { data } = await supabase
    .from('site_content')
    .select('key,value')
    .in('key', Object.keys(SHIPPING_CONTENT_DEFAULTS))
  const content: Record<string, string> = {}
  for (const row of (data ?? []) as { key: string; value: string }[]) content[row.key] = row.value
  return shippingFromContent(content)
}

/** One line of the shopper's bag (kept in their browser — no sign-in). */
export interface BagLine {
  productId: string
  quantity: number
}

/**
 * Parse a request's bag lines: valid uuids and positive integer quantities,
 * repeated products summed. Returns null when the shape is wrong.
 */
export function parseBagLines(value: unknown): BagLine[] | null {
  if (!Array.isArray(value)) return null
  const merged = new Map<string, number>()
  for (const line of value) {
    const productId = (line as { productId?: unknown })?.productId
    const quantity = (line as { quantity?: unknown })?.quantity
    if (typeof productId !== 'string' || !UUID_RE.test(productId)) return null
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) return null
    merged.set(productId, (merged.get(productId) ?? 0) + quantity)
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }))
}

/**
 * Priced bag for the given lines, in the order given: each line with its
 * product (unknown or retired products are dropped), the order totals
 * place_order() will charge (see priceTotals) and count = Σ quantity.
 * Line ids are the product ids.
 * Throws the raw PostgREST error so callers can apply the setup guard.
 */
export async function buildCartPayload(
  supabase: SupabaseClient,
  lines: BagLine[],
): Promise<CartPayload> {
  let products: ProductDTO[] = []
  if (lines.length) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('id', lines.map((l) => l.productId))
    if (error) throw error
    products = ((data ?? []) as ProductRow[]).map(mapProduct)
  }

  const byId = new Map(products.map((p) => [p.id, p]))
  const items: CartItemDTO[] = []
  for (const line of lines) {
    const product = byId.get(line.productId)
    if (!product || !product.active) continue
    items.push({ id: product.id, productId: product.id, quantity: line.quantity, product })
  }

  const totals = priceTotals(
    items.map((item) => ({ ...item.product, quantity: item.quantity })),
    await fetchShippingSettings(supabase),
  )
  const count = items.reduce((sum, item) => sum + item.quantity, 0)
  return { items, ...totals, count }
}

// ---------------------------------------------------------------------------
// Setup guard — schema (supabase/schema.sql) not applied yet
// ---------------------------------------------------------------------------

export const SETUP_ERROR_MESSAGE =
  'Database not set up — run supabase/schema.sql in the Supabase SQL editor'

export function setupRequiredResponse(): NextResponse {
  return NextResponse.json(
    { error: SETUP_ERROR_MESSAGE, setupRequired: true },
    { status: 503 },
  )
}

// ---------------------------------------------------------------------------
// Misc shared helpers
// ---------------------------------------------------------------------------

/** Matches Postgres uuids — used to decide id vs slug lookups. */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
