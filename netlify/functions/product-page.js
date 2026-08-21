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

   netlify.toml routes both the new path form and the legacy
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
  if (i !== -1 && parts.length >= i + 3) {
    return { id: decodeURIComponent(parts[i + 2]), requestedSlug: decodeURIComponent(parts[i + 1]) };
  }
  // Legacy scheme: /product?id=<id>  (netlify.toml forwards this here too)
  const id = event.queryStringParameters && event.queryStringParameters.id;
  return { id: id || null, requestedSlug: null };
}

async function fetchProduct(id) {
  const url = `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=*&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return (rows && rows[0]) || null;
}

// Real customer ratings only — never a fabricated or placeholder value.
// Mirrors the same average computed client-side in js/reviews.js so the
// server-rendered schema always agrees with what the page later shows.
async function fetchReviewStats(id) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/product_reviews?product_id=eq.${encodeURIComponent(id)}&select=rating`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) return { value: 0, count: 0 };
    const rows = await res.json();
    const count = Array.isArray(rows) ? rows.length : 0;
    const value = count ? rows.reduce((s, r) => s + Number(r.rating || 0), 0) / count : 0;
    return { value, count };
  } catch (e) {
    return { value: 0, count: 0 };
  }
}

function notFoundPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Product Not Found | ${SITE_NAME}</title>
<meta name="robots" content="noindex, follow">
<meta http-equiv="refresh" content="3;url=/shop">
</head>
<body>
<p>This product is no longer available. Redirecting to the <a href="/shop">full collection</a>…</p>
</body>
</html>`;
}

function buildFullGallery(p) {
  const raw = [p.img, p.img2, ...(Array.isArray(p.gallery) ? p.gallery : [])];
  const seen = new Set();
  const clean = [];
  for (const src of raw) {
    if (typeof src === "string" && src.trim() && !seen.has(src)) {
      seen.add(src);
      clean.push(src);
    }
  }
  return clean.length ? clean : [DEFAULT_IMAGE];
}

function renderPage(p, rating) {
  const name = p.name || "Abaya";
  const category = p.category || "Abaya";
  const gallery = buildFullGallery(p);
  const img = gallery[0];
  const description = p.description || `${name} — premium ${category} abaya by ${SITE_NAME}. Considered construction, nationwide delivery across Pakistan.`;
  const inStock = p.in_stock !== false;
  const slug = slugify(name);
  const canonicalPath = `/product/${slug}/${encodeURIComponent(p.id)}`;
  const canonical = `${SITE_URL}${canonicalPath}`;
  const title = `${name} — Buy Online | ${SITE_NAME}`;
  const metaDescription = truncate(`${name} — ${category} abaya by ${SITE_NAME}. ${description} Shop abayas online.`, 160);
  const priceText = formatPKR(p.price);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image: gallery,
    sku: p.id,
    brand: { "@type": "Brand", name: SITE_NAME },
    category,
    offers: {
      "@type": "Offer",
      url: canonical,
      priceCurrency: "PKR",
      price: p.price,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
  if (rating && rating.count > 0) {
    productSchema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Math.round(rating.value * 10) / 10,
      reviewCount: rating.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Shop Abayas Online", item: `${SITE_URL}/shop` },
      { "@type": "ListItem", position: 3, name: category, item: `${SITE_URL}/shop?cat=${encodeURIComponent(category)}` },
      { "@type": "ListItem", position: 4, name, item: canonical },
    ],
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(metaDescription)}">
<meta name="keywords" content="buy abayas online, ${escapeHtml(category.toLowerCase())} abaya, ${escapeHtml(name.toLowerCase())}, abayas online Pakistan, luxury abaya, modest wear">
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
<script type="application/ld+json">${JSON.stringify(productSchema)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://ldpzgtjbnbdsggaqmuvs.supabase.co">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Manrope:wght@300;400;500;600;700;800&display=swap">
<link rel="stylesheet" href="/css/style.css">
</head>
<body>

<div class="grain"></div>

<nav class="site-nav is-dark scrolled" id="site-nav">
  <div class="wrap">
    <a href="/" class="nav-logo"><img src="/images/logo-mark.jpg" alt="Label by Zare logo" width="44" height="44">LABEL <span>by</span> ZARE</a>
    <ul class="nav-links">
      <li><a href="/">Home</a></li>
      <li><a href="/shop">Collection</a></li>
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
      <button class="nav-burger" aria-label="Menu"><span></span><span></span><span></span></button>
    </div>
  </div>
</nav>

<div class="mobile-menu">
  <div class="eyebrow">Menu</div>
  <div class="mobile-menu-quick">
    <a href="/account" class="mobile-quick-btn" aria-label="Account"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"/></svg><span>Account</span></a>
    <a href="/wishlist" class="mobile-quick-btn" aria-label="Wishlist"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20.5s-7.5-4.6-10-9.3C.5 8 2 4.5 5.5 4c2-.3 3.7.6 4.9 2.2C11.7 4.7 13.3 3.8 15.5 4c3.5.5 5 4 3.5 7.2-2.5 4.7-10 9.3-10 9.3Z"/></svg><span>Wishlist</span><span class="badge js-wish-count">0</span></a>
    <a href="/track-order" class="mobile-quick-btn" aria-label="Track Order"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18l-1.5 12.5a2 2 0 0 1-2 1.5H6.5a2 2 0 0 1-2-1.5L3 6Z"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg><span>Track Order</span></a>
    <a href="/cart" class="mobile-quick-btn" aria-label="Cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg><span>Bag</span><span class="badge js-cart-count">0</span></a>
  </div>
  <ul class="mobile-menu-primary">
    <li><a href="/">Home</a></li>
    <li><a href="/shop">Collection</a></li>
    <li><a href="/new-arrivals">New Arrivals</a></li>
    <li><a href="/sale">Sale</a></li>
    <li><a href="/about">About</a></li>
  </ul>
  <div class="mobile-menu-secondary">
    <div><h5>Support</h5><ul><li><a href="/track-order">Track Order</a></li><li><a href="/support#size-guide">Size Guide</a></li><li><a href="/support#shipping-returns">Shipping &amp; Returns</a></li><li><a href="/support#faqs">FAQs</a></li></ul></div>
    <div><h5>About</h5><ul><li><a href="/about">Our Story</a></li><li><a href="/about#values">Craftsmanship</a></li><li><a href="/about">Sustainability</a></li><li><a href="/contact">Contact</a></li></ul></div>
  </div>
  <div class="mobile-menu-bottom">&copy; 2026 Label by Zare. All rights reserved.</div>
</div>

<div class="search-overlay">
  <div class="search-top">
    <input type="text" placeholder="Search for abayas, collections…" aria-label="Search">
    <button class="search-close" aria-label="Close search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
  </div>
  <div class="search-body">
    <p class="search-hint">Try &ldquo;Noir Luxe&rdquo;, &ldquo;Evening&rdquo;, or &ldquo;Sale&rdquo;.</p>
    <div class="search-results"></div>
  </div>
</div>

<div class="cart-drawer-backdrop"></div>
<div class="cart-drawer">
  <div class="drawer-head"><h3 class="serif">Your Bag</h3><button class="js-close-drawer nav-icon-btn" aria-label="Close bag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
  <div class="drawer-body"></div>
  <div class="drawer-foot"></div>
</div>

<main class="wrap pdp" id="pdp-root">
  <!-- Server-rendered so crawlers/link-preview bots see real content
       immediately. js/product.js hydrates over this with the full
       interactive gallery, size/colour selectors and cart controls. -->
  <nav class="pdp-breadcrumb" aria-label="Breadcrumb" style="grid-column:1/-1;font-size:.8rem;color:var(--taupe);margin-bottom:.6rem">
    <a href="/">Home</a> &rsaquo; <a href="/shop">Shop Abayas Online</a> &rsaquo; <a href="/shop?cat=${encodeURIComponent(category)}">${escapeHtml(category)}</a> &rsaquo; <span aria-current="page">${escapeHtml(name)}</span>
  </nav>
  <div class="pdp-gallery reveal">
    <div class="pdp-main-img"><img src="${escapeHtml(img)}" alt="${escapeHtml(name)}" onerror="this.onerror=null;this.src='${escapeHtml(DEFAULT_IMAGE)}';"></div>
  </div>
  <div class="pdp-info reveal">
    <div class="cat-label">${escapeHtml(category)}${p.is_new ? " · New Arrival" : ""}</div>
    <h1 class="serif">${escapeHtml(name)}</h1>
    <div class="pdp-price">
      ${p.old_price ? `<span class="price-old">${formatPKR(p.old_price)}</span>` : ""}
      <span class="${p.is_sale ? "price-sale" : ""}">${priceText}</span>
    </div>
    <p class="lede">${escapeHtml(description)}</p>
    <div class="pdp-stock ${inStock ? "" : "out"}">${inStock ? "In Stock" : "Sold Out"}</div>
    <p class="pdp-note">Free nationwide delivery on orders over PKR 15,000 — Karachi, Lahore, Islamabad and across Pakistan.</p>
  </div>
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
        <p style="max-width:32ch;color:var(--beige)">Considered abayas for the modern woman — cut with intention, worn with quiet confidence.</p>
      </div>
      <div><h4>Shop</h4><ul><li><a href="/shop">Collection</a></li><li><a href="/new-arrivals">New Arrivals</a></li><li><a href="/sale">Sale</a></li><li><a href="/wishlist">Wishlist</a></li><li><a href="/reviews">Reviews</a></li></ul></div>
      <div><h4>About</h4><ul><li><a href="/about">Our Story</a></li><li><a href="/about#values">Craftsmanship</a></li><li><a href="/about">Sustainability</a></li><li><a href="/contact">Contact</a></li></ul></div>
      <div><h4>Support</h4><ul><li><a href="/track-order">Track Order</a></li><li><a href="/support#size-guide">Size Guide</a></li><li><a href="/support#shipping-returns">Shipping &amp; Returns</a></li><li><a href="/support#faqs">FAQs</a></li></ul></div>
    </div>
    <div class="footer-bottom">
      <span>&copy; 2026 Label by Zare. All rights reserved.</span>
      <span>Designed for the modern abaya wardrobe.</span>
      <span><a href="/sitemap.html" style="color:inherit">Full Product Index</a></span>
    </div>
  </div>
</footer>

<div class="toast"><span class="dot"></span><span class="toast-msg"></span></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="https://unpkg.com/lenis@1.1.13/dist/lenis.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="/supabase-client.js"></script>
<script src="/js/seo.js"></script>
<script src="/js/data.js"></script>
<script src="/js/cart.js"></script>
<script src="/js/customer-auth.js"></script>
<script src="/js/main.js"></script>
<script src="/js/product.js"></script>
<script src="/js/reviews.js"></script>

<div class="float-actions">
  <a class="float-btn whatsapp" href="https://wa.me/923288691979" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
    <span class="float-tooltip">Chat on WhatsApp</span>
    <svg viewBox="0 0 32 32" fill="currentColor"><path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.362.687 4.564 1.872 6.418L4 29l7.771-1.83A11.93 11.93 0 0 0 16.001 27C22.63 27 28 21.627 28 15S22.63 3 16.001 3zm0 21.6a9.55 9.55 0 0 1-4.87-1.34l-.35-.207-4.61 1.086 1.104-4.49-.228-.362A9.56 9.56 0 1 1 25.56 15a9.56 9.56 0 0 1-9.559 9.6zm5.24-7.152c-.287-.144-1.698-.838-1.961-.934-.263-.096-.454-.144-.646.144-.191.288-.742.934-.91 1.126-.168.192-.335.216-.622.072-.287-.144-1.212-.447-2.309-1.427-.854-.762-1.43-1.703-1.598-1.991-.168-.288-.018-.443.126-.587.13-.129.287-.336.43-.504.144-.168.192-.288.287-.48.096-.192.048-.36-.024-.504-.072-.144-.646-1.559-.885-2.135-.233-.56-.47-.484-.646-.493l-.55-.01c-.192 0-.504.072-.767.36-.263.288-1.004.981-1.004 2.393 0 1.412 1.028 2.776 1.171 2.968.144.192 2.024 3.09 4.905 4.334.685.296 1.22.473 1.637.605.688.219 1.314.188 1.809.114.552-.082 1.698-.694 1.938-1.364.24-.67.24-1.244.168-1.364-.072-.12-.263-.192-.55-.336z"/></svg>
  </a>
  <a class="float-btn instagram" href="https://www.instagram.com/thelabelbyzare?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener" aria-label="Follow on Instagram">
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
      return { statusCode: 302, headers: { Location: "/shop" }, body: "" };
    }

    const [p, rating] = await Promise.all([fetchProduct(id), fetchReviewStats(id)]);
    if (!p) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
        body: notFoundPage(),
      };
    }

    const canonicalSlug = slugify(p.name);
    // Self-heal: any URL that isn't already on its canonical slug (the
    // legacy ?id= form, a stale slug after a rename, a typo'd slug)
    // 301s to the correct one. This is the single most important thing
    // for avoiding duplicate-content dilution across product URLs.
    if (requestedSlug !== canonicalSlug) {
      return {
        statusCode: 301,
        headers: { Location: `/product/${canonicalSlug}/${encodeURIComponent(p.id)}` },
        body: "",
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=3600",
      },
      body: renderPage(p, rating),
    };
  } catch (err) {
    return {
      statusCode: 302,
      headers: { Location: "/shop" },
      body: "",
    };
  }
};
