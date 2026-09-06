const C=require('../../js/catalog-core');
const Collections=require('../../js/collections');
const Journal=require('./journal');
const staticPaths=['/','/shop','/about','/support','/contact','/reviews','/journal/'];
function pagePaths(products){
 // Match the collection renderer: unpriced products cannot populate an indexable page.
 const listed=products.filter(p=>p.price>0);
 return [
  ...staticPaths.filter(path=>path!=='/shop' || listed.length>0),
  ...(listed.some(p=>p.isSale)?['/sale']:[]),
  ...(listed.some(p=>p.isNew)?['/new-arrivals']:[]),
  ...Collections.all.filter(c=>listed.some(p=>Collections.matches(p,c))).map(Collections.url),
  ...Journal.articles.map(a=>`/journal/${a.slug}/`)
 ];
}
function entry(path,updated,image){
 const date=updated && new Date(updated);
 return `<url><loc>${C.escape(C.site+path)}</loc>${date && Number.isFinite(date.getTime()) ? `<lastmod>${date.toISOString()}</lastmod>` : ''}${image?`<image:image><image:loc>${C.escape(image)}</image:loc></image:image>`:''}</url>`;
}
function response(entries){return {statusCode:200,headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=60, must-revalidate'},body:`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${entries.join('')}</urlset>`};}
function unavailable(){return {statusCode:503,headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store','Retry-After':'60'},body:'<?xml version="1.0" encoding="UTF-8"?><error>Catalog temporarily unavailable</error>'};}
module.exports={pagePaths,entry,response,unavailable};
