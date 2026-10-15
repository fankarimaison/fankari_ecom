# API Contract — Fankari Maison (Handcrafted Tote Bags Store) — SUPABASE EDITION

Shared contract between the backend and frontend. The frontend must be written against these
shapes EXACTLY. The backend must implement these shapes EXACTLY.

## General rules

- All routes live under `src/app/api/...` (Next.js 16 App Router route handlers).
- JSON in / JSON out. Errors: `{ "error": "message" }` with proper HTTP status (400/401/403/404/500).
- **Auth: Supabase Auth** (`@supabase/supabase-js` + `@supabase/ssr`). Sessions live in the
  `sb-<ref>-auth-token` cookies managed by `@supabase/ssr`; `src/middleware.ts` refreshes tokens.
- **DB: Supabase Postgres** accessed ONLY from the server via `import { createClient } from '@/lib/supabase/server'`
  (cookie-bound, RLS-enforced). Session helpers in `src/lib/auth.ts` (`getSessionUser`, `requireUser`,
  `FREE_SHIPPING_THRESHOLD=75`, `FLAT_SHIPPING=6.99`, `isSchemaMissing`).
- Tables: `profiles(id, email, name, role, created_at)`, `products`, `cart_items`, `orders`,
  `order_items`, `site_content` — see `supabase/schema.sql` (also contains RLS policies and the
  `place_order` / `admin_cancel_order` RPCs).
- Roles: `CUSTOMER` (default) and `ADMIN`, stored in `profiles.role`. Admin checks are enforced by
  RLS policies AND re-checked in routes via `getSessionUser()`.
- Next.js 16 note: dynamic route handler params are async — use `{ params }: { params: Promise<{ id: string }> }`.
- **Setup guard**: when a Supabase error has code `PGRST205` / `42P01` (or matches `isSchemaMissing()`),
  return `503 { error: "Database not set up — run supabase/schema.sql in the Supabase SQL editor", setupRequired: true }`.
  Applies to every route that touches a table.
- Free shipping threshold: subtotal >= 75 → shipping 0, otherwise shipping 6.99. Constant on the server.

## Auth

- `POST /api/auth/register` body `{ name, email, password }` →
  - If Supabase returns a session (email confirmation disabled): `200 { user }` — logged in immediately.
  - If Supabase requires email confirmation (current project state): `200 { user: null, needsConfirmation: true, message: "Account created! Check your email to confirm your address before signing in." }`
  - Validation errors (400): "Name is required" / "Please enter a valid email address" / "Password must be at least 6 characters" / "An account with this email already exists" (also when Supabase reports `email_address_not_authorized`-style duplicates or an identities array that is empty).
- `POST /api/auth/login` body `{ email, password }` → `200 { user }` or `401 { error: "Invalid email or password" }` (map all Supabase login failures — invalid credentials, email not confirmed, user not found — to this single 401 message).
- `POST /api/auth/logout` → `200 { success: true }` (signs out the Supabase session; cookies cleared).
- `GET /api/auth/me` → always `200 { user: null }` or `200 { user }`.

`UserDTO = { id, name, email, role }` (never expose password). `id` is now a Supabase uuid.

Login/register/logout/me create their own client via `createClient()` from `@/lib/supabase/server` —
calling auth methods on the cookie-bound client is what persists/clears the `sb-*` cookies.

## Products

`ProductDTO = { id, name, slug, description, price, stock, category, image, materials, dimensions, featured, active, createdAt }`
(snake_case DB columns must be mapped to these camelCase names; `price` is a number).

- `GET /api/products?category=Canvas&search=leather&featured=1&sort=new|price_asc|price_desc` → `200 { products: ProductDTO[] }`
  - Only `active: true` products are returned (`.eq('active', true)`).
  - `featured=1` filters to featured. `search` matches name/description (case-insensitive contains → use `.or('name.ilike.%q%,description.ilike.%q%')`). `category` exact case-insensitive (`.ilike(category)`). `sort` default `new` (`created_at desc`); `price_asc` / `price_desc`.
- `GET /api/products/[id]` → `200 { product }` where `[id]` is a uuid OR a slug (detect with the uuid
  regex). Only active products for non-admins; admins may fetch inactive ones (404 otherwise).
- `POST /api/products` **ADMIN** body `{ name, description, price, stock, category, image, materials?, dimensions?, featured? }` → `201 { product }` (slug auto-generated from name + `-2`, `-3`… suffix on collision, checked against the table first; active defaults true)
- `PUT /api/products/[id]` **ADMIN** body: any partial of the above incl. `active` → `200 { product }`
- `DELETE /api/products/[id]` **ADMIN** → `200 { success: true }` (row delete; cart rows cascade, order items keep the snapshot)
- Admin guard: `getSessionUser()` → 401 when signed out, 403 `{ error: "Admin access required" }` when not ADMIN. Same for all admin routes below.

## Cart (requires login → else `401 { error: "Please sign in to use your cart" }`)

`CartItemDTO = { id, productId, quantity, product: ProductDTO }`

- `GET /api/cart` → `200 { items: CartItemDTO[], subtotal: number, count: number }` (subtotal = Σ price×qty, 2 decimals; count = Σ qty; ordered by created_at asc). Fetch with `.select('*, product:products(*)')`.
- `POST /api/cart` body `{ productId, quantity? (default 1, min 1) }` → `200 { items, subtotal, count }`
  (upsert: increments when the row exists — select existing row first, then update quantity, else insert;
  product must exist and be active; if requested total > stock → `400 { error: "Only X left in stock" }`)
- `PUT /api/cart/[id]` body `{ quantity }` → `200 { items, subtotal, count }` (quantity <= 0 deletes the row; validates stock the same way; 404 when the row doesn't exist or isn't owned by the caller)
- `DELETE /api/cart/[id]` → `200 { items, subtotal, count }` (404 when missing/not owner)

Mutation responses always return the full refreshed cart (`items, subtotal, count`).

## Orders (requires login)

`OrderItemDTO = { id, productId, name, price, quantity, image }`
`OrderDTO = { id, orderNumber, status, subtotal, shipping, total, customerName, email, phone, address, city, postalCode, notes, createdAt, items: OrderItemDTO[] }`

- `POST /api/orders` body `{ customerName, email, phone?, address, city, postalCode?, notes? }` → `201 { order: OrderDTO }`
  - Validates required fields first (400 "Name is required" / "Email is required" / "Address is required" / "City is required").
  - Calls the `place_order` RPC (`.rpc('place_order', { p_customer_name, p_email, p_phone, p_address, p_city, p_postal_code, p_notes })`) which atomically loads the cart, validates stock, creates the order + snapshot items, decrements stock and clears the cart. It returns the camelCase order JSON directly.
  - Map RPC errors: message starts with `EMPTY_CART` → 400 "Your cart is empty"; starts with `STOCK:` → 400 `Only <stock> left in stock` (parse `<name>:<stock>`); `AUTH_REQUIRED` → 401.
- `GET /api/orders` → `200 { orders: OrderDTO[] }` (current user's, newest first, items included; fetch `.select('*, items:order_items(*)')` then map rows to OrderDTO, items mapped to OrderItemDTO with camelCase)
- `GET /api/orders/[id]` → `200 { order }` (owner or admin; RLS hides foreign orders → 404 `{ error: "Order not found" }` covers both unknown and not-yours)

## Admin (requires role ADMIN → else 401/403 as above)

- `GET /api/admin/orders` → `200 { orders: (OrderDTO & { user: { name, email } })[] }` (all orders newest first; fetch `.select('*, items:order_items(*), user:profiles(name,email)')` and map to camelCase)
- `PATCH /api/admin/orders/[id]` body `{ status }` where status ∈ PENDING|CONFIRMED|SHIPPED|DELIVERED|CANCELLED →
  - CANCELLED: call `.rpc('admin_cancel_order', { p_order_id })` (atomic single transition + one-time restock). Map errors: `FORBIDDEN` → 403, `NOT_FOUND` → 404, `ALREADY_CANCELLED` → 400 "Order is already cancelled".
  - Any other status: validate against the list, then `.update({ status })` on orders → return mapped `{ order }` (with `user` + `items` embedded like GET admin/orders).
- `GET /api/admin/stats` → `200 { stats: { revenue: number, orders: number, customers: number, products: number, lowStock: number, pending: number } }`
  - revenue = Σ total of non-cancelled orders; orders = count all; customers = count profiles where role=CUSTOMER; products = count all products; lowStock = count active products with stock <= 5; pending = count status PENDING or CONFIRMED. Fetch the needed columns and compute in JS.

## Content

- `GET /api/content` → `200 { content: Record<string,string> }` (DB rows merged over built-in defaults; if the table is empty/missing rows, defaults still apply)
- `PUT /api/content` **ADMIN** body `{ key: value, ... }` → `200 { content }` (upsert with `onConflict: 'key'`; return merged content)

Content keys: `brandName, announcement, heroTitle, heroSubtitle, heroImage, aboutTitle, aboutText`

## Seeded accounts (created by supabase/schema.sql)

- ADMIN: `admin@fankarimaison.com` / `admin123`
- CUSTOMER: `customer@example.com` / `customer123`

## Seeded data

10 products across categories: Canvas, Straw & Jute, Leather Trim, Linen, Special Edition. Images at
`/images/p1.jpg` … `/images/p10.jpg`, hero at `/images/hero.jpg` (served locally from `public/images`).

## Deviations from the previous (Prisma/JWT) contract

- `GET /api/orders/[id]`: an order that exists but belongs to someone else now returns 404 (RLS hides
  it) instead of 403 — no information leak.
- Register may return `{ user: null, needsConfirmation: true }` when the Supabase project has email
  confirmation enabled (it currently does).
- Any route may return `503 { error, setupRequired: true }` while the Supabase schema hasn't been applied.
