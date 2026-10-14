with open('src/utils/steamCatalogCache.js', 'r', encoding='utf-8') as f:
    content = f.read().replace('\r\n', '\n')

# AppIDs to add to ONLINE_ONLY_STEAM_APPIDS
extra_appids = """
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
  '1811260', // FIFA 23
  '2195250', // EA SPORTS FC 24
  '2669320', // EA SPORTS FC 25
  '3405690', // EA SPORTS FC 26
  '4080220', // EA SPORTS FC 27
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
"""

old_appids_end = "  '236130',  // Forza Horizon 5 con online\n]);"
new_appids_end = f"  '236130',  // Forza Horizon 5 con online\n{extra_appids}\n]);"
if old_appids_end in content:
    content = content.replace(old_appids_end, new_appids_end, 1)

# Keywords to add to ONLINE_ONLY_KEYWORDS
extra_keywords = """  'minecraft dungeons',
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
  'mod tools',"""

old_keywords_end = "  'fifa '\n];"
new_keywords_end = f"  'fifa ',\n{extra_keywords}\n];"
if old_keywords_end in content:
    content = content.replace(old_keywords_end, new_keywords_end, 1)

# Logic checks in isOnlineOnlySteamProduct
old_logic = "  // 4.1. Filtro estricto para ejecutables secundarios (Multiplayer, Dedicated Server, Mod Tools, Zombies de CoD)"
new_logic = """  // 4.0. Filtro estricto para Minecraft (requieren login Microsoft / Mojang)
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

  // 4.1. Filtro estricto para ejecutables secundarios (Multiplayer, Dedicated Server, Mod Tools, Zombies de CoD)"""

if old_logic in content:
    content = content.replace(old_logic, new_logic, 1)

with open('src/utils/steamCatalogCache.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("steamCatalogCache.js updated with all excluded games and AppIDs!")
