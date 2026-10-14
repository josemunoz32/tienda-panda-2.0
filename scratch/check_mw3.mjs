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
  appId: envVars.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkMW3() {
  console.log("Checking games collection...");
  const qGames = await getDocs(collection(db, "games"));
  qGames.forEach(d => {
    const data = d.data();
    if (data.name && data.name.toLowerCase().includes("modern warfare")) {
      console.log("Found in games:", d.id, JSON.stringify({
        name: data.name,
        app_id: data.app_id,
        is_base_game: data.is_base_game,
        technical_category: data.technical_category,
        lua_len: (data.lua_script || data.lua_content || "").length,
        manifest_count: (data.manifest_files || []).length
      }));
    }
  });

  console.log("\nChecking products collection...");
  const qProd = await getDocs(collection(db, "products"));
  qProd.forEach(d => {
    const data = d.data();
    if (data.name && data.name.toLowerCase().includes("modern warfare")) {
      console.log("Found in products:", d.id, JSON.stringify({
        name: data.name,
        appId: data.appId,
        id: data.id,
        price: data.price
      }));
    }
  });
}

checkMW3().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
