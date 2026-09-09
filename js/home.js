/* Homepage sections share the existing Supabase catalog, cart and wishlist. */
const HOME_CATALOG = {
  categories(products) {
    return [...new Set(products.map(p => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  },
  highlights(products, field, limit) {
    const ranked = products.filter(p => p[field]).sort((a, b) => Number(isInStock(b)) - Number(isInStock(a)));
    const selected = ranked.slice(0, limit);
    if(limit > 1){
      ["abayas", "shawls"].forEach(type => {
        const candidate = ranked.find(p => LZProductTypes.key(p) === type);
        if(!candidate || selected.some(p => LZProductTypes.key(p) === type)) return;
        const replace = selected.findLastIndex(p => selected.filter(other => LZProductTypes.key(other) === LZProductTypes.key(p)).length > 1);
        if(replace !== -1) selected[replace] = candidate;
      });
    }
    return selected;
  },
  collection(products, state) {
    const search = (state.query || "").trim().toLowerCase();
    const list = (search ? LZSearch.search(products,search) : products).filter(p =>
      (LZProductTypes.key(p) === (state.type || "abayas")) &&
      (state.category === "All" || p.category === state.category) &&
      (state.edit !== "bestsellers" || p.isBestseller) &&
      (state.edit !== "featured" || p.isFeatured) &&
      (state.edit !== "new" || p.isNew) &&
      (state.edit !== "sale" || p.isSale)
    );
    if (state.sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (state.sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (state.sort === "new") list.sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew));
    else if(!search) list.sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured));
    return list;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("collection-grid");
  if (!document.body.classList.contains("home-page") || !grid) return;
  const bestGrid = document.getElementById("best-sellers-grid");
  const featuredGrid = document.getElementById("featured-grid");
  const categories = document.getElementById("home-categories");
  const typeTabs = document.getElementById("home-type-tabs");
  const typePanel = document.getElementById("home-type-panel");
  const typeButtons = [...typeTabs.querySelectorAll("[data-product-type]")];
  const editSelect = document.getElementById("home-edit");
  const sortSelect = document.getElementById("home-sort");
  const count = document.getElementById("home-result-count");
  const reset = document.getElementById("home-reset");
  const resultQuery = document.getElementById("home-search-summary");
  const occasionBanner = document.querySelector("[data-occasion-product]");
  const occasionImage = document.getElementById("occasion-product-image");
  const occasionLink = document.getElementById("occasion-product-link");
  const occasionFallback = occasionImage?.getAttribute("src");
  occasionImage?.addEventListener("error", () => {
    if(occasionImage.getAttribute("src") !== occasionFallback) occasionImage.src = occasionFallback;
  });
  const edits = ["all", "bestsellers", "featured", "new", "sale"];
  const sorts = ["featured", "new", "price-asc", "price-desc"];
  let products = [];
  let loaded = false;

  function readState() {
    const params = new URLSearchParams(location.search);
    return {
      type: LZProductTypes.key(params.get("type") || params.get("cat") || "abayas"),
      category: params.get("cat") || "All",
      edit: edits.includes(params.get("edit")) ? params.get("edit") : "all",
      sort: sorts.includes(params.get("sort")) ? params.get("sort") : "featured",
      query: (params.get("q") || "").trim()
    };
  }
  let state = readState();
  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function safeImage(value) {
    if (!value) return "";
    try {
      const url = new URL(value, location.href);
      return ["https:", "http:"].includes(url.protocol) ? escape(url.href) : "";
    } catch { return ""; }
  }
  function productCard(p, isHeading=true) {
    const titleTag=isHeading ? 'h3' : 'p';
    const stocked = isInStock(p);
    const href = escape(productUrl(p));
    const name = escape(p.name);
    const primary = safeImage(p.img);
    const secondary = safeImage(p.img2);
    const alternate = secondary && secondary !== primary;
    const wished = LZ.isWished(p.id);
    return `<article class="product-card home-product-card${stocked ? "" : " is-soldout"}">
      <div class="product-media${alternate ? "" : " no-alt"}">
        <a href="${href}" aria-label="View ${name}">
          ${primary ? `<img class="img-primary" src="${primary}" ${LZCatalog.responsive(p.img)} alt="${escape(LZCatalog.imageAlt(p))}" loading="lazy" decoding="async" width="600" height="800">` : '<span class="home-image-placeholder">Image coming soon</span>'}
          ${alternate ? `<img class="img-secondary" src="${secondary}" ${LZCatalog.responsive(p.img2)} alt="${escape(LZCatalog.imageAlt(p,1))}" loading="lazy" decoding="async" width="600" height="800">` : ""}
        </a>
        <div class="product-tags">${!stocked ? '<span class="tag tag-soldout">Sold out</span>' : p.isSale ? '<span class="tag tag-sale">Sale</span>' : p.isNew ? '<span class="tag tag-new">New</span>' : ""}</div>
        <button type="button" class="wishlist-btn${wished ? " active" : ""}" data-wish-id="${escape(p.id)}" aria-label="Save ${name} to wishlist" aria-pressed="${wished}">
          <svg viewBox="0 0 24 24" stroke-width="1.5" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>
        </button>
        ${stocked ? `<div class="quick-add"><a class="btn btn-solid btn-block btn-sm" href="${href}">View details</a></div>` : ""}
      </div>
      <div class="product-info">
        <div class="cat">${escape(p.category || "Abaya")}</div>
        <${titleTag} class="product-name"><a href="${href}">${name}</a></${titleTag}>
        <div class="price-row"><span class="price${p.isSale ? " price-sale" : ""}">${escape(formatPKR(p.price))}</span>${p.oldPrice > p.price ? `<span class="price-old">${escape(formatPKR(p.oldPrice))}</span>` : ""}</div>
      </div>
    </article>`;
  }
  function renderCards(target, list, emptyText) {
    target.innerHTML = list.length ? list.map(p=>productCard(p,target===grid)).join("") : `<div class="home-empty"><p>${escape(emptyText)}</p></div>`;
    target.setAttribute("aria-busy", "false");
  }
  function updateUrl() {
    const url = new URL(location.href);
    const values = { type: state.type, cat: state.category === "All" ? "" : state.category, edit: state.edit === "all" ? "" : state.edit, sort: state.sort === "featured" ? "" : state.sort, q: state.query };
    Object.entries(values).forEach(([key, value]) => value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
    url.hash = "collection";
    history.replaceState(null, "", url);
  }
  function renderCollection() {
    const tabProducts = state.query ? LZSearch.search(products,state.query) : products;
    typeButtons.forEach(button => {
      const active = button.dataset.productType === state.type;
      const size = tabProducts.filter(p => LZProductTypes.key(p) === button.dataset.productType).length;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      if(loaded) button.querySelector(".collection-tab-count").textContent = state.query ? `${size} ${size === 1 ? "match" : "matches"}` : size ? `${size} ${size === 1 ? "piece" : "pieces"}` : "Coming soon";
    });
    typePanel.setAttribute("aria-labelledby", `tab-${state.type}`);
    typePanel.dataset.productType = state.type;
    if (!loaded) return;
    const typeProducts = products.filter(p => LZProductTypes.key(p) === state.type);
    const typeLabel = LZProductTypes.label(state.type);
    const typeCategories = HOME_CATALOG.categories(typeProducts);
    if(state.category !== "All" && !typeCategories.includes(state.category)) state.category = "All";
    categories.innerHTML = ["All", ...typeCategories].map(category => `<button class="chip" type="button" data-cat="${escape(category)}" aria-pressed="false">${escape(category)}</button>`).join("");
    categories.hidden = typeCategories.length < 2;
    const list = HOME_CATALOG.collection(products, state);
    renderCards(grid, list, "No pieces match your filters. Try another edit or clear the filters.");
    if(!typeProducts.length){
      grid.innerHTML = `<div class="home-empty home-type-empty"><span class="eyebrow">The ${state.type === "shawls" ? "shawl" : "abaya"} edit</span><h3>${state.type === "shawls" ? "A beautiful finishing touch." : "Something beautiful is on its way."}</h3><p>Our ${typeLabel.toLowerCase()} collection is coming soon. Discover the rest of the collection while you wait.</p><button type="button" class="btn btn-outline" data-browse-type="${state.type === "shawls" ? "abayas" : "shawls"}">Explore ${state.type === "shawls" ? "abayas" : "shawls"}</button></div>`;
    }
    count.textContent = `${list.length} ${list.length === 1 ? "piece" : "pieces"}${list.length !== typeProducts.length ? ` of ${typeProducts.length}` : ""} · ${typeLabel}`;
    resultQuery.textContent = state.query ? `Results for “${state.query}”` : "";
    resultQuery.hidden = !state.query;
    reset.hidden = state.category === "All" && state.edit === "all" && !state.query && state.sort === "featured";
    categories.querySelectorAll("[data-cat]").forEach(button => {
      const active = button.dataset.cat === state.category;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    editSelect.value = state.edit;
    sortSelect.value = state.sort;
    window.ScrollTrigger?.refresh();
  }
  function scrollToCollection() {
    const section = document.getElementById("collection");
    if(window.LZScrollTo) window.LZScrollTo(section);
    else section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  categories.addEventListener("click", event => {
    const button = event.target.closest("[data-cat]");
    if (!button) return;
    state.category = button.dataset.cat;
    updateUrl(); renderCollection();
  });
  function selectType(type){
    state.type = type;
    state.category = "All";
    updateUrl(); renderCollection();
  }
  typeTabs.addEventListener("click", event => {
    const button = event.target.closest("[data-product-type]");
    if(button) selectType(button.dataset.productType);
  });
  typeTabs.addEventListener("keydown", event => {
    const button = event.target.closest("[data-product-type]");
    if(!button || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = typeButtons.indexOf(button);
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? typeButtons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + typeButtons.length) % typeButtons.length;
    typeButtons[nextIndex].focus();
    selectType(typeButtons[nextIndex].dataset.productType);
  });
  grid.addEventListener("click", event => {
    const button = event.target.closest("[data-browse-type]");
    if(button){
      state.query = ""; state.edit = "all";
      selectType(button.dataset.browseType);
      typeButtons.find(tab => tab.dataset.productType === state.type)?.focus({ preventScroll:true });
    }
  });
  editSelect.addEventListener("change", () => { state.edit = editSelect.value; updateUrl(); renderCollection(); });
  sortSelect.addEventListener("change", () => { state.sort = sortSelect.value; updateUrl(); renderCollection(); });
  reset.addEventListener("click", () => {
    state = { type: state.type, category: "All", edit: "all", sort: "featured", query: "" };
    updateUrl(); renderCollection();
  });
  document.querySelectorAll("[data-home-edit]").forEach(link => link.addEventListener("click", event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    state = { type: link.dataset.homeType || state.type, category: "All", edit: link.dataset.homeEdit, sort: "featured", query: "" };
    if(loaded && !HOME_CATALOG.collection(products, state).length){
      const alternative = { ...state, type: state.type === "abayas" ? "shawls" : "abayas" };
      if(HOME_CATALOG.collection(products, alternative).length) state = alternative;
    }
    updateUrl(); renderCollection(); scrollToCollection();
  }));
  window.addEventListener("popstate", () => { state = readState(); renderCollection(); });

  document.body.addEventListener("click", event => {
    if (!event.target.closest("[data-wish-id]")) return;
    document.querySelectorAll("[data-wish-id]").forEach(button => button.setAttribute("aria-pressed", String(LZ.isWished(button.dataset.wishId))));
  });
  [grid, bestGrid, featuredGrid].forEach(target => target.addEventListener("error", event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    if(img.hasAttribute('srcset')){img.removeAttribute('srcset');img.src=img.getAttribute('src');return;}
    const media = img.closest(".product-media");
    if (img.classList.contains("img-secondary")) { media.classList.add("no-alt"); img.remove(); }
    else {
      const secondary = media.querySelector(".img-secondary");
      if (secondary) { img.src = secondary.src; img.alt = secondary.alt; secondary.remove(); media.classList.add("no-alt"); }
      else { img.hidden = true; media.querySelector("a").insertAdjacentHTML("beforeend", '<span class="home-image-placeholder">Image unavailable</span>'); }
    }
  }, true));

  async function loadCatalog(retry = false) {
    loaded = false;
    renderCollection();
    if(!document.getElementById("lz-catalog-data") || retry){
    count.textContent = "Loading collection…";
    [grid, bestGrid, featuredGrid].forEach(target => {
      target.setAttribute("aria-busy", "true");
      target.innerHTML = '<div class="home-loading" role="status"><p>Loading pieces…</p></div>';
    });
    }
    try {
      await (retry ? window.loadProducts() : window.PRODUCTS_READY);
      if (window.PRODUCTS_LOAD_ERROR) throw window.PRODUCTS_LOAD_ERROR;
      products = window.PRODUCTS || [];
      const occasionProduct = products.find(p => p.id === occasionBanner?.dataset.occasionProduct);
      if(occasionProduct && occasionImage && occasionLink){
        const cms = window.LZSiteSettings || {};
        if(!cms.occasion_image_url){
          try {
            const url = new URL(occasionProduct.img, location.href);
            if(occasionProduct.img && ["http:","https:"].includes(url.protocol)) occasionImage.src = url.href;
          } catch {}
          occasionImage.alt = LZCatalog.imageAlt(occasionProduct);
        }
        if(!cms.occasion_url) occasionLink.href = productUrl(occasionProduct);
      }
      loaded = true;
      const params = new URLSearchParams(location.search);
      if(state.query && !params.has("type") && !params.has("cat")){
        const bestMatch=LZSearch.search(products,state.query)[0];
        if(bestMatch) state.type=LZProductTypes.key(bestMatch);
      }
      renderCards(bestGrid, HOME_CATALOG.highlights(products, "isBestseller", 4), "Our next best sellers edit is coming soon.");
      renderCards(featuredGrid, HOME_CATALOG.highlights(products, "isFeatured", 2), "Our next featured edit is coming soon.");
      renderCollection();
      window.LZSEO?.applyItemList(products, "Label by Zare — Abayas & Shawls", "/#collection");
      if (["#collection", "#featured", "#best-sellers"].includes(location.hash)) {
        (window.LZ_PAGE_READY || Promise.resolve()).then(() => requestAnimationFrame(() => {
          const section = document.querySelector(location.hash);
          if(window.LZScrollTo) window.LZScrollTo(section, { immediate:true });
          else section?.scrollIntoView({ behavior: "instant", block: "start" });
        }));
      }
    } catch {
      count.textContent = "Collection unavailable";
      [grid, bestGrid, featuredGrid].forEach(target => {
        target.setAttribute("aria-busy", "false");
        target.innerHTML = '<div class="home-empty"><p>We couldn’t load the collection. Please try again.</p><button class="btn btn-outline btn-sm" type="button" data-retry-catalog>Try again</button></div>';
      });
    }
  }
  document.querySelector("main").addEventListener("click", event => {
    if (event.target.closest("[data-retry-catalog]")) loadCatalog(true);
  });
  loadCatalog();
});
