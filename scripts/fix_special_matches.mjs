import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
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

async function fixSpecialMatches() {
  console.log("Vinculando parches con discrepancia de nombre...");

  // 1. AFOP -> Avatar Frontiers of Pandora (AppID: 2840770)
  await setDoc(doc(db, "games", "2840770"), {
    fix_drive_id: "https://gofile.io/d/G8wAPw2l"
  }, { merge: true });
  console.log("✔ Vinculado Fix AFOP -> Avatar Frontiers of Pandora (2840770)");

  // 2. RESIDENT EVIL requiem -> AppID: 3764200
  await setDoc(doc(db, "games", "3764200"), {
    fix_drive_id: "https://gofile.io/d/FCL4yT7L"
  }, { merge: true });
  console.log("✔ Vinculado Fix Resident Evil Requiem -> (3764200)");

  // 3. Sekiro -> AppID: 814380
  await setDoc(doc(db, "games", "814380"), {
    fix_drive_id: "https://gofile.io/d/cNrefM6f"
  }, { merge: true });
  console.log("✔ Vinculado Fix Sekiro -> Sekiro Shadows Die Twice (814380)");

  console.log("¡Correcciones completadas!");
  process.exit(0);
}

fixSpecialMatches();
