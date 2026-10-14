// Helper para almacenar en IndexedDB con expiración de 24 horas
const DB_NAME = "PandaStoreCache";
const DB_VERSION = 1;
const STORE_NAME = "steam_catalog";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export async function getCachedSteamCatalog() {
  try {
    const db = await openDB();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get("games_json");

      req.onsuccess = () => {
        const result = req.result;
        if (result && result.timestamp && (Date.now() - result.timestamp < CACHE_TTL_MS)) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn("Error leyendo caché IndexedDB:", err);
    return null;
  }
}

export async function setCachedSteamCatalog(data) {
  try {
    const db = await openDB();
    if (!db) return;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put({
        key: "games_json",
        timestamp: Date.now(),
        data: data
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn("Error guardando en caché IndexedDB:", err);
  }
}

// Lista de AppIDs de Steam de juegos que son 100% ONLINE / SERVIDORES EN LA NUBE
// No tienen campaña offline, exigen servidores dedicados o launchers externos (Frontier, EA, etc.)
// y NO funcionan por Lua ni Bypass.
export const ONLINE_ONLY_STEAM_APPIDS = new Set([
  '359320',  // Elite Dangerous (Servidores Frontier obligatorios)
  '578080',  // PUBG: BATTLEGROUNDS (Servidores Krafton / BattleEye)
  '1172470', // Apex Legends (Servidores EA / EAC)
  '252490',  // Rust (EAC / Servidores Facepunch)
  '221100',  // DayZ (BattlEye / Servidores Bohemia)
  '238960',  // Path of Exile (Servidores GGG)
  '2694490', // Path of Exile 2
  '1938090', // Call of Duty HQ / Warzone (Ricochet / Activision servers)
  '381210',  // Dead by Daylight (EAC / Servidores dedicados)
  '1063730', // New World: Aeternum (MMO Amazon)
  '552990',  // World of Warships
  '444090',  // Paladins
  '386360',  // SMITE
  '2437170', // SMITE 2
  '230410',  // Warframe
  '1085660', // Destiny 2 (Servidores Bungie)
  '1240440', // Halo Infinite (Multiplayer)
  '2357570', // Overwatch 2 (Servidores Battle.net)
  '2073850', // THE FINALS
  '553850',  // HELLDIVERS 2 (Servidores PlayStation/Arrowhead obligatorios)
  '1599340', // Lost Ark
  '204200',  // Star Wars: The Old Republic (MMO)
  '306130',  // The Elder Scrolls Online (Zenimax servers)
  '1284210', // Guild Wars 2
  '1097150', // Fall Guys (Epic Games servers)
  '730',     // Counter-Strike 2
  '570',     // Dota 2
  '440',     // Team Fortress 2
  '20',      // Team Fortress Classic
  '240',     // Counter-Strike: Source
  '100',     // Counter-Strike: Condition Zero Deleted Scenes
  '945360',  // Among Us
  '1966720', // Lethal Company
  '739630',  // Phasmophobia
  '1172620', // Sea of Thieves (Xbox Live Servers)
  '1962663', // Call of Duty Warzone
  '2074920', // The First Descendant (Nexon servers)
  '1203220', // NARAKA: BLADEPOINT
  '2124440', // Once Human (NetEase servers)
  '582660',  // Black Desert (MMO)
  '323370',  // TERA
  '1808450', // Throne and Liberty (NCSoft / Amazon servers)
  '2507950', // Delta Force
  '1517290', // Battlefield 2042 (Solo online)
  '2115240', // Payday 3 (Always Online)
  '1818750', // Skull and Bones (Ubisoft Always Online)
  '218230',  // PlanetSide 2
  '359550',  // Tom Clancy's Rainbow Six Siege
  '365590',  // Tom Clancy's The Division
  '2221490', // Tom Clancy's The Division 2
  '346110',  // ARK: Survival Evolved (Servidores online dedicados)
  '2399830', // ARK: Survival Ascended
  '440900',  // Conan Exiles
  '513710',  // SCUM
  '393380',  // Squad
  '686810',  // Hell Let Loose
  '107410',  // ARMA 3
  '1151340', // Fallout 76
  '594650',  // Hunt: Showdown
  '1361210', // Warhammer: 40,000: Darktide
  '2726450', // Marvel Rivals
  '1489970', // The Texas Chain Saw Massacre
  '438740',  // Friday the 13th
  '1493750', // Evil Dead: The Game
  '1824220', // Chivalry 2
  '629760',  // Mordhau
  '304390',  // For Honor
  '581320',  // Insurgency: Sandstorm
  '444200',  // World of Tanks
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
  '958260',  // DEAD OR ALIVE Xtreme Venus Vacation
  '543900',  // METAL GEAR SURVIVE
  '633230',  // NARUTO TO BORUTO: SHINOBI STRIKER
  '236130',  // Forza Horizon 5 con online

  // Minecraft & Microsoft Login
  '1672970', // Minecraft Dungeons
  '1928870', // Minecraft Legends

  // Shooters 100% Online
  '393380',  // Squad
  '403240',  // Squad Dedicated Server
  '736220',  // Squad 44
  '1874880', // Arma Reforger
  '686810',  // Hell Let Loose
  '3079210', // Hell Let Loose: Vietnam
  '581320',  // Insurgency: Sandstorm
  '674020',  // World War 3
  '1058650', // Beyond The Wire
  '1189650', // Post Scriptum

  // Call of Duty Online / Live Service
  '1985810', // Call of Duty: Black Ops Cold War
  '1985820', // Call of Duty: Vanguard
  '2000950', // Call of Duty: Modern Warfare 2019
  '2075730', // Call of Duty: Modern Warfare II Open Beta
  '3595230', // Call of Duty: Modern Warfare II
  '3595270', // Call of Duty: Modern Warfare III
  '10190',   // CoD MW2 Multiplayer
  '42690',   // CoD MW3 Multiplayer
  '42710',   // CoD Black Ops Multiplayer
  '202990',  // CoD Black Ops II Multiplayer
  '209170',  // CoD Ghosts Multiplayer
  '209660',  // CoD Advanced Warfare Multiplayer
  '212910',  // CoD Black Ops II Zombies
  '393100',  // CoD MW Remastered Multiplayer
  '476620',  // CoD WWII Multiplayer

  // Ubisoft 100% Online
  '304390',  // For Honor
  '359550',  // Rainbow Six Siege
  '365590',  // The Division
  '524440',  // The Division PTS
  '623990',  // Rainbow Six Siege Test
  '654310',  // For Honor Public Test
  '2211280', // Roller Champions
  '2221490', // The Division 2
  '2290180', // Riders Republic
  '2379390', // Rainbow Six Extraction
  '2853730', // Skull and Bones

  // 2K & EA Sports
  '1785650', // TopSpin 2K25
  '1313860', // FIFA 21
  '1506830', // FIFA 22
  // EA Sports FC (Permitidos para activaciones offline y generador de licencias)
  // '2195250', // EA SPORTS FC 24
  // '2669320', // EA SPORTS FC 25
  // '3405690', // EA SPORTS FC 26
  // '4080220', // EA SPORTS FC 27
  '1016120', // PGA TOUR 2K21
  '1588010', // PGA TOUR 2K23
  '2385530', // PGA TOUR 2K25

  // Live Service / Survival Online
  '221100',  // DayZ
  '230410',  // Warframe
  '252490',  // Rust
  '381210',  // Dead by Daylight
  '578080',  // PUBG: BATTLEGROUNDS
  '594650',  // Hunt: Showdown 1896
  '770720',  // Hunt: Showdown Test
  '1085660', // Destiny 2
  '1097150', // Fall Guys
  '2073850', // THE FINALS

]);

export function isOnlineOnlyAppId(appId) {
  if (!appId) return false;
  return ONLINE_ONLY_STEAM_APPIDS.has(String(appId).trim());
}

// Lista de palabras clave que delatan juegos 100% online con servidores
const ONLINE_ONLY_KEYWORDS = [
  'rust',
  'dayz',
  'pubg',
  'rainbow six siege',
  'dead by daylight',
  'fallout 76',
  'hunt: showdown',
  'hunt showdown',
  'helldivers 2',
  'battlefield 2042',
  'warzone',
  'the division',
  'destiny 2',
  'overwatch',
  'scum',
  'conan exiles',
  'hell let loose',
  'throne and liberty',
  'the first descendant',
  'once human',
  'elite dangerous',
  'counter-strike: source',
  'counter-strike: condition zero',
  'counter-strike 2',
  'dota 2',
  'team fortress',
  'warframe',
  'paladins',
  'smite',
  'sea of thieves',
  'naraka',
  'black desert',
  'skull and bones',
  'marvel rivals',
  'lethal company',
  'phasmophobia',
  'among us',
  'golf it',
  'gang beasts',
  'pacify',
  'outlast trial',
  'dead or alive xtreme venus vacation',
  'metal gear survive',
  'naruto to boruto: shinobi striker',
  'ark: survival evolved',
  'ark: survival ascended',
  'the finals',
  'delta force',
  'party animals',
  'fall guys',
  'texas chain saw massacre',
  'con online',
  'nba 2k',
  'topspin',
  'top spin',
  'ea sports fc',
  'fc 24',
  'fc 25',
  'fc24',
  'fc25',
  'fifa ',
  'minecraft dungeons',
  'minecraft legends',
  'squad 44',
  'arma reforger',
  'hell let loose',
  'insurgency: sandstorm',
  'world war 3',
  'beyond the wire',
  'post scriptum',
  'black ops cold war',
  'vanguard',
  'modern warfare ii',
  'modern warfare iii',
  'rainbow six',
  'the division',
  'for honor',
  'riders republic',
  'roller champions',
  'xdefiant',
  'multiplayer',
  'multi-player',
  'dedicated server',
  'mod tools',
];

/**
 * Retorna true si un producto o juego es 100% online con servidores obligatorios
 * y por tanto NO es compatible con el modo historia/campaña offline ni con las promociones.
 */
export function isOnlineOnlySteamProduct(product) {
  if (!product) return false;
  const appId = String(product.app_id || product.appId || product.steamAppId || (String(product.id || '').startsWith('ryuu_') ? product.id.replace('ryuu_', '') : '')).trim();
  const rawName = (product.name || product.title || '').toLowerCase().trim();

  // 1. Excepciones explícitas de campañas offline individuales permitidas
  if (
    rawName.includes('mortal kombat') ||
    rawName.includes('red dead redemption') ||
    rawName.includes('left 4 dead') ||
    (rawName.startsWith('outlast') && !rawName.includes('trial')) ||
    (rawName.startsWith('final fantasy') && !rawName.includes('xiv') && !rawName.includes('14') && !rawName.includes('online')) ||
    rawName.includes('injustice') ||
    rawName.includes('wolf among us') ||
    rawName.includes('squadrons') ||
    rawName.includes('the forest') ||
    rawName.includes('sons of the forest') ||
    rawName.includes('raft') ||
    rawName.includes('valheim') ||
    rawName.includes('project zomboid') ||
    rawName.includes('terraria') ||
    (rawName.startsWith('fallout') && !rawName.includes('76')) ||
    rawName.includes('borderlands') ||
    rawName.includes('remnant') ||
    rawName.includes('deep rock galactic') ||
    rawName.includes('payday 2') ||
    rawName.includes('gotham knights') ||
    rawName.includes('suicide squad')
  ) {
    return false;
  }

  // 2. FFXIV Online específicamente (para no filtrar FFX ni FFXI si comparten id legacy)
  if (appId === '39210') {
    return rawName.includes('xiv') || rawName.includes('14') || rawName.includes('online');
  }

  // 3. Outlast Trials específicamente (para no filtrar Outlast 1 si comparten id legacy)
  if (appId === '238320') {
    return rawName.includes('trial');
  }

  // 4. Verificación por AppID estricto
  if (appId && isOnlineOnlyAppId(appId)) return true;

  if (!rawName) return false;

  // 4.0. Filtro estricto para Minecraft (requieren login Microsoft / Mojang)
  if (rawName.includes('minecraft dungeons') || rawName.includes('minecraft legends')) {
    return true;
  }

  // 4.01. Filtro para Shooters 100% multijugador sin campaña offline
  if (
    rawName === 'squad' ||
    rawName.startsWith('squad ') ||
    rawName.includes('arma reforger') ||
    rawName.includes('hell let loose') ||
    rawName.includes('insurgency: sandstorm') ||
    rawName.includes('post scriptum') ||
    rawName.includes('world war 3') ||
    rawName.includes('beyond the wire')
  ) {
    return true;
  }

  // 4.02. Filtro para Call of Duty online obligatorio (HQ, Ricochet, Warzone)
  if (
    rawName.includes('warzone') ||
    rawName.includes('cold war') ||
    rawName.includes('vanguard') ||
    rawName.includes('modern warfare ii') ||
    rawName.includes('modern warfare iii') ||
    (rawName.includes('call of duty') && (rawName.includes('zombie') || rawName.includes('zombies')))
  ) {
    return true;
  }

  // 4.03. Filtro para Ubisoft 100% online (conservando Assassin's Creed y Far Cry)
  if (
    rawName.includes('rainbow six') ||
    rawName.includes('the division') ||
    rawName.includes('for honor') ||
    rawName.includes('skull and bones') ||
    rawName.includes('riders republic') ||
    rawName.includes('roller champions') ||
    rawName.includes('xdefiant')
  ) {
    return true;
  }

  // 4.1. Filtro estricto para ejecutables secundarios (Multiplayer, Dedicated Server, Mod Tools, Zombies de CoD)
  if (
    rawName.includes('multiplayer') ||
    rawName.includes('multi-player') ||
    rawName.includes('dedicated server') ||
    rawName.includes('mod tools') ||
    (rawName.includes('call of duty') && (rawName.includes('zombie') || rawName.includes('zombies')))
  ) {
    return true;
  }

  // 5. Verificación por nombre / palabras clave
  for (const kw of ONLINE_ONLY_KEYWORDS) {
    if (rawName === kw || rawName.startsWith(`${kw} `) || rawName.endsWith(` ${kw}`) || rawName.includes(` ${kw} `) || rawName.includes(kw)) {
      return true;
    }
  }

  if (product.isOnlineOnly || product.onlyOnline) return true;
  return false;
}


