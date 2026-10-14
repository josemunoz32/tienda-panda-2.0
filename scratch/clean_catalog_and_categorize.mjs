import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const app = initializeApp({
  apiKey: envVars.REACT_APP_FIREBASE_API_KEY,
  authDomain: envVars.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: envVars.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.REACT_APP_FIREBASE_APP_ID
});

const db = getFirestore(app);

// Keywords that indicate non-base game content
const NON_BASE_KEYWORDS = [
  'soundtrack', 'ost', 'artbook', 'dlc', 'expansion pack', 'bonus content',
  'wallpaper', 'demo', 'playtest', 'dedicated server', 'sdk', 'mod kit', 'add-on', 'season pass'
];

async function runClean() {
  console.log('🔍 Iniciando auditoría y categorización técnica del catálogo...');
  const snap = await getDocs(collection(db, 'games'));
  
  let deletedCount = 0;
  let updatedCount = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const id = docSnap.id;
    const name = (data.name || '').toLowerCase();

    // Check if it's DLC/Soundtrack/Demo
    const isNonBase = NON_BASE_KEYWORDS.some(kw => name.includes(kw));

    if (isNonBase) {
      console.log(`🗑️ Eliminando contenido secundario/DLC: "${data.name}" (${id})`);
      await deleteDoc(doc(db, 'games', id));
      deletedCount++;
      continue;
    }

    // Categorización Técnica
    let categoryTag = 'solo_lua';
    if (data.fix_drive_id || data.has_fix) {
      categoryTag = 'lua_fix';
    } else if (data.is_build || data.build_url) {
      categoryTag = 'build_completa';
    }

    await updateDoc(doc(db, 'games', id), {
      technical_category: categoryTag,
      is_base_game: true
    });
    updatedCount++;
  }

  console.log(`\n✅ Proceso completado:`);
  console.log(`- Juegos Base Actualizados & Categorizados: ${updatedCount}`);
  console.log(`- DLCs/Soundtracks/Demos Eliminados: ${deletedCount}`);
  process.exit(0);
}

runClean();
