import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
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

async function getFolderContents(folderId) {
  try {
    const response = await fetch(`https://api.gofile.io/contents/${folderId}?wt=4fd6a83d2c54`, {
      headers: {
        'Authorization': `Bearer ${GOFILE_PREMIUM_TOKEN}`
      }
    });
    const data = await response.json();
    return data.status === 'ok' ? data.data : null;
  } catch (err) {
    console.error(`Error fetching folder ${folderId}:`, err);
    return null;
  }
}

async function getAllGofileFiles(folderId) {
  let filesMap = {};
  const folderData = await getFolderContents(folderId);
  if (!folderData || !folderData.children) return filesMap;

  for (const childId of Object.keys(folderData.children)) {
    const item = folderData.children[childId];
    if (item.type === 'file') {
      const fileNameLower = item.name.toLowerCase().trim();
      filesMap[fileNameLower] = item.link;
    } else if (item.type === 'folder') {
      const subFiles = await getAllGofileFiles(item.id);
      Object.assign(filesMap, subFiles);
    }
  }
  return filesMap;
}

async function main() {
  console.log("1. Escaneando todos los archivos ZIP en la cuenta de GoFile...");
  const gofileMap = await getAllGofileFiles(ROOT_FOLDER_ID);
  console.log(`🔍 Total de archivos ZIP encontrados en GoFile: ${Object.keys(gofileMap).length}`);

  const baseDir = path.join(process.cwd(), 'fixes', 'Pack_Steam', 'archivos_juego');
  const gameFolders = fs.readdirSync(baseDir);

  let uploadedCount = 0;
  let fixCount = 0;

  console.log("2. Sincronizando los 442+ LUAs y mapeando con GoFile...");

  for (const gameFolder of gameFolders) {
    const folderPath = path.join(baseDir, gameFolder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      if (file.endsWith('.lua')) {
        const appId = file.replace('.lua', '').trim();
        const luaScript = fs.readFileSync(path.join(folderPath, file), 'utf8');

        let zipLink = null;
        const normFolder = gameFolder.toLowerCase().replace(/[^a-z0-9]/g, '');

        for (const zipName of Object.keys(gofileMap)) {
          const normZip = zipName.replace(/\.zip$/i, '').replace(/[^a-z0-9]/g, '');
          if (normFolder === normZip || (normFolder.length > 4 && normZip.includes(normFolder)) || (normFolder.length > 4 && normFolder.includes(normZip))) {
            zipLink = gofileMap[zipName];
            break;
          }
        }

        const payload = {
          app_id: appId,
          name: gameFolder,
          lua_script: luaScript,
          lua_content: luaScript,
          updated_at: new Date().toISOString()
        };

        if (zipLink) {
          payload.download_url = zipLink;
          payload.has_fix = true;
          fixCount++;
        }

        await setDoc(doc(db, 'games', appId), payload, { merge: true });
        uploadedCount++;
      }
    }
  }

  console.log('\n=============================================');
  console.log('🎉 PROCESO COMPLETADO EXITOSAMENTE:');
  console.log(`- Total LUAs forzados y guardados en Firestore: ${uploadedCount}`);
  console.log(`- Total de Fixes (GoFile ZIP) vinculados: ${fixCount}`);
  console.log('=============================================\n');
}

main();
