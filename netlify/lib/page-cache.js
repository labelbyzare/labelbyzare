// Public storefront HTML only. Browsers revalidate while the active CDN may
// share a short-lived response at the edge. Keep both Cloudflare and Netlify
// directives during migration so either platform can safely serve the site.
module.exports=function publicPageHeaders(){
 return {
  'Cache-Control':'public, max-age=0, must-revalidate',
  'Cloudflare-CDN-Cache-Control':'public, max-age=60, stale-while-revalidate=30',
  'CDN-Cache-Control':'public, max-age=60, stale-while-revalidate=30',
  'Netlify-CDN-Cache-Control':'public, durable, max-age=60, stale-while-revalidate=30',
  'Netlify-Vary':'query'
 };
};
