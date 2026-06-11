@echo off
node -e "const fs=require('fs');const f='C:/Users/Admin/Desktop/Calude Test/erp-app/client/src/pages';fs.readdirSync(f).filter(x=>x.endsWith('.tsx')).forEach(name=>{let c=fs.readFileSync(f+'/'+name,'utf8');const n=c.split(/&/).join('&');if(c!==n){c=n;fs.writeFileSync(f+'/'+name,c,'utf8');console.log('fixed:'+name)}})"
