const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const versions={};
for(const dir of ['js','css']) {
  for(const file of fs.readdirSync(path.join(root,dir),{recursive:true})) {
    const relative=dir+'/'+file;
    if(fs.statSync(path.join(root,relative)).isFile())versions['/'+relative]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,relative))).digest('hex').slice(0,12);
  }
}
versions['/supabase-client.js']=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'supabase-client.js'))).digest('hex').slice(0,12);
fs.writeFileSync(path.join(root,'server/lib/asset-versions.json'),JSON.stringify(versions));
