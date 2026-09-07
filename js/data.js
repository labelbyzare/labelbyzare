/* ==========================================================================
   LABEL BY ZARE — PRODUCT DATA
   Products now come from Supabase (managed via admin.html) instead of
   being hardcoded here. This file fetches them and exposes the same
   PRODUCTS array + helper functions the rest of the site already uses.

   IMPORTANT: this file must load AFTER the Supabase CDN script and
   supabase-client.js, since it needs `supabaseClient` to already exist.

   Because fetching happens over the network, PRODUCTS isn't filled in
   the instant this file runs — code that needs to wait for it uses
   `window.PRODUCTS_READY` (a Promise) instead of assuming PRODUCTS is
   already populated.
   ========================================================================== */

let PRODUCTS = [];

/* Site-wide fallback text for Shipping & Returns.
   Used automatically for any product that doesn't set its own "shipping"
   or "returns" text. Edit here to change the copy everywhere at once. */
const SHOP_DEFAULTS = {
  get shipping(){ return LZPolicy.shippingText; },
  get returns(){ return LZPolicy.returnsText; }
};

window.PRODUCTS = PRODUCTS;
window.PRODUCTS_LOAD_ERROR = null;
let productsRequest = null;

// Page through the catalog so a growing collection is never silently truncated.
// A retry reuses this loader; the cart, search and product pages keep the same API.
window.loadProducts = function () {
  if (productsRequest) return productsRequest;
  productsRequest = (async () => {
    window.PRODUCTS_LOAD_ERROR = null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const data = [];
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        const { data: page, error } = await supabaseClient
          .from("products")
          .select("*")
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
          .range(offset, offset + pageSize - 1)
          .abortSignal(controller.signal);
        if (error) throw error;
        data.push(...(page || []));
        if (!page || page.length < pageSize) break;
      }
      PRODUCTS = data.map(LZCatalog.normalize);
      window.PRODUCTS = PRODUCTS;
      window.CATALOG_COMPLETE = true;
      window.dispatchEvent(new CustomEvent("lz:catalog-ready"));
      return PRODUCTS;
    } catch (error) {
      console.error("Failed to load products:", error.message || "Request unavailable");
      window.PRODUCTS_LOAD_ERROR = error;
      window.PRODUCTS = PRODUCTS;
      window.CATALOG_COMPLETE = false;
      return PRODUCTS;
    } finally {
      clearTimeout(timeout);
    }
  })().finally(() => { productsRequest = null; });
  window.PRODUCTS_READY = productsRequest;
  return productsRequest;
};

const initialCatalog = document.getElementById("lz-catalog-data");
window.CATALOG_COMPLETE = initialCatalog?.dataset.complete === "true";
let validInitialCatalog = false;
if(initialCatalog){
  try { PRODUCTS = JSON.parse(initialCatalog.textContent).map(LZCatalog.normalize); window.PRODUCTS = PRODUCTS; validInitialCatalog = true; }
  catch { PRODUCTS = []; window.PRODUCTS = PRODUCTS; }
}
window.PRODUCTS_READY = validInitialCatalog ? Promise.resolve(PRODUCTS) : window.loadProducts();
window.ensureFullCatalog = () => window.CATALOG_COMPLETE ? Promise.resolve(PRODUCTS) : window.loadProducts();

/* Helper accessors used across pages */
function getProductById(id){ return PRODUCTS.find(p => p.id === id); }
function formatPKR(n){ return LZCatalog.money(n); }

/* ==========================================================================
   SEO-FRIENDLY PRODUCT URLS
   Product links use a keyword-rich slug + the product's real id:
     /product/silk-kaftan-abaya/<id>
   The descriptive slug keeps shared links readable; the id after it is what
   actually looks the product up, so slugs never need to be unique on
   their own and old links never break even if a name changes.
   Used everywhere a product link is built (cards, search, cart, related,
   reviews, sitemap) so there is exactly one place this logic lives.
   ========================================================================== */
function slugify(text){ return LZCatalog.slug(text); }
function productUrl(p){ return LZCatalog.productUrl(p); }
/* Reads the product id off the current URL — supports the new
   /product/<slug>/<id> path as well as the legacy /product?id=<id>
   query form, so any old bookmarked or shared links keep working. */
function getProductIdFromLocation(){
  const params = new URLSearchParams(location.search);
  if(params.get("id")) return params.get("id");
  const parts = location.pathname.split("/").filter(Boolean);
  const i = parts.indexOf("product");
  if(i !== -1 && parts.length >= i + 3) return decodeURIComponent(parts[i + 2]);
  return null;
}

/* Stock helper — a product with inStock left unset defaults to true (in stock) */
function isInStock(p){ return LZCatalog.stocked(p) && Number(p.price)>0; }

/* Shipping / Returns text helpers — use the product's own text if set,
   otherwise fall back to the site-wide SHOP_DEFAULTS text above. */
function getShippingText(p){ return SHOP_DEFAULTS.shipping; }
function getReturnsText(p){ return (p && p.returns) ? p.returns : SHOP_DEFAULTS.returns; }
