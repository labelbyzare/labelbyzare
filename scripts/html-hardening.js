const LEGAL='<span class="footer-legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/shipping-policy">Shipping</a><a href="/returns-policy">Returns</a></span>';
const COOKIE_UI='<script src="/js/cookie-preferences.js?v=20260908-v29e"></script>';
const ESSENTIAL_VIEW='<script src="/js/essential-pageview.js?v=20260908-v29d"></script>';
const SITE='https://labelbyzare.com';

const PAGE_META={
  'index.html':{path:'/',title:'Modest Wear, Abayas & Shawls in Pakistan | Label by Zare',description:'Shop thoughtfully designed everyday abayas, occasion wear, kaftans, prayer pieces and shawls by Label by Zare, with delivery across Pakistan.',type:'WebPage',index:true},
  'shop.html':{path:'/shop',title:'Shop Abayas & Shawls Online in Pakistan | Label by Zare',description:'Shop Label by Zare abayas, kaftans, prayer pieces and shawls online in Pakistan. Explore the current modest wear collection, prices and availability.',type:'CollectionPage',index:true},
  'sale.html':{path:'/sale',title:'Abaya Sale Pakistan | Label by Zare',description:'Shop current Label by Zare sale pieces, including selected abayas and modest wear available online in Pakistan while stock lasts.',type:'CollectionPage',index:true},
  'new-arrivals.html':{path:'/new-arrivals',title:'New Abayas & Modest Wear | Label by Zare',description:'Discover the latest Label by Zare abayas, kaftans, prayer pieces and shawls newly added to our online modest wear collection in Pakistan.',type:'CollectionPage',index:true},
  'about.html':{path:'/about',title:'Our Story | Premium Abayas Pakistan | Label by Zare',description:'Discover Label by Zare, a Pakistan-based modest wear label creating considered abayas and shawls with a focus on fabric, fit and thoughtful finishing.',type:'AboutPage',index:true},
  'support.html':{path:'/support',title:'Abaya Size Guide, Delivery, Returns & FAQs | Label by Zare',description:'Find Label by Zare abaya sizing guidance, delivery information, returns details and frequently asked questions for customers across Pakistan.',type:'WebPage',index:true},
  'contact.html':{path:'/contact',title:'Contact Label by Zare | Orders & Abaya Sizing Help',description:'Contact Label by Zare for order support, abaya sizing help, product questions and customer enquiries about our modest wear collection in Pakistan.',type:'ContactPage',index:true},
  'reviews.html':{path:'/reviews',title:'Customer Reviews: Abayas & Shawls | Label by Zare',description:'Read customer feedback about Label by Zare abayas, shawls and shopping experiences from customers ordering modest wear online in Pakistan.',type:'WebPage',index:true},
  'privacy.html':{path:'/privacy',title:'Privacy Policy | Label by Zare',description:'Read how Label by Zare handles customer, account, order, support and optional analytics information when you use our online store.',type:'WebPage',index:true},
  'terms.html':{path:'/terms',title:'Terms & Conditions | Label by Zare',description:'Read the terms that govern use of the Label by Zare website and purchases placed through our online modest wear store in Pakistan.',type:'WebPage',index:true},
  'shipping-policy.html':{path:'/shipping-policy',title:'Shipping Policy Pakistan | Label by Zare',description:'Read current Label by Zare processing times, standard delivery guidance, express delivery information and shipping details for orders in Pakistan.',type:'WebPage',index:true},
  'returns-policy.html':{path:'/returns-policy',title:'Returns & Exchanges Policy | Label by Zare',description:'Read Label by Zare return and exchange eligibility, timing, damaged-item guidance and the process for requesting support after delivery.',type:'WebPage',index:true},
  'account.html':{path:'/account',title:'My Account | Label by Zare',description:'Manage your Label by Zare customer account, saved information and order activity.',index:false},
  'account-login.html':{path:'/account-login',title:'Log In | Label by Zare',description:'Log in securely to your Label by Zare customer account.',index:false},
  'account-signup.html':{path:'/account-signup',title:'Create Account | Label by Zare',description:'Create a Label by Zare customer account for a smoother shopping experience.',index:false},
  'cart.html':{path:'/cart',title:'Your Bag | Label by Zare',description:'Review the items currently saved in your Label by Zare shopping bag.',index:false},
  'checkout.html':{path:'/checkout',title:'Checkout | Label by Zare',description:'Complete your Label by Zare order securely.',index:false},
  'wishlist.html':{path:'/wishlist',title:'Wishlist | Label by Zare',description:'Review the Label by Zare pieces you have saved to your wishlist.',index:false},
  'track-order.html':{path:'/track-order',title:'Track Your Order | Label by Zare',description:'Track a Label by Zare order securely using your order details.',index:false},
  'reset-password.html':{path:'/reset-password',title:'Reset Password | Label by Zare',description:'Reset the password for your Label by Zare customer account.',index:false},
  'admin.html':{path:'/admin',title:'Store Admin | Label by Zare',description:'Private Label by Zare store administration area.',index:false},
  'admin-activate.html':{path:'/admin-activate',title:'Admin Activation | Label by Zare',description:'Private Label by Zare administrator activation page.',index:false},
  '404.html':{path:'/404',title:'Page Not Found | Label by Zare',description:'The requested Label by Zare page could not be found.',index:false}
};

function esc(value){return String(value||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function insertHead(html,tag){return /<\/head>/i.test(html)?html.replace(/<\/head>/i,tag+'</head>'):html;}
function setTitle(html,value){const tag=`<title>${esc(value)}</title>`;return /<title>[\s\S]*?<\/title>/i.test(html)?html.replace(/<title>[\s\S]*?<\/title>/i,tag):insertHead(html,tag);}
function setMeta(html,name,value){const re=new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*>`,'i');const tag=`<meta name="${name}" content="${esc(value)}">`;return re.test(html)?html.replace(re,tag):insertHead(html,tag);}
function setCanonical(html,url){const re=/<link\s+[^>]*rel=["']canonical["'][^>]*>/i;const tag=`<link rel="canonical" href="${esc(url)}">`;return re.test(html)?html.replace(re,tag):insertHead(html,tag);}
function pageSchema(meta){return {'@context':'https://schema.org','@type':meta.type||'WebPage',name:meta.title,url:SITE+meta.path,description:meta.description,isPartOf:{'@type':'WebSite',name:'Label by Zare',url:SITE+'/'},publisher:{'@type':'Organization',name:'Label by Zare',url:SITE+'/',logo:{'@type':'ImageObject',url:SITE+'/images/logo.jpg'}}};}
function addSchema(html,meta){if(!meta.index||html.includes('id="lz-static-page-schema"'))return html;const json=JSON.stringify(pageSchema(meta)).replace(/</g,'\\u003c');return insertHead(html,`<script type="application/ld+json" id="lz-static-page-schema">${json}</script>`);}
function imageFallback(tag,pageLabel){if(/aria-hidden\s*=\s*["']true["']/i.test(tag))return'';const src=(tag.match(/\bsrc\s*=\s*["']([^"']+)/i)||[])[1]||'';if(/logo|brand-mark|wordmark/i.test(src))return'Label by Zare logo';return `${pageLabel||'Label by Zare'} image`;}
function fixImageAlts(html,pageLabel){return html.replace(/<img\b[^>]*>/gi,tag=>{const fallback=esc(imageFallback(tag,pageLabel));if(/\balt\s*=/i.test(tag)){if(!fallback)return tag;if(/\balt\s*=\s*(["'])\s*\1/i.test(tag))return tag.replace(/\balt\s*=\s*(["'])\s*\1/i,`alt="${fallback}"`);return tag;}return tag.replace(/\s*\/?>$/,m=>` alt="${fallback}"${m}`);});}

module.exports=function hardenHtml(input,options={}){
  const file=typeof options==='string'?options:options.file;
  const meta=file?PAGE_META[file]:null;
  let html=String(input||'')
    .replace(/@supabase\/supabase-js@2(?=["'])/g,'@supabase/supabase-js@2.105.0')
    .replace(/\/js\/catalog-core\.js\?v=[^"']+/g,'/js/catalog-core.js?v=20260908-v29')
    .replace(/\/js\/analytics\.js\?v=[^"']+/g,'/js/analytics.js?v=20260908-v29')
    .replace(/\/js\/cookie-preferences\.js\?v=[^"']+/g,'/js/cookie-preferences.js?v=20260908-v29e');

  if(meta){
    html=setTitle(html,meta.title);
    html=setMeta(html,'description',meta.description);
    html=setMeta(html,'robots',meta.index?'index, follow, max-image-preview:large':'noindex, follow');
    html=setCanonical(html,SITE+meta.path);
    html=addSchema(html,meta);
  }

  const pageLabel=meta?meta.title.split('|')[0].trim():'Label by Zare';
  html=fixImageAlts(html,pageLabel);
  if(!html.includes('v29-hardening.css'))html=insertHead(html,'<link rel="stylesheet" href="/css/v29-hardening.css?v=20260908-v29">');
  if(html.includes('class="site-footer"')&&!html.includes('class="footer-legal"'))html=html.replace('</footer>',LEGAL+'</footer>');
  if(!html.includes('/js/essential-pageview.js')){
    if(html.includes('/supabase-client.js'))html=html.replace(/(<script[^>]+src=["']\/supabase-client\.js[^>]*><\/script>)/i,'$1'+ESSENTIAL_VIEW);
    else html=html.replace('</body>',ESSENTIAL_VIEW+'</body>');
  }
  if(!html.includes('/js/cookie-preferences.js'))html=html.replace('</body>',COOKIE_UI+'</body>');
  return html;
};
