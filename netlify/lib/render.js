const C = require('../../js/catalog-core');
const Schema = require('../../js/structured-data');
const Collections = require('../../js/collections');
const templates = require('./templates');
const e = C.escape;

function metadata(html, { title, description, path, noindex = false, image }) {
  const url = C.site + path;
  html = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${e(title)}</title>`);
  for (const [selector, value] of [['name="description"',description],['property="og:title"',title],['property="og:description"',description],['property="og:url"',url],['name="twitter:title"',title],['name="twitter:description"',description],['name="robots"',noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large']]) {
    html = html.replace(new RegExp(`<meta ${selector} content="[^"]*">`), () => `<meta ${selector} content="${e(value)}">`);
  }
  html = html.replace(/<link rel="canonical" href="[^"]*">/, () => `<link rel="canonical" href="${e(url)}">`);
  if (image) html = html.replace(/(<meta (?:property="og:image"|name="twitter:image") content=")[^"]*(">)/g, (_,before,after) => before+e(image)+after);
  return html;
}
function jsonld(id, data) { return `<script type="application/ld+json" id="${e(id)}">${C.json(data)}</script>`; }
function seed(products, complete = false) { return `<script type="application/json" id="lz-catalog-data" data-complete="${complete}">${C.json(products)}</script>`; }
function crumbs(items) { return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items.map((item,i)=>`<li>${i < items.length-1 ? `<a href="${e(item.url)}">${e(item.name)}</a>` : `<span aria-current="page">${e(item.name)}</span>`}</li>`).join('')}</ol></nav>`; }
function card(p, index=0) {
  const url=e(C.productUrl(p));
  const alt=e(`${p.name} — ${Collections.forProduct(p).name}`);
  return `<article class="product-card home-product-card"><div class="product-media${p.img2 && p.img2 !== p.img ? '' : ' no-alt'}"><a href="${url}" aria-label="View ${e(p.name)}">${p.img ? `<img class="img-primary" src="${e(p.img)}" ${C.responsive(p.img)} alt="${alt}" width="600" height="800" loading="${index < 2 ? 'eager' : 'lazy'}" decoding="async">` : '<span class="home-image-placeholder">Photograph coming soon</span>'}${p.img2 && p.img2 !== p.img ? `<img class="img-secondary" src="${e(p.img2)}" ${C.responsive(p.img2)} alt="" width="600" height="800" loading="lazy" decoding="async">` : ''}</a><div class="product-tags">${!p.inStock ? '<span class="tag">Out of stock</span>' : p.isSale ? '<span class="tag">Sale</span>' : p.isNew ? '<span class="tag">New</span>' : ''}</div><button class="wishlist-btn" type="button" data-wish-id="${e(p.id)}" aria-label="Save ${e(p.name)}" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg></button><div class="quick-add"><a class="btn btn-solid btn-block btn-sm" href="${url}">View details</a></div></div><div class="product-info"><div class="cat">${e(Collections.forProduct(p).name)}</div><h3 class="product-name"><a href="${url}">${e(p.name)}</a></h3><div class="price-row"><span class="price">${e(C.money(p.price))}</span>${p.isSale && p.oldPrice ? ` <span class="price-old">${e(C.money(p.oldPrice))}</span>` : ''}</div></div></article>`;
}
function collectionLinks(active) {
  return `<nav class="collection-links" aria-label="Browse collections">${Collections.all.map(c=>`<a class="chip${active === c.slug ? ' active' : ''}" href="${Collections.url(c)}"${active === c.slug ? ' aria-current="page"' : ''}>${e(c.name)}</a>`).join('')}</nav>`;
}
function page(options) {
  let html = templates.shell.replace('<!--PAGE_CONTENT-->', () => options.content);
  html = metadata(html, options).replace('<body data-filter="all">','<body class="editorial-page" data-server-page="true">');
  const schemas=[jsonld('lz-org-schema',Schema.organization()),...(options.schemas || [])];
  return html.replace('</head>',()=>`${schemas.join('\n')}${seed(options.products || [],options.complete || false)}</head>`);
}
function response(body, statusCode=200, cache=true) { return {statusCode,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':cache ? 'public, max-age=0, s-maxage=60, must-revalidate' : 'no-store','X-Content-Type-Options':'nosniff'},body}; }
function unavailable() { return {...response(page({title:'Collection temporarily unavailable | Label by Zare',description:'Please try again shortly.',path:'/shop',noindex:true,content:'<main class="page-header wrap"><h1 class="display-2">A brief pause.</h1><p class="lede">We couldn’t load the latest collection. Please try again shortly.</p><a class="btn btn-outline" href="/shop">Try again</a></main>'}),503,false),headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Retry-After':'60'}}; }
function notFound() { return response(page({title:'Page not found | Label by Zare',description:'Explore the Label by Zare collection.',path:'/404',noindex:true,content:`<main class="page-header wrap"><p class="eyebrow">404</p><h1 class="display-2">Let’s find your next piece.</h1><p class="lede">This page is no longer available. Explore our current collections below.</p>${collectionLinks()}</main>`}),404,false); }
module.exports={metadata,jsonld,seed,crumbs,card,collectionLinks,page,response,unavailable,notFound};
