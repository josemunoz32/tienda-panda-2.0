import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
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
  appId: envVars.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function fixLicenseGameIds() {
  const email = "steamseeder_pandastore@gmail.com";
  const password = "PandaStoreSteam123!";
  await signInWithEmailAndPassword(auth, email, password);

  const snap = await getDocs(collection(db, "licenses"));
  for (const d of snap.docs) {
    const data = d.data();
    let games = data.allowed_games || [];
    let modified = false;

    // Check Ready or Not
    if (games.includes("Ready or Not") && !games.includes("1144200")) {
      games.push("1144200");
      modified = true;
    }

    // Check Steam 3X (DAYZ + Battlefield 1 + Monster Hunter: World)
    const hasSteam3x = games.some(g => String(g).includes("DAYZ") || String(g).includes("Steam 3X"));
    if (hasSteam3x) {
      const needed = ["221100", "1238840", "582010"];
      needed.forEach(id => {
        if (!games.includes(id)) {
          games.push(id);
          modified = true;
        }
      });
    }

    if (modified) {
      console.log(`Updating license ${d.id} with new allowed_games:`, games);
      await updateDoc(doc(db, "licenses", d.id), { allowed_games: games });
    }
  }
  console.log("Licenses checked and updated!");
}

fixLicenseGameIds().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
