import React, { useState, useEffect, useMemo } from "react";
import { db, storage, auth } from "../../firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  Gamepad2,
  Search,
  CheckCircle,
  ExternalLink,
  Sparkles,
  Layers,
  Image as ImageIcon,
  DollarSign,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Filter,
  BarChart3,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  Trophy,
  RotateCcw,
  Check,
  Trash2,
  Plus,
  Globe
} from "lucide-react";
import {
  calculateSwitchStockMap,
  normalizeGameName,
  classifySwitchItem,
  getGamePackCostSummary,
  formatGameDisplayName,
  isFreeToPlayGame,
  getNintendoOfficialHeroUrl,
  getNintendoBoxartUrl,
  resolveNintendoOfficialCover,
  getNintendoOfficialReferencePrice,
  searchNintendoOfficialCatalog,
  getSwitchStockOverrides,
  setSwitchGameManualStock
} from "../../utils/switchStockHelper";
import {
  getResellerDiscountsConfig,
  PANDASTORE_MIN_PROFIT_CLP
} from "../../utils/priceHelper";
import "./AdminJuegosSinPublicar.css";

function formatCLP(n) {
  return "$" + (Number(n) || 0).toLocaleString("es-CL");
}

const SWITCH_GENRES = [
  { id: "todos", label: "🌐 Todos los géneros", icon: "🌐" },
  { id: "carreras", label: "🏎️ Carreras", icon: "🏎️" },
  { id: "pelea", label: "🥊 Lucha / Pelea", icon: "🥊" },
  { id: "accion", label: "⚔️ Acción", icon: "⚔️" },
  { id: "aventura", label: "🗺️ Aventura", icon: "🗺️" },
  { id: "plataformas", label: "🍄 Plataformas", icon: "🍄" },
  { id: "rpg", label: "🧙‍♂️ RPG", icon: "🧙‍♂️" },
  { id: "deportes", label: "⚽ Deportes", icon: "⚽" },
  { id: "simulacion", label: "🚜 Simulación", icon: "🚜" },
  { id: "estrategia", label: "🧠 Estrategia", icon: "🧠" },
  { id: "terror", label: "👻 Terror", icon: "👻" },
  { id: "infantil", label: "🎈 Infantil / Familiar", icon: "🎈" }
];

function getSwitchGenre(title) {
  const name = String(title || "").toLowerCase();
  // 1. Carreras
  if (/(mario kart|crash team|hot wheels|need for speed|grid|racing|racer|f1|cars|asphalt|burnout|wrc|moto|rally|fast rmx|gear\.club|chocobo gp|wreckfest)/.test(name)) return "carreras";
  // 2. Pelea / Lucha
  if (/(street fighter|mortal kombat|dragon ball|naruto|tekken|guilty gear|smash|brawlhalla|fight|fighter|kombat|injustice|marvel|demon slayer|my hero|jojo|one piece|king of fighters|snk|jump force|arms|taiko|melty blood|under night)/.test(name)) return "pelea";
  // 3. Deportes
  if (/(fifa|fc 24|fc 25|fc |efootball|nba|tennis|golf|football|soccer|wwe|sport|tony hawk|skate|olympic|mario golf|mario tennis|mario strikers|windjammers|captain tsubasa)/.test(name)) return "deportes";
  // 4. Terror
  if (/(resident evil|outlast|alien isolation|amnesia|dead by daylight|five nights|fnaf|horror|blair witch|tormented souls|signalis|fatal frame|project zero)/.test(name)) return "terror";
  // 5. RPG
  if (/(pokemon|final fantasy|persona|xenoblade|monster hunter|fire emblem|octopath|rpg|dragon quest|diablo|witcher|skyrim|tales of|dark souls|shin megami|bravely|ni no kuni|ys |chrono|sea of stars|live a live|paper mario|mario & luigi)/.test(name)) return "rpg";
  // 6. Estrategia
  if (/(civilization|strategy|tactics|wars|tycoon|management|pikmin|mario \+ rabbids|advance wars|triangle strategy|tactics ogre|disgaea|fire emblem engage)/.test(name)) return "estrategia";
  // 7. Simulación
  if (/(simulator|simulador|farm|stardew|animal crossing|minecraft|sims|harvest moon|story of seasons|terraria|dreamlight|cozy grove|rune factory|subnautica)/.test(name)) return "simulacion";
  // 8. Infantil / Familiar
  if (/(paw patrol|peppa|bluey|barbie|disney|just dance|wario|party|cocomelon|baby|my little pony|gigantosaurus|peppa pig|ryan)/.test(name)) return "infantil";
  // 9. Plataformas
  if (/(sonic|donkey kong|crash bandicoot|spyro|rayman|celeste|cuphead|shovel knight|yoshi|little nightmares|platformer|super mario 3d|super mario bros|mario wonder|kirby)/.test(name)) return "plataformas";
  // 10. Aventura
  if (/(zelda|assassin|tomb raider|uncharted|metroid|luigi|prince of persia|adventure|journey|batman|hollow knight|ori|dead cells|hades|tunic|deaths door)/.test(name)) return "aventura";
  // Por descarte: Acción
  return "accion";
}

const SWITCH_HISTORICAL_BEST_SELLERS_RANK = [
  // Tier 1: 30M+ - 65M+ copias (Top leyendas absolutas de Nintendo Switch)
  { pattern: /mario kart 8/i, rank: 1, score: 1000, label: "Top Ventas Histórico #1 (64M+)" },
  { pattern: /animal crossing.*new horizons/i, rank: 2, score: 980, label: "Top Ventas Histórico #2 (45M+)" },
  { pattern: /super smash bros.*ultimate|smash bros/i, rank: 3, score: 960, label: "Top Ventas Histórico #3 (35M+)" },
  { pattern: /breath of the wild/i, rank: 4, score: 940, label: "Top Ventas Histórico #4 (32M+)" },
  { pattern: /super mario odyssey/i, rank: 5, score: 920, label: "Top Ventas Histórico #5 (28M+)" },

  // Tier 2: 20M+ - 29M+ copias
  { pattern: /pok[eé]mon.*(sword|shield|espada|escudo)/i, rank: 6, score: 900, label: "Top Ventas Histórico #6 (26M+)" },
  { pattern: /pok[eé]mon.*(scarlet|violet|escarlata|p[uú]rpura)/i, rank: 7, score: 880, label: "Top Ventas Histórico #7 (25M+)" },
  { pattern: /super mario party(?!.*jamboree)(?!.*superstars)/i, rank: 8, score: 860, label: "Top Ventas Histórico #8 (21M+)" },
  { pattern: /tears of the kingdom/i, rank: 9, score: 850, label: "Top Ventas Histórico #9 (21M+)" },
  { pattern: /new super mario bros.*u/i, rank: 10, score: 840, label: "Top Ventas Histórico #10 (18M+)" },

  // Tier 3: 13M+ - 19M+ copias
  { pattern: /super mario bros.*wonder|mario wonder/i, rank: 11, score: 820, label: "Top Ventas Histórico #11 (14M+)" },
  { pattern: /super mario party jamboree|party jamboree/i, rank: 12, score: 810, label: "Top Ventas 2024 (Jamboree)" },
  { pattern: /pok[eé]mon.*(brilliant diamond|shining pearl|diamante brillante|perla reluciente)/i, rank: 13, score: 800, label: "Top Ventas Histórico #13 (15M+)" },
  { pattern: /pok[eé]mon.*let's go/i, rank: 14, score: 790, label: "Top Ventas Histórico #14 (15M+)" },
  { pattern: /pok[eé]mon.*(legends.*arceus|leyendas.*arceus)/i, rank: 15, score: 780, label: "Top Ventas Histórico #15 (15M+)" },
  { pattern: /luigi'?s mansion 3/i, rank: 16, score: 770, label: "Top Ventas Histórico #16 (14M+)" },
  { pattern: /super mario 3d world|bowser'?s fury/i, rank: 17, score: 760, label: "Top Ventas Histórico #17 (13M+)" },
  { pattern: /mario party superstars/i, rank: 18, score: 750, label: "Top Ventas Histórico #18 (13M+)" },
  { pattern: /nintendo switch sports/i, rank: 19, score: 740, label: "Top Ventas Histórico #19 (13M+)" },
  { pattern: /splatoon 2/i, rank: 20, score: 730, label: "Top Ventas Histórico #20 (13M+)" },
  { pattern: /splatoon 3/i, rank: 21, score: 720, label: "Top Ventas Histórico #21 (12M+)" },

  // Tier 4: 5M+ - 12M+ copias
  { pattern: /super mario 3d all-stars/i, rank: 22, score: 700, label: "Top Ventas #22 (9M+)" },
  { pattern: /super mario maker 2/i, rank: 23, score: 690, label: "Top Ventas #23 (8M+)" },
  { pattern: /monster hunter rise/i, rank: 24, score: 680, label: "Top Ventas #24 (8M+)" },
  { pattern: /kirby and the forgotten land|kirby.*tierra olvidada/i, rank: 25, score: 670, label: "Top Ventas #25 (7M+)" },
  { pattern: /link'?s awakening/i, rank: 26, score: 660, label: "Top Ventas #26 (6M+)" },
  { pattern: /echoes of wisdom/i, rank: 27, score: 655, label: "Top Ventas 2024 (Zelda)" },
  { pattern: /mario tennis aces/i, rank: 28, score: 650, label: "Top Ventas #28 (5M+)" },
  { pattern: /donkey kong.*tropical freeze/i, rank: 29, score: 640, label: "Top Ventas #29 (5M+)" },
  { pattern: /kirby star allies/i, rank: 30, score: 630, label: "Top Ventas #30 (4M+)" },
  { pattern: /fire emblem.*three houses/i, rank: 31, score: 620, label: "Top Ventas #31 (4M+)" },
  { pattern: /metroid dread/i, rank: 32, score: 610, label: "Top Ventas #32 (3M+)" },
  { pattern: /minecraft/i, rank: 33, score: 600, label: "Top Más Jugados (Minecraft)" },
  { pattern: /ea sports fc|fifa/i, rank: 34, score: 590, label: "Top Ventas (Fútbol EA FC)" },
  { pattern: /hogwarts legacy/i, rank: 35, score: 580, label: "Top Éxito (Hogwarts Legacy)" },
  { pattern: /mario.*rabbids/i, rank: 36, score: 570, label: "Top Ventas (Mario + Rabbids)" },
  { pattern: /stardew valley/i, rank: 37, score: 560, label: "Top Más Jugados (Stardew)" },
  { pattern: /it takes two/i, rank: 38, score: 550, label: "Top Cooperativo (It Takes Two)" },
  { pattern: /overcooked/i, rank: 39, score: 540, label: "Top Party (Overcooked)" },
  { pattern: /hollow knight/i, rank: 40, score: 530, label: "Top Indie (Hollow Knight)" },
  { pattern: /cuphead/i, rank: 41, score: 520, label: "Top Indie (Cuphead)" },
  { pattern: /just dance/i, rank: 42, score: 510, label: "Top Familiar (Just Dance)" },
  { pattern: /grand theft auto|gta/i, rank: 43, score: 500, label: "Top Ventas (GTA Trilogy)" },
  { pattern: /red dead redemption/i, rank: 44, score: 490, label: "Top Éxito (Red Dead)" },
  { pattern: /xenoblade/i, rank: 45, score: 480, label: "Top RPG (Xenoblade)" },
  { pattern: /sonic/i, rank: 46, score: 470, label: "Top Plataformas (Sonic)" },
  { pattern: /crash bandicoot/i, rank: 47, score: 460, label: "Top Plataformas (Crash)" },
  { pattern: /spyro/i, rank: 48, score: 450, label: "Top Plataformas (Spyro)" },
  { pattern: /paper mario/i, rank: 49, score: 440, label: "Top RPG (Paper Mario)" },
  { pattern: /mario & luigi|mario y luigi/i, rank: 50, score: 430, label: "Top RPG (Mario & Luigi)" },
  { pattern: /dragon ball/i, rank: 51, score: 420, label: "Top Anime (Dragon Ball)" },
  { pattern: /persona (5|4|3)/i, rank: 52, score: 410, label: "Top RPG (Persona)" },
  { pattern: /witcher 3/i, rank: 53, score: 400, label: "Top RPG (The Witcher 3)" },
  { pattern: /resident evil/i, rank: 54, score: 390, label: "Top Terror (Resident Evil)" },
  { pattern: /hades/i, rank: 55, score: 380, label: "Top Roguelike (Hades)" },
  { pattern: /celeste/i, rank: 56, score: 370, label: "Top Indie (Celeste)" },
  { pattern: /dead cells/i, rank: 57, score: 360, label: "Top Indie (Dead Cells)" },
  { pattern: /metroid prime/i, rank: 58, score: 350, label: "Top Aventura (Metroid Prime)" }
];

function getSwitchHistoricalSalesInfo(title) {
  const t = String(title || "").trim();
  for (const item of SWITCH_HISTORICAL_BEST_SELLERS_RANK) {
    if (item.pattern.test(t)) {
      return item;
    }
  }
  if (/(mario|zelda|pokemon|pokémon)/i.test(t)) {
    return { rank: 90, score: 250, label: "Franquicia Top Nintendo" };
  }
  if (/(sonic|kirby|metroid|donkey kong|splatoon|fire emblem|pikmin)/i.test(t)) {
    return { rank: 120, score: 180, label: "Franquicia Nintendo" };
  }
  return { rank: 999, score: 0, label: null };
}

function isPopularSwitchTitle(title) {
  return getSwitchHistoricalSalesInfo(title).score > 0 || /(zelda|mario|pokemon|animal crossing|minecraft|super smash|mario kart|sonic|kirby|metroid|donkey kong|splatoon|fire emblem|xenoblade|hollow knight|cuphead|stardew|lego|dragon ball|naruto|mortal kombat|just dance|gta|grand theft|red dead|hogwarts|ea sports|fc 24|fc 25|fifa|monster hunter|bayonetta|luigi|pikmin|persona|witcher|doom|spyro|crash|rayman|assassin|dark souls|borderlands|bioshock|resident evil|it takes two|overcooked|dead cells|celeste|hades|batman|skyrim)/i.test(String(title || ""));
}

function isBestSellerSwitchTitle(title) {
  return getSwitchHistoricalSalesInfo(title).score >= 500;
}

/**
 * Calcula el precio cliente sugerido para garantizar tanto el margen mínimo PandaStore
 * como el descuento para revendedores de Nintendo Switch.
 */
function getSuggestedRetailPrice(costCLP, configOverride = null) {
  const config = configOverride || getResellerDiscountsConfig();
  const rule = config?.categories?.switch || { type: "fixed_clp", value: 5000 };
  const cost = Number(costCLP) || 0;
  const minProfit = Number(rule?.minProfitCLP) > 0 
    ? Number(rule.minProfitCLP) 
    : (Number(config?.minProfitCLP) > 0 ? Number(config.minProfitCLP) : 5000);

  if (rule.type === "percent") {
    const pct = Math.min(90, Math.max(0, Number(rule.value) || 0));
    const divisor = (100 - pct) / 100;
    const basePrice = Math.ceil((cost + minProfit) / (divisor > 0 ? divisor : 1));
    return Math.max(basePrice, cost + 10000);
  } else {
    const discount = Number(rule.value) || 5000;
    const minNeeded = cost + minProfit + discount;
    return Math.max(minNeeded, cost + 10000);
  }
}

/**
 * Calcula automáticamente el precio revendedor a partir del precio cliente final
 * aplicando la regla configurada en el panel de revendedores (ej: -$5.000 CLP en Switch)
 * y garantizando SIEMPRE el piso inquebrantable de Costo + Margen Mínimo CLP netos de ganancia PandaStore.
 */
function calculateAutomaticResellerPrice(precioCliente, costCLP, configOverride = null) {
  const config = configOverride || getResellerDiscountsConfig();
  const rule = config?.categories?.switch || { type: "fixed_clp", value: 5000 };
  const client = Number(precioCliente) || 0;
  const cost = Number(costCLP) || 0;

  let discount = 5000;
  if (rule.type === "percent") {
    const pct = Math.min(100, Math.max(0, Number(rule.value) || 0));
    discount = Math.round((client * pct) / 100);
  } else {
    discount = Number(rule.value) || 5000;
  }

  const rawReseller = client - discount;
  const minProfit = Number(rule?.minProfitCLP) > 0 
    ? Number(rule.minProfitCLP) 
    : (Number(config?.minProfitCLP) > 0 ? Number(config.minProfitCLP) : PANDASTORE_MIN_PROFIT_CLP);
  const minFloor = cost + minProfit;

  if (client <= 0) return minFloor;
  if (client >= minFloor) {
    return Math.max(minFloor, rawReseller);
  }
  // Si el precio ingresado por el administrador es menor al piso de ganancia,
  // el precio revendedor no debe ser mayor que el precio cliente.
  return client;
}

export default function AdminJuegosSinPublicar() {
  const [activeTab, setActiveTab] = useState("analisis"); // "analisis" | "huerfanos"
  const [publishedProducts, setPublishedProducts] = useState([]);
  const [masterGameList, setMasterGameList] = useState([]); // Juegos unificados por baseCanonical (SIN DUPLICADOS)
  const [selectedVariants, setSelectedVariants] = useState({}); // canon -> "base_game" | "game_dlc" | "dlc_only"
  const [loading, setLoading] = useState(true);
  const [syncingStock, setSyncingStock] = useState(false);
  const [repairingCovers, setRepairingCovers] = useState(false);
  const [uploadingCoverId, setUploadingCoverId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState("todos"); // "todos" | "abundante" | "critico" | "agotado" | "publicados" | "sin_publicar" | "riesgo"
  const [variantTypeFilter, setVariantTypeFilter] = useState("todos"); // "todos" | "base_game" | "game_dlc" | "dlc_only"
  const [popularityFilter, setPopularityFilter] = useState("todos");
  const [genreFilter, setGenreFilter] = useState("todos");
  const [sortBy, setSortBy] = useState("mas_vendidos"); // "mas_vendidos" | "stock_desc" | "stock_asc" | "az" | "za" | "precio_desc" | "precio_asc"
  const [hideCatalogGames, setHideCatalogGames] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const [totalPacksInDb, setTotalPacksInDb] = useState(0);

  // Configuración reactiva en tiempo real de descuentos de revendedores
  const [resellerConfig, setResellerConfig] = useState(getResellerDiscountsConfig());

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "reseller_discounts"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.categories) {
          setResellerConfig(prev => ({
            ...prev,
            ...data,
            categories: { ...prev.categories, ...data.categories }
          }));
        }
      }
    });
    return () => unsub();
  }, []);

  // Modal Ajustar Precio (Ingreso único de Precio Cliente con cálculo automático)
  const [adjustingPriceGame, setAdjustingPriceGame] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ primaria: 0, revendedor: 0 });
  const [savingPrice, setSavingPrice] = useState(false);

  // Modal de Publicación con Selección de Variantes y Ajuste Previo de Márgenes
  const [publishingModalGame, setPublishingModalGame] = useState(null);

  // Publicación individual
  const [publishingKey, setPublishingKey] = useState(null);
  const [customPrices, setCustomPrices] = useState({});
  const [customImages, setCustomImages] = useState({});

  // Buscador de carátulas modal
  const [searchingCoverFor, setSearchingCoverFor] = useState(null);
  const [resolvingCover, setResolvingCover] = useState(false);

  // Inspector de Packs del Proveedor con NICKNAMES
  const [inspectingGamePacks, setInspectingGamePacks] = useState(null);

  // Buscador y Publicador Oficial de Nintendo eShop
  const [nintendoSearchModal, setNintendoSearchModal] = useState({
    open: false,
    query: "",
    loading: false,
    results: [],
    selectedGame: null,
    chosenPricePrimaria: 18000,
    chosenPriceRevendedor: 10000,
    chosenStock: 5,
    publishing: false
  });
  const [stockOverridesMap, setStockOverridesMap] = useState({});

  // Cargar catálogo de packs vs productos agrupados por título canónico único
  const scanUnpublishedGames = async (force = false) => {
    setLoading(true);
    const failsafeTimer = setTimeout(() => setLoading(false), 5000);
    try {
      // 1. Obtener packs, stock map y overrides de stock manual
      const [stockRes, overrides] = await Promise.all([
        calculateSwitchStockMap(force === true),
        getSwitchStockOverrides().catch(() => ({}))
      ]);
      const { stockMap, totalPacks } = stockRes;
      setStockOverridesMap(overrides || {});
      if (totalPacks) {
        setTotalPacksInDb(totalPacks);
      }

      // 2. Obtener productos de la tienda (Nintendo Switch)
      const prodSnap = await getDocs(collection(db, "products")).catch(() => ({ forEach: () => {} }));
      const published = [];
      const publishedNormMap = new Map();

      prodSnap.forEach(d => {
        const prod = { id: d.id, ...d.data() };
        const isSwitch =
          prod.categoryId === "VtQaPwP0xXdC1qdz6Hvq" ||
          prod.categoryId === "Y7j7vSXMUgWxFNMkOuwX" ||
          prod.categoryId === "switch" ||
          prod.plataforma === "Nintendo Switch" ||
          (prod.categoria && prod.categoria.toLowerCase().includes("switch"));

        if (isSwitch) {
          published.push(prod);
          if (prod.name) {
            const pClassified = classifySwitchItem(prod.name);
            const pCanon = normalizeGameName(prod.name);
            const pVariantKey = `${pCanon}___${pClassified.type}`;
            publishedNormMap.set(pVariantKey, prod);
            if (pClassified.type === "base_game" && !publishedNormMap.has(pCanon)) {
              publishedNormMap.set(pCanon, prod);
            }
          }
        }
      });
      setPublishedProducts(published);

      // 3. Estructurar juegos agrupados por TÍTULO CANÓNICO ÚNICO (CERO DUPLICADOS)
      // Cada título tiene sus 3 opciones desplegables: Juego Base, Juego + DLC, Solo DLC
      const masterMap = new Map();

      // Procesar títulos encontrados en packs del proveedor
      for (const [variantKey, data] of stockMap.entries()) {
        const rawOriginal = Array.from(data.originalNames)[0] || variantKey;
        const rawName = formatGameDisplayName(rawOriginal);
        
        if (
          isFreeToPlayGame(rawName) ||
          isFreeToPlayGame(rawOriginal) ||
          isFreeToPlayGame(data.baseCanonical)
        ) {
          continue;
        }

        const canonKey = data.baseCanonical || normalizeGameName(rawName);
        const itemType = data.itemType || classifySwitchItem(rawName).type;
        const itemTypeLabel = data.itemTypeLabel || classifySwitchItem(rawName).label;
        const costSummary = getGamePackCostSummary(data, rawName);
        
        // Coincidencia con producto publicado
        const pubProd = publishedNormMap.get(variantKey) || (itemType === "base_game" ? publishedNormMap.get(canonKey) : null);
        const isPub = Boolean(pubProd);

        const costUSD = costSummary.minUSD > 0 ? costSummary.minUSD : (pubProd?.costo_usd || 5);
        const costCLP = costSummary.estimatedCostCLP > 0 ? costSummary.estimatedCostCLP : (pubProd?.costo_clp || Math.round(costUSD * 1000));
        const officialPriceCLP = costSummary.officialPriceCLP || getNintendoOfficialReferencePrice(rawName, itemType);

        // Precios: Cliente final es la base
        const precioPrimaria = pubProd?.pricePrimariaCLP || pubProd?.priceCLP || costSummary.suggestedPrimaria;
        const gananciaClientePrimaria = precioPrimaria - costCLP;

        // Precio revendedor se calcula automáticamente con el margen activo (descuento revendedor) garantizando piso de costo + ganancia
        const autoRevendedor = calculateAutomaticResellerPrice(precioPrimaria, costCLP);
        const precioRevendedor = (pubProd?.priceRevendedorCLP && pubProd.priceRevendedorCLP >= (costCLP + 5000))
          ? pubProd.priceRevendedorCLP
          : autoRevendedor;
        const gananciaRevendedor = precioRevendedor - costCLP;

        const variantObj = {
          variantKey,
          canonKey,
          name: pubProd?.name || rawName,
          type: itemType,
          typeLabel: itemTypeLabel,
          stockCount: data.count || 0,
          isPublished: isPub,
          productId: pubProd?.id || null,
          officialPriceCLP,
          costUSD,
          costCLP,
          minCostUSD: costSummary.minUSD,
          avgCostUSD: costSummary.avgUSD,
          maxCostUSD: costSummary.maxUSD,
          minCostCLP: costSummary.minCLP,
          avgCostCLP: costSummary.avgCLP,
          maxCostCLP: costSummary.maxCLP,
          precioRevendedor,
          gananciaRevendedor,
          precioPrimaria,
          gananciaClientePrimaria,
          packIds: data.packIds || [],
          packDetails: data.packDetails || [],
          originalNames: Array.from(data.originalNames || [])
        };

        const cleanDisplayName = rawName.replace(/\[\s*(dlc\s*only|solo\s*dlc)\s*\]/gi, "").replace(/\+.*$/, "").trim();
        const autoCover = pubProd?.imageUrl || pubProd?.image || customImages[variantKey] || getNintendoBoxartUrl(cleanDisplayName) || getNintendoOfficialHeroUrl(cleanDisplayName);

        if (!masterMap.has(canonKey)) {
          masterMap.set(canonKey, {
            canonKey,
            displayName: cleanDisplayName,
            coverUrl: autoCover,
            officialPriceCLP,
            totalStock: 0,
            variants: {},
            allPackIds: new Set(),
            allPackDetails: [],
            allOriginalNames: new Set()
          });
        }

        const masterEntry = masterMap.get(canonKey);
        if (pubProd?.imageUrl && (!masterEntry.coverUrl || masterEntry.coverUrl.includes("logo.png"))) {
          masterEntry.coverUrl = pubProd.imageUrl;
        }
        masterEntry.variants[itemType] = variantObj;
        masterEntry.totalStock += variantObj.stockCount;
        variantObj.packIds.forEach(id => masterEntry.allPackIds.add(id));
        variantObj.packDetails.forEach(pd => masterEntry.allPackDetails.push(pd));
        variantObj.originalNames.forEach(on => masterEntry.allOriginalNames.add(on));
      }

      // 4. Agregar productos publicados en tienda que actualmente tienen 0 stock en packs
      // y asegurar que todos los productos publicados de Switch queden vinculados y visibles
      for (const prod of published) {
        if (!prod || !prod.name) continue;
        const pClassified = classifySwitchItem(prod.name);
        const canonKey = normalizeGameName(prod.name);
        if (isFreeToPlayGame(prod.name) || isFreeToPlayGame(canonKey)) continue;

        if (!masterMap.has(canonKey)) {
          const rawName = formatGameDisplayName(prod.name);
          const cleanDisplayName = rawName.replace(/\[\s*(dlc\s*only|solo\s*dlc)\s*\]/gi, "").replace(/\+.*$/, "").trim();
          const officialPriceCLP = getNintendoOfficialReferencePrice(rawName, pClassified.type);
          masterMap.set(canonKey, {
            canonKey,
            displayName: cleanDisplayName,
            coverUrl: prod.imageUrl || prod.image || getNintendoBoxartUrl(cleanDisplayName) || getNintendoOfficialHeroUrl(cleanDisplayName),
            officialPriceCLP,
            totalStock: prod.stock_cuantitativo || 0,
            variants: {},
            allPackIds: new Set(),
            allPackDetails: [],
            allOriginalNames: new Set([rawName])
          });
        }

        const masterEntry = masterMap.get(canonKey);
        if (!masterEntry.variants[pClassified.type]) {
          const costUSD = prod.costo_usd || 5;
          const costCLP = prod.costo_clp || Math.round(costUSD * 1000);
          const precioPrimaria = prod.pricePrimariaCLP || prod.priceCLP || 18000;
          const autoRevendedor = calculateAutomaticResellerPrice(precioPrimaria, costCLP);
          const precioRevendedor = (prod.priceRevendedorCLP && prod.priceRevendedorCLP >= (costCLP + 5000))
            ? prod.priceRevendedorCLP
            : autoRevendedor;

          masterEntry.variants[pClassified.type] = {
            variantKey: `${canonKey}___${pClassified.type}`,
            canonKey,
            name: formatGameDisplayName(prod.name),
            type: pClassified.type,
            typeLabel: pClassified.label,
            stockCount: prod.stock_cuantitativo || 0,
            isPublished: true,
            productId: prod.id,
            officialPriceCLP: masterEntry.officialPriceCLP,
            costUSD,
            costCLP,
            minCostUSD: costUSD,
            avgCostUSD: costUSD,
            maxCostUSD: costUSD,
            minCostCLP: costCLP,
            avgCostCLP: costCLP,
            maxCostCLP: costCLP,
            precioRevendedor,
            gananciaRevendedor: precioRevendedor - costCLP,
            precioPrimaria,
            gananciaClientePrimaria: precioPrimaria - costCLP,
            packIds: [],
            packDetails: [],
            originalNames: [prod.name]
          };
        } else {
          // Si ya existía por packs, vincular producto publicado con sus datos actuales
          const currentVar = masterEntry.variants[pClassified.type];
          currentVar.isPublished = true;
          currentVar.productId = prod.id;
          if (prod.pricePrimariaCLP || prod.priceCLP) {
            currentVar.precioPrimaria = prod.pricePrimariaCLP || prod.priceCLP;
            currentVar.gananciaClientePrimaria = currentVar.precioPrimaria - currentVar.costCLP;
          }
          if (prod.priceRevendedorCLP) {
            currentVar.precioRevendedor = prod.priceRevendedorCLP;
            currentVar.gananciaRevendedor = prod.priceRevendedorCLP - currentVar.costCLP;
          }
        }
      }

      // Convertir a lista y calcular stockStatus global del juego
      const masterList = Array.from(masterMap.values()).map(g => {
        const isManualForced = Boolean(overrides && overrides[g.canonKey]?.forceAvailable);
        if (isManualForced && g.totalStock === 0) {
          g.totalStock = overrides[g.canonKey].count || 5;
        }

        let stockStatus = "abundante";
        if (g.totalStock === 0) stockStatus = "agotado";
        else if (g.totalStock <= 4) stockStatus = "critico";

        // Variante seleccionada por defecto: Juego Base si existe, o la primera con stock
        const hasBase = Boolean(g.variants.base_game);
        const hasGameDlc = Boolean(g.variants.game_dlc);
        const hasDlcOnly = Boolean(g.variants.dlc_only);

        let defaultVariant = "base_game";
        if (hasBase && g.variants.base_game.stockCount > 0) defaultVariant = "base_game";
        else if (hasGameDlc && g.variants.game_dlc.stockCount > 0) defaultVariant = "game_dlc";
        else if (hasDlcOnly && g.variants.dlc_only.stockCount > 0) defaultVariant = "dlc_only";
        else if (hasBase) defaultVariant = "base_game";
        else if (hasGameDlc) defaultVariant = "game_dlc";
        else defaultVariant = "dlc_only";

        const isAnyPublished = Object.values(g.variants).some(v => v.isPublished);
        const isAllPublished = Object.values(g.variants).every(v => v.isPublished);

        return {
          ...g,
          stockStatus,
          defaultVariant,
          isAnyPublished,
          isAllPublished,
          hasBase,
          hasGameDlc,
          hasDlcOnly,
          isManualStock: isManualForced,
          allPackIds: Array.from(g.allPackIds),
          allOriginalNames: Array.from(g.allOriginalNames)
        };
      });

      // Ordenar: primero los con mayor stock total, luego alfabético
      masterList.sort((a, b) => {
        if (b.totalStock !== a.totalStock) return b.totalStock - a.totalStock;
        return a.displayName.localeCompare(b.displayName);
      });

      setMasterGameList(masterList);

      // Pre-seleccionar variante por defecto
      const initialSelected = {};
      masterList.forEach(g => {
        initialSelected[g.canonKey] = g.defaultVariant;
      });
      setSelectedVariants(prev => ({ ...initialSelected, ...prev }));

    } catch (e) {
      console.error("Error al escanear juegos Switch:", e);
    } finally {
      clearTimeout(failsafeTimer);
      setLoading(false);
    }
  };

  useEffect(() => {
    scanUnpublishedGames();
  }, []);

  // Sincronizar stock real cuantitativo en Firestore para todos los juegos publicados
  const handleSyncAllStock = async () => {
    setSyncingStock(true);
    let updatedCount = 0;
    try {
      for (const master of masterGameList) {
        const baseVariant = master.variants.base_game;
        if (baseVariant && baseVariant.isPublished && baseVariant.productId) {
          const stockReal = baseVariant.stockCount;
          await updateDoc(doc(db, "products", baseVariant.productId), {
            stock_cuantitativo: stockReal,
            available: stockReal > 0,
            stock: stockReal
          });
          updatedCount++;
        }
      }
      alert(`✅ ¡Stock sincronizado con éxito en ${updatedCount} juegos publicados de Nintendo Switch!`);
      await scanUnpublishedGames(true);
    } catch (e) {
      alert(`Error al sincronizar stock: ${e.message}`);
    } finally {
      setSyncingStock(false);
    }
  };

  // Repara publicaciones antiguas que se crearon sin imagen o con la URL
  // tentativa del CDN. Las imágenes propias ya cargadas no se modifican.
  const handleRepairNintendoCovers = async () => {
    // Una publicación antigua puede decir "DLC", "+ DLC" o llevar una
    // etiqueta de consola. Para la portada nunca se busca ese texto: se
    // localiza primero el juego base que ya está agrupado en la lista maestra.
    const getBaseGameNameForCover = (product) => {
      const productCanonical = normalizeGameName(product.name || product.title);
      const master = masterGameList.find((game) => {
        if (game.canonKey === productCanonical) return true;
        return Object.values(game.variants).some((variant) =>
          variant.productId === product.id ||
          normalizeGameName(variant.name) === productCanonical
        );
      });

      if (master?.displayName) return master.displayName;

      // Respaldo para productos que ya no figuran en el stock actual.
      return String(product.name || product.title || "")
        .replace(/\s*(?:\+|[-–—])?\s*(?:solo\s*)?dlc\b.*$/i, "")
        .replace(/\s+(?:no|for)\s+ps[45]\b.*$/i, "")
        .trim();
    };

    const needsReview = publishedProducts.filter((product) => {
      const currentImage = String(product.imageUrl || product.image || "").trim();
      return !currentImage || currentImage.includes("assets.nintendo.com/");
    });

    if (needsReview.length === 0) {
      alert("✅ No hay publicaciones de Nintendo pendientes de reparar por portada.");
      return;
    }

    setRepairingCovers(true);
    let repaired = 0;
    const notFound = [];

    try {
      for (const product of needsReview) {
        // La función valida que la portada oficial cargue antes de devolverla.
        // eslint-disable-next-line no-await-in-loop
        const baseGameName = getBaseGameNameForCover(product);
        const coverUrl = await resolveNintendoOfficialCover(baseGameName);
        if (!coverUrl) {
          notFound.push(`${product.name || product.title || product.id} (buscado como: ${baseGameName || "sin título"})`);
          // Deja el producto publicado, pero visible en la bandeja de carga
          // manual en lugar de conservar una URL rota del CDN.
          // eslint-disable-next-line no-await-in-loop
          await updateDoc(doc(db, "products", product.id), {
            imageUrl: "",
            image: "",
            imageStatus: "pending_manual",
            imageSource: "needs-manual-cover",
            imageUpdatedAt: new Date().toISOString()
          });
          continue;
        }

        // eslint-disable-next-line no-await-in-loop
        await updateDoc(doc(db, "products", product.id), {
          imageUrl: coverUrl,
          image: coverUrl,
          imageSource: "nintendo-official",
          imageUpdatedAt: new Date().toISOString()
        });
        repaired += 1;
      }

      await scanUnpublishedGames(true);
      const unresolvedMessage = notFound.length
        ? `\n\nNo se encontró una portada oficial verificable para ${notFound.length} juego(s):\n• ${notFound.join("\n• ")}\n\nNo se alteraron para evitar asignar una imagen equivocada.`
        : "";
      alert(`✅ Portadas reparadas: ${repaired}.${unresolvedMessage}`);
    } catch (error) {
      alert(`No se pudieron reparar todas las portadas: ${error.message}`);
    } finally {
      setRepairingCovers(false);
    }
  };

  const missingCoverProducts = useMemo(() => publishedProducts.filter((product) => {
    const image = String(product.imageUrl || product.image || "").trim();
    return !image || product.imageStatus === "pending_manual";
  }), [publishedProducts]);

  const handleManualCoverUpload = async (product, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Selecciona un archivo de imagen válido.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen debe pesar como máximo 5 MB.");
      return;
    }

    setUploadingCoverId(product.id);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      await auth.currentUser?.getIdToken(true);
      const storageRef = ref(storage, `products/nintendo/${product.id}-${Date.now()}.${extension}`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const imageUrl = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "products", product.id), {
        imageUrl,
        image: imageUrl,
        imageStatus: "manual",
        imageSource: "manual-admin",
        imageUpdatedAt: new Date().toISOString()
      });
      setPublishedProducts((current) => current.map((item) => item.id === product.id
        ? { ...item, imageUrl, image: imageUrl, imageStatus: "manual" }
        : item));
    } catch (error) {
      alert(`No se pudo subir la portada: ${error.message}`);
    } finally {
      setUploadingCoverId("");
    }
  };

  // Abrir Modal de Ajuste de Precio & Margen Seguro
  const handleOpenPriceModal = (variantObj, masterGame) => {
    const cost = variantObj.costCLP;
    const minSafePrimaria = Math.min(
      Math.max(cost + 5000, variantObj.precioPrimaria || (cost + 10000)),
      Math.round(variantObj.officialPriceCLP * 0.70 / 1000) * 1000
    );
    const chosenPrimaria = variantObj.precioPrimaria || minSafePrimaria;
    const autoRevendedor = calculateAutomaticResellerPrice(chosenPrimaria, cost, resellerConfig);

    setAdjustingPriceGame({
      ...variantObj,
      masterDisplayName: masterGame.displayName
    });
    setAdjustForm({
      primaria: chosenPrimaria,
      revendedor: autoRevendedor
    });
  };

  // Recálculo automático en tiempo real cuando el usuario escribe el precio cliente final
  const handlePrimariaChange = (newVal) => {
    const num = Number(newVal) || 0;
    const cost = adjustingPriceGame?.costCLP || 0;
    const autoRev = calculateAutomaticResellerPrice(num, cost, resellerConfig);
    setAdjustForm({
      primaria: newVal,
      revendedor: autoRev
    });
  };

  // Aplicar sugeridos automáticos seguros
  const handleApplySuggestedPrices = () => {
    if (!adjustingPriceGame) return;
    const cost = adjustingPriceGame.costCLP;
    const official = adjustingPriceGame.officialPriceCLP;
    
    // Reglas especiales
    let safePrimaria = cost + 10000;
    const norm = adjustingPriceGame.masterDisplayName.toLowerCase();
    if (norm.includes("minecraft")) safePrimaria = Math.max(9990, cost + 5000);
    else if (norm.includes("stardew valley")) safePrimaria = Math.max(8990, cost + 5000);
    else if (norm.includes("overcooked")) safePrimaria = Math.max(12990, cost + 6000);
    else if (official <= 19990) safePrimaria = Math.max(7990, cost + 5000);

    const ceiling = Math.round(official * 0.70 / 1000) * 1000;
    safePrimaria = Math.min(safePrimaria, Math.max(cost + 5000, ceiling));
    const autoRevendedor = calculateAutomaticResellerPrice(safePrimaria, cost, resellerConfig);

    setAdjustForm({
      primaria: safePrimaria,
      revendedor: autoRevendedor
    });
  };

  // Guardar Precios en Firestore (Resuelve el problema donde "Subir Precio" no funcionaba)
  const handleSavePriceAdjust = async () => {
    const savedScrollY = window.pageYOffset || document.documentElement.scrollTop;
    if (!adjustingPriceGame || !adjustingPriceGame.productId) {
      alert("Este juego aún no está publicado en la tienda. Usa el botón 'Publicar' para crearlo.");
      return;
    }

    setSavingPrice(true);
    const newPrimaria = Number(adjustForm.primaria) || 0;
    const costCLP = adjustingPriceGame.costCLP;
    const newRevendedor = calculateAutomaticResellerPrice(newPrimaria, costCLP, resellerConfig);

    if (newPrimaria < costCLP) {
      alert(`🚫 No puedes guardar este precio porque estás perdiendo plata con el cliente final: El precio (${formatCLP(newPrimaria)}) es menor al costo (${formatCLP(costCLP)}). Pérdida: -${formatCLP(costCLP - newPrimaria)}.`);
      setSavingPrice(false);
      return;
    }

    if (newRevendedor < costCLP) {
      alert(`🚫 No puedes guardar este precio porque estás perdiendo plata con el revendedor: El precio revendedor (${formatCLP(newRevendedor)}) es menor al costo (${formatCLP(costCLP)}). Pérdida: -${formatCLP(costCLP - newRevendedor)}.`);
      setSavingPrice(false);
      return;
    }

    try {
      const prodRef = doc(db, "products", adjustingPriceGame.productId);
      await updateDoc(prodRef, {
        priceCLP: newPrimaria,
        pricePrimariaCLP: newPrimaria,
        priceRevendedorCLP: newRevendedor,
        costo_clp: costCLP,
        costo_usd: adjustingPriceGame.costUSD
      });

      // Actualizar estado local inmediatamente
      setMasterGameList(prev => prev.map(m => {
        if (m.canonKey === adjustingPriceGame.canonKey) {
          const updatedVariants = { ...m.variants };
          if (updatedVariants[adjustingPriceGame.type]) {
            updatedVariants[adjustingPriceGame.type] = {
              ...updatedVariants[adjustingPriceGame.type],
              precioPrimaria: newPrimaria,
              precioRevendedor: newRevendedor,
              gananciaRevendedor: newRevendedor - costCLP,
              gananciaClientePrimaria: newPrimaria - costCLP
            };
          }
          return { ...m, variants: updatedVariants };
        }
        return m;
      }));

      setAdjustingPriceGame(null);
      alert(`✅ ¡Precios actualizados exitosamente para "${adjustingPriceGame.masterDisplayName}" en la tienda!\n\n• Cliente Final: ${formatCLP(newPrimaria)} (Ganancia: +${formatCLP(newPrimaria - costCLP)})\n• Revendedor: ${formatCLP(newRevendedor)} (Ganancia: +${formatCLP(newRevendedor - costCLP)})`);
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedScrollY, behavior: "instant" });
      });
    } catch (e) {
      alert(`Error al guardar en Firestore: ${e.message}`);
    } finally {
      setSavingPrice(false);
    }
  };

  // Forzar / Quitar Stock Manual para cualquier juego (incluso si tiene 0 packs en Telegram)
  const handleToggleManualStock = async (masterGame) => {
    const savedScrollY = window.pageYOffset || document.documentElement.scrollTop;
    const canonKey = masterGame.canonKey;
    const isCurrentlyForced = Boolean(stockOverridesMap[canonKey]?.forceAvailable);
    const newStatus = !isCurrentlyForced;
    
    // 1. Actualización optimista inmediata en estado para respuesta instantánea
    setStockOverridesMap(prev => {
      const next = { ...prev };
      if (newStatus) next[canonKey] = { forceAvailable: true, count: 5 };
      else delete next[canonKey];
      return next;
    });

    setMasterGameList(prev => prev.map(item => {
      if (item.canonKey === canonKey) {
        const nextStock = newStatus ? Math.max(item.totalStock, 5) : 0;
        return {
          ...item,
          isManualStock: newStatus,
          totalStock: nextStock,
          stockStatus: nextStock > 0 ? (nextStock >= 5 ? "abundante" : "critico") : "agotado"
        };
      }
      return item;
    }));

    try {
      await setSwitchGameManualStock(canonKey, newStatus, 5);

      // Si tiene producto publicado en tienda, actualizar también el doc en Firestore sin bloquear
      const baseVariant = masterGame.variants.base_game || Object.values(masterGame.variants)[0];
      if (baseVariant && baseVariant.productId) {
        try {
          await updateDoc(doc(db, "products", baseVariant.productId), {
            stock_cuantitativo: newStatus ? 5 : 0,
            available: newStatus,
            stock: newStatus ? 5 : 0,
            forceStock: newStatus
          });
        } catch (prodErr) {
          console.warn("Aviso producto Firestore (stock manual activo):", prodErr);
        }
      }

      if (newStatus) {
        alert(`⚡ ¡Listo! Ya se forzó el stock de "${masterGame.displayName}".`);
      } else {
        alert(`🔄 Stock manual desactivado para "${masterGame.displayName}".`);
      }
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedScrollY, behavior: "instant" });
      });
    } catch (e) {
      console.warn("Aviso stock manual:", e);
      // Se mantiene la actualización local optimista
    }
  };

  // Buscar en Nintendo eShop oficial
  const handleSearchNintendoEshop = async (searchQuery) => {
    const q = (searchQuery || "").trim();
    if (!q) return;
    setNintendoSearchModal(prev => ({ ...prev, loading: true, results: [], query: q }));
    try {
      const results = await searchNintendoOfficialCatalog(q);
      setNintendoSearchModal(prev => ({ ...prev, loading: false, results, query: q }));
    } catch (e) {
      console.error(e);
      setNintendoSearchModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSelectNintendoGameToPublish = (game) => {
    const refPrice = game.msrp ? Math.round(game.msrp * 1000) : 59990;
    const suggestedPrimaria = Math.min(25000, Math.max(15000, Math.round(refPrice * 0.4 / 1000) * 1000));
    const suggestedRev = Math.max(7000, suggestedPrimaria - 8000);

    setNintendoSearchModal(prev => ({
      ...prev,
      selectedGame: game,
      chosenPricePrimaria: suggestedPrimaria,
      chosenPriceRevendedor: suggestedRev,
      chosenStock: 5
    }));
  };

  const handleConfirmPublishFromNintendo = async () => {
    const { selectedGame, chosenPricePrimaria, chosenPriceRevendedor, chosenStock } = nintendoSearchModal;
    if (!selectedGame) return;

    setNintendoSearchModal(prev => ({ ...prev, publishing: true }));
    try {
      const coverUrl = selectedGame.coverUrl || selectedGame.boxartUrl || selectedGame.heroUrl || "";
      const priceCLP = Number(chosenPricePrimaria) || 18000;
      const priceRevendedor = Number(chosenPriceRevendedor) || 10000;
      const stockCount = Number(chosenStock) || 5;

      const newProd = {
        name: selectedGame.title,
        title: selectedGame.title,
        categoryId: "VtQaPwP0xXdC1qdz6Hvq",
        categoria: "Nintendo Switch",
        plataforma: "Nintendo Switch",
        priceCLP: priceCLP,
        pricePrimariaCLP: priceCLP,
        priceSecundariaCLP: null,
        priceRevendedorCLP: priceRevendedor,
        costo_clp: 5000,
        costo_usd: 5,
        imageUrl: coverUrl,
        image: coverUrl,
        imageStatus: coverUrl ? "verified" : "pending_manual",
        description: selectedGame.description || `Cuenta digital oficial para Nintendo Switch con ${selectedGame.title}. Descarga directa desde la Nintendo eShop. Garantía total PandaStore.`,
        stock_cuantitativo: stockCount,
        stock: stockCount,
        available: stockCount > 0,
        forceStock: true,
        status: "active",
        genres: selectedGame.genres || [],
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "products"), newProd);
      
      const canonKey = normalizeGameName(selectedGame.title);
      await setSwitchGameManualStock(canonKey, true, stockCount);

      alert(`🎉 ¡"${selectedGame.title}" publicado con éxito en el catálogo de Nintendo Switch con stock garantizado!`);
      setNintendoSearchModal({ open: false, query: "", loading: false, results: [], selectedGame: null, chosenPricePrimaria: 18000, chosenPriceRevendedor: 10000, chosenStock: 5, publishing: false });
      await scanUnpublishedGames(true);
    } catch (e) {
      alert(`Error al publicar juego: ${e.message}`);
      setNintendoSearchModal(prev => ({ ...prev, publishing: false }));
    }
  };

  // Publicar juego o variante en la tienda
  const handlePublishGame = async (variantObj, masterGame) => {
    const savedScrollY = window.pageYOffset || document.documentElement.scrollTop;
    const key = variantObj.variantKey;
    setPublishingKey(key);

    const pricePrimaria = Number(customPrices[key]?.primaria) || variantObj.precioPrimaria || (variantObj.costCLP + 10000);
    const priceRevendedor = Number(customPrices[key]?.revendedor) || variantObj.precioRevendedor || (variantObj.costCLP + 5000);
    const costCLP = variantObj.costCLP || 0;
    const marginCliente = pricePrimaria - costCLP;
    const marginRevendedor = priceRevendedor - costCLP;

    if (marginCliente < 0) {
      alert(`🚫 No puedes subir este pack porque estás perdiendo plata con el cliente en "${variantObj.name}": El precio (${formatCLP(pricePrimaria)}) es menor al costo (${formatCLP(costCLP)}). Pérdida: -${formatCLP(Math.abs(marginCliente))}.`);
      setPublishingKey(null);
      return;
    }

    if (marginRevendedor < 0) {
      alert(`🚫 No puedes subir este pack porque estás perdiendo plata con el revendedor en "${variantObj.name}": El precio revendedor (${formatCLP(priceRevendedor)}) es menor al costo (${formatCLP(costCLP)}). Pérdida: -${formatCLP(Math.abs(marginRevendedor))}.`);
      setPublishingKey(null);
      return;
    }

    const switchMinProfit = Number(resellerConfig?.categories?.switch?.minProfitCLP) > 0
      ? Number(resellerConfig.categories.switch.minProfitCLP)
      : (Number(resellerConfig?.minProfitCLP) > 0 ? Number(resellerConfig.minProfitCLP) : 5000);
    const minRevendedor = costCLP + switchMinProfit;

    if (priceRevendedor < minRevendedor) {
      alert(`⚠️ No se publicó "${variantObj.name}". Para garantizar tus ${formatCLP(switchMinProfit)} de margen mínimo configurado, el precio de revendedor debe ser al menos ${formatCLP(minRevendedor)}.`);
      setPublishingKey(null);
      return;
    }

    try {
      const fullName = variantObj.type === "dlc_only" 
        ? `${masterGame.displayName} [Solo DLC]` 
        : variantObj.type === "game_dlc" 
        ? `${masterGame.displayName} + DLC` 
        : masterGame.displayName;

      // La variante cambia el título comercial, no la portada. Siempre usamos
      // el juego base como consulta para Base, Solo DLC y Juego + DLC con fallback oficial garantizado.
      const coverGameName = masterGame.displayName || variantObj.name;
      const fallbackBoxart = masterGame.coverUrl || getNintendoBoxartUrl(coverGameName) || getNintendoOfficialHeroUrl(coverGameName);
      const resolvedCover = await resolveNintendoOfficialCover(coverGameName);
      const imageUrl = customImages[key] || resolvedCover || fallbackBoxart;
      const imageStatus = imageUrl ? "verified" : "pending_manual";

      const newProduct = {
        name: fullName,
        title: fullName,
        categoryId: "VtQaPwP0xXdC1qdz6Hvq",
        categoria: "Nintendo Switch",
        plataforma: "Nintendo Switch",
        priceCLP: pricePrimaria,
        pricePrimariaCLP: pricePrimaria,
        priceSecundariaCLP: null,
        priceRevendedorCLP: priceRevendedor,
        costo_clp: variantObj.costCLP,
        costo_usd: variantObj.costUSD,
        costo_pack_min_clp: variantObj.minCostCLP || variantObj.costCLP,
        costo_pack_promedio_clp: variantObj.avgCostCLP || variantObj.costCLP,
        costo_pack_max_clp: variantObj.maxCostCLP || variantObj.costCLP,
        imageUrl: imageUrl || "",
        image: imageUrl || "",
        imageStatus,
        description: `Cuenta digital oficial para Nintendo Switch con ${fullName}. Descarga directa desde la Nintendo eShop. Garantía total PandaStore.`,
        stock_cuantitativo: variantObj.stockCount,
        stock: variantObj.stockCount,
        available: variantObj.stockCount > 0,
        status: "active",
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "products"), newProduct);
      alert(`🎉 ¡"${fullName}" publicado exitosamente en el catálogo de Nintendo Switch!`);
      
      // Actualizar estado local
      setMasterGameList(prev => prev.map(m => {
        if (m.canonKey === variantObj.canonKey) {
          const updatedVariants = { ...m.variants };
          if (updatedVariants[variantObj.type]) {
            updatedVariants[variantObj.type] = {
              ...updatedVariants[variantObj.type],
              isPublished: true,
              productId: docRef.id
            };
          }
          return { ...m, variants: updatedVariants, isAnyPublished: true };
        }
        return m;
      }));
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedScrollY, behavior: "instant" });
      });
    } catch (e) {
      alert(`Error al publicar: ${e.message}`);
    } finally {
      setPublishingKey(null);
    }
  };

  // Abrir Modal de Publicación con Selección de Variantes y Ajuste Previo de Precios / Márgenes
  const handleOpenPublishModal = (masterGame, preselectedVariant = null) => {
    const unpubVariants = Object.values(masterGame.variants).filter(v => !v.isPublished);
    if (unpubVariants.length === 0) {
      alert("Todas las variantes de este juego ya están publicadas en la tienda.");
      return;
    }

    const initialVariantsData = {};
    unpubVariants.forEach(v => {
      const vKey = v.variantKey;
      const defaultName = v.type === "dlc_only" 
        ? `${masterGame.displayName} [Solo DLC]` 
        : v.type === "game_dlc" 
        ? `${masterGame.displayName} + DLC` 
        : masterGame.displayName;

      const suggestedPrice = getSuggestedRetailPrice(v.costCLP, resellerConfig);
      const pricePrimaria = Number(customPrices[vKey]?.primaria) || v.precioPrimaria || suggestedPrice;
      const autoRevendedor = calculateAutomaticResellerPrice(pricePrimaria, v.costCLP, resellerConfig);
      // Las tres opciones comparten la carátula oficial de Nintendo
      const defaultCover = masterGame.coverUrl || getNintendoBoxartUrl(masterGame.displayName) || getNintendoOfficialHeroUrl(masterGame.displayName);
      const imageUrl = customImages[vKey] || defaultCover;

      const isSelected = preselectedVariant 
        ? (v.type === preselectedVariant.type) 
        : (variantTypeFilter !== "todos" ? v.type === variantTypeFilter : true);

      initialVariantsData[v.type] = {
        selected: isSelected,
        type: v.type,
        typeLabel: v.typeLabel,
        variantObj: v,
        fullName: defaultName,
        pricePrimaria,
        priceRevendedor: autoRevendedor,
        suggestedPrice,
        imageUrl,
        costCLP: v.costCLP,
        costUSD: v.costUSD,
        stockCount: v.stockCount,
        officialPriceCLP: v.officialPriceCLP
      };
    });

    setPublishingModalGame({
      master: masterGame,
      variantsData: initialVariantsData
    });
  };

  // Cambio reactivo del precio cliente en el modal de variantes
  const handleModalPricePrimariaChange = (typeKey, val) => {
    setPublishingModalGame(prev => {
      if (!prev) return null;
      const cur = prev.variantsData[typeKey];
      if (!cur) return prev;
      const newPrimaria = Number(val) || 0;
      const newRev = calculateAutomaticResellerPrice(newPrimaria, cur.costCLP, resellerConfig);
      return {
        ...prev,
        variantsData: {
          ...prev.variantsData,
          [typeKey]: {
            ...cur,
            pricePrimaria: val,
            priceRevendedor: newRev
          }
        }
      };
    });
  };

  // Confirmar y publicar las variantes seleccionadas en el modal interactivo
  const handleConfirmPublishModal = async () => {
    if (!publishingModalGame) return;
    const savedScrollY = window.pageYOffset || document.documentElement.scrollTop;
    const { master, variantsData } = publishingModalGame;
    const selectedList = Object.values(variantsData).filter(v => v.selected);

    if (selectedList.length === 0) {
      alert("Por favor selecciona al menos una variante para publicar.");
      return;
    }

    setPublishingKey(`modal_${master.canonKey}`);

    try {
      const publishedSummaries = [];
      const updatedVariantMap = { ...master.variants };

      const switchMinProfit = Number(resellerConfig?.categories?.switch?.minProfitCLP) > 0
        ? Number(resellerConfig.categories.switch.minProfitCLP)
        : (Number(resellerConfig?.minProfitCLP) > 0 ? Number(resellerConfig.minProfitCLP) : 5000);

      for (const item of selectedList) {
        const v = item.variantObj;
        const marginCliente = (Number(item.pricePrimaria) || 0) - item.costCLP;
        const marginRevendedor = (Number(item.priceRevendedor) || 0) - item.costCLP;

        if (marginCliente < 0) {
          alert(`🚫 No puedes subir este pack porque estás perdiendo plata con el cliente en "${item.fullName}": El precio al cliente (${formatCLP(item.pricePrimaria)}) es menor al costo del pack (${formatCLP(item.costCLP)}). Pérdida: -${formatCLP(Math.abs(marginCliente))}.`);
          continue;
        }

        if (marginRevendedor < 0) {
          alert(`🚫 No puedes subir este pack porque estás perdiendo plata con el revendedor en "${item.fullName}": El precio a revendedores (${formatCLP(item.priceRevendedor)}) es menor al costo del pack (${formatCLP(item.costCLP)}). Pérdida: -${formatCLP(Math.abs(marginRevendedor))}.`);
          continue;
        }

        const minRevendedor = item.costCLP + switchMinProfit;
        if (item.priceRevendedor < minRevendedor) {
          alert(`⚠️ No se publicó "${item.fullName}": El precio revendedor debe ser al menos ${formatCLP(minRevendedor)} para garantizar tus ${formatCLP(switchMinProfit)} de margen mínimo configurado.`);
          continue;
        }

        // Portada oficial garantizada: prioriza custom, item.imageUrl, búsqueda Nintendo y Boxart oficial
        // eslint-disable-next-line no-await-in-loop
        const coverGameName = master.displayName || v.name;
        const fallbackBoxart = master.coverUrl || getNintendoBoxartUrl(coverGameName) || getNintendoOfficialHeroUrl(coverGameName);
        const resolvedCover = await resolveNintendoOfficialCover(coverGameName);
        const imageUrl = customImages[v.variantKey] || item.imageUrl || resolvedCover || fallbackBoxart;
        const imageStatus = imageUrl ? "verified" : "pending_manual";

        const newProduct = {
          name: item.fullName,
          title: item.fullName,
          categoryId: "VtQaPwP0xXdC1qdz6Hvq",
          categoria: "Nintendo Switch",
          plataforma: "Nintendo Switch",
          priceCLP: item.pricePrimaria,
          pricePrimariaCLP: item.pricePrimaria,
          priceSecundariaCLP: null,
          priceRevendedorCLP: item.priceRevendedor,
          costo_clp: item.costCLP,
          costo_usd: item.costUSD,
          costo_pack_min_clp: v.minCostCLP || item.costCLP,
          costo_pack_promedio_clp: v.avgCostCLP || item.costCLP,
          costo_pack_max_clp: v.maxCostCLP || item.costCLP,
          imageUrl,
          image: imageUrl,
          imageStatus,
          imageSource: "nintendo-official",
          description: `Cuenta digital oficial para Nintendo Switch con ${item.fullName}. Descarga directa desde la Nintendo eShop. Garantía total PandaStore.`,
          stock_cuantitativo: item.stockCount,
          stock: item.stockCount,
          available: item.stockCount > 0,
          status: "active",
          createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, "products"), newProduct);
        publishedSummaries.push(`${item.typeLabel} (${formatCLP(item.pricePrimaria)})`);

        updatedVariantMap[item.type] = {
          ...updatedVariantMap[item.type],
          isPublished: true,
          productId: docRef.id,
          precioPrimaria: item.pricePrimaria,
          precioRevendedor: item.priceRevendedor,
          gananciaRevendedor: item.priceRevendedor - item.costCLP,
          gananciaClientePrimaria: item.pricePrimaria - item.costCLP
        };
      }

      setMasterGameList(prev => prev.map(m => {
        if (m.canonKey === master.canonKey) {
          const isAnyPublished = Object.values(updatedVariantMap).some(x => x.isPublished);
          const isAllPublished = Object.values(updatedVariantMap).every(x => x.isPublished);
          return {
            ...m,
            variants: updatedVariantMap,
            isAnyPublished,
            isAllPublished
          };
        }
        return m;
      }));

      setPublishingModalGame(null);
      alert(`🎉 ¡Se publicaron ${publishedSummaries.length} variante(s) de "${master.displayName}"!\n\n• ${publishedSummaries.join("\n• ")}`);
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedScrollY, behavior: "instant" });
      });
    } catch (e) {
      alert(`Error al publicar: ${e.message}`);
    } finally {
      setPublishingKey(null);
    }
  };

  // Eliminar / Despublicar variante publicada en la tienda (corrige publicaciones erróneas)
  const handleUnpublishProduct = async (variantObj, masterGame) => {
    const savedScrollY = window.pageYOffset || document.documentElement.scrollTop;
    if (!variantObj.productId) {
      alert("No se encontró el identificador del producto en la base de datos.");
      return;
    }

    const confirmDelete = window.confirm(
      `¿Deseas ELIMINAR "${variantObj.name}" de la tienda?\n\nDejará de aparecer en la tienda web y volverá a estar disponible para publicar con los precios correctos.`
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "products", variantObj.productId));
      alert(`🗑️ "${variantObj.name}" fue eliminado de la tienda.`);

      setMasterGameList(prev => prev.map(m => {
        if (m.canonKey === masterGame.canonKey) {
          const updatedVariants = { ...m.variants };
          if (updatedVariants[variantObj.type]) {
            updatedVariants[variantObj.type] = {
              ...updatedVariants[variantObj.type],
              isPublished: false,
              productId: null
            };
          }
          const isAnyPublished = Object.values(updatedVariants).some(x => x.isPublished);
          const isAllPublished = Object.values(updatedVariants).every(x => x.isPublished);
          return { ...m, variants: updatedVariants, isAnyPublished, isAllPublished };
        }
        return m;
      }));
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedScrollY, behavior: "instant" });
      });
    } catch (e) {
      alert(`Error al eliminar: ${e.message}`);
    }
  };

  // KPIs Globales
  const kpiStats = useMemo(() => {
    const total = masterGameList.length;
    const publicados = masterGameList.filter(g => g.isAnyPublished).length;
    const abundantes = masterGameList.filter(g => g.stockStatus === "abundante").length;
    const criticos = masterGameList.filter(g => g.stockStatus === "critico").length;
    const agotados = masterGameList.filter(g => g.stockStatus === "agotado").length;
    const sinPublicar = masterGameList.filter(g => !g.isAnyPublished).length;

    let soloBase = 0;
    let baseMasDlc = 0;
    let soloDlc = 0;

    masterGameList.forEach(g => {
      if (g.variants.base_game && (g.variants.base_game.stockCount > 0 || g.variants.base_game.isPublished)) soloBase++;
      if (g.variants.game_dlc && (g.variants.game_dlc.stockCount > 0 || g.variants.game_dlc.isPublished)) baseMasDlc++;
      if (g.variants.dlc_only && (g.variants.dlc_only.stockCount > 0 || g.variants.dlc_only.isPublished)) soloDlc++;
    });

    // Conteo de variantes con precios en riesgo (menos de $5.000 de ganancia revendedor)
    let preciosEnRiesgo = 0;
    masterGameList.forEach(g => {
      Object.values(g.variants).forEach(v => {
        if (v.isPublished && (v.gananciaRevendedor < 5000 || v.gananciaClientePrimaria < 5000)) {
          preciosEnRiesgo++;
        }
      });
    });

    const populares = masterGameList.filter(g => isPopularSwitchTitle(g.displayName)).length;
    const masVendidos = masterGameList.filter(g => isBestSellerSwitchTitle(g.displayName)).length;

    const genreCounts = {};
    SWITCH_GENRES.forEach(sg => {
      if (sg.id !== "todos") {
        genreCounts[sg.id] = masterGameList.filter(g => getSwitchGenre(g.displayName) === sg.id).length;
      }
    });

    return { total, publicados, abundantes, criticos, agotados, sinPublicar, preciosEnRiesgo, soloBase, baseMasDlc, soloDlc, populares, masVendidos, genreCounts };
  }, [masterGameList]);

  // Filtrado y Ordenamiento de la lista maestra
  const filteredGames = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const filtered = masterGameList.filter(master => {
      // 0. Ocultar los que ya tenemos en el catálogo de la tienda
      if (hideCatalogGames) {
        if (variantTypeFilter !== "todos") {
          const targetVar = master.variants[variantTypeFilter];
          if (targetVar && targetVar.isPublished) return false;
        } else {
          if (master.isAnyPublished) return false;
        }
      }

      // 1. Filtro estricto por tipo de variante (Solo Base, Base + DLC, Solo DLC)
      if (variantTypeFilter !== "todos") {
        const targetVar = master.variants[variantTypeFilter];
        if (!targetVar) return false;

        if (stockFilter === "con_stock") {
          if (targetVar.stockCount <= 0) return false;
        } else if (stockFilter === "abundante") {
          if (targetVar.stockCount < 5) return false;
        } else if (stockFilter === "critico") {
          if (targetVar.stockCount < 1 || targetVar.stockCount > 4) return false;
        } else if (stockFilter === "agotado") {
          if (targetVar.stockCount !== 0) return false;
        } else if (stockFilter === "publicados") {
          if (!targetVar.isPublished) return false;
        } else if (stockFilter === "sin_publicar") {
          if (targetVar.isPublished) return false;
        } else if (stockFilter === "riesgo") {
          if (!targetVar.isPublished || (targetVar.gananciaRevendedor >= 5000 && targetVar.gananciaClientePrimaria >= 5000)) return false;
        }
      } else {
        // Modo "todos los tipos": evalúa a nivel general de juego
        if (stockFilter === "con_stock") return master.totalStock > 0;
        if (stockFilter === "abundante") return master.stockStatus === "abundante";
        if (stockFilter === "critico") return master.stockStatus === "critico";
        if (stockFilter === "agotado") return master.stockStatus === "agotado";
        if (stockFilter === "publicados") return master.isAnyPublished;
        if (stockFilter === "sin_publicar") return !master.isAnyPublished;
        if (stockFilter === "riesgo") {
          return Object.values(master.variants).some(v => v.isPublished && (v.gananciaRevendedor < 5000 || v.gananciaClientePrimaria < 5000));
        }
      }

      // 2. Búsqueda inteligente por texto:
      if (query) {
        const matchTitle = master.displayName.toLowerCase().includes(query) || master.canonKey.includes(query);
        const matchOriginals = master.allOriginalNames.some(on => on.toLowerCase().includes(query));
        const matchPackIds = master.allPackIds.some(pid => pid.toLowerCase().includes(query));
        const matchNicknames = master.allPackDetails.some(pd => (pd.nickname || "").toLowerCase().includes(query));
        if (!matchTitle && !matchOriginals && !matchPackIds && !matchNicknames) {
          return false;
        }
      }

      // 3. Filtro por popularidad y más vendidos
      if (popularityFilter === "populares" && !isPopularSwitchTitle(master.displayName)) return false;
      if (popularityFilter === "mas_vendidos" && !isBestSellerSwitchTitle(master.displayName)) return false;

      // 4. Filtro por género / tipo
      if (genreFilter !== "todos" && getSwitchGenre(master.displayName) !== genreFilter) return false;

      return true;
    });

    // Ordenamiento dinámico
    return filtered.sort((a, b) => {
      if (sortBy === "mas_vendidos") {
        const scoreA = getSwitchHistoricalSalesInfo(a.displayName).score;
        const scoreB = getSwitchHistoricalSalesInfo(b.displayName).score;
        if (scoreB !== scoreA) return scoreB - scoreA;
        if (b.totalStock !== a.totalStock) return b.totalStock - a.totalStock;
        return a.displayName.localeCompare(b.displayName);
      }
      if (sortBy === "stock_desc") {
        if (b.totalStock !== a.totalStock) return b.totalStock - a.totalStock;
        return a.displayName.localeCompare(b.displayName);
      }
      if (sortBy === "stock_asc") {
        if (a.totalStock !== b.totalStock) return a.totalStock - b.totalStock;
        return a.displayName.localeCompare(b.displayName);
      }
      if (sortBy === "az") {
        return a.displayName.localeCompare(b.displayName);
      }
      if (sortBy === "za") {
        return b.displayName.localeCompare(a.displayName);
      }
      if (sortBy === "precio_desc") {
        return (b.officialPriceCLP || 0) - (a.officialPriceCLP || 0);
      }
      if (sortBy === "precio_asc") {
        return (a.officialPriceCLP || 0) - (b.officialPriceCLP || 0);
      }
      return 0;
    });
  }, [masterGameList, searchTerm, stockFilter, variantTypeFilter, hideCatalogGames, popularityFilter, genreFilter, sortBy]);

  return (
    <div className="adm-unpub-container">
      {/* HEADER */}
      <div className="adm-unpub-header">
        <div>
          <h1 className="adm-unpub-title">
            <Gamepad2 className="adm-unpub-title-icon" /> Nintendo Switch: Control de Stock & Márgenes
          </h1>
          <p className="adm-unpub-subtitle">
            Gestión unificada por título sin duplicados. Inspecciona cuentas de proveedor con <strong>Nickname exacto</strong>, asegura <strong>+$5.000 CLP netos en revendedores</strong> y sincroniza el stock en tienda en tiempo real.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button 
            className="btn-refresh" 
            onClick={handleSyncAllStock} 
            disabled={syncingStock || loading}
            style={{ background: "rgba(34, 197, 94, 0.15)", borderColor: "rgba(34, 197, 94, 0.4)", color: "#4ade80" }}
            title="Activa el stock y disponibilidad en la tienda web para los juegos con packs"
          >
            <Check size={18} className={syncingStock ? "spin" : ""} /> {syncingStock ? "Sincronizando..." : "Sincronizar Stock en Tienda"}
          </button>

          <button
            className="btn-refresh"
            onClick={handleRepairNintendoCovers}
            disabled={repairingCovers || loading}
            style={{ background: "rgba(168, 85, 247, 0.15)", borderColor: "rgba(192, 132, 252, 0.48)", color: "#d8b4fe" }}
            title="Comprueba y repara las portadas faltantes de los juegos Nintendo ya publicados"
          >
            <ImageIcon size={18} className={repairingCovers ? "spin" : ""} /> {repairingCovers ? "Reparando portadas..." : "Reparar Portadas"}
          </button>

          <button className="btn-refresh" onClick={() => scanUnpublishedGames(true)} disabled={loading} title="Volver a escanear packs y tienda">
            <RefreshCw size={18} className={loading ? "spin" : ""} /> {loading ? "Escaneando..." : "Escanear Packs"}
          </button>

          <button
            type="button"
            className="btn-refresh"
            onClick={() => setNintendoSearchModal({ open: true, query: "", loading: false, results: [], selectedGame: null, chosenPricePrimaria: 18000, chosenPriceRevendedor: 10000, chosenStock: 5, publishing: false })}
            style={{
              background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
              borderColor: "#fda4af",
              color: "#fff",
              fontWeight: 800,
              boxShadow: "0 4px 14px rgba(225, 29, 72, 0.35)"
            }}
            title="Buscar cualquier juego en la base de datos oficial de Nintendo eShop y publicarlo directamente"
          >
            <Sparkles size={18} /> Publicar desde Nintendo eShop
          </button>
        </div>
      </div>

      {/* METRIC STRIP COMPACTO & RESUMIDO (4 TARJETAS CLARAS) */}
      <div className="adm-unpub-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
        <div className={`unpub-kpi-card ${stockFilter === "todos" ? "active" : ""}`} onClick={() => setStockFilter("todos")} style={{ cursor: "pointer" }}>
          <div className="kpi-num">{masterGameList.length}</div>
          <div className="kpi-txt">📦 Total Títulos Switch (Packs: {totalPacksInDb})</div>
        </div>
        <div className={`unpub-kpi-card ${stockFilter === "con_stock" ? "border-green active" : "border-green"}`} onClick={() => setStockFilter("con_stock")} style={{ cursor: "pointer" }}>
          <div className="kpi-num text-green">{kpiStats.abundantes + kpiStats.criticos}</div>
          <div className="kpi-txt">🟢 En Stock (Packs & Manual)</div>
        </div>
        <div className={`unpub-kpi-card ${stockFilter === "agotado" ? "border-red active" : "border-red"}`} onClick={() => setStockFilter("agotado")} style={{ cursor: "pointer" }}>
          <div className="kpi-num text-red">{kpiStats.agotados}</div>
          <div className="kpi-txt">🔴 Agotados / Faltan Packs</div>
        </div>
        <div className={`unpub-kpi-card ${stockFilter === "publicados" ? "border-blue active" : "border-blue"}`} onClick={() => setStockFilter("publicados")} style={{ cursor: "pointer" }}>
          <div className="kpi-num text-blue">{kpiStats.publicados}</div>
          <div className="kpi-txt">🛍️ Ya en Tienda Web</div>
        </div>
      </div>

      {/* SELECTOR DE TIPO DE VARIANTE (SOLO BASE / BASE + DLC / SOLO DLC) */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
        margin: "0 0 12px 0",
        padding: "10px 14px",
        background: "rgba(15, 23, 42, 0.6)",
        border: "1px solid rgba(56, 189, 248, 0.2)",
        borderRadius: "14px",
        backdropFilter: "blur(4px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#38bdf8", fontWeight: 800, fontSize: "0.88rem" }}>
          <span>🎯 Filtrar por Tipo:</span>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", flex: 1 }}>
          <button
            type="button"
            className={`filter-btn ${variantTypeFilter === "todos" ? "active" : ""}`}
            onClick={() => setVariantTypeFilter("todos")}
            style={variantTypeFilter === "todos" ? { fontWeight: 800 } : {}}
          >
            🌐 Todos los Tipos ({masterGameList.length})
          </button>
          <button
            type="button"
            className={`filter-btn ${variantTypeFilter === "base_game" ? "active" : ""}`}
            onClick={() => setVariantTypeFilter("base_game")}
            style={{
              borderColor: variantTypeFilter === "base_game" ? "#38bdf8" : "rgba(56, 189, 248, 0.35)",
              color: variantTypeFilter === "base_game" ? "#fff" : "#38bdf8",
              background: variantTypeFilter === "base_game" ? "rgba(56, 189, 248, 0.3)" : "rgba(56, 189, 248, 0.06)",
              fontWeight: 800,
              boxShadow: variantTypeFilter === "base_game" ? "0 0 12px rgba(56, 189, 248, 0.3)" : "none"
            }}
          >
            🎮 Solo Base ({kpiStats.soloBase})
          </button>
          <button
            type="button"
            className={`filter-btn ${variantTypeFilter === "game_dlc" ? "active" : ""}`}
            onClick={() => setVariantTypeFilter("game_dlc")}
            style={{
              borderColor: variantTypeFilter === "game_dlc" ? "#c084fc" : "rgba(192, 132, 252, 0.35)",
              color: variantTypeFilter === "game_dlc" ? "#fff" : "#c084fc",
              background: variantTypeFilter === "game_dlc" ? "rgba(192, 132, 252, 0.3)" : "rgba(192, 132, 252, 0.06)",
              fontWeight: 800,
              boxShadow: variantTypeFilter === "game_dlc" ? "0 0 12px rgba(192, 132, 252, 0.3)" : "none"
            }}
          >
            📦 Base + DLC ({kpiStats.baseMasDlc})
          </button>
          <button
            type="button"
            className={`filter-btn ${variantTypeFilter === "dlc_only" ? "active" : ""}`}
            onClick={() => setVariantTypeFilter("dlc_only")}
            style={{
              borderColor: variantTypeFilter === "dlc_only" ? "#fde047" : "rgba(253, 224, 71, 0.35)",
              color: variantTypeFilter === "dlc_only" ? "#fff" : "#fde047",
              background: variantTypeFilter === "dlc_only" ? "rgba(253, 224, 71, 0.3)" : "rgba(253, 224, 71, 0.06)",
              fontWeight: 800,
              boxShadow: variantTypeFilter === "dlc_only" ? "0 0 12px rgba(253, 224, 71, 0.3)" : "none"
            }}
          >
            🧩 Solo DLC ({kpiStats.soloDlc})
          </button>
        </div>
      </div>

      {missingCoverProducts.length > 0 && (
        <section className="nintendo-manual-covers">
          <div className="nintendo-manual-covers-heading">
            <div>
              <span className="nintendo-manual-covers-eyebrow">PORTADAS PENDIENTES</span>
              <h2>Juegos publicados sin imagen</h2>
              <p>Estos productos ya están publicados. Sube la portada correcta para completarlos.</p>
            </div>
            <span className="nintendo-manual-covers-count">{missingCoverProducts.length}</span>
          </div>
          <div className="nintendo-manual-covers-list">
            {missingCoverProducts.map((product) => (
              <div className="nintendo-manual-cover-item" key={product.id}>
                <div className="nintendo-manual-cover-placeholder"><ImageIcon size={22} /></div>
                <div className="nintendo-manual-cover-info">
                  <strong>{product.name || product.title}</strong>
                  <span>Nintendo Switch · portada pendiente</span>
                </div>
                <label className={`nintendo-manual-cover-upload ${uploadingCoverId === product.id ? "is-uploading" : ""}`}>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={Boolean(uploadingCoverId)}
                    onChange={(event) => handleManualCoverUpload(product, event.target.files?.[0])}
                  />
                  <ImageIcon size={16} />
                  {uploadingCoverId === product.id ? "Subiendo..." : "Subir portada"}
                </label>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SEARCH & FILTERS BAR */}
      <div className="adm-controls-bar" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <div className="adm-unpub-search" style={{ flex: 1, minWidth: 280, margin: 0 }}>
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Buscar por juego, Nickname de pack (ej: Sobro), o pack ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              type="button" 
              onClick={() => setSearchTerm("")}
              style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
            >
              ✕
            </button>
          )}
        </div>

        {/* ACCIÓN DIRECTA: BUSCAR EN NINTENDO ESHOP */}
        <button
          type="button"
          onClick={() => {
            handleSearchNintendoEshop(searchTerm);
            setNintendoSearchModal(prev => ({
              ...prev,
              open: true,
              query: searchTerm || "",
              selectedGame: null
            }));
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 16px",
            borderRadius: "12px",
            border: "1.5px solid #fda4af",
            background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
            color: "#fff",
            fontWeight: 800,
            cursor: "pointer",
            fontSize: "0.85rem",
            boxShadow: "0 4px 14px rgba(225, 29, 72, 0.35)",
            whiteSpace: "nowrap"
          }}
          title="Buscar cualquier juego en la base de datos oficial de Nintendo eShop y publicarlo"
        >
          <Sparkles size={16} />
          <span>{searchTerm ? `Buscar "${searchTerm}" en Nintendo eShop` : "🌐 Nintendo eShop Oficial"}</span>
        </button>

        {/* BOTÓN PARA OCULTAR LOS QUE YA ESTÁN EN EL CATÁLOGO */}
        <button
          type="button"
          onClick={() => setHideCatalogGames(!hideCatalogGames)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 15px",
            borderRadius: "12px",
            border: hideCatalogGames ? "1.5px solid #f43f5e" : "1px solid rgba(255,255,255,0.18)",
            background: hideCatalogGames
              ? "linear-gradient(135deg, rgba(244, 63, 94, 0.25) 0%, rgba(225, 29, 72, 0.35) 100%)"
              : "rgba(255,255,255,0.06)",
            color: hideCatalogGames ? "#fecdd3" : "#e2e8f0",
            fontWeight: 800,
            cursor: "pointer",
            fontSize: "0.85rem",
            boxShadow: hideCatalogGames ? "0 0 15px rgba(244, 63, 94, 0.35)" : "none",
            transition: "all 0.2s ease"
          }}
          title={hideCatalogGames ? "Haga clic para volver a mostrar los juegos ya publicados" : "Ocultar juegos que ya están publicados en el catálogo de la tienda"}
        >
          {hideCatalogGames ? <EyeOff size={16} color="#fda4af" /> : <Eye size={16} color="#94a3b8" />}
          <span>{hideCatalogGames ? "Ocultando Ya en Catálogo" : "Ocultar Ya en Catálogo"}</span>
          <span style={{
            fontSize: "0.72rem",
            padding: "2px 6px",
            borderRadius: "6px",
            background: hideCatalogGames ? "rgba(244, 63, 94, 0.4)" : "rgba(255,255,255,0.1)",
            color: hideCatalogGames ? "#fff" : "#94a3b8"
          }}>
            {kpiStats.publicados}
          </span>
        </button>

        {/* BOTÓN RESTABLECER FILTROS (SI HAY ALGUNO ACTIVO) */}
        {(searchTerm || stockFilter !== "todos" || variantTypeFilter !== "todos" || popularityFilter !== "todos" || genreFilter !== "todos" || hideCatalogGames) && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setStockFilter("todos");
              setVariantTypeFilter("todos");
              setPopularityFilter("todos");
              setGenreFilter("todos");
              setHideCatalogGames(false);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 13px",
              borderRadius: "12px",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              background: "rgba(148, 163, 184, 0.12)",
              color: "#cbd5e1",
              fontWeight: 700,
              fontSize: "0.82rem",
              cursor: "pointer"
            }}
            title="Restablecer todos los filtros"
          >
            <RotateCcw size={14} />
            <span>Limpiar Filtros</span>
          </button>
        )}

        <div className="adm-filter-pills" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            className={`filter-btn ${stockFilter === "todos" ? "active" : ""}`}
            onClick={() => setStockFilter("todos")}
          >
            Todos ({masterGameList.length})
          </button>
          <button
            className={`filter-btn ${stockFilter === "con_stock" ? "active" : ""}`}
            onClick={() => setStockFilter("con_stock")}
            style={stockFilter === "con_stock" ? { borderColor: "#22c55e", color: "#86efac", background: "rgba(34, 197, 94, 0.25)" } : {}}
          >
            🟢 En Stock ({kpiStats.abundantes + kpiStats.criticos})
          </button>
          <button
            className={`filter-btn ${stockFilter === "agotado" ? "active" : ""}`}
            onClick={() => setStockFilter("agotado")}
            style={stockFilter === "agotado" ? { borderColor: "#ef4444", color: "#fca5a5", background: "rgba(239, 68, 68, 0.25)" } : {}}
          >
            🔴 Agotados / Faltantes ({kpiStats.agotados})
          </button>
          <button
            className={`filter-btn ${stockFilter === "publicados" ? "active" : ""}`}
            onClick={() => setStockFilter("publicados")}
            style={stockFilter === "publicados" ? { borderColor: "#38bdf8", color: "#38bdf8", background: "rgba(56, 189, 248, 0.2)" } : {}}
          >
            🛍️ Publicados ({kpiStats.publicados})
          </button>
          <button
            className={`filter-btn ${stockFilter === "sin_publicar" ? "active" : ""}`}
            onClick={() => {
              setStockFilter("sin_publicar");
              setSortBy("mas_vendidos");
            }}
            style={stockFilter === "sin_publicar" ? { borderColor: "#a855f7", color: "#d8b4fe", background: "rgba(168, 85, 247, 0.25)", fontWeight: 800 } : {}}
            title="Ver exclusivamente los juegos que aún NO están subidos en la tienda web, ordenados por los más vendidos históricos de Switch"
          >
            ✨ Por Publicar ({kpiStats.sinPublicar})
          </button>
          <button
            className={`filter-btn ${stockFilter === "abundante" ? "active" : ""}`}
            onClick={() => setStockFilter("abundante")}
          >
            🟢 Abundantes ({kpiStats.abundantes})
          </button>
          <button
            className={`filter-btn ${stockFilter === "critico" ? "active" : ""}`}
            onClick={() => setStockFilter("critico")}
          >
            ⚠️ Críticos ({kpiStats.criticos})
          </button>
          {kpiStats.preciosEnRiesgo > 0 && (
            <button
              className={`filter-btn ${stockFilter === "riesgo" ? "active" : ""}`}
              onClick={() => setStockFilter("riesgo")}
              style={{ borderColor: "#f43f5e", color: "#fca5a5" }}
            >
              🚨 Margen en Riesgo ({kpiStats.preciosEnRiesgo})
            </button>
          )}
        </div>
      </div>

      {/* ─── BARRA DE POPULARIDAD, MÁS VENDIDOS Y GÉNEROS / TIPO ──────────────── */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        marginTop: "10px",
        marginBottom: "16px",
        padding: "14px 16px",
        background: "rgba(15, 23, 42, 0.65)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "14px",
        backdropFilter: "blur(6px)"
      }}>
        {/* FILA 1: POPULARIDAD & TOP MÁS VENDIDOS */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#fbbf24", fontWeight: 800, fontSize: "0.85rem", minWidth: 160 }}>
            <Flame size={16} color="#fbbf24" />
            <span>Popularidad & Ventas:</span>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", flex: 1 }}>
            <button
              type="button"
              className={`filter-btn ${popularityFilter === "todos" ? "active" : ""}`}
              onClick={() => setPopularityFilter("todos")}
            >
              ⭐ Todos ({masterGameList.length})
            </button>
            <button
              type="button"
              className={`filter-btn ${popularityFilter === "populares" ? "active" : ""}`}
              onClick={() => setPopularityFilter("populares")}
              style={popularityFilter === "populares" ? {
                borderColor: "#f59e0b",
                color: "#fef08a",
                background: "rgba(245, 158, 11, 0.25)",
                fontWeight: 800,
                boxShadow: "0 0 10px rgba(245, 158, 11, 0.25)"
              } : {}}
            >
              🔥 Franquicias Populares ({kpiStats.populares})
            </button>
            <button
              type="button"
              className={`filter-btn ${popularityFilter === "mas_vendidos" ? "active" : ""}`}
              onClick={() => setPopularityFilter("mas_vendidos")}
              style={popularityFilter === "mas_vendidos" ? {
                borderColor: "#ec4899",
                color: "#fbcfe8",
                background: "rgba(236, 72, 153, 0.25)",
                fontWeight: 800,
                boxShadow: "0 0 10px rgba(236, 72, 153, 0.25)"
              } : {}}
            >
              🏆 Top Más Vendidos Switch ({kpiStats.masVendidos})
            </button>
          </div>
        </div>

        {/* FILA 2: FILTRO POR GÉNERO / TIPO DE JUEGO */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flexWrap: "wrap", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#38bdf8", fontWeight: 800, fontSize: "0.85rem", minWidth: 160, paddingTop: "4px" }}>
            <Gamepad2 size={16} color="#38bdf8" />
            <span>Género / Tipo:</span>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", flex: 1 }}>
            {SWITCH_GENRES.map((g) => {
              const count = g.id === "todos" ? masterGameList.length : (kpiStats.genreCounts?.[g.id] || 0);
              const isActive = genreFilter === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  className={`filter-btn ${isActive ? "active" : ""}`}
                  onClick={() => setGenreFilter(g.id)}
                  style={isActive ? {
                    borderColor: "#38bdf8",
                    color: "#fff",
                    background: "rgba(56, 189, 248, 0.25)",
                    fontWeight: 800,
                    boxShadow: "0 0 10px rgba(56, 189, 248, 0.25)"
                  } : { fontSize: "0.78rem", padding: "5px 10px" }}
                >
                  {g.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RESUMEN DE RESULTADOS Y SELECTOR DE ORDEN */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", fontSize: "0.85rem", color: "#94a3b8", flexWrap: "wrap", gap: "12px" }}>
        <div>
          Mostrando <strong style={{ color: "#fff" }}>{filteredGames.length}</strong> de <strong style={{ color: "#fff" }}>{masterGameList.length}</strong> títulos Nintendo Switch
          {hideCatalogGames && (
            <span style={{ marginLeft: 8, color: "#fda4af", background: "rgba(244, 63, 94, 0.15)", padding: "2px 8px", borderRadius: "6px", fontSize: "0.76rem" }}>
              • Ocultando {kpiStats.publicados} ya publicados en catálogo
            </span>
          )}
          {stockFilter === "sin_publicar" && (
            <span style={{ marginLeft: 8, color: "#d8b4fe", background: "rgba(168, 85, 247, 0.2)", padding: "2px 8px", borderRadius: "6px", fontSize: "0.76rem", fontWeight: 800 }}>
              • Mostrando solo Por Publicar
            </span>
          )}
          {popularityFilter !== "todos" && (
            <span style={{ marginLeft: 8, color: "#fef08a", background: "rgba(245, 158, 11, 0.15)", padding: "2px 8px", borderRadius: "6px", fontSize: "0.76rem" }}>
              • {popularityFilter === "mas_vendidos" ? "Top Más Vendidos" : "Populares"}
            </span>
          )}
          {genreFilter !== "todos" && (
            <span style={{ marginLeft: 8, color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", padding: "2px 8px", borderRadius: "6px", fontSize: "0.76rem" }}>
              • Género: {SWITCH_GENRES.find(g => g.id === genreFilter)?.label || genreFilter}
            </span>
          )}
        </div>

        {/* SELECTOR ORDENAR POR */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(15, 23, 42, 0.8)",
          padding: "5px 12px",
          borderRadius: "10px",
          border: "1px solid rgba(255, 255, 255, 0.15)"
        }}>
          <span style={{ color: "#cbd5e1", fontSize: "0.82rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <SlidersHorizontal size={14} color="#38bdf8" />
            Ordenar por:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid rgba(56, 189, 248, 0.35)",
              background: "#0b1220",
              color: "#38bdf8",
              fontSize: "0.82rem",
              fontWeight: 800,
              cursor: "pointer",
              outline: "none"
            }}
          >
            <option value="mas_vendidos">🏆 Más Vendidos / Históricos Switch</option>
            <option value="stock_desc">📦 Mayor Stock Disponible</option>
            <option value="stock_asc">📉 Menor Stock / Agotados</option>
            <option value="az">🔤 Nombre (A - Z)</option>
            <option value="za">🔤 Nombre (Z - A)</option>
            <option value="precio_desc">💰 Mayor Precio Oficial</option>
            <option value="precio_asc">🏷️ Menor Precio Oficial</option>
          </select>
        </div>
      </div>

      {/* TABLA MAESTRA AGRUPADA POR TÍTULO (SIN DUPLICADOS) */}
      <div className="adm-unpub-table-wrap">
        <table className="adm-unpub-table">
          <thead>
            <tr>
              <th style={{ minWidth: 280 }}>Juego & Variantes</th>
              <th style={{ minWidth: 120 }}>Costo Proveedor</th>
              <th style={{ minWidth: 150 }}>Precio & Margen Cliente</th>
              <th style={{ minWidth: 160 }}>Precio & Margen Revendedor</th>
              <th style={{ minWidth: 150 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredGames.slice(0, visibleCount).map((master) => {
              let activeType = variantTypeFilter !== "todos"
                ? variantTypeFilter
                : (selectedVariants[master.canonKey] || master.defaultVariant);
              if (stockFilter === "publicados" && master.variants[activeType] && !master.variants[activeType].isPublished) {
                const pubVar = Object.values(master.variants).find(v => v.isPublished);
                if (pubVar) activeType = pubVar.type;
              }
              const activeVariant = master.variants[activeType] || Object.values(master.variants)[0];
              if (!activeVariant) return null;

              const resellerMargin = activeVariant.gananciaRevendedor;
              const resellerMarginSafe = resellerMargin >= 5000;
              const retailMarginSafe = activeVariant.gananciaClientePrimaria >= 5000;

              const allVariantsList = Object.values(master.variants);
              const unpubList = allVariantsList.filter(v => !v.isPublished);
              const pubList = allVariantsList.filter(v => v.isPublished);
              const salesInfo = getSwitchHistoricalSalesInfo(master.displayName);

              return (
                <tr key={master.canonKey}>
                  {/* COLUMNA 1: PORTADA OFICIAL NINTENDO + TÍTULO, VARIANTES Y STOCK */}
                  <td>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      {/* Portada Oficial Nintendo */}
                      <div style={{
                        width: 52,
                        height: 72,
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#0f172a",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        flexShrink: 0,
                        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.4)",
                        position: "relative"
                      }}>
                        <img
                          src={master.coverUrl || getNintendoBoxartUrl(master.displayName)}
                          alt={master.displayName}
                          loading="lazy"
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          onError={(e) => {
                            if (!e.target.src.includes("hero")) {
                              e.target.src = e.target.src.replace(/\/boxart$/, "/hero");
                            } else {
                              e.target.src = "/logo.png";
                            }
                          }}
                        />
                        {master.isManualStock && (
                          <div style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: "rgba(34, 197, 94, 0.9)",
                            color: "#000",
                            fontSize: "8.5px",
                            fontWeight: 900,
                            textAlign: "center",
                            lineHeight: "13px"
                          }}>
                            MANUAL
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <strong className="game-title" style={{ fontSize: "1.02rem", color: "#fff" }}>{master.displayName}</strong>
                          {salesInfo.label && (
                            <span style={{
                              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(234, 88, 12, 0.2))",
                              border: "1px solid rgba(245, 158, 11, 0.45)",
                              color: "#fef08a",
                              borderRadius: 4,
                              padding: "1px 6px",
                              fontSize: "0.68rem",
                              fontWeight: 800,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3
                            }}>
                              🏆 {salesInfo.label}
                            </span>
                          )}
                          {master.isManualStock && (
                            <span style={{ background: "rgba(34, 197, 94, 0.2)", color: "#86efac", border: "1px solid #22c55e", borderRadius: 4, padding: "1px 6px", fontSize: "0.68rem", fontWeight: 800 }}>
                              ⚡ STOCK FORZADO
                            </span>
                          )}
                        </div>
                        
                        {/* CHIPS DE VARIANTES */}
                        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", alignItems: "center" }}>
                          {master.hasBase && (
                            <button
                              type="button"
                              onClick={() => setSelectedVariants(prev => ({ ...prev, [master.canonKey]: "base_game" }))}
                              style={{
                                padding: "2px 7px",
                                borderRadius: "6px",
                                fontSize: "0.72rem",
                                fontWeight: activeType === "base_game" ? 800 : 600,
                                background: activeType === "base_game" ? "rgba(56, 189, 248, 0.25)" : "rgba(255, 255, 255, 0.05)",
                                border: activeType === "base_game" ? "1.5px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                                color: activeType === "base_game" ? "#38bdf8" : "#cbd5e1",
                                cursor: "pointer"
                              }}
                            >
                              🎮 Base ({master.variants.base_game?.stockCount || 0}) {master.variants.base_game?.isPublished ? "✓" : ""}
                            </button>
                          )}

                          {master.hasGameDlc && (
                            <button
                              type="button"
                              onClick={() => setSelectedVariants(prev => ({ ...prev, [master.canonKey]: "game_dlc" }))}
                              style={{
                                padding: "2px 7px",
                                borderRadius: "6px",
                                fontSize: "0.72rem",
                                fontWeight: activeType === "game_dlc" ? 800 : 600,
                                background: activeType === "game_dlc" ? "rgba(168, 85, 247, 0.25)" : "rgba(255, 255, 255, 0.05)",
                                border: activeType === "game_dlc" ? "1.5px solid #a855f7" : "1px solid rgba(255, 255, 255, 0.1)",
                                color: activeType === "game_dlc" ? "#c084fc" : "#cbd5e1",
                                cursor: "pointer"
                              }}
                            >
                              📦 +DLC ({master.variants.game_dlc?.stockCount || 0}) {master.variants.game_dlc?.isPublished ? "✓" : ""}
                            </button>
                          )}

                          {master.hasDlcOnly && (
                            <button
                              type="button"
                              onClick={() => setSelectedVariants(prev => ({ ...prev, [master.canonKey]: "dlc_only" }))}
                              style={{
                                padding: "2px 7px",
                                borderRadius: "6px",
                                fontSize: "0.72rem",
                                fontWeight: activeType === "dlc_only" ? 800 : 600,
                                background: activeType === "dlc_only" ? "rgba(234, 179, 8, 0.25)" : "rgba(255, 255, 255, 0.05)",
                                border: activeType === "dlc_only" ? "1.5px solid #eab308" : "1px solid rgba(255, 255, 255, 0.1)",
                                color: activeType === "dlc_only" ? "#fde047" : "#cbd5e1",
                                cursor: "pointer"
                              }}
                            >
                              🧩 Solo DLC ({master.variants.dlc_only?.stockCount || 0}) {master.variants.dlc_only?.isPublished ? "✓" : ""}
                            </button>
                          )}
                        </div>

                        {/* BADGES OFICIAL Y BOTÓN FORZAR STOCK */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                          <span style={{
                            fontSize: "0.7rem",
                            background: "rgba(239, 68, 68, 0.12)",
                            border: "1px solid rgba(239, 68, 68, 0.35)",
                            color: "#fca5a5",
                            padding: "1px 6px",
                            borderRadius: 4,
                            fontWeight: 700
                          }}>
                            🏛️ Oficial: {formatCLP(master.officialPriceCLP)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleManualStock(master)}
                            style={{
                              padding: "2px 8px",
                              borderRadius: 5,
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              background: master.isManualStock ? "rgba(34, 197, 94, 0.25)" : "rgba(255, 255, 255, 0.08)",
                              border: master.isManualStock ? "1.5px solid #22c55e" : "1px solid rgba(255, 255, 255, 0.2)",
                              color: master.isManualStock ? "#86efac" : "#cbd5e1",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4
                            }}
                            title={master.isManualStock ? "Stock manual activo (Click para desactivar)" : "Forzar stock disponible aunque no haya cuentas en Telegram"}
                          >
                            ⚡ {master.isManualStock ? "Stock Manual: ACTIVO" : "Forzar Stock"}
                          </button>

                          {master.totalStock === 0 && (
                            <span style={{
                              fontSize: "0.7rem",
                              background: "rgba(239, 68, 68, 0.2)",
                              border: "1px solid #ef4444",
                              color: "#f87171",
                              padding: "1px 6px",
                              borderRadius: 4,
                              fontWeight: 800
                            }}>
                              🔴 Agotado
                            </span>
                          )}

                          {activeVariant.packIds?.length > 0 && (
                            <button
                              type="button"
                              className="btn-inspect-pack-sm"
                              onClick={() => setInspectingGamePacks({
                                name: master.displayName,
                                baseCanonical: master.canonKey,
                                variantType: activeVariant.type,
                                variantLabel: activeVariant.typeLabel,
                                packIds: activeVariant.packIds,
                                packDetails: activeVariant.packDetails
                              })}
                              style={{ padding: "2px 7px", fontSize: "0.7rem" }}
                              title={`Inspeccionar sólo los packs de la variante ${activeVariant.typeLabel}`}
                            >
                              👁️ Packs ({activeVariant.packIds.length})
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* COLUMNA 2: COSTO PROVEEDOR */}
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontWeight: 800, color: "#38bdf8", fontSize: "0.95rem" }}>
                        ${activeVariant.minCostUSD || activeVariant.costUSD} USD
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "#facc15" }}>
                        Piso: {formatCLP(activeVariant.costCLP)}
                      </span>
                    </div>
                  </td>

                  {/* COLUMNA 3: PRECIO & GANANCIA CLIENTE */}
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontWeight: 800, color: "#f8fafc", fontSize: "1rem" }}>
                        {formatCLP(activeVariant.precioPrimaria)}
                      </span>
                      <span style={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: retailMarginSafe ? "#22c55e" : "#f43f5e"
                      }}>
                        Ganancia: +{formatCLP(activeVariant.gananciaClientePrimaria)}
                      </span>
                    </div>
                  </td>

                  {/* COLUMNA 4: PRECIO & GANANCIA REVENDEDOR */}
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontWeight: 800, color: "#c084fc", fontSize: "1rem" }}>
                        💎 {formatCLP(activeVariant.precioRevendedor)}
                      </span>
                      <span style={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: resellerMarginSafe ? "#a855f7" : "#f43f5e"
                      }}>
                        Ganancia: +{formatCLP(resellerMargin)} {resellerMarginSafe ? "🛡️ Seguro" : "⚠️ Riesgo"}
                      </span>
                    </div>
                  </td>

                  {/* COLUMNA 5: ACCIONES */}
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {/* SI LA VARIANTE ACTIVA ESTÁ PUBLICADA: EDITAR PRECIO O ELIMINAR */}
                      {activeVariant.isPublished && (
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleOpenPriceModal(activeVariant, master)}
                            style={{
                              flex: 1,
                              padding: "6px 10px",
                              borderRadius: "8px",
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "5px",
                              cursor: "pointer",
                              background: !resellerMarginSafe || !retailMarginSafe 
                                ? "rgba(239, 68, 68, 0.2)" 
                                : "rgba(56, 189, 248, 0.15)",
                              border: !resellerMarginSafe || !retailMarginSafe
                                ? "1.5px solid #f43f5e"
                                : "1px solid rgba(56, 189, 248, 0.4)",
                              color: !resellerMarginSafe || !retailMarginSafe ? "#fca5a5" : "#38bdf8"
                            }}
                            title="Ajustar precio cliente y recalcular revendedor automático"
                          >
                            <SlidersHorizontal size={13} />
                            ⚡ Ajustar Precio
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUnpublishProduct(activeVariant, master)}
                            style={{
                              padding: "6px 8px",
                              borderRadius: "8px",
                              background: "rgba(239, 68, 68, 0.15)",
                              border: "1px solid rgba(239, 68, 68, 0.4)",
                              color: "#f87171",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                            title="Eliminar este juego de la tienda web"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}

                      {/* SI TIENE VARIANTES SIN PUBLICAR */}
                      {unpubList.length > 0 && (
                        <button
                          type="button"
                          className="btn-go-publish"
                          onClick={() => handleOpenPublishModal(master)}
                          disabled={publishingKey === `modal_${master.canonKey}`}
                          style={{
                            width: "100%",
                            justifyContent: "center",
                            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                            borderColor: "#60a5fa",
                            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
                            padding: "6px 10px",
                            fontSize: "0.82rem"
                          }}
                        >
                          <SlidersHorizontal size={13} />
                          {unpubList.length > 1 ? `🚀 Publicar (${unpubList.length})` : `🚀 Publicar ${unpubList[0].typeLabel}`}
                        </button>
                      )}

                      {/* BADGE DE ESTADO */}
                      {pubList.length > 0 && (
                        <span className="pub-status-badge pub-active" style={{ fontSize: "0.7rem", padding: "2px 6px", textAlign: "center" }}>
                          <CheckCircle2 size={11} /> En Catálogo ({pubList.length}/{allVariantsList.length})
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredGames.length > visibleCount && (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", padding: "18px" }}>
                  <button
                    type="button"
                    onClick={() => setVisibleCount(prev => prev + 50)}
                    style={{
                      padding: "10px 24px",
                      borderRadius: 12,
                      background: "rgba(56, 189, 248, 0.15)",
                      border: "1.5px solid rgba(56, 189, 248, 0.4)",
                      color: "#38bdf8",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: 14
                    }}
                  >
                    ⚡ Mostrando {visibleCount} de {filteredGames.length} juegos (Cargar 50 más...)
                  </button>
                </td>
              </tr>
            )}

            {filteredGames.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: "40px 20px", textAlign: "center" }}>
                  <div style={{
                    maxWidth: 580,
                    margin: "0 auto",
                    padding: "24px",
                    background: "linear-gradient(135deg, rgba(225, 29, 72, 0.12), rgba(15, 23, 42, 0.95))",
                    border: "1.5px dashed rgba(225, 29, 72, 0.5)",
                    borderRadius: 16
                  }}>
                    <span style={{ fontSize: "2.2rem", display: "block", marginBottom: 10 }}>🌐</span>
                    <h3 style={{ color: "#fff", margin: "0 0 8px 0", fontSize: "1.2rem" }}>
                      {searchTerm ? `"${searchTerm}" no está en los packs de Telegram` : "No hay juegos con los filtros seleccionados"}
                    </h3>
                    <p style={{ color: "#94a3b8", fontSize: "0.88rem", lineHeight: 1.5, margin: "0 0 16px 0" }}>
                      ¡Puedes buscarlo en la base de datos oficial de la Nintendo eShop y publicarlo en tu tienda con 1 clic, con su carátula oficial y stock garantizado!
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        handleSearchNintendoEshop(searchTerm);
                        setNintendoSearchModal(prev => ({
                          ...prev,
                          open: true,
                          query: searchTerm || "",
                          selectedGame: null
                        }));
                      }}
                      style={{
                        padding: "10px 24px",
                        borderRadius: 10,
                        border: "none",
                        background: "linear-gradient(135deg, #e11d48, #be123c)",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        cursor: "pointer",
                        boxShadow: "0 4px 16px rgba(225, 29, 72, 0.4)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8
                      }}
                    >
                      <Sparkles size={18} />
                      {searchTerm ? `Buscar "${searchTerm}" en Nintendo eShop Oficial` : "Explorar Nintendo eShop Oficial"}
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL AJUSTAR PRECIOS & PROTEGER MARGEN (RESUELVE EL ERROR DE "SUBIR PRECIO") */}
      {adjustingPriceGame && (
        <div className="adm-unpub-modal-overlay" onClick={() => setAdjustingPriceGame(null)}>
          <div className="adm-unpub-modal-card" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <button className="adm-unpub-modal-close" onClick={() => setAdjustingPriceGame(null)}>✕</button>
            
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{
                background: "rgba(56, 189, 248, 0.2)",
                padding: "8px",
                borderRadius: "10px",
                color: "#38bdf8"
              }}>
                <SlidersHorizontal size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.25rem", margin: 0, color: "#fff" }}>
                  Ajustar Precios & Proteger Margen
                </h3>
                <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                  {adjustingPriceGame.masterDisplayName} · {adjustingPriceGame.typeLabel}
                </span>
              </div>
            </div>

            {/* STRIP DE COSTOS DE ENTRADA */}
            <div style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              padding: "12px 16px",
              margin: "16px 0",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px"
            }}>
              <div>
                <div style={{ fontSize: "0.74rem", color: "#94a3b8", textTransform: "uppercase" }}>Costo Proveedor Pack</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#38bdf8" }}>
                  ${adjustingPriceGame.minCostUSD || adjustingPriceGame.costUSD} USD (~{formatCLP(adjustingPriceGame.costCLP)})
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.74rem", color: "#94a3b8", textTransform: "uppercase" }}>Referencia Oficial Nintendo</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fca5a5" }}>
                  {formatCLP(adjustingPriceGame.officialPriceCLP)}
                </div>
              </div>
            </div>

            {/* FORMULARIO SIMPLIFICADO: 1 SOLO INPUT DE PRECIO CLIENTE */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* CAMPO ÚNICO: PRECIO CLIENTE FINAL */}
              <div style={{ background: "rgba(56, 189, 248, 0.05)", padding: "16px", borderRadius: "12px", border: "1.5px solid rgba(56, 189, 248, 0.3)" }}>
                <label style={{ fontSize: "0.9rem", fontWeight: 800, color: "#38bdf8", display: "block", marginBottom: 8 }}>
                  🎮 Ingresa Precio Cliente Final (CLP):
                </label>
                <input
                  type="number"
                  step="500"
                  value={adjustForm.primaria}
                  onChange={(e) => handlePrimariaChange(e.target.value)}
                  placeholder="Ej: 13000"
                  style={{
                    width: "100%",
                    background: "#0f172a",
                    border: "2px solid #38bdf8",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    color: "#fff",
                    fontSize: "1.3rem",
                    fontWeight: 900
                  }}
                />
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginTop: 6 }}>
                  💡 Solo ingresa este valor. El precio de revendedor y las ganancias se calculan de forma automática.
                </span>
              </div>

              {/* TARJETA DE CÁLCULO AUTOMÁTICO EN TIEMPO REAL */}
              <div style={{
                background: "rgba(15, 23, 42, 0.7)",
                border: "1.5px solid rgba(168, 85, 247, 0.3)",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#94a3b8", fontSize: "0.88rem" }}>Precio Revendedor (Automático):</span>
                  <strong style={{ color: "#c084fc", fontSize: "1.2rem" }}>
                    💎 {formatCLP(adjustForm.revendedor)}
                  </strong>
                </div>

                <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)" }} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "8px", padding: "10px" }}>
                    <div style={{ fontSize: "0.74rem", color: "#86efac", textTransform: "uppercase", fontWeight: 700 }}>Tu Ganancia Cliente</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#22c55e", marginTop: 2 }}>
                      +{formatCLP(Number(adjustForm.primaria) - adjustingPriceGame.costCLP)}
                    </div>
                  </div>

                  <div style={{ background: "rgba(168, 85, 247, 0.1)", border: "1px solid rgba(168, 85, 247, 0.3)", borderRadius: "8px", padding: "10px" }}>
                    <div style={{ fontSize: "0.74rem", color: "#d8b4fe", textTransform: "uppercase", fontWeight: 700 }}>Tu Ganancia Revendedor</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#c084fc", marginTop: 2 }}>
                      +{formatCLP(Number(adjustForm.revendedor) - adjustingPriceGame.costCLP)}
                    </div>
                  </div>
                </div>

                {Number(adjustForm.primaria) > 0 && Number(adjustForm.primaria) < (adjustingPriceGame.costCLP + 5000) ? (
                  <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: "8px", padding: "8px 12px", color: "#fca5a5", fontSize: "0.78rem" }}>
                    ⚠️ <b>Margen en riesgo:</b> El precio cliente ({formatCLP(adjustForm.primaria)}) está por debajo del piso seguro ({formatCLP(adjustingPriceGame.costCLP + 5000)} = costo + $5.000).
                  </div>
                ) : (
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", lineHeight: 1.3 }}>
                    🛡️ <b>Piso Seguro PandaStore:</b> Descuento revendedor de $5.000 CLP aplicado. Tu ganancia mínima garantizada con revendedores es de <b>+$5.000 CLP netos</b> (aumenta proporcionalmente con precios más altos).
                  </div>
                )}
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                type="button"
                onClick={handleApplySuggestedPrices}
                style={{
                  flex: 1,
                  background: "rgba(234, 179, 8, 0.15)",
                  border: "1px solid rgba(234, 179, 8, 0.4)",
                  color: "#fde047",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  fontWeight: 700,
                  fontSize: "0.84rem",
                  cursor: "pointer"
                }}
              >
                ⚡ Precios Sugeridos
              </button>

              <button
                type="button"
                onClick={handleSavePriceAdjust}
                disabled={savingPrice}
                style={{
                  flex: 1.5,
                  background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                  border: "none",
                  color: "#fff",
                  padding: "10px 16px",
                  borderRadius: "10px",
                  fontWeight: 800,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 15px rgba(2, 132, 199, 0.35)"
                }}
              >
                <Check size={16} /> {savingPrice ? "Guardando..." : "Guardar en Tienda"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INSPECTOR DE PACKS CON NICKNAME DE PROVEEDOR */}
      {inspectingGamePacks && (
        <div className="adm-unpub-modal-overlay" onClick={() => setInspectingGamePacks(null)}>
          <div className="adm-unpub-modal-card adm-pack-inspector-card" onClick={(e) => e.stopPropagation()}>
            <button className="adm-unpub-modal-close" onClick={() => setInspectingGamePacks(null)}>✕</button>
            <div className="adm-inspector-header">
              <span className="adm-badge-admin-only">🔒 Panel Exclusivo Administrador</span>
              <h3 style={{ fontSize: "1.3rem", margin: "6px 0 2px", color: "#fff" }}>
                Packs de Proveedor: {inspectingGamePacks.name}
              </h3>
              <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>
                Mostrando sólo la variante <strong>{inspectingGamePacks.variantLabel || "seleccionada"}</strong>: {inspectingGamePacks.packDetails?.length || 0} pack(s). Cada pack muestra su <strong>Nickname exacto</strong> para identificación inmediata.
              </p>
            </div>

            <div className="adm-pack-list-wrap">
              {inspectingGamePacks.packDetails && inspectingGamePacks.packDetails.length > 0 ? (
                inspectingGamePacks.packDetails.map((p, idx) => (
                  <div key={idx} className="adm-pack-item-card">
                    <div className="adm-pack-item-top">
                      <span className="adm-pack-id-tag">
                        📦 Pack #{p.packId?.slice(0, 12)}
                      </span>
                      {p.nickname && (
                        <span style={{
                          background: "rgba(168, 85, 247, 0.15)",
                          border: "1px solid rgba(168, 85, 247, 0.4)",
                          color: "#d8b4fe",
                          padding: "3px 10px",
                          borderRadius: "8px",
                          fontSize: "0.82rem",
                          fontWeight: 800,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          👤 Nickname: {p.nickname}
                        </span>
                      )}
                      <span className="adm-pack-price-tag">
                        💰 Costo: {p.precioUSD > 0 ? `$${p.precioUSD} USD` : ""} (~{formatCLP(p.precioCLP)})
                      </span>
                    </div>
                    <div className="adm-pack-games-title">
                      Todos los juegos en este pack ({p.juegos?.length || 0}):
                    </div>
                    <div className="adm-pack-games-tags">
                      {p.juegos && p.juegos.map((jg, jgIdx) => {
                        const jgClassified = classifySwitchItem(jg);
                        const jgCanon = normalizeGameName(jg);
                        const isMatch = jgCanon === inspectingGamePacks.baseCanonical || 
                                        jg.toLowerCase().includes(inspectingGamePacks.name.toLowerCase());
                        return (
                          <span
                            key={jgIdx}
                            className={`adm-pack-game-pill ${isMatch ? 'current-game' : ''}`}
                          >
                            {jg} {isMatch ? '★' : ''}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-muted">
                  Pack IDs asociados: {inspectingGamePacks.packIds?.join(", ") || "No registrados"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PUBLICACIÓN CON SELECCIÓN DE VARIANTES Y MÁRGENES EN VIVO */}
      {publishingModalGame && (
        <div className="adm-unpub-modal-overlay" onClick={() => setPublishingModalGame(null)}>
          <div 
            className="adm-unpub-modal-card" 
            style={{ maxWidth: 780, maxHeight: "90vh", overflowY: "auto", padding: "24px" }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "1.35rem", margin: "0 0 6px", color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                  <Gamepad2 size={24} color="#38bdf8" />
                  Publicar en Tienda: {publishingModalGame.master.displayName}
                </h3>
                <p className="text-muted" style={{ fontSize: "0.84rem", margin: 0 }}>
                  Selecciona cuáles variantes deseas publicar, asigna sus precios y verifica los márgenes en tiempo real de cada una.
                </p>
              </div>
              <button 
                type="button" 
                className="adm-unpub-modal-close" 
                onClick={() => setPublishingModalGame(null)}
              >
                ✕
              </button>
            </div>

            {/* LISTA DE VARIANTES DISPONIBLES */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
              {Object.entries(publishingModalGame.variantsData).map(([typeKey, vData]) => {
                const switchMinProfit = Number(resellerConfig?.categories?.switch?.minProfitCLP) > 0
                  ? Number(resellerConfig.categories.switch.minProfitCLP)
                  : (Number(resellerConfig?.minProfitCLP) > 0 ? Number(resellerConfig.minProfitCLP) : 5000);
                const marginCliente = (Number(vData.pricePrimaria) || 0) - vData.costCLP;
                const marginRevendedor = (Number(vData.priceRevendedor) || 0) - vData.costCLP;
                const suggestedPrice = vData.suggestedPrice || getSuggestedRetailPrice(vData.costCLP, resellerConfig);
                const isLoss = (Number(vData.pricePrimaria) || 0) < vData.costCLP;
                const isLowMargin = !isLoss && marginRevendedor < switchMinProfit;

                return (
                  <div 
                    key={typeKey}
                    style={{
                      background: vData.selected ? "rgba(30, 41, 59, 0.85)" : "rgba(15, 23, 42, 0.4)",
                      border: vData.selected ? (isLoss ? "1.5px solid #ef4444" : isLowMargin ? "1.5px solid #f59e0b" : "1.5px solid #38bdf8") : "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "14px",
                      padding: "16px",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {/* CABECERA DE LA VARIANTE CON CHECKBOX */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: 8 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={vData.selected}
                          onChange={() => {
                            setPublishingModalGame(prev => ({
                              ...prev,
                              variantsData: {
                                ...prev.variantsData,
                                [typeKey]: { ...vData, selected: !vData.selected }
                              }
                            }));
                          }}
                          style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#38bdf8" }}
                        />
                        <span style={{ fontSize: "1.05rem", fontWeight: 800, color: vData.selected ? "#fff" : "#94a3b8" }}>
                          {vData.typeLabel}
                        </span>
                      </label>

                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <span style={{
                          fontSize: "0.74rem",
                          background: "rgba(34, 197, 94, 0.15)",
                          border: "1px solid rgba(34, 197, 94, 0.35)",
                          color: "#4ade80",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontWeight: 700
                        }}>
                          📦 {vData.stockCount} en stock
                        </span>
                        <span style={{
                          fontSize: "0.74rem",
                          background: "rgba(56, 189, 248, 0.15)",
                          border: "1px solid rgba(56, 189, 248, 0.35)",
                          color: "#38bdf8",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontWeight: 700
                        }}>
                          Costo: ${vData.costUSD} USD ({formatCLP(vData.costCLP)})
                        </span>
                      </div>
                    </div>

                    {vData.selected && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px", background: "rgba(15, 23, 42, 0.6)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(56, 189, 248, 0.25)" }}>
                        {/* INPUT: PRECIO CLIENTE FINAL + BOTÓN PRECIO SUGERIDO */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                            <label style={{ fontSize: "0.86rem", color: "#38bdf8", fontWeight: 800, margin: 0 }}>
                              🎮 Ingresa Precio Cliente Final (CLP):
                            </label>
                            {suggestedPrice && (
                              <button
                                type="button"
                                onClick={() => handleModalPricePrimariaChange(typeKey, suggestedPrice)}
                                style={{
                                  background: "rgba(56, 189, 248, 0.15)",
                                  border: "1px solid rgba(56, 189, 248, 0.4)",
                                  color: "#38bdf8",
                                  borderRadius: "6px",
                                  padding: "3px 8px",
                                  fontSize: "0.75rem",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4
                                }}
                                title="Fijar precio óptimo para garantizar tu margen y el descuento revendedor"
                              >
                                💡 Sugerido: {formatCLP(suggestedPrice)}
                              </button>
                            )}
                          </div>
                          <input
                            type="number"
                            step="500"
                            value={vData.pricePrimaria}
                            onChange={(e) => handleModalPricePrimariaChange(typeKey, e.target.value)}
                            placeholder="Ej: 13000"
                            style={{
                              width: "100%",
                              background: "#0f172a",
                              border: isLoss 
                                ? "2px solid #ef4444" 
                                : isLowMargin 
                                ? "2px solid #f59e0b" 
                                : "2px solid #38bdf8",
                              borderRadius: "8px",
                              padding: "10px 14px",
                              color: "#fff",
                              fontSize: "1.2rem",
                              fontWeight: 900
                            }}
                          />
                        </div>

                        {/* ALERTAS EN CASO DE PÉRDIDA O MARGEN INSUFICIENTE */}
                        {isLoss && (
                          <div style={{
                            background: "rgba(239, 68, 68, 0.15)",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 8
                          }}>
                            <div style={{ color: "#fca5a5", fontSize: "0.82rem", fontWeight: 700 }}>
                              🚨 <strong>¡Alerta de Pérdida!</strong> El precio ({formatCLP(vData.pricePrimaria)}) es menor al costo del pack ({formatCLP(vData.costCLP)}). Pérdida: -{formatCLP(vData.costCLP - (Number(vData.pricePrimaria) || 0))} por compra.
                            </div>
                            {suggestedPrice && (
                              <button
                                type="button"
                                onClick={() => handleModalPricePrimariaChange(typeKey, suggestedPrice)}
                                style={{
                                  background: "#ef4444",
                                  border: "none",
                                  color: "#fff",
                                  borderRadius: "6px",
                                  padding: "4px 10px",
                                  fontSize: "0.75rem",
                                  fontWeight: 800,
                                  cursor: "pointer"
                                }}
                              >
                                ⚡ Aplicar {formatCLP(suggestedPrice)}
                              </button>
                            )}
                          </div>
                        )}

                        {isLowMargin && (
                          <div style={{
                            background: "rgba(245, 158, 11, 0.15)",
                            border: "1px solid rgba(245, 158, 11, 0.4)",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 8
                          }}>
                            <div style={{ color: "#fde68a", fontSize: "0.82rem", fontWeight: 700 }}>
                              ⚠️ <strong>Margen Revendedor Bajo:</strong> El revendedor pagaría {formatCLP(vData.priceRevendedor)}, dejándote solo {formatCLP(marginRevendedor)} de ganancia (tu margen configurado en Switch exige {formatCLP(switchMinProfit)}).
                            </div>
                            {suggestedPrice && (
                              <button
                                type="button"
                                onClick={() => handleModalPricePrimariaChange(typeKey, suggestedPrice)}
                                style={{
                                  background: "#f59e0b",
                                  border: "none",
                                  color: "#000",
                                  borderRadius: "6px",
                                  padding: "4px 10px",
                                  fontSize: "0.75rem",
                                  fontWeight: 800,
                                  cursor: "pointer"
                                }}
                              >
                                ⚡ Aplicar {formatCLP(suggestedPrice)}
                              </button>
                            )}
                          </div>
                        )}

                        {/* DESGLOSE AUTOMÁTICO DE PRECIO REVENDEDOR Y GANANCIAS */}
                        <div style={{
                          background: "rgba(0, 0, 0, 0.4)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "8px",
                          padding: "12px 14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#94a3b8", fontSize: "0.84rem" }}>Precio Revendedor (Automático según regla):</span>
                            <strong style={{ color: "#c084fc", fontSize: "1.1rem" }}>
                              💎 {formatCLP(vData.priceRevendedor)}
                            </strong>
                          </div>

                          <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.06)" }} />

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            {/* GANANCIA CLIENTE */}
                            <div style={{
                              background: marginCliente < 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.1)",
                              border: marginCliente < 0 ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(34, 197, 94, 0.25)",
                              borderRadius: "6px",
                              padding: "8px 10px"
                            }}>
                              <div style={{
                                fontSize: "0.7rem",
                                color: marginCliente < 0 ? "#fca5a5" : "#86efac",
                                textTransform: "uppercase",
                                fontWeight: 800
                              }}>
                                {marginCliente < 0 ? "🚨 PÉRDIDA CLIENTE" : "TU GANANCIA CLIENTE"}
                              </div>
                              <div style={{
                                fontSize: "1.15rem",
                                fontWeight: 900,
                                color: marginCliente < 0 ? "#ef4444" : "#22c55e",
                                marginTop: 2
                              }}>
                                {marginCliente < 0 ? `-${formatCLP(Math.abs(marginCliente))}` : `+${formatCLP(marginCliente)}`}
                              </div>
                            </div>

                            {/* GANANCIA REVENDEDOR */}
                            <div style={{
                              background: marginRevendedor < 0 
                                ? "rgba(239, 68, 68, 0.15)" 
                                : marginRevendedor < switchMinProfit 
                                ? "rgba(245, 158, 11, 0.15)" 
                                : "rgba(168, 85, 247, 0.1)",
                              border: marginRevendedor < 0 
                                ? "1px solid rgba(239, 68, 68, 0.35)" 
                                : marginRevendedor < switchMinProfit 
                                ? "1px solid rgba(245, 158, 11, 0.35)" 
                                : "1px solid rgba(168, 85, 247, 0.25)",
                              borderRadius: "6px",
                              padding: "8px 10px"
                            }}>
                              <div style={{
                                fontSize: "0.7rem",
                                color: marginRevendedor < 0 
                                  ? "#fca5a5" 
                                  : marginRevendedor < switchMinProfit 
                                  ? "#fde68a" 
                                  : "#d8b4fe",
                                textTransform: "uppercase",
                                fontWeight: 800
                              }}>
                                {marginRevendedor < 0 
                                  ? "🚨 PÉRDIDA REVENDEDOR" 
                                  : marginRevendedor < switchMinProfit 
                                  ? "⚠️ GANANCIA BAJO MÍNIMO" 
                                  : "TU GANANCIA REVENDEDOR"}
                              </div>
                              <div style={{
                                fontSize: "1.15rem",
                                fontWeight: 900,
                                color: marginRevendedor < 0 
                                  ? "#ef4444" 
                                  : marginRevendedor < switchMinProfit 
                                  ? "#f59e0b" 
                                  : "#c084fc",
                                marginTop: 2
                              }}>
                                {marginRevendedor < 0 ? `-${formatCLP(Math.abs(marginRevendedor))}` : `+${formatCLP(marginRevendedor)}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* PIE DEL MODAL CON CONFIRMACIÓN */}
            {(() => {
              const selectedVariantsList = Object.values(publishingModalGame.variantsData).filter(v => v.selected);
              const hasLossInSelected = selectedVariantsList.some(v => {
                const mCli = (Number(v.pricePrimaria) || 0) - v.costCLP;
                const mRev = (Number(v.priceRevendedor) || 0) - v.costCLP;
                return mCli < 0 || mRev < 0;
              });

              return (
                <div style={{ display: "flex", gap: "12px", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "16px", flexWrap: "wrap" }}>
                  <div>
                    {hasLossInSelected && (
                      <span style={{ color: "#f87171", fontSize: "0.85rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                        🚫 No puedes subir este pack porque estás perdiendo plata en variante(s) seleccionadas.
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setPublishingModalGame(null)}
                      style={{ padding: "10px 18px", borderRadius: "10px", fontSize: "0.9rem" }}
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      className="btn-publish-now"
                      onClick={handleConfirmPublishModal}
                      disabled={hasLossInSelected || publishingKey === `modal_${publishingModalGame.master.canonKey}` || selectedVariantsList.length === 0}
                      style={{
                        padding: "10px 22px",
                        borderRadius: "10px",
                        fontSize: "0.92rem",
                        fontWeight: 800,
                        background: hasLossInSelected 
                          ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)" 
                          : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        boxShadow: hasLossInSelected 
                          ? "0 4px 14px rgba(239, 68, 68, 0.4)" 
                          : "0 4px 14px rgba(16, 185, 129, 0.4)",
                        cursor: hasLossInSelected ? "not-allowed" : "pointer",
                        opacity: hasLossInSelected ? 0.7 : 1
                      }}
                    >
                      {publishingKey === `modal_${publishingModalGame.master.canonKey}` 
                        ? "Publicando..." 
                        : hasLossInSelected 
                        ? "🚫 Bloqueado: Estás Perdiendo Plata" 
                        : `🚀 Confirmar y Publicar (${selectedVariantsList.length}) Seleccionada(s)`}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL PORTADA OFICIAL DE NINTENDO SWITCH */}
      {searchingCoverFor && (
        <div className="adm-unpub-modal-overlay" onClick={() => setSearchingCoverFor(null)}>
          <div className="adm-unpub-modal-card" style={{ maxWidth: 480, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <button className="adm-unpub-modal-close" onClick={() => setSearchingCoverFor(null)}>✕</button>
            <h3 style={{ fontSize: "1.25rem", margin: "0 0 6px", color: "#fff" }}>Portada Oficial del Juego</h3>
            <p className="text-muted" style={{ fontSize: "0.85rem", margin: "0 0 16px" }}>
              {searchingCoverFor.name}
            </p>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <img
                src={customImages[searchingCoverFor.variantKey] || getNintendoOfficialHeroUrl(searchingCoverFor.name)}
                alt={searchingCoverFor.name}
                style={{
                  width: "100%",
                  maxHeight: 260,
                  objectFit: "contain",
                  borderRadius: 12,
                  background: "#0f172a",
                  border: "2px solid #38bdf8",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
                }}
                onError={(e) => {
                  e.target.src = "https://assets.nintendo.com/image/upload/c_pad,f_auto,h_613,q_auto,w_1089/ncom/es_LA/games/switch";
                }}
              />
            </div>

            <button
              type="button"
              className="btn-publish-now"
              style={{ width: "100%", padding: "12px", fontSize: "0.95rem", justifyContent: "center" }}
              disabled={resolvingCover}
              onClick={async () => {
                setResolvingCover(true);
                const officialUrl = await resolveNintendoOfficialCover(searchingCoverFor.name);
                setResolvingCover(false);

                if (!officialUrl) {
                  alert("No se pudo verificar una portada oficial para este título. No se guardará una imagen rota.");
                  return;
                }

                setCustomImages(prev => ({ ...prev, [searchingCoverFor.variantKey]: officialUrl }));
                setSearchingCoverFor(null);
              }}
            >
              {resolvingCover ? "Verificando portada..." : "✓ Confirmar Portada Oficial"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL BUSCADOR Y PUBLICADOR OFICIAL DE NINTENDO eSHOP */}
      {nintendoSearchModal.open && (
        <div
          className="unpub-modal-overlay"
          onClick={e => {
            if (e.target === e.currentTarget && !nintendoSearchModal.publishing) {
              setNintendoSearchModal(prev => ({ ...prev, open: false, selectedGame: null }));
            }
          }}
        >
          <div
            className="unpub-modal-card"
            style={{
              maxWidth: 720,
              width: "94%",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#0b0f19",
              border: "1.5px solid #e11d48",
              boxShadow: "0 25px 70px rgba(225, 29, 72, 0.25)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>🔴</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#fff", fontWeight: 900 }}>
                    Catálogo Oficial Nintendo eShop
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>
                    Busca cualquier título oficial de Nintendo, obtén su carátula en alta definición y publícalo en tu tienda.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNintendoSearchModal(prev => ({ ...prev, open: false, selectedGame: null }))}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 24, cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            {/* Input de búsqueda con Nintendo API */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                value={nintendoSearchModal.query}
                onChange={e => setNintendoSearchModal(prev => ({ ...prev, query: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === "Enter") handleSearchNintendoEshop(nintendoSearchModal.query);
                }}
                placeholder="Ej: Tomodachi Life, Zelda Tears of the Kingdom, Mario Party..."
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1.5px solid rgba(225, 29, 72, 0.4)",
                  background: "rgba(15, 23, 42, 0.8)",
                  color: "#fff",
                  fontSize: "0.95rem",
                  outline: "none"
                }}
              />
              <button
                type="button"
                onClick={() => handleSearchNintendoEshop(nintendoSearchModal.query)}
                disabled={nintendoSearchModal.loading}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                {nintendoSearchModal.loading ? <RefreshCw size={16} className="spin" /> : <Search size={16} />}
                Buscar
              </button>
            </div>

            {/* Resultados de búsqueda */}
            {!nintendoSearchModal.selectedGame && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, maxHeight: 420, overflowY: "auto", padding: 4 }}>
                {nintendoSearchModal.results.map((game, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectNintendoGameToPublish(game)}
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: 12,
                      padding: 10,
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#e11d48"; e.currentTarget.style.background = "rgba(225, 29, 72, 0.12)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)"; }}
                  >
                    <div style={{ width: "100%", height: 160, borderRadius: 8, overflow: "hidden", background: "#050811", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {(game.boxartUrl || game.coverUrl) ? (
                        <img src={game.boxartUrl || game.coverUrl} alt={game.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>🎮</div>
                      )}
                    </div>
                    <div style={{ fontWeight: 800, color: "#fff", fontSize: "0.88rem", lineHeight: 1.25 }}>
                      {game.title}
                    </div>
                    {game.genres?.length > 0 && (
                      <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{game.genres.join(", ")}</span>
                    )}
                    <span style={{ marginTop: "auto", fontSize: "0.75rem", color: "#e11d48", fontWeight: 800 }}>
                      ⚡ Clic para configurar y publicar
                    </span>
                  </div>
                ))}
                {nintendoSearchModal.results.length === 0 && !nintendoSearchModal.loading && (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "30px 10px", color: "#64748b" }}>
                    Escribe el nombre de un título y presiona "Buscar" para explorar la base de datos oficial de Nintendo eShop.
                  </div>
                )}
              </div>
            )}

            {/* Vista de Configuración y Publicación del Juego Seleccionado */}
            {nintendoSearchModal.selectedGame && (
              <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(225, 29, 72, 0.3)", borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
                  <div style={{ width: 130, height: 175, borderRadius: 10, overflow: "hidden", background: "#050811", border: "1px solid #e11d48", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {(nintendoSearchModal.selectedGame.boxartUrl || nintendoSearchModal.selectedGame.coverUrl) ? (
                      <img src={nintendoSearchModal.selectedGame.boxartUrl || nintendoSearchModal.selectedGame.coverUrl} alt={nintendoSearchModal.selectedGame.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    ) : (
                      <div style={{ color: "#64748b" }}>🎮</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <h4 style={{ margin: "0 0 6px 0", color: "#fff", fontSize: "1.1rem" }}>
                        {nintendoSearchModal.selectedGame.title}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setNintendoSearchModal(prev => ({ ...prev, selectedGame: null }))}
                        style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", fontSize: "0.8rem", textDecoration: "underline" }}
                      >
                        ← Elegir otro
                      </button>
                    </div>
                    {nintendoSearchModal.selectedGame.genres?.length > 0 && (
                      <p style={{ margin: "0 0 6px 0", color: "#94a3b8", fontSize: "0.75rem" }}>
                        Géneros: {nintendoSearchModal.selectedGame.genres.join(", ")}
                      </p>
                    )}
                    <span style={{ background: "rgba(34, 197, 94, 0.15)", color: "#86efac", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: 6, padding: "2px 8px", fontSize: "0.75rem", fontWeight: 800 }}>
                      ✓ Carátula oficial de Nintendo vinculada
                    </span>
                  </div>
                </div>

                {/* Formulario de Precios y Stock */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: "block", color: "#cbd5e1", fontSize: "0.8rem", fontWeight: 700, marginBottom: 4 }}>
                      Precio Cliente Final (CLP):
                    </label>
                    <input
                      type="number"
                      step="1000"
                      value={nintendoSearchModal.chosenPricePrimaria}
                      onChange={e => setNintendoSearchModal(prev => ({ ...prev, chosenPricePrimaria: e.target.value }))}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.2)", background: "rgba(15, 23, 42, 0.9)", color: "#fff", fontWeight: 800, fontSize: "1rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", color: "#c084fc", fontSize: "0.8rem", fontWeight: 700, marginBottom: 4 }}>
                      Precio Revendedor (CLP):
                    </label>
                    <input
                      type="number"
                      step="1000"
                      value={nintendoSearchModal.chosenPriceRevendedor}
                      onChange={e => setNintendoSearchModal(prev => ({ ...prev, chosenPriceRevendedor: e.target.value }))}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.2)", background: "rgba(15, 23, 42, 0.9)", color: "#c084fc", fontWeight: 800, fontSize: "1rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", color: "#86efac", fontSize: "0.8rem", fontWeight: 700, marginBottom: 4 }}>
                      Stock Inicial Garantizado:
                    </label>
                    <input
                      type="number"
                      value={nintendoSearchModal.chosenStock}
                      onChange={e => setNintendoSearchModal(prev => ({ ...prev, chosenStock: e.target.value }))}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.2)", background: "rgba(15, 23, 42, 0.9)", color: "#86efac", fontWeight: 800, fontSize: "1rem" }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmPublishFromNintendo}
                  disabled={nintendoSearchModal.publishing}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 10,
                    border: "none",
                    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: "1rem",
                    cursor: "pointer",
                    boxShadow: "0 6px 20px rgba(34, 197, 94, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8
                  }}
                >
                  {nintendoSearchModal.publishing ? <RefreshCw size={18} className="spin" /> : <Sparkles size={18} />}
                  {nintendoSearchModal.publishing ? "Publicando en Tienda..." : "✓ Confirmar y Publicar en Nintendo Switch"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
