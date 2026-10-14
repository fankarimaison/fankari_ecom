import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

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
  price: number
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
  price: number
  quantity: number
  image: string
}

export interface OrderDTO {
  id: string
  orderNumber: string
  status: string
  subtotal: number
  shipping: number
  total: number
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
}

export interface OrderRow {
  id: string
  user_id: string
  order_number: string
  status: string
  subtotal: number | string
  shipping: number | string
  total: number | string
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
  }
}

export function mapOrder(row: OrderRow): OrderDTO {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    subtotal: Number(row.subtotal),
    shipping: Number(row.shipping),
    total: Number(row.total),
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
// Auth user → UserDTO (profile row optional — fall back to auth metadata)
// ---------------------------------------------------------------------------

export function mapAuthUser(
  authUser: {
    id: string
    email?: string | null
    user_metadata?: Record<string, unknown> | null
  },
  profile: ProfileRow | null,
): UserDTO {
  const metaName = authUser.user_metadata?.name
  return {
    id: authUser.id,
    name:
      profile?.name ??
      (typeof metaName === 'string' && metaName.trim() ? metaName : ''),
    email: profile?.email ?? authUser.email ?? '',
    role: profile?.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
  }
}

/** Fetch the profile row for an auth user (null when missing — never throws). */
export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRow | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', userId)
    .maybeSingle()
  return (data as ProfileRow | null) ?? null
}

// ---------------------------------------------------------------------------
// Shared cart payload — used by every /api/cart handler response
// ---------------------------------------------------------------------------

const round2 = (n: number) => Math.round(n * 100) / 100

export interface CartPayload {
  items: CartItemDTO[]
  subtotal: number
  count: number
}

/**
 * Full refreshed cart for the user: rows (created_at asc) with the embedded
 * product, subtotal = Σ price×qty (2 decimals) and count = Σ quantity.
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
  const subtotal = round2(
    rows.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
  )
  const count = rows.reduce((sum, item) => sum + item.quantity, 0)
  return { items: rows, subtotal, count }
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
