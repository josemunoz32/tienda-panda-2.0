// cartHelpers.js
import { doc, setDoc, deleteDoc } from "firebase/firestore";

/**
 * Agrega o quita un producto del carrito del usuario en Firestore.
 * @param {object} db - Instancia de Firestore
 * @param {object} user - Usuario autenticado
 * @param {object} prod - Producto a agregar/quitar
 * @param {string} moneda - Moneda actual
 * @param {array} cartIds - Array de ids de productos en el carrito
 * @param {function} setModal - (opcional) Función para abrir modal de variantes/suscripción
 * @returns {Promise<void>}
 */
export async function handleCartAddOrRemove({ db, user, prod, moneda, cartIds, setModal }) {
  if (!user) return;
  let opciones = [];
  let tipo = null;
  if (moneda === 'CLP') {
    if (prod.pricePrimariaCLP || prod.priceSecundariaCLP) {
      tipo = 'ps';
      if (prod.pricePrimariaCLP) opciones.push({ label: `Primaria CLP: ${prod.pricePrimariaCLP}`, value: 'primaria', price: prod.pricePrimariaCLP, moneda: 'CLP' });
      if (prod.priceSecundariaCLP) opciones.push({ label: `Secundaria CLP: ${prod.priceSecundariaCLP}`, value: 'secundaria', price: prod.priceSecundariaCLP, moneda: 'CLP' });
    } else if (Array.isArray(prod.preciosPorMes) && prod.preciosPorMes.length > 0) {
      tipo = 'suscripcion';
      opciones = prod.preciosPorMes.filter(p => p.clp).map(p => ({ label: `${p.meses} mes(es) CLP: ${p.clp}`, value: p.meses, price: p.clp, moneda: 'CLP' }));
    }
  } else if (moneda === 'USD') {
    if (prod.pricePrimariaUSD || prod.priceSecundariaUSD) {
      tipo = 'ps';
      if (prod.pricePrimariaUSD) opciones.push({ label: `Primaria USD: ${prod.pricePrimariaUSD}`, value: 'primaria', price: prod.pricePrimariaUSD, moneda: 'USD' });
      if (prod.priceSecundariaUSD) opciones.push({ label: `Secundaria USD: ${prod.priceSecundariaUSD}`, value: 'secundaria', price: prod.priceSecundariaUSD, moneda: 'USD' });
    } else if (Array.isArray(prod.preciosPorMes) && prod.preciosPorMes.length > 0) {
      tipo = 'suscripcion';
      opciones = prod.preciosPorMes.filter(p => p.usd).map(p => ({ label: `${p.meses} mes(es) USD: ${p.usd}`, value: p.meses, price: p.usd, moneda: 'USD' }));
    }
  }
  if (opciones.length > 1 && setModal) {
    setModal({ open: true, prod, opciones, tipo });
    return;
  }
  const cartRef = doc(db, `users/${user.uid}/cart`, prod.id);
  if (cartIds.includes(prod.id)) {
    await deleteDoc(cartRef);
  } else {
    let extra = {};
    if (tipo === 'ps' && opciones.length === 1) {
      extra = { variante: opciones[0].value, [`price${opciones[0].moneda}`]: opciones[0].price };
    } else if (tipo === 'suscripcion' && opciones.length === 1) {
      extra = { meses: opciones[0].value, [`price${opciones[0].moneda}`]: opciones[0].price };
    } else {
      if (moneda === 'CLP' && prod.priceCLP) {
        extra = { priceCLP: prod.priceCLP };
      } else if (moneda === 'USD' && prod.priceUSD) {
        extra = { priceUSD: prod.priceUSD };
      }
    }
    await setDoc(cartRef, {
      productId: prod.id,
      name: prod.name,
      imageUrl: prod.imageUrl || null,
      cantidad: 1,
      ...extra
    });
  }
}
