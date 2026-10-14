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

async function findMismatches() {
  const qGames = await getDocs(collection(db, "games"));
  console.log(`Total games in Firestore: ${qGames.size}`);
  let count = 0;
  qGames.forEach(d => {
    const data = d.data();
    const docId = d.id;
    const appId = String(data.app_id || '');
    if (appId && docId !== appId) {
      count++;
      console.log(`Mismatch #${count}: docId="${docId}" vs data.app_id="${appId}" (name: "${data.name}")`);
    }
  });
  console.log(`Found ${count} mismatches in Firestore games.`);
}

findMismatches().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
