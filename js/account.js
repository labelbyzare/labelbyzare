/* ==========================================================================
   LABEL BY ZARE — ACCOUNT DASHBOARD
   Depends on customer-auth.js (CustomerAuth), cart.js (LZ), data.js.
   ========================================================================== */

let currentUser = null;
let currentProfile = null;

function initials(str){
  return (str || "?").trim().charAt(0).toUpperCase();
}

function setAvatar(el, url, name){
  if(url){
    el.innerHTML = `<img src="${url}" alt="Profile photo" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
  } else {
    el.textContent = initials(name);
  }
}

async function boot(){
  currentUser = await CustomerAuth.getUser();
  if(!currentUser){
    window.location.href = "/account-login?redirect=/account";
    return;
  }

  currentProfile = await CustomerAuth.getProfile();
  document.getElementById("account-loading").style.display = "none";
  document.getElementById("account-main").style.display = "block";

  renderSidebar();
  renderProfileTab();
  await LZ.syncAfterLogin();

  const startTab = (window.location.hash || "#profile").replace("#", "");
  switchTab(startTab);
}

function renderSidebar(){
  const name = currentProfile?.full_name || "Customer";
  document.getElementById("sidebar-name").textContent = name;
  document.getElementById("sidebar-email").textContent = currentUser.email;
  setAvatar(document.getElementById("sidebar-avatar"), currentProfile?.avatar_url, name);
}

function switchTab(tab){
  document.querySelectorAll(".tab-panel").forEach(p => p.style.display = "none");
  document.querySelectorAll(".tab-link").forEach(l => l.classList.remove("active"));

  const panel = document.getElementById(`panel-${tab}`);
  const link = document.querySelector(`.tab-link[data-tab="${tab}"]`);
  if(!panel || !link){ switchTab("profile"); return; }

  panel.style.display = "block";
  link.classList.add("active");

  if(tab === "orders") renderOrdersTab();
  if(tab === "addresses") renderAddressesTab();
}

document.querySelectorAll(".tab-link").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const tab = link.getAttribute("data-tab");
    window.location.hash = tab;
    switchTab(tab);
  });
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await CustomerAuth.logout();
  window.location.href = "/";
});

/* ---------------- PROFILE ---------------- */

function renderProfileTab(){
  const name = currentProfile?.full_name || "";
  document.getElementById("profileName").value = name;
  document.getElementById("profileEmailDisplay").value = currentUser.email;
  setAvatar(document.getElementById("profile-avatar"), currentProfile?.avatar_url, name);
}

document.getElementById("avatar-btn").addEventListener("click", () => {
  document.getElementById("avatar-input").click();
});

document.getElementById("avatar-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const errEl = document.getElementById("profile-error");
  const successEl = document.getElementById("profile-success");
  errEl.classList.remove("show");
  successEl.classList.remove("show");

  const { error, avatarUrl } = await CustomerAuth.uploadAvatar(file);
  if(error){
    errEl.textContent = error.message;
    errEl.classList.add("show");
    return;
  }
  currentProfile = { ...currentProfile, avatar_url: avatarUrl };
  setAvatar(document.getElementById("profile-avatar"), avatarUrl, currentProfile.full_name);
  setAvatar(document.getElementById("sidebar-avatar"), avatarUrl, currentProfile.full_name);
  document.querySelectorAll(".nav-avatar-photo").forEach(el => {
    el.innerHTML = `<img src="${avatarUrl}" alt="${currentProfile.full_name || ""}">`;
  });
  successEl.textContent = "Profile photo updated.";
  successEl.classList.add("show");
});

document.getElementById("save-profile-btn").addEventListener("click", async () => {
  const errEl = document.getElementById("profile-error");
  const successEl = document.getElementById("profile-success");
  errEl.classList.remove("show");
  successEl.classList.remove("show");

  const name = document.getElementById("profileName").value.trim();
  const { error } = await CustomerAuth.updateName(name);
  if(error){
    errEl.textContent = error.message;
    errEl.classList.add("show");
    return;
  }
  currentProfile = { ...currentProfile, full_name: name };
  renderSidebar();
  successEl.textContent = "Profile saved.";
  successEl.classList.add("show");
});

/* ---------------- ORDERS ---------------- */

async function renderOrdersTab(){
  const list = document.getElementById("orders-list");
  const empty = document.getElementById("orders-empty");
  list.innerHTML = "";

  const orders = await CustomerAuth.listOrders();
  if(orders.length === 0){
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  list.innerHTML = orders.map(o => {
    const items = (o.items || []).map(i => `${i.name} × ${i.qty}`).join(", ");
    const date = new Date(o.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    return `<div class="order-card">
      <div class="order-card-head">
        <div>
          <div class="order-num">${o.order_number}</div>
          <div style="font-size:0.78rem;color:var(--taupe)">${date}</div>
        </div>
        <span class="order-status-badge">${o.status || "new"}</span>
      </div>
      <div class="order-items-mini">${items}</div>
      <div style="margin-top:.6rem;font-weight:700">${formatPKR(o.total)}</div>
    </div>`;
  }).join("");
}

/* ---------------- ADDRESSES ---------------- */

let editingAddresses = [];

async function renderAddressesTab(){
  const list = document.getElementById("addresses-list");
  const empty = document.getElementById("addresses-empty");
  list.innerHTML = "";

  editingAddresses = await CustomerAuth.listAddresses();
  if(editingAddresses.length === 0){
    empty.style.display = "block";
  } else {
    empty.style.display = "none";
    list.innerHTML = editingAddresses.map(a => `
      <div class="address-card">
        <div class="address-card-head">
          <span class="tag ${a.is_default ? "default" : ""}">${a.label}${a.is_default ? " · Default" : ""}</span>
        </div>
        <div style="font-size:0.9rem;line-height:1.6">
          <strong>${a.full_name}</strong><br>
          ${a.address}, ${a.area}, ${a.city}${a.postal_code ? ", " + a.postal_code : ""}<br>
          ${a.country}<br>
          ${a.phone}
        </div>
        <div class="address-actions">
          <button data-edit="${a.id}">Edit</button>
          <button data-delete="${a.id}" class="danger">Delete</button>
        </div>
      </div>
    `).join("");
  }

  list.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => openAddressForm(btn.getAttribute("data-edit")));
  });
  list.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if(!confirm("Delete this address?")) return;
      await CustomerAuth.deleteAddress(btn.getAttribute("data-delete"));
      renderAddressesTab();
    });
  });
}

function openAddressForm(id){
  const form = document.getElementById("address-form");
  form.style.display = "block";
  if(id){
    const a = editingAddresses.find(x => x.id === id);
    document.getElementById("addrId").value = a.id;
    document.getElementById("addrLabel").value = a.label;
    document.getElementById("addrFullName").value = a.full_name;
    document.getElementById("addrPhone").value = a.phone;
    document.getElementById("addrCountry").value = a.country;
    document.getElementById("addrCity").value = a.city;
    document.getElementById("addrArea").value = a.area;
    document.getElementById("addrPostal").value = a.postal_code || "";
    document.getElementById("addrAddress").value = a.address;
    document.getElementById("addrDefault").checked = a.is_default;
  } else {
    form.reset();
    document.getElementById("addrId").value = "";
  }
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

document.getElementById("add-address-btn").addEventListener("click", () => openAddressForm(null));
document.getElementById("cancel-address-btn").addEventListener("click", () => {
  document.getElementById("address-form").style.display = "none";
});

document.getElementById("address-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("addrId").value || null;
  const { error } = await CustomerAuth.saveAddress({
    id,
    label: document.getElementById("addrLabel").value.trim(),
    full_name: document.getElementById("addrFullName").value.trim(),
    phone: document.getElementById("addrPhone").value.trim(),
    country: document.getElementById("addrCountry").value,
    city: document.getElementById("addrCity").value.trim(),
    area: document.getElementById("addrArea").value.trim(),
    postal_code: document.getElementById("addrPostal").value.trim() || null,
    address: document.getElementById("addrAddress").value.trim(),
    is_default: document.getElementById("addrDefault").checked
  });
  if(error){
    alert(error.message);
    return;
  }
  document.getElementById("address-form").style.display = "none";
  renderAddressesTab();
});

/* ---------------- SETTINGS ---------------- */

document.getElementById("change-email-btn").addEventListener("click", async () => {
  const errEl = document.getElementById("email-error");
  const successEl = document.getElementById("email-success");
  errEl.classList.remove("show");
  successEl.classList.remove("show");

  const newEmail = document.getElementById("newEmail").value.trim();
  if(!newEmail){
    errEl.textContent = "Enter a new email address.";
    errEl.classList.add("show");
    return;
  }
  const { error } = await CustomerAuth.updateEmail(newEmail);
  if(error){
    errEl.textContent = error.message;
    errEl.classList.add("show");
    return;
  }
  successEl.textContent = "Check your new inbox for a confirmation link to finish the change.";
  successEl.classList.add("show");
});

document.getElementById("change-password-btn").addEventListener("click", async () => {
  const errEl = document.getElementById("password-error");
  const successEl = document.getElementById("password-success");
  errEl.classList.remove("show");
  successEl.classList.remove("show");

  const pw = document.getElementById("newPass").value;
  const confirm = document.getElementById("confirmPass").value;
  if(pw.length < 6){
    errEl.textContent = "Password must be at least 6 characters.";
    errEl.classList.add("show");
    return;
  }
  if(pw !== confirm){
    errEl.textContent = "Passwords don't match.";
    errEl.classList.add("show");
    return;
  }
  const { error } = await CustomerAuth.updatePassword(pw);
  if(error){
    errEl.textContent = error.message;
    errEl.classList.add("show");
    return;
  }
  document.getElementById("newPass").value = "";
  document.getElementById("confirmPass").value = "";
  successEl.textContent = "Password updated.";
  successEl.classList.add("show");
});

document.getElementById("delete-account-btn").addEventListener("click", async () => {
  const errEl = document.getElementById("delete-error");
  errEl.classList.remove("show");

  if(!confirm("This will permanently delete your profile, addresses, cart and wishlist. Continue?")) return;

  const { error } = await CustomerAuth.deleteMyData();
  if(error){
    errEl.textContent = error.message;
    errEl.classList.add("show");
    return;
  }
  window.location.href = "/";
});

document.addEventListener("DOMContentLoaded", boot);
