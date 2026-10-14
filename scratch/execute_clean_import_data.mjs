import fs from 'fs';
import path from 'path';
import { isOnlineOnlySteamProduct } from '../src/utils/steamCatalogCache.js';

const filePath = path.join(process.cwd(), 'src/assets/steam_import_data.json');
const originalData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const filteredData = originalData.filter(item => {
  return !isOnlineOnlySteamProduct(item);
});

console.log(`Original: ${originalData.length} items`);
console.log(`Filtrados: ${filteredData.length} items`);
console.log(`Eliminados: ${originalData.length - filteredData.length} items`);

fs.writeFileSync(filePath, JSON.stringify(filteredData, null, 2), 'utf8');
console.log('Archivo src/assets/steam_import_data.json actualizado con éxito!');
