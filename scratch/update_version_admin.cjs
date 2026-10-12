const path = require("path");
const admin = require(path.join(__dirname, "../functions/node_modules/firebase-admin"));

const serviceAccount = require(path.join(__dirname, "../botTele-main/botTele-main/firebase-key.json"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  const docRef = db.collection("system_config").doc("launcher");
  await docRef.set({
    latest_version: "2.4.27",
    download_url: "https://pandastoreupdate.web.app/downloads/PandaStoreSetup.exe",
    changelog: "v2.4.27 - Blindaje de seguridad en segundo plano con cierre forzado de procesos antes de purgar, protección anti-atraso de reloj (Anti-Time-Travel), límite offline en pruebas, nuevo sistema 100% local de respaldos automáticos de partidas en la PC (Mis Partidas), y nuevas pestañas de filtrado con contador en tiempo real."
  }, { merge: true });

  console.log("✅ Firestore system_config/launcher actualizado a v2.4.27 exitosamente");
  process.exit(0);
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
