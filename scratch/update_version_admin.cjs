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
    latest_version: "2.4.28",
    download_url: "https://pandastoreupdate.web.app/downloads/PandaStoreSetup.exe",
    changelog: "v2.4.28 - Solución definitiva a compatibilidad con la nueva actualización de Steam de 64 bits (cierre inesperado al cargar/arrancar), eliminación de dependencias obsoletas e inyección limpia optimizada."
  }, { merge: true });

  console.log("✅ Firestore system_config/launcher actualizado a v2.4.28 exitosamente");
  process.exit(0);
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
