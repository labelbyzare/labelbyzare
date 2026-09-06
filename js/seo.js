/* ==========================================================================
   LABEL BY ZARE — SEO
   Meta tags, Open Graph, Twitter cards, canonical URLs, and JSON-LD schema.
   ========================================================================== */

window.LZSEO = (() => {
  const SITE = {
    name: "Label by Zare",
    url: "https://labelbyzare.com",
    logo: "https://labelbyzare.com/images/logo.jpg",
    defaultImage: "https://labelbyzare.com/images/logo.jpg",
    locale: "en_PK",
    country: "PK",
    currency: "PKR",
    whatsapp: "+923288691979",
    instagram: "https://www.instagram.com/thelabelbyzare",
  };

  const KEYWORDS =
    "abayas online, buy abayas online, online abaya shop, luxury abayas Pakistan, modest wear, designer abayas, kaftan abaya, prayer abaya, abaya shop Karachi, abaya delivery Pakistan";

  function upsertMeta(attr, key, content) {
    if (!content) return;
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }

  function upsertLink(rel, href) {
    if (!href) return;
    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", rel);
      document.head.appendChild(el);
    }
    el.setAttribute("href", href);
  }

  function truncate(text, max = 155) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (clean.length <= max) return clean;
    return clean.slice(0, max - 1).trim() + "…";
  }

  function absoluteUrl(path) {
    if (!path) return SITE.url;
    if (/^https?:\/\//i.test(path)) return path;
    return `${SITE.url}/${String(path).replace(/^\/+/, "")}`;
  }

  // Path/URL builders for a product delegate to the global slug helper in
  // data.js (window.productUrl / window.slugify), which is the single
  // source of truth for the /product/<slug>/<id> URL scheme. Both take
  // the full product object (not just an id) so the slug can be built.
  function productPath(p) {
    return window.productUrl ? window.productUrl(p) : `/product?id=${encodeURIComponent(p && p.id)}`;
  }

  function productUrl(p) {
    return absoluteUrl(productPath(p));
  }

  function slugify(text) {
    return window.slugify ? window.slugify(text) : String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  function setJsonLd(data, id = "lz-jsonld") {
    const prev = document.getElementById(id);
    if (prev) prev.remove();
    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  function appendJsonLd(data, id) {
    setJsonLd(data, id);
  }

  function setPageMeta({
    title,
    description,
    canonical,
    image = SITE.defaultImage,
    type = "website",
    robots = "index, follow, max-image-preview:large",
    keywords = KEYWORDS,
  }) {
    if (title) document.title = title;
    upsertMeta("name", "description", description);

    upsertMeta("name", "robots", robots);
    upsertLink("canonical", canonical);

    upsertMeta("property", "og:site_name", SITE.name);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", absoluteUrl(image));
    upsertMeta("property", "og:locale", SITE.locale);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", absoluteUrl(image));
  }

  function organizationSchema(){ return LZSchema.organization(); }
  function websiteSchema(){ return LZSchema.website(); }
  function breadcrumbSchema(items){ return LZSchema.breadcrumbs(items,location.pathname); }
  function productSchema(p,rating){ return LZSchema.product(p,rating); }

  // Called by reviews.js once it has fetched a product's real reviews and
  // computed the visible average — patches aggregateRating into the
  // already-set Product JSON-LD without needing to re-run productSchema().
  function setProductAggregateRating(ratingValue, reviewCount) {
    const el = document.getElementById("lz-product-schema");
    if (!el) return;
    try {
      const data = JSON.parse(el.textContent);
      if (Number.isInteger(reviewCount) && reviewCount > 0 && Number.isFinite(ratingValue) && ratingValue >= 1 && ratingValue <= 5) {
        data.aggregateRating = {
          "@type": "AggregateRating",
          ratingValue: Math.round(ratingValue * 10) / 10,
          reviewCount: reviewCount,
          bestRating: 5,
          worstRating: 1,
        };
      } else {
        delete data.aggregateRating;
      }
      el.textContent = JSON.stringify(data);
    } catch (e) {
      /* malformed existing JSON-LD — leave it untouched */
    }
  }

  function itemListSchema(products, listName, pageUrl) {
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: listName,
      url: absoluteUrl(pageUrl),
      numberOfItems: products.length,
      itemListElement: products.slice(0, 48).map((p, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: productUrl(p),
        name: p.name,
      })),
    };
  }

  function faqSchema(faqs) {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    };
  }

  function applyProduct(p) {
    const title = `${p.name} — Buy Online | ${SITE.name}`;
    const description = truncate(
      `${p.name} — ${LZProductTypes.singular(p)} by ${SITE.name}. ${p.description || "Premium fabric, considered construction, nationwide delivery across Pakistan."}`,
      160
    );
    const canonical = productUrl(p);

    setPageMeta({
      title,
      description,
      canonical,
      image: p.img || SITE.defaultImage,
      type: "product",
    });

    setJsonLd(productSchema(p), "lz-product-schema");
    appendJsonLd(LZSchema.productBreadcrumbs(p), "lz-breadcrumb-schema");
    appendJsonLd(organizationSchema(), "lz-org-schema");
  }

  function applyItemList(products, listName, pageUrl) {
    if (!products.length) return;
    appendJsonLd(itemListSchema(products, listName, pageUrl), "lz-itemlist-schema");
  }

  function injectHomeSchema() {
    appendJsonLd(organizationSchema(), "lz-org-schema");
    appendJsonLd(websiteSchema(), "lz-website-schema");
    document.getElementById("lz-store-schema")?.remove();
  }

  function injectSupportFaqSchema() {}

  return {
    SITE,
    KEYWORDS,
    truncate,
    absoluteUrl,
    productPath,
    productUrl,
    slugify,
    setPageMeta,
    setJsonLd,
    appendJsonLd,
    organizationSchema,
    websiteSchema,
    productSchema,
    setProductAggregateRating,
    itemListSchema,
    breadcrumbSchema,
    faqSchema,
    applyProduct,
    applyItemList,
    injectHomeSchema,
    injectSupportFaqSchema,
  };
})();
