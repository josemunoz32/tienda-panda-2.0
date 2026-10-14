import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';
import path from 'path';
import { isStrictlyOnlineMultiplayer } from './test_refined_detector.mjs';

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

async function checkFirestore() {
  const snap = await getDocs(collection(db, "products"));
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const onlineInFirestore = products.filter(p => isStrictlyOnlineMultiplayer({ name: p.name, app_id: p.app_id || p.appId }));
  console.log(`Productos online detectados en Firestore (${onlineInFirestore.length}):`);
  onlineInFirestore.forEach(p => {
    console.log(` - [${p.id}] ${p.name} (Cat: ${p.categoryName || p.categoryId})`);
  });

  process.exit(0);
}

checkFirestore().catch(e => { console.error(e); process.exit(1); });
