import fs from 'fs';
import path from 'path';

const dir = 'C:\\Program Files (x86)\\Steam\\steamapps';
const files = fs.readdirSync(dir).filter(f => f.startsWith('appmanifest_'));
for (const f of files) {
  const full = path.join(dir, f);
  const txt = fs.readFileSync(full, 'utf8');
  const m = txt.match(/"name"\s+"([^"]*)"/);
  if (!m || !m[1] || m[1].trim() === '') {
    console.log('EMPTY NAME IN:', f, m ? m[0] : 'NO NAME KEY');
  } else {
    console.log(f, '->', m[1]);
  }
}
console.log('Total checked:', files.length);
