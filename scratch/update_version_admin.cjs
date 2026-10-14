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
    latest_version: "2.4.29",
    download_url: "https://pandastoreupdate.web.app/downloads/PandaStoreSetup.exe",
    changelog: "v2.4.29 - Inyector de licencias y juegos activo 100% (xinput1_4 cargador nativo Steam 64-bit restaurado + patch anti-crash y auto-update desactivado)."
  }, { merge: true });

  console.log("✅ Firestore system_config/launcher actualizado a v2.4.29 exitosamente");
  process.exit(0);
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
