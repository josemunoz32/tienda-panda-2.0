import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf8");
const envVars = {};
envContent.split("\n").forEach(line => {
  const parts = line.split("=");
  if (parts.length >= 2) envVars[parts[0].trim()] = parts.slice(1).join("=").trim();
});

const firebaseConfig = {
  apiKey: envVars.REACT_APP_FIREBASE_API_KEY,
  authDomain: envVars.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: envVars.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateLauncherVersion() {
  const docRef = doc(db, "system_config", "launcher");
  await setDoc(docRef, {
    latest_version: "2.4.13",
    download_url: "https://gofile.io/d/1j8704jj",
    changelog: "v2.4.13 - Sistema de Licencias Temporales / Modo Prueba 15 min, Purga y Revocación Remota Segura de Steam, y optimización de rendimiento."
  }, { merge: true });

  console.log("✅ Firestore system_config/launcher actualizado a v2.4.13 con enlace GoFile: https://gofile.io/d/1j8704jj");
  process.exit(0);
}

updateLauncherVersion();
