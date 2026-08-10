/* ==========================================================================
   LABEL BY ZARE — CART PAGE + WISHLIST PAGE
   ========================================================================== */

window.renderCartPage = function(){
  const list = document.getElementById("cart-list");
  const summary = document.getElementById("cart-summary");
  const empty = document.getElementById("cart-empty");
  const layout = document.getElementById("cart-layout");
  if(!list) return;

  const cart = LZ.getCart();
  if(cart.length === 0){
    layout.style.display = "none";
    empty.style.display = "block";
    return;
  }
  layout.style.display = "grid";
  empty.style.display = "none";

  list.innerHTML = cart.map((line, i) => {
    const p = getProductById(line.id);
    if(!p) return "";
    return `<div class="cart-line">
      <a href="product.html?id=${p.id}"><img src="${p.img}" alt="${p.name}"></a>
      <div>
        <a href="product.html?id=${p.id}" class="cart-line-name serif">${p.name}</a>
        <div class="cart-line-meta">${line.size} · ${line.color}</div>
        <div class="cart-line-controls">
          <div class="qty-stepper">
            <button aria-label="Decrease quantity" onclick="LZ.updateQty(${i},-1)">−</button>
            <span>${line.qty}</span>
            <button aria-label="Increase quantity" onclick="LZ.updateQty(${i},1)">+</button>
          </div>
          <button class="cart-line-remove" onclick="LZ.removeFromCart(${i})">Remove</button>
        </div>
      </div>
      <div class="cart-line-price">${formatPKR(p.price * line.qty)}</div>
    </div>`;
  }).join("");

  const subtotal = LZ.cartTotal();
  const shipping = subtotal >= 15000 || subtotal === 0 ? 0 : 350;
  summary.innerHTML = `
    <h3 class="serif" style="font-size:1.3rem;margin-bottom:1.2rem">Order Summary</h3>
    <div class="summary-row"><span class="muted">Subtotal</span><span>${formatPKR(subtotal)}</span></div>
    <div class="summary-row"><span class="muted">Shipping</span><span>${shipping === 0 ? "Free" : formatPKR(shipping)}</span></div>
    <div class="summary-row total"><span>Total</span><span>${formatPKR(subtotal + shipping)}</span></div>
    <a href="checkout.html" class="btn btn-solid btn-block" style="margin-top:1.4rem">Proceed to Checkout</a>
    <a href="shop.html" class="btn btn-outline btn-block" style="margin-top:.8rem">Continue Shopping</a>
  `;
};

window.renderWishlistPage = function(){
  const grid = document.getElementById("wishlist-grid");
  const empty = document.getElementById("wishlist-empty");
  if(!grid) return;
  const ids = LZ.getWishlist();
  if(ids.length === 0){
    grid.style.display = "none";
    empty.style.display = "block";
    return;
  }
  grid.style.display = "grid";
  empty.style.display = "none";
  grid.innerHTML = ids.map(id => {
    const p = getProductById(id);
    if(!p) return "";
    const stocked = isInStock(p);
    return `<div class="product-card ${stocked ? "" : "is-soldout"}">
      <a href="product.html?id=${p.id}">
        <div class="product-media">
          <div class="product-tags">
            ${!stocked ? '<span class="tag tag-soldout">Sold Out</span>' : ""}
          </div>
          <img class="img-primary" src="${p.img}" alt="${p.name}">
          <img class="img-secondary" src="${p.img2}" alt="">
        </div>
      </a>
      <button class="wishlist-btn active" data-wish-id="${p.id}" aria-label="Remove from wishlist">
        <svg viewBox="0 0 24 24" stroke-width="1.5"><path d="M12 20.5s-7.5-4.6-10-9.3C.5 8 2 4.5 5.5 4c2-.3 3.7.6 4.9 2.2C11.7 4.7 13.3 3.8 15.5 4c3.5.5 5 4 3.5 7.2-2.5 4.7-10 9.3-10 9.3Z"/></svg>
      </button>
      <div class="quick-add">
        <button class="btn btn-solid btn-block btn-sm" ${stocked ? `onclick="LZ.addToCart('${p.id}','${p.sizes[0]}','${p.colors[0].name}',1)"` : "disabled"}>${stocked ? "Add to Cart" : "Sold Out"}</button>
      </div>
      <a href="product.html?id=${p.id}">
        <div class="product-info">
          <div><h3>${p.name}</h3><div class="cat">${p.category}</div></div>
          <div class="price-row"><span class="price">${formatPKR(p.price)}</span></div>
        </div>
      </a>
    </div>`;
  }).join("");
};

document.addEventListener("DOMContentLoaded", () => {
  (window.PRODUCTS_READY || Promise.resolve()).then(() => {
    window.renderCartPage();
    window.renderWishlistPage();
  });
});
