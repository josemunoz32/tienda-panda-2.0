import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

const GOFILE_PREMIUM_TOKEN = "ZtkBWxSMe9wsPfJJGl8i6j77x6LgbwoQ";
const ROOT_FOLDER_ID = "ff0f3f8b-65e0-407f-92ce-25cd7cd9df01";

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

async function syncAllLuasAndFixes() {
  console.log("1. Obteniendo lista de archivos subidos a GoFile...");
  let goFileFiles = [];
  try {
    const res = await fetch(`https://api.gofile.io/contents/${ROOT_FOLDER_ID}?wt=4fd6a5e23ab0`, {
      headers: { "Authorization": `Bearer ${GOFILE_PREMIUM_TOKEN}` }
    });
    const json = await res.json();
    if (json.status === "ok") {
      const children = json.data.children;
      for (const key in children) {
        const item = children[key];
        if (item.type === "file") {
          goFileFiles.push({
            name: item.name,
            directLink: item.directLink || item.link
          });
        }
      }
    }
  } catch (err) {
    console.error("Error al consultar GoFile:", err.message);
  }

  console.log(`GoFile: ${goFileFiles.length} archivos ZIP registrados.`);

  console.log("2. Escaneando la carpeta local de LUAs (fixes/Pack_Steam/archivos_juego)...");
  const baseDir = path.join(process.cwd(), 'fixes/Pack_Steam/archivos_juego');
  const folders = fs.readdirSync(baseDir);

  const luaEntries = [];
  for (const folder of folders) {
    const fullFolder = path.join(baseDir, folder);
    if (fs.statSync(fullFolder).isDirectory()) {
      const files = fs.readdirSync(fullFolder);
      for (const file of files) {
        if (file.endsWith('.lua')) {
          const appId = file.replace('.lua', '');
          const luaContent = fs.readFileSync(path.join(fullFolder, file), 'utf8');
          luaEntries.push({
            folderName: folder,
            appId,
            luaContent
          });
        }
      }
    }
  }

  console.log(`LUAs Locales: ${luaEntries.length} archivos .lua encontrados.`);

  console.log("3. Obteniendo colección de juegos de Firestore...");
  const snap = await getDocs(collection(db, "games"));
  const firestoreGames = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Firestore: ${firestoreGames.length} juegos existentes en la base de datos.`);

  const batch = writeBatch(db);
  let updatedCount = 0;
  let newGamesCount = 0;

  for (const entry of luaEntries) {
    const cleanFolderName = entry.folderName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Match game in Firestore by appId or folderName
    let match = firestoreGames.find(g => 
      (g.app_id && g.app_id.toString() === entry.appId) ||
      (g.steam_folder_name && g.steam_folder_name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanFolderName) ||
      (g.name && g.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanFolderName)
    );

    // Find direct GoFile fix link if available
    let goFileMatch = goFileFiles.find(gf => {
      const gfClean = gf.name.replace(/\.zip$/i, '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return gfClean === cleanFolderName || gfClean.includes(cleanFolderName) || cleanFolderName.includes(gfClean);
    });

    const docId = match ? match.id : `steam_${entry.appId}`;
    const docRef = doc(db, "games", docId);

    const updateData = {
      app_id: entry.appId,
      name: match?.name || entry.folderName,
      steam_folder_name: entry.folderName,
      lua_content: entry.luaContent,
      updated_at: new Date().toISOString()
    };

    if (goFileMatch) {
      updateData.fix_drive_id = goFileMatch.directLink;
    }

    batch.set(docRef, updateData, { merge: true });
    updatedCount++;
    if (!match) newGamesCount++;
  }

  console.log(`Enviando batch a Firestore: ${updatedCount} juegos actualizados (${newGamesCount} nuevos)...`);
  await batch.commit();
  console.log("🎉 ¡PROCESO COMPLETADO CON ÉXITO! Todos los LUA y enlaces de GoFile han sido subidos a Firestore.");
}

syncAllLuasAndFixes().catch(err => {
  console.error("Error global en el script:", err);
  process.exit(1);
});
