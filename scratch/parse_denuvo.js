const fs = require('fs');

const rawInput = `
01 Atomfall · 801800 · Free
02 Black Myth: Wukong · 2358720 · Free
03 Borderlands® 4 · 1285190 · Free
04 Construction Simulator · 1273400 · Free
05 Crimson Desert · 3321460 · Free
06 Dead Space · 1693980 · Free
07 Demon Slayer -Kimetsu no Yaiba- The Hinokami Chronicles · 1490890 · Free
08 Demon Slayer -Kimetsu no Yaiba- The Hinokami Chronicles 2 · 2928600 · Free
09 DIRT 5 · 1038250 · Free
10 Echoes of Aincrad · 2244210 · Free
11 F1® 25 · 3059520 · Free
12 FAR: Changing Tides · 1570010 · Free
13 Fernbus Simulator · 427100 · Free
14 Football Manager 26 · 3551340 · Free
15 Hatsune Miku: Project DIVA Mega Mix+ · 1761390 · Free
16 Hello Kitty Island Adventure · 2495100 · Free
17 Hogwarts Legacy · 990080 · Free
18 Judgment · 2058180 · Free
19 Jurassic World Evolution 3 · 2958130 · Free
20 LEGO® Batman™: Legacy of the Dark Knight · 2215200 · Free
21 Life is Strange: Reunion · 2624870 · Free
22 Like a Dragon Gaiden: The Man Who Erased His Name · 2375550 · Free
23 Like a Dragon: Infinite Wealth · 2072450 · Free
24 Like a Dragon: Ishin! · 1805480 · Free
25 Like a Dragon: Pirate Yakuza in Hawaii · 3061810 · Free
26 Lost Judgment · 2058190 · Free
27 Mafia: The Old Country · 1941540 · Free
28 Maneater · 629820 · Free
29 Marvel's Midnight Suns · 368260 · Free
30 METAL GEAR SOLID V: THE PHANTOM PAIN · 287700 · Free
31 Metaphor: ReFantazio · 2679460 · Free
32 Middle-earth™: Shadow of War™ · 356190 · Free
33 Monster Hunter Stories 3: Twisted Reflection · 2852190 · Free
34 Monster Hunter Wilds · 2246340 · Free
35 Mortal Kombat 1 · 1971870 · Free
36 Persona 3 Portable · 1809700 · Free
37 Persona 3 Reload · 2161700 · Free
38 Persona 4 Arena Ultimax · 1602010 · Free
39 Persona 4 Golden · 1113000 · Free
40 Persona 5 Royal · 1687950 · Free
41 Persona 5 Strikers · 1382330 · Free
42 Persona 5 Tactica · 2254740 · Free
43 Planet Coaster 2 · 2688950 · Free
44 Planet Zoo · 703080 · Free
45 PRAGMATA · 3357650 · Free
46 RAIDOU Remastered: The Mystery of the Soulless Army · 2288350 · Free
47 Resident Evil Requiem · 3764200 · Free
48 Shin Megami Tensei III Nocturne HD Remaster · 1413480 · Free
49 Shin Megami Tensei V: Vengeance · 1875830 · Free
50 SHINOBI: Art of Vengeance · 2361770 · Free
51 Sid Meier's Civilization VII · 1295660 · Free
52 Sniper Elite 4 · 312660 · Free
53 Sniper Elite 5 · 1029690 · Free
54 Sniper Elite: Resistance · 2169200 · Free
55 Sonic Forces · 637100 · Free
56 Sonic Frontiers · 1237320 · Free
57 Sonic Origins Plus · 1794960 · Free
58 Sonic Racing: CrossWorlds · 2486820 · Free
59 Sonic Superstars · 2022670 · Free
60 SONIC X SHADOW GENERATIONS · 2513280 · Free
61 Soul Hackers 2 · 1777620 · Free
62 Stellar Blade™ · 3489700 · Free
63 Street Fighter™ 6 · 1364780 · Free
64 Suicide Squad: Kill the Justice League · 315210 · Free
65 Sword Art Online: Fatal Bullet · 626690 · Free
66 The Adventures of Elliot: The Millennium Tales · 3483510 · Free
67 The Bus · 491540 · Free
68 Total War: THREE KINGDOMS · 779340 · Free
69 Total War: WARHAMMER · 364360 · Free
70 Total War: WARHAMMER II · 594570 · Free
71 Total War: WARHAMMER III · 1142710 · Free
72 Two Point Museum · 2185060 · Free
73 Undisputed · 1451190 · Free
74 Valkyria Chronicles 4 Complete Edition · 790820 · Free
75 Warhammer 40,000: Chaos Gate - Daemonhunters · 1611910 · Free
76 Warhammer Age of Sigmar: Realms of Ruin · 1844380 · Free
77 WWE 2K26 · 3717070 · Free
78 Yakuza Kiwami 3 & Dark Ties · 3937550 · Free
79 Yakuza: Like a Dragon · 1235140 · Free
`;

const ubiInput = `
01 Assassin's Creed Black Flag Resynced · 66088 · Free
02 Assassin's Creed Shadows · 1081 · Free
03 Avatar: Frontiers of Pandora · 4740 · Free
04 Far Cry 6 · 5266 · Free
05 Prince of Persia The Lost Crown · 6145 · Free
06 Star Wars Outlaws · 17903 · Free
07 Tom Clancy's Ghost Recon® Wildlands · 1771 · Free
`;

const eaInput = `
01 EA SPORTS FC 26 · 16425677 · Free
02 EA SPORTS™ Madden NFL 26 · 16425751 · Free
03 EA SPORTS™ PGA TOUR™ · 16425629 · Free
04 Lost in Random · 198188 · Free
05 Need for Speed™ Payback · 1035208 · Free
06 Need for Speed™ Unbound · 196787 · Free
`;

function parseLines(text, price, platform) {
  return text.trim().split('\n').map(l => {
    const parts = l.split('·').map(s => s.trim());
    if (parts.length >= 2) {
      const name = parts[0].replace(/^\d+\s+/, '').trim();
      const appId = parts[1].trim();
      return {
        name,
        app_id: appId,
        priceCLP: price,
        platform,
        isTopTier: price >= 15000,
        imageUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`
      };
    }
    return null;
  }).filter(Boolean);
}

const steamGames = parseLines(rawInput, 8000, 'Steam');
const ubiGames = parseLines(ubiInput, 12000, 'Ubisoft');
const eaGames = parseLines(eaInput, 15000, 'EA');

// Add FC 25 as top tier EA game if not present
eaGames.unshift({
  name: 'EA SPORTS FC 25',
  app_id: '2195250',
  priceCLP: 15000,
  platform: 'EA',
  isTopTier: true,
  imageUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/2195250/header.jpg'
});

const allVipGames = [...eaGames, ...ubiGames, ...steamGames];
console.log('Total VIP games parsed:', allVipGames.length);

// Compare with existing steam_import_data.json
const catalog = JSON.parse(fs.readFileSync('src/assets/steam_import_data.json'));
const catalogIds = new Set(catalog.map(g => String(g.app_id)));
const catalogNames = new Set(catalog.map(g => (g.name || '').toLowerCase().trim()));

let addedCount = 0;
let updatedPriceCount = 0;

allVipGames.forEach(vip => {
  const existing = catalog.find(g => String(g.app_id) === String(vip.app_id) || (g.name || '').toLowerCase().trim() === vip.name.toLowerCase().trim());
  if (existing) {
    existing.priceCLP = String(vip.priceCLP);
    existing.priceUSD = (vip.priceCLP / 900).toFixed(2);
    existing.pricePrimariaCLP = String(vip.priceCLP);
    existing.pricePrimariaUSD = (vip.priceCLP / 900).toFixed(2);
    existing.priceSecundariaCLP = String(vip.priceCLP);
    existing.priceSecundariaUSD = (vip.priceCLP / 900).toFixed(2);
    existing.isGreenTier = vip.priceCLP >= 4990;
    existing.isDenuvoActivation = true;
    existing.tags = Array.isArray(existing.tags) ? [...new Set([...existing.tags, 'VIP', 'Estreno', String(vip.priceCLP)])] : ['Steam', 'VIP', String(vip.priceCLP)];
    updatedPriceCount++;
  } else {
    catalog.push({
      name: vip.name,
      priceCLP: String(vip.priceCLP),
      priceUSD: (vip.priceCLP / 900).toFixed(2),
      pricePrimariaCLP: String(vip.priceCLP),
      pricePrimariaUSD: (vip.priceCLP / 900).toFixed(2),
      priceSecundariaCLP: String(vip.priceCLP),
      priceSecundariaUSD: (vip.priceCLP / 900).toFixed(2),
      plataforma: 'Steam',
      genero: vip.priceCLP >= 15000 ? 'Steam Premium' : 'Steam Normal',
      idioma: 'Español / Multilenguaje',
      anio: '2026',
      comentario: `ESTRENO EXCLUSIVO VIP ($${vip.priceCLP.toLocaleString('es-CL')})`,
      tags: ['Steam', 'VIP', 'Estreno', String(vip.priceCLP)],
      isGreenTier: true,
      isDenuvoActivation: true,
      stock: '1000',
      imageUrl: vip.imageUrl,
      app_id: vip.app_id,
      image: vip.imageUrl
    });
    addedCount++;
  }
});

console.log(`Updated prices of ${updatedPriceCount} games, Added ${addedCount} new games.`);
console.log(`New catalog length: ${catalog.length}`);

fs.writeFileSync('src/assets/steam_import_data.json', JSON.stringify(catalog, null, 2));

// Also generate VIP_HIGHLIGHT_GAMES array for src/utils/vipGames.js
const vipExport = allVipGames.map(v => {
  const cleanId = 'vip-' + v.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return {
    id: cleanId,
    name: v.name,
    priceCLP: v.priceCLP,
    isTopTier: v.priceCLP >= 15000,
    app_id: v.app_id,
    imageUrl: v.imageUrl,
    platform: v.platform
  };
});

fs.writeFileSync('src/utils/vipGamesData.json', JSON.stringify(vipExport, null, 2));
console.log('Saved vipGamesData.json successfully!');
