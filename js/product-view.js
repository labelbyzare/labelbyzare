/* Identical initial HTML and browser controls prevent a second layout on load. */
(function(root) {
  const C = root.LZCatalog || require('./catalog-core');
  const Collections = root.LZCollections || require('./collections');
  const Policy = root.LZPolicy || require('./store-policy');
  const Schema = root.LZSchema || require('./structured-data');
  const e = C.escape;
  function render(input, options = {}) {
    const p = C.normalize(input), policy = options.policy || Policy;
    const selected = C.selection(p, options.query || {});
    const collection = Collections.forProduct(p);
    const gallery = p.gallery.length ? p.gallery : [C.site + '/images/logo.jpg'];
    const rating = options.rating || {};
    return `<nav class="pdp-breadcrumb" aria-label="Breadcrumb">
      ${Schema.productBreadcrumbs(p).itemListElement.map((item,i,items) => i === items.length-1 ? `<span aria-current="page">${e(item.name)}</span>` : `<a href="${e(new URL(item.item).pathname)}">${e(item.name)}</a>`).join(' &rsaquo; ')}
    </nav>
    <div class="pdp-gallery">
      <div class="pdp-main-img" id="pdp-main-img-wrap">
        <img id="pdp-main-img" src="${e(gallery[0])}" ${C.responsive(gallery[0], '(max-width:1080px) 100vw, 55vw', [480,832,1248])} width="832" height="1040" loading="eager" fetchpriority="high" decoding="async" alt="${e(C.imageAlt(p))}">
        <button class="zoom-trigger" id="zoom-trigger" type="button" aria-label="Zoom image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/></svg></button>
      </div>
      <div class="pdp-thumbs">${gallery.map((src,i) => `<button type="button" class="${i===0?'active':''}" data-src="${e(src)}" aria-label="View ${e(C.imageAlt(p,i))}"><img src="${e(src)}" ${C.responsive(src,'(max-width:1080px) 22vw, 12vw',[160,480])} width="80" height="120" loading="lazy" decoding="async" alt="${e(C.imageAlt(p,i))}"></button>`).join('')}</div>
    </div>
    <div class="pdp-info">
      <div class="cat-label"><a href="${Collections.url(collection)}">${e(collection.name)}</a>${p.isNew?' · New Arrival':''}</div>
      <h1 class="serif">${e(C.productLabel(p))}</h1>
      <div class="pdp-price">${p.oldPrice?`<span class="price-old">${C.money(p.oldPrice)}</span>`:''}<span class="${p.isSale?'price-sale':''}">${C.money(p.price)}</span></div>
      <p class="lede">${e(p.description || `Explore the photographs, available options and details for ${C.productLabel(p)}.`)}</p>
      <div class="pdp-stock ${p.inStock?'':'out'}">${p.inStock?'In Stock':'Sold Out'}</div>
      ${rating.count>0?`<p class="pdp-rating-summary"><a href="#product-reviews-root">${rating.value.toFixed(1)} / 5 from ${rating.count} customer reviews</a></p>`:''}
      <div class="option-block"><div class="option-label"><span>Colour</span><span class="muted" id="color-label">${e(selected.color)}</span></div>
        <div class="swatches" id="color-swatches">${p.colors.map(c=>`<button type="button" class="swatch-color ${c.name===selected.color?'active':''}" style="background:${c.hex}" data-color="${e(c.name)}" aria-label="${e(c.name)}" aria-pressed="${c.name===selected.color}"></button>`).join('')}</div>
      </div>
      <div class="option-block"><div class="option-label"><span>Size</span>${collection.type==='abayas'?'<button class="link-underline size-guide-link" type="button" id="size-guide-btn">Size guide</button>':''}</div>
        <div class="swatches" id="size-swatches">${p.sizes.map(size=>`<button type="button" class="swatch-size ${size===selected.size?'active':''}" data-size="${e(size)}" aria-pressed="${size===selected.size}">${e(size)}</button>`).join('')}</div>
      </div>
      <div class="option-block"><div class="option-label"><span>Quantity</span></div><div class="qty-row"><div class="qty-stepper"><button type="button" id="qty-minus" aria-label="Decrease quantity">−</button><span id="qty-val" aria-live="polite">1</span><button type="button" id="qty-plus" aria-label="Increase quantity">+</button></div></div></div>
      <div class="pdp-actions"><button class="btn btn-solid" id="add-to-cart" type="button" ${p.inStock?'':'disabled'}>${p.inStock?'Add to Cart — '+C.money(p.price):'Sold Out'}</button><button type="button" class="icon-btn-round" data-wish-id="${e(p.id)}" aria-label="Save ${e(p.name)} to wishlist" aria-pressed="false"><svg viewBox="0 0 24 24" stroke-width="1.5"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg></button></div>
      <button class="btn btn-outline btn-block" id="buy-now" type="button" ${p.inStock?'':'disabled'}>${p.inStock?'Buy Now':'Sold Out'}</button>
      <p class="pdp-note">Free nationwide delivery on orders over PKR <span data-lz-free-shipping-threshold>${Number(policy.freeShippingAbove).toLocaleString('en-PK')}</span>.</p>
      <section class="pdp-details"><h2>Fit, fabric &amp; care</h2>
        <dl class="product-facts"><div><dt>Available sizes</dt><dd>${e(p.sizes.join(', '))}</dd></div><div><dt>Listed colours</dt><dd>${e(p.colors.map(c=>c.name).join(' / '))}</dd></div></dl>
        <details open><summary>Fabric &amp; care</summary><p>${e(p.fabric || 'Ask us for the fabric composition and care instructions for this piece.')}</p></details>
        <details><summary>Measurements &amp; included pieces</summary><p>Compare garment measurements before selecting a size. Accessories are included only when the product description confirms them.</p><p><a href="/support#size-guide">View the size guide</a> or <a href="/contact">ask about this piece</a>.</p></details>
        <details><summary>Delivery</summary><p>${e(policy.shippingText)}</p><a href="/shipping-policy">Shipping information</a></details>
        <details><summary>Returns</summary><p>${e(p.returns || policy.returnsText)}</p><a href="/returns-policy">Return conditions</a></details>
        <p><a class="link-underline" href="/journal/${collection.guide}/">Read the ${e(collection.name.toLowerCase())} guide</a></p>
      </section><noscript><p>Enable JavaScript to select options and add this piece to your bag.</p></noscript>
    </div>`;
  }
  if(typeof module==='object' && module.exports) module.exports={render};
  else root.LZProductView={render};
})(typeof window!=='undefined'?window:this);

