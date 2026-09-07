const core = require("../../js/catalog-core");
const SUPABASE_URL = process.env.SUPABASE_URL || "https://ldpzgtjbnbdsggaqmuvs.supabase.co";
const PUBLIC_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_DG3Iar3m4BUg72fUWPyLag_XMyHfLWs";
const headers = {apikey:PUBLIC_KEY,Authorization:`Bearer ${PUBLIC_KEY}`};
async function request(resource, options={}){
  const {timeoutMs=8000,...fetchOptions}=options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${resource}`, {...fetchOptions,headers:{...headers,...fetchOptions.headers},signal:controller.signal});
    if(!response.ok) throw new Error(`Catalog request failed (${response.status})`);
    return await response.json();
  } finally { clearTimeout(timeout); }
}
async function all(){
  const products=[];
  for(let offset=0; ;offset+=500){
    const rows=await request(`products?select=*&order=created_at.desc,id.asc&offset=${offset}&limit=500`);
    if(!Array.isArray(rows)) throw new Error("Invalid catalog response");
    products.push(...rows.map(core.normalize));
    if(rows.length<500) return products;
  }
}
async function product(id){
  const rows=await request(`products?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
  if(!Array.isArray(rows)) throw new Error("Invalid product response");
  return rows[0] ? core.normalize(rows[0]) : null;
}
async function ratings(id){
  try {
    // Reviews are optional: a slow review service must not hold up the product.
    const rows=await request(`product_reviews?product_id=eq.${encodeURIComponent(id)}&select=rating`,{timeoutMs:1200});
    const valid=Array.isArray(rows) ? rows.map(r=>Number(r.rating)).filter(n=>Number.isFinite(n)&&n>=1&&n<=5) : [];
    return {count:valid.length,value:valid.length ? valid.reduce((a,b)=>a+b,0)/valid.length : 0};
  } catch { return {count:0,value:0}; }
}
module.exports={all,product,ratings,request,SUPABASE_URL,PUBLIC_KEY,headers};
