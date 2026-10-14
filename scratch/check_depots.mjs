import fs from 'fs';

const lua = fs.readFileSync('scratch/fs25_out/2300320.lua', 'utf8');
const lines = lua.split('\n');

for (const line of lines) {
  const m = line.match(/addappid\(\s*(\d+)\s*,\s*0\s*,\s*"([0-9a-fA-F]+)"\)/);
  if (m) {
    const depotId = m[1];
    const key = m[2];
    console.log(`Depot: ${depotId} Key: ${key}`);
  }
}
