/* LABEL BY ZARE — safe cookie-preference UI copy */
(function(){
  "use strict";

  function setText(el,value){
    if(el && el.textContent !== value) el.textContent=value;
  }

  function applyCookieCopy(){
    const banner=document.getElementById("lz-consent-banner");
    if(banner){
      if(banner.getAttribute("aria-label")!=="Cookie preferences") banner.setAttribute("aria-label","Cookie preferences");
      setText(banner.querySelector("strong"),"Cookie preferences");
      setText(banner.querySelector("p"),"We use optional cookies and similar technologies to improve your experience. Essential shopping functions always remain available.");
      setText(banner.querySelector('[data-lz-consent="denied"]'),"Reject non-essential");
      setText(banner.querySelector('[data-lz-consent="granted"]'),"Accept all");
      setText(banner.querySelector('a[href="/privacy"]'),"Cookie details");
    }

    document.querySelectorAll('[data-privacy-choice="deny"]').forEach(button=>setText(button,"Reject non-essential"));
    document.querySelectorAll('[data-privacy-choice="allow"]').forEach(button=>setText(button,"Accept optional cookies"));
  }

  function ready(){
    applyCookieCopy();
    requestAnimationFrame(applyCookieCopy);
    setTimeout(applyCookieCopy,100);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",ready,{once:true});
  else ready();

  window.addEventListener("lz:privacy-consent",()=>setTimeout(applyCookieCopy,0));
})();
