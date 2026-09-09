const Catalog=require('../lib/catalog');
const C=require('../../js/catalog-core');
const Collections=require('../../js/collections');
const Search=require('../../js/search');
const Schema=require('../../js/structured-data');
const R=require('../lib/render');
const e=C.escape;
const PAGE_SIZE=24;
exports.handler=async event=>{
  const query=event.queryStringParameters || {};
  let path=event.path || '/shop';
  const match=path.match(/^\/collections\/([^/]+)\/?$/);
  const collection=match && Collections.get(match[1]);
  const search=path==='/search';
  if((match && !collection) || (!match && !['/shop','/sale','/new-arrivals','/search'].includes(path))) return R.notFound();
  if(collection && !path.endsWith('/')) return {statusCode:301,headers:{Location:Collections.url(collection)+(event.rawQuery ? '?'+event.rawQuery : '')},body:''};
  const legacy=path==='/shop' && (query.cat || query.type);
  if(legacy){
    const value=String(query.cat || query.type).toLowerCase();
    const target=Collections.all.find(c=>c.slug===value || c.category?.toLowerCase()===value);
    if(target){ const params=new URLSearchParams(query);params.delete('cat');params.delete('type');return {statusCode:301,headers:{Location:Collections.url(target)+(params.size ? '?'+params.toString() : '')},body:''}; }
  }
  if(query.q && !search){ const params=new URLSearchParams({q:query.q});return {statusCode:301,headers:{Location:'/search?'+params},body:''}; }
  const pageNumber=query.page===undefined ? 1 : Number(query.page);
  if(!Number.isInteger(pageNumber) || pageNumber<1 || pageNumber>10000) return R.notFound();
  const sort=['featured','new','price-asc','price-desc'].includes(query.sort) ? query.sort : 'featured';
  const q=String(query.q || '').trim().slice(0,120);
  try {
    const all=await Catalog.all();
    let products=all.filter(p=>p.price>0);
    if(collection) products=products.filter(p=>Collections.matches(p,collection));
    if(path==='/new-arrivals') products=products.filter(p=>p.isNew);
    if(path==='/sale') products=products.filter(p=>p.isSale);
    if(search) products=q ? Search.search(products,q) : [];
    if(query.stock==='in') products=products.filter(p=>p.inStock);
    if(['bestsellers','featured'].includes(query.edit)) products=products.filter(p=>query.edit==='bestsellers' ? p.isBestseller : p.isFeatured);
    if(sort==='price-asc') products.sort((a,b)=>a.price-b.price);
    else if(sort==='price-desc') products.sort((a,b)=>b.price-a.price);
    else if(sort==='new') products.sort((a,b)=>Number(b.isNew)-Number(a.isNew));
    else if(!search) products.sort((a,b)=>Number(b.inStock)-Number(a.inStock) || Number(b.isFeatured)-Number(a.isFeatured));
    const total=products.length;
    const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
    if(pageNumber>pages) return R.notFound();
    const visible=products.slice((pageNumber-1)*PAGE_SIZE,pageNumber*PAGE_SIZE);
    const name=collection?.name || ({'/shop':'The full collection','/sale':'The sale edit','/new-arrivals':'New arrivals','/search':'Search the collection'}[path]);
    const listingTitles={'/shop':'Abayas & Shawls Collection | Label by Zare','/sale':'Abaya & Shawl Sale | Label by Zare','/new-arrivals':'New Arrivals: Abayas & Shawls | Label by Zare','/search':'Search Abayas & Shawls | Label by Zare'};
    const title=(collection?.title || listingTitles[path])+(pageNumber>1 ? ` — Page ${pageNumber}` : '');
    const description=collection?.intro || (search ? 'Search Label by Zare by product name, colour, fabric or collection.' : 'Discover abayas and shawls by Label by Zare. Browse available pieces, compare prices in PKR and order for delivery across Pakistan.');
    const canonical=path+(pageNumber>1 ? '?page='+pageNumber : '');
    const filtered=Object.keys(query).some(key=>!['page','utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid'].includes(key));
    const breadcrumbs=[{name:'Home',url:'/'},...(collection?.category ? [{name:'Abayas',url:'/collections/abayas/'}] : []),{name,url:path}];
    const pageLink=n=>{const params=new URLSearchParams(query); if(n===1) params.delete('page');else params.set('page',n);return e(path+(params.size ? '?'+params.toString() : ''));};
    const pagination=pages>1 ? `<nav class="pagination" aria-label="Collection pages">${pageNumber>1 ? `<a class="btn btn-outline btn-sm" rel="prev" href="${pageLink(pageNumber-1)}">Previous</a>` : ''}<span>Page ${pageNumber} of ${pages}</span>${pageNumber<pages ? `<a class="btn btn-outline btn-sm" rel="next" href="${pageLink(pageNumber+1)}">Next</a>` : ''}</nav>` : '';
    const empty=search ? (q ? 'No pieces match this search. Try a product name, colour or one of our collections.' : 'Enter a product name, colour or fabric to find your next piece.') : query.stock || query.edit ? 'No pieces match these filters. Clear the filters to browse this collection.' : 'The next edit is on its way. Explore the rest of our wardrobe in the meantime.';
    const searchField=search ? `<label class="search-page-label">What are you looking for?<input class="search-page-input" type="search" name="q" value="${e(q)}" placeholder="Try black abaya, namaz abaya or shawls" maxlength="120"></label>` : '';
    const content=`<main id="main-content"><header class="page-header"><div class="wrap">${R.crumbs(breadcrumbs)}<p class="eyebrow">The Label by Zare wardrobe</p><h1 class="display-2">${e(name)}</h1><p class="lede">${e(description)}</p>${R.collectionLinks(collection?.slug)}</div></header><section class="section-tight"><div class="wrap"><form class="catalog-controls" method="get" action="${e(path)}">${searchField}<label>Sort by<select class="select-min" name="sort">${[['featured',search ? 'Most relevant' : 'Recommended'],['new','New arrivals'],['price-asc','Price: low to high'],['price-desc','Price: high to low']].map(([v,t])=>`<option value="${v}"${sort===v?' selected':''}>${t}</option>`).join('')}</select></label><label class="stock-filter"><input type="checkbox" name="stock" value="in"${query.stock==='in'?' checked':''}> In stock only</label>${query.edit ? `<input type="hidden" name="edit" value="${e(query.edit)}">` : ''}<button class="btn btn-outline btn-sm" type="submit">${search?'Search':'Apply'}</button>${filtered ? `<a class="link-underline" href="${e(path)}">Clear filters</a>` : ''}</form><p class="catalog-count" role="status">${total} ${total===1?'piece':'pieces'}${search && q ? ` for “${e(q)}”` : ''}</p><div class="home-product-grid collection-grid" id="collection-grid">${visible.length ? visible.map(R.card).join('') : `<div class="home-empty"><p>${empty}</p><a class="link-underline" href="/collections/abayas/">Explore abayas</a></div>`}</div>${pagination}</div></section>${collection ? `<section class="collection-advice section-tight"><div class="wrap advice-layout"><div><p class="eyebrow">A considered choice</p><h2 class="display-3">Find your own way to wear it.</h2></div><div><p>${e(collection.advice)}</p><p>We deliver across Pakistan, including Karachi, Lahore, Islamabad, Rawalpindi and Faisalabad. Check the current <a href="/support#shipping-returns">delivery and returns information</a> before placing your order.</p><a class="link-underline" href="/journal/${collection.guide}/">Read the ${collection.name.toLowerCase()} guide</a></div></div></section>` : ''}</main>`;
    return R.response(R.page({title,description,path:canonical,noindex:search || filtered || total===0,content,products:all,complete:true,image:visible[0]?.img,schemas:[R.jsonld('lz-breadcrumb-schema',Schema.breadcrumbs(breadcrumbs,canonical)),...(!search && visible.length ? [R.jsonld('lz-collection-schema',Schema.list(visible,name,canonical,(pageNumber-1)*PAGE_SIZE))] : [])]}));
  } catch { return R.unavailable(); }
};
