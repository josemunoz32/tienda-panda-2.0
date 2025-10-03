const functions = require("firebase-functions");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "joseroberto999999@gmail.com",
    pass: "jlsx fplo seqo fywp",
  },
});

exports.soporteResponder = functions.https.onRequest(async (req, res) => {
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
  const {email, respuesta} = req.body;
  if (!email || !respuesta) {
    res.set(corsHeaders);
    return res.status(400).send("Faltan datos");
  }

  await transporter.sendMail({
    from: "joseroberto999999@gmail.com",
    to: email,
    subject: "Respuesta a tu ticket de soporte",
    text: respuesta,
  });

  res.status(200).send("Respuesta enviada");
});
