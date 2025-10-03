const functions = require("firebase-functions");
const nodemailer = require("nodemailer");

// Configura tu correo y contraseña de app (Gmail, Outlook, etc)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "joseroberto999999@gmail.com", // Cambia por tu correo
    pass: "jlsx fplo seqo fywp", // Usa contraseña de app, no la normal
  },
});

exports.soporte = functions.https.onRequest(async (req, res) => {
  // Headers CORS robustos
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "3600",
  };
  res.set(corsHeaders);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.set(corsHeaders);
    return res.status(405).send("Método no permitido");
  }
  const {nombre, email, mensaje} = req.body;
  if (!nombre || !email || !mensaje) {
    res.set(corsHeaders);
    return res.status(400).send("Faltan datos");
  }

  // Guardar ticket en Firestore
  const admin = require("firebase-admin");
  if (!admin.apps.length) admin.initializeApp();
  const db = admin.firestore();
  await db.collection("soporte").add({
    nombre,
    email,
    mensaje,
    respondido: false,
    fecha: new Date(),
  });

  // Enviar correo a admin
  await transporter.sendMail({
    from: "joseroberto999999@gmail.com",
    to: "joseroberto999999@gmail.com",
    subject: "Nuevo ticket de soporte",
    text:
      `Nombre: ${nombre}\nEmail: ${email}\nMensaje: ${mensaje}`,
  });

  res.status(200).send("Ticket recibido");
});
