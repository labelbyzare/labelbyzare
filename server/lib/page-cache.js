// Public storefront HTML: browsers revalidate while Cloudflare may share a
// short-lived response at the edge. Full URLs (including query strings) are
// separate cache keys, so no platform-specific vary header is required.
module.exports=function publicPageHeaders(){
 return {
  'Cache-Control':'public, max-age=0, must-revalidate',
  'Cloudflare-CDN-Cache-Control':'public, max-age=60, stale-while-revalidate=30',
  'CDN-Cache-Control':'public, max-age=60, stale-while-revalidate=30'
 };
};
