import vipGamesData from './vipGamesData.json';

// Configuración de Estrenos Exclusivos VIP para Steam
// Cuentas de activación offline para títulos AAA de estreno que requieren código de activación
// CERO mención a términos técnicos (Denuvo, fix, build) de cara al usuario.

export const VIP_HIGHLIGHT_GAMES = vipGamesData;
const VIP_APP_IDS = new Set(vipGamesData.map(v => String(v.app_id)));
const VIP_CLEAN_NAMES = new Set(vipGamesData.map(v => (v.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "")));

// El catálogo actual mantiene títulos válidos; excluye ediciones descontinuadas o retiradas.
export const isRetiredSteamTitle = (p) => {
  const name = (typeof p === 'string' ? p : (p?.name || '')).toLowerCase();
  if (name.includes('forza horizon 6')) return true;
  if (name.includes('black ops ii') || name.includes('black ops 2')) return true;
  if (
    (name.includes('black ops') || name.includes('black ops 1')) &&
    !name.includes('black ops iii') &&
    !name.includes('black ops 3') &&
    !name.includes('black ops 4') &&
    !name.includes('black ops cold war') &&
    !name.includes('black ops 6')
  ) {
    return true;
  }
  const norm = name.replace(/[^a-z0-9]+/g, ' ');
  const match = norm.match(/\bfc\s*(\d{1,2})\b/);
  // FC 24/25 retirados y FC 27 (incluye Lite/Beta) fuera del catálogo de Steam
  return Boolean(match && (Number(match[1]) <= 25 || Number(match[1]) === 27));
};

// Comprueba si un producto pertenece ESTRICTAMENTE a la plataforma Steam
export const isSteamProduct = (p, steamCategoryId = null) => {
  if (!p) return false;
  if (p.id && String(p.id).startsWith("vip-")) return true;
  if (p.id && String(p.id).startsWith("ryuu_")) return true;

  const plat = (p.plataforma || "").toLowerCase();
  const catName = (p.categoryName || p.categoria || "").toLowerCase();
  const catId = (p.categoryId || "").toLowerCase();
  const tags = Array.isArray(p.tags) ? p.tags.map(t => String(t).toLowerCase()) : [];
  const name = (p.name || "").toLowerCase();

  const isExplicitSteam = Boolean(
    p.app_id ||
    p.appId ||
    p.steamAppId ||
    plat === "steam" ||
    catName.includes("steam") ||
    catId.includes("steam") ||
    tags.includes("steam") ||
    (steamCategoryId && p.categoryId === steamCategoryId)
  );

  // Si tiene datos o tags explícitos de Switch o PlayStation, descartar inmediatamente
  if (
    p.switchCompat ||
    name.includes("nintendo switch") ||
    name.includes("switch 2") ||
    catName.includes("switch") ||
    catId.includes("switch") ||
    tags.includes("switch") ||
    catName.includes("nintendo") ||
    catId.includes("nintendo") ||
    tags.includes("nintendo") ||
    catName.includes("ps4") ||
    catName.includes("ps5") ||
    catName.includes("playstation") ||
    catId.includes("ps4") ||
    catId.includes("ps5") ||
    tags.includes("ps4") ||
    tags.includes("ps5") ||
    tags.includes("playstation") ||
    (!isExplicitSteam && (p.pricePrimariaCLP || p.priceSecundariaCLP))
  ) {
    return false;
  }

  return isExplicitSteam;
};

const DENUVO_TITLE_KEYWORDS = [
  "fc 25", "ea sports fc", "fifa", "wukong", "black myth", "sparking",
  "dragon's dogma", "dragons dogma", "persona 3 reload", "silent hill 2",
  "dead space remake", "jedi: survivor", "jedi survivor", "hogwarts legacy",
  "lies of p", "infinite wealth", "metaphor: refantazio", "metaphor refantazio",
  "vengeance", "persona 5 royal", "mortal kombat 1", "street fighter 6",
  "sonic frontiers", "warhammer iii", "atomic heart", "sniper elite 5"
];

export const isVipGame = (p) => {
  if (!p) return false;
  if (typeof p === "string") {
    if (p.startsWith("vip-")) return true;
    return false;
  }
  if (p.id && String(p.id).startsWith("vip-")) return true;

  // Un juego VIP para esta promo DEBE ser de Steam
  if (!isSteamProduct(p)) return false;

  if (p.app_id && VIP_APP_IDS.has(String(p.app_id))) return true;

  const cleanN = (p.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  if (cleanN && VIP_CLEAN_NAMES.has(cleanN)) return true;

  const name = (p.name || "").toLowerCase();
  const tags = Array.isArray(p.tags) ? p.tags.map(t => String(t).toLowerCase()) : [];

  // Exclusivamente juegos marcados como activación en el panel o conocidos por requerir activación
  return (
    p.technical_category === "denuvo" ||
    Boolean(p.isDenuvoActivation) ||
    tags.includes("denuvo") ||
    tags.includes("vip") ||
    DENUVO_TITLE_KEYWORDS.some(kw => name.includes(kw))
  );
};

export const isTopTierVip = (p) => {
  if (!p) return false;
  if (p.isTopTier) return true;
  const price = getVipPrice(p) || Number(p.priceCLP || 0);
  return price >= 15000;
};

export const VIP_PRICES_BY_APP_ID = new Map(vipGamesData.map(v => [String(v.app_id), Number(v.priceCLP)]));
export const VIP_PRICES_BY_CLEAN_NAME = new Map(vipGamesData.map(v => [
  (v.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""),
  Number(v.priceCLP)
]));

export const getVipPrice = (p) => {
  if (!p) return null;
  const appId = p.app_id || (p.id && !isNaN(p.id) ? p.id : null);
  if (appId && VIP_PRICES_BY_APP_ID.has(String(appId))) {
    return VIP_PRICES_BY_APP_ID.get(String(appId));
  }
  const cleanN = (p.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  if (cleanN && VIP_PRICES_BY_CLEAN_NAME.has(cleanN)) {
    return VIP_PRICES_BY_CLEAN_NAME.get(cleanN);
  }
  return null;
};

export const getSteamGameSurcharge = (p) => {
  if (!p) return 0;
  const vipPrice = getVipPrice(p);
  // La lista VIP es la fuente real de los códigos Steam de costo extra.
  if (vipPrice) return vipPrice;
  const tags = Array.isArray(p.tags) ? p.tags.map(tag => String(tag).toLowerCase()) : [];
  const source = [p.technical_category, p.deliveryType, p.delivery_type, p.provider, p.source, ...tags]
    .filter(Boolean).join(' ').toLowerCase();
  // Un recargo sólo existe si el catálogo lo marca explícitamente como código
  // externo. El precio público de un juego normal nunca es un recargo de pack.
  const requiresExternalCode = Boolean(
    p.requiresExternalCode || p.requiresCode || p.isCodeProduct ||
    source.includes('nuuvem') || source.includes('ubisoft') ||
    source.includes('ea games') || source.includes('electronic arts') ||
    source.includes('codigo') || source.includes('code')
  );
  if (!requiresExternalCode) return 0;
  return Number(p.surchargeCLP || p.extraChargeCLP || p.priceCLP || 0);
};

/**
 * Precio REAL de un juego de Steam: regla única para toda la web (tarjetas, ficha, carrito y checkout).
 * La lista VIP (vipGamesData.json) manda: VIP $8.000, Ubisoft $12.000, EA $15.000, etc.
 * Si el juego no está en la lista VIP se usa su precio de catálogo; si no tiene, $2.000.
 */
export const STEAM_DEFAULT_PRICE_CLP = 2000;

/**
 * Promoción Steam: 20% de descuento para el público SOLO en promociones, packs y sagas (los juegos sueltos van a precio normal).
 * El precio final siempre termina en "90" y nunca supera el 80% del precio de lista:
 *   $2.000 → $1.590 · $4.990 → $3.990 · $8.000 → $6.390 · $9.990 → $7.990 · $12.000 → $9.590
 *   $15.000 → $11.990 · $17.990 → $14.390
 * Los revendedores NO reciben este descuento: su precio se sigue calculando sobre el precio de lista.
 * Para terminar la promoción basta con poner STEAM_PROMO_DISCOUNT = 0.
 */
// Promoción terminada: todo a precio normal. Para reactivarla: STEAM_PROMO_DISCOUNT = 0.2 y STEAM_PROMO_LABEL = "-20%".
export const STEAM_PROMO_DISCOUNT = 0;
export const STEAM_PROMO_LABEL = "";
export const STEAM_PROMO_ACTIVE = STEAM_PROMO_DISCOUNT > 0;
export const steamPromoPrice = (listPrice) => {
  const list = Number(listPrice);
  if (!Number.isFinite(list) || list <= 0 || !STEAM_PROMO_DISCOUNT) return list;
  const target = list * (1 - STEAM_PROMO_DISCOUNT);
  let price = Math.floor(target / 100) * 100 + 90;
  if (price > target) price -= 100;
  return price > 0 ? price : list;
};

/** Precio de LISTA de un juego de Steam (sin promoción). La lista VIP manda: VIP $8.000, Ubisoft $12.000, EA $15.000… */
export const getSteamListPrice = (p) => {
  const vip = getVipPrice(p);
  if (vip) return Number(vip);
  const stored = Number(p?.steamListPriceCLP);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const base = Number(p?.priceCLP);
  return Number.isFinite(base) && base > 0 ? base : STEAM_DEFAULT_PRICE_CLP;
};

/**
 * Precio de un juego de Steam INDIVIDUAL: siempre el precio normal (de lista), sin descuento.
 * El -20% (steamPromoPrice) aplica SOLO a promociones, packs y sagas.
 */
export const steamIndividualPrice = (listPrice) => {
  const list = Number(listPrice);
  return Number.isFinite(list) && list > 0 ? list : STEAM_DEFAULT_PRICE_CLP;
};

/**
 * Precio REAL que paga el público por un juego de Steam individual: precio normal de lista.
 * Regla única para tarjetas, ficha, carrito y checkout.
 */
export const getSteamRealPrice = (p) => steamIndividualPrice(getSteamListPrice(p));

/** Devuelve el producto de Steam con el precio de promoción y el de lista guardado aparte (para tachado y revendedores). */
export const withSteamPromo = (p) => {
  if (!p) return p;
  const list = getSteamListPrice(p);
  return { ...p, priceCLP: steamIndividualPrice(list), steamListPriceCLP: list };
};
