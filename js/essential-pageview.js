/* LABEL BY ZARE — cookie-free aggregate page-view counter */
(function(){
  "use strict";
  function count(){
    try{
      if(!/(^|\.)labelbyzare\.com$/i.test(location.hostname)) return;
      if(location.pathname.startsWith('/admin')) return;
      if(!window.supabaseClient?.rpc) return;
      window.supabaseClient.rpc('count_anonymous_page_view',{p_path:location.pathname||'/'}).catch(()=>{});
    }catch(_){ }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',count,{once:true});
  else count();
})();
