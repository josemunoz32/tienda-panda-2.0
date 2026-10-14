import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
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

async function uploadSouthParkSnow() {
  const folderPath = path.join(process.cwd(), 'fixes/Pack_Steam/archivos_juego/south park snow');
  const luaFile = path.join(folderPath, '1214650.lua');

  if (!fs.existsSync(luaFile)) {
    console.error("❌ No se encontró el archivo 1214650.lua en", luaFile);
    process.exit(1);
  }

  const appId = "1214650";
  const folderName = "south park snow";
  const luaContent = fs.readFileSync(luaFile, 'utf8');

  // Manifest files in directory if any
  const files = fs.readdirSync(folderPath);
  const manifestFiles = [];
  const manifestList = files.filter(f => f.endsWith('.manifest'));
  for (const mFile of manifestList) {
    const mBuffer = fs.readFileSync(path.join(folderPath, mFile));
    manifestFiles.push({
      filename: mFile,
      content_b64: mBuffer.toString('base64')
    });
  }

  console.log(`🚀 Subiendo '${folderName}' (AppID: ${appId}) a Firestore...`);

  await setDoc(doc(db, "games", appId), {
    app_id: appId,
    name: "SOUTH PARK: SNOW DAY!",
    steam_folder_name: folderName,
    lua_content: luaContent,
    manifest_files: manifestFiles,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  console.log(`✅ ¡ÉXITO! Se ha subido correctamente el archivo LUA de SOUTH PARK: SNOW DAY! a Firebase Firestore.`);
  process.exit(0);
}

uploadSouthParkSnow().catch(err => {
  console.error("❌ Error al subir a Firebase:", err);
  process.exit(1);
});
