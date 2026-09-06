const Catalog=require('../lib/catalog');
const S=require('../lib/sitemaps');
exports.handler=async()=>{try{return S.response(S.pagePaths(await Catalog.all()).map(path=>S.entry(path)));}catch{return S.unavailable();}};
