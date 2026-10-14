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

// Exhaustive list of non-base game keywords
const NON_BASE_KEYWORDS = [
  'soundtrack', 'ost', 'artbook', 'dlc', 'expansion pack', 'bonus content',
  'wallpaper', 'demo', 'playtest', 'dedicated server', 'sdk', 'mod kit', 'add-on',
  'season pass', 'content pack', 'upgrade pack', 'cosmetic', 'skin pack',
  'supporter pack', 'sound track', 'digital artbook', 'original score', 'pre-order bonus'
];

async function auditAndCleanDeep() {
  console.log('🧹 Ejecutando auditoría profunda de manifiestos y catálogo...');
  const snap = await getDocs(collection(db, 'games'));
  
  let deletedCount = 0;
  let luaOnlyCount = 0;
  let luaFixCount = 0;
  let bypassCount = 0;
  let buildCount = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const id = docSnap.id;
    const name = (data.name || '').toLowerCase();
    const fixUrl = (data.fix_drive_id || data.fix_download_url || '').toLowerCase();

    // 1. Filtrar si es DLC / Soundtrack / Contenido Secundario
    const isNonBase = NON_BASE_KEYWORDS.some(kw => name.includes(kw));

    if (isNonBase) {
      console.log(`🗑️ Eliminando contenido no-base: "${data.name}" (${id})`);
      await deleteDoc(doc(db, 'games', id));
      deletedCount++;
      continue;
    }

    // 2. Determinar categoría técnica exacta (LUA, FIX, BYPASS, BUILD)
    let technicalCategory = 'solo_lua';

    if (name.includes('bypass') || fixUrl.includes('bypass') || data.is_bypass) {
      technicalCategory = 'bypass';
      bypassCount++;
    } else if (data.is_build || data.build_url || fixUrl.includes('build')) {
      technicalCategory = 'build_completa';
      buildCount++;
    } else if (data.fix_drive_id || data.fix_download_url || data.has_fix) {
      technicalCategory = 'lua_fix';
      luaFixCount++;
    } else {
      luaOnlyCount++;
    }

    await updateDoc(doc(db, 'games', id), {
      technical_category: technicalCategory,
      is_base_game: true
    });
  }

  console.log('\n==================================================');
  console.log('✅ AUDITORÍA DE MANIFIESTOS Y CATÁLOGO COMPLETADA');
  console.log('==================================================');
  console.log(`- Total DLCs/Soundtracks Eliminados: ${deletedCount}`);
  console.log(`- Juegos Base "Solo LUA": ${luaOnlyCount}`);
  console.log(`- Juegos Base "LUA + FIX": ${luaFixCount}`);
  console.log(`- Juegos Base "BYPASS": ${bypassCount}`);
  console.log(`- Juegos Base "BUILD Completa": ${buildCount}`);
  process.exit(0);
}

auditAndCleanDeep();
