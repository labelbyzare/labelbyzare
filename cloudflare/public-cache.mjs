/* Cache only anonymous public documents; never session or utility responses. */
export function cacheEligible(request) {
  const url=new URL(request.url);
  return ['GET','HEAD'].includes(request.method) && !url.hostname.endsWith('.workers.dev') &&
    !request.headers.has('Authorization') && !request.headers.has('Cookie') &&
    !/no-cache|no-store|max-age=0/i.test(request.headers.get('Cache-Control') || '') &&
    !['/search'].includes(url.pathname) && !url.searchParams.has('q');
}

export async function publicDocument(request, context, render, cache=globalThis.caches?.default) {
  if(!cache || !cacheEligible(request))return render();
  const key=new Request(request.url,{method:'GET'});
  try {
    const cached=await cache.match(key);
    if(cached){
      const headers=new Headers(cached.headers);
      headers.set('Cache-Control','public, max-age=0, must-revalidate');
      headers.set('X-LZ-Cache','HIT');
      return new Response(request.method==='HEAD'?null:cached.body,{status:cached.status,headers});
    }
  } catch { /* Cache availability must not affect the storefront. */ }
  const response=await render();
  if(request.method==='GET' && response.status===200 &&
     !response.headers.has('Set-Cookie') &&
     !/private|no-store/i.test(response.headers.get('Cache-Control') || '')) {
    const copy=response.clone();
    const headers=new Headers(copy.headers);
    headers.set('Cache-Control','public, max-age=60');
    const write=cache.put(key,new Response(copy.body,{status:200,headers})).catch(()=>{});
    if(context?.waitUntil)context.waitUntil(write);else await write;
  }
  return response;
}
