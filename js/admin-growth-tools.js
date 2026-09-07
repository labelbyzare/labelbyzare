/* LABEL BY ZARE — v26 admin growth tools: abandoned carts, global search, system health */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const money=v=>`Rs. ${Math.round(Number(v||0)).toLocaleString("en-PK")}`;
  const safe=async promise=>{try{return await promise;}catch(error){return{data:null,error};}};
  const allowed=section=>window.LZAdminAccess?.canView(section)!==false;
  const ageMs=hours=>Number(hours||0)*3600000;
  const dateTime=value=>{if(!value)return"—";const d=new Date(value);return Number.isNaN(d.getTime())?"—":d.toLocaleString("en-PK",{dateStyle:"medium",timeStyle:"short"});};
  const ago=value=>{if(!value)return"Unknown";const ms=Math.max(0,Date.now()-new Date(value).getTime()),h=Math.floor(ms/3600000);if(h<1)return"< 1 hour";if(h<24)return`${h}h`;const d=Math.floor(h/24);if(d<30)return`${d}d ${h%24}h`;return`${Math.floor(d/30)}mo`;};
  const latest=(rows,fields=["updated_at","created_at"])=>rows.reduce((best,row)=>{for(const f of fields){const t=row?.[f]?new Date(row[f]).getTime():0;if(t>best)best=t;}return best;},0);
  let abandonedRows=[];
  let searchCache={at:0,items:[]};
  let searchTimer=null;
  let healthRunning=false;

  // ------------------------------------------------------------
  // Abandoned carts
  // ------------------------------------------------------------
  async function loadAbandonedCarts(){
    if(!allowed("abandoned"))return;
    const tbody=$("abandoned-tbody");if(tbody)tbody.innerHTML='<tr><td colspan="7">Loading synced carts…</td></tr>';
    const [cartR,productsR,profilesR,accountsR,ordersR]=await Promise.all([
      safe(supabaseClient.from("cart_items").select("*")),
      safe(supabaseClient.from("products").select("*")),
      safe(supabaseClient.from("profiles").select("*")),
      safe(supabaseClient.rpc("admin_customer_accounts")),
      safe(supabaseClient.from("orders").select("*").order("created_at",{ascending:false}))
    ]);
    if(cartR.error){
      if(tbody)tbody.innerHTML=`<tr><td colspan="7" class="admin-muted">Could not read synced carts: ${esc(cartR.error.message||"Unknown error")}</td></tr>`;
      return;
    }
    const carts=cartR.data||[],products=productsR.data||[],profiles=profilesR.data||[],accounts=accountsR.data||[],orders=ordersR.data||[];
    const productMap=new Map(products.map(p=>[String(p.id),p]));
    const profileMap=new Map(profiles.map(p=>[String(p.id),p]));
    const accountMap=new Map(accounts.map(a=>[String(a.id),a]));
    const orderMap=new Map();
    orders.forEach(o=>{if(!o.user_id)return;const k=String(o.user_id);if(!orderMap.has(k))orderMap.set(k,[]);orderMap.get(k).push(o);});
    const groups=new Map();
    carts.forEach(c=>{if(!c.user_id)return;const k=String(c.user_id);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(c);});
    abandonedRows=[...groups.entries()].map(([userId,cartRows])=>{
      const account=accountMap.get(userId)||{},profile=profileMap.get(userId)||{},customerOrders=orderMap.get(userId)||[];
      let lastActivity=latest(cartRows);if(!lastActivity)lastActivity=new Date(account.last_sign_in_at||account.created_at||0).getTime();
      const lastOrder=customerOrders.length?Math.max(...customerOrders.map(o=>new Date(o.created_at||0).getTime())):0;
      const items=cartRows.map(c=>{const p=productMap.get(String(c.product_id))||null;const qty=Math.max(1,Number(c.qty||1));return{...c,product:p,qty,lineValue:p?Number(p.price||0)*qty:0};});
      return{
        userId,name:profile.full_name||account.email?.split("@")[0]||"Customer",email:account.email||"",phone:profile.phone||account.auth_phone||"",items,
        value:items.reduce((s,i)=>s+i.lineValue,0),quantity:items.reduce((s,i)=>s+i.qty,0),lastActivity,lastOrder,orders:customerOrders.length,
        latestOrder:customerOrders[0]||null
      };
    }).filter(r=>r.items.length>0 && (!r.lastOrder||r.lastActivity>=r.lastOrder));
    renderAbandonedCarts();
  }
  function filteredAbandoned(){
    const threshold=Number($("abandoned-age-filter")?.value||24),q=String($("abandoned-search")?.value||"").trim().toLowerCase(),sort=$("abandoned-sort")?.value||"recent",now=Date.now();
    let rows=abandonedRows.filter(r=>r.lastActivity&&now-r.lastActivity>=ageMs(threshold));
    if(q)rows=rows.filter(r=>[r.name,r.email,r.phone,...r.items.map(i=>i.product?.name||i.product_id)].some(v=>String(v||"").toLowerCase().includes(q)));
    rows.sort((a,b)=>sort==="value"?b.value-a.value:sort==="oldest"?a.lastActivity-b.lastActivity:b.lastActivity-a.lastActivity);
    return{rows,threshold};
  }
  function renderAbandonedCarts(){
    const {rows,threshold}=filteredAbandoned(),tbody=$("abandoned-tbody"),empty=$("abandoned-empty"),now=Date.now();
    const totalValue=rows.reduce((s,r)=>s+r.value,0),high=rows.filter(r=>r.value>=10000).length,stale=rows.filter(r=>now-r.lastActivity>=ageMs(72)).length;
    if($("abandoned-total"))$("abandoned-total").textContent=rows.length;
    if($("abandoned-value"))$("abandoned-value").textContent=money(totalValue);
    if($("abandoned-high-value"))$("abandoned-high-value").textContent=high;
    if($("abandoned-stale"))$("abandoned-stale").textContent=stale;
    if($("abandoned-threshold-note"))$("abandoned-threshold-note").textContent=`Inactive for ${threshold<24?`${threshold}+ hours`:`${Math.round(threshold/24)}+ day${threshold>24?'s':''}`}`;
    const nav=$("nav-abandoned-count");if(nav){nav.textContent=rows.length||"";nav.style.display=rows.length?"inline-flex":"none";}
    if(!tbody)return;
    tbody.innerHTML=rows.length?rows.map(r=>{
      const names=r.items.slice(0,2).map(i=>i.product?.name||"Product").join(", "),more=r.items.length>2?` +${r.items.length-2} more`:"";
      const inactive=Date.now()-r.lastActivity;
      const tone=inactive>=ageMs(168)?"cold":inactive>=ageMs(72)?"stale":"warm";
      return `<tr><td><div class="admin-abandoned-customer"><span>${esc((r.name||"C").trim()[0]?.toUpperCase()||"C")}</span><div><strong>${esc(r.name)}</strong><small>${esc(r.email||"No account email")}</small></div></div></td><td><strong>${r.quantity} item${r.quantity===1?"":"s"}</strong><small class="admin-table-sub">${esc(names)}${esc(more)}</small></td><td><strong>${money(r.value)}</strong></td><td>${esc(dateTime(r.lastActivity))}</td><td><span class="admin-cart-age ${tone}">${esc(ago(r.lastActivity))}</span></td><td>${r.orders}<small class="admin-table-sub">${r.latestOrder?`Last #${esc(r.latestOrder.order_number||"")}`:"No orders yet"}</small></td><td><button type="button" data-open-abandoned="${esc(r.userId)}">View cart</button></td></tr>`;
    }).join(""):'<tr><td colspan="7" class="admin-muted">No matching abandoned carts.</td></tr>';
    if(empty)empty.hidden=rows.length>0;
  }
  function openAbandonedCart(userId){
    const row=abandonedRows.find(r=>String(r.userId)===String(userId));if(!row)return;
    const body=$("abandoned-modal-body"),modal=$("abandoned-cart-modal");if(!body||!modal)return;
    const itemHtml=row.items.map(i=>`<div class="admin-abandoned-line"><div><strong>${esc(i.product?.name||i.product_id)}</strong><small>${esc(i.size||"No size")} · ${esc(i.color||"No colour")} · Qty ${i.qty}</small></div><strong>${money(i.lineValue)}</strong></div>`).join("");
    body.innerHTML=`<div class="admin-growth-modal-head"><span class="admin-eyebrow">Abandoned cart</span><h2 id="abandoned-modal-title">${esc(row.name)}</h2><p>${esc(row.email||"No email available")}${row.phone?` · ${esc(row.phone)}`:""}</p></div><div class="admin-detail-grid admin-abandoned-detail-grid"><div class="admin-detail-card"><span>Cart value</span><strong>${money(row.value)}</strong></div><div class="admin-detail-card"><span>Items</span><strong>${row.quantity}</strong></div><div class="admin-detail-card"><span>Last activity</span><strong>${esc(ago(row.lastActivity))} ago</strong></div><div class="admin-detail-card"><span>Previous orders</span><strong>${row.orders}</strong></div></div><section class="admin-customer-block"><h3>Items left behind</h3><div class="admin-abandoned-lines">${itemHtml}</div></section><div class="admin-abandoned-modal-actions">${row.email?`<button type="button" data-copy-abandoned-email="${esc(row.email)}">Copy email</button><a href="mailto:${encodeURIComponent(row.email)}" class="admin-link-button">Email customer</a>`:""}<button type="button" data-view-abandoned-customer="${esc(row.email||row.name)}">Open customer profile</button></div><p class="admin-muted admin-abandoned-privacy">Recovery actions are manual. This dashboard does not automatically email customers or send coupons.</p>`;
    modal.classList.add("open");modal.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";
  }
  function closeAbandoned(){const modal=$("abandoned-cart-modal");if(!modal)return;modal.classList.remove("open");modal.setAttribute("aria-hidden","true");document.body.style.overflow="";}
  async function copyText(text){try{await navigator.clipboard.writeText(text);return true;}catch(_){const ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();const ok=document.execCommand("copy");ta.remove();return ok;}}

  // ------------------------------------------------------------
  // Global admin search
  // ------------------------------------------------------------
  async function buildSearchIndex(force=false){
    if(!force&&searchCache.items.length&&Date.now()-searchCache.at<60000)return searchCache.items;
    const jobs=[];
    const pushJob=(section,key,promise)=>{if(allowed(section))jobs.push(safe(promise).then(r=>({section,key,...r})));};
    pushJob("products","products",supabaseClient.from("products").select("*").limit(400));
    pushJob("orders","orders",supabaseClient.from("orders").select("*").order("created_at",{ascending:false}).limit(400));
    if(allowed("customers")||allowed("abandoned")){
      pushJob("customers","profiles",supabaseClient.from("profiles").select("*").limit(400));
      pushJob("customers","accounts",supabaseClient.rpc("admin_customer_accounts"));
    }
    pushJob("returns","returns",supabaseClient.from("return_requests").select("*").order("created_at",{ascending:false}).limit(250));
    pushJob("messages","messages",supabaseClient.from("messages").select("*").order("created_at",{ascending:false}).limit(250));
    pushJob("reviews","reviews",supabaseClient.from("product_reviews").select("*").order("created_at",{ascending:false}).limit(250));
    pushJob("discounts","discounts",supabaseClient.from("discounts").select("*").limit(250));
    pushJob("subscribers","subscribers",supabaseClient.from("newsletter_subscribers").select("*").order("created_at",{ascending:false}).limit(250));
    const results=await Promise.all(jobs),data=Object.fromEntries(results.map(r=>[r.key,r.error?[]:(r.data||[])]));
    const productMap=new Map((data.products||[]).map(p=>[String(p.id),p]));
    const accountMap=new Map((data.accounts||[]).map(a=>[String(a.id),a]));
    const items=[];
    (data.products||[]).forEach(p=>items.push({section:"products",type:"Product",title:p.name||"Product",subtitle:`${money(p.price)} · Stock ${Number(p.stock??0)}`,value:p.name||String(p.id),keywords:[p.id,p.name,p.slug,p.category,p.collection,p.description].join(" ")}));
    (data.orders||[]).forEach(o=>items.push({section:"orders",type:"Order",title:`#${o.order_number||String(o.id).slice(0,8)}`,subtitle:`${o.full_name||"Customer"} · ${o.email||""} · ${money(o.total)}`,value:o.order_number||o.email||o.full_name,keywords:[o.id,o.order_number,o.full_name,o.email,o.phone,o.city,o.status].join(" ")}));
    (data.profiles||[]).forEach(p=>{const a=accountMap.get(String(p.id))||{};items.push({section:"customers",type:"Customer",title:p.full_name||a.email||"Customer",subtitle:[a.email,p.phone||a.auth_phone].filter(Boolean).join(" · ")||"Registered customer",value:a.email||p.full_name||String(p.id),keywords:[p.id,p.full_name,a.email,p.phone,a.auth_phone].join(" ")});});
    (data.returns||[]).forEach(r=>items.push({section:"returns",type:"Return / Refund",title:`${String(r.request_type||"Return").replace(/^./,c=>c.toUpperCase())} · #${r.order_number||"—"}`,subtitle:`${r.customer_name||"Customer"} · ${r.reason||""}`,value:r.order_number||r.customer_email||r.customer_name,keywords:[r.id,r.order_number,r.customer_name,r.customer_email,r.request_type,r.reason,r.status,r.tracking_number].join(" ")}));
    (data.messages||[]).forEach(m=>items.push({section:"messages",type:"Message",title:m.subject||m.name||"Customer message",subtitle:[m.name,m.email,m.phone].filter(Boolean).join(" · "),value:m.email||m.name||m.subject,keywords:[m.id,m.name,m.subject,m.email,m.phone,m.message].join(" ")}));
    (data.reviews||[]).forEach(r=>{const p=productMap.get(String(r.product_id));items.push({section:"reviews",type:"Review",title:p?.name||"Product review",subtitle:`${Number(r.rating||0)}/5 · ${String(r.review_text||"").slice(0,80)}`,value:p?.name||String(r.product_id),keywords:[r.id,r.user_id,r.product_id,p?.name,r.rating,r.review_text].join(" ")});});
    (data.discounts||[]).forEach(d=>items.push({section:"discounts",type:"Coupon",title:d.code||"Coupon",subtitle:`${d.discount_type==="percent"?`${Number(d.discount_value||0)}%`:money(d.discount_value)} · ${d.active===false?"Paused":"Active"}`,value:d.code,keywords:[d.id,d.code,d.discount_type,d.discount_value,d.min_order].join(" ")}));
    (data.subscribers||[]).forEach(s=>items.push({section:"subscribers",type:"Subscriber",title:s.email||"Subscriber",subtitle:"Newsletter subscriber",value:s.email,keywords:[s.id,s.email].join(" ")}));
    searchCache={at:Date.now(),items};return items;
  }
  function openSearch(initial=""){
    const overlay=$("admin-global-search-overlay"),dialogInput=$("admin-global-search-dialog-input"),topInput=$("admin-global-search-input");if(!overlay)return;
    overlay.classList.add("open");overlay.setAttribute("aria-hidden","false");document.body.classList.add("admin-search-open");
    const value=initial||topInput?.value||"";if(dialogInput){dialogInput.value=value;setTimeout(()=>{dialogInput.focus();dialogInput.select();},20);}if(value.length>=2)runGlobalSearch(value);else renderSearchResults([],"idle");
  }
  function closeSearch(){const overlay=$("admin-global-search-overlay");if(!overlay)return;overlay.classList.remove("open");overlay.setAttribute("aria-hidden","true");document.body.classList.remove("admin-search-open");}
  async function runGlobalSearch(query){
    const q=String(query||"").trim().toLowerCase();if(q.length<2){renderSearchResults([],"idle");return;}
    const box=$("admin-global-search-results");if(box)box.innerHTML='<div class="admin-search-loading"><span></span><strong>Searching your store…</strong></div>';
    const index=await buildSearchIndex();
    const words=q.split(/\s+/).filter(Boolean);const scored=index.map(item=>{const hay=`${item.title} ${item.subtitle} ${item.keywords}`.toLowerCase();if(!words.every(w=>hay.includes(w)))return null;let score=0;if(String(item.title).toLowerCase().startsWith(q))score+=8;if(String(item.title).toLowerCase().includes(q))score+=5;if(String(item.value||"").toLowerCase()===q)score+=12;if(String(item.keywords||"").toLowerCase().includes(q))score+=2;return{...item,score};}).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,40);
    renderSearchResults(scored,"results");
  }
  function renderSearchResults(items,mode="results"){
    const box=$("admin-global-search-results");if(!box)return;
    if(mode==="idle"){box.innerHTML='<div class="admin-search-empty"><strong>Start typing to search</strong><span>Products, orders, customers, returns, messages, reviews, coupons and subscribers.</span></div>';return;}
    if(!items.length){box.innerHTML='<div class="admin-search-empty"><strong>No matching records</strong><span>Try an order number, customer email, product name or coupon code.</span></div>';return;}
    const groups=new Map();items.forEach(i=>{if(!groups.has(i.section))groups.set(i.section,[]);groups.get(i.section).push(i);});
    box.innerHTML=[...groups.entries()].map(([section,rows])=>`<section class="admin-search-group"><div class="admin-search-group-head"><strong>${esc(section.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()))}</strong><span>${rows.length}</span></div>${rows.map(r=>`<button type="button" class="admin-search-result" data-global-section="${esc(r.section)}" data-global-value="${esc(r.value||r.title)}"><span class="admin-search-result-icon">${esc(r.type.slice(0,1))}</span><span><strong>${esc(r.title)}</strong><small>${esc(r.subtitle||r.type)}</small></span><em>${esc(r.type)}</em><i>→</i></button>`).join("")}</section>`).join("");
  }
  function jumpToResult(section,value){
    closeSearch();$("admin-global-search-input").value="";window.LZAdminDashboard?.showSection(section);
    const inputMap={orders:"orders-search",customers:"customers-search",returns:"returns-search",approvals:"approvals-search",activity:"activity-search",abandoned:"abandoned-search"};
    const id=inputMap[section];if(id){setTimeout(()=>{const input=$(id);if(input){input.value=value||"";input.dispatchEvent(new Event("input",{bubbles:true}));input.focus();}},180);}
  }

  // ------------------------------------------------------------
  // System health
  // ------------------------------------------------------------
  const timeout=(promise,ms=8000)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error("Timed out")),ms))]);
  async function dbCheck(label,promise){const started=performance.now();try{const r=await timeout(promise);if(r?.error)throw r.error;return{label,status:"ok",detail:"Connected",ms:Math.round(performance.now()-started)};}catch(error){return{label,status:"error",detail:error?.message||"Unavailable",ms:Math.round(performance.now()-started)};}}
  async function fetchCheck(label,url,validate){const started=performance.now();try{const res=await timeout(fetch(url,{cache:"no-store",credentials:"same-origin"}));if(!res.ok)throw new Error(`HTTP ${res.status}`);const body=await res.text();if(validate&&!validate(body,res))throw new Error("Response did not look correct");return{label,status:"ok",detail:`HTTP ${res.status}`,ms:Math.round(performance.now()-started)};}catch(error){return{label,status:"error",detail:error?.message||"Unavailable",ms:Math.round(performance.now()-started)};}}
  async function runHealthChecks(){
    if(healthRunning||!allowed("health"))return;healthRunning=true;const btn=$("refresh-health-btn");if(btn){btn.disabled=true;btn.textContent="Checking…";}
    const cards=[...document.querySelectorAll("#admin-health-grid .admin-health-card")];cards.forEach(c=>{const s=c.querySelector(".admin-health-status");s.className="admin-health-status checking";s.textContent="Checking";});
    let authResult;const authStart=performance.now();try{const r=await timeout(supabaseClient.auth.getUser());if(r?.error)throw r.error;if(!r?.data?.user)throw new Error("Admin session not found");authResult={label:"Supabase & authentication",status:"ok",detail:"Admin session active",ms:Math.round(performance.now()-authStart)};}catch(e){authResult={label:"Supabase & authentication",status:"error",detail:e?.message||"Unavailable",ms:Math.round(performance.now()-authStart)};}
    const checks=await Promise.all([
      Promise.resolve(authResult),
      dbCheck("Product catalog",supabaseClient.from("products").select("id",{count:"exact",head:true})),
      dbCheck("Orders data",supabaseClient.from("orders").select("id",{count:"exact",head:true})),
      dbCheck("Website CMS",supabaseClient.from("site_settings").select("key").eq("key","main").limit(1)),
      fetchCheck("Storefront assets","/images/logo-mark.jpg",(_,res)=>String(res.headers.get("content-type")||"").startsWith("image/")),
      fetchCheck("Sitemap","/sitemap.xml",body=>/<(?:urlset|sitemapindex)\b/i.test(body)),
      fetchCheck("Robots.txt","/robots.txt",body=>/user-agent|sitemap/i.test(body)),
      fetchCheck("Checkout page","/checkout.html",body=>/<title[\s>]/i.test(body)&&/checkout/i.test(body)),
      fetchCheck("Order support","/track-order.html",body=>/<title[\s>]/i.test(body)&&/track|order/i.test(body))
    ]);
    renderHealth(checks);healthRunning=false;if(btn){btn.disabled=false;btn.textContent="Run health check";}
  }
  function renderHealth(checks){
    const cards=[...document.querySelectorAll("#admin-health-grid .admin-health-card")],errors=checks.filter(c=>c.status==="error").length;
    checks.forEach((check,i)=>{const card=cards[i];if(!card)return;const status=card.querySelector(".admin-health-status"),small=card.querySelector("small");status.className=`admin-health-status ${check.status}`;status.textContent=check.status==="ok"?"Healthy":"Action needed";if(small)small.textContent=`${check.detail} · ${check.ms} ms`;card.classList.toggle("has-error",check.status==="error");});
    const title=$("admin-health-title"),summary=$("admin-health-summary"),orb=$("admin-health-orb"),checked=$("admin-health-checked"),nav=$("nav-health-status");
    if(errors===0){title.textContent="Everything looks healthy";summary.textContent="All core read-only checks passed from this admin session.";orb.className="admin-health-orb ok";orb.innerHTML="<span>✓</span>";if(nav){nav.textContent="✓";nav.className="health-nav-ok";}}
    else{title.textContent=`${errors} check${errors===1?"":"s"} need attention`;summary.textContent="Open the affected card details below. A failed browser check can also be caused by a temporary network or deployment issue.";orb.className="admin-health-orb error";orb.innerHTML=`<span>${errors}</span>`;if(nav){nav.textContent="!";nav.className="health-nav-error";}}
    checked.textContent=`Last checked ${new Date().toLocaleTimeString("en-PK",{hour:"numeric",minute:"2-digit"})}`;
  }

  function bind(){
    $("refresh-abandoned-btn")?.addEventListener("click",loadAbandonedCarts);$("abandoned-search")?.addEventListener("input",renderAbandonedCarts);$("abandoned-age-filter")?.addEventListener("change",renderAbandonedCarts);$("abandoned-sort")?.addEventListener("change",renderAbandonedCarts);
    $("abandoned-tbody")?.addEventListener("click",e=>{const b=e.target.closest("[data-open-abandoned]");if(b)openAbandonedCart(b.dataset.openAbandoned);});
    $("abandoned-cart-modal")?.addEventListener("click",async e=>{if(e.target.closest("[data-close-abandoned-modal]")){closeAbandoned();return;}const copy=e.target.closest("[data-copy-abandoned-email]");if(copy){const ok=await copyText(copy.dataset.copyAbandonedEmail);copy.textContent=ok?"Copied":"Copy failed";setTimeout(()=>copy.textContent="Copy email",1200);}const customer=e.target.closest("[data-view-abandoned-customer]");if(customer){closeAbandoned();window.LZAdminDashboard?.showSection("customers");setTimeout(()=>{const input=$("customers-search");if(input){input.value=customer.dataset.viewAbandonedCustomer;input.dispatchEvent(new Event("input",{bubbles:true}));}},250);}});

    const top=$("admin-global-search-input"),dialog=$("admin-global-search-dialog-input");top?.addEventListener("focus",()=>openSearch(top.value));top?.addEventListener("input",()=>openSearch(top.value));dialog?.addEventListener("input",()=>{if(top)top.value=dialog.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>runGlobalSearch(dialog.value),180);});
    $("admin-global-search-close")?.addEventListener("click",closeSearch);$("admin-global-search-overlay")?.addEventListener("click",e=>{if(e.target===$("admin-global-search-overlay"))closeSearch();});$("admin-global-search-results")?.addEventListener("click",e=>{const b=e.target.closest("[data-global-section]");if(b)jumpToResult(b.dataset.globalSection,b.dataset.globalValue);});
    document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();openSearch();}if(e.key==="Escape"){if($("admin-global-search-overlay")?.classList.contains("open"))closeSearch();else if($("abandoned-cart-modal")?.classList.contains("open"))closeAbandoned();}});

    $("refresh-health-btn")?.addEventListener("click",runHealthChecks);$("health-open-storefront")?.addEventListener("click",()=>window.open("/","_blank","noopener"));
    document.addEventListener("click",e=>{const nav=e.target.closest("[data-section-target],[data-go-section]");const section=nav?.dataset.sectionTarget||nav?.dataset.goSection;if(section==="abandoned")setTimeout(loadAbandonedCarts,0);if(section==="health")setTimeout(runHealthChecks,0);});
  }
  function current(){return(location.hash||"#dashboard").slice(1);}
  function init(){bind();if(current()==="abandoned")loadAbandonedCarts();if(current()==="health")runHealthChecks();}
  window.addEventListener("lz:admin-ready",init,{once:true});if(window.LZ_ADMIN_USER)document.addEventListener("DOMContentLoaded",init,{once:true});
  window.LZAdminGrowth={loadAbandonedCarts,runHealthChecks,openSearch,buildSearchIndex};
})();
