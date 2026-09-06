const Catalog=require('../lib/catalog');
const C=require('../../js/catalog-core');
const S=require('../lib/sitemaps');
exports.handler=async()=>{try{return S.response((await Catalog.all()).filter(p=>p.price>0).map(p=>S.entry(C.productUrl(p),p.updated_at,p.img)));}catch{return S.unavailable();}};
