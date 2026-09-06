LABEL BY ZARE — UPDATED HOMEPAGE AND STOREFRONT

LATEST CHANGES
- Admin now has separate Abayas and Shawls tabs, each with its own product
  list, count, empty state and Add button. Add Shawl opens a shawl form;
  Add Abaya opens an abaya form. Saved products remain in the matching tab,
  and changing a product's type moves it to its new collection.
- The occasion-wear banner now uses the image assigned to the existing
  Emerald Green Abaya product (aby-002), with a direct product link.
  The portrait is shown fully instead of being cropped into a wide strip;
  on phones, the photograph and text stack vertically.
- The current catalog photos for Emerald Green Abaya look dark/charcoal.
  The banner uses that saved product image. Upload the correct green photo
  as the product's main image in admin and the homepage banner will follow
  it automatically. A 76,128-byte local copy is bundled as a fallback:
  images/occasion-emerald-abaya.jpg. It is copied without re-encoding, so
  the source image quality is preserved.
- Collection now opens separate Abayas and Shawls options in the desktop
  navigation and mobile menu. Selecting an option opens its collection tab.
  The menu supports keyboard use, Escape and dismissal when clicking outside.
- Search now ranks matches across product names, categories, colours,
  fabrics, descriptions and sizes. Multiple words can match different
  attributes, in any order (for example, "green abaya" or "silk shawl").
  Plurals and common terms such as grey/gray are normalized. Sale, New
  Arrivals, Best Sellers and Featured use the actual admin flags.
- When there are no direct matches, search checks common spelling mistakes
  and labels the results as "Closest matches". It does not invent products.
  The overlay and collection search URLs use the same matching rules.
- Search has suggestion buttons, a clear button, live result counts,
  loading/error/retry states, safe text rendering, and keyboard focus
  management. It waits briefly while typing and displays 12 results at a
  time; Show More makes every matching product accessible. Prices and
  sold-out status remain visible in the results.
- Mobile header spacing is corrected across the storefront. The wordmark
  and actions have separate grid columns; the brand can wrap neatly on
  narrow screens. Search, bag and menu have 44px tap targets. Account and
  wishlist are available in the existing mobile menu. Tablet widths also
  use the compact navigation layout.
- Full Collection now has two large Abayas / Shawls tabs in the site's
  cream, charcoal and gold palette, on the homepage and the retained /shop
  page. Tabs support keyboard navigation, live counts and direct links:
    /?type=abayas#collection
    /?type=shawls#collection
- Best Sellers and Featured Products accept both product types. When both
  types contain marked products, each showcase includes both types.
- The Label by Zare homepage loader is restored, with an animated wordmark,
  gold loading line and a gentle fade. It respects reduced motion and has
  time limits so a slow image or font cannot leave the page locked.
- The hero heading remains "MODEST WEAR," / "Label by Zare."
- Your supplied boutique photograph is the homepage hero.
- The image is lossless WebP at its original 1672 x 941 resolution.
  Original: 2,500,139 bytes. Optimized: 1,182,578 bytes (52.7% smaller).
  The original and optimized images decode to identical RGBA pixels.
  Hero file: images/hero-boutique.webp.
- Quick View on Collection, New Arrivals and Sale now sits inside the
  product photo. Wishlist's Add to Cart button uses the same corrected
  placement. Names and prices stay below the image, outside the action area.
- Price rows can wrap on narrower screens. Card actions are accessible by
  keyboard and appear on touch devices without requiring mouse hover.
- Gentle wheel and anchor scrolling now works across the storefront,
  including the homepage. The existing Lenis 1.1.13 dependency is retained.
  Only one animation clock runs. Touch devices retain native momentum,
  reduced-motion preferences disable animation, and scrollable overlays
  remain usable. Without Lenis, anchor scrolling uses the browser fallback.

HOMEPAGE COLLECTIONS
- The full live collection is on the homepage, with Abayas / Shawls tabs,
  category filters within each type,
  best seller / featured / new / sale edits, price sorting and search URLs.
- Best Sellers shows four products marked is_bestseller in your database.
- Featured Products shows two products marked is_featured in your database.
- The shop-all links open the matching edit in the full collection; use the
  Abayas / Shawls tabs to explore each type. Available products take priority
  within each type in the two showcases. The full collection
  still includes sold-out pieces, clearly labelled.
- Collection navigation leads to the homepage. The original /shop page is
  retained for bookmarks and existing links.

MANAGE YOUR HOMEPAGE EDITS
Open your existing admin page and choose the Abayas or Shawls tab.
Use Add Abaya / Add Shawl, or edit a product in that collection's list.
Choose Product Type: Abaya or Shawl. Add the real product name, images,
price, sizes, colours and stock status. A new shawl defaults to One Size;
you can replace this with its actual size options.

Use these checkboxes to include either type in the homepage showcases:
  Best Seller (homepage)
  Featured Product (homepage)
Save the product as usual. New Collection and On Sale also work for shawls
on the New Arrivals and Sale pages. Product pages, breadcrumbs, search and
feed descriptions use the correct type; shawls do not show the abaya size
guide or inherit the dress classification in the product feed.

Existing data remains compatible: Shawl products use the existing category
value "Shawls"; Abaya products retain their categories (Everyday, Occasion,
Kaftan, Prayer, etc.). No database migration is required.

The current catalog contains abayas only. No example shawl products, prices
or images have been published. Until you add shawls, their collection has a
designed "coming soon" state. Added shawls appear automatically; tick Best
Seller and/or Featured Product to place them in those homepage showcases.

UPLOAD
Replace the files in your existing site project with this folder's contents,
then redeploy through your usual Netlify workflow. Keep the css, js, images,
netlify/functions folders and netlify.toml together. The existing product
routes rely on your Netlify setup. This ZIP has not been deployed.

VERIFICATION
- 15 additional admin checks cover separate lists and counts, type-specific
  forms, saving and editing, moving products between collections, keyboard
  controls, failed requests, retries and catalog pagination. Writes were
  simulated locally; no live product data was changed.
- 70 catalog/homepage checks passed, including the existing functionality
  plus the occasion banner's current product image, link and image fallback.
- 48 additional checks cover search relevance, colour/fabric queries,
  spelling mistakes, homepage flags, loading and retry behavior, result
  pagination, safe text rendering, keyboard access and Collection menus.
- The previous 64 behavior checks passed again after the search update.
- 64 local behavior checks cover both product types, highlight selection,
  homepage and retained shop tab controls, New Arrivals / Sale filters,
  admin form behavior, loader timing and recovery, server metadata,
  product feed classification and image preservation.
  Synthetic shawls were used only in temporary local verification fixtures.
- Lossless image compression verified by comparing every decoded pixel.
- Previously verified Quick View placement is retained: image-area
  action placement, separate prices, valid links, and no nested controls.
- 10 scrolling behavior checks passed: one animation clock, anchor offset,
  immediate restoration, modal scroll lock, reduced-motion preference
  changes, native touch scrolling, and animation fallback.
- All 19 HTML pages, 24 JavaScript files, inline scripts, local assets,
  JSON-LD, tab/panel relationships and the approved hero content checked.
- Browser layout testing was unavailable for this static project.
- No live product, customer, order or payment data was modified.
