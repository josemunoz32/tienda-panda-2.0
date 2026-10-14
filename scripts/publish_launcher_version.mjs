import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
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

console.log("Inicializando Firestore para Publicar Nueva Versión del Launcher...");
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const newVersion = process.argv[2] || "2.2.0";
const downloadUrl = process.argv[3] || "https://pandastoreupdate.web.app/downloads/PandaStoreLauncher.exe";
const changelog = process.argv[4] || "Modo Seguro VAC mejorado, buscador de juegos reubicado y actualización automática de catálogo.";

async function publishVersion() {
  try {
    console.log(`Publicando versión ${newVersion} en Firestore (system_config/launcher)...`);
    
    await setDoc(doc(db, "system_config", "launcher"), {
      latest_version: newVersion,
      download_url: downloadUrl,
      changelog: changelog,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log("==========================================");
    console.log(`✅ VERSIÓN ${newVersion} PUBLICADA CON ÉXITO EN FIRESTORE`);
    console.log(`URL de descarga: ${downloadUrl}`);
    console.log(`Todos los ejecutables de clientes detectarán la versión ${newVersion} y se actualizarán.`);
    console.log("==========================================");
    process.exit(0);
  } catch (err) {
    console.error("Error al publicar versión en Firestore:", err);
    process.exit(1);
  }
}

publishVersion();
