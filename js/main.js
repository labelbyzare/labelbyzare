/* ==========================================================================
   LABEL BY ZARE — MAIN
   Loader, navigation, mobile menu, search overlay, scroll reveals.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {

  /* ---------- Smooth scroll (Lenis) ---------- */
  // Lenis only smooths wheel/trackpad input — on touch devices the browser
  // already handles native touch scrolling, so skip it there. That also
  // removes one more thing competing with the phone's own scroll thread.
  const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  let lenis;
  if(window.Lenis && !isTouchDevice && !window.matchMedia("(prefers-reduced-motion: reduce)").matches){
    lenis = new Lenis({ duration: 1.1, smoothWheel: true, syncTouch: false });
    function raf(time){ lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if(window.gsap && window.ScrollTrigger){
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }
  window._lzLenis = lenis;

  /* ---------- Loader ---------- */
  const loader = document.getElementById("loader");
  if(loader){
    window.addEventListener("load", () => {
      setTimeout(() => {
        loader.classList.add("hidden");
        document.body.style.overflow = "";
        runHeroIntro();
      }, 900);
    });
    document.body.style.overflow = "hidden";
    if(window.gsap){
      gsap.to(".loader-mark", { opacity: 1, duration: .8, delay: .2 });
    }
  } else {
    runHeroIntro();
  }

  function runHeroIntro(){
    if(!window.gsap) return;
    gsap.set(".hero-title .line span", { yPercent: 110 });
    gsap.to(".hero-title .line span", {
      yPercent: 0, duration: 1.1, stagger: 0.08, ease: "power4.out", delay: 0.15
    });
    gsap.fromTo(".hero-tagline, .hero-cta, .hero-meta, .scroll-cue",
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 1, stagger: 0.1, delay: 0.7, ease: "power3.out" }
    );
  }

  /* ---------- Nav scroll state ---------- */
  const nav = document.querySelector(".site-nav");
  function onScroll(){
    if(!nav) return;
    if(window.scrollY > 60) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll);
  onScroll();

  /* ---------- Mobile menu ---------- */
  const burger = document.querySelector(".nav-burger");
  const mobileMenu = document.querySelector(".mobile-menu");
  burger?.addEventListener("click", () => {
    burger.classList.toggle("open");
    mobileMenu?.classList.toggle("open");
    document.body.style.overflow = mobileMenu?.classList.contains("open") ? "hidden" : "";
  });
  mobileMenu?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    burger?.classList.remove("open");
    mobileMenu?.classList.remove("open");
    document.body.style.overflow = "";
  }));

  /* ---------- Search overlay ---------- */
  const searchOverlay = document.querySelector(".search-overlay");
  const searchInput = document.querySelector(".search-top input");
  const searchResults = document.querySelector(".search-results");
  const searchHint = document.querySelector(".search-hint");

  function openSearch(){
    searchOverlay?.classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(() => searchInput?.focus(), 400);
  }
  function closeSearch(){
    searchOverlay?.classList.remove("open");
    document.body.style.overflow = "";
  }
  document.querySelectorAll(".js-open-search").forEach(b => b.addEventListener("click", (e) => { e.preventDefault(); openSearch(); }));
  document.querySelector(".search-close")?.addEventListener("click", closeSearch);
  document.addEventListener("keydown", (e) => { if(e.key === "Escape") closeSearch(); });

  function runSearch(q){
    if(!searchResults) return;
    q = q.trim().toLowerCase();
    if(q.length === 0){
      searchResults.innerHTML = "";
      if(searchHint) searchHint.style.display = "block";
      return;
    }
    if(searchHint) searchHint.style.display = "none";
    const matches = (window.PRODUCTS || []).filter(p =>
      p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
    if(matches.length === 0){
      searchResults.innerHTML = `<p class="search-hint">No pieces found for "${q}". Try “abaya”, “black”, or “evening”.</p>`;
      return;
    }
    searchResults.innerHTML = matches.map(p => `
      <a href="${productUrl(p)}" class="search-result-card">
        <img src="${p.img}" alt="${p.name}" loading="lazy">
        <h4>${p.name}</h4>
        <div class="price">${formatPKR(p.price)}</div>
      </a>
    `).join("");
  }
  searchInput?.addEventListener("input", (e) => runSearch(e.target.value));

  /* ---------- Generic accordion (used on product page) ---------- */
  document.querySelectorAll(".acc-head").forEach(head => {
    head.addEventListener("click", () => {
      const item = head.closest(".acc-item");
      const body = item.querySelector(".acc-body");
      const isOpen = item.classList.contains("open");
      item.parentElement.querySelectorAll(".acc-item.open").forEach(other => {
        other.classList.remove("open");
        other.querySelector(".acc-body").style.maxHeight = null;
      });
      if(!isOpen){
        item.classList.add("open");
        body.style.maxHeight = body.scrollHeight + "px";
      }
    });
  });

  /* ---------- Scroll reveal animations ---------- */
  if(window.gsap && window.ScrollTrigger){
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll(".reveal").forEach((el, i) => {
      el.classList.add("js-animatable");
      gsap.set(el, { opacity: 0, y: 40 });
      gsap.to(el, {
        opacity: 1, y: 0, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" }
      });
    });
    gsap.utils.toArray(".product-card").forEach((card, i) => {
      gsap.fromTo(card, { opacity: 0, y: 50 }, {
        opacity: 1, y: 0, duration: .9, ease: "power3.out",
        scrollTrigger: { trigger: card, start: "top 92%" },
        delay: (i % 4) * 0.05
      });
    });
  }

  /* ---------- Newsletter form ----------
     Saves every subscriber to Supabase (visible in admin.html →
     Subscribers). Runs on every page that includes this script, since
     the "Be first to know" form appears on several pages. */
  document.querySelectorAll(".newsletter form").forEach(form => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const email = input.value.trim();
      if(!email) return;

      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "…";

      const { error } = await supabaseClient.from("newsletter_subscribers").insert({ email });

      btn.disabled = false;
      btn.textContent = originalText;

      // A unique-constraint violation just means they're already
      // subscribed — treat that as success rather than an error.
      if(error && error.code !== "23505"){
        console.error("Newsletter signup failed:", error.message);
        LZ.showToast("Something went wrong — please try again.");
        return;
      }

      LZ.showToast("You're on the list. Welcome to Label by Zare.");
      form.reset();
    });
  });

});

/* ==========================================================================
   Touch-screen image preview
   Desktop shows the second product photo on :hover (mouse moving over the
   image, no click). Touch screens have no hover, so this mirrors it: the
   instant a finger is touching/passing over a product photo — including
   while scrolling — the card previews the second image, no tap required.
   Lifting the finger reverts to the first photo. Tapping the photo still
   opens the product as normal; nothing here intercepts clicks. Delegated
   on document with elementFromPoint so it covers every page's product
   grid (shop, homepage, wishlist, related products) however/whenever
   those cards get rendered.
   ========================================================================== */
(function(){
  const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  if(!isTouchDevice) return;

  let current = null;

  function setActive(card){
    if(card === current) return;
    if(current) current.classList.remove("is-touched");
    current = card;
    if(current) current.classList.add("is-touched");
  }

  function updateFromTouch(touch){
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const media = el && el.closest(".product-media");
    setActive(media ? media.closest(".product-card") : null);
  }

  document.addEventListener("touchstart", (e) => updateFromTouch(e.touches[0]), { passive: true });
  document.addEventListener("touchmove", (e) => updateFromTouch(e.touches[0]), { passive: true });
  document.addEventListener("touchend", () => setActive(null), { passive: true });
  document.addEventListener("touchcancel", () => setActive(null), { passive: true });
})();
