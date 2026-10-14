import fs from 'fs';
import path from 'path';

// Exact match or predicate for online-only multiplayer games
export function isStrictlyOnlineMultiplayer({ name, app_id }) {
  const n = (name || '').toLowerCase().trim();
  const id = String(app_id || '').trim();

  // Explicit allowed single-player games
  if (
    n.includes('mortal kombat') ||
    n.includes('red dead redemption') ||
    n.includes('left 4 dead') ||
    (n.startsWith('outlast') && !n.includes('trial')) ||
    (n.startsWith('final fantasy') && !n.includes('xiv') && !n.includes('14') && !n.includes('online')) ||
    n.includes('injustice') ||
    n.includes('wolf among us') ||
    n.includes('squadrons') ||
    n.includes('the forest') ||
    n.includes('sons of the forest') ||
    n.includes('raft') ||
    n.includes('valheim') ||
    n.includes('project zomboid') ||
    n.includes('terraria') ||
    (n.startsWith('fallout') && !n.includes('76')) ||
    n.includes('borderlands') ||
    n.includes('remnant') ||
    n.includes('deep rock galactic') ||
    n.includes('payday 2') || // Payday 2 has full offline solo crime.net with bots
    n.includes('gotham knights') ||
    n.includes('suicide squad')
  ) {
    return false;
  }

  // Exact AppIDs of online-only games
  const STRICT_ONLINE_APPIDS = new Set([
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
    '967050',  // Pacify alt
    '238320',  // Outlast Trials
    '958260',  // DEAD OR ALIVE Xtreme Venus Vacation
    '543900',  // METAL GEAR SURVIVE
    '633230',  // NARUTO TO BORUTO: SHINOBI STRIKER
    '236130',  // Forza Horizon 5 con online
    '1361210', // Warhammer 40,000: Darktide
    '238960',  // Path of Exile
    '2694490', // Path of Exile 2
    '204200',  // Star Wars: The Old Republic
    '306130',  // The Elder Scrolls Online
    '1284210', // Guild Wars 2
    '218230',  // PlanetSide 2
    '323370',  // TERA
  ]);

  if (id && STRICT_ONLINE_APPIDS.has(id)) {
    // Check if it's FFXIV Online specifically (id 39210 was reused in old data for FFX/XI)
    if (id === '39210') {
      return n.includes('xiv') || n.includes('14') || n.includes('online');
    }
    // Check if it's Outlast Trials specifically (id 238320 was used for Outlast 1 in some lists)
    if (id === '238320') {
      return n.includes('trial');
    }
    return true;
  }

  // Name patterns
  if (
    n === 'rust' || n.startsWith('rust ') || n.endsWith(' rust') ||
    n === 'dayz' || n.startsWith('dayz ') || n.endsWith(' dayz') ||
    n.includes('dead by daylight') ||
    n.includes('sea of thieves') ||
    n.includes('helldivers 2') ||
    n.includes('the division') ||
    (n.includes('final fantasy') && n.includes('online')) ||
    n === 'team fortress 2' ||
    n === 'team fortress classic' ||
    n.includes('counter-strike: source') ||
    n.includes('counter-strike: condition zero') ||
    n.includes('counter-strike 2') ||
    n === 'among us' ||
    n === 'lethal company' ||
    n.includes('phasmophobia') ||
    n === 'golf it' ||
    n === 'gang beasts' ||
    n === 'pacify' ||
    n.includes('outlast trial') ||
    n.includes('dead or alive xtreme venus vacation') ||
    n.includes('metal gear survive') ||
    n.includes('naruto to boruto: shinobi striker') ||
    n.includes('con online') ||
    n.includes('ark: survival evolved') ||
    n.includes('ark: survival ascended') ||
    n.includes('rainbow six siege') ||
    n.includes('pubg') ||
    n.includes('hunt: showdown') ||
    n.includes('hunt showdown') ||
    n.includes('fallout 76') ||
    n.includes('battlefield 2042') ||
    n.includes('warzone') ||
    n.includes('destiny 2') ||
    n.includes('overwatch') ||
    n.includes('scum') ||
    n.includes('conan exiles') ||
    n.includes('hell let loose') ||
    n.includes('throne and liberty') ||
    n.includes('the first descendant') ||
    n.includes('once human') ||
    n.includes('elite dangerous') ||
    n.includes('dota 2') ||
    n.includes('warframe') ||
    n.includes('paladins') ||
    n.includes('smite') ||
    n.includes('naraka') ||
    n.includes('black desert') ||
    n.includes('skull and bones') ||
    n.includes('marvel rivals') ||
    n.includes('payday 3') ||
    n.includes('squad') && !n.includes('suicide') && !n.includes('squadrons') ||
    n.includes('arma 3') ||
    n.includes('party animals') ||
    n.includes('the finals')
  ) {
    return true;
  }

  return false;
}

const filePath = path.join(process.cwd(), 'src/assets/steam_import_data.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const removed = [];
const kept = [];

for (const item of data) {
  if (isStrictlyOnlineMultiplayer(item)) {
    removed.push(item);
  } else {
    kept.push(item);
  }
}

console.log(`Original: ${data.length}`);
console.log(`Eliminados estrictamente online: ${removed.length}`);
removed.forEach(r => console.log(` ❌ [${r.app_id}] ${r.name}`));
console.log(`Restantes (offline 100% seguros): ${kept.length}`);
