/* ==========================================================================
   LABEL BY ZARE — MAIN
   Loader, navigation, mobile menu, search overlay, scroll reveals.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {

  /* ---------- Smooth scroll (Lenis) ---------- */
  // One animation clock keeps wheel scrolling fluid without double updates.
  // Touch retains native momentum; reduced-motion users retain instant anchors.
  const touchMedia = window.matchMedia("(hover: none), (pointer: coarse)");
  const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
  let lenis;
  let scrollFrame;
  let scrollTicker;
  const scrollPanels = [...document.querySelectorAll(".mobile-menu, .search-overlay, .cart-drawer, .zoom-overlay")];
  scrollPanels.forEach(panel => panel.setAttribute("data-lenis-prevent", ""));
  function syncScrollLock(){
    if(!lenis) return;
    const locked = document.documentElement.classList.contains("lz-home-loading") || document.body.style.overflow === "hidden" || scrollPanels.some(panel => panel.classList.contains("open"));
    if(locked) lenis.stop();
    else lenis.start();
  }
  function setupSmoothScroll(){
    if(scrollTicker) window.gsap?.ticker.remove(scrollTicker);
    if(scrollFrame) cancelAnimationFrame(scrollFrame);
    lenis?.destroy();
    lenis = undefined;
    scrollTicker = undefined;
    scrollFrame = undefined;
    if(window.Lenis && !touchMedia.matches && !motionMedia.matches){
      lenis = new Lenis({ duration: .9, smoothWheel: true, syncTouch: false, wheelMultiplier: 1 });
      if(window.gsap && window.ScrollTrigger){
        lenis.on("scroll", ScrollTrigger.update);
        scrollTicker = time => lenis.raf(time * 1000);
        gsap.ticker.add(scrollTicker);
        gsap.ticker.lagSmoothing(0);
      } else {
        const raf = time => { lenis.raf(time); scrollFrame = requestAnimationFrame(raf); };
        scrollFrame = requestAnimationFrame(raf);
      }
      syncScrollLock();
    }
    window._lzLenis = lenis;
  }
  setupSmoothScroll();
  touchMedia.addEventListener("change", setupSmoothScroll);
  motionMedia.addEventListener("change", setupSmoothScroll);
  const scrollLockObserver = new MutationObserver(syncScrollLock);
  scrollLockObserver.observe(document.body, { attributes:true, attributeFilter:["style"] });
  scrollPanels.forEach(panel => scrollLockObserver.observe(panel, { attributes:true, attributeFilter:["class"] }));

  window.LZScrollTo = function(target, { immediate = false } = {}){
    if(!target) return;
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 100;
    const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - margin);
    syncScrollLock();
    if(lenis){
      lenis.resize();
      lenis.scrollTo(top, { duration:.9, immediate, force:true });
    } else {
      window.scrollTo({ top, behavior: immediate || motionMedia.matches ? "instant" : "smooth" });
    }
  };
  document.addEventListener("click", event => {
    if(event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href*="#"]');
    if(!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    const url = new URL(link.href, location.href);
    if(url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch { return; }
    if(!target) return;
    event.preventDefault();
    if(location.hash !== url.hash) history.pushState(null, "", url);
    window.LZScrollTo(target);
  });

  /* Let the full-screen homepage intro finish before the hero animates. */
  window.LZ_PAGE_READY = window.LZ_PAGE_READY || Promise.resolve();
  const loader = document.getElementById("loader");
  if(loader && !loader.classList.contains("brand-loader")){
    loader.setAttribute("aria-hidden", "true");
    loader.classList.add("hidden");
  }
  window.LZ_PAGE_READY.then(()=>{
    syncScrollLock();
    runHeroIntro();
    window.ScrollTrigger?.refresh();
  });

  function runHeroIntro(){
    if(!window.gsap || motionMedia.matches || !document.querySelector(".hero-title")) return;
    gsap.set(".hero-title .line span", { yPercent: 0 });
    gsap.to(".hero-title .line span", {
      yPercent: 0, duration: .6, stagger: 0.08, ease: "power4.out", delay: 0.15
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
  const collectionMenus = [...document.querySelectorAll(".collection-menu")];
  function closeCollectionMenus(except){
    collectionMenus.forEach(menu => { if(menu !== except) menu.open = false; });
  }
  collectionMenus.forEach(menu => {
    menu.addEventListener("toggle", () => { if(menu.open) closeCollectionMenus(menu); });
    menu.addEventListener("focusout", event => { if(event.relatedTarget && !menu.contains(event.relatedTarget)) menu.open = false; });
  });
  document.addEventListener("click", event => {
    closeCollectionMenus(event.target.closest(".collection-menu"));
    if(event.target.closest(".collection-submenu a")) closeCollectionMenus();
  });
  document.addEventListener("keydown", event => {
    if(event.key !== "Escape" || document.querySelector(".search-overlay.open")) return;
    const openMenu = collectionMenus.find(menu => menu.open);
    if(openMenu){
      event.preventDefault();event.stopImmediatePropagation();
      openMenu.open = false;
      openMenu.querySelector("summary").focus();
    } else if(mobileMenu?.classList.contains("open")){
      event.preventDefault();event.stopImmediatePropagation();
      burger?.classList.remove("open");
      mobileMenu.classList.remove("open");
      document.body.style.overflow = "";
      burger?.focus();
    }
  });
  burger?.addEventListener("click", () => {
    closeCollectionMenus();
    burger.classList.toggle("open");
    mobileMenu?.classList.toggle("open");
    document.body.style.overflow = mobileMenu?.classList.contains("open") ? "hidden" : "";
  });
  mobileMenu?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    closeCollectionMenus();
    burger?.classList.remove("open");
    mobileMenu?.classList.remove("open");
    document.body.style.overflow = "";
  }));

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
  if(window.gsap && window.ScrollTrigger && !motionMedia.matches){
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
