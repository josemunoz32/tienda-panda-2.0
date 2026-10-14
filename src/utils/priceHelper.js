/**
 * priceHelper.js - Motor Centralizado de Precios PandaStore 2.0
 * 
 * Reglas de Negocio Oficiales:
 * 1. Protección de Margen: PandaStore SIEMPRE debe ganar al menos $5.000 CLP de ganancia neta por juego.
 *    El precio para revendedores nunca puede generar pérdidas respecto al costo del pack/proveedor.
 * 2. Niveles de Fidelidad de Revendedor por volumen de compras:
 *    - 0 a 4 compras: Nivel Bronce Base
 *    - 5 a 9 compras: Nivel Plata (5% descuento adicional)
 *    - 10 a 19 compras: Nivel Oro (10% descuento adicional)
 *    - 20+ compras: Nivel Platino (15% descuento adicional MÁXIMO)
 * 3. Descuentos Base por Categoría:
 *    - Steam: 50% (Mitad de precio)
 *    - Streaming: -$1.000 CLP
 *    - Nintendo Switch / PS4 / PS5 / Suscripciones: -$5.000 CLP (respetando margen mínimo)
 */

import { hasResellerBenefits } from "./userRoles.js";
import { db } from "../firebase.js";
import { doc, onSnapshot } from "firebase/firestore";

export const PANDASTORE_MIN_PROFIT_CLP = 5000;

export const DEFAULT_RESELLER_DISCOUNTS = {
  globalEnabled: true,
  minProfitCLP: 5000,
  categories: {
    steam: { enabled: true, type: "percent", value: 50, minProfitCLP: 1000, label: "Steam (PC)", icon: "🎮", defaultHint: "Mitad de precio habitual" },
    playstation: { enabled: true, type: "fixed_clp", value: 5000, minProfitCLP: 5000, label: "PlayStation (PS4 / PS5)", icon: "🎮", defaultHint: "Descuento en Primaria y Secundaria" },
    switch: { enabled: true, type: "fixed_clp", value: 5000, minProfitCLP: 5000, label: "Nintendo Switch", icon: "🎒", defaultHint: "Descuento en títulos Switch" },
    streaming: { enabled: true, type: "fixed_clp", value: 1000, minProfitCLP: 1000, label: "Cuentas Streaming", icon: "🎬", defaultHint: "Descuento por mes/cuenta" },
    suscripciones: { enabled: true, type: "fixed_clp", value: 5000, minProfitCLP: 5000, label: "Suscripciones (Plus / Game Pass)", icon: "🛡️", defaultHint: "Descuento en membresías" },
    otros: { enabled: true, type: "fixed_clp", value: 5000, minProfitCLP: 3000, label: "Otras Categorías", icon: "🏷️", defaultHint: "Descuento general para otros productos" },
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
}

export function parseNumberCLP(value) {
    if (typeof value === "number") return Math.round(value);
    if (!value) return 0;
    const clean = String(value).replace(/[^0-9]/g, "");
    return parseInt(clean, 10) || 0;
}

export function formatCLP(amount) {
    const num = Math.round(Number(amount) || 0);
    return "$" + num.toLocaleString("es-CL");
}

/**
 * Calcula el nivel y porcentaje de descuento por fidelidad según el número de compras
 */
export function getResellerTier(purchaseCount = 0) {
    const count = Number(purchaseCount) || 0;
    if (count >= 20) {
        return {
            tier: "Platino",
            label: "💎 Platino (20+ compras)",
            discountPercent: 15,
            badge: "🏆 Platino -15%"
        };
    }
    if (count >= 10) {
        return {
            tier: "Oro",
            label: "🥇 Oro (10+ compras)",
            discountPercent: 10,
            badge: "⭐ Oro -10%"
        };
    }
    if (count >= 5) {
        return {
            tier: "Plata",
            label: "🥈 Plata (5+ compras)",
            discountPercent: 5,
            badge: "✨ Plata -5%"
        };
    }
    return {
        tier: "Bronce",
        label: "🥉 Bronce (Iniciado)",
        discountPercent: 0,
        badge: "💎 Revendedor"
    };
}

/**
 * Calcula el precio para revendedor protegiendo el margen mínimo de $5.000 CLP de ganancia
 */
export function calcularPrecioRevendedor(
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

    // REGLA DE SEGURIDAD FINANCIERA:
    // PandaStore gana mínimo el margen protegido configurado sobre el costo real.
    // Se utiliza el margen específico de la categoría (ej: Switch $5.000, Streaming $1.000, etc.)
    // o el margen global si no hay uno específico definido.
    const categoryMinProfit = rule && Number(rule.minProfitCLP) > 0
      ? Number(rule.minProfitCLP)
      : (Number(config.minProfitCLP) > 0 ? Number(config.minProfitCLP) : PANDASTORE_MIN_PROFIT_CLP);

    const protegerMargenSwitch = plat.includes("switch") || cat.includes("switch") || cat.includes("nintendo") || tagsStr.includes("switch");
    
    // Si es Nintendo Switch, el costo de reposición nunca es menor a $5.000 CLP ($5 USD estándar de pack)
    const costo = Number(costoEstimadoCLP) > 0 ? Number(costoEstimadoCLP) : (protegerMargenSwitch ? 5000 : 0);
    if (costo > 0 || protegerMargenSwitch) {
        const precioPisoConGanancia = costo + categoryMinProfit;
        if (precioCalculado < precioPisoConGanancia) {
            precioCalculado = precioPisoConGanancia;
        }
    }

    // El precio de revendedor nunca debe superar el precio base ni caer por debajo de $500
    return Math.max(500, Math.min(base, precioCalculado));
}

/**
 * Obtiene el precio final y desglose de ahorro para cualquier producto
 */
export function getProductPricing(product, userRole, purchaseCount = 0) {
    if (!product) {
        return {
            precioOriginal: 0,
            precioFinal: 0,
            ahorro: 0,
            esRevendedor: false,
            badge: null,
            tierInfo: null
        };
    }

    const selectedVariant = String(product.variante || product.variant || "").trim().toLowerCase();
    let precioOriginal = 0;

    if (selectedVariant === "primaria" && (product.pricePrimariaCLP || product.price_primaria_clp)) {
        precioOriginal = parseNumberCLP(product.pricePrimariaCLP || product.price_primaria_clp);
    } else if (selectedVariant === "secundaria" && (product.priceSecundariaCLP || product.price_secundaria_clp)) {
        precioOriginal = parseNumberCLP(product.priceSecundariaCLP || product.price_secundaria_clp);
    } else if (product.selectedPriceCLP) {
        precioOriginal = parseNumberCLP(product.selectedPriceCLP);
    } else if (product.meses && Array.isArray(product.preciosPorMes)) {
        const plan = product.preciosPorMes.find(p => Number(p?.meses) === Number(product.meses));
        if (plan?.clp) precioOriginal = parseNumberCLP(plan.clp);
    }

    if (!precioOriginal) {
        const preciosPorPeriodo = Array.isArray(product.preciosPorMes)
            ? product.preciosPorMes.map((periodo) => periodo?.clp)
            : [];
        const candidatosPrecio = [
            product.priceCLP,
            product.precio_clp,
            product.price,
            product.pricePrimariaCLP,
            product.priceSecundariaCLP,
            ...preciosPorPeriodo
        ].map(parseNumberCLP).filter((precio) => precio > 0);
        precioOriginal = candidatosPrecio.length ? Math.min(...candidatosPrecio) : 0;
    }

    const esRevendedor = typeof userRole === "object"
        ? hasResellerBenefits(userRole)
        : ["revendedor", "reseller", "reseller_active", "mayorista"].includes(String(userRole || "").trim().toLowerCase());

    // Los precios B2B usan una única tarifa mayorista. Los niveles Gamer y
    // descuentos de fidelidad pertenecen exclusivamente a clientes normales.
    const tierInfo = {
        tier: "Revendedor",
        label: "Precio mayorista",
        discountPercent: 0,
        badge: "💎 Precio Revendedor"
    };

    if (!esRevendedor || precioOriginal <= 0) {
        return {
            precioOriginal,
            precioFinal: precioOriginal,
            ahorro: 0,
            esRevendedor: false,
            badge: null,
            tierInfo: null
        };
    }

    const costoEstimado = selectedVariant === "primaria"
        ? (product.costoPrimariaCLP || product.costo_primaria_clp || product.costo_clp || 0)
        : selectedVariant === "secundaria"
            ? (product.costoSecundariaCLP || product.costo_secundaria_clp || product.costo_clp || 0)
            : (product.costo_clp || (product.precio_usd ? product.precio_usd * 1000 : 0));

    const categorySignature = `${product.categoria || product.categoryName || ""} ${product.plataforma || product.platform || ""}`.toLowerCase();
    const hasPlayStationVariants = Boolean(product.pricePrimariaCLP || product.priceSecundariaCLP || product.pricePrimariaUSD || product.priceSecundariaUSD);
    const hasMonthlyPlans = Array.isArray(product.preciosPorMes) && product.preciosPorMes.length > 0;
    const inferredCategory = categorySignature ||
        (hasPlayStationVariants ? "playstation" : hasMonthlyPlans ? "suscripciones" : "");

    // Prioridad 1: Si el producto ya tiene un precio explícito para revendedores en Firestore (priceRevendedorCLP)
    const precioRevendedorFijado = parseNumberCLP(product.priceRevendedorCLP || product.price_revendedor_clp);
    let precioRevendedor = 0;

    const isSwitch = categorySignature.includes("switch") || (product.plataforma || "").toLowerCase().includes("switch");
    const costoBasePiso = (costoEstimado > 0 ? costoEstimado : (isSwitch ? 5000 : 0)) + PANDASTORE_MIN_PROFIT_CLP;

    if (precioRevendedorFijado > 0) {
        // Respetar piso de costo + ganancia de $5.000 CLP
        precioRevendedor = Math.max(costoBasePiso, Math.min(precioOriginal, precioRevendedorFijado));
    } else {
        precioRevendedor = calcularPrecioRevendedor(
            precioOriginal,
            inferredCategory,
            product.plataforma || "",
            product.tags || [],
            costoEstimado,
            purchaseCount,
            selectedVariant
        );
    }

    const ahorro = Math.max(0, precioOriginal - precioRevendedor);

    return {
        precioOriginal,
        precioFinal: precioRevendedor,
        ahorro,
        esRevendedor: true,
        badge: "💎 Precio Revendedor",
        tierInfo
    };
}
