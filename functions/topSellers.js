/**
 * topSellers.js — ranking público de juegos más vendidos.
 * Lee los pedidos confirmados (privados) y publica solo el ranking agregado en
 * publicStats/topSellers, que el home lee para mostrar "Lo más comprado".
 * No se publica ningún dato de clientes: solo id/nombre de producto y unidades.
 */
const admin = require("firebase-admin");

const PAID = new Set(["exitoso", "completado", "aprobado", "pagado", "paid", "completed", "approved"]);
const isPaid = (o) => o.entregado === true || o.pagoConfirmado === true ||
  PAID.has(String(o.estado || o.status || o.paymentStatus || "").toLowerCase());
const itemsOf = (o) => [o.productos, o.items, o.cart, o.products].find(Array.isArray) || [];
const nameKey = (s) => String(s || "").toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

function platformOf(item) {
  const s = `${item.plataforma || ""} ${item.categoryName || ""} ${item.categoryId || ""}`.toLowerCase();
  if (item.isSteam || s.includes("steam")) return "steam";
  if (s.includes("switch") || s.includes("nintendo")) return "nintendo";
  if (s.includes("ps5")) return "ps5";
  if (s.includes("ps4")) return "ps4";
  return "otros";
}

async function computeTopSellers() {
  const db = admin.firestore();
  const snap = await db.collection("orders").get();
  // Últimos 120 días: refleja lo que se compra ahora, no lo de hace años
  const since = Date.now() - 120 * 24 * 60 * 60 * 1000;
  const counts = new Map();
  snap.docs.forEach((doc) => {
    const o = doc.data();
    if (!isPaid(o)) return;
    const raw = o.fecha || o.createdAt || o.timestamp;
    const date = raw && raw.toDate ? raw.toDate() : new Date(raw);
    if (!Number.isNaN(date.getTime()) && date.getTime() < since) return;
    itemsOf(o).forEach((item) => {
      if (!item || item.isPromo) return;
      const key = item.id ? String(item.id) : nameKey(item.name);
      if (!key) return;
      const entry = counts.get(key) || {
        id: item.id ? String(item.id) : null,
        appId: item.appId || item.app_id || null,
        name: String(item.name || "").slice(0, 120),
        platform: platformOf(item),
        units: 0,
      };
      entry.units += Number(item.cantidad || item.quantity || 1) || 1;
      counts.set(key, entry);
    });
  });
  const ranking = [...counts.values()].sort((a, b) => b.units - a.units);
  const byPlatform = {};
  ["steam", "nintendo", "ps4", "ps5"].forEach((p) => {
    byPlatform[p] = ranking.filter((r) => r.platform === p).slice(0, 15);
  });
  await db.collection("publicStats").doc("topSellers").set({
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    top: ranking.slice(0, 30),
    byPlatform,
  });
  return ranking.length;
}

module.exports = {computeTopSellers};
