import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src/assets/steam_fast_lookup.json');
const lookupData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

lookupData['reddeadredemption2'] = {
  app_id: "1174180",
  imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1174180/header.jpg"
};

fs.writeFileSync(filePath, JSON.stringify(lookupData), 'utf8');
console.log('Restaurado reddeadredemption2 en steam_fast_lookup.json');
