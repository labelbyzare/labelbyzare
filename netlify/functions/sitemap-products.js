/* Dynamic product sitemap — fetched from Supabase at request time. */

const SUPABASE_URL = "https://ldpzgtjbnbdsggaqmuvs.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_DG3Iar3m4BUg72fUWPyLag_XMyHfLWs";
const SITE_URL = "https://labelbyzare.com";

// Keep in sync with js/data.js (window.slugify) and
// netlify/functions/product-page.js — same slug rule everywhere so the
// sitemap always lists each product's real canonical URL.
function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "abaya";
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

exports.handler = async () => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=id,name,created_at&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Supabase request failed: ${res.status}`);
    }

    const products = await res.json();
    const urls = (products || [])
      .map((p) => {
        const lastmod = (p.created_at || new Date().toISOString()).slice(0, 10);
        const loc = `${SITE_URL}/product/${slugify(p.name)}/${encodeURIComponent(p.id)}`;
        return `  <url><loc>${escapeXml(loc)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.85</priority></url>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
      body: xml,
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
      body: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
    };
  }
};
