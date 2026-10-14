-- ============================================================================
-- Terra & Thread — Handcrafted Tote Bags Store
-- Supabase schema (single script — paste into Dashboard → SQL Editor → Run)
--
-- Idempotent: safe to re-run. Creates tables, RLS policies, triggers,
-- atomic order RPCs and seeds products, site content and demo accounts.
--
-- Demo accounts (email confirmation is bypassed for these):
--   ADMIN    admin@terrathread.com   / admin123
--   CUSTOMER customer@example.com    / customer123
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ============================================================================
-- 1. Tables
-- ============================================================================

-- Profiles extend Supabase auth users (1:1 with auth.users)
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique,
  name       text not null default '',
  role       text not null default 'CUSTOMER' check (role in ('CUSTOMER', 'ADMIN')),
  created_at timestamptz not null default now()
);

-- Products
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text not null default '',
  price       numeric(10, 2) not null default 0,
  stock       integer not null default 0,
  category    text not null default 'Canvas',
  image       text not null default '',
  materials   text not null default '',
  dimensions  text not null default '',
  featured    boolean not null default false,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Cart items (one row per user per product; re-adding increments quantity)
create table if not exists public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity   integer not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- Orders (user_id references profiles so PostgREST can embed user:profiles)
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  order_number  text not null unique,
  status        text not null default 'CONFIRMED'
                check (status in ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
  subtotal      numeric(10, 2) not null default 0,
  shipping      numeric(10, 2) not null default 0,
  total         numeric(10, 2) not null default 0,
  customer_name text not null default '',
  email         text not null default '',
  phone         text not null default '',
  address       text not null default '',
  city          text not null default '',
  postal_code   text not null default '',
  notes         text not null default '',
  created_at    timestamptz not null default now()
);

-- Order line items (keep a snapshot; survive product deletion)
create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name       text not null,
  price      numeric(10, 2) not null,
  quantity   integer not null default 1,
  image      text not null default ''
);

-- Editable site content (key/value CMS)
create table if not exists public.site_content (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_products_category   on public.products (category);
create index if not exists idx_products_featured   on public.products (featured);
create index if not exists idx_cart_items_user     on public.cart_items (user_id);
create index if not exists idx_orders_user         on public.orders (user_id);
create index if not exists idx_orders_created      on public.orders (created_at desc);
create index if not exists idx_order_items_order   on public.order_items (order_id);

-- ============================================================================
-- 2. Helper functions (security definer avoids RLS recursion on profiles)
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  );
$$;

-- ============================================================================
-- 3. Auto-create a profile whenever a user signs up
--    (admin@terrathread.com is automatically granted the ADMIN role)
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    case when lower(new.email) = 'admin@terrathread.com' then 'ADMIN' else 'CUSTOMER' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 4. Enable RLS + policies
-- ============================================================================

alter table public.profiles     enable row level security;
alter table public.products     enable row level security;
alter table public.cart_items   enable row level security;
alter table public.orders       enable row level security;
alter table public.order_items  enable row level security;
alter table public.site_content enable row level security;

-- profiles: users read their own, admins read everyone (no client writes —
-- inserts happen via the signup trigger, updates are not exposed)
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- products: world-readable catalog, admin-only writes
drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products
  for select using (true);

drop policy if exists "products_insert" on public.products;
create policy "products_insert" on public.products
  for insert with check (public.is_admin());

drop policy if exists "products_update" on public.products;
create policy "products_update" on public.products
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products_delete" on public.products;
create policy "products_delete" on public.products
  for delete using (public.is_admin());

-- cart_items: strictly owner-scoped
drop policy if exists "cart_select" on public.cart_items;
create policy "cart_select" on public.cart_items
  for select using (user_id = auth.uid());

drop policy if exists "cart_insert" on public.cart_items;
create policy "cart_insert" on public.cart_items
  for insert with check (user_id = auth.uid());

drop policy if exists "cart_update" on public.cart_items;
create policy "cart_update" on public.cart_items
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "cart_delete" on public.cart_items;
create policy "cart_delete" on public.cart_items
  for delete using (user_id = auth.uid());

-- orders: owner reads/creates, admin reads/updates everything
drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders
  for insert with check (user_id = auth.uid());

drop policy if exists "orders_update" on public.orders;
create policy "orders_update" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

-- order_items: readable through the parent order
drop policy if exists "order_items_select" on public.order_items;
create policy "order_items_select" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "order_items_insert" on public.order_items;
create policy "order_items_insert" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- site_content: world-readable, admin-writable
drop policy if exists "content_select" on public.site_content;
create policy "content_select" on public.site_content
  for select using (true);

drop policy if exists "content_insert" on public.site_content;
create policy "content_insert" on public.site_content
  for insert with check (public.is_admin());

drop policy if exists "content_update" on public.site_content;
create policy "content_update" on public.site_content
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "content_delete" on public.site_content;
create policy "content_delete" on public.site_content
  for delete using (public.is_admin());

-- ============================================================================
-- 5. Atomic order placement (transactional: validate stock → order →
--    snapshot items → decrement stock → clear cart)
--    Errors raised as tokens understood by the API:
--      AUTH_REQUIRED / EMPTY_CART / STOCK:<product name>:<stock left>
-- ============================================================================

create or replace function public.place_order(
  p_customer_name text,
  p_email         text,
  p_phone         text default '',
  p_address       text default '',
  p_city          text default '',
  p_postal_code   text default '',
  p_notes         text default ''
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_user         uuid := auth.uid();
  v_line         record;
  v_order_id     uuid;
  v_order_number text;
  v_subtotal     numeric(10, 2) := 0;
  v_shipping     numeric(10, 2);
  v_total        numeric(10, 2);
  v_count        integer := 0;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Lock product rows and validate every cart line
  for v_line in
    select ci.product_id, ci.quantity,
           p.name as p_name, p.price as p_price, p.image as p_image,
           p.stock as p_stock, p.active as p_active
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.user_id = v_user
    order by ci.created_at asc
    for update of p
  loop
    if not v_line.p_active or v_line.p_stock < v_line.quantity then
      raise exception 'STOCK:%:%', v_line.p_name, v_line.p_stock;
    end if;
    v_subtotal := v_subtotal + v_line.p_price * v_line.quantity;
    v_count    := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'EMPTY_CART';
  end if;

  -- Free shipping at/above $75, flat $6.99 otherwise
  if v_subtotal >= 75 then
    v_shipping := 0;
  else
    v_shipping := 6.99;
  end if;
  v_total := v_subtotal + v_shipping;

  -- Unique order number with retry on collision
  loop
    v_order_number := 'TT-' || (
      select array_to_string(array(
        select substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', floor(random() * 31)::int + 1, 1)
        from generate_series(1, 6)
      ), '')
    );
    begin
      insert into public.orders (
        user_id, order_number, status, subtotal, shipping, total,
        customer_name, email, phone, address, city, postal_code, notes
      ) values (
        v_user, v_order_number, 'CONFIRMED', v_subtotal, v_shipping, v_total,
        p_customer_name, p_email, p_phone, p_address, p_city, p_postal_code, p_notes
      ) returning id into v_order_id;
      exit;
    exception when unique_violation then
      continue;
    end;
  end loop;

  -- Snapshot line items
  insert into public.order_items (order_id, product_id, name, price, quantity, image)
  select v_order_id, ci.product_id, p.name, p.price, ci.quantity, p.image
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.user_id = v_user;

  -- Decrement stock
  update public.products p
  set stock = p.stock - ci.quantity
  from public.cart_items ci
  where ci.product_id = p.id and ci.user_id = v_user;

  -- Clear the cart
  delete from public.cart_items where user_id = v_user;

  -- Return the full order DTO (camelCase, items included)
  return (
    select jsonb_build_object(
      'id', o.id, 'orderNumber', o.order_number, 'status', o.status,
      'subtotal', o.subtotal, 'shipping', o.shipping, 'total', o.total,
      'customerName', o.customer_name, 'email', o.email, 'phone', o.phone,
      'address', o.address, 'city', o.city, 'postalCode', o.postal_code,
      'notes', o.notes, 'createdAt', o.created_at,
      'items', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', oi.id, 'productId', oi.product_id, 'name', oi.name,
          'price', oi.price, 'quantity', oi.quantity, 'image', oi.image
        ) order by oi.id), '[]'::jsonb)
        from public.order_items oi
        where oi.order_id = o.id
      )
    )
    from public.orders o
    where o.id = v_order_id
  );
end;
$$;

-- ============================================================================
-- 6. Atomic admin cancellation (single transition + one-time restock)
--    Errors: FORBIDDEN / NOT_FOUND / ALREADY_CANCELLED
-- ============================================================================

create or replace function public.admin_cancel_order(p_order_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_order record;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_order.status = 'CANCELLED' then
    raise exception 'ALREADY_CANCELLED';
  end if;

  update public.orders set status = 'CANCELLED' where id = p_order_id;

  update public.products p
  set stock = p.stock + oi.quantity
  from public.order_items oi
  where oi.product_id = p.id and oi.order_id = p_order_id;

  return (
    select jsonb_build_object(
      'id', o.id, 'orderNumber', o.order_number, 'status', o.status,
      'subtotal', o.subtotal, 'shipping', o.shipping, 'total', o.total,
      'customerName', o.customer_name, 'email', o.email, 'phone', o.phone,
      'address', o.address, 'city', o.city, 'postalCode', o.postal_code,
      'notes', o.notes, 'createdAt', o.created_at,
      'user', (
        select jsonb_build_object('name', pr.name, 'email', pr.email)
        from public.profiles pr where pr.id = o.user_id
      ),
      'items', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', oi.id, 'productId', oi.product_id, 'name', oi.name,
          'price', oi.price, 'quantity', oi.quantity, 'image', oi.image
        ) order by oi.id), '[]'::jsonb)
        from public.order_items oi
        where oi.order_id = o.id
      )
    )
    from public.orders o
    where o.id = p_order_id
  );
end;
$$;

-- Only signed-in users may call the RPCs (defense in depth — the functions
-- also verify auth.uid() / is_admin() internally)
revoke execute on function public.place_order from anon, public;
grant  execute on function public.place_order to authenticated;

revoke execute on function public.admin_cancel_order from anon, public;
grant  execute on function public.admin_cancel_order to authenticated;

-- ============================================================================
-- 7. Seed site content (idempotent — re-runs never overwrite admin edits)
-- ============================================================================

insert into public.site_content (key, value) values
  ('brandName',     'Terra & Thread'),
  ('announcement',  'Free shipping on all orders over $75 · Handcrafted in small batches'),
  ('heroTitle',     'Carried by Hand, Made with Heart'),
  ('heroSubtitle',  'Small-batch tote bags handcrafted from natural canvas, jute and full-grain leather. Built for everyday adventures, designed to last a lifetime.'),
  ('heroImage',     '/images/hero.jpg'),
  ('aboutTitle',    'Crafted Slowly, Made to Last'),
  ('aboutText',     'Every Terra & Thread bag begins as raw natural fibre — sturdy cotton canvas, rustic jute, buttery full-grain leather — and passes through the hands of skilled artisans who cut, stitch and finish each piece in small batches. We believe the things you carry every day should be beautiful, honest and built to age gracefully. No mass production, no shortcuts: just time-honoured craft and materials that get better with every year you carry them.')
on conflict (key) do nothing;

-- ============================================================================
-- 8. Seed products (idempotent on slug)
-- ============================================================================

insert into public.products (name, slug, description, price, stock, category, image, materials, dimensions, featured) values
  ('Classic Canvas Everyday Tote', 'classic-canvas-everyday-tote',
   'Our signature everyday tote, handcrafted from 14oz natural cotton canvas with reinforced double-stitched handles. Roomy enough for groceries, laptops, or a weekend escape — this is the bag you will reach for every single day.',
   42, 24, 'Canvas', '/images/p1.jpg', '14oz natural cotton canvas, cotton webbing handles', '38 × 35 × 12 cm', true),
  ('Market Day Waxed Canvas Tote', 'market-day-waxed-canvas-tote',
   'Built for the weekly market run and years beyond it. Heavy waxed canvas weathers beautifully, while vegetable-tanned leather straps and solid brass hardware add rugged refinement. Water-resistant and gets better with age.',
   58, 16, 'Canvas', '/images/p2.jpg', 'Waxed cotton canvas, vegetable-tanned leather, brass hardware', '40 × 38 × 14 cm', true),
  ('Boho Straw Beach Tote', 'boho-straw-beach-tote',
   'Hand-woven by artisans from sustainably harvested straw, finished with playful pom-pom tassels. Spacious enough for towels, sunscreen and a good book — your perfect sunshine companion.',
   49, 20, 'Straw & Jute', '/images/p3.jpg', 'Natural woven straw, cotton tassels, cotton lining', '45 × 35 × 15 cm', true),
  ('Jute Market Bag', 'jute-market-bag',
   'A plastic-free staple for farmers market mornings. Sturdy woven jute with smooth wooden handles and an interior pocket for your phone and keys. Strong enough to carry a week of produce.',
   36, 30, 'Straw & Jute', '/images/p4.jpg', 'Woven jute, wooden handles, cotton lining', '42 × 36 × 14 cm', false),
  ('Heritage Leather-Trim Tote', 'heritage-leather-trim-tote',
   'Where canvas meets craftsmanship: durable cotton canvas body trimmed in full-grain cognac leather. Fits a 15" laptop with room to spare. Hand-burnished edges and saddle-stitched stress points make this a decade-long companion.',
   89, 12, 'Leather Trim', '/images/p5.jpg', 'Cotton canvas, full-grain leather trim, brass rivets', '40 × 30 × 13 cm', true),
  ('Saddle Leather Shopper', 'saddle-leather-shopper',
   'Our most luxurious carry. Cut from a single hide of espresso full-grain leather and finished with a hand-set brass buckle. Designed to be carried daily and patina into a one-of-a-kind heirloom.',
   120, 8, 'Leather Trim', '/images/p6.jpg', 'Full-grain leather, solid brass hardware, suede lining', '42 × 32 × 14 cm', true),
  ('Minimalist Linen Carryall', 'minimalist-linen-carryall',
   'Quietly elegant and featherlight. Made from washed European linen with clean French seams — perfect for errands, work, or a day out. Softens with every wash and folds flat when not in use.',
   45, 22, 'Linen', '/images/p7.jpg', '100% washed European linen', '38 × 34 × 10 cm', false),
  ('Embroidered Meadow Tote', 'embroidered-meadow-tote',
   'Each meadow tote is hand-embroidered with wildflowers in terracotta and sage thread — no two are exactly alike. A wearable piece of slow craft that carries your essentials and a story.',
   64, 10, 'Special Edition', '/images/p8.jpg', 'Heavy cotton canvas, cotton embroidery thread', '38 × 36 × 12 cm', true),
  ('Quilted Patchwork Tote', 'quilted-patchwork-tote',
   'Sewn from repurposed fabric squares in warm earth tones, each patchwork tote is one of a kind. Fully quilted and lined for structure, with a nod to generations of thrifty, beautiful handcraft.',
   72, 9, 'Special Edition', '/images/p9.jpg', 'Upcycled cotton fabrics, cotton batting, canvas lining', '39 × 34 × 13 cm', false),
  ('Macramé Fringe Festival Bag', 'macrame-fringe-festival-bag',
   'Hand-knotted cotton cord in a boho fringe silhouette that sways as you walk. Made for festival days, beach strolls, and everything golden-hour. Fully lined so nothing slips through.',
   54, 14, 'Special Edition', '/images/p10.jpg', 'Braided cotton cord, cotton lining', '36 × 38 × 11 cm', false)
on conflict (slug) do nothing;

-- ============================================================================
-- 9. Seed demo accounts (confirmed emails, idempotent)
--    auth.users inserts fire the signup trigger → profiles are created
--
--    NOTE: we deliberately avoid ON CONFLICT here. auth.users enforces email
--    uniqueness with a PARTIAL unique index (users_email_partial_key, where
--    is_sso_user = false), and partial indexes cannot be used as a plain
--    `ON CONFLICT (email)` arbiter (that raises SQLSTATE 42P10). A
--    where-not-exists guard achieves the same idempotency.
-- ============================================================================

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'admin@terrathread.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Studio Admin"}',
  now(), now(), '', '', '', ''
where not exists (
  select 1 from auth.users where email = 'admin@terrathread.com'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated', 'authenticated',
  'customer@example.com',
  crypt('customer123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Demo Customer"}',
  now(), now(), '', '', '', ''
where not exists (
  select 1 from auth.users where email = 'customer@example.com'
);

-- Matching auth.identities rows (needed for a fully valid auth user)
insert into auth.identities (user_id, provider_id, provider, identity_id, identity_data, last_sign_in_at, created_at, updated_at)
select
  '11111111-1111-1111-1111-111111111111', 'email', 'email',
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@terrathread.com","email_verified":true}',
  now(), now(), now()
where not exists (
  select 1 from auth.identities
  where provider_id = 'email' and identity_id = '11111111-1111-1111-1111-111111111111'
);

insert into auth.identities (user_id, provider_id, provider, identity_id, identity_data, last_sign_in_at, created_at, updated_at)
select
  '22222222-2222-2222-2222-222222222222', 'email', 'email',
  '22222222-2222-2222-2222-222222222222',
  '{"sub":"22222222-2222-2222-2222-222222222222","email":"customer@example.com","email_verified":true}',
  now(), now(), now()
where not exists (
  select 1 from auth.identities
  where provider_id = 'email' and identity_id = '22222222-2222-2222-2222-222222222222'
);

-- Make sure passwords/confirmation are correct even if the users already existed
update auth.users
set encrypted_password = crypt('admin123', gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now())
where email = 'admin@terrathread.com';

update auth.users
set encrypted_password = crypt('customer123', gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now())
where email = 'customer@example.com';

-- Backfill profiles for any user created before this schema was applied
insert into public.profiles (id, email, name, role)
select u.id, lower(u.email),
       coalesce(u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1)),
       'CUSTOMER'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- Grant the admin role to the seeded admin email
update public.profiles set role = 'ADMIN' where email = 'admin@terrathread.com';

-- ============================================================================
-- Done. Supabase auto-reloads the PostgREST schema cache after DDL runs in
-- the SQL Editor.
-- ============================================================================
