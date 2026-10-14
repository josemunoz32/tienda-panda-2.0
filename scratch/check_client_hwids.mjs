import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
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

async function findClientHwids() {
  const snap = await getDocs(collection(db, "licenses"));
  const clientHwids = {};
  snap.forEach(d => {
    const data = d.data();
    const email = (data.client_email || "").toLowerCase().trim();
    if (email && data.hwid) {
      if (!clientHwids[email]) clientHwids[email] = new Set();
      clientHwids[email].add(data.hwid);
    }
  });

  console.log("=== CLIENTES CON HWID CONOCIDO ===");
  for (const [email, hwids] of Object.entries(clientHwids)) {
    console.log(`${email}: ${Array.from(hwids).join(", ")}`);
  }

  console.log("\n=== VERIFICANDO LAS 6 LICENCIAS SIN HWID ===");
  snap.forEach(d => {
    const data = d.data();
    if (!data.hwid) {
      const email = (data.client_email || "").toLowerCase().trim();
      const known = clientHwids[email] ? Array.from(clientHwids[email]) : null;
      console.log(`Key: ${data.key} | Email: ${email} | HWID conocido de otras compras:`, known);
    }
  });
}

findClientHwids();
