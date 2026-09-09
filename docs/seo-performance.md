# SEO and performance implementation

This change targets the existing Pakistan storefront, `https://labelbyzare.com`. Rankings and Core Web Vitals must be measured after deployment. No first-page ranking or rich-result appearance is guaranteed.

## Keyword ownership

These are intent clusters, not measured search volumes. Validate monthly volume, country, difficulty and conversion data in Keyword Planner and Search Console before expanding the catalog.

| Cluster / example queries | Primary URL | Execution |
| --- | --- | --- |
| Label by Zare, abayas and shawls Pakistan | `/` | Brand and range introduction; prominent abaya collection link |
| abayas, buy abayas online Pakistan, modern abayas | `/collections/abayas/` | Main transactional landing page |
| everyday abayas, casual abayas, abayas for university/work | `/collections/everyday-abayas/` | Actual Everyday products and routine-based buying advice |
| occasion abayas, evening abayas, Eid abayas | `/collections/occasion-abayas/` | Index only when priced products exist in this category |
| kaftan abaya Pakistan | `/collections/kaftans/` | Kaftan products and fit advice |
| prayer abaya, namaz abaya | `/collections/prayer-abayas/` | Actual Prayer products and coverage questions |
| shawls online Pakistan | `/collections/shawls/` | Honest empty state and noindex until populated |
| linen abayas, luxury abayas, embroidered/black/georgette abayas | Product pages or future verified collections | Do not create empty keyword pages or claim fabric/quality specifications that are unverified |

Collection titles, descriptions, H1s and supporting H2s live in `js/collections.js` and `server/routes/collection-page.js`. Product names retain brand naming while adding the garment type where missing. Each page links to its parent collection, relevant buying guides and related products. Collection navigation and footer links support the main abaya landing page.

## Product content and structured data

Initial HTML includes the full gallery, price, availability, selectable sizes, quantity, buying buttons, fabric/care details, returns and delivery information. Browser initialization preserves these controls instead of replacing them.

Product schema includes current PKR offers, real photos, availability, brand and genuine review aggregates when available. Products with multiple listed sizes have `ProductGroup` / `hasVariant`, stable size SKUs, size-specific offer links, and a canonical pointing to the parent product. The feed uses the same size IDs, URLs, prices and current shipping settings. Colour inventory is not inferred from a multi-colour garment. No GTIN, fibre composition or review data is invented.

**Merchant review before submitting a feed:** catalog stock is currently stored at product level. Confirm every listed size is actually purchasable; introduce real variant inventory before representing size-specific stock. Confirm product identifiers and Merchant Center country/category requirements. Configure account shipping and returns to match the actual policy.

Keep product descriptions factual and unique:

1. Explain the actual design and intended use in one short opening paragraph.
2. State confirmed material/composition, lining, opacity context and care instructions.
3. Provide design-specific garment measurements and measurement units.
4. List exactly which inner garment, belt, hijab or other pieces are included.
5. Keep size arrays, colour options, price and stock synchronized with the description.

The live catalog audit found size arrays listing S/M/L/XL while the descriptions of `aby-002` and `aby-005` mention Medium & Large. Resolve that with actual inventory; this code does not guess which source is correct. “Korean Silk” is a trade description, not proof of silk fibre content.

## Images and rendering

- Hero AVIF/WebP sources retain high fetch priority and are not lazy loaded.
- Product primary photos use eager loading, dimensions and responsive candidates. Thumbnails and below-the-fold cards use lazy loading.
- The forced homepage loader delay is removed. Optional FAQ/journal requests no longer gate essential settings readiness.
- GSAP/ScrollTrigger/Lenis downloads are removed from built pages; native scrolling and the existing static appearance remain.
- `npm run images` creates WebP derivatives at up to 160/480/832/1248 pixels with EXIF orientation correction, no enlargement and stripped metadata. It preserves originals for zoom and fallback.
- Every normal build refreshes derivatives from public catalog images. Network/image errors are reported and existing sources remain usable; `npm run images` exits nonzero so a maintainer can explicitly check full coverage.
- Product uploads through the admin create responsive copies when browser conversion is available. An unsupported conversion retains the original.
- CSS/JS URLs receive content hashes to invalidate browser caches when files change.
- The Worker caches anonymous public documents for 60 seconds. Query variants remain separate. Searches, session cookies, authorization, errors and private responses bypass storage. Utility pages have private/no-store and noindex headers. Checkout still validates the latest catalog and places orders through the server-authoritative RPC.

## Five conversion guides

Enhanced guides: everyday/work/university abayas; Eid/wedding-guest styling; summer fabric comparisons; garment sizing. Added: open vs closed vs umbrella silhouettes. Existing URLs are retained. Articles link to collections and show in-stock product recommendations. CMS edits and explicitly inactive articles are respected; new CMS guides appear in XML and HTML sitemaps. Article bodies accept safe formatting and links.

## Validation and deployment

1. Run `npm ci` with Node 24.
2. Run `npm run check` (syntax, regression tests, images and asset build).
3. Run `npx wrangler deploy --dry-run` to validate the Worker bundle.
4. Review the branch and deploy through the existing Cloudflare workflow. Wrangler builds before deployment.
5. On the deployed preview, check mobile and desktop homepage, collection, product size links, gallery, cart, checkout validation and journal pages. Check a sold-out product and a missing URL. Do not submit a production test order without store authorization.
6. Check `?size=L` selects L, canonical remains the parent URL, and the feed SKU/link/price match.
7. Verify a second anonymous GET returns `X-LZ-Cache: HIT`; a request with a cookie should bypass that cache. Allow 60 seconds for catalog cache expiry.

Validation in this workspace: bundled repository image derivatives generated successfully; remote catalog image downloads timed out. The build will attempt them again in the deployment environment. The cloud browser could not open the local preview, so visual/browser checks remain required on a reachable preview. No live Core Web Vitals result is claimed.

## Search Console and performance follow-up

- Verify the canonical domain in Google Search Console; submit `/sitemap.xml`.
- Inspect the homepage, main abaya collection and representative products with URL Inspection and Google's Rich Results Test.
- Configure Merchant Center and add `/product-feed.xml` only after inventory, identifiers and policies are checked.
- Measure mobile and desktop PageSpeed Insights on home, collection, product and checkout before/after deployment; inspect the LCP element and long tasks in DevTools.
- Monitor field data at the 75th percentile: LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1. Field reporting uses a rolling window and may be unavailable on low-traffic URLs. Lab scores do not establish field compliance.
- The existing consent-aware analytics needs the store's actual GA4 measurement ID in `js/analytics-config.js`. Review search impressions, clicks, landing-page conversion and revenue by cluster monthly; prioritize useful content and real catalog expansion.
