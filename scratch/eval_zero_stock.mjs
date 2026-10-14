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

// Versión actual de normalize
function currentNormalize(name) {
  if (!name) return "";
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

async function run() {
  const packsSnap = await getDocs(collection(db, "packs_nintendo"));
  const stockMap = new Map();
  packsSnap.forEach(d => {
    const data = d.data();
    if (data.disponible === false) return;
    (data.juegos || []).forEach(j => {
      if (!j) return;
      const n = currentNormalize(j);
      stockMap.set(n, (stockMap.get(n) || 0) + 1);
    });
  });

  const prodsSnap = await getDocs(collection(db, "products"));
  const switchProds = [];
  prodsSnap.forEach(d => {
    const p = d.data();
    if (
      p.categoryId === "VtQaPwP0xXdC1qdz6Hvq" ||
      p.categoryId === "Y7j7vSXMUgWxFNMkOuwX" ||
      p.categoryId === "switch" ||
      p.plataforma === "Nintendo Switch" ||
      (p.categoria && p.categoria.toLowerCase().includes("switch"))
    ) {
      switchProds.push({ id: d.id, name: p.name || p.title });
    }
  });

  console.log(`\nEvaluating ${switchProds.length} products with CURRENT match logic:`);
  let matchedCount = 0;
  let zeroStockCount = 0;
  const zeroStockProds = [];

  switchProds.forEach(p => {
    const targetNorm = currentNormalize(p.name);
    let count = stockMap.get(targetNorm) || 0;
    if (count === 0) {
      for (const [k, v] of stockMap.entries()) {
        if (k.length > 5 && targetNorm.length > 5) {
          if (k.includes(targetNorm) || targetNorm.includes(k)) {
            count = v;
            break;
          }
        }
      }
    }
    if (count > 0) {
      matchedCount++;
    } else {
      zeroStockCount++;
      zeroStockProds.push(p.name);
    }
  });

  console.log(`Matched (Stock > 0): ${matchedCount}`);
  console.log(`Zero Stock (Agotados): ${zeroStockCount}`);
  console.log("\nProducts that currently evaluate to 0 Stock (Agotado):");
  zeroStockProds.forEach(n => console.log(`  ❌ ${n}`));
}

run().catch(console.error);
