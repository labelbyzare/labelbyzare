# Label by Zare — Premium Abaya E-Commerce Website

A complete, animated, multi-page e-commerce website for a luxury abaya brand.
Built with plain HTML5, CSS3 and JavaScript (no build step, no framework) plus
GSAP, Three.js and Lenis loaded from CDN.

## 1. Folder Structure

```
label-by-zare/
├── index.html            Homepage (hero + 3D fabric + collection preview)
├── shop.html              Full collection with filters + sorting
├── new-arrivals.html      New arrivals (reuses shop.js with a filter)
├── sale.html               Sale items (reuses shop.js with a filter)
├── product.html            Product detail page (?id=slug)
├── cart.html                Shopping bag page
├── checkout.html            Checkout + order confirmation
├── wishlist.html             Wishlist page
├── about.html                Brand story page
├── css/
│   └── style.css              All styles, design tokens, responsive rules
├── js/
│   ├── data.js                 ALL PRODUCT DATA lives here — edit this first
│   ├── cart.js                  Cart + wishlist logic (localStorage, drawer, toasts)
│   ├── main.js                   Nav, mobile menu, search overlay, loader, scroll animations
│   ├── three-hero.js              3D draped-fabric hero effect (index.html only)
│   ├── shop.js                     Renders the product grid + filters
│   ├── product.js                   Renders the product detail page
│   ├── checkout.js                   Checkout form + order confirmation logic
│   └── pages.js                       Renders cart.html and wishlist.html
└── README.md
```

## 2. Running It Locally

No build tools or installation required.

**Easiest:** double-click `index.html` to open it in your browser.

**Recommended** (avoids some browser security restrictions): serve the folder
with a tiny local server so all pages/links work exactly as they will online.

- VS Code: install the "Live Server" extension, right-click `index.html` →
  "Open with Live Server".
- Or, with Python installed, run this from inside the `label-by-zare` folder:
  ```
  python3 -m http.server 8000
  ```
  then open `http://localhost:8000` in your browser.

## 3. Adding Your Own Product Images

All images are defined in **one file: `js/data.js`**. Nothing is hard-coded
into the HTML pages.

Each product has:
- `img` — the main grid/card image
- `img2` — the image shown on hover (a second angle works well)
- `gallery` — an array of up to 4 images shown on the product detail page

To use your own photos:
1. Put your image files in the `images/` folder (create it if it isn't there).
2. In `js/data.js`, replace the Unsplash URL with a relative path, e.g.
   `img: "images/noir-luxe-1.jpg"`.
3. Keep image proportions close to portrait (about 3:4 or 4:5) so the grid
   stays aligned — this matches standard fashion product photography.

## 4. Adding / Removing Products

Open `js/data.js`. Each product is one object inside the `PRODUCTS` array:

```js
{
  id: "noir-luxe",              // unique, used in the URL — no spaces
  name: "Noir Luxe Abaya",
  category: "Signature",        // must be "Signature", "Essentials" or "Evening"
                                 // to work with the filter chips on shop.html
  price: 12500,
  oldPrice: null,                // set a number here + isSale:true to show a sale badge
  isNew: true,                   // shows on New Arrivals + the "New" badge
  isSale: false,
  colors: [{ name: "Black", hex: "#0b0b0a" }],
  sizes: ["S", "M", "L", "XL"],
  img: "...", img2: "...", gallery: ["...", "...", "...", "..."],
  description: "...",
  fabric: "..."
}
```

- **To add a product:** copy an existing object (including the commas) and
  paste it into the `PRODUCTS` array, then edit every field.
- **To remove a product:** delete its whole `{ ... }` block from the array.
- Every page (home, shop, new arrivals, sale, search, product, related items)
  pulls automatically from this one array — you never need to touch the HTML.

## 5. Changing Prices

In `js/data.js`, edit the `price` (current price) and `oldPrice` (crossed-out
price, or `null` if there isn't one) fields for each product. Prices are shown
in PKR automatically via the `formatPKR()` helper — no formatting needed on
your end.

## 6. Changing Colors / Fonts

All design tokens live at the top of `css/style.css` inside `:root { ... }`.

```css
:root{
  --ink:   #0b0b0a;   /* near-black — text, dark backgrounds */
  --cream: #f5efe6;   /* main background */
  --sand:  #ede4d3;   /* secondary background */
  --beige: #c9bba5;   /* muted borders/accents */
  --gold:  #b08d4f;   /* champagne/brass accent — badges, links, prices */
  --gold-soft: #d9c79a;
  --taupe: #7a6f62;   /* secondary text */
}
```
Change any hex value and it updates everywhere on the site.

Fonts are set with:
```css
--font-display: 'Fraunces', serif;   /* headings — the elegant serif */
--font-body: 'Manrope', sans-serif;  /* body text, buttons, labels */
```
To swap fonts, change the `@import` line at the very top of `style.css` to
load different Google Fonts, then update these two variables to match.

## 7. Publishing the Website

### Option A — Netlify (drag and drop, easiest)
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag the whole `label-by-zare` folder onto the page.
3. Netlify gives you a live URL immediately. You can rename it or connect a
   custom domain from the site settings.

### Option B — GitHub Pages
1. Create a new GitHub repository and upload all the files in this folder
   (keep the folder structure exactly as-is).
2. In the repo, go to **Settings → Pages**.
3. Under "Build and deployment", set **Source** to `Deploy from a branch`,
   branch `main`, folder `/ (root)`.
4. Save. Your site will be live at `https://<your-username>.github.io/<repo-name>/`
   within a minute or two.

## 8. Notes on What's Included

- **Cart & wishlist** persist in the browser via `localStorage` — they'll
  survive a page refresh, but are specific to one browser/device (there's no
  real backend or database here).
- **Checkout** is a front-end simulation: it validates the form, generates an
  order number, and shows a confirmation screen — no payment is actually
  processed. To take real payments you'll need to connect a payment
  processor (e.g. Stripe) and a backend.
- Animations respect `prefers-reduced-motion` and the 3D hero effect
  gracefully falls back to a static image if Three.js can't load.
- All images are placeholder photography from Unsplash — replace them with
  your own product photography before launch (see Section 3).
