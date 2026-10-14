import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import * as dotenv from "dotenv";
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const packsSnap = await getDocs(collection(db, "packs_nintendo"));
  const packGamesSet = new Set();
  const packGamesList = [];

  packsSnap.forEach(d => {
    const data = d.data();
    if (data.disponible === false) return;
    const juegos = Array.isArray(data.juegos) ? data.juegos : [];
    juegos.forEach(j => {
      packGamesSet.add(j);
      packGamesList.push({ packId: d.id, name: j });
    });
  });

  console.log(`=== Total Packs Activos: ${packsSnap.size} ===`);
  console.log(`=== Total Títulos Únicos en Packs: ${packGamesSet.size} ===`);
  console.log("\nLista de títulos únicos en packs:");
  Array.from(packGamesSet).sort().forEach(g => console.log(`  - ${g}`));

  const prodsSnap = await getDocs(collection(db, "products"));
  const switchProds = [];
  prodsSnap.forEach(d => {
    const p = d.data();
    if (p.categoryId === "switch" || p.plataforma === "Nintendo Switch" || (p.categoria && p.categoria.toLowerCase().includes("switch"))) {
      switchProds.push({ id: d.id, name: p.name || p.title });
    }
  });

  console.log(`\n=== Total Productos Switch en Tienda: ${switchProds.length} ===`);
  console.log("\nProductos Switch en Tienda:");
  switchProds.sort((a,b) => (a.name||"").localeCompare(b.name||"")).forEach(p => console.log(`  - [${p.id}] ${p.name}`));
}

main().catch(console.error);
