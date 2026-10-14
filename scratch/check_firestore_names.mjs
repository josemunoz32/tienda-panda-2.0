import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";
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

async function checkNames() {
  const qGames = await getDocs(collection(db, "games"));
  const suspect = [];
  qGames.forEach(d => {
    const data = d.data();
    const name = data.name || "";
    if (/\b(?:dlc|soundtrack|ost|demo|artbook|server)\b/i.test(name) || name.includes("+")) {
      suspect.push({ id: d.id, app_id: data.app_id, name });
    }
  });
  console.log("Suspect games in Firestore games collection:", suspect.length);
  suspect.forEach(s => console.log("  -", s.id, s.app_id, `"${s.name}"`));
}

checkNames().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
