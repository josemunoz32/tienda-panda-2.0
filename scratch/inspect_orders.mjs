import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
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

async function inspectOrders() {
  console.log('Inspecting orders in Firestore...');
  const snap = await getDocs(collection(db, 'orders'));
  console.log(`Total orders in Firestore: ${snap.docs.length}`);

  const ghosts = [];
  const valid = [];
  const duplicates = [];

  // Map to detect duplicate orders: key = email + total + productos (or items)
  const seenMap = new Map();

  snap.docs.forEach(d => {
    const data = d.data();
    const id = d.id;

    const prods = data.productos || data.items || [];
    const hasNoProds = !prods || prods.length === 0;
    const hasNoEmail = !data.email && !data.clienteEmail;
    const hasNoTotal = !data.total && !data.totalCLP;
    const hasNoFecha = !data.fecha;

    if (hasNoProds && hasNoEmail && hasNoTotal) {
      ghosts.push({ id, ...data });
    } else {
      valid.push({ id, ...data });
      // Duplicate detection key
      const client = (data.email || data.clienteEmail || data.nombre || data.uid || '').toLowerCase().trim();
      const total = Number(data.total || data.totalCLP || 0);
      const prodNames = prods.map(p => (p.nombre || p.name || p.title || p.id || '').toLowerCase().trim()).sort().join('|');
      // Fecha approximate (within 10 minutes or same day)
      let timeKey = '';
      if (data.fecha) {
        const d = new Date(data.fecha);
        if (!isNaN(d.getTime())) {
          // Round to nearest 15 minutes
          const roundedMs = Math.floor(d.getTime() / (15 * 60 * 1000));
          timeKey = `${d.toISOString().slice(0, 10)}_${roundedMs}`;
        }
      }

      const dupKey = `${client}___${total}___${prodNames}___${timeKey}`;
      if (dupKey && client && total > 0) {
        if (!seenMap.has(dupKey)) {
          seenMap.set(dupKey, [id]);
        } else {
          seenMap.get(dupKey).push(id);
        }
      }
    }
  });

  console.log(`\nGhost/Empty orders found: ${ghosts.length}`);
  ghosts.forEach(g => {
    console.log(` - Ghost ID: ${g.id} | estado: ${g.transferenciaEstado || g.estado} | total: ${g.total} | prods: ${(g.productos || []).length}`);
  });

  console.log(`\nDuplicate groups found:`);
  let dupOrdersCount = 0;
  seenMap.forEach((ids, key) => {
    if (ids.length > 1) {
      console.log(` - Key: ${key} => ${ids.length} orders: ${ids.join(', ')}`);
      dupOrdersCount += (ids.length - 1);
    }
  });
  console.log(`Total duplicate orders to clean: ${dupOrdersCount}`);
}

inspectOrders().catch(console.error);
