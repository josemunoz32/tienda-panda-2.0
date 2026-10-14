import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf8");
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

async function checkGames() {
  const snap = await getDocs(collection(db, "games"));
  console.log("Total docs en collection 'games':", snap.size);

  const filterRegex = /\b(open beta|closed beta|beta test|stress test|technical test|playtest|server test|pre-alpha|closed alpha|open alpha|alpha test|demo)\b|(-\s*multiplayer|\(multiplayer\)|\bmultiplayer\s*$|\bbeta\b)/i;
  const codMpIds = new Set(["10190", "42690", "42710", "202990", "209170", "209660", "393100", "47830", "476620"]);

  const foundBad = [];
  snap.forEach(d => {
    const data = d.data();
    const name = data.name || "";
    const appId = String(data.app_id || d.id);
    if (codMpIds.has(appId) || filterRegex.test(name)) {
      foundBad.push({ id: d.id, appId, name });
    }
  });

  console.log("Encontrados en Firestore que coinciden con betas/multiplayer/etc:", foundBad.length);
  foundBad.forEach(b => console.log(`  - [ID: ${b.id}, AppID: ${b.appId}] "${b.name}"`));

  process.exit(0);
}

checkGames();
