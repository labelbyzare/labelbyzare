/* Shared by the storefront, admin and Netlify product metadata.
   Shawls use the existing category field; no database migration is needed. */
(function(root){
  function key(product){
    const category = typeof product === "string" ? product : product?.category;
    return /^shawls?$/i.test(String(category || "").trim()) ? "shawls" : "abayas";
  }
  const types = {
    key,
    label(product){ return key(product) === "shawls" ? "Shawls" : "Abayas"; },
    singular(product){ return key(product) === "shawls" ? "shawl" : "abaya"; },
    categoryFor(type, category){
      if(key(type) === "shawls") return "Shawls";
      return key(category) === "shawls" ? "Everyday" : String(category || "").trim() || "Everyday";
    },
    collectionUrl(product){
      const type = key(product);
      const category = typeof product === "object" ? String(product?.category || "").trim() : "";
      return `/?type=${type}${type === "abayas" && category ? `&cat=${encodeURIComponent(category)}` : ""}#collection`;
    }
  };
  if(typeof module === "object" && module.exports) module.exports = types;
  else root.LZProductTypes = types;
})(typeof window !== "undefined" ? window : this);
