(function(){
  "use strict";

  const sectionTitles={
    dashboard:"Dashboard",products:"Products",orders:"Orders",customers:"Customers",reviews:"Reviews",
    messages:"Messages",subscribers:"Subscribers",discounts:"Discounts",popup:"Message Popup",settings:"Website Settings",admins:"Admin Users"
  };
  let dashboardLoaded=false,dashboardOrders=[],customersCache=[],discountsCache=[],faqsCache=[],guidesCache=[],adminUsersCache=[],initialized=false;
  let revenueRange={preset:"30d",start:null,end:null};

  const esc=value=>String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const money=value=>`Rs. ${Number(value||0).toLocaleString("en-PK",{maximumFractionDigits:0})}`;
  const dateText=value=>value?new Date(value).toLocaleDateString("en-PK",{day:"2-digit",month:"short",year:"numeric"}):"—";
  const dateTimeText=value=>value?new Date(value).toLocaleString("en-PK",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—";
  const statusLabel=value=>({new:"New",confirmed:"Confirmed",processing:"Processing",shipped:"Shipped",delivered:"Delivered",completed:"Completed",cancelled:"Cancelled",returned:"Returned"}[value]||value||"New");
  const statusTone=value=>({new:"#6578a8",confirmed:"#8a6c3f",processing:"#b4852a",shipped:"#35725d",delivered:"#235744",completed:"#24231f",cancelled:"#a6473d",returned:"#8a5b5b"}[value]||"#777");
  const byId=id=>document.getElementById(id);
  const valueOf=id=>byId(id)?.value?.trim?.()||"";
  const setValue=(id,value)=>{const el=byId(id);if(el)el.value=value??"";};
  async function safeQuery(promise){try{const result=await promise;return result.error?{data:null,error:result.error}:result;}catch(error){return{data:null,error};}}

  const revenueRangeLabels={"7d":"Last 7 days","30d":"Last 30 days","3m":"Last 3 months","6m":"Last 6 months","1y":"Last year",custom:"Custom range"};
  const startOfLocalDay=value=>{const d=new Date(value);d.setHours(0,0,0,0);return d;};
  const endOfLocalDay=value=>{const d=new Date(value);d.setHours(23,59,59,999);return d;};
  const localDateKey=value=>{const d=new Date(value),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`;};
  const inputDate=value=>localDateKey(value);
  function parseInputDate(value,end=false){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||""))return null;const [y,m,d]=value.split("-").map(Number),date=new Date(y,m-1,d);if(date.getFullYear()!==y||date.getMonth()!==m-1||date.getDate()!==d)return null;return end?endOfLocalDay(date):startOfLocalDay(date);}
  function getRevenueWindow(){
    const now=new Date(),end=endOfLocalDay(now);let start;
    if(revenueRange.preset==="custom"&&revenueRange.start&&revenueRange.end)return{start:startOfLocalDay(revenueRange.start),end:endOfLocalDay(revenueRange.end),label:revenueRangeLabels.custom};
    if(revenueRange.preset==="7d"){start=startOfLocalDay(now);start.setDate(start.getDate()-6);}
    else if(revenueRange.preset==="3m"){start=startOfLocalDay(now);start.setMonth(start.getMonth()-3);}
    else if(revenueRange.preset==="6m"){start=startOfLocalDay(now);start.setMonth(start.getMonth()-6);}
    else if(revenueRange.preset==="1y"){start=startOfLocalDay(now);start.setFullYear(start.getFullYear()-1);}
    else{start=startOfLocalDay(now);start.setDate(start.getDate()-29);}
    return{start,end,label:revenueRangeLabels[revenueRange.preset]||revenueRangeLabels["30d"]};
  }
  function formatRevenueDates(start,end){
    const sameYear=start.getFullYear()===end.getFullYear(),left=start.toLocaleDateString("en-PK",{day:"2-digit",month:"short",...(sameYear?{}:{year:"numeric"})}),right=end.toLocaleDateString("en-PK",{day:"2-digit",month:"short",year:"numeric"});return `${left} – ${right}`;
  }
  function syncRevenueRangeUI(){
    document.querySelectorAll("[data-revenue-range]").forEach(btn=>btn.classList.toggle("active",btn.dataset.revenueRange===revenueRange.preset));
    const custom=byId("revenue-custom-range");if(custom&&revenueRange.preset!=="custom")custom.hidden=true;
  }
  function openCustomRevenueRange(){
    const panel=byId("revenue-custom-range"),from=byId("revenue-date-from"),to=byId("revenue-date-to"),today=inputDate(new Date()),windowRange=getRevenueWindow();if(!panel||!from||!to)return;
    from.max=today;to.max=today;if(!from.value)from.value=inputDate(windowRange.start);if(!to.value)to.value=inputDate(windowRange.end);panel.hidden=!panel.hidden;byId("revenue-range-error").textContent="";if(!panel.hidden)from.focus();
  }
  function applyRevenuePreset(preset){
    if(preset==="custom"){openCustomRevenueRange();return;}revenueRange={preset,start:null,end:null};syncRevenueRangeUI();renderRevenueChart(dashboardOrders.filter(o=>!["cancelled","returned"].includes(o.status)));
  }
  function applyCustomRevenueRange(){
    const from=parseInputDate(valueOf("revenue-date-from")),to=parseInputDate(valueOf("revenue-date-to"),true),msg=byId("revenue-range-error");
    if(!from||!to){msg.textContent="Choose both dates.";return;}if(from>to){msg.textContent="The start date must be before the end date.";return;}
    revenueRange={preset:"custom",start:from,end:to};msg.textContent="";syncRevenueRangeUI();byId("revenue-custom-range").hidden=true;renderRevenueChart(dashboardOrders.filter(o=>!["cancelled","returned"].includes(o.status)));
  }
  function revenueSeries(orders,start,end){
    const dayMs=86400000,days=Math.max(1,Math.floor((startOfLocalDay(end)-startOfLocalDay(start))/dayMs)+1),series=[];
    if(days<=45){for(let d=new Date(startOfLocalDay(start));d<=end;d.setDate(d.getDate()+1))series.push({d:new Date(d),key:localDateKey(d),value:0});const map=Object.fromEntries(series.map(x=>[x.key,x]));orders.forEach(o=>{const row=map[localDateKey(o.created_at)];if(row)row.value+=Number(o.total||0);});return series;}
    if(days<=210){const count=Math.ceil(days/7);for(let i=0;i<count;i++){const d=new Date(startOfLocalDay(start));d.setDate(d.getDate()+i*7);series.push({d,value:0});}orders.forEach(o=>{const d=startOfLocalDay(o.created_at),idx=Math.floor((d-startOfLocalDay(start))/dayMs/7);if(series[idx])series[idx].value+=Number(o.total||0);});return series;}
    const monthMap={};let cursor=new Date(start.getFullYear(),start.getMonth(),1),last=new Date(end.getFullYear(),end.getMonth(),1);while(cursor<=last){const key=`${cursor.getFullYear()}-${cursor.getMonth()}`;const row={d:new Date(cursor),key,value:0};series.push(row);monthMap[key]=row;cursor.setMonth(cursor.getMonth()+1);}orders.forEach(o=>{const d=new Date(o.created_at),row=monthMap[`${d.getFullYear()}-${d.getMonth()}`];if(row)row.value+=Number(o.total||0);});return series;
  }

  function showSection(name,pushHash=true){
    if(!sectionTitles[name])name="dashboard";
    if(name!=="admins"&&!window.LZAdminAccess?.canView(name))name="dashboard";
    document.querySelectorAll("[data-admin-section]").forEach(el=>el.classList.toggle("admin-section-visible",el.dataset.adminSection===name));
    document.querySelectorAll("[data-section-target]").forEach(btn=>btn.classList.toggle("active",btn.dataset.sectionTarget===name));
    if(byId("admin-page-title"))byId("admin-page-title").textContent=sectionTitles[name];
    if(pushHash&&history.replaceState)history.replaceState(null,"",`#${name}`);
    byId("admin-sidebar")?.classList.remove("open");
    byId("admin-mobile-menu")?.setAttribute("aria-expanded","false");
    if(name==="dashboard")loadDashboard();
    if(name==="customers")loadCustomers();
    if(name==="discounts")loadDiscounts();
    if(name==="popup")loadPopupSettings();
    if(name==="settings")loadSettings();
    if(name==="admins")loadAdminUsers();
  }

  function bindNavigation(){
    document.querySelectorAll("[data-section-target]").forEach(btn=>btn.addEventListener("click",()=>showSection(btn.dataset.sectionTarget)));
    document.querySelectorAll("[data-go-section]").forEach(btn=>btn.addEventListener("click",()=>showSection(btn.dataset.goSection)));
    byId("admin-mobile-menu")?.addEventListener("click",()=>{const sidebar=byId("admin-sidebar"),open=!sidebar.classList.contains("open");sidebar.classList.toggle("open",open);byId("admin-mobile-menu").setAttribute("aria-expanded",String(open));});
    showSection(sectionTitles[(location.hash||"#dashboard").slice(1)]?(location.hash||"#dashboard").slice(1):"dashboard",false);
  }

  async function loadDashboard(force=false){
    if(dashboardLoaded&&!force)return;
    if(byId("dash-revenue"))byId("dash-revenue").textContent="Loading…";
    const [ordersRes,productsRes,profilesRes,messagesRes,subsRes,reviewsRes]=await Promise.all([
      safeQuery(supabaseClient.from("orders").select("id,order_number,full_name,email,total,status,created_at,items").order("created_at",{ascending:false})),
      safeQuery(supabaseClient.from("products").select("id,name,in_stock")),
      safeQuery(supabaseClient.from("profiles").select("id,full_name")),
      safeQuery(supabaseClient.from("messages").select("id,status")),
      safeQuery(supabaseClient.from("newsletter_subscribers").select("id")),
      safeQuery(supabaseClient.from("product_reviews").select("id"))
    ]);
    const orders=ordersRes.data||[],products=productsRes.data||[],profiles=profilesRes.data||[],messages=messagesRes.data||[];
    dashboardOrders=orders;
    const validOrders=orders.filter(o=>!["cancelled","returned"].includes(o.status));
    const revenue=validOrders.reduce((sum,o)=>sum+Number(o.total||0),0),today=new Date();
    const isToday=v=>{const d=new Date(v);return d.getFullYear()===today.getFullYear()&&d.getMonth()===today.getMonth()&&d.getDate()===today.getDate();};
    const guestEmails=new Set(orders.map(o=>(o.email||"").trim().toLowerCase()).filter(Boolean));
    byId("dash-revenue").textContent=money(revenue);byId("dash-orders-today").textContent=orders.filter(o=>isToday(o.created_at)).length;
    byId("dash-orders-note").textContent=`${orders.length} total orders`;byId("dash-customers").textContent=Math.max(profiles.length,guestEmails.size);
    byId("dash-out-stock").textContent=products.filter(p=>p.in_stock===false).length;byId("dash-products-note").textContent=`${products.length} products in catalog`;
    const unread=messages.filter(m=>m.status!=="read").length,msgBadge=byId("nav-messages-count");if(msgBadge){msgBadge.textContent=unread||"";msgBadge.style.display=unread?"inline-block":"none";}
    const active=orders.filter(o=>!["delivered","completed","cancelled","returned"].includes(o.status)).length,orderBadge=byId("nav-orders-count");if(orderBadge){orderBadge.textContent=active||"";orderBadge.style.display=active?"inline-block":"none";}
    const reviewCount=(reviewsRes.data||[]).length,reviewBadge=byId("nav-reviews-count");if(reviewBadge){reviewBadge.textContent=reviewCount||"";reviewBadge.style.display=reviewCount?"inline-block":"none";}
    renderRevenueChart(validOrders);renderBestSellers(validOrders);renderRecentOrders(orders.slice(0,6));dashboardLoaded=true;
  }

  function renderRecentOrders(orders){const tbody=byId("dash-recent-orders");if(!tbody)return;tbody.innerHTML=orders.length?orders.map(o=>`<tr><td><strong>${esc(o.order_number)}</strong></td><td>${esc(o.full_name)}</td><td>${money(o.total)}</td><td><span class="badge" style="background:${statusTone(o.status)};color:#fff">${esc(statusLabel(o.status))}</span></td><td>${dateText(o.created_at)}</td></tr>`).join(""):'<tr><td colspan="5" class="admin-muted">No orders yet.</td></tr>';}
  function renderBestSellers(orders){const map=new Map();orders.forEach(o=>(Array.isArray(o.items)?o.items:[]).forEach(item=>{const key=item.name||"Product",row=map.get(key)||{qty:0,revenue:0};row.qty+=Number(item.qty||0);row.revenue+=Number(item.price||0)*Number(item.qty||0);map.set(key,row);}));const rows=[...map.entries()].sort((a,b)=>b[1].qty-a[1].qty).slice(0,5),el=byId("dash-best-sellers");if(!el)return;el.innerHTML=rows.length?rows.map(([name,row],i)=>`<div class="admin-ranked-item"><span class="rank">${i+1}</span><div><b>${esc(name)}</b><small>${row.qty} sold</small></div><strong>${money(row.revenue)}</strong></div>`).join(""):'<p class="admin-muted">Best sellers will appear after your first orders.</p>';}
  function renderRevenueChart(orders){
    const canvas=byId("revenue-chart"),empty=byId("revenue-chart-empty");if(!canvas)return;const {start,end,label}=getRevenueWindow(),periodOrders=orders.filter(o=>{const d=new Date(o.created_at);return d>=start&&d<=end;}),points=revenueSeries(periodOrders,start,end),total=periodOrders.reduce((s,o)=>s+Number(o.total||0),0);
    byId("dash-30d-revenue").textContent=money(total);byId("dash-revenue-period").textContent=label;byId("dash-revenue-dates").textContent=formatRevenueDates(start,end);canvas.setAttribute("aria-label",`${label} revenue: ${money(total)}`);syncRevenueRangeUI();
    empty.style.display=total>0?"none":"grid";canvas.style.opacity=total>0?"1":".18";
    const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);const w=rect.width,h=rect.height;ctx.clearRect(0,0,w,h);
    const pad={l:8,r:8,t:14,b:24},plotW=Math.max(1,w-pad.l-pad.r),plotH=Math.max(1,h-pad.t-pad.b),max=Math.max(...points.map(x=>x.value),1);ctx.strokeStyle="#ebe4da";ctx.lineWidth=1;for(let i=0;i<4;i++){const y=pad.t+(plotH*i/3);ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();}
    const denom=Math.max(1,points.length-1),pts=points.map((x,i)=>({x:points.length===1?pad.l+plotW/2:pad.l+(plotW*i/denom),y:pad.t+plotH-(x.value/max)*plotH}));ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle="#9a7745";ctx.lineWidth=2;ctx.lineJoin="round";ctx.lineCap="round";ctx.stroke();
    if(pts.length){const grad=ctx.createLinearGradient(0,pad.t,0,h-pad.b);grad.addColorStop(0,"rgba(154,119,69,.22)");grad.addColorStop(1,"rgba(154,119,69,0)");ctx.lineTo(pts[pts.length-1].x,h-pad.b);ctx.lineTo(pts[0].x,h-pad.b);ctx.closePath();ctx.fillStyle=grad;ctx.fill();}
    if(points.length<=31&&total>0){ctx.fillStyle="#9a7745";pts.forEach((p,i)=>{if(points[i].value<=0)return;ctx.beginPath();ctx.arc(p.x,p.y,2.5,0,Math.PI*2);ctx.fill();});}
    ctx.fillStyle="#8c8478";ctx.font="10px sans-serif";const firstLabel=start.toLocaleDateString("en-PK",{day:"numeric",month:"short"}),lastLabel=end.toLocaleDateString("en-PK",{day:"numeric",month:"short",...(start.getFullYear()===end.getFullYear()?{}:{year:"2-digit"})});ctx.fillText(firstLabel,pad.l,h-5);ctx.fillText(lastLabel,w-pad.r-ctx.measureText(lastLabel).width,h-5);
  }

  async function loadCustomers(force=false){
    if(customersCache.length&&!force){renderCustomers(customersCache);return;}
    const tbody=byId("customers-tbody");if(tbody)tbody.innerHTML='<tr><td colspan="9">Loading full customer records…</td></tr>';
    const [profilesRes,addressesRes,ordersRes,cartRes,wishRes,reviewsRes,productsRes,accountsRes]=await Promise.all([
      safeQuery(supabaseClient.from("profiles").select("*")),safeQuery(supabaseClient.from("addresses").select("*")),safeQuery(supabaseClient.from("orders").select("*").order("created_at",{ascending:false})),
      safeQuery(supabaseClient.from("cart_items").select("*")),safeQuery(supabaseClient.from("wishlist_items").select("*")),safeQuery(supabaseClient.from("product_reviews").select("*")),safeQuery(supabaseClient.from("products").select("id,name,price")),
      safeQuery(supabaseClient.rpc("admin_customer_accounts"))
    ]);
    if(profilesRes.error&&addressesRes.error&&ordersRes.error){if(tbody)tbody.innerHTML='<tr><td colspan="9">Customer data could not be read. Run the latest admin SQL setup and check RLS policies.</td></tr>';return;}
    const profiles=profilesRes.data||[],addresses=addressesRes.data||[],orders=ordersRes.data||[],cart=cartRes.data||[],wish=wishRes.data||[],reviews=reviewsRes.data||[],products=productsRes.data||[],accounts=accountsRes.data||[];
    const productMap=Object.fromEntries(products.map(p=>[p.id,p])),map=new Map();
    const freshRow=(key,userId=null)=>({key,user_id:userId,name:"Customer",email:"",phone:"",city:"",address:"",avatar_url:"",created_at:null,last_sign_in_at:null,orders:0,spent:0,last:null,addresses:[],orderRows:[],cartRows:[],wishRows:[],reviewRows:[]});
    accounts.forEach(a=>{const row=freshRow(`u:${a.id}`,a.id);row.email=a.email||"";row.phone=a.auth_phone||"";row.created_at=a.created_at;row.last_sign_in_at=a.last_sign_in_at;map.set(row.key,row);});
    profiles.forEach(p=>{const key=`u:${p.id}`,row=map.get(key)||freshRow(key,p.id);row.name=p.full_name||row.name;row.avatar_url=p.avatar_url||"";row.created_at=row.created_at||p.created_at||null;row.profile=p;map.set(key,row);});
    addresses.forEach(a=>{const key=`u:${a.user_id}`,row=map.get(key)||freshRow(key,a.user_id);row.addresses.push(a);if(a.is_default||!row.address){row.name=a.full_name||row.name;row.phone=a.phone||row.phone;row.city=a.city||row.city;row.address=[a.address,a.area,a.city,a.postal_code].filter(Boolean).join(", ");}map.set(key,row);});
    orders.forEach(o=>{const key=o.user_id?`u:${o.user_id}`:`e:${String(o.email||o.phone||o.order_number).toLowerCase()}`,row=map.get(key)||freshRow(key,o.user_id||null);if(!o.user_id){row.name=o.full_name||"Guest customer";row.email=o.email||"";row.phone=o.phone||"";}row.name=(row.name==="Customer"?o.full_name:row.name)||"Customer";row.email=row.email||o.email||"";row.phone=row.phone||o.phone||"";row.city=row.city||o.city||"";row.address=row.address||[o.address,o.area,o.city].filter(Boolean).join(", ");row.orders++;row.orderRows.push(o);if(!["cancelled","returned"].includes(o.status))row.spent+=Number(o.total||0);if(!row.last||new Date(o.created_at)>new Date(row.last))row.last=o.created_at;map.set(key,row);});
    cart.forEach(c=>{const key=`u:${c.user_id}`,row=map.get(key)||freshRow(key,c.user_id);row.cartRows.push({...c,product:productMap[c.product_id]||null});map.set(key,row);});
    wish.forEach(w=>{const key=`u:${w.user_id}`,row=map.get(key)||freshRow(key,w.user_id);row.wishRows.push({...w,product:productMap[w.product_id]||null});map.set(key,row);});
    reviews.forEach(r=>{const key=`u:${r.user_id}`,row=map.get(key)||freshRow(key,r.user_id);row.reviewRows.push({...r,product:productMap[r.product_id]||null});map.set(key,row);});
    customersCache=[...map.values()].sort((a,b)=>new Date(b.last||b.last_sign_in_at||b.created_at||0)-new Date(a.last||a.last_sign_in_at||a.created_at||0));renderCustomers(customersCache);
  }

  function renderCustomers(rows){
    const q=(valueOf("customers-search")||"").toLowerCase(),filtered=q?rows.filter(r=>[r.name,r.email,r.phone,r.city,r.address,r.user_id].some(v=>String(v||"").toLowerCase().includes(q))):rows,tbody=byId("customers-tbody"),empty=byId("customers-empty-msg");if(!tbody)return;
    tbody.innerHTML=filtered.length?filtered.map(r=>`<tr><td><div class="customer-name">${esc(r.name||"Customer")}</div><div class="customer-meta">${r.user_id?"Account customer":"Guest checkout"}</div></td><td class="admin-customer-email">${esc(r.email||"—")}<br><span class="customer-meta">${esc(r.phone||"")}</span></td><td class="customer-address">${esc(r.address||r.city||"—")}</td><td>${r.orders}</td><td>${r.cartRows.reduce((s,x)=>s+Number(x.qty||0),0)}</td><td>${r.wishRows.length}</td><td>${money(r.spent)}</td><td>${dateText(r.last)}</td><td><button type="button" class="btn-sm" data-view-customer="${esc(r.key)}">View details</button></td></tr>`).join(""):'<tr><td colspan="9" class="admin-muted">No matching customers.</td></tr>';
    if(empty)empty.hidden=filtered.length>0;
  }

  function openCustomer(key){
    const r=customersCache.find(x=>x.key===key);if(!r)return;const modal=byId("customer-modal"),body=byId("customer-modal-body"),initial=(r.name||r.email||"C").trim().charAt(0).toUpperCase();
    const avatar=r.avatar_url?`<img class="admin-customer-avatar" src="${esc(r.avatar_url)}" alt="">`:`<div class="admin-customer-avatar">${esc(initial)}</div>`;
    const orders=r.orderRows.length?r.orderRows.map(o=>`<div class="admin-mini-row"><div><strong>#${esc(o.order_number)}</strong><div class="muted">${dateText(o.created_at)}</div></div><div>${money(o.total)}</div><div><span class="badge" style="background:${statusTone(o.status)};color:#fff">${esc(statusLabel(o.status))}</span></div><div>${esc(Array.isArray(o.items)?`${o.items.reduce((s,i)=>s+Number(i.qty||0),0)} item(s)`:"—")}</div></div>`).join(""):'<p class="admin-muted">No orders.</p>';
    const cart=r.cartRows.length?r.cartRows.map(c=>`<div class="admin-mini-row"><div><strong>${esc(c.product?.name||c.product_id)}</strong><div class="muted">${esc(c.size||"—")} · ${esc(c.color||"—")}</div></div><div>Qty ${Number(c.qty||0)}</div><div>${c.product?money(Number(c.product.price||0)*Number(c.qty||0)):"—"}</div><div>${dateText(c.updated_at||c.created_at)}</div></div>`).join(""):'<p class="admin-muted">Cart is empty or this guest has no synced cart.</p>';
    const wishlist=r.wishRows.length?`<div class="admin-pill-list">${r.wishRows.map(w=>`<span class="admin-pill">${esc(w.product?.name||w.product_id)}</span>`).join("")}</div>`:'<p class="admin-muted">Wishlist is empty or unavailable for this guest.</p>';
    const addresses=r.addresses.length?`<div class="admin-mini-list">${r.addresses.map(a=>`<div class="admin-address-card"><strong>${esc(a.full_name||r.name)}${a.is_default?' <span class="badge">Default</span>':''}</strong>${esc(a.phone||"")}<br>${esc([a.address,a.area,a.city,a.postal_code].filter(Boolean).join(", "))}</div>`).join("")}</div>`:'<p class="admin-muted">No saved addresses.</p>';
    const reviews=r.reviewRows.length?r.reviewRows.map(v=>`<div class="admin-mini-row"><div><strong>${esc(v.product?.name||"Product")}</strong><div class="muted">${esc(v.review_text||"")}</div></div><div>${"★".repeat(Math.max(0,Math.min(5,Number(v.rating||0))))}</div><div>${dateText(v.created_at)}</div><div>${Array.isArray(v.photos)&&v.photos.length?`${v.photos.length} photo(s)`:"No photos"}</div></div>`).join(""):'<p class="admin-muted">No reviews.</p>';
    body.innerHTML=`<div class="admin-customer-head">${avatar}<div><h2 id="customer-modal-title">${esc(r.name||"Customer")}</h2><p>${esc(r.email||"No email")} · ${r.user_id?"Registered account":"Guest checkout"}</p></div></div>
      <div class="admin-detail-grid"><div class="admin-detail-card"><span>Customer ID</span><strong>${esc(r.user_id||"Guest")}</strong></div><div class="admin-detail-card"><span>Phone</span><strong>${esc(r.phone||"—")}</strong></div><div class="admin-detail-card"><span>Signed up</span><strong>${dateTimeText(r.created_at)}</strong></div><div class="admin-detail-card"><span>Last sign-in</span><strong>${dateTimeText(r.last_sign_in_at)}</strong></div><div class="admin-detail-card"><span>Orders</span><strong>${r.orders}</strong></div><div class="admin-detail-card"><span>Total spent</span><strong>${money(r.spent)}</strong></div><div class="admin-detail-card"><span>Cart items</span><strong>${r.cartRows.reduce((s,x)=>s+Number(x.qty||0),0)}</strong></div><div class="admin-detail-card"><span>Wishlist</span><strong>${r.wishRows.length}</strong></div></div>
      <section class="admin-customer-block"><h3>Saved addresses</h3>${addresses}</section><section class="admin-customer-block"><h3>Current cart</h3><div class="admin-mini-list">${cart}</div></section><section class="admin-customer-block"><h3>Wishlist items</h3>${wishlist}</section><section class="admin-customer-block"><h3>Order history</h3><div class="admin-mini-list">${orders}</div></section><section class="admin-customer-block"><h3>Reviews</h3><div class="admin-mini-list">${reviews}</div></section>`;
    modal.classList.add("open");modal.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";
  }
  function closeCustomer(){const modal=byId("customer-modal");if(!modal)return;modal.classList.remove("open");modal.setAttribute("aria-hidden","true");document.body.style.overflow="";}

  async function loadDiscounts(){const tbody=byId("discounts-tbody");if(!tbody)return;const {data,error}=await safeQuery(supabaseClient.from("discounts").select("*").order("created_at",{ascending:false})),note=byId("discounts-setup-note");if(error){note.hidden=false;tbody.innerHTML='<tr><td colspan="7" class="admin-muted">Coupon storage is not available yet.</td></tr>';return;}note.hidden=true;discountsCache=data||[];renderDiscounts();}
  function renderDiscounts(){const tbody=byId("discounts-tbody");if(!tbody)return;tbody.innerHTML=discountsCache.length?discountsCache.map(d=>`<tr><td><strong>${esc(d.code)}</strong></td><td>${d.discount_type==="percent"?`${Number(d.discount_value)}%`:money(d.discount_value)}</td><td>${Number(d.min_order||0)>0?money(d.min_order):"None"}</td><td>${Number(d.used_count||0)}${d.usage_limit?` / ${d.usage_limit}`:""}</td><td>${d.expires_at?dateText(d.expires_at):"No expiry"}</td><td><span class="badge" style="background:${d.active?"#35725d":"#8f8b84"};color:#fff">${d.active?"Active":"Paused"}</span></td><td class="row-actions"><button type="button" data-edit-discount="${esc(d.id)}">Edit</button><button type="button" class="btn-danger" data-delete-discount="${esc(d.id)}">Delete</button></td></tr>`).join(""):'<tr><td colspan="7" class="admin-muted">No coupons yet. Create your first promotion.</td></tr>';}
  function openDiscountForm(row=null){const form=byId("discount-form");form.hidden=false;setValue("discount-id",row?.id||"");setValue("discount-code",row?.code||"");setValue("discount-type",row?.discount_type||"percent");setValue("discount-value",row?.discount_value??"");setValue("discount-min-order",row?.min_order??0);setValue("discount-usage-limit",row?.usage_limit??"");setValue("discount-expiry",row?.expires_at?new Date(new Date(row.expires_at).getTime()-new Date(row.expires_at).getTimezoneOffset()*60000).toISOString().slice(0,16):"");byId("discount-active").checked=row?.active!==false;byId("discount-form-message").textContent="";byId("discount-code").focus();}
  async function saveDiscount(event){event.preventDefault();if(!window.LZAdminAccess?.requireWrite("discounts","discounts"))return;const id=valueOf("discount-id"),payload={code:valueOf("discount-code").toUpperCase(),discount_type:valueOf("discount-type"),discount_value:Number(valueOf("discount-value")),min_order:Number(valueOf("discount-min-order")||0),usage_limit:valueOf("discount-usage-limit")?Number(valueOf("discount-usage-limit")):null,expires_at:valueOf("discount-expiry")?new Date(valueOf("discount-expiry")).toISOString():null,active:byId("discount-active").checked},msg=byId("discount-form-message");msg.textContent="Saving…";const result=id?await safeQuery(supabaseClient.from("discounts").update(payload).eq("id",id)):await safeQuery(supabaseClient.from("discounts").insert(payload));if(result.error){msg.textContent=result.error.message;msg.style.color="#a6473d";return;}msg.textContent="Saved.";msg.style.color="#35725d";byId("discount-form").hidden=true;loadDiscounts();}
  async function deleteDiscount(id){if(!window.LZAdminAccess?.requireWrite("discounts","discounts"))return;if(!confirm("Delete this coupon permanently?"))return;const r=await safeQuery(supabaseClient.from("discounts").delete().eq("id",id));if(r.error){alert(r.error.message);return;}loadDiscounts();}

  const popupDefaults={
    popup_enabled:false,
    popup_type:"coupon",
    popup_kicker:"A little something for you",
    popup_title:"Enjoy 10% off your first order",
    popup_message:"Use the code below at checkout.",
    popup_coupon_code:"WELCOME10",
    popup_cta_text:"Shop the collection",
    popup_cta_url:"/shop/",
    popup_image_url:"",
    popup_scope:"storefront",
    popup_frequency:"session",
    popup_delay_seconds:2,
    popup_start_at:"",
    popup_end_at:""
  };
  const popupFieldMap={
    popup_type:"popup-type",popup_kicker:"popup-kicker",popup_title:"popup-title",popup_message:"popup-message",
    popup_coupon_code:"popup-coupon-code",popup_cta_text:"popup-cta-text",popup_cta_url:"popup-cta-url",popup_image_url:"popup-image-url",
    popup_scope:"popup-scope",popup_frequency:"popup-frequency",popup_delay_seconds:"popup-delay"
  };
  const toDateInput=value=>{
    if(!value)return"";
    const d=new Date(value);if(Number.isNaN(d.getTime()))return"";
    const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
    return local.toISOString().slice(0,16);
  };
  function popupPayloadFromForm(){
    const payload={};
    Object.entries(popupFieldMap).forEach(([key,id])=>payload[key]=valueOf(id));
    payload.popup_enabled=!!byId("popup-enabled")?.checked;
    payload.popup_coupon_code=String(payload.popup_coupon_code||"").toUpperCase().replace(/\s+/g,"").slice(0,40);
    payload.popup_delay_seconds=Math.max(0,Math.min(30,Number(payload.popup_delay_seconds||0)));
    const start=valueOf("popup-start"),end=valueOf("popup-end");
    payload.popup_start_at=start?new Date(start).toISOString():"";
    payload.popup_end_at=end?new Date(end).toISOString():"";
    return payload;
  }
  function fillPopupSettings(settings){
    const s={...popupDefaults,...(settings||{})};
    Object.entries(popupFieldMap).forEach(([key,id])=>setValue(id,s[key]));
    if(byId("popup-enabled"))byId("popup-enabled").checked=!!s.popup_enabled;
    setValue("popup-start",toDateInput(s.popup_start_at));
    setValue("popup-end",toDateInput(s.popup_end_at));
    renderPopupPreview();
    updatePopupAdminStatus(s);
  }
  function updatePopupAdminStatus(settings){
    const badge=byId("popup-admin-status"),nav=byId("nav-popup-status");if(!badge)return;
    const now=Date.now(),start=settings.popup_start_at?new Date(settings.popup_start_at).getTime():null,end=settings.popup_end_at?new Date(settings.popup_end_at).getTime():null;
    let label="Off",tone="off";
    if(settings.popup_enabled){
      if(start&&Number.isFinite(start)&&now<start){label="Scheduled";tone="scheduled";}
      else if(end&&Number.isFinite(end)&&now>end){label="Ended";tone="ended";}
      else{label="Live";tone="live";}
    }
    badge.textContent=label;badge.dataset.tone=tone;
    if(nav){nav.textContent=label==="Live"?"●":label==="Scheduled"?"◷":"";nav.style.display=nav.textContent?"inline-block":"none";}
  }
  function renderPopupPreview(){
    const type=valueOf("popup-type")||"coupon",preview=byId("admin-popup-preview");if(!preview)return;
    preview.className=`lz-promo-preview lz-promo-preview--${type}`;
    const image=valueOf("popup-image-url"),media=byId("admin-popup-preview-media");
    if(media){media.innerHTML=image?`<img src="${esc(image)}" alt="">`:"<span>Campaign image</span>";media.classList.toggle("has-image",!!image);}
    byId("admin-popup-preview-kicker").textContent=valueOf("popup-kicker")||"Announcement";
    byId("admin-popup-preview-title").textContent=valueOf("popup-title")||"Your message headline";
    byId("admin-popup-preview-message").textContent=valueOf("popup-message")||"Add a short message for your visitors.";
    const code=valueOf("popup-coupon-code"),codeEl=byId("admin-popup-preview-code");if(codeEl){codeEl.hidden=!code;if(code)codeEl.querySelector("b").textContent=code.toUpperCase();}
    const cta=valueOf("popup-cta-text"),ctaEl=byId("admin-popup-preview-cta");if(ctaEl){ctaEl.hidden=!cta;ctaEl.textContent=cta||"Shop now";}
  }
  function applyPopupPreset(name){
    const presets={
      coupon:{type:"coupon",kicker:"Exclusive offer",title:"A little thank-you from us.",message:"Enjoy a special saving on your next Label by Zare order.",code:"WELCOME10",cta:"Shop the collection",url:"/shop/"},
      azadi:{type:"sale",kicker:"Azadi Sale",title:"Celebrate freedom in timeless modesty.",message:"A limited-time edit with special savings, made for the moments you’ll remember.",code:"AZADI15",cta:"Shop the Azadi Sale",url:"/sale/"},
      "new-arrival":{type:"new-arrival",kicker:"New at Label by Zare",title:"The latest edit has arrived.",message:"Discover new silhouettes, considered details and pieces designed for effortless modest dressing.",code:"",cta:"Explore new arrivals",url:"/new-arrivals/"}
    },preset=presets[name];if(!preset)return;
    setValue("popup-type",preset.type);setValue("popup-kicker",preset.kicker);setValue("popup-title",preset.title);setValue("popup-message",preset.message);setValue("popup-coupon-code",preset.code);setValue("popup-cta-text",preset.cta);setValue("popup-cta-url",preset.url);renderPopupPreview();
  }
  async function loadPopupSettings(){
    const msg=byId("popup-form-message");if(msg){msg.textContent="Loading…";msg.style.color="";}
    const {data,error}=await safeQuery(supabaseClient.from("site_settings").select("value").eq("key","main").maybeSingle());
    if(error){fillPopupSettings(popupDefaults);if(msg){msg.textContent="Popup settings need the website CMS setup. Run supabase/admin-dashboard-setup.sql once.";msg.style.color="#a6473d";}return;}
    const settings={...popupDefaults,...(data?.value||{})};fillPopupSettings(settings);if(msg)msg.textContent="";
  }
  async function savePopupSettings(event){event?.preventDefault?.();if(!window.LZAdminAccess?.requireWrite("popup","message popup"))return;
    const msg=byId("popup-form-message"),payload=popupPayloadFromForm();
    if(!payload.popup_title.trim()&&payload.popup_enabled){msg.textContent="Add a headline before enabling the popup.";msg.style.color="#a6473d";return;}
    if(payload.popup_start_at&&payload.popup_end_at&&new Date(payload.popup_end_at)<=new Date(payload.popup_start_at)){msg.textContent="End date must be after the start date.";msg.style.color="#a6473d";return;}
    if(msg){msg.textContent="Publishing…";msg.style.color="";}
    const current=await safeQuery(supabaseClient.from("site_settings").select("value").eq("key","main").maybeSingle());
    if(current.error){msg.textContent=current.error.message;msg.style.color="#a6473d";return;}
    const value={...(current.data?.value||{}),...payload};
    const {error}=await safeQuery(supabaseClient.from("site_settings").upsert({key:"main",value,updated_at:new Date().toISOString()}));
    if(error){msg.textContent=error.message;msg.style.color="#a6473d";return;}
    fillPopupSettings(value);msg.textContent=payload.popup_enabled?"Published. The popup will follow your schedule and display rules.":"Saved. The popup is currently disabled.";msg.style.color="#35725d";
  }
  async function uploadPopupImage(file){if(!window.LZAdminAccess?.requireWrite("popup","popup images"))return;
    if(!file)return;const msg=byId("popup-form-message");msg.textContent="Uploading campaign image…";msg.style.color="";
    const ext=(file.name.split(".").pop()||"jpg").toLowerCase(),path=`site/popup-${Date.now()}.${ext}`;
    const {error}=await supabaseClient.storage.from("product-images").upload(path,file,{upsert:false});
    if(error){msg.textContent=error.message;msg.style.color="#a6473d";return;}
    const {data}=supabaseClient.storage.from("product-images").getPublicUrl(path);setValue("popup-image-url",data.publicUrl);renderPopupPreview();msg.textContent="Image uploaded. Click Save & publish popup.";msg.style.color="#35725d";
  }

  const settingDefaults={
    hero_eyebrow:"The Label by Zare Edit",hero_line1:"MODEST WEAR,",hero_line2:"Label by Zare.",hero_tagline:"Thoughtfully designed abayas and shawls for everyday moments and the occasions you’ll remember.",hero_primary_text:"Shop the collection",hero_secondary_text:"Discover the edit",hero_image_url:"",
    house_label:"01 — The House",house_heading:"Created with a purpose, Rooted in modesty.",house_text1:"Label by Zare began with a simple belief: modesty and elegance can beautifully coexist. What started as a passion for creating graceful, modest pieces grew into a dream of building something of our own — a space where women can find abayas that feel beautiful, comfortable and true to their values.",house_text2:"Every piece at Label by Zare is chosen and created with intention. From the fabric and silhouette to the smallest details, we believe that modest clothing doesn't have to mean compromising on style.",house_text3:"Our journey is still growing, one piece and one customer at a time. And we're grateful to every woman who chooses to be a part of it.",house_signoff:"Thank you for being here. 🤍\n— Label by Zare",house_cta:"Our Story",house_image_url:"",
    occasion_eyebrow:"Occasion Wear",occasion_heading:"Evenings deserve quiet drama.",occasion_text:"Draped silhouettes, hand-finished trims, and fabrics that catch the light without shouting.",occasion_cta:"Shop Emerald Green",occasion_url:"/product/emerald-green-abaya/aby-002",occasion_image_url:"",
    value1_title:"Thoughtful Fabrics",value1_text:"Chosen for their feel, flow and elegance.",value2_title:"Timeless Designs",value2_text:"Created to complement modesty without compromising on style.",value3_title:"Carefully Finished",value3_text:"Every order is prepared with attention and care before making its way to you.",newsletter_eyebrow:"Join Us",newsletter_heading:"Be first to know.",newsletter_text:"New collections, private previews, and quiet updates from the atelier.",
    about_eyebrow:"Our Story",about_title:"The House of Zare",about_hero_image_url:"",about_ch1_title:"Created with a purpose, rooted in modesty.",about_ch1_text1:"Label by Zare began with a simple belief: modesty and elegance can beautifully coexist. What started as a passion for creating graceful, modest pieces grew into a dream of building something of our own — a space where women can find abayas that feel beautiful, comfortable and true to their values.",about_ch1_text2:"Every piece at Label by Zare is chosen and created with intention. From the fabric and silhouette to the smallest details, we believe that modest clothing doesn’t have to mean compromising on style.\n\nOur journey is still growing, one piece and one customer at a time. And we’re grateful to every woman who chooses to be a part of it.\n\nThank you for being here. 🤍\n— Label by Zare",about_story_image_url:"",about_ch2_title:"How we build a piece",about_ch2_text1:"Every silhouette goes through several rounds of fitting on real bodies, not just a stand form. We check how a piece moves when you sit, reach, and walk — not just how it hangs still.",about_ch2_text2:"Construction details — hidden closures, reinforced seams, a tailored shoulder — are chosen for how they hold up over months of wear, not just how they look on day one.",about_craft_image_url:"",about_values_eyebrow:"What We Stand For",about_values_heading:"Modesty in every detail.",about_cta_heading:"Come find the piece that's yours.",about_cta_text:"Shop the Collection",
    standard_fee:350,express_fee:900,free_shipping_above:15000,standard_days:"3–5 business days nationwide",express_days:"1–2 business days in major cities",processing_days:"1–2 business days",return_policy:"Unworn pieces with tags attached may be returned within 7 days of delivery for a full refund or exchange.",return_process:"To start a return or exchange, message us on WhatsApp with your order number.",size_intro:"All measurements are in inches. If you're between sizes, we recommend sizing up for a more relaxed, comfortable drape.",support_eyebrow:"We're Here to Help",support_title:"Support",support_hero_image_url:"",support_help_heading:"We're just a message away.",support_help_text:"Reach out on WhatsApp or Instagram and we'll get back to you shortly.",
    whatsapp_number:"923288691979",instagram_url:"https://www.instagram.com/thelabelbyzare/",footer_text:"Considered abayas and shawls for the modern woman — cut with intention, worn with quiet confidence."
  };
  const settingFields={
    hero_eyebrow:"setting-hero-eyebrow",hero_line1:"setting-hero-line1",hero_line2:"setting-hero-line2",hero_tagline:"setting-hero-tagline",hero_primary_text:"setting-hero-primary-text",hero_secondary_text:"setting-hero-secondary-text",hero_image_url:"setting-hero-image",
    house_label:"setting-house-label",house_heading:"setting-house-heading",house_text1:"setting-house-text1",house_text2:"setting-house-text2",house_text3:"setting-house-text3",house_signoff:"setting-house-signoff",house_cta:"setting-house-cta",house_image_url:"setting-house-image",
    occasion_eyebrow:"setting-occasion-eyebrow",occasion_heading:"setting-occasion-heading",occasion_text:"setting-occasion-text",occasion_cta:"setting-occasion-cta",occasion_url:"setting-occasion-url",occasion_image_url:"setting-occasion-image",
    value1_title:"setting-value1-title",value1_text:"setting-value1-text",value2_title:"setting-value2-title",value2_text:"setting-value2-text",value3_title:"setting-value3-title",value3_text:"setting-value3-text",newsletter_eyebrow:"setting-newsletter-eyebrow",newsletter_heading:"setting-newsletter-heading",newsletter_text:"setting-newsletter-text",
    about_eyebrow:"setting-about-eyebrow",about_title:"setting-about-title",about_hero_image_url:"setting-about-hero-image",about_ch1_title:"setting-about-ch1-title",about_ch1_text1:"setting-about-ch1-text1",about_ch1_text2:"setting-about-ch1-text2",about_story_image_url:"setting-about-story-image",about_ch2_title:"setting-about-ch2-title",about_ch2_text1:"setting-about-ch2-text1",about_ch2_text2:"setting-about-ch2-text2",about_craft_image_url:"setting-about-craft-image",about_values_eyebrow:"setting-about-values-eyebrow",about_values_heading:"setting-about-values-heading",about_cta_heading:"setting-about-cta-heading",about_cta_text:"setting-about-cta-text",
    standard_fee:"setting-standard-fee",express_fee:"setting-express-fee",free_shipping_above:"setting-free-shipping",standard_days:"setting-standard-days",express_days:"setting-express-days",processing_days:"setting-processing-days",return_policy:"setting-return-policy",return_process:"setting-return-process",size_intro:"setting-size-intro",support_eyebrow:"setting-support-eyebrow",support_title:"setting-support-title",support_hero_image_url:"setting-support-hero-image",support_help_heading:"setting-support-help-heading",support_help_text:"setting-support-help-text",
    whatsapp_number:"setting-whatsapp",instagram_url:"setting-instagram",footer_text:"setting-footer-text"
  };
  function fillSettings(s){Object.entries(settingFields).forEach(([key,id])=>setValue(id,s[key]??settingDefaults[key]??""));}
  async function loadSettings(){
    const form=byId("website-settings-form");if(!form)return;const {data,error}=await safeQuery(supabaseClient.from("site_settings").select("value").eq("key","main").maybeSingle()),note=byId("settings-setup-note");if(error){note.hidden=false;fillSettings(settingDefaults);}else{note.hidden=true;fillSettings({...settingDefaults,...(data?.value||{})});}
    await Promise.all([loadFaqs(),loadGuides()]);
  }
  async function saveSettings(event){event.preventDefault();if(!window.LZAdminAccess?.requireWrite("settings","website settings"))return;const msg=byId("settings-form-message"),updates={};Object.entries(settingFields).forEach(([key,id])=>{updates[key]=valueOf(id);});updates.whatsapp_number=updates.whatsapp_number.replace(/\D/g,"");["standard_fee","express_fee","free_shipping_above"].forEach(k=>updates[k]=Number(updates[k]||0));msg.textContent="Saving…";const current=await safeQuery(supabaseClient.from("site_settings").select("value").eq("key","main").maybeSingle());if(current.error){msg.textContent=current.error.message;msg.style.color="#a6473d";return;}const value={...(current.data?.value||{}),...updates};const {error}=await safeQuery(supabaseClient.from("site_settings").upsert({key:"main",value,updated_at:new Date().toISOString()}));if(error){msg.textContent=error.message;msg.style.color="#a6473d";return;}msg.textContent="Saved. Your storefront pages will use the new content on their next load.";msg.style.color="#35725d";}
  async function uploadSettingImage(file,targetId){if(!window.LZAdminAccess?.requireWrite("settings","website images"))return;if(!file||!targetId)return;const msg=byId("settings-form-message");msg.textContent="Uploading image…";const ext=(file.name.split(".").pop()||"jpg").toLowerCase(),safeTarget=targetId.replace(/^setting-/,"").replace(/[^a-z0-9-]/gi,"-"),path=`site/${safeTarget}-${Date.now()}.${ext}`;const {error}=await supabaseClient.storage.from("product-images").upload(path,file,{upsert:false});if(error){msg.textContent=error.message;msg.style.color="#a6473d";return;}const {data}=supabaseClient.storage.from("product-images").getPublicUrl(path);setValue(targetId,data.publicUrl);msg.textContent="Image uploaded. Click Save website content to publish it.";msg.style.color="#35725d";}

  async function loadFaqs(){const tbody=byId("faqs-admin-tbody");if(!tbody)return;const {data,error}=await safeQuery(supabaseClient.from("site_faqs").select("*").order("sort_order",{ascending:true}).order("created_at",{ascending:true}));if(error){tbody.innerHTML='<tr><td colspan="4" class="admin-muted">FAQ manager requires the latest admin SQL setup.</td></tr>';return;}faqsCache=data||[];tbody.innerHTML=faqsCache.length?faqsCache.map(f=>`<tr><td>${Number(f.sort_order||0)}</td><td><strong>${esc(f.question)}</strong></td><td><span class="badge" style="background:${f.active?"#35725d":"#8f8b84"};color:#fff">${f.active?"Published":"Hidden"}</span></td><td class="row-actions"><button type="button" data-edit-faq="${esc(f.id)}">Edit</button><button type="button" class="btn-danger" data-delete-faq="${esc(f.id)}">Delete</button></td></tr>`).join(""):'<tr><td colspan="4" class="admin-muted">No FAQs yet. Add your first question.</td></tr>';}
  function openFaq(row=null){byId("faq-editor").hidden=false;setValue("faq-id",row?.id||"");setValue("faq-question",row?.question||"");setValue("faq-answer",row?.answer||"");setValue("faq-order",row?.sort_order??faqsCache.length);byId("faq-active").checked=row?.active!==false;byId("faq-message").textContent="";byId("faq-question").focus();}
  async function saveFaq(){if(!window.LZAdminAccess?.requireWrite("settings","FAQs"))return;const id=valueOf("faq-id"),msg=byId("faq-message"),payload={question:valueOf("faq-question"),answer:valueOf("faq-answer"),sort_order:Number(valueOf("faq-order")||0),active:byId("faq-active").checked,updated_at:new Date().toISOString()};if(!payload.question||!payload.answer){msg.textContent="Question and answer are required.";return;}msg.textContent="Saving…";const r=id?await safeQuery(supabaseClient.from("site_faqs").update(payload).eq("id",id)):await safeQuery(supabaseClient.from("site_faqs").insert(payload));if(r.error){msg.textContent=r.error.message;msg.style.color="#a6473d";return;}byId("faq-editor").hidden=true;loadFaqs();}
  async function deleteFaq(id){if(!window.LZAdminAccess?.requireWrite("settings","FAQs"))return;if(!confirm("Delete this FAQ?"))return;const r=await safeQuery(supabaseClient.from("site_faqs").delete().eq("id",id));if(r.error)alert(r.error.message);else loadFaqs();}

  async function loadGuides(){const tbody=byId("guides-admin-tbody");if(!tbody)return;const {data,error}=await safeQuery(supabaseClient.from("journal_articles").select("*").order("sort_order",{ascending:true}).order("slug",{ascending:true}));if(error){tbody.innerHTML='<tr><td colspan="5" class="admin-muted">Guide editor requires the latest admin SQL setup.</td></tr>';return;}guidesCache=data||[];tbody.innerHTML=guidesCache.length?guidesCache.map(g=>`<tr><td>${Number(g.sort_order||0)}</td><td><strong>${esc(g.title)}</strong><div class="customer-meta">/journal/${esc(g.slug)}/</div></td><td>${esc(g.collection||"—")}</td><td><span class="badge" style="background:${g.active?"#35725d":"#8f8b84"};color:#fff">${g.active?"Published":"Hidden"}</span></td><td class="row-actions"><button type="button" data-edit-guide="${esc(g.slug)}">Edit</button><button type="button" class="btn-danger" data-delete-guide="${esc(g.slug)}">Delete</button></td></tr>`).join(""):'<tr><td colspan="5" class="admin-muted">No journal guides yet.</td></tr>';}
  function guideSectionRow(section={heading:"",body:""}){const wrap=document.createElement("div");wrap.className="guide-section-row";wrap.innerHTML=`<div class="field"><label>Section heading</label><input type="text" class="guide-section-heading" value="${esc(section.heading||section[0]||"")}"></div><div class="field"><label>Section body (HTML)</label><textarea class="guide-section-body">${esc(section.body||section[1]||"")}</textarea></div><div class="guide-section-actions"><button type="button" class="btn-danger guide-remove-section">Remove section</button></div>`;wrap.querySelector(".guide-remove-section").addEventListener("click",()=>wrap.remove());return wrap;}
  function openGuide(row=null){byId("guide-editor").hidden=false;setValue("guide-original-slug",row?.slug||"");setValue("guide-slug",row?.slug||"");setValue("guide-title",row?.title||"");setValue("guide-collection",row?.collection||"abayas");setValue("guide-summary",row?.summary||"");setValue("guide-order",row?.sort_order??guidesCache.length);byId("guide-active").checked=row?.active!==false;byId("guide-message").textContent="";const editor=byId("guide-sections-editor");editor.innerHTML="";const sections=Array.isArray(row?.sections)?row.sections:[];(sections.length?sections:[{heading:"Introduction",body:"<p>Write your guide section here.</p>"}]).forEach(sec=>editor.appendChild(guideSectionRow(sec)));byId("guide-title").focus();}
  function collectGuideSections(){return [...byId("guide-sections-editor").querySelectorAll(".guide-section-row")].map(row=>({heading:row.querySelector(".guide-section-heading").value.trim(),body:row.querySelector(".guide-section-body").value.trim()})).filter(s=>s.heading&&s.body);}
  async function saveGuide(){if(!window.LZAdminAccess?.requireWrite("settings","journal guides"))return;const original=valueOf("guide-original-slug"),slug=valueOf("guide-slug").toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,""),msg=byId("guide-message"),payload={slug,title:valueOf("guide-title"),collection:valueOf("guide-collection")||"abayas",summary:valueOf("guide-summary"),sections:collectGuideSections(),sort_order:Number(valueOf("guide-order")||0),active:byId("guide-active").checked,updated_at:new Date().toISOString()};if(!payload.slug||!payload.title||!payload.summary||!payload.sections.length){msg.textContent="Slug, title, summary and at least one complete section are required.";return;}msg.textContent="Saving…";let r;if(original&&original!==slug){r=await safeQuery(supabaseClient.from("journal_articles").insert(payload));if(!r.error)await safeQuery(supabaseClient.from("journal_articles").delete().eq("slug",original));}else r=await safeQuery(supabaseClient.from("journal_articles").upsert(payload));if(r.error){msg.textContent=r.error.message;msg.style.color="#a6473d";return;}byId("guide-editor").hidden=true;loadGuides();}
  async function deleteGuide(slug){if(!window.LZAdminAccess?.requireWrite("settings","journal guides"))return;if(!confirm(`Delete /journal/${slug}/?`))return;const r=await safeQuery(supabaseClient.from("journal_articles").delete().eq("slug",slug));if(r.error)alert(r.error.message);else loadGuides();}


  const adminRoleLabels={owner:"Owner",managing_director:"Managing Director",admin:"Admin",viewer:"Viewer"};
  const accessKeys=["products","orders","customers","reviews","messages","subscribers","discounts","popup","settings"];
  function adminPermissionsFromForm(){const permissions={dashboard:true};document.querySelectorAll("[data-staff-permission]").forEach(el=>permissions[el.dataset.staffPermission]=el.checked);return permissions;}
  function applyStaffRolePreset(role,editing=false){
    const apply=byId("staff-can-apply"),manage=byId("staff-can-manage-admins");
    if(role==="owner"){apply.checked=true;apply.disabled=true;manage.checked=true;manage.disabled=true;document.querySelectorAll("[data-staff-permission]").forEach(x=>{x.checked=true;x.disabled=true;});}
    else if(role==="viewer"){apply.checked=false;apply.disabled=true;manage.checked=false;manage.disabled=true;document.querySelectorAll("[data-staff-permission]").forEach(x=>x.disabled=false);}
    else{apply.disabled=false;manage.disabled=false;document.querySelectorAll("[data-staff-permission]").forEach(x=>x.disabled=false);if(!editing&&role==="managing_director"){apply.checked=true;manage.checked=true;document.querySelectorAll("[data-staff-permission]").forEach(x=>x.checked=true);}}
  }
  function renderMyAdminAccount(){const p=window.LZAdminAccess?.profile||{},name=p.full_name||p.email||"Admin",initial=(name.trim()[0]||"A").toUpperCase();if(byId("admin-self-avatar"))byId("admin-self-avatar").textContent=initial;if(byId("admin-self-name"))byId("admin-self-name").textContent=name;if(byId("admin-self-meta"))byId("admin-self-meta").textContent=[p.email,p.phone].filter(Boolean).join(" · ")||"—";if(byId("admin-self-role"))byId("admin-self-role").textContent=window.LZAdminAccess?.roleLabel(p.role)||"Admin";if(byId("admin-self-change"))byId("admin-self-change").textContent=(p.role==="owner"||p.can_apply_changes)?"Changes enabled":"View only";}
  async function loadAdminUsers(){
    renderMyAdminAccount();const setup=byId("admin-users-setup-note"),manageArea=byId("admin-team-management"),addBtn=byId("new-admin-user-btn"),tbody=byId("admin-users-tbody"),canManage=window.LZAdminAccess?.canManageAdmins();
    if(addBtn)addBtn.hidden=!canManage;if(manageArea)manageArea.classList.toggle("is-readonly-team",!canManage);
    if(!canManage){if(tbody)tbody.innerHTML='<tr><td colspan="7" class="admin-muted">Your account does not have permission to manage other admin users.</td></tr>';byId("admin-stat-active").textContent="—";byId("admin-stat-directors").textContent="—";byId("admin-stat-viewers").textContent="—";return;}
    if(tbody)tbody.innerHTML='<tr><td colspan="7">Loading admin users…</td></tr>';
    const r=await safeQuery(supabaseClient.rpc("admin_staff_list"));
    if(r.error){if(setup)setup.hidden=false;if(tbody)tbody.innerHTML='<tr><td colspan="7" class="admin-muted">Run the v20 admin migration to enable team management.</td></tr>';return;}
    if(setup)setup.hidden=true;adminUsersCache=r.data||[];renderAdminUsers();
  }
  function renderAdminUsers(){
    const tbody=byId("admin-users-tbody");if(!tbody)return;const active=adminUsersCache.filter(x=>x.active!==false);byId("admin-stat-active").textContent=active.length;byId("admin-stat-directors").textContent=active.filter(x=>x.role==="managing_director").length;byId("admin-stat-viewers").textContent=active.filter(x=>x.can_apply_changes===false||x.role==="viewer").length;
    if(!adminUsersCache.length){tbody.innerHTML='<tr><td colspan="7" class="admin-muted">No admin users found.</td></tr>';return;}
    tbody.innerHTML=adminUsersCache.map(row=>{const perms=row.permissions&&typeof row.permissions==="object"?row.permissions:{},count=accessKeys.filter(k=>perms[k]!==false).length,ready=row.account_exists,me=(row.email||"").toLowerCase()===(window.LZAdminAccess?.profile.email||"").toLowerCase(),actorOwner=window.LZAdminAccess?.profile.role==="owner",canEdit=actorOwner||row.role!=="owner";return `<tr><td><div class="admin-user-cell"><span>${esc((row.full_name||row.email||"A").trim()[0]?.toUpperCase()||"A")}</span><div><strong>${esc(row.full_name||"Unnamed admin")}</strong><small>${esc(row.email||"")}${row.phone?` · ${esc(row.phone)}`:""}</small></div></div></td><td><span class="admin-role-pill admin-role-${esc(row.role||"admin")}">${esc(adminRoleLabels[row.role]||"Admin")}</span></td><td><strong>${count}/${accessKeys.length}</strong><small class="admin-table-sub">sections</small></td><td>${row.role==="owner"||row.can_apply_changes?'<span class="admin-change-yes">Enabled</span>':'<span class="admin-change-no">View only</span>'}</td><td>${ready?`<span class="admin-account-ready">Ready</span><small class="admin-table-sub">${row.auth_last_sign_in_at?`Last ${esc(dateText(row.auth_last_sign_in_at))}`:"Never signed in"}</small>`:`<button type="button" data-copy-admin-invite="${esc(row.email)}">Copy activation link</button>`}</td><td><span class="admin-status-chip ${row.active===false?"inactive":"active"}">${row.active===false?"Inactive":"Active"}</span></td><td class="admin-row-actions">${canEdit?`<button type="button" data-edit-admin="${esc(row.email)}">Edit</button>`:""}${!ready&&canEdit?`<button type="button" data-refresh-admin-invite="${esc(row.email)}">New link</button>`:""}${!me&&canEdit?`<button type="button" class="btn-danger" data-remove-admin="${esc(row.email)}">Remove</button>`:""}</td></tr>`;}).join("");
  }
  function openAdminUser(row=null){if(!window.LZAdminAccess?.requireManageAdmins())return;const form=byId("admin-user-form"),ownerOption=byId("staff-role")?.querySelector('option[value="owner"]');if(ownerOption)ownerOption.disabled=window.LZAdminAccess?.profile.role!=="owner";form.hidden=false;setValue("staff-original-email",row?.email||"");setValue("staff-full-name",row?.full_name||"");setValue("staff-email",row?.email||"");setValue("staff-phone",row?.phone||"");setValue("staff-role",row?.role||"admin");setValue("staff-notes",row?.notes||"");byId("staff-active").checked=row?.active!==false;byId("staff-can-apply").checked=row?.role==="owner"?true:(row?.can_apply_changes!==false);byId("staff-can-manage-admins").checked=row?.role==="owner"?true:(row?.can_manage_admins===true);const perms=row?.permissions||{};document.querySelectorAll("[data-staff-permission]").forEach(el=>el.checked=perms[el.dataset.staffPermission]!==false);byId("admin-user-form-title").textContent=row?"Edit admin user":"Add admin user";byId("admin-user-form-message").textContent="";applyStaffRolePreset(byId("staff-role").value,!!row);byId("staff-full-name").focus();}
  async function saveAdminUser(event){event.preventDefault();if(!window.LZAdminAccess?.requireManageAdmins())return;const msg=byId("admin-user-form-message"),email=valueOf("staff-email").toLowerCase(),role=valueOf("staff-role"),payload={p_original_email:valueOf("staff-original-email")||null,p_email:email,p_full_name:valueOf("staff-full-name"),p_phone:valueOf("staff-phone"),p_role:role,p_can_apply_changes:byId("staff-can-apply").checked,p_can_manage_admins:byId("staff-can-manage-admins").checked,p_permissions:adminPermissionsFromForm(),p_notes:valueOf("staff-notes"),p_active:byId("staff-active").checked};if(!email||!payload.p_full_name){msg.textContent="Name and email are required.";return;}msg.textContent="Saving…";const r=await safeQuery(supabaseClient.rpc("admin_upsert_staff",payload));if(r.error){msg.textContent=r.error.message;msg.style.color="#a6473d";return;}msg.textContent="Saved.";msg.style.color="#35725d";byId("admin-user-form").hidden=true;await loadAdminUsers();const saved=(r.data||[])[0];if(saved?.invite_token&&!saved?.account_exists)showAdminInvite(saved.email,saved.invite_token,saved.invite_expires_at);}
  function inviteUrl(token){return `${location.origin}/admin-activate.html?token=${encodeURIComponent(token)}`;}
  async function copyText(text){try{await navigator.clipboard.writeText(text);return true;}catch(_){const ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();const ok=document.execCommand("copy");ta.remove();return ok;}}
  async function showAdminInvite(email,token,expires){const url=inviteUrl(token),ok=await copyText(url);alert(`${ok?"Activation link copied to clipboard.":"Activation link:"}\n\n${email}\n${url}${expires?`\n\nExpires: ${dateTimeText(expires)}`:""}\n\nSend this link privately to the new admin.`);}
  async function copyAdminInvite(email){const row=adminUsersCache.find(x=>(x.email||"").toLowerCase()===email.toLowerCase());if(row?.invite_token){showAdminInvite(row.email,row.invite_token,row.invite_expires_at);return;}await refreshAdminInvite(email);}
  async function refreshAdminInvite(email){if(!window.LZAdminAccess?.requireManageAdmins())return;const r=await safeQuery(supabaseClient.rpc("admin_refresh_invite",{p_email:email}));if(r.error){alert(r.error.message);return;}const row=(r.data||[])[0];if(row){await loadAdminUsers();showAdminInvite(row.email,row.invite_token,row.invite_expires_at);}}
  async function removeAdminUser(email){if(!window.LZAdminAccess?.requireManageAdmins())return;if(!confirm(`Remove admin access for ${email}? Their customer account, orders and profile will not be deleted.`))return;const r=await safeQuery(supabaseClient.rpc("admin_remove_staff",{p_email:email}));if(r.error){alert(r.error.message);return;}loadAdminUsers();}

  async function exportSubscribers(){const {data,error}=await safeQuery(supabaseClient.from("newsletter_subscribers").select("email,created_at").order("created_at",{ascending:false}));if(error){alert(error.message);return;}const rows=[["Email","Subscribed"],...(data||[]).map(x=>[x.email,x.created_at])],csv=rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n"),blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`label-by-zare-subscribers-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}
  function filterOrders(){const q=valueOf("orders-search").toLowerCase(),status=valueOf("orders-status-filter")||"all";document.querySelectorAll("#orders-tbody tr").forEach(row=>{const okQ=!q||(row.dataset.orderSearch||row.textContent.toLowerCase()).includes(q),okS=status==="all"||row.dataset.orderStatus===status;row.style.display=okQ&&okS?"":"none";});}

  function bindActions(){
    byId("refresh-dashboard-btn")?.addEventListener("click",()=>{dashboardLoaded=false;loadDashboard(true);});document.querySelectorAll("[data-revenue-range]").forEach(btn=>btn.addEventListener("click",()=>applyRevenuePreset(btn.dataset.revenueRange)));byId("apply-revenue-range")?.addEventListener("click",applyCustomRevenueRange);byId("revenue-date-from")?.addEventListener("change",()=>{byId("revenue-range-error").textContent="";});byId("revenue-date-to")?.addEventListener("change",()=>{byId("revenue-range-error").textContent="";});byId("refresh-customers-btn")?.addEventListener("click",()=>{customersCache=[];loadCustomers(true);});byId("customers-search")?.addEventListener("input",()=>renderCustomers(customersCache));
    byId("customers-tbody")?.addEventListener("click",e=>{const btn=e.target.closest("[data-view-customer]");if(btn)openCustomer(btn.dataset.viewCustomer);});document.querySelectorAll("[data-close-customer-modal]").forEach(el=>el.addEventListener("click",closeCustomer));
    byId("new-discount-btn")?.addEventListener("click",()=>openDiscountForm());byId("discount-cancel-btn")?.addEventListener("click",()=>byId("discount-form").hidden=true);byId("discount-form")?.addEventListener("submit",saveDiscount);byId("discounts-tbody")?.addEventListener("click",e=>{const edit=e.target.closest("[data-edit-discount]"),del=e.target.closest("[data-delete-discount]");if(edit)openDiscountForm(discountsCache.find(x=>String(x.id)===edit.dataset.editDiscount));if(del)deleteDiscount(del.dataset.deleteDiscount);});
    byId("popup-settings-form")?.addEventListener("submit",savePopupSettings);byId("popup-image-file")?.addEventListener("change",e=>uploadPopupImage(e.target.files?.[0]));document.querySelectorAll("#popup-settings-form input,#popup-settings-form textarea,#popup-settings-form select").forEach(el=>el.addEventListener(el.type==="checkbox"?"change":"input",renderPopupPreview));document.querySelectorAll("[data-popup-preset]").forEach(btn=>btn.addEventListener("click",()=>applyPopupPreset(btn.dataset.popupPreset)));byId("popup-preview-btn")?.addEventListener("click",()=>{const settings={...popupDefaults,...popupPayloadFromForm(),popup_enabled:true,popup_start_at:"",popup_end_at:""};if(window.LZPromoPopup?.show)window.LZPromoPopup.show(settings,{preview:true});});
    byId("website-settings-form")?.addEventListener("submit",saveSettings);document.querySelectorAll("[data-setting-upload]").forEach(input=>input.addEventListener("change",e=>uploadSettingImage(e.target.files?.[0],input.dataset.settingUpload)));document.querySelectorAll("[data-settings-panel]").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll("[data-settings-panel]").forEach(x=>x.classList.toggle("active",x===btn));document.querySelectorAll("[data-settings-content]").forEach(x=>x.classList.toggle("active",x.dataset.settingsContent===btn.dataset.settingsPanel));}));
    byId("new-faq-btn")?.addEventListener("click",()=>openFaq());byId("faq-cancel-btn")?.addEventListener("click",()=>byId("faq-editor").hidden=true);byId("faq-save-btn")?.addEventListener("click",saveFaq);byId("faqs-admin-tbody")?.addEventListener("click",e=>{const edit=e.target.closest("[data-edit-faq]"),del=e.target.closest("[data-delete-faq]");if(edit)openFaq(faqsCache.find(x=>String(x.id)===edit.dataset.editFaq));if(del)deleteFaq(del.dataset.deleteFaq);});
    byId("new-guide-btn")?.addEventListener("click",()=>openGuide());byId("guide-cancel-btn")?.addEventListener("click",()=>byId("guide-editor").hidden=true);byId("guide-save-btn")?.addEventListener("click",saveGuide);byId("guide-add-section-btn")?.addEventListener("click",()=>byId("guide-sections-editor").appendChild(guideSectionRow()));byId("guides-admin-tbody")?.addEventListener("click",e=>{const edit=e.target.closest("[data-edit-guide]"),del=e.target.closest("[data-delete-guide]");if(edit)openGuide(guidesCache.find(x=>x.slug===edit.dataset.editGuide));if(del)deleteGuide(del.dataset.deleteGuide);});
    byId("new-admin-user-btn")?.addEventListener("click",()=>openAdminUser());byId("admin-user-cancel-btn")?.addEventListener("click",()=>byId("admin-user-form").hidden=true);byId("admin-user-form")?.addEventListener("submit",saveAdminUser);byId("staff-role")?.addEventListener("change",()=>applyStaffRolePreset(valueOf("staff-role"),false));byId("admin-users-tbody")?.addEventListener("click",e=>{const edit=e.target.closest("[data-edit-admin]"),copy=e.target.closest("[data-copy-admin-invite]"),refresh=e.target.closest("[data-refresh-admin-invite]"),remove=e.target.closest("[data-remove-admin]");if(edit)openAdminUser(adminUsersCache.find(x=>(x.email||"").toLowerCase()===edit.dataset.editAdmin.toLowerCase()));if(copy)copyAdminInvite(copy.dataset.copyAdminInvite);if(refresh)refreshAdminInvite(refresh.dataset.refreshAdminInvite);if(remove)removeAdminUser(remove.dataset.removeAdmin);});
    byId("export-subscribers-btn")?.addEventListener("click",exportSubscribers);byId("orders-search")?.addEventListener("input",filterOrders);byId("orders-status-filter")?.addEventListener("change",filterOrders);const tbody=byId("orders-tbody");if(tbody)new MutationObserver(filterOrders).observe(tbody,{childList:true});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&byId("customer-modal")?.classList.contains("open"))closeCustomer();});let resizeTimer;window.addEventListener("resize",()=>{if(!dashboardLoaded)return;clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>renderRevenueChart(dashboardOrders.filter(o=>!["cancelled","returned"].includes(o.status))),120);},{passive:true});
  }
  function loadCurrentSection(force=false){const section=(location.hash||"#dashboard").slice(1);if(section==="dashboard")loadDashboard(force);else if(section==="customers")loadCustomers(force);else if(section==="discounts")loadDiscounts();else if(section==="popup")loadPopupSettings();else if(section==="settings")loadSettings();else if(section==="admins")loadAdminUsers();}
  function init(){if(initialized)return;initialized=true;bindNavigation();bindActions();const content=byId("content");if(content){const observer=new MutationObserver(()=>{if(getComputedStyle(content).display!=="none"){dashboardLoaded=false;customersCache=[];loadCurrentSection(true);}});observer.observe(content,{attributes:true,attributeFilter:["style"]});}}
  document.addEventListener("lz:admin-access-updated",()=>{renderMyAdminAccount();const section=(location.hash||"#dashboard").slice(1);if(section!=="admins"&&!window.LZAdminAccess?.canView(section))showSection("dashboard");});
  document.addEventListener("DOMContentLoaded",()=>{if(window.LZ_ADMIN_USER)init();});window.addEventListener("lz:admin-ready",()=>{init();dashboardLoaded=false;customersCache=[];requestAnimationFrame(()=>loadCurrentSection(true));});window.LZAdminDashboard={init,showSection,loadDashboard,loadCustomers,loadDiscounts,loadPopupSettings,loadSettings,loadAdminUsers};
})();
