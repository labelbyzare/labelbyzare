(function(root){
  const core = root.LZCatalog || (typeof module === "object" ? require("./catalog-core") : null);
  const policy = root.LZPolicy || (typeof module === "object" ? require("./store-policy") : null);
  const collections = root.LZCollections || (typeof module === "object" ? require("./collections") : null);
  const site=core.site;
  const schema = {
    organization(){ return {"@context":"https://schema.org","@type":"OnlineStore","@id":site+"/#organization",name:"Label by Zare",url:site+"/",logo:site+"/images/logo.jpg",sameAs:["https://www.instagram.com/thelabelbyzare"],contactPoint:{"@type":"ContactPoint",contactType:"customer service",telephone:"+923288691979",availableLanguage:["English","Urdu"],areaServed:"PK"},hasMerchantReturnPolicy:{"@type":"MerchantReturnPolicy","@id":site+"/support#return-policy",applicableCountry:"PK",returnPolicyCategory:"https://schema.org/MerchantReturnFiniteReturnWindow",merchantReturnDays:policy.returnDays,merchantReturnLink:site+"/support#shipping-returns"}}; },
    website(){ return {"@context":"https://schema.org","@type":"WebSite","@id":site+"/#website",name:"Label by Zare",url:site+"/",inLanguage:"en-PK",publisher:{"@id":site+"/#organization"}}; },
    breadcrumbs(items,path){ return {"@context":"https://schema.org","@type":"BreadcrumbList","@id":site+path+"#breadcrumb",itemListElement:items.map((item,i)=>({"@type":"ListItem",position:i+1,name:item.name,item:new URL(item.url,site).href}))}; },
    productBreadcrumbs(p){
      const c=collections.forProduct(p);
      const items=[{name:"Home",url:"/"},{name:c.type === "shawls" ? "Shawls" : "Abayas",url:collections.url(c.type)}];
      if(c.category) items.push({name:c.name,url:collections.url(c)});
      items.push({name:p.name,url:core.productUrl(p)});
      return schema.breadcrumbs(items,core.productUrl(p));
    },
    product(p,rating){
      p=core.normalize(p);
      const url=site+core.productUrl(p);
      const result={"@context":"https://schema.org","@type":"Product","@id":url+"#product",url,name:p.name,description:p.description || `${p.name} by Label by Zare.`,image:p.gallery,sku:p.id,brand:{"@type":"Brand",name:"Label by Zare"},category:collections.forProduct(p).name,color:p.colors.map(c=>typeof c === "string" ? c : c.name).join(" / "),size:p.sizes.map(String)};
      if(p.price>0) result.offers={"@type":"Offer",url,priceCurrency:policy.currency,price:p.price.toFixed(2),availability:p.discontinued ? "https://schema.org/Discontinued" : p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",itemCondition:"https://schema.org/NewCondition",seller:{"@id":site+"/#organization"},shippingDetails:{"@type":"OfferShippingDetails",shippingDestination:{"@type":"DefinedRegion",addressCountry:"PK"},shippingRate:{"@type":"MonetaryAmount",value:policy.shippingFee(p.price,"standard"),currency:"PKR"},deliveryTime:{"@type":"ShippingDeliveryTime",handlingTime:{"@type":"QuantitativeValue",minValue:1,maxValue:2,unitCode:"DAY"},transitTime:{"@type":"QuantitativeValue",minValue:3,maxValue:5,unitCode:"DAY"}}},hasMerchantReturnPolicy:{"@id":site+"/support#return-policy"}};
      if(Number.isInteger(rating?.count) && rating.count>0 && Number.isFinite(rating.value) && rating.value>=1 && rating.value<=5) result.aggregateRating={"@type":"AggregateRating",ratingValue:Math.round(rating.value*10)/10,reviewCount:rating.count,bestRating:5,worstRating:1};
      return result;
    },
    list(products,name,path,offset=0){ return {"@context":"https://schema.org","@type":"ItemList","@id":site+path+"#products",name,url:site+path,numberOfItems:products.length,itemListElement:products.map((p,i)=>({"@type":"ListItem",position:offset+i+1,url:site+core.productUrl(p),name:p.name}))}; }
  };
  if(typeof module === "object" && module.exports) module.exports=schema;
  else root.LZSchema=schema;
})(typeof window !== "undefined" ? window : this);
