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

  (window.PRODUCTS_READY || Promise.resolve()).then(() => initCheckout(form));
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

  // pre-fill email for a logged-in, first-time checkout
  if(!form.querySelector("#email").value) form.querySelector("#email").value = user.email;
}

function initCheckout(form){
  loadSavedAddresses(form);
  const cart = LZ.getCart();
  const summaryList = document.getElementById("order-summary-list");
  const summaryTotals = document.getElementById("order-summary-totals");

  if(cart.length === 0){
    form.closest(".wrap").innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.2"><path d="M3 6h18l-1.5 12.5a2 2 0 0 1-2 1.5H6.5a2 2 0 0 1-2-1.5L3 6Z"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg>
        <h3 class="serif" style="margin-bottom:1rem">Your bag is empty</h3>
        <a href="shop.html" class="btn btn-solid">Shop the Collection</a>
      </div>`;
    return;
  }

  let deliveryFee = 350;
  let deliveryType = "Standard Delivery";
  let paymentType = "Cash on Delivery";

  function renderSummary(){
    summaryList.innerHTML = cart.map(line => {
      const p = getProductById(line.id);
      if(!p) return "";
      return `<div class="order-line">
        <div>
          <div class="name">${p.name} × ${line.qty}</div>
          <div class="meta">${line.size} · ${line.color}</div>
        </div>
        <div>${formatPKR(p.price * line.qty)}</div>
      </div>`;
    }).join("");

    const subtotal = LZ.cartTotal();
    const total = subtotal + deliveryFee;
    summaryTotals.innerHTML = `
      <div class="summary-row"><span class="muted">Subtotal</span><span>${formatPKR(subtotal)}</span></div>
      <div class="summary-row"><span class="muted">Shipping (${deliveryType})</span><span>${formatPKR(deliveryFee)}</span></div>
      <div class="summary-row total"><span>Total</span><span>${formatPKR(total)}</span></div>
    `;
  }
  renderSummary();

  // delivery option cards
  document.querySelectorAll('input[name="delivery"]').forEach(input => {
    input.addEventListener("change", () => {
      document.querySelectorAll('.delivery-card').forEach(c => c.classList.remove("active"));
      input.closest(".option-card").classList.add("active");
      deliveryFee = parseInt(input.value, 10);
      deliveryType = input.closest(".option-card").querySelector(".title").textContent.trim();
      renderSummary();
    });
  });

  // payment option cards
  document.querySelectorAll('input[name="payment"]').forEach(input => {
    input.addEventListener("change", () => {
      document.querySelectorAll('.payment-card').forEach(c => c.classList.remove("active"));
      input.closest(".option-card").classList.add("active");
      paymentType = input.closest(".option-card").querySelector(".title").textContent.trim();
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if(!form.checkValidity()){
      form.reportValidity();
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;

    const orderNum = "LZ-" + Math.floor(100000 + Math.random() * 899999);
    const name = document.getElementById("fullName").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const country = document.getElementById("country").value;
    const city = document.getElementById("city").value;
    const area = document.getElementById("area").value;
    const postal = document.getElementById("postal").value;
    const address = document.getElementById("address").value;
    const subtotal = LZ.cartTotal();
    const finalTotal = subtotal + deliveryFee;
    const itemCount = LZ.cartCount();

    const itemsText = cart.map(line => {
      const p = getProductById(line.id);
      if(!p) return "";
      return `${p.name} — Size ${line.size}, Color ${line.color} × ${line.qty} — ${formatPKR(p.price * line.qty)}`;
    }).join("\n");

    const itemsForStorage = cart.map(line => {
      const p = getProductById(line.id);
      if(!p) return null;
      return { name: p.name, size: line.size, color: line.color, qty: line.qty, price: p.price };
    }).filter(Boolean);

    submitBtn.disabled = true;
    submitBtn.textContent = "Placing your order…";

    const currentUser = (typeof CustomerAuth !== "undefined") ? await CustomerAuth.getUser() : null;

    // 1. Save the order to Supabase — your permanent record, viewable
    // in admin.html → Orders, independent of whether the email below
    // succeeds or fails.
    const { error: dbError } = await supabaseClient.from("orders").insert({
      order_number: orderNum,
      full_name: name,
      email: email,
      phone: phone,
      country: country,
      city: city,
      area: area,
      postal_code: postal || null,
      address: address,
      delivery_type: deliveryType,
      payment_type: paymentType,
      items: itemsForStorage,
      subtotal: subtotal,
      shipping_fee: deliveryFee,
      total: finalTotal,
      status: "new",
      user_id: currentUser ? currentUser.id : null
    });

    if(dbError){
      console.error("Order failed to save to Supabase:", dbError.message);
      LZ.showToast("Couldn't place your order — please check your connection and try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      return;
    }

    // 2. Send the order to your email via Formspree, same as before.
    const fd = new FormData();
    fd.append("_subject", `New Order ${orderNum} — Label by Zare`);
    fd.append("Order Number", orderNum);
    fd.append("Full Name", name);
    fd.append("email", email);
    fd.append("Phone", phone);
    fd.append("Country", country);
    fd.append("City", city);
    fd.append("Area", area);
    fd.append("Postal Code", postal || "—");
    fd.append("Address", address);
    fd.append("Delivery Type", deliveryType);
    fd.append("Payment Type", paymentType);
    fd.append("Items", itemsText);
    fd.append("Subtotal", formatPKR(subtotal));
    fd.append("Shipping Fee", formatPKR(deliveryFee));
    fd.append("Total", formatPKR(finalTotal));

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: fd,
        headers: { "Accept": "application/json" }
      });
      if(!res.ok) throw new Error("Formspree request failed");
    } catch(err){
      // The order is already safely saved in Supabase above, so we don't
      // block the customer — just log it for you to notice later.
      console.warn("Order email failed to send (order was still saved):", err);
    }

    // Save this address to the customer's account if they asked to.
    if(currentUser && form.querySelector("#saveAddress")?.checked){
      await CustomerAuth.saveAddress({
        label: "Home",
        full_name: name, phone, country, city, area,
        postal_code: postal || null, address,
        is_default: false
      });
    }

    localStorage.setItem("lz_last_order", JSON.stringify({
      orderNum, name, total: finalTotal, items: itemCount, paymentType, deliveryType
    }));
    LZ.saveCart([]);

    document.getElementById("checkout-view").style.display = "none";
    const conf = document.getElementById("confirmation-view");
    conf.style.display = "flex";
    document.getElementById("conf-order-num").textContent = orderNum;
    document.getElementById("conf-name").textContent = name;
    document.getElementById("conf-total").textContent = formatPKR(finalTotal);

    if(window.gsap){
      gsap.fromTo(".confirmation .check-ring", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: .7, ease: "back.out(1.7)" });
      gsap.fromTo(".confirmation h2, .confirmation p, .confirmation .order-num, .confirmation .btn",
        { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .6, stagger: .1, delay: .2 });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
