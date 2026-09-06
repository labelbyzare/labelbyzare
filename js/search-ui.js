/* Accessible search overlay, shared by every storefront page. */
document.addEventListener("DOMContentLoaded", () => {
  const overlay=document.querySelector(".search-overlay");
  if(!overlay) return;
  const form=overlay.querySelector(".search-form");
  const input=overlay.querySelector('input[name="q"]');
  const results=overlay.querySelector(".search-results");
  const status=overlay.querySelector(".search-status");
  const hint=overlay.querySelector(".search-hint");
  const clear=overlay.querySelector(".search-clear");
  const more=overlay.querySelector(".search-more");
  const retry=overlay.querySelector(".search-retry");
  let ready=false, limit=12, searchTimer, focusTimer, opener, previousOverflow="";

  function node(tag,className,text){
    const el=document.createElement(tag);
    if(className) el.className=className;
    if(text) el.textContent=text;
    return el;
  }
  function imageUrl(value){
    try{
      const url=new URL(value || "/images/logo.jpg",location.href);
      if(["http:","https:"].includes(url.protocol)) return url.href;
    }catch{}
    return "/images/logo.jpg";
  }
  function card(product){
    const link=node("a","search-result-card");
    link.href=productUrl(product);
    const img=node("img");
    img.src=imageUrl(product.img);
    img.alt=product.name;
    img.loading="lazy";
    img.decoding="async";
    img.width=600; img.height=800;
    img.addEventListener("error",()=>{img.src="/images/logo.jpg";},{once:true});
    const stocked=isInStock(product);
    const category=node("p","search-result-category",`${product.category || LZProductTypes.label(product)}${stocked ? "" : " · Sold out"}`);
    const name=node("h3","",product.name);
    const prices=node("div","search-result-prices");
    const price=Number(product.price);
    prices.append(node("span","price",Number.isFinite(price) ? formatPKR(price) : "Price unavailable"));
    if(Number(product.oldPrice)>price) prices.append(node("del","price-old",formatPKR(Number(product.oldPrice))));
    link.append(img,category,name,prices);
    return link;
  }
  function render(){
    const query=input.value.trim();
    clear.hidden=!input.value;
    hint.hidden=!!query;
    more.hidden=true;
    retry.hidden=true;
    results.replaceChildren();
    results.setAttribute("aria-busy","false");
    if(!query){ status.textContent=""; return; }
    if(!ready){
      status.textContent="Loading the collection…";
      results.setAttribute("aria-busy","true");
      return;
    }
    if(window.PRODUCTS_LOAD_ERROR){
      status.textContent="We couldn’t load the collection. Please try again.";
      retry.hidden=false;
      return;
    }
    const match=LZSearch.lookup(window.PRODUCTS || [],query);
    const total=match.products.length;
    const shown=Math.min(limit,total);
    status.textContent=total ? `${match.usedFuzzy ? "Closest matches · " : ""}${total} ${total===1 ? "piece" : "pieces"} found${shown<total ? ` · Showing ${shown}` : ""}` : "No matching pieces found";
    if(!total){
      const empty=node("div","search-empty");
      empty.append(node("h3","","Let’s find something beautiful."),node("p","","Try a product name, colour or fabric, or explore a collection below."));
      const links=node("div","search-empty-links");
      ["abayas","shawls"].forEach(type=>{
        const link=node("a","",LZProductTypes.label(type));
        link.href=LZProductTypes.collectionUrl(type);
        links.append(link);
      });
      empty.append(links);results.append(empty);
      return;
    }
    results.append(...match.products.slice(0,limit).map(card));
    more.hidden=shown>=total;
    more.textContent=`Show more pieces (${total-shown} remaining)`;
  }
  function schedule(){
    clearTimeout(searchTimer);
    clear.hidden=!input.value;
    limit=12;
    if(!input.value.trim()) render();
    else searchTimer=setTimeout(render,140);
  }
  function openSearch(trigger){
    if(overlay.classList.contains("open")) return;
    opener=trigger;
    previousOverflow=document.body.style.overflow;
    overlay.inert=false;
    overlay.setAttribute("aria-hidden","false");
    overlay.classList.add("open");
    document.body.style.overflow="hidden";
    if(!window.CATALOG_COMPLETE){
      ready=false;
      window.ensureFullCatalog().then(()=>{ready=true;if(overlay.classList.contains("open")) render();});
    }
    render();
    focusTimer=setTimeout(()=>{if(overlay.classList.contains("open")) input.focus();},80);
  }
  function closeSearch(){
    if(!overlay.classList.contains("open")) return;
    clearTimeout(focusTimer);clearTimeout(searchTimer);
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden","true");
    overlay.inert=true;
    document.body.style.overflow=document.querySelector(".mobile-menu.open, .cart-drawer.open, .zoom-overlay.open") ? "hidden" : previousOverflow;
    opener?.focus();
  }
  document.querySelectorAll(".js-open-search").forEach(button=>button.addEventListener("click",event=>{
    event.preventDefault();openSearch(button);
  }));
  overlay.querySelector(".search-close").addEventListener("click",closeSearch);
  input.addEventListener("input",event=>{if(!event.isComposing) schedule();});
  input.addEventListener("compositionend",schedule);
  clear.addEventListener("click",()=>{clearTimeout(searchTimer);input.value="";limit=12;render();input.focus();});
  form.addEventListener("submit",event=>{
    event.preventDefault();clearTimeout(searchTimer);limit=12;render();
    results.querySelector(".search-result-card")?.focus();
  });
  overlay.querySelectorAll("[data-search-query]").forEach(button=>button.addEventListener("click",()=>{
    clearTimeout(searchTimer);input.value=button.dataset.searchQuery;limit=12;render();input.focus();
  }));
  more.addEventListener("click",()=>{
    const previous=limit;limit+=12;render();
    results.querySelectorAll(".search-result-card")[previous]?.focus({preventScroll:true});
  });
  retry.addEventListener("click",async()=>{
    ready=false;render();
    await window.loadProducts();
    ready=true;render();
  });
  document.addEventListener("keydown",event=>{
    if(!overlay.classList.contains("open")) return;
    if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();closeSearch();return;}
    if(event.key==="ArrowDown" && event.target===input){
      const first=results.querySelector(".search-result-card");
      if(first){event.preventDefault();first.focus();}
    }
    if(event.key!=="Tab") return;
    const focusable=[...overlay.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])')].filter(el=>!el.closest("[hidden]"));
    const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey && (document.activeElement===first || !overlay.contains(document.activeElement))){event.preventDefault();last?.focus();}
    else if(!event.shiftKey && (document.activeElement===last || !overlay.contains(document.activeElement))){event.preventDefault();first?.focus();}
  });
  (window.PRODUCTS_READY || Promise.resolve()).then(()=>{
    ready=!!window.CATALOG_COMPLETE;
    if(overlay.classList.contains("open")) render();
  });
});
