import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, deleteDoc } from "firebase/firestore";
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
  const toDelete = [];
  snap.forEach(d => {
    const data = d.data();
    const name = (data.name || "").toLowerCase();
    if (
      name.includes("forza horizon 6") ||
      name === "call of duty: black ops" ||
      name === "call of duty: black ops ii" ||
      name === "call of duty: black ops 2"
    ) {
      toDelete.push({ id: d.id, name: data.name });
    }
  });

  console.log(`Found ${toDelete.length} products to delete from Firestore:`, toDelete);
  for (const item of toDelete) {
    console.log(`Deleting ${item.name} (${item.id})...`);
    await deleteDoc(doc(db, "products", item.id));
  }
  console.log("Done checking Firestore.");
  process.exit(0);
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
