import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import * as dotenv from "dotenv";
dotenv.config();

const app = initializeApp({
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

async function run() {
  const snap = await getDocs(collection(db, "products"));
  const cats = new Set();
  const sampleSwitch = [];
  snap.forEach(d => {
    const data = d.data();
    cats.add(JSON.stringify({ categoryId: data.categoryId, categoria: data.categoria, plataforma: data.plataforma }));
    const s = `${data.name || ''} ${data.categoria || ''} ${data.categoryId || ''} ${data.plataforma || ''}`.toLowerCase();
    if (s.includes("switch") || s.includes("nintendo") || s.includes("mario") || s.includes("zelda") || s.includes("pokemon")) {
      sampleSwitch.push({ id: d.id, name: data.name, categoryId: data.categoryId, categoria: data.categoria, plataforma: data.plataforma });
    }
  });

  console.log("Distinct Categories in products:");
  Array.from(cats).forEach(c => console.log(" ", c));
  console.log(`\nFound ${sampleSwitch.length} Nintendo/Switch-related products in store. Samples:`);
  sampleSwitch.slice(0, 30).forEach(p => console.log(" ", p));
}

run().catch(console.error);
