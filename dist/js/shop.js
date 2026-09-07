/* ==========================================================================
   LABEL BY ZARE — SHOP GRID
   Renders the collection grid. Reused by shop.html, new-arrivals.html and
   sale.html — the page sets data-filter on <body> ("all" | "new" | "sale").
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("collection-grid");
  if(!grid) return;

  const baseFilter = document.body.getAttribute("data-filter") || "all";
  const urlParams = new URLSearchParams(location.search);
  const urlCat = urlParams.get("cat");
  const searchTerm = (urlParams.get("q") || "").trim().toLowerCase();
  const typeTabs = document.getElementById("shop-type-tabs");
  const typeButtons = typeTabs ? [...typeTabs.querySelectorAll("[data-product-type]")] : [];
  const typePanel = document.getElementById("shop-type-panel");
  const categoryBar = document.querySelector(".filter-bar");
  let activeType = typeTabs ? LZProductTypes.key(urlParams.get("type") || urlCat) : "all";
  let activeCategory = urlCat || "All";
  let sort = "featured";
  let loaded = false;

  function productCard(p, i){
    const stocked = isInStock(p);
    return `
    <div class="product-card${stocked ? "" : " is-soldout"}">
      <div class="product-media">
        <a href="${productUrl(p)}">
          <div class="product-tags">
            ${!stocked ? '<span class="tag tag-soldout">Sold Out</span>' : ""}
            ${stocked && p.isNew ? '<span class="tag tag-new">New</span>' : ""}
            ${stocked && p.isSale ? '<span class="tag tag-sale">Sale</span>' : ""}
          </div>
          <img class="img-primary" src="${LZCatalog.escape(LZCatalog.image(p.img))}" alt="${LZCatalog.escape(LZCatalog.imageAlt(p))}" loading="lazy">
          <img class="img-secondary" src="${LZCatalog.escape(LZCatalog.image(p.img2))}" alt="${LZCatalog.escape(LZCatalog.imageAlt(p,1))}" loading="lazy">
        </a>
      <button class="wishlist-btn ${LZ.isWished(p.id) ? "active" : ""}" data-wish-id="${LZCatalog.escape(p.id)}" aria-label="Save to wishlist">
        <svg viewBox="0 0 24 24" stroke-width="1.5"><path d="M12 20.5s-7.5-4.6-10-9.3C.5 8 2 4.5 5.5 4c2-.3 3.7.6 4.9 2.2C11.7 4.7 13.3 3.8 15.5 4c3.5.5 5 4 3.5 7.2-2.5 4.7-10 9.3-10 9.3Z"/></svg>
      </button>
      <div class="quick-add">
        ${stocked ? `<a class="btn btn-solid btn-block btn-sm" href="${productUrl(p)}">Quick View</a>` : '<button class="btn btn-solid btn-block btn-sm" type="button" disabled>Sold Out</button>'}
      </div>
      </div>
      <a href="${productUrl(p)}">
        <div class="product-info">
          <div>
            <h3>${LZCatalog.escape(p.name)}</h3>
            <div class="cat">${LZCatalog.escape(p.category)}</div>
          </div>
          <div class="price-row">
            ${p.oldPrice ? `<span class="price-old">${formatPKR(p.oldPrice)}</span>` : ""}
            <span class="price ${p.isSale ? "price-sale" : ""}">${formatPKR(p.price)}</span>
          </div>
        </div>
      </a>
    </div>`;
  }

  function getFiltered(){
    let list = searchTerm ? LZSearch.search(PRODUCTS,searchTerm) : PRODUCTS.slice();
    if(baseFilter === "new") list = list.filter(p => p.isNew);
    if(baseFilter === "sale") list = list.filter(p => p.isSale);
    if(activeType !== "all") list = list.filter(p => LZProductTypes.key(p) === activeType);
    if(activeCategory !== "All") list = list.filter(p => p.category === activeCategory);

    if(sort === "price-asc") list.sort((a,b) => a.price - b.price);
    if(sort === "price-desc") list.sort((a,b) => b.price - a.price);
    if(sort === "new") list.sort((a,b) => (b.isNew - a.isNew));
    return list;
  }

  const LIST_SEO = {
    all: { name: "Abayas & Shawls — Label by Zare Collection", url: "/shop" },
    new: { name: "New Arrivals — Abayas & Shawls", url: "/new-arrivals" },
    sale: { name: "Sale — Abayas & Shawls", url: "/sale" },
  };

  function render(){
    typeButtons.forEach(button => {
      const active = button.dataset.productType === activeType;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      if(loaded){
        const size = PRODUCTS.filter(p => LZProductTypes.key(p) === button.dataset.productType).length;
        button.querySelector(".collection-tab-count").textContent = size ? `${size} ${size === 1 ? "piece" : "pieces"}` : "Coming soon";
      }
    });
    if(typePanel) typePanel.setAttribute("aria-labelledby", `shop-tab-${activeType}`);
    if(!loaded) return;
    let categoryProducts = PRODUCTS.filter(p => activeType === "all" || LZProductTypes.key(p) === activeType);
    if(baseFilter === "new") categoryProducts = categoryProducts.filter(p => p.isNew);
    if(baseFilter === "sale") categoryProducts = categoryProducts.filter(p => p.isSale);
    const categoryNames = [...new Set(categoryProducts.map(p => p.category).filter(Boolean))].sort();
    if(activeCategory !== "All" && !categoryNames.includes(activeCategory)) activeCategory = "All";
    categoryBar.replaceChildren(...["All", ...categoryNames].map(category => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `chip${category === activeCategory ? " active" : ""}`;
      button.dataset.cat = category;
      button.textContent = category;
      button.setAttribute("aria-pressed", String(category === activeCategory));
      return button;
    }));
    categoryBar.hidden = !!typeTabs && categoryNames.length < 2;
    if(window.PRODUCTS_LOAD_ERROR){
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><p>We couldn’t load the collection. Please reload the page to try again.</p></div>';
      return;
    }
    const list = getFiltered();
    grid.innerHTML = list.length
      ? list.map(productCard).join("")
      : `<div class="empty-state" style="grid-column:1/-1"><p>No pieces match these filters.</p></div>`;
    if(typeTabs && !categoryProducts.length){
      grid.innerHTML = `<div class="home-empty home-type-empty"><span class="eyebrow">The ${activeType === "shawls" ? "shawl" : "abaya"} edit</span><h3>A beautiful finishing touch.</h3><p>Our ${LZProductTypes.label(activeType).toLowerCase()} collection is coming soon.</p><a class="btn btn-outline" href="/?type=${activeType === "shawls" ? "abayas" : "shawls"}#collection">Explore the collection</a></div>`;
    }
    document.querySelector(".js-result-count") && (document.querySelector(".js-result-count").textContent = list.length);
    if (window.LZSEO) {
      const cfg = LIST_SEO[baseFilter] || LIST_SEO.all;
      LZSEO.applyItemList(list, cfg.name, cfg.url);
    }
    if(window.gsap && window.ScrollTrigger && !window.matchMedia("(prefers-reduced-motion: reduce)").matches){
      gsap.utils.toArray("#collection-grid .product-card").forEach((card) => {
        gsap.fromTo(card, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .7, ease: "power3.out",
          scrollTrigger: { trigger: card, start: "top 95%" } });
      });
    }
  }

  categoryBar?.addEventListener("click", event => {
      const chip = event.target.closest("[data-cat]");
      if(!chip) return;
      activeCategory = chip.dataset.cat;
      render();
  });

  function selectType(type){
    activeType = type;
    activeCategory = "All";
    const url = new URL(location.href);
    url.searchParams.set("type", type);
    url.searchParams.delete("cat");
    history.replaceState(null, "", url);
    render();
  }
  typeTabs?.addEventListener("click", event => {
    const button = event.target.closest("[data-product-type]");
    if(button) selectType(button.dataset.productType);
  });
  typeTabs?.addEventListener("keydown", event => {
    const button = event.target.closest("[data-product-type]");
    if(!button || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = typeButtons.indexOf(button);
    const next = event.key === "Home" ? 0 : event.key === "End" ? typeButtons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + typeButtons.length) % typeButtons.length;
    typeButtons[next].focus();
    selectType(typeButtons[next].dataset.productType);
  });

  document.querySelector(".select-min[data-role='sort']")?.addEventListener("change", (e) => {
    sort = e.target.value;
    render();
  });

  grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Loading collection…</p></div>`;
  render();
  (window.PRODUCTS_READY || Promise.resolve()).then(() => {
    loaded = true;
    if(typeTabs && searchTerm && !urlParams.has("type") && !urlCat && !getFiltered().length){
      activeType = activeType === "abayas" ? "shawls" : "abayas";
    }
    render();
  });
});
