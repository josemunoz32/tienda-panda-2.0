import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";

const envContent = fs.readFileSync(".env", "utf8");
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

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateLauncher() {
  const docRef = doc(db, "system_config", "launcher");
  await setDoc(docRef, {
    latest_version: "2.4.16",
    download_url: "https://gofile.io/d/nqDSDpyo",
    changelog: "v2.4.16 - Eliminados Call of Duty Modern Warfare (2019/II/III), Black Ops 1, 2, 6 e Infinite Warfare. Catálogo ultra limpio."
  }, { merge: true });

  console.log("✅ Firestore system_config/launcher actualizado a v2.4.16 con enlace: https://gofile.io/d/nqDSDpyo");
  process.exit(0);
}

updateLauncher();
