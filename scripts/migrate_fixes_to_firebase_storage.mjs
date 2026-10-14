import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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
const storage = getStorage(app);

const fixesPath = path.join(process.cwd(), 'fixes/Pack_Fixes/fixes');
const steamPath = path.join(process.cwd(), 'fixes/Pack_Steam/archivos_juego');

function zipFolderNative(sourceDir, outPath) {
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
  const safeSource = sourceDir.replace(/'/g, "''");
  const safeOut = outPath.replace(/'/g, "''");
  const cmd = `powershell -Command "Compress-Archive -Path '${safeSource}\\*' -DestinationPath '${safeOut}' -Force"`;
  execSync(cmd, { stdio: 'ignore' });
  return outPath;
}

async function migrateFixesToFirebaseStorage() {
  if (!fs.existsSync(fixesPath)) {
    console.error("No se encontró la carpeta fixes:", fixesPath);
    return;
  }

  const fixFolders = fs.readdirSync(fixesPath).filter(f => fs.statSync(path.join(fixesPath, f)).isDirectory());
  console.log(`🚀 Iniciando migración directa de ${fixFolders.length} Fixes hacia Firebase Storage (URLs Directas HTTP)...`);

  const tempDir = path.join(process.cwd(), 'scratch/temp_zip_fixes_firebase');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  let count = 0;

  for (const folderName of fixFolders) {
    count++;
    
    // Find AppID match
    let appIdMatch = "";
    if (fs.existsSync(steamPath)) {
      const matchFolder = fs.readdirSync(steamPath).find(f => f.toLowerCase() === folderName.toLowerCase());
      if (matchFolder) {
        const luaFile = fs.readdirSync(path.join(steamPath, matchFolder)).find(f => f.endsWith('.lua'));
        if (luaFile) appIdMatch = path.basename(luaFile, '.lua');
      }
    }

    const safeFileName = folderName.replace(/[^a-zA-Z0-9]/g, '_');
    const tempZipFile = path.join(tempDir, `${safeFileName}_fix.zip`);

    try {
      console.log(`\n[${count}/${fixFolders.length}] 📦 Comprimiendo y subiendo Fix de: '${folderName}'...`);
      zipFolderNative(path.join(fixesPath, folderName), tempZipFile);

      const fileBuffer = fs.readFileSync(tempZipFile);
      const storageRef = ref(storage, `fixes/${safeFileName}_fix.zip`);
      const snapshot = await uploadBytes(storageRef, fileBuffer, { contentType: 'application/zip' });
      const directDownloadUrl = await getDownloadURL(snapshot.ref);

      console.log(`✅ URL Directa Generada: ${directDownloadUrl}`);

      // Link in Firestore
      if (appIdMatch) {
        await setDoc(doc(db, "games", appIdMatch), {
          fix_drive_id: directDownloadUrl
        }, { merge: true });
        console.log(`✔ Vinculado en Firestore al AppID: ${appIdMatch}`);
      } else {
        const normalizedAppId = folderName.replace(/[^0-9]/g, '') || `fix_${safeFileName}`;
        await setDoc(doc(db, "games", normalizedAppId), {
          name: folderName,
          steam_folder_name: folderName,
          fix_drive_id: directDownloadUrl
        }, { merge: true });
        console.log(`✔ Vinculado en Firestore al nombre: ${folderName}`);
      }

    } catch (err) {
      console.error(`❌ Error en '${folderName}':`, err.message);
    } finally {
      if (fs.existsSync(tempZipFile)) {
        try { fs.unlinkSync(tempZipFile); } catch {}
      }
    }
  }

  console.log("\n==========================================");
  console.log("🎉 MIGRACIÓN COMPLETA A FIREBASE STORAGE REALIZADA CON ÉXITO");
  console.log("==========================================");
  process.exit(0);
}

migrateFixesToFirebaseStorage().catch(err => {
  console.error("Error global:", err);
  process.exit(1);
});
