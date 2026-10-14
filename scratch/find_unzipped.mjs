import fs from 'fs';
import path from 'path';

const p = path.join(process.cwd(), 'fixes/Pack_Fixes/fixes');
const items = fs.readdirSync(p);
const dirs = items.filter(f => fs.statSync(path.join(p, f)).isDirectory());
const zips = new Set(items.filter(f => f.endsWith('.zip')).map(f => f.slice(0, -4).toLowerCase()));

const unzipped = dirs.filter(d => !zips.has(d.toLowerCase()));
console.log(`Carpetas totales: ${dirs.length}`);
console.log(`Zips totales: ${zips.size}`);
console.log(`Carpetas de Fix que NO tienen archivo .zip (${unzipped.length}):`);
unzipped.forEach(d => console.log(` • ${d}`));
