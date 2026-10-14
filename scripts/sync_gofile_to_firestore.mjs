import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

const GOFILE_TOKEN = "REDACTED_SECRET";

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

async function syncGofileLinks() {
  try {
    console.log("Obteniendo información del usuario en GoFile...");
    const accountRes = await fetch("https://api.gofile.io/accounts/getSelf", {
      headers: { "Authorization": `Bearer ${GOFILE_TOKEN}` }
    });
    const accountJson = await accountRes.json();
    console.log("Account status:", accountJson.status);
    const rootFolderId = accountJson?.data?.rootFolder;
    console.log("Root Folder ID:", rootFolderId);

    if (!rootFolderId) {
      console.error("No se pudo obtener la carpeta raíz de GoFile.");
      process.exit(1);
    }

    const folderRes = await fetch(`https://api.gofile.io/contents/${rootFolderId}`, {
      headers: { "Authorization": `Bearer ${GOFILE_TOKEN}` }
    });
    const folderJson = await folderRes.json();
    const children = folderJson?.data?.children || {};
    const files = Object.values(children);

    console.log(`Se encontraron ${files.length} archivos subidos en tu cuenta de GoFile.`);

    // Fetch all games from Firestore
    const snap = await getDocs(collection(db, "games"));
    const firestoreGames = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    let linkedCount = 0;

    for (const file of files) {
      const fileName = file.name || "";
      const directLink = file.directLink || file.link || `https://gofile.io/d/${file.id}`;
      
      // Clean file name to match game name/folder
      const cleanName = fileName.replace(/_fix\.zip$/i, '').replace(/\.zip$/i, '').replace(/_/g, ' ').trim().toLowerCase();

      // Find matching game in Firestore
      const match = firestoreGames.find(g => {
        const gameName = (g.name || "").toLowerCase();
        const folderName = (g.steam_folder_name || "").toLowerCase();
        return gameName === cleanName || folderName === cleanName || gameName.includes(cleanName) || cleanName.includes(gameName);
      });

      if (match) {
        await setDoc(doc(db, "games", match.id), {
          fix_drive_id: directLink
        }, { merge: true });
        console.log(`✔ [VINCULADO] '${file.name}' -> Juego '${match.name}' (AppID: ${match.id}) | Link: ${directLink}`);
        linkedCount++;
      } else {
        console.log(`⚠️ [SIN COINCIDENCIA DIRECTA] '${file.name}' (${directLink})`);
      }
    }

    console.log("==========================================");
    console.log(`✅ PROCESO DE VINCULACIÓN COMPLETADO: ${linkedCount} fixes vinculados.`);
    console.log("==========================================");
    process.exit(0);

  } catch (err) {
    console.error("Error al obtener los enlaces de GoFile:", err);
    process.exit(1);
  }
}

syncGofileLinks();
