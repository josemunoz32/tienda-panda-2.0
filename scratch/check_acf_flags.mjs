import fs from 'fs';
import path from 'path';

const dir = 'C:\\Program Files (x86)\\Steam\\steamapps';
const files = fs.readdirSync(dir).filter(f => f.startsWith('appmanifest_') && f.endsWith('.acf'));
for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const appid = content.match(/"appid"\s+"(\d+)"/)?.[1];
  const name = content.match(/"name"\s+"([^"]+)"/)?.[1];
  const flags = content.match(/"StateFlags"\s+"(\d+)"/)?.[1];
  const update = content.match(/"UpdateResult"\s+"(\d+)"/)?.[1];
  console.log(appid, 'Flags:', flags, 'Result:', update, '-', name);
}
