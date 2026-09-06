(function(){
 window.dataLayer=window.dataLayer || [];
 const id=String(window.LZ_ANALYTICS_ID || '');
 const enabled=/^G-[A-Z0-9]+$/.test(id) && navigator.doNotTrack!=='1';
 if(enabled){
   window.gtag=window.gtag || function(){window.dataLayer.push(arguments);};
   gtag('js',new Date());
   gtag('config',id,{send_page_view:true,page_location:location.origin+location.pathname});
   const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);document.head.appendChild(script);
 }
 function item(p,quantity=1,size,color){return {item_id:p.id,item_name:p.name,item_brand:'Label by Zare',item_category:LZCollections.forProduct(p).name,item_variant:[size,color].filter(Boolean).join(' / '),price:p.price,quantity};}
 function track(name,ecommerce){
   // Never include customer names, contact details, addresses or payment data.
   window.dataLayer.push({ecommerce:null});
   window.dataLayer.push({event:name,ecommerce:{currency:'PKR',...ecommerce}});
   if(enabled) gtag('event',name,{currency:'PKR',...ecommerce});
 }
 window.LZAnalytics={item,track};
 document.addEventListener('DOMContentLoaded',()=>{
   (window.PRODUCTS_READY || Promise.resolve()).then(()=>{
     if(location.pathname.startsWith('/product/')){
       const p=window.PRODUCTS?.find(p=>p.id===getProductIdFromLocation());
       if(p) track('view_item',{value:p.price,items:[item(p)]});
     }
     const grid=document.querySelector('#collection-grid');
     if(grid){
       const ids=[...grid.querySelectorAll('[data-wish-id]')].map(b=>b.dataset.wishId);
       const products=(window.PRODUCTS || []).filter(p=>ids.includes(p.id));
       if(products.length) track('view_item_list',{item_list_id:location.pathname,items:products.slice(0,24).map(p=>item(p))});
     }
   });
 });
})();
