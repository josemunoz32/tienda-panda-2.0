// Uso: npm run seo:enrich-steam (agrega a scripts/data/steam_enrichment.json los juegos nuevos del catálogo Steam)
// Descarga géneros/categorías/desarrollador/descripcion de Steam appdetails (público) para cada app_id
const fs=require('fs');const https=require('https');
const path=require('path');const src=require(path.join(__dirname,'..','..','src','assets','steam_import_data.json'));const out=path.join(__dirname,'..','data','steam_enrichment.json');
let cache={};try{cache=JSON.parse(fs.readFileSync(out,'utf8'))}catch(_){}
const get=u=>new Promise(r=>https.get(u,{headers:{'User-Agent':'Mozilla/5.0'}},s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>{try{r({code:s.statusCode,j:JSON.parse(d)})}catch(_){r({code:s.statusCode,j:null})}})}).on('error',()=>r({code:0})));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const ids=[...new Set(src.map(x=>String(x.app_id||'')).filter(Boolean))].filter(id=>!cache[id]);
console.log('pendientes',ids.length);
for(let i=0;i<ids.length;i++){const id=ids[i];
 let res=await get(`https://store.steampowered.com/api/appdetails?appids=${id}&l=spanish&cc=cl`);
 if(res.code===429||!res.j){console.log('rate limit, espera');await sleep(60000);i--;continue;}
 const d=res.j[id]&&res.j[id].success?res.j[id].data:null;
 cache[id]=d?{genres:(d.genres||[]).map(g=>g.description),categories:(d.categories||[]).map(c=>c.description),developers:d.developers||[],publishers:d.publishers||[],short:d.short_description||'',release:d.release_date&&d.release_date.date||'',metacritic:d.metacritic&&d.metacritic.score||null,controller:d.controller_support||null}:{missing:true};
 if(i%20===0){fs.writeFileSync(out,JSON.stringify(cache));console.log(i,'/',ids.length);}
 await sleep(1600);}
fs.writeFileSync(out,JSON.stringify(cache));console.log('LISTO',Object.keys(cache).length);})();
