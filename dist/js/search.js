/* Shared catalog search. Uses real product attributes; no network dependency. */
(function(root){
  const types = root.LZProductTypes || (typeof module === "object" ? require("./product-types") : null);
  const cache = new WeakMap();
  const aliases = {
    abayas:"abaya", abayah:"abaya", abayahs:"abaya", abyaa:"abaya", abya:"abaya",
    shawls:"shawl", shwal:"shawl", shwals:"shawl", shawel:"shawl", shaal:"shawl",
    grey:"gray", greys:"gray", grays:"gray", colours:"color", colour:"color", colors:"color",
    kaftans:"kaftan", caftan:"kaftan", caftans:"kaftan", silks:"silk",
    sales:"sale", discount:"sale", discounted:"sale", offers:"sale", offer:"sale",
    newest:"new", latest:"new", arrivals:"arrival", bestselling:"bestseller", bestsellers:"bestseller",
    featuredproducts:"featured", collections:"collection", pieces:"piece", products:"product",
    namaz:"prayer", namaaz:"prayer", salah:"prayer", rozana:"everyday", rozmarra:"everyday", daily:"everyday",
    kala:"black", kaala:"black", kali:"black", kaali:"black", siyah:"black", sabz:"green", hara:"green", hari:"green",
    safed:"white", safaid:"white", shamoz:"shamooz", shamoze:"shamooz"
  };
  const stop = new Set(["a","an","the","and","for","with","in","of","to","on","me","show","find","please","i","want","looking","color","product","piece","collection","online","buy","shop","pakistan","karachi","lahore","islamabad","rawalpindi","faisalabad","peshawar","best","design","designs","ka","ki","ke","liye","chahiye","chahye","mein","mai","mujhe","pehnne","pehnay"]);
  function normalize(value){
    return String(value || "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  }
  function words(value){
    return normalize(value).split(" ").filter(Boolean).map(word => aliases[word] || word);
  }
  function terms(value){
    const phrase = normalize(String(value || "").slice(0,120))
      .replace(/\bbest\s+sell(?:er|ers|ing)\b/g,"bestseller")
      .replace(/\bnew\s+arrivals?\b/g,"new")
      .replace(/\bin\s+stock\b/g,"instock")
      .replace(/\bsold\s+out\b/g,"soldout");
    return [...new Set(words(phrase).filter(word => !stop.has(word)))].slice(0,12);
  }
  function index(product){
    if(cache.has(product)) return cache.get(product);
    const fields = [
      [product.name,24], [product.id,18], [types.label(product),14], [product.category,14],
      [(product.colors || []).map(color => typeof color === "string" ? color : color.name).join(" "),16],
      [String(product.fabric || "").slice(0,600),9], [(product.sizes || []).join(" "),8],
      [String(product.description || "").replace(/<[^>]*>/g," ").slice(0,1800),3]
    ];
    const entries = new Map();
    fields.forEach(([value,weight]) => words(value).forEach(word => entries.set(word, Math.max(entries.get(word) || 0,weight))));
    const stocked = product.inStock !== false && product.in_stock !== false;
    const flags = {
      abaya: types.key(product) === "abayas", shawl: types.key(product) === "shawls",
      sale: !!(product.isSale ?? product.is_sale), new: !!(product.isNew ?? product.is_new),
      bestseller: !!(product.isBestseller ?? product.is_bestseller), featured: !!(product.isFeatured ?? product.is_featured),
      instock: stocked, soldout: !stocked
    };
    const data = { entries:[...entries], flags, name:words(product.name).join(" "), stocked };
    cache.set(product,data);
    return data;
  }
  // Adjacent transpositions count as one edit (e.g. "emerald" / "emerlad").
  function distance(a,b,max){
    if(Math.abs(a.length-b.length)>max) return max+1;
    const rows=Array.from({length:a.length+1},()=>[]);
    for(let i=0;i<=a.length;i++) rows[i][0]=i;
    for(let j=0;j<=b.length;j++) rows[0][j]=j;
    for(let i=1;i<=a.length;i++){
      for(let j=1;j<=b.length;j++){
        rows[i][j]=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
        if(i>1 && j>1 && a[i-1]===b[j-2] && a[i-2]===b[j-1]) rows[i][j]=Math.min(rows[i][j],rows[i-2][j-2]+1);
      }
    }
    return rows[a.length][b.length];
  }
  function lookup(products,query){
    let min=-Infinity,max=Infinity,hasPrice=false;
    let text=String(query || '').slice(0,120).toLowerCase().replace(/(\d),(?=\d{3}\b)/g,'$1');
    const amount=v=>Number(v.replace(/k$/,''))*(v.endsWith('k')?1000:1);
    text=text.replace(/\b(under|below|less than|above|over|more than)\s*(?:pkr\s*|rs\.?\s*)?(\d+(?:\.\d+)?k?)\b/g,(_,word,value)=>{hasPrice=true;if(['under','below','less than'].includes(word))max=Math.min(max,amount(value));else min=Math.max(min,amount(value));return ' ';});
    text=text.replace(/\b(\d+(?:\.\d+)?k?)\s*se\s*(kam|zyada)\b/g,(_,value,word)=>{hasPrice=true;if(word==='kam')max=Math.min(max,amount(value));else min=Math.max(min,amount(value));return ' ';});
    const queryTerms=terms(text);
    if(!queryTerms.length && !hasPrice) return {products:[],usedFuzzy:false};
    products=products.filter(p=>Number(p.price)>0 && Number(p.price)>min && Number(p.price)<max);
    const distances = new Map();
    function rank(fuzzy){
      const ranked=[];
      products.forEach((product,order)=>{
        const data=index(product);
        let score=0;
        for(const term of queryTerms){
          if(Object.prototype.hasOwnProperty.call(data.flags,term)){
            if(!data.flags[term]) return;
            score+=16;
            continue;
          }
          let best=0;
          for(const [word,weight] of data.entries){
            if(word===term) best=Math.max(best,weight);
            else if(term.length>=2 && word.startsWith(term)) best=Math.max(best,weight*.7);
            else if(term.length>=4 && word.includes(term)) best=Math.max(best,weight*.5);
          }
          if(!best && fuzzy && term.length>=4){
            const max=term.length>=7?2:1;
            for(const [word,weight] of data.entries){
              if(Math.abs(word.length-term.length)>max || word.length<4) continue;
              const key=term+"|"+word;
              if(!distances.has(key)) distances.set(key,distance(term,word,max));
              const edits=distances.get(key);
              if(edits<=max) best=Math.max(best,weight*.45/(edits||1));
            }
          }
          if(!best) return; // Every meaningful query word must match.
          score+=best;
        }
        const phrase=queryTerms.join(" ");
        if(data.name===phrase) score+=100;
        else if(data.name.includes(phrase)) score+=30;
        ranked.push({product,score,stocked:data.stocked,order});
      });
      return ranked.sort((a,b)=>b.score-a.score || Number(b.stocked)-Number(a.stocked) || a.order-b.order).map(item=>item.product);
    }
    const exact=rank(false);
    if(exact.length) return {products:exact,usedFuzzy:false};
    const close=rank(true);
    return {products:close,usedFuzzy:close.length>0};
  }
  const api = { normalize, terms, lookup, search(products,query){ return lookup(products,query).products; } };
  if(typeof module === "object" && module.exports) module.exports=api;
  else root.LZSearch=api;
})(typeof window !== "undefined" ? window : this);
