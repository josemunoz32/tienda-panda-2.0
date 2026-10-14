import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
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
  console.log("=== INSPECTING LICENSES IN FIRESTORE ===");
  const licSnap = await getDocs(query(collection(db, "licenses"), limit(15)));
  licSnap.forEach(d => {
    const data = d.data();
    console.log(`License ID: ${d.id}, Key: ${data.key}`);
    console.log(" - allowed_games:", JSON.stringify(data.allowed_games));
    console.log(" - allowedAppIds:", JSON.stringify(data.allowedAppIds));
    console.log(" - allowed_app_ids:", JSON.stringify(data.allowed_app_ids));
    console.log(" - games:", JSON.stringify(data.games));
    console.log(" - allowed_dlcs:", JSON.stringify(data.allowed_dlcs));
    console.log(" - is_trial:", data.is_trial);
    console.log(" - status:", data.status);
    console.log("---");
  });

  console.log("\n=== INSPECTING DUPLICATES IN games & steamGames & products ===");
  const collectionsToCheck = ["games", "steamGames", "products"];
  for (const col of collectionsToCheck) {
    const snap = await getDocs(collection(db, col));
    const readyOrNotMatches = [];
    const mw3Matches = [];
    const nameMap = new Map();
    snap.forEach(d => {
      const data = d.data();
      const name = data.name || data.title || "";
      const lower = name.toLowerCase();
      if (lower.includes("ready or not")) {
        readyOrNotMatches.push({ id: d.id, name, appId: data.app_id || data.appId || d.id, technical: data.technical_category, price: data.priceCLP || data.price, fixDriveId: data.fix_drive_id });
      }
      if (lower.includes("modern warfare") || lower.includes("mw3") || lower.includes("call of duty")) {
        mw3Matches.push({ id: d.id, name, appId: data.app_id || data.appId || d.id, technical: data.technical_category, price: data.priceCLP || data.price, isDenuvo: data.isDenuvoActivation });
      }

      // Check duplicates
      const clean = lower.trim().replace(/[^a-z0-9]/g, "");
      if (clean) {
        if (!nameMap.has(clean)) nameMap.set(clean, []);
        nameMap.get(clean).push({ id: d.id, name, appId: data.app_id || data.appId, technical: data.technical_category });
      }
    });

    console.log(`\nCollection [${col}] has ${snap.size} total documents.`);
    console.log(`Ready or Not in [${col}]:`, readyOrNotMatches);
    console.log(`MW3 / COD in [${col}]:`, mw3Matches.slice(0, 5));

    const duplicates = Array.from(nameMap.entries()).filter(([k, list]) => list.length > 1);
    console.log(`Total duplicate game titles in [${col}]: ${duplicates.length}`);
    if (duplicates.length > 0) {
      console.log(`First 10 duplicate titles in [${col}]:`);
      duplicates.slice(0, 10).forEach(([k, list]) => {
        console.log(` - "${list[0].name}": ${list.length} copies (IDs: ${list.map(x => x.id).join(", ")})`);
      });
    }
  }
}

main().catch(console.error);
