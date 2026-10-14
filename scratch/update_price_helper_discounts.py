with open('src/utils/priceHelper.js', 'r', encoding='utf-8') as f:
    content = f.read().replace('\r\n', '\n')

old_header = """import { hasResellerBenefits } from "./userRoles.js";

export const PANDASTORE_MIN_PROFIT_CLP = 5000;"""

new_header = """import { hasResellerBenefits } from "./userRoles.js";
import { db } from "../firebase.js";
import { doc, onSnapshot } from "firebase/firestore";

export const PANDASTORE_MIN_PROFIT_CLP = 5000;

export const DEFAULT_RESELLER_DISCOUNTS = {
  globalEnabled: true,
  minProfitCLP: 5000,
  categories: {
    steam: { enabled: true, type: "percent", value: 50, label: "Steam (PC)", icon: "🎮", defaultHint: "Mitad de precio habitual" },
    playstation: { enabled: true, type: "fixed_clp", value: 5000, label: "PlayStation (PS4 / PS5)", icon: "🎮", defaultHint: "Descuento en Primaria y Secundaria" },
    switch: { enabled: true, type: "fixed_clp", value: 5000, label: "Nintendo Switch", icon: "🎒", defaultHint: "Descuento en títulos Switch" },
    streaming: { enabled: true, type: "fixed_clp", value: 1000, label: "Cuentas Streaming", icon: "🎬", defaultHint: "Descuento por mes/cuenta" },
    suscripciones: { enabled: true, type: "fixed_clp", value: 5000, label: "Suscripciones (Plus / Game Pass)", icon: "🛡️", defaultHint: "Descuento en membresías" },
    otros: { enabled: true, type: "fixed_clp", value: 5000, label: "Otras Categorías", icon: "🏷️", defaultHint: "Descuento general para otros productos" },
  }
};

let cachedDiscounts = null;

// Sincronizar en tiempo real desde Firestore con fallback local
if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem("pandaResellerDiscounts");
    if (raw) cachedDiscounts = JSON.parse(raw);
  } catch (e) {}

  try {
    onSnapshot(doc(db, "config", "reseller_discounts"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.categories) {
          cachedDiscounts = {
            ...DEFAULT_RESELLER_DISCOUNTS,
            ...data,
            categories: { ...DEFAULT_RESELLER_DISCOUNTS.categories, ...data.categories }
          };
          try {
            localStorage.setItem("pandaResellerDiscounts", JSON.stringify(cachedDiscounts));
            window.dispatchEvent(new CustomEvent("resellerDiscountsUpdated", { detail: cachedDiscounts }));
          } catch (e) {}
        }
      }
    }, (err) => {
      console.warn("Firestore config/reseller_discounts listener fallback:", err.message);
    });
  } catch (e) {}
}

export function getResellerDiscountsConfig() {
  if (cachedDiscounts) return cachedDiscounts;
  try {
    const raw = localStorage.getItem("pandaResellerDiscounts");
    if (raw) {
      cachedDiscounts = JSON.parse(raw);
      return cachedDiscounts;
    }
  } catch (e) {}
  return DEFAULT_RESELLER_DISCOUNTS;
}

export function setResellerDiscountsConfig(newConfig) {
  cachedDiscounts = newConfig;
  try {
    localStorage.setItem("pandaResellerDiscounts", JSON.stringify(newConfig));
    window.dispatchEvent(new CustomEvent("resellerDiscountsUpdated", { detail: newConfig }));
  } catch (e) {}
}"""

if old_header in content:
    content = content.replace(old_header, new_header, 1)

old_calc = """export function calcularPrecioRevendedor(
    precioOriginal,
    categoria = "",
    plataforma = "",
    tags = [],
    costoEstimadoCLP = 0,
    purchaseCount = 0,
    selectedVariant = ""
) {
    const base = parseNumberCLP(precioOriginal);
    if (base <= 0) return 0;

    const cat = (categoria || "").toLowerCase();
    const plat = (plataforma || "").toLowerCase();
    const tagsStr = (Array.isArray(tags) ? tags.join(" ") : String(tags)).toLowerCase();

    let precioCalculado = base;

    // 1. Steam: 50% Mitad de precio
    if (plat.includes("steam") || cat.includes("steam") || tagsStr.includes("steam")) {
        precioCalculado = Math.max(500, Math.round(base / 2));
    }
    // 2. Streaming: Descuento de $1.000 CLP
    else if (cat.includes("streaming") || plat.includes("streaming") || tagsStr.includes("streaming") || cat.includes("pantalla") || cat.includes("cuenta completa")) {
        precioCalculado = Math.max(1000, base - 1000);
    }
    // 3. Nintendo Switch / Switch 2: Descuento base de $5.000 CLP
    else if (plat.includes("switch") || cat.includes("switch") || cat.includes("nintendo") || tagsStr.includes("switch")) {
        precioCalculado = Math.max(1000, base - 5000);
    }
    // 4. PlayStation (PS4 / PS5): Descuento de $5.000 CLP (aplica tanto a primaria como a secundaria)
    else if (plat.includes("ps4") || plat.includes("ps5") || plat.includes("playstation") || cat.includes("playstation") || cat.includes("ps4") || cat.includes("ps5")) {
        precioCalculado = Math.max(1000, base - 5000);
    }
    // 5. Suscripciones: Descuento de $5.000 CLP
    else if (cat.includes("suscrip") || cat.includes("membres") || tagsStr.includes("suscrip") || tagsStr.includes("plus") || tagsStr.includes("game pass")) {
        precioCalculado = Math.max(1000, base - 5000);
    }
    // Por defecto en otras categorías con precio relevante (>= $10.000): descuento de $5.000
    else if (base >= 10000) {
        precioCalculado = Math.max(1000, base - 5000);
    }

    // Aplicar descuento por nivel de fidelidad (5%, 10%, hasta 15% Platino máx)
    const { discountPercent } = getResellerTier(purchaseCount);
    if (discountPercent > 0) {
        const extraDiscount = Math.round((precioCalculado * discountPercent) / 100);
        precioCalculado = precioCalculado - extraDiscount;
    }

    // REGLA DE SEGURIDAD FINANCIERA:
    // PandaStore gana mínimo $5.000 CLP por juego sobre el costo del proveedor/pack en Switch
    const costo = Number(costoEstimadoCLP) || 0;
    const protegerMargen = plat.includes("switch") || cat.includes("switch") || cat.includes("nintendo") || tagsStr.includes("switch");
    if (protegerMargen && costo > 0) {
        const precioPisoConGanancia = costo + PANDASTORE_MIN_PROFIT_CLP;
        if (precioCalculado < precioPisoConGanancia) {
            precioCalculado = precioPisoConGanancia;
        }
    }

    // El precio de revendedor nunca debe superar el precio base ni caer por debajo de $500
    return Math.max(500, Math.min(base, precioCalculado));
}"""

new_calc = """export function calcularPrecioRevendedor(
    precioOriginal,
    categoria = "",
    plataforma = "",
    tags = [],
    costoEstimadoCLP = 0,
    purchaseCount = 0,
    selectedVariant = ""
) {
    const base = parseNumberCLP(precioOriginal);
    if (base <= 0) return 0;

    const config = getResellerDiscountsConfig();
    // Si el administrador apagó completamente los descuentos de revendedor a nivel global
    if (config.globalEnabled === false) {
        return base;
    }

    const cat = (categoria || "").toLowerCase();
    const plat = (plataforma || "").toLowerCase();
    const tagsStr = (Array.isArray(tags) ? tags.join(" ") : String(tags)).toLowerCase();

    // Determinar qué regla de categoría aplica
    let rule = config.categories?.otros || DEFAULT_RESELLER_DISCOUNTS.categories.otros;

    if (plat.includes("steam") || cat.includes("steam") || tagsStr.includes("steam")) {
        rule = config.categories?.steam || DEFAULT_RESELLER_DISCOUNTS.categories.steam;
    } else if (cat.includes("streaming") || plat.includes("streaming") || tagsStr.includes("streaming") || cat.includes("pantalla") || cat.includes("cuenta completa")) {
        rule = config.categories?.streaming || DEFAULT_RESELLER_DISCOUNTS.categories.streaming;
    } else if (plat.includes("switch") || cat.includes("switch") || cat.includes("nintendo") || tagsStr.includes("switch")) {
        rule = config.categories?.switch || DEFAULT_RESELLER_DISCOUNTS.categories.switch;
    } else if (plat.includes("ps4") || plat.includes("ps5") || plat.includes("playstation") || cat.includes("playstation") || cat.includes("ps4") || cat.includes("ps5")) {
        rule = config.categories?.playstation || DEFAULT_RESELLER_DISCOUNTS.categories.playstation;
    } else if (cat.includes("suscrip") || cat.includes("membres") || tagsStr.includes("suscrip") || tagsStr.includes("plus") || tagsStr.includes("game pass")) {
        rule = config.categories?.suscripciones || DEFAULT_RESELLER_DISCOUNTS.categories.suscripciones;
    }

    let precioCalculado = base;

    // Si la categoría tiene descuento habilitado y valor mayor a 0
    if (rule && rule.enabled !== false && Number(rule.value) > 0) {
        if (rule.type === "percent") {
            const pct = Math.min(100, Math.max(0, Number(rule.value) || 0));
            const descuentoMonto = Math.round((base * pct) / 100);
            precioCalculado = Math.max(500, base - descuentoMonto);
        } else {
            const montoFijo = Math.max(0, Number(rule.value) || 0);
            precioCalculado = Math.max(500, base - montoFijo);
        }
    }

    // Aplicar descuento por nivel de fidelidad (5%, 10%, hasta 15% Platino máx)
    const { discountPercent } = getResellerTier(purchaseCount);
    if (discountPercent > 0 && precioCalculado < base) {
        const extraDiscount = Math.round((precioCalculado * discountPercent) / 100);
        precioCalculado = precioCalculado - extraDiscount;
    }

    // REGLA DE SEGURIDAD FINANCIERA:
    // PandaStore gana mínimo el margen protegido configurado sobre el costo en Switch/Packs
    const minProfit = Number(config.minProfitCLP) > 0 ? Number(config.minProfitCLP) : PANDASTORE_MIN_PROFIT_CLP;
    const costo = Number(costoEstimadoCLP) || 0;
    const protegerMargen = plat.includes("switch") || cat.includes("switch") || cat.includes("nintendo") || tagsStr.includes("switch");
    if (protegerMargen && costo > 0) {
        const precioPisoConGanancia = costo + minProfit;
        if (precioCalculado < precioPisoConGanancia) {
            precioCalculado = precioPisoConGanancia;
        }
    }

    // El precio de revendedor nunca debe superar el precio base ni caer por debajo de $500
    return Math.max(500, Math.min(base, precioCalculado));
}"""

if old_calc in content:
    content = content.replace(old_calc, new_calc, 1)

with open('src/utils/priceHelper.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("priceHelper.js updated with dynamic reseller discount config!")
