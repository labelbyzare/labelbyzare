-- ============================================================================
-- LABEL BY ZARE — CUSTOMER ACCOUNTS SETUP
-- Run this once in Supabase Dashboard → SQL Editor → New Query → Run.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.
-- ============================================================================

-- 1. PROFILES — one row per customer, linked to Supabase Auth's built-in
--    auth.users table. Stores the extra info auth.users doesn't hold.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: user can view own" on public.profiles;
create policy "profiles: user can view own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles: user can insert own" on public.profiles;
create policy "profiles: user can insert own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles: user can update own" on public.profiles;
create policy "profiles: user can update own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles: user can delete own" on public.profiles;
create policy "profiles: user can delete own" on public.profiles
  for delete using (auth.uid() = id);


-- 2. ADDRESSES — a customer's saved delivery addresses.
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  full_name text not null,
  phone text not null,
  country text not null,
  city text not null,
  area text not null,
  postal_code text,
  address text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.addresses enable row level security;

drop policy if exists "addresses: owner full access" on public.addresses;
create policy "addresses: owner full access" on public.addresses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- 3. WISHLIST ITEMS — synced wishlist, one row per saved product.
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.wishlist_items enable row level security;

drop policy if exists "wishlist: owner full access" on public.wishlist_items;
create policy "wishlist: owner full access" on public.wishlist_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- 4. CART ITEMS — synced shopping bag, one row per line item.
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  size text,
  color text,
  qty integer not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, product_id, size, color)
);

alter table public.cart_items enable row level security;

drop policy if exists "cart: owner full access" on public.cart_items;
create policy "cart: owner full access" on public.cart_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- 5. ORDERS — link existing orders table to the logged-in customer so
--    "My Orders" can list their order history. Safe no-op if already added.
alter table public.orders add column if not exists user_id uuid references auth.users(id);

alter table public.orders enable row level security;

drop policy if exists "orders: owner can view own" on public.orders;
create policy "orders: owner can view own" on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists "orders: anyone can insert" on public.orders;
create policy "orders: anyone can insert" on public.orders
  for insert with check (true);


-- 6. AVATAR STORAGE — a public bucket for profile pictures.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars: public read" on storage.objects;
create policy "avatars: public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars: owner can upload" on storage.objects;
create policy "avatars: owner can upload" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "avatars: owner can update" on storage.objects;
create policy "avatars: owner can update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "avatars: owner can delete" on storage.objects;
create policy "avatars: owner can delete" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);


-- ============================================================================
-- ONE MORE STEP — NOT SQL, DONE IN THE DASHBOARD:
-- To make the sign-up email show a 6-digit code (instead of a "confirm"
-- link), go to Authentication → Emails → Confirm signup, and make sure the
-- template includes {{ .Token }} (the code) somewhere in the message, e.g.
-- add a line like:  Your verification code is: {{ .Token }}
-- Supabase already includes this in the default template — just don't
-- delete it if you customize the design.
-- ============================================================================
