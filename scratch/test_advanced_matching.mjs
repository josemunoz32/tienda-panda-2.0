import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import * as dotenv from "dotenv";
dotenv.config();

const app = initializeApp({
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

// Diccionario de equivalencias español <-> inglés <-> alias comunes
const GAME_ALIASES = [
  // Pokémon
  { canonical: "pokemon escudo", aliases: ["pokemon shield", "pokemon escud", "pokemonescudo", "pokemonshield"] },
  { canonical: "pokemon espada", aliases: ["pokemon sword", "pokemonespada", "pokemonsword"] },
  { canonical: "pokemon diamante brillante", aliases: ["pokemon brilliant diamond", "pokemondiamantebrillante", "pokemonbrilliantdiamond"] },
  { canonical: "pokemon perla reluciente", aliases: ["pokemon shining pearl", "pokemonperlareluciente", "pokemonshiningpearl"] },
  { canonical: "pokemon purpura", aliases: ["pokemon violet", "pokemonpurpura", "pokemonviolet"] },
  { canonical: "pokemon escarlata", aliases: ["pokemon scarlet", "pokemonescarlata", "pokemonscarlet"] },
  { canonical: "leyendas pokemon z a", aliases: ["pokemon legends z a", "pokemon legends za", "pokemon za", "leyendas pokemon za", "pokemon z a solo dlc", "pokemon z a"] },
  { canonical: "leyendas pokemon arceus", aliases: ["pokemon legends arceus", "pokemon arceus"] },
  { canonical: "pokemon mystery dungeon rescue team dx", aliases: ["pokemon equipo de rescate dx", "pokemon mystery dungeon"] },
  { canonical: "pokemon lets go pikachu", aliases: ["pokemon lets go pikachu", "pokemon let's go pikachu"] },
  { canonical: "pokemon lets go eevee", aliases: ["pokemon lets go eevee", "pokemon let's go eevee"] },

  // Just Dance
  { canonical: "just dance", aliases: ["just dance 2024 edition", "just dance 2024", "just dance 2025 edition", "just dance 2025", "just dance 2023 edition", "just dance 2023", "just dance edition"] },

  // Little Nightmares
  { canonical: "little nightmares", aliases: ["little nightmares complete edition", "little nightmares 1", "little nightmares i"] },
  { canonical: "little nightmares 2", aliases: ["little nightmares ii", "little nightmares 2"] },

  // Mortal Kombat
  { canonical: "mortal kombat 11", aliases: ["mortal kombat 11 ultimate", "mk11", "mortal kombat 11 deluxe", "mk 11"] },

  // Super Mario / Zelda / EA Sports / Otros
  { canonical: "super mario 3d world mas bowsers fury", aliases: ["super mario 3d world bowsers fury", "super mario 3d world bowser fury", "super mario 3d world"] },
  { canonical: "mario kart 8 mas pase de pistas extras", aliases: ["mario kart 8 deluxe booster course pass", "mario kart 8 deluxe", "mario kart 8"] },
  { canonical: "mario mas rabbids kingdom battle", aliases: ["mario rabbids kingdom battle", "mario and rabbids kingdom battle"] },
  { canonical: "paper mario the thousand year door", aliases: ["paper mario la puerta milenaria", "paper mario thousand year door"] },
  { canonical: "the legend of zelda skyward sword hd", aliases: ["zelda skyward sword hd", "zelda skyward sword"] },
  { canonical: "the legend of zelda tears of the kingdom", aliases: ["zelda tears of the kingdom", "zelda totk", "tears of the kingdom"] },
  { canonical: "the legend of zelda breath of the wild", aliases: ["zelda breath of the wild", "zelda botw", "breath of the wild"] },
  { canonical: "the legend of zelda links awakening", aliases: ["zelda links awakening", "links awakening"] },
  { canonical: "new super mario bros u deluxe", aliases: ["new super mario bros u", "super mario bros u deluxe"] },
  { canonical: "yoshis crafted world", aliases: ["yoshi crafted world"] },
  { canonical: "kirbys return to dream land deluxe", aliases: ["kirby return to dream land deluxe", "kirby return to dream land"] },
  { canonical: "ea sports fc 24", aliases: ["fc 24", "fifa 24"] },
  { canonical: "ea sports fc 25", aliases: ["fc 25", "fifa 25"] },
  { canonical: "grand theft auto the trilogy the definitive edition", aliases: ["grand theft auto the trilogy", "gta the trilogy", "gta trilogy"] },
  { canonical: "hyrule warriors definitive edition", aliases: ["hyrule warriors", "zelda hyrule warriors"] },
  { canonical: "cuphead the delicious last course", aliases: ["cuphead delicious last course", "cuphead"] },
  { canonical: "diablo prime evil", aliases: ["diablo ii resurrected", "diablo 2 resurrected", "diablo 3", "diablo iii", "diablo"] }
];

// Limpieza avanzada
function cleanTitle(raw) {
  if (!raw) return "";
  let str = String(raw).toLowerCase();

  // Si tiene texto en inglés/alfabético dentro de paréntesis/corchetes o tras caracteres asiáticos, extraerlo
  // Ej: "歧路旅人0 OCTOPATH TRAVELER 0" -> "OCTOPATH TRAVELER 0"
  const latinMatch = str.match(/([a-z0-9\s:’'+\-&]{4,})/i);
  // Reemplazar sufijos como [10.3 GB], (6.9 GB)
  str = str.replace(/\[\s*\d+(\.\d+)?\s*(gb|mb)\s*\]/gi, "");
  str = str.replace(/\(\s*\d+(\.\d+)?\s*(gb|mb)\s*\)/gi, "");
  
  // Reemplazar signos y etiquetas comunes
  str = str.replace(/[®™©~～–—’']/g, "");
  str = str.replace(/\[dlc only\]/gi, "");
  str = str.replace(/\+?\s*dlc/gi, "");
  str = str.replace(/solo dlc/gi, "");
  str = str.replace(/expansion pass/gi, "");
  str = str.replace(/nintendo switch 2 edition/gi, "");
  str = str.replace(/nintendo switch edition/gi, "");
  str = str.replace(/definitive edition/gi, "");
  str = str.replace(/complete edition/gi, "");

  // Reemplazar " mas " -> " "
  str = str.replace(/\bmas\b/gi, " ");
  str = str.replace(/\band\b/gi, " ");
  str = str.replace(/&/g, " ");
  str = str.replace(/\+/g, " ");

  // Normalizar acentos
  str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Alfanumérico limpio
  str = str.replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();

  return str;
}

function getNormalizedKey(cleanName) {
  return cleanName.replace(/[^a-z0-9]/g, "");
}

// Resolver nombre canónico
function resolveCanonical(cleanName) {
  const norm = getNormalizedKey(cleanName);
  for (const group of GAME_ALIASES) {
    const canonNorm = getNormalizedKey(group.canonical);
    if (canonNorm === norm) return canonNorm;
    for (const alias of group.aliases) {
      const aliasNorm = getNormalizedKey(alias);
      if (aliasNorm === norm || (norm.length > 5 && (aliasNorm.includes(norm) || norm.includes(aliasNorm)))) {
        return canonNorm;
      }
    }
  }
  return norm;
}

async function run() {
  const packsSnap = await getDocs(collection(db, "packs_nintendo"));
  const stockMap = new Map();

  packsSnap.forEach(d => {
    const data = d.data();
    if (data.disponible === false) return;
    (data.juegos || []).forEach(j => {
      if (!j) return;
      const clean = cleanTitle(j);
      if (!clean) return;
      const canon = resolveCanonical(clean);
      stockMap.set(canon, (stockMap.get(canon) || 0) + 1);
    });
  });

  const prodsSnap = await getDocs(collection(db, "products"));
  const switchProds = [];
  prodsSnap.forEach(d => {
    const p = d.data();
    if (
      p.categoryId === "VtQaPwP0xXdC1qdz6Hvq" ||
      p.categoryId === "Y7j7vSXMUgWxFNMkOuwX" ||
      p.categoryId === "switch" ||
      p.plataforma === "Nintendo Switch" ||
      (p.categoria && p.categoria.toLowerCase().includes("switch"))
    ) {
      switchProds.push({ id: d.id, name: p.name || p.title });
    }
  });

  console.log(`\nEvaluating ${switchProds.length} products with NEW ADVANCED match logic:`);
  let matchedCount = 0;
  let zeroStockCount = 0;
  const matchedList = [];
  const zeroStockList = [];

  switchProds.forEach(p => {
    const clean = cleanTitle(p.name);
    const canon = resolveCanonical(clean);
    let count = stockMap.get(canon) || 0;

    // Fallback: búsqueda por contención si no hay match directo
    if (count === 0) {
      for (const [k, v] of stockMap.entries()) {
        if (k.length >= 6 && canon.length >= 6) {
          if (k.includes(canon) || canon.includes(k)) {
            count += v;
          }
        }
      }
    }

    if (count > 0) {
      matchedCount++;
      matchedList.push({ name: p.name, stock: count });
    } else {
      zeroStockCount++;
      zeroStockList.push(p.name);
    }
  });

  console.log(`✅ Matched (Stock > 0): ${matchedCount}`);
  console.log(`❌ Zero Stock (Agotados): ${zeroStockCount}`);

  console.log("\nEjemplos de juegos que ahora tienen stock detectado:");
  matchedList.filter(m => [
    "Pokemon Escudo", "Pokémon Escudo", "Pokémon Shield", "Pokemon Shield",
    "Leyendas Pokémon: Z-A", "Pokémon Z-A solo DLC",
    "Pokémon Diamante Brillante", "JUST DANCE 2024 EDITION", "JUST DANCE 2025 EDITION",
    "LITTLE NIGHTMARES COMPLETE EDITION", "Mortal Kombat 11 Ultimate",
    "Super Mario 3D World mas Bowsers Fury", "Mario Kart 8 mas Pase de Pistas extras"
  ].some(k => m.name.toLowerCase().includes(k.toLowerCase()))).forEach(m => {
    console.log(`  🟢 ${m.name} -> Stock: ${m.stock}`);
  });

  console.log("\nJuegos que siguen en 0 stock (verificar si realmente no existen en packs):");
  zeroStockList.forEach(n => console.log(`  ⚪ ${n}`));
}

run().catch(console.error);
