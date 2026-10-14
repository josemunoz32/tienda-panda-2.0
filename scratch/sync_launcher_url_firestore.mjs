import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf8");
const envVars = {};
envContent.split("\n").forEach(line => {
  const parts = line.split("=");
  if (parts.length >= 2) envVars[parts[0].trim()] = parts.slice(1).join("=").trim();
});

const app = initializeApp({
  apiKey: envVars.REACT_APP_FIREBASE_API_KEY,
  authDomain: envVars.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: envVars.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.REACT_APP_FIREBASE_APP_ID
});
const db = getFirestore(app);

async function checkAndSync() {
  const newUrl = "https://gofile.io/d/9b0afc75-9ba2-4b8c-b46e-47378bb71adf";
  
  // Guardar en Firestore para consistencia de actualización remota si el launcher lo consulta
  await setDoc(doc(db, "system_settings", "launcher"), {
    download_url: newUrl,
    version: "2.4.15",
    updatedAt: new Date().toISOString()
  }, { merge: true });

  console.log("Firestore updated with new Launcher download link:", newUrl);
}

checkAndSync().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
