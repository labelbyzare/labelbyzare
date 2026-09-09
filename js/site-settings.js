(function(){
  "use strict";
  const defaults={
    hero_eyebrow:"The Label by Zare Edit",hero_line1:"ABAYAS & SHAWLS,",hero_line2:"Label by Zare.",hero_tagline:"Thoughtfully designed abayas and shawls for everyday moments and the occasions you’ll remember.",hero_primary_text:"Shop abayas",hero_secondary_text:"Discover the edit",hero_image_url:"",
    house_label:"01 — The House",house_heading:"Created with a purpose, Rooted in modesty.",house_text1:"Label by Zare began with a simple belief: modesty and elegance can beautifully coexist. What started as a passion for creating graceful, modest pieces grew into a dream of building something of our own — a space where women can find abayas that feel beautiful, comfortable and true to their values.",house_text2:"Every piece at Label by Zare is chosen and created with intention. From the fabric and silhouette to the smallest details, we believe that modest clothing doesn't have to mean compromising on style.",house_text3:"Our journey is still growing, one piece and one customer at a time. And we're grateful to every woman who chooses to be a part of it.",house_signoff:"Thank you for being here. 🤍\n— Label by Zare",house_cta:"Our Story",house_image_url:"",
    occasion_eyebrow:"Occasion Wear",occasion_heading:"Evenings deserve quiet drama.",occasion_text:"Draped silhouettes, hand-finished trims, and fabrics that catch the light without shouting.",occasion_cta:"Shop Emerald Green",occasion_url:"/product/emerald-green-abaya/aby-002",occasion_image_url:"",
    value1_title:"Thoughtful Fabrics",value1_text:"Chosen for their feel, flow and elegance.",value2_title:"Timeless Designs",value2_text:"Created to complement modesty without compromising on style.",value3_title:"Carefully Finished",value3_text:"Every order is prepared with attention and care before making its way to you.",newsletter_eyebrow:"Join Us",newsletter_heading:"Be first to know.",newsletter_text:"New collections, private previews, and quiet updates from the atelier.",
    about_eyebrow:"Our Story",about_title:"The House of Zare",about_hero_image_url:"",about_ch1_title:"Created with a purpose, rooted in modesty.",about_ch1_text1:"Label by Zare began with a simple belief: modesty and elegance can beautifully coexist. What started as a passion for creating graceful, modest pieces grew into a dream of building something of our own — a space where women can find abayas that feel beautiful, comfortable and true to their values.",about_ch1_text2:"Every piece at Label by Zare is chosen and created with intention. From the fabric and silhouette to the smallest details, we believe that modest clothing doesn’t have to mean compromising on style.\n\nOur journey is still growing, one piece and one customer at a time. And we’re grateful to every woman who chooses to be a part of it.\n\nThank you for being here. 🤍\n— Label by Zare",about_story_image_url:"",about_ch2_title:"How we build a piece",about_ch2_text1:"Every silhouette goes through several rounds of fitting on real bodies, not just a stand form. We check how a piece moves when you sit, reach, and walk — not just how it hangs still.",about_ch2_text2:"Construction details — hidden closures, reinforced seams, a tailored shoulder — are chosen for how they hold up over months of wear, not just how they look on day one.",about_craft_image_url:"",about_values_eyebrow:"What We Stand For",about_values_heading:"Modesty in every detail.",about_cta_heading:"Come find the piece that's yours.",about_cta_text:"Shop the Collection",
    standard_fee:350,express_fee:900,free_shipping_above:15000,standard_days:"3–5 business days nationwide",express_days:"1–2 business days in major cities",processing_days:"1–2 business days",return_policy:"Unworn pieces with tags attached may be returned within 7 days of delivery for a full refund or exchange.",return_process:"To start a refund or exchange, open Track Order and verify your order number with the checkout email.",size_intro:"All measurements are in inches. If you're between sizes, we recommend sizing up for a more relaxed, comfortable drape.",support_eyebrow:"We're Here to Help",support_title:"Support",support_hero_image_url:"",support_help_heading:"We're just a message away.",support_help_text:"Reach out on WhatsApp or Instagram and we'll get back to you shortly.",
    whatsapp_number:"923288691979",instagram_url:"https://www.instagram.com/thelabelbyzare/",footer_text:"Considered abayas and shawls for the modern woman — cut with intention, worn with quiet confidence.",
    popup_enabled:false,popup_type:"coupon",popup_kicker:"A little something for you",popup_title:"Enjoy 10% off your first order",popup_message:"Use the code below at checkout.",popup_coupon_code:"WELCOME10",popup_cta_text:"Shop the collection",popup_cta_url:"/shop/",popup_image_url:"",popup_scope:"storefront",popup_frequency:"session",popup_delay_seconds:2,popup_start_at:"",popup_end_at:""
  };
  const text=(id,value)=>{const el=document.getElementById(id);if(el&&value!==undefined&&value!==null&&String(value)!=="")el.textContent=String(value);};
  const richHeading=(id,value)=>{const el=document.getElementById(id);if(!el||!value)return;const str=String(value).trim();const comma=str.indexOf(",");if(comma>0&&comma<str.length-1)el.innerHTML=`${str.slice(0,comma+1).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}<br>${str.slice(comma+1).trim().replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}`;else el.textContent=str;};
  const styledLastWord=(id,value)=>{const el=document.getElementById(id);if(!el||!value)return;const parts=String(value).trim().split(/\s+/);const last=parts.pop()||"";const safe=v=>v.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));el.innerHTML=`${safe(parts.join(" "))}${parts.length?" ":""}<span class="display-italic">${safe(last)}</span>`;};
  const img=(id,value)=>{const el=document.getElementById(id);if(!el||!value)return;el.querySelectorAll?.("source").forEach(source=>source.remove());el.removeAttribute("srcset");el.removeAttribute("sizes");el.onerror=null;el.src=value;};

  function applySettings(s){
    const settings={...defaults,...(s||{})};if(settings.hero_line1==="MODEST WEAR,")settings.hero_line1=defaults.hero_line1;if(settings.hero_primary_text==="Shop the collection")settings.hero_primary_text=defaults.hero_primary_text;window.LZSiteSettings=settings;
    if(window.LZPolicy){
      if(Number.isFinite(Number(settings.standard_fee)))window.LZPolicy.standardFee=Number(settings.standard_fee);
      if(Number.isFinite(Number(settings.express_fee)))window.LZPolicy.expressFee=Number(settings.express_fee);
      if(Number.isFinite(Number(settings.free_shipping_above)))window.LZPolicy.freeShippingAbove=Number(settings.free_shipping_above);
      window.LZPolicy.shippingText=`Orders are processed within ${settings.processing_days}. Standard delivery takes ${settings.standard_days}. Express delivery takes ${settings.express_days}. Standard shipping is PKR ${window.LZPolicy.standardFee.toLocaleString("en-PK")} and express shipping is PKR ${window.LZPolicy.expressFee.toLocaleString("en-PK")}; both are free on orders over PKR ${window.LZPolicy.freeShippingAbove.toLocaleString("en-PK")}.`;
    }
    document.querySelectorAll("[data-lz-free-shipping-threshold]").forEach(el=>{el.textContent=Number(settings.free_shipping_above).toLocaleString("en-PK");});
    const hero=document.querySelector(".hero");if(hero){const eyebrow=hero.querySelector(".hero-copy .eyebrow");if(eyebrow)eyebrow.textContent=settings.hero_eyebrow;const lines=hero.querySelectorAll(".hero-title .line > span");if(lines[0])lines[0].textContent=settings.hero_line1;if(lines[1])lines[1].textContent=settings.hero_line2;const tagline=hero.querySelector(".hero-tagline");if(tagline)tagline.textContent=settings.hero_tagline;const primary=hero.querySelector(".hero-cta .btn");if(primary)primary.textContent=settings.hero_primary_text;const secondary=hero.querySelector(".home-hero-link");if(secondary)secondary.textContent=settings.hero_secondary_text;if(settings.hero_image_url){const picture=hero.querySelector(".hero-picture"),image=hero.querySelector(".hero-fallback-img");picture?.querySelectorAll("source").forEach(source=>source.remove());if(image){image.removeAttribute("srcset");image.removeAttribute("sizes");image.onerror=null;image.src=settings.hero_image_url;}}}

    text("home-house-label",settings.house_label);richHeading("home-house-heading",settings.house_heading);text("home-house-text1",settings.house_text1);text("home-house-text2",settings.house_text2);text("home-house-text3",settings.house_text3);text("home-house-signoff",settings.house_signoff);const signoff=document.getElementById("home-house-signoff");if(signoff)signoff.style.whiteSpace="pre-line";text("home-house-cta",settings.house_cta);img("home-house-image",settings.house_image_url);
    text("home-occasion-eyebrow",settings.occasion_eyebrow);text("home-occasion-heading",settings.occasion_heading);text("home-occasion-text",settings.occasion_text);text("occasion-product-link",settings.occasion_cta);const occasionLink=document.getElementById("occasion-product-link");if(occasionLink&&settings.occasion_url)occasionLink.href=settings.occasion_url;img("occasion-product-image",settings.occasion_image_url);
    text("home-value1-title",settings.value1_title);text("home-value1-text",settings.value1_text);text("home-value2-title",settings.value2_title);text("home-value2-text",settings.value2_text);text("home-value3-title",settings.value3_title);text("home-value3-text",settings.value3_text);text("home-newsletter-eyebrow",settings.newsletter_eyebrow);text("home-newsletter-heading",settings.newsletter_heading);text("home-newsletter-text",settings.newsletter_text);

    text("about-hero-eyebrow",settings.about_eyebrow);styledLastWord("about-hero-title",settings.about_title);img("about-hero-image",settings.about_hero_image_url);text("about-ch1-title",settings.about_ch1_title);text("about-ch1-text1",settings.about_ch1_text1);text("about-ch1-text2",settings.about_ch1_text2);const aboutCh1=document.getElementById("about-ch1-text2");if(aboutCh1)aboutCh1.style.whiteSpace="pre-line";img("about-story-image",settings.about_story_image_url);text("about-ch2-title",settings.about_ch2_title);text("about-ch2-text1",settings.about_ch2_text1);text("about-ch2-text2",settings.about_ch2_text2);img("about-craft-image",settings.about_craft_image_url);text("about-values-eyebrow",settings.about_values_eyebrow);text("about-values-heading",settings.about_values_heading);text("about-cta-heading",settings.about_cta_heading);text("about-cta-text",settings.about_cta_text);

    text("support-hero-eyebrow",settings.support_eyebrow);text("support-hero-title",settings.support_title);img("support-hero-image",settings.support_hero_image_url);text("support-size-intro",settings.size_intro);text("support-return-policy",settings.return_policy);const returnProcess=document.getElementById("support-return-process");if(returnProcess)returnProcess.textContent=`Orders are processed within ${settings.processing_days} of being placed. ${settings.return_process}`;text("support-help-heading",settings.support_help_heading);text("support-help-text",settings.support_help_text);
    const standard=document.getElementById("support-standard-delivery");if(standard)standard.textContent=`${settings.standard_days}. PKR ${Number(settings.standard_fee).toLocaleString("en-PK")}, free on orders over PKR ${Number(settings.free_shipping_above).toLocaleString("en-PK")}.`;
    const express=document.getElementById("support-express-delivery");if(express)express.textContent=`${settings.express_days}. PKR ${Number(settings.express_fee).toLocaleString("en-PK")}, or free on orders over PKR ${Number(settings.free_shipping_above).toLocaleString("en-PK")}.`;

    const whatsapp=String(settings.whatsapp_number||"").replace(/\D/g,"");if(whatsapp)document.querySelectorAll('a[href*="wa.me/"], a.float-btn.whatsapp').forEach(a=>a.href=`https://wa.me/${whatsapp}`);if(settings.instagram_url)document.querySelectorAll('a[href*="instagram.com"], a.float-btn.instagram').forEach(a=>a.href=settings.instagram_url);
    if(settings.footer_text)document.querySelectorAll(".footer-grid > div:first-child > p").forEach(p=>p.textContent=settings.footer_text);
  }


  const safeHref=value=>{
    const href=String(value||"").trim();
    if(!href)return"";
    if(href.startsWith("/")||href.startsWith("#")||/^https:\/\/[^\s]+$/i.test(href))return href;
    return"";
  };
  const popupTypeLabel=type=>({"coupon":"Exclusive offer","sale":"Limited-time sale","announcement":"From Label by Zare","new-arrival":"Just arrived"}[type]||"From Label by Zare");
  function popupEligible(settings,preview=false){
    if(preview)return true;
    if(!settings.popup_enabled)return false;
    const path=(location.pathname||"/").toLowerCase();
    if(/\/(?:admin|checkout|account|account-login|account-signup|reset-password|login|track-order)(?:\.html)?\/?$/.test(path))return false;
    const now=Date.now(),start=settings.popup_start_at?new Date(settings.popup_start_at).getTime():null,end=settings.popup_end_at?new Date(settings.popup_end_at).getTime():null;
    if(start&&Number.isFinite(start)&&now<start)return false;
    if(end&&Number.isFinite(end)&&now>end)return false;
    const scope=settings.popup_scope||"storefront";
    if(scope==="home"&&!(/^\/(?:index\.html)?$/.test(path)))return false;
    if(scope==="shopping"&&!/(shop|product|new-arrivals|sale|abaya|shawl|cart|wishlist)/.test(path))return false;
    return true;
  }
  function popupSignature(settings){
    const source=[settings.popup_type,settings.popup_title,settings.popup_message,settings.popup_coupon_code,settings.popup_cta_url,settings.popup_start_at,settings.popup_end_at].join("|");
    let hash=0;for(let i=0;i<source.length;i++)hash=((hash<<5)-hash+source.charCodeAt(i))|0;
    return Math.abs(hash).toString(36);
  }
  const localDayKey=()=>{const d=new Date(),pad=n=>String(n).padStart(2,"0");return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
  function popupWasSeen(settings){
    const frequency=settings.popup_frequency||"session",key=`lz-promo-${popupSignature(settings)}`;
    try{
      if(frequency==="always")return false;
      if(frequency==="day")return localStorage.getItem(key)===localDayKey();
      return sessionStorage.getItem(key)==="1";
    }catch{return false;}
  }
  function markPopupSeen(settings){
    const frequency=settings.popup_frequency||"session",key=`lz-promo-${popupSignature(settings)}`;
    try{
      if(frequency==="day")localStorage.setItem(key,localDayKey());
      else if(frequency==="session")sessionStorage.setItem(key,"1");
    }catch{}
  }
  async function copyPromoCode(code,button){
    try{
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(code);
      else{
        const ta=document.createElement("textarea");ta.value=code;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();
      }
      const label=button.querySelector("span");if(label){const original=label.textContent;label.textContent="Copied";setTimeout(()=>{label.textContent=original;},1600);}
    }catch{}
  }
  function showPromoPopup(rawSettings,options={}){
    const settings={...defaults,...(rawSettings||{})},preview=!!options.preview;
    if(!popupEligible(settings,preview)||(!preview&&popupWasSeen(settings)))return;
    document.querySelector(".lz-promo-overlay")?.remove();

    const overlay=document.createElement("div");overlay.className="lz-promo-overlay";overlay.setAttribute("aria-hidden","true");
    const dialog=document.createElement("section");dialog.className=`lz-promo-card lz-promo-card--${settings.popup_type||"coupon"}`;dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");dialog.setAttribute("aria-label",settings.popup_title||"Label by Zare announcement");
    const close=document.createElement("button");close.type="button";close.className="lz-promo-close";close.setAttribute("aria-label","Close announcement");close.textContent="×";
    dialog.appendChild(close);

    const imageUrl=String(settings.popup_image_url||"").trim();
    if(imageUrl){
      const media=document.createElement("div");media.className="lz-promo-media";
      const image=document.createElement("img");image.src=imageUrl;image.alt="";image.loading="eager";media.appendChild(image);dialog.appendChild(media);
    }else dialog.classList.add("lz-promo-card--no-image");

    const copy=document.createElement("div");copy.className="lz-promo-copy";
    const kicker=document.createElement("span");kicker.className="lz-promo-kicker";kicker.textContent=String(settings.popup_kicker||"").trim()||popupTypeLabel(settings.popup_type);
    const title=document.createElement("h2");title.className="lz-promo-title";title.textContent=String(settings.popup_title||"").trim()||"A note from Label by Zare";
    const message=document.createElement("p");message.className="lz-promo-message";message.textContent=String(settings.popup_message||"").trim();
    copy.append(kicker,title);if(message.textContent)copy.appendChild(message);

    const code=String(settings.popup_coupon_code||"").trim().toUpperCase();
    if(code){
      const codeButton=document.createElement("button");codeButton.type="button";codeButton.className="lz-promo-code";codeButton.setAttribute("aria-label",`Copy coupon code ${code}`);
      const strong=document.createElement("strong");strong.textContent=code;const label=document.createElement("span");label.textContent="Copy code";codeButton.append(strong,label);
      codeButton.addEventListener("click",()=>copyPromoCode(code,codeButton));copy.appendChild(codeButton);
    }

    const ctaText=String(settings.popup_cta_text||"").trim(),ctaUrl=safeHref(settings.popup_cta_url);
    if(ctaText&&ctaUrl){
      const cta=document.createElement("a");cta.className="lz-promo-cta";cta.href=ctaUrl;cta.textContent=ctaText;copy.appendChild(cta);
    }
    const note=document.createElement("small");note.className="lz-promo-footnote";note.textContent=preview?"Preview — this is not shown to customers from the admin page.":"LABEL BY ZARE";copy.appendChild(note);
    dialog.appendChild(copy);overlay.appendChild(dialog);document.body.appendChild(overlay);

    const previousOverflow=document.body.style.overflow;
    const closePopup=()=>{
      overlay.classList.remove("is-open");overlay.setAttribute("aria-hidden","true");document.body.style.overflow=previousOverflow;
      setTimeout(()=>overlay.remove(),260);
    };
    close.addEventListener("click",closePopup);overlay.addEventListener("click",event=>{if(event.target===overlay)closePopup();});
    const escapeHandler=event=>{if(event.key==="Escape"){closePopup();document.removeEventListener("keydown",escapeHandler);}};
    document.addEventListener("keydown",escapeHandler);

    if(!preview)markPopupSeen(settings);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{overlay.classList.add("is-open");overlay.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";close.focus({preventScroll:true});}));
  }
  function schedulePromoPopup(settings){
    if(!popupEligible(settings,false)||popupWasSeen(settings))return;
    const delay=Math.max(0,Math.min(30,Number(settings.popup_delay_seconds||0)))*1000;
    window.setTimeout(()=>showPromoPopup(settings),delay);
  }
  window.LZPromoPopup={show:showPromoPopup};

  async function applyFaqs(){const container=document.getElementById("support-faq-list");if(!container||typeof supabaseClient==="undefined")return;try{const {data,error}=await supabaseClient.from("site_faqs").select("question,answer").eq("active",true).order("sort_order",{ascending:true}).order("created_at",{ascending:true});if(error||!data?.length)return;const escape=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));container.innerHTML=data.map(row=>`<div class="acc-item"><button class="acc-head">${escape(row.question)} <span class="plus"></span></button><div class="acc-body"><div class="acc-body-inner">${escape(row.answer).replace(/\n/g,"<br>")}</div></div></div>`).join("");}catch(error){console.warn("FAQ settings unavailable.",error?.message||error);}}
  async function applyGuideCards(){if(document.body.dataset.serverPage==='true')return;if(typeof supabaseClient==="undefined")return;try{const {data,error}=await supabaseClient.from("journal_articles").select("slug,title,summary,collection").eq("active",true).order("sort_order",{ascending:true});if(error||!data?.length)return;for(const guide of data){document.querySelectorAll('a[href^="/journal/"]').forEach(link=>{if(link.getAttribute("href")!==`/journal/${guide.slug}/`)return;const card=link.closest(".journal-card");if(!card)return;const heading=card.querySelector("h2"),summary=card.querySelector("h2 + p");if(heading){const titleLink=heading.querySelector('a');(titleLink||heading).textContent=guide.title;}if(summary)summary.textContent=guide.summary;});}}catch(error){console.warn("Journal card settings unavailable.",error?.message||error);}}

  window.LZ_SETTINGS_READY=(async()=>{let settings=defaults;const seed=document.getElementById("lz-settings-data");if(seed){try{settings={...defaults,...JSON.parse(seed.textContent)};}catch{}}if(!seed && typeof supabaseClient!=="undefined"){try{const {data,error}=await supabaseClient.from("site_settings").select("value").eq("key","main").maybeSingle();if(error)throw error;settings={...defaults,...(data?.value||{})};}catch(error){console.warn("Site settings unavailable; using built-in defaults.",error?.message||error);}}applySettings(settings);if(window.LZPolicy?.fromSettings)Object.assign(window.LZPolicy,window.LZPolicy.fromSettings(settings));void Promise.allSettled([applyFaqs(),applyGuideCards()]);schedulePromoPopup(settings);window.dispatchEvent(new CustomEvent("lz:site-settings-ready",{detail:settings}));return settings;})();
})();
