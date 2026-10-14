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

async function findDuplicates() {
  console.log("=== Checking games collection ===");
  const qGames = await getDocs(collection(db, "games"));
  const gamesByName = new Map();
  const gamesByAppId = new Map();

  qGames.forEach(d => {
    const data = d.data();
    const docId = d.id;
    const nameNorm = (data.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const appId = String(data.app_id || docId).trim();

    if (nameNorm.includes("readyornot") || appId === "1144200" || appId === "4224910") {
      console.log("Ready or Not match in games:", {
        docId,
        name: data.name,
        app_id: data.app_id,
        is_base_game: data.is_base_game,
        technical_category: data.technical_category
      });
    }

    if (!gamesByName.has(nameNorm)) gamesByName.set(nameNorm, []);
    gamesByName.get(nameNorm).push({ docId, appId, name: data.name, data });

    if (!gamesByAppId.has(appId)) gamesByAppId.set(appId, []);
    gamesByAppId.get(appId).push({ docId, name: data.name });
  });

  console.log("\nDuplicated names in games collection:");
  for (const [nameNorm, list] of gamesByName.entries()) {
    if (list.length > 1 && nameNorm.length > 3) {
      console.log(`- "${nameNorm}":`, list.map(x => `${x.docId} (${x.appId} - ${x.name})`).join(" vs "));
    }
  }

  console.log("\nDuplicated appIds in games collection:");
  for (const [appId, list] of gamesByAppId.entries()) {
    if (list.length > 1 && appId) {
      console.log(`- AppID ${appId}:`, list.map(x => `${x.docId} (${x.name})`).join(" vs "));
    }
  }

  console.log("\n=== Checking products collection for Ready or Not ===");
  const qProd = await getDocs(collection(db, "products"));
  qProd.forEach(d => {
    const data = d.data();
    const name = (data.name || '').toLowerCase();
    if (name.includes("ready or not")) {
      console.log("Ready or Not in products:", d.id, JSON.stringify({
        name: data.name,
        price: data.price,
        appId: data.appId,
        id: data.id,
        category: data.category
      }));
    }
  });
}

findDuplicates().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
