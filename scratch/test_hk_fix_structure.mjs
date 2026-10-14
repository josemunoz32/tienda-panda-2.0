import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf8");
const envVars = {};
envContent.split("\n").forEach(line => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join("=").trim();
  }
});

const firebaseConfig = {
  apiKey: envVars.REACT_APP_FIREBASE_API_KEY,
  authDomain: envVars.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: envVars.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.REACT_APP_FIREBASE_APP_ID,
  measurementId: envVars.REACT_APP_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testHollowKnightFix() {
  const snap = await getDocs(collection(db, "games"));
  const hkDoc = snap.docs.map(d => ({ id: d.id, ...d.data() })).find(g => (g.name || "").toLowerCase().includes("hollow knight"));

  console.log("Juego encontrado en Firestore:", hkDoc?.name);
  console.log("Fix Download URL:", hkDoc?.fix_download_url || hkDoc?.fix_drive_id);

  const url = hkDoc?.fix_download_url || hkDoc?.fix_drive_id;
  const tempZip = path.join(process.cwd(), "scratch/temp_hk.zip");
  const tempExtract = path.join(process.cwd(), "scratch/temp_hk_extract");

  console.log("Descargando zip desde GoFile...");
  execSync(`curl -sL "${url}" -H "Authorization: Bearer ZtkBWxSMe9wsPfJJGl8i6j77x6LgbwoQ" -o "${tempZip}"`);

  console.log("Contenido del zip descargado:");
  execSync(`powershell -Command "Expand-Archive -Path '${tempZip}' -DestinationPath '${tempExtract}' -Force"`);

  function listRecursive(dir, level = 0) {
    const files = fs.readdirSync(dir);
    files.forEach(f => {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      console.log(`${"  ".repeat(level)}${stat.isDirectory() ? "[DIR]" : "[FILE]"} ${f}`);
      if (stat.isDirectory()) listRecursive(full, level + 1);
    });
  }

  listRecursive(tempExtract);
  process.exit(0);
}

testHollowKnightFix();
