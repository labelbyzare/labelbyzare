const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const C=require('../js/catalog-core');
const Policy=require('../js/store-policy');
const product=C.normalize(require('./fixtures/catalog.json')[0]);
function checkout(){
 const nodes=new Map(),events={},calls=[],toasts=[];
 const element=id=>{if(!nodes.has(id))nodes.set(id,{value:'Local test',checked:true,disabled:false,textContent:'Place order',innerHTML:'',style:{},addEventListener(){},setAttribute(){},focus(){}});return nodes.get(id);};
 let cart=[{id:product.id,size:'L',color:product.colors[0].name,qty:2}],valid=true,current=structuredClone(product);
 const form={querySelector:selector=>element(selector),checkValidity:()=>valid,reportValidity(){},addEventListener:(name,fn)=>{events[name]=fn;}};
 const context={console:{error(){}},document:{addEventListener(){},getElementById:element,querySelectorAll:()=>[]},window:{addEventListener(){},crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000001'},loadProducts:async()=>{},scrollTo(){}},LZ:{getCart:()=>cart,saveCart:value=>{cart=value;},showToast:text=>toasts.push(text)},LZPolicy:Policy.fromSettings({free_shipping_above:9000,standard_fee:350,express_fee:600}),LZCatalog:C,getProductById:id=>id===current.id?current:null,isInStock:C.stocked,formatPKR:C.money,localStorage:{setItem(){}},AbortController,setTimeout,clearTimeout,FormData,fetch:async()=>({ok:true}),supabaseClient:{rpc:async(name,args)=>{calls.push({name,args});return {data:{order_number:'LOCAL-TEST',subtotal:7720,shipping_fee:350,total:8070,items:[{...product,qty:2,size:'L',color:product.colors[0].name}]},error:null};}}};
 vm.createContext(context);new vm.Script(fs.readFileSync('js/checkout.js','utf8')).runInContext(context);context.initCheckout(form);
 return {context,calls,toasts,element,setValid:value=>{valid=value;},setProduct:value=>{current=value;},submit:()=>events.submit({preventDefault(){}})};
}
test('Checkout executes, submits the selected variant and uses the server-confirmed total',async()=>{
 const flow=checkout();assert.match(flow.element('order-summary-list').innerHTML,/L · Dark Green/);assert.match(flow.element('order-summary-totals').innerHTML,/8,070/);
 await flow.submit();assert.equal(flow.calls.length,1);assert.equal(flow.calls[0].name,'place_order');
 assert.deepEqual(JSON.parse(JSON.stringify(flow.calls[0].args.p_items)),[{id:product.id,size:'L',color:'Dark Green',qty:2}]);
 assert.equal(flow.calls[0].args.p_terms_accepted,true);assert.equal(flow.element('conf-total').textContent,'PKR 8,070');
});
test('Checkout stops before order submission when legal validation or availability fails',async()=>{
 const invalid=checkout();invalid.setValid(false);await invalid.submit();assert.equal(invalid.calls.length,0);
 const sold=checkout();sold.setProduct({...product,inStock:false,in_stock:false});await sold.submit();assert.equal(sold.calls.length,0);assert.match(sold.toasts[0],/unavailable/);
});
