# Label by Zare — Cloudflare deployment

This package is prepared for Cloudflare Workers + Static Assets while keeping the existing Netlify files as a temporary rollback path.

## Cloudflare build settings

- Production branch: `main`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: repository root / blank
- Worker name: `labelbyzare`

## What was migrated

The Cloudflare Worker now handles the routes that previously depended on Netlify Functions:

- `/`
- `/shop`, `/sale`, `/new-arrivals`, `/search`
- `/collections/*`
- `/journal` and `/journal/*`
- `/product`, `/product.html`, `/product/*`
- `/sitemap-pages.xml`
- `/sitemap-products.xml`
- `/sitemap.html`
- `/product-feed.xml`
- `/api/visitor-geo`

Static HTML, CSS, JavaScript and images are built into `dist/` and served through Cloudflare Static Assets.

## Environment variables

The current storefront has public Supabase fallbacks in code, so it can deploy without extra variables. For cleaner configuration, add these Worker variables/secrets in Cloudflare later if desired:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Do not put Supabase service-role/admin secrets in browser code or public repository files.

## Before moving the live domain

1. Deploy to the `workers.dev` preview URL.
2. Test homepage, collections, products, cart, checkout, login/admin, journal, sitemaps and visitor analytics.
3. Confirm `/api/visitor-geo` returns a country code/name.
4. Only after the preview works, move DNS/nameservers and attach `labelbyzare.com` to the Worker.
5. Keep Netlify online until the Cloudflare production domain has been verified.
