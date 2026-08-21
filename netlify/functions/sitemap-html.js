// netlify/functions/sitemap-html.js
// Human-readable + fully crawlable product index. Complements
// sitemap-products.xml (XML feeds aren't "referring pages" the same
// way a real linked HTML page is) and gives Googlebot a second,
// statically-linked path into every product URL.

const SUPABASE_URL = "https://ldpzgtjbnbdsggaqmuvs.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_DG3Iar3m4BUg72fUWPyLag_XMyHfLWs";
const SITE_URL = "https://labelbyzare.com";

// Must match slugify() in sitemap-products.js and product-page.js exactly,
// or these links won't match the canonical /product/<slug>/<id> URLs.
function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "abaya";
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

exports.handler = async () => {
  try {
    // Your `products` table has no `status`/`slug` columns — filtering on
    // `in_stock` is the closest equivalent to "active". Drop
    // `&in_stock=eq.true` from the URL below to list every product
    // regardless of stock status.
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=id,name&in_stock=eq.true&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    const products = await res.json();

    const items = (products || [])
      .map((p) => {
        const url = `${SITE_URL}/product/${slugify(p.name)}/${encodeURIComponent(p.id)}`;
        return `    <li><a href="${url}">${escapeHtml(p.name)}</a></li>`;
      })
      .join("\n");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Full Product Index | Label by Zare</title>
<meta name="description" content="Browse every abaya and product in the Label by Zare catalog.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${SITE_URL}/sitemap.html">
<link rel="stylesheet" href="/css/style.css">
</head>
<body style="padding:4rem 2rem;max-width:800px;margin:0 auto">
  <h1>Full Product Index</h1>
  <p><a href="/shop">&larr; Back to Shop</a></p>
  <ul>
${items}
  </ul>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
      body: html,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/plain" },
      body: "Sitemap temporarily unavailable",
    };
  }
};
