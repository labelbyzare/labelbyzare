const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
function read(p){return fs.readFileSync(p,'utf8');}
test('checkout is server-authoritative and requires legal acceptance',()=>{const js=read('js/checkout.js'),html=read('checkout.html');assert.match(js,/rpc\("place_order"/);assert.doesNotMatch(js,/\.from\("orders"\)\.insert/);assert.match(html,/id="legalConsent"[^>]*required/);assert.match(js,/p_terms_accepted/);});
test('analytics is opt-in and browser purchase events cannot enter first-party analytics',()=>{const js=read('js/analytics.js');assert.match(js,/lz_privacy_analytics_v1/);assert.match(js,/consent ===? ?"granted"|consent==="granted"/);assert.match(js,/name==="purchase"\|\|name==="purchase_item"/);assert.match(js,/\/api\/visitor-geo/);assert.doesNotMatch(js,/raw.?ip/i);});
test('Cloudflare is the only server runtime and stale Netlify image transforms are gone',()=>{const worker=read('cloudflare/worker.mjs'),core=read('js/catalog-core.js');assert.match(worker,/\.\.\/server\/routes\//);assert.doesNotMatch(worker,/\.\.\/netlify\//);assert.equal(fs.existsSync('netlify.toml'),false);assert.equal(fs.existsSync('netlify'),false);assert.doesNotMatch(core,/\.netlify\/images/);});
test('legal policies are public and checkout links them',()=>{for(const f of ['privacy.html','terms.html','shipping-policy.html','returns-policy.html'])assert.ok(fs.existsSync(f),f);const html=read('checkout.html');for(const p of ['/privacy','/terms'])assert.ok(html.includes(p));});
test('security headers include CSP report-only and durable static caching',()=>{const h=read('_headers');assert.match(h,/Content-Security-Policy-Report-Only/);assert.match(h,/\/images\/\*/);assert.match(h,/stale-while-revalidate/);});
