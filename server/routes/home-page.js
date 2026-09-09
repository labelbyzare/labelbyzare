const Catalog=require('../lib/catalog');
const C=require('../../js/catalog-core');
const Collections=require('../../js/collections');
const Schema=require('../../js/structured-data');
const Templates=require('../lib/templates');
const R=require('../lib/render');
const Settings=require('../lib/store-settings');
function highlights(products,field,limit){
 const ranked=products.filter(p=>p[field]).sort((a,b)=>Number(b.inStock)-Number(a.inStock));
 const selected=ranked.slice(0,limit);
 for(const type of ['abayas','shawls']){
   const candidate=ranked.find(p=>Collections.forProduct(p).type===type);
   if(!candidate || selected.some(p=>Collections.forProduct(p).type===type)) continue;
   const replace=selected.findLastIndex(p=>selected.filter(other=>Collections.forProduct(other).type===Collections.forProduct(p).type).length>1);
   if(replace>=0) selected[replace]=candidate;
 }
 return selected;
}
exports.handler=async event=>{
 try{
  const [catalog,settings]=await Promise.all([Catalog.all(),Settings.read()]);
  const products=catalog.filter(p=>p.price>0);
  const abayas=products.filter(p=>Collections.matches(p,Collections.get('abayas'))).sort((a,b)=>Number(b.isFeatured)-Number(a.isFeatured));
  let html=Templates.home;
  for(const [key,list,empty] of [['BEST',highlights(products,'isBestseller',4),'Our next best sellers edit is coming soon.'],['FEATURED',highlights(products,'isFeatured',2),'Our next featured edit is coming soon.'],['COLLECTION',abayas,'The next abaya edit is on its way.']]){
   html=html.replace(new RegExp(`<!--LZ_${key}_START-->[\\s\\S]*?<!--LZ_${key}_END-->`),()=>list.length ? list.map(p=>R.card(p,99,key!=='COLLECTION')).join('') : `<div class="home-empty"><p>${empty}</p><a class="link-underline" href="/shop">Explore the wardrobe</a></div>`);
  }
  html=html.replace(/aria-busy="true"/g,'aria-busy="false"').replace(/(<[^>]+id="home-result-count"[^>]*>)[^<]*/,`$1${abayas.length} pieces · Abayas`);
  html=html.replace('<!--LZ_COLLECTION_LINKS-->',R.collectionLinks());
  const q=event.queryStringParameters || {};
  const filtered=Object.keys(q).some(k=>['q','type','cat','sort','edit'].includes(k));
  html=R.metadata(html,{title:'Abayas & Shawls in Pakistan | Label by Zare',description:'Shop thoughtfully designed everyday abayas, occasion wear, kaftans, prayer pieces and shawls by Label by Zare. Delivery across Pakistan.',path:'/',noindex:filtered,image:C.site+'/images/hero-boutique-1672.webp'});
  html=html.replace('</head>',()=>`${R.seed(products,true)}<script type="application/json" id="lz-settings-data">${C.json(settings)}</script>${R.jsonld('lz-org-schema',Schema.organization(Settings.policy(settings)))}${R.jsonld('lz-website-schema',Schema.website())}${R.jsonld('lz-itemlist-schema',Schema.list(abayas,'Label by Zare abayas','/'))}</head>`);
  return R.response(html);
 }catch{return R.unavailable();}
};
