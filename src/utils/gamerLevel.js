/**
 * Sistema de Niveles Gamer PandaStore (Reemplaza el sistema antiguo de puntos)
 * Niveles:
 *  - 🥉 Bronce (0 - 2 compras): Rango inicial gamer
 *  - 🥈 Plata (3 - 5 compras): 5% de descuento permanente
 *  - 🥇 Oro (6 - 9 compras): 10% de descuento permanente
 *  - 💎 Diamante (10+ compras): 15% de descuento permanente + soporte prioritario VIP
 */

export const GAMER_LEVELS = [
  {
    name: "Bronce",
    level: "Bronce",
    badge: "🥉",
    minOrders: 0,
    maxOrders: 2,
    discountPercent: 0,
    color: "#d97706",
    gradient: "linear-gradient(135deg, #78350f, #d97706)",
    perks: [
      "Nivel inicial de cliente en la tienda",
      "Completa 3 compras para desbloquear 5% de descuento permanente"
    ],
    description: "Nivel Inicial: Completa 3 compras para subir a Plata (5% OFF)"
  },
  {
    name: "Plata",
    level: "Plata",
    badge: "🥈",
    minOrders: 3,
    maxOrders: 5,
    discountPercent: 5,
    color: "#cbd5e1",
    gradient: "linear-gradient(135deg, #64748b, #94a3b8)",
    perks: [
      "5% de descuento permanente en todas tus compras",
      "Descuento automático aplicado en tu cuenta"
    ],
    description: "Nivel Plata: 5% de descuento permanente en tus pedidos"
  },
  {
    name: "Oro",
    level: "Oro",
    badge: "🥇",
    minOrders: 6,
    maxOrders: 9,
    discountPercent: 10,
    color: "#fbbf24",
    gradient: "linear-gradient(135deg, #d97706, #fbbf24)",
    perks: [
      "10% de descuento permanente en todas tus compras",
      "Descuento automático aplicado en tu cuenta"
    ],
    description: "Nivel Oro: 10% de descuento permanente en tus pedidos"
  },
  {
    name: "Diamante",
    level: "Diamante",
    badge: "💎",
    minOrders: 10,
    maxOrders: Infinity,
    discountPercent: 15,
    color: "#38bdf8",
    gradient: "linear-gradient(135deg, #0284c7, #38bdf8)",
    perks: [
      "15% de descuento permanente en todas tus compras",
      "Máximo nivel de beneficio y ahorro permanente"
    ],
    description: "Nivel Diamante: 15% de descuento permanente en todas tus compras"
  }
];

export function getGamerLevel(orderCount = 0) {
  const count = Math.max(0, Number(orderCount) || 0);

  if (count >= 10) {
    const tier = GAMER_LEVELS[3];
    return {
      ...tier,
      orderCount: count,
      nextTier: null,
      nextLevel: null,
      ordersToNext: 0,
      neededOrders: 0
    };
  }

  if (count >= 6) {
    const tier = GAMER_LEVELS[2];
    return {
      ...tier,
      orderCount: count,
      nextTier: "Nivel Diamante 💎",
      nextLevel: "Diamante",
      ordersToNext: 10 - count,
      neededOrders: 10 - count
    };
  }

  if (count >= 3) {
    const tier = GAMER_LEVELS[1];
    return {
      ...tier,
      orderCount: count,
      nextTier: "Nivel Oro 🥇",
      nextLevel: "Oro",
      ordersToNext: 6 - count,
      neededOrders: 6 - count
    };
  }

  const tier = GAMER_LEVELS[0];
  return {
    ...tier,
    orderCount: count,
    nextTier: "Nivel Plata 🥈",
    nextLevel: "Plata",
    ordersToNext: 3 - count,
    neededOrders: 3 - count
  };
}
