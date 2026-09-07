const Journal=require('../lib/journal');
const C=require('../../js/catalog-core');
const Collections=require('../../js/collections');
const Schema=require('../../js/structured-data');
const R=require('../lib/render');
const e=C.escape;
const safeGuideHtml=value=>String(value||'')
 .replace(/<\s*(script|style|iframe|object|embed|form|svg|math)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,'')
 .replace(/<\s*(script|style|iframe|object|embed|form|svg|math)\b[^>]*\/?>/gi,'')
 .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'')
 .replace(/\s+(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi,' $1="#"');
exports.handler=async event=>{
 const path=event.path || '/journal/';
 const match=path.match(/^\/journal(?:\/([^/]+))?\/?$/);
 if(!match) return R.notFound();
 const articles=await Journal.list();
 const article=match[1] ? (articles.find(a=>a.slug===match[1]) || await Journal.getLive(match[1])) : null;
 if(match[1] && !article) return R.notFound();
 if(!path.endsWith('/')) return {statusCode:301,headers:{Location:path+'/'},body:''};
 const title=article ? article.title : 'The modest wardrobe journal';
 const description=article?.summary || 'Thoughtful guides to abaya sizing, fabrics, kaftan silhouettes, prayer pieces and shawl styling, from Label by Zare.';
 const crumbs=[{name:'Home',url:'/'},{name:'Journal',url:'/journal/'},...(article ? [{name:title,url:path}] : [])];
 const related=article ? articles.filter(a=>a.slug!==article.slug && (a.collection===article.collection || ['abaya-sizing-guide','abaya-fabric-guide'].includes(a.slug))).slice(0,3) : articles;
 const collectionName=a=>Collections.get(a.collection)?.name || 'Journal';
 const collectionUrl=a=>Collections.get(a.collection)?Collections.url(a.collection):'/journal/';
 const cards=related.map(a=>`<article class="journal-card"><p class="eyebrow">${e(collectionName(a))}</p><h2><a href="/journal/${a.slug}/">${e(a.title)}</a></h2><p>${e(a.summary)}</p><a class="link-underline" href="/journal/${a.slug}/">Read the guide</a></article>`).join('');
 const content=`<main id="main-content"><header class="page-header"><div class="wrap">${R.crumbs(crumbs)}<p class="eyebrow">The Label by Zare journal</p><h1 class="display-2">${e(title)}</h1><p class="lede">${e(description)}</p>${article ? '<p class="journal-meta">By Label by Zare · Buying &amp; styling guidance</p>' : ''}</div></header><section class="section-tight"><div class="wrap">${article ? `<div class="journal-layout"><article class="journal-body">${article.sections.map(([heading,body],i)=>`<section id="guide-${i+1}"><h2>${e(heading)}</h2>${safeGuideHtml(body)}</section>`).join('')}<div class="journal-note"><p>Explore the current ${e(collectionName(article).toLowerCase())} edit. Product pages show each piece’s current price, availability and details.</p><a class="link-underline" href="${collectionUrl(article)}">Shop ${e(collectionName(article))}</a></div></article><aside class="journal-toc"><p class="eyebrow">In this guide</p>${article.sections.map(([heading],i)=>`<a href="#guide-${i+1}">${e(heading)}</a>`).join('')}<a href="/support#size-guide">Size guide</a><a href="/support#shipping-returns">Delivery &amp; returns</a><a href="/contact">Ask us a question</a></aside></div><div class="journal-related"><h2 class="display-3">Continue reading</h2><div class="journal-grid" style="margin-top:1.5rem">${cards}</div></div>` : `<div class="journal-grid">${cards}</div>`}</div></section></main>`;
 const schemas=[R.jsonld('lz-breadcrumb-schema',Schema.breadcrumbs(crumbs,path))];
 if(article) schemas.push(R.jsonld('lz-article-schema',{'@context':'https://schema.org','@type':'Article','@id':C.site+path+'#article',headline:title,description,url:C.site+path,mainEntityOfPage:C.site+path,inLanguage:'en-PK',author:{'@type':'Organization',name:'Label by Zare',url:C.site+'/about'},publisher:{'@id':C.site+'/#organization'},about:{'@type':'Thing',name:collectionName(article)}}));
 return R.response(R.page({title:title+' | Label by Zare',description,path,content,schemas}));
};
