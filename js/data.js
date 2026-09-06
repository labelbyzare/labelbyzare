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
  shipping: "Orders are processed within 1–2 business days. Standard delivery takes 3–5 business days nationwide; express delivery arrives in 1–2 business days in major cities.",
  returns: "Unworn pieces with tags attached may be returned within 7 days of delivery for a full refund or exchange."
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
      PRODUCTS = data.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    productType: LZProductTypes.key(p),
    price: p.price,
    oldPrice: p.old_price,
    isNew: p.is_new,
    isSale: p.is_sale,
    isFeatured: p.is_featured === true,
    isBestseller: p.is_bestseller === true,
    inStock: p.in_stock,
    colors: (p.colors && p.colors.length) ? p.colors : [{ name: "Default", hex: "#c2b09c" }],
    sizes: (p.sizes && p.sizes.length) ? p.sizes : ["One Size"],
    img: p.img || "",
    img2: p.img2 || p.img || "",
    gallery: (p.gallery && p.gallery.length) ? p.gallery : (p.img ? [p.img] : []),
    description: p.description || "",
    fabric: p.fabric || "",
    shipping: p.shipping || "",
    returns: p.returns || "",
      }));
      window.PRODUCTS = PRODUCTS;
      return PRODUCTS;
    } catch (error) {
      console.error("Failed to load products:", error.message || "Request unavailable");
      window.PRODUCTS_LOAD_ERROR = error;
      PRODUCTS = [];
      window.PRODUCTS = PRODUCTS;
      return PRODUCTS;
    } finally {
      clearTimeout(timeout);
    }
  })().finally(() => { productsRequest = null; });
  window.PRODUCTS_READY = productsRequest;
  return productsRequest;
};

window.PRODUCTS_READY = window.loadProducts();

/* Helper accessors used across pages */
function getProductById(id){ return PRODUCTS.find(p => p.id === id); }
function formatPKR(n){ return "PKR " + n.toLocaleString("en-PK"); }

/* ==========================================================================
   SEO-FRIENDLY PRODUCT URLS
   Product links use a keyword-rich slug + the product's real id:
     /product/silk-kaftan-abaya/<id>
   The slug carries the search-relevant keywords in the URL itself (a real
   ranking signal query-string URLs don't get); the id after it is what
   actually looks the product up, so slugs never need to be unique on
   their own and old links never break even if a name changes.
   Used everywhere a product link is built (cards, search, cart, related,
   reviews, sitemap) so there is exactly one place this logic lives.
   ========================================================================== */
function slugify(text){
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "abaya";
}
function productUrl(p){
  if(!p || !p.id) return "/shop";
  return `/product/${slugify(p.name)}/${encodeURIComponent(p.id)}`;
}
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
function isInStock(p){ return !!p && p.inStock !== false; }

/* Shipping / Returns text helpers — use the product's own text if set,
   otherwise fall back to the site-wide SHOP_DEFAULTS text above. */
function getShippingText(p){ return (p && p.shipping) ? p.shipping : SHOP_DEFAULTS.shipping; }
function getReturnsText(p){ return (p && p.returns) ? p.returns : SHOP_DEFAULTS.returns; }
