import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
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

const targets = ['fc 26', 'wukong', 'borderlands 4', 'wilds', 'shadows', 'football manager', 'requiem', 'stellar blade', 'crimson desert', 'f1 25', 'outlaws', 'wwe 2k26'];

async function run() {
  const snap = await getDocs(collection(db, 'products'));
  snap.forEach(d => {
    const data = d.data();
    for (const t of targets) {
      if (data.name && data.name.toLowerCase().includes(t.toLowerCase())) {
        console.log(`[TARGET MATCH] id=${d.id} | name="${data.name}" | priceCLP=${data.priceCLP} | plataforma=${data.plataforma}`);
      }
    }
  });
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
