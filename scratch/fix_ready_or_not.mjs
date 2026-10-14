import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
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
const auth = getAuth(app);
const db = getFirestore(app);

async function fixReadyOrNot() {
  const email = "steamseeder_pandastore@gmail.com";
  const password = "PandaStoreSteam123!";
  const authRes = await signInWithEmailAndPassword(auth, email, password);
  console.log("Sesión autenticada como:", authRes.user.email);

  const ref = doc(db, "games", "1144200");
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    console.error("Game 1144200 does not exist!");
    return;
  }
  const data = snap.data();
  console.log("Current data:", {
    app_id: data.app_id,
    name: data.name,
    lua_len: (data.lua_script || '').length
  });

  const updatePayload = {
    app_id: "1144200",
    name: "Ready or Not",
    steam_folder_name: "Ready or Not",
    lua_content: data.lua_script || data.lua_content,
    ryuu_manifest_api: "https://generator.ryuu.lol/secure_download?appid=1144200&auth_code=RYUUMANIFEST1uypp1",
    ryuu_lua_api: "https://generator.ryuu.lol/resellerlua?appid=1144200&auth_code=RYUUMANIFEST1uypp1",
    is_base_game: true,
    technical_category: "solo_lua"
  };

  await updateDoc(ref, updatePayload);
  console.log("Updated games/1144200 successfully!");
}

fixReadyOrNot().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
