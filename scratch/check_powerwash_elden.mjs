import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf8");
const envVars = {};
envContent.split("\n").forEach(line => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join("=").trim();
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

async function checkDuplicates() {
  const snap = await getDocs(collection(db, "games"));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const pw = docs.filter(g => (g.name || "").toLowerCase().includes("powerwash"));
  console.log("Juegos PowerWash:", pw.map(g => ({ id: g.id, name: g.name, fix: g.fix_drive_id })));

  const er = docs.filter(g => (g.name || "").toLowerCase().includes("elden ring"));
  console.log("Juegos Elden Ring:", er.map(g => ({ id: g.id, name: g.name, fix: g.fix_drive_id })));

  process.exit(0);
}

checkDuplicates();
