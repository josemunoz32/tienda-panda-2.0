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
  console.log("Escaneando carpetas y subcarpetas de GoFile...");
  const gofileFilesMap = await getAllGofileFiles(ROOT_FOLDER_ID);
  console.log(`🔍 Total de archivos ZIP encontrados en GoFile: ${Object.keys(gofileFilesMap).length}`);

  const targetNewFixes = [
    'atlas fallen.zip',
    'bleach rebirth of souls.zip',
    'db xenoverse.zip',
    'dusk.zip',
    'outer wilds.zip',
    'slay the spire 2.zip',
    'slime rancher 2.zip',
    'ultrakill.zip',
    'wreckfest 2.zip'
  ];

  console.log('\n--- VERIFICACIÓN DE LOS 9 NUEVOS FIXES SUBIDOS ---');
  for (const name of targetNewFixes) {
    console.log(`- ${name} => ${gofileFilesMap[name] || '❌ No encontrado con ese nombre exacto'}`);
  }

  const baseDir = path.join(process.cwd(), 'fixes', 'Pack_Steam', 'archivos_juego');
  const gameFolders = fs.readdirSync(baseDir);

  let syncedLuas = 0;
  let linkedFixes = 0;
  const newlyLinkedGames = [];

  for (const gameFolder of gameFolders) {
    const folderPath = path.join(baseDir, gameFolder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      if (file.endsWith('.lua')) {
        const appId = file.replace('.lua', '').trim();
        const luaContent = fs.readFileSync(path.join(folderPath, file), 'utf8');

        let zipLink = null;
        let matchedZipName = null;

        const candidates = [
          (gameFolder + '.zip').toLowerCase(),
          (gameFolder.replace(/[^a-zA-Z0-9]/g, '') + '.zip').toLowerCase(),
          (gameFolder + ' fix.zip').toLowerCase(),
          (gameFolder + ' fix 2.zip').toLowerCase()
        ];

        for (const candidate of candidates) {
          if (gofileFilesMap[candidate]) {
            zipLink = gofileFilesMap[candidate];
            matchedZipName = candidate;
            break;
          }
        }

        if (!zipLink) {
          const normFolder = gameFolder.toLowerCase().replace(/[^a-z0-9]/g, '');
          for (const zipName of Object.keys(gofileFilesMap)) {
            const normZip = zipName.replace(/\.zip$/i, '').replace(/[^a-z0-9]/g, '');
            if (normFolder === normZip || (normFolder.length > 4 && normZip.includes(normFolder)) || (normFolder.length > 4 && normFolder.includes(normZip))) {
              zipLink = gofileFilesMap[zipName];
              matchedZipName = zipName;
              break;
            }
          }
        }

        const gameDocRef = doc(db, 'games', appId);
        const docData = {
          app_id: appId,
          name: gameFolder,
          lua_script: luaContent,
          updated_at: new Date().toISOString()
        };

        if (zipLink) {
          docData.download_url = zipLink;
          docData.has_fix = true;
          linkedFixes++;
          newlyLinkedGames.push({ gameFolder, appId, matchedZipName, zipLink });
        }

        await setDoc(gameDocRef, docData, { merge: true });
        syncedLuas++;
      }
    }
  }

  console.log('\n=============================================');
  console.log('🎉 PROCESO DE SINCRONIZACIÓN FINALIZADO:');
  console.log(`- Total LUAs procesados y subidos a Firestore: ${syncedLuas}`);
  console.log(`- Total de Fixes (ZIPs GoFile) vinculados: ${linkedFixes}`);
  console.log('=============================================\n');

  if (newlyLinkedGames.length > 0) {
    console.log('Últimos fixes vinculados con éxito:');
    newlyLinkedGames.slice(-15).forEach(g => console.log(`✓ ${g.gameFolder} (AppID ${g.appId}) -> ${g.matchedZipName}`));
  }
}

main();
