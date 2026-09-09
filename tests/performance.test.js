const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const C=require('../js/catalog-core');
const Policy=require('../js/store-policy');
const Schema=require('../js/structured-data');
const View=require('../js/product-view');
const safeHtml=require('../server/lib/guide-html');
const fixture=require('./fixtures/catalog.json');

test('Size-specific landing HTML, schema and feed use the same selected variant',async()=>{
 const p=C.normalize(fixture[0]),settings={standard_fee:350,express_fee:600,free_shipping_above:9000,return_policy:'Return within 7 days of delivery.'};
 const policy=Policy.fromSettings(settings),product=Schema.product(p,null,policy,{size:'L'}),group=Schema.productGroup(p,null,policy);
 assert.equal(product.size,'L');assert.equal(product.sku,p.id+'--L');assert.ok(product.offers.url.endsWith('?size=L'));
 assert.deepEqual(group.variesBy,['https://schema.org/size']);assert.equal(group.hasVariant.length,p.sizes.length);
 assert.deepEqual(group.hasVariant.find(v=>v.size==='L'),product);
 const html=View.render(p,{policy,query:{size:'L'}});
 assert.match(html,/data-size="L" aria-pressed="true"/);assert.match(html,/id="add-to-cart"/);assert.match(html,/id="qty-plus"/);assert.match(html,/9,000/);
 assert.equal(policy.shippingFee(9000,'standard'),350);assert.equal(policy.shippingFee(9001,'standard'),0);assert.equal(policy.shippingFee(9000,'express'),600);
 assert.equal(Schema.product({...p,price:9100},null,policy).offers.shippingDetails.shippingRate.value,0);
 assert.equal(Schema.organization(Policy.fromSettings({return_policy:'Contact us to discuss returns.'})).hasMerchantReturnPolicy,undefined);
});

test('Responsive candidates exist, retain original fallback and respect source width',()=>{
 const manifest=require('../js/image-manifest');assert.ok(Object.keys(manifest).length>=10);
 for(const [url,entries] of Object.entries(manifest)){
  const attrs=C.responsive(url);assert.match(attrs,/srcset=/);assert.match(attrs,/sizes=/);
  for(const [width,file] of Object.entries(entries)){assert.ok(fs.existsSync('.'+file),file);assert.ok(Number(width)<=1248);}
 }
 assert.equal(C.responsive('https://untrusted.example/image.jpg'),'');
 const upload='https://ldpzgtjbnbdsggaqmuvs.supabase.co/storage/v1/object/public/product-images/optimized/abcd-1234/original.jpg?lz-widths=160,480,832';
 assert.ok(C.responsive(upload).includes('/832.webp 832w'));assert.ok(!C.responsive(upload).includes('/1248.webp'));
 assert.equal(C.responsive(upload.replace('ldpzgtjbnbdsggaqmuvs.supabase.co','untrusted.example')),'');
});

test('CMS formatting strips executable and protocol-obfuscated markup but keeps useful links',()=>{
 const html=safeHtml('<p onclick="evil()">Sizing <a href=/collections/abayas/ onfocus=evil()>shop</a><a href=javascript:evil()>bad</a><a href="java&#x73;cript:evil()">bad</a><img src=x onerror=evil()><script>evil()</script></p>');
 assert.ok(html.includes('<a href="/collections/abayas/">shop</a>'));assert.doesNotMatch(html,/<[^>]+(?:onclick|onfocus|onerror)|<script|href="(?:javascript|java&#)/i);
 assert.ok(safeHtml('<table><tr><th>Fabric</th><td>Linen</td></tr></table>').includes('<th>Fabric</th>'));
});

test('Worker cache separates size queries and excludes sessions, searches, mutations and failures',async()=>{
 const {publicDocument,cacheEligible}=await import('../cloudflare/public-cache.mjs');
 const store=new Map(),cache={match:async req=>store.get(req.url)?.clone(),put:async(req,response)=>{store.set(req.url,response.clone());}};
 let renders=0;const render=async()=>new Response(String(++renders),{headers:{'Cache-Control':'public, max-age=0, must-revalidate'}});
 const req=size=>new Request('https://labelbyzare.com/product/test/one?size='+size);
 assert.equal(await (await publicDocument(req('M'),null,render,cache)).text(),'1');
 assert.equal(await (await publicDocument(req('M'),null,render,cache)).text(),'1');
 assert.equal(await (await publicDocument(req('L'),null,render,cache)).text(),'2');
 assert.equal((await publicDocument(new Request(req('M'),{method:'HEAD'}),null,render,cache)).body,null);
 for(const request of [new Request(req('M'),{headers:{Cookie:'session=example'}}),new Request(req('M'),{headers:{Authorization:'Bearer example'}}),new Request(req('M'),{method:'POST'}),new Request(req('M'),{headers:{'Cache-Control':'no-cache'}}),new Request('https://labelbyzare.com/search?q=abaya'),new Request('https://example.workers.dev/shop')])assert.equal(cacheEligible(request),false);
 for(const response of [new Response('failure',{status:503}),new Response('private',{headers:{'Cache-Control':'private'}}),new Response('session',{headers:{'Set-Cookie':'session=example'}})])await publicDocument(req('XL'),null,async()=>response,cache);
 assert.equal(store.has(req('XL').url),false);
 const cacheDown={match:async()=>{throw new Error('down')},put:async()=>{throw new Error('down')}};
 assert.equal((await publicDocument(req('S'),null,render,cacheDown)).status,200);
});

test('Built HTML preserves dependency order and cache-busts actual asset contents',()=>{
 const harden=require('../scripts/html-hardening'),versions=require('../server/lib/asset-versions.json');
 const html=harden('<html><head></head><body><script defer src="/js/catalog-core.js?v=old"></script><script defer src="/js/product.js?v=old"></script></body></html>');
 assert.ok(html.indexOf('/js/image-manifest.js')<html.indexOf('/js/catalog-core.js'));
 assert.ok(html.indexOf('/js/product-view.js')<html.indexOf('/js/product.js'));
 assert.ok(html.includes('/js/catalog-core.js?v='+versions['/js/catalog-core.js']));assert.ok(!html.includes('?v=old'));
 assert.equal(harden(html),html,'HTML hardening is idempotent');
});
