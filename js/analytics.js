/* LABEL BY ZARE — optional GA4 + privacy-conscious first-party storefront analytics */
(function(){
  "use strict";

  window.dataLayer = window.dataLayer || [];
  const gaId = String(window.LZ_ANALYTICS_ID || "");
  const doNotTrack = navigator.doNotTrack === "1" || window.doNotTrack === "1";
  const gaEnabled = /^G-[A-Z0-9]+$/.test(gaId) && !doNotTrack;
  const productionHost = /(^|\.)labelbyzare\.com$/i.test(location.hostname);
  const firstPartyEnabled = productionHost && !doNotTrack;

  if(gaEnabled){
    window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", gaId, { send_page_view:true, page_location:location.origin + location.pathname });
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(gaId);
    document.head.appendChild(script);
  }

  function uuid(){
    if(window.crypto?.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c=>{
      const r = Math.random()*16|0, v = c === "x" ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  }
  function safeStorage(storage,key,create){
    try{
      let value = storage.getItem(key);
      if(!value && create){ value = create(); storage.setItem(key,value); }
      return value || "";
    }catch(_){ return create ? create() : ""; }
  }
  const visitorId = safeStorage(localStorage,"lz_analytics_visitor",uuid);
  let sessionId = "";
  try{
    const raw = JSON.parse(sessionStorage.getItem("lz_analytics_session") || "null");
    if(raw?.id && Date.now() - Number(raw.lastSeen||0) < 30*60*1000) sessionId = raw.id;
  }catch(_){ }
  if(!sessionId) sessionId = uuid();
  function touchSession(){
    try{ sessionStorage.setItem("lz_analytics_session", JSON.stringify({id:sessionId,lastSeen:Date.now()})); }catch(_){ }
  }
  touchSession();

  const params = new URLSearchParams(location.search);
  function referrerHost(){
    try{
      if(!document.referrer) return "";
      const u = new URL(document.referrer);
      if(u.hostname === location.hostname) return "";
      return u.hostname.replace(/^www\./i,"").slice(0,120);
    }catch(_){ return ""; }
  }
  function deviceInfo(){
    const ua = navigator.userAgent || "";
    const mobile = /Mobi|Android|iPhone|iPod/i.test(ua), tablet = /iPad|Tablet/i.test(ua);
    const device = tablet ? "Tablet" : mobile ? "Mobile" : "Desktop";
    let browser = "Other";
    if(/Edg\//.test(ua)) browser = "Edge";
    else if(/SamsungBrowser\//.test(ua)) browser = "Samsung Internet";
    else if(/Firefox\//.test(ua)) browser = "Firefox";
    else if(/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = "Chrome";
    else if(/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";
    let os = "Other";
    if(/Windows NT/i.test(ua)) os = "Windows";
    else if(/Android/i.test(ua)) os = "Android";
    else if(/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
    else if(/Mac OS X/i.test(ua)) os = "macOS";
    else if(/Linux/i.test(ua)) os = "Linux";
    return {device,browser,os};
  }
  const device = deviceInfo();
  const acquisition = {
    referrer: referrerHost(),
    source: (params.get("utm_source") || "").slice(0,120),
    medium: (params.get("utm_medium") || "").slice(0,120),
    campaign: (params.get("utm_campaign") || "").slice(0,160)
  };

  function normalizeGeo(data){
    const bounded=(value,max)=>String(value??"").trim().slice(0,max);
    const coordinate=(value,min,max)=>{const n=Number(value);return Number.isFinite(n)&&n>=min&&n<=max?Number(n.toFixed(5)):null;};
    const countryName=bounded(data?.countryName||data?.name||"Unknown",80)||"Unknown";
    return {
      code:bounded(data?.countryCode||data?.code,3).toUpperCase(),
      name:countryName,
      countryName,
      city:bounded(data?.city,100),
      region:bounded(data?.region,100),
      regionCode:bounded(data?.regionCode,24),
      postalCode:bounded(data?.postalCode,24),
      timezone:bounded(data?.timezone,80),
      continent:bounded(data?.continent,8),
      latitude:coordinate(data?.latitude,-90,90),
      longitude:coordinate(data?.longitude,-180,180),
      approximate:true
    };
  }
  let geoCache = null;
  try{const saved=JSON.parse(sessionStorage.getItem("lz_analytics_geo")||"null");if(saved&&(saved.countryName||saved.name))geoCache=normalizeGeo(saved);}catch(_){ }
  const unknownGeo=()=>normalizeGeo({countryName:"Unknown"});
  const geoPromise = firstPartyEnabled && !geoCache ? fetch("/api/visitor-geo", {headers:{"accept":"application/json"},cache:"no-store"})
    .then(r=>r.ok?r.json():null)
    .then(data=>{geoCache=normalizeGeo(data||{});try{sessionStorage.setItem("lz_analytics_geo",JSON.stringify(geoCache));}catch(_){ }return geoCache;})
    .catch(()=>geoCache=unknownGeo()) : Promise.resolve(geoCache||unknownGeo());

  function item(p,quantity=1,size,color){
    let category = "";
    try{ category = window.LZCollections?.forProduct?.(p)?.name || p.category || ""; }catch(_){ category = p.category || ""; }
    return {item_id:p.id,item_name:p.name,item_brand:"Label by Zare",item_category:category,item_variant:[size,color].filter(Boolean).join(" / "),price:Number(p.price||0),quantity:Number(quantity||1)};
  }

  async function sendFirstParty(eventName, options={}){
    if(!firstPartyEnabled || !window.supabaseClient?.rpc || !visitorId || !sessionId) return;
    touchSession();
    const geo = geoCache || await geoPromise;
    const payload = {
      p_session_id: sessionId,
      p_visitor_id: visitorId,
      p_event_type: String(eventName||"").slice(0,40),
      p_path: String(options.path || location.pathname || "/").slice(0,240),
      p_page_title: String(document.title || "").slice(0,180),
      p_product_id: options.productId ? String(options.productId).slice(0,120) : null,
      p_product_name: options.productName ? String(options.productName).slice(0,180) : null,
      p_value: Number.isFinite(Number(options.value)) ? Number(options.value) : null,
      p_active_seconds: Math.max(0,Math.min(120,Math.round(Number(options.activeSeconds)||0))),
      p_country_code: geo?.code || null,
      p_country_name: geo?.countryName || geo?.name || "Unknown",
      p_device_type: device.device,
      p_browser: device.browser,
      p_os: device.os,
      p_referrer_host: acquisition.referrer || null,
      p_utm_source: acquisition.source || null,
      p_utm_medium: acquisition.medium || null,
      p_utm_campaign: acquisition.campaign || null,
      p_metadata: {
        ...(options.metadata && typeof options.metadata === "object" ? options.metadata : {}),
        geo:{
          city:geo?.city||null,region:geo?.region||null,region_code:geo?.regionCode||null,postal_code:geo?.postalCode||null,
          timezone:geo?.timezone||null,continent:geo?.continent||null,latitude:geo?.latitude??null,longitude:geo?.longitude??null,approximate:true
        }
      }
    };
    try{ await window.supabaseClient.rpc("track_store_analytics",payload); }catch(_){ }
  }

  function firstPartyEcommerce(name,ecommerce={}){
    if(!firstPartyEnabled) return;
    const items = Array.isArray(ecommerce.items) ? ecommerce.items : [];
    const meta = {};
    if(ecommerce.transaction_id) meta.transaction_id = String(ecommerce.transaction_id).slice(0,120);
    if(Number.isFinite(Number(ecommerce.shipping))) meta.shipping = Number(ecommerce.shipping);
    if(items.length) meta.item_count = items.reduce((s,x)=>s+Math.max(1,Number(x.quantity)||1),0);

    if(name === "purchase"){
      sendFirstParty("purchase",{value:ecommerce.value,metadata:meta});
      items.forEach(row=>sendFirstParty("purchase_item",{
        productId:row.item_id,productName:row.item_name,value:(Number(row.price)||0)*(Number(row.quantity)||1),
        metadata:{...meta,quantity:Number(row.quantity)||1,variant:row.item_variant||""}
      }));
      return;
    }
    if(name === "begin_checkout"){
      sendFirstParty("begin_checkout",{value:ecommerce.value,metadata:meta});
      return;
    }
    if(["view_item","add_to_cart","add_to_wishlist","remove_from_wishlist"].includes(name)){
      if(!items.length){ sendFirstParty(name,{value:ecommerce.value,metadata:meta}); return; }
      items.forEach(row=>sendFirstParty(name,{
        productId:row.item_id,productName:row.item_name,value:(Number(row.price)||0)*(Number(row.quantity)||1),
        metadata:{...meta,quantity:Number(row.quantity)||1,variant:row.item_variant||""}
      }));
      return;
    }
    sendFirstParty(name,{value:ecommerce.value,metadata:meta});
  }

  function track(name,ecommerce={}){
    // Never include customer names, contact details, addresses or payment data.
    window.dataLayer.push({ecommerce:null});
    window.dataLayer.push({event:name,ecommerce:{currency:"PKR",...ecommerce}});
    if(gaEnabled) gtag("event",name,{currency:"PKR",...ecommerce});
    firstPartyEcommerce(name,ecommerce);
  }

  window.LZAnalytics = {item,track,sendFirstParty,firstPartyEnabled};

  let lastTick = Date.now(), pendingVisibleSeconds = 0;
  function accumulate(){
    const now=Date.now(), delta=Math.max(0,Math.min(60,(now-lastTick)/1000));
    if(document.visibilityState === "visible") pendingVisibleSeconds += delta;
    lastTick=now;
  }
  function flushEngagement(){
    accumulate();
    const seconds=Math.floor(pendingVisibleSeconds);
    if(seconds<1) return;
    pendingVisibleSeconds-=seconds;
    sendFirstParty("engagement",{activeSeconds:seconds});
  }
  if(firstPartyEnabled){
    setInterval(flushEngagement,30000);
    document.addEventListener("visibilitychange",()=>{ if(document.visibilityState === "hidden") flushEngagement(); else lastTick=Date.now(); });
    window.addEventListener("pagehide",flushEngagement,{capture:true});
  }

  document.addEventListener("DOMContentLoaded",()=>{
    if(firstPartyEnabled) sendFirstParty("page_view");
    (window.PRODUCTS_READY || Promise.resolve()).then(()=>{
      if(location.pathname.startsWith("/product/") || /product\.html$/i.test(location.pathname)){
        let productId = null;
        try{ productId = typeof getProductIdFromLocation === "function" ? getProductIdFromLocation() : params.get("id"); }catch(_){ productId=params.get("id"); }
        const p=window.PRODUCTS?.find(p=>String(p.id)===String(productId));
        if(p) track("view_item",{value:p.price,items:[item(p)]});
      }
      const grid=document.querySelector("#collection-grid");
      if(grid){
        const ids=[...grid.querySelectorAll("[data-wish-id]")].map(b=>b.dataset.wishId);
        const products=(window.PRODUCTS || []).filter(p=>ids.includes(String(p.id)));
        if(products.length){
          window.dataLayer.push({event:"view_item_list",ecommerce:{currency:"PKR",item_list_id:location.pathname,items:products.slice(0,24).map(p=>item(p))}});
          if(gaEnabled) gtag("event","view_item_list",{item_list_id:location.pathname,items:products.slice(0,24).map(p=>item(p))});
        }
      }
    }).catch(()=>{});
  });
})();
