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
  const match = name.match(/(?:ea\s*sports\s*)?fc\s*(\d{1,2})/);
  return Boolean(match && Number(match[1]) <= 25);
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
