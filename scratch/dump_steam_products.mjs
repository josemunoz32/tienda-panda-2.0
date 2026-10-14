import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

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

async function checkAllSteamProducts() {
  const snap = await getDocs(collection(db, "products"));
  const allProds = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const steamProds = allProds.filter(p => {
    const cat = ((p.categoryName || '') + ' ' + (p.categoryId || '') + ' ' + (p.plataforma || '')).toLowerCase();
    return cat.includes('steam') || p.categoryId === 'lW3JaYVl6iDINZI57WE1';
  });

  console.log(`Total productos Steam en Firestore: ${steamProds.length}`);

  // Print all names sorted
  const sortedNames = steamProds.map(p => ({
    id: p.id,
    name: p.name,
    app_id: p.app_id || p.appId || '',
    categoryName: p.categoryName || '',
    categoryId: p.categoryId || ''
  })).sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync('scratch/all_steam_products.json', JSON.stringify(sortedNames, null, 2), 'utf8');
  console.log("Guardado en scratch/all_steam_products.json");
  process.exit(0);
}

checkAllSteamProducts().catch(e => { console.error(e); process.exit(1); });
