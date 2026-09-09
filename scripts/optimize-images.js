/* Local derivatives at build time; public originals remain a safe fallback.
   npm run images fails on remote errors. Normal builds retain working sources. */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const sharp=require('sharp');
const Catalog=require('../server/lib/catalog');
const root=path.resolve(__dirname,'..'),output=path.join(root,'images/catalog');
const manifestPath=path.join(root,'js/image-manifest.js');
const manifest=fs.existsSync(manifestPath)?require(manifestPath):{};
const allowedOrigin=new URL(Catalog.SUPABASE_URL).origin;
async function main(){
 fs.mkdirSync(output,{recursive:true});
 let errors=0,originalBytes=0,optimizedBytes=0,completed=0;
 const sources=fs.readdirSync(path.join(root,'images/products')).filter(f=>/\.(?:jpg|png|webp)$/i.test(f)).map(f=>({url:'https://labelbyzare.com/images/products/'+f,file:path.join(root,'images/products',f)}));
 if(!process.argv.includes('--local'))try{
  for(let offset=0;;offset+=500){
   const rows=await Catalog.request('products?select=img,img2,gallery&order=id.asc&limit=500&offset='+offset);
   if(!Array.isArray(rows))throw new Error('Invalid image catalog response');
   for(const value of rows.flatMap(p=>[p.img,p.img2,...(Array.isArray(p.gallery)?p.gallery:[])])){
    try{const url=new URL(value);if(url.origin===allowedOrigin && url.pathname.startsWith('/storage/v1/object/public/product-images/'))sources.push({url:url.href});}catch{}
   }
   if(rows.length<500)break;
  }
 }catch(error){errors++;console.warn('Remote catalog unavailable; existing image sources retained:',error.message);}
 const unique=[...new Map(sources.map(source=>[source.url,source])).values()];
 for(let offset=0;offset<unique.length;offset+=4){
  await Promise.all(unique.slice(offset,offset+4).map(async source=>{
   try{
    let buffer;
    if(source.file)buffer=fs.readFileSync(source.file);
    else{
     const response=await fetch(source.url,{signal:AbortSignal.timeout(20000),redirect:'error'});
     if(!response.ok || !/^image\//i.test(response.headers.get('content-type')||''))throw new Error('Photograph unavailable: '+response.status);
     if(Number(response.headers.get('content-length'))>25*1024*1024)throw new Error('Photograph too large');
     buffer=Buffer.from(await response.arrayBuffer());
    }
    if(buffer.length>25*1024*1024)throw new Error('Photograph too large');
    const hash=crypto.createHash('sha256').update(buffer).digest('hex').slice(0,16),entries={};
    for(const width of [160,480,832,1248]){
     const {data,info}=await sharp(buffer,{limitInputPixels:50000000}).rotate().resize({width,withoutEnlargement:true}).toColourspace('srgb').webp({quality:82,effort:5}).toBuffer({resolveWithObject:true});
     const filename=`${hash}-${info.width}.webp`;
     fs.writeFileSync(path.join(output,filename),data);entries[info.width]='/images/catalog/'+filename;
     if(width===480)optimizedBytes+=data.length;
    }
    manifest[source.url]=entries;originalBytes+=buffer.length;completed++;
   }catch(error){errors++;console.warn('Retaining original source for an unprocessed photograph:',error.message);}
  }));
 }
 fs.writeFileSync(manifestPath,'/* Generated image derivatives; originals remain the fallback. */\n(function(root){const images='+JSON.stringify(manifest)+';if(typeof module==="object"&&module.exports)module.exports=images;else root.LZImageManifest=images;})(typeof window!=="undefined"?window:this);\n');
 console.log(JSON.stringify({photographs:completed,originalBytes,cardBytes:optimizedBytes,cardReduction:originalBytes?Math.round((1-optimizedBytes/originalBytes)*100)+'%':'0%',errors}));
 if(errors && !process.argv.includes('--build'))process.exitCode=1;
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
