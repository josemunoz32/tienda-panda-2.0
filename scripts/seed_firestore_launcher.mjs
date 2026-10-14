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

console.log("Inicializando Firestore para PandaStore Launcher...");
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedLauncherData() {
  try {
    // 1. Crear Licencia de prueba en Firestore
    const sampleKey = "PANDA-DEMO-2026";
    console.log(`Creando Licencia de prueba: ${sampleKey}`);

    await setDoc(doc(db, "licenses", sampleKey), {
      key: sampleKey,
      client_email: "cliente@pandastore.cl",
      hwid: null, // Se vinculará automáticamente al primer inicio de sesión
      status: "active",
      allowed_games: ["*"] // Acceso a todos los juegos
    }, { merge: true });

    // 2. Crear Juegos de prueba en Firestore
    const sampleGames = [
      {
        app_id: "1888930",
        name: "The Last of Us Part I",
        steam_folder_name: "The Last of Us Part I",
        lua_content: 'addappid(1888930, 1, "9a674fb166f2ed6f6a7d9036f014e4b5")',
        manifest_files: [],
        fix_drive_id: "1A2B3C4D5E6F7G8H9" // Reemplazar con ID real de Google Drive
      },
      {
        app_id: "1144200",
        name: "God of War",
        steam_folder_name: "God of War",
        lua_content: 'addappid(1144200, 1, "8b76543210fedcba9876543210fedcba")',
        manifest_files: [],
        fix_drive_id: ""
      }
    ];

    for (const game of sampleGames) {
      console.log(`Creando Juego en colección 'games': ${game.name} (${game.app_id})`);
      await setDoc(doc(db, "games", game.app_id), game, { merge: true });
    }

    console.log("\n==========================================");
    console.log("✅ BASE DE DATOS FIRESTORE CONFIGURADA");
    console.log("Licencia Demo: PANDA-DEMO-2026");
    console.log("==========================================");
    process.exit(0);

  } catch (err) {
    console.error("Error al sembrar datos en Firestore:", err);
    process.exit(1);
  }
}

seedLauncherData();
