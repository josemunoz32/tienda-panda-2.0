import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, deleteDoc } from "firebase/firestore";
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

async function findDuplicateProducts() {
  const qProd = await getDocs(collection(db, "products"));
  console.log(`Total products: ${qProd.size}`);
  
  const mapByName = new Map();
  qProd.forEach(d => {
    const data = d.data();
    const cleanName = (data.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanName) return;
    if (!mapByName.has(cleanName)) mapByName.set(cleanName, []);
    mapByName.get(cleanName).push({ id: d.id, ...data });
  });

  let duplicateGroups = 0;
  for (const [name, items] of mapByName.entries()) {
    if (items.length > 1) {
      duplicateGroups++;
      console.log(`\nDuplicate [${name}] (${items.length} items):`);
      items.forEach(it => {
        console.log(`  - docId: ${it.id} | name: "${it.name}" | price: ${it.price} | appId: ${it.appId || it.app_id} | category: ${it.category}`);
      });
    }
  }
  console.log(`\nTotal duplicate groups in products: ${duplicateGroups}`);
}

findDuplicateProducts().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
