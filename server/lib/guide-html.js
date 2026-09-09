/* CMS guides support formatting and safe links, never executable markup. */
const {escape}=require('../../js/catalog-core');
module.exports=function guideHtml(input){
 const html=String(input||'').replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|iframe|object|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
 return html.split(/(<[^>]*>)/g).map(part=>{
  if(!part.startsWith('<'))return part.replace(/>/g,'&gt;');
  const tag=part.match(/^<\s*(\/?)\s*(p|h3|h4|span|strong|em|b|i|ul|ol|li|a|br|table|caption|thead|tbody|tr|th|td)\b([^>]*)>$/i);
  if(!tag)return escape(part);
  const [,closing,name,attributes]=tag,type=name.toLowerCase();
  if(closing)return '</'+type+'>';
  if(type!=='a')return '<'+type+'>';
  const href=attributes.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`]+))/i);
  const value=href&&(href[1]??href[2]??href[3]);
  if(!value || !/^(?:\/(?!\/)|#[a-z0-9_-]|https?:\/\/)/i.test(value) || /[\u0000-\u0020\\]/.test(value))return '<a>';
  return '<a href="'+escape(value.replace(/&amp;/g,'&'))+'">';
 }).join('');
};
