/**
 * Sistema de Notificaciones Directas al Bot de Telegram para Administradores de PandaStore
 * Envía alertas en tiempo real al chat privado del administrador (ADMIN_ID).
 */

const TELEGRAM_TOKEN = process.env.REACT_APP_TELEGRAM_TOKEN || "";
const ADMIN_CHAT_ID = process.env.REACT_APP_TELEGRAM_ADMIN_CHAT_ID || "5158777962";

/**
 * Función base para enviar mensajes formateados con HTML al chat privado del admin
 */
export async function sendTelegramMessage(htmlMessage) {
  if (!TELEGRAM_TOKEN) {
    console.warn("[TelegramNotification] Token no configurado en REACT_APP_TELEGRAM_TOKEN.");
    return null;
  }
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: htmlMessage,
        parse_mode: "HTML",
        disable_web_page_preview: false
      })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("[TelegramNotification] Error al enviar mensaje:", err);
    return null;
  }
}

/**
 * 1. Notificación: Nueva Postulación a Revendedor Oficial B2B
 */
export async function notifyNewResellerApplication({ nombre, email, whatsapp, tipoNegocio }) {
  const fechaStr = new Date().toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const msg = [
    `👔 <b>¡NUEVA POSTULACIÓN A REVENDEDOR!</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 <b>Nombre / Usuario:</b> ${nombre || "Sin nombre"}`,
    `📧 <b>Email:</b> ${email || "Sin email"}`,
    `📱 <b>WhatsApp:</b> ${whatsapp || "No indicado"}`,
    tipoNegocio ? `🏢 <b>Detalle:</b> ${tipoNegocio}` : null,
    `📅 <b>Fecha:</b> ${fechaStr}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🔗 <a href="https://pandastoregaming.cl/admin/revendedores">Abrir Panel de Revendedores</a>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🌐 <i>PandaStore 2.0 · Alerta Automática</i>`
  ].filter(Boolean).join("\n");

  return sendTelegramMessage(msg);
}

/**
 * 2. Notificación: Nueva Solicitud de Distribuidor (Plan, Claves Extras, Recarga)
 */
export async function notifyNewDistributorRequest({
  userName,
  userEmail,
  tipo,
  planName,
  extraCount,
  montoCLP,
  metodoPago,
  banco,
  comprobanteUrl
}) {
  const fechaStr = new Date().toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const isPlan = tipo === "adquisicion_plan";
  const isExtraKeys = tipo === "compra_claves_extras";
  const tipoTitulo = isPlan
    ? `Activación de Plan (${planName || "Steam B2B"})`
    : isExtraKeys
      ? `Compra de Claves Extras (+${extraCount || 0} claves)`
      : `Recarga de Billetera Distribuidor`;

  const montoFormatted = Number(montoCLP || 0).toLocaleString("es-CL");

  const msg = [
    `🚀 <b>¡NUEVA SOLICITUD DE DISTRIBUIDOR!</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🎯 <b>Tipo:</b> ${tipoTitulo}`,
    `👤 <b>Distribuidor:</b> ${userName || "Distribuidor"}`,
    `📧 <b>Email:</b> ${userEmail || "Sin email"}`,
    `💰 <b>Monto:</b> $${montoFormatted} CLP`,
    `💳 <b>Método:</b> ${metodoPago || "Transferencia bancaria"}`,
    banco ? `🏦 <b>Banco:</b> ${banco}` : null,
    comprobanteUrl ? `📎 <b>Comprobante:</b> <a href="${comprobanteUrl}">Ver Archivo Adjunto</a>` : null,
    `📅 <b>Fecha:</b> ${fechaStr}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🔗 <a href="https://pandastoregaming.cl/admin/distribuidores">Abrir Panel de Distribuidores</a>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🌐 <i>PandaStore 2.0 · Alerta Automática</i>`
  ].filter(Boolean).join("\n");

  return sendTelegramMessage(msg);
}

/**
 * 3. Notificación: Nueva Solicitud de Recarga de Billetera Virtual (Transferencia / Cripto)
 */
export async function notifyNewWalletRecharge({
  userName,
  userEmail,
  montoCLP,
  banco,
  metodoPago,
  comprobanteUrl
}) {
  const fechaStr = new Date().toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const montoFormatted = Number(montoCLP || 0).toLocaleString("es-CL");

  const msg = [
    `💼 <b>¡NUEVA RECARGA DE BILLETERA PENDIENTE!</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 <b>Usuario:</b> ${userName || "Cliente / Revendedor"}`,
    `📧 <b>Email:</b> ${userEmail || "Sin email"}`,
    `💰 <b>Monto a Acreditar:</b> $${montoFormatted} CLP`,
    `💳 <b>Método / Banco:</b> ${banco || metodoPago || "Transferencia bancaria"}`,
    comprobanteUrl ? `📎 <b>Comprobante:</b> <a href="${comprobanteUrl}">Ver Comprobante de Pago</a>` : null,
    `📅 <b>Fecha:</b> ${fechaStr}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🔗 <a href="https://pandastoregaming.cl/admin/revendedores">Validar en Panel de Recargas</a>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🌐 <i>PandaStore 2.0 · Alerta Automática</i>`
  ].filter(Boolean).join("\n");

  return sendTelegramMessage(msg);
}
