import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
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
  image: string
  materials: string
  dimensions: string
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
  items: OrderItemDTO[]
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
  materials: string | null
  dimensions: string | null
  featured: boolean
  active: boolean
  created_at: string
}

export interface CartItemRow {
  id: string
  user_id: string
  product_id: string
  quantity: number
  created_at: string
  product: ProductRow | null
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
  user_id: string
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
  items?: OrderItemRow[] | null
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
    materials: row.materials ?? '',
    dimensions: row.dimensions ?? '',
    featured: row.featured,
    active: row.active,
    createdAt: row.created_at,
  }
}

export function mapCartItem(row: CartItemRow): CartItemDTO {
  return {
    id: row.id,
    productId: row.product_id,
    quantity: Number(row.quantity),
    product: row.product
      ? mapProduct(row.product)
      : ({
          id: '',
          name: '',
          slug: '',
          description: '',
          price: 0,
          discountPercent: 0,
          vatRate: 0,
          stock: 0,
          category: '',
          image: '',
          materials: '',
          dimensions: '',
          featured: false,
          active: false,
          createdAt: '',
        } satisfies ProductDTO),
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
    items: (row.items ?? []).map(mapOrderItem),
  }
}

export function mapAdminOrder(row: AdminOrderRow): AdminOrderDTO {
  return {
    ...mapOrder(row),
    user: { name: row.user?.name ?? '', email: row.user?.email ?? '' },
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

/**
 * Full refreshed cart for the user: rows (created_at asc) with the embedded
 * product, the order totals place_order() will charge (see priceTotals) and
 * count = Σ quantity.
 * Throws the raw PostgREST error so callers can apply the setup guard.
 */
export async function fetchCartPayload(
  supabase: SupabaseClient,
  userId: string,
): Promise<CartPayload> {
  const { data, error } = await supabase
    .from('cart_items')
    .select('*, product:products(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error

  const rows = ((data ?? []) as CartItemRow[]).map(mapCartItem)
  const totals = priceTotals(
    rows.map((item) => ({ ...item.product, quantity: item.quantity })),
    await fetchShippingSettings(supabase),
  )
  const count = rows.reduce((sum, item) => sum + item.quantity, 0)
  return { items: rows, ...totals, count }
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
