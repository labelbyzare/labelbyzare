/* LABEL BY ZARE — standalone refund / exchange progress tracker */
(function(){
  "use strict";
  const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const money=v=>`PKR ${Number(v||0).toLocaleString("en-PK",{maximumFractionDigits:0})}`;
  const labels={requested:"Claim received",reviewing:"Under review",approved:"Approved",awaiting_return:"Awaiting return parcel",received:"Return received",refunded:"Refund completed",exchanged:"Exchange completed",rejected:"Not approved",closed:"Closed"};
  const notes={
    requested:"We received your request. Our team will review the reason and order details.",
    reviewing:"Your request is being reviewed by our after-sales team.",
    approved:"Your request has been approved. Follow the return instructions provided by our team before sending the parcel.",
    awaiting_return:"We are waiting for the return parcel. Keep your courier receipt or tracking number until the case is completed.",
    received:"Your returned item has been received and is being checked before the final refund or exchange is completed.",
    refunded:"Your refund has been marked as completed.",
    exchanged:"Your exchange has been marked as completed.",
    rejected:"The request was not approved. Contact Support if you need clarification.",
    closed:"This after-sales case has been closed."
  };
  const baseStages=["requested","reviewing","approved","awaiting_return","received"];
  function fmtDate(value){if(!value)return "—";try{return new Date(value).toLocaleDateString("en-PK",{day:"numeric",month:"short",year:"numeric"});}catch(_){return "—";}}
  function payerText(c){
    if(c?.shipping_payer==="customer") return Number(c.return_shipping_fee||0)>0?`Customer pays ${money(c.return_shipping_fee)} return delivery`:`Customer pays return delivery`;
    if(c?.shipping_payer==="label_by_zare") return "Return delivery handled by Label by Zare";
    return "Return delivery arrangement pending review";
  }
  function timeline(c){
    const status=String(c?.status||"requested").toLowerCase();
    const finalStatus=c?.request_type==="exchange"?"exchanged":"refunded";
    const stages=[...baseStages,finalStatus];
    const special=status==="rejected"||status==="closed";
    const currentIndex=stages.indexOf(status);
    return `<div class="return-progress-timeline" aria-label="Return progress">${stages.map((stage,i)=>{
      const done=!special && currentIndex>=0 && i<currentIndex;
      const current=!special && stage===status;
      const state=done?"is-done":current?"is-current":"";
      return `<div class="return-progress-step ${state}"><span class="return-progress-dot">${done?"✓":String(i+1).padStart(2,"0")}</span><div><strong>${esc(labels[stage]||stage)}</strong><small>${current?"Current stage":done?"Completed":"Pending"}</small></div></div>`;
    }).join("")}${special?`<div class="return-progress-step is-terminal"><span class="return-progress-dot">!</span><div><strong>${esc(labels[status]||status)}</strong><small>Current status</small></div></div>`:""}</div>`;
  }
  function render(c,orderNumber){
    const status=String(c.status||"requested").toLowerCase();
    const type=String(c.request_type||"return").toLowerCase();
    return `<div class="return-progress-panel">
      <div class="return-progress-head">
        <div><div class="eyebrow">${esc(type==="exchange"?"Exchange request":"Refund request")}</div><h3>${esc(labels[status]||status)}</h3><p>${esc(notes[status]||"Your request is being processed.")}</p></div>
        <span class="return-progress-order">${esc(orderNumber)}</span>
      </div>
      ${timeline(c)}
      <div class="return-progress-details">
        <div><small>Request</small><strong>${esc(type==="exchange"?"Exchange":"Refund")}</strong></div>
        <div><small>Reason</small><strong>${esc(c.reason||"—")}</strong></div>
        <div><small>Opened</small><strong>${esc(fmtDate(c.created_at))}</strong></div>
        <div><small>Last updated</small><strong>${esc(fmtDate(c.updated_at))}</strong></div>
      </div>
      <div class="return-progress-shipping"><span>Return delivery</span><strong>${esc(payerText(c))}</strong></div>
      ${c.tracking_number?`<div class="return-progress-extra"><span>Return tracking / reference</span><strong>${esc(c.tracking_number)}</strong></div>`:""}
      ${Number(c.refund_amount||0)>0?`<div class="return-progress-extra"><span>Refund amount</span><strong>${money(c.refund_amount)}${c.refund_method?` · ${esc(c.refund_method)}`:""}</strong></div>`:""}
      <p class="return-progress-help">Need help with this request? Visit <a href="/support" class="link-underline">Support</a> or contact Label by Zare with your order number.</p>
    </div>`;
  }
  function init(){
    const form=document.getElementById("return-progress-form");
    if(!form)return;
    const orderInput=document.getElementById("rp-order-number"),emailInput=document.getElementById("rp-email"),btn=document.getElementById("return-progress-submit"),msg=document.getElementById("return-progress-message"),result=document.getElementById("return-progress-result");
    try{const last=JSON.parse(localStorage.getItem("lz_last_order")||"null");if(last?.orderNum&&!orderInput.value)orderInput.value=last.orderNum;}catch(_){}
    form.addEventListener("submit",async e=>{
      e.preventDefault();
      const orderNumber=orderInput.value.trim(),email=emailInput.value.trim();
      result.hidden=true;result.innerHTML="";msg.textContent="";msg.className="return-progress-message";
      if(!orderNumber||!email){msg.textContent="Enter your order number and checkout email.";msg.classList.add("error");return;}
      btn.disabled=true;const original=btn.textContent;btn.textContent="Checking…";
      try{
        const {data,error}=await supabaseClient.rpc("get_customer_return_claim",{p_order_number:orderNumber,p_email:email});
        if(error)throw error;
        const claim=Array.isArray(data)?data[0]||null:data||null;
        if(!claim){msg.innerHTML=`No refund or exchange request was found for those details. <a href="#refund-exchange" class="link-underline">Start a claim</a> if your delivered order is eligible.`;msg.classList.add("error");return;}
        result.innerHTML=render(claim,orderNumber);result.hidden=false;
        if(window.gsap)gsap.fromTo(result,{opacity:0,y:12},{opacity:1,y:0,duration:.45,ease:"power2.out"});
        result.scrollIntoView({behavior:"smooth",block:"nearest"});
      }catch(err){console.error(err);msg.textContent="We couldn't check the return progress right now. Please try again in a moment.";msg.classList.add("error");}
      finally{btn.disabled=false;btn.textContent=original;}
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
