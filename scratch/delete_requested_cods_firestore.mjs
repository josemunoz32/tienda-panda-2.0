import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, deleteDoc } from "firebase/firestore";
import fs from "fs";

const envContent = fs.readFileSync(".env", "utf8");
const envVars = {};
envContent.split("\n").forEach(line => {
  const parts = line.split("=");
  if (parts.length >= 2) envVars[parts[0].trim()] = parts.slice(1).join("=").trim();
});

const firebaseConfig = {
  apiKey: envVars.REACT_APP_FIREBASE_API_KEY,
  authDomain: envVars.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: envVars.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.REACT_APP_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const toDelete = [
  { id: "4ZA9iAb1Vq2G6v2cygo3", name: "Call of Duty®: Modern Warfare (Nuevo 2019)" },
  { id: "40mjJ08032D92msWMH1G", name: "Call of Duty®: Modern Warfare® II (Nuevo 2022)" },
  { id: "oKZVyjORHMfvhlHgOsdA", name: "Call of Duty®: Modern Warfare® III (Nuevo 2023)" },
  { id: "g9xc2rJQMxFsBsa65XwE", name: "Call of Duty: Modern Warfare III PS4" },
  { id: "4P1whQdHY5fuugnudr5K", name: "Call of Duty: Black Ops (1)" },
  { id: "C5NNvLQEUWGmtNOMgcxy", name: "Call of Duty®: Black Ops (1)" },
  { id: "FTgfi3R3ukRpYTAuvXuP", name: "Call of Duty: Black Ops II (2)" },
  { id: "rCasvUWmHzeSvKzMkssf", name: "Call of Duty®: Black Ops  II (2)" },
  { id: "xryTVnwqljpY26WthRMo", name: "Call of Duty: Black Ops 6" },
  { id: "Lk1F1yBz3ob3rt6PlCci", name: "Call of Duty: Black Ops 6 PS4" },
];

async function removeGames() {
  const email = "steamseeder_pandastore@gmail.com";
  const password = "PandaStoreSteam123!";
  const authRes = await signInWithEmailAndPassword(auth, email, password);
  console.log("Sesión autenticada como:", authRes.user.email);

  console.log(`Eliminando ${toDelete.length} juegos solicitados de la web (Firestore products)...`);
  for (const item of toDelete) {
    try {
      await deleteDoc(doc(db, "products", item.id));
      console.log(`✅ Eliminado: [${item.id}] ${item.name}`);
    } catch (err) {
      console.error(`❌ Error al eliminar [${item.id}] ${item.name}:`, err.message);
    }
  }
  console.log("¡Eliminación completada!");
  process.exit(0);
}

removeGames();
