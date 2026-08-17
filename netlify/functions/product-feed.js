/* ==========================================================================
   LABEL BY ZARE — GOOGLE MERCHANT CENTER PRODUCT FEED
   ==========================================================================
   Outputs an RSS 2.0 + g: namespace feed (the standard Google Shopping feed
   format) built live from the same Supabase "products" table that already
   powers sitemap-products.js and product-page.js. Point Merchant Center's
   "Scheduled fetch" at this function's URL and it stays in sync automatically
   — no manual re-uploads.

   Field choices, explained:
   - identifier_exists: "no" on every item, because these are Label by Zare's
     own-label products with no GTIN/MPN — this is the correct, Google-
     sanctioned way to avoid "missing identifier" disapprovals for private
     label goods (see: Merchant Center help > "identifier_exists").
   - brand is hardcoded to "Label by Zare" — matches the brand used in the
     Product JSON-LD in product-page.js, so structured data and feed agree.
   - link uses the exact same slug+id URL scheme as product-page.js and
     data.js's productUrl(), so Merchant Center always points at the live,
     server-rendered product page.
   - google_product_category is left as a placeholder string — Google's
     taxonomy IDs change over time; pick the right one for "Dresses" or
     modest wear at https://support.google.com/merchants/answer/6324436
     and hardcode the numeric ID once decided (faster + more precise than
     the text version).
   ========================================================================== */

const SUPABASE_URL = "https://ldpzgtjbnbdsggaqmuvs.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_DG3Iar3m4BUg72fUWPyLag_XMyHfLWs";
const SITE_URL = "https://labelbyzare.com";
const SITE_NAME = "Label by Zare";
const DEFAULT_IMAGE = `${SITE_URL}/images/logo.jpg`;

// Keep in sync with js/data.js (window.slugify) and
// netlify/functions/product-page.js — same slug rule everywhere.
function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "abaya";
}

function escapeXml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function productUrl(p) {
  return `${SITE_URL}/product/${slugify(p.name)}/${encodeURIComponent(p.id)}`;
}

async function fetchAllProducts() {
  const url = `${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase request failed: ${res.status}`);
  return res.json();
}

function buildItem(p) {
  const name = p.name || "Abaya";
  const category = p.category || "Abaya";
  const gallery = (p.gallery && p.gallery.length) ? p.gallery : (p.img ? [p.img] : [DEFAULT_IMAGE]);
  const mainImage = p.img || gallery[0] || DEFAULT_IMAGE;
  const extraImages = gallery.filter((img) => img && img !== mainImage).slice(0, 10);
  const description = p.description
    || `${name} — premium ${category} abaya by ${SITE_NAME}. Considered construction, nationwide delivery across Pakistan.`;
  const inStock = p.in_stock !== false;
  const link = productUrl(p);
  const price = Number(p.price) || 0;
  const oldPrice = Number(p.old_price) || 0;

  let xml = "";
  xml += `  <item>\n`;
  xml += `    <g:id>${escapeXml(p.id)}</g:id>\n`;
  xml += `    <title>${escapeXml(name)}</title>\n`;
  xml += `    <description>${escapeXml(description)}</description>\n`;
  xml += `    <link>${escapeXml(link)}</link>\n`;
  xml += `    <g:image_link>${escapeXml(mainImage)}</g:image_link>\n`;
  extraImages.forEach((img) => {
    xml += `    <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>\n`;
  });
  xml += `    <g:availability>${inStock ? "in_stock" : "out_of_stock"}</g:availability>\n`;
  const onSale = p.is_sale && oldPrice > price;
  // g:price is always the regular (non-discounted) price. When an item is
  // on sale, that's old_price, and the discounted price goes in g:sale_price
  // instead — Google requires sale_price to be strictly lower than price,
  // so these two must never be the same number.
  xml += `    <g:price>${(onSale ? oldPrice : price).toFixed(2)} PKR</g:price>\n`;
  if (onSale) {
    xml += `    <g:sale_price>${price.toFixed(2)} PKR</g:sale_price>\n`;
  }
  xml += `    <g:condition>new</g:condition>\n`;
  xml += `    <g:brand>${escapeXml(SITE_NAME)}</g:brand>\n`;
  xml += `    <g:identifier_exists>no</g:identifier_exists>\n`;
  // TODO: replace with the exact numeric Google taxonomy ID for your
  // category (see file header comment) once you've picked it.
  xml += `    <g:google_product_category>Apparel &amp; Accessories &gt; Clothing &gt; Dresses</g:google_product_category>\n`;
  xml += `    <g:product_type>${escapeXml(category)}</g:product_type>\n`;
  xml += `    <g:shipping>\n`;
  xml += `      <g:country>PK</g:country>\n`;
  xml += `      <g:service>Standard</g:service>\n`;
  xml += `      <g:price>0.00 PKR</g:price>\n`;
  xml += `    </g:shipping>\n`;
  xml += `  </item>\n`;
  return xml;
}

exports.handler = async () => {
  try {
    const products = await fetchAllProducts();
    const items = (products || []).map(buildItem).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
  <title>${escapeXml(SITE_NAME)} — Product Feed</title>
  <link>${SITE_URL}</link>
  <description>${escapeXml(SITE_NAME)} product feed for Google Merchant Center</description>
${items}</channel>
</rss>`;

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
      statusCode: 500,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
      body: `<?xml version="1.0" encoding="UTF-8"?><error>${escapeXml(err.message)}</error>`,
    };
  }
};
