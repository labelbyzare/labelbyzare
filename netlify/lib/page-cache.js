// Public storefront HTML only. Browsers revalidate; Netlify shares a short-lived
// response across edge locations and refreshes it in the background for 30s.
// Deploys invalidate this cache. Checkout still reads current catalog values.
module.exports=function publicPageHeaders(){
 return {
  'Cache-Control':'public, max-age=0, must-revalidate',
  'Netlify-CDN-Cache-Control':'public, durable, max-age=60, stale-while-revalidate=30',
  'Netlify-Vary':'query'
 };
};
