
require("dotenv").config();
const functions = require("firebase-functions");
const {MercadoPagoConfig, Preference, Payment} = require("mercadopago");
const nodemailer = require("nodemailer");
const paypal = require("@paypal/checkout-server-sdk");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});


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
      const isAdmin = req.query.admin === "1";
      let tickets = [];
      if (isAdmin) {
        const snap = await admin.firestore()
            .collection("soporte")
            .orderBy("fecha", "desc")
            .get();
        tickets = snap.docs.map((doc) => ({id: doc.id, ...doc.data()}));
      } else {
        const email = req.query.email;
        if (!email) {
          return res.status(400).json({error: "Falta email"});
        }
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
      const {ticketId, autor, texto} = req.body;
      if (!ticketId || !autor || !texto) {
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
      await ticketRef.collection("mensajes").add({
        autor,
        texto,
        fecha: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Notificar al admin igual que al crear ticket
      const ticketData = ticketDoc.data();
      try {
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: process.env.ADMIN_EMAIL,
          subject: `Nuevo mensaje en ticket de soporte`,
          text:
            `Nombre: ${ticketData.nombre || "(sin nombre)"}\n` +
            `Email: ${ticketData.email || "(sin email)"}\n` +
            `Mensaje: ${texto}`,
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
    const ticketId = req.query.ticketId;
    if (!ticketId) {
      return res.status(400).json({error: "Falta ticketId"});
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
    const {nombre, email, mensaje} = req.body;
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
      from: process.env.GMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: "Nuevo ticket de soporte",
      text:
        `Nombre: ${nombre}\nEmail: ${email}\nMensaje: ${mensaje}`,
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
    const {email, respuesta} = req.body;
    if (!email || !respuesta) {
      return res.status(400).json({error: "Faltan datos"});
    }
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Respuesta a tu ticket de soporte",
      text: respuesta,
    });
    res.status(200).json({success: true});
  });
});
const payPalClient = new paypal.core.PayPalHttpClient(
    new paypal.core.SandboxEnvironment(
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

      // Enviar correo al cliente
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: clienteEmail,
        subject: "Confirmación de compra",
        text: `¡Gracias por tu compra! Tu pedido ha sido recibido.`,
      });

      // Enviar correo al administrador
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: "Nuevo pedido recibido",
        text: `Se ha recibido un nuevo pedido de ${clienteEmail}.`,
      });

      res.json({success: true});
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error en confirmarCompra:", error);
      res.status(500).json({error: "No se pudo procesar la confirmación."});
    }
  });
});

// 1. Inicialización de Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// 2. Configuración del transporter de nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
    // Usa una "App Password" de Google
  },
});
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";

// 3. Configuración del cliente de Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_TOKEN,
});

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
    ...(metodoPago === "paypal" ?
      {paypalOrderId: paypalOrderId || orderId} :
      {mpExternalReference: orderId}),
  };
  // 1. Guardar pedido en colección global 'orders'
  const confirmedOrderRef = await db.collection("orders").add(pedido);

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

  // 4. Enviar correo al cliente
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject:
      `¡Tu compra en PandaStore ha sido confirmada! #${confirmedOrderRef.id}`,
    html:
      `<p>Hola,</p>
      <p>¡Gracias por tu compra! Tu pago ha sido aprobado y tu pedido 
      #${confirmedOrderRef.id} está en preparación.</p>
      <p>Te enviaremos los detalles de instalación.</p>
      <p><strong>Total:</strong> CLP ${total.toFixed(0)}</p>
      <p>Si tienes alguna duda, contáctanos.</p>
      `,
  });

  // 5. Enviar correo al administrador
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: ADMIN_EMAIL,
    subject:
      `NUEVO PEDIDO APROBADO: #${confirmedOrderRef.id}`,
    text:
      `Se ha recibido un nuevo pedido APROBADO de ${email}. ` +
      `Referencia MP: ${orderId}.`,
  });

  // 6. Eliminar el pedido pendiente
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

// Cloud Function para enviar correo de confirmación de transferencia exitosa
exports.sendConfirmationEmail = functions.https.onRequest(async (req, res) => {
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
      const {orderId, clienteEmail} = req.body;
      if (!orderId || !clienteEmail) {
        return res.status(400).json({error: "Faltan datos."});
      }

      // Buscar el pedido en la colección global 'orders'
      const orderDoc = await db.collection("orders").doc(orderId).get();
      if (!orderDoc.exists) {
        return res.status(404).json({error: "Pedido no encontrado."});
      }
      const pedido = orderDoc.data();
      console.log("[sendConfirmationEmail] metodoPago:", pedido.metodoPago);


      // Solo enviar correo al admin si es transferencia o cripto
      if (
        pedido.metodoPago === "transferencia" ||
        pedido.metodoPago === "crypto"
      ) {
        // Construir lista de productos
        let productosTxt = "";
        if (Array.isArray(pedido.productos)) {
          productosTxt = pedido.productos
              .map((p, i) => {
                const nombre = p.name || p.title || "Producto";
                const cantidad = p.cantidad || p.quantity || 1;
                const precio = p.precio || p.unit_price || "";
                const moneda = pedido.moneda || "";
                return (
                  `  - ${nombre} x${cantidad} (` +
                `${precio} ${moneda})`
                );
              })
              .join("\n");
        }
        const adminText =
          `Nuevo pedido pendiente:\n` +
          `Pedido #: ${orderId}\n` +
          `Cliente: ${pedido.email}\n` +
          `Nombre: ${pedido.nombre || ""}\n` +
          `Total: ${pedido.total} ${pedido.moneda || ""}\n` +
          `Método de pago: ${pedido.metodoPago}\n` +
          `Productos:\n${productosTxt}`;
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: ADMIN_EMAIL,
          subject: `NUEVO PEDIDO PENDIENTE: #${orderId}`,
          text: adminText,
        });
      }

      res.json({success: true});
    } catch (error) {
      console.error("Error en sendConfirmationEmail:", error);
      res.status(500).json({error: "No se pudo enviar el correo."});
    }
  });
});
