// cartHelpers.js
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { trackAddToCart } from "./analytics";
import { markCartActive } from "./abandonedCart";
import { parseNumberCLP, getProductPricing } from "./priceHelper";
import { hasResellerBenefits } from "./userRoles";

/**
 * Obtiene el ID único de línea de carrito para permitir tener variantes
 * (Primaria y Secundaria) del mismo producto como ítems independientes.
 */
export function getCartLineId(productId, details = {}) {
  const variant = String(details?.variante || details?.variant || "").toLowerCase();
  if (variant === "primaria" || variant === "secundaria") return `${productId}__${variant}`;
  const months = Number(details?.meses || 0);
  if (months > 0) return `${productId}__${months}m`;
  return productId;
}

export function getCartVariantLabel(item) {
  if (!item) return "";
  const explicit = String(item.variante || item.variant || "").trim();
  if (explicit) return explicit.charAt(0).toUpperCase() + explicit.slice(1).toLowerCase();
  const lineId = String(item.cartLineId || item.id || "").toLowerCase();
  if (lineId.includes("__primaria") || lineId.endsWith("_primaria")) return "Primaria";
  if (lineId.includes("__secundaria") || lineId.endsWith("_secundaria")) return "Secundaria";
  return "";
}

/**
 * Agrega o quita un producto del carrito del usuario en Firestore o localStorage.
 */
export async function handleCartAddOrRemove({
  db,
  user,
  prod,
  moneda = "CLP",
  cartIds = [],
  setModal,
  consoleName,
  userRole,
  purchaseCount = 0
}) {
  if (!prod) return;

  const rawPlataforma = (prod.plataforma || prod.platform || "").toLowerCase();
  const catName = (prod.categoria || prod.categoryName || "").toLowerCase();
  const rawCatId = String(prod.categoryId || "").toLowerCase();
  const isSwitch = rawPlataforma.includes("switch") || rawPlataforma.includes("nintendo") ||
    catName.includes("switch") || catName.includes("nintendo") ||
    rawCatId === "vtqapwp0xxdc1qdz6hvq" || rawCatId === "y7j7vsxmugwxfnmkouwx" || rawCatId === "switch";

  const isPlayStation = !isSwitch && (
    rawPlataforma.includes("ps4") || rawPlataforma.includes("ps5") || rawPlataforma.includes("playstation") ||
    rawPlataforma.includes("play 4") || rawPlataforma.includes("play 5") ||
    catName.includes("ps4") || catName.includes("ps5") || catName.includes("playstation") ||
    catName.includes("play 4") || catName.includes("play 5") ||
    rawCatId.includes("ps") ||
    Boolean(prod.pricePrimariaCLP || prod.priceSecundariaCLP || prod.pricePrimariaUSD || prod.priceSecundariaUSD)
  );

  const isSteam = !isPlayStation && (
    rawPlataforma.includes("steam") || 
    catName.includes("steam") || 
    Boolean(prod.app_id) || 
    Boolean(prod.isSteam) || 
    String(prod.id || '').startsWith("ryuu_") || 
    String(prod.id || '').startsWith("vip-")
  );

  const isReseller = hasResellerBenefits(userRole) || Boolean(prod.isResellerPrice);

  const hasExplicitVariant = Boolean(prod.variante || prod.meses);

  let opciones = [];
  let tipo = null;

  // Si no viene con variante pre-seleccionada, evaluamos si necesita modal
  if (!hasExplicitVariant) {
    if (!isSteam && (prod.pricePrimariaCLP || prod.priceSecundariaCLP)) {
      tipo = 'ps';
      if (prod.pricePrimariaCLP) {
        const pubCLP = parseNumberCLP(prod.pricePrimariaCLP);
        let finalCLP = pubCLP;
        if (isReseller && pubCLP > 0) {
          const pr = getProductPricing({
            ...prod,
            variante: 'primaria',
            selectedPriceCLP: pubCLP,
            priceCLP: pubCLP,
            categoryName: consoleName || prod.categoryName || prod.categoria || "playstation"
          }, "revendedor", purchaseCount);
          finalCLP = pr.precioFinal;
        }
        opciones.push({
          label: 'Primaria',
          value: 'Primaria',
          priceCLP: finalCLP,
          precioPublicoCLP: pubCLP,
          priceUSD: prod.pricePrimariaUSD,
          isResellerPrice: isReseller
        });
      }
      if (prod.priceSecundariaCLP) {
        const pubCLP = parseNumberCLP(prod.priceSecundariaCLP);
        let finalCLP = pubCLP;
        if (isReseller && pubCLP > 0) {
          const pr = getProductPricing({
            ...prod,
            variante: 'secundaria',
            selectedPriceCLP: pubCLP,
            priceCLP: pubCLP,
            categoryName: consoleName || prod.categoryName || prod.categoria || "playstation"
          }, "revendedor", purchaseCount);
          finalCLP = pr.precioFinal;
        }
        opciones.push({
          label: 'Secundaria',
          value: 'Secundaria',
          priceCLP: finalCLP,
          precioPublicoCLP: pubCLP,
          priceUSD: prod.priceSecundariaUSD,
          isResellerPrice: isReseller
        });
      }
    } else if (Array.isArray(prod.preciosPorMes) && prod.preciosPorMes.length > 0) {
      tipo = 'suscripcion';
      opciones = prod.preciosPorMes.filter(p => p.clp).map(p => {
        const pubCLP = parseNumberCLP(p.clp);
        let finalCLP = pubCLP;
        if (isReseller && pubCLP > 0) {
          const pr = getProductPricing({
            ...prod,
            meses: p.meses,
            selectedPriceCLP: pubCLP,
            priceCLP: pubCLP,
            categoryName: consoleName || prod.categoryName || prod.categoria || "suscripciones"
          }, "revendedor", purchaseCount);
          finalCLP = pr.precioFinal;
        }
        return {
          label: `${p.meses} mes(es)`,
          value: p.meses,
          priceCLP: finalCLP,
          precioPublicoCLP: pubCLP,
          priceUSD: p.usd,
          isResellerPrice: isReseller
        };
      });
    }

    if (opciones.length > 1 && setModal) {
      setModal({ open: true, prod, opciones, tipo });
      return;
    }
  }

  // Resolver detalles de la variante elegida
  let extra = {};
  if (prod.variante) {
    const vStr = String(prod.variante).toLowerCase() === 'secundaria' ? 'Secundaria' : 'Primaria';
    extra.variante = vStr;
    const variantSpecificCLP = vStr === 'Secundaria'
      ? (prod.priceSecundariaCLP || prod.price_secundaria_clp)
      : (prod.pricePrimariaCLP || prod.price_primaria_clp);
    const pubCLP = parseNumberCLP(
      variantSpecificCLP ||
      prod.precioPublicoCLP ||
      prod.priceCLP
    );
    extra.precioPublicoCLP = pubCLP;
    if (prod.pricePrimariaCLP) extra.pricePrimariaCLP = prod.pricePrimariaCLP;
    if (prod.priceSecundariaCLP) extra.priceSecundariaCLP = prod.priceSecundariaCLP;
    if (isReseller && pubCLP > 0) {
      const pr = getProductPricing({
        ...prod,
        variante: vStr.toLowerCase(),
        selectedPriceCLP: pubCLP,
        priceCLP: pubCLP,
        categoryName: consoleName || prod.categoryName || prod.categoria || "playstation"
      }, "revendedor", purchaseCount);
      extra.priceCLP = pr.precioFinal;
      extra.isResellerPrice = true;
    } else {
      extra.priceCLP = pubCLP;
      if (prod.isResellerPrice) extra.isResellerPrice = true;
    }
    if (prod.priceUSD) extra.priceUSD = prod.priceUSD;
  } else if (prod.meses) {
    extra.meses = prod.meses;
    const pubCLP = parseNumberCLP(prod.precioPublicoCLP || prod.priceCLP);
    extra.precioPublicoCLP = pubCLP;
    if (isReseller && pubCLP > 0) {
      const pr = getProductPricing({
        ...prod,
        meses: prod.meses,
        selectedPriceCLP: pubCLP,
        priceCLP: pubCLP,
        categoryName: consoleName || prod.categoryName || prod.categoria || "suscripciones"
      }, "revendedor", purchaseCount);
      extra.priceCLP = pr.precioFinal;
      extra.isResellerPrice = true;
    } else {
      extra.priceCLP = pubCLP;
      if (prod.isResellerPrice) extra.isResellerPrice = true;
    }
    if (prod.priceUSD) extra.priceUSD = prod.priceUSD;
  } else if (tipo === 'ps' && opciones.length === 1) {
    extra = {
      variante: opciones[0].value,
      priceCLP: opciones[0].priceCLP,
      precioPublicoCLP: opciones[0].precioPublicoCLP,
      ...(prod.pricePrimariaCLP ? { pricePrimariaCLP: prod.pricePrimariaCLP } : {}),
      ...(prod.priceSecundariaCLP ? { priceSecundariaCLP: prod.priceSecundariaCLP } : {}),
      ...(opciones[0].priceUSD ? { priceUSD: opciones[0].priceUSD } : {}),
      ...(opciones[0].isResellerPrice ? { isResellerPrice: true } : {})
    };
  } else if (tipo === 'suscripcion' && opciones.length === 1) {
    extra = {
      meses: opciones[0].value,
      priceCLP: opciones[0].priceCLP,
      precioPublicoCLP: opciones[0].precioPublicoCLP,
      ...(opciones[0].priceUSD ? { priceUSD: opciones[0].priceUSD } : {}),
      ...(opciones[0].isResellerPrice ? { isResellerPrice: true } : {})
    };
  } else if (isSteam) {
    const baseSteam = parseNumberCLP(prod.priceCLP || prod.pricePrimariaCLP || 2000);
    extra.priceCLP = isReseller ? Math.max(500, Math.round(baseSteam * 0.5)) : baseSteam;
    extra.precioPublicoCLP = baseSteam;
    if (isReseller) {
      extra.isResellerPrice = true;
    }
    if (prod.priceUSD || prod.pricePrimariaUSD) {
      extra.priceUSD = prod.priceUSD || prod.pricePrimariaUSD;
    }
  } else {
    const baseCLP = parseNumberCLP(prod.priceCLP);
    extra.precioPublicoCLP = baseCLP;
    if (isReseller && baseCLP > 0) {
      const pr = getProductPricing({
        ...prod,
        selectedPriceCLP: baseCLP,
        priceCLP: baseCLP,
        categoryName: consoleName || prod.categoryName || prod.categoria || ""
      }, "revendedor", purchaseCount);
      extra.priceCLP = pr.precioFinal;
      extra.isResellerPrice = true;
    } else {
      if (baseCLP > 0) extra.priceCLP = baseCLP;
    }
    if (prod.priceUSD) extra.priceUSD = prod.priceUSD;
  }

  const baseCleanId = String(prod.productId || prod.id || '').split('__')[0];
  const cartLineId = prod.cartLineId || getCartLineId(baseCleanId, extra);

  const cartItem = {
    id: cartLineId,
    cartLineId,
    productId: baseCleanId,
    name: prod.name,
    imageUrl: prod.imageUrl || null,
    cantidad: 1,
    ...(consoleName ? { consoleName } : {}),
    ...(prod.categoryName ? { categoryName: prod.categoryName } : {}),
    ...(prod.pricePrimariaCLP ? { pricePrimariaCLP: prod.pricePrimariaCLP } : {}),
    ...(prod.priceSecundariaCLP ? { priceSecundariaCLP: prod.priceSecundariaCLP } : {}),
    ...extra
  };

  const isInCart = cartIds.includes(cartLineId) || (!hasExplicitVariant && cartIds.includes(baseCleanId));

  if (!user) {
    // Carrito de Invitados (localStorage)
    let localCart = [];
    try {
      const stored = localStorage.getItem('guestCart');
      if (stored) localCart = JSON.parse(stored);
    } catch(e) {}
    
    if (isInCart) {
      localCart = localCart.filter(item => (item.cartLineId || item.id) !== cartLineId && item.productId !== cartLineId && (!hasExplicitVariant ? item.productId !== prod.id : true));
    } else {
      const existingIdx = localCart.findIndex(item => (item.cartLineId || item.id) === cartLineId);
      if (existingIdx >= 0) localCart[existingIdx] = cartItem;
      else localCart.push(cartItem);
      trackAddToCart({ ...prod, priceCLP: cartItem.priceCLP || prod.priceCLP }, null);
    }
    localStorage.setItem('guestCart', JSON.stringify(localCart));
    window.dispatchEvent(new Event('localCartUpdated'));
    const tCLP = localCart.reduce((s, it) => s + (Number(it.priceCLP) || 0), 0);
    markCartActive(null, localCart, tCLP);
    return;
  }

  // Carrito de Usuarios Autenticados (Firestore)
  const cartRef = doc(db, `users/${user.uid}/cart`, cartLineId);
  if (isInCart) {
    await deleteDoc(cartRef);
    if (!hasExplicitVariant && cartLineId !== prod.id) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/cart`, prod.id));
      } catch(e) {}
    }
  } else {
    await setDoc(cartRef, cartItem);
    trackAddToCart({ ...prod, priceCLP: cartItem.priceCLP || prod.priceCLP }, user.uid);
  }
}
