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
  const packsSnap = await getDocs(collection(db, "packs_nintendo"));
  const allPackTitles = [];
  packsSnap.forEach(d => {
    const data = d.data();
    if (data.disponible === false) return;
    (data.juegos || []).forEach(j => {
      if (j) allPackTitles.push(j.trim());
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

  console.log(`Packs total titles: ${allPackTitles.length}`);
  console.log(`Switch products in store: ${switchProds.length}`);

  console.log("\nProducts in store:");
  switchProds.forEach(p => console.log(`  - [${p.id}] ${p.name}`));

  console.log("\nSearch for Pokémon in packs:");
  allPackTitles.filter(t => t.toLowerCase().includes("poke") || t.toLowerCase().includes("poké")).slice(0, 30).forEach(t => console.log(`  * ${t}`));

  console.log("\nSearch for Just Dance in packs:");
  allPackTitles.filter(t => t.toLowerCase().includes("dance")).slice(0, 30).forEach(t => console.log(`  * ${t}`));

  console.log("\nSearch for Little Nightmares in packs:");
  allPackTitles.filter(t => t.toLowerCase().includes("nightmare")).slice(0, 30).forEach(t => console.log(`  * ${t}`));

  console.log("\nSearch for Mortal Kombat in packs:");
  allPackTitles.filter(t => t.toLowerCase().includes("mortal") || t.toLowerCase().includes("kombat")).slice(0, 30).forEach(t => console.log(`  * ${t}`));

  console.log("\nSearch for Zelda in packs:");
  allPackTitles.filter(t => t.toLowerCase().includes("zelda")).slice(0, 30).forEach(t => console.log(`  * ${t}`));
}

run().catch(console.error);
