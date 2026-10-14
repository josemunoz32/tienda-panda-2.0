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
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// AppIDs exactas de las carpetas LUA locales en archivos_juego
const fixMappings = [
  { appId: "397540", name: "Borderlands 3", fixUrl: "https://gofile.io/d/9ynCEjZz" },
  { appId: "2054970", name: "Dragon's Dogma 2", fixUrl: "https://gofile.io/d/dragons_dogma_2" },
  { appId: "881020", name: "Granblue Fantasy Relink", fixUrl: "https://gofile.io/d/granblue_fantasy_relink" },
  { appId: "1627720", name: "Lies of P", fixUrl: "https://gofile.io/d/lies_of_p" },
  { appId: "1446780", name: "Monster Hunter Rise", fixUrl: "https://gofile.io/d/monster_hunter_rise" },
  { appId: "349040", name: "NARUTO SHIPPUDEN Ultimate Ninja STORM 4", fixUrl: "https://gofile.io/d/naruto_storm_4" },
  { appId: "1687950", name: "Persona 5 Royal", fixUrl: "https://gofile.io/d/persona_5_royal" },
  { appId: "1282100", name: "Remnant II", fixUrl: "https://gofile.io/d/remnant_2" },
  { appId: "1286680", name: "Tiny Tina's Wonderlands", fixUrl: "https://gofile.io/d/tiny_tinas_wonderlands" }
];

async function apply9Fixes() {
  console.log("=== VINCULANDO LOS 9 FIXES CON SUS APPIDS CORRECTAS DE LUA ===");
  for (const item of fixMappings) {
    const gameRef = doc(db, "games", item.appId);
    await setDoc(gameRef, {
      fix_drive_id: item.fixUrl,
      has_fix: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`✅ [AppID ${item.appId}] ${item.name} -> ${item.fixUrl}`);
  }
  console.log("==========================================");
  console.log("🎉 VINCULACIÓN COMPLETADA EXITOSAMENTE");
  console.log("==========================================");
  process.exit(0);
}

apply9Fixes();
