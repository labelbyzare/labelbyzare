/* Homepage intro. Runs before the deferred shop libraries and needs no CDN. */
(function(){
  const loader=document.getElementById('loader');
  if(!loader || !document.body.classList.contains('home-page')) return;
  let resolveReady;
  window.LZ_PAGE_READY=new Promise(resolve=>{resolveReady=resolve;});
  const started=performance.now();
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let closing=false, released=false, minimumTimer, maximumTimer, fadeTimer;
  const hero=document.querySelector('.hero-fallback-img');

  function release(){
    if(released) return;
    released=true;
    clearTimeout(fadeTimer);
    document.documentElement.classList.remove('lz-home-loading');
    loader.style.display='none';
    document.removeEventListener('keydown',skip,true);
    hero?.removeEventListener('load',imageReady);
    hero?.removeEventListener('error',imageReady);
    resolveReady();
  }
  function finish(immediate=false){
    if(closing){if(immediate) release();return;}
    closing=true;
    clearTimeout(minimumTimer);
    clearTimeout(maximumTimer);
    loader.classList.add('hidden');
    loader.setAttribute('aria-hidden','true');
    if(immediate || reduced) release();
    else fadeTimer=setTimeout(release,550);
  }
  function imageReady(){
    if(closing) return;
    clearTimeout(minimumTimer);
    minimumTimer=setTimeout(()=>finish(),Math.max(0,1100-(performance.now()-started)));
  }
  function skip(event){
    if(event.key==='Escape' || event.key==='Tab') finish(true);
  }
  const style=getComputedStyle(loader);
  if(reduced || style.display==='none' || style.visibility==='hidden'){
    finish(true);
    return;
  }
  document.documentElement.classList.add('lz-home-loading');
  loader.setAttribute('aria-hidden','false');
  document.addEventListener('keydown',skip,true);
  // Never let slow images or third-party scripts block entry indefinitely.
  maximumTimer=setTimeout(()=>finish(),2600);
  if(!hero || hero.complete) imageReady();
  else {
    hero.addEventListener('load',imageReady,{once:true});
    hero.addEventListener('error',imageReady,{once:true});
  }
  window.addEventListener('pagehide',()=>finish(true),{once:true});
  window.addEventListener('pageshow',event=>{if(event.persisted) finish(true);});
})();
