const Catalog = require("../lib/catalog");
const Core = require("../../js/catalog-core");
const Schema = require("../../js/structured-data");
const Policy = require("../../js/store-policy");
const publicPageHeaders = require("../lib/page-cache");
const ProductView = require("../../js/product-view");
const Settings = require("../lib/store-settings");
const LZProductTypes = require("../../js/product-types");

/* ==========================================================================
   LABEL BY ZARE — SERVER-RENDERED PRODUCT PAGE
   ==========================================================================
   Why this exists: product.html is a client-only shell (js/product.js
   fetches the product from Supabase and paints the DOM after load). That's
   invisible to crawlers/scrapers that don't execute JS — Bing, most
   social-preview bots (WhatsApp, Facebook, Twitter/X), and it makes Google
   wait for a slower secondary render pass instead of indexing immediately.

   This function fetches the single product straight from Supabase (same
   pattern as sitemap-products.js) and returns a complete HTML document with
   real title/meta/canonical/OG/JSON-LD and a real, crawlable content block
   already baked in. It then loads the exact same scripts as product.html,
   so js/product.js hydrates over the top and the page becomes fully
   interactive (cart, gallery, zoom, size guide) exactly as before — this
   is "SSR shell + client hydration," not a replacement for the client app.

   URL scheme: /product/<slug>/<id>  (e.g. /product/silk-kaftan-abaya/9f1c…)
   The slug carries the keywords for search; the id is what actually looks
   the product up, so a renamed product never breaks an old link — it just
   301-redirects to its new canonical slug (see below).

   Cloudflare Worker routes both the new path form and the legacy
   /product?id=<id> query form to this function.
   ========================================================================== */

const SUPABASE_URL = "https://ldpzgtjbnbdsggaqmuvs.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_DG3Iar3m4BUg72fUWPyLag_XMyHfLWs";
const SITE_URL = "https://labelbyzare.com";
const SITE_NAME = "Label by Zare";
const DEFAULT_IMAGE = `${SITE_URL}/images/logo.jpg`;

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "abaya";
}

function truncate(text, max = 160) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trim() + "…";
}

function formatPKR(n) {
  const num = Number(n) || 0;
  return "PKR " + num.toLocaleString("en-PK");
}

function parseRequest(event) {
  // New scheme: /product/<slug>/<id>
  const parts = (event.path || "").split("/").filter(Boolean);
  const i = parts.indexOf("product");
  if (i !== -1 && parts.length === i + 3) {
    try { return { id: decodeURIComponent(parts[i + 2]), requestedSlug: decodeURIComponent(parts[i + 1]) }; } catch { return {id:null,requestedSlug:null}; }
  }
  // Legacy scheme: /product?id=<id>  (Cloudflare Worker forwards this here too)
  const id = event.queryStringParameters && event.queryStringParameters.id;
  return { id: id || null, requestedSlug: null };
}

async function fetchProduct(id){ return Catalog.product(id); }
async function fetchReviewStats(id){ return Catalog.ratings(id); }
async function fetchSiteSettings(){return Settings.read();}
const policyFromSettings=Settings.policy;
function notFoundPage(){
  return `<!doctype html><html lang="en-PK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Piece unavailable | Label by Zare</title><link rel="stylesheet" href="/css/style.css?v=20260907-audit1"><link rel="stylesheet" href="/css/editorial.css?v=20260906-seo1">
</head><body><main class="wrap section"><a href="/">Label by Zare</a><h1 class="display-2">This piece isn’t available.</h1><p>Explore the current collection or get in touch for help.</p><a class="btn btn-solid" href="/collections/abayas/">Explore abayas</a> <a class="btn btn-outline" href="/collections/shawls/">Explore shawls</a></main></body></html>`;
}

function buildFullGallery(p){ const gallery=Core.normalize(p).gallery; return gallery.length ? gallery : [DEFAULT_IMAGE]; }

function renderPage(p, rating, policy, query={}, settings={}) {
  const name = p.name || LZProductTypes.label(p);
  const category = p.category || LZProductTypes.label(p);
  const gallery = buildFullGallery(p);
  const img = gallery[0];
  const description = p.description || `See photographs, available sizes and current details for ${name} by ${SITE_NAME}. Delivery across Pakistan.`;
  const inStock = Core.stocked(p) && p.price > 0;
  const slug = slugify(name);
  const canonicalPath = `/product/${slug}/${encodeURIComponent(p.id)}`;
  const canonical = `${SITE_URL}${canonicalPath}`;
  const title = Core.productTitle(p);
  const metaDescription = truncate(`${name} — ${LZProductTypes.singular(p)} by ${SITE_NAME}. ${description}`, 160);
  const priceText = formatPKR(p.price);
  const collection = require("../../js/collections").forProduct(p);

  const productSchema = Schema.product(p,rating,policy,query);
  const breadcrumbSchema = Schema.productBreadcrumbs(p);

  return `<!DOCTYPE html>
<html lang="en-PK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(metaDescription)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${canonical}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(metaDescription)}">
<meta property="og:type" content="product">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${escapeHtml(img)}">
<meta property="og:locale" content="en_PK">
<meta property="product:price:amount" content="${escapeHtml(String(p.price || ""))}">
<meta property="product:price:currency" content="PKR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(metaDescription)}">
<meta name="twitter:image" content="${escapeHtml(img)}">
<link rel="icon" type="image/jpeg" href="/images/logo-mark.jpg">
<link rel="apple-touch-icon" href="/images/logo-mark.jpg">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#f5efe6">
<script id="lz-product-schema" type="application/ld+json">${Core.json(productSchema)}</script>
${p.sizes.length>1 ? `<script id="lz-product-group-schema" type="application/ld+json">${Core.json(Schema.productGroup(p,rating,policy))}</script>` : ''}
<script type="application/json" id="lz-settings-data">${Core.json(settings)}</script>
<script id="lz-breadcrumb-schema" type="application/ld+json">${Core.json(breadcrumbSchema)}</script>
<script id="lz-org-schema" type="application/ld+json">${Core.json(Schema.organization(policy))}</script>
<script id="lz-catalog-data" type="application/json" data-complete="false">${Core.json([p])}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://ldpzgtjbnbdsggaqmuvs.supabase.co">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&family=Manrope:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/css/style.css?v=20260907-audit1">
<link rel="stylesheet" href="/css/editorial.css?v=20260906-seo1">
</head>
<body>

<div class="grain"></div>

<nav class="site-nav is-dark scrolled" id="site-nav">
  <div class="wrap">
    <a href="/" class="nav-logo"><img src="/images/logo-mark.jpg" alt="Label by Zare logo" width="44" height="44"><span class="nav-wordmark">LABEL <em>by</em> ZARE</span></a>
    <ul class="nav-links">
      <li><a href="/">Home</a></li>
      <li class="nav-collection"><details class="collection-menu"><summary>Collection<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></summary><ul class="collection-submenu"><li><a href="/collections/abayas/">Abayas</a></li><li><a href="/collections/shawls/">Shawls</a></li></ul></details></li>
      <li><a href="/new-arrivals">New Arrivals</a></li>
      <li><a href="/sale">Sale</a></li>
      <li><a href="/about">About</a></li>
      <li><a href="/track-order">Track Order</a></li>
    </ul>
    <div class="nav-actions">
      <button class="nav-icon-btn js-open-search" aria-label="Search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></button>
      <a href="/wishlist" class="nav-icon-btn" aria-label="Wishlist"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20.5s-7.5-4.6-10-9.3C.5 8 2 4.5 5.5 4c2-.3 3.7.6 4.9 2.2C11.7 4.7 13.3 3.8 15.5 4c3.5.5 5 4 3.5 7.2-2.5 4.7-10 9.3-10 9.3Z"/></svg><span class="badge js-wish-count">0</span></a>
      <a href="/account" class="nav-icon-btn" aria-label="Account"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"/></svg></a>
      <button class="nav-icon-btn js-open-cart" aria-label="Cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18l-1.5 12.5a2 2 0 0 1-2 1.5H6.5a2 2 0 0 1-2-1.5L3 6Z"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg><span class="badge js-cart-count">0</span></button>
      <button class="nav-burger" aria-label="Menu" aria-controls="mobile-menu" aria-expanded="false"><span></span><span></span><span></span></button>
    </div>
  </div>
</nav>

<div class="mobile-menu" id="mobile-menu" aria-hidden="true" inert>
  <div class="eyebrow">Menu</div>
  <div class="mobile-menu-quick">
    <a href="/account" class="mobile-quick-btn" aria-label="Account"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"/></svg><span>Account</span></a>
    <a href="/wishlist" class="mobile-quick-btn" aria-label="Wishlist"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20.5s-7.5-4.6-10-9.3C.5 8 2 4.5 5.5 4c2-.3 3.7.6 4.9 2.2C11.7 4.7 13.3 3.8 15.5 4c3.5.5 5 4 3.5 7.2-2.5 4.7-10 9.3-10 9.3Z"/></svg><span>Wishlist</span><span class="badge js-wish-count">0</span></a>
    <a href="/track-order" class="mobile-quick-btn" aria-label="Track Order"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18l-1.5 12.5a2 2 0 0 1-2 1.5H6.5a2 2 0 0 1-2-1.5L3 6Z"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg><span>Track Order</span></a>
    <a href="/cart" class="mobile-quick-btn" aria-label="Cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg><span>Bag</span><span class="badge js-cart-count">0</span></a>
  </div>
  <ul class="mobile-menu-primary">
    <li><a href="/">Home</a></li>
    <li class="nav-collection"><details class="collection-menu"><summary>Collection<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></summary><ul class="collection-submenu"><li><a href="/collections/abayas/">Abayas</a></li><li><a href="/collections/shawls/">Shawls</a></li></ul></details></li>
    <li><a href="/new-arrivals">New Arrivals</a></li>
    <li><a href="/sale">Sale</a></li>
    <li><a href="/about">About</a></li>
  </ul>
  <div class="mobile-menu-secondary">
    <div><p class="menu-group-label">Support</p><ul><li><a href="/track-order">Track Order</a></li><li><a href="/support#size-guide">Size Guide</a></li><li><a href="/support#shipping-returns">Shipping &amp; Returns</a></li><li><a href="/support#faqs">FAQs</a></li></ul></div>
    <div><p class="menu-group-label">About</p><ul><li><a href="/about">Our Story</a></li><li><a href="/about#values">Craftsmanship</a></li><li><a href="/about">Our Values</a></li><li><a href="/journal/">Journal</a></li><li><a href="/contact">Contact</a></li></ul></div>
  </div>
  <div class="mobile-menu-bottom">&copy; 2026 Label by Zare. All rights reserved.</div>
</div>

<div class="search-overlay" role="dialog" aria-modal="true" aria-labelledby="site-search-title" aria-hidden="true" inert>
  <p class="search-heading" id="site-search-title">Search the collection</p>
  <div class="search-top">
    <form class="search-form" role="search" action="/search" method="get">
      <input type="search" name="q" placeholder="Search pieces, colours, fabrics…" aria-label="Search products" autocomplete="off" maxlength="120" enterkeyhint="search">
      <button class="search-clear" type="button" aria-label="Clear search" hidden>Clear</button>
    </form>
    <button class="search-close" type="button" aria-label="Close search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
  </div>
  <div class="search-body">
    <p class="search-hint">Discover your next favourite by name, colour, fabric or collection.</p>
    <div class="search-suggestions" role="group" aria-label="Search suggestions">
      <button type="button" data-search-query="Abayas">Abayas</button>
      <button type="button" data-search-query="Shawls">Shawls</button>
      <button type="button" data-search-query="New arrivals">New arrivals</button>
      <button type="button" data-search-query="Sale">Sale</button>
    </div>
    <p class="search-status" role="status" aria-live="polite" aria-atomic="true"></p>
    <div class="search-results" aria-busy="false"></div>
    <button class="search-more" type="button" hidden>Show more pieces</button>
    <button class="search-retry" type="button" hidden>Try again</button>
  </div>
</div>

<div class="cart-drawer-backdrop"></div>
<div class="cart-drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" aria-hidden="true" inert>
  <div class="drawer-head"><p class="serif drawer-title" id="cart-drawer-title">Your Bag</p><button class="js-close-drawer nav-icon-btn" aria-label="Close bag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
  <div class="drawer-body"></div>
  <div class="drawer-foot"></div>
</div>

<main class="wrap pdp" id="pdp-root" data-product-rendered="${escapeHtml(p.id)}">
${ProductView.render(p,{policy,rating,query})}
</main>

<section class="section section-tight">
  <div class="wrap" style="max-width:900px" id="product-reviews-root"></div>
</section>

<section class="section related-strip">
  <div class="wrap">
    <div class="section-head reveal">
      <div>
        <div class="eyebrow">You May Also Like</div>
        <h2 class="display-3" style="margin-top:.6rem">Complete the Look</h2>
      </div>
    </div>
    <div class="collection-grid" id="related-grid"></div>
  </div>
</section>

<div class="newsletter">
  <div class="wrap">
    <div class="eyebrow" style="justify-content:center">Join Us</div>
    <h2 class="display-3" style="margin-top:.6rem">Be first to know.</h2>
    <p style="color:var(--taupe);max-width:40ch;margin:.8rem auto 0">New collections, private previews, and quiet updates from the atelier.</p>
    <form>
      <input type="email" placeholder="Your email address" required aria-label="Email address">
      <button type="submit">Subscribe</button>
    </form>
  </div>
</div>

<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <div class="footer-brand"><img src="/images/logo-mark.jpg" alt="Label by Zare logo" width="46" height="46">Label <em>by</em> Zare</div>
        <p style="max-width:32ch;color:var(--beige)">Considered abayas and shawls for the modern woman — cut with intention, worn with quiet confidence.</p>
      </div>
      <div><p class="footer-group-label">Shop</p><ul><li><a href="/collections/abayas/">Abayas</a></li><li><a href="/collections/shawls/">Shawls</a></li><li><a href="/new-arrivals">New Arrivals</a></li><li><a href="/sale">Sale</a></li><li><a href="/wishlist">Wishlist</a></li><li><a href="/reviews">Reviews</a></li></ul></div>
      <div><p class="footer-group-label">About</p><ul><li><a href="/about">Our Story</a></li><li><a href="/about#values">Craftsmanship</a></li><li><a href="/about">Our Values</a></li><li><a href="/journal/">Journal</a></li><li><a href="/contact">Contact</a></li></ul></div>
      <div><p class="footer-group-label">Support</p><ul><li><a href="/track-order">Track Order</a></li><li><a href="/support#size-guide">Size Guide</a></li><li><a href="/support#shipping-returns">Shipping &amp; Returns</a></li><li><a href="/support#faqs">FAQs</a></li></ul></div>
    </div>
    <div class="footer-bottom">
      <span>&copy; 2026 Label by Zare. All rights reserved.</span>
      <span>Abayas and shawls, considered together.</span>
      <span><a href="/sitemap.html" style="color:inherit">Full Product Index</a></span>
    </div>
  </div>
</footer>

<div class="toast"><span class="dot"></span><span class="toast-msg"></span></div>

<script defer src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script defer src="https://unpkg.com/lenis@1.1.13/dist/lenis.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script defer src="/supabase-client.js"></script>
<script defer src="/js/catalog-core.js?v=20260907-seo2"></script>
<script defer src="/js/store-policy.js?v=20260906-seo1"></script>
<script defer src="/js/site-settings.js?v=20260907-admin3"></script>
<script defer src="/js/collections.js?v=20260906-seo1"></script>
<script defer src="/js/product-types.js?v=20260906-seo1"></script>
<script defer src="/js/structured-data.js?v=20260907-shipping1"></script>

<script defer src="/js/search.js?v=20260906-seo1"></script>
<script defer src="/js/seo.js?v=20260907-seo2"></script>
<script defer src="/js/data.js?v=20260907-shipping1"></script>
<script defer src="/js/analytics-config.js?v=20260906-seo1"></script>
<script defer src="/js/analytics.js?v=20260906-seo1"></script>
<script defer src="/js/cart.js?v=20260907-audit1"></script>
<script defer src="/js/customer-auth.js?v=20260907-audit1"></script>
<script defer src="/js/main.js?v=20260907-audit1"></script>
<script defer src="/js/search-ui.js?v=20260907-audit1"></script>
<script defer src="/js/product.js?v=20260907-shipping1"></script>
<script defer src="/js/reviews.js?v=20260906-seo1"></script>

<div class="float-actions">
  <a class="float-btn whatsapp" href="https://wa.me/923288691979" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
    <span class="float-tooltip">Chat on WhatsApp</span>
    <svg viewBox="0 0 32 32" fill="currentColor"><path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.362.687 4.564 1.872 6.418L4 29l7.771-1.83A11.93 11.93 0 0 0 16.001 27C22.63 27 28 21.627 28 15S22.63 3 16.001 3zm0 21.6a9.55 9.55 0 0 1-4.87-1.34l-.35-.207-4.61 1.086 1.104-4.49-.228-.362A9.56 9.56 0 1 1 25.56 15a9.56 9.56 0 0 1-9.559 9.6zm5.24-7.152c-.287-.144-1.698-.838-1.961-.934-.263-.096-.454-.144-.646.144-.191.288-.742.934-.91 1.126-.168.192-.335.216-.622.072-.287-.144-1.212-.447-2.309-1.427-.854-.762-1.43-1.703-1.598-1.991-.168-.288-.018-.443.126-.587.13-.129.287-.336.43-.504.144-.168.192-.288.287-.48.096-.192.048-.36-.024-.504-.072-.144-.646-1.559-.885-2.135-.233-.56-.47-.484-.646-.493l-.55-.01c-.192 0-.504.072-.767.36-.263.288-1.004.981-1.004 2.393 0 1.412 1.028 2.776 1.171 2.968.144.192 2.024 3.09 4.905 4.334.685.296 1.22.473 1.637.605.688.219 1.314.188 1.809.114.552-.082 1.698-.694 1.938-1.364.24-.67.24-1.244.168-1.364-.072-.12-.263-.192-.55-.336z"/></svg>
  </a>
  <a class="float-btn instagram" href="https://www.instagram.com/thelabelbyzare/" target="_blank" rel="noopener" aria-label="Follow on Instagram">
    <span class="float-tooltip">Follow on Instagram</span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>
  </a>
</div>

</body>
</html>`;
}

exports.handler = async (event) => {
  try {
    const { id, requestedSlug } = parseRequest(event);
    if (!id) {
      return { statusCode: 404, headers: { "Content-Type":"text/html; charset=utf-8" }, body: notFoundPage() };
    }

    const [p, rating, siteSettings] = await Promise.all([fetchProduct(id), fetchReviewStats(id), fetchSiteSettings()]);
    const activePolicy = policyFromSettings(siteSettings);
    if (!p) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
        body: notFoundPage(),
      };
    }

    const query=event.queryStringParameters || {};
    if((query.size && !p.sizes.includes(query.size)) || (query.color && !p.colors.some(c=>c.name===query.color)))return {statusCode:404,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"},body:notFoundPage()};
    const canonicalSlug = slugify(p.name);
    // Self-heal: any URL that isn't already on its canonical slug (the
    // legacy ?id= form, a stale slug after a rename, a typo'd slug)
    // 301s to the correct one. This is the single most important thing
    // for avoiding duplicate-content dilution across product URLs.
    if (requestedSlug !== canonicalSlug) {
      return {
        statusCode: 301,
        headers: { Location: `/product/${canonicalSlug}/${encodeURIComponent(p.id)}`+(() => {const params=new URLSearchParams(query);params.delete("id");return params.size?"?"+params.toString():"";})() },
        body: "",
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ...publicPageHeaders(),
      },
      body: renderPage(p, rating, activePolicy, event.queryStringParameters || {}, siteSettings),
    };
  } catch (err) {
    return {
      statusCode: 503,
      headers: { "Content-Type":"text/plain; charset=utf-8", "Cache-Control":"no-store", "Retry-After":"60" },
      body: "We couldn’t load this piece just now. Please try again shortly.",
    };
  }
};
