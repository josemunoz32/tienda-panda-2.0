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

// Diccionario exhaustivo de sinónimos y traducciones
const GAME_ALIASES = [
  // POKÉMON
  { canonical: "pokemon escudo", aliases: ["pokemon shield", "pokemonescudo", "pokemonshield"] },
  { canonical: "pokemon espada", aliases: ["pokemon sword", "pokemonespada", "pokemonsword"] },
  { canonical: "pokemon diamante brillante", aliases: ["pokemon brilliant diamond", "pokemondiamantebrillante", "pokemonbrilliantdiamond"] },
  { canonical: "pokemon perla reluciente", aliases: ["pokemon shining pearl", "pokemonperlareluciente", "pokemonshiningpearl"] },
  { canonical: "pokemon purpura", aliases: ["pokemon violet", "pokemonpurpura", "pokemonviolet"] },
  { canonical: "pokemon escarlata", aliases: ["pokemon scarlet", "pokemonescarlata", "pokemonscarlet"] },
  { canonical: "leyendas pokemon z a", aliases: ["pokemon legends z a", "pokemon legends za", "pokemon za", "leyendas pokemon za", "pokemon z a solo dlc", "pokemon z a", "pokemonlegendsza"] },
  { canonical: "leyendas pokemon arceus", aliases: ["pokemon legends arceus", "pokemon arceus", "pokemonlegendsarceus"] },
  { canonical: "pokemon mystery dungeon rescue team dx", aliases: ["pokemon equipo de rescate dx", "pokemon mystery dungeon", "pokemon rescateteam dx"] },
  { canonical: "pokemon lets go pikachu", aliases: ["pokemon lets go pikachu", "pokemon let's go pikachu"] },
  { canonical: "pokemon lets go eevee", aliases: ["pokemon lets go eevee", "pokemon let's go eevee"] },
  { canonical: "new pokemon snap", aliases: ["pokemon snap"] },
  { canonical: "pokemon pokopia", aliases: ["pokemon pokopia"] },

  // JUST DANCE (Unificación: Cualquier Just Dance provee la app Just Dance)
  { canonical: "just dance", aliases: ["just dance 2024 edition", "just dance 2024", "just dance 2025 edition", "just dance 2025", "just dance 2023 edition", "just dance 2023", "just dance edition", "just dance 2022", "just dance 2021", "just dance 2020"] },

  // LITTLE NIGHTMARES
  { canonical: "little nightmares", aliases: ["little nightmares complete edition", "little nightmares 1", "little nightmares i"] },
  { canonical: "little nightmares 2", aliases: ["little nightmares ii", "little nightmares 2"] },

  // MORTAL KOMBAT
  { canonical: "mortal kombat 11", aliases: ["mortal kombat 11 ultimate", "mk11", "mortal kombat 11 deluxe", "mk 11"] },
  { canonical: "mortal kombat 1", aliases: ["mortal kombat 1", "mk1", "mk 1"] },

  // THE LEGEND OF ZELDA
  { canonical: "the legend of zelda tears of the kingdom", aliases: ["zelda tears of the kingdom", "zelda totk", "tears of the kingdom", "zelda lagrimas del reino"] },
  { canonical: "the legend of zelda breath of the wild", aliases: ["zelda breath of the wild", "zelda botw", "breath of the wild", "zelda aliento de lo salvaje"] },
  { canonical: "the legend of zelda skyward sword hd", aliases: ["zelda skyward sword hd", "zelda skyward sword", "skyward sword"] },
  { canonical: "the legend of zelda links awakening", aliases: ["zelda links awakening", "links awakening", "zelda el despertar de link"] },
  { canonical: "hyrule warriors age of calamity", aliases: ["hyrule warriors la era del cataclismo", "age of calamity"] },
  { canonical: "hyrule warriors definitive edition", aliases: ["hyrule warriors", "zelda hyrule warriors"] },

  // SUPER MARIO & NINTENDO
  { canonical: "super mario 3d world mas bowsers fury", aliases: ["super mario 3d world bowsers fury", "super mario 3d world bowser fury", "super mario 3d world"] },
  { canonical: "mario kart 8 mas pase de pistas extras", aliases: ["mario kart 8 deluxe booster course pass", "mario kart 8 deluxe", "mario kart 8"] },
  { canonical: "mario mas rabbids kingdom battle", aliases: ["mario rabbids kingdom battle", "mario and rabbids kingdom battle", "mario rabbids"] },
  { canonical: "paper mario the thousand year door", aliases: ["paper mario la puerta milenaria", "paper mario thousand year door", "paper mario the origami king", "paper mario"] },
  { canonical: "super mario bros wonder", aliases: ["super mario wonder", "mario wonder", "mario bros wonder"] },
  { canonical: "luigis mansion 3", aliases: ["luigi mansion 3", "mansion de luigi 3"] },
  { canonical: "yoshis crafted world", aliases: ["yoshi crafted world", "hello yoshi"] },
  { canonical: "kirbys return to dream land deluxe", aliases: ["kirby return to dream land deluxe", "kirby return to dream land", "kirby and the forgotten land", "kirby star allies"] },
  { canonical: "new super mario bros u deluxe", aliases: ["new super mario bros u", "super mario bros u deluxe", "super mario bros deluxe"] },
  { canonical: "super mario party jamboree", aliases: ["mario party jamboree", "super mario party"] },
  { canonical: "mario party superstars", aliases: ["mario party"] },
  { canonical: "super smash bros ultimate", aliases: ["super smash bros", "smash bros"] },
  { canonical: "donkey kong country tropical freeze", aliases: ["donkey kong tropical freeze"] },
  { canonical: "donkey kong country returns hd", aliases: ["donkey kong returns hd", "donkey kong returns"] },

  // GTA / EA SPORTS / OTROS
  { canonical: "grand theft auto the trilogy the definitive edition", aliases: ["grand theft auto san andreas", "grand theft auto vice city", "grand theft auto iii", "grand theft auto", "gta the trilogy", "gta trilogy", "gta"] },
  { canonical: "ea sports fc 24", aliases: ["fc 24", "fifa 24"] },
  { canonical: "ea sports fc 25", aliases: ["fc 25", "fifa 25"] },
  { canonical: "dragon ball fighterz", aliases: ["dbfz"] },
  { canonical: "dragon ball xenoverse 2", aliases: ["db xenoverse 2"] },
  { canonical: "the witcher 3 wild hunt complete edition", aliases: ["the witcher 3 wild hunt", "the witcher 3"] },
  { canonical: "cuphead the delicious last course", aliases: ["cuphead delicious last course", "cuphead"] },
  { canonical: "crash bandicoot 4 its about time", aliases: ["crash bandicoot 4"] }
];

// Reemplazos de nombres asiáticos comunes
const ASIAN_TERM_MAP = [
  { match: /[\u30bc\u30eb\u30c0\u585e\u5c14\u8fbe]/g, replace: "zelda" },
  { match: /[\u30dd\u30b1\u30e2\u30f3\u5b9d\u53ef\u68a6\u30dd\u30b1\u30c3\u30c8\u30e2\u30f3\u30b9\u30bf\u30fc]/g, replace: "pokemon" },
  { match: /[\u30de\u30ea\u30aa\u9a6c\u529b\u6b27]/g, replace: "mario" },
  { match: /[\u30b9\u30d7\u30e9\u30c8\u30a5\u30fc\u30f3\u65af\u666e\u62c9\u9041]/g, replace: "splatoon" },
  { match: /[\u30b9\u30de\u30d6\u30e9\u5927\u4e71\u6597]/g, replace: "smash bros" },
  { match: /[\u30ab\u30fc\u30d3\u30a3\u5361\u6bd4]/g, replace: "kirby" },
  { match: /[\u30bc\u30ce\u30d6\u30ec\u30a4\u30c9\u5f02\u5ea6\u795e\u5251]/g, replace: "xenoblade" },
  { match: /[\u30e2\u30f3\u30b9\u30bf\u30fc\u30cf\u30f3\u30bf\u30fc\u602a\u7269\u730e\u4eba]/g, replace: "monster hunter" },
  { match: /[\u30da\u30eb\u30bd\u30c3\u5973\u795e\u5f02\u95fb\u5f55\u5973\u795e\u7570\u805e\u9304]/g, replace: "persona" },
  { match: /[\u30c9\u30e9\u30b4\u30f3\u30af\u30a8\u30b9\u30c8\u52c7\u8005\u6597\u6076\u9f99]/g, replace: "dragon quest" },
  { match: /[\u592a\u9f13\u4e4b\u8fbe\u4eba\u592a\u9f13\u306e\u9054\u4eba\u592a\u9f13\u8fbe\u4eba]/g, replace: "taiko no tatsujin" },
  { match: /[\u706b\u5f71\u5fcd\u8005\u30ca\u30eb\u30c8]/g, replace: "naruto" },
  { match: /[\u4e03\u9f99\u73e0\u9f99\u73e0\u30c9\u30e9\u30b4\u30f3\u30dc\u30fc\u30eb]/g, replace: "dragon ball" },
  { match: /[\u52a8\u7269\u68ee\u53cb\u4f1a\u3069\u3046\u3076\u3064\u306e\u68ee]/g, replace: "animal crossing" }
];

function cleanTitle(raw) {
  if (!raw) return "";
  let str = String(raw).toLowerCase();

  // Reemplazar términos asiáticos frecuentes
  for (const { match, replace } of ASIAN_TERM_MAP) {
    str = str.replace(match, ` ${replace} `);
  }

  // Extraer parte latina si existe texto en caracteres orientales con subtítulo inglés
  // Ej: "歧路旅人0 OCTOPATH TRAVELER 0" -> "OCTOPATH TRAVELER 0"
  const latinSub = str.match(/([a-z0-9\s:’'+\-&]{4,})/i);
  if (latinSub && latinSub[1] && latinSub[1].trim().length > 6 && !/[\u3000-\u9fff]/.test(latinSub[1])) {
    str = latinSub[1];
  }

  // Quitar sufijos de tamaño de archivo: [10.3 GB], (6.9 GB)
  str = str.replace(/\[\s*\d+(\.\d+)?\s*(gb|mb)\s*\]/gi, "");
  str = str.replace(/\(\s*\d+(\.\d+)?\s*(gb|mb)\s*\)/gi, "");

  // Quitar símbolos y etiquetas secundarias
  str = str.replace(/[®™©~～–—’']/g, "");
  str = str.replace(/\[dlc only\]/gi, "");
  str = str.replace(/\(dlc only\)/gi, "");
  str = str.replace(/\+?\s*dlc/gi, "");
  str = str.replace(/solo dlc/gi, "");
  str = str.replace(/expansion pass/gi, "");
  str = str.replace(/nintendo switch 2 edition/gi, "");
  str = str.replace(/nintendo switch edition/gi, "");
  str = str.replace(/definitive edition/gi, "");
  str = str.replace(/complete edition/gi, "");

  // Normalizar conjunciones
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
      // Filtrar combos especiales
      if (!p.name.includes("Arma tu Pack")) {
        switchProds.push({ id: d.id, name: p.name || p.title });
      }
    }
  });

  console.log(`\nEvaluating ${switchProds.length} real Switch game products:`);
  let matched = 0;
  let outOfStock = 0;

  switchProds.forEach(p => {
    const clean = cleanTitle(p.name);
    const canon = resolveCanonical(clean);
    let count = stockMap.get(canon) || 0;

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
      matched++;
    } else {
      outOfStock++;
      console.log(`  ⚪ Sin stock en packs: ${p.name}`);
    }
  });

  console.log(`\n===========================================`);
  console.log(`TOTAL CON STOCK DISPONIBLE: ${matched} de ${switchProds.length} (${Math.round(matched/switchProds.length*100)}%)`);
  console.log(`TOTAL AGOTADOS EN PACKS: ${outOfStock}`);
  console.log(`===========================================`);
}

run().catch(console.error);
