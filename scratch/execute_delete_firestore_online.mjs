import { initializeApp } from "firebase/app";
import { getFirestore, doc, deleteDoc, getDoc } from "firebase/firestore";
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

const STEAM_ONLINE_PRODUCTS_TO_DELETE = [
  { id: "Dhl7zAg5qGCK1E8bvg4V", name: "RUST" },
  { id: "9sN9mBx3kRJ4qml5NC5A", name: "DAYZ" },
  { id: "KNmfwUy9UusB8Jci8zFW", name: "HellDivers 2" },
  { id: "FqDDciyrJMkOjNf2sbfD", name: "The Division" },
  { id: "vwMRZa3CTdmGI0LNBcU3", name: "Sea of Thieves" },
  { id: "pSYUFoBox3NjWwUfzCHR", name: "FINAL FANTASY XIV Online" },
  { id: "qSh0VhpW5iGJtKHqK0CM", name: "Team Fortress 2" },
  { id: "Y4VBmjHA0Ho9DFz1MR0O", name: "Team Fortress Classic" },
  { id: "6yFqKV8OcqCA4k8wYC29", name: "Counter-Strike: Source" },
  { id: "AWAkobONIfIZTYGJPQYF", name: "Counter-Strike: Condition Zero Deleted Scenes" },
  { id: "Sr9XGvwjTEeMNPWNdiUM", name: "Among Us" },
  { id: "TWsbsaJtT5dODZAk2CWx", name: "Lethal Company" },
  { id: "QNg0ww9p2VSMdN9bxlPv", name: "PHASMOPHOBIA" },
  { id: "0PTPucnx5xFu6amje4cl", name: "ARK: Survival Evolved" },
  { id: "QdCUFM1kc4VH6kOFv9BJ", name: "Golf It" },
  { id: "Soo295yqRMt19zlGXPkJ", name: "Gang Beasts" },
  { id: "KIwWIQHHAjUGoY1w3Qsx", name: "Pacify" },
  { id: "tmvKPfY1baLZkrvne2sI", name: "Outlast trials" },
  { id: "fVdgtfH4vPRFMWE7l2ae", name: "DEAD OR ALIVE Xtreme Venus Vacation" },
  { id: "XcSOu7UAB5b0QPLHe2Z8", name: "Forza Horizon 5 (CON ONLINE)" },
  { id: "2XMt6Y6WC3jUvmBdAByr", name: "METAL GEAR SURVIVE" },
  { id: "tiVo3XYpg49Bg0rgdY5b", name: "NARUTO TO BORUTO: SHINOBI STRIKER" }
];

async function deleteOnlineGames() {
  const backups = [];

  for (const item of STEAM_ONLINE_PRODUCTS_TO_DELETE) {
    const docRef = doc(db, "products", item.id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      backups.push({ id: item.id, ...docSnap.data() });
      await deleteDoc(docRef);
      console.log(`✅ Eliminado de Firestore: [${item.id}] ${item.name}`);
    } else {
      console.log(`⚠️ Documento ya no existe: [${item.id}] ${item.name}`);
    }
  }

  fs.writeFileSync('scratch/backup_deleted_online_products.json', JSON.stringify(backups, null, 2), 'utf8');
  console.log(`\nRespaldo guardado en scratch/backup_deleted_online_products.json con ${backups.length} documentos.`);
  process.exit(0);
}

deleteOnlineGames().catch(e => { console.error(e); process.exit(1); });
