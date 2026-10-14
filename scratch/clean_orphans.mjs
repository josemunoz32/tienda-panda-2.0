import { initializeApp } from "firebase/app";
import { getFirestore, doc, deleteDoc } from "firebase/firestore";
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
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const invalidDocIds = [
  "1085660",
  "3",
  "fix_Grand_Theft_Auto_IV",
  "fix_RESIDENT_EVIL_requiem_BIOHAZARD_requiem",
  "fix_SleepingDogsDefinitiveEdition"
];

async function cleanOrphans() {
  console.log("Limpiando documentos huérfanos/inválidos de Firestore...");
  for (const docId of invalidDocIds) {
    await deleteDoc(doc(db, "games", docId));
    console.log(`🗑️ Eliminado documento de Firestore: ${docId}`);
  }
  console.log("Limpieza completada.");
  process.exit(0);
}

cleanOrphans();
