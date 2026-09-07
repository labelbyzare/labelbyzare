import homePageModule from '../netlify/functions/home-page.js';
import collectionPageModule from '../netlify/functions/collection-page.js';
import journalPageModule from '../netlify/functions/journal-page.js';
import productPageModule from '../netlify/functions/product-page.js';
import productFeedModule from '../netlify/functions/product-feed.js';
import sitemapHtmlModule from '../netlify/functions/sitemap-html.js';
import sitemapPagesModule from '../netlify/functions/sitemap-pages.js';
import sitemapProductsModule from '../netlify/functions/sitemap-products.js';

const homePage = homePageModule.handler;
const collectionPage = collectionPageModule.handler;
const journalPage = journalPageModule.handler;
const productPage = productPageModule.handler;
const productFeed = productFeedModule.handler;
const sitemapHtml = sitemapHtmlModule.handler;
const sitemapPages = sitemapPagesModule.handler;
const sitemapProducts = sitemapProductsModule.handler;

const DYNAMIC_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

function queryObject(url) {
  const result = {};
  for (const [key, value] of url.searchParams) result[key] = value;
  return result;
}

function netlifyEvent(request) {
  const url = new URL(request.url);
  return {
    path: url.pathname,
    rawPath: url.pathname,
    rawQuery: url.search.slice(1),
    rawUrl: url.href,
    httpMethod: request.method,
    headers: Object.fromEntries(request.headers),
    queryStringParameters: queryObject(url),
    body: null,
    isBase64Encoded: false
  };
}

function countryName(code) {
  if (!code || code.length !== 2) return 'Unknown';
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) || code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

function visitorGeo(request) {
  const code = String(request.cf?.country || request.headers.get('CF-IPCountry') || '').toUpperCase();
  return new Response(JSON.stringify({
    countryCode: code,
    countryName: countryName(code)
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  });
}

function isWorkersPreview(request) {
  try { return new URL(request.url).hostname.endsWith('.workers.dev'); }
  catch { return false; }
}

function harden(response, request) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(DYNAMIC_SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  if (isWorkersPreview(request)) headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function fromNetlify(result, request) {
  const status = Number(result?.statusCode) || 200;
  const headers = new Headers(result?.headers || {});

  // Netlify-specific edge-cache headers are harmless, but Cloudflare should use
  // its own CDN cache-control header when one has not already been supplied.
  const netlifyCdn = headers.get('Netlify-CDN-Cache-Control');
  if (netlifyCdn && !headers.has('Cloudflare-CDN-Cache-Control')) {
    headers.set('Cloudflare-CDN-Cache-Control', netlifyCdn.replace(/\bdurable,\s*/i, ''));
  }

  let body = result?.body ?? '';
  if (request.method === 'HEAD') body = null;
  const response = new Response(body, { status, headers });
  return harden(response, request);
}

async function run(handler, request) {
  try {
    return fromNetlify(await handler(netlifyEvent(request)), request);
  } catch (error) {
    console.error('Label by Zare Worker route failed:', error?.stack || error);
    return harden(new Response('Service temporarily unavailable.', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'Retry-After': '60'
      }
    }), request);
  }
}

function redirect(location, status = 301) {
  return new Response(null, { status, headers: { Location: location } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // The storefront routes are read-only. Keep unexpected methods away from
    // legacy SSR handlers and let normal static asset behavior handle them.
    if (!['GET', 'HEAD'].includes(request.method)) {
      if (path === '/api/visitor-geo') {
        return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
      }
      return env.ASSETS.fetch(request);
    }

    if (path === '/api/visitor-geo') return visitorGeo(request);
    if (path === '/') return run(homePage, request);

    if (path === '/index.html') return redirect('/');

    if (path === '/shop' || path === '/sale' || path === '/new-arrivals' || path === '/search' || path.startsWith('/collections/')) {
      return run(collectionPage, request);
    }

    if (path === '/journal' || path === '/journal/' || path.startsWith('/journal/')) {
      return run(journalPage, request);
    }

    if (path === '/product' || path === '/product.html' || path.startsWith('/product/')) {
      return run(productPage, request);
    }

    if (path === '/sitemap-pages.xml') return run(sitemapPages, request);
    if (path === '/sitemap-products.xml') return run(sitemapProducts, request);
    if (path === '/sitemap.html') return run(sitemapHtml, request);
    if (path === '/product-feed.xml') return run(productFeed, request);

    const asset = await env.ASSETS.fetch(request);
    return asset;
  }
};
