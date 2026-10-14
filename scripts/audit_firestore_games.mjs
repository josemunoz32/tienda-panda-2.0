import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, deleteDoc } from "firebase/firestore";
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

const steamDataPath = path.join(process.cwd(), 'fixes/Pack_Steam/archivos_juego');
const fixesDataPath = path.join(process.cwd(), 'fixes/Pack_Fixes/fixes');

async function audit() {
  try {
    const snap = await getDocs(collection(db, "games"));
    const firestoreDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log(`=== AUDITORÍA FIRESTORE 'games' ===`);
    console.log(`Total documentos en Firestore 'games': ${firestoreDocs.length}`);

    // Local LUA Folders
    const localLuaFolders = fs.readdirSync(steamDataPath).filter(f => fs.statSync(path.join(steamDataPath, f)).isDirectory());
    console.log(`Total carpetas LUA locales en Pack_Steam: ${localLuaFolders.length}`);

    // Local Fix Folders
    const localFixFolders = fs.readdirSync(fixesDataPath).filter(f => fs.statSync(path.join(fixesDataPath, f)).isDirectory());
    console.log(`Total carpetas Fix locales en Pack_Fixes: ${localFixFolders.length}`);

    const withLua = firestoreDocs.filter(g => g.lua_content && g.lua_content.trim() !== "");
    const withFix = firestoreDocs.filter(g => g.fix_drive_id && g.fix_drive_id.trim() !== "");

    console.log(`\nDocumentos con LUA válido: ${withLua.length}`);
    console.log(`Documentos con Fix configurado: ${withFix.length}`);

    // Identify orphan documents in Firestore without LUA content
    const orphans = firestoreDocs.filter(g => !g.lua_content || g.lua_content.trim() === "");
    if (orphans.length > 0) {
      console.log(`\n⚠️ Documentos huérfanos/sin LUA en Firestore (${orphans.length}):`);
      orphans.forEach(o => console.log(` - ID: ${o.id} | Name: ${o.name}`));
    }

    // Check which fix folders are missing fix_drive_id
    const missingFixes = [];
    for (const fixFolder of localFixFolders) {
      const found = firestoreDocs.find(g =>
        (g.name && g.name.toLowerCase() === fixFolder.toLowerCase()) ||
        (g.steam_folder_name && g.steam_folder_name.toLowerCase() === fixFolder.toLowerCase())
      );
      if (!found || !found.fix_drive_id) {
        missingFixes.push({ folder: fixFolder, docId: found?.id });
      }
    }

    console.log(`\nFixes pendientes de vincular (${missingFixes.length} de ${localFixFolders.length}):`);
    missingFixes.forEach(m => console.log(` - ${m.folder} (DocID: ${m.docId || 'Sin coincidencia'})`));

    process.exit(0);
  } catch (err) {
    console.error("Error en auditoría:", err);
    process.exit(1);
  }
}

audit();
