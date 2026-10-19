/**
 * Helper para generar enlaces y mensajes inteligentes hacia WhatsApp de PandaStore
 * Teléfono oficial de atención PandaStore: +56 9 7475 1810
 */

export const PANDA_WHATSAPP_PHONE = "56974751810";

/**
 * Genera el enlace de WhatsApp con el mensaje pre-cargado para solicitar instalación
 */
export function buildSolicitarInstalacionWspUrl({
  nombre = "",
  email = "",
  pedidoId = "",
  productos = [],
  producto = "",
  plataforma = "",
  total = null,
  moneda = "CLP",
  metodoPago = ""
} = {}) {
  const platLower = (plataforma || "").toLowerCase();
  let saludo = "🎮 *¡HOLA PANDASTORE! SOLICITUD DE INSTALACIÓN* 🎮";
  let solicitud = "Acabo de comprar en la web y deseo solicitar la instalación y entrega de mi(s) juego(s). ¿Me podrían guiar con los pasos por favor?";

  if (platLower.includes("switch") || platLower.includes("nintendo")) {
    saludo = "🎮 *¡HOLA PANDASTORE! AYÚDAME A INSTALAR NINTENDO* 🎮";
    solicitud = "Hola, ayúdame a instalar Nintendo. Acabo de realizar mi compra en la web y necesito el paso a paso para mi consola.";
  } else if (platLower.includes("playstation") || platLower.includes("ps4") || platLower.includes("ps5")) {
    saludo = "🎮 *¡HOLA PANDASTORE! AYÚDAME CON PS4 / PS5* 🎮";
    solicitud = "Hola, ayúdame con PS4 / PS5. Acabo de realizar mi compra en la web y necesito la activación en mi PlayStation.";
  } else if (platLower.includes("streaming") || platLower.includes("cuenta")) {
    saludo = "🍿 *¡HOLA PANDASTORE! ENTREGA DE CUENTA STREAMING* 🍿";
    solicitud = "Hola, compré una cuenta de streaming en la web y solicito los datos de acceso para mi activación.";
  } else if (platLower.includes("steam") || platLower.includes("pc")) {
    saludo = "💻 *¡HOLA PANDASTORE! AYÚDAME CON STEAM* 💻";
    solicitud = "Hola, ayúdame con Steam. Acabo de comprar en la web y solicito asistencia para instalar y activar mi juego.";
  }

  let listaProds = "";
  if (Array.isArray(productos) && productos.length > 0) {
    listaProds = productos.map(p => {
      const nom = p.nombre || p.title || p.name || "Juego";
      const plat = p.plataforma || p.platform || plataforma || "";
      const cant = p.cantidad || p.quantity || 1;
      const varTxt = p.variante ? ` (${p.variante.charAt(0).toUpperCase() + p.variante.slice(1).toLowerCase()})` : "";
      let dlcTxt = "";
      if (Array.isArray(p.selectedDlcs) && p.selectedDlcs.length > 0) {
        dlcTxt = ` [🎁 +${p.selectedDlcs.length} DLCs: ${p.selectedDlcs.map(d => d.name).join(', ')}]`;
      }
      return `• ${nom}${varTxt}${plat ? ` [${plat}]` : ""}${dlcTxt}${cant > 1 ? ` (x${cant})` : ""}`;
    }).join("\n");
  } else if (producto) {
    listaProds = `• ${producto}${plataforma ? ` [${plataforma}]` : ""}`;
  } else {
    listaProds = "• Pedido de productos PandaStore";
  }

  const totalStr = total
    ? (moneda === "USD" ? `USD $${Number(total).toFixed(2)}` : `$${Number(total).toLocaleString("es-CL")} CLP`)
    : "Confirmado";

  const message =
`${saludo}
━━━━━━━━━━━━━━━━━━━━
👋 *Cliente:* ${nombre || email || "Cliente PandaStore"}
📧 *Correo:* ${email || "No indicado"}
📦 *N° Pedido:* ${pedidoId ? `#${pedidoId}` : "Reciente"}
🕹️ *Plataforma:* ${plataforma || "Steam / PC"}
💳 *Pago:* ${metodoPago ? metodoPago.toUpperCase() : "Aprobado"} (${totalStr})
━━━━━━━━━━━━━━━━━━━━
📋 *Producto(s) comprados:*
${listaProds}
━━━━━━━━━━━━━━━━━━━━
🚀 *Solicitud:* ${solicitud}`;

  return `https://wa.me/${PANDA_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}

/**
 * Genera el enlace de WhatsApp con el mensaje pre-cargado para validar pago pendiente
 */
export function buildValidarPagoPendienteWspUrl({
  nombre = "",
  email = "",
  pedidoId = "",
  productos = [],
  producto = "",
  plataforma = "",
  total = null,
  moneda = "CLP",
  metodoPago = "Transferencia"
} = {}) {
  let listaProds = "";
  if (Array.isArray(productos) && productos.length > 0) {
    listaProds = productos.map(p => {
      const nom = p.nombre || p.title || p.name || "Juego";
      const plat = p.plataforma || p.platform || plataforma || "";
      const varTxt = p.variante ? ` (${p.variante.charAt(0).toUpperCase() + p.variante.slice(1).toLowerCase()})` : "";
      let dlcTxt = "";
      if (Array.isArray(p.selectedDlcs) && p.selectedDlcs.length > 0) {
        dlcTxt = ` [🎁 +${p.selectedDlcs.length} DLCs: ${p.selectedDlcs.map(d => d.name).join(', ')}]`;
      }
      return `• ${nom}${varTxt}${plat ? ` [${plat}]` : ""}${dlcTxt}`;
    }).join("\n");
  } else if (producto) {
    listaProds = `• ${producto}${plataforma ? ` [${plataforma}]` : ""}`;
  } else {
    listaProds = "• Pedido de juegos PandaStore";
  }

  const totalStr = total
    ? (moneda === "USD" ? `USD $${Number(total).toFixed(2)}` : `$${Number(total).toLocaleString("es-CL")} CLP`)
    : "Por validar";

  const message =
`⏳ *¡HOLA PANDASTORE! VALIDACIÓN DE PAGO PENDIENTE* ⏳
━━━━━━━━━━━━━━━━━━━━
👋 *Cliente:* ${nombre || email || "Cliente PandaStore"}
📧 *Correo:* ${email || "No indicado"}
📦 *N° Pedido:* ${pedidoId ? `#${pedidoId}` : "Pendiente"}
💳 *Método de Pago:* ${(metodoPago || "Transferencia").toUpperCase()} (${totalStr})
🕹️ *Plataforma:* ${plataforma || "PC / Steam"}
━━━━━━━━━━━━━━━━━━━━
📋 *Detalle de mi compra:*
${listaProds}
━━━━━━━━━━━━━━━━━━━━
📎 *Mensaje:* He realizado el pago de mi pedido y quedó pendiente de verificación. Adjunto mi comprobante para que un administrador pueda revisarlo y marcar mi compra como exitosa. ¡Muchas gracias!`;

  return `https://wa.me/${PANDA_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}

/**
 * Detecta de forma inteligente la plataforma real y guía de instalación asociada a una orden
 */
export function getOrderPlatformInfo(orderSummary) {
  const rawPlat = orderSummary?.plataforma || orderSummary?.platform || "";
  const rawCat = orderSummary?.category || orderSummary?.categoria || orderSummary?.categoryName || "";
  const rawProd = orderSummary?.producto || "";
  const prods = Array.isArray(orderSummary?.productos) ? orderSummary.productos : (Array.isArray(orderSummary?.cart) ? orderSummary.cart : []);

  const textToCheck = [
    rawPlat,
    rawCat,
    rawProd,
    ...prods.map(p => {
      const plat = p.plataforma || p.platform || '';
      return `${p.nombre || ''} ${p.title || ''} ${p.name || ''} ${plat} ${p.category || ''} ${p.categoria || ''} ${p.categoryId || ''} ${p.categoryName || ''} ${p.variante || ''}`;
    })
  ].filter(Boolean).join(' ').toLowerCase();

  // 1. Streaming / Cuentas
  const isStreaming = textToCheck.includes("streaming") || textToCheck.includes("netflix") || textToCheck.includes("disney") ||
                      textToCheck.includes("max ") || textToCheck.includes("hbo") || textToCheck.includes("spotify") ||
                      textToCheck.includes("crunchyroll") || textToCheck.includes("iptv") || textToCheck.includes("paramount") ||
                      textToCheck.includes("prime video") || textToCheck.includes("youtube premium") || textToCheck.includes("cuentas");

  if (isStreaming) {
    return {
      platformKey: "streaming",
      platformLabel: "Streaming / Cuentas",
      guideTitle: "Entrega de Cuenta Streaming",
      guideRoute: null,
      guideSub: "Coordinación directa por WhatsApp",
      wspButtonTitle: "SOLICITAR CUENTA STREAMING POR WHATSAPP",
      wspButtonSub: "Hola, compré una cuenta de streaming, solicito mis datos de acceso",
      showLauncherBtn: false,
      showGuideBtn: false
    };
  }

  // 2. Nintendo Switch (detectar si contiene switch o nintendo, o switchCompat)
  const isNintendo = textToCheck.includes("switch") || textToCheck.includes("nintendo") ||
                     prods.some(p => p.switchCompat || String(p.plataforma || '').toLowerCase().includes("switch") || String(p.categoria || '').toLowerCase().includes("switch"));

  if (isNintendo) {
    return {
      platformKey: "nintendo",
      platformLabel: "Nintendo Switch",
      guideTitle: "Guía Nintendo Switch",
      guideRoute: "/instalacion-nintendo",
      guideSub: "Instalación paso a paso en consola",
      wspButtonTitle: "SOLICITAR INSTALACIÓN NINTENDO POR WHATSAPP",
      wspButtonSub: "Coordinar entrega de perfil e instalación en tu consola",
      showLauncherBtn: false,
      showGuideBtn: true
    };
  }

  // 3. PlayStation (PS4 / PS5)
  const isPlayStation = textToCheck.includes("playstation") || textToCheck.includes("ps5") || textToCheck.includes("ps4") ||
                        textToCheck.includes("ps3") || textToCheck.includes("sony") ||
                        prods.some(p => p.pricePrimariaCLP || p.priceSecundariaCLP || p.variante === "primaria" || p.variante === "secundaria");

  if (isPlayStation) {
    return {
      platformKey: "playstation",
      platformLabel: "PlayStation (PS4 / PS5)",
      guideTitle: "Guía PlayStation (PS4 / PS5)",
      guideRoute: "/instalacion-playstation",
      guideSub: "Instalación paso a paso en consola",
      wspButtonTitle: "SOLICITAR CUENTA PLAYSTATION POR WHATSAPP",
      wspButtonSub: "Coordinar entrega de cuenta e instalación en tu consola",
      showLauncherBtn: false,
      showGuideBtn: true
    };
  }

  // 4. Default: PC / Steam
  return {
    platformKey: "steam",
    platformLabel: "PC / Steam",
    guideTitle: "Guía de Activación Steam / PC",
    guideRoute: "/instalacion-activador",
    guideSub: "Instalación oficial con PandaStore Launcher",
    wspButtonTitle: "SOLICITAR AYUDA STEAM POR WHATSAPP",
    wspButtonSub: "Envíanos tus datos para coordinar la activación",
    showLauncherBtn: true,
    showGuideBtn: true
  };
}

/**
 * Genera el enlace de WhatsApp para reportar un error o solicitar asistencia en compra
 */
export function buildSoporteErrorWspUrl({
  nombre = "",
  email = "",
  error = "",
  metodoPago = ""
} = {}) {
  const message =
`⚠️ *¡HOLA PANDASTORE! CONSULTA POR ERROR EN COMPRA* ⚠️
━━━━━━━━━━━━━━━━━━━━
👋 *Cliente:* ${nombre || email || "Cliente PandaStore"}
📧 *Correo:* ${email || "No indicado"}
💳 *Método:* ${metodoPago ? metodoPago.toUpperCase() : "Checkout Web"}
━━━━━━━━━━━━━━━━━━━━
❗ *Detalle del error:* ${error || "Ocurrió un error al procesar mi pago"}
━━━━━━━━━━━━━━━━━━━━
¿Me podrían orientar para concretar mi compra por favor?`;

  return `https://wa.me/${PANDA_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}

/**
 * Genera enlace de WhatsApp para activar un juego VIP (Denuvo/Ubisoft/EA)
 * Estos juegos NO tienen fix descargable — requieren activación manual por el admin.
 *
 * @param {{ gameName, appId, licenseKey, platform, email }} params
 */
export function buildVipActivationWspUrl({
  gameName = "",
  appId = "",
  licenseKey = "",
  platform = "Steam",
  email = ""
} = {}) {
  const platformLabel =
    platform === "Ubisoft" ? "Ubisoft Connect" :
    platform === "EA" ? "EA App / Origin" :
    "Steam VIP";

  const message =
`🔑 *ACTIVACIÓN VIP — PANDASTORE* 🔑
━━━━━━━━━━━━━━━━━━━━
🎮 *Juego:* ${gameName || "Juego VIP"}${appId ? ` (AppID: ${appId})` : ""}
🖥️ *Plataforma:* ${platformLabel}
🗝️ *Mi clave PandaStore:* ${licenseKey || "Ver en Mis Pedidos"}
📧 *Correo:* ${email || "Ver cuenta"}
━━━━━━━━━━━━━━━━━━━━
✅ *Solicitud:* Necesito que me activen este juego VIP con mi clave. ¡Gracias!`;

  return `https://wa.me/${PANDA_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}

/**
 * Genera enlace de WhatsApp notificando la compra de un DLC
 * (informativo, para que el admin sepa que se compró y se actualizó la licencia)
 *
 * @param {{ gameName, dlcName, dlcAppId, licenseKey, email }} params
 */
export function buildDlcPurchaseWspUrl({
  gameName = "",
  dlcName = "",
  dlcAppId = "",
  licenseKey = "",
  email = ""
} = {}) {
  const message =
`🎁 *COMPRA DE DLC — PANDASTORE* 🎁
━━━━━━━━━━━━━━━━━━━━
🎮 *Juego base:* ${gameName || "Juego Steam"}
📦 *DLC comprado:* ${dlcName || "DLC"}${dlcAppId ? ` (AppID: ${dlcAppId})` : ""}
🗝️ *Clave PandaStore:* ${licenseKey || "Ver en Mis Pedidos"}
📧 *Correo:* ${email || "Ver cuenta"}
━━━━━━━━━━━━━━━━━━━━
✅ La licencia se actualizó automáticamente. El launcher activará el DLC en el próximo inicio.`;

  return `https://wa.me/${PANDA_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}
