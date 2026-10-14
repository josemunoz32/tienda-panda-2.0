import fs from "fs";

const steamImportData = JSON.parse(fs.readFileSync("./src/assets/steam_import_data.json", "utf8"));
console.log(`steam_import_data count: ${steamImportData.length}`);

const NON_BASE_KEYWORDS = [
  'soundtrack', 'ost', 'artbook', 'dlc', 'expansion pack', 'bonus content',
  'wallpaper', 'demo', 'playtest', 'dedicated server', 'sdk', 'mod kit', 'add-on',
  'season pass', 'content pack', 'upgrade pack', 'cosmetic', 'skin pack',
  'supporter pack', 'sound track', 'digital artbook', 'original score', 'pre-order bonus'
];

let nbCount = 0;
steamImportData.forEach(item => {
  const name = (item.name || '').toLowerCase();
  if (NON_BASE_KEYWORDS.some(kw => name.includes(kw))) {
    nbCount++;
    console.log(`Non-base in steam_import: appid=${item.app_id || item.id} | name="${item.name}"`);
  }
});
console.log(`Total non-base in steam_import_data: ${nbCount}`);
