# API Contract — Terra & Thread (Handcrafted Tote Bags Store)

Shared contract between the backend agent (Task 4-a) and frontend agent (Task 4-b).
The frontend must be written against these shapes EXACTLY. The backend must implement these shapes EXACTLY.

General rules:
- All routes live under `src/app/api/...` (Next.js 16 App Router route handlers).
- JSON in / JSON out. Errors: `{ "error": "message" }` with proper HTTP status (400/401/403/404/500).
- **Auth**: custom JWT in an httpOnly cookie named `session` (implemented with `jose` + `bcryptjs`).
  Auth helpers live in `src/lib/auth.ts` (backend creates; frontend never imports it — frontend just calls APIs and reads cookies indirectly).
- **Roles**: `CUSTOMER` (default) and `ADMIN`.
- DB access via `import { db } from '@/lib/db'` (Prisma, already configured).
- Next.js 16 note: dynamic route handler params are async — use `{ params }: { params: Promise<{ id: string }> }` and `const { id } = await params`.
- Free shipping threshold: subtotal >= 75 → shipping 0, otherwise shipping 6.99. Constant on the server.

## Auth

- `POST /api/auth/register` body `{ name, email, password }` → `200 { user }` (validates email unique, password min 6 chars; hashes with bcrypt; sets session cookie = logged in immediately)
- `POST /api/auth/login` body `{ email, password }` → `200 { user }` or `401 { error }`
- `POST /api/auth/logout` → `200 { success: true }` (clears cookie)
- `GET /api/auth/me` → always `200 { user: null }` or `200 { user }`

`UserDTO = { id, name, email, role }` (never expose password)

## Products

`ProductDTO = { id, name, slug, description, price, stock, category, image, materials, dimensions, featured, active, createdAt }`

- `GET /api/products?category=Canvas&search=leather&featured=1&sort=new|price_asc|price_desc` → `200 { products: ProductDTO[] }`
  - Only `active: true` products are returned to everyone (public store has no inactive products).
  - `featured=1` filters to featured. `search` matches name/description (case-insensitive contains). `category` exact match (case-insensitive). `sort` default `new`.
- `GET /api/products/[id]` → `200 { product }` where `[id]` may be a Prisma id OR a slug. Only active products (404 otherwise).
- `POST /api/products` **ADMIN** body `{ name, description, price, stock, category, image, materials?, dimensions?, featured? }` → `201 { product }` (slug auto-generated from name + unique suffix if needed, active defaults true)
- `PUT /api/products/[id]` **ADMIN** body: any partial of the above incl. `active` → `200 { product }`
- `DELETE /api/products/[id]` **ADMIN** → `200 { success: true }` (deletes; cascade removes cart items; order items keep snapshot via onDelete cascade rule already in schema — orders keep their OrderItem rows because OrderItem→Product relation set to cascade; acceptable for demo)

## Cart (requires login → else `401 { error: "Please sign in to use your cart" }`)

`CartItemDTO = { id, productId, quantity, product: ProductDTO }`

- `GET /api/cart` → `200 { items: CartItemDTO[], subtotal: number, count: number }` (subtotal = Σ price×qty; count = Σ qty; ordered by createdAt asc)
- `POST /api/cart` body `{ productId, quantity? (default 1) }` → `200 { items, subtotal, count }` (upsert: increments if exists; validates product active & stock: `400 { error: "Only X left in stock" }` if requested total > stock)
- `PUT /api/cart/[id]` body `{ quantity }` → `200 { items, subtotal, count }` (quantity <= 0 deletes the row; validates stock; 404 if not owner)
- `DELETE /api/cart/[id]` → `200 { items, subtotal, count }` (404 if not owner)

Mutation responses always return the full refreshed cart (`items, subtotal, count`) so the client can update in one shot.

## Orders (requires login)

`OrderItemDTO = { id, productId, name, price, quantity, image }`
`OrderDTO = { id, orderNumber, status, subtotal, shipping, total, customerName, email, phone, address, city, postalCode, notes, createdAt, items: OrderItemDTO[] }`

- `POST /api/orders` body `{ customerName, email, phone?, address, city, postalCode?, notes? }` → `201 { order: OrderDTO }`
  - Server: loads user's cart; empty cart → `400 { error: "Your cart is empty" }`.
  - Validates stock for every line (400 with message). Creates Order + OrderItems (snapshot name/price/image), decrements product stock, deletes cart items — all in one transaction.
  - status starts as `"CONFIRMED"`. orderNumber format: `TT-` + 6 random uppercase alphanumeric chars (unique).
- `GET /api/orders` → `200 { orders: OrderDTO[] }` (current user's, newest first, items included)
- `GET /api/orders/[id]` → `200 { order }` (owner or ADMIN, else 404/403)

## Admin (requires role ADMIN → else `403 { error: "Admin access required" }`)

- `GET /api/admin/orders` → `200 { orders: (OrderDTO & { user: { name, email } })[] }` (all orders newest first)
- `PATCH /api/admin/orders/[id]` body `{ status }` where status ∈ PENDING|CONFIRMED|SHIPPED|DELIVERED|CANCELLED → `200 { order }` (CANCELLED restores stock for its items)
- `GET /api/admin/stats` → `200 { stats: { revenue: number, orders: number, customers: number, products: number, lowStock: number, pending: number } }`
  - revenue = Σ total of non-cancelled orders; orders = count all; customers = count role CUSTOMER; products = count all; lowStock = count active products with stock <= 5; pending = count status PENDING or CONFIRMED.

## Content

- `GET /api/content` → `200 { content: Record<string,string> }` (rows from SiteContent table; if table empty return built-in defaults)
- `PUT /api/content` **ADMIN** body `{ key: value, ... }` → `200 { content }` (upsert each key)

Content keys (seeded): `brandName, announcement, heroTitle, heroSubtitle, heroImage, aboutTitle, aboutText`

## Seeded accounts

- ADMIN: `admin@terrathread.com` / `admin123`
- CUSTOMER: `customer@example.com` / `customer123`

## Seeded data

10 products across categories: Canvas, Straw & Jute, Leather Trim, Linen, Special Edition. Images at `/images/p1.jpg` … `/images/p10.jpg`, hero at `/images/hero.jpg`.
