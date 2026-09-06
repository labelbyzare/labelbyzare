/* One normalization contract for initial HTML, browser hydration and feeds. */
(function(root){
  const SITE = "https://labelbyzare.com";
  const core = {
    site: SITE,
    escape(value){ return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); },
    json(value){ return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029"); },
    image(value){
      if(typeof value !== "string" || !value.trim()) return "";
      try {
        const url = new URL(value.trim(), SITE + "/");
        return ["https:", "http:"].includes(url.protocol) ? url.href : "";
      } catch { return ""; }
    },
    responsive(value, sizes='(max-width:600px) 46vw, (max-width:1000px) 30vw, 24vw', widths=[320,480,720]){
      const url=core.image(value);
      if(!url || !/^https:\/\/(?:ldpzgtjbnbdsggaqmuvs\.supabase\.co\/storage\/v1\/object\/public\/product-images\/|labelbyzare\.com\/images\/)/.test(url)) return '';
      const source=url.startsWith(SITE) ? new URL(url).pathname : url;
      const srcset=widths.map(w=>`/.netlify/images?url=${encodeURIComponent(source)}&w=${w}&q=88 ${w}w`).join(', ');
      return `srcset="${core.escape(srcset)}" sizes="${core.escape(sizes)}" onerror="this.removeAttribute('srcset');this.onerror=null;this.src=this.getAttribute('src')"`;
    },
    slug(value){ return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60) || "abaya"; },
    productUrl(p){ return p?.id ? `/product/${core.slug(p.name)}/${encodeURIComponent(p.id)}` : "/shop"; },
    stocked(p){ return !!p && p.in_stock !== false && p.inStock !== false && p.discontinued !== true; },
    normalize(p){
      const images = [...new Set([p.img,p.img2,...(Array.isArray(p.gallery) ? p.gallery : [])].map(core.image).filter(Boolean))];
      const price = Number(p.price);
      const oldPrice = Number(p.old_price ?? p.oldPrice);
      return {
        ...p,
        id:String(p.id), name:String(p.name || "Label by Zare piece"), category:String(p.category || "Everyday"),
        price:Number.isFinite(price) && price > 0 ? price : 0,
        oldPrice:(p.is_sale ?? p.isSale) === true && Number.isFinite(oldPrice) && oldPrice > price ? oldPrice : null,
        isSale:(p.is_sale ?? p.isSale) === true && oldPrice > price,
        isNew:(p.is_new ?? p.isNew) === true,
        isFeatured:(p.is_featured ?? p.isFeatured) === true,
        isBestseller:(p.is_bestseller ?? p.isBestseller) === true,
        inStock:core.stocked(p) && Number.isFinite(price) && price > 0,
        img:images[0] || "", img2:images[1] || images[0] || "", gallery:images,
        sizes:Array.isArray(p.sizes) && p.sizes.length ? p.sizes.map(String) : ["One Size"],
        colors:Array.isArray(p.colors) && p.colors.length ? p.colors.map(c=>({name:String(typeof c==='string'?c:c.name || 'Default'),hex:typeof c==='object' && /^#[0-9a-f]{3,8}$/i.test(c.hex)?c.hex:'#c2b09c'})) : [{name:"Default",hex:"#c2b09c"}],
        description:String(p.description || ""), fabric:String(p.fabric || ""),
        shipping:String(p.shipping || ""), returns:String(p.returns || "")
      };
    },
    money(value){ return "PKR " + Number(value || 0).toLocaleString("en-PK"); }
  };
  if(typeof module === "object" && module.exports) module.exports = core;
  else root.LZCatalog = core;
})(typeof window !== "undefined" ? window : this);
