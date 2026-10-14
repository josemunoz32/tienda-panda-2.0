const path = require("path");
const fs = require("fs");
const admin = require(path.join(__dirname, "../functions/node_modules/firebase-admin"));
const serviceAccount = require(path.join(__dirname, "../botTele-main/botTele-main/firebase-key.json"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "pandastoreupdate.firebasestorage.app"
  });
}

const bucket = admin.storage().bucket();

async function run() {
  const filePath = path.join(__dirname, "../PandaStoreLauncher/Publish/PandaStoreSetup.exe");
  if (!fs.existsSync(filePath)) {
    throw new Error("File not found: " + filePath);
  }

  const destination = "downloads/PandaStoreSetup.exe";
  console.log(`Subiendo ${filePath} (${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB) a Firebase Storage: ${destination}...`);

  const [file] = await bucket.upload(filePath, {
    destination: destination,
    metadata: {
      contentType: "application/octet-stream",
      metadata: {
        firebaseStorageDownloadTokens: "pandastore-setup-v2430-token"
      }
    }
  });

  // Make public or generate URL
  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=pandastore-setup-v2430-token`;
  console.log("✅ Subido con éxito!");
  console.log("URL de descarga directa:", publicUrl);

  const db = admin.firestore();
  await db.collection("system_config").doc("launcher").set({
    latest_version: "2.4.32",
    download_url: publicUrl,
    changelog: "v2.4.32 - Detección universal de launchers y ejecutables modificados (Red Dead Redemption 2, GTA, fixes online y parches), ejecución directa y botón de jugar optimizado."
  }, { merge: true });

  console.log("✅ Firestore system_config/launcher actualizado con URL de Storage.");
  process.exit(0);
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
