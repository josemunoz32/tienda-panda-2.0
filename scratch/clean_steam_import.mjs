import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src/assets/steam_import_data.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// AppIDs known to be online-only / multiplayer with servers
const ONLINE_APPIDS = new Set([
  '252490',  // Rust
  '221100',  // DayZ
  '578080',  // PUBG
  '359550',  // Rainbow Six Siege
  '381210',  // Dead by Daylight
  '1172620', // Sea of Thieves
  '553850',  // Helldivers 2
  '594650',  // Hunt Showdown
  '365590',  // The Division
  '2221490', // The Division 2
  '1085660', // Destiny 2
  '2357570', // Overwatch 2
  '230410',  // Warframe
  '1172470', // Apex Legends
  '730',     // Counter-Strike 2
  '570',     // Dota 2
  '440',     // Team Fortress 2
  '20',      // Team Fortress Classic
  '240',     // Counter-Strike: Source
  '100',     // Counter-Strike: Condition Zero Deleted Scenes
  '945360',  // Among Us
  '1966720', // Lethal Company
  '739630',  // Phasmophobia
  '39210',   // Final Fantasy XIV Online
  '346110',  // ARK: Survival Evolved
  '2399830', // ARK: Survival Ascended
  '513710',  // SCUM
  '440900',  // Conan Exiles
  '393380',  // Squad
  '686810',  // Hell Let Loose
  '107410',  // Arma 3
  '1151340', // Fallout 76
  '1517290', // Battlefield 2042
  '2115240', // Payday 3
  '1818750', // Skull and Bones
  '1808450', // Throne and Liberty
  '2074920', // The First Descendant
  '2124440', // Once Human
  '2726450', // Marvel Rivals
  '2073850', // THE FINALS
  '2507950', // Delta Force
  '1063730', // New World
  '1599340', // Lost Ark
  '582660',  // Black Desert
  '1203220', // NARAKA: BLADEPOINT
  '359320',  // Elite Dangerous
  '444090',  // Paladins
  '386360',  // SMITE
  '2437170', // SMITE 2
  '1097150', // Fall Guys
  '1938090', // Call of Duty HQ / Warzone
  '1962663', // Warzone
  '1174180', // Red Dead Online standalone
  '1489970', // The Texas Chain Saw Massacre
  '438740',  // Friday the 13th
  '1493750', // Evil Dead: The Game
  '1824220', // Chivalry 2
  '629760',  // Mordhau
  '304390',  // For Honor
  '581320',  // Insurgency: Sandstorm
  '444200',  // World of Tanks
  '552990',  // World of Warships
  '236390',  // War Thunder
  '386180',  // Crossout
  '2051620', // Enlisted
  '1260320', // Party Animals
  '1568590', // Goose Goose Duck
  '438100',  // VRChat
  '520550',  // Deceit
  '2388770', // Deceit 2
  '571740',  // Golf It
  '285900',  // Gang Beasts
  '1279140', // Pacify
  '238320',  // The Outlast Trials
  '958260',  // DEAD OR ALIVE Xtreme Venus Vacation
  '543900',  // METAL GEAR SURVIVE
  '633230',  // NARUTO TO BORUTO: SHINOBI STRIKER
  '236130',  // Forza Horizon 5 con online
  '1361210', // Warhammer 40,000: Darktide
  '1971870', // Mortal Online 2
  '238960',  // Path of Exile
  '2694490', // Path of Exile 2
  '204200',  // Star Wars: The Old Republic
  '306130',  // The Elder Scrolls Online
  '1284210', // Guild Wars 2
  '218230',  // PlanetSide 2
  '323370',  // TERA
  '1659040', // HITMAN World of Assassination (Requires constant IOI online connection)
]);

const removed = [];
const kept = [];

for (const item of data) {
  const appId = String(item.app_id || '');
  const name = (item.name || '').toLowerCase();
  
  const isOnline = ONLINE_APPIDS.has(appId) ||
    name === 'rust' || name.startsWith('rust ') ||
    name === 'dayz' || name.startsWith('dayz ') ||
    name === 'dead by daylight' ||
    name === 'sea of thieves' ||
    name === 'helldivers 2' ||
    name === 'the division' ||
    name === 'final fantasy xiv online' ||
    name === 'team fortress 2' ||
    name === 'team fortress classic' ||
    name === 'counter-strike: source' ||
    name === 'counter-strike: condition zero deleted scenes' ||
    name === 'among us' ||
    name === 'lethal company' ||
    name === 'phasmophobia' ||
    name === 'golf it' ||
    name === 'gang beasts' ||
    name === 'pacify' ||
    name === 'outlast trials' ||
    name === 'dead or alive xtreme venus vacation' ||
    name === 'metal gear survive' ||
    name === 'naruto to boruto: shinobi striker' ||
    name.includes('con online') ||
    name === 'ark: survival evolved';

  if (isOnline) {
    removed.push(item);
  } else {
    kept.push(item);
  }
}

console.log(`Original: ${data.length} juegos.`);
console.log(`Eliminados: ${removed.length} juegos online.`);
removed.forEach(r => console.log(` - [${r.app_id}] ${r.name}`));
console.log(`Restantes: ${kept.length} juegos offline.`);
