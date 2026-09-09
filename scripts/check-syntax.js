const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');let checked=0,errors=0;
function check(file,source){try{new vm.Script(source,{filename:file});checked++;}catch(error){errors++;console.error(file+': '+error.message);}}
for(const dir of ['js','server/lib','server/routes','scripts'])for(const file of fs.readdirSync(path.join(root,dir))){if(file.endsWith('.js'))check(dir+'/'+file,fs.readFileSync(path.join(root,dir,file),'utf8'));}
for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){const html=fs.readFileSync(path.join(root,file),'utf8');let index=0;for(const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(/\bsrc=|\btype=["'](?:application\/|module)/i.test(script[1]))continue;check(file+' inline script '+(++index),script[2]);}}
console.log('Syntax checked '+checked+' scripts; '+errors+' failures.');if(errors)process.exitCode=1;
