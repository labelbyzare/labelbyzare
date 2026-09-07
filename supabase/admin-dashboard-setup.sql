-- LABEL BY ZARE — Admin dashboard additions
-- Run once in Supabase > SQL Editor.
-- This is additive: it does not remove your current products/orders/customer data.

create extension if not exists pgcrypto;

-- The original site already uses this email allow-list. Creating it here as
-- well makes this setup file safe on a fresh project.
create table if not exists public.admins (email text primary key);

create or replace function public.is_lz_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email',''))
  );
$$;

revoke all on function public.is_lz_admin() from public;
grant execute on function public.is_lz_admin() to authenticated;

create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  min_order numeric(12,2) not null default 0 check (min_order >= 0),
  usage_limit integer null check (usage_limit is null or usage_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  starts_at timestamptz null,
  expires_at timestamptz null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts(id) on delete cascade,
  order_number text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.site_settings(key,value)
values ('main', jsonb_build_object(
  'hero_eyebrow','The Label by Zare Edit',
  'hero_line1','MODEST WEAR,',
  'hero_line2','Label by Zare.',
  'hero_tagline','Thoughtfully designed abayas and shawls for everyday moments and the occasions you’ll remember.',
  'hero_primary_text','Shop the collection',
  'hero_secondary_text','Discover the edit',
  'hero_image_url','',
  'whatsapp_number','923288691979',
  'instagram_url','https://www.instagram.com/thelabelbyzare/',
  'standard_fee',350,
  'express_fee',900,
  'free_shipping_above',15000
)) on conflict (key) do nothing;

alter table public.orders add column if not exists discount_code text;
alter table public.orders add column if not exists discount_amount numeric(12,2) not null default 0;

alter table public.discounts enable row level security;
alter table public.discount_redemptions enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "lz admin discounts read" on public.discounts;
create policy "lz admin discounts read" on public.discounts for select to authenticated using (public.is_lz_admin());
drop policy if exists "lz admin discounts insert" on public.discounts;
create policy "lz admin discounts insert" on public.discounts for insert to authenticated with check (public.is_lz_admin());
drop policy if exists "lz admin discounts update" on public.discounts;
create policy "lz admin discounts update" on public.discounts for update to authenticated using (public.is_lz_admin()) with check (public.is_lz_admin());
drop policy if exists "lz admin discounts delete" on public.discounts;
create policy "lz admin discounts delete" on public.discounts for delete to authenticated using (public.is_lz_admin());

drop policy if exists "public site settings read" on public.site_settings;
create policy "public site settings read" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "lz admin site settings insert" on public.site_settings;
create policy "lz admin site settings insert" on public.site_settings for insert to authenticated with check (public.is_lz_admin());
drop policy if exists "lz admin site settings update" on public.site_settings;
create policy "lz admin site settings update" on public.site_settings for update to authenticated using (public.is_lz_admin()) with check (public.is_lz_admin());
drop policy if exists "lz admin site settings delete" on public.site_settings;
create policy "lz admin site settings delete" on public.site_settings for delete to authenticated using (public.is_lz_admin());

drop policy if exists "lz admin redemptions read" on public.discount_redemptions;
create policy "lz admin redemptions read" on public.discount_redemptions for select to authenticated using (public.is_lz_admin());

-- Let admins view the customer address book. Existing customer policies remain untouched.
do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'drop policy if exists "lz admin profiles read" on public.profiles';
    execute 'create policy "lz admin profiles read" on public.profiles for select to authenticated using (public.is_lz_admin())';
  end if;
  if to_regclass('public.addresses') is not null then
    execute 'drop policy if exists "lz admin addresses read" on public.addresses';
    execute 'create policy "lz admin addresses read" on public.addresses for select to authenticated using (public.is_lz_admin())';
  end if;
end $$;

create or replace function public.validate_discount(p_code text, p_subtotal numeric)
returns table(code text, discount_type text, discount_value numeric, min_order numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.discounts%rowtype;
begin
  select * into d from public.discounts
  where upper(discounts.code)=upper(trim(p_code))
    and active=true
    and (starts_at is null or starts_at <= now())
    and (expires_at is null or expires_at > now())
    and (usage_limit is null or used_count < usage_limit)
  limit 1;

  if d.id is null or coalesce(p_subtotal,0) < d.min_order then
    return;
  end if;

  return query select d.code,d.discount_type,d.discount_value,d.min_order;
end;
$$;

revoke all on function public.validate_discount(text,numeric) from public;
grant execute on function public.validate_discount(text,numeric) to anon, authenticated;

create or replace function public.consume_discount(p_code text, p_order_number text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.discounts%rowtype;
  inserted_count integer;
begin
  if not exists (
    select 1 from public.orders o
    where o.order_number = p_order_number
      and upper(coalesce(o.discount_code,'')) = upper(trim(p_code))
      and coalesce(o.discount_amount,0) > 0
  ) then
    return false;
  end if;

  select * into d from public.discounts
  where upper(discounts.code)=upper(trim(p_code))
  limit 1;
  if d.id is null then return false; end if;

  insert into public.discount_redemptions(discount_id,order_number)
  values(d.id,p_order_number)
  on conflict(order_number) do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count = 1 then
    update public.discounts set used_count=used_count+1,updated_at=now() where id=d.id;
    return true;
  end if;
  return false;
end;
$$;

revoke all on function public.consume_discount(text,text) from public;
grant execute on function public.consume_discount(text,text) to anon, authenticated;

-- ============================================================
-- v15 CRM + Website CMS additions
-- Safe to run after v14; all statements are additive/idempotent.
-- ============================================================

-- Merge new CMS defaults into the current settings row without overwriting
-- any values already saved in the admin dashboard.
update public.site_settings
set value = jsonb_build_object(
  'house_label','01 — The House',
  'house_heading','Created with a purpose, Rooted in modesty.',
  'house_text1','Label by Zare began with a simple belief: modesty and elegance can beautifully coexist. What started as a passion for creating graceful, modest pieces grew into a dream of building something of our own — a space where women can find abayas that feel beautiful, comfortable and true to their values.',
  'house_text2','Every piece at Label by Zare is chosen and created with intention. From the fabric and silhouette to the smallest details, we believe that modest clothing doesn''t have to mean compromising on style.',
  'house_text3','Our journey is still growing, one piece and one customer at a time. And we''re grateful to every woman who chooses to be a part of it.',
  'house_signoff', E'Thank you for being here. 🤍\n— Label by Zare',
  'house_cta','Our Story',
  'house_image_url','',
  'occasion_eyebrow','Occasion Wear',
  'occasion_heading','Evenings deserve quiet drama.',
  'occasion_text','Draped silhouettes, hand-finished trims, and fabrics that catch the light without shouting.',
  'occasion_cta','Shop Emerald Green',
  'occasion_url','/product/emerald-green-abaya/aby-002',
  'occasion_image_url','',
  'value1_title','Thoughtful Fabrics','value1_text','Chosen for their feel, flow and elegance.',
  'value2_title','Timeless Designs','value2_text','Created to complement modesty without compromising on style.',
  'value3_title','Carefully Finished','value3_text','Every order is prepared with attention and care before making its way to you.',
  'newsletter_eyebrow','Join Us','newsletter_heading','Be first to know.','newsletter_text','New collections, private previews, and quiet updates from the atelier.',
  'about_eyebrow','Our Story','about_title','The House of Zare','about_hero_image_url','',
  'about_ch1_title','Created with a purpose, rooted in modesty.',
  'about_ch1_text1','Label by Zare began with a simple belief: modesty and elegance can beautifully coexist. What started as a passion for creating graceful, modest pieces grew into a dream of building something of our own — a space where women can find abayas that feel beautiful, comfortable and true to their values.',
  'about_ch1_text2',E'Every piece at Label by Zare is chosen and created with intention. From the fabric and silhouette to the smallest details, we believe that modest clothing doesn’t have to mean compromising on style.\n\nOur journey is still growing, one piece and one customer at a time. And we’re grateful to every woman who chooses to be a part of it.\n\nThank you for being here. 🤍\n— Label by Zare',
  'about_story_image_url','',
  'about_ch2_title','How we build a piece',
  'about_ch2_text1','Every silhouette goes through several rounds of fitting on real bodies, not just a stand form. We check how a piece moves when you sit, reach, and walk — not just how it hangs still.',
  'about_ch2_text2','Construction details — hidden closures, reinforced seams, a tailored shoulder — are chosen for how they hold up over months of wear, not just how they look on day one.',
  'about_craft_image_url','',
  'about_values_eyebrow','What We Stand For','about_values_heading','Modesty in every detail.','about_cta_heading','Come find the piece that''s yours.','about_cta_text','Shop the Collection',
  'standard_days','3–5 business days nationwide','express_days','1–2 business days in major cities','processing_days','1–2 business days',
  'return_policy','Unworn pieces with tags attached may be returned within 7 days of delivery for a full refund or exchange.',
  'return_process','To start a return or exchange, message us on WhatsApp with your order number.',
  'size_intro','All measurements are in inches. If you''re between sizes, we recommend sizing up for a more relaxed, comfortable drape.',
  'support_eyebrow','We''re Here to Help','support_title','Support','support_hero_image_url','',
  'support_help_heading','We''re just a message away.','support_help_text','Reach out on WhatsApp or Instagram and we''ll get back to you shortly.',
  'footer_text','Considered abayas and shawls for the modern woman — cut with intention, worn with quiet confidence.'
) || value,
updated_at = now()
where key='main';

create table if not exists public.site_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_articles (
  slug text primary key check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  collection text not null default 'abayas',
  summary text not null,
  sections jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.site_faqs(question,answer,sort_order,active)
select v.question,v.answer,v.sort_order,true
from (values
 ('How do I know which size to order?','Check our Size Guide above for bust and length measurements. If you''re between two sizes, we recommend sizing up for a more relaxed fit.',0),
 ('What payment methods do you accept?','We currently accept Cash on Delivery (COD) only — you pay when your order arrives at your door.',1),
 ('How long does delivery take?','Standard delivery takes 3–5 business days nationwide. Express delivery arrives in 1–2 business days in major cities.',2),
 ('Can I return or exchange an item?','Yes — unworn pieces with tags attached can be returned or exchanged within 7 days of delivery. Message us on WhatsApp with your order number to get started.',3),
 ('How can I check the status of my order?','Visit our Track Order page and enter your order number and email to see its current status. You''re welcome to message us on WhatsApp too.',4),
 ('Do you ship nationwide?','Yes, we deliver across Pakistan, including Karachi, Lahore, and Islamabad.',5)
) as v(question,answer,sort_order)
where not exists (select 1 from public.site_faqs);

alter table public.site_faqs enable row level security;
alter table public.journal_articles enable row level security;

drop policy if exists "public active faqs read" on public.site_faqs;
create policy "public active faqs read" on public.site_faqs for select to anon, authenticated using (active);
drop policy if exists "lz admin faqs read all" on public.site_faqs;
create policy "lz admin faqs read all" on public.site_faqs for select to authenticated using (public.is_lz_admin());
drop policy if exists "lz admin faqs insert" on public.site_faqs;
create policy "lz admin faqs insert" on public.site_faqs for insert to authenticated with check (public.is_lz_admin());
drop policy if exists "lz admin faqs update" on public.site_faqs;
create policy "lz admin faqs update" on public.site_faqs for update to authenticated using (public.is_lz_admin()) with check (public.is_lz_admin());
drop policy if exists "lz admin faqs delete" on public.site_faqs;
create policy "lz admin faqs delete" on public.site_faqs for delete to authenticated using (public.is_lz_admin());

drop policy if exists "public active journal read" on public.journal_articles;
create policy "public active journal read" on public.journal_articles for select to anon, authenticated using (active);
drop policy if exists "lz admin journal read all" on public.journal_articles;
create policy "lz admin journal read all" on public.journal_articles for select to authenticated using (public.is_lz_admin());
drop policy if exists "lz admin journal insert" on public.journal_articles;
create policy "lz admin journal insert" on public.journal_articles for insert to authenticated with check (public.is_lz_admin());
drop policy if exists "lz admin journal update" on public.journal_articles;
create policy "lz admin journal update" on public.journal_articles for update to authenticated using (public.is_lz_admin()) with check (public.is_lz_admin());
drop policy if exists "lz admin journal delete" on public.journal_articles;
create policy "lz admin journal delete" on public.journal_articles for delete to authenticated using (public.is_lz_admin());

-- Admin-only read access to synced customer activity tables. Existing customer
-- self-access policies are not changed or removed.
do $$
begin
  if to_regclass('public.cart_items') is not null then
    execute 'drop policy if exists "lz admin cart read" on public.cart_items';
    execute 'create policy "lz admin cart read" on public.cart_items for select to authenticated using (public.is_lz_admin())';
  end if;
  if to_regclass('public.wishlist_items') is not null then
    execute 'drop policy if exists "lz admin wishlist read" on public.wishlist_items';
    execute 'create policy "lz admin wishlist read" on public.wishlist_items for select to authenticated using (public.is_lz_admin())';
  end if;
  if to_regclass('public.product_reviews') is not null then
    execute 'drop policy if exists "lz admin reviews read" on public.product_reviews';
    execute 'create policy "lz admin reviews read" on public.product_reviews for select to authenticated using (public.is_lz_admin())';
  end if;
end $$;

-- This RPC exposes only useful account metadata to an authenticated Label by Zare
-- admin. It does not expose password hashes, tokens or other auth secrets.
create or replace function public.admin_customer_accounts()
returns table(id uuid,email text,auth_phone text,created_at timestamptz,last_sign_in_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_lz_admin() then
    raise exception 'not authorized';
  end if;
  return query
    select u.id,u.email::text,u.phone::text,u.created_at,u.last_sign_in_at
    from auth.users u
    order by u.created_at desc;
end;
$$;
revoke all on function public.admin_customer_accounts() from public;
grant execute on function public.admin_customer_accounts() to authenticated;
-- Seed the current built-in journal so every existing guide is editable in Admin.
insert into public.journal_articles(slug,title,collection,summary,sections,sort_order,active) values ($lz$choosing-an-abaya$lz$,$lz$How to choose an abaya online$lz$,$lz$abayas$lz$,$lz$A thoughtful checklist for comparing silhouette, measurements, fabric details and the pieces included in your order.$lz$,$lz$[{"heading":"Start with the way you will wear it","body":"<p>An abaya for a regular commute may need a different sleeve shape or length from a piece chosen for an evening gathering. Start with your own routine: how much you walk, the shoes you wear, the layers underneath and the coverage you prefer. These details make a more useful starting point than a size label or a styled photograph alone.</p><p>Browse <a href=\"/collections/everyday-abayas/\">everyday abayas</a> for your regular wardrobe, or the <a href=\"/collections/occasion-abayas/\">occasion edit</a> for a celebration. The collection name is a browsing aid; the individual product details should guide your final choice.</p>"},{"heading":"Compare measurements, not just size names","body":"<p>Measure a garment you already enjoy wearing on a flat surface. Compare its length, chest width and sleeve length with the measurements provided for the new piece, using the same measurement method. A relaxed cut can still feel restrictive at the upper arm or neckline.</p><p>Check the <a href=\"/support#size-guide\">size guide</a> and ask for any missing garment measurements before ordering. Height alone cannot determine fit because body proportions, preferred coverage and footwear differ.</p>"},{"heading":"Read the fabric and included-item details","body":"<p>Look for the stated material, lining, closure and care information. Names such as Nida, Korean Silk or Shamooz may be used as trade descriptions; do not assume a particular fibre percentage from the name. If composition matters to you, ask for the verified label or supplier specification.</p><p>Check whether a belt, inner dress or shawl is included. Accessories in styling photographs should only be considered part of the order when the description explicitly says so.</p>"},{"heading":"Look beyond one photograph","body":"<p>Use the full gallery to inspect the front, back, sleeves and any detail photographs. Screen settings and lighting can change the appearance of a colour. If the exact shade is essential for an event, ask about the colour before placing your order rather than relying on a single image.</p><p>Finally, compare the price, available size and stock status, then read <a href=\"/support#shipping-returns\">delivery and returns</a>. For a date-specific purchase, confirm that the delivery option serves your address and allows enough time.</p>"},{"heading":"A common question","body":"<h3><span lang=\"ur-Latn\">Abaya ka size kaise choose karein?</span></h3><p>Compare the product measurements with an abaya that fits you comfortably. Check the measurement method and ask us about any missing details before selecting a size. Our <a href=\"/journal/abaya-sizing-guide/\">measuring guide</a> walks through the checks.</p>"}]$lz$::jsonb,0,true) on conflict (slug) do nothing;
insert into public.journal_articles(slug,title,collection,summary,sections,sort_order,active) values ($lz$everyday-abaya-guide$lz$,$lz$An everyday abaya, chosen around your routine$lz$,$lz$everyday-abayas$lz$,$lz$Consider movement, layering and care before building your everyday wardrobe.$lz$,$lz$[{"heading":"Begin with your day","body":"<p>Think about where the garment will spend most of its time: at work, on campus, travelling or at home. Consider whether you carry a shoulder bag, use public transport or spend long periods seated. Check how the cut accommodates your usual layers and the movements you make throughout the day.</p><p>The <a href=\"/collections/everyday-abayas/\">everyday collection</a> brings the current edit together. Use the product gallery and individual description to compare the actual details of each piece.</p>"},{"heading":"Check sleeves, closures and length","body":"<p>Sleeve shape can affect practical comfort. A wider sleeve and a fitted cuff feel different when writing, handling a bag or adding a jacket. Check the available photographs and ask for a sleeve measurement if the detail is important to you.</p><p>Choose length with your usual footwear in mind. Compare with a well-fitting garment rather than estimating from a model photograph. If a style opens at the front, check the closure and whether you will need a separate inner layer.</p>"},{"heading":"Choose fabric using actual information","body":"<p>Warm-weather comfort depends on more than a fabric name. Weight, weave, lining, fit and the layers underneath all matter. Read the material and care information attached to the specific product; request clarification where it is missing.</p><p>Do not assume that every piece described as Nida has the same weight, or that a trade name containing “silk” confirms pure silk. Our <a href=\"/journal/abaya-fabric-guide/\">fabric buying guide</a> explains which questions to ask.</p>"},{"heading":"Build a small, useful combination","body":"<p>Start with a colour you already wear regularly, then consider how it works with your shoes, bag and existing shawls. Repeating a familiar palette can make daily dressing simpler. Check whether an accompanying shawl is included before adding a separate piece.</p><p>Care requirements should fit your routine too. Follow the garment label, and ask for guidance before using heat or washing a piece with delicate trims. Compare the current <a href=\"/support#shipping-returns\">delivery and return terms</a> before checkout.</p>"},{"heading":"A common question","body":"<h3><span lang=\"ur-Latn\">Rozana pehnne ke liye abaya kaise chunain?</span></h3><p>Start with fit, movement and the layers you usually wear. Compare sleeve shape, garment length and the stated care requirements, then choose the piece that fits your own day.</p>"}]$lz$::jsonb,1,true) on conflict (slug) do nothing;
insert into public.journal_articles(slug,title,collection,summary,sections,sort_order,active) values ($lz$occasion-abaya-styling$lz$,$lz$Styling an occasion abaya with quiet confidence$lz$,$lz$occasion-abayas$lz$,$lz$Plan the silhouette, finishing touches and delivery timing for Eid, dinners and wedding gatherings.$lz$,$lz$[{"heading":"Let the occasion guide the details","body":"<p>An Eid visit, a dinner and a winter wedding gathering can each call for a different combination of layers, footwear and accessories. Begin with the setting and your preferred coverage. Then choose a silhouette that lets you move and sit comfortably through the event.</p><p>Explore the <a href=\"/collections/occasion-abayas/\">occasion abaya edit</a> and look closely at each product’s actual finish. A collection label does not establish whether a design is suitable for a particular dress code; make that choice from the details and your own preferences.</p>"},{"heading":"Choose one point of interest","body":"<p>If your chosen abaya has detailed sleeves or an embellished front, a simpler shawl and bag can leave those details visible. With a quieter silhouette, colour or texture in a finishing piece can become the focus. Compare the colours together in similar light where possible.</p><p>Check what the product price includes. A photographed belt, inner piece or shawl may be styling only. Use the description to confirm the included items before building the rest of the outfit.</p>"},{"heading":"Plan for movement and layers","body":"<p>For a seated dinner, consider how the garment sits across the lap and whether the sleeves suit the setting. For cooler evenings, compare the fit with the layer you plan to wear underneath. The word “winter” alone cannot confirm warmth; fabric weight, lining and your layers all affect the result.</p><p>Check the <a href=\"/journal/abaya-sizing-guide/\">measurement guide</a>, including garment length with your intended shoes. If you require an alteration, ask about feasibility before ordering; do not assume tailoring is included.</p>"},{"heading":"Order around a confirmed timeline","body":"<p>For Eid, Ramadan evenings or a wedding date, check the current stock and delivery details early. Religious festival dates can depend on local moon-sighting announcements. Do not use an estimated calendar date as a guaranteed dispatch or delivery deadline.</p><p>Processing time and transit time are separate. Read our <a href=\"/support#shipping-returns\">delivery information</a> and confirm service to your address if timing is tight. Keep the purchase decision grounded in the current product listing, rather than an old social post.</p>"}]$lz$::jsonb,2,true) on conflict (slug) do nothing;
insert into public.journal_articles(slug,title,collection,summary,sections,sort_order,active) values ($lz$kaftan-fit-guide$lz$,$lz$Choosing the right kaftan silhouette$lz$,$lz$kaftans$lz$,$lz$A relaxed shape still needs the right length, width and sleeve proportions.$lz$,$lz$[{"heading":"Understand the shape before selecting a size","body":"<p>Kaftan designs vary in width, sleeve construction, neckline and length. A loose appearance in a photograph does not tell you how much room a particular size provides. Begin with the measurements of the specific design in the <a href=\"/collections/kaftans/\">kaftan collection</a>.</p><p>Compare the garment with something you already wear comfortably. Ask whether a listed width is measured flat or around the body; those numbers are not interchangeable. Do not assume a one-size label will fit every body or every preferred silhouette.</p>"},{"heading":"Check where the fabric falls","body":"<p>Look at the side and back photographs as well as the front. Notice where the sleeve meets the body, whether a belt changes the silhouette and how much of the shape comes from styling. If a belt is pictured, confirm that it is included.</p><p>Consider how the neckline, arm opening and side openings work with your preferred coverage. You may choose an inner layer depending on the design, but it should not be assumed to come with the garment unless listed.</p>"},{"heading":"Match the length to the way you dress","body":"<p>Choose the length with your usual shoes or the footwear planned for the occasion. Compare from the same measurement point used by the seller, rather than estimating from the model’s height.</p><p>If you plan to sit, drive or walk frequently, assess the cut around those movements. A generous body width does not automatically provide the sleeve or upper-arm fit you need.</p>"},{"heading":"Read the material and care information","body":"<p>Fluid-looking fabric is a visual characteristic, not proof of a particular composition. Check the actual material notes. Where a listing uses a trade name such as Korean Silk or Shamooz, ask for verified composition if it will affect your choice.</p><p>Follow the care label and ask before applying heat to decorative details. The <a href=\"/journal/abaya-fabric-guide/\">fabric and care guide</a> provides a practical checklist. Before checkout, confirm size availability and review the current delivery and return terms.</p>"}]$lz$::jsonb,3,true) on conflict (slug) do nothing;
insert into public.journal_articles(slug,title,collection,summary,sections,sort_order,active) values ($lz$prayer-abaya-guide$lz$,$lz$Choosing a prayer piece for your own routine$lz$,$lz$prayer-abayas$lz$,$lz$Compare coverage, movement, included pieces and care details with your preferences in mind.$lz$,$lz$[{"heading":"Start with your preferred coverage","body":"<p>A prayer piece should be assessed by its actual design and your own coverage preferences. Check the neckline, sleeve opening and garment length in the photographs and description. The category name alone does not establish that a design meets every individual’s requirements.</p><p>Our <a href=\"/collections/prayer-abayas/\">prayer edit</a> brings the available pieces together. If an important detail is unclear, ask for a measurement or additional product information before ordering. This guide concerns clothing selection; it does not provide religious rulings.</p>"},{"heading":"Consider movement as well as standing fit","body":"<p>Compare how much room you prefer through the shoulders, arms and body. A garment that looks long while standing may sit differently when moving. Use a piece you already find comfortable as a measurement reference.</p><p>Check whether the sleeves stay where you want them and whether the neckline works with the head covering you plan to wear. Avoid making the decision from height or an S, M or L label alone.</p>"},{"heading":"Confirm exactly what is included","body":"<p>Read whether the listing contains a single garment or a set, and whether a head covering, skirt or storage pouch is actually included. Do not infer the contents from a styled image.</p><p>Consider your intended layers when comparing fabric information. Opacity can vary with lighting, stretch and what is worn underneath. Ask about lining or additional details instead of treating a fabric name as a guarantee.</p>"},{"heading":"Make care part of the choice","body":"<p>For a frequently worn piece, check the care instructions before buying. Follow the garment label and seek clarification if there is no published guidance. An easy-looking fabric should not automatically be treated as machine washable.</p><p>If ordering before Ramadan or as a gift, allow for the stated processing and delivery times. Check the current <a href=\"/support#shipping-returns\">return conditions</a> and keep tags attached while assessing the fit.</p>"},{"heading":"A common question","body":"<h3><span lang=\"ur-Latn\">Namaz ke liye abaya kaise choose karein?</span></h3><p>Compare the length, neckline and sleeves with your preferred coverage, including when moving. Read which items are included and ask us about any measurements or design details you need before ordering.</p>"}]$lz$::jsonb,4,true) on conflict (slug) do nothing;
insert into public.journal_articles(slug,title,collection,summary,sections,sort_order,active) values ($lz$shawl-pairing-guide$lz$,$lz$Pairing a shawl with your abaya$lz$,$lz$shawls$lz$,$lz$Choose colour, dimensions and texture as a considered finishing touch.$lz$,$lz$[{"heading":"Begin with the pieces you already own","body":"<p>Look at the abayas, kaftans and outer layers you wear most often. A shawl in a familiar colour can create a quiet combination; a contrasting shade can become the focus. There is no single required palette—start with what you enjoy wearing.</p><p>Browse the <a href=\"/collections/shawls/\">shawl collection</a> for the current selection. The edit may be empty between releases. Product availability and prices appear on the individual listings when pieces are available.</p>"},{"heading":"Use dimensions to understand the drape","body":"<p>The length and width affect the ways you can wrap or arrange a shawl. Compare the stated dimensions with a piece you already own, rather than judging size from a styled photograph. Ask for missing measurements if a particular wrapping style matters to you.</p><p>Consider the neckline and sleeve details of the abaya underneath. A simple arrangement can leave an embellished neckline visible, while a fuller wrap changes the overall silhouette.</p>"},{"heading":"Read texture and colour carefully","body":"<p>Photographs can help you assess a surface finish, but cannot fully establish softness, weight or warmth. Check the stated composition and care details. Ask for clarification when a trade name is the only material information.</p><p>Compare colours in similar light where possible. Screens and studio lighting can make a shade appear warmer, cooler or more saturated. If matching an existing outfit precisely, contact us before placing the order.</p>"},{"heading":"Check the listing before checkout","body":"<p>A shawl sold as a separate product does not include a styled abaya unless the description explicitly lists it. The same applies in reverse: a shawl shown with an abaya may be styling rather than part of a set.</p><p>Follow the care label and handle delicate trims with care. For a complete outfit, compare <a href=\"/collections/abayas/\">abayas</a> alongside the shawl details and review the current <a href=\"/support#shipping-returns\">delivery and return information</a>.</p>"}]$lz$::jsonb,5,true) on conflict (slug) do nothing;
insert into public.journal_articles(slug,title,collection,summary,sections,sort_order,active) values ($lz$abaya-fabric-guide$lz$,$lz$An honest guide to abaya fabric names and care$lz$,$lz$abayas$lz$,$lz$What to ask when a listing mentions Nida, Korean Silk, Shamooz or organza.$lz$,$lz$[{"heading":"Separate the name from the specification","body":"<p>Fabric descriptions are a useful starting point, but a name on its own may leave important questions unanswered. Read the product’s stated composition, lining and care information together. If a specification is missing, ask for a verified answer before buying.</p><p>In particular, do not treat a trade name containing “silk” as confirmation of a pure silk fibre composition. Label by Zare’s product pages should be read for the details of that individual piece, rather than assumptions about an entire collection.</p>"},{"heading":"Questions worth asking","body":"<table><thead><tr><th>Description you may see</th><th>What to confirm</th></tr></thead><tbody><tr><td>Nida</td><td>The verified fibre composition, weight or feel, lining and care instructions for this piece.</td></tr><tr><td>Korean Silk</td><td>Whether this is a trade description; ask for the stated fibre percentages rather than assuming silk content or country of manufacture.</td></tr><tr><td>Shamooz / charmeuse</td><td>The composition and surface finish, plus any lining and care requirements.</td></tr><tr><td>Organza</td><td>The composition, which parts of the garment use it, and whether those areas are lined.</td></tr></tbody></table><p>Two garments using the same descriptive name need not have identical weight, finish or care needs. Choose using the specific listing and verified information.</p>"},{"heading":"Assess opacity and comfort in context","body":"<p>Opacity depends on the particular fabric and construction, as well as lighting and the layers worn underneath. Ask about lining and examine the actual gallery. A dark colour or a familiar material name should not be treated as a guarantee.</p><p>Likewise, comfort in warm or cool weather depends on your fit, layers, environment and the garment’s construction. We do not assign a universal summer or winter performance rating from a trade name.</p>"},{"heading":"Let the care label lead","body":"<p>Follow the garment’s care label. If instructions are missing or unclear, contact the seller before washing, ironing or using stain-removal products. Trims, lining and embellishments can require different care from the main fabric.</p><p>Do not test high heat or a cleaning chemical on a visible part of the garment. If specialist cleaning is indicated, show the care label and explain any decorative details to the cleaner. Store the piece clean and dry, with the method suited to its label and construction.</p><p>Ready to compare designs? Explore <a href=\"/collections/everyday-abayas/\">everyday abayas</a>, <a href=\"/collections/occasion-abayas/\">occasion wear</a> and <a href=\"/collections/kaftans/\">kaftans</a>.</p>"}]$lz$::jsonb,6,true) on conflict (slug) do nothing;
insert into public.journal_articles(slug,title,collection,summary,sections,sort_order,active) values ($lz$abaya-sizing-guide$lz$,$lz$How to measure before ordering an abaya$lz$,$lz$abayas$lz$,$lz$Compare garment measurements carefully, and know which details to confirm before selecting a size.$lz$,$lz$[{"heading":"Choose a reliable reference garment","body":"<p>Take an abaya or a similar garment that fits the way you like. Lay it flat without stretching the fabric, close it as you normally wear it and smooth out folds. Use a flexible measuring tape and write down the units.</p><p>Check the seller’s measurement method before comparing. A flat garment width, a full garment circumference and a body measurement are three different things. If the listing does not state which it uses, ask before ordering.</p>"},{"heading":"Compare the details that affect fit","body":"<ul><li><strong>Length:</strong> use the same starting point as the product size guide. Consider the shoes you plan to wear.</li><li><strong>Chest and body width:</strong> compare the published garment measurement with your reference garment, allowing for your preferred ease and layers.</li><li><strong>Sleeve length and opening:</strong> check both reach and the room you prefer around your arm or wrist.</li><li><strong>Shoulders and neckline:</strong> confirm any missing measurements that matter for the cut you are considering.</li></ul><p>Some silhouettes have dropped shoulders or integrated sleeves, so a measurement taken from a different starting point may mislead. Request the method as well as the number.</p>"},{"heading":"Treat labels as a starting point","body":"<p>A size called Medium in one design can differ from Medium in another. A one-size kaftan also has actual dimensions and limits. Choose using the individual design rather than a letter or your height alone.</p><p>See the published <a href=\"/support#size-guide\">size guide</a>, then compare the product’s own information. If the guide and listing appear inconsistent, ask us to confirm before checkout. Do not average conflicting measurements.</p>"},{"heading":"Ask a precise question when unsure","body":"<p>Tell us which product and size you are considering, which garment measurement you need and whether you mean a flat width or a circumference. You can also describe the fit you prefer without sharing personal information you do not wish to provide.</p><p>Before buying for a fixed date, confirm stock and delivery timing. When your order arrives, review the <a href=\"/support#shipping-returns\">return conditions</a> before wearing or removing tags.</p>"},{"heading":"A common question","body":"<h3><span lang=\"ur-Latn\">Meri height ke liye konsa abaya size theek hai?</span></h3><p>Height helps you think about length, but it does not determine the full fit. Compare garment length, body width and sleeves with a piece you already wear comfortably, using the same measurement method.</p>"}]$lz$::jsonb,7,true) on conflict (slug) do nothing;


-- ============================================================
-- v20 — Multi-admin team, roles, permissions & secure activation
-- Safe to run after any previous Label by Zare admin setup.
-- Existing admin email rows are promoted to Owner so nobody is locked out.
-- ============================================================

create table if not exists public.admins (
  email text primary key
);

alter table public.admins add column if not exists full_name text not null default '';
alter table public.admins add column if not exists phone text not null default '';
alter table public.admins add column if not exists role text not null default 'owner';
alter table public.admins add column if not exists can_apply_changes boolean not null default true;
alter table public.admins add column if not exists can_manage_admins boolean not null default true;
alter table public.admins add column if not exists permissions jsonb not null default '{"dashboard":true,"products":true,"orders":true,"customers":true,"reviews":true,"messages":true,"subscribers":true,"discounts":true,"popup":true,"settings":true}'::jsonb;
alter table public.admins add column if not exists active boolean not null default true;
alter table public.admins add column if not exists notes text not null default '';
alter table public.admins add column if not exists invite_token uuid;
alter table public.admins add column if not exists invite_expires_at timestamptz;
alter table public.admins add column if not exists created_at timestamptz not null default now();
alter table public.admins add column if not exists updated_at timestamptz not null default now();
alter table public.admins add column if not exists last_login_at timestamptz;

-- Normalize any legacy rows. The old allow-list had no roles, so current
-- admins become Owners on first migration and retain full access.
update public.admins set role='owner' where role is null or role not in ('owner','managing_director','admin','viewer');
update public.admins set can_apply_changes=true,can_manage_admins=true,active=true where role='owner';

alter table public.admins drop constraint if exists admins_role_check;
alter table public.admins add constraint admins_role_check check (role in ('owner','managing_director','admin','viewer'));
create unique index if not exists admins_email_lower_unique on public.admins(lower(email));
create unique index if not exists admins_invite_token_unique on public.admins(invite_token) where invite_token is not null;

create or replace function public.is_lz_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email)=lower(coalesce(auth.jwt()->>'email','')) and a.active=true
  );
$$;

create or replace function public.lz_admin_can_view(p_section text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email)=lower(coalesce(auth.jwt()->>'email','')) and a.active=true
      and (a.role='owner' or p_section in ('dashboard','admins') or coalesce((a.permissions->>p_section)::boolean,false)=true)
  );
$$;

create or replace function public.lz_admin_can_change(p_section text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email)=lower(coalesce(auth.jwt()->>'email','')) and a.active=true
      and (a.role='owner' or (a.can_apply_changes=true and (p_section in ('dashboard','admins') or coalesce((a.permissions->>p_section)::boolean,false)=true)))
  );
$$;

create or replace function public.lz_admin_can_manage_users()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email)=lower(coalesce(auth.jwt()->>'email','')) and a.active=true
      and (a.role='owner' or (a.can_apply_changes=true and a.can_manage_admins=true))
  );
$$;

revoke all on function public.is_lz_admin() from public;
revoke all on function public.lz_admin_can_view(text) from public;
revoke all on function public.lz_admin_can_change(text) from public;
revoke all on function public.lz_admin_can_manage_users() from public;
grant execute on function public.is_lz_admin() to authenticated;
grant execute on function public.lz_admin_can_view(text) to authenticated;
grant execute on function public.lz_admin_can_change(text) to authenticated;
grant execute on function public.lz_admin_can_manage_users() to authenticated;

alter table public.admins enable row level security;
drop policy if exists "lz staff read own or team" on public.admins;
create policy "lz staff read own or team" on public.admins for select to authenticated
using (lower(email)=lower(coalesce(auth.jwt()->>'email','')) or public.lz_admin_can_manage_users());
-- All writes to admins go through the protected RPCs below so role safeguards
-- cannot be bypassed with a direct REST update.
drop policy if exists "lz block direct staff insert" on public.admins;
create policy "lz block direct staff insert" on public.admins as restrictive for insert to authenticated with check (false);
drop policy if exists "lz block direct staff update" on public.admins;
create policy "lz block direct staff update" on public.admins as restrictive for update to authenticated using (false) with check (false);
drop policy if exists "lz block direct staff delete" on public.admins;
create policy "lz block direct staff delete" on public.admins as restrictive for delete to authenticated using (false);

create or replace function public.admin_staff_list()
returns table(email text,full_name text,phone text,role text,can_apply_changes boolean,can_manage_admins boolean,permissions jsonb,active boolean,notes text,invite_token uuid,invite_expires_at timestamptz,created_at timestamptz,updated_at timestamptz,last_login_at timestamptz,account_exists boolean,auth_last_sign_in_at timestamptz)
language plpgsql security definer
set search_path = public, auth
as $$
begin
  if not public.lz_admin_can_manage_users() then raise exception 'You do not have permission to manage admin users.'; end if;
  return query
  select a.email,a.full_name,a.phone,a.role,a.can_apply_changes,a.can_manage_admins,a.permissions,a.active,a.notes,
         case when u.id is null then a.invite_token else null end,
         case when u.id is null then a.invite_expires_at else null end,
         a.created_at,a.updated_at,a.last_login_at,(u.id is not null),u.last_sign_in_at
  from public.admins a left join auth.users u on lower(u.email)=lower(a.email)
  order by case a.role when 'owner' then 1 when 'managing_director' then 2 when 'admin' then 3 else 4 end,a.created_at;
end;$$;

create or replace function public.admin_upsert_staff(
  p_original_email text,p_email text,p_full_name text,p_phone text,p_role text,p_can_apply_changes boolean,p_can_manage_admins boolean,p_permissions jsonb,p_notes text,p_active boolean
)
returns table(email text,invite_token uuid,invite_expires_at timestamptz,account_exists boolean)
language plpgsql security definer
set search_path = public, auth
as $$
declare actor public.admins%rowtype; target public.admins%rowtype; normalized_email text; token uuid; expires timestamptz; has_account boolean; old_email text;
begin
  select a.* into actor from public.admins a where lower(a.email)=lower(coalesce(auth.jwt()->>'email','')) and a.active=true limit 1;
  if actor.email is null or not (actor.role='owner' or (actor.can_apply_changes and actor.can_manage_admins)) then raise exception 'You do not have permission to manage admin users.'; end if;
  normalized_email=lower(trim(coalesce(p_email,'')));old_email=lower(trim(coalesce(p_original_email,p_email,'')));
  if normalized_email='' or normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Enter a valid admin email.'; end if;
  if p_role not in ('owner','managing_director','admin','viewer') then raise exception 'Invalid admin role.'; end if;
  select a.* into target from public.admins a where lower(a.email)=old_email limit 1;
  if actor.role<>'owner' and (p_role='owner' or target.role='owner') then raise exception 'Only an Owner can add or edit another Owner.'; end if;
  if lower(actor.email)=old_email and (coalesce(p_active,true)=false or p_role<>'owner' and actor.role='owner') then raise exception 'You cannot deactivate or demote your own Owner account.'; end if;
  if target.role='owner' and p_role<>'owner' and (select count(*) from public.admins where role='owner' and active=true)<=1 then raise exception 'At least one active Owner must remain.'; end if;
  select exists(select 1 from auth.users u where lower(u.email)=normalized_email) into has_account;
  if not has_account then token=gen_random_uuid();expires=now()+interval '7 days'; end if;
  if p_role='owner' then p_can_apply_changes=true;p_can_manage_admins=true;p_permissions='{"dashboard":true,"products":true,"orders":true,"customers":true,"reviews":true,"messages":true,"subscribers":true,"discounts":true,"popup":true,"settings":true}'::jsonb;
  elsif p_role='viewer' then p_can_apply_changes=false;p_can_manage_admins=false; end if;
  if target.email is null then
    insert into public.admins(email,full_name,phone,role,can_apply_changes,can_manage_admins,permissions,active,notes,invite_token,invite_expires_at,updated_at)
    values(normalized_email,trim(coalesce(p_full_name,'')),trim(coalesce(p_phone,'')),p_role,coalesce(p_can_apply_changes,false),coalesce(p_can_manage_admins,false),coalesce(p_permissions,'{}'::jsonb),coalesce(p_active,true),trim(coalesce(p_notes,'')),token,expires,now());
  else
    update public.admins a set email=normalized_email,full_name=trim(coalesce(p_full_name,'')),phone=trim(coalesce(p_phone,'')),role=p_role,
      can_apply_changes=coalesce(p_can_apply_changes,false),can_manage_admins=coalesce(p_can_manage_admins,false),permissions=coalesce(p_permissions,'{}'::jsonb),active=coalesce(p_active,true),notes=trim(coalesce(p_notes,'')),
      invite_token=case when has_account then null else coalesce(target.invite_token,token) end,
      invite_expires_at=case when has_account then null else case when target.invite_expires_at>now() then target.invite_expires_at else expires end end,updated_at=now()
    where lower(a.email)=old_email;
    select a.invite_token,a.invite_expires_at into token,expires from public.admins a where lower(a.email)=normalized_email;
  end if;
  return query select normalized_email,token,expires,has_account;
end;$$;

create or replace function public.admin_refresh_invite(p_email text)
returns table(email text,invite_token uuid,invite_expires_at timestamptz)
language plpgsql security definer
set search_path = public, auth
as $$
declare e text:=lower(trim(p_email)); t uuid:=gen_random_uuid(); x timestamptz:=now()+interval '7 days';
begin
  if not public.lz_admin_can_manage_users() then raise exception 'You do not have permission to manage admin users.'; end if;
  if exists(select 1 from auth.users u where lower(u.email)=e) then raise exception 'This email already has a login account and does not need an activation link.'; end if;
  update public.admins set invite_token=t,invite_expires_at=x,updated_at=now() where lower(admins.email)=e and active=true;
  if not found then raise exception 'Admin user not found or inactive.'; end if;
  return query select e,t,x;
end;$$;

create or replace function public.admin_remove_staff(p_email text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare actor public.admins%rowtype; target public.admins%rowtype; e text:=lower(trim(p_email));
begin
  select * into actor from public.admins where lower(email)=lower(coalesce(auth.jwt()->>'email','')) and active=true limit 1;
  if actor.email is null or not (actor.role='owner' or (actor.can_apply_changes and actor.can_manage_admins)) then raise exception 'You do not have permission to manage admin users.'; end if;
  select * into target from public.admins where lower(email)=e limit 1;if target.email is null then return false;end if;
  if lower(actor.email)=e then raise exception 'You cannot remove your own admin access.'; end if;
  if target.role='owner' and actor.role<>'owner' then raise exception 'Only an Owner can remove another Owner.'; end if;
  if target.role='owner' and (select count(*) from public.admins where role='owner' and active=true)<=1 then raise exception 'At least one active Owner must remain.'; end if;
  delete from public.admins where lower(email)=e;return found;
end;$$;

create or replace function public.admin_invite_info(p_token uuid)
returns table(email text,full_name text,role text)
language sql security definer
set search_path = public
as $$
  select a.email,a.full_name,a.role from public.admins a
  where a.invite_token=p_token and a.active=true and a.invite_expires_at>now()
  limit 1;
$$;

create or replace function public.admin_claim_invite(p_token uuid)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare e text:=lower(coalesce(auth.jwt()->>'email',''));begin
  if e='' then return false;end if;
  update public.admins set invite_token=null,invite_expires_at=null,last_login_at=now(),updated_at=now()
  where invite_token=p_token and lower(email)=e and active=true;
  return found;
end;$$;

create or replace function public.admin_touch_login()
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare e text:=lower(coalesce(auth.jwt()->>'email',''));begin
  update public.admins set last_login_at=now(),updated_at=now(),invite_token=null,invite_expires_at=null where lower(email)=e and active=true;return found;
end;$$;

revoke all on function public.admin_staff_list() from public;
revoke all on function public.admin_upsert_staff(text,text,text,text,text,boolean,boolean,jsonb,text,boolean) from public;
revoke all on function public.admin_refresh_invite(text) from public;
revoke all on function public.admin_remove_staff(text) from public;
revoke all on function public.admin_invite_info(uuid) from public;
revoke all on function public.admin_claim_invite(uuid) from public;
revoke all on function public.admin_touch_login() from public;
grant execute on function public.admin_staff_list() to authenticated;
grant execute on function public.admin_upsert_staff(text,text,text,text,text,boolean,boolean,jsonb,text,boolean) to authenticated;
grant execute on function public.admin_refresh_invite(text) to authenticated;
grant execute on function public.admin_remove_staff(text) to authenticated;
grant execute on function public.admin_invite_info(uuid) to anon,authenticated;
grant execute on function public.admin_claim_invite(uuid) to authenticated;
grant execute on function public.admin_touch_login() to authenticated;

-- Re-create admin-owned write policies with the new permission checks.
drop policy if exists "lz admin discounts insert" on public.discounts;
create policy "lz admin discounts insert" on public.discounts for insert to authenticated with check (public.lz_admin_can_change('discounts'));
drop policy if exists "lz admin discounts update" on public.discounts;
create policy "lz admin discounts update" on public.discounts for update to authenticated using (public.lz_admin_can_change('discounts')) with check (public.lz_admin_can_change('discounts'));
drop policy if exists "lz admin discounts delete" on public.discounts;
create policy "lz admin discounts delete" on public.discounts for delete to authenticated using (public.lz_admin_can_change('discounts'));
drop policy if exists "lz admin site settings insert" on public.site_settings;
create policy "lz admin site settings insert" on public.site_settings for insert to authenticated with check (public.lz_admin_can_change('settings') or public.lz_admin_can_change('popup'));
drop policy if exists "lz admin site settings update" on public.site_settings;
create policy "lz admin site settings update" on public.site_settings for update to authenticated using (public.lz_admin_can_change('settings') or public.lz_admin_can_change('popup')) with check (public.lz_admin_can_change('settings') or public.lz_admin_can_change('popup'));
drop policy if exists "lz admin site settings delete" on public.site_settings;
create policy "lz admin site settings delete" on public.site_settings for delete to authenticated using (public.lz_admin_can_change('settings'));
drop policy if exists "lz admin faqs insert" on public.site_faqs;
create policy "lz admin faqs insert" on public.site_faqs for insert to authenticated with check (public.lz_admin_can_change('settings'));
drop policy if exists "lz admin faqs update" on public.site_faqs;
create policy "lz admin faqs update" on public.site_faqs for update to authenticated using (public.lz_admin_can_change('settings')) with check (public.lz_admin_can_change('settings'));
drop policy if exists "lz admin faqs delete" on public.site_faqs;
create policy "lz admin faqs delete" on public.site_faqs for delete to authenticated using (public.lz_admin_can_change('settings'));
drop policy if exists "lz admin journal insert" on public.journal_articles;
create policy "lz admin journal insert" on public.journal_articles for insert to authenticated with check (public.lz_admin_can_change('settings'));
drop policy if exists "lz admin journal update" on public.journal_articles;
create policy "lz admin journal update" on public.journal_articles for update to authenticated using (public.lz_admin_can_change('settings')) with check (public.lz_admin_can_change('settings'));
drop policy if exists "lz admin journal delete" on public.journal_articles;
create policy "lz admin journal delete" on public.journal_articles for delete to authenticated using (public.lz_admin_can_change('settings'));

-- Restrictive policies make the master “Can apply changes” switch enforceable
-- at database level even if a view-only admin tries to bypass the dashboard UI.
do $$
declare t text; section_name text; base text;
begin
  for t,section_name in select * from (values
    ('products','products'),('orders','orders'),('messages','messages'),('newsletter_subscribers','subscribers'),('product_reviews','reviews')
  ) as x(t,section_name)
  loop
    if to_regclass('public.'||t) is not null then
      base='lz v20 admin write guard '||t;
      execute format('drop policy if exists %I on public.%I',base||' insert',t);
      execute format('drop policy if exists %I on public.%I',base||' update',t);
      execute format('drop policy if exists %I on public.%I',base||' delete',t);
      execute format('create policy %I on public.%I as restrictive for insert to authenticated with check ((not public.is_lz_admin()) or public.lz_admin_can_change(%L))',base||' insert',t,section_name);
      execute format('create policy %I on public.%I as restrictive for update to authenticated using ((not public.is_lz_admin()) or public.lz_admin_can_change(%L)) with check ((not public.is_lz_admin()) or public.lz_admin_can_change(%L))',base||' update',t,section_name,section_name);
      execute format('create policy %I on public.%I as restrictive for delete to authenticated using ((not public.is_lz_admin()) or public.lz_admin_can_change(%L))',base||' delete',t,section_name);
    end if;
  end loop;
end $$;


-- Storage guard for the public product-images bucket. It does not change
-- customer/non-admin storage behavior; it only stops Label by Zare staff whose
-- Apply Changes permission is off from bypassing the dashboard and uploading.
do $$
begin
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "lz v20 admin storage insert guard" on storage.objects';
    execute 'drop policy if exists "lz v20 admin storage update guard" on storage.objects';
    execute 'drop policy if exists "lz v20 admin storage delete guard" on storage.objects';
    execute $pol$create policy "lz v20 admin storage insert guard" on storage.objects as restrictive for insert to authenticated
      with check (bucket_id <> 'product-images' or not public.is_lz_admin() or
        (name like 'site/%' and (public.lz_admin_can_change('settings') or public.lz_admin_can_change('popup'))) or
        (name not like 'site/%' and public.lz_admin_can_change('products')))$pol$;
    execute $pol$create policy "lz v20 admin storage update guard" on storage.objects as restrictive for update to authenticated
      using (bucket_id <> 'product-images' or not public.is_lz_admin() or
        (name like 'site/%' and (public.lz_admin_can_change('settings') or public.lz_admin_can_change('popup'))) or
        (name not like 'site/%' and public.lz_admin_can_change('products')))
      with check (bucket_id <> 'product-images' or not public.is_lz_admin() or
        (name like 'site/%' and (public.lz_admin_can_change('settings') or public.lz_admin_can_change('popup'))) or
        (name not like 'site/%' and public.lz_admin_can_change('products')))$pol$;
    execute $pol$create policy "lz v20 admin storage delete guard" on storage.objects as restrictive for delete to authenticated
      using (bucket_id <> 'product-images' or not public.is_lz_admin() or
        (name like 'site/%' and (public.lz_admin_can_change('settings') or public.lz_admin_can_change('popup'))) or
        (name not like 'site/%' and public.lz_admin_can_change('products')))$pol$;
  end if;
end $$;
