/* Keeps image alt text descriptive when storefront content is injected or replaced at runtime. */
(function(){
  'use strict';

  const STATIC_ALTS={
    'hero-fallback-img':'Label by Zare abaya and modest wear collection',
    'home-house-image':'Label by Zare modest wear craftsmanship and design',
    'occasion-product-image':'Label by Zare occasion wear abaya',
    'about-hero-image':'Label by Zare modest wear brand story',
    'about-story-image':'Label by Zare abaya brand story',
    'about-craft-image':'Label by Zare abaya craftsmanship and construction detail',
    'support-hero-image':'Label by Zare abaya sizing and customer support'
  };

  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
  const text=(root,selector)=>clean(root?.querySelector(selector)?.textContent);
  const srcOf=img=>clean(img.currentSrc||img.getAttribute('src'));

  function productContext(img){
    const card=img.closest('.product-card,.search-result-card,.drawer-line,.wishlist-item,.order-line');
    if(!card) return '';
    const name=text(card,'.product-name,.drawer-line-name,h3,.name');
    if(!name) return '';
    const brand=/label by zare/i.test(name)?name:`${name} by Label by Zare`;
    if(img.classList.contains('img-secondary')) return `${brand} — alternate product photo`;
    return `${brand} — product photo`;
  }

  function reviewContext(img){
    const card=img.closest('.review-card');
    const product=text(card,'.review-card-product a');
    const reviewer=text(card,'.review-meta-name');
    const row=img.closest('.review-photos');
    const images=row?[...row.querySelectorAll('img')]:[];
    const index=Math.max(0,images.indexOf(img))+1;
    if(product) return `${product} customer review photo ${index}`;
    if(reviewer) return `${reviewer.replace(/\s*\(You\)\s*$/,'')} customer review photo ${index} for Label by Zare`;
    return `Label by Zare customer review photo ${index}`;
  }

  function infer(img){
    if(STATIC_ALTS[img.id]) return STATIC_ALTS[img.id];
    const src=srcOf(img);
    if(/(?:^|\/)(?:logo|logo-mark)(?:[-_.]|$)/i.test(src)) return 'Label by Zare logo';
    if(img.closest('.review-avatar')){
      const name=text(img.closest('.review-card'),'.review-meta-name')||clean(img.getAttribute('alt'))||'Customer';
      return `${name.replace(/\s*\(You\)\s*$/,'')} profile photo`;
    }
    if(img.closest('.review-photos')) return reviewContext(img);
    if(img.classList.contains('zoom-lightbox-img')) return clean(img.getAttribute('alt'))||'Label by Zare product image preview';
    if(img.closest('.lz-promo-media')){
      const label=clean(img.closest('[role="dialog"]')?.getAttribute('aria-label'))||'Label by Zare announcement';
      return `${label} promotional image`;
    }
    const product=productContext(img);
    if(product) return product;
    if(/hero-boutique/i.test(src)) return 'Label by Zare abaya and modest wear boutique collection';
    if(/occasion-emerald-abaya/i.test(src)) return 'Emerald green occasion abaya by Label by Zare';
    if(/story-abaya/i.test(src)) return 'Label by Zare abaya brand story';
    if(/construction-detail/i.test(src)) return 'Label by Zare abaya craftsmanship and construction detail';
    if(/\/images\/products\/abaya-/i.test(src)) return 'Label by Zare abaya product photo';
    const heading=clean(document.querySelector('main h1, header h1, h1')?.textContent);
    return heading?`${heading} — Label by Zare image`:'Label by Zare website image';
  }

  function needsAlt(img){
    const alt=clean(img.getAttribute('alt'));
    return !alt || /^(?:image|photo|picture|review photo|customer review photo)$/i.test(alt);
  }

  function apply(img,sourceChanged=false){
    if(!(img instanceof HTMLImageElement)) return;
    const src=srcOf(img);
    const force=Boolean(STATIC_ALTS[img.id]) || /(?:^|\/)(?:logo|logo-mark)(?:[-_.]|$)/i.test(src);
    if(needsAlt(img) || (sourceChanged&&force)) img.alt=infer(img);
  }

  function scan(root){
    if(root instanceof HTMLImageElement) apply(root);
    root?.querySelectorAll?.('img').forEach(img=>apply(img));
  }

  scan(document);
  const observer=new MutationObserver(records=>{
    records.forEach(record=>{
      if(record.type==='attributes') apply(record.target,true);
      else record.addedNodes.forEach(node=>scan(node));
    });
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
})();
