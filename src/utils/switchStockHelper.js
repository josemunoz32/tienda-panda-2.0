/**
 * switchStockHelper.js - Motor Inteligente de Stock Multilingüe y Multi-versión
 * para Nintendo Switch PandaStore 2.0
 * 
 * Capacidades:
 * 1. Detección multilingüe: Español <-> Inglés <-> Japonés <-> Chino
 *    (Ej: Pokémon Escudo <-> Pokémon Shield, Pokémon Espada <-> Pokémon Sword)
 * 2. Unificación de versiones y años:
 *    (Ej: Just Dance 2024 / 2025 <-> Just Dance, Mortal Kombat 11 Ultimate <-> Mortal Kombat 11)
 * 3. Limpieza de sufijos técnicos de packs:
 *    (Ej: "[10.3 GB]", "[DLC Only]", "Nintendo Switch 2 Edition", marcas registradas ™/®)
 * 4. Clasificación precisa de packs (juego base, juego + DLC, solo DLC).
 */

import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export const WHATSAPP_OFICIAL = "56974751810";
// Tipo de cambio conservador para compras al proveedor. No se usa el precio
// publicado del pack, que ya incluye margen comercial de PandaStore.
export const SWITCH_PROVIDER_USD_TO_CLP = 1000;

const parseProviderAmount = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const normalized = value.replace(",", ".").replace(/[^0-9.]/g, "");
  return Number(normalized) || 0;
};

// Diccionario exhaustivo de sinónimos, traducciones y equivalencias de ediciones
export const GAME_ALIASES = [
  // ── POKÉMON ──────────────────────────────────────────────────────────
  {
    canonical: "pokemon escudo",
    aliases: [
      "pokemon shield", "pokemonescudo", "pokemonshield",
      "pokemon escudo mas expansion pass", "pokemon shield expansion pass",
      "pokemon escudo pase expansion"
    ]
  },
  {
    canonical: "pokemon espada",
    aliases: [
      "pokemon sword", "pokemonespada", "pokemonsword",
      "pokemon espada mas expansion pass", "pokemon sword expansion pass"
    ]
  },
  {
    canonical: "pokemon diamante brillante",
    aliases: [
      "pokemon brilliant diamond", "pokemondiamantebrillante",
      "pokemonbrilliantdiamond", "pokemon diamante"
    ]
  },
  {
    canonical: "pokemon perla reluciente",
    aliases: [
      "pokemon shining pearl", "pokemonperlareluciente",
      "pokemonshiningpearl", "pokemon perla"
    ]
  },
  {
    canonical: "pokemon purpura",
    aliases: [
      "pokemon violet", "pokemonpurpura", "pokemonviolet",
      "pokemon purpura dlc", "pokemon violet dlc"
    ]
  },
  {
    canonical: "pokemon escarlata",
    aliases: [
      "pokemon scarlet", "pokemonescarlata", "pokemonscarlet",
      "pokemon escarlata dlc", "pokemon scarlet dlc"
    ]
  },
  {
    canonical: "leyendas pokemon z a",
    aliases: [
      "pokemon legends z a", "pokemon legends za", "pokemon za",
      "leyendas pokemon za", "pokemon z a solo dlc", "pokemon z a",
      "pokemonlegendsza", "pokemon legends z a dlc only", "pokemon z a dlc"
    ]
  },
  {
    canonical: "leyendas pokemon arceus",
    aliases: ["pokemon legends arceus", "pokemon arceus", "pokemonlegendsarceus"]
  },
  {
    canonical: "pokemon lets go pikachu",
    aliases: ["pokemon lets go pikachu", "pokemon let's go pikachu", "lets go pikachu"]
  },
  {
    canonical: "pokemon lets go eevee",
    aliases: ["pokemon lets go eevee", "pokemon let's go eevee", "lets go eevee"]
  },
  {
    canonical: "pokemon mystery dungeon rescue team dx",
    aliases: [
      "pokemon equipo de rescate dx", "pokemon mystery dungeon",
      "pokemon mundo misterioso", "pokemon rescue team dx"
    ]
  },
  { canonical: "new pokemon snap", aliases: ["pokemon snap", "new pokemonsnap"] },
  { canonical: "pokemon pokopia", aliases: ["pokemon pokopia"] },

  // ── JUST DANCE (Cualquier edición Just Dance provee la app Just Dance) ──
  {
    canonical: "just dance",
    aliases: [
      "just dance 2024 edition", "just dance 2024",
      "just dance 2025 edition", "just dance 2025",
      "just dance 2023 edition", "just dance 2023",
      "just dance 2022", "just dance 2021", "just dance 2020",
      "just dance 2019", "just dance edition"
    ]
  },

  // ── LITTLE NIGHTMARES ───────────────────────────────────────────────
  {
    canonical: "little nightmares",
    aliases: [
      "little nightmares complete edition", "little nightmares 1",
      "little nightmares i", "little nightmares dlc"
    ]
  },
  {
    canonical: "little nightmares 2",
    aliases: ["little nightmares ii", "little nightmares 2", "little nightmares 2 dlc"]
  },

  // ── MORTAL KOMBAT ───────────────────────────────────────────────────
  {
    canonical: "mortal kombat 11",
    aliases: [
      "mortal kombat 11 ultimate", "mk11", "mortal kombat 11 deluxe",
      "mk 11", "mortal kombat 11 dlc"
    ]
  },
  {
    canonical: "mortal kombat 1",
    aliases: ["mortal kombat 1", "mk1", "mk 1", "mortal kombat 1 dlc"]
  },

  // ── THE LEGEND OF ZELDA ─────────────────────────────────────────────
  {
    canonical: "the legend of zelda tears of the kingdom",
    aliases: [
      "zelda tears of the kingdom", "zelda totk", "tears of the kingdom",
      "zelda lagrimas del reino", "totk"
    ]
  },
  {
    canonical: "the legend of zelda breath of the wild",
    aliases: [
      "zelda breath of the wild", "zelda botw", "breath of the wild",
      "zelda aliento de lo salvaje", "botw"
    ]
  },
  {
    canonical: "the legend of zelda skyward sword hd",
    aliases: ["zelda skyward sword hd", "zelda skyward sword", "skyward sword"]
  },
  {
    canonical: "the legend of zelda links awakening",
    aliases: ["zelda links awakening", "links awakening", "zelda el despertar de link"]
  },
  {
    canonical: "hyrule warriors age of calamity",
    aliases: ["hyrule warriors la era del cataclismo", "age of calamity"]
  },
  {
    canonical: "hyrule warriors definitive edition",
    aliases: ["hyrule warriors", "zelda hyrule warriors"]
  },

  // ── SUPER MARIO & NINTENDO SAGA ─────────────────────────────────────
  {
    canonical: "super mario 3d world mas bowsers fury",
    aliases: [
      "super mario 3d world bowsers fury", "super mario 3d world bowser fury",
      "super mario 3d world and bowsers fury", "super mario 3d world", "mario 3d world",
      "超级马力欧 3d世界", "狂怒世界"
    ]
  },
  {
    canonical: "mario kart 8 deluxe",
    aliases: [
      "mario kart 8 deluxe", "mario kart 8", "mk8", "mk8d",
      "马力欧卡丁车8 豪华版", "马车8", "马里奥赛车8"
    ]
  },
  {
    canonical: "mario mas rabbids kingdom battle",
    aliases: [
      "mario rabbids kingdom battle", "mario and rabbids kingdom battle",
      "mario rabbids", "mario + rabbids", "马力欧疯狂兔子王国之战"
    ]
  },
  {
    canonical: "paper mario the thousand year door",
    aliases: [
      "paper mario la puerta milenaria", "paper mario thousand year door",
      "paper mario la puerta milenaria nintendo switch", "thousand year door",
      "puerta milenaria", "纸片马力欧 千年之门"
    ]
  },
  {
    canonical: "paper mario the origami king",
    aliases: [
      "paper mario the origami king", "paper mario origami king",
      "origami king", "el rey del origami", "纸片马力欧 折纸国王"
    ]
  },
  {
    canonical: "super mario bros wonder",
    aliases: [
      "super mario wonder", "mario wonder", "mario bros wonder", "super mario bros. wonder",
      "超级马力欧兄弟 惊奇", "马力欧惊奇"
    ]
  },
  {
    canonical: "super mario odyssey",
    aliases: [
      "super mario odyssey", "mario odyssey", "mario odisea",
      "超级马力欧 奥德赛", "马力欧奥德赛"
    ]
  },
  {
    canonical: "super mario party",
    aliases: [
      "super mario party", "super mario party 2018", "mario party switch",
      "超级马力欧派对", "马力欧派对"
    ]
  },
  {
    canonical: "super mario party jamboree",
    aliases: [
      "super mario party jamboree", "mario party jamboree", "jamboree",
      "超级马力欧派对 空前盛会", "空前盛会", "马力欧派对 空前盛会"
    ]
  },
  {
    canonical: "mario party superstars",
    aliases: [
      "mario party superstars", "superstars", "马力欧派对 超级巨星", "超级巨星"
    ]
  },
  {
    canonical: "luigis mansion 3",
    aliases: [
      "luigi mansion 3", "mansion de luigi 3", "luigi's mansion 3",
      "路易吉洋馆3", "路易鬼屋3"
    ]
  },
  {
    canonical: "yoshis crafted world",
    aliases: ["yoshi crafted world", "yoshi's crafted world", "hello yoshi", "耀西的手工世界"]
  },
  {
    canonical: "kirby and the forgotten land",
    aliases: [
      "kirby and the forgotten land", "kirby the forgotten land", "kirby tierra olvidada",
      "星之卡比 探索发现", "星之卡比 探索", "kirby forgotten land"
    ]
  },
  {
    canonical: "kirby star allies",
    aliases: [
      "kirby star allies", "kirby allies", "星之卡比 新星同盟", "星之卡比 盟友"
    ]
  },
  {
    canonical: "kirbys return to dream land deluxe",
    aliases: [
      "kirby return to dream land deluxe", "kirby return to dream land",
      "kirbys return to dream land", "星之卡比 重返梦幻岛 豪华版", "星之卡比 重返梦幻岛"
    ]
  },
  {
    canonical: "new super mario bros u deluxe",
    aliases: [
      "new super mario bros u", "super mario bros u deluxe",
      "super mario bros deluxe", "super mario bros u", "新超级马力欧兄弟u 豪华版"
    ]
  },
  {
    canonical: "super smash bros ultimate",
    aliases: [
      "super smash bros", "smash bros", "smash bros ultimate",
      "任天堂明星大乱斗 特别版", "任天堂明星大乱斗", "大乱斗", "super smash brothers"
    ]
  },
  {
    canonical: "animal crossing new horizons",
    aliases: [
      "animal crossing", "animal crossing new horizon", "acnh",
      "animal crossing nuevos horizontes", "动物森友会", "集合啦 动物森友会", "动森"
    ]
  },
  {
    canonical: "splatoon 3",
    aliases: ["splatoon 3", "splatoon 3 dlc", "斯普拉遁3", "喷射战士3"]
  },
  {
    canonical: "splatoon 2",
    aliases: ["splatoon 2", "splatoon 2 dlc", "斯普拉遁2", "喷射战士2"]
  },
  {
    canonical: "pikmin 4",
    aliases: ["pikmin 4", "皮克敏4"]
  },
  {
    canonical: "donkey kong country tropical freeze",
    aliases: ["donkey kong tropical freeze", "donkey kong country tropical", "森喜刚 热带冻结"]
  },
  {
    canonical: "donkey kong country returns hd",
    aliases: ["donkey kong returns hd", "donkey kong returns", "森喜刚 归来 hd"]
  },

  // ── POPULARES, INDIES & MINECRAFT ───────────────────────────────────
  {
    canonical: "minecraft dungeons",
    aliases: [
      "minecraft dungeons", "minecraft dungeons switch", "minecraft dungeons dlc",
      "minecraft dungeons hero edition", "minecraft dungeons ultimate edition",
      "我的世界地下城", "майнкрафт подземелья"
    ]
  },
  {
    canonical: "minecraft legends",
    aliases: [
      "minecraft legends", "minecraft legends switch", "minecraft legends deluxe",
      "我的世界传奇", "майнкрафт легенды"
    ]
  },
  {
    canonical: "minecraft",
    aliases: [
      "minecraft", "minecraft for nintendo switch", "minecraft nintendo switch",
      "minecraft bedrock", "minecraft bedrock edition", "minecraft switch",
      "我的世界", "майнкрафт"
    ]
  },
  {
    canonical: "stardew valley",
    aliases: ["stardew valley", "stardew", "星露谷物语", "стардью валли"]
  },
  {
    canonical: "overcooked 2",
    aliases: ["overcooked 2", "overcooked! 2", "overcooked 2 switch", "胡闹厨房2", "煮糊了2"]
  },
  {
    canonical: "overcooked all you can eat",
    aliases: ["overcooked all you can eat", "overcooked special edition", "overcooked 1", "胡闹厨房全都好吃"]
  },
  {
    canonical: "cuphead",
    aliases: ["cuphead", "cuphead the delicious last course", "cuphead dlc", "茶杯头"]
  },
  {
    canonical: "hollow knight",
    aliases: ["hollow knight", "hollow knight switch", "空洞骑士"]
  },
  {
    canonical: "hades",
    aliases: ["hades", "hades switch", "哈迪斯"]
  },
  {
    canonical: "dead cells",
    aliases: ["dead cells", "dead cells return to castlevania", "死亡细胞"]
  },
  {
    canonical: "it takes two",
    aliases: ["it takes two", "it takes two switch", "双人成行"]
  },
  {
    canonical: "dave the diver",
    aliases: ["dave the diver", "潜水员戴夫"]
  },
  {
    canonical: "sea of stars",
    aliases: ["sea of stars", "星之海"]
  },
  {
    canonical: "cult of the lamb",
    aliases: ["cult of the lamb", "咩咩启示录"]
  },
  {
    canonical: "terraria",
    aliases: ["terraria", "泰拉瑞亚"]
  },
  {
    canonical: "undertale",
    aliases: ["undertale", "传说之下"]
  },
  {
    canonical: "celeste",
    aliases: ["celeste", "蔚蓝"]
  },
  {
    canonical: "hogwarts legacy",
    aliases: ["hogwarts legacy", "hogwarts legacy switch", "霍格沃茨之遗"]
  },
  {
    canonical: "red dead redemption",
    aliases: ["red dead redemption", "rdr1", "rdr switch", "荒野大镖客"]
  },
  {
    canonical: "assassins creed the rebel collection",
    aliases: [
      "assassins creed rebel collection", "assassin's creed the rebel collection",
      "assassins creed the rebel", "rebel collection", "assassins creed black flag",
      "assassins creed rogue", "刺客信条 叛逆者合集"
    ]
  },
  {
    canonical: "assassins creed the ezio collection",
    aliases: [
      "assassins creed ezio collection", "assassin's creed the ezio collection",
      "ezio collection", "刺客信条 艾吉奥合集"
    ]
  },
  {
    canonical: "sonic frontiers",
    aliases: ["sonic frontiers", "索尼克 未知边境"]
  },
  {
    canonical: "sonic x shadow generations",
    aliases: ["sonic x shadow generations", "sonic shadow generations", "索尼克x夏特 世代重启"]
  },
  {
    canonical: "sonic superstars",
    aliases: ["sonic superstars", "索尼克 超级巨星"]
  },
  {
    canonical: "persona 5 royal",
    aliases: ["persona 5 royal", "persona 5", "p5r", "女神异闻录5 皇家版"]
  },
  {
    canonical: "monster hunter rise",
    aliases: ["monster hunter rise", "monster hunter rise sunbreak", "mh rise", "怪物猎人 崛起"]
  },

  // ── GTA / EA SPORTS / OTROS TÍTULOS ──────────────────────────────────
  {
    canonical: "grand theft auto the trilogy the definitive edition",
    aliases: [
      "grand theft auto san andreas", "grand theft auto vice city",
      "grand theft auto iii", "grand theft auto", "gta the trilogy",
      "gta trilogy", "gta"
    ]
  },
  { canonical: "ea sports fc 24", aliases: ["fc 24", "fifa 24"] },
  { canonical: "ea sports fc 25", aliases: ["fc 25", "fifa 25"] },
  { canonical: "dragon ball fighterz", aliases: ["dbfz", "dragon ball fighter z"] },
  { canonical: "dragon ball xenoverse 2", aliases: ["db xenoverse 2"] },
  { canonical: "the witcher 3 wild hunt complete edition", aliases: ["the witcher 3 wild hunt", "the witcher 3"] },
  { canonical: "the elder scrolls v skyrim", aliases: ["skyrim", "elder scrolls skyrim"] },
  { canonical: "dark souls remastered", aliases: ["dark souls"] },
  { canonical: "cuphead the delicious last course", aliases: ["cuphead delicious last course", "cuphead"] },
  { canonical: "crash bandicoot 4 its about time", aliases: ["crash bandicoot 4"] },
  { canonical: "diablo prime evil", aliases: ["diablo iii", "diablo ii", "diablo 3", "diablo 2", "diablo"] }
];

// Mapeo fonético / traductor de caracteres asiáticos (Chino / Japonés)
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

/**
 * Limpieza profunda y sanitización de títulos preservando caracteres multilingües
 * (Español, Inglés, Chino, Ruso, Japonés, etc.)
 */
export function cleanTitle(raw) {
  if (!raw) return "";
  let str = String(raw).toLowerCase();

  // Quitar sufijos de tamaño de archivo: [10.3 GB], (6.9 GB)
  str = str.replace(/\[\s*\d+(\.\d+)?\s*(gb|mb)\s*\]/gi, "");
  str = str.replace(/\(\s*\d+(\.\d+)?\s*(gb|mb)\s*\)/gi, "");

  // Quitar símbolos y etiquetas secundarias
  str = str.replace(/[®™©~～–—’']/g, "");
  str = str.replace(/\[\s*(dlc\s*only|solo\s*dlc)\s*\]/gi, "");
  str = str.replace(/\(\s*(dlc\s*only|solo\s*dlc)\s*\)/gi, "");
  str = str.replace(/\+?\s*dlc/gi, "");
  str = str.replace(/solo dlc/gi, "");
  str = str.replace(/expansion pass/gi, "");
  str = str.replace(/nintendo switch( 2)? edition/gi, "");
  str = str.replace(/for nintendo switch( 2)?/gi, "");
  str = str.replace(/nintendo switch( 2)?/gi, "");
  str = str.replace(/definitive edition/gi, "");
  str = str.replace(/complete edition/gi, "");

  // Normalizar conjunciones
  str = str.replace(/\bmas\b/gi, " ");
  str = str.replace(/\band\b/gi, " ");
  str = str.replace(/&/g, " ");
  str = str.replace(/\+/g, " ");

  // Normalizar acentos latinos
  str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Preservar letras y números de cualquier idioma (\p{L}\p{N})
  str = str.replace(/[^\p{L}\p{N}]/gu, " ").replace(/\s+/g, " ").trim();

  return str;
}

export function getNormalizedKey(cleanName) {
  return String(cleanName || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

// Pre-compilación de alias para resolución instantánea O(1)/O(K)
let _compiledAliases = null;
function getCompiledAliases() {
  if (!_compiledAliases) {
    _compiledAliases = GAME_ALIASES.map(group => ({
      canonNorm: getNormalizedKey(cleanTitle(group.canonical)),
      aliasesNorm: group.aliases.map(a => getNormalizedKey(cleanTitle(a)))
    }));
  }
  return _compiledAliases;
}

const CANONICAL_MEMO = new Map();

/**
 * Resuelve el nombre canónico unificado usando el diccionario de sinónimos (con memoización O(1))
 */
export function resolveCanonical(rawName) {
  if (!rawName) return "";
  if (CANONICAL_MEMO.has(rawName)) return CANONICAL_MEMO.get(rawName);

  const clean = cleanTitle(rawName);
  const norm = getNormalizedKey(clean);

  const compiled = getCompiledAliases();
  
  // 1. Prioridad: Coincidencia EXACTA (evita que un título corto capture títulos más largos)
  for (let i = 0; i < compiled.length; i++) {
    const group = compiled[i];
    if (group.canonNorm === norm) {
      CANONICAL_MEMO.set(rawName, group.canonNorm);
      return group.canonNorm;
    }
    for (let j = 0; j < group.aliasesNorm.length; j++) {
      if (group.aliasesNorm[j] === norm) {
        CANONICAL_MEMO.set(rawName, group.canonNorm);
        return group.canonNorm;
      }
    }
  }

  // 2. Coincidencia secundaria: Inclusión de términos ordenados por especificidad descendente
  const allAliases = [];
  for (let i = 0; i < compiled.length; i++) {
    const group = compiled[i];
    for (let j = 0; j < group.aliasesNorm.length; j++) {
      allAliases.push({ canonNorm: group.canonNorm, aliasNorm: group.aliasesNorm[j] });
    }
  }
  allAliases.sort((a, b) => b.aliasNorm.length - a.aliasNorm.length);

  for (let i = 0; i < allAliases.length; i++) {
    const item = allAliases[i];
    if (item.aliasNorm.length >= 6) {
      if (norm === item.aliasNorm) {
        CANONICAL_MEMO.set(rawName, item.canonNorm);
        return item.canonNorm;
      }
      if (norm.startsWith(item.aliasNorm) || norm.endsWith(item.aliasNorm) || norm.includes(item.aliasNorm)) {
        // Evitar que "minecraft" capture "minecraft dungeons" o "minecraft legends"
        if (item.canonNorm === "minecraft" && (norm.includes("dungeon") || norm.includes("legend"))) {
          continue;
        }
        // Evitar que "super mario party" capture "jamboree"
        if (item.canonNorm === "super mario party" && norm.includes("jamboree")) {
          continue;
        }
        CANONICAL_MEMO.set(rawName, item.canonNorm);
        return item.canonNorm;
      }
    }
  }

  CANONICAL_MEMO.set(rawName, norm);
  return norm;
}

/**
 * Normaliza nombres de juegos para comparación confiable (mantiene compatibilidad previa)
 */
export function normalizeGameName(name) {
  return resolveCanonical(name);
}

/**
 * Clasifica si el item es juego base, juego con DLC o solo DLC
 * Detecta con máxima precisión:
 * - "Super Smash Bros. Ultimate [DLC Only]" -> dlc_only
 * - "The Legend of Zelda: Breath of the Wild [DLC Only]" -> dlc_only
 * - "SONIC FORCES + DLC" -> game_dlc
 * - "Pokémon Shield" -> base_game
 */
export function classifySwitchItem(rawTitle) {
  const title = (rawTitle || "").toLowerCase().trim();
  
  // 1. Detectar Solo DLC ([DLC Only], DLC Only, Solo DLC, Only DLC, etc.)
  const isDlcOnly = title.includes("dlc only") || 
                    title.includes("[dlc only]") || 
                    title.includes("(dlc only)") ||
                    title.includes("only dlc") || 
                    title.includes("solo dlc") || 
                    title.includes("[solo dlc]") || 
                    title.includes("(solo dlc)") ||
                    title.includes("pase de expansión solo") ||
                    title.includes("pase de expansion solo") ||
                    title.includes("expansion pass solo") ||
                    title.includes("solo pase") ||
                    title.includes("solo expansion");
                    
  // 2. Detectar Juego Base + DLC (+ DLC, + Pase, Deluxe Edition, Bundle, etc.)
  const isGameAndDlc = !isDlcOnly && (
    title.includes("+ dlc") || 
    title.includes("+dlc") || 
    title.includes("mas dlc") ||
    title.includes("con dlc") ||
    title.includes("+ pase") || 
    title.includes("+ expansion") || 
    title.includes("+ expansion pass") ||
    title.includes("deluxe edition") ||
    title.includes("complete edition") ||
    title.includes("definitive edition") ||
    title.includes("bundle")
  );

  return {
    raw: rawTitle,
    type: isDlcOnly ? "dlc_only" : isGameAndDlc ? "game_dlc" : "base_game",
    label: isDlcOnly ? "Solo DLC" : isGameAndDlc ? "Juego + DLC" : "Juego Base"
  };
}

// Lista base de títulos Free-to-Play conocidos (minúsculas y sin tildes)
export const F2P_BASE_TITLES = [
  // Pokémon F2P
  "pokemon quest", "pokemon unite", "pokemon cafe remix", "pokemon cafe mix", "pokemon cafe",
  "pokemon tcg live", "pokemon trading card game live", "pokemon home", "pokemon tv",

  // Battle Royale & Shooters F2P
  "fortnite", "apex legends", "warframe", "warface", "overwatch", "overwatch 2",
  "paladins", "smite", "smite 2", "realm royale", "realm royale reforged",
  "super animal royale", "my hero ultra rumble", "rogue company", "star wars hunters",
  "star wars: hunters", "vigor", "crossout", "crossout legends", "enlisted",
  "delta force", "world of tanks", "world of tanks blitz", "world of warships", "world of warships legends",

  // Party, Casual, Arena & Fighting F2P
  "fall guys", "stumble guys", "rocket league", "brawlhalla", "ninjala", "knockout city",
  "omega strikers", "roller champions", "kartrider drift", "kartrider", "asphalt 9 legends",
  "asphalt 9", "asphalt legends unite", "asphalt", "disney speedstorm",
  "roblox", "the sims 4", "sky children of the light", "dauntless", "century age of ashes",

  // Card & Strategy F2P
  "yu gi oh master duel", "yu gi oh rush duel", "yu-gi-oh master duel", "master duel",
  "magic the gathering arena", "mtg arena",
  "gems of war", "idle champions of the forgotten realms", "idle champions",

  // Nintendo F2P & 99 series
  "super kirby clash", "kirby clash", "tetris 99", "f zero 99", "f-zero 99", "pac man 99", "pac-man 99",
  "jump rope challenge", "color zen", "island saver",

  // Pinball & Classic F2P base platforms
  "pinball fx", "pinball fx3", "the pinball arcade", "stern pinball arcade",
  "namco museum pac man vs", "namco museum pac-man vs",
  "capcom arcade stadium", "capcom arcade 2nd stadium", "capcom arcade",

  // MMO / RPG / Gacha F2P
  "trove", "dc universe online", "fallout shelter", "genshin impact",
  "honkai star rail", "zenless zone zero", "skyforge", "arena of valor",
  "guardian tales", "dawn of the breakers", "phantasy star online 2 cloud", "pso2",

  // Lite / Starter / Free Editions
  "just dance",
  "efootball", "pes lite", "pro evolution soccer lite",
  "dragon ball xenoverse 2 lite", "dead or alive 6 core fighters",
  "dissidia final fantasy nt", "hitman 3 free starter pack", "hitman world of assassination free starter pack"
];

// Compatibilidad hacia atrás
export const FREE_TO_PLAY_GAMES = new Set(F2P_BASE_TITLES);

/**
 * Normaliza una cadena para comparaciones estrictas (sin tildes, caracteres especiales, etc.)
 */
function cleanForF2P(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes (é -> e, etc.)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/for nintendo switch( 2)?/g, " ")
    .replace(/nintendo switch( 2)?/g, " ")
    .replace(/edition/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detecta si un juego es Free-to-Play, demo, trial o versión gratuita
 */
export function isFreeToPlayGame(gameTitle) {
  if (!gameTitle || typeof gameTitle !== "string") return false;
  const rawLower = gameTitle.toLowerCase().trim();
  const rawNorm = rawLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 1. Demos, betas, trials, pruebas, versiones de prueba y versiones gratuitas
  if (/\b(demo|beta|playtest|free to play|free-to-play|free edition|free version|free trial|prueba gratis|versi[oó]n de prueba|trial version|trial & friend|free multiplayer|starter pack|starter edition|lite version|sample version|prologo|prologue)\b/i.test(rawNorm)) {
    return true;
  }

  // 2. Trove como juego individual (evitar falso positivo con Shovel Knight: Treasure Trove)
  if (/\btrove\b/i.test(rawNorm) && !rawNorm.includes("shovel knight")) {
    return true;
  }

  // 3. Títulos Free-to-Play conocidos
  const clean = cleanForF2P(rawLower);

  for (const f2p of F2P_BASE_TITLES) {
    if (
      clean === f2p ||
      clean.startsWith(f2p + " ") ||
      clean.endsWith(" " + f2p) ||
      clean.includes(" " + f2p + " ") ||
      clean.includes(f2p)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Obtiene el precio oficial de referencia en Nintendo eShop Chile (CLP)
 * para guiar al administrador en la fijación de precios y mostrar el ahorro real
 */
export function getNintendoOfficialReferencePrice(gameName, itemType = "base_game") {
  if (!gameName) return 59990;
  
  const norm = gameName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Si es solo DLC
  if (itemType === "dlc_only") {
    if (norm.includes("mario kart")) return 24990; // Pase de pistas extras
    if (norm.includes("pokemon")) return 29990; // Pase de expansión
    if (norm.includes("smash")) return 29990; // Fighters Pass
    if (norm.includes("zelda")) return 19990;
    return 24990;
  }

  // Si es Juego + DLC
  if (itemType === "game_dlc") {
    if (norm.includes("mario kart")) return 89990;
    if (norm.includes("pokemon")) return 89990;
    if (norm.includes("smash")) return 94990;
    if (norm.includes("cuphead")) return 26990;
    return 84990;
  }

  // Títulos específicos eShop Nintendo Chile
  if (norm.includes("mario kart")) return 64990; // Mario Kart 8 Deluxe
  if (norm.includes("tears of the kingdom")) return 69990; // Zelda TotK
  if (norm.includes("breath of the wild")) return 64990; // Zelda BotW
  if (norm.includes("smash bros")) return 64990; // Super Smash Bros Ultimate
  if (norm.includes("echoes of wisdom")) return 59990;
  if (norm.includes("mario wonder") || norm.includes("super mario bros wonder")) return 59990;
  if (norm.includes("mario odyssey")) return 59990;
  if (norm.includes("mario party") || norm.includes("jamboree")) return 59990;
  if (norm.includes("mario rpg") || norm.includes("paper mario")) return 59990;
  if (norm.includes("mario vs donkey kong")) return 49990;
  if (norm.includes("luigi")) return 59990; // Luigi's Mansion 3
  if (norm.includes("animal crossing")) return 59990;
  if (norm.includes("pikmin 4")) return 59990;
  if (norm.includes("pikmin 1") || norm.includes("pikmin 2")) return 49990;
  if (norm.includes("splatoon 3")) return 59990;
  if (norm.includes("kirby and the forgotten land")) return 59990;
  if (norm.includes("kirby")) return 59990;
  if (norm.includes("donkey kong")) return 59990;
  if (norm.includes("metroid dread")) return 59990;
  if (norm.includes("metroid prime")) return 39990;
  if (norm.includes("princess peach")) return 59990;
  if (norm.includes("xenoblade")) return 59990;
  if (norm.includes("fire emblem")) return 59990;
  if (norm.includes("bayonetta")) return 59990;
  if (norm.includes("pokemon") || norm.includes("leyendas pokemon")) return 59990;

  // Third-party AAA
  if (norm.includes("ea sports fc") || norm.includes("fifa")) return 59990;
  if (norm.includes("hogwarts legacy")) return 59990;
  if (norm.includes("mortal kombat 1")) return 59990;
  if (norm.includes("mortal kombat 11")) return 49990;
  if (norm.includes("red dead redemption")) return 49990;
  if (norm.includes("witcher 3")) return 39990;
  if (norm.includes("sonic frontiers") || norm.includes("sonic x shadow")) return 59990;
  if (norm.includes("sonic superstars")) return 54990;
  if (norm.includes("persona 5")) return 59990;
  if (norm.includes("monster hunter rise")) return 39990;
  if (norm.includes("dragon ball z kakarot") || norm.includes("sparking")) return 59990;
  if (norm.includes("it takes two")) return 39990;
  if (norm.includes("crash bandicoot") || norm.includes("spyro")) return 39990;
  if (norm.includes("minecraft")) return 29990;

  // Indie / AA populares
  if (norm.includes("cuphead")) return 19990;
  if (norm.includes("hollow knight")) return 14990;
  if (norm.includes("hades")) return 24990;
  if (norm.includes("dead cells")) return 24990;
  if (norm.includes("celeste")) return 19990;
  if (norm.includes("stardew valley")) return 14990;
  if (norm.includes("overcooked")) return 29990;
  if (norm.includes("dave the diver")) return 19990;
  if (norm.includes("undertale")) return 14990;
  if (norm.includes("ori and the")) return 19990;
  if (norm.includes("cult of the lamb")) return 24990;
  if (norm.includes("terraria")) return 29990;
  if (norm.includes("sea of stars")) return 34990;

  // Si contiene Mario, Zelda o Nintendo
  if (norm.includes("mario") || norm.includes("zelda") || norm.includes("nintendo")) {
    return 64990;
  }

  // Precio estándar retail Nintendo eShop
  return 59990;
}

/**
 * Limpia el nombre del juego para mostrarlo profesionalmente:
 * Elimina sufijos técnicos de tamaño (7.7 GB, 0.5 GB, [10.3 GB]), tags tipo [DLC Only], etc.
 */
export function formatGameDisplayName(name, preserveVariantTag = false) {
  if (!name || typeof name !== "string") return "";
  let clean = name.trim();

  const isDlcOnly = /\[\s*(dlc\s*only|solo\s*dlc)\s*\]/i.test(clean) || /\b(dlc only|solo dlc)\b/i.test(clean);

  // Quitar sufijos de tamaño: ej [7.7 GB], (7.7 GB), 7.7 GB, 0.5 GB, 7.7GB, 0.5gb
  clean = clean.replace(/[[({]?\s*\d+(\.\d+)?\s*(gb|mb)\s*[\])}]?/gi, "");
  // Quitar etiquetas tipo [DLC Only], [Solo DLC]
  clean = clean.replace(/\[\s*(dlc\s*only|solo\s*dlc)\s*\]/gi, "");
  // Quitar guiones o separadores sueltos al final
  clean = clean.replace(/[\s\-_–—]+$/, "");
  // Normalizar dobles espacios
  clean = clean.replace(/\s{2,}/g, " ").trim();

  if (preserveVariantTag && isDlcOnly) {
    clean += " [DLC Only]";
  }

  return clean;
}

/**
 * Genera la URL oficial de la imagen Hero / Banner de Nintendo CDN
 */
export function getNintendoOfficialHeroUrl(gameName) {
  if (!gameName) return "https://assets.nintendo.com/image/upload/c_pad,f_auto,h_613,q_auto,w_1089/ncom/es_LA/games/switch";

  let clean = gameName
    .replace(/\[\s*\d+(\.\d+)?\s*(gb|mb)\s*\]/gi, "")
    .replace(/\(\s*\d+(\.\d+)?\s*(gb|mb)\s*\)/gi, "")
    .replace(/\+.*$/, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/for nintendo switch( 2)?/gi, "")
    .replace(/nintendo switch( 2)?/gi, "")
    .replace(/edition/gi, "")
    .trim();

  const slug = clean
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) return "https://assets.nintendo.com/image/upload/c_pad,f_auto,h_613,q_auto,w_1089/ncom/es_LA/games/switch";

  const firstChar = slug.charAt(0);
  return `https://assets.nintendo.com/image/upload/c_pad,f_auto,h_613,q_auto,w_1089/ncom/en_US/games/switch/${firstChar}/${slug}-switch/hero`;
}

/**
 * Genera la URL oficial del Boxart / Carátula vertical de Nintendo CDN
 */
export function getNintendoBoxartUrl(gameName) {
  if (!gameName) return "";
  let clean = gameName
    .replace(/\[\s*\d+(\.\d+)?\s*(gb|mb)\s*\]/gi, "")
    .replace(/\(\s*\d+(\.\d+)?\s*(gb|mb)\s*\)/gi, "")
    .replace(/\+.*$/, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/for nintendo switch( 2)?/gi, "")
    .replace(/nintendo switch( 2)?/gi, "")
    .replace(/edition/gi, "")
    .trim();

  const slug = clean
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) return "";
  const firstChar = slug.charAt(0);
  return `https://assets.nintendo.com/image/upload/c_fill,f_auto,q_auto,w_500/ncom/en_US/games/switch/${firstChar}/${slug}-switch/boxart`;
}

// Las URLs del CDN de Nintendo no se pueden deducir con certeza para todos los
// títulos (algunos usan un slug interno distinto). Nunca debemos guardar una
// URL sólo porque "parece" correcta: primero se comprueba que la imagen carga.
const nintendoCoverCache = new Map();

function verifyRemoteImage(url, timeoutMs = 7000) {
  if (!url || typeof Image === "undefined") return Promise.resolve(false);

  return new Promise((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(() => finish(false), timeoutMs);
    let finished = false;

    const finish = (result) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      resolve(result);
    };

    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = url;
  });
}

/**
 * Consulta la API oficial de búsqueda de Nintendo eShop (Algolia)
 * Devuelve títulos oficiales, slugs, imágenes oficiales (hero y boxart), géneros, etc.
 */
export async function searchNintendoOfficialCatalog(query) {
  if (!query || typeof query !== "string") return [];
  const cleanQuery = query
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/for nintendo switch( 2)?/gi, "")
    .replace(/nintendo switch( 2)?/gi, "")
    .replace(/edition/gi, "")
    .trim();

  if (!cleanQuery) return [];

  try {
    const res = await fetch("https://u3b6gr4ua3-dsn.algolia.net/1/indexes/*/queries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-algolia-application-id": "U3B6GR4UA3",
        "x-algolia-api-key": "c4da8be7fd29f0f5bfa42920b0a99dc7"
      },
      body: JSON.stringify({
        requests: [{
          indexName: "ncom_game_en_us",
          params: `query=${encodeURIComponent(cleanQuery)}&hitsPerPage=10`
        }]
      })
    });

    if (!res.ok) return [];
    const json = await res.json();
    const hits = json?.results?.[0]?.hits || [];
    return hits.map(h => {
      const hero = h.horizontalHeaderImage || null;
      const boxart = h.boxart || (hero ? hero.replace(/\/hero$/, '/boxart') : null);
      return {
        title: (h.title || "").replace(/™|®/g, "").trim(),
        officialTitle: h.title || "",
        slug: h.slug || "",
        nsuid: h.nsuid || null,
        heroUrl: hero,
        boxartUrl: boxart,
        coverUrl: hero || boxart || null,
        genres: Array.isArray(h.genres) ? h.genres : [],
        publishers: Array.isArray(h.publishers) ? h.publishers : [],
        description: h.description || "",
        releaseDate: h.releaseDateDisplay || null,
        msrp: h.msrp || null
      };
    });
  } catch (err) {
    console.error("Error buscando en catálogo oficial de Nintendo:", err);
    return [];
  }
}

/**
 * Devuelve sólo una portada oficial que se pudo cargar realmente. Intenta hero
 * y boxart, pues ambos formatos no están disponibles para todos los títulos.
 */
export async function resolveNintendoOfficialCover(gameName) {
  const cacheKey = normalizeGameName(gameName || "");
  if (!cacheKey) return "";
  if (nintendoCoverCache.has(cacheKey)) return nintendoCoverCache.get(cacheKey);

  // 1. Probar primero con la API oficial de Nintendo
  try {
    const hits = await searchNintendoOfficialCatalog(gameName);
    if (hits.length > 0) {
      const targetNorm = normalizeGameName(gameName);
      const exactMatch = hits.find(h => normalizeGameName(h.title) === targetNorm);
      const best = exactMatch || hits[0];
      const officialImg = best.heroUrl || best.boxartUrl;
      if (officialImg && await verifyRemoteImage(officialImg)) {
        nintendoCoverCache.set(cacheKey, officialImg);
        return officialImg;
      }
    }
  } catch (e) {
    console.warn("Fallo al consultar API oficial de Nintendo, usando fallback de CDN:", e);
  }

  // 2. Fallback: Probar URLs construidas directamente por slug
  const candidates = [
    getNintendoOfficialHeroUrl(gameName),
    getNintendoBoxartUrl(gameName)
  ].filter(Boolean);

  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await verifyRemoteImage(candidate)) {
      nintendoCoverCache.set(cacheKey, candidate);
      return candidate;
    }
  }

  nintendoCoverCache.set(cacheKey, "");
  return "";
}

/**
 * Obtiene los overrides de stock manual de Firestore (con fallback local)
 */
export async function getSwitchStockOverrides() {
  let localData = {};
  try {
    const raw = localStorage.getItem("panda_switch_stock_overrides");
    if (raw) localData = JSON.parse(raw) || {};
  } catch (e) {}

  try {
    // 1. Probar en config (permisos públicos garantizados)
    let snap = await getDoc(doc(db, "config", "switch_stock_overrides"));
    if (!snap.exists()) {
      // 2. Probar en settings
      snap = await getDoc(doc(db, "settings", "switch_stock_overrides"));
    }
    if (snap.exists()) {
      const remoteData = snap.data() || {};
      const merged = { ...localData, ...remoteData };
      try {
        localStorage.setItem("panda_switch_stock_overrides", JSON.stringify(merged));
      } catch (e) {}
      return merged;
    }
  } catch (e) {
    console.warn("No se pudieron cargar overrides remotos de stock Switch:", e);
  }
  return localData;
}

/**
 * Guarda o quita el stock manual de un juego Switch en Firestore y en caché local
 */
export async function setSwitchGameManualStock(canonKey, isForcedAvailable, forcedCount = 5) {
  if (!canonKey) return;
  
  // 1. Actualizar siempre localmente primero para respuesta instantánea
  let localData = {};
  try {
    const raw = localStorage.getItem("panda_switch_stock_overrides");
    if (raw) localData = JSON.parse(raw) || {};
  } catch (e) {}

  if (isForcedAvailable) {
    localData[canonKey] = {
      forceAvailable: true,
      count: Number(forcedCount) || 5,
      updatedAt: new Date().toISOString()
    };
  } else {
    delete localData[canonKey];
  }

  try {
    localStorage.setItem("panda_switch_stock_overrides", JSON.stringify(localData));
  } catch (e) {}

  // 2. Persistir en Firestore (en config y settings)
  try {
    const docConfig = doc(db, "config", "switch_stock_overrides");
    await setDoc(docConfig, localData, { merge: true }).catch(() => {});
    const docSettings = doc(db, "settings", "switch_stock_overrides");
    await setDoc(docSettings, localData, { merge: true }).catch(() => {});
  } catch (e) {
    console.warn("Aviso al guardar en Firestore (se mantuvo en local):", e);
  }

  _cachedStockResult = null; // invalidar caché
  _lastStockFetchTime = 0;
  return true;
}

// Caché en memoria para evitar consultas lentas y repetitivas a Firestore
let _cachedStockResult = null;
let _lastStockFetchTime = 0;
const STOCK_CACHE_TTL_MS = 60 * 1000; // 60 segundos de caché

/**
 * Carga todos los packs disponibles y calcula el mapa de stock por título y por variante
 */
export async function calculateSwitchStockMap(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _cachedStockResult && (now - _lastStockFetchTime < STOCK_CACHE_TTL_MS)) {
    return _cachedStockResult;
  }

  try {
    const packsRef = collection(db, "packs_nintendo");
    const snap = await getDocs(packsRef);
    
    const stockMap = new Map(); // variantKey -> { count, baseCanonical, itemType, itemTypeLabel, originalNames: Set, packIds: [], packDetails: [] }
    const allParsedItems = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.disponible === false) return;

      const rawJuegos = Array.isArray(data.juegos) ? data.juegos : [];
      const packId = docSnap.id;
      const seenInThisPack = new Set();

      // precio_clp es el precio de venta publicado del pack, NO el costo del
      // proveedor. Para no subestimar, el costo viene de USD o costo_clp.
      const precioUSD = parseProviderAmount(data.precio_usd ?? data.precioUSD ?? data.priceUSD);
      const precioCLP = parseProviderAmount(data.costo_clp ?? data.costoCLP) ||
        (precioUSD > 0 ? Math.round(precioUSD * SWITCH_PROVIDER_USD_TO_CLP) : 0);

      // Limpiar y filtrar juegos del pack (omitiendo F2P), preservando el tag [DLC Only] para inspección clara
      const cleanedPackJuegos = rawJuegos
        .filter(j => !isFreeToPlayGame(j))
        .map(j => formatGameDisplayName(j, true))
        .filter(Boolean);

      rawJuegos.forEach((juegoRaw) => {
        if (!juegoRaw || typeof juegoRaw !== "string") return;
        const cleanRaw = juegoRaw.trim();

        // 1. Filtrar juegos Free-to-Play
        if (isFreeToPlayGame(cleanRaw)) return;

        const canonicalKey = resolveCanonical(cleanRaw);
        if (!canonicalKey) return;

        const classified = classifySwitchItem(cleanRaw);
        allParsedItems.push(classified);

        // Clave única por variante para que "Cuphead", "Cuphead + DLC" y "Cuphead [Solo DLC]"
        // sean elementos estrictamente independientes en stock y en "Ver Packs"
        const variantKey = `${canonicalKey}___${classified.type}`;

        // Evitar duplicar conteo si el pack lista el juego más de una vez
        if (seenInThisPack.has(variantKey)) return;
        seenInThisPack.add(variantKey);

        if (!stockMap.has(variantKey)) {
          stockMap.set(variantKey, {
            count: 0,
            baseCanonical: canonicalKey,
            itemType: classified.type,
            itemTypeLabel: classified.label,
            originalNames: new Set(),
            packIds: [],
            packDetails: [],
            preciosUSD: [],
            preciosCLP: []
          });
        }

        const entry = stockMap.get(variantKey);
        entry.count += 1;
        entry.originalNames.add(formatGameDisplayName(cleanRaw));
        entry.packIds.push(packId);

        // Guardar detalles del pack para inspección del admin (solo packs que contienen esta variante)
        entry.packDetails.push({
          packId,
          nickname: data.nickname || data.id_pack || data.titulo || "",
          precioUSD,
          precioCLP,
          juegos: cleanedPackJuegos
        });

        if (precioUSD > 0) {
          entry.preciosUSD.push(precioUSD);
        }
        if (precioCLP > 0) {
          entry.preciosCLP.push(precioCLP);
        }
      });
    });

    // Aplicar manual stock overrides configurados por el administrador
    try {
      const overridesSnap = await getDoc(doc(db, "settings", "switch_stock_overrides"));
      if (overridesSnap.exists()) {
        const overrides = overridesSnap.data() || {};
        for (const [canonKey, overrideData] of Object.entries(overrides)) {
          if (!overrideData || !overrideData.forceAvailable) continue;
          const forcedCount = Number(overrideData.count) || 5;
          const baseKey = `${canonKey}___base_game`;
          if (stockMap.has(baseKey)) {
            const existing = stockMap.get(baseKey);
            existing.count = Math.max(existing.count, forcedCount);
            existing.isManualStock = true;
          } else {
            stockMap.set(baseKey, {
              count: forcedCount,
              baseCanonical: canonKey,
              itemType: "base_game",
              itemTypeLabel: "Juego Base",
              originalNames: new Set([canonKey]),
              packIds: ["manual_override"],
              packDetails: [{ packId: "manual_override", packName: "Stock Forzado Manual", precioUSD: 0, costoCLP: 0, rawJuegos: [canonKey] }],
              isManualStock: true
            });
          }
        }
      }
    } catch (e) {
      console.warn("Error leyendo switch_stock_overrides:", e);
    }

    const result = {
      stockMap,
      allParsedItems,
      totalPacks: snap.size
    };
    _cachedStockResult = result;
    _lastStockFetchTime = Date.now();

    return result;
  } catch (error) {
    console.error("Error al calcular stock de Nintendo Switch:", error);
    return {
      stockMap: new Map(),
      allParsedItems: [],
      totalPacks: 0
    };
  }
}

/**
 * Obtiene el resumen de costos y precios de un juego en los packs,
 * asegurando los márgenes solicitados por el administrador:
 * - Ganancia Revendedor fija: +$5.000 CLP netos sobre costo real
 * - Ganancia Cliente Final: Precios competitivos realistas (Minecraft ~$10.000, Stardew Valley ~$9.990)
 * - NUNCA supera el valor oficial de la Nintendo eShop
 */
export function getGamePackCostSummary(gameData, gameName = "") {
  if (!gameData) {
    return {
      minUSD: 0,
      avgUSD: 0,
      maxUSD: 0,
      minCLP: 0,
      avgCLP: 0,
      maxCLP: 0,
      entryCostCLP: 0,
      estimatedCostCLP: 0,
      precioRevendedor: 5000,
      suggestedPrimaria: 10000,
      suggestedSecundaria: 0,
      suggestedRetailCLP: 10000,
      officialPriceCLP: 59990
    };
  }
  
  const preciosUSD = Array.isArray(gameData.preciosUSD) ? gameData.preciosUSD : [];
  const preciosCLP = Array.isArray(gameData.preciosCLP) ? gameData.preciosCLP : [];

  const minUSD = preciosUSD.length > 0 ? Math.min(...preciosUSD) : 0;
  const maxUSD = preciosUSD.length > 0 ? Math.max(...preciosUSD) : 0;
  const avgUSD = preciosUSD.length > 0 ? (preciosUSD.reduce((a, b) => a + b, 0) / preciosUSD.length) : 0;
  const minCLP = preciosCLP.length > 0 ? Math.min(...preciosCLP) : (minUSD * SWITCH_PROVIDER_USD_TO_CLP);
  const maxCLP = preciosCLP.length > 0 ? Math.max(...preciosCLP) : (maxUSD * SWITCH_PROVIDER_USD_TO_CLP);
  const avgCLP = preciosCLP.length > 0 ? (preciosCLP.reduce((a, b) => a + b, 0) / preciosCLP.length) : (avgUSD * SWITCH_PROVIDER_USD_TO_CLP);

  // El costo base realista de reposición se fundamenta en el costo MÍNIMO de entrada
  // disponible en los packs del proveedor (o promedio si hay dispersión controlada),
  // NUNCA en el pack más caro (que suele ser un bundle de muchos juegos inflando el costo individual).
  const entryCostCLP = minCLP > 0 ? minCLP : (avgCLP > 0 ? Math.round(avgCLP) : 5000);
  const estimatedCostCLP = entryCostCLP;

  // Precio oficial de referencia en Nintendo eShop Chile para fijar techo de mercado
  const nameToUse = gameName || Array.from(gameData.originalNames || [])[0] || gameData.baseCanonical || "";
  const officialPriceCLP = getNintendoOfficialReferencePrice(nameToUse, gameData.itemType);

  // Ganancia Revendedor PandaStore: FIJA +$5.000 CLP netos sobre costo real
  const precioRevendedor = estimatedCostCLP + 5000;

  // Cálculo inteligente y realista de precio público:
  // Casos especiales indicados por el administrador:
  const normName = nameToUse.toLowerCase();
  let baseSuggestedRetail = estimatedCostCLP + 10000;

  const itemType = gameData.itemType || "base_game";

  if (itemType === "dlc_only") {
    // Solo DLC tiene un valor menor al juego base
    baseSuggestedRetail = Math.max(6990, Math.min(10990, estimatedCostCLP + 4000));
  } else if (itemType === "game_dlc") {
    // Juego + DLC tiene un valor superior por incluir la expansión
    if (normName.includes("minecraft dungeons")) {
      baseSuggestedRetail = 15990;
    } else if (normName.includes("minecraft")) {
      baseSuggestedRetail = 14990;
    } else {
      baseSuggestedRetail = Math.max(18990, Math.ceil((estimatedCostCLP + 9000) / 1000) * 1000);
    }
  } else if (normName.includes("minecraft dungeons")) {
    // Minecraft Dungeons base
    baseSuggestedRetail = 12990;
  } else if (normName.includes("minecraft legends")) {
    // Minecraft Legends base
    baseSuggestedRetail = 13990;
  } else if (normName.includes("minecraft")) {
    // Minecraft Base estándar (~$10.000 CLP)
    baseSuggestedRetail = Math.max(9990, Math.min(11990, estimatedCostCLP + 5000));
  } else if (normName.includes("stardew valley")) {
    // Oficial $14.990 -> Sugerido $8.990 - $9.990
    baseSuggestedRetail = Math.max(8990, Math.min(10990, estimatedCostCLP + 5000));
  } else if (normName.includes("overcooked")) {
    // Oficial $29.990 -> Sugerido $12.990 - $14.990
    baseSuggestedRetail = Math.max(12990, Math.min(15990, estimatedCostCLP + 6000));
  } else if (officialPriceCLP <= 19990) {
    // Indies / títulos económicos (Hollow Knight, Celeste, Undertale, etc.)
    baseSuggestedRetail = Math.max(7990, Math.min(11990, estimatedCostCLP + 5000));
  } else {
    // Títulos AAA o primer partido ($59.990 - $69.990)
    baseSuggestedRetail = Math.max(16000, Math.ceil((estimatedCostCLP + 10000) / 1000) * 1000);
  }

  // Techo estricto: El precio sugerido NUNCA puede superar el 70% del valor oficial de Nintendo eShop
  const maxAllowedCeiling = Math.max(estimatedCostCLP + 5000, Math.round((officialPriceCLP * 0.70) / 1000) * 1000);
  const suggestedPrimaria = Math.min(baseSuggestedRetail, maxAllowedCeiling);
  const suggestedSecundaria = 0; // Nintendo Switch se vende exclusivamente como Cuenta Primaria

  return {
    minUSD,
    avgUSD: Math.round(avgUSD * 10) / 10,
    maxUSD,
    minCLP,
    avgCLP: Math.round(avgCLP),
    maxCLP: Math.round(maxCLP),
    entryCostCLP,
    estimatedCostCLP,
    precioRevendedor,
    suggestedPrimaria,
    suggestedSecundaria,
    suggestedRetailCLP: suggestedPrimaria,
    officialPriceCLP
  };
}

let _lastStockMapRef = null;
const _stockCountCache = new Map();

/**
 * Obtiene el stock de un juego específico contra el stockMap con tolerancia multilingüe y de variantes (Memoizado O(1))
 */
export function getGameStockCount(gameName, stockMap, requireBaseGame = true) {
  if (!gameName || !stockMap || !(stockMap instanceof Map) || stockMap.size === 0) return 0;

  if (stockMap !== _lastStockMapRef) {
    _stockCountCache.clear();
    _lastStockMapRef = stockMap;
  }

  const cacheKey = `${gameName}__${requireBaseGame ? "1" : "0"}`;
  if (_stockCountCache.has(cacheKey)) {
    return _stockCountCache.get(cacheKey);
  }

  const classified = classifySwitchItem(gameName);
  const canonicalKey = resolveCanonical(gameName);
  const isBaseProduct = classified.type === "base_game";

  let finalCount = 0;

  // CASO 1: Si es producto base (o se requiere juego base obligatorio):
  // REGLA FUNDAMENTAL DE NEGOCIO:
  // Solo los packs que contengan el juego base ("base_game" o "game_dlc") otorgan stock válido.
  // Los packs "dlc_only" (ej: Super Mario Party Jamboree [DLC Only]) NUNCA deben otorgar stock a un juego base.
  if (isBaseProduct && requireBaseGame) {
    let totalBaseStock = 0;
    const baseKey = `${canonicalKey}___base_game`;
    const comboKey = `${canonicalKey}___game_dlc`;

    if (stockMap.has(baseKey)) {
      totalBaseStock += stockMap.get(baseKey).count;
    }
    if (stockMap.has(comboKey)) {
      totalBaseStock += stockMap.get(comboKey).count;
    }
    if (totalBaseStock > 0) {
      _stockCountCache.set(cacheKey, totalBaseStock);
      return totalBaseStock;
    }

    // Buscar coincidencia canónica exacta en todo el mapa excluyendo dlc_only
    for (const [key, value] of stockMap.entries()) {
      const [cleanKey, itemType] = key.split("___");
      if (itemType === "dlc_only") continue; // NUNCA DLC ONLY PARA JUEGO BASE
      if (cleanKey === canonicalKey) {
        totalBaseStock += value.count;
      }
    }
    if (totalBaseStock > 0) {
      _stockCountCache.set(cacheKey, totalBaseStock);
      return totalBaseStock;
    }

    // Búsqueda por similitud/subcadena con desambiguación estricta
    for (const [key, value] of stockMap.entries()) {
      const [cleanKey, itemType] = key.split("___");
      if (itemType === "dlc_only") continue; // NUNCA DLC ONLY

      if (cleanKey.length >= 6 && canonicalKey.length >= 6) {
        // Desambiguaciones críticas para evitar falsos positivos
        if (cleanKey.includes("jamboree") !== canonicalKey.includes("jamboree")) continue;
        if (cleanKey.includes("superstars") !== canonicalKey.includes("superstars")) continue;
        if (cleanKey.includes("dungeon") !== canonicalKey.includes("dungeon")) continue;
        if (cleanKey.includes("legend") !== canonicalKey.includes("legend")) continue;
        if (cleanKey.includes("odyssey") !== canonicalKey.includes("odyssey")) continue;
        if (cleanKey.includes("wonder") !== canonicalKey.includes("wonder")) continue;
        if (cleanKey.includes("maker") !== canonicalKey.includes("maker")) continue;

        if (cleanKey.includes(canonicalKey) || canonicalKey.includes(cleanKey)) {
          _stockCountCache.set(cacheKey, value.count);
          return value.count;
        }
      }
    }
    _stockCountCache.set(cacheKey, 0);
    return 0;
  }

  // CASO 2: Consulta de variante específica (dlc_only o game_dlc)
  const variantKey = `${canonicalKey}___${classified.type}`;
  if (stockMap.has(variantKey)) {
    finalCount = stockMap.get(variantKey).count;
    _stockCountCache.set(cacheKey, finalCount);
    return finalCount;
  }

  if (stockMap.has(canonicalKey)) {
    finalCount = stockMap.get(canonicalKey).count;
    _stockCountCache.set(cacheKey, finalCount);
    return finalCount;
  }

  const baseKey = `${canonicalKey}___base_game`;
  if (stockMap.has(baseKey)) {
    finalCount = stockMap.get(baseKey).count;
    _stockCountCache.set(cacheKey, finalCount);
    return finalCount;
  }

  for (const [key, value] of stockMap.entries()) {
    const [cleanKey] = key.split("___");
    if (cleanKey.length >= 6 && canonicalKey.length >= 6) {
      if (cleanKey.includes(canonicalKey) || canonicalKey.includes(cleanKey)) {
        finalCount = value.count;
        _stockCountCache.set(cacheKey, finalCount);
        return finalCount;
      }
    }
  }

  _stockCountCache.set(cacheKey, 0);
  return 0;
}

/**
 * Genera el enlace de WhatsApp para solicitar stock de un juego agotado
 */
export function buildStockRequestWhatsappUrl(gameName) {
  const msg = `¡Hola PandaStore! Me interesa comprar ${gameName || 'un juego'} para Nintendo Switch pero veo que está agotado en la web. ¿Cuándo tendrán disponibilidad de cuenta o pack con este juego?`;
  return `https://wa.me/${WHATSAPP_OFICIAL}?text=${encodeURIComponent(msg)}`;
}
