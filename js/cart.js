/* ==========================================================================
   LABEL BY ZARE — CART & WISHLIST
   Handles all localStorage state + the slide-out cart drawer + toasts.
   Depends on data.js being loaded first.
   ========================================================================== */

const LZ = {
  CART_KEY: "lz_cart",
  WISH_KEY: "lz_wishlist",

  getCart(){
    try{
      const cart = JSON.parse(localStorage.getItem(this.CART_KEY));
      return Array.isArray(cart) ? cart.filter(line => line && typeof line.id === "string" && line.id && typeof line.size === "string" && typeof line.color === "string" && Number.isSafeInteger(line.qty) && line.qty > 0) : [];
    }
    catch(e){ return []; }
  },
  saveCart(cart){
    localStorage.setItem(this.CART_KEY, JSON.stringify(cart));
    this.refreshBadges();
    this.pushCartToSupabase(cart).catch(() => {});
    window.dispatchEvent(new Event("lz:cart-changed"));
  },
  addToCart(productId, size, color, qty = 1){
    const product = getProductById(productId);
    if(!product || !Number.isInteger(qty) || qty<1) return;
    if(product && typeof isInStock === "function" && !isInStock(product)){
      this.showToast("Sorry, this piece is currently sold out");
      return;
    }
    const cart = this.getCart();
    const existing = cart.find(l => l.id === productId && l.size === size && l.color === color);
    if(existing){ existing.qty += qty; }
    else{ cart.push({ id: productId, size, color, qty }); }
    this.saveCart(cart);
    this.openDrawer();
    this.showToast("Added to your bag");
    window.LZAnalytics?.track("add_to_cart",{value:product.price*qty,items:[LZAnalytics.item(product,qty,size,color)]});
  },
  removeFromCart(index){
    const cart = this.getCart();
    cart.splice(index, 1);
    this.saveCart(cart);
    this.renderDrawer();
    if(typeof window.renderCartPage === "function") window.renderCartPage();
  },
  updateQty(index, delta){
    const cart = this.getCart();
    if(!cart[index]) return;
    cart[index].qty = Math.max(1, cart[index].qty + delta);
    this.saveCart(cart);
    this.renderDrawer();
    if(typeof window.renderCartPage === "function") window.renderCartPage();
  },
  cartCount(){
    return this.getCart().reduce((sum, l) => sum + l.qty, 0);
  },
  cartTotal(){
    return this.getCart().reduce((sum, l) => {
      const p = getProductById(l.id);
      return p ? sum + p.price * l.qty : sum;
    }, 0);
  },

  getWishlist(){
    try{
      const list = JSON.parse(localStorage.getItem(this.WISH_KEY));
      return Array.isArray(list) ? [...new Set(list.filter(id => typeof id === "string" && id))] : [];
    }
    catch(e){ return []; }
  },
  saveWishlist(list){
    localStorage.setItem(this.WISH_KEY, JSON.stringify(list));
    this.refreshBadges();
    this.pushWishlistToSupabase(list).catch(() => {});
  },

  // ---- Supabase sync (logged-in customers only; silently does nothing
  // for guests, and never blocks the local cart/wishlist from working) ----

  async pushCartToSupabase(cart){
    if(typeof supabaseClient === "undefined") return;
    const { data: { user } } = await supabaseClient.auth.getUser();
    if(!user) return;
    await supabaseClient.from("cart_items").delete().eq("user_id", user.id);
    if(cart.length === 0) return;
    await supabaseClient.from("cart_items").insert(
      cart.map(l => ({ user_id: user.id, product_id: l.id, size: l.size, color: l.color, qty: l.qty }))
    );
  },

  async pushWishlistToSupabase(list){
    if(typeof supabaseClient === "undefined") return;
    const { data: { user } } = await supabaseClient.auth.getUser();
    if(!user) return;
    await supabaseClient.from("wishlist_items").delete().eq("user_id", user.id);
    if(list.length === 0) return;
    await supabaseClient.from("wishlist_items").insert(
      list.map(id => ({ user_id: user.id, product_id: id }))
    );
  },

  // Called right after login: merges whatever was saved in this browser's
  // localStorage with whatever is already saved for this customer in
  // Supabase (from another device), so nothing gets lost either way.
  async syncAfterLogin(){
    if(typeof supabaseClient === "undefined") return;
    const { data: { user } } = await supabaseClient.auth.getUser();
    if(!user) return;

    const [{ data: remoteCart }, { data: remoteWish }] = await Promise.all([
      supabaseClient.from("cart_items").select("*").eq("user_id", user.id),
      supabaseClient.from("wishlist_items").select("*").eq("user_id", user.id)
    ]);

    const localCart = this.getCart();
    const mergedCart = [...localCart];
    (remoteCart || []).forEach(r => {
      const match = mergedCart.find(l => l.id === r.product_id && l.size === r.size && l.color === r.color);
      if(match) match.qty = Math.max(match.qty, r.qty);
      else mergedCart.push({ id: r.product_id, size: r.size, color: r.color, qty: r.qty });
    });

    const localWish = this.getWishlist();
    const mergedWish = Array.from(new Set([...localWish, ...(remoteWish || []).map(r => r.product_id)]));

    localStorage.setItem(this.CART_KEY, JSON.stringify(mergedCart));
    localStorage.setItem(this.WISH_KEY, JSON.stringify(mergedWish));
    this.refreshBadges();
    await this.pushCartToSupabase(mergedCart);
    await this.pushWishlistToSupabase(mergedWish);
  },
  toggleWishlist(productId){
    let list = this.getWishlist();
    const has = list.includes(productId);
    if(has){ list = list.filter(id => id !== productId); }
    else{ list.push(productId); this.showToast("Saved to wishlist"); }
    this.saveWishlist(list);
    document.querySelectorAll("[data-wish-id]").forEach(btn => {
      if(btn.getAttribute("data-wish-id") !== productId) return;
      btn.classList.toggle("active", !has);
    });
    if(typeof window.renderWishlistPage === "function") window.renderWishlistPage();
    return !has;
  },
  isWished(productId){ return this.getWishlist().includes(productId); },

  refreshBadges(){
    document.querySelectorAll(".js-cart-count").forEach(el => {
      const n = this.cartCount();
      el.textContent = n;
      el.style.display = n > 0 ? "flex" : "none";
    });
    document.querySelectorAll(".js-wish-count").forEach(el => {
      const n = this.getWishlist().length;
      el.textContent = n;
      el.style.display = n > 0 ? "flex" : "none";
    });
  },

  showToast(msg){
    let toast = document.querySelector(".toast");
    if(!toast){
      toast = document.createElement("div");
      toast.className = "toast";
      toast.innerHTML = `<span class="dot"></span><span class="toast-msg"></span>`;
      document.body.appendChild(toast);
    }
    toast.querySelector(".toast-msg").textContent = msg;
    toast.classList.add("show");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  },

  openDrawer(){
    this.renderDrawer();
    const drawer = document.querySelector(".cart-drawer");
    if(!drawer) return;
    if(!drawer.classList.contains("open")){
      this._drawerOpener = document.activeElement;
      this._drawerOverflow = document.body.style.overflow;
    }
    drawer.inert = false;
    drawer.setAttribute("aria-hidden", "false");
    drawer.classList.add("open");
    document.querySelector(".cart-drawer-backdrop")?.classList.add("open");
    document.body.style.overflow = "hidden";
    drawer.querySelector(".js-close-drawer")?.focus({ preventScroll: true });
    if(!window.CATALOG_COMPLETE && this.getCart().length){
      const body=document.querySelector('.drawer-body');
      const foot=document.querySelector('.drawer-foot');
      if(body) body.innerHTML='<p role="status">Checking the latest prices…</p>';
      if(foot) foot.style.display='none';
      window.ensureFullCatalog().then(()=>{
        if(window.PRODUCTS_LOAD_ERROR){if(body) body.innerHTML='<p>We couldn’t check your bag. Please close it and try again.</p>';return;}
        this.renderDrawer();
      });
    }
  },
  closeDrawer(){
    const drawer = document.querySelector(".cart-drawer");
    if(!drawer?.classList.contains("open")) return;
    drawer.classList.remove("open");
    document.querySelector(".cart-drawer-backdrop")?.classList.remove("open");
    document.body.style.overflow = this._drawerOverflow || "";
    if(this._drawerOpener?.isConnected) this._drawerOpener.focus({ preventScroll: true });
    drawer.inert = true;
    drawer.setAttribute("aria-hidden", "true");
  },

  trapFocus(panel, event){
    if(event.key !== "Tab") return;
    const controls = [...panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')].filter(el => el.getClientRects().length && !el.closest("[inert]"));
    const first = controls[0], last = controls[controls.length - 1];
    if(!first){ event.preventDefault(); return; }
    if(!panel.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)){
      event.preventDefault(); (event.shiftKey ? last : first).focus();
    } else if(!event.shiftKey && document.activeElement === last){
      event.preventDefault(); first.focus();
    }
  },

  renderDrawer(){
    const body = document.querySelector(".drawer-body");
    const foot = document.querySelector(".drawer-foot");
    if(!body) return;
    const cart = this.getCart();
    if(cart.length === 0){
      body.innerHTML = `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.2"><path d="M3 6h18l-1.5 12.5a2 2 0 0 1-2 1.5H6.5a2 2 0 0 1-2-1.5L3 6Z"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg>
        <p>Your bag is empty.</p>
        <a href="/shop" class="btn btn-solid btn-sm">Shop the Collection</a>
      </div>`;
      if(foot) foot.style.display = "none";
      return;
    }
    if(foot) foot.style.display = "block";
    body.innerHTML = cart.map((line, i) => {
      const p = getProductById(line.id);
      if(!p) return "";
      return `<div class="drawer-line">
        <img src="${LZCatalog.escape(LZCatalog.image(p.img))}" alt="${LZCatalog.escape(LZCatalog.imageAlt(p))}" loading="lazy">
        <div>
          <div class="drawer-line-name">${LZCatalog.escape(p.name)}</div>
          <div class="drawer-line-meta">${LZCatalog.escape(line.size)} · ${LZCatalog.escape(line.color)}</div>
          <div class="qty-stepper" style="width:fit-content">
            <button aria-label="Decrease quantity" onclick="LZ.updateQty(${i},-1)">−</button>
            <span>${line.qty}</span>
            <button aria-label="Increase quantity" onclick="LZ.updateQty(${i},1)">+</button>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:600;margin-bottom:.6rem">${formatPKR(p.price * line.qty)}</div>
          <button class="cart-line-remove" onclick="LZ.removeFromCart(${i})">Remove</button>
        </div>
      </div>`;
    }).join("");
    if(foot){
      const subtotal = this.cartTotal();
      foot.innerHTML = `
        <div class="summary-row"><span class="muted">Subtotal</span><span>${formatPKR(subtotal)}</span></div>
        <div class="summary-row"><span class="muted">Shipping</span><span>Calculated at checkout</span></div>
        <a href="/checkout" class="btn btn-solid btn-block" style="margin-top:1rem">Checkout</a>
        <a href="/cart" class="btn btn-outline btn-block" style="margin-top:.7rem">View Bag</a>
      `;
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  LZ.refreshBadges();
  if(typeof supabaseClient !== "undefined"){
    supabaseClient.auth.getUser().then(({ data }) => {
      if(data.user) return LZ.syncAfterLogin();
    }).catch(() => {});
  }

  document.querySelector(".js-open-cart")?.addEventListener("click", (e) => {
    e.preventDefault();
    LZ.openDrawer();
  });
  document.querySelector(".cart-drawer-backdrop")?.addEventListener("click", () => LZ.closeDrawer());
  document.querySelector(".js-close-drawer")?.addEventListener("click", () => LZ.closeDrawer());
  document.addEventListener("keydown", event => {
    const drawer = document.querySelector(".cart-drawer.open");
    if(!drawer || document.querySelector(".search-overlay.open, .zoom-lightbox.active")) return;
    if(event.key === "Escape"){
      event.preventDefault(); event.stopImmediatePropagation(); LZ.closeDrawer();
    } else LZ.trapFocus(drawer, event);
  });

  // wishlist buttons anywhere on the page
  document.body.addEventListener("click", (e) => {
    const quickAdd = e.target.closest("[data-quick-add]");
    if(quickAdd){
      e.preventDefault();
      const product = getProductById(quickAdd.getAttribute("data-quick-add"));
      if(product?.sizes?.length && product?.colors?.length) LZ.addToCart(product.id, product.sizes[0], product.colors[0].name, 1);
      return;
    }
    const btn = e.target.closest("[data-wish-id]");
    if(btn){
      e.preventDefault();
      const id = btn.getAttribute("data-wish-id");
      const active = LZ.toggleWishlist(id);
      document.querySelectorAll("[data-wish-id]").forEach(b => {
        if(b.getAttribute("data-wish-id") === id) b.classList.toggle("active", active);
      });
    }
  });
});
