const Catalog=require('../lib/catalog');
const C=require('../../js/catalog-core');
const Collections=require('../../js/collections');
const Journal=require('../lib/journal');
const R=require('../lib/render');
exports.handler=async()=>{
 try{
  const [catalog,articles]=await Promise.all([Catalog.all(),Journal.list()]);
  const products=catalog.filter(p=>p.price>0);
  const categories=Collections.all.filter(c=>c.slug!=='abayas');
  const groups=categories.map(collection=>({collection,pieces:products.filter(p=>Collections.matches(p,collection))}));
  // Keep general abayas discoverable even when no named subcollection matches.
  const general=products.filter(p=>!categories.some(c=>Collections.matches(p,c)));
  if(general.length) groups.unshift({collection:Collections.get('abayas'),pieces:general});
  const sections=groups.map(({collection:c,pieces})=>`<section style="margin-bottom:2rem"><h2 class="display-3"><a href="${Collections.url(c)}">${C.escape(c.name)}</a></h2><ul style="margin:1rem 0">${pieces.map(p=>`<li style="margin:.6rem 0"><a class="link-underline" href="${C.productUrl(p)}">${C.escape(p.name)}</a> · ${C.money(p.price)}${!p.inStock?' · Out of stock':''}</li>`).join('') || '<li>The next edit is on its way.</li>'}</ul></section>`).join('');
  const content=`<main id="main-content" class="wrap page-header"><p class="eyebrow">Explore Label by Zare</p><h1 class="display-2">Collections &amp; guides</h1>${R.collectionLinks()}<div class="advice-layout section-tight"><div>${sections}</div><div><h2 class="display-3">The journal</h2>${articles.map(a=>`<p style="margin:1rem 0"><a class="link-underline" href="/journal/${a.slug}/">${C.escape(a.title)}</a></p>`).join('')}<h2 class="display-3" style="margin-top:2rem">Helpful details</h2><p><a href="/support#size-guide">Size guide</a> · <a href="/support#shipping-returns">Delivery &amp; returns</a> · <a href="/contact">Contact</a></p></div></div></main>`;
  return R.response(R.page({title:'Collections & Styling Guides | Label by Zare',description:'Find every Label by Zare collection, product and buying guide.',path:'/sitemap.html',content,products,complete:true}));
 }catch{return R.unavailable();}
};
