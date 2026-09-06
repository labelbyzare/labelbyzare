const {test,beforeEach,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const C=require('../js/catalog-core');
const Policy=require('../js/store-policy');
const Collections=require('../js/collections');
const Search=require('../js/search');
const Schema=require('../js/structured-data');
const Journal=require('../netlify/lib/journal');
const Catalog=require('../netlify/lib/catalog');
const fixture=require('./fixtures/catalog.json');
const originalFetch=global.fetch;
let rows,reviews,fail,calls;
beforeEach(()=>{
 rows=structuredClone(fixture);reviews=[];fail=false;calls=[];
 global.fetch=async (input,options={})=>{
  assert.equal(options.method || 'GET','GET','Tests must never place orders or mutate the database');
  const url=new URL(input);calls.push(url);
  if(fail) return {ok:false,status:503};
  if(url.pathname.endsWith('/product_reviews')) return {ok:true,json:async()=>reviews};
  assert.ok(url.pathname.endsWith('/products'));
  const id=url.searchParams.get('id')?.replace(/^eq\./,'');
  const items=id ? rows.filter(p=>p.id===id) : rows;
  const offset=Number(url.searchParams.get('offset') || 0), limit=Number(url.searchParams.get('limit') || 500);
  return {ok:true,json:async()=>items.slice(offset,offset+limit)};
 };
});
after(()=>{global.fetch=originalFetch;});
function run(name,path,query={}){return require('../netlify/functions/'+name).handler({path,queryStringParameters:query,rawQuery:new URLSearchParams(query).toString(),httpMethod:'GET'});}
function ld(html){return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));}
function byType(html,type){return ld(html).find(s=>s['@type']===type);}

test('Shipping matches the published strict over-15000 threshold',()=>{
 for(const method of ['standard','express']){
  assert.equal(Policy.shippingFee(15000.01,method),0);
  assert.equal(Policy.shippingFee(15000,method),method==='express'?900:350);
 }
 assert.equal(Policy.shippingFee(5800,'standard'),350);
 assert.throws(()=>Policy.shippingFee(NaN,'standard'));
});
test('Every catalog row is fetched beyond a 500-row API page',async()=>{
 rows=Array.from({length:501},(_,i)=>({...fixture[0],id:'test-'+i}));
 const data=await Catalog.all();assert.equal(data.length,501);assert.equal(calls.length,2);
});
test('Catalog normalization rejects invalid prices and unsafe image protocols',()=>{
 const p=C.normalize({...fixture[0],price:'broken',img:'javascript:alert(1)',img2:'',gallery:[]});
 assert.equal(p.inStock,false);assert.equal(p.img,'');assert.equal(p.price,0);
 assert.equal(C.image('images/logo.jpg'),'https://labelbyzare.com/images/logo.jpg');
});
test('Sale prices only show a genuine larger old price while the sale flag is on',()=>{
 const p=C.normalize({...fixture[0],price:5000,old_price:6000,is_sale:false});
 assert.equal(p.oldPrice,null);assert.equal(p.isSale,false);
});
test('Roman Urdu, spelling and location terms match real attributes',()=>{
 const products=[C.normalize({...fixture[0],id:'prayer',name:'Prayer Piece',category:'Prayer',price:4000}),C.normalize({...fixture[0],id:'black',name:'Black Abaya',category:'Everyday',price:6000,colors:[{name:'Black',hex:'#000'}]})];
 assert.deepEqual(Search.search(products,'namaz ke liye abaya').map(p=>p.id),['prayer']);
 assert.deepEqual(Search.search(products,'kala abaya online in Lahore').map(p=>p.id),['black']);
 assert.equal(Search.search(products,'blakc abaya')[0].id,'black');
 assert.equal(Search.search(products,'notarealpiece').length,0);
});
test('Price constraints stay strict when using typo-tolerant search',()=>{
 const products=[C.normalize({...fixture[0],id:'low',price:4999}),C.normalize({...fixture[0],id:'boundary',price:5000})];
 assert.deepEqual(Search.search(products,'abaya under 5000').map(p=>p.id),['low']);
 assert.deepEqual(Search.search(products,'abaya 5k se kam').map(p=>p.id),['low']);
});
test('Homepage keeps the approved hero and sections while sending actual product HTML',async()=>{
 const result=await run('home-page','/');assert.equal(result.statusCode,200);
 assert.match(result.body,/MODEST WEAR,/);assert.match(result.body,/Label by Zare\./);
 assert.match(result.body,/hero-boutique-1672\.avif/);assert.match(result.body,/class="brand-loader"/);
 assert.match(result.body,/href="\/collections\/shawls\/"/);
 assert.doesNotMatch(result.body,/<!--LZ_(?:BEST|FEATURED|COLLECTION)_START-->/);
 assert.ok(byType(result.body,'OnlineStore'));assert.ok(byType(result.body,'WebSite'));
 for(const p of rows) assert.ok(result.body.includes(C.productUrl(p)));
});
test('Merchandising can include a real shawl in both homepage edits',async()=>{
 rows.push({...fixture[0],id:'test-shawl',name:'Test Shawl',category:'Shawls',is_featured:true,is_bestseller:true,in_stock:true});
 const result=await run('home-page','/');
 const beforeCollection=result.body.slice(result.body.indexOf('id="best-sellers-grid"'),result.body.indexOf('id="collection"'));
 assert.equal((beforeCollection.match(/data-wish-id="test-shawl"/g)||[]).length,2);
});
test('Each populated collection has its own H1, canonical and crawlable product cards',async()=>{
 for(const collection of Collections.all.filter(c=>rows.some(p=>Collections.matches(p,c)))){
  const path=Collections.url(collection);const result=await run('collection-page',path);
  assert.equal(result.statusCode,200);assert.ok(result.body.includes('href="'+C.site+path+'"'));
  assert.match(result.body,/<h1 class="display-2">/);assert.ok(byType(result.body,'BreadcrumbList'));
  assert.ok(byType(result.body,'ItemList'));assert.doesNotMatch(result.body,/<script[^>]*src="\/js\/shop\.js/);
  assert.match(result.body,/<script[^>]*src="\/js\/collection-page\.js/);
 }
});
test('An empty shawl collection is honest and noindex until products are added',async()=>{
 rows=rows.filter(p=>p.category!=='Shawls');const result=await run('collection-page','/collections/shawls/');
 assert.equal(result.statusCode,200);assert.match(result.body,/noindex, follow/);assert.match(result.body,/next edit is on its way/);
 assert.equal(byType(result.body,'ItemList'),undefined);
});
test('Pagination uses self canonicals, real next links and 404 beyond the end',async()=>{
 rows=Array.from({length:55},(_,i)=>({...fixture[0],id:'p-'+i,category:'Everyday'}));
 const first=await run('collection-page','/collections/abayas/');
 assert.match(first.body,/rel="next" href="\/collections\/abayas\/\?page=2"/);
 const second=await run('collection-page','/collections/abayas/',{page:'2'});
 assert.match(second.body,/rel="canonical" href="https:\/\/labelbyzare.com\/collections\/abayas\/\?page=2"/);
 const items=byType(second.body,'ItemList').itemListElement;assert.equal(items.length,24);assert.equal(items[0].position,25);
 assert.equal((await run('collection-page','/collections/abayas/',{page:'9'})).statusCode,404);
});
test('Search and filtered routes are noindex, with no invented results',async()=>{
 const search=await run('collection-page','/search',{q:'notarealpiece'});
 assert.equal(search.statusCode,200);assert.match(search.body,/noindex, follow/);assert.match(search.body,/No pieces match this search/);
 assert.match((await run('collection-page','/collections/abayas/',{sort:'price-asc'})).body,/noindex, follow/);
});
test('Legacy collection and stale product slug links redirect to the real canonical',async()=>{
 const result=await run('collection-page','/shop',{cat:'Kaftan'});assert.equal(result.statusCode,301);assert.equal(result.headers.Location,'/collections/kaftans/');
 const p=fixture[0];const old=await run('product-page','/product/old-name/'+p.id);assert.equal(old.statusCode,301);assert.equal(old.headers.Location,C.productUrl(p));
});
test('Product HTML includes PKR offers, genuine reviews and stable entity IDs',async()=>{
 reviews=[{rating:5},{rating:4}];const p=fixture[0];const result=await run('product-page',C.productUrl(p));
 assert.equal(result.statusCode,200);const product=byType(result.body,'Product');
 assert.equal(product.offers.priceCurrency,'PKR');assert.equal(Number(product.offers.price),Number(p.price));
 assert.equal(product.aggregateRating.reviewCount,2);assert.equal(product.aggregateRating.ratingValue,4.5);
 assert.equal(product['@id'],C.site+C.productUrl(p)+'#product');
 assert.match(result.body,/4\.5 \/ 5 from 2 customer reviews/);
 assert.equal(product.offers.shippingDetails.shippingRate.value,Policy.shippingFee(p.price,'standard'));
});
test('Missing products are 404, catalog outages are 503, and out-of-stock URLs remain live',async()=>{
 assert.equal((await run('product-page','/product/missing/no-such-id')).statusCode,404);
 assert.equal((await run('product-page','/product/bad/%ZZ')).statusCode,404);
 rows[0].in_stock=false;let result=await run('product-page',C.productUrl(rows[0]));
 assert.equal(result.statusCode,200);assert.equal(byType(result.body,'Product').offers.availability,'https://schema.org/OutOfStock');
 assert.equal(byType(result.body,'Product').aggregateRating,undefined);
 fail=true;
 for(const [fn,path] of [['home-page','/'],['collection-page','/shop'],['product-page',C.productUrl(rows[0])],['sitemap-products','/sitemap-products.xml'],['product-feed','/product-feed.xml']]){
  result=await run(fn,path);assert.equal(result.statusCode,503);assert.equal(result.headers['Cache-Control'],'no-store');
 }
});
test('JSON-LD and product text cannot break out of their HTML context',async()=>{
 rows[0].name='Test </script><script>alert(1)</script> & "piece"';
 const result=await run('product-page',C.productUrl(rows[0]));assert.equal(result.statusCode,200);
 const product=byType(result.body,'Product');assert.equal(product.name,rows[0].name);
 assert.doesNotMatch(result.body,/<script>alert\(1\)<\/script>/);
 const empty=Schema.product(C.normalize(rows[0]),{count:0,value:5});assert.equal(empty.aggregateRating,undefined);
});
test('All eight guides render linked articles without made-up rating or FAQ markup',async()=>{
 assert.equal(Journal.articles.length,8);
 for(const article of Journal.articles){
  const result=await run('journal-page','/journal/'+article.slug+'/');assert.equal(result.statusCode,200);
  assert.ok(byType(result.body,'Article'));assert.equal(byType(result.body,'FAQPage'),undefined);
  assert.ok(result.body.includes('href="'+Collections.url(article.collection)+'"'));
 }
 assert.equal((await run('journal-page','/journal/missing/')).statusCode,404);
});
test('Feeds and sitemaps agree with catalog URLs and avoid invented freshness',async()=>{
 const feed=await run('product-feed','/product-feed.xml');assert.equal(feed.statusCode,200);
 assert.match(feed.body,/<g:country>PK<\/g:country>/);assert.match(feed.body,/<g:price>350\.00 PKR<\/g:price>/);
 const products=await run('sitemap-products','/sitemap-products.xml');assert.equal(products.statusCode,200);
 for(const p of rows) assert.ok(products.body.includes(C.site+C.productUrl(p)));
 assert.doesNotMatch(products.body,/<lastmod>/);
 const pages=await run('sitemap-pages','/sitemap-pages.xml');
 assert.ok(pages.body.includes('/journal/abaya-fabric-guide/'));assert.ok(!pages.body.includes('/collections/shawls/'));
});
test('Responsive product images stay on an allowlisted CDN path with an original fallback',()=>{
 const html=C.responsive(fixture[0].img);assert.match(html,/\/\.netlify\/images\?url=/);assert.match(html,/removeAttribute\('srcset'\)/);
 assert.equal(C.responsive('https://untrusted.example/image.jpg'),'');
});
