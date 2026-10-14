const fetch = (...args) => import("node-fetch").then(({default: f}) => f(...args));

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "";
const PROJECT_ID = "pandastoreupdate";
const REGION = "us-central1"; // Región predeterminada de tus Cloud Functions
const WEBHOOK_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/telegramBotWebhook`;

async function configurarWebhook() {
  console.log("Configurando Webhook de Telegram hacia Firebase Cloud Functions...");
  console.log("URL:", WEBHOOK_URL);

  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${encodeURIComponent(WEBHOOK_URL)}&drop_pending_updates=true`;
  const res = await fetch(url);
  const data = await res.json();
  console.log("Respuesta de Telegram:", data);

  const infoUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getWebhookInfo`;
  const infoRes = await fetch(infoUrl);
  const infoData = await infoRes.json();
  console.log("Estado actual del Webhook:", infoData);
}

configurarWebhook();
