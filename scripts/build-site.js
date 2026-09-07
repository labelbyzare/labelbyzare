const fs=require('node:fs');
const path=require('node:path');
require('./build-templates');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'dist');
fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(output,{recursive:true});
for(const dir of ['css','js','images']) fs.cpSync(path.join(root,dir),path.join(output,dir),{recursive:true});
for(const file of fs.readdirSync(root)){
  if(/\.(html|xml)$/.test(file) || ['robots.txt','manifest.json','supabase-client.js','_headers'].includes(file)) fs.copyFileSync(path.join(root,file),path.join(output,file));
}
console.log('Built public assets in dist/ and compiled Netlify page templates.');
