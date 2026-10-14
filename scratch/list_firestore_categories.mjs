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

async function check() {
  console.log('--- CATEGORIAS ---');
  const catSnap = await getDocs(collection(db, 'categories'));
  catSnap.forEach(d => {
    console.log(`ID: ${d.id} => Name: "${d.data().name}"`);
  });

  console.log('\n--- PRODUCTOS SAMPLE ---');
  const prodSnap = await getDocs(collection(db, 'products'));
  const prods = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Total productos: ${prods.length}`);
  
  // Agrupar por categoryId
  const byCat = {};
  prods.forEach(p => {
    const cId = p.categoryId || 'sin_categoria';
    byCat[cId] = (byCat[cId] || 0) + 1;
  });
  console.log('Productos por categoryId:', byCat);

  // Ver productos de steam
  const steamProds = prods.filter(p => {
    const n = (p.name || '').toLowerCase();
    const c = (p.categoryId || '').toLowerCase();
    return n.includes('steam') || c.includes('steam');
  });
  console.log(`Productos con steam en nombre o categoryId: ${steamProds.length}`);
  steamProds.slice(0, 5).forEach(p => {
    console.log(`- [${p.id}] ${p.name} (catId: ${p.categoryId}, img: ${p.imageUrl ? 'SI' : 'NO'})`);
  });

  process.exit(0);
}

check();
