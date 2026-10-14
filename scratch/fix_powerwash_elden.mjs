import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
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

async function fixPowerWashAndEldenRing() {
  // PowerWash 1 (AppID: 1290000)
  await updateDoc(doc(db, "games", "1290000"), {
    fix_drive_id: "https://store-na-phx-3.gofile.io/download/web/7f3b71c9-4a92-43e5-9413-625aeb10fa0f/PowerWash%20Simulator.zip",
    has_local_fix: true,
    updatedAt: new Date().toISOString()
  });

  // PowerWash 2 (AppID: 2968420)
  await updateDoc(doc(db, "games", "2968420"), {
    fix_drive_id: "https://store9.gofile.io/download/web/5729806a-0460-4d69-bb3a-522c90acf250/PowerWash%20Simulator%202.zip",
    has_local_fix: true,
    updatedAt: new Date().toISOString()
  });

  // Elden Ring (AppID: 1245620)
  await updateDoc(doc(db, "games", "1245620"), {
    fix_drive_id: "https://store10.gofile.io/download/web/de47b7d6-8e3d-4386-9fd1-9457c7e6b4b7/ELDEN%20RING.zip",
    has_local_fix: true,
    updatedAt: new Date().toISOString()
  });

  // Elden Ring Nightreign (AppID: 2622380)
  await updateDoc(doc(db, "games", "2622380"), {
    fix_drive_id: "https://store3.gofile.io/download/web/51e0642e-a37c-4e9f-a109-ecd54e78b784/ELDEN%20RING%20NIGHTREIGN.zip",
    has_local_fix: true,
    updatedAt: new Date().toISOString()
  });

  console.log("✅ Asignación exacta de PowerWash Simulator 1 & 2 y Elden Ring & Nightreign completada.");
  process.exit(0);
}

fixPowerWashAndEldenRing();
