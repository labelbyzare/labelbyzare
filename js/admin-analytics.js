/* LABEL BY ZARE — Website Analytics admin experience */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const num=v=>Number(v||0).toLocaleString("en-PK");
  let loaded=false,loading=false,data=null,range={preset:"30d",start:null,end:null},resizeTimer,autoRefreshTimer,lastRefreshAt=0;
  const AUTO_REFRESH_MS=15000;

  const labels={"24h":"Last 24 hours","7d":"Last 7 days","30d":"Last 30 days","3m":"Last 3 months","6m":"Last 6 months","1y":"Last year",custom:"Custom range"};
  function allowed(){return window.LZAdminAccess?.canView("analytics")!==false;}
  function startDay(d){const x=new Date(d);x.setHours(0,0,0,0);return x;}
  function endDay(d){const x=new Date(d);x.setHours(23,59,59,999);return x;}
  function inputDate(d){const x=new Date(d),y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,"0"),day=String(x.getDate()).padStart(2,"0");return `${y}-${m}-${day}`;}
  function parseDate(v,end=false){if(!/^\d{4}-\d{2}-\d{2}$/.test(v||""))return null;const [y,m,d]=v.split("-").map(Number),x=new Date(y,m-1,d);if(x.getFullYear()!==y||x.getMonth()!==m-1||x.getDate()!==d)return null;return end?endDay(x):startDay(x);}
  function windowRange(){
    const now=new Date(),to=new Date(now),p=range.preset;let from;
    if(p==="custom"&&range.start&&range.end)return{from:startDay(range.start),to:endDay(range.end),label:labels.custom};
    if(p==="24h")from=new Date(now.getTime()-24*3600000);
    else if(p==="7d"){from=startDay(now);from.setDate(from.getDate()-6);}
    else if(p==="3m"){from=startDay(now);from.setMonth(from.getMonth()-3);}
    else if(p==="6m"){from=startDay(now);from.setMonth(from.getMonth()-6);}
    else if(p==="1y"){from=startDay(now);from.setFullYear(from.getFullYear()-1);}
    else{from=startDay(now);from.setDate(from.getDate()-29);}
    return{from,to,label:labels[p]||labels["30d"]};
  }
  function rangeText(from,to){
    if(range.preset==="24h")return `${from.toLocaleString("en-PK",{day:"2-digit",month:"short",hour:"numeric",minute:"2-digit"})} – now`;
    return `${from.toLocaleDateString("en-PK",{day:"2-digit",month:"short",year:"numeric"})} – ${to.toLocaleDateString("en-PK",{day:"2-digit",month:"short",year:"numeric"})}`;
  }
  function syncRange(){
    document.querySelectorAll("[data-analytics-range]").forEach(b=>b.classList.toggle("active",b.dataset.analyticsRange===range.preset));
    const w=windowRange(),label=$("analytics-range-label");if(label)label.textContent=`${w.label} · ${rangeText(w.from,w.to)}`;
  }
  function customToggle(){
    const panel=$("analytics-custom-range"),from=$("analytics-date-from"),to=$("analytics-date-to");if(!panel||!from||!to)return;
    const w=windowRange(),today=inputDate(new Date());from.max=today;to.max=today;if(!from.value)from.value=inputDate(w.from);if(!to.value)to.value=inputDate(w.to);panel.hidden=!panel.hidden;if(!panel.hidden)from.focus();$("analytics-range-error").textContent="";
  }
  function applyPreset(p){if(p==="custom"){customToggle();return;}range={preset:p,start:null,end:null};syncRange();load(true);}
  function applyCustom(){
    const from=parseDate($("analytics-date-from")?.value),to=parseDate($("analytics-date-to")?.value,true),msg=$("analytics-range-error");
    if(!from||!to){msg.textContent="Choose both dates.";return;}if(from>to){msg.textContent="The start date must be before the end date.";return;}if(to>new Date()){msg.textContent="The end date cannot be in the future.";return;}
    range={preset:"custom",start:from,end:to};msg.textContent="";$("analytics-custom-range").hidden=true;syncRange();load(true);
  }
  function duration(seconds){
    const s=Math.max(0,Math.round(Number(seconds)||0));if(s<60)return `${s}s`;const m=Math.floor(s/60),r=s%60;if(m<60)return `${m}m ${r}s`;const h=Math.floor(m/60),rm=m%60;return `${h}h ${rm}m`;
  }
  function ago(value){
    const ms=Date.now()-new Date(value).getTime();if(!Number.isFinite(ms))return "—";const s=Math.max(0,Math.floor(ms/1000));if(s<60)return "just now";const m=Math.floor(s/60);if(m<60)return `${m}m ago`;const h=Math.floor(m/60);if(h<24)return `${h}h ago`;const d=Math.floor(h/24);return `${d}d ago`;
  }
  function flag(code){const c=String(code||"").toUpperCase();if(!/^[A-Z]{2}$/.test(c))return "◌";return String.fromCodePoint(...[...c].map(ch=>127397+ch.charCodeAt()));}
  function shortVisitor(id){const x=String(id||"").replace(/-/g,"");return x?`Visitor ${x.slice(0,6).toUpperCase()}`:"Visitor";}
  function pathLabel(path){if(!path||path==="/")return "Homepage";const decode=x=>{try{return decodeURIComponent(x);}catch(_){return x;}};return String(path).replace(/\.html$/i,"").replace(/^\//,"").replace(/\/$/,"").split("/").filter(Boolean).map(x=>decode(x).replace(/[-_]+/g," ")).join(" › ")||"Homepage";}

  async function load(force=false){
    if(!allowed()||loading||(loaded&&!force))return;loading=true;const refresh=$("refresh-analytics-btn");if(refresh){refresh.disabled=true;refresh.textContent="Refreshing…";}setLoading();syncRange();
    const w=windowRange();
    try{
      const {data:raw,error}=await supabaseClient.rpc("admin_analytics_overview",{p_from:w.from.toISOString(),p_to:w.to.toISOString()});
      if(error)throw error;data=Array.isArray(raw)?raw[0]:raw;loaded=true;$("analytics-setup-note").hidden=true;render(data||{});
    }catch(error){
      data=null;$("analytics-setup-note").hidden=false;renderError(error);
    }finally{loading=false;lastRefreshAt=Date.now();if(refresh){refresh.disabled=false;refresh.textContent="Refresh now";}updateAutoStatus();}
  }
  function setLoading(){
    ["analytics-page-views","analytics-visitors","analytics-sessions","analytics-avg-time","analytics-live","analytics-conversion"].forEach(id=>{if($(id))$(id).textContent="…";});
  }
  function renderError(error){
    const message=esc(error?.message||"Analytics is unavailable.");
    const setupNote=$("analytics-setup-note");
    const setupText=setupNote?.querySelector("p");
    if(setupText) setupText.innerHTML=`Analytics could not load: <strong>${message}</strong>`;
    $("analytics-products-tbody").innerHTML=`<tr><td colspan="6" class="admin-muted">${message}</td></tr>`;
    $("analytics-sessions-tbody").innerHTML=`<tr><td colspan="9" class="admin-muted">Run the v27 analytics SQL setup, then refresh this page.</td></tr>`;
    ["analytics-countries","analytics-pages","analytics-sources","analytics-devices","analytics-browsers"].forEach(id=>{if($(id))$(id).innerHTML='<p class="admin-muted">Analytics setup required.</p>';});
    $("analytics-favorite-body").innerHTML='<p class="admin-muted">No analytics data available yet.</p>';$("analytics-favorite-score").textContent="—";drawChart([]);
  }
  function render(d){
    const s=d.summary||{},products=Array.isArray(d.products)?d.products:[],countries=Array.isArray(d.countries)?d.countries:[],pages=Array.isArray(d.pages)?d.pages:[],sources=Array.isArray(d.sources)?d.sources:[],devices=Array.isArray(d.devices)?d.devices:[],browsers=Array.isArray(d.browsers)?d.browsers:[],sessions=Array.isArray(d.recent_sessions)?d.recent_sessions:[];
    $("analytics-page-views").textContent=num(s.page_views);$("analytics-visitors").textContent=num(s.visitors);$("analytics-sessions").textContent=num(s.sessions);$("analytics-avg-time").textContent=duration(s.avg_active_seconds);$("analytics-live").textContent=num(s.live_now);$("analytics-live-inline").textContent=num(s.live_now);$("analytics-conversion").textContent=`${Number(s.conversion_rate||0).toFixed(1)}%`;$("analytics-conversion-note").textContent=`${num(s.conversions)} purchasing session${Number(s.conversions)===1?"":"s"}`;$("analytics-pages-session").textContent=Number(s.avg_pages_per_session||0).toFixed(1);$("analytics-quick-exit").textContent=`${Number(s.quick_exit_rate||0).toFixed(1)}%`;
    const nav=$("nav-analytics-live");if(nav){if(Number(s.live_now)>0){nav.textContent=s.live_now;nav.style.display="inline-flex";}else nav.style.display="none";}
    renderFavorite(products[0]);renderProducts(products);renderCountries(countries);renderList("analytics-pages",pages,x=>({title:pathLabel(x.path),sub:`${num(x.sessions)} sessions · ${num(x.visitors)} visitors`,value:num(x.views)}));renderList("analytics-sources",sources,x=>({title:x.source||"Direct",sub:`${num(x.visitors)} visitors`,value:num(x.sessions)}));renderBars("analytics-devices",devices,"device","sessions");renderList("analytics-browsers",browsers,x=>({title:x.browser||"Unknown",sub:"Browser sessions",value:num(x.sessions)}));renderSessions(sessions);drawChart(Array.isArray(d.trend)?d.trend:[]);$("analytics-trend-total").textContent=`${num(s.page_views)} views`;
  }
  function renderFavorite(p){
    if(!p){$("analytics-favorite-body").innerHTML='<div class="admin-analytics-no-favorite"><strong>No favorite yet</strong><span>Product activity will appear after visitors start browsing the deployed v27 storefront.</span></div>';$("analytics-favorite-score").textContent="—";return;}
    const media=p.image?`<img src="${esc(p.image)}" alt="">`:`<span>${esc(String(p.product_name||"P").charAt(0).toUpperCase())}</span>`;
    $("analytics-favorite-score").textContent=`${num(p.interest_score)} pts`;
    $("analytics-favorite-body").innerHTML=`<div class="admin-analytics-favorite-media">${media}</div><div class="admin-analytics-favorite-copy"><span>Highest shopper interest</span><h4>${esc(p.product_name||"Product")}</h4><div class="admin-analytics-favorite-metrics"><b><em>${num(p.views)}</em>Views</b><b><em>${num(p.wishlists)}</em>Wishlist</b><b><em>${num(p.add_to_carts)}</em>Added to cart</b><b><em>${num(p.purchases)}</em>Purchased</b></div></div>`;
  }
  function renderProducts(rows){
    const body=$("analytics-products-tbody");body.innerHTML=rows.length?rows.map((p,i)=>`<tr><td><div class="admin-analytics-product-cell"><span>${i+1}</span><strong>${esc(p.product_name||"Product")}</strong></div></td><td>${num(p.views)}</td><td>${num(p.wishlists)}</td><td>${num(p.add_to_carts)}</td><td>${num(p.purchases)}</td><td><strong>${num(p.interest_score)}</strong></td></tr>`).join(""):'<tr><td colspan="6" class="admin-muted">No product engagement in this period yet.</td></tr>';
  }
  function renderCountries(rows){
    const el=$("analytics-countries");if(!rows.length){el.innerHTML='<p class="admin-muted">No visitor countries yet.</p>';return;}const max=Math.max(...rows.map(x=>Number(x.sessions)||0),1);
    el.innerHTML=rows.slice(0,10).map(x=>`<div class="admin-analytics-bar-row"><div><span class="admin-country-flag">${flag(x.country_code)}</span><span><strong>${esc(x.country_name||"Unknown")}</strong><small>${num(x.visitors)} visitors · ${duration(x.avg_seconds)} avg</small></span></div><div class="admin-analytics-bar-track"><i style="width:${Math.max(4,(Number(x.sessions)||0)/max*100)}%"></i></div><b>${num(x.sessions)}</b></div>`).join("");
  }
  function renderBars(id,rows,key,valueKey){
    const el=$(id);if(!el)return;if(!rows.length){el.innerHTML='<p class="admin-muted">No data yet.</p>';return;}const max=Math.max(...rows.map(x=>Number(x[valueKey])||0),1);el.innerHTML=rows.slice(0,8).map(x=>`<div class="admin-analytics-compact-bar"><span>${esc(x[key]||"Unknown")}</span><div><i style="width:${Math.max(4,(Number(x[valueKey])||0)/max*100)}%"></i></div><b>${num(x[valueKey])}</b></div>`).join("");
  }
  function renderList(id,rows,map){
    const el=$(id);if(!el)return;if(!rows.length){el.innerHTML='<p class="admin-muted">No data in this period yet.</p>';return;}el.innerHTML=rows.slice(0,10).map((row,i)=>{const x=map(row);return `<div class="admin-analytics-list-row"><span>${i+1}</span><div><strong>${esc(x.title)}</strong><small>${esc(x.sub||"")}</small></div><b>${esc(x.value)}</b></div>`;}).join("");
  }
  function renderSessions(rows){
    const body=$("analytics-sessions-tbody");if(!rows.length){body.innerHTML='<tr><td colspan="9" class="admin-muted">No visitor sessions in this period yet.</td></tr>';return;}
    body.innerHTML=rows.map(s=>`<tr><td><div class="admin-visitor-id"><strong>${esc(shortVisitor(s.visitor_id))}</strong><small>${s.signed_in?'Signed-in customer':'Anonymous visitor'}${s.converted?' · Purchased':''}</small></div></td><td><span class="admin-country-cell">${flag(s.country_code)} ${esc(s.country_name||"Unknown")}</span></td><td>${esc(pathLabel(s.landing_path))}</td><td>${esc(s.source||"Direct")}</td><td><span class="admin-device-chip">${esc(s.device_type||"Unknown")}</span><small class="admin-table-sub">${esc(s.browser||"")}</small></td><td>${num(s.page_views)}</td><td>${duration(s.active_seconds)}</td><td>${ago(s.last_seen_at)}</td><td><button type="button" class="btn-sm" data-analytics-session="${esc(s.session_id)}">Journey</button></td></tr>`).join("");
  }

  function drawChart(rows){
    const canvas=$("analytics-traffic-chart"),empty=$("analytics-chart-empty");if(!canvas)return;const values=rows.map(x=>Number(x.views)||0),visitors=rows.map(x=>Number(x.visitors)||0),has=values.some(Boolean);empty.style.display=has?"none":"grid";canvas.style.opacity=has?"1":".2";
    const rect=canvas.getBoundingClientRect(),w=Math.max(260,rect.width||650),h=Math.max(220,rect.height||260),dpr=window.devicePixelRatio||1;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const pad={l:38,r:16,t:20,b:34},cw=w-pad.l-pad.r,ch=h-pad.t-pad.b,max=Math.max(1,...values,...visitors);ctx.font='11px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';ctx.fillStyle="#988b79";ctx.strokeStyle="#e7dfd3";ctx.lineWidth=1;
    for(let i=0;i<=4;i++){const y=pad.t+ch*i/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();const label=Math.round(max*(1-i/4));ctx.fillText(num(label),3,y+4);}
    if(!rows.length)return;
    const x=i=>pad.l+(rows.length===1?cw/2:cw*i/(rows.length-1)),y=v=>pad.t+ch-(Number(v)||0)/max*ch;
    function line(series,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin="round";ctx.lineCap="round";ctx.beginPath();series.forEach((v,i)=>{const xx=x(i),yy=y(v);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);});ctx.stroke();}
    line(values,"#9d7745",2.4);line(visitors,"#2f5149",1.8);
    const labelCount=Math.min(6,rows.length),indexes=[...new Set(Array.from({length:labelCount},(_,i)=>Math.round(i*(rows.length-1)/Math.max(1,labelCount-1))))];ctx.fillStyle="#8f8578";ctx.textAlign="center";
    indexes.forEach(i=>{const d=new Date(rows[i].bucket_at),label=(data?.bucket==="hour")?d.toLocaleTimeString("en-PK",{hour:"numeric"}):data?.bucket==="month"?d.toLocaleDateString("en-PK",{month:"short",year:"2-digit"}):d.toLocaleDateString("en-PK",{day:"numeric",month:"short"});ctx.fillText(label,x(i),h-10);});ctx.textAlign="start";
  }

  async function openSession(sessionId){
    const modal=$("analytics-session-modal"),body=$("analytics-session-body");if(!modal||!body)return;modal.classList.add("open");modal.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";body.innerHTML='<div class="admin-search-loading"><span></span><strong>Loading visitor journey…</strong></div>';
    try{
      const {data:raw,error}=await supabaseClient.rpc("admin_analytics_session",{p_session_id:sessionId});if(error)throw error;const d=Array.isArray(raw)?raw[0]:raw,s=d?.session||{},events=Array.isArray(d?.events)?d.events:[];
      const eventLabels={page_view:"Page viewed",view_item:"Product viewed",add_to_cart:"Added to cart",add_to_wishlist:"Saved to wishlist",remove_from_wishlist:"Removed from wishlist",begin_checkout:"Started checkout",purchase:"Order completed",purchase_item:"Purchased item"};
      body.innerHTML=`<div class="admin-growth-modal-head"><span class="admin-eyebrow">Visitor journey</span><h2 id="analytics-session-title">${esc(shortVisitor(s.visitor_id))}</h2><p>${flag(s.country_code)} ${esc(s.country_name||"Unknown")} · ${esc(s.device_type||"Unknown")} · ${esc(s.browser||"Unknown")} on ${esc(s.os||"Unknown")}</p></div>
        <div class="admin-detail-grid admin-analytics-session-grid"><div class="admin-detail-card"><span>Session started</span><strong>${esc(new Date(s.started_at).toLocaleString("en-PK"))}</strong></div><div class="admin-detail-card"><span>Active time</span><strong>${duration(s.active_seconds)}</strong></div><div class="admin-detail-card"><span>Page views</span><strong>${num(s.page_views)}</strong></div><div class="admin-detail-card"><span>Acquisition</span><strong>${esc(s.utm_source||s.referrer_host||"Direct")}</strong></div><div class="admin-detail-card"><span>Customer state</span><strong>${s.signed_in?'Signed in':'Anonymous'}</strong></div><div class="admin-detail-card"><span>Conversion</span><strong>${s.converted?'Purchased':'No purchase'}</strong></div></div>
        <section class="admin-customer-block"><h3>Journey timeline</h3><div class="admin-analytics-journey">${events.length?events.map(e=>`<div class="admin-analytics-event"><span>${new Date(e.event_at).toLocaleTimeString("en-PK",{hour:"numeric",minute:"2-digit",second:"2-digit"})}</span><i></i><div><strong>${esc(eventLabels[e.event_type]||e.event_type)}</strong><small>${esc(e.product_name||pathLabel(e.path)||"")}${e.value!=null&&["add_to_cart","purchase_item"].includes(e.event_type)?` · Rs. ${num(e.value)}`:""}</small></div></div>`).join(""):'<p class="admin-muted">No event timeline is available.</p>'}</div></section>
        <p class="admin-abandoned-privacy">Analytics intentionally does not store raw IP addresses, checkout emails, delivery addresses or payment details.</p>`;
    }catch(error){body.innerHTML=`<div class="admin-growth-modal-head"><h2 id="analytics-session-title">Could not load this journey</h2><p>${esc(error?.message||"Unknown error")}</p></div>`;}
  }
  function closeSession(){const modal=$("analytics-session-modal");if(!modal)return;modal.classList.remove("open");modal.setAttribute("aria-hidden","true");document.body.style.overflow="";}

  function analyticsVisible(){return !document.hidden && $("analytics-card")?.classList.contains("admin-section-visible");}
  function updateAutoStatus(){
    const el=$("analytics-auto-refresh-status"),text=el?.querySelector("span");if(!el||!text)return;
    const active=analyticsVisible();el.classList.toggle("is-paused",!active);text.textContent=active?"Auto · 15s":"Auto paused";
  }
  function startAutoRefresh(){
    if(autoRefreshTimer)return;updateAutoStatus();
    autoRefreshTimer=setInterval(()=>{if(!analyticsVisible()||loading)return;load(true);},AUTO_REFRESH_MS);
  }
  function refreshOnReturn(){
    updateAutoStatus();if(!analyticsVisible()||loading)return;
    if(!lastRefreshAt||Date.now()-lastRefreshAt>=AUTO_REFRESH_MS)load(true);
  }

  function bind(){
    $("refresh-analytics-btn")?.addEventListener("click",()=>load(true));
    document.querySelectorAll("[data-analytics-range]").forEach(b=>b.addEventListener("click",()=>applyPreset(b.dataset.analyticsRange)));
    $("apply-analytics-range")?.addEventListener("click",applyCustom);
    $("analytics-sessions-tbody")?.addEventListener("click",e=>{const b=e.target.closest("[data-analytics-session]");if(b)openSession(b.dataset.analyticsSession);});
    $("analytics-session-modal")?.addEventListener("click",e=>{if(e.target.closest("[data-close-analytics-session]"))closeSession();});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("analytics-session-modal")?.classList.contains("open"))closeSession();});
    document.addEventListener("click",e=>{const nav=e.target.closest('[data-section-target="analytics"],[data-go-section="analytics"]');if(nav)setTimeout(()=>{load(false);updateAutoStatus();},0);});
    document.addEventListener("visibilitychange",refreshOnReturn);
    window.addEventListener("hashchange",()=>setTimeout(refreshOnReturn,0));
    window.addEventListener("resize",()=>{if(!data||!$("analytics-card")?.classList.contains("admin-section-visible"))return;clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>drawChart(data.trend||[]),120);},{passive:true});
  }
  function init(){bind();syncRange();startAutoRefresh();if((location.hash||"")==="#analytics")load(true);}
  window.addEventListener("lz:admin-ready",init,{once:true});if(window.LZ_ADMIN_USER)document.addEventListener("DOMContentLoaded",init,{once:true});
  window.LZAdminAnalytics={load,openSession};
})();
