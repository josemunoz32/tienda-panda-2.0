import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { useMoneda } from "../context/MonedaContext";
import "./UpsellRecs.css";

const DISCOUNT = 10;

// Devuelve el plan más barato (con clp y meses) para productos con preciosPorMes
function getCheapestPlan(prod) {
  if (Array.isArray(prod.preciosPorMes) && prod.preciosPorMes.length > 0) {
    const valid = prod.preciosPorMes
      .filter(m => Number(m.clp || 0) > 0)
      .sort((a, b) => Number(a.clp) - Number(b.clp));
    return valid[0] || null;
  }
  return null;
}

// Devuelve el precio base en CLP del producto (sin descuento)
function getBasePriceCLP(prod) {
  if (Number(prod.priceCLP || 0) > 0) return Number(prod.priceCLP);
  if (Number(prod.pricePrimariaCLP || 0) > 0) return Number(prod.pricePrimariaCLP);
  const plan = getCheapestPlan(prod);
  if (plan) return Number(plan.clp);
  return 0;
}

// Calcula el precio descontado en CLP redondeado al múltiplo de 500
function calcDiscountedCLP(originalCLP) {
  const raw = Math.round(originalCLP * (1 - DISCOUNT / 100));
  const floored = Math.floor(raw / 500) * 500;
  return Math.max(500, floored);
}

export default function UpsellRecs({ currentIds = [], categoryId, onAdded }) {
  const [recs, setRecs] = useState([]);
  const [added, setAdded] = useState({});
  const { formatearPrecio, moneda } = useMoneda();
  const user = auth.currentUser;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "products"));
        if (cancelled) return;

        const allProds = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 1. Filtrar por categoría si está especificada, exigiendo que tenga portada válida
        const hasValidImage = (p) => p.imageUrl && typeof p.imageUrl === 'string' && p.imageUrl.startsWith('http');

        let candidates = [];
        if (categoryId) {
          candidates = allProds.filter(p => p.categoryId === categoryId && !currentIds.includes(p.id) && getBasePriceCLP(p) > 0 && hasValidImage(p));
        }

        // 2. Si no hay suficientes en la misma categoría, tomar del catálogo general con portada
        if (candidates.length < 3) {
          const fallback = allProds.filter(p => !currentIds.includes(p.id) && getBasePriceCLP(p) > 0 && hasValidImage(p));
          // Unir y eliminar duplicados
          const combinedMap = new Map();
          [...candidates, ...fallback].forEach(p => combinedMap.set(p.id, p));
          candidates = Array.from(combinedMap.values());
        }

        // 3. Mezclar aleatoriamente para evitar que siempre salgan los mismos juegos
        const shuffled = candidates.sort(() => 0.5 - Math.random()).slice(0, 3);
        setRecs(shuffled);
      } catch (err) {
        console.error("Error cargando recomendaciones upsell:", err);
      }
    })();

    return () => { cancelled = true; };
  }, [categoryId, currentIds.join(",")]); // eslint-disable-line

  const handleAdd = async (prod) => {
    if (added[prod.id]) return;
    const originalCLP = getBasePriceCLP(prod);
    const discountedCLP = calcDiscountedCLP(originalCLP);
    const plan = getCheapestPlan(prod);

    // Calcular precio USD proporcional con descuento
    const originalUSD = prod.priceUSD || prod.pricePrimariaUSD || (originalCLP > 0 ? (originalCLP / 1000) + 4 : 0);
    const discountedUSD = Number((originalUSD * (1 - DISCOUNT / 100)).toFixed(2));

    const newItem = {
      id: prod.id,
      productId: prod.id,
      name: prod.name,
      imageUrl: prod.imageUrl || null,
      priceCLP: discountedCLP,
      priceUSD: discountedUSD,
      consoleName: prod.consoleName || null,
      categoryId: prod.categoryId || null,
      upsellOffer: true,
      ...(plan?.meses != null ? { meses: plan.meses } : {}),
    };

    if (!user) {
      let lCart = [];
      try {
        const c = localStorage.getItem('guestCart');
        if (c) lCart = JSON.parse(c);
      } catch(e) {}
      
      const exists = lCart.find(i => (i.productId || i.id) === prod.id);
      if (!exists) {
        lCart.push(newItem);
        localStorage.setItem('guestCart', JSON.stringify(lCart));
        window.dispatchEvent(new Event('localCartUpdated'));
        setAdded(prev => ({ ...prev, [prod.id]: true }));
        if (typeof onAdded === "function") {
          onAdded({ ...prod, priceCLP: discountedCLP, priceUSD: discountedUSD }, discountedCLP);
        }
      }
      return;
    }

    try {
      await setDoc(doc(db, `users/${user.uid}/cart`, prod.id), newItem);
      setAdded(prev => ({ ...prev, [prod.id]: true }));
      if (typeof onAdded === "function") {
        onAdded({ ...prod, priceCLP: discountedCLP, priceUSD: discountedUSD }, discountedCLP);
      }
    } catch (_) {}
  };

  if (!recs.length) return null;

  return (
    <div className="upsell-root">
      <div className="upsell-header">
        <div className="upsell-header-left">
          <div className="upsell-lightning">
            <span className="material-icons" style={{ fontSize: 18, color: '#facc15' }}>bolt</span>
          </div>
          <div>
            <div className="upsell-title">Lleva más, ahorra más</div>
            <div className="upsell-sub">Agrega con {DISCOUNT}% OFF exclusivo — solo al comprar ahora</div>
          </div>
        </div>
        <span className="upsell-pill">Oferta</span>
      </div>

      <div className="upsell-cards">
        {recs.map(prod => {
          const originalCLP = getBasePriceCLP(prod);
          const discountedCLP = calcDiscountedCLP(originalCLP);

          const originalUSD = prod.priceUSD || prod.pricePrimariaUSD || (originalCLP > 0 ? (originalCLP / 1000) + 4 : 0);
          const discountedUSD = Number((originalUSD * (1 - DISCOUNT / 100)).toFixed(2));

          const displayOriginal = moneda === "USD" ? `$${Number(originalUSD).toFixed(2)}` : formatearPrecio(originalCLP);
          const displayDiscounted = moneda === "USD" ? `$${Number(discountedUSD).toFixed(2)}` : formatearPrecio(discountedCLP);

          const isAdded = !!added[prod.id];
          const plan = getCheapestPlan(prod);
          const mesesLabel = plan?.meses != null
            ? `${plan.meses} ${Number(plan.meses) === 1 ? 'mes' : 'meses'}`
            : null;

          return (
            <div key={prod.id} className={`upsell-card${isAdded ? ' upsell-card-added' : ''}`}>
              <div className="upsell-discount-badge">-{DISCOUNT}%</div>
              <div className="upsell-card-img-wrap">
                {prod.imageUrl
                  ? <img src={prod.imageUrl} alt={prod.name} className="upsell-card-img" />
                  : <span className="material-icons" style={{ fontSize: 28, color: '#a259ff55' }}>videogame_asset</span>
                }
              </div>
              <div className="upsell-card-body">
                <div className="upsell-card-name">{prod.name}</div>
                {mesesLabel && (
                  <div className="upsell-plan-chip">
                    <span className="material-icons" style={{ fontSize: 11 }}>schedule</span>
                    {mesesLabel}
                  </div>
                )}
                <div className="upsell-card-prices">
                  <span className="upsell-price-old">{displayOriginal}</span>
                  <span className="upsell-price-new">{displayDiscounted}</span>
                </div>
              </div>
              <button
                className={`upsell-add-btn${isAdded ? ' upsell-add-btn-done' : ''}`}
                onClick={() => handleAdd(prod)}
                disabled={isAdded}
                type="button"
              >
                <span className="material-icons" style={{ fontSize: 15 }}>{isAdded ? 'check' : 'add_shopping_cart'}</span>
                {isAdded ? 'Agregado' : 'Agregar'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
