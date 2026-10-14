const fs = require('fs');
const path = require('path');

const fastLookupPath = path.join(__dirname, '..', 'src', 'assets', 'steam_fast_lookup.json');
let fastLookup = {};
if (fs.existsSync(fastLookupPath)) {
  fastLookup = JSON.parse(fs.readFileSync(fastLookupPath, 'utf8'));
}

// Map each saga key to a representative Steam App ID or real cover URL
const sagaAppIdMap = {
  "promo-saga-resident-evil": 1186700, // RE4 Remake
  "promo-saga-farcry": 552520, // Far Cry 5
  "promo-saga-hollow-knight": 367520, // Hollow Knight
  "promo-saga-tomb-raider": 391220, // Rise of the Tomb Raider
  "promo-saga-batman-arkham": 208650, // Batman Arkham Knight
  "promo-saga-souls-elden": 1245620, // Elden Ring
  "promo-saga-outlast": 238320, // Outlast
  "promo-saga-god-of-war": 1593500, // God of War
  "promo-saga-age-empires": 813780, // Age of Empires II DE
  "promo-saga-metal-gear": 287700, // MGS V Ground Zeroes
  "promo-coop-parejas": 1172620, // It Takes Two

  "promo-saga-assassins-creed": 582160, // AC Origins
  "promo-saga-yakuza": 638970, // Yakuza 0
  "promo-saga-sonic": 1237320, // Sonic Frontiers
  "promo-saga-monster-hunter": 582010, // Monster Hunter World
  "promo-saga-star-wars": 1172380, // SW Jedi Fallen Order
  "promo-saga-borderlands": 397540, // Borderlands 3
  "promo-saga-mafia": 1030840, // Mafia Definitive Edition
  "promo-saga-civilization": 289070, // Civilization VI
  "promo-saga-nfs": 1222680, // NFS Heat
  "promo-saga-mortal-kombat": 976310, // Mortal Kombat 11
  "promo-saga-sniper-elite": 312660, // Sniper Elite 4
  "promo-saga-life-is-strange": 1265920, // Life is Strange True Colors
  "promo-saga-tierra-media": 241930, // Shadow of Mordor
  "promo-saga-dragon-ball": 851850, // DBZ Kakarot
  "promo-saga-prince-of-persia": 19800, // Prince of Persia Sands of Time
  "promo-saga-dead-space": 1693980, // Dead Space Remake
  "promo-saga-bioshock": 8870, // BioShock Infinite
  "promo-saga-metro": 412020, // Metro Exodus
  "promo-saga-dishonored": 403640, // Dishonored 2
  "promo-saga-wolfenstein": 612880, // Wolfenstein II
  "promo-saga-just-cause": 225540, // Just Cause 3
  "promo-saga-darksiders": 606280, // Darksiders III
  "promo-saga-the-witcher": 292030, // The Witcher 3
  "promo-saga-fallout": 377160, // Fallout 4
  "promo-saga-elder-scrolls": 489830, // Skyrim Special Edition
  "promo-saga-doom": 782330, // DOOM Eternal
  "promo-saga-halo": 976730, // Halo MCC
  "promo-saga-gears-of-war": 1097840, // Gears 5
  "promo-saga-hitman": 1659040, // Hitman 3
  "promo-saga-naruto": 349040, // Naruto Storm 4
  "promo-saga-one-piece": 1089090, // One Piece Pirate Warriors 4
  "promo-saga-lego-marvel": 647830, // LEGO Marvel 2
  "promo-saga-lego-batman": 313690, // LEGO Batman 3
  "promo-saga-walking-dead": 866820, // TWD Final Season
  "promo-saga-dying-light": 239140, // Dying Light
  "promo-saga-plague-tale": 1182900, // A Plague Tale Requiem
  "promo-saga-nier": 524220, // Nier Automata
  "promo-saga-portal": 620, // Portal 2
  "promo-saga-left-4-dead": 550, // Left 4 Dead 2
  "promo-saga-subnautica": 264710, // Subnautica
  "promo-saga-south-park": 213670, // South Park Stick of Truth
  "promo-saga-kingdom-come": 379430, // Kingdom Come Deliverance
  "promo-saga-watch-dogs": 447040, // Watch Dogs 2
  "promo-saga-ghost-recon": 460930 // Ghost Recon Wildlands
};

console.log("AppID mapping total:", Object.keys(sagaAppIdMap).length);
