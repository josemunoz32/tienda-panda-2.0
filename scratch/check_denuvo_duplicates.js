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

// All games extracted from the 20 photos:
const candidateGames = [
  // 15k games (Ultra rare / sports / ultra high demand)
  { name: "EA SPORTS FC 26", price: 15000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "15k" },
  { name: "EA SPORTS Madden NFL 26", price: 15000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "15k" },
  { name: "EA SPORTS PGA TOUR", price: 15000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "15k" },
  { name: "Football Manager 26", price: 15000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "15k" },
  { name: "WWE 2K26", price: 15000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "15k" },
  { name: "Star Wars Outlaws", price: 15000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "15k" },

  // 8k games (user explicitly asked F1 25, Black Myth Wukong, MH Wilds, Borderlands 4, AC Shadows, RE Requiem, Stellar Blade, Crimson Desert, Mafia The Old Country at 8k too!)
  { name: "F1 25", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Black Myth: Wukong", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Monster Hunter Wilds", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Borderlands 4", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Assassin's Creed Shadows", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Resident Evil Requiem", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Stellar Blade", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Crimson Desert", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Mafia: The Old Country", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },

  // Rest of Denuvo games from the 20 photos (at 8.000)
  { name: "Warhammer 40,000: Chaos Gate - Daemonhunters", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Warhammer Age of Sigmar: Realms of Ruin", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Yakuza Kiwami 3 & Dark Ties", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Yakuza: Like a Dragon", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Total War: WARHAMMER III", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Total War: WARHAMMER II", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Total War: WARHAMMER", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Total War: Three Kingdoms", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Two Point Museum", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Undisputed", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Valkyria Chronicles 4 Complete Edition", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Soul Hackers 2", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Street Fighter 6", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Suicide Squad: Kill the Justice League", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Sword Art Online: Fatal Bullet", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Sonic Frontiers", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Sonic Origins Plus", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Sonic Racing CrossWorlds", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Sonic Superstars", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "SONIC X SHADOW GENERATIONS", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Sonic Forces", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Shin Megami Tensei III Nocturne HD Remaster", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "SHINOBI: Art of Vengeance", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Sniper Elite 5", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Sniper Elite 4", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "RAIDOU Remastered", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Persona 5 Strikers", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Persona 5 Tactica", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Persona 5 Royal", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Persona 4 Golden", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Persona 4 Arena Ultimax", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Persona 3 Reload", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Persona 3 Portable", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Planet Coaster 2", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Planet Zoo", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "PRAGMATA", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Metaphor: ReFantazio", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Monster Hunter Stories 3", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Mortal Kombat 1", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Marvel's Midnight Suns", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Mega Man Star Force Legacy Collection", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Like a Dragon: Infinite Wealth", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Like a Dragon: Ishin!", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Like a Dragon: Pirate Yakuza in Hawaii", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Like a Dragon Gaiden: The Man Who Erased His Name", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Lost Judgment", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Judgment", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Jurassic World Evolution 3", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "LEGO Batman: Legacy of the Dark Knight", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Life is Strange: Reunion", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Hogwarts Legacy", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Dead Space Remake", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Demon Slayer: Kimetsu no Yaiba - The Hinokami Chronicles 1 & 2", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Echoes of Aincrad", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Atomfall", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Construction Simulator", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Assassin's Creed Black Flag Resynced", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Avatar: Frontiers of Pandora", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Prince of Persia: The Lost Crown", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Need for Speed Unbound", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Lost in Random", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Fernbus Simulator", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "The Bus", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" },
  { name: "Hello Kitty Island Adventure", price: 8000, promo: "Activación por Código + 2 Juegos de Regalo", tier: "8k" }
];

async function checkDuplicates() {
  const snap = await getDocs(collection(db, 'products'));
  const existingMap = new Map();
  snap.forEach(d => {
    const data = d.data();
    if (data.name) {
      existingMap.set(normalize(data.name), { id: d.id, name: data.name, priceCLP: data.priceCLP, plataforma: data.plataforma });
    }
  });

  console.log(`\n--- ANÁLISIS DE DUPLICADOS EN LOS ${snap.size} PRODUCTOS DE FIRESTORE ---`);
  const toAdd = [];
  const alreadyInDb = [];

  candidateGames.forEach(cg => {
    const norm = normalize(cg.name);
    // exact or partial check
    let found = null;
    for (const [k, v] of existingMap.entries()) {
      if (k === norm || (norm.length > 6 && (k.includes(norm) || norm.includes(k)))) {
        found = v;
        break;
      }
    }

    if (found) {
      alreadyInDb.push({ candidate: cg, matchedWith: found });
    } else {
      toAdd.push(cg);
    }
  });

  console.log(`\nJUEGOS QUE YA EXISTEN EN LA BD (${alreadyInDb.length}):`);
  alreadyInDb.forEach(x => {
    console.log(` - Candidato: "${x.candidate.name}" -> Ya existe como: "${x.matchedWith.name}" (Precio actual: $${x.matchedWith.priceCLP || 'N/A'}, Plataforma: ${x.matchedWith.plataforma})`);
  });

  console.log(`\nJUEGOS NUEVOS PARA AGREGAR (${toAdd.length}):`);
  toAdd.forEach(x => {
    console.log(` + [${x.tier}] ${x.name} -> $${x.price} CLP (${x.promo})`);
  });
}

checkDuplicates().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
