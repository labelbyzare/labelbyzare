/* ==========================================================================
   LABEL BY ZARE — PRODUCT DETAIL PAGE
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("pdp-root");
  if(!root) return;

  if(!document.getElementById("lz-catalog-data")) root.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Loading…</p></div>`;
  Promise.all([window.PRODUCTS_READY || Promise.resolve(), window.LZ_SETTINGS_READY || Promise.resolve()]).then(() => buildProductPage(root));
});

/* Merge the three separate image fields your admin panel writes
   (img, img2, gallery[]) into one deduped, validated list — the PDP used
   to render p.gallery alone, so a product whose Main/Secondary Image was
   never pushed into the gallery array (or whose gallery[0] pointed at a
   deleted/failed upload) showed a broken first thumbnail even though the
   Main Image itself was perfectly fine on the shop grid. */
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
  return clean.length ? clean : ["/images/logo.jpg"];
}

function buildProductPage(root){
  const e = LZCatalog.escape;
  const id = getProductIdFromLocation();
  const p = getProductById(id);
  if(!p){
    root.innerHTML = '<div class="empty-state"><h1>This piece is unavailable.</h1><p>' + (window.PRODUCTS_LOAD_ERROR ? 'Please try again shortly.' : 'Explore our current collection to find your next piece.') + '</p><a class="btn btn-outline" href="/collections/abayas/">Explore abayas</a></div>';
    return;
  }
  const collection = LZCollections.forProduct(p);
  p.gallery = buildFullGallery(p);

  // Self-heal the URL to its canonical slug (e.g. an old /product?id=xyz
  // link, or a stale/renamed slug) without a page reload, so anyone who
  // lands here shares/bookmarks the correct keyword-rich URL from now on.
  if(p && window.history && window.history.replaceState){
    const canonical = productUrl(p);
    if(location.pathname + location.search !== canonical){
      window.history.replaceState(null, "", canonical);
    }
  }

  let selectedSize = p.sizes[Math.floor(p.sizes.length/2)] || p.sizes[0];
  let selectedColor = p.colors[0].name;
  let qty = 1;
  const stocked = isInStock(p);

  if (window.LZSEO) LZSEO.applyProduct(p);

  root.innerHTML = `
    <nav class="pdp-breadcrumb" aria-label="Breadcrumb" style="grid-column:1/-1;font-size:.8rem;color:var(--taupe);margin-bottom:.6rem">
      ${LZSchema.productBreadcrumbs(p).itemListElement.map((item,i,items)=>i===items.length-1 ? `<span aria-current="page">${e(item.name)}</span>` : `<a href="${e(new URL(item.item).pathname)}">${e(item.name)}</a>`).join(' &rsaquo; ')}
    </nav>
    <div class="pdp-gallery reveal">
      <div class="pdp-main-img" id="pdp-main-img-wrap">
        <img id="pdp-main-img" src="${e(p.gallery[0])}" width="832" height="1248" fetchpriority="high" decoding="async" ${LZCatalog.responsive(p.gallery[0], "(max-width:768px) 100vw, 50vw", [480,832,1248])} alt="${e(LZCatalog.imageAlt(p))}">
        <button class="zoom-trigger" id="zoom-trigger" type="button" aria-label="Zoom image">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg>
        </button>
      </div>
      <div class="pdp-thumbs">
        ${p.gallery.map((src, i) => `
          <button class="${i === 0 ? "active" : ""}" data-src="${e(src)}" aria-label="View ${e(LZCatalog.imageAlt(p,i))}">
            <img width="80" height="120" loading="lazy" decoding="async" src="${e(src)}" ${LZCatalog.responsive(src,"80px",[80,160])} alt="${e(LZCatalog.imageAlt(p,i))}">
          </button>`).join("")}
      </div>
    </div>

    <div class="pdp-info reveal">
      <div class="cat-label">${e(p.category)} ${p.isNew ? "· New Arrival" : ""}</div>
      <h1 class="serif">${e(p.name)}</h1>
      <div class="pdp-price">
        ${p.oldPrice ? `<span class="price-old">${formatPKR(p.oldPrice)}</span>` : ""}
        <span class="${p.isSale ? "price-sale" : ""}">${formatPKR(p.price)}</span>
      </div>
      <p class="lede">${e(p.description)}</p>
      <div class="pdp-stock ${stocked ? "" : "out"}">${stocked ? "In Stock" : "Sold Out"}</div>

      <div class="option-block">
        <div class="option-label"><span>Color</span><span class="muted" id="color-label">${e(selectedColor)}</span></div>
        <div class="swatches" id="color-swatches">
          ${p.colors.map(c => `
            <button class="swatch-color ${c.name === selectedColor ? "active" : ""}" style="background:${c.hex}" data-color="${e(c.name)}" aria-label="${e(c.name)}"></button>
          `).join("")}
        </div>
      </div>

      <div class="option-block">
        <div class="option-label"><span>Size</span>${LZProductTypes.key(p) === "abayas" ? '<span class="muted link-underline" style="cursor:pointer" id="size-guide-btn">Size Guide</span>' : ""}</div>
        <div class="swatches" id="size-swatches">
          ${p.sizes.map(s => `
            <button class="swatch-size ${s === selectedSize ? "active" : ""}" data-size="${e(s)}">${e(s)}</button>
          `).join("")}
        </div>
      </div>

      <div class="option-block">
        <div class="option-label"><span>Quantity</span></div>
        <div class="qty-row">
          <div class="qty-stepper">
            <button id="qty-minus" aria-label="Decrease quantity">−</button>
            <span id="qty-val">1</span>
            <button id="qty-plus" aria-label="Increase quantity">+</button>
          </div>
        </div>
      </div>

      <div class="pdp-actions">
        <button class="btn btn-solid" id="add-to-cart" ${stocked ? "" : "disabled"}>${stocked ? `Add to Cart — ${formatPKR(p.price)}` : "Sold Out"}</button>
        <button class="icon-btn-round ${LZ.isWished(p.id) ? "active" : ""}" data-wish-id="${e(p.id)}" aria-label="Save to wishlist">
          <svg viewBox="0 0 24 24" stroke-width="1.5"><path d="M12 20.5s-7.5-4.6-10-9.3C.5 8 2 4.5 5.5 4c2-.3 3.7.6 4.9 2.2C11.7 4.7 13.3 3.8 15.5 4c3.5.5 5 4 3.5 7.2-2.5 4.7-10 9.3-10 9.3Z"/></svg>
        </button>
      </div>
      <button class="btn btn-outline btn-block" id="buy-now" ${stocked ? "" : "disabled"}>${stocked ? "Buy Now" : "Sold Out"}</button>
      <p class="pdp-note">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/></svg>
        Free nationwide delivery on orders over PKR <span data-lz-free-shipping-threshold>${Number(LZPolicy.freeShippingAbove).toLocaleString("en-PK")}</span>
      </p>

      <p class="pdp-note"><a class="link-underline" href="/journal/${collection.guide}/">Read our ${e(collection.name.toLowerCase())} guide</a></p>
      <div class="accordion">
        <div class="acc-item open">
          <button class="acc-head">Details <span class="plus"></span></button>
          <div class="acc-body" style="max-height:200px"><div class="acc-body-inner">${e(p.description)}</div></div>
        </div>
        <div class="acc-item">
          <button class="acc-head">Fabric &amp; Care <span class="plus"></span></button>
          <div class="acc-body"><div class="acc-body-inner">${e(p.fabric)}</div></div>
        </div>
        <div class="acc-item">
          <button class="acc-head">Shipping <span class="plus"></span></button>
          <div class="acc-body"><div class="acc-body-inner">${e(getShippingText(p))}</div></div>
        </div>
        <div class="acc-item">
          <button class="acc-head">Returns <span class="plus"></span></button>
          <div class="acc-body"><div class="acc-body-inner">${e(getReturnsText(p))}</div></div>
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll('.acc-head').forEach(button=>button.addEventListener('click',()=>{
    const item=button.closest('.acc-item'); const body=item.querySelector('.acc-body');
    item.classList.toggle('open');button.setAttribute('aria-expanded',String(item.classList.contains('open')));
    body.style.maxHeight=item.classList.contains('open') ? body.scrollHeight+'px' : '0px';
  }));

  // gallery thumbs
  let currentIdx = 0;
  root.querySelectorAll(".pdp-thumbs button").forEach((btn, i) => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".pdp-thumbs button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentIdx = i;
      const img = document.getElementById("pdp-main-img");
      if(window.gsap){
        gsap.to(img, { opacity: 0, duration: .18, onComplete: () => {
          img.removeAttribute("srcset"); img.removeAttribute("sizes"); img.src = btn.dataset.src; img.alt = LZCatalog.imageAlt(p,i);
          gsap.to(img, { opacity: 1, duration: .28 });
        }});
      } else { img.removeAttribute("srcset"); img.removeAttribute("sizes"); img.src = btn.dataset.src; img.alt = LZCatalog.imageAlt(p,i); }
    });
  });

  // image zoom — click the main image (or the magnifier button) to open a
  // full-screen zoomable view of the abaya photo
  const openZoom = setupProductZoom(p.gallery, (i) => {
    currentIdx = i;
    root.querySelectorAll(".pdp-thumbs button").forEach((b, bi) => b.classList.toggle("active", bi === i));
    const img = document.getElementById("pdp-main-img");
    if(img){ img.removeAttribute("srcset"); img.removeAttribute("sizes"); img.src = p.gallery[i]; img.alt = LZCatalog.imageAlt(p,i); }
  }, LZCatalog.productLabel(p));
  document.getElementById("pdp-main-img-wrap")?.addEventListener("click", () => openZoom(currentIdx));

  // color
  root.querySelectorAll(".swatch-color").forEach(btn => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".swatch-color").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedColor = btn.dataset.color;
      document.getElementById("color-label").textContent = selectedColor;
    });
  });

  // size
  root.querySelectorAll(".swatch-size").forEach(btn => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".swatch-size").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedSize = btn.dataset.size;
    });
  });

  // qty
  const qtyVal = document.getElementById("qty-val");
  document.getElementById("qty-plus").addEventListener("click", () => { qty++; qtyVal.textContent = qty; });
  document.getElementById("qty-minus").addEventListener("click", () => { qty = Math.max(1, qty - 1); qtyVal.textContent = qty; });

  // add to cart / buy now
  document.getElementById("add-to-cart").addEventListener("click", () => {
    if(!stocked) return;
    LZ.addToCart(p.id, selectedSize, selectedColor, qty);
  });
  document.getElementById("buy-now").addEventListener("click", () => {
    if(!stocked) return;
    LZ.addToCart(p.id, selectedSize, selectedColor, qty);
    location.href = "/checkout";
  });

  document.getElementById("size-guide-btn")?.addEventListener("click", () => {
    openSizeGuideModal();
  });

  // accordion first item open height fix after render
  requestAnimationFrame(() => {
    const openBody = root.querySelector(".acc-item.open .acc-body");
    if(openBody) openBody.style.maxHeight = openBody.scrollHeight + "px";
  });

  // related products
  const relatedGrid = document.getElementById("related-grid");
  function renderRelated(){
    if(!relatedGrid) return;
    const related = PRODUCTS.filter(rp => rp.id !== p.id && rp.category === p.category).slice(0,4);
    const fallback = related.length ? related : PRODUCTS.filter(rp => rp.id !== p.id).slice(0,4);
    relatedGrid.innerHTML = fallback.map(rp => `
      <div class="product-card ${isInStock(rp) ? "" : "is-soldout"}">
        <a href="${productUrl(rp)}">
          <div class="product-media">
            <div class="product-tags">
              ${!isInStock(rp) ? '<span class="tag tag-soldout">Sold Out</span>' : (rp.isNew ? '<span class="tag tag-new">New</span>' : "")}
            </div>
            <img class="img-primary" width="600" height="800" src="${e(rp.img)}" ${LZCatalog.responsive(rp.img)} alt="${e(LZCatalog.imageAlt(rp))}" loading="lazy">
            <img class="img-secondary" width="600" height="800" src="${e(rp.img2)}" ${LZCatalog.responsive(rp.img2)} alt="${e(LZCatalog.imageAlt(rp,1))}" loading="lazy">
          </div>
        </a>
        <a href="${productUrl(rp)}">
          <div class="product-info">
            <div><h3>${e(rp.name)}</h3><div class="cat">${e(rp.category)}</div></div>
            <div class="price-row"><span class="price">${formatPKR(rp.price)}</span></div>
          </div>
        </a>
      </div>
    `).join("");
  }
  renderRelated();
  if(relatedGrid && !window.CATALOG_COMPLETE){
    const load=()=>window.ensureFullCatalog().then(renderRelated);
    if('IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();load();}},{rootMargin:'500px'});
      observer.observe(relatedGrid);
    } else load();
    window.addEventListener('lz:catalog-ready',renderRelated);
  }
}

/* ==========================================================================
   PRODUCT IMAGE ZOOM LIGHTBOX
   Full-screen viewer for abaya photos. Supports: mouse scroll to zoom,
   click / double-click to toggle zoom, drag-to-pan once zoomed, pinch-to-zoom
   and single-finger pan on touch, +/- buttons, arrow-key & swipe navigation
   between the product's gallery images, and Esc / backdrop / close to exit.

   Returns an `openZoom(index)` function the caller uses to launch it.
   ========================================================================== */
function setupProductZoom(gallery, onNavigate, productName){
  const MIN_SCALE = 1, MAX_SCALE = 4, ZOOM_STEP = 2.2;

  // Build the lightbox DOM once and reuse it across opens.
  let box = document.getElementById("lz-zoom-lightbox");
  if(!box){
    box = document.createElement("div");
    box.id = "lz-zoom-lightbox";
    box.className = "zoom-lightbox";
    box.setAttribute("data-lenis-prevent", "");
    box.inert = true;
    box.setAttribute("aria-hidden", "true");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Product image viewer");
    box.innerHTML = `
      <div class="zoom-lightbox-hint">Scroll or pinch to zoom · Drag to pan</div>
      <button class="zoom-lightbox-close" type="button" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <button class="zoom-lightbox-prev" type="button" aria-label="Previous image">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <button class="zoom-lightbox-next" type="button" aria-label="Next image">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m9 6 6 6-6 6"/></svg>
      </button>
      <div class="zoom-lightbox-stage">
        <img class="zoom-lightbox-img" alt="">
      </div>
      <div class="zoom-lightbox-zoomctrl">
        <button type="button" data-zoom="out" aria-label="Zoom out">−</button>
        <span class="zoom-lightbox-counter">1 / 1</span>
        <button type="button" data-zoom="in" aria-label="Zoom in">+</button>
      </div>
    `;
    document.body.appendChild(box);
  }

  const stage = box.querySelector(".zoom-lightbox-stage");
  const img = box.querySelector(".zoom-lightbox-img");
  const closeBtn = box.querySelector(".zoom-lightbox-close");
  const prevBtn = box.querySelector(".zoom-lightbox-prev");
  const nextBtn = box.querySelector(".zoom-lightbox-next");
  const counter = box.querySelector(".zoom-lightbox-counter");
  const zoomInBtn = box.querySelector('[data-zoom="in"]');
  const zoomOutBtn = box.querySelector('[data-zoom="out"]');

  let index = 0, scale = 1, panX = 0, panY = 0, opener = null, previousOverflow = "";
  let dragging = false, moved = false, startX = 0, startY = 0, startPanX = 0, startPanY = 0;
  const pointers = new Map();
  let pinchStartDist = 0, pinchStartScale = 1;

  function clampPan(){
    const maxX = Math.max(0, (img.offsetWidth * scale - img.offsetWidth) / 2);
    const maxY = Math.max(0, (img.offsetHeight * scale - img.offsetHeight) / 2);
    panX = Math.min(maxX, Math.max(-maxX, panX));
    panY = Math.min(maxY, Math.max(-maxY, panY));
  }

  function render(){
    img.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    img.classList.toggle("zoomed", scale > MIN_SCALE);
    prevBtn.style.display = gallery.length > 1 ? "" : "none";
    nextBtn.style.display = gallery.length > 1 ? "" : "none";
    counter.textContent = `${index + 1} / ${gallery.length}`;
  }

  function setScale(next){
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    if(scale === MIN_SCALE){ panX = 0; panY = 0; }
    clampPan();
    render();
  }

  function showIndex(i){
    index = (i + gallery.length) % gallery.length;
    scale = 1; panX = 0; panY = 0;
    img.src = gallery[index];
    img.alt = gallery.length > 1 ? `${productName} — photo ${index + 1} of ${gallery.length}` : productName;
    render();
    if(typeof onNavigate === "function") onNavigate(index);
  }

  function open(i){
    if(!box.classList.contains("active")){
      opener = document.activeElement;
      previousOverflow = document.body.style.overflow;
    }
    box.inert = false;
    box.setAttribute("aria-hidden", "false");
    box.classList.add("active");
    document.body.style.overflow = "hidden";
    showIndex(i || 0);
    closeBtn.focus({ preventScroll: true });
  }

  function close(){
    box.classList.remove("active");
    document.body.style.overflow = previousOverflow;
    if(opener?.isConnected) opener.focus({ preventScroll: true });
    box.inert = true;
    box.setAttribute("aria-hidden", "true");
    scale = 1; panX = 0; panY = 0;
  }

  closeBtn.addEventListener("click", close);
  box.addEventListener("click", (e) => { if(e.target === box) close(); });
  prevBtn.addEventListener("click", () => showIndex(index - 1));
  nextBtn.addEventListener("click", () => showIndex(index + 1));
  zoomInBtn.addEventListener("click", () => setScale(scale + 1));
  zoomOutBtn.addEventListener("click", () => setScale(scale - 1));

  document.addEventListener("keydown", (e) => {
    if(!box.classList.contains("active")) return;
    if(e.key === "Escape"){ e.preventDefault(); e.stopImmediatePropagation(); close(); }
    else if(e.key === "Tab") LZ.trapFocus(box, e);
    else if(e.key === "ArrowLeft") showIndex(index - 1);
    else if(e.key === "ArrowRight") showIndex(index + 1);
    else if(e.key === "+" || e.key === "=") setScale(scale + 1);
    else if(e.key === "-") setScale(scale - 1);
  });

  stage.addEventListener("wheel", (e) => {
    if(!box.classList.contains("active")) return;
    e.preventDefault();
    setScale(scale + (e.deltaY < 0 ? 0.4 : -0.4));
  }, { passive: false });

  img.addEventListener("dblclick", () => setScale(scale > MIN_SCALE ? MIN_SCALE : ZOOM_STEP));

  img.addEventListener("pointerdown", (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    img.setPointerCapture(e.pointerId);
    if(pointers.size === 1){
      dragging = scale > MIN_SCALE;
      moved = false;
      startX = e.clientX; startY = e.clientY;
      startPanX = panX; startPanY = panY;
    } else if(pointers.size === 2){
      dragging = false;
      const pts = [...pointers.values()];
      pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartScale = scale;
    }
  });

  img.addEventListener("pointermove", (e) => {
    if(!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if(pointers.size === 2){
      const pts = [...pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if(pinchStartDist > 0) setScale(pinchStartScale * (dist / pinchStartDist));
      return;
    }
    if(dragging){
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if(Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      panX = startPanX + dx; panY = startPanY + dy;
      clampPan();
      render();
      img.classList.add("dragging");
    }
  });

  function releasePointer(e){
    pointers.delete(e.pointerId);
    if(pointers.size < 2) pinchStartDist = 0;
    if(pointers.size === 0){ dragging = false; img.classList.remove("dragging"); }
  }
  img.addEventListener("pointerup", releasePointer);
  img.addEventListener("pointercancel", releasePointer);
  img.addEventListener("pointerleave", releasePointer);

  img.addEventListener("click", () => {
    if(moved){ moved = false; return; }
    setScale(scale > MIN_SCALE ? MIN_SCALE : ZOOM_STEP);
  });

  return open;
}

/* ==========================================================================
   SIZE GUIDE MODAL — mirrors the Size Guide section on support.html so
   shoppers see the same measurements without leaving the product page.
   ========================================================================== */
function openSizeGuideModal(){
  let box = document.getElementById("lz-size-guide-modal");

  if(!box){
    box = document.createElement("div");
    box.id = "lz-size-guide-modal";
    box.className = "size-guide-backdrop";
    box.innerHTML = `
      <div class="size-guide-modal" role="dialog" aria-modal="true" aria-label="Size Guide">
        <button class="size-guide-modal-close" type="button" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <div class="eyebrow">Fit</div>
        <h3 class="serif" style="font-size:1.6rem;margin:.6rem 0 .8rem">Size Guide</h3>
        <p style="color:var(--taupe);font-size:0.92rem;max-width:46ch">All measurements are in inches. If you're between sizes, we recommend sizing up for a more relaxed, comfortable drape.</p>
        <div style="overflow-x:auto">
          <table class="size-table">
            <thead>
              <tr><th>Size</th><th>Abaya Length</th><th>Chest Width</th><th>Sleeve Length</th></tr>
            </thead>
            <tbody>
              <tr><td>XS</td><td>52&Prime;</td><td>22&ndash;23&Prime;</td><td>27&Prime;</td></tr>
              <tr><td>S</td><td>54&Prime;</td><td>24&ndash;25&Prime;</td><td>28&Prime;</td></tr>
              <tr><td>M</td><td>54&Prime;</td><td>26&ndash;27&Prime;</td><td>29&Prime;</td></tr>
              <tr><td>L</td><td>56&Prime;</td><td>28&ndash;29&Prime;</td><td>30&Prime;</td></tr>
              <tr><td>XL</td><td>58&Prime;</td><td>30&ndash;31&Prime;</td><td>31&Prime;</td></tr>
            </tbody>
          </table>
        </div>
        <p class="size-guide-modal-note">Still unsure of your size? <a href="https://wa.me/923288691979" target="_blank" rel="noopener" class="link-underline">Message us on WhatsApp</a> and we'll help you find the right fit.</p>
      </div>
    `;
    document.body.appendChild(box);

    const close = () => {
      box.classList.remove("open");
      document.body.style.overflow = "";
    };
    box.querySelector(".size-guide-modal-close").addEventListener("click", close);
    box.addEventListener("click", (e) => { if(e.target === box) close(); });
    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape" && box.classList.contains("open")) close();
    });
  }

  box.classList.add("open");
  document.body.style.overflow = "hidden";
}
