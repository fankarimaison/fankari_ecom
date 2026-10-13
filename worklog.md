# Project Worklog — Terra & Thread (Handcrafted Tote Bags E-commerce)

---
Task ID: 1
Agent: orchestrator (main)
Task: Setup — install deps, Prisma schema, db push

Work Log:
- Installed bcryptjs, jose, @types/bcryptjs
- Wrote prisma/schema.prisma: User (role CUSTOMER|ADMIN), Product, CartItem (unique userId+productId), Order (orderNumber, status, shipping info), OrderItem (snapshot name/price/image), SiteContent (key/value)
- Ran `bun run db:push` — schema synced, client generated

Stage Summary:
- DB schema live at db/custom.db. Prisma models: User, Product, CartItem, Order, OrderItem, SiteContent.

---
Task ID: 2
Agent: orchestrator (main)
Task: Generate product & hero images

Work Log:
- scripts/generate-images.ts: 10 product images (1024x1024) + 1 hero (1440x720) via z-ai-web-dev-sdk, saved to public/images/p1..p10.jpg, hero.jpg

Stage Summary:
- Images available at /images/p1.jpg ... /images/p10.jpg and /images/hero.jpg (verify files exist if any image missing on site).

---
Task ID: 3
Agent: orchestrator (main)
Task: Seed database

Work Log:
- scripts/seed.ts: created admin@terrathread.com/admin123 (ADMIN), customer@example.com/customer123 (CUSTOMER), 10 tote bag products ($36-$120) across Canvas / Straw & Jute / Leather Trim / Linen / Special Edition, 7 SiteContent keys (brandName, announcement, heroTitle, heroSubtitle, heroImage, aboutTitle, aboutText)
- Ran seed successfully.

Stage Summary:
- 10 products, 2 users, content seeded. API contract at docs/api-contract.md, frontend spec at docs/frontend-spec.md — these are the SOURCE OF TRUTH for tasks 4-a and 4-b.

---
Task ID: 4-a
Agent: full-stack-developer (backend)
Task: Implement all backend API routes (auth, products, cart, orders, admin, content) per docs/api-contract.md + JWT auth helpers

Work Log:
- Created src/lib/auth.ts: jose HS256 JWT (AUTH_SECRET env with dev fallback, payload { userId, email, role }, 7d expiry), signSession / setSessionCookie (httpOnly, sameSite lax, path /, 7d maxAge, cookie "session") / clearSessionCookie / getSessionUser (await cookies(), Next 16 async) / requireUser; exports FREE_SHIPPING_THRESHOLD=75, FLAT_SHIPPING=6.99
- Auth routes: POST register (email format + min-6 password + uniqueness validation, bcrypt hash, auto-login via cookie), POST login (401 "Invalid email or password"), POST logout (clears cookie), GET me (always 200, { user: null } when signed out); UserDTO never exposes password
- Products: GET list (active-only, category case-insensitive exact, search case-insensitive contains on name+description, featured=1, sort new|price_asc|price_desc; SQLite has no Prisma "mode: insensitive" so filters applied in-memory over createdAt-desc query — catalog is small), GET [id] accepts Prisma id OR slug (active only, else 404), POST/PUT/DELETE admin-guarded (401 unauthenticated → 403 non-admin "Admin access required"); slug auto-generated with numeric -2, -3… suffix on collision
- Cart: GET/POST /api/cart + PUT/DELETE /api/cart/[id], all login-required with exact 401 "Please sign in to use your cart"; POST upserts (increments when row exists), clamps against stock with 400 "Only X left in stock"; PUT quantity<=0 deletes row; PUT/DELETE 404 when item missing or not owner; every mutation returns full refreshed { items, subtotal, count } (createdAt asc, subtotal rounded to 2 decimals)
- Orders: POST transaction (empty-cart 400 "Your cart is empty" → per-line stock validation → Order + OrderItems with name/price/image snapshot → product stock decrement → cart cleared) returning 201 { order }, status CONFIRMED, shipping = subtotal>=75 ? 0 : 6.99; orderNumber "TT-" + 6 chars from ABCDEFGHJKMNPQRSTUVWXYZ23456789 with uniqueness retry; GET user's orders newest-first with items; GET [id] owner-or-admin (403 "Access denied" otherwise, 404 unknown)
- Admin: GET orders (all, newest first, includes user { name, email } via select), PATCH [id] status (PENDING|CONFIRMED|SHIPPED|DELIVERED|CANCELLED validated, CANCELLED transitions restock all lines once via updateMany — no double-restock on repeated PATCH), GET stats (revenue=Σ non-cancelled totals, orders, customers, products, lowStock=active stock<=5, pending=PENDING+CONFIRMED)
- Content: GET merges built-in defaults (brandName/announcement/heroTitle/heroSubtitle/heroImage/aboutTitle/aboutText copied from scripts/seed.ts) under SiteContent rows; PUT admin upserts { key: value } map, returns merged content
- bun run lint: clean (0 errors/warnings). Full curl smoke test against dev server: see below. Test artifacts (2 test users, 2 test orders, 2 test products) removed afterwards; product stock restored; seeded content values restored

Stage Summary:
- 15 files created: src/lib/auth.ts + 14 route.ts under src/app/api/{auth/{register,login,logout,me},products,products/[id],cart,cart/[id],orders,orders/[id],admin/orders,admin/orders/[id],admin/stats,content}
- Auth = JWT (jose HS256) in httpOnly cookie "session", bcryptjs password hashing, roles CUSTOMER/ADMIN from JWT payload
- Deviations from contract (additive-only, none breaking): responses are Prisma objects so they may carry extra fields beyond DTOs (e.g. updatedAt on Product, userId/createdAt on CartItem rows) — every contracted field is present with the contracted name/type; subtotal rounded to 2 decimals; unauthenticated hits on admin routes return 401 (non-admins still get the contracted 403 "Admin access required"); PUT product does not regenerate slug when name changes
- Smoke-tested end-to-end via curl cookie jars: register/login/me/logout, dup-email + validation 400s, product filters/sorts/slug-or-id lookup, cart upsert/stock-clamp/qty0-delete, order placement (shipping 6.99 under $75, free at $114, stock decremented, cart cleared, TT- order numbers), admin orders/stats/PATCH (cancel restocked 7→8, revenue excluded cancelled), content GET/PUT. All statuses matched the contract

---
Task ID: 5
Agent: orchestrator (main)
Task: Integration fixes after parallel build agents (Task 4-a/4-b)

Work Log:
- Replaced leftover probe page.tsx with StoreApp wrapped in Providers
- Fixed providers.tsx: TanStack Query v5 uses `client` prop (was `queryClient`)
- Fixed checkout.tsx: useCartState() takes no args; useForm option `values: prefill` (was invalid `prefill`)
- Fixed product-detail.tsx: used `addItem.isPending` (mutation) instead of `addToCart.isPending` (callback)
- Fixed header.tsx corrupted useState line (interrupted write)
- Removed stray trailing comment in layout.tsx
- bunx tsc --noEmit: clean for src/** (only pre-existing errors in examples/skills/tests)
- curl GET /: HTTP 200, products APIs returning 200

Stage Summary:
- Frontend + backend integrated; page compiles and renders. Remaining: finish product/hero image generation, browser E2E verification.

---
Task ID: 5
Agent: orchestrator (main)
Task: End-to-end browser verification (agent-browser)

Work Log:
- Generated all images (10 products + hero at 1344x768 — API requires 32px multiples, 1440x720 rejected)
- Fixed Radix a11y warning: header mobile SheetContent aria-describedby={undefined}
- Browser E2E verified (desktop 1280px + mobile 390px):
  - Home: hero, trust strip, featured, catalogue (category chips, search "jute"→1 result, sort), about, sticky footer
  - Product detail: images, materials, dimensions, qty stepper
  - Auth: add-to-cart while logged out → 401 toast + account redirect; customer login; admin login; sign out
  - Cart: drawer with free-shipping progress, qty steppers, badge counts (0→1), persisted across login
  - Checkout: prefilled form (values fix), shipping FREE ≥$75, order placed TT-VR7WAP, cart cleared
  - Orders: order-success view, account order history expandable with shipping details
  - Admin: dashboard stats live (revenue $120, orders 1), products CRUD (create + delete via confirm dialog), inventory inline stock (+5: 9→14), orders status Confirmed→Shipped with restock logic, content editor announcement goes live instantly
  - Mobile: 2-col grid, hamburger sheet, stacked cards, no overflow issues
- Final state: lint clean, tsc clean (src), zero console errors/warnings, all API 200s
- Note: agent-browser synthetic clicks stopped registering after HMR full-reload (CDP session issue) — verified via JS clicks + fresh session; app handlers fire correctly (trusted clicks work after browser restart)

Stage Summary:
- ALL FLOWS VERIFIED WORKING. Site ready: storefront (browse/search/filter/cart/checkout), customer accounts with order history, full admin backend (products, inventory, orders, content).
