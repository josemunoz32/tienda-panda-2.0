const fs = require('fs');
let content = fs.readFileSync('src/pages/Categorias/CategoriaPage.js', 'utf8');

const oldLabels = [
  "                      switch1: { label:'🎮 Solo NS1', color:'#ff7070', bg:'rgba(228,0,15,0.13)', border:'rgba(228,0,15,0.35)' },",
  "                      switch2: { label:'🎮 Solo NS2', color:'#60a5fa', bg:'rgba(0,120,215,0.15)', border:'rgba(0,120,215,0.4)' },",
  "                      ambas:   { label:'🎮 NS1 + NS2', color:'#4ade80', bg:'rgba(74,222,128,0.13)', border:'rgba(74,222,128,0.35)' },",
].join('\r\n');

const newLabels = [
  "                      switch1: { label:'🎮 Solo Switch 1', color:'#ff7070', bg:'rgba(228,0,15,0.13)', border:'rgba(228,0,15,0.35)' },",
  "                      switch2: { label:'🎮 Solo Switch 2', color:'#60a5fa', bg:'rgba(0,120,215,0.15)', border:'rgba(0,120,215,0.4)' },",
  "                      ambas:   { label:'🎮 Switch 1 y 2', color:'#4ade80', bg:'rgba(74,222,128,0.13)', border:'rgba(74,222,128,0.35)' },",
].join('\r\n');

if (!content.includes(oldLabels)) {
  console.error('ERROR: labels not found');
  process.exit(1);
}

content = content.replace(oldLabels, newLabels);
fs.writeFileSync('src/pages/Categorias/CategoriaPage.js', content, 'utf8');
console.log('Done!');
