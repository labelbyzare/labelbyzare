/* Shared commercial rules. Used by checkout, product markup and feeds. */
(function(root){
  const policy = {
    currency: "PKR",
    country: "PK",
    freeShippingAbove: 15000,
    standardFee: 350,
    expressFee: 900,
    returnDays: 7,
    shippingText: "Orders are processed within 1–2 business days. Standard delivery takes 3–5 business days nationwide. Express delivery takes 1–2 business days in major cities. Standard shipping is PKR 350 and express shipping is PKR 900; both are free on orders over PKR 15,000.",
    returnsText: "Unworn pieces with tags attached may be returned within 7 days of delivery for a full refund or exchange. Contact us with your order number to arrange your return.",
    shippingFee(subtotal, method){
      const amount = Number(subtotal);
      if(!Number.isFinite(amount) || amount < 0) throw new Error("Invalid order subtotal");
      if(amount > this.freeShippingAbove) return 0;
      return method === "express" ? this.expressFee : this.standardFee;
    }
  };
  policy.fromSettings = function(settings={}) {
    const amount=(value,fallback)=>value!==null && value!=='' && Number.isFinite(Number(value)) && Number(value)>=0 ? Number(value) : fallback;
    const next={...policy,standardFee:amount(settings.standard_fee,policy.standardFee),expressFee:amount(settings.express_fee,policy.expressFee),freeShippingAbove:amount(settings.free_shipping_above,policy.freeShippingAbove)};
    next.processingDays=settings.processing_days || '1–2 business days';
    next.standardDays=settings.standard_days || '3–5 business days nationwide';
    next.expressDays=settings.express_days || '1–2 business days in major cities';
    next.returnsText=settings.return_policy || policy.returnsText;
    const days=next.returnsText.match(/within\s+(\d+)\s+days?/i);
    next.returnDays=days ? Number(days[1]) : null;
    next.shippingText=`Orders are processed within ${next.processingDays}. Standard delivery takes ${next.standardDays}. Express delivery takes ${next.expressDays}. Standard shipping is PKR ${next.standardFee.toLocaleString('en-PK')} and express shipping is PKR ${next.expressFee.toLocaleString('en-PK')}; both are free on orders over PKR ${next.freeShippingAbove.toLocaleString('en-PK')}.`;
    return next;
  };
  if(typeof module === "object" && module.exports) module.exports = policy;
  else root.LZPolicy = policy;
})(typeof window !== "undefined" ? window : this);
