const LEGAL='<span class="footer-legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/shipping-policy">Shipping</a><a href="/returns-policy">Returns</a></span>';
module.exports=function hardenHtml(input){
 let html=String(input||'')
  .replace(/@supabase\/supabase-js@2(?=["'])/g,'@supabase/supabase-js@2.105.0')
  .replace(/\/js\/catalog-core\.js\?v=[^"']+/g,'/js/catalog-core.js?v=20260908-v29')
  .replace(/\/js\/analytics\.js\?v=[^"']+/g,'/js/analytics.js?v=20260908-v29');
 if(html.includes('class="site-footer"')&&!html.includes('class="footer-legal"')) html=html.replace('</footer>',LEGAL+'</footer>');
 return html;
};
