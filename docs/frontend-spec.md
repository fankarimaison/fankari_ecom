# Frontend Spec — Fankari Maison (Handcrafted Tote Bags Store)

Task 4-b builds the ENTIRE frontend as a single-page app on the `/` route (user can only see `src/app/page.tsx` — do NOT create other page routes).

## Architecture

- **One page route**: `src/app/page.tsx` renders a client `<StoreApp />` component.
- **View navigation**: client-side via Zustand store — NOT URL routing. Store shape:
  ```ts
  type View =
    | { name: 'home' }
    | { name: 'product'; productId: string }
    | { name: 'cart' }
    | { name: 'checkout' }
    | { name: 'order-success'; orderId: string }
    | { name: 'account' }
    | { name: 'admin'; tab?: 'dashboard' | 'products' | 'inventory' | 'orders' | 'content' }
  ```
  Store: `view`, `navigate(view)`, `cartOpen`, `setCartOpen(bool)`. Put it in `src/lib/store.ts`.
- **Server state**: TanStack Query (v5, already installed). Create a `QueryClientProvider` client component (e.g. `src/components/providers.tsx`) and wrap the app in `layout.tsx` (keep the existing Toaster). Query keys: `['me']`, `['products', params]`, `['product', id]`, `['cart']`, `['orders']`, `['order', id]`, `['admin-orders']`, `['admin-stats']`, `['content']`. Invalidate aggressively after mutations.
- **Auth state**: `GET /api/auth/me` via `useQuery(['me'])`. Login/register/logout mutations invalidate `['me']` (+ `['cart']`).
- All data fetching with `fetch('/api/...')` relative URLs only.

## Design language (MANDATORY — artisan/warm aesthetic, NO indigo/blue/purple)

- Palette: warm cream background (`#FAF6F0`-ish via bg styling), stone-900 text, terracotta accent (amber-800/orange-800 family, e.g. `#B45309` amber-700) for primary buttons/links/badges, sage green (stone/olive) as secondary. Style via Tailwind classes; customize CSS variables in `globals.css` if helpful (keep light theme).
- Typography: add Google font `Fraunces` (serif, for headings/brand) + keep Geist for body, via `next/font/google` in `layout.tsx` (e.g. variable `--font-serif`). Headings use `font-serif`. Update metadata title to "Fankari Maison — Handcrafted Tote Bags".
- Feel: editorial, generous whitespace, subtle framer-motion fade/slide transitions between views, rounded-xl cards, soft shadows, hover scale on product images.
- Layout: sticky announcement bar (from content.announcement), header (brand name serif logo mark 🧵-like via lucide `ShoppingBag`/`Sparkles` icon + nav), main content, **sticky footer** (root wrapper `min-h-screen flex flex-col`, footer `mt-auto`, include safe-area padding `pb-[env(safe-area-inset-bottom)]`). Footer: brand blurb, quick links (Shop, About, Account), contact line, copyright with brandName.

## Header

- Left: brand name (click → home). Center/right nav: "Shop" (home), "About" (home + scroll to #about), "Account" (→ account view, label shows first name when logged in), admin users also see "Admin" (→ admin view). Right: cart button (lucide `ShoppingBag`) with count badge from `GET /api/cart` (only when logged in; hide badge when 0). Mobile: collapse nav into a `Sheet` hamburger menu. Use `useMediaQuery`-style responsive classes (hide nav links on `md:hidden` etc.).

## Views

### 1. Home (default)
- Hero section: two-column on desktop — left: heroTitle (big serif), heroSubtitle, CTA buttons "Shop the Collection" (scroll to products) + "Our Story" (scroll to #about); right: heroImage (rounded, soft shadow). Full-bleed warm gradient/texture background. Mobile stacks.
- Trust strip: 3–4 small items with lucide icons: "Handcrafted in small batches", "Natural materials", "Free shipping over $75", "Built to last".
- Product catalogue section (id="shop"): category filter chips (All, Canvas, Straw & Jute, Leather Trim, Linen, Special Edition — derive from data or hardcode to match seed) + search input + sort dropdown (Newest, Price low→high, high→low). Product grid: responsive 2/3/4 cols (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`). Card: square image (next/image or img with aspect-square object-cover, hover scale), name (serif, truncate 2 lines), category small text, price, stock badge ("Only 3 left" in amber when stock<=5, "Sold out" overlay+disabled when 0), click → product view. Skeletons while loading.
- Featured section above catalogue: "Artisan Favorites" horizontal scroll or first 4 featured products (use same card).
- About section (id="about"): two-column — aboutImage (`/images/hero.jpg` reuse ok) + aboutTitle/aboutText from content; bullet list of craft values with lucide icons.

### 2. Product detail
- Breadcrumb back to shop. Two-column: large image left; right: category chip, name (serif xl), price, stock status, description, materials + dimensions rows (lucide icons), quantity stepper (1..stock), "Add to Cart" primary button (disabled sold out; if 401 response → show toast "Please sign in" + navigate to account), secondary "Buy Now" (adds + goes to cart).
- "You may also like": 4 cards from same category (exclude current).

### 3. Cart (also a Sheet drawer version shared component)
- Drawer (shadcn Sheet, right side) opened from header: line items (image, name, price, qty stepper, remove), subtotal, "Checkout" button → cart view if you prefer, else straight to checkout; "Continue shopping" closes.
- Cart view (page): same list larger, order summary card (subtotal, shipping note "FREE over $75 / $6.99 flat", total), checkout button. Empty state: icon + "Your bag is empty" + browse CTA.

### 4. Checkout (requires login; if !user → redirect to account view with toast)
- Form (react-hook-form + zod): customerName (prefill user.name), email (prefill), phone, address, city, postalCode, notes. Summary side: items, subtotal, shipping, total.
- Place order → `POST /api/orders`; on success: invalidate cart + products + orders, navigate to order-success. On 400 show error toast.

### 5. Order success
- Big check icon, "Thank you, {customerName}!", order number (mono/badge), summary of items + totals, CTA "View my orders" (account view) and "Continue shopping".

### 6. Account
- Logged out: card with Tabs "Sign in" / "Create account". Demo hint box: "Demo customer: customer@example.com / customer123". On success toast welcome + navigate home.
- Logged in: greeting card (name, email, sign out button), Order history: list of user orders (order number, date, status badge, total, item thumbnails) → expandable/inline detail (items, quantities, prices, shipping address). Status badge colors: CONFIRMED amber, SHIPPED orange, DELIVERED green, CANCELLED red/stone.

### 7. Admin (view only rendered if user.role === 'ADMIN'; guard: otherwise "Admin access required" message)
- Left sidebar nav (or top tabs) with 5 sections + counts; wrap in its own sub-header.
- **Dashboard**: stat cards (Revenue, Orders, Customers, Low stock) with lucide icons; low-stock products list (name, stock, quick +5 button); recent orders list.
- **Products**: table (image thumb, name, category, price, stock, featured toggle, active toggle, edit/delete). "Add product" button → Dialog form (name, description, price, stock, category select, image URL text input with preview, materials, dimensions, featured switch). Edit = same dialog prefilled. Delete = confirm AlertDialog. Image URL can be `/images/pX.jpg` or any URL.
- **Inventory**: table of all products with stock; inline stock stepper/quick set (+1/+5/+10, editable input, save on change); low stock rows highlighted; total inventory value display.
- **Orders**: all orders table (order number, date, customer name+email, items count, total, status Select to PATCH). Row expand → items detail. Status change invalidates orders + stats.
- **Content**: form to edit brandName, announcement, heroTitle, heroSubtitle, heroImage, aboutTitle, aboutText with Save button (PUT /api/content, invalidate ['content']). Textareas for long text. Preview note that header/hero/about update live.

## UX requirements
- Toasts (sonner is available too — use existing `use-toast` or sonner consistently) for: added to cart, signed in/out, order placed, admin CRUD results, errors.
- Loading skeletons for product grid, orders, admin tables.
- All buttons ≥44px touch targets, responsive from 360px to desktop.
- Money formatting: `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` — make a `formatPrice` util in `src/lib/format.ts`.
- Date formatting: date-fns `format(date, 'MMM d, yyyy')`.
- When logged out and cart APIs return 401 → catch in mutation onError and toast "Please sign in".

## Files to create (suggested)
- `src/lib/store.ts`, `src/lib/format.ts`
- `src/components/providers.tsx`
- `src/components/store/store-app.tsx` (root switch by view)
- `src/components/store/header.tsx`, `footer.tsx`, `cart-drawer.tsx`
- `src/components/store/views/home.tsx`, `product-detail.tsx`, `cart-view.tsx`, `checkout.tsx`, `order-success.tsx`, `account.tsx`, `admin.tsx` (+ admin sub-components)
- `src/components/store/product-card.tsx`
- Update `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`

DO NOT create files under `src/app/api/` (backend agent owns those). DO NOT modify `prisma/`, `scripts/`, or `docs/`.
