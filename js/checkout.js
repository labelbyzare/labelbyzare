/* ========================================================================== 
   LABEL BY ZARE — CHECKOUT
   ========================================================================== */

/* Every order placed on the site is saved to Supabase (your permanent
   record, viewable in admin.html → Orders) AND emailed to you via
   Formspree, exactly as before. If Formspree ever fails, the order is
   still safely saved in Supabase. Change this URL if you ever create
   a new Formspree form. */
const FORMSPREE_ENDPOINT = "https://formspree.io/f/maewqpdq";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("checkout-form");
  if(!form) return;

  Promise.all([window.PRODUCTS_READY || Promise.resolve(), window.LZ_SETTINGS_READY || Promise.resolve()]).then(() => initCheckout(form));
});

async function loadSavedAddresses(form){
  if(typeof CustomerAuth === "undefined") return;
  const user = await CustomerAuth.getUser();
  if(!user) return;

  document.getElementById("save-address-label").style.display = "flex";

  const addresses = await CustomerAuth.listAddresses();
  if(addresses.length === 0) return;

  const wrap = document.getElementById("saved-address-field");
  const select = document.getElementById("savedAddress");
  wrap.style.display = "block";
  addresses.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a.id;
    opt.textContent = `${a.label} — ${a.address}, ${a.city}`;
    select.appendChild(opt);
  });

  select.addEventListener("change", () => {
    const chosen = addresses.find(a => a.id === select.value);
    if(!chosen) return;
    form.querySelector("#fullName").value = chosen.full_name;
    form.querySelector("#phone").value = chosen.phone;
    form.querySelector("#country").value = chosen.country;
    form.querySelector("#city").value = chosen.city;
    form.querySelector("#area").value = chosen.area;
    form.querySelector("#postal").value = chosen.postal_code || "";
    form.querySelector("#address").value = chosen.address;
    if(user.email) form.querySelector("#email").value = form.querySelector("#email").value || user.email;
  });

  if(!form.querySelector("#email").value) form.querySelector("#email").value = user.email;
}

function initCheckout(form){
  loadSavedAddresses(form).catch(() => {});
  let cart = LZ.getCart();
  const cartTotal = () => cart.reduce((sum, line) => sum + (getProductById(line.id)?.price || 0) * line.qty, 0);
  const summaryList = document.getElementById("order-summary-list");
  const summaryTotals = document.getElementById("order-summary-totals");

  if(cart.length === 0){
    form.closest(".wrap").innerHTML = `<div class="empty-state"><h3 class="serif" style="margin-bottom:1rem">Your bag is empty</h3><a href="/shop" class="btn btn-solid">Shop the Collection</a></div>`;
    return;
  }

  let deliveryFee = LZPolicy.standardFee;
  let deliveryMethod = "standard";
  let deliveryType = "Standard Delivery";
  let paymentType = "Cash on Delivery";
  let appliedDiscount = null;
  let discountAmount = 0;
  let checkoutAttempt = { fingerprint: "", requestId: "" };

  function checkoutRequestId(items){
    const fingerprint = JSON.stringify(items);
    if(checkoutAttempt.fingerprint !== fingerprint || !checkoutAttempt.requestId){
      const id = window.crypto?.randomUUID ? window.crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0, v = c === "x" ? r : (r & 0x3 | 0x8); return v.toString(16); });
      checkoutAttempt = { fingerprint, requestId: id };
    }
    return checkoutAttempt.requestId;
  }

  const promoInput = document.getElementById("promo-code");
  const promoButton = document.getElementById("apply-promo-btn");
  const promoMessage = document.getElementById("promo-message");

  function calculateDiscount(subtotal){
    if(!appliedDiscount) return 0;
    const raw = appliedDiscount.discount_type === "percent" ? subtotal * (Number(appliedDiscount.discount_value) / 100) : Number(appliedDiscount.discount_value);
    return Math.max(0, Math.min(subtotal, Math.round(raw * 100) / 100));
  }

  async function validatePromo(code, quiet=false){
    const normalized = String(code || "").trim().toUpperCase();
    if(!normalized){ appliedDiscount = null; discountAmount = 0; if(!quiet && promoMessage) promoMessage.textContent = "Enter a coupon code first."; renderSummary(); return false; }
    if(promoButton) promoButton.disabled = true;
    if(!quiet && promoMessage) promoMessage.textContent = "Checking coupon…";
    try{
      const { data, error } = await supabaseClient.rpc("validate_discount", { p_code: normalized, p_subtotal: cartTotal() });
      if(error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if(!row){ appliedDiscount = null; discountAmount = 0; if(!quiet && promoMessage) promoMessage.textContent = "This coupon is invalid, expired, or does not meet the minimum order."; renderSummary(); return false; }
      appliedDiscount = row; discountAmount = calculateDiscount(cartTotal()); if(promoInput) promoInput.value = row.code; if(!quiet && promoMessage){ promoMessage.textContent = `${row.code} applied — you save ${formatPKR(discountAmount)}.`; promoMessage.style.color = "#2f6b4e"; } renderSummary(); return true;
    }catch(error){ appliedDiscount = null; discountAmount = 0; if(!quiet && promoMessage){ promoMessage.textContent = "Coupons are not available right now."; promoMessage.style.color = "var(--taupe)"; } renderSummary(); return false; }
    finally{ if(promoButton) promoButton.disabled = false; }
  }

  function renderSummary(){
    document.querySelectorAll('input[name="delivery"]').forEach(input => { const fee=LZPolicy.shippingFee(cartTotal(), input.value === "900" ? "express" : "standard"); input.closest(".option-card").querySelector(".price").textContent=fee ? formatPKR(fee) : "Free"; });
    summaryList.innerHTML = cart.map(line => { const p = getProductById(line.id); if(!p) return ""; return `<div class="order-line"><div><div class="name">${LZCatalog.escape(p.name)} × ${line.qty}</div><div class="meta">${LZCatalog.escape(line.size)} · ${LZCatalog.escape(line.color)}</div></div><div>${formatPKR(p.price * line.qty)}</div></div>`; }).join("");
    const subtotal = cartTotal(); discountAmount = calculateDiscount(subtotal); deliveryFee = LZPolicy.shippingFee(subtotal, deliveryMethod); const total = Math.max(0, subtotal - discountAmount) + deliveryFee;
    summaryTotals.innerHTML = `<div class="summary-row"><span class="muted">Subtotal</span><span>${formatPKR(subtotal)}</span></div>${discountAmount > 0 ? `<div class="summary-row"><span class="muted">Discount (${LZCatalog.escape(appliedDiscount.code)})</span><span>−${formatPKR(discountAmount)}</span></div>` : ""}<div class="summary-row"><span class="muted">Shipping (${deliveryType})</span><span>${formatPKR(deliveryFee)}</span></div><div class="summary-row total"><span>Total</span><span>${formatPKR(total)}</span></div>`;
  }
  renderSummary();
  if(promoButton) promoButton.addEventListener("click", () => validatePromo(promoInput?.value));
  if(promoInput) promoInput.addEventListener("keydown", event => { if(event.key === "Enter"){ event.preventDefault(); validatePromo(promoInput.value); } });
  const refreshSummary = () => { if(form.querySelector('button[type="submit"]').disabled) return; cart = LZ.getCart(); renderSummary(); };
  window.addEventListener("lz:cart-changed", refreshSummary);
  window.addEventListener("storage", event => { if(event.key === LZ.CART_KEY || event.key === null) refreshSummary(); });
  window.LZAnalytics?.track('begin_checkout',{value:cartTotal(),items:cart.map(line=>{const p=getProductById(line.id);return p ? LZAnalytics.item(p,line.qty,line.size,line.color) : null;}).filter(Boolean)});

  document.querySelectorAll('input[name="delivery"]').forEach(input => input.addEventListener("change", () => { document.querySelectorAll('.delivery-card').forEach(c => c.classList.remove("active")); input.closest(".option-card").classList.add("active"); deliveryMethod = input.value === "900" ? "express" : "standard"; deliveryType = input.closest(".option-card").querySelector(".title").textContent.trim(); renderSummary(); }));
  document.querySelectorAll('input[name="payment"]').forEach(input => input.addEventListener("change", () => { document.querySelectorAll('.payment-card').forEach(c => c.classList.remove("active")); input.closest(".option-card").classList.add("active"); paymentType = input.closest(".option-card").querySelector(".title").textContent.trim(); }));

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); if(!form.checkValidity()){ form.reportValidity(); return; }
    const submitBtn = form.querySelector('button[type="submit"]'); if(submitBtn.disabled) return; const originalBtnText = submitBtn.textContent;
    cart = LZ.getCart(); renderSummary(); const previousTotal = cartTotal(); submitBtn.disabled = true; submitBtn.textContent = 'Checking availability…';
    try{ await window.loadProducts(); } catch(error){ window.PRODUCTS_LOAD_ERROR = true; }
    const invalid=!cart.length || cart.some(line=>{ const p=getProductById(line.id); return !p || !isInStock(p) || !Number.isInteger(line.qty) || line.qty<1 || !p.sizes.includes(line.size) || !p.colors.some(c=>c.name===line.color); });
    if(window.PRODUCTS_LOAD_ERROR || invalid || cartTotal()!==previousTotal){ renderSummary(); LZ.showToast(window.PRODUCTS_LOAD_ERROR ? 'We couldn’t check availability. Please try again.' : invalid ? 'A piece or option is unavailable. Please review your bag.' : 'A price has changed. Please review the updated total.'); submitBtn.disabled=false;submitBtn.textContent=originalBtnText;return; }
    if(appliedDiscount){ const stillValid = await validatePromo(appliedDiscount.code, true); if(!stillValid){ LZ.showToast("That coupon is no longer valid. Please review your updated total."); submitBtn.disabled=false;submitBtn.textContent=originalBtnText;return; } }

    const name = document.getElementById("fullName").value.trim(); const email = document.getElementById("email").value.trim(); const phone = document.getElementById("phone").value.trim(); const country = document.getElementById("country").value.trim(); const city = document.getElementById("city").value.trim(); const area = document.getElementById("area").value.trim(); const postal = document.getElementById("postal").value.trim(); const address = document.getElementById("address").value.trim();
    const requestItems = cart.map(line => ({ id:String(line.id), size:String(line.size), color:String(line.color), qty:Number(line.qty) })); const requestId = checkoutRequestId(requestItems); const analyticsContext = window.LZAnalytics?.context?.() || {};
    submitBtn.disabled = true; submitBtn.textContent = "Placing your order…";

    let currentUser = null, dbError = null, orderResult = null;
    try{
      currentUser = (typeof CustomerAuth !== "undefined") ? await CustomerAuth.getUser() : null;
      const response = await supabaseClient.rpc("place_order", { p_request_id: requestId, p_full_name: name, p_email: email, p_phone: phone, p_country: country, p_city: city, p_area: area, p_postal_code: postal || null, p_address: address, p_delivery_method: deliveryMethod, p_items: requestItems, p_discount_code: appliedDiscount?.code || null, p_analytics_session_id: analyticsContext.sessionId || null, p_analytics_visitor_id: analyticsContext.visitorId || null, p_terms_accepted: Boolean(form.querySelector("#legalConsent")?.checked) });
      if(response?.error) throw response.error; orderResult = Array.isArray(response?.data) ? response.data[0] : response?.data; if(!orderResult?.order_number) throw new Error("Order confirmation was incomplete.");
    } catch(error){ dbError = error; }

    if(dbError){ console.error("Order failed to save:", dbError.message || dbError); const message = /coupon/i.test(String(dbError.message || "")) ? "That coupon is no longer valid. Please review your order." : /available|size|colour|color|bag/i.test(String(dbError.message || "")) ? "A piece or option changed while you were checking out. Please review your bag." : "Couldn't place your order — please check your connection and try again."; LZ.showToast(message); submitBtn.disabled = false; submitBtn.textContent = originalBtnText; return; }

    const orderNum = String(orderResult.order_number); const subtotal = Number(orderResult.subtotal || 0); deliveryFee = Number(orderResult.shipping_fee || 0); discountAmount = Number(orderResult.discount_amount || 0); const finalTotal = Number(orderResult.total || 0); deliveryType = String(orderResult.delivery_type || deliveryType); paymentType = String(orderResult.payment_type || paymentType); const serverItems = Array.isArray(orderResult.items) ? orderResult.items : []; const itemCount = serverItems.reduce((sum, line) => sum + Math.max(0, Number(line.qty) || 0), 0);
    const itemsText = serverItems.map(line => `${line.name} — Size ${line.size}, Color ${line.color} × ${line.qty} — ${formatPKR(Number(line.price || 0) * Number(line.qty || 0))}`).join("\n");
    try{ localStorage.setItem("lz_last_order", JSON.stringify({ orderNum, name, total: finalTotal, items: itemCount, paymentType, deliveryType })); } catch(error){}
    try{ LZ.saveCart([]); } catch(error){}
    document.getElementById("checkout-view").style.display = "none"; const conf = document.getElementById("confirmation-view"); conf.style.display = "flex"; conf.setAttribute("tabindex", "-1"); conf.focus({ preventScroll: true }); document.getElementById("conf-order-num").textContent = orderNum; document.getElementById("conf-name").textContent = name; document.getElementById("conf-total").textContent = formatPKR(finalTotal); window.scrollTo({ top: 0, behavior: "smooth" });

    window.LZAnalytics?.track('purchase',{ transaction_id:orderNum, value:finalTotal, shipping:deliveryFee, items:serverItems.map(line=>({ item_id:line.id, item_name:line.name, item_brand:"Label by Zare", item_variant:[line.size,line.color].filter(Boolean).join(" / "), price:Number(line.price || 0), quantity:Number(line.qty || 0) })) });

    const fd = new FormData(); fd.append("_subject", `New Order ${orderNum} — Label by Zare`); fd.append("Order Number", orderNum); fd.append("Full Name", name); fd.append("email", email); fd.append("Phone", phone); fd.append("Country", country); fd.append("City", city); fd.append("Area", area); fd.append("Postal Code", postal || "—"); fd.append("Address", address); fd.append("Delivery Type", deliveryType); fd.append("Payment Type", paymentType); fd.append("Items", itemsText); fd.append("Subtotal", formatPKR(subtotal)); if(discountAmount > 0) fd.append("Discount", `${appliedDiscount?.code || "Discount"} — ${formatPKR(discountAmount)}`); fd.append("Shipping Fee", formatPKR(deliveryFee)); fd.append("Total", formatPKR(finalTotal));
    const emailController = new AbortController(); const emailTimeout = setTimeout(() => emailController.abort(), 5000);
    try { const res = await fetch(FORMSPREE_ENDPOINT, { method: "POST", signal: emailController.signal, body: fd, headers: { "Accept": "application/json" } }); if(!res.ok) throw new Error("Formspree request failed"); } catch(err){} finally { clearTimeout(emailTimeout); }
    if(currentUser && form.querySelector("#saveAddress")?.checked){ await CustomerAuth.saveAddress({ label: "Home", full_name: name, phone, country, city, area, postal_code: postal || null, address, is_default: false }).catch(()=>{}); }
  });
}
