import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
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

async function findUnmatchedZip() {
  const res = await fetch(`https://api.gofile.io/contents/${ROOT_FOLDER_ID}?wt=4fd6a5e23ab0`, {
    headers: { "Authorization": `Bearer ${GOFILE_PREMIUM_TOKEN}` }
  });
  const json = await res.json();
  const children = json.data.children;
  const gofileFiles = Object.values(children).filter(item => item.type === "file");

  const snap = await getDocs(collection(db, "games"));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`Buscando cuál de los ${gofileFiles.length} archivos .zip en GoFile no se asignó...\n`);

  for (const file of gofileFiles) {
    const matchedGame = docs.find(g => (g.fix_drive_id || "").includes(file.directLink) || (g.fix_drive_id || "").includes(file.id) || (g.fix_drive_id || "").includes(file.link));
    if (!matchedGame) {
      console.log(`❌ ARCHIVO EN GOFILE NO VINCULADO: '${file.name}' | Link: ${file.directLink || file.link}`);
    }
  }

  process.exit(0);
}

findUnmatchedZip();
