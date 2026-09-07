// Behavioral checks using isolated DOM/storage/service doubles. No browser,
// real customers, network requests, orders or messages are used by this suite.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../js/catalog-core');
const Policy = require('../js/store-policy');

function element(doc){
  const classes = new Set();
  return {
    style:{}, attributes:{}, handlers:{}, selectors:{}, children:[], value:'', textContent:'', innerHTML:'', disabled:false, isConnected:true,
    classList:{ add(...v){v.forEach(x=>classes.add(x));}, remove(...v){v.forEach(x=>classes.delete(x));}, contains(x){return classes.has(x);}, toggle(x,on){if(on===undefined)on=!classes.has(x);if(on)classes.add(x);else classes.delete(x);} },
    addEventListener(type, fn){(this.handlers[type] ||= []).push(fn);},
    setAttribute(k,v){this.attributes[k]=String(v);}, getAttribute(k){return this.attributes[k] ?? null;},
    querySelector(s){return this.selectors[s] || null;}, querySelectorAll(){return this.children;},
    focus(){doc.activeElement=this;}, contains(el){return el===this || this.children.includes(el);},
    getClientRects(){return [1];}, closest(){return null;},
    checkValidity(){return true;}, reportValidity(){}, reset(){},
    appendChild(el){this.children.push(el);}, replaceChildren(...els){this.children=els;this.innerHTML='';}
  };
}
function environment(){
  const ids = {}, selectors = {}, doc = {handlers:{}};
  doc.body = element(doc);
  doc.getElementById = id => ids[id] ||= element(doc);
  doc.querySelector = s => selectors[s] || null;
  doc.querySelectorAll = () => [];
  doc.addEventListener = (type,fn) => (doc.handlers[type] ||= []).push(fn);
  doc.createElement = () => element(doc);
  const stored = new Map(), timers = new Map(), events = {};
  const ctx = vm.createContext({
    document:doc, URL, AbortController, FormData, Event, LZCatalog:C, LZPolicy:Policy,
    formatPKR:C.money, console:{warn(){},error(){},log(){}},
    localStorage:{getItem:k=>stored.get(k) ?? null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},
    setTimeout(fn){const id=timers.size+1;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},
    addEventListener(type,fn){(events[type] ||= []).push(fn);},
    dispatchEvent(e){(events[e.type] || []).forEach(fn=>fn(e));},scrollTo(){},
    fetch(){throw new Error('Unexpected network request in test');}
  });
  ctx.window=ctx;
  function run(file, expose=''){vm.runInContext(fs.readFileSync(require.resolve('../js/'+file),'utf8')+'\n'+expose,ctx);}
  return {ctx,doc,ids,selectors,stored,timers,events,run};
}
function event(key,shiftKey=false){return {key,shiftKey,prevented:false,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};}
const flush = () => new Promise(resolve=>setImmediate(resolve));
function cartEnvironment(){
  const env=environment();
  env.ctx.getProductById=()=>({name:'Emerald Abaya',price:3860});
  env.run('cart.js','globalThis.cart=LZ;');
  return env;
}

test('Malformed saved carts and wishlists cannot break navigation totals',()=>{
  const e=cartEnvironment();
  for(const value of ['{}','null','"string"','not-json']){
    e.stored.set('lz_cart',value);e.stored.set('lz_wishlist',value);
    assert.equal(e.ctx.cart.cartCount(),0);assert.equal(e.ctx.cart.getWishlist().length,0);
  }
  e.stored.set('lz_cart',JSON.stringify([null,{}, {id:'aby-002',size:'M',color:'Green',qty:-1},{id:'aby-002',size:'M',color:'Green',qty:2}]));
  assert.equal(e.ctx.cart.cartCount(),2);assert.equal(e.ctx.cart.cartTotal(),7720);
  e.stored.set('lz_wishlist',JSON.stringify([null,{},'aby-002','aby-002']));
  assert.deepEqual(Array.from(e.ctx.cart.getWishlist()),['aby-002']);
});

test('Cart Escape, Tab containment, inert state and opener focus work together',()=>{
  const e=cartEnvironment(), drawer=element(e.doc), close=element(e.doc), checkout=element(e.doc), opener=element(e.doc), backdrop=element(e.doc);
  drawer.children=[close,checkout];drawer.selectors['.js-close-drawer']=close;
  Object.assign(e.selectors,{'.cart-drawer':drawer,'.cart-drawer-backdrop':backdrop,'.js-close-drawer':close});
  e.doc.activeElement=opener;
  e.ctx.cart.renderDrawer=()=>{};e.ctx.cart.refreshBadges=()=>{};
  e.doc.handlers.DOMContentLoaded.forEach(fn=>fn());
  e.ctx.cart.openDrawer();e.selectors['.cart-drawer.open']=drawer;
  assert.equal(drawer.inert,false);assert.equal(drawer.attributes['aria-hidden'],'false');
  assert.equal(e.doc.activeElement,close);assert.equal(e.doc.body.style.overflow,'hidden');
  checkout.focus();const forward=event('Tab');e.doc.handlers.keydown[0](forward);
  assert.equal(e.doc.activeElement,close);assert.equal(forward.prevented,true);
  const backward=event('Tab',true);e.doc.handlers.keydown[0](backward);assert.equal(e.doc.activeElement,checkout);
  const escape=event('Escape');e.doc.handlers.keydown[0](escape);
  assert.equal(drawer.classList.contains('open'),false);assert.equal(drawer.inert,true);
  assert.equal(e.doc.activeElement,opener);assert.equal(e.doc.body.style.overflow,'');
});

test('Product names, variant text and image attributes are escaped in the cart',()=>{
  const e=cartEnvironment(), body=element(e.doc);
  e.selectors['.drawer-body']=body;
  const attack='<img src=x onerror="alert(1)">';
  e.ctx.getProductById=()=>({name:attack,price:100,img:'https://example.com/a" onerror="alert(1)'});
  e.stored.set('lz_cart',JSON.stringify([{id:'test',size:attack,color:attack,qty:1}]));
  e.ctx.cart.renderDrawer();
  assert.ok(body.innerHTML.includes(C.escape(attack)));
  assert.ok(!body.innerHTML.includes(attack));
  assert.ok(!body.innerHTML.includes('src="https://example.com/a" onerror='));
});

function checkoutEnvironment(){
  const e=environment(), form=e.doc.getElementById('checkout-form'), button=element(e.doc);
  button.textContent='Place Order';form.selectors['button[type="submit"]']=button;
  e.ids['confirmation-view']=element(e.doc);e.ids['confirmation-view'].style.display='none';
  for(const id of ['fullName','email','phone','country','city','area','postal','address']) e.doc.getElementById(id).value='Test '+id;
  let cart=[{id:'aby-002',size:'M',color:'Green',qty:1}];
  e.ctx.getProductById=()=>({id:'aby-002',name:'Emerald Abaya',price:3860,sizes:['M'],colors:[{name:'Green'}]});
  e.ctx.isInStock=()=>true;e.ctx.loadProducts=async()=>{};
  e.ctx.LZ={CART_KEY:'lz_cart',getCart:()=>structuredClone(cart),saveCart:v=>{cart=v;},showToast:()=>{}};
  e.orders=[];e.ctx.supabaseClient={from(table){assert.equal(table,'orders');return {insert:async data=>{e.orders.push(data);return {error:null};}};}};
  e.ctx.fetch=async()=>({ok:true});
  e.run('checkout.js');e.ctx.initCheckout(form);
  return Object.assign(e,{form,button,setCart:v=>{cart=v;},getCart:()=>cart,submit:()=>form.handlers.submit[0](event())});
}
test('Checkout confirms a saved order while an optional email is stalled',async()=>{
  const e=checkoutEnvironment();
  e.ctx.fetch=(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('timeout'))));
  const pending=e.submit();await flush();
  assert.equal(e.orders.length,1);assert.equal(e.ids['confirmation-view'].style.display,'flex');
  assert.equal(e.ids['conf-total'].textContent,'PKR 4,210');assert.equal(e.getCart().length,0);
  assert.equal(e.doc.activeElement,e.ids['confirmation-view']);
  for(const fn of e.timers.values()) fn();await pending;
  assert.equal(e.timers.size,0);
});
test('Checkout uses the current bag snapshot for both quantities and totals',async()=>{
  const e=checkoutEnvironment();
  e.setCart([{id:'aby-002',size:'M',color:'Green',qty:3}]);
  await e.submit();
  assert.equal(e.orders[0].items[0].qty,3);assert.equal(e.orders[0].subtotal,11580);assert.equal(e.orders[0].total,11930);
});
test('A failed order save restores the button and preserves the bag',async()=>{
  const e=checkoutEnvironment();
  e.ctx.supabaseClient={from:()=>({insert:async()=>{throw new Error('offline');}})};
  await e.submit();
  assert.equal(e.button.disabled,false);assert.equal(e.button.textContent,'Place Order');
  assert.equal(e.getCart().length,1);assert.equal(e.ids['confirmation-view'].style.display,'none');
});
test('Invalid variants, empty bags and price changes cannot submit an order',async()=>{
  for(const kind of ['variant','empty','price']){
    const e=checkoutEnvironment();
    if(kind==='empty')e.setCart([]);
    if(kind==='variant')e.setCart([{id:'aby-002',size:'INVALID',color:'Green',qty:1}]);
    if(kind==='price')e.ctx.loadProducts=async()=>{e.ctx.getProductById=()=>({price:4000,sizes:['M'],colors:[{name:'Green'}]});};
    await e.submit();assert.equal(e.orders.length,0);assert.equal(e.button.disabled,false);
  }
});
test('Repeated submit events while an order is saving create one database request',async()=>{
  const e=checkoutEnvironment();let resolveSave;
  e.ctx.supabaseClient={from:()=>({insert:data=>{e.orders.push(data);return new Promise(resolve=>resolveSave=resolve);}})};
  const first=e.submit();await flush();await e.submit();
  assert.equal(e.orders.length,1);resolveSave({error:null});await first;
});
test('Contact confirmation appears before email; failed saves can be retried',async()=>{
  for(const fail of [false,true]){
    const e=environment();const form=e.doc.getElementById('contact-form'),btn=e.doc.getElementById('contact-submit-btn');
    btn.textContent='Send';e.doc.getElementById('contact-success').style.display='none';
    e.ctx.supabaseClient={from:()=>({insert:async()=>{if(fail)throw new Error('offline');return {error:null};}})};
    e.ctx.fetch=(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('timeout'))));
    e.run('contact.js');e.doc.handlers.DOMContentLoaded[0]();
    const pending=form.handlers.submit[0](event());await flush();
    if(fail){assert.equal(btn.disabled,false);assert.equal(e.ids['contact-success'].style.display,'none');}
    else {assert.equal(e.ids['contact-success'].style.display,'block');for(const fn of e.timers.values())fn();}
    await pending;
  }
});
test('Saved-data clearing stops on database errors and never claims success',async()=>{
  const e=environment(),calls=[];
  e.run('customer-auth.js','globalThis.auth=CustomerAuth;');
  e.ctx.auth.getUser=async()=>({id:'test-user'});
  e.ctx.auth.logout=async()=>{throw new Error('Must not log out on a failed clear');};
  e.ctx.supabaseClient={from(table){calls.push(table);return {delete:()=>({eq:async()=>({error:table==='wishlist_items'?{message:'denied'}:null})})};}};
  e.stored.set('lz_cart','keep');
  const result=await e.ctx.auth.deleteMyData();
  assert.equal(result.error.message,'denied');assert.deepEqual(calls,['cart_items','wishlist_items']);assert.equal(e.stored.get('lz_cart'),'keep');
});
test('Account addresses and order items render text, and unknown tabs fall back safely',async()=>{
  const e=environment(),attack='<img src=x onerror="alert(1)">';
  const link=element(e.doc);e.selectors['.tab-link[data-tab="profile"]']=link;
  e.ctx.location={hash:'',href:''};
  e.ctx.CustomerAuth={listAddresses:async()=>[{id:attack,label:attack,full_name:attack,address:attack,area:attack,city:attack,country:attack,phone:attack}],listOrders:async()=>[{order_number:attack,status:attack,items:[{name:attack,qty:1}],created_at:'2026-09-07',total:100}]};
  e.run('account.js');
  e.ctx.switchTab('"]invalid');assert.equal(e.ids['panel-profile'].style.display,'block');
  await e.ctx.renderAddressesTab();await e.ctx.renderOrdersTab();
  for(const id of ['addresses-list','orders-list']){
    assert.ok(e.ids[id].innerHTML.includes(C.escape(attack)));assert.ok(!e.ids[id].innerHTML.includes(attack));
  }
  const avatar=element(e.doc);e.ctx.setAvatar(avatar,'javascript:alert(1)',attack);
  assert.equal(avatar.children[0].src,'');assert.equal(avatar.innerHTML,'');
});
