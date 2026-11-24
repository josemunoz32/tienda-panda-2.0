/**
 * ryuuDlcHelper.js
 * Extrae DLCs disponibles de un juego base usando el catalogo de Ryuu API.
 */

import { getCachedSteamCatalog, setCachedSteamCatalog } from "./steamCatalogCache";

export const DLC_PRICE_UNIT = 1000;

let _memCatalog = null;

// Los bots (Googlebot renderiza JS) no necesitan el catálogo de 5 MB: evita gastar transferencia del Hosting
export const isBotClient = () => {
  try {
    return /bot|crawl|spider|slurp|lighthouse|headlesschrome/i.test(navigator.userAgent || "");
  } catch (e) { return false; }
};

// ===== DLCs que NO se venden: monedas, pases de batalla, multijugador, suscripciones =====
// Solo se venden DLCs que funcionan en el juego base / modo historia sin conexión.
const DLC_CURRENCY = String.raw`(coins?|points?|credits?|gems?|crystals?|bucks|v-?bucks|platinum|gold|diamonds?|cash|currency|money|vc|cp|zen|atoms|crowns?|plex|robux|riot points|jewels|rubies)`;
const ONLINE_DLC_RE = new RegExp(
  String.raw`\$\s?\d` +                                                     // Bonus $500,000 (GTA V)
  String.raw`|\b(?!(?:19|20)\d\d\b)\d[\d,.]*\s*` + DLC_CURRENCY +          // 2400 Platinum, 1100 VC (no años)
  String.raw`(\s*(pack|bundle|card|chest|pouch|stack|bag|crate|offer))?\s*([-–(]|$)` +
  String.raw`|\b` + DLC_CURRENCY + String.raw`\s*(pack|bundle|card|chest|pouch|stack|bag|crate)\b` + // Coin Bundle, Gold Pack
  String.raw`|shark card|cash card|virtual currency|in-?game currency|premium currency` +
  String.raw`|(?<!local )\bonline\b|(?<!local )(?<!split-screen )multi-?player(?! mode)|\bpvp\b` +
  String.raw`|battle ?pass|premium pass|ultimate team|\bfut\b|criminal enterprise` +
  String.raw`|\bxp boost|double xp|loot ?box|battle royale|\bvip (membership|subscription)|membership|subscription`,
  "i"
);
// Juegos cuyo contenido descargable es multijugador/cosmético: solo se permiten zombies, campañas e historia
const ONLINE_FRANCHISE_RE = /call of duty|battlefield|rainbow six|for honor|the crew|the division|destiny|ea sports fc|fifa|madden|nhl|nba 2k|wwe 2k|pga tour|rocket league/i;
const OFFLINE_CONTENT_RE = /zombies|campaign|campa[nñ]a|story|historia|expansion|single-?player/i;
const ONLINE_GAME_TAGS = new Set(["Massively Multiplayer", "Free To Play"]);

const normalizeTitle = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function isOnlineOnlyDlc(dlcName, gameName = "") {
  const name = String(dlcName || "");
  if (!name) return false;
  if (ONLINE_DLC_RE.test(name)) return true;
  if (ONLINE_FRANCHISE_RE.test(String(gameName || "")) && !OFFLINE_CONTENT_RE.test(name)) return true;
  return false;
}

/** Quita del catálogo los DLCs online/monedas (y todos los de juegos MMO o Free-to-Play). */
export function sanitizeRyuuCatalog(data) {
  if (!Array.isArray(data)) return data;
  return data.map((g) => {
    if (!g || !g.dlc || typeof g.dlc !== "object") return g;
    const tags = Array.isArray(g.tags) ? g.tags : [];
    if (tags.some((t) => ONLINE_GAME_TAGS.has(t))) return { ...g, dlc: {} };
    const clean = {};
    let removed = false;
    const gameKey = normalizeTitle(g.name);
    for (const [id, info] of Object.entries(g.dlc)) {
      const dlcName = parseDlcInfo(id, info).name;
      const dlcKey = normalizeTitle(dlcName);
      // "DLC" que es el mismo juego base (ej. GTA V Legacy trae un paquete llamado "Grand Theft Auto V")
      const isBaseGameCopy = dlcKey && (dlcKey === gameKey || gameKey.startsWith(dlcKey + " "));
      if (isBaseGameCopy || isOnlineOnlyDlc(dlcName, g.name)) { removed = true; continue; }
      clean[id] = info;
    }
    return removed ? { ...g, dlc: clean } : g;
  });
}

export async function fetchRyuuCatalog() {
  if (isBotClient()) return [];
  if (_memCatalog && Array.isArray(_memCatalog) && _memCatalog.length > 0) {
    return _memCatalog;
  }
  try {
    const cached = await getCachedSteamCatalog();
    if (cached && Array.isArray(cached) && cached.length > 10000) {
      _memCatalog = sanitizeRyuuCatalog(cached);
      return _memCatalog;
    }
    const res = await fetch("/api/ryuu/games.json");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        await setCachedSteamCatalog(data);
        _memCatalog = sanitizeRyuuCatalog(data);
        return _memCatalog;
      }
    }
  } catch (err) {
    console.warn("Error cargando catálogo Ryuu para DLCs:", err);
  }
  return [];
}

export function getDlcBundlePrice(count) {
  if (count <= 1) return count * DLC_PRICE_UNIT;
  if (count === 2) return 1800;
  if (count === 3) return 2500;
  if (count === 4) return 3000;
  return 3500;
}

const dlcNameMemoryCache = new Map();

export async function fetchOfficialSteamDlcName(dlcAppId) {
  if (!dlcAppId) return null;
  const idStr = String(dlcAppId);
  if (dlcNameMemoryCache.has(idStr)) return dlcNameMemoryCache.get(idStr);

  try {
    const local = localStorage.getItem(`steam_dlc_${idStr}`);
    if (local) {
      dlcNameMemoryCache.set(idStr, local);
      return local;
    }
  } catch (e) {}

  try {
    const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${idStr}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data[idStr] && data[idStr].success && data[idStr].data && data[idStr].data.name) {
        const officialName = data[idStr].data.name;
        dlcNameMemoryCache.set(idStr, officialName);
        try {
          localStorage.setItem(`steam_dlc_${idStr}`, officialName);
        } catch (e) {}
        return officialName;
      }
    }
  } catch (err) {
    // Silently continue if CORS or network error
  }
  return null;
}

export function parseDlcInfo(dlcAppId, dlcInfo) {
  let name = "";
  let header_image = "";

  if (typeof dlcInfo === "string") {
    const trimmed = dlcInfo.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        name = parsed.name || "";
        header_image = parsed.header_image || "";
      } catch (e) {
        const nameMatch = trimmed.match(/['"]name['"]\s*:\s*['"]([^'"]+)['"]/);
        if (nameMatch) name = nameMatch[1];
        const imgMatch = trimmed.match(/['"]header_image['"]\s*:\s*['"]([^'"]+)['"]/);
        if (imgMatch) header_image = imgMatch[1];
      }
    } else {
      name = trimmed;
    }
  } else if (typeof dlcInfo === "object" && dlcInfo !== null) {
    name = dlcInfo.name || "";
    header_image = dlcInfo.header_image || "";
  }

  if (!header_image && dlcAppId) {
    header_image = `https://cdn.akamai.steamstatic.com/steam/apps/${dlcAppId}/header.jpg`;
  }

  const isNumericOnly = !name || /^\d+$/.test(name.trim());
  const finalName = isNumericOnly ? `DLC ${dlcAppId}` : name.trim();

  return {
    dlc_app_id: String(dlcAppId),
    name: finalName,
    header_image,
    price_clp: DLC_PRICE_UNIT,
    needsSteamLookup: isNumericOnly
  };
}

export function getDlcsForGame(appId, ryuuCatalog) {
  if (!appId || !Array.isArray(ryuuCatalog)) return [];
  const appIdStr = String(appId);
  const game = ryuuCatalog.find(g => String(g.appid) === appIdStr);
  if (!game || !game.dlc || typeof game.dlc !== 'object') return [];
  const dlcEntries = Object.entries(game.dlc);
  if (dlcEntries.length === 0) return [];
  return dlcEntries.map(([dlcAppId, dlcInfo]) => parseDlcInfo(dlcAppId, dlcInfo));
}

export function splitDlcsByOwnership(allDlcs, purchasedDlcIds = []) {
  const ownedSet = new Set(purchasedDlcIds.map(String));
  return {
    available: allDlcs.filter(d => !ownedSet.has(String(d.dlc_app_id))),
    owned: allDlcs.filter(d => ownedSet.has(String(d.dlc_app_id)))
  };
}

export function calcDlcPricing(count) {
  if (count <= 0) return { unit: DLC_PRICE_UNIT, total: 0, bundle: 0, savings: 0, hasDiscount: false };
  const total = count * DLC_PRICE_UNIT;
  const bundle = getDlcBundlePrice(count);
  return { unit: DLC_PRICE_UNIT, total, bundle, savings: total - bundle, hasDiscount: count >= 2 };
}

export function formatClp(amount) {
  return '$' + Number(amount).toLocaleString('es-CL');
}
