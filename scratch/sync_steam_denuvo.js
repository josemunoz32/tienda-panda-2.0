import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
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

const auth = getAuth(app);
const db = getFirestore(app);

const STEAM_CAT_ID = 'lW3JaYVl6iDINZI57WE1'; // Categoría "Juegos Steam"

function normalize(s) {
  return (s || '').toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Complete list configured exactly as requested by user:
// F1 25, Black Myth Wukong, Monster Hunter Wilds, Borderlands 4, AC Shadows, RE Requiem, Stellar Blade, Crimson Desert, Mafia The Old Country at $8.000!
// Top scarce / sports (FC 26, Madden 26, PGA Tour, FM 26, WWE 2K26, Outlaws) at $15.000!
// Rest of Denuvo games at $8.000!
const denuvoGames = [
  // 15K TIER
  { name: "EA SPORTS FC 26", priceCLP: "15000", priceUSD: "16.50", tier: "15k" },
  { name: "EA SPORTS Madden NFL 26", priceCLP: "15000", priceUSD: "16.50", tier: "15k" },
  { name: "EA SPORTS PGA TOUR", priceCLP: "15000", priceUSD: "16.50", tier: "15k" },
  { name: "Football Manager 26", priceCLP: "15000", priceUSD: "16.50", tier: "15k" },
  { name: "WWE 2K26", priceCLP: "15000", priceUSD: "16.50", tier: "15k" },
  { name: "Star Wars Outlaws", priceCLP: "15000", priceUSD: "16.50", tier: "15k" },

  // 8K TIER (PEDIDOS EXPLÍCITAMENTE A 8 MIL)
  { name: "F1 25", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Black Myth: Wukong", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Monster Hunter Wilds", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Borderlands 4", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Assassin's Creed Shadows", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Resident Evil Requiem", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Stellar Blade", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Crimson Desert", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Mafia: The Old Country", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },

  // 8K TIER (RESTO DE JUEGOS DE LAS 20 FOTOS)
  { name: "Warhammer 40,000: Chaos Gate - Daemonhunters", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Warhammer Age of Sigmar: Realms of Ruin", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Yakuza Kiwami 3 & Dark Ties", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Yakuza: Like a Dragon", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Total War: WARHAMMER III", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Total War: WARHAMMER II", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Total War: WARHAMMER", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Total War: Three Kingdoms", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Two Point Museum", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Undisputed", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Valkyria Chronicles 4 Complete Edition", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Soul Hackers 2", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Street Fighter 6", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Suicide Squad: Kill the Justice League", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Sword Art Online: Fatal Bullet", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Sonic Frontiers", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Sonic Origins Plus", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Sonic Racing CrossWorlds", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Sonic Superstars", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "SONIC X SHADOW GENERATIONS", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Sonic Forces", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Shin Megami Tensei III Nocturne HD Remaster", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "SHINOBI: Art of Vengeance", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Sniper Elite 5", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Sniper Elite 4", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "RAIDOU Remastered", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Persona 5 Strikers", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Persona 5 Tactica", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Persona 5 Royal", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Persona 4 Golden", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Persona 4 Arena Ultimax", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Persona 3 Reload", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Persona 3 Portable", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Planet Coaster 2", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Planet Zoo", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "PRAGMATA", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Metaphor: ReFantazio", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Monster Hunter Stories 3", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Mortal Kombat 1", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Marvel's Midnight Suns", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Mega Man Star Force Legacy Collection", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Like a Dragon: Infinite Wealth", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Like a Dragon: Ishin!", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Like a Dragon: Pirate Yakuza in Hawaii", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Like a Dragon Gaiden: The Man Who Erased His Name", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Lost Judgment", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Judgment", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Jurassic World Evolution 3", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "LEGO Batman: Legacy of the Dark Knight", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Life is Strange: Reunion", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Hogwarts Legacy", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Dead Space Remake", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Demon Slayer: Kimetsu no Yaiba - The Hinokami Chronicles 1 & 2", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Echoes of Aincrad", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Atomfall", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Construction Simulator", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Assassin's Creed Black Flag Resynced", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Avatar: Frontiers of Pandora", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Prince of Persia: The Lost Crown", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Need for Speed Unbound", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Lost in Random", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Fernbus Simulator", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "The Bus", priceCLP: "8000", priceUSD: "8.90", tier: "8k" },
  { name: "Hello Kitty Island Adventure", priceCLP: "8000", priceUSD: "8.90", tier: "8k" }
];

async function applySync(dryRun = false) {
  console.log(`=== INICIANDO ${dryRun ? 'SIMULACIÓN (DRY RUN)' : 'APLICACIÓN REAL'} DE PRECIOS STEAM DENUVO ===`);

  if (!dryRun) {
    const email = "steamseeder_pandastore@gmail.com";
    const password = "PandaStoreSteam123!";
    const res = await signInWithEmailAndPassword(auth, email, password);
    console.log("Sesión autenticada como:", res.user.email);
  }

  const snap = await getDocs(collection(db, 'products'));
  const steamProducts = [];

  snap.forEach(d => {
    const data = d.data();
    if (data.categoryId === STEAM_CAT_ID || data.plataforma === 'Steam' || (data.tags && data.tags.includes('Steam'))) {
      steamProducts.push({ id: d.id, ...data, norm: normalize(data.name) });
    }
  });

  console.log(`Total de juegos existentes en catálogo Steam: ${steamProducts.length}`);

  let updatedCount = 0;
  let createdCount = 0;
  const processedDocIds = new Set();

  for (const game of denuvoGames) {
    const norm = normalize(game.name);
    
    // Strict matching first to avoid multi-match like Warhammer I / II / III
    let match = steamProducts.find(p => !processedDocIds.has(p.id) && p.norm === norm);
    if (!match) {
      match = steamProducts.find(p => !processedDocIds.has(p.id) && (
        p.name.toLowerCase().replace(/[^a-z0-9]/g, '') === game.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      ));
    }
    if (!match) {
      match = steamProducts.find(p => !processedDocIds.has(p.id) && (
        p.name.toLowerCase().startsWith(game.name.toLowerCase()) || 
        game.name.toLowerCase().startsWith(p.name.toLowerCase())
      ));
    }

    const promoText = `ACTIVACIÓN POR CÓDIGO + 2 JUEGOS DE REGALO A ELECCIÓN ($${parseInt(game.priceCLP).toLocaleString('es-CL')})`;
    const tags = ["Steam", "Denuvo", "Activación", game.tier === "15k" ? "Exclusivo" : "Destacado", "Regalo2Juegos"];

    if (match) {
      processedDocIds.add(match.id);
      console.log(`[UPDATE] ${match.name} (ID: ${match.id}) -> $${game.priceCLP} CLP ($${game.priceUSD} USD)`);
      if (!dryRun) {
        await updateDoc(doc(db, "products", match.id), {
          priceCLP: game.priceCLP,
          priceUSD: game.priceUSD,
          pricePrimariaCLP: game.priceCLP,
          pricePrimariaUSD: game.priceUSD,
          priceSecundariaCLP: game.priceCLP,
          priceSecundariaUSD: game.priceUSD,
          comentario: promoText,
          isSteamPromoEligible: false,
          isDenuvoActivation: true,
          tags: Array.from(new Set([...(match.tags || []), ...tags])),
          updatedAt: new Date().toISOString()
        });
      }
      updatedCount++;
    } else {
      console.log(`[CREATE] ${game.name} -> $${game.priceCLP} CLP ($${game.priceUSD} USD)`);
      if (!dryRun) {
        const newDocRef = doc(collection(db, "products"));
        await setDoc(newDocRef, {
          name: game.name,
          priceCLP: game.priceCLP,
          priceUSD: game.priceUSD,
          pricePrimariaCLP: game.priceCLP,
          pricePrimariaUSD: game.priceUSD,
          priceSecundariaCLP: game.priceCLP,
          priceSecundariaUSD: game.priceUSD,
          categoryId: STEAM_CAT_ID,
          plataforma: "Steam",
          genero: "Acción / Aventura / Deportes",
          idioma: "Español / Multilenguaje",
          anio: "2026",
          comentario: promoText,
          imageUrl: "",
          tags: tags,
          isSteamPromoEligible: false,
          isDenuvoActivation: true,
          stock: "100",
          createdAt: new Date().toISOString()
        });
      }
      createdCount++;
    }
  }

  console.log(`\nRESUMEN FINAL:`);
  console.log(`- Juegos actualizados en catálogo Steam: ${updatedCount}`);
  console.log(`- Juegos nuevos creados en catálogo Steam: ${createdCount}`);
  console.log(`- Total procesados sin duplicados: ${updatedCount + createdCount}`);
}

const isExecute = process.argv.includes('--execute');
applySync(!isExecute).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
