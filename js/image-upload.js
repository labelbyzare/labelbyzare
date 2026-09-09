/* Admin-only image preparation: preserve originals and upload responsive copies. */
(function(){
  window.LZImageUpload={async upload(file,client){
    const formats={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'};
    const ext=formats[file.type];
    if(!ext || file.size>25*1024*1024)throw new Error('Choose a JPG, PNG, WebP or AVIF image under 25 MB.');
    const bucket=client.storage.from('product-images');
    const directory='optimized/'+crypto.randomUUID();
    const original=directory+'/original.'+ext;
    const {error}=await bucket.upload(original,file,{upsert:false,cacheControl:'31536000',contentType:file.type});
    if(error)throw error;
    const {data}=bucket.getPublicUrl(original);
    const url=new URL(data.publicUrl);
    let bitmap;
    try{
      bitmap=await createImageBitmap(file);
      if(bitmap.width*bitmap.height>50000000)throw new Error('Large image');
      const widths=[...new Set([160,480,832,1248].map(width=>Math.min(width,bitmap.width)))];
      for(const width of widths){
        const canvas=document.createElement('canvas');
        canvas.width=width;canvas.height=Math.max(1,Math.round(bitmap.height*width/bitmap.width));
        canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
        const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.86));
        if(!blob || blob.type!=='image/webp')throw new Error('Image conversion unavailable');
        const result=await bucket.upload(directory+'/'+width+'.webp',blob,{upsert:false,cacheControl:'31536000',contentType:'image/webp'});
        if(result.error)throw result.error;
        canvas.width=canvas.height=0;
      }
      url.searchParams.set('lz-widths',widths.join(','));
    }catch{
      // The original remains usable if a browser cannot create every derivative.
      url.searchParams.set('original','1');
    }finally{bitmap?.close();}
    return url.href;
  }};
})();
