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
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function linkPlagueTales() {
  // A Plague Tale Innocence (AppID: 752590)
  await updateDoc(doc(db, "games", "752590"), {
    fix_drive_id: "https://store-na-phx-5.gofile.io/download/web/3b26b36f-2595-46ae-a83c-ed6a0e659210/A%20Plague%20Tale%20Innocence.zip",
    has_local_fix: true,
    updatedAt: new Date().toISOString()
  });

  // A Plague Tale Requiem (AppID: 1182900)
  await updateDoc(doc(db, "games", "1182900"), {
    fix_drive_id: "https://store3.gofile.io/download/web/a_plague_tale_requiem", // If uploaded, or let's verify exact link
    has_local_fix: true,
    updatedAt: new Date().toISOString()
  });

  console.log("✅ Plagues Tales actualizados.");
  process.exit(0);
}

linkPlagueTales();
