/* ==========================================================================
   LABEL BY ZARE — PRODUCT REVIEWS
   Star ratings + text + up to 4 photos per review. One review per
   customer per product (writing again edits their existing one).
   Requires the table/policies/bucket created by product_reviews_setup.sql.
   Powers both the "Reviews" section on product.html and the site-wide
   reviews.html page.
   ========================================================================== */

const Reviews = {
  BUCKET: "review-photos",
  MAX_PHOTOS: 4,

  // ---------- helpers ----------
  escapeHtml(str){
    if(str == null) return "";
    return String(str).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  },

  formatDate(iso){
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  },

  starIcon(filled){
    return filled
      ? `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l3.1 6.3 6.9 1-5 4.9L18.2 21.5 12 18.3l-6.2 3.2L7 14.7l-5-4.9 6.9-1L12 2.5z"/></svg>`
      : `<svg class="is-empty" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2.5l3.1 6.3 6.9 1-5 4.9L18.2 21.5 12 18.3l-6.2 3.2L7 14.7l-5-4.9 6.9-1L12 2.5z"/></svg>`;
  },

  starsHTML(rating, opts = {}){
    let out = `<span class="stars ${opts.lg ? "lg" : ""}">`;
    for(let i = 1; i <= 5; i++) out += this.starIcon(i <= Math.round(rating));
    out += `</span>`;
    return out;
  },

  avatarHTML(profile){
    const name = profile?.full_name || "Customer";
    const initial = name.trim().charAt(0).toUpperCase() || "?";
    return profile?.avatar_url
      ? `<div class="review-avatar"><img src="${profile.avatar_url}" alt="${this.escapeHtml(name)}"></div>`
      : `<div class="review-avatar">${initial}</div>`;
  },

  // ---------- data ----------
  async _attachProfiles(reviews){
    if(!reviews.length) return [];
    const ids = [...new Set(reviews.map(r => r.user_id))];
    const { data: profiles } = await supabaseClient.from("profiles").select("id, full_name, avatar_url").in("id", ids);
    const map = {};
    (profiles || []).forEach(p => { map[p.id] = p; });
    return reviews.map(r => ({ ...r, profile: map[r.user_id] || null }));
  },

  async listForProduct(productId){
    const { data, error } = await supabaseClient
      .from("product_reviews")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    if(error){ console.error("Failed to load reviews:", error.message); return []; }
    return this._attachProfiles(data);
  },

  async listAll(){
    const { data, error } = await supabaseClient
      .from("product_reviews")
      .select("*")
      .order("created_at", { ascending: false });
    if(error){ console.error("Failed to load reviews:", error.message); return []; }
    return this._attachProfiles(data);
  },

  async uploadPhotos(files, userId){
    const urls = [];
    for(const file of files){
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabaseClient.storage.from(this.BUCKET).upload(path, file);
      if(error){ console.error("Photo upload failed:", error.message); continue; }
      const { data: pub } = supabaseClient.storage.from(this.BUCKET).getPublicUrl(path);
      urls.push(pub.publicUrl);
    }
    return urls;
  },

  async submitReview({ productId, rating, text, newFiles, keptPhotoUrls }){
    const user = await CustomerAuth.getUser();
    if(!user) return { error: { message: "Not logged in" } };

    let photos = [...keptPhotoUrls];
    if(newFiles && newFiles.length){
      photos = photos.concat(await this.uploadPhotos(newFiles, user.id));
    }
    photos = photos.slice(0, this.MAX_PHOTOS);

    const { error } = await supabaseClient.from("product_reviews").upsert({
      product_id: productId,
      user_id: user.id,
      rating,
      review_text: text || "",
      photos,
      updated_at: new Date().toISOString()
    }, { onConflict: "product_id,user_id" });

    return { error };
  },

  async deleteReview(id){
    const { error } = await supabaseClient.from("product_reviews").delete().eq("id", id);
    return { error };
  },

  // ---------- photo lightbox (shared by both pages) ----------
  openPhotoLightbox(urls, startIndex){
    let box = document.getElementById("lz-zoom-lightbox");
    if(!box){
      box = document.createElement("div");
      box.id = "lz-zoom-lightbox";
      box.className = "zoom-lightbox";
      box.innerHTML = `
        <button class="zoom-lightbox-close" type="button" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <button class="zoom-lightbox-prev" type="button" aria-label="Previous image">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button class="zoom-lightbox-next" type="button" aria-label="Next image">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m9 6 6 6-6 6"/></svg>
        </button>
        <div class="zoom-lightbox-stage"><img class="zoom-lightbox-img" alt=""></div>
        <div class="zoom-lightbox-zoomctrl"><span class="zoom-lightbox-counter">1 / 1</span></div>
      `;
      document.body.appendChild(box);
    }
    const img = box.querySelector(".zoom-lightbox-img");
    const counter = box.querySelector(".zoom-lightbox-counter");
    const prevBtn = box.querySelector(".zoom-lightbox-prev");
    const nextBtn = box.querySelector(".zoom-lightbox-next");
    let i = startIndex;

    function show(idx){
      i = (idx + urls.length) % urls.length;
      img.src = urls[i];
      counter.textContent = `${i + 1} / ${urls.length}`;
      prevBtn.style.display = urls.length > 1 ? "" : "none";
      nextBtn.style.display = urls.length > 1 ? "" : "none";
    }
    function close(){
      box.classList.remove("active");
      document.body.style.overflow = "";
    }
    box.querySelector(".zoom-lightbox-close").onclick = close;
    prevBtn.onclick = () => show(i - 1);
    nextBtn.onclick = () => show(i + 1);
    box.onclick = (e) => { if(e.target === box) close(); };
    document.onkeydown = (e) => {
      if(!box.classList.contains("active")) return;
      if(e.key === "Escape") close();
      else if(e.key === "ArrowLeft") show(i - 1);
      else if(e.key === "ArrowRight") show(i + 1);
    };

    box.classList.add("active");
    document.body.style.overflow = "hidden";
    show(startIndex);
  },

  // ---------- review card markup (shared) ----------
  cardHTML(r, { showProduct, currentUserId } = {}){
    const product = showProduct ? (typeof getProductById === "function" ? getProductById(r.product_id) : null) : null;
    const isMine = currentUserId && r.user_id === currentUserId;
    return `
      <div class="review-card" data-review-id="${r.id}">
        <div class="review-card-head">
          ${this.avatarHTML(r.profile)}
          <div>
            <div class="review-meta-name">${this.escapeHtml(r.profile?.full_name || "Customer")}${isMine ? " <span style=\"color:var(--gold)\">(You)</span>" : ""}</div>
            <div class="review-meta-date">${this.formatDate(r.created_at)}</div>
          </div>
        </div>
        ${this.starsHTML(r.rating)}
        ${showProduct && product ? `<div class="review-card-product" style="margin-top:.5rem">On <a href="product.html?id=${product.id}">${this.escapeHtml(product.name)}</a></div>` : ""}
        ${r.review_text ? `<p class="review-text" style="margin-top:.6rem">${this.escapeHtml(r.review_text)}</p>` : ""}
        ${r.photos && r.photos.length ? `
          <div class="review-photos">
            ${r.photos.map((url, i) => `<img src="${url}" alt="Review photo" data-photo-idx="${i}">`).join("")}
          </div>
        ` : ""}
        ${isMine ? `
          <div class="review-card-actions">
            <button type="button" class="js-edit-review">Edit</button>
            <button type="button" class="js-delete-review danger">Delete</button>
          </div>
        ` : ""}
      </div>
    `;
  },

  bindPhotoZoom(container){
    container.querySelectorAll(".review-photos").forEach(row => {
      const urls = [...row.querySelectorAll("img")].map(img => img.src);
      row.querySelectorAll("img").forEach((img, i) => {
        img.addEventListener("click", () => this.openPhotoLightbox(urls, i));
      });
    });
  }
};

/* ==========================================================================
   PRODUCT PAGE — reviews section
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("product-reviews-root");
  if(!root) return;
  (window.PRODUCTS_READY || Promise.resolve()).then(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("id") || (window.PRODUCTS && PRODUCTS[0] && PRODUCTS[0].id);
    const product = typeof getProductById === "function" ? getProductById(id) : null;
    if(product) initProductReviews(root, product);
  });
});

async function initProductReviews(root, product){
  root.innerHTML = `<p style="color:var(--taupe)">Loading reviews…</p>`;

  const [reviews, user] = await Promise.all([
    Reviews.listForProduct(product.id),
    CustomerAuth.getUser()
  ]);

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const myReview = user ? reviews.find(r => r.user_id === user.id) : null;

  root.innerHTML = `
    <div class="section-head reveal">
      <div>
        <div class="eyebrow">Customer Voices</div>
        <h2 class="display-3" style="margin-top:.6rem">Reviews</h2>
      </div>
    </div>

    ${reviews.length ? `
      <div class="reviews-summary reveal">
        <div class="avg-block">
          <div class="avg-num">${avg.toFixed(1)}</div>
          ${Reviews.starsHTML(avg, { lg: true })}
          <div class="avg-meta">${reviews.length} review${reviews.length === 1 ? "" : "s"}</div>
        </div>
      </div>
    ` : `<p class="review-empty reveal" style="text-align:left;padding:0 0 var(--sp-3)">No reviews yet — be the first to share your experience.</p>`}

    <div id="review-action-slot" class="reveal"></div>
    <div id="review-form-slot"></div>
    <div id="review-list-slot"></div>
  `;

  renderProductReviewList(reviews, user);
  renderReviewActionSlot(product, user, myReview);
}

function renderProductReviewList(reviews, user){
  const listSlot = document.getElementById("review-list-slot");
  if(!reviews.length){ listSlot.innerHTML = ""; return; }
  listSlot.innerHTML = reviews.map(r => Reviews.cardHTML(r, { currentUserId: user?.id })).join("");
  Reviews.bindPhotoZoom(listSlot);

  listSlot.querySelectorAll(".js-edit-review").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.closest(".review-card").dataset.reviewId;
      const review = reviews.find(r => r.id === id);
      const product = getProductById(review.product_id);
      renderReviewActionSlot(product, user, review, true);
      document.getElementById("review-form-slot").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
  listSlot.querySelectorAll(".js-delete-review").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      if(!confirm("Delete your review?")) return;
      const id = e.target.closest(".review-card").dataset.reviewId;
      const { error } = await Reviews.deleteReview(id);
      if(error){ alert("Couldn't delete review: " + error.message); return; }
      const product = getProductById(reviews.find(r => r.id === id).product_id);
      initProductReviews(document.getElementById("product-reviews-root"), product);
    });
  });
}

function renderReviewActionSlot(product, user, myReview, forceOpenForm){
  const actionSlot = document.getElementById("review-action-slot");
  const formSlot = document.getElementById("review-form-slot");

  if(!user){
    actionSlot.innerHTML = "";
    formSlot.innerHTML = `
      <div class="reviews-login-prompt">
        <a href="account-login.html">Log in</a> to write a review of this piece.
      </div>
    `;
    return;
  }

  if(!forceOpenForm){
    actionSlot.innerHTML = `
      <button class="btn btn-outline" id="toggle-review-form" style="margin-bottom:var(--sp-3)">
        ${myReview ? "Edit Your Review" : "Write a Review"}
      </button>
    `;
    formSlot.innerHTML = "";
    document.getElementById("toggle-review-form").addEventListener("click", () => {
      renderReviewActionSlot(product, user, myReview, true);
    });
    return;
  }

  actionSlot.innerHTML = "";
  formSlot.innerHTML = buildReviewFormHTML(myReview);
  wireReviewForm(product, myReview);
}

function buildReviewFormHTML(existing){
  return `
    <div class="review-form reveal">
      <div class="option-label" style="margin-bottom:.6rem"><span>Your Rating</span></div>
      <div class="star-input" id="review-star-input" data-rating="${existing?.rating || 0}">
        ${[1,2,3,4,5].map(n => `<button type="button" data-star="${n}">${Reviews.starIcon(true)}</button>`).join("")}
      </div>

      <div class="field" style="margin-top:var(--sp-3)">
        <label for="review-text-input">Your Review</label>
        <textarea id="review-text-input" rows="4" placeholder="How was the fit, fabric, and feel?">${Reviews.escapeHtml(existing?.review_text || "")}</textarea>
      </div>

      <div class="option-label"><span>Photos <span class="muted">(up to 4)</span></span></div>
      <div class="review-photo-upload" id="review-photo-upload"></div>
      <p class="review-photo-hint">JPG or PNG, up to a few MB each.</p>

      <div id="review-form-error" class="auth-error"></div>

      <div style="display:flex; gap:.8rem; margin-top:var(--sp-2)">
        <button class="btn btn-solid" id="submit-review-btn" type="button">${existing ? "Save Changes" : "Submit Review"}</button>
        <button class="btn btn-outline" id="cancel-review-btn" type="button">Cancel</button>
      </div>
    </div>
  `;
}

function wireReviewForm(product, existing){
  // ---- star input ----
  const starInput = document.getElementById("review-star-input");
  let rating = existing?.rating || 0;
  function paintStars(hoverVal){
    const val = hoverVal ?? rating;
    starInput.querySelectorAll("svg").forEach((svg, i) => svg.classList.toggle("active", i < val));
  }
  starInput.querySelectorAll("button").forEach((btn, i) => {
    btn.addEventListener("click", () => { rating = i + 1; paintStars(); });
    btn.addEventListener("mouseenter", () => paintStars(i + 1));
  });
  starInput.addEventListener("mouseleave", () => paintStars());
  paintStars();

  // ---- photo slots ----
  let photos = (existing?.photos || []).map(url => ({ type: "existing", url }));
  const uploadEl = document.getElementById("review-photo-upload");

  function renderSlots(){
    uploadEl.innerHTML = "";
    for(let i = 0; i < Reviews.MAX_PHOTOS; i++){
      const p = photos[i];
      const slot = document.createElement("div");
      slot.className = "review-photo-slot";
      if(p){
        const previewSrc = p.type === "existing" ? p.url : p._previewUrl;
        slot.innerHTML = `<img src="${previewSrc}" alt=""><button type="button" class="remove-photo" aria-label="Remove photo">✕</button>`;
        slot.querySelector(".remove-photo").addEventListener("click", (e) => {
          e.stopPropagation();
          photos.splice(i, 1);
          renderSlots();
        });
      } else {
        slot.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14"/></svg>
          <input type="file" accept="image/*">
        `;
        slot.addEventListener("click", () => slot.querySelector("input").click());
        slot.querySelector("input").addEventListener("change", (e) => {
          const file = e.target.files[0];
          if(!file) return;
          photos.push({ type: "new", file, _previewUrl: URL.createObjectURL(file) });
          renderSlots();
        });
      }
      uploadEl.appendChild(slot);
    }
  }
  renderSlots();

  // ---- submit / cancel ----
  document.getElementById("cancel-review-btn").addEventListener("click", async () => {
    const user = await CustomerAuth.getUser();
    const reviews = await Reviews.listForProduct(product.id);
    renderProductReviewList(reviews, user);
    renderReviewActionSlot(product, user, reviews.find(r => r.user_id === user.id));
  });

  document.getElementById("submit-review-btn").addEventListener("click", async () => {
    const errEl = document.getElementById("review-form-error");
    errEl.classList.remove("show");

    if(!rating){
      errEl.textContent = "Please select a star rating.";
      errEl.classList.add("show");
      return;
    }

    const btn = document.getElementById("submit-review-btn");
    btn.disabled = true;
    btn.textContent = "Saving…";

    const text = document.getElementById("review-text-input").value.trim();
    const keptPhotoUrls = photos.filter(p => p.type === "existing").map(p => p.url);
    const newFiles = photos.filter(p => p.type === "new").map(p => p.file);

    const { error } = await Reviews.submitReview({ productId: product.id, rating, text, newFiles, keptPhotoUrls });

    btn.disabled = false;
    btn.textContent = existing ? "Save Changes" : "Submit Review";

    if(error){
      errEl.textContent = error.message;
      errEl.classList.add("show");
      return;
    }

    LZ.showToast(existing ? "Review updated" : "Thanks for your review!");
    initProductReviews(document.getElementById("product-reviews-root"), product);
  });
}

/* ==========================================================================
   SITE-WIDE REVIEWS PAGE (reviews.html)
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("all-reviews-root");
  if(!root) return;
  (window.PRODUCTS_READY || Promise.resolve()).then(() => initAllReviewsPage(root));
});

async function initAllReviewsPage(root){
  const [reviews, user] = await Promise.all([Reviews.listAll(), CustomerAuth.getUser()]);
  window.__allReviews = reviews;
  window.__reviewsCurrentUser = user;

  const totalCounts = document.querySelectorAll(".js-reviews-total");
  const avgEl = document.querySelector(".js-reviews-avg");
  const avgStarsEl = document.querySelector(".js-reviews-avg-stars");
  if(reviews.length){
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    totalCounts.forEach(el => { el.textContent = reviews.length; });
    if(avgEl) avgEl.textContent = avg.toFixed(1);
    if(avgStarsEl) avgStarsEl.innerHTML = Reviews.starsHTML(avg, { lg: true });
  } else {
    totalCounts.forEach(el => { el.textContent = "0"; });
    if(avgEl) avgEl.textContent = "—";
  }

  renderAllReviewsList(reviews, user);

  document.querySelectorAll(".js-reviews-filter").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".js-reviews-filter").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      applyReviewsFilters();
    });
  });
  const sortSelect = document.querySelector(".js-reviews-sort");
  if(sortSelect) sortSelect.addEventListener("change", applyReviewsFilters);
}

function applyReviewsFilters(){
  const reviews = window.__allReviews || [];
  const activeChip = document.querySelector(".js-reviews-filter.active");
  const minRating = activeChip ? Number(activeChip.dataset.rating || 0) : 0;
  const sort = document.querySelector(".js-reviews-sort")?.value || "newest";

  let filtered = minRating ? reviews.filter(r => r.rating === minRating) : reviews.slice();

  if(sort === "highest") filtered.sort((a, b) => b.rating - a.rating);
  else if(sort === "lowest") filtered.sort((a, b) => a.rating - b.rating);
  else filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  renderAllReviewsList(filtered, window.__reviewsCurrentUser);
}

function renderAllReviewsList(reviews, user){
  const grid = document.getElementById("all-reviews-grid");
  if(!grid) return;
  if(!reviews.length){
    grid.innerHTML = `<div class="empty-state"><p>No reviews match this filter yet.</p></div>`;
    return;
  }
  grid.innerHTML = `<div class="review-grid">${reviews.map(r => Reviews.cardHTML(r, { showProduct: true, currentUserId: user?.id })).join("")}</div>`;
  Reviews.bindPhotoZoom(grid);

  grid.querySelectorAll(".js-delete-review").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      if(!confirm("Delete your review?")) return;
      const id = e.target.closest(".review-card").dataset.reviewId;
      const { error } = await Reviews.deleteReview(id);
      if(error){ alert("Couldn't delete review: " + error.message); return; }
      initAllReviewsPage(document.getElementById("all-reviews-root"));
    });
  });
  grid.querySelectorAll(".js-edit-review").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.closest(".review-card").dataset.reviewId;
      const review = (window.__allReviews || []).find(r => r.id === id);
      location.href = `product.html?id=${review.product_id}#product-reviews-root`;
    });
  });
}
