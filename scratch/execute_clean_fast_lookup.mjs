import fs from 'fs';
import path from 'path';
import { isOnlineOnlySteamProduct } from '../src/utils/steamCatalogCache.js';

const filePath = path.join(process.cwd(), 'src/assets/steam_fast_lookup.json');
const lookupData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const keys = Object.keys(lookupData);
let removedCount = 0;

for (const key of keys) {
  const item = lookupData[key];
  if (isOnlineOnlySteamProduct({ name: key, app_id: item.app_id })) {
    delete lookupData[key];
    removedCount++;
    console.log(` - Eliminado de lookup: ${key} [${item.app_id}]`);
  }
}

console.log(`Total keys originales: ${keys.length}`);
console.log(`Keys eliminadas: ${removedCount}`);
console.log(`Keys restantes: ${Object.keys(lookupData).length}`);

fs.writeFileSync(filePath, JSON.stringify(lookupData), 'utf8');
console.log('src/assets/steam_fast_lookup.json actualizado!');
