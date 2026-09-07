/* LABEL BY ZARE — customer refund / exchange claims from Track Order */
(function(){
  "use strict";
  const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const money=v=>`PKR ${Number(v||0).toLocaleString("en-PK",{maximumFractionDigits:0})}`;
  const statusLabels={requested:"Claim received",reviewing:"Under review",approved:"Approved",awaiting_return:"Awaiting return parcel",received:"Return received",refunded:"Refund completed",exchanged:"Exchange completed",rejected:"Not approved",closed:"Closed"};
  const reasonOptions=["Size / fit issue","Changed my mind","Wrong item received","Damaged / defective","Quality concern","Other"];
  let order=null,email="",area=null,currentClaim=null;

  function normalizedStatus(){const s=String(order?.status||"").toLowerCase();return s==="completed"?"delivered":s;}
  function lineLabel(it){return [it?.name, it?.size?`Size ${it.size}`:"", it?.color||""].filter(Boolean).join(" · ");}
  function shippingRule(type,damaged){
    if(type==="refund" && damaged===false) return "Because this is a refund request and the item is not reported as damaged, the customer is responsible for the return delivery charges.";
    if(damaged===true) return "You reported the item as damaged. Our team will review the claim and confirm the return-delivery arrangement before you send anything back.";
    if(type==="exchange") return "Exchange delivery arrangements will be confirmed by our team after the request is reviewed.";
    return "Return delivery responsibility will be confirmed after review.";
  }
  function claimPayerText(c){
    if(c?.shipping_payer==="customer") return c.return_shipping_fee>0?`Customer return delivery: ${money(c.return_shipping_fee)}`:"Customer pays return delivery";
    if(c?.shipping_payer==="label_by_zare") return "Return delivery handled by Label by Zare";
    return "Return delivery arrangement: pending review";
  }
  async function fetchClaim(){
    try{
      const {data,error}=await supabaseClient.rpc("get_customer_return_claim",{p_order_number:order.order_number,p_email:email});
      if(error) throw error;
      currentClaim=Array.isArray(data)?data[0]||null:data||null;
    }catch(err){console.warn("Return claim status unavailable:",err?.message||err);currentClaim=null;}
  }
  function renderExisting(){
    const c=currentClaim;if(!c)return;
    area.innerHTML=`<section class="return-claim-card" aria-label="Your refund or exchange claim">
      <div class="return-claim-status"><div class="return-claim-status-icon">↶</div><div>
        <div class="return-claim-head"><div><div class="eyebrow">After-sales request</div><h3>${esc(statusLabels[c.status]||c.status||"Claim received")}</h3><p>Your ${esc(c.request_type||"return")} request is connected to order <strong>${esc(order.order_number)}</strong>. You do not need to submit another claim while this one is open.</p></div><span class="return-claim-tag">${esc((c.request_type||"return").toUpperCase())}</span></div>
        <div class="return-claim-meta"><span>Opened ${esc(new Date(c.created_at).toLocaleDateString("en-PK",{day:"numeric",month:"short",year:"numeric"}))}</span><span>${c.customer_reported_damaged?"Reported damaged":"Reported not damaged"}</span>${Number(c.refund_amount||0)>0?`<span>Refund ${money(c.refund_amount)}</span>`:""}</div>
        <div class="return-shipping-rule"><strong>Delivery:</strong> ${esc(claimPayerText(c))}</div>
        ${c.tracking_number?`<p style="margin:.8rem 0 0;font-size:.8rem"><strong>Return tracking:</strong> ${esc(c.tracking_number)}</p>`:""}
      </div></div></section>`;
  }
  function itemInputs(){
    const items=Array.isArray(order?.items)?order.items:[];
    if(!items.length)return '<p style="font-size:.8rem;color:var(--taupe)">This order has no item details available. You can still submit a claim for the order.</p>';
    return items.map((it,i)=>`<label class="return-claim-item"><input type="checkbox" name="claim-item" value="${i}" ${items.length===1?'checked':''}><span><strong>${esc(lineLabel(it)||`Item ${i+1}`)}</strong><small>Qty ${Number(it.qty||1)} · ${money(Number(it.price||0)*Number(it.qty||1))}</small></span></label>`).join("");
  }
  function renderForm(){
    const status=normalizedStatus();
    if(status!=="delivered"){
      area.innerHTML=`<section class="return-claim-card"><div class="return-claim-head"><div><div class="eyebrow">Returns &amp; exchanges</div><h3>Need help after delivery?</h3><p>The claim form becomes available here once your order is marked as delivered. If something urgent is wrong before delivery, contact us through Support.</p></div><span class="return-claim-tag">After delivery</span></div></section>`;
      return;
    }
    area.innerHTML=`<section class="return-claim-card" aria-label="Request a refund or exchange">
      <div class="return-claim-head"><div><div class="eyebrow">Returns &amp; exchanges</div><h3>Request a refund or exchange</h3><p>Tell us what happened and our team will review the request in the admin dashboard. Please do not send the product back until the request is approved.</p></div><span class="return-claim-tag">Order ${esc(order.order_number)}</span></div>
      <form id="customer-return-form">
        <div class="return-claim-options">
          <label class="return-claim-option"><input type="radio" name="claim-type" value="refund" checked><span><strong>Refund</strong><small>Return eligible item(s) and request money back.</small></span></label>
          <label class="return-claim-option"><input type="radio" name="claim-type" value="exchange"><span><strong>Exchange</strong><small>Request a replacement size, colour or eligible item.</small></span></label>
        </div>
        <div class="field"><label>Which item(s) are affected?</label><div class="return-claim-items">${itemInputs()}</div></div>
        <div class="return-claim-grid">
          <div class="field"><label for="claim-reason">Reason</label><select id="claim-reason" required><option value="">Choose a reason</option>${reasonOptions.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join("")}</select></div>
          <div class="field"><label for="claim-damaged">Is the product damaged?</label><select id="claim-damaged" required><option value="no">No — product is not damaged</option><option value="yes">Yes — damaged / defective</option></select></div>
          <div class="field full"><label for="claim-details">Tell us more</label><textarea id="claim-details" rows="4" maxlength="1200" placeholder="Explain the issue, the exchange size/colour you need, or any other helpful details."></textarea></div>
        </div>
        <div class="return-claim-notice" id="claim-delivery-rule"><strong>Return delivery:</strong> ${esc(shippingRule("refund",false))}</div>
        <label class="return-claim-item" style="align-items:center"><input type="checkbox" id="claim-confirm" required><span><strong>I confirm these details are accurate</strong><small>I understand the request must be reviewed before I send the item back.</small></span></label>
        <div class="return-claim-actions"><button type="submit" class="btn btn-solid" id="claim-submit">Submit request</button><span class="return-claim-message" id="claim-message" role="status" aria-live="polite"></span></div>
      </form>
    </section>`;
    const form=document.getElementById("customer-return-form"),rule=document.getElementById("claim-delivery-rule");
    let intent=String(window.LZReturnClaimIntent||"").toLowerCase();
    try{intent=intent||String(sessionStorage.getItem("lz-return-claim-intent")||"").toLowerCase();}catch(_){}
    if(intent==="exchange"||intent==="refund"){const desired=form.querySelector(`[name="claim-type"][value="${intent}"]`);if(desired)desired.checked=true;}
    function refreshRule(){const type=form.querySelector('[name="claim-type"]:checked')?.value||"refund",damaged=document.getElementById("claim-damaged").value==="yes";rule.innerHTML=`<strong>Return delivery:</strong> ${esc(shippingRule(type,damaged))}`;}
    refreshRule();
    form.querySelectorAll('[name="claim-type"]').forEach(el=>el.addEventListener("change",refreshRule));document.getElementById("claim-damaged").addEventListener("change",refreshRule);document.getElementById("claim-reason").addEventListener("change",e=>{if(e.target.value==="Damaged / defective"){document.getElementById("claim-damaged").value="yes";refreshRule();}});
    form.addEventListener("submit",submitClaim);
  }
  async function submitClaim(e){
    e.preventDefault();const form=e.currentTarget,btn=document.getElementById("claim-submit"),msg=document.getElementById("claim-message");
    const type=form.querySelector('[name="claim-type"]:checked')?.value||"refund",reason=document.getElementById("claim-reason").value,damaged=document.getElementById("claim-damaged").value==="yes",details=document.getElementById("claim-details").value.trim();
    const selectedIndexes=[...form.querySelectorAll('[name="claim-item"]:checked')].map(el=>Number(el.value)).filter(Number.isInteger);
    if(Array.isArray(order.items)&&order.items.length&&!selectedIndexes.length){msg.textContent="Please select at least one item.";msg.className="return-claim-message error";return;}
    if(!reason){msg.textContent="Please choose a reason.";msg.className="return-claim-message error";return;}
    if(!document.getElementById("claim-confirm").checked){msg.textContent="Please confirm the claim details.";msg.className="return-claim-message error";return;}
    btn.disabled=true;btn.textContent="Submitting…";msg.textContent="";msg.className="return-claim-message";
    try{
      const {data,error}=await supabaseClient.rpc("submit_customer_return_claim",{p_order_number:order.order_number,p_email:email,p_request_type:type,p_reason:reason,p_is_damaged:damaged,p_details:details,p_item_indexes:selectedIndexes});
      if(error)throw error;
      currentClaim=Array.isArray(data)?data[0]||null:data||null;
      msg.textContent="Request submitted.";msg.className="return-claim-message success";
      await fetchClaim();renderExisting();area.scrollIntoView({behavior:"smooth",block:"center"});
    }catch(err){const raw=String(err?.message||"");msg.textContent=/already has an open claim/i.test(raw)?"There is already an open claim for this order.":/after delivery/i.test(raw)?"Claims can be submitted after the order is delivered.":"We couldn't submit the request. Please try again or contact Support.";msg.className="return-claim-message error";}
    finally{btn.disabled=false;btn.textContent="Submit request";}
  }
  async function mount(o,e){order=o;email=String(e||"").trim().toLowerCase();area=document.getElementById("return-claim-area");if(!area||!order?.order_number||!email)return;area.innerHTML='<section class="return-claim-card"><p style="margin:0;color:var(--taupe);font-size:.85rem">Checking after-sales requests…</p></section>';await fetchClaim();if(currentClaim)renderExisting();else renderForm();}
  window.LZReturnClaims={mount};
})();
