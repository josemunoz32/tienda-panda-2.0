import fs from 'fs';
import { isSteamProduct, isVipGame, isRetiredSteamTitle } from '../src/utils/vipGames.js';
import { isOnlineOnlySteamProduct } from '../src/utils/steamCatalogCache.js';

const steamImportData = JSON.parse(fs.readFileSync('./src/assets/steam_import_data.json', 'utf8'));

console.log('Total steamImportData:', steamImportData.length);

let passed = [];
let failedSteam = [];
let failedOnline = [];
let failedRetired = [];

for (let p of steamImportData) {
  if (!isSteamProduct(p)) {
    failedSteam.push(p);
  } else if (isOnlineOnlySteamProduct(p)) {
    failedOnline.push(p);
  } else if (isRetiredSteamTitle(p)) {
    failedRetired.push(p);
  } else {
    passed.push(p);
  }
}

console.log('Passed:', passed.length);
console.log('Failed isSteamProduct:', failedSteam.length);
console.log('Failed isOnlineOnlySteamProduct:', failedOnline.length);
console.log('Failed isRetiredSteamTitle:', failedRetired.length);

// Now test isVipGame on passed
let vip = passed.filter(p => isVipGame(p));
let nonVip = passed.filter(p => !isVipGame(p));

console.log('VIP games:', vip.length);
console.log('Non-VIP (Bonus games):', nonVip.length);
console.log('First 10 Non-VIP:', nonVip.slice(0, 10).map(x => x.name));
