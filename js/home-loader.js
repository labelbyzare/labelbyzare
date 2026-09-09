/* Branding never delays usable content, images or native scrolling. */
(function(){
  window.LZ_PAGE_READY=Promise.resolve();
  document.documentElement.classList.remove('lz-home-loading');
  const loader=document.getElementById('loader');
  if(loader){loader.hidden=true;loader.style.display='none';loader.setAttribute('aria-hidden','true');}
})();
