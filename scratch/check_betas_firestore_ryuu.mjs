import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
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

async function checkBetas() {
  const qGames = await getDocs(collection(db, "games"));
  const firestoreSuspects = [];
  qGames.forEach(d => {
    const data = d.data();
    const name = (data.name || "").toLowerCase();
    if (/\b(?:beta|open beta|closed beta|alpha|pre-alpha|playtest|multiplayer|dedicated server|server test)\b/i.test(name)) {
      firestoreSuspects.push({ id: d.id, app_id: data.app_id, name: data.name });
    }
  });
  console.log("Suspects in Firestore games collection:", firestoreSuspects.length);
  firestoreSuspects.forEach(s => console.log("  - Firestore:", s.id, `"${s.name}"`));

  console.log("\nChecking Ryuu catalog for entries with 'open beta', 'multiplayer', 'beta'...");
  const res = await fetch("https://generator.ryuu.lol/files/games.json");
  const ryuuGames = await res.json();
  const ryuuSuspects = [];
  ryuuGames.forEach(r => {
    const name = (r.name || "").toLowerCase();
    if (r.type?.toLowerCase() === 'game' && /\b(?:open beta|closed beta|beta|alpha|pre-alpha|playtest|multiplayer)\b/i.test(name)) {
      ryuuSuspects.push({ appid: r.appid, name: r.name });
    }
  });
  console.log(`Suspects in Ryuu catalog (marked as type 'game'): ${ryuuSuspects.length}`);
  ryuuSuspects.slice(0, 30).forEach(s => console.log("  - Ryuu:", s.appid, `"${s.name}"`));
}

checkBetas().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
