/**
 * ryuuDlcHelper.js
 * Extrae DLCs disponibles de un juego base usando el catalogo de Ryuu API.
 */

import { getCachedSteamCatalog, setCachedSteamCatalog } from "./steamCatalogCache";

export const DLC_PRICE_UNIT = 1000;

let _memCatalog = null;

export async function fetchRyuuCatalog() {
  if (_memCatalog && Array.isArray(_memCatalog) && _memCatalog.length > 0) {
    return _memCatalog;
  }
  try {
    const cached = await getCachedSteamCatalog();
    if (cached && Array.isArray(cached) && cached.length > 10000) {
      _memCatalog = cached;
      return cached;
    }
    const res = await fetch("https://generator.ryuu.lol/files/games.json");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        _memCatalog = data;
        await setCachedSteamCatalog(data);
        return data;
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
