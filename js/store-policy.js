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
  if(typeof module === "object" && module.exports) module.exports = policy;
  else root.LZPolicy = policy;
})(typeof window !== "undefined" ? window : this);
