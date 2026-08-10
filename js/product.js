/* ==========================================================================
   LABEL BY ZARE — PRODUCT DETAIL PAGE
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("pdp-root");
  if(!root) return;

  root.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Loading…</p></div>`;
  (window.PRODUCTS_READY || Promise.resolve()).then(() => buildProductPage(root));
});

function buildProductPage(root){
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || PRODUCTS[0].id;
  const p = getProductById(id) || PRODUCTS[0];

  let selectedSize = p.sizes[Math.floor(p.sizes.length/2)] || p.sizes[0];
  let selectedColor = p.colors[0].name;
  let qty = 1;
  const stocked = isInStock(p);

  document.title = `${p.name} — Label by Zare`;

  root.innerHTML = `
    <div class="pdp-gallery reveal">
      <div class="pdp-main-img">
        <img id="pdp-main-img" src="${p.gallery[0]}" alt="${p.name}">
      </div>
      <div class="pdp-thumbs">
        ${p.gallery.map((src, i) => `
          <button class="${i === 0 ? "active" : ""}" data-src="${src}" aria-label="View image ${i+1}">
            <img src="${src}" alt="">
          </button>`).join("")}
      </div>
    </div>
    <div class="pdp-info reveal">
      <div class="cat-label">${p.category} ${p.isNew ? "· New Arrival" : ""}</div>
      <h1 class="serif">${p.name}</h1>
      <div class="pdp-price">
        ${p.oldPrice ? `<span class="price-old">${formatPKR(p.oldPrice)}</span>` : ""}
        <span class="${p.isSale ? "price-sale" : ""}">${formatPKR(p.price)}</span>
      </div>
      <p class="lede">${p.description}</p>
      <div class="pdp-stock ${stocked ? "" : "out"}">${stocked ? "In Stock" : "Sold Out"}</div>

      <div class="option-block">
        <div class="option-label"><span>Color</span><span class="muted" id="color-label">${selectedColor}</span></div>
        <div class="swatches" id="color-swatches">
          ${p.colors.map(c => `
            <button class="swatch-color ${c.name === selectedColor ? "active" : ""}" style="background:${c.hex}" data-color="${c.name}" aria-label="${c.name}"></button>
          `).join("")}
        </div>
      </div>

      <div class="option-block">
        <div class="option-label"><span>Size</span><span class="muted link-underline" style="cursor:pointer" id="size-guide-btn">Size Guide</span></div>
        <div class="swatches" id="size-swatches">
          ${p.sizes.map(s => `
            <button class="swatch-size ${s === selectedSize ? "active" : ""}" data-size="${s}">${s}</button>
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
        <button class="icon-btn-round ${LZ.isWished(p.id) ? "active" : ""}" data-wish-id="${p.id}" aria-label="Save to wishlist">
          <svg viewBox="0 0 24 24" stroke-width="1.5"><path d="M12 20.5s-7.5-4.6-10-9.3C.5 8 2 4.5 5.5 4c2-.3 3.7.6 4.9 2.2C11.7 4.7 13.3 3.8 15.5 4c3.5.5 5 4 3.5 7.2-2.5 4.7-10 9.3-10 9.3Z"/></svg>
        </button>
      </div>
      <button class="btn btn-outline btn-block" id="buy-now" ${stocked ? "" : "disabled"}>${stocked ? "Buy Now" : "Sold Out"}</button>
      <p class="pdp-note">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/></svg>
        Free nationwide delivery on orders over PKR 15,000
      </p>

      <div class="accordion">
        <div class="acc-item open">
          <button class="acc-head">Details <span class="plus"></span></button>
          <div class="acc-body" style="max-height:200px"><div class="acc-body-inner">${p.description}</div></div>
        </div>
        <div class="acc-item">
          <button class="acc-head">Fabric &amp; Care <span class="plus"></span></button>
          <div class="acc-body"><div class="acc-body-inner">${p.fabric}</div></div>
        </div>
        <div class="acc-item">
          <button class="acc-head">Shipping <span class="plus"></span></button>
          <div class="acc-body"><div class="acc-body-inner">${getShippingText(p)}</div></div>
        </div>
        <div class="acc-item">
          <button class="acc-head">Returns <span class="plus"></span></button>
          <div class="acc-body"><div class="acc-body-inner">${getReturnsText(p)}</div></div>
        </div>
      </div>
    </div>
  `;

  // gallery thumbs
  root.querySelectorAll(".pdp-thumbs button").forEach(btn => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".pdp-thumbs button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const img = document.getElementById("pdp-main-img");
      if(window.gsap){
        gsap.to(img, { opacity: 0, duration: .18, onComplete: () => {
          img.src = btn.dataset.src;
          gsap.to(img, { opacity: 1, duration: .28 });
        }});
      } else { img.src = btn.dataset.src; }
    });
  });

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
    location.href = "checkout.html";
  });

  document.getElementById("size-guide-btn")?.addEventListener("click", () => {
    alert("Size Guide\n\nXS — Bust 32\" / Length 54\"\nS — Bust 34\" / Length 55\"\nM — Bust 36\" / Length 56\"\nL — Bust 38\" / Length 57\"\nXL — Bust 40\" / Length 58\"");
  });

  // accordion first item open height fix after render
  requestAnimationFrame(() => {
    const openBody = root.querySelector(".acc-item.open .acc-body");
    if(openBody) openBody.style.maxHeight = openBody.scrollHeight + "px";
  });

  // related products
  const relatedGrid = document.getElementById("related-grid");
  if(relatedGrid){
    const related = PRODUCTS.filter(rp => rp.id !== p.id && rp.category === p.category).slice(0,4);
    const fallback = related.length ? related : PRODUCTS.filter(rp => rp.id !== p.id).slice(0,4);
    relatedGrid.innerHTML = fallback.map(rp => `
      <div class="product-card ${isInStock(rp) ? "" : "is-soldout"}">
        <a href="product.html?id=${rp.id}">
          <div class="product-media">
            <div class="product-tags">
              ${!isInStock(rp) ? '<span class="tag tag-soldout">Sold Out</span>' : (rp.isNew ? '<span class="tag tag-new">New</span>' : "")}
            </div>
            <img class="img-primary" src="${rp.img}" alt="${rp.name}">
            <img class="img-secondary" src="${rp.img2}" alt="">
          </div>
        </a>
        <a href="product.html?id=${rp.id}">
          <div class="product-info">
            <div><h3>${rp.name}</h3><div class="cat">${rp.category}</div></div>
            <div class="price-row"><span class="price">${formatPKR(rp.price)}</span></div>
          </div>
        </a>
      </div>
    `).join("");
  }
}
