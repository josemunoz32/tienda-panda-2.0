/**
 * abandonedCart.js — Detección y guardado de carritos abandonados (Usuarios e Invitados)
 *
 * Flujo:
 * 1. Cuando cualquier usuario (logueado o invitado) agrega productos, se guarda en Firestore collection "abandonedCarts".
 * 2. Si un invitado ingresa su correo/nombre/teléfono en el checkout, se asocia inmediatamente a su carrito.
 * 3. Se adjunta el historial de videojuegos que el cliente estuvo viendo en la tienda ("viewedProducts").
 * 4. Si pasan 15 minutos sin compra → se marca como "abandoned".
 * 5. Al comprar con éxito → markCartConverted() → status: 'converted'.
 */
import { db } from "../firebase";
import { doc, setDoc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";

const ABANDON_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos
let abandonTimer = null;

/**
 * Obtiene o genera un identificador persistente para invitados sin sesión
 */
export function getOrCreateGuestCartId() {
  try {
    let id = localStorage.getItem("panda_guest_cart_id");
    if (!id) {
      id = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem("panda_guest_cart_id", id);
    }
    return id;
  } catch (_) {
    return `guest_${Date.now()}`;
  }
}

/**
 * Registra un producto visualizado por el usuario en localStorage
 */
export function recordViewedProduct(product) {
  if (!product || (!product.id && !product.name)) return;
  try {
    const key = "panda_viewed_products";
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(key) || "[]");
    } catch (_) {}

    const prodId = String(product.id || product.app_id || product.name);
    list = list.filter(item => String(item.id) !== prodId);
    list.unshift({
      id: prodId,
      name: product.name || product.title || "Videojuego",
      priceCLP: Number(product.priceCLP || product.pricePrimariaCLP || 0),
      imageUrl: product.imageUrl || product.imagen || null,
      platform: product.plataforma || product.platform || "Digital",
      viewedAt: new Date().toISOString()
    });

    if (list.length > 10) list = list.slice(0, 10);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (_) {}
}

/**
 * Retorna los productos recientemente vistos por el cliente
 */
export function getViewedProducts() {
  try {
    return JSON.parse(localStorage.getItem("panda_viewed_products") || "[]");
  } catch (_) {
    return [];
  }
}

/**
 * Guarda el carrito activo en Firestore (soporta usuarios logueados e invitados)
 */
export async function markCartActive(uidOrGuestId, items, totalCLP = 0, customerInfo = {}) {
  const effectiveId = uidOrGuestId || getOrCreateGuestCartId();
  if (!effectiveId || !items || items.length === 0) return;

  clearTimeout(abandonTimer);

  const viewed = customerInfo.viewedProducts || getViewedProducts();

  try {
    const cartRef = doc(db, "abandonedCarts", effectiveId);
    const existingSnap = await getDoc(cartRef).catch(() => null);
    const existingData = existingSnap && existingSnap.exists() ? existingSnap.data() : {};

    const payload = {
      cartId: effectiveId,
      uid: (uidOrGuestId && !uidOrGuestId.startsWith("guest_")) ? uidOrGuestId : null,
      isGuest: !uidOrGuestId || uidOrGuestId.startsWith("guest_"),
      email: customerInfo.email || existingData.email || null,
      customerName: customerInfo.name || existingData.customerName || null,
      customerPhone: customerInfo.phone || existingData.customerPhone || null,
      items: items.map(i => ({
        id: i.productId || i.id,
        name: i.name || i.title || "Juego",
        priceCLP: Number(i.priceCLP || 0),
        imageUrl: i.imageUrl || null,
        consoleName: i.consoleName || null,
        cantidad: Number(i.cantidad || i.quantity || 1)
      })),
      totalCLP: Math.round(Number(totalCLP || 0)),
      itemCount: items.length,
      viewedProducts: viewed.length > 0 ? viewed : (existingData.viewedProducts || []),
      lastUpdated: serverTimestamp(),
      status: "active",
    };

    await setDoc(cartRef, payload, { merge: true });
  } catch (err) {
    console.warn("[abandonedCart] Error al guardar carrito:", err);
  }

  // Programar marcado como abandonado
  abandonTimer = setTimeout(async () => {
    try {
      const snap = await getDoc(doc(db, "abandonedCarts", effectiveId));
      if (snap.exists() && snap.data().status === "active") {
        await updateDoc(doc(db, "abandonedCarts", effectiveId), {
          status: "abandoned",
          abandonedAt: serverTimestamp(),
        });
      }
    } catch (_) {}
  }, ABANDON_TIMEOUT_MS);
}

/**
 * Actualiza los datos de contacto del cliente en su carrito activo (email, nombre, whatsapp)
 */
export async function updateCartCustomerInfo(email, name, phone, uid = null) {
  const effectiveId = uid || getOrCreateGuestCartId();
  if (!effectiveId) return;

  try {
    const updateData = {};
    if (email && email.trim()) updateData.email = email.trim().toLowerCase();
    if (name && name.trim()) updateData.customerName = name.trim();
    if (phone && phone.trim()) updateData.customerPhone = phone.trim();

    const viewed = getViewedProducts();
    if (viewed.length > 0) updateData.viewedProducts = viewed;

    if (Object.keys(updateData).length > 0) {
      updateData.lastUpdated = serverTimestamp();
      await setDoc(doc(db, "abandonedCarts", effectiveId), updateData, { merge: true });
    }
  } catch (err) {
    console.warn("[abandonedCart] Error actualizando contacto de carrito:", err);
  }
}

/**
 * Llama esto cuando la compra se completa exitosamente
 */
export async function markCartConverted(uidOrGuestId) {
  const effectiveId = uidOrGuestId || getOrCreateGuestCartId();
  if (!effectiveId) return;
  clearTimeout(abandonTimer);
  try {
    await updateDoc(doc(db, "abandonedCarts", effectiveId), {
      status: "converted",
      convertedAt: serverTimestamp(),
    });
  } catch (_) {}
}

/**
 * Limpia el temporizador de abandono
 */
export function clearAbandonTimer() {
  clearTimeout(abandonTimer);
}
