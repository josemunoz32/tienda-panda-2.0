import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";
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
  const snap = await getDocs(collection(db, "games"));
  const mismatched = [];

  snap.forEach(d => {
    const data = d.data();
    const docId = d.id;
    const appId = String(data.app_id || "").trim();
    if (appId && /^\d+$/.test(docId) && /^\d+$/.test(appId) && docId !== appId) {
      mismatched.push({ docId, appId, name: data.name, luaContentLen: (data.lua_content || "").length, luaScriptLen: (data.lua_script || "").length });
    }
  });

  console.log(`Games with mismatched docId vs app_id: ${mismatched.length}`);
  console.log(mismatched);
}

main().catch(console.error);
