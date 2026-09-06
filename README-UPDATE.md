# Label by Zare — website update v10

v10 restores the requested full-screen Label by Zare loading screen before the homepage. The centered wordmark and gold line fade into the page after a brief introduction. A time limit, keyboard dismissal and reduced-motion handling keep the page accessible if an image or external script is slow.

v9 fixes the homepage background: image URLs work when the source is opened from a folder, the picture has an explicit full-cover container on desktop and mobile, and failed AVIF/responsive requests fall back to WebP and then the retained original photograph. The homepage styles have a new cache version so the correction is picked up after deployment.

This ZIP contains the updated website source, including the SEO implementation. It builds on v7 and retains the existing Supabase catalog, admin, customer accounts, cart, order storage and Formspree order notifications. No database migration is required.

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

Guide content is maintained in `netlify/lib/journal.js`; collection copy is in `js/collections.js`. Verify any new product-specific material, measurement, performance or care claim before publishing. Update old links when editing guides. Retain evergreen collection URLs across Ramadan, Eid and wedding seasons instead of creating a new duplicate page each year.

Shared delivery rules are in `js/store-policy.js`. If the policy changes, update that file, the visible support page and the merchant account's shipping settings together.

## Verification

Run:

```sh
node --test tests/seo.test.js
node scripts/build-site.js
```

The 19 focused tests pass using catalog fixtures and mocked read-only database responses. They cover server-rendered products, collection routing, pagination, mixed product merchandising, search, shipping thresholds, schema escaping, genuine review counts, stock lifecycle, feed URLs and outage behavior. JavaScript and inline scripts, HTML structure/local asset references, XML and Netlify TOML were also checked. No live orders were placed.

Production Core Web Vitals and checkout behavior still need measurement on the deployed host. Target mobile field p75 LCP ≤2.5s, INP ≤200ms and CLS ≤0.1; a sub-1.5s LCP is a stretch goal, not a guaranteed result from file edits. No browser or live performance score is claimed here.

Implementation references: [Netlify Image CDN](https://docs.netlify.com/build/image-cdn/overview/), [Google merchant listing structured data](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing), and [Google AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).
