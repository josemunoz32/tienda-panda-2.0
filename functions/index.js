
const path = require("path");
require("dotenv").config({path: path.join(__dirname, ".env")});
const functions = require("firebase-functions");
const {MercadoPagoConfig, Preference, Payment} = require("mercadopago");
const nodemailer = require("nodemailer");
const paypal = require("@paypal/checkout-server-sdk");
const admin = require("firebase-admin");
const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
  "https://pandastoreupdate.web.app,https://pandastoreupdate.firebaseapp.com,http://localhost:3000")
    .split(",").map((origin) => origin.trim()).filter(Boolean);
const cors = require("cors")({origin: allowedOrigins});
const templates = require("./emailTemplates");

let sagasCatalog = [];
try {
  sagasCatalog = require("./sagasData.json");
} catch (e) {
  sagasCatalog = [];
}

let steamImportData = [];
try {
  steamImportData = require("./steam_import_data.json");
} catch (e) {
  steamImportData = [];
}

let vipGamesData = [];
try {
  vipGamesData = require("./vipGamesData.json");
} catch (e) {
  vipGamesData = [];
}

function normalizeGameName(name) {
  if (!name) return "";
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function resolveSteamAppId(name, candidateId = null) {
  if (candidateId) {
    const m = String(candidateId).match(/^(?:ryuu_|vip-|promo-steam-)?(\d+)$/);
    if (m && Number(m[1]) > 10) return m[1];
  }
  if (!name) return null;
  const norm = normalizeGameName(name);
  if (!norm) return null;

  const foundImport = steamImportData.find((s) => normalizeGameName(s.name) === norm);
  if (foundImport && foundImport.app_id) return String(foundImport.app_id);

  const foundVip = vipGamesData.find((v) => normalizeGameName(v.name) === norm);
  if (foundVip && foundVip.app_id) return String(foundVip.app_id);

  return null;
}

// 1. Inicialización de Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Entrega un claim firmado para Storage únicamente a cuentas cuyo perfil ya
// posee privilegios administrativos en Firestore. Evita depender de lecturas
// cruzadas de reglas de Storage, que pueden fallar en algunos buckets nuevos.
exports.syncAdminStorageClaimHttp = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({error: "Método no permitido"});
      return;
    }

    const user = await requireRequestUser(req, res, true);
    if (!user) return;
    const account = await admin.auth().getUser(user.uid);
    await admin.auth().setCustomUserClaims(user.uid, {
      ...(account.customClaims || {}),
      pandaStorageAdmin: true,
    });
    res.status(200).json({ok: true});
  });
});

/**
 * Verify Firebase authentication and, where required, the server-side admin role.
 * @param {Object} req HTTP request.
 * @param {Object} res HTTP response.
 * @param {boolean} adminOnly Whether an administrator role is required.
 * @return {Promise<Object|null>} Decoded Firebase user, or null after responding.
 */
async function requireRequestUser(req, res, adminOnly = false) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({error: "Autenticación requerida"});
    return null;
  }
  try {
    const user = await admin.auth().verifyIdToken(token);
    if (adminOnly) {
      const profile = await db.collection("users").doc(user.uid).get();
      if (!profile.exists || profile.data().role !== "admin") {
        res.status(403).json({error: "Acceso denegado"});
        return null;
      }
      user.isAdmin = true;
    }
    return user;
  } catch (error) {
    console.error("Token inválido:", error.message);
    res.status(401).json({error: "Sesión inválida o expirada"});
    return null;
  }
}

// 2. Configuración optimizada del transporter de nodemailer (anti-spam y pool)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  pool: true,
  maxConnections: 3,
  maxMessages: 100,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: true,
  },
});
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const EMAIL_FROM_PANDA = `"PandaStore" <${process.env.GMAIL_USER}>`;
const EMAIL_REPLY_TO = `"PandaStore Soporte" <${process.env.GMAIL_USER}>`;


exports.soporteTickets = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }
      if (req.method !== "GET") {
        return res.status(405).json({error: "Método no permitido"});
      }
      const user = await requireRequestUser(req, res);
      if (!user) return;
      const profile = await db.collection("users").doc(user.uid).get();
      const isAdmin = profile.exists && profile.data().role === "admin";
      let tickets = [];
      if (isAdmin) {
        const snap = await admin.firestore()
            .collection("soporte")
            .orderBy("fecha", "desc")
            .get();
        tickets = snap.docs.map((doc) => ({id: doc.id, ...doc.data()}));
      } else {
        const email = user.email;
        if (!email) return res.status(400).json({error: "La cuenta no tiene correo"});
        const snap = await admin.firestore()
            .collection("soporte")
            .where("email", "==", email)
            .get();
        tickets = snap.docs.map((doc) => ({id: doc.id, ...doc.data()}));
      }
      res.status(200).json({tickets});
    } catch (error) {
      console.error("Error en soporteTickets:", error);
      res.status(500).json({error: error.message || error.toString()});
    }
  });
});


// Agregar mensaje a un ticket (POST /soporte-mensaje)
exports.soporteMensaje = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }
      if (req.method !== "POST") {
        return res.status(405).json({error: "Método no permitido"});
      }
      const user = await requireRequestUser(req, res);
      if (!user) return;
      const {ticketId, texto} = req.body;
      if (!ticketId || !texto || typeof texto !== "string" || texto.length > 4000) {
        return res.status(400).json({error: "Faltan datos"});
      }
      const ticketRef = admin.firestore().collection("soporte").doc(ticketId);
      const ticketDoc = await ticketRef.get();
      if (!ticketDoc.exists) {
        return res.status(404).json({error: "Ticket no encontrado"});
      }
      if (ticketDoc.data().estado === "finalizado") {
        return res.status(403).json({error: "Ticket finalizado"});
      }
      const profile = await db.collection("users").doc(user.uid).get();
      const isAdmin = profile.exists && profile.data().role === "admin";
      if (!isAdmin && ticketDoc.data().email !== user.email) {
        return res.status(403).json({error: "No puedes responder este ticket"});
      }
      await ticketRef.collection("mensajes").add({
        autor: isAdmin ? "admin" : "cliente",
        texto,
        fecha: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Notificar al admin igual que al crear ticket
      const ticketData = ticketDoc.data();
      try {
        await transporter.sendMail({
          from: EMAIL_FROM_PANDA,
          to: process.env.ADMIN_EMAIL,
          replyTo: EMAIL_REPLY_TO,
          subject: `Nuevo mensaje en ticket de soporte`,
          text: `Nuevo mensaje en ticket de soporte:\n\nCliente: ${ticketData.nombre || "(sin nombre)"}\nEmail: ${ticketData.email || "(sin email)"}\n\nMensaje:\n${texto}`,
          html: templates.htmlNuevoTicketAdmin(
              ticketData.nombre || "(sin nombre)",
              ticketData.email || "(sin email)",
              `Nuevo mensaje: ${texto}`,
          ),
        });
      } catch (mailError) {
        console.error(`[Soporte] Error al enviar correo al admin:`, mailError);
      }
      res.status(200).json({success: true});
    } catch (error) {
      console.error("Error en soporteMensaje:", error);
      res.status(500).json({error: error.message || error.toString()});
    }
  });
});


exports.soporteMensajes = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "GET") {
      return res.status(405).json({error: "Método no permitido"});
    }
    const user = await requireRequestUser(req, res);
    if (!user) return;
    const ticketId = req.query.ticketId;
    if (!ticketId) {
      return res.status(400).json({error: "Falta ticketId"});
    }
    const ticket = await db.collection("soporte").doc(ticketId).get();
    if (!ticket.exists) return res.status(404).json({error: "Ticket no encontrado"});
    const profile = await db.collection("users").doc(user.uid).get();
    if ((!profile.exists || profile.data().role !== "admin") && ticket.data().email !== user.email) {
      return res.status(403).json({error: "Acceso denegado"});
    }
    const mensajesSnap = await admin.firestore()
        .collection("soporte")
        .doc(ticketId)
        .collection("mensajes")
        .orderBy("fecha")
        .get();
    const mensajes = mensajesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json(mensajes);
  });
});


// Marcar ticket como finalizado (POST /soporte-finalizar)
exports.soporteFinalizar = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      return res.status(405).json({error: "Método no permitido"});
    }
    const user = await requireRequestUser(req, res, true);
    if (!user) return;
    const {ticketId} = req.body;
    if (!ticketId) {
      return res.status(400).json({error: "Falta ticketId"});
    }
    await admin.firestore()
        .collection("soporte")
        .doc(ticketId)
        .update({estado: "finalizado"});
    res.status(200).json({success: true});
  });
});


// --- SOPORTE TICKETS ---

// Crear ticket de soporte (POST /soporte)
exports.soporte = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      return res.status(405).json({error: "Método no permitido"});
    }
    const user = await requireRequestUser(req, res);
    if (!user) return;
    const {nombre, mensaje} = req.body;
    const email = user.email;
    if (!nombre || !email || !mensaje) {
      return res.status(400).json({error: "Faltan datos"});
    }
    // Guardar ticket en Firestore
    const ticketRef = await admin.firestore().collection("soporte").add({
      nombre,
      email,
      mensaje,
      respondido: false,
      fecha: new Date(),
    });
    // Enviar correo a admin
    await transporter.sendMail({
      from: EMAIL_FROM_PANDA,
      to: process.env.ADMIN_EMAIL,
      replyTo: email,
      subject: `Nuevo ticket de soporte de ${nombre}`,
      text: `Nuevo ticket de soporte:\n\nNombre: ${nombre}\nEmail: ${email}\nMensaje:\n${mensaje}`,
      html: templates.htmlNuevoTicketAdmin(nombre, email, mensaje),
    });
    res.status(200).json({success: true, ticketId: ticketRef.id});
  });
});


// Responder ticket de soporte (POST /soporte-responder)
exports.soporteResponder = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      return res.status(405).json({error: "Método no permitido"});
    }
    const user = await requireRequestUser(req, res, true);
    if (!user) return;
    const {ticketId, respuesta} = req.body;
    if (!ticketId || !respuesta || typeof respuesta !== "string" || respuesta.length > 4000) {
      return res.status(400).json({error: "Faltan datos"});
    }
    const ticket = await db.collection("soporte").doc(ticketId).get();
    if (!ticket.exists) return res.status(404).json({error: "Ticket no encontrado"});
    const email = ticket.data().email;
    await transporter.sendMail({
      from: EMAIL_FROM_PANDA,
      to: email,
      replyTo: EMAIL_REPLY_TO,
      subject: "PandaStore: Respuesta a tu ticket de soporte",
      text: `Hola,\n\nNuestro equipo ha respondido a tu consulta:\n\n${respuesta}\n\nPuedes continuar la conversación en: https://pandastoreupdate.web.app/soporte\n\nPandaStore Soporte`,
      html: templates.htmlRespuestaSoporte(respuesta),
    });
    res.status(200).json({success: true});
  });
});
const payPalClient = new paypal.core.PayPalHttpClient(
    new paypal.core.LiveEnvironment(
        process.env.PAYPAL_CLIENT_ID,
        process.env.PAYPAL_CLIENT_SECRET,
    ),
);

// Capturar orden PayPal, guardar pedido y enviar correos
exports.capturePayPalOrder = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const {orderId} = req.body;
      if (!orderId) {
        return res.status(400).json({error: "Faltan datos."});
      }
      // Capturar la orden en PayPal
      const request = new paypal.orders.OrdersCaptureRequest(orderId);
      request.requestBody({});
      const capture = await payPalClient.execute(request);
      // Log completo para depuración
      console.log("capture.result:", JSON.stringify(capture.result, null, 2));
      if (capture.result.status !== "COMPLETED") {
        return res.status(400).json({error: "El pago no fue completado."});
      }
      // Obtener el custom_id (externalReference) del pago correctamente
      const purchaseUnits = capture.result?.purchase_units || [];
      const firstPurchaseUnit = purchaseUnits[0] || {};
      const payments = firstPurchaseUnit.payments || {};
      const captures = payments.captures || [];
      const firstCapture = captures[0] || {};
      const externalReference = firstCapture.custom_id;
      if (!externalReference) {
        return res.status(400).json({
          error: "No se encontró el externalReference en la orden de PayPal.",
        });
      }
      // Buscar el pedido pendiente en Firestore
      const pendingOrderDoc = await admin.firestore()
          .collection("pendingOrders")
          .doc(externalReference)
          .get();
      if (!pendingOrderDoc.exists) {
        return res.status(404).json({error: "Pedido pendiente no encontrado."});
      }
      const pendingOrder = pendingOrderDoc.data();
      // Usar helper igual que transferencia/crypto/mercadopago
      await processApprovedOrder(
          {
            ...pendingOrder,
            metodoPago: "paypal",
            moneda: pendingOrder.moneda || "USD",
            paypalOrderId: orderId,
          },
          externalReference,
      );
      res.json({
        success: true,
      });
    } catch (error) {
      console.error("Error en capturePayPalOrder:", error);
      res.status(500).json({
        error:
          "No se pudo capturar el pago o " +
          "guardar el pedido.",
      });
    }
  });
});

// Crear orden PayPal
exports.createPayPalOrder = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      console.log("createPayPalOrder body:", req.body);
      let {cart, total, email, uid, firstName, lastName, shipping} = req.body;
      // Si no viene total, lo calculamos igual que MercadoPago
      if ((!total || isNaN(total)) && Array.isArray(cart)) {
        total = cart.reduce((acc, prod) => acc + (prod.precio || 0), 0);
      }
      if (!total || isNaN(total) || total <= 0) {
        return res.status(400).json({error: "Total inválido para el pago."});
      }

      // 1. Guardar el pedido en una colección temporal/pendiente en Firestore
      // (igual que MercadoPago)
      const externalReference =
        `paypal_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      await admin.firestore()
          .collection("pendingOrders")
          .doc(externalReference)
          .set({
            cart,
            email,
            uid: uid || null,
            total,
            shipping: shipping || {},
            firstName: firstName || "",
            lastName: lastName || "",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            metodoPago: "paypal",
          });
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer("return=representation");
      request.requestBody({
        intent: "CAPTURE",
        purchase_units: [{
          amount: {
            currency_code: "USD",
            value: total.toFixed(2),
          },
          custom_id: externalReference,
        }],
        application_context: {
          return_url:
            "https://pandastoreupdate.web.app/confirmacion-exitosa",
          cancel_url: "https://pandastoreupdate.web.app/failure",
        },
      });
      const order = await payPalClient.execute(request);
      const orderID = order.result.id;
      const approvalUrl = order.result.links.find(
          (link) => link.rel === "approve",
      )?.href;
      if (!orderID) {
        return res.status(500).json({
          error: "No se pudo obtener orderID de PayPal.",
        });
      }
      res.json({orderID, approvalUrl, externalReference});
    } catch (error) {
      console.error("Error en createPayPalOrder:", error);
      res.status(500).json({error: error.message});
    }
  });
});
// Función para guardar el pedido en Firestore y enviar los correos electrónicos
exports.confirmarCompra = functions.https.onRequest(async (req, res) => {
  // Manejo de pre-flight CORS (OPTIONS)
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.status(204).send("");
    return;
  }

  cors(req, res, async () => {
    try {
      const {pedido, clienteEmail} = req.body;
      if (!pedido || !clienteEmail) {
        return res.status(400).json({error: "Datos incompletos."});
      }

      // Guardar pedido en colección global 'orders'
      const pedidoDoc = await admin.firestore().collection("orders").add({
        ...pedido,
        clienteEmail,
        fecha: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (pedido.uid) {
        await admin.firestore()
            .collection(`users/${pedido.uid}/orders`)
            .doc(pedidoDoc.id)
            .set({
              ...pedido,
              clienteEmail,
              fecha: admin.firestore.FieldValue.serverTimestamp(),
            });
      }

      // Vaciar el carrito del usuario
      if (pedido.uid) {
        const userCartPath = `users/${pedido.uid}/cart`;
        const cartRef = admin.firestore().collection(userCartPath);
        const cartSnap = await cartRef.get();
        const batch = admin.firestore().batch();
        cartSnap.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }

      // Emails are handled by onOrderChange trigger

      res.json({success: true});
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error en confirmarCompra:", error);
      res.status(500).json({error: "No se pudo procesar la confirmación."});
    }
  });
});

// 3. Configuración del cliente de Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_TOKEN,
});

/**
 * Detecta si un producto individual corresponde a Consola (Nintendo/PlayStation) o Streaming.
 * @param {Object} item Producto a analizar
 * @return {string|boolean} Tipo de consola/streaming o false
 */
function isConsoleOrStreamingItem(item) {
  if (!item) return false;
  const nom = (item.name || item.title || item.nombre || "").toLowerCase();
  const plat = (item.plataforma || item.platform || "").toLowerCase();
  const cat = (item.categoryName || item.category || item.categoria || item.categoriaNombre || "").toLowerCase();
  const catId = (item.categoryId || "").toLowerCase();

  // Nintendo Switch
  if (
    item.switchCompat ||
    plat.includes("switch") ||
    plat.includes("nintendo") ||
    cat.includes("switch") ||
    cat.includes("nintendo") ||
    catId.includes("switch") ||
    catId.includes("nintendo") ||
    nom.includes("nintendo switch") ||
    nom.includes("switch 2")
  ) {
    return "nintendo";
  }

  // PlayStation
  if (
    item.pricePrimariaCLP ||
    item.priceSecundariaCLP ||
    plat.includes("playstation") ||
    plat.includes("ps4") ||
    plat.includes("ps5") ||
    cat.includes("playstation") ||
    cat.includes("ps4") ||
    cat.includes("ps5") ||
    catId.includes("playstation") ||
    catId.includes("ps4") ||
    catId.includes("ps5") ||
    nom.includes("cuenta primaria") ||
    nom.includes("cuenta secundaria")
  ) {
    return "playstation";
  }

  // Streaming / Cuentas
  if (
    plat.includes("streaming") ||
    plat.includes("cuenta") ||
    cat.includes("streaming") ||
    cat.includes("cuentas") ||
    catId.includes("streaming") ||
    nom.includes("netflix") ||
    nom.includes("disney") ||
    nom.includes("spotify") ||
    nom.includes("crunchyroll") ||
    nom.includes("streaming") ||
    nom.includes("hbo") ||
    nom.includes("max ")
  ) {
    return "streaming";
  }

  return false;
}

/**
 * Detecta la plataforma general del pedido para aislar Steam de consolas y streaming.
 * @param {Object} pedido Pedido a analizar
 * @return {Object} Objeto con platformKey, platformLabel e isSteam
 */
function detectOrderPlatform(pedido) {
  if (!pedido) return {platformKey: "steam", platformLabel: "PC / Steam", isSteam: true};

  const rawPlat = (pedido.plataforma || pedido.platform || "").trim().toLowerCase();
  const prods = Array.isArray(pedido.productos) ? pedido.productos : (Array.isArray(pedido.cart) ? pedido.cart : []);

  if (rawPlat.includes("switch") || rawPlat.includes("nintendo")) {
    return {platformKey: "nintendo", platformLabel: "Nintendo Switch", isSteam: false};
  }
  if (rawPlat.includes("playstation") || rawPlat.includes("ps4") || rawPlat.includes("ps5")) {
    return {platformKey: "playstation", platformLabel: "PlayStation (PS4/PS5)", isSteam: false};
  }
  if (rawPlat.includes("streaming") || rawPlat.includes("cuenta")) {
    return {platformKey: "streaming", platformLabel: "Streaming / Cuentas", isSteam: false};
  }

  let hasNintendo = false;
  let hasPlayStation = false;
  let hasStreaming = false;

  for (const item of prods) {
    const t = isConsoleOrStreamingItem(item);
    if (t === "nintendo") hasNintendo = true;
    else if (t === "playstation") hasPlayStation = true;
    else if (t === "streaming") hasStreaming = true;
  }

  if (hasNintendo) return {platformKey: "nintendo", platformLabel: "Nintendo Switch", isSteam: false};
  if (hasPlayStation) return {platformKey: "playstation", platformLabel: "PlayStation (PS4/PS5)", isSteam: false};
  if (hasStreaming) return {platformKey: "streaming", platformLabel: "Streaming / Cuentas", isSteam: false};

  return {platformKey: "steam", platformLabel: "PC / Steam", isSteam: true};
}

/**
 * Envía una notificación instantánea al bot de Telegram del administrador
 * con los datos del pedido y la clave generada SOLO si es Steam y pago verificado.
 * @param {Object} params Parámetros del pedido y clave
 * @return {Promise<void>}
 */
async function sendTelegramAdminNotification({orderId, pedido, key = null, juegosList = [], tipo = "COMPRA"}) {
  try {
    const telegramToken = process.env.TELEGRAM_TOKEN;
    const adminChatId = process.env.ADMIN_ID;
    if (!telegramToken || !adminChatId) return;

    const platInfo = detectOrderPlatform(pedido);
    const clienteNombre = pedido.nombre || pedido.firstName || "Cliente";
    const clienteEmail = pedido.email || pedido.clienteEmail || "Sin correo";
    const clientePhone = pedido.phone || "Sin teléfono";
    const metodoPago = pedido.metodoPago || "Manual";
    const total = pedido.totalLocal || pedido.totalCLP || pedido.total || 0;
    const moneda = pedido.monedaLocal || pedido.moneda || "CLP";

    const prods = Array.isArray(pedido.productos) ? pedido.productos : (Array.isArray(pedido.cart) ? pedido.cart : []);
    const prodsTxt = prods.map((p) => {
      const nom = p.name || p.title || p.nombre || "Producto";
      const cant = p.cantidad || p.quantity || 1;
      let extra = "";
      if (Array.isArray(p.promoGames) && p.promoGames.length > 0) {
        extra = `\n    └ 🎮 ${p.promoGames.map((g) => g.name || g).join(", ")}`;
      } else if (Array.isArray(p.games) && p.games.length > 0) {
        extra = `\n    └ 🎮 ${p.games.map((g) => typeof g === "string" ? g : g.name).join(", ")}`;
      }
      return `• <b>${nom}</b> x${cant}${extra}`;
    }).join("\n");

    const encabezado = tipo === "ENTREGA_KEY" ?
      `🔑 <b>¡CLAVE STEAM GENERADA Y ASIGNADA!</b> (Pedido #${orderId})` :
      tipo === "PAGO_CONFIRMADO" ?
        `✅ <b>¡PAGO CONFIRMADO EXITOSO!</b> (Pedido #${orderId})` :
        `🛒 <b>¡NUEVA SOLICITUD DE COMPRA!</b> (Pedido #${orderId})`;

    let msg = `${encabezado}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🎮 <b>Plataforma:</b> <b>${platInfo.platformLabel}</b>\n`;
    msg += `👤 <b>Cliente:</b> ${clienteNombre}\n`;
    msg += `📧 <b>Email:</b> ${clienteEmail}\n`;
    if (clientePhone && clientePhone !== "Sin teléfono") {
      msg += `📱 <b>Teléfono:</b> ${clientePhone}\n`;
    }
    msg += `💳 <b>Método:</b> ${metodoPago}\n`;
    msg += `💰 <b>Total:</b> ${moneda} ${total}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📦 <b>Productos:</b>\n${prodsTxt || "Sin detalle"}\n`;

    if (platInfo.platformKey === "nintendo") {
      msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `🔴 <b>GESTIÓN NINTENDO SWITCH:</b>\n`;
      msg += `📲 Coordinar instalación por WhatsApp con el cliente.\n`;
      msg += `📖 Guía de instalación: https://pandastoreupdate.web.app/instalacion-nintendo\n`;
      msg += `🚫 <i>(NO requiere Launcher ni Clave Steam)</i>\n`;
    } else if (platInfo.platformKey === "playstation") {
      msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `🔵 <b>GESTIÓN PLAYSTATION:</b>\n`;
      msg += `📲 Coordinar cuenta (Primaria/Secundaria) por WhatsApp.\n`;
      msg += `📖 Guía de instalación: https://pandastoreupdate.web.app/instalacion-playstation\n`;
      msg += `🚫 <i>(NO requiere Launcher ni Clave Steam)</i>\n`;
    } else if (platInfo.platformKey === "streaming") {
      msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `🟣 <b>GESTIÓN STREAMING:</b>\n`;
      msg += `📲 Entregar datos de la cuenta por WhatsApp.\n`;
      msg += `🚫 <i>(NO requiere Launcher ni Clave Steam)</i>\n`;
    } else {
      // Steam
      if (key) {
        msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `🔑 <b>CLAVE STEAM LAUNCHER GENERADA:</b>\n`;
        msg += `<code>${key}</code>\n`;
        if (Array.isArray(juegosList) && juegosList.length > 0) {
          const juegosNombres = juegosList.slice(0, 10).map((j) => `  • ${j.name || j}`).join("\n");
          msg += `🎮 <b>Juegos autorizados (${juegosList.length}):</b>\n${juegosNombres}${juegosList.length > 10 ? "\n  ... y más" : ""}\n`;
        }
        msg += `✨ <i>(El cliente ya puede activarla en PandaStore Launcher)</i>\n`;
      } else {
        const esManual = ["transferencia", "prex", "crypto"].includes(pedido.metodoPago);
        if (esManual) {
          msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
          msg += `⏳ <b>CLAVE STEAM PROTEGIDA:</b>\n`;
          msg += `<i>Pago pendiente de verificación. La clave se creará automáticamente cuando confirmes el pago en el panel.</i>\n`;
        }
      }
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🌐 <i>PandaStore 2.0</i>`;

    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        chat_id: adminChatId,
        text: msg,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("[sendTelegramAdminNotification] Error:", err);
  }
}

/**
 * Detecta si un pedido incluye juegos o packs de Steam,
 * genera la clave PANDA-XXXX-YYYY en Firestore 'licenses'
 * y envía el correo con la clave, juegos incluidos y el link al Launcher con tutorial.
 * @param {object} pedido - Datos del pedido
 * @param {string} orderId - ID del documento del pedido en 'orders'
 * @return {Promise<string|null>} Clave generada o null si no aplica
 */
/**
 * Helper dedicado para enviar el correo con la Clave, Juegos y Tutorial de Steam
 */
async function sendLicenseDeliveryEmail({ clientEmail, nombre, key, steamGamesList, orderId }) {
  if (!clientEmail) return;
  try {
    const keySubject = `PandaStore: Tu Clave de Acceso para Steam está lista (Pedido #${orderId})`;
    const keyPlainText = `¡Hola ${nombre || "Gamer"}!\n\nTu pago ha sido verificado con éxito (Pedido #${orderId}).\n\n🔑 TU CLAVE DE ACTIVACIÓN STEAM:\n${key}\n\nJuegos autorizados:\n${steamGamesList.map((j) => "  • " + (j.name || j)).join("\n")}\n\nDescarga el PandaStore Launcher oficial y mira el video tutorial:\nhttps://pandastoreupdate.web.app/descargar-launcher\n\nPasos rápidos:\n1. Descarga e instala el Launcher.\n2. Inicia sesión o ábrelo y pega tu Clave: ${key}\n3. Selecciona tu juego y haz clic en Jugar.\n\n¿Dudas o consultas? Contáctanos por WhatsApp: https://wa.me/56974751810\n\n© ${new Date().getFullYear()} PandaStore Oficial`;

    await transporter.sendMail({
      from: EMAIL_FROM_PANDA,
      to: clientEmail,
      replyTo: EMAIL_REPLY_TO,
      subject: keySubject,
      text: keyPlainText,
      html: templates.htmlEntregaKeySteam({
        nombre: nombre || "Gamer",
        key: key,
        juegosList: steamGamesList,
        orderId: orderId,
      }),
      headers: {
        "X-Entity-Ref-ID": `ps-key-${orderId}-${Date.now()}`,
        "Auto-Submitted": "auto-generated",
      },
    });
    console.log(`[sendLicenseDeliveryEmail] Correo con clave enviado exitosamente a ${clientEmail}`);
  } catch (mailErr) {
    console.error(`[sendLicenseDeliveryEmail] Error al enviar correo a ${clientEmail}:`, mailErr);
  }
}

/**
 * Función robusta para generar y entregar la Clave PandaStore Launcher / Steam.
 * Si el pedido contiene juegos de Steam (individuales, packs, sagas, randoms o pase VIP):
 * genera la clave PANDA-XXXX-YYYY en Firestore 'licenses'
 * y envía el correo con la clave, juegos incluidos y el link al Launcher con tutorial.
 * @param {object} pedido - Datos del pedido
 * @param {string} orderId - ID del documento del pedido en 'orders'
 * @param {object} options - Opciones adicionales (forceApproved, forceSendEmail)
 * @return {Promise<string|null>} Clave generada o null si no aplica
 */
async function generatePandaLicenseAndSendEmail(pedido, orderId, options = {}) {
  try {
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();
    const orderData = orderSnap.exists ? orderSnap.data() : pedido;

    // 1. VERIFICAR QUE LA PLATAFORMA SEA STEAM
    const platInfo = detectOrderPlatform(orderData);
    if (!platInfo.isSteam) {
      console.log(`[generatePandaLicense] Pedido #${orderId} es de plataforma ${platInfo.platformLabel}. No requiere clave Steam.`);
      return null;
    }

    // 2. VERIFICAR QUE EL PAGO ESTÉ APROBADO / EXITOSO
    const esManual = ["transferencia", "prex", "crypto"].includes(orderData.metodoPago);
    const estado = orderData.transferenciaEstado || orderData.estado || orderData.status;
    const esAprobado = Boolean(options.forceApproved) || (estado === "exitoso" || estado === "approved" || estado === "completado") || (!esManual && Boolean(orderData.metodoPago));

    if (!esAprobado) {
      console.log(`[generatePandaLicense] Pedido #${orderId} no está confirmado (Método: ${orderData.metodoPago}, Estado: ${estado}). Omitiendo clave hasta confirmación.`);
      return null;
    }

    const productos = orderData.productos || orderData.cart || [];
    if (!Array.isArray(productos) || productos.length === 0) {
      return null;
    }

    const steamGamesList = [];
    const allowedGames = [];
    const allowedDlcs = [];
    let isFullCatalog = false;

    for (const item of productos) {
      // Descartar de manera estricta si el producto es consola o streaming
      if (isConsoleOrStreamingItem(item)) {
        continue;
      }

      const name = (item.name || item.title || "").trim();
      const cleanName = name.toLowerCase();
      const plataforma = (item.plataforma || item.platform || "").toLowerCase();
      const catName = (item.categoryName || item.category || item.categoria || "").toLowerCase();
      const catId = (item.categoryId || "").toLowerCase();
      const tags = Array.isArray(item.tags) ? item.tags.map((t) => String(t).toLowerCase()) : [];

      let appId = item.app_id || item.appId || item.steamAppId || null;
      if (!appId && item.id) {
        const m = String(item.id).match(/^(?:ryuu_|vip-|promo-steam-)?(\d+)$/);
        if (m) appId = m[1];
      }
      if (!appId) {
        appId = resolveSteamAppId(name, item.id);
      }

      // Pack completo Steam / Panda Pass / Random masivos
      const isAllAccessPack = (
        cleanName.includes("todos los juegos") ||
        cleanName.includes("catálogo completo") ||
        cleanName.includes("catalogo completo") ||
        cleanName.includes("suscripción steam") ||
        cleanName.includes("suscripcion steam") ||
        cleanName.includes("panda pass") ||
        cleanName.includes("steam vip (+1.500") ||
        cleanName.includes("pack todo steam") ||
        cleanName.includes("pack 100") ||
        cleanName.includes("pack 200") ||
        cleanName.includes("pack 300") ||
        cleanName.includes("pack 400") ||
        (cleanName.includes("pack steam") && !cleanName.match(/pack\s*(?:3|5|10|23)x?\b/i) && !cleanName.includes("(")) ||
        Boolean(item.isFullAccess) ||
        Boolean(item.isSteamPass) ||
        Boolean(item.isRandomPack)
      );

      if (isAllAccessPack) {
        isFullCatalog = true;
        steamGamesList.push({name: name || "Pack Todo Steam (+69.000 Juegos)", appId: null});
        continue;
      }

      // Identificar si es Saga de Steam
      const isSaga = Boolean(
          item.isSaga ||
          cleanName.includes("saga") ||
          (item.id && String(item.id).startsWith("promo-saga-")) ||
          (item.key && String(item.key).startsWith("promo-saga-")),
      );

      // Identificar si es un Pack / Promo armable a elección
      const isPack = Boolean(
          item.isPromo ||
          item.isCustomPack ||
          (Array.isArray(item.promoGames) && item.promoGames.length > 0) ||
          (Array.isArray(item.juegos) && item.juegos.length > 0) ||
          (item.id && (String(item.id).startsWith("promo-") || String(item.id).startsWith("custom-pack-"))) ||
          cleanName.includes("pack ") ||
          cleanName.startsWith("pack") ||
          cleanName.match(/\b\d+x\b/i) ||
          cleanName.includes("elección") ||
          cleanName.includes("eleccion"),
      );

      // Es un juego o pack de Steam legítimo
      const isSteam = (
        Boolean(appId) ||
        isSaga ||
        isPack ||
        Boolean(item.isSteam) ||
        plataforma.includes("steam") ||
        catName.includes("steam") ||
        catId.includes("steam") ||
        tags.includes("steam") ||
        (item.id && (String(item.id).startsWith("vip-") || String(item.id).startsWith("ryuu_") || String(item.id).startsWith("promo-"))) ||
        cleanName.includes("steam")
      );

      if (!isSteam) {
        continue;
      }

      // Extraer DLCs seleccionados en el item base
      const dlcsArr = Array.isArray(item.selectedDlcs) && item.selectedDlcs.length > 0 ?
        item.selectedDlcs :
        (Array.isArray(item.dlcs) ? item.dlcs : []);
      for (const d of dlcsArr) {
        const did = d.dlc_app_id || d.app_id || d.id || d.appId;
        const numId = did ? String(did).match(/\d+/)?.[0] : null;
        if (numId) allowedDlcs.push(String(numId));
      }
      // Si el cliente compró DLCs y tenemos el appId del juego, agregar appId a allowedDlcs
      if (dlcsArr.length > 0 && appId) {
        allowedDlcs.push(String(appId));
      }

      // Si es un juego INDIVIDUAL normal (ni Saga ni Pack), agregamos el nombre base y appId
      if (!isSaga && !isPack) {
        steamGamesList.push({name: name, appId: appId});
        if (appId) allowedGames.push(String(appId));
        if (name) allowedGames.push(name);
      }

      // Si es una Saga de Steam
      if (isSaga) {
        let sagaGames = [];
        if (Array.isArray(item.games) && item.games.length > 0) {
          sagaGames = item.games;
        } else {
          const cleanSagaName = cleanName.replace(/\(.*?\)/g, "").replace(/colecci[oó]n/g, "").trim();
          const foundSaga = sagasCatalog.find((s) =>
            (item.id && s.key === item.id) ||
            (item.key && s.key === item.key) ||
            (s.name && cleanName.includes(s.name.toLowerCase())) ||
            (s.name && cleanSagaName && s.name.toLowerCase().includes(cleanSagaName)),
          );
          if (foundSaga && Array.isArray(foundSaga.games)) {
            sagaGames = foundSaga.games;
          }
        }

        if (sagaGames.length > 0) {
          for (const g of sagaGames) {
            const gName = (typeof g === "string" ? g : (g.name || "")).trim();
            const gAppId = resolveSteamAppId(gName, typeof g === "object" ? (g.app_id || g.appId || g.id) : null);
            if (gName) {
              steamGamesList.push({name: gName, appId: gAppId});
              if (gAppId) allowedGames.push(String(gAppId));
              allowedGames.push(gName);
            }
          }
        } else {
          steamGamesList.push({name: name, appId: appId});
          if (appId) allowedGames.push(String(appId));
          allowedGames.push(name);
        }

        // Extras VIP seleccionados de la saga
        const extras = Array.isArray(item.selectedVipExtras) && item.selectedVipExtras.length > 0 ?
          item.selectedVipExtras :
          (Array.isArray(item.vipExtras) ? item.vipExtras : []);
        for (const ex of extras) {
          const exName = (ex.name || ex.title || (typeof ex === "string" ? ex : "")).trim();
          const exAppId = resolveSteamAppId(exName, typeof ex === "object" ? (ex.app_id || ex.appId || ex.id) : null);
          if (exName) {
            steamGamesList.push({name: `${exName} (Extra VIP)`, appId: exAppId});
            if (exAppId) allowedGames.push(String(exAppId));
            allowedGames.push(exName);
          }
        }
      } else if (isPack) {
        // Si es un Pack con juegos seleccionados (Pack 3X, Pack 10X, Pack 23X, VIP, Custom Pack)
        let subGames = [];

        if (Array.isArray(item.promoGames) && item.promoGames.length > 0) {
          subGames = item.promoGames;
        } else if (Array.isArray(item.juegos) && item.juegos.length > 0) {
          subGames = item.juegos;
        } else if (Array.isArray(item.games) && item.games.length > 0) {
          subGames = item.games;
        } else if (Array.isArray(item.selectedGames) && item.selectedGames.length > 0) {
          subGames = item.selectedGames;
        } else if (item.id && String(item.id).startsWith("custom-pack-")) {
          const packDocId = String(item.id).replace("custom-pack-", "");
          try {
            const pSnap = await db.collection("customPacks").doc(packDocId).get();
            if (pSnap.exists && Array.isArray(pSnap.data().juegos)) {
              subGames = pSnap.data().juegos;
            }
          } catch (err) {
            console.warn(`[generatePandaLicense] No se pudo leer customPacks/${packDocId}:`, err);
          }
        }

        // Fallback: extraer juegos listados entre paréntesis en el nombre o descripción
        if (subGames.length === 0) {
          const sourceStr = `${name} ${item.description || ""}`;
          const parenMatch = sourceStr.match(/\(([^)]+)\)/);
          if (parenMatch && parenMatch[1].includes("+")) {
            const gameTitles = parenMatch[1].split("+").map((s) => s.trim()).filter(Boolean);
            subGames = gameTitles.map((t) => ({name: t}));
          }
        }

        for (const pg of subGames) {
          const pgName = (typeof pg === "string" ? pg : (pg.name || pg.title || "")).trim();
          let pgAppId = typeof pg === "object" ? (pg.app_id || pg.appId || null) : null;
          if (!pgAppId && typeof pg === "object" && pg.id) {
            const m = String(pg.id).match(/^(?:ryuu_|vip-|promo-steam-)?(\d+)$/);
            if (m) pgAppId = m[1];
          }
          if (!pgAppId && pgName) {
            pgAppId = resolveSteamAppId(pgName);
          }

          if (pgName) {
            steamGamesList.push({name: pgName, appId: pgAppId});
            if (pgAppId) allowedGames.push(String(pgAppId));
            allowedGames.push(pgName);
          }

          const pgDlcs = typeof pg === "object" && Array.isArray(pg.selectedDlcs) ?
            pg.selectedDlcs :
            (typeof pg === "object" && Array.isArray(pg.dlcs) ? pg.dlcs : []);
          for (const d of pgDlcs) {
            const did = d.dlc_app_id || d.app_id || d.id || d.appId;
            const numId = did ? String(did).match(/\d+/)?.[0] : null;
            if (numId) allowedDlcs.push(String(numId));
          }
          if (pgDlcs.length > 0 && pgAppId) {
            allowedDlcs.push(String(pgAppId));
          }
        }
      }
    }

    if (steamGamesList.length === 0 && !isFullCatalog) {
      console.log(`[generatePandaLicense] Pedido #${orderId} no contiene juegos de Steam.`);
      return null;
    }

    const finalAllowedGames = isFullCatalog ? ["*"] : Array.from(new Set(allowedGames.filter(Boolean)));
    const finalAllowedDlcs = isFullCatalog ? ["*"] : Array.from(new Set(allowedDlcs.filter(Boolean)));
    const clientEmail = (orderData.email || "").trim().toLowerCase();
    const nowStr = new Date().toISOString();

    // ── GESTIÓN DE CLAVE PREEXISTENTE (Auto-reparar AppIDs y Enviar Correo si falta) ──
    if (orderData.licenseKey) {
      const existingKey = orderData.licenseKey;
      console.log(`[generatePandaLicense] Pedido #${orderId} ya tiene clave asignada: ${existingKey}`);

      // Auto-reparar documento de licencia en Firestore para asegurar que contenga los AppIDs numéricos
      try {
        const licDocRef = db.collection("licenses").doc(existingKey);
        const licSnap = await licDocRef.get();
        if (licSnap.exists) {
          const licData = licSnap.data();
          const currentAllowed = Array.isArray(licData.allowed_games) ? licData.allowed_games : [];
          const mergedGames = Array.from(new Set([...currentAllowed, ...finalAllowedGames]));
          const currentDlcs = Array.isArray(licData.allowed_dlcs) ? licData.allowed_dlcs : [];
          const mergedDlcs = Array.from(new Set([...currentDlcs, ...finalAllowedDlcs]));

          await licDocRef.set({
            allowed_games: mergedGames,
            allowed_dlcs: mergedDlcs,
            status: "active",
            updatedAt: nowStr,
          }, {merge: true});
        }
      } catch (patchErr) {
        console.warn(`[generatePandaLicense] No se pudo auto-reparar licencia ${existingKey}:`, patchErr);
      }

      // Enviar correo si no se había enviado o si se solicita expresamente
      if (!orderData.licenseDeliveredAt || options.forceSendEmail) {
        if (clientEmail) {
          await sendLicenseDeliveryEmail({
            clientEmail,
            nombre: orderData.nombre || "Gamer",
            key: existingKey,
            steamGamesList: steamGamesList.length > 0 ? steamGamesList : [{name: "Juegos Steam", appId: null}],
            orderId,
          });

          await orderRef.set({
            licenseDeliveredAt: nowStr,
          }, {merge: true}).catch(() => {});

          if (orderData.uid && orderData.uid !== "guest") {
            await db.collection(`users/${orderData.uid}/orders`).doc(orderId).set({
              licenseDeliveredAt: nowStr,
            }, {merge: true}).catch(() => {});
          }
        }
      }

      return existingKey;
    }

    // ── GENERACIÓN DE NUEVA CLAVE ÚNICA PANDA-XXXX-YYYY ──
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let key = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 15) {
      attempts++;
      let part1 = "";
      let part2 = "";
      for (let i = 0; i < 4; i++) {
        part1 += chars.charAt(Math.floor(Math.random() * chars.length));
        part2 += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      key = `PANDA-${part1}-${part2}`;
      const snap = await db.collection("licenses").doc(key).get();
      if (!snap.exists) {
        isUnique = true;
      }
    }

    const licenseData = {
      key: key,
      client_email: clientEmail,
      license_type: "permanent",
      is_trial: false,
      trial_minutes: 15,
      expiry_date: null,
      hwid: null,
      status: "active",
      allowed_games: finalAllowedGames,
      allowed_dlcs: finalAllowedDlcs,
      orderId: orderId,
      createdAt: nowStr,
      deliveredAt: nowStr,
      activatedAt: null,
      last_seen: null,
      updatedAt: nowStr,
    };

    await db.collection("licenses").doc(key).set(licenseData);
    console.log(`[generatePandaLicense] Licencia ${key} creada para ${clientEmail} (Pedido #${orderId})`);

    // Actualizar pedido
    await orderRef.set({
      licenseKey: key,
      licenseDeliveredAt: nowStr,
    }, {merge: true}).catch(() => {});

    if (orderData.uid && orderData.uid !== "guest") {
      await db.collection(`users/${orderData.uid}/orders`).doc(orderId).set({
        licenseKey: key,
        licenseDeliveredAt: nowStr,
      }, {merge: true}).catch(() => {});
    }

    // Notificar inmediatamente al bot de Telegram del administrador
    try {
      await sendTelegramAdminNotification({
        orderId,
        pedido: orderData,
        key,
        juegosList: steamGamesList,
        tipo: "ENTREGA_KEY",
      });
    } catch (tgErr) {
      console.error("[generatePandaLicense] Error notificando a Telegram:", tgErr);
    }

    // Enviar correo con la Clave, Juegos y Tutorial al Cliente
    if (clientEmail) {
      await sendLicenseDeliveryEmail({
        clientEmail,
        nombre: orderData.nombre || "Gamer",
        key,
        steamGamesList,
        orderId,
      });
    }

    return key;
  } catch (err) {
    console.error(`[generatePandaLicense] Error generando clave para pedido #${orderId}:`, err);
    return null;
  }
}

/**
 * Helper para mover el pedido de 'pendiente' a 'confirmado', vaciar el carrito
 * y enviar correos electrónicos. Esta lógica es llamada de forma SEGURA
 * solo por el Webhook de Mercado Pago.
 * @param {object} pendingOrder - El objeto de pedido guardado previamente.
 * @param {string} orderId - El external_reference ID.
 */
async function processApprovedOrder(pendingOrder, orderId) {
  const {
    cart,
    email,
    uid,
    total,
    shipping,
    firstName,
    lastName,
    metodoPago,
    moneda,
    paypalOrderId,
  } = pendingOrder;
  // Estructura flexible según método de pago
  const pedido = {
    productos: cart,
    total,
    moneda: moneda || (metodoPago === "mercadopago" ? "CLP" : "USD"),
    metodoPago: metodoPago || "mercadopago",
    email,
    nombre: ((firstName || "") + " " + (lastName || "")).trim(),
    fecha: new Date().toISOString(),
    uid: uid || null,
    shipping: shipping || {},
    status: "approved",
    estado: "exitoso",
    transferenciaEstado: "exitoso",
    ...(metodoPago === "paypal" ?
      {paypalOrderId: paypalOrderId || orderId} :
      {mpExternalReference: orderId}),
  };
  // 1. Guardar pedido en colección global 'orders'
  const confirmedOrderRef = await db.collection("orders").add(pedido);

  // Generar y entregar clave Steam inmediatamente si aplica
  await generatePandaLicenseAndSendEmail(pedido, confirmedOrderRef.id);

  // 2. Guardar pedido en colección del usuario (si hay uid)
  if (uid) {
    await db.collection(`users/${uid}/orders`).doc(confirmedOrderRef.id).set({
      ...pedido,
      globalOrderId: confirmedOrderRef.id,
    });

    // 3. Vaciar el carrito del usuario
    const cartRef = db.collection(`users/${uid}/cart`);
    const cartSnap = await cartRef.get();
    const batch = db.batch();
    cartSnap.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  // 5. Eliminar el pedido pendiente
  await db.collection("pendingOrders").doc(orderId).delete();
}


// Función para crear la preferencia de pago en Mercado Pago (Preference)
exports.createMercadoPagoPreference = functions.https.onRequest((req, res) => {
  // Configuración de CORS
  cors(req, res, async () => {
    try {
      const {cart, email, uid, total, firstName, lastName, shipping} = req.body;
      if (!cart || cart.length === 0 || !email || !total) {
        return res.status(400).json({
          error:
            "Datos de pedido incompletos (carrito, email, o total faltante).",
        });
      }

      const items = cart.map((prod) => ({
        id:
          prod.id ||
          prod.productId ||
          `item_${Math.floor(Math.random() * 10000)}`,
        title: prod.name,
        description: prod.description || prod.name,
        category_id: prod.category_id || "others",
        quantity: prod.quantity || 1, // Asegura que la cantidad sea correcta
        currency_id: "CLP",
        unit_price: parseFloat(prod.precio),
      }));

      // Generar un ID único para la referencia externa
      const externalReference =
        `order_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

      // 1. Guardar el pedido en una colección temporal/pendiente en Firestore
      await db.collection("pendingOrders").doc(externalReference).set({
        cart,
        email,
        uid: uid || null,
        total,
        shipping: shipping || {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const notificationUrl =
        "https://us-central1-pandastoreupdate.cloudfunctions.net" +
        "/mercadoPagoWebhook";

      const preferenceRequest = {
        body: {
          items,
          payer: {
            email,
            first_name: firstName || "",
            last_name: lastName || "",
          },
          back_urls: {
            success: "https://pandastoreupdate.web.app/confirmacion-exitosa",
            failure: "https://pandastoreupdate.web.app/failure",
            pending: "https://pandastoreupdate.web.app/pending",
          },
          auto_return: "approved",
          statement_descriptor: "PandaStore",
          notification_url: notificationUrl,
          external_reference: externalReference,
          // Puedes agregar envíos aquí si es necesario
        },
      };

      const preference = new Preference(client);
      const response = await preference.create(preferenceRequest);

      res.json({
        id: response.id,
        init_point: response.init_point,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
          "Error al crear preferencia de Mercado Pago:",
          error,
      );
      res.status(500).json({
        error: "No se pudo crear la preferencia de pago.",
      });
    }
  });
});


// Webhook para MercadoPago (Seguro y Manejo de estado)
exports.mercadoPagoWebhook = functions.https.onRequest(async (req, res) => {
  res.status(200).send("OK");

  try {
    const topic = req.body.topic || req.query.topic;
    const resourceId = req.body.data?.id || req.query.id;

    if (!topic || !resourceId) {
      return console.log(
          "Webhook: Topic o Resource ID faltante.",
          req.body,
          req.query,
      );
    }

    console.log(`Webhook recibido: Topic=${topic}, ID=${resourceId}`);

    if (topic === "payment") {
      const paymentClient = new Payment(client);
      const payment = await paymentClient.get({id: parseInt(resourceId)});
      const status = payment.status;
      const orderId = payment.external_reference;

      console.log(
          `Pago ID ${resourceId} verificado. Status: ${status}. ` +
          `External Ref: ${orderId}`,
      );

      if (status === "approved" && orderId) {
        // Buscar el pedido pendiente en Firestore
        const pendingOrderDoc = await db.collection("pendingOrders")
            .doc(orderId)
            .get();

        if (pendingOrderDoc.exists) {
          const pendingOrder = pendingOrderDoc.data();
          await processApprovedOrder(pendingOrder, orderId);
          console.log(
              `Pedido ${orderId} confirmado y procesado exitosamente.`,
          );
        } else {
          console.log(
              `ERROR: Pedido pendiente con external_reference ` +
              `${orderId} no encontrado.`,
          );
        }
      }
    } else if (topic === "merchant_order") {
      console.log(
          "Ignorando topic 'merchant_order'. " +
          "Enfocado en 'payment'.",
      );
    } else {
      console.log(`Webhook: Topic desconocido: ${topic}`);
    }
  } catch (error) {
    console.error(
        "Error al procesar el Webhook de Mercado Pago:",
        error,
    );
  }
});

// Cloud Function para enviar correos automáticos cuando se crea o actualiza un pedido
const functionsV1 = require("firebase-functions/v1");

const isAdministrativeRole = (role) =>
  ["admin", "super_admin", "superadmin"].includes(role);

// Mantiene el claim de Storage sincronizado con el rol real. Si un admin
// revoca un rol, también se retira el permiso de subida y se invalidan las
// sesiones renovables de esa cuenta.
exports.syncStorageAdminClaimOnRoleChange = functionsV1.firestore
    .document("users/{userId}")
    .onWrite(async (change, context) => {
      const previousRole = change.before.exists ? change.before.data().role : null;
      const currentRole = change.after.exists ? change.after.data().role : null;
      const wasAdmin = isAdministrativeRole(previousRole);
      const isAdmin = isAdministrativeRole(currentRole);
      if (wasAdmin === isAdmin) return null;

      const account = await admin.auth().getUser(context.params.userId);
      const claims = {...(account.customClaims || {})};
      if (isAdmin) {
        claims.pandaStorageAdmin = true;
      } else {
        delete claims.pandaStorageAdmin;
      }
      await admin.auth().setCustomUserClaims(context.params.userId, claims);
      if (!isAdmin) {
        await admin.auth().revokeRefreshTokens(context.params.userId);
      }
      return null;
    });

exports.onOrderChange = functionsV1.firestore
    .document("orders/{orderId}")
    .onWrite(async (change, context) => {
      // Si el pedido fue eliminado, no hacemos nada
      if (!change.after.exists) return null;

      const pedidoBefore = change.before.exists ? change.before.data() : null;
      const pedido = change.after.data();
      const orderId = context.params.orderId;
      const clienteEmail = pedido.email;

      // Modo silencioso: no enviar correos ni Telegram
      if (pedido.silencioso) {
        console.log(`[onOrderChange] Pedido #${orderId} marcado como silencioso, omitiendo correos y Telegram.`);
        return null;
      }

      // Verificar si es nuevo o si cambió el estado a exitoso
      const isNew = !change.before.exists;
      const estadoAnterior = pedidoBefore ? (pedidoBefore.transferenciaEstado || pedidoBefore.estado || pedidoBefore.status) : null;
      const estadoActual = pedido.transferenciaEstado || pedido.estado || pedido.status;

      const isExitosoAnterior = (estadoAnterior === "exitoso" || estadoAnterior === "approved" || estadoAnterior === "completado");
      const isExitosoActual = (estadoActual === "exitoso" || estadoActual === "approved" || estadoActual === "completado");

      const changedToExitoso = (!isExitosoAnterior && isExitosoActual);

      // Solo enviar notificaciones en la creación o cuando el pago se aprueba
      if (!isNew && !changedToExitoso) {
        return null;
      }

      console.log(`[onOrderChange] orderId: ${orderId}, isNew: ${isNew}, changedToExitoso: ${changedToExitoso}`);

      const esManual = ["transferencia", "prex", "crypto"].includes(pedido.metodoPago);
      const esConfirmado = isExitosoActual || (!esManual && Boolean(pedido.metodoPago));

      // Construir línea de total con moneda local si aplica
      const monedaLocal = pedido.monedaLocal || pedido.moneda || "";
      const totalLocal = pedido.totalLocal ?? pedido.total ?? "";
      const totalCLP = pedido.totalCLP ?? pedido.total ?? "";
      let totalLine = "";
      if (monedaLocal && monedaLocal !== "CLP") {
        const clpStr = Math.round(Number(totalCLP)).toLocaleString("es-CL");
        totalLine = `Total: ${monedaLocal} ${totalLocal} (≈ CLP $${clpStr})`;
      } else {
        const clpNum = Math.round(Number(totalLocal || totalCLP));
        totalLine = `Total: CLP $${clpNum.toLocaleString("es-CL")}`;
      }

      // Construir lista de productos
      let productosTxt = "";
      const prods = Array.isArray(pedido.productos) ? pedido.productos : (Array.isArray(pedido.cart) ? pedido.cart : []);
      if (prods.length > 0) {
        productosTxt = prods
            .map((p) => {
              const nombre = p.name || p.title || p.nombre || "Producto";
              const cantidad = p.cantidad || p.quantity || 1;
              return `  - ${nombre} x${cantidad}`;
            })
            .join("\\n");
      }

      const metodoPagoLabel = {
        transferencia: "Transferencia bancaria",
        prex: "Prex",
        crypto: "Crypto (USDT)",
        paypal: "PayPal",
        mercadopago: "Tarjeta crédito/débito",
      }[pedido.metodoPago] || pedido.metodoPago;

      // ── Correo al ADMIN ──
      if (isNew || changedToExitoso) {
        const adminSubject = esConfirmado ?
          `✅ PEDIDO APROBADO #${orderId} — ${metodoPagoLabel}` :
          `🛒 NUEVO PEDIDO PENDIENTE #${orderId} — ${metodoPagoLabel}`;

        const adminText = esConfirmado ?
          `✅ PEDIDO APROBADO\n\n` +
            `Pedido #: ${orderId}\n` +
            `Cliente: ${pedido.nombre || pedido.email || "Invitado"}\n` +
            `Email: ${clienteEmail}\n` +
            `País: ${pedido.pais || "CL"}\n` +
            `${totalLine}\n` +
            `Método de pago: ${metodoPagoLabel}\n\n` +
            `Productos:\n${productosTxt}` :
          `🛒 NUEVO PEDIDO PENDIENTE\n\n` +
            `Pedido #: ${orderId}\n` +
            `Cliente: ${pedido.nombre || pedido.email || "Invitado"}\n` +
            `Email: ${clienteEmail}\n` +
            `País: ${pedido.pais || "CL"}\n` +
            `${totalLine}\n` +
            `Método de pago: ${metodoPagoLabel}\n\n` +
            `Productos:\n${productosTxt}\n\n` +
            `Revisa el panel de administración para verificar el comprobante y aprobar el pedido.`;

        try {
          await transporter.sendMail({
            from: EMAIL_FROM_PANDA,
            to: ADMIN_EMAIL,
            replyTo: EMAIL_REPLY_TO,
            subject: adminSubject,
            text: adminText,
            html: templates.htmlAdminNotificacion(adminSubject, adminText),
          });
        } catch (emailErr) {
          console.error("Error enviando correo admin:", emailErr);
        }
      }

      let keyGenerada = null;
      // ── Correo al CLIENTE ──
      if (clienteEmail) {
        // Solo generar clave de Steam si el pago está plenamente confirmado
        if (esConfirmado) {
          try {
            keyGenerada = await generatePandaLicenseAndSendEmail(pedido, orderId);
          } catch (licErr) {
            console.error(`[onOrderChange] Error generando clave para #${orderId}:`, licErr);
          }
        }

        // Si se generó la clave de Steam, el correo específico (htmlEntregaKeySteam) ya fue enviado por generatePandaLicenseAndSendEmail.
        // Si NO fue compra de Steam (Nintendo/PlayStation/Streaming) o el pago sigue pendiente, enviar el correo general correspondiente:
        if (!keyGenerada) {
          const clienteSubject = esConfirmado ?
            `PandaStore: ¡Tu pago ha sido verificado! Pedido #${orderId}` :
            `PandaStore: Recibimos tu solicitud de compra (Pedido #${orderId})`;

          const htmlToUse = esConfirmado ?
            templates.htmlConfirmacionCompra(pedido.nombre || "", orderId, totalLine, metodoPagoLabel, productosTxt) :
            templates.htmlPedidoPendiente(pedido.nombre || "", orderId, totalLine, metodoPagoLabel, productosTxt);

          const plainToUse = esConfirmado ?
            `Hola ${pedido.nombre || "Gamer"},\n\n¡Gracias por tu compra en PandaStore! Tu pago ha sido verificado correctamente.\n\nNº de Pedido: #${orderId}\nMétodo de pago: ${metodoPagoLabel}\n${totalLine}\n\nProductos:\n${productosTxt}\n\nSi compraste juegos para Nintendo Switch, PlayStation o Streaming, contáctanos a nuestro WhatsApp para coordinar la entrega o instalación inmediata.\n\nSoporte WhatsApp: https://wa.me/56974751810\n© ${new Date().getFullYear()} PandaStore` :
            `Hola ${pedido.nombre || "Gamer"},\n\nHemos recibido tu solicitud de compra (Pedido #${orderId}).\n\nMétodo de pago: ${metodoPagoLabel}\n${totalLine}\n\nProductos:\n${productosTxt}\n\nRecuerda enviar el comprobante de pago por WhatsApp o a nuestro correo para poder activar tu compra lo antes posible.\n\nSoporte WhatsApp: https://wa.me/56974751810\n© ${new Date().getFullYear()} PandaStore`;

          try {
            await transporter.sendMail({
              from: EMAIL_FROM_PANDA,
              to: clienteEmail,
              replyTo: EMAIL_REPLY_TO,
              subject: clienteSubject,
              text: plainToUse,
              html: htmlToUse,
              headers: {
                "X-Entity-Ref-ID": `ps-order-${orderId}-${Date.now()}`,
                "Auto-Submitted": "auto-generated",
              },
            });
          } catch (emailErr) {
            console.error("Error enviando correo cliente:", emailErr);
          }
        }
      }

      // Notificar al bot de Telegram del administrador (solo si no fue notificado ya por generatePandaLicenseAndSendEmail)
      if (!keyGenerada) {
        try {
          await sendTelegramAdminNotification({
            orderId,
            pedido,
            key: null,
            tipo: esConfirmado ? "PAGO_CONFIRMADO" : "NUEVO_PEDIDO",
          });
        } catch (tgErr) {
          console.error("[onOrderChange] Error notificando Telegram:", tgErr);
        }
      }

      return null;
    });

// Endpoint HTTP para generar y enviar la clave manualmente desde el panel de admin si fuese necesario
exports.entregarKeyPedido = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      return res.status(405).json({error: "Método no permitido"});
    }

    const user = await requireRequestUser(req, res, true);
    if (!user) return;

    const {orderId} = req.body;
    if (!orderId) {
      return res.status(400).json({error: "Falta orderId"});
    }

    try {
      const orderDoc = await db.collection("orders").doc(orderId).get();
      if (!orderDoc.exists) {
        return res.status(404).json({error: "Pedido no encontrado"});
      }

      const pedido = orderDoc.data();
      const platInfo = detectOrderPlatform(pedido);
      if (!platInfo.isSteam) {
        return res.status(400).json({
          success: false,
          message: `Este pedido es de ${platInfo.platformLabel}. No utiliza claves de PandaStore Launcher / Steam.`,
        });
      }

      const key = await generatePandaLicenseAndSendEmail(pedido, orderId, {
        forceApproved: true,
        forceSendEmail: true,
      });

      // Asegurar que si la transferencia estaba pendiente, quede actualizada
      if (pedido.metodoPago === "transferencia" && pedido.transferenciaEstado !== "exitoso") {
        await db.collection("orders").doc(orderId).set({
          transferenciaEstado: "exitoso",
          estado: "completado",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});
      }

      return res.status(200).json({
        success: true,
        licenseKey: key,
        message: key ? `Clave ${key} generada y enviada al cliente.` : "El pedido no contiene juegos de Steam o se procesó.",
      });
    } catch (error) {
      console.error("Error en entregarKeyPedido:", error);
      return res.status(500).json({error: error.message || error.toString()});
    }
  });
});


// ── Enviar correo promocional masivo (solo admins) ──────────────────────
/* eslint-disable max-len */
exports.enviarCorreoPromocional = functions.https.onRequest(
    async (req, res) => {
      if (req.method === "OPTIONS") {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.status(204).send("");
        return;
      }

      cors(req, res, async () => {
        try {
          const authHeader = req.headers.authorization || "";
          const idToken = authHeader.startsWith("Bearer ") ?
          authHeader.slice(7) :
          null;
          if (!idToken) {
            return res.status(401).json({error: "No autorizado"});
          }

          const decoded = await admin.auth().verifyIdToken(idToken);
          const adminDoc = await db
              .collection("users")
              .doc(decoded.uid)
              .get();
          if (!adminDoc.exists || adminDoc.data().role !== "admin") {
            return res.status(403).json({error: "Acceso denegado"});
          }

          const {asunto, htmlBody, destinatarios} = req.body;
          if (
            !asunto ||
          !htmlBody ||
          !Array.isArray(destinatarios) ||
          destinatarios.length === 0
          ) {
            return res.status(400).json({
              error: "Faltan datos: asunto, htmlBody y destinatarios[]",
            });
          }

          const year = new Date().getFullYear();
          const emailPromo = `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${asunto}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080511; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #080511; width: 100%;">
    <tr>
      <td align="center" style="padding: 24px 12px 36px 12px;">

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #120b22; border-radius: 16px; overflow: hidden; border: 1px solid #2d184d;">

          <!-- Top Gradient Accent -->
          <tr>
            <td height="5" style="background-color: #ec4899; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header with Circular White Logo Badge -->
          <tr>
            <td align="center" style="background-color: #1a0f33; padding: 30px 20px 24px 20px; border-bottom: 1px solid #2e1a54;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; background-color: #ffffff; border-radius: 50%; border: 3px solid #a855f7;">
                <tr>
                  <td align="center" valign="middle" width="76" height="76" style="background-color: #ffffff; border-radius: 50%; padding: 4px;">
                    <img src="https://pandastoreupdate.web.app/miicono.png" alt="PandaStore Logo" width="68" height="68" style="display: block; width: 68px; height: 68px; border-radius: 50%; border: 0;" />
                  </td>
                </tr>
              </table>
              <h1 style="margin: 12px 0 2px 0; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: 2px; text-transform: uppercase;">
                PandaStore
              </h1>
              <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; color: #c084fc; text-transform: uppercase; letter-spacing: 2px;">
                Tienda Digital Oficial de Videojuegos
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 26px 24px 14px 24px; background-color: #120b22; color: #f1f5f9; font-size: 15px; line-height: 1.6;">
              ${htmlBody}

              <!-- SECCIÓN CATEGORÍAS CON LOGOS REALES -->
              <div style="margin: 32px 0 10px 0; text-align: center;">
                <p style="margin: 0 0 16px 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: bold; color: #a78bfa; text-transform: uppercase; letter-spacing: 1.5px;">
                  Explora las categorías más buscadas
                </p>

                <!-- Grid Categorías con logos oficiales -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="50%" align="center" style="padding: 6px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1a0f33; border: 1px solid #3b226e; border-radius: 12px;">
                        <tr>
                          <td align="center" style="padding: 16px 10px;">
                            <a href="https://pandastoreupdate.web.app/categoria/nintendo-switch" target="_blank" style="text-decoration: none; display: block;">
                              <img src="https://img.icons8.com/color/48/nintendo-switch.png" width="36" height="36" alt="Nintendo Switch" style="display: block; margin: 0 auto 8px auto; border: 0;" />
                              <span style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; display: block;">Nintendo Switch</span>
                              <span style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: #ec4899; display: block; margin-top: 4px;">Ver Juegos →</span>
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td width="50%" align="center" style="padding: 6px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1a0f33; border: 1px solid #3b226e; border-radius: 12px;">
                        <tr>
                          <td align="center" style="padding: 16px 10px;">
                            <a href="https://pandastoreupdate.web.app/categoria/playstation" target="_blank" style="text-decoration: none; display: block;">
                              <img src="https://img.icons8.com/color/48/play-station.png" width="36" height="36" alt="PlayStation" style="display: block; margin: 0 auto 8px auto; border: 0;" />
                              <span style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; display: block;">PlayStation 5 & 4</span>
                              <span style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: #60a5fa; display: block; margin-top: 4px;">Ver Catálogo →</span>
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" align="center" style="padding: 6px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1a0f33; border: 1px solid #3b226e; border-radius: 12px;">
                        <tr>
                          <td align="center" style="padding: 16px 10px;">
                            <a href="https://pandastoreupdate.web.app/categoria/steam" target="_blank" style="text-decoration: none; display: block;">
                              <img src="https://img.icons8.com/color/48/steam.png" width="36" height="36" alt="Steam PC" style="display: block; margin: 0 auto 8px auto; border: 0;" />
                              <span style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; display: block;">Steam PC</span>
                              <span style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: #34d399; display: block; margin-top: 4px;">Ver Ofertas →</span>
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td width="50%" align="center" style="padding: 6px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1a0f33; border: 1px solid #3b226e; border-radius: 12px;">
                        <tr>
                          <td align="center" style="padding: 16px 10px;">
                            <a href="https://pandastoreupdate.web.app/packs-nintendo" target="_blank" style="text-decoration: none; display: block;">
                              <img src="https://img.icons8.com/color/48/fire-element.png" width="36" height="36" alt="Packs & Sagas" style="display: block; margin: 0 auto 8px auto; border: 0;" />
                              <span style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; display: block;">Packs & Sagas</span>
                              <span style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: #fbbf24; display: block; margin-top: 4px;">Ver Promos →</span>
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA BUTTON: VER CATÁLOGO COMPLETO -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0 16px 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; background-color: #7b2ff2; border-radius: 12px;">
                      <tr>
                        <td align="center" bgcolor="#7b2ff2" style="border-radius: 12px; background-color: #7b2ff2;">
                          <a href="https://pandastoreupdate.web.app/home" target="_blank" rel="noopener noreferrer" style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 15px 36px; border-radius: 12px; display: inline-block; background-color: #7b2ff2; letter-spacing: 0.5px;">
                            🛒 Ver Catálogo Completo de la Tienda →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Trust Pillars -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 22px 0 10px 0; border-top: 1px solid #231640; padding-top: 16px;">
                <tr>
                  <td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #94a3b8;">
                    ⚡ Activación Rápida &nbsp;•&nbsp; 🛡️ Garantía Total &nbsp;•&nbsp; 💬 Soporte Gamer 24/7
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer with Real Social Media Links -->
          <tr>
            <td align="center" style="background-color: #0b0714; padding: 26px 20px; border-top: 1px solid #231640;">
              <p style="margin: 0 0 14px 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: #a855f7; text-transform: uppercase; letter-spacing: 1.5px;">
                ¿Tienes dudas o necesitas ayuda? Contáctanos:
              </p>
              
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 6px;">
                    <a href="https://wa.me/56974751810" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block; padding: 8px 14px; background-color: #1e293b; border-radius: 8px; border: 1px solid #334155;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td valign="middle" style="padding-right: 6px;">
                            <img src="https://img.icons8.com/color/48/whatsapp--v1.png" width="20" height="20" alt="WhatsApp" style="display: block; border: 0;" />
                          </td>
                          <td valign="middle" style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: #22c55e;">
                            WhatsApp
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                  <td style="padding: 0 6px;">
                    <a href="https://t.me/NintendoChile2" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block; padding: 8px 14px; background-color: #1e293b; border-radius: 8px; border: 1px solid #334155;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td valign="middle" style="padding-right: 6px;">
                            <img src="https://img.icons8.com/color/48/telegram-app.png" width="20" height="20" alt="Telegram" style="display: block; border: 0;" />
                          </td>
                          <td valign="middle" style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: #38bdf8;">
                            Telegram
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px; border-top: 1px solid #1a102b; padding-top: 14px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #64748b;">
                      © ${year} PandaStore. Todos los derechos reservados.
                    </p>
                    <p style="margin: 4px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #475569;">
                      Recibes este correo porque eres un cliente registrado de PandaStore.
                    </p>
                    <p style="margin: 8px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #64748b;">
                      Si prefieres no recibir más promociones o novedades, puedes 
                      <a href="{{UNSUB_URL}}" target="_blank" style="color: #c084fc; text-decoration: underline;">darte de baja aquí</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bottom Accent Bar -->
          <tr>
            <td height="5" style="background-color: #ec4899; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;

          // Obtener lista de desuscritos para nunca enviarles spam
          let unsubsSet = new Set();
          try {
            const unsubsSnap = await db.collection("unsubscribedEmails").get();
            unsubsSet = new Set(unsubsSnap.docs.map((d) => d.id.toLowerCase()));
          } catch (unsubErr) {
            console.warn("No se pudo cargar unsubscribedEmails:", unsubErr);
          }

          const errores = [];
          let enviados = 0;
          for (const item of destinatarios) {
            const rawEmail = typeof item === "string" ? item : (item.email || "");
            const email = (rawEmail || "").trim().toLowerCase();
            const rawNombre = (typeof item === "object" && item.nombre) ? item.nombre : "";
            const nombre = rawNombre && rawNombre.trim() ? rawNombre.trim() : "Cliente PandaStore";
            if (!email || unsubsSet.has(email)) continue;

            const unsubUrl = `https://us-central1-pandastoreupdate.cloudfunctions.net/desuscribirCorreo?email=${encodeURIComponent(email)}`;
            const finalSubject = (asunto || "")
                .replace(/{{nombre}}/gi, nombre)
                .replace(/{{name}}/gi, nombre);
            const finalHtml = emailPromo
                .replace(/{{nombre}}/gi, nombre)
                .replace(/{{name}}/gi, nombre)
                .replace(/{{UNSUB_URL}}/g, unsubUrl);
            const plainText = `${finalSubject}\n\nHola ${nombre},\n\n¡Muchas gracias por tu preferencia en PandaStore!\n\nPor favor déjanos tu opinión o reseña aquí:\nhttps://pandastoreupdate.web.app/testimonios\n\nExplora nuestro catálogo oficial:\nhttps://pandastoreupdate.web.app/home\n\nWhatsApp: https://wa.me/56974751810\nTelegram: https://t.me/NintendoChile2\n\nPara cancelar tu suscripción a correos promocionales:\n${unsubUrl}\n\n© ${year} PandaStore Oficial`;

            try {
              await transporter.sendMail({
                from: EMAIL_FROM_PANDA,
                to: email,
                replyTo: EMAIL_REPLY_TO,
                subject: finalSubject,
                text: plainText,
                html: finalHtml,
                headers: {
                  "X-Entity-Ref-ID": `ps-camp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  "List-Unsubscribe": `<${unsubUrl}>, <mailto:${process.env.GMAIL_USER}?subject=Desuscribir%20${encodeURIComponent(email)}>`,
                  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                  "Precedence": "bulk",
                  "X-Auto-Response-Suppress": "OOF, AutoReply",
                },
              });
              enviados++;
            } catch (mailErr) {
              console.error(`Error enviando a ${email}:`, mailErr);
              errores.push(email);
            }

            // Pausa de 500ms entre envíos para proteger la reputación de Gmail SMTP y evitar spam burst
            if (destinatarios.length > 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }

          await db.collection("emailCampaigns").add({
            asunto,
            enviados,
            errores,
            total: destinatarios.length,
            fecha: admin.firestore.FieldValue.serverTimestamp(),
            adminUid: decoded.uid,
          });

          res.json({success: true, enviados, errores});
        } catch (error) {
          console.error("Error en enviarCorreoPromocional:", error);
          res.status(500).json({error: error.message});
        }
      });
    },
);
/* eslint-enable max-len */

// Endpoint para enviar correos de prueba de plantillas
exports.enviarCorreosDePrueba = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      res.status(204).send(""); return;
    }

    // Si es GET se rechaza, queremos body
    if (req.method !== "POST") {
      return res.status(405).json({error: "Método no permitido"});
    }

    const user = await requireRequestUser(req, res, true);
    if (!user) return;

    try {
      const emailDestino = "joseroberto999999@gmail.com";
      const {tipo} = req.body;

      if (!tipo) {
        return res.status(400).json({error: "Falta el tipo de plantilla"});
      }

      let subject = "";
      let htmlContent = "";

      switch (tipo) {
        case "confirmacion":
          subject = "[PRUEBA] Confirmación de compra exitosa";
          htmlContent = templates.htmlConfirmacionCompra("Jose (Prueba)", "TEST-123", "Total: CLP $45.990", "MercadoPago", "Mario Kart 8 Deluxe x1\\nZelda BOTW x1");
          break;
        case "pendiente":
          subject = "[PRUEBA] Tu pedido está pendiente";
          htmlContent = templates.htmlPedidoPendiente("Jose (Prueba)", "TEST-456", "Total: CLP $15.000", "Transferencia", "Juego C x1");
          break;
        case "soporte_cliente":
          subject = "[PRUEBA] Respuesta de soporte";
          htmlContent = templates.htmlRespuestaSoporte("Hola Jose, esto es una respuesta de prueba simulando la contestación a un ticket tuyo. ¡Saludos!");
          break;
        case "admin_pedido":
          subject = "[PRUEBA] ¡NUEVO PEDIDO RECIBIDO! - TEST-123";
          htmlContent = templates.htmlAdminNotificacion("¡Nuevo Pedido Recibido!", "Se ha registrado un nuevo pedido por CLP $45.990.\\n\\nJuegos:\\nMario Kart 8 Deluxe x1\\nZelda BOTW x1\\n\\nMétodo: MercadoPago");
          break;
        case "admin_ticket":
          subject = "[PRUEBA] NUEVO TICKET DE SOPORTE - Asunto de prueba";
          htmlContent = templates.htmlNuevoTicketAdmin("Cliente de Prueba", "cliente@ejemplo.com", "Tengo un problema con mi compra, me ayudan por favor?");
          break;
        default:
          return res.status(400).json({error: "Tipo de plantilla desconocido"});
      }

      await transporter.sendMail({
        from: EMAIL_FROM_PANDA,
        to: emailDestino,
        replyTo: EMAIL_REPLY_TO,
        subject: subject,
        text: `Prueba de plantilla PandaStore: ${subject}\n\nEste es un correo de prueba generado desde el panel de administración.\n\n© ${new Date().getFullYear()} PandaStore`,
        html: htmlContent,
      });

      res.status(200).json({success: true});
    } catch (error) {
      console.error("Error enviando prueba de plantilla:", error);
      res.status(500).json({error: "Error interno: " + error.message});
    }
  });
});

// Endpoint para obtener las vistas previas en HTML de las plantillas
exports.obtenerVistasPreviasHTML = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    if (req.method === "OPTIONS") {
      res.status(204).send(""); return;
    }

    if (req.method !== "GET") {
      return res.status(405).json({error: "Método no permitido"});
    }

    try {
      const htmlConfirmacion = templates.htmlConfirmacionCompra("Jose (Prueba)", "TEST-123", "Total: CLP $45.990", "MercadoPago", "Mario Kart 8 Deluxe x1\\nZelda BOTW x1");
      const htmlPendiente = templates.htmlPedidoPendiente("Jose (Prueba)", "TEST-456", "Total: CLP $15.000", "Transferencia", "Juego C x1");
      const htmlSoporte = templates.htmlRespuestaSoporte("Hola Jose, esto es una respuesta de prueba simulando la contestación a un ticket tuyo. ¡Saludos!");
      const htmlAdminPedido = templates.htmlAdminNotificacion("¡Nuevo Pedido Recibido!", "Se ha registrado un nuevo pedido por CLP $45.990.\\n\\nJuegos:\\nMario Kart 8 Deluxe x1\\nZelda BOTW x1\\n\\nMétodo: MercadoPago");
      const htmlAdminTicket = templates.htmlNuevoTicketAdmin("Cliente de Prueba", "cliente@ejemplo.com", "Tengo un problema con mi compra, me ayudan por favor?");

      res.status(200).json({
        success: true,
        templates: {
          confirmacion: htmlConfirmacion,
          pendiente: htmlPendiente,
          soporte_cliente: htmlSoporte,
          admin_pedido: htmlAdminPedido,
          admin_ticket: htmlAdminTicket,
        },
      });
    } catch (error) {
      console.error("Error generando HTML de prueba:", error);
      res.status(500).json({error: "Error interno: " + error.message});
    }
  });
});

// ── Desuscribir correo de listas promocionales (RFC 8058 One-Click + Enlace Web) ──
exports.desuscribirCorreo = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const email = (req.query.email || req.body?.email || "").trim().toLowerCase();
    if (email) {
      try {
        await db.collection("unsubscribedEmails").doc(email).set({
          email,
          fecha: admin.firestore.FieldValue.serverTimestamp(),
          source: req.method === "POST" ? "rfc8058_one_click" : "web_link",
        }, {merge: true});
        console.log(`[desuscribirCorreo] Email dado de baja: ${email} (${req.method})`);
      } catch (err) {
        console.error("[desuscribirCorreo] Error guardando baja:", err);
      }
    }

    if (req.method === "POST") {
      // Respuesta 200 OK para RFC 8058 One-Click de Gmail
      return res.status(200).send("Unsubscribed successfully");
    }

    // Respuesta visual para el usuario que hace clic en el enlace
    res.status(200).send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Suscripción Actualizada | PandaStore</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0d071a; color: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background-color: #170d2c; border: 1px solid #3b226e; border-radius: 16px; padding: 40px 32px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
    .icon { font-size: 52px; margin-bottom: 16px; }
    h1 { font-size: 22px; color: #ffffff; margin: 0 0 12px 0; font-weight: 800; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0; }
    .email-tag { background: #261647; color: #c084fc; padding: 4px 10px; border-radius: 6px; font-weight: bold; word-break: break-all; }
    .btn { display: inline-block; background: #a855f7; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; transition: background 0.2s; }
    .btn:hover { background: #9333ea; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Preferencia de correo actualizada</h1>
    <p>La dirección <span class="email-tag">${email || "tu correo"}</span> no recibirá más correos publicitarios ni promocionales de PandaStore.</p>
    <a href="https://pandastoreupdate.web.app" class="btn">Volver a la Tienda</a>
  </div>
</body>
</html>`);
  });
});

exports.dynamicSEO = require("./dynamicSEO").dynamicSEO;

// ── Webhook 24/7 para el Bot de Telegram de Panda Store ──
const telegramBotModule = require("./telegramBot");
exports.telegramBotWebhook = functions.https.onRequest(
    {timeoutSeconds: 540, memory: "512MiB"},
    (req, res) => {
      return telegramBotModule.handleTelegramWebhook(req, res);
    },
);

// ── Publicación Diaria a las 10:00 AM (Hora de Chile: America/Santiago) ──
exports.publicarCatalogosDiarios = functionsV1.pubsub
    .schedule("0 10 * * *")
    .timeZone("America/Santiago")
    .onRun(async () => {
      await telegramBotModule.publicarCatalogosDiarios();
      return null;
    });

// ── Borrado Diario a las 05:00 AM (Hora de Chile: America/Santiago) ──
exports.borrarCatalogosDiarios = functionsV1.pubsub
    .schedule("0 5 * * *")
    .timeZone("America/Santiago")
    .onRun(async () => {
      await telegramBotModule.borrarCatalogosDiarios();
      return null;
    });

// ── API Pública Catálogo Steam (Juegos, VIPs, Ubisoft, EA Sports, Sagas y Promos) ──
const steamCatalogModule = require("./steamCatalogApi");
exports.apiSteamCatalog = functions.https.onRequest((req, res) => {
  return steamCatalogModule.handleSteamCatalog(req, res);
});

