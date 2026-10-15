-- ============================================================================
-- Fankari Maison — Handcrafted Tote Bags Store
-- Supabase schema (single script — paste into Dashboard → SQL Editor → Run)
--
-- Idempotent: safe to re-run. Creates tables, RLS policies, atomic order RPCs
-- and seeds products and site content.
--
-- Authentication is Clerk, via Supabase's third-party auth integration
-- (Dashboard → Authentication → Sign In / Providers → Third-party → Clerk).
-- Requests carry the Clerk session token, so:
--   auth.jwt() ->> 'sub'       the Clerk user id (user_…) — see current_user_id()
--   auth.jwt() ->> 'email'     primary email     (custom session claim)
--   auth.jwt() ->> 'name'      full name         (custom session claim)
--   auth.jwt() ->> 'app_role'  'admin' for admins (custom claim from the
--                              user's Clerk public metadata {"role":"admin"})
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ============================================================================
-- 1. Tables
-- ============================================================================

-- Profiles mirror Clerk users (id = Clerk user id); kept in sync from the
-- session token by public.sync_profile()
create table if not exists public.profiles (
  id         text primary key,
  email      text not null default '',
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
  user_id    text not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity   integer not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- Orders (user_id references profiles so PostgREST can embed user:profiles)
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null references public.profiles (id) on delete cascade,
  order_number  text not null unique,
  status        text not null default 'CONFIRMED'
                constraint orders_status_check check (status in (
                  'PENDING', 'CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')),
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

-- Pricing: VAT is added on top of the price; the discount is a % off the
-- price. Unit price paid = price × (1 − discount%) × (1 + VAT%).
-- Payment is Cash on Delivery only. (add column if not exists → also upgrades
-- databases created by earlier versions of this script.)
alter table public.products
  add column if not exists vat_rate         numeric(5, 2) not null default 0
    check (vat_rate >= 0 and vat_rate <= 100),
  add column if not exists discount_percent numeric(5, 2) not null default 0
    check (discount_percent >= 0 and discount_percent <= 100);

alter table public.orders
  add column if not exists discount       numeric(10, 2) not null default 0,
  add column if not exists vat            numeric(10, 2) not null default 0,
  add column if not exists payment_method text not null default 'COD'
    constraint orders_payment_method_check check (payment_method in ('COD'));

-- order_items.price is the unit price actually charged (after discount, incl.
-- VAT); the rates are snapshotted alongside it.
alter table public.order_items
  add column if not exists discount_percent numeric(5, 2) not null default 0,
  add column if not exists vat_rate         numeric(5, 2) not null default 0;

-- Delivery tracking (set by admins in Admin → Orders; shown on the public
-- Track order page). OUT_FOR_DELIVERY joins the status list.
alter table public.orders
  add column if not exists courier_name       text not null default '',
  add column if not exists tracking_number    text not null default '',
  add column if not exists tracking_url       text not null default '',
  add column if not exists estimated_delivery date;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in (
  'PENDING', 'CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'));

-- Order timeline: one row per status change or admin note
create table if not exists public.order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  status     text not null,
  note       text not null default '',
  created_at timestamptz not null default now()
);

-- Orders placed before the timeline existed start with their creation event
insert into public.order_events (order_id, status, created_at)
select o.id, 'CONFIRMED', o.created_at
from public.orders o
where not exists (select 1 from public.order_events e where e.order_id = o.id);

-- Migration from Supabase Auth → Clerk (runs once, only on databases created by
-- earlier versions of this script, where user ids were auth.users uuids).
-- Supabase Auth accounts cannot sign in through Clerk, so their profiles are
-- removed together with their carts and orders (cascade). Policies are dropped
-- first because Postgres cannot change the type of a column a policy uses;
-- section 4 recreates them.
do $$
declare
  pol record;
begin
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'id') = 'uuid' then
    drop trigger if exists on_auth_user_created on auth.users;

    for pol in
      select policyname, tablename from pg_policies
      where schemaname = 'public'
        and tablename in ('profiles', 'cart_items', 'orders', 'order_items')
    loop
      execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
    end loop;

    delete from public.profiles;

    alter table public.cart_items drop constraint if exists cart_items_user_id_fkey;
    alter table public.orders     drop constraint if exists orders_user_id_fkey;
    alter table public.profiles   drop constraint if exists profiles_id_fkey;
    alter table public.profiles   drop constraint if exists profiles_email_key;

    alter table public.profiles   alter column id      type text;
    alter table public.profiles   alter column email   set default '';
    alter table public.cart_items alter column user_id type text;
    alter table public.orders     alter column user_id type text;

    alter table public.cart_items add constraint cart_items_user_id_fkey
      foreign key (user_id) references public.profiles (id) on delete cascade;
    alter table public.orders add constraint orders_user_id_fkey
      foreign key (user_id) references public.profiles (id) on delete cascade;
  end if;
end $$;

-- Indexes
create index if not exists idx_products_category   on public.products (category);
create index if not exists idx_products_featured   on public.products (featured);
create index if not exists idx_cart_items_user     on public.cart_items (user_id);
create index if not exists idx_orders_user         on public.orders (user_id);
create index if not exists idx_orders_created      on public.orders (created_at desc);
create index if not exists idx_order_items_order   on public.order_items (order_id);
create index if not exists idx_order_events_order  on public.order_events (order_id, created_at);
create index if not exists idx_orders_number_lower on public.orders (lower(order_number));

-- ============================================================================
-- 2. Helper functions — identity comes from the Clerk session token
-- ============================================================================

-- Clerk user id of the caller (null when signed out)
create or replace function public.current_user_id()
returns text
language sql stable
as $$
  select nullif(auth.jwt() ->> 'sub', '');
$$;

-- Admins carry {"role":"admin"} in their Clerk public metadata, surfaced as the
-- signed `app_role` session claim — users cannot set it themselves.
create or replace function public.is_admin()
returns boolean
language sql stable
as $$
  select coalesce(auth.jwt() ->> 'app_role', '') = 'admin';
$$;

-- ============================================================================
-- 3. Profile sync — called by the API on each authenticated request.
--    Creates the caller's profile on first sight and keeps email/name/role in
--    step with Clerk. Only writes when something changed.
-- ============================================================================

-- Supabase Auth signup trigger from earlier versions of this script
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.sync_profile()
returns public.profiles
language plpgsql security definer
set search_path = public
as $$
declare
  v_id    text := public.current_user_id();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_name  text;
  v_role  text := case when public.is_admin() then 'ADMIN' else 'CUSTOMER' end;
  v_row   public.profiles;
begin
  if v_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  v_name := coalesce(nullif(trim(auth.jwt() ->> 'name'), ''), split_part(v_email, '@', 1));

  insert into public.profiles as p (id, email, name, role)
  values (v_id, v_email, v_name, v_role)
  on conflict (id) do update
    set email = excluded.email, name = excluded.name, role = excluded.role
    where (p.email, p.name, p.role) is distinct from (excluded.email, excluded.name, excluded.role);

  select * into v_row from public.profiles where id = v_id;
  return v_row;
end;
$$;

-- ============================================================================
-- 4. Enable RLS + policies
-- ============================================================================

alter table public.profiles     enable row level security;
alter table public.products     enable row level security;
alter table public.cart_items   enable row level security;
alter table public.orders       enable row level security;
alter table public.order_items  enable row level security;
alter table public.site_content enable row level security;
alter table public.order_events enable row level security;

-- profiles: users read their own, admins read everyone (no client writes —
-- rows are written only by public.sync_profile())
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (id = public.current_user_id() or public.is_admin());

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
  for select using (user_id = public.current_user_id());

drop policy if exists "cart_insert" on public.cart_items;
create policy "cart_insert" on public.cart_items
  for insert with check (user_id = public.current_user_id());

drop policy if exists "cart_update" on public.cart_items;
create policy "cart_update" on public.cart_items
  for update using (user_id = public.current_user_id()) with check (user_id = public.current_user_id());

drop policy if exists "cart_delete" on public.cart_items;
create policy "cart_delete" on public.cart_items
  for delete using (user_id = public.current_user_id());

-- orders: owner reads/creates, admin reads/updates everything
drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders
  for select using (user_id = public.current_user_id() or public.is_admin());

drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders
  for insert with check (user_id = public.current_user_id());

drop policy if exists "orders_update" on public.orders;
create policy "orders_update" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

-- order_items: readable through the parent order
drop policy if exists "order_items_select" on public.order_items;
create policy "order_items_select" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = public.current_user_id() or public.is_admin())
    )
  );

drop policy if exists "order_items_insert" on public.order_items;
create policy "order_items_insert" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = public.current_user_id()
    )
  );

-- order_events: readable with the parent order; admins add entries (status
-- changes / notes). Visitors read them through track_order() instead.
drop policy if exists "order_events_select" on public.order_events;
create policy "order_events_select" on public.order_events
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = public.current_user_id() or public.is_admin())
    )
  );

drop policy if exists "order_events_insert" on public.order_events;
create policy "order_events_insert" on public.order_events
  for insert with check (public.is_admin());

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

-- Storage: the public `fankari` bucket holds every site image. Anyone can read
-- (public URLs); only admins can upload, replace or delete — this is what
-- lets Admin → Products / Content upload images with the admin's own session.
insert into storage.buckets (id, name, public)
values ('fankari', 'fankari', true)
on conflict (id) do nothing;

drop policy if exists "fankari_admin_select" on storage.objects;
create policy "fankari_admin_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'fankari' and public.is_admin());

drop policy if exists "fankari_admin_insert" on storage.objects;
create policy "fankari_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fankari' and public.is_admin());

drop policy if exists "fankari_admin_update" on storage.objects;
create policy "fankari_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'fankari' and public.is_admin())
  with check (bucket_id = 'fankari' and public.is_admin());

drop policy if exists "fankari_admin_delete" on storage.objects;
create policy "fankari_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fankari' and public.is_admin());

-- ============================================================================
-- 5. Atomic order placement (transactional: validate stock → order →
--    snapshot items → decrement stock → clear cart)
--    Errors raised as tokens understood by the API:
--      AUTH_REQUIRED / PAYMENT_METHOD / EMPTY_CART / STOCK:<product name>:<stock left>
-- ============================================================================

-- Shipping charge for an items total (after discount, incl. VAT), from the
-- admin-editable site_content rows — mirrors shippingFor() in
-- src/lib/pricing.ts, with the same defaults when a row is missing:
--   shippingFee            flat charge per order          (6.99)
--   freeShippingEnabled    'true' waives it at threshold  ('true')
--   freeShippingThreshold  items total that ships free    (75)
create or replace function public.shipping_for(p_items_total numeric)
returns numeric
language sql stable
set search_path = public
as $$
  select case
    when coalesce((select trim(value) from public.site_content where key = 'freeShippingEnabled'), 'true') = 'true'
     and p_items_total >= coalesce((select trim(value)::numeric from public.site_content where key = 'freeShippingThreshold'), 75)
    then 0
    else round(coalesce((select trim(value)::numeric from public.site_content where key = 'shippingFee'), 6.99), 2)
  end;
$$;

-- Earlier versions had no payment-method parameter; drop that signature so
-- the RPC stays unambiguous (create or replace would add an overload).
drop function if exists public.place_order(text, text, text, text, text, text, text);

create or replace function public.place_order(
  p_customer_name  text,
  p_email          text,
  p_phone          text default '',
  p_address        text default '',
  p_city           text default '',
  p_postal_code    text default '',
  p_notes          text default '',
  p_payment_method text default null
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_user         text := public.current_user_id();
  v_line         record;
  v_order_id     uuid;
  v_order_number text;
  v_subtotal     numeric(10, 2) := 0;  -- Σ price × qty (before discount and VAT)
  v_discount     numeric(10, 2) := 0;
  v_vat          numeric(10, 2) := 0;
  v_line_base    numeric(10, 2);
  v_line_disc    numeric(10, 2);
  v_shipping     numeric(10, 2);
  v_total        numeric(10, 2);
  v_count        integer := 0;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Payment methods offered at checkout — keep in step with PAYMENT_METHODS
  -- in src/lib/pricing.ts and orders_payment_method_check.
  if p_payment_method is null or not (p_payment_method = any (array['COD'])) then
    raise exception 'PAYMENT_METHOD';
  end if;

  -- Lock product rows and validate every cart line
  for v_line in
    select ci.product_id, ci.quantity,
           p.name as p_name, p.price as p_price, p.image as p_image,
           p.stock as p_stock, p.active as p_active,
           p.discount_percent as p_discount, p.vat_rate as p_vat
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.user_id = v_user
    order by ci.created_at asc
    for update of p
  loop
    if not v_line.p_active or v_line.p_stock < v_line.quantity then
      raise exception 'STOCK:%:%', v_line.p_name, v_line.p_stock;
    end if;
    -- Per line, rounded to paise (mirrors src/lib/pricing.ts)
    v_line_base := round(v_line.p_price * v_line.quantity, 2);
    v_line_disc := round(v_line_base * v_line.p_discount / 100, 2);
    v_subtotal  := v_subtotal + v_line_base;
    v_discount  := v_discount + v_line_disc;
    v_vat       := v_vat + round((v_line_base - v_line_disc) * v_line.p_vat / 100, 2);
    v_count     := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'EMPTY_CART';
  end if;

  -- Shipping settings from Admin → Content (see shipping_for)
  v_shipping := public.shipping_for(v_subtotal - v_discount + v_vat);
  v_total := v_subtotal - v_discount + v_vat + v_shipping;

  -- Unique order number with retry on collision
  loop
    v_order_number := 'FM-' || (
      select array_to_string(array(
        select substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', floor(random() * 31)::int + 1, 1)
        from generate_series(1, 6)
      ), '')
    );
    begin
      insert into public.orders (
        user_id, order_number, status, subtotal, discount, vat, shipping, total,
        payment_method, customer_name, email, phone, address, city, postal_code, notes
      ) values (
        v_user, v_order_number, 'CONFIRMED', v_subtotal, v_discount, v_vat, v_shipping, v_total,
        p_payment_method, p_customer_name, p_email, p_phone, p_address, p_city, p_postal_code, p_notes
      ) returning id into v_order_id;
      exit;
    exception when unique_violation then
      continue;
    end;
  end loop;

  -- Snapshot line items
  insert into public.order_items
    (order_id, product_id, name, price, quantity, image, discount_percent, vat_rate)
  select v_order_id, ci.product_id, p.name,
         round(p.price * (1 - p.discount_percent / 100) * (1 + p.vat_rate / 100), 2),
         ci.quantity, p.image, p.discount_percent, p.vat_rate
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.user_id = v_user;

  -- Start the order timeline
  insert into public.order_events (order_id, status) values (v_order_id, 'CONFIRMED');

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
      'subtotal', o.subtotal, 'discount', o.discount, 'vat', o.vat,
      'shipping', o.shipping, 'total', o.total, 'paymentMethod', o.payment_method,
      'customerName', o.customer_name, 'email', o.email, 'phone', o.phone,
      'address', o.address, 'city', o.city, 'postalCode', o.postal_code,
      'notes', o.notes, 'createdAt', o.created_at,
      'items', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', oi.id, 'productId', oi.product_id, 'name', oi.name,
          'price', oi.price, 'quantity', oi.quantity, 'image', oi.image,
          'discountPercent', oi.discount_percent, 'vatRate', oi.vat_rate
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

-- Earlier signature had no note; drop it so the RPC stays unambiguous
drop function if exists public.admin_cancel_order(uuid);

create or replace function public.admin_cancel_order(p_order_id uuid, p_note text default '')
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
  insert into public.order_events (order_id, status, note)
  values (p_order_id, 'CANCELLED', coalesce(p_note, ''));

  update public.products p
  set stock = p.stock + oi.quantity
  from public.order_items oi
  where oi.product_id = p.id and oi.order_id = p_order_id;

  return (
    select jsonb_build_object(
      'id', o.id, 'orderNumber', o.order_number, 'status', o.status,
      'subtotal', o.subtotal, 'discount', o.discount, 'vat', o.vat,
      'shipping', o.shipping, 'total', o.total, 'paymentMethod', o.payment_method,
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
          'price', oi.price, 'quantity', oi.quantity, 'image', oi.image,
          'discountPercent', oi.discount_percent, 'vatRate', oi.vat_rate
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

-- ============================================================================
-- 6b. Public order tracking — anyone with the order number AND the email used
--     at checkout can see delivery progress. Returns only what a tracking
--     page needs (no street address or phone); null when nothing matches.
-- ============================================================================

create or replace function public.track_order(p_order_number text, p_email text)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'orderNumber', o.order_number,
    'status', o.status,
    'createdAt', o.created_at,
    'total', o.total,
    'paymentMethod', o.payment_method,
    'city', o.city,
    'courierName', o.courier_name,
    'trackingNumber', o.tracking_number,
    'trackingUrl', o.tracking_url,
    'estimatedDelivery', o.estimated_delivery,
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', oi.name, 'quantity', oi.quantity, 'image', oi.image
      ) order by oi.id), '[]'::jsonb)
      from public.order_items oi where oi.order_id = o.id
    ),
    'events', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'status', e.status, 'note', e.note, 'createdAt', e.created_at
      ) order by e.created_at), '[]'::jsonb)
      from public.order_events e where e.order_id = o.id
    )
  )
  from public.orders o
  where lower(o.order_number) = lower(trim(p_order_number))
    and lower(o.email) = lower(trim(p_email))
  limit 1;
$$;

revoke execute on function public.track_order from public;
grant  execute on function public.track_order to anon, authenticated;

-- Only signed-in users may call the RPCs (defense in depth — the functions
-- also verify current_user_id() / is_admin() internally)
revoke execute on function public.place_order from anon, public;
grant  execute on function public.place_order to authenticated;

revoke execute on function public.admin_cancel_order from anon, public;
grant  execute on function public.admin_cancel_order to authenticated;

revoke execute on function public.sync_profile from anon, public;
grant  execute on function public.sync_profile to authenticated;

-- ============================================================================
-- 7. Seed site content (idempotent — re-runs never overwrite admin edits)
-- ============================================================================

insert into public.site_content (key, value) values
  ('brandName',     'Fankari Maison'),
  ('announcement',  'Free shipping on all orders over ₹75 · Handcrafted in small batches'),
  ('heroTitle',     'Carried by Hand, Made with Heart'),
  ('heroSubtitle',  'Small-batch tote bags handcrafted from natural canvas, jute and full-grain leather. Built for everyday adventures, designed to last a lifetime.'),
  ('heroImage',     'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/hero.jpg'),
  ('aboutTitle',    'Crafted Slowly, Made to Last'),
  ('aboutText',     'Every Fankari Maison bag begins as raw natural fibre — sturdy cotton canvas, rustic jute, buttery full-grain leather — and passes through the hands of skilled artisans who cut, stitch and finish each piece in small batches. We believe the things you carry every day should be beautiful, honest and built to age gracefully. No mass production, no shortcuts: just time-honoured craft and materials that get better with every year you carry them.'),
  ('shippingFee',           '6.99'),
  ('freeShippingEnabled',   'true'),
  ('freeShippingThreshold', '75')
on conflict (key) do nothing;

-- ============================================================================
-- 8. Seed products (idempotent on slug)
-- ============================================================================

insert into public.products (name, slug, description, price, stock, category, image, materials, dimensions, featured) values
  ('Classic Canvas Everyday Tote', 'classic-canvas-everyday-tote',
   'Our signature everyday tote, handcrafted from 14oz natural cotton canvas with reinforced double-stitched handles. Roomy enough for groceries, laptops, or a weekend escape — this is the bag you will reach for every single day.',
   42, 24, 'Canvas', 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p1.jpg', '14oz natural cotton canvas, cotton webbing handles', '38 × 35 × 12 cm', true),
  ('Market Day Waxed Canvas Tote', 'market-day-waxed-canvas-tote',
   'Built for the weekly market run and years beyond it. Heavy waxed canvas weathers beautifully, while vegetable-tanned leather straps and solid brass hardware add rugged refinement. Water-resistant and gets better with age.',
   58, 16, 'Canvas', 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p2.jpg', 'Waxed cotton canvas, vegetable-tanned leather, brass hardware', '40 × 38 × 14 cm', true),
  ('Boho Straw Beach Tote', 'boho-straw-beach-tote',
   'Hand-woven by artisans from sustainably harvested straw, finished with playful pom-pom tassels. Spacious enough for towels, sunscreen and a good book — your perfect sunshine companion.',
   49, 20, 'Straw & Jute', 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p3.jpg', 'Natural woven straw, cotton tassels, cotton lining', '45 × 35 × 15 cm', true),
  ('Jute Market Bag', 'jute-market-bag',
   'A plastic-free staple for farmers market mornings. Sturdy woven jute with smooth wooden handles and an interior pocket for your phone and keys. Strong enough to carry a week of produce.',
   36, 30, 'Straw & Jute', 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p4.jpg', 'Woven jute, wooden handles, cotton lining', '42 × 36 × 14 cm', false),
  ('Heritage Leather-Trim Tote', 'heritage-leather-trim-tote',
   'Where canvas meets craftsmanship: durable cotton canvas body trimmed in full-grain cognac leather. Fits a 15" laptop with room to spare. Hand-burnished edges and saddle-stitched stress points make this a decade-long companion.',
   89, 12, 'Leather Trim', 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p5.jpg', 'Cotton canvas, full-grain leather trim, brass rivets', '40 × 30 × 13 cm', true),
  ('Saddle Leather Shopper', 'saddle-leather-shopper',
   'Our most luxurious carry. Cut from a single hide of espresso full-grain leather and finished with a hand-set brass buckle. Designed to be carried daily and patina into a one-of-a-kind heirloom.',
   120, 8, 'Leather Trim', 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p6.jpg', 'Full-grain leather, solid brass hardware, suede lining', '42 × 32 × 14 cm', true),
  ('Minimalist Linen Carryall', 'minimalist-linen-carryall',
   'Quietly elegant and featherlight. Made from washed European linen with clean French seams — perfect for errands, work, or a day out. Softens with every wash and folds flat when not in use.',
   45, 22, 'Linen', 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p7.jpg', '100% washed European linen', '38 × 34 × 10 cm', false),
  ('Embroidered Meadow Tote', 'embroidered-meadow-tote',
   'Each meadow tote is hand-embroidered with wildflowers in terracotta and sage thread — no two are exactly alike. A wearable piece of slow craft that carries your essentials and a story.',
   64, 10, 'Special Edition', 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p8.jpg', 'Heavy cotton canvas, cotton embroidery thread', '38 × 36 × 12 cm', true),
  ('Quilted Patchwork Tote', 'quilted-patchwork-tote',
   'Sewn from repurposed fabric squares in warm earth tones, each patchwork tote is one of a kind. Fully quilted and lined for structure, with a nod to generations of thrifty, beautiful handcraft.',
   72, 9, 'Special Edition', 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p9.jpg', 'Upcycled cotton fabrics, cotton batting, canvas lining', '39 × 34 × 13 cm', false),
  ('Macramé Fringe Festival Bag', 'macrame-fringe-festival-bag',
   'Hand-knotted cotton cord in a boho fringe silhouette that sways as you walk. Made for festival days, beach strolls, and everything golden-hour. Fully lined so nothing slips through.',
   54, 14, 'Special Edition', 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari/images/p10.jpg', 'Braided cotton cord, cotton lining', '36 × 38 × 11 cm', false)
on conflict (slug) do nothing;

-- ============================================================================
-- Images live in the public Supabase Storage bucket `fankari` (images/…).
-- Repoint rows seeded by earlier versions of this script at local /images/…
-- paths. Idempotent: only rewrites values that still start with /images/.
-- ============================================================================

update public.products
set image = 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari' || image
where image like '/images/%';

update public.site_content
set value = 'https://dnksdwswznijifzhnlvy.supabase.co/storage/v1/object/public/fankari' || value
where key = 'heroImage' and value like '/images/%';

-- Prices are shown in Indian Rupees; update the seeded announcement if it
-- still quotes the old dollar threshold.
update public.site_content
set value = replace(value, '$75', '₹75')
where key = 'announcement' and value like '%$75%';

-- ============================================================================
-- Done. Supabase auto-reloads the PostgREST schema cache after DDL runs in
-- the SQL Editor.
-- ============================================================================
