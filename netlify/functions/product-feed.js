const Catalog=require('../lib/catalog');
const C=require('../../js/catalog-core');
const Policy=require('../../js/store-policy');
const Collections=require('../../js/collections');
const e=C.escape;
function item(p){
 const link=C.site+C.productUrl(p);
 const tag=(name,value)=>`<g:${name}>${e(value)}</g:${name}>`;
 // Catalog stock is held at product level. Do not invent variant inventory,
 // fibre percentages, GTINs, review counts or dispatch dates.
 return `<item>${tag('id',p.id)}<title>${e(p.name)}</title><description>${e(p.description || p.name+' by Label by Zare.')}</description><link>${e(link)}</link>${tag('image_link',p.img)}${p.gallery.slice(1,11).map(img=>tag('additional_image_link',img)).join('')}${tag('availability',p.inStock?'in_stock':'out_of_stock')}${tag('price',((p.isSale?p.oldPrice:p.price)).toFixed(2)+' PKR')}${p.isSale?tag('sale_price',p.price.toFixed(2)+' PKR'):''}${tag('condition','new')}${tag('brand','Label by Zare')}${p.gtin?tag('gtin',p.gtin):''}${p.mpn?tag('mpn',p.mpn):''}${!p.gtin && !p.mpn?tag('identifier_exists','no'):''}${tag('product_type','Modest Wear > '+Collections.forProduct(p).name)}${p.colors.length===1 && p.colors[0].name!=='Default'?tag('color',p.colors[0].name):''}${p.sizes.length===1?tag('size',p.sizes[0]):''}${tag('gender','female')}${tag('age_group','adult')}<g:shipping>${tag('country','PK')}${tag('service','Standard Delivery')}${tag('price',Policy.shippingFee(p.price,'standard').toFixed(2)+' PKR')}</g:shipping></item>`;
}
exports.handler=async()=>{
 try{
  const products=(await Catalog.all()).filter(p=>p.price>0 && p.img && !p.discontinued);
  return {statusCode:200,headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=60, must-revalidate'},body:`<?xml version="1.0" encoding="UTF-8"?><rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel><title>Label by Zare product feed</title><link>${C.site}/</link><description>Current Label by Zare products in PKR.</description>${products.map(item).join('')}</channel></rss>`};
 }catch{return {statusCode:503,headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store','Retry-After':'60'},body:'<?xml version="1.0" encoding="UTF-8"?><error>Catalog temporarily unavailable</error>'};}
};
