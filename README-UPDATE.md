# Label by Zare v15 — Full Admin CMS update

v15 expands the existing protected admin dashboard instead of replacing it. **Before using the new database-backed admin features on the live site, run `supabase/admin-dashboard-setup.sql` once in the Supabase SQL Editor.** The migration is additive/idempotent: it creates the FAQ and journal CMS tables, extends site settings, adds admin-only read access for synced carts/wishlists/reviews, and adds a restricted admin customer-account metadata function. It does not delete the existing catalog, orders, profiles or addresses.

The Customers area now combines registered profiles and guest checkout history and adds saved addresses, order history/spend, synced cart lines, synced wishlist items, review activity, account creation time and last sign-in metadata. Cart and wishlist details are available for signed-in customers whose browser data has synced to Supabase; anonymous guest carts/wishlists remain browser-local and therefore cannot be viewed centrally by admin.

Reviews now have their own top-level admin section. Website Settings is expanded into Homepage, Our Story, Shipping & Returns, FAQs, Journal Guides, and Store & Social. Homepage controls include the House image/copy, occasion banner, values and newsletter content. Story/support images can be uploaded from admin. FAQs are unlimited database records with add/edit/delete/order/publish controls. All eight existing journal guides are seeded into the CMS and can be edited, hidden, deleted or expanded with additional sections; the server-rendered journal keeps the bundled guide data as a fallback if the CMS is unavailable.

v15 verification: **34/34 automated tests passed** and the changed JavaScript/Netlify function files passed syntax checks. No live Supabase migration or production deployment was performed while editing this ZIP.

---

# Label by Zare — website update v13

v13 fixes the invisible Instagram CTA on Support and cleans up the brand's Instagram links. It also improves cart/zoom keyboard controls, hides closed mobile controls from keyboard navigation, escapes identified customer/product HTML rendering paths, validates saved cart data, keeps checkout items and totals in sync, and shows saved order/message confirmations before optional email delivery. Account settings now accurately describe the existing saved-data clearing action and report failures.

Read **AUDIT-2026-09-07.md** for the public-route register, fixed issues, important backend verification requirements, catalogue recommendations and deployment checks. The audit checked 49 live URLs; all responded. The live site still served older assets at inspection, so this ZIP must be built and deployed to apply these changes.

v13 verification: **34 tests passed**, **45 JavaScript files passed syntax checks**, and **51 source/rendered pages passed the stated markup checks**. Checkout, contact and account failure tests use isolated mocks and do not create real orders or send messages. No new mobile browser rendering, live deployment or production performance score is claimed. Use `node --test tests/*.test.js` for the full suite.

## Earlier improvements retained

v12 aligns page titles and social-preview titles with the actual page content. The homepage title is now “Modest Wear, Abayas & Shawls in Pakistan | Label by Zare”; collection, sale, new-arrival, contact, support and review titles describe their own purpose. Product titles share one rule between server-rendered HTML and browser updates, adding Abaya, Kaftan or Shawl when the product name alone does not identify the garment.

Image descriptions use known product names and garment types, distinguish additional gallery photographs, and stay in sync when shoppers switch images. The editorial photographs now describe what is actually visible. Decorative stock backgrounds have empty alt text instead of falsely describing a Label by Zare atelier. Existing editorial images use responsive Netlify Image CDN sizes, lazy loading, dimensions and original-image fallbacks.

Navigation and footer labels retain their appearance without repeating page headings. Best Sellers and Featured Products keep their linked product names while the full collection retains the product headings. The approved hero photograph, “MODEST WEAR, Label by Zare.” headline and branded loading screen remain.

Public HTML now uses Netlify durable caching: a 60-second fresh period and a 30-second background-revalidation window, with query variants kept separate. Browsers still revalidate; deployments invalidate the CDN cache. Catalog changes may briefly lag within that window, while checkout continues to refresh prices and availability from the database. Optional server-side review requests now abort after 1.2 seconds rather than holding a product response for up to 8 seconds; a timeout omits the rating instead of inventing one. Error responses are not cached. These are implementation improvements, not a claim of measured production speed; deploy the update before measuring live response times.

v11 checks and strengthens the sitemaps. At the time of the live check, the sitemap index and both XML sitemaps returned HTTP 200, and all 31 listed URLs (21 pages and 10 products) loaded with matching canonical URLs and no indexing blocks. There were no duplicate entries, and robots.txt referenced the correct sitemap index.

The updated sitemap code excludes empty shop, sale and new-arrival pages when the catalog has no correctly priced products for them. The visitor sitemap also includes general abayas that do not match a named subcollection and excludes unpriced products, keeping its product links consistent with the XML sitemap. Out-of-stock pieces remain discoverable. These safeguards take effect after this ZIP is deployed; no deployment or Search Console submission was performed during the check.

v10 restores the requested full-screen Label by Zare loading screen before the homepage. The centered wordmark and gold line fade into the page after a brief introduction. A time limit, keyboard dismissal and reduced-motion handling keep the page accessible if an image or external script is slow.

v9 fixes the homepage background: image URLs work when the source is opened from a folder, the picture has an explicit full-cover container on desktop and mobile, and failed AVIF/responsive requests fall back to WebP and then the retained original photograph. The homepage styles have a new cache version so the correction is picked up after deployment.

This ZIP contains the updated website source, including the SEO implementation. It retains the existing Supabase catalog, admin, customer accounts, cart, order storage and Formspree order notifications. The older v13 update did not require a migration, but **this v15 admin-CMS update does require running the included `supabase/admin-dashboard-setup.sql` once** to enable its new database-backed controls.

## What is implemented

- The homepage sends real catalog cards in its initial HTML, while retaining the approved headline, boutique photograph, Best Sellers, Featured Products and Abayas/Shawls tabs. The requested full-screen Label by Zare introduction appears before the homepage and releases scrolling when it finishes.
- Dedicated, server-rendered collections: `/collections/abayas/`, `/collections/everyday-abayas/`, `/collections/occasion-abayas/`, `/collections/kaftans/`, `/collections/prayer-abayas/`, and `/collections/shawls/`. The existing `/shop`, `/new-arrivals` and `/sale` routes also render real products before JavaScript runs.
- Collection pages have normal product links, breadcrumbs, unique titles and descriptions, self-canonical pagination, price sorting and an in-stock filter. An empty collection shows an honest message and stays noindex until it contains products.
- Eight original buying guides at `/journal/`, linked from collections, product pages, the homepage and navigation. They cover sizing, fabric descriptions, everyday wear, occasions, kaftans, prayer pieces and shawls. Roman Urdu questions appear naturally in relevant guides.
- Search supports real product attributes, common spelling variations, Roman Urdu terms and strict price constraints such as `abaya under 5000` or `abaya 5k se kam`. `/search` is available as a normal results page. Search and filtered URLs are noindex.
- Product JSON-LD shares the catalog's current PKR prices, availability, image URLs, genuine rating data, brand identity, delivery policy and breadcrumbs. There are no invented reviews, fibre percentages, GTINs or physical branches.
- Sitemaps and the product feed fetch the catalog in API pages instead of silently stopping at the first response. Out-of-stock product URLs remain live. Missing products return 404; database outages return 503 with a retry header. Old product slugs redirect to the same product's current URL.
- The chosen hero has high-quality AVIF and WebP variants at 960, 1280 and 1672 pixels. The original lossless image is retained. The full-size AVIF is 83,183 bytes versus the original 1,182,578 bytes. Product images use responsive Netlify Image CDN URLs with original-image fallbacks; zoom keeps the original product image.
- Shipping uses one shared rule: standard PKR 350, express PKR 900, both free on orders **over** PKR 15,000. Exactly PKR 15,000 still pays the selected shipping fee. Checkout refreshes current product prices, sizes, colours and stock before an order is saved.
- GA4-compatible `view_item`, `view_item_list`, `add_to_cart`, `begin_checkout` and `purchase` hooks are included. Purchase fires after an order is saved. Customer names, email addresses, phone numbers, addresses and payment details are excluded from these events.
- The admin keeps the separate Abayas/Shawls controls and adds guidance for accurate descriptions, material claims and retaining out-of-stock product pages.

## Use this update on the existing Netlify project

1. Extract the ZIP and replace the project source with the contents of `LABEL BY ZARE FINAL`. Keep any existing Netlify account settings and environment variables.
2. The included `netlify.toml` sets the build command to `node scripts/build-site.js`, the publish directory to `dist`, and the functions directory to `netlify/functions`. Node 22 is configured. This build has no npm dependencies to install.
3. Deploy through the existing Netlify project using its source/build workflow or a Netlify CLI deployment that includes functions. Uploading only HTML files to a static host will not run the collection, product, journal, sitemap or feed functions.
4. If you edit `index.html` or `shop.html`, run the build again. It regenerates `netlify/lib/templates.js` and copies public files into `dist/`. Internal source, SQL setup files and tests are kept out of the public output.

Optional catalog settings: the server functions accept `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Their defaults retain the existing public project configuration. Never put a Supabase service-role key in frontend files. The checkout's existing database access controls and order-writing model are retained; the browser availability refresh is not a replacement for server-side order authorization.

## Connect measurement after deployment

Set your own GA4 measurement ID in `js/analytics-config.js`, then rebuild. It is intentionally blank, so this update does not send Google Analytics requests to an invented property. The existing Search Console verification tag is preserved. Submit `https://labelbyzare.com/sitemap.xml` in the verified Search Console property and inspect the new collection and guide URLs.

The feed is at `/product-feed.xml`; its previous `/.netlify/functions/product-feed` endpoint still works. It reflects the existing **product-level** stock model. Before activating Merchant Center listings, check your account's Pakistan/program eligibility, identifiers, shipping settings and apparel variant requirements. The catalog does not currently hold separate inventory or identifiers for every size/colour combination, so the feed does not fabricate those details. Set the order-level free-shipping threshold in Merchant Center as well.

No live deployment, Search Console submission, GA4 account creation, media outreach or backlink acquisition was performed by editing this ZIP. Those require the relevant account or external publishing action.

## Keep the content and catalog accurate

Use the existing category values Everyday, Occasion, Kaftan, Prayer and Shawls to place products in the correct collection. For a temporarily unavailable or recurring seasonal piece, switch off In Stock instead of deleting it. Its page, related collection links and out-of-stock markup remain available. Restore stock when it returns. Delete only when a page should truly disappear; use a specific 301 redirect in `netlify.toml` only when there is a genuinely equivalent replacement.

Guide content is now editable from Admin → Website Settings → Journal Guides and stored in `journal_articles`; `netlify/lib/journal.js` remains the fallback seed/source. Collection copy is still in `js/collections.js`. Verify any new product-specific material, measurement, performance or care claim before publishing. Update old links when editing guides. Retain evergreen collection URLs across Ramadan, Eid and wedding seasons instead of creating a new duplicate page each year.

Shared delivery rules are in `js/store-policy.js`. If the policy changes, update that file, the visible support page and the merchant account's shipping settings together.

## Verification

Run:

```sh
node --test tests/*.test.js
node scripts/build-site.js
```

All 23 focused tests passed for v12 using catalog fixtures and mocked read-only database responses, including public caching, error handling and a deliberately stalled review request. All 43 JavaScript files passed syntax checks. A markup audit of 31 rendered public pages and 20 source HTML pages found one H1 per page, no repeated heading text, no missing image alt attributes, and matching page/social titles. The suite also covers server-rendered products, collection routing, pagination, mixed product merchandising, search, shipping thresholds, schema escaping, genuine review counts, feed URLs and outage behavior. Earlier checks covered JavaScript and inline scripts, HTML structure/local asset references, XML and Netlify TOML. No live orders were placed.

Production Core Web Vitals and checkout behavior still need measurement on the deployed host. Target mobile field p75 LCP ≤2.5s, INP ≤200ms and CLS ≤0.1; a sub-1.5s LCP is a stretch goal, not a guaranteed result from file edits. No browser or live performance score is claimed here.

Implementation references: [Google title links](https://developers.google.com/search/docs/appearance/title-link), [Google image descriptions](https://developers.google.com/search/docs/appearance/google-images), [Netlify caching](https://docs.netlify.com/build/caching/caching-overview/), [Netlify Image CDN](https://docs.netlify.com/build/image-cdn/overview/), [Google merchant listing structured data](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing), and [Google AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).
