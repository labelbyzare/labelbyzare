const Catalog=require('../lib/catalog');
const Journal=require('../lib/journal');
const S=require('../lib/sitemaps');
exports.handler=async()=>{try{const [products,articles]=await Promise.all([Catalog.all(),Journal.list()]);return S.response(S.pagePaths(products,articles).map(path=>S.entry(path)));}catch{return S.unavailable();}};
