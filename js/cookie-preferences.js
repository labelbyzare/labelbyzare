/* LABEL BY ZARE — cookie-preference UI copy layered over consent-aware analytics */
(function(){
  "use strict";
  function applyCookieCopy(){
    const banner=document.getElementById("lz-consent-banner");
    if(banner){
      banner.setAttribute("aria-label","Cookie preferences");
      const title=banner.querySelector("strong");
      const copy=banner.querySelector("p");
      const reject=banner.querySelector('[data-lz-consent="denied"]');
      const accept=banner.querySelector('[data-lz-consent="granted"]');
      const details=banner.querySelector('a[href="/privacy"]');
      if(title)title.textContent="Cookie preferences";
      if(copy)copy.textContent="We use optional cookies and similar technologies to improve your experience. Essential shopping functions always remain available.";
      if(reject)reject.textContent="Reject non-essential";
      if(accept)accept.textContent="Accept all";
      if(details)details.textContent="Cookie details";
    }

    document.querySelectorAll('[data-privacy-choice="deny"]').forEach(button=>{button.textContent="Reject non-essential";});
    document.querySelectorAll('[data-privacy-choice="allow"]').forEach(button=>{button.textContent="Accept optional cookies";});
  }

  document.addEventListener("DOMContentLoaded",()=>{
    applyCookieCopy();
    const observer=new MutationObserver(applyCookieCopy);
    observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),5000);
  });

  window.addEventListener("lz:privacy-consent",()=>setTimeout(applyCookieCopy,0));
})();
