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

async function fetchGoFileFiles() {
  console.log("Fetching GoFile folder contents...");
  const res = await fetch(`https://api.gofile.io/contents/${ROOT_FOLDER_ID}?wt=4fd6a5e23ab0`, {
    headers: {
      "Authorization": `Bearer ${GOFILE_PREMIUM_TOKEN}`
    }
  });

  const json = await res.json();
  if (json.status !== "ok") {
    console.error("GoFile API Error:", json);
    return [];
  }

  const children = json.data.children;
  const filesList = [];
  for (const key in children) {
    const item = children[key];
    if (item.type === "file") {
      filesList.push({
        name: item.name,
        link: item.link,
        directLink: item.directLink || item.link
      });
    }
  }
  return filesList;
}

async function syncAllGoFileLinks() {
  const gofileFiles = await fetchGoFileFiles();
  console.log(`Encontrados ${gofileFiles.length} archivos en la cuenta Premium de GoFile.`);

  const snap = await getDocs(collection(db, "games"));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  let updatedCount = 0;
  for (const file of gofileFiles) {
    const cleanName = file.name.replace(".zip", "").toLowerCase().trim();
    
    let match = docs.find(g => {
      const gName = (g.name || "").toLowerCase().trim();
      const gFolder = (g.steam_folder_name || "").toLowerCase().trim();
      return gName === cleanName || gFolder === cleanName || cleanName.includes(gFolder) || cleanName.includes(gName);
    });

    if (match) {
      console.log(`✅ Vinculando GoFile Fix a '${match.name}': ${file.directLink}`);
      await updateDoc(doc(db, "games", match.id), {
        fix_drive_id: file.directLink,
        has_local_fix: true,
        updatedAt: new Date().toISOString()
      });
      updatedCount++;
    } else {
      console.log(`❓ Archivo GoFile sin coincidencia exacta en Firestore: ${file.name}`);
    }
  }

  console.log("==========================================");
  console.log(`🎉 SINCRO COMPLETADA: ${updatedCount} juegos actualizados en Firestore con links directos de GoFile.`);
  console.log("==========================================");
  process.exit(0);
}

syncAllGoFileLinks();
