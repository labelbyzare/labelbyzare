// products-supabase.js
// Include this AFTER supabase-client.js on shop.html and product.html.
// It fetches products from Supabase and builds the same PRODUCTS array
// shape your site's existing code already expects (matching data.js).
//
// Because fetching is asynchronous, this exposes a Promise called
// PRODUCTS_READY. Any code that used to assume PRODUCTS was already
// filled in needs to wait for it — see integration notes below.

let PRODUCTS = [];

const PRODUCTS_READY = (async () => {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load products:", error.message);
    PRODUCTS = [];
    return PRODUCTS;
  }

  // Map Supabase's column names (snake_case) back to the shape
  // your existing site code expects (matching data.js).
  PRODUCTS = data.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    oldPrice: p.old_price,
    isNew: p.is_new,
    isSale: p.is_sale,
    inStock: p.in_stock,
    colors: p.colors || [],
    sizes: p.sizes || [],
    img: p.img,
    img2: p.img2,
    gallery: p.gallery || [],
    description: p.description,
    fabric: p.fabric,
    shipping: p.shipping,
    returns: p.returns,
  }));

  return PRODUCTS;
})();
