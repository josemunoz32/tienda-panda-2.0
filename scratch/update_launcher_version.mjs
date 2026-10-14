import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf8");
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function updateLauncherVersion() {
  const email = "steamseeder_pandastore@gmail.com";
  const password = "PandaStoreSteam123!";
  await signInWithEmailAndPassword(auth, email, password);

  const docRef = doc(db, "system_config", "launcher");
  await setDoc(docRef, {
    latest_version: "2.4.27",
    download_url: "https://pandastoreupdate.web.app/downloads/PandaStoreSetup.exe",
    changelog: "v2.4.27 - Blindaje de seguridad en segundo plano con cierre forzado de procesos antes de purgar, protección anti-atraso de reloj (Anti-Time-Travel), límite offline en pruebas, nuevo sistema 100% local de respaldos automáticos de partidas en la PC (Mis Partidas), y nuevas pestañas de filtrado con contador en tiempo real."
  }, { merge: true });

  console.log("✅ Firestore actualizado a v2.4.27");
  process.exit(0);
}

updateLauncherVersion();
