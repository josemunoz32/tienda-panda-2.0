import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
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

async function fetchGoFileFiles() {
  const res = await fetch(`https://api.gofile.io/contents/${ROOT_FOLDER_ID}?wt=4fd6a5e23ab0`, {
    headers: { "Authorization": `Bearer ${GOFILE_PREMIUM_TOKEN}` }
  });
  const json = await res.json();
  if (json.status !== "ok") return [];
  const children = json.data.children;
  const filesList = [];
  for (const key in children) {
    const item = children[key];
    if (item.type === "file") {
      filesList.push({
        name: item.name,
        directLink: item.directLink || item.link
      });
    }
  }
  return filesList;
}

async function fixSpecificMatches() {
  const gofileFiles = await fetchGoFileFiles();
  const snap = await getDocs(collection(db, "games"));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Clean orphan/invalid temp docs
  if (docs.find(d => d.id === "fix_AFOP")) {
    await deleteDoc(doc(db, "games", "fix_AFOP"));
  }

  // Exact mapping rules for tricky names
  const customMap = {
    "AFOP.zip": "avatar frontiers of pandora",
    "DeadRising4.zip": "DEAD RISING4",
    "deadrising3.zip": "Dead Rising 3 Apocalypse Edition",
    "Hogwarts Legacy.zip": "hogwart legacy",
    "Grand Theft Auto IV.zip": "Grand Theft Auto IV The Complete Edition",
    "Just Cause 3.zip": "Just Cause™ 3",
    "Just Cause 4.zip": "Just Cause 4 Reloaded",
    "LEGO Batman - Legacy of the Dark Knight.zip": "lego batman legacy of the dark knight",
    "Sekiro.zip": "Sekiro Shadows Die Twice",
    "SleepingDogsDefinitiveEdition.zip": "Sleeping Dogs Definitive Edition",
    "FarCry5.zip": "Far Cry 5",
    "VRising.zip": "V Rising"
  };

  for (const file of gofileFiles) {
    const targetName = customMap[file.name];
    if (targetName) {
      const match = docs.find(g => (g.name || "").toLowerCase().trim() === targetName.toLowerCase().trim());
      if (match) {
        await updateDoc(doc(db, "games", match.id), {
          fix_drive_id: file.directLink,
          has_local_fix: true,
          updatedAt: new Date().toISOString()
        });
        console.log(`✔ [MAPEO EXACTO APLICADO] ${file.name} -> '${match.name}' (AppID: ${match.id})`);
      }
    }
  }

  console.log("Mapeo exacto finalizado.");
  process.exit(0);
}

fixSpecificMatches();
