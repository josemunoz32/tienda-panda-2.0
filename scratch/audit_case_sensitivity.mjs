import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
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

async function checkAllFixes() {
  const steamPath = path.join(process.cwd(), 'fixes/Pack_Steam/archivos_juego');
  const steamFolders = fs.existsSync(steamPath) ? fs.readdirSync(steamPath).filter(f => fs.statSync(path.join(steamPath, f)).isDirectory()) : [];

  const fixesPath = path.join(process.cwd(), 'fixes/Pack_Fixes/fixes');
  const fixFolders = fs.existsSync(fixesPath) ? fs.readdirSync(fixesPath).filter(f => fs.statSync(path.join(fixesPath, f)).isDirectory()) : [];

  const snap = await getDocs(collection(db, 'games'));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const withFix = docs.filter(g => g.fix_drive_id && g.fix_drive_id.trim() !== '');
  console.log(`=== REVISIÓN DE MAYÚSCULAS/MINÚSCULAS DE LOS ${withFix.length} FIXES ===\n`);

  let mismatchesFound = 0;

  for (const game of withFix) {
    const dbSteamFolder = game.steam_folder_name || game.name || '';
    
    // Buscar la carpeta real en Pack_Steam o Pack_Fixes (sensible a mayúsculas/minúsculas)
    const exactLocalFolder = steamFolders.find(f => f === dbSteamFolder) || fixFolders.find(f => f === dbSteamFolder);
    const insensitiveLocalFolder = steamFolders.find(f => f.toLowerCase() === dbSteamFolder.toLowerCase()) || fixFolders.find(f => f.toLowerCase() === dbSteamFolder.toLowerCase());

    if (!exactLocalFolder && insensitiveLocalFolder) {
      mismatchesFound++;
      console.log(`⚠️ DESCALCE DE MAYÚSCULAS EN: '${game.name}' (AppID: ${game.id})`);
      console.log(`   - En Firestore actual: '${dbSteamFolder}'`);
      console.log(`   - En carpeta real de Steam: '${insensitiveLocalFolder}'`);

      // Corregir inmediatamente en Firestore
      await setDoc(doc(db, 'games', game.id), {
        steam_folder_name: insensitiveLocalFolder
      }, { merge: true });
      console.log(`   ✅ CORREGIDO en Firestore a '${insensitiveLocalFolder}'\n`);
    }
  }

  if (mismatchesFound === 0) {
    console.log('✅ EXCELENTE: Todos los juegos con Fix coinciden exactamente en mayúsculas y minúsculas con la carpeta oficial de Steam.');
  } else {
    console.log(`🎉 Se detectaron y corrigieron automáticamente ${mismatchesFound} descalces en la base de datos.`);
  }

  process.exit(0);
}

checkAllFixes().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
