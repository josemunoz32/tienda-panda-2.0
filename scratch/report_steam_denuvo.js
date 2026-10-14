import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const app = initializeApp({
  apiKey: envVars.REACT_APP_FIREBASE_API_KEY,
  authDomain: envVars.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: envVars.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.REACT_APP_FIREBASE_APP_ID
});

const db = getFirestore(app);

function normalize(s) {
  return (s || '').toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// 64 games identified across the 20 screenshots:
const candidateGames = [
  // TIER 15.000 CLP (Ultra exclusivos / pocos tokens / alta demanda deportiva o franquicia)
  { name: "EA SPORTS FC 26", targetPrice: 15000, tier: "15k" },
  { name: "EA SPORTS Madden NFL 26", targetPrice: 15000, tier: "15k" },
  { name: "EA SPORTS PGA TOUR", targetPrice: 15000, tier: "15k" },
  { name: "Football Manager 26", targetPrice: 15000, tier: "15k" },
  { name: "WWE 2K26", targetPrice: 15000, tier: "15k" },
  { name: "Star Wars Outlaws", targetPrice: 15000, tier: "15k" },

  // TIER 8.000 CLP (Los que pediste específicamente a 8 mil + resto de Denuvo con tokens)
  { name: "F1 25", targetPrice: 8000, tier: "8k" },
  { name: "Black Myth: Wukong", targetPrice: 8000, tier: "8k" },
  { name: "Monster Hunter Wilds", targetPrice: 8000, tier: "8k" },
  { name: "Borderlands 4", targetPrice: 8000, tier: "8k" },
  { name: "Assassin's Creed Shadows", targetPrice: 8000, tier: "8k" },
  { name: "Resident Evil Requiem", targetPrice: 8000, tier: "8k" },
  { name: "Stellar Blade", targetPrice: 8000, tier: "8k" },
  { name: "Crimson Desert", targetPrice: 8000, tier: "8k" },
  { name: "Mafia: The Old Country", targetPrice: 8000, tier: "8k" },

  // Resto de Denuvo de las 20 fotos a 8.000 CLP
  { name: "Warhammer 40,000: Chaos Gate - Daemonhunters", targetPrice: 8000, tier: "8k" },
  { name: "Warhammer Age of Sigmar: Realms of Ruin", targetPrice: 8000, tier: "8k" },
  { name: "Yakuza Kiwami 3 & Dark Ties", targetPrice: 8000, tier: "8k" },
  { name: "Yakuza: Like a Dragon", targetPrice: 8000, tier: "8k" },
  { name: "Total War: WARHAMMER III", targetPrice: 8000, tier: "8k" },
  { name: "Total War: WARHAMMER II", targetPrice: 8000, tier: "8k" },
  { name: "Total War: WARHAMMER", targetPrice: 8000, tier: "8k" },
  { name: "Total War: Three Kingdoms", targetPrice: 8000, tier: "8k" },
  { name: "Two Point Museum", targetPrice: 8000, tier: "8k" },
  { name: "Undisputed", targetPrice: 8000, tier: "8k" },
  { name: "Valkyria Chronicles 4 Complete Edition", targetPrice: 8000, tier: "8k" },
  { name: "Soul Hackers 2", targetPrice: 8000, tier: "8k" },
  { name: "Street Fighter 6", targetPrice: 8000, tier: "8k" },
  { name: "Suicide Squad: Kill the Justice League", targetPrice: 8000, tier: "8k" },
  { name: "Sword Art Online: Fatal Bullet", targetPrice: 8000, tier: "8k" },
  { name: "Sonic Frontiers", targetPrice: 8000, tier: "8k" },
  { name: "Sonic Origins Plus", targetPrice: 8000, tier: "8k" },
  { name: "Sonic Racing CrossWorlds", targetPrice: 8000, tier: "8k" },
  { name: "Sonic Superstars", targetPrice: 8000, tier: "8k" },
  { name: "SONIC X SHADOW GENERATIONS", targetPrice: 8000, tier: "8k" },
  { name: "Sonic Forces", targetPrice: 8000, tier: "8k" },
  { name: "Shin Megami Tensei III Nocturne HD Remaster", targetPrice: 8000, tier: "8k" },
  { name: "SHINOBI: Art of Vengeance", targetPrice: 8000, tier: "8k" },
  { name: "Sniper Elite 5", targetPrice: 8000, tier: "8k" },
  { name: "Sniper Elite 4", targetPrice: 8000, tier: "8k" },
  { name: "RAIDOU Remastered", targetPrice: 8000, tier: "8k" },
  { name: "Persona 5 Strikers", targetPrice: 8000, tier: "8k" },
  { name: "Persona 5 Tactica", targetPrice: 8000, tier: "8k" },
  { name: "Persona 5 Royal", targetPrice: 8000, tier: "8k" },
  { name: "Persona 4 Golden", targetPrice: 8000, tier: "8k" },
  { name: "Persona 4 Arena Ultimax", targetPrice: 8000, tier: "8k" },
  { name: "Persona 3 Reload", targetPrice: 8000, tier: "8k" },
  { name: "Persona 3 Portable", targetPrice: 8000, tier: "8k" },
  { name: "Planet Coaster 2", targetPrice: 8000, tier: "8k" },
  { name: "Planet Zoo", targetPrice: 8000, tier: "8k" },
  { name: "PRAGMATA", targetPrice: 8000, tier: "8k" },
  { name: "Metaphor: ReFantazio", targetPrice: 8000, tier: "8k" },
  { name: "Monster Hunter Stories 3", targetPrice: 8000, tier: "8k" },
  { name: "Mortal Kombat 1", targetPrice: 8000, tier: "8k" },
  { name: "Marvel's Midnight Suns", targetPrice: 8000, tier: "8k" },
  { name: "Mega Man Star Force Legacy Collection", targetPrice: 8000, tier: "8k" },
  { name: "Like a Dragon: Infinite Wealth", targetPrice: 8000, tier: "8k" },
  { name: "Like a Dragon: Ishin!", targetPrice: 8000, tier: "8k" },
  { name: "Like a Dragon: Pirate Yakuza in Hawaii", targetPrice: 8000, tier: "8k" },
  { name: "Like a Dragon Gaiden: The Man Who Erased His Name", targetPrice: 8000, tier: "8k" },
  { name: "Lost Judgment", targetPrice: 8000, tier: "8k" },
  { name: "Judgment", targetPrice: 8000, tier: "8k" },
  { name: "Jurassic World Evolution 3", targetPrice: 8000, tier: "8k" },
  { name: "LEGO Batman: Legacy of the Dark Knight", targetPrice: 8000, tier: "8k" },
  { name: "Life is Strange: Reunion", targetPrice: 8000, tier: "8k" },
  { name: "Hogwarts Legacy", targetPrice: 8000, tier: "8k" },
  { name: "Dead Space Remake", targetPrice: 8000, tier: "8k" },
  { name: "Demon Slayer: Kimetsu no Yaiba - The Hinokami Chronicles 1 & 2", targetPrice: 8000, tier: "8k" },
  { name: "Echoes of Aincrad", targetPrice: 8000, tier: "8k" },
  { name: "Atomfall", targetPrice: 8000, tier: "8k" },
  { name: "Construction Simulator", targetPrice: 8000, tier: "8k" },
  { name: "Assassin's Creed Black Flag Resynced", targetPrice: 8000, tier: "8k" },
  { name: "Avatar: Frontiers of Pandora", targetPrice: 8000, tier: "8k" },
  { name: "Prince of Persia: The Lost Crown", targetPrice: 8000, tier: "8k" },
  { name: "Need for Speed Unbound", targetPrice: 8000, tier: "8k" },
  { name: "Lost in Random", targetPrice: 8000, tier: "8k" },
  { name: "Fernbus Simulator", targetPrice: 8000, tier: "8k" },
  { name: "The Bus", targetPrice: 8000, tier: "8k" },
  { name: "Hello Kitty Island Adventure", targetPrice: 8000, tier: "8k" }
];

async function generateReport() {
  const snap = await getDocs(collection(db, 'products'));
  const steamProducts = [];
  const otherProducts = [];

  snap.forEach(d => {
    const data = d.data();
    const item = { id: d.id, ...data, norm: normalize(data.name) };
    if (data.plataforma === 'Steam' || (data.tags && data.tags.includes('Steam'))) {
      steamProducts.push(item);
    } else {
      otherProducts.push(item);
    }
  });

  console.log(`\nBase de datos actual: ${steamProducts.length} juegos en categoría Steam, ${otherProducts.length} en otras plataformas.`);

  const toUpdateSteam = [];
  const toCreateSteam = [];

  for (const c of candidateGames) {
    const norm = normalize(c.name);
    // Find matching in steamProducts
    let match = steamProducts.find(p => p.norm === norm || p.name.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(p.name.toLowerCase()));
    
    if (match) {
      toUpdateSteam.push({ candidate: c, existing: match });
    } else {
      toCreateSteam.push(c);
    }
  }

  console.log(`\n=== 1. JUEGOS QUE YA ESTÁN EN STEAM Y SE ACTUALIZARÁN DE PRECIO/PROMO (${toUpdateSteam.length}) ===`);
  toUpdateSteam.forEach(u => {
    console.log(`[ACTUALIZAR] "${u.existing.name}" (ID: ${u.existing.id})`);
    console.log(`  - Precio actual: $${u.existing.priceCLP} -> NUEVO: $${u.candidate.targetPrice} CLP`);
    console.log(`  - Nueva Promo: Activación por Código + 2 Juegos de Regalo`);
  });

  console.log(`\n=== 2. JUEGOS NUEVOS QUE SE AGREGARÁN A STEAM (${toCreateSteam.length}) ===`);
  toCreateSteam.forEach(c => {
    console.log(`[AGREGAR] "${c.name}" -> $${c.targetPrice} CLP (Activación por Código + 2 Juegos de Regalo)`);
  });
}

generateReport().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
