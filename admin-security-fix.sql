-- ============================================================================
-- LABEL BY ZARE — ADMIN ACCESS LOCKDOWN
-- Run this in Supabase Dashboard → SQL Editor, AFTER customer-accounts-setup.sql.
-- Fixes a gap where any logged-in customer account could reach admin.html
-- and, depending on table rules, view/edit orders or products.
-- ============================================================================

-- 1. ADMINS ALLOWLIST — only emails listed here are treated as staff.
create table if not exists public.admins (
  email text primary key
);

alter table public.admins enable row level security;

-- A logged-in user may only ever check whether THEIR OWN email is on the
-- list (never browse the whole list) — enough for admin.html's access check.
drop policy if exists "admins: can check self" on public.admins;
create policy "admins: can check self" on public.admins
  for select using (auth.jwt() ->> 'email' = email);

-- >>> ADD YOURSELF: replace with the email you use to log into admin.html <<<
insert into public.admins (email) values ('YOUR-ADMIN-EMAIL@example.com')
on conflict (email) do nothing;


-- 2. ORDERS — customers may see only their own orders; only admins may see
--    every order, and only admins may update status or delete.
drop policy if exists "orders: owner can view own" on public.orders;
drop policy if exists "orders: anyone can insert" on public.orders;
drop policy if exists "orders: admin can view all" on public.orders;
drop policy if exists "orders: admin can update" on public.orders;
drop policy if exists "orders: admin can delete" on public.orders;

create policy "orders: owner can view own" on public.orders
  for select using (auth.uid() = user_id);

create policy "orders: admin can view all" on public.orders
  for select using (exists (select 1 from public.admins a where a.email = auth.jwt() ->> 'email'));

create policy "orders: anyone can insert" on public.orders
  for insert with check (true);

create policy "orders: admin can update" on public.orders
  for update using (exists (select 1 from public.admins a where a.email = auth.jwt() ->> 'email'));

create policy "orders: admin can delete" on public.orders
  for delete using (exists (select 1 from public.admins a where a.email = auth.jwt() ->> 'email'));


-- 3. PRODUCTS — everyone (including guests) can browse; only admins can
--    add, edit, or remove products. Adjust the "public read" policy if you
--    ever want unpublished/draft products hidden from shoppers.
alter table public.products enable row level security;

drop policy if exists "products: public read" on public.products;
create policy "products: public read" on public.products
  for select using (true);

drop policy if exists "products: admin write" on public.products;
create policy "products: admin write" on public.products
  for insert with check (exists (select 1 from public.admins a where a.email = auth.jwt() ->> 'email'));

drop policy if exists "products: admin update" on public.products;
create policy "products: admin update" on public.products
  for update using (exists (select 1 from public.admins a where a.email = auth.jwt() ->> 'email'));

drop policy if exists "products: admin delete" on public.products;
create policy "products: admin delete" on public.products
  for delete using (exists (select 1 from public.admins a where a.email = auth.jwt() ->> 'email'));

-- ============================================================================
-- After running this: edit the email above (or run one more insert statement
-- for each staff member) before relying on this. Anyone not listed in
-- public.admins is now blocked, at the database level, from touching orders
-- or products — even if they somehow load admin.html.
-- ============================================================================
