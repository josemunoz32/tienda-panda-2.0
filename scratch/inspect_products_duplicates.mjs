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
  console.log("=== INSPECTING PRODUCTS COLLECTION ===");
  const prodSnap = await getDocs(collection(db, "products"));
  console.log(`Total products: ${prodSnap.size}`);

  const nameMap = new Map();
  const readyOrNotList = [];
  const mw3List = [];

  prodSnap.forEach(d => {
    const data = d.data();
    const name = data.name || data.title || "";
    const lower = name.toLowerCase();

    if (lower.includes("ready or not")) {
      readyOrNotList.push({ id: d.id, name, priceCLP: data.priceCLP, category: data.category, platform: data.plataforma || data.platform, appId: data.appId || data.app_id });
    }

    if (lower.includes("modern warfare") || lower.includes("mw3")) {
      mw3List.push({ id: d.id, name, priceCLP: data.priceCLP, category: data.category, platform: data.plataforma || data.platform, appId: data.appId || data.app_id });
    }

    const clean = lower.trim().replace(/[^a-z0-9]/g, "");
    if (clean) {
      if (!nameMap.has(clean)) nameMap.set(clean, []);
      nameMap.get(clean).push({ id: d.id, name, priceCLP: data.priceCLP, category: data.category, platform: data.plataforma || data.platform, appId: data.appId || data.app_id });
    }
  });

  console.log("\nReady or Not in products:", readyOrNotList);
  console.log("\nMW3 in products:", mw3List);

  const duplicates = Array.from(nameMap.entries()).filter(([k, list]) => list.length > 1);
  console.log(`\nTotal duplicate titles in products: ${duplicates.length}`);
  duplicates.forEach(([k, list]) => {
    console.log(`\nDuplicate: "${list[0].name}" (${list.length} copies):`);
    list.forEach(item => {
      console.log(`   - ID: ${item.id} | Name: "${item.name}" | Cat: ${item.category} | Plat: ${item.platform} | Price: ${item.priceCLP} | AppId: ${item.appId}`);
    });
  });
}

main().catch(console.error);
