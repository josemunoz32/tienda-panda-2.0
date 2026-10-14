import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";

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

async function main() {
  console.log("=== CHECKING ALL 500 GAMES IN 'games' ===");
  const snap = await getDocs(collection(db, "games"));
  console.log(`Total in 'games': ${snap.size}`);

  const nameMap = new Map();
  const appIdMap = new Map();

  snap.forEach(d => {
    const data = d.data();
    const name = (data.name || "").trim();
    const appId = String(data.app_id || d.id).trim();

    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (clean) {
      if (!nameMap.has(clean)) nameMap.set(clean, []);
      nameMap.get(clean).push({ id: d.id, name, appId, technical: data.technical_category, fixDriveId: data.fix_drive_id });
    }

    if (appId) {
      if (!appIdMap.has(appId)) appIdMap.set(appId, []);
      appIdMap.get(appId).push({ id: d.id, name, appId, technical: data.technical_category });
    }
  });

  const dupNames = Array.from(nameMap.entries()).filter(([k, list]) => list.length > 1);
  const dupAppIds = Array.from(appIdMap.entries()).filter(([k, list]) => list.length > 1);

  console.log(`Duplicate names in 'games': ${dupNames.length}`);
  dupNames.forEach(([k, list]) => {
    console.log(` - Name "${list[0].name}" (${list.length} copies):`, list);
  });

  console.log(`Duplicate AppIds in 'games': ${dupAppIds.length}`);
  dupAppIds.forEach(([k, list]) => {
    console.log(` - AppId "${k}" (${list.length} copies):`, list);
  });
}

main().catch(console.error);
