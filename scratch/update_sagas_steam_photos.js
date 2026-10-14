const fs = require('fs');
const path = require('path');

const sagasDataPath = path.join(__dirname, '..', 'src', 'utils', 'sagasData.js');

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

// Local files for existing ones
const localImageMap = {
  "promo-saga-resident-evil": "/promos/promo_resident_evil.jpg",
  "promo-saga-farcry": "/promos/promo_farcry.jpg",
  "promo-saga-hollow-knight": "/promos/promo_hollow_knight.jpg",
  "promo-saga-tomb-raider": "/promos/promo_tomb_raider.jpg",
  "promo-saga-batman-arkham": "/promos/promo_batman_arkham.jpg",
  "promo-saga-souls-elden": "/promos/promo_souls_elden.jpg",
  "promo-saga-outlast": "/promos/promo_outlast.jpg",
  "promo-saga-god-of-war": "/promos/promo_god_of_war.jpg",
  "promo-saga-age-empires": "/promos/promo_age_empires.jpg",
  "promo-saga-metal-gear": "/promos/promo_metal_gear.jpg",
  "promo-coop-parejas": "/promos/promo_coop_parejas.jpg"
};

const sagas = [
  // --- SAGAS EXISTENTES ACTUALIZADAS ---
  {
    key: "promo-saga-resident-evil",
    name: "Saga Resident Evil Colección",
    priceCLP: 8990,
    games: ["Resident Evil 2 Remake", "Resident Evil 3 Remake", "Resident Evil 4 Remake", "Resident Evil 7 Biohazard", "Resident Evil Village"],
    vipExtras: [{ id: "re-requiem", name: "Resident Evil Requiem", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-farcry",
    name: "Saga Far Cry Colección",
    priceCLP: 7990,
    games: ["Far Cry 3", "Far Cry 4", "Far Cry 5", "Far Cry New Dawn", "Far Cry Primal"],
    vipExtras: [{ id: "farcry-6", name: "Far Cry 6", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-hollow-knight",
    name: "Saga Metroidvania & Joyas Indie",
    priceCLP: 6990,
    games: ["Hollow Knight", "Ori and the Blind Forest", "Ori and the Will of the Wisps", "Blasphemous", "Dead Cells"],
    vipExtras: []
  },
  {
    key: "promo-saga-tomb-raider",
    name: "Trilogía Tomb Raider Definitiva",
    priceCLP: 6990,
    games: ["Tomb Raider (2013)", "Rise of the Tomb Raider", "Shadow of the Tomb Raider: Definitive Edition"],
    vipExtras: []
  },
  {
    key: "promo-saga-batman-arkham",
    name: "Saga Batman Arkham Colección",
    priceCLP: 7990,
    games: ["Batman: Arkham Asylum GOTY", "Batman: Arkham City GOTY", "Batman: Arkham Knight", "Batman: Arkham Origins"],
    vipExtras: []
  },
  {
    key: "promo-saga-souls-elden",
    name: "Saga Souls & Elden Ring",
    priceCLP: 7990,
    games: ["Elden Ring", "Dark Souls Remastered", "Dark Souls II: Scholar of the First Sin", "Dark Souls III"],
    vipExtras: []
  },
  {
    key: "promo-saga-outlast",
    name: "Saga Outlast - Terror Psicológico",
    priceCLP: 5990,
    games: ["Outlast", "Outlast: Whistleblower DLC", "Outlast 2"],
    vipExtras: []
  },
  {
    key: "promo-saga-god-of-war",
    name: "Saga God of War Nórdico",
    priceCLP: 8990,
    games: ["God of War (2018)", "God of War Ragnarök"],
    vipExtras: []
  },
  {
    key: "promo-saga-age-empires",
    name: "Saga Age of Empires Definitive",
    priceCLP: 7990,
    games: ["Age of Empires I Definitive", "Age of Empires II: Definitive Edition", "Age of Empires III Definitive", "Age of Empires IV", "Age of Mythology: Retold"],
    vipExtras: []
  },
  {
    key: "promo-saga-metal-gear",
    name: "Saga Metal Gear Solid",
    priceCLP: 7990,
    games: ["METAL GEAR SOLID 1", "METAL GEAR SOLID 2: Sons of Liberty", "METAL GEAR SOLID 3: Snake Eater", "METAL GEAR SOLID V: GROUND ZEROES", "METAL GEAR RISING: REVENGEANCE"],
    vipExtras: []
  },
  {
    key: "promo-coop-parejas",
    name: "Pack Cooperativo & Parejas",
    priceCLP: 6990,
    games: ["It Takes Two", "A Way Out", "Cuphead", "Overcooked! All You Can Eat"],
    vipExtras: []
  },

  // --- NUEVAS SAGAS ---
  {
    key: "promo-saga-assassins-creed",
    name: "Saga Assassin’s Creed Completo",
    priceCLP: 12990,
    games: ["Assassin's Creed Director's Cut", "Assassin's Creed II", "Assassin's Creed Brotherhood", "Assassin's Creed Revelations", "Assassin's Creed III Remastered", "Assassin's Creed IV Black Flag", "Assassin's Creed Rogue", "Assassin's Creed Unity", "Assassin's Creed Syndicate", "Assassin's Creed Origins / Odyssey"],
    vipExtras: [{ id: "ac-shadows", name: "Assassin's Creed Shadows", priceCLP: 8000 }, { id: "ac-black-flag-resynced", name: "Black Flag Resynced", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-yakuza",
    name: "Saga Yakuza: Historia de Kiryu",
    priceCLP: 14990,
    games: ["Yakuza 0", "Yakuza Kiwami", "Yakuza Kiwami 2", "Yakuza 3 Remastered", "Yakuza 4 Remastered", "Yakuza 5 Remastered", "Yakuza 6: The Song of Life", "Yakuza: Dead Souls", "Yakuza Kenzan!", "Yakuza Black Panther 1", "Yakuza Black Panther 2"],
    vipExtras: [{ id: "yakuza-lad", name: "Like a Dragon", priceCLP: 8000 }, { id: "yakuza-gaiden", name: "Gaiden", priceCLP: 8000 }, { id: "yakuza-ishin", name: "Like a Dragon: Ishin!", priceCLP: 8000 }, { id: "yakuza-infinite-wealth", name: "Infinite Wealth", priceCLP: 8000 }, { id: "yakuza-pirate", name: "Pirate Yakuza in Hawaii", priceCLP: 8000 }, { id: "judgment", name: "Judgment", priceCLP: 8000 }, { id: "lost-judgment", name: "Lost Judgment", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-sonic",
    name: "Saga Sonic Universo",
    priceCLP: 9990,
    games: ["Sonic Generations", "Sonic Mania", "Sonic Forces", "Sonic Colors: Ultimate", "Sonic Lost World", "Sonic Adventure DX", "Sonic Adventure 2", "Team Sonic Racing"],
    vipExtras: [{ id: "sonic-frontiers", name: "Sonic Frontiers", priceCLP: 8000 }, { id: "sonic-superstars", name: "Sonic Superstars", priceCLP: 8000 }, { id: "sonic-x-shadow", name: "Sonic X Shadow Generations", priceCLP: 8000 }, { id: "sonic-crossworlds", name: "Sonic CrossWorlds", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-monster-hunter",
    name: "Saga Monster Hunter",
    priceCLP: 7990,
    games: ["Monster Hunter: World", "Monster Hunter World: Iceborne DLC", "Monster Hunter Rise", "Monster Hunter Rise: Sunbreak DLC", "Monster Hunter Stories", "Monster Hunter Stories 2: Wings of Ruin"],
    vipExtras: [{ id: "mh-wilds", name: "Monster Hunter Wilds", priceCLP: 8000 }, { id: "mh-stories-3", name: "Monster Hunter Stories 3", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-star-wars",
    name: "Saga Star Wars Aventura",
    priceCLP: 9990,
    games: ["Star Wars Jedi: Fallen Order", "Star Wars Jedi: Survivor", "Star Wars Battlefront II", "Star Wars Squadrons", "Knights of the Old Republic (KOTOR)", "KOTOR II: The Sith Lords", "The Force Unleashed Ultimate Sith", "The Force Unleashed II"],
    vipExtras: [{ id: "sw-outlaws", name: "Star Wars Outlaws", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-borderlands",
    name: "Saga Borderlands",
    priceCLP: 5990,
    games: ["Borderlands Game of the Year Enhanced", "Borderlands 2", "Borderlands: The Pre-Sequel", "Borderlands 3"],
    vipExtras: [{ id: "borderlands-4", name: "Borderlands 4", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-mafia",
    name: "Saga Mafia",
    priceCLP: 4990,
    games: ["Mafia: Definitive Edition", "Mafia II: Definitive Edition", "Mafia III: Definitive Edition"],
    vipExtras: [{ id: "mafia-old-country", name: "Mafia: The Old Country", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-civilization",
    name: "Saga Civilization",
    priceCLP: 7990,
    games: ["Sid Meier's Civilization III Complete", "Sid Meier's Civilization IV Complete", "Sid Meier's Civilization V Complete", "Sid Meier's Civilization VI Anthology", "Civilization Beyond Earth", "Civilization Revolution"],
    vipExtras: [{ id: "civ-7", name: "Civilization VII", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-nfs",
    name: "Saga Need for Speed",
    priceCLP: 7990,
    games: ["Need for Speed: Most Wanted", "Need for Speed: Rivals", "Need for Speed: Hot Pursuit Remastered", "Need for Speed: Heat", "Need for Speed: Shift 2 Unleashed", "Need for Speed: The Run"],
    vipExtras: [{ id: "nfs-payback", name: "NFS Payback", priceCLP: 8000 }, { id: "nfs-unbound", name: "NFS Unbound", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-mortal-kombat",
    name: "Saga Mortal Kombat",
    priceCLP: 5990,
    games: ["Mortal Kombat Arcade Kollection", "Mortal Kombat Komplete Edition", "Mortal Kombat X", "Mortal Kombat 11 Ultimate"],
    vipExtras: [{ id: "mk-1", name: "Mortal Kombat 1", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-sniper-elite",
    name: "Saga Sniper Elite",
    priceCLP: 4990,
    games: ["Sniper Elite V2 Remastered", "Sniper Elite 3", "Sniper Elite 4"],
    vipExtras: [{ id: "se-4", name: "Sniper Elite 4 Deluxe", priceCLP: 8000 }, { id: "se-5", name: "Sniper Elite 5", priceCLP: 8000 }, { id: "se-resistance", name: "Sniper Elite Resistance", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-life-is-strange",
    name: "Saga Life is Strange",
    priceCLP: 5990,
    games: ["Life is Strange Remastered", "Life is Strange: Before the Storm", "Life is Strange 2", "Life is Strange: True Colors"],
    vipExtras: [{ id: "lis-reunion", name: "Life is Strange: Reunion", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-tierra-media",
    name: "Saga Tierra Media",
    priceCLP: 4990,
    games: ["Middle-earth: Shadow of Mordor GOTY", "LEGO The Lord of the Rings", "LEGO The Hobbit"],
    vipExtras: [{ id: "shadow-of-war", name: "Middle-earth: Shadow of War", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-dragon-ball",
    name: "Saga Dragon Ball",
    priceCLP: 5990,
    games: ["Dragon Ball Xenoverse", "Dragon Ball Xenoverse 2", "Dragon Ball Z: Kakarot", "Dragon Ball FighterZ"],
    vipExtras: [{ id: "db-sparking-zero", name: "Dragon Ball: Sparking! ZERO", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-prince-of-persia",
    name: "Saga Prince of Persia",
    priceCLP: 5990,
    games: ["Prince of Persia: The Sands of Time", "Prince of Persia: Warrior Within", "Prince of Persia: The Two Thrones", "Prince of Persia: The Forgotten Sands"],
    vipExtras: [{ id: "pop-lost-crown", name: "Prince of Persia: The Lost Crown", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-dead-space",
    name: "Saga Dead Space",
    priceCLP: 4990,
    games: ["Dead Space (2008)", "Dead Space 2", "Dead Space 3"],
    vipExtras: [{ id: "dead-space-remake", name: "Dead Space Remake", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-bioshock",
    name: "Saga BioShock",
    priceCLP: 4990,
    games: ["BioShock Remastered", "BioShock 2 Remastered", "BioShock Infinite"],
    vipExtras: []
  },
  {
    key: "promo-saga-metro",
    name: "Saga Metro",
    priceCLP: 4990,
    games: ["Metro 2033 Redux", "Metro: Last Light Redux", "Metro Exodus"],
    vipExtras: []
  },
  {
    key: "promo-saga-dishonored",
    name: "Saga Dishonored",
    priceCLP: 4990,
    games: ["Dishonored Definitive Edition", "Dishonored 2", "Dishonored: Death of the Outsider"],
    vipExtras: []
  },
  {
    key: "promo-saga-wolfenstein",
    name: "Saga Wolfenstein",
    priceCLP: 5990,
    games: ["Wolfenstein: The New Order", "Wolfenstein: The Old Blood", "Wolfenstein II: The New Colossus", "Wolfenstein: Youngblood"],
    vipExtras: []
  },
  {
    key: "promo-saga-just-cause",
    name: "Saga Just Cause",
    priceCLP: 5990,
    games: ["Just Cause 1", "Just Cause 2", "Just Cause 3", "Just Cause 4"],
    vipExtras: []
  },
  {
    key: "promo-saga-darksiders",
    name: "Saga Darksiders",
    priceCLP: 5990,
    games: ["Darksiders Warmastered Edition", "Darksiders II Deathinitive Edition", "Darksiders III", "Darksiders Genesis"],
    vipExtras: []
  },
  {
    key: "promo-saga-the-witcher",
    name: "Saga The Witcher",
    priceCLP: 4990,
    games: ["The Witcher: Enhanced Edition", "The Witcher 2: Assassins of Kings", "The Witcher 3: Wild Hunt GOTY"],
    vipExtras: []
  },
  {
    key: "promo-saga-fallout",
    name: "Saga Fallout",
    priceCLP: 6990,
    games: ["Fallout 1: A Post Nuclear Role Playing Game", "Fallout 2: A Post Nuclear Role Playing Game", "Fallout 3: Game of the Year Edition", "Fallout: New Vegas Ultimate Edition", "Fallout 4: Game of the Year Edition"],
    vipExtras: []
  },
  {
    key: "promo-saga-elder-scrolls",
    name: "Saga The Elder Scrolls",
    priceCLP: 5990,
    games: ["The Elder Scrolls III: Morrowind GOTY", "The Elder Scrolls IV: Oblivion GOTY", "The Elder Scrolls V: Skyrim Special Edition", "The Elder Scrolls Online"],
    vipExtras: []
  },
  {
    key: "promo-saga-doom",
    name: "Saga Doom",
    priceCLP: 5990,
    games: ["Ultimate DOOM", "DOOM II", "DOOM (2016)", "DOOM Eternal"],
    vipExtras: []
  },
  {
    key: "promo-saga-halo",
    name: "Saga Halo",
    priceCLP: 7990,
    games: ["Halo: Combat Evolved Anniversary", "Halo 2: Anniversary", "Halo 3", "Halo 3: ODST", "Halo 4", "Halo: Reach"],
    vipExtras: []
  },
  {
    key: "promo-saga-gears-of-war",
    name: "Saga Gears of War",
    priceCLP: 4990,
    games: ["Gears of War: Ultimate Edition", "Gears of War 4", "Gears 5"],
    vipExtras: [{ id: "gears-reloaded", name: "Gears Reloaded", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-hitman",
    name: "Saga Hitman",
    priceCLP: 6990,
    games: ["Hitman: Codename 47", "Hitman 2: Silent Assassin", "Hitman: Contracts", "Hitman: Blood Money", "Hitman: Absolution"],
    vipExtras: []
  },
  {
    key: "promo-saga-naruto",
    name: "Saga Naruto Ultimate Ninja Storm",
    priceCLP: 7990,
    games: ["Naruto Ultimate Ninja STORM", "Naruto Ultimate Ninja STORM 2", "Naruto Ultimate Ninja STORM 3 Full Burst", "Naruto Ultimate Ninja STORM 4 Road to Boruto", "Naruto X Boruto Ultimate Ninja STORM Connections"],
    vipExtras: []
  },
  {
    key: "promo-saga-one-piece",
    name: "Saga One Piece",
    priceCLP: 4990,
    games: ["One Piece Pirate Warriors 3", "One Piece Pirate Warriors 4", "One Piece World Seeker"],
    vipExtras: []
  },
  {
    key: "promo-saga-lego-marvel",
    name: "Saga LEGO Marvel",
    priceCLP: 5990,
    games: ["LEGO Marvel Super Heroes", "LEGO Marvel Super Heroes 2", "LEGO Marvel's Avengers", "LEGO Spider-Man"],
    vipExtras: []
  },
  {
    key: "promo-saga-lego-batman",
    name: "Saga LEGO Batman",
    priceCLP: 4990,
    games: ["LEGO Batman: The Videogame", "LEGO Batman 2: DC Super Heroes", "LEGO Batman 3: Beyond Gotham"],
    vipExtras: [{ id: "legacy-dark-knight", name: "Legacy of the Dark Knight", priceCLP: 8000 }]
  },
  {
    key: "promo-saga-walking-dead",
    name: "Saga The Walking Dead Telltale",
    priceCLP: 6990,
    games: ["The Walking Dead: Season 1", "The Walking Dead: Season 2", "The Walking Dead: A New Frontier", "The Walking Dead: The Final Season", "The Walking Dead: Michonne"],
    vipExtras: []
  },
  {
    key: "promo-saga-dying-light",
    name: "Saga Dying Light",
    priceCLP: 4990,
    games: ["Dying Light: Enhanced Edition", "Dying Light 2 Stay Human", "Dying Light: Bad Blood"],
    vipExtras: []
  },
  {
    key: "promo-saga-plague-tale",
    name: "Saga A Plague Tale",
    priceCLP: 3990,
    games: ["A Plague Tale: Innocence", "A Plague Tale: Requiem"],
    vipExtras: []
  },
  {
    key: "promo-saga-nier",
    name: "Saga NieR",
    priceCLP: 3990,
    games: ["NieR:Automata", "NieR Replicant ver.1.22474487139..."],
    vipExtras: []
  },
  {
    key: "promo-saga-portal",
    name: "Saga Portal",
    priceCLP: 3990,
    games: ["Portal", "Portal 2"],
    vipExtras: []
  },
  {
    key: "promo-saga-left-4-dead",
    name: "Saga Left 4 Dead",
    priceCLP: 3990,
    games: ["Left 4 Dead", "Left 4 Dead 2"],
    vipExtras: []
  },
  {
    key: "promo-saga-subnautica",
    name: "Saga Subnautica",
    priceCLP: 4990,
    games: ["Subnautica", "Subnautica: Below Zero"],
    vipExtras: []
  },
  {
    key: "promo-saga-south-park",
    name: "Saga South Park",
    priceCLP: 4990,
    games: ["South Park: The Stick of Truth", "South Park: The Fractured But Whole", "South Park: Snow Day!"],
    vipExtras: []
  },
  {
    key: "promo-saga-kingdom-come",
    name: "Saga Kingdom Come",
    priceCLP: 3990,
    games: ["Kingdom Come: Deliverance Royal Edition", "Kingdom Come: Deliverance II"],
    vipExtras: []
  },
  {
    key: "promo-saga-watch-dogs",
    name: "Saga Watch Dogs",
    priceCLP: 4990,
    games: ["Watch Dogs", "Watch Dogs 2", "Watch Dogs Legion"],
    vipExtras: []
  },
  {
    key: "promo-saga-ghost-recon",
    name: "Saga Ghost Recon",
    priceCLP: 4990,
    games: ["Ghost Recon Advanced Warfighter", "Ghost Recon Advanced Warfighter 2", "Ghost Recon Future Soldier"],
    vipExtras: [{ id: "ghost-recon-wildlands", name: "Ghost Recon Wildlands", priceCLP: 8000 }]
  }
];

const mappedSagas = sagas.map(s => {
  const appId = sagaAppIdMap[s.key];
  const steamPhoto = appId ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg` : '/banner22.jpg';
  const img = localImageMap[s.key] || steamPhoto;
  return {
    ...s,
    image: img
  };
});

const content = `// Centralized Sagas & Bundles Data for PandaStore
// Includes base promo price, full games list, optional VIP extras, and real official Steam game photos.

export const STEAM_SAGAS = ${JSON.stringify(mappedSagas, null, 2)};
`;

fs.writeFileSync(sagasDataPath, content, 'utf8');
console.log("Successfully updated sagasData.js with official Steam game photos!");
