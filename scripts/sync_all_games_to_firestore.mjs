import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
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

console.log("Inicializando Firestore para Sincronización Masiva de Juegos...");
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const steamDataPath = path.join(process.cwd(), 'fixes/Pack_Steam/archivos_juego');
const fixesDataPath = path.join(process.cwd(), 'fixes/Pack_Fixes/fixes');

async function syncAllGames() {
  try {
    if (!fs.existsSync(steamDataPath)) {
      console.error("No se encontró la carpeta archivos_juego:", steamDataPath);
      process.exit(1);
    }

    const gameFolders = fs.readdirSync(steamDataPath).filter(f => {
      return fs.statSync(path.join(steamDataPath, f)).isDirectory();
    });

    console.log(`Se encontraron ${gameFolders.length} carpetas de juegos con activadores LUA.`);

    let syncedCount = 0;
    let batch = writeBatch(db);
    let batchSize = 0;

    for (const folderName of gameFolders) {
      const fullFolder = path.join(steamDataPath, folderName);
      const files = fs.readdirSync(fullFolder);

      let luaFile = files.find(f => f.endsWith('.lua'));
      if (!luaFile) continue;

      const appId = path.basename(luaFile, '.lua');

      // Upload/update all games
      const docRef = doc(db, "games", appId);


      const luaContent = fs.readFileSync(path.join(fullFolder, luaFile), 'utf8');

      // Check for manifest files
      const manifestFiles = [];
      const manifestList = files.filter(f => f.endsWith('.manifest'));
      for (const mFile of manifestList) {
        const mBuffer = fs.readFileSync(path.join(fullFolder, mFile));
        manifestFiles.push({
          filename: mFile,
          content_b64: mBuffer.toString('base64')
        });
      }

      // Check if fix folder exists
      let hasFix = false;
      let fixDriveId = "";
      if (fs.existsSync(fixesDataPath)) {
        const fixDirs = fs.readdirSync(fixesDataPath);
        const matchFix = fixDirs.find(d => d.toLowerCase() === folderName.toLowerCase());
        if (matchFix) {
          hasFix = true;
        }
      }

      const customSteamFolders = {
        "3764200": "RESIDENT EVIL requiem BIOHAZARD requiem"
      };

      const gameDoc = {
        app_id: appId,
        name: folderName,
        steam_folder_name: customSteamFolders[appId] || folderName,
        lua_content: luaContent,
        manifest_files: manifestFiles,
        has_local_fix: hasFix,
        updatedAt: new Date().toISOString()
      };

      batch.set(docRef, gameDoc, { merge: true });
      syncedCount++;
      batchSize++;

      if (batchSize >= 400) {
        console.log(`Guardando lote de ${batchSize} juegos en Firestore...`);
        await batch.commit();
        batch = writeBatch(db);
        batchSize = 0;
      }
    }

    if (batchSize > 0) {
      console.log(`Guardando lote final de ${batchSize} juegos en Firestore...`);
      await batch.commit();
    }

    console.log("==========================================");
    console.log(`✅ SINCRONIZACIÓN MÁSIVA COMPLETADA`);
    console.log(`Juegos sincronizados en Firestore: ${syncedCount}`);
    console.log("==========================================");
    process.exit(0);

  } catch (err) {
    console.error("Error al sincronizar juegos en Firestore:", err);
    process.exit(1);
  }
}

syncAllGames();
