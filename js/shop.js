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
  let activeCategory = urlCat || "All";
  let sort = "featured";

  if(urlCat){
    document.querySelectorAll(".filter-bar .chip").forEach(c => {
      c.classList.toggle("active", c.dataset.cat === urlCat);
    });
  }

  function productCard(p, i){
    const stocked = isInStock(p);
    return `
    <div class="product-card${stocked ? "" : " is-soldout"}">
      <a href="${productUrl(p)}">
        <div class="product-media">
          <div class="product-tags">
            ${!stocked ? '<span class="tag tag-soldout">Sold Out</span>' : ""}
            ${stocked && p.isNew ? '<span class="tag tag-new">New</span>' : ""}
            ${stocked && p.isSale ? '<span class="tag tag-sale">Sale</span>' : ""}
          </div>
          <img class="img-primary" src="${p.img}" alt="${p.name}" loading="lazy">
          <img class="img-secondary" src="${p.img2}" alt="${p.name} alternate view" loading="lazy">
        </div>
      </a>
      <button class="wishlist-btn ${LZ.isWished(p.id) ? "active" : ""}" data-wish-id="${p.id}" aria-label="Save to wishlist">
        <svg viewBox="0 0 24 24" stroke-width="1.5"><path d="M12 20.5s-7.5-4.6-10-9.3C.5 8 2 4.5 5.5 4c2-.3 3.7.6 4.9 2.2C11.7 4.7 13.3 3.8 15.5 4c3.5.5 5 4 3.5 7.2-2.5 4.7-10 9.3-10 9.3Z"/></svg>
      </button>
      <div class="quick-add">
        <button class="btn btn-solid btn-block btn-sm" onclick="location.href='${productUrl(p)}'">${stocked ? "Quick View" : "Sold Out"}</button>
      </div>
      <a href="${productUrl(p)}">
        <div class="product-info">
          <div>
            <h3>${p.name}</h3>
            <div class="cat">${p.category}</div>
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
    let list = PRODUCTS.slice();
    if(baseFilter === "new") list = list.filter(p => p.isNew);
    if(baseFilter === "sale") list = list.filter(p => p.isSale);
    if(activeCategory !== "All") list = list.filter(p => p.category === activeCategory);
    if(searchTerm) list = list.filter(p =>
      p.name.toLowerCase().includes(searchTerm) || (p.category || "").toLowerCase().includes(searchTerm)
    );

    if(sort === "price-asc") list.sort((a,b) => a.price - b.price);
    if(sort === "price-desc") list.sort((a,b) => b.price - a.price);
    if(sort === "new") list.sort((a,b) => (b.isNew - a.isNew));
    return list;
  }

  const LIST_SEO = {
    all: { name: "Shop Abayas Online — Label by Zare Collection", url: "/shop" },
    new: { name: "New Arrival Abayas Online", url: "/new-arrivals" },
    sale: { name: "Abayas on Sale Online", url: "/sale" },
  };

  function render(){
    const list = getFiltered();
    grid.innerHTML = list.length
      ? list.map(productCard).join("")
      : `<div class="empty-state" style="grid-column:1/-1"><p>No pieces match these filters.</p></div>`;
    document.querySelector(".js-result-count") && (document.querySelector(".js-result-count").textContent = list.length);
    if (window.LZSEO) {
      const cfg = LIST_SEO[baseFilter] || LIST_SEO.all;
      LZSEO.applyItemList(list, cfg.name, cfg.url);
    }
    if(window.gsap && window.ScrollTrigger){
      gsap.utils.toArray("#collection-grid .product-card").forEach((card) => {
        gsap.fromTo(card, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .7, ease: "power3.out",
          scrollTrigger: { trigger: card, start: "top 95%" } });
      });
    }
  }

  document.querySelectorAll(".filter-bar .chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-bar .chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeCategory = chip.dataset.cat;
      render();
    });
  });

  document.querySelector(".select-min[data-role='sort']")?.addEventListener("change", (e) => {
    sort = e.target.value;
    render();
  });

  grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Loading collection…</p></div>`;
  (window.PRODUCTS_READY || Promise.resolve()).then(render);
});
