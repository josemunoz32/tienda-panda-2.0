import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

const GOFILE_PREMIUM_TOKEN = "ZtkBWxSMe9wsPfJJGl8i6j77x6LgbwoQ";
const ROOT_FOLDER_ID = "ff0f3f8b-65e0-407f-92ce-25cd7cd9df01";

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

async function findRequiemInGofile() {
  const res = await fetch(`https://api.gofile.io/contents/${ROOT_FOLDER_ID}?wt=4fd6a5e23ab0`, {
    headers: { "Authorization": `Bearer ${GOFILE_PREMIUM_TOKEN}` }
  });
  const json = await res.json();
  if (json.status !== "ok") return;

  const children = Object.values(json.data.children || {});
  console.log("Archivos GoFile conteniendo 'requiem' o 'plague':");
  const matches = children.filter(c => c.name.toLowerCase().includes("requiem") || c.name.toLowerCase().includes("plague"));
  console.log(matches.map(m => ({ name: m.name, directLink: m.directLink || m.link })));

  process.exit(0);
}

findRequiemInGofile();
