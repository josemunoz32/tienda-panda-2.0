import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
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
const AUTH_CODE = 'RYUUMANIFEST1uypp1';

const NON_BASE_KEYWORDS = [
  'soundtrack', 'ost', 'artbook', 'dlc', 'expansion pack', 'bonus content',
  'wallpaper', 'demo', 'playtest', 'dedicated server', 'sdk', 'mod kit', 'add-on',
  'season pass', 'content pack', 'upgrade pack', 'cosmetic', 'skin pack',
  'supporter pack', 'sound track', 'digital artbook', 'original score', 'pre-order bonus'
];

async function syncRyuuApiToFirestore() {
  console.log('🚀 Conectando a la API de Ryuu / Ryuk...');
  
  // 1. Fetch games.json and fixes.json from Ryuu API
  const gamesRes = await fetch('https://generator.ryuu.lol/files/games.json');
  const ryuuGames = await gamesRes.json(); // Map or Array of game entries

  const fixesRes = await fetch('https://generator.ryuu.lol/files/fixes.json');
  const ryuuFixes = await fixesRes.json(); // List of fixes

  console.log(`📦 Datos recibidos de Ryuu: ${Object.keys(ryuuGames).length || ryuuGames.length} juegos en API.`);

  // 2. Fetch current Firestore games
  const snap = await getDocs(collection(db, 'games'));
  const currentDocs = new Map(snap.docs.map(d => [d.id, d.data()]));

  let updatedCount = 0;
  let deletedCount = 0;

  // Process all Firestore documents to clean non-base content and update Ryuu API metadata
  for (const [id, data] of currentDocs.entries()) {
    const name = (data.name || '').toLowerCase();

    // Check if it's DLC/Soundtrack/Demo
    if (NON_BASE_KEYWORDS.some(kw => name.includes(kw))) {
      console.log(`🗑️ Eliminando DLC/Secundario de Firestore: "${data.name}" (${id})`);
      await deleteDoc(doc(db, 'games', id));
      deletedCount++;
      continue;
    }

    // Match with Ryuu Fixes API
    const appIdStr = (data.app_id || id).toString().trim();
    let matchingFix = null;

    if (Array.isArray(ryuuFixes)) {
      matchingFix = ryuuFixes.find(f => {
        const fname = (typeof f === 'string' ? f : (f.filename || f.name || '')).toLowerCase();
        return fname.includes(appIdStr) || (data.name && fname.includes(data.name.toLowerCase().replace(/[^a-z0-9]/g, '')));
      });
    }

    let fixUrl = data.fix_drive_id || data.fix_download_url || '';
    if (matchingFix) {
      const fixFileName = typeof matchingFix === 'string' ? matchingFix : (matchingFix.filename || matchingFix.name);
      fixUrl = `https://generator.ryuu.lol/fixes/${fixFileName}?auth_code=${AUTH_CODE}`;
    }

    // Determine technical category
    let techCategory = 'solo_lua';
    if (name.includes('bypass') || fixUrl.includes('bypass')) {
      techCategory = 'bypass';
    } else if (data.is_build || fixUrl.includes('build')) {
      techCategory = 'build_completa';
    } else if (fixUrl || data.has_fix) {
      techCategory = 'lua_fix';
    }

    // Construct Ryuu API URLs
    const manifestApiUrl = `https://generator.ryuu.lol/secure_download?appid=${appIdStr}&auth_code=${AUTH_CODE}`;
    const luaApiUrl = `https://generator.ryuu.lol/resellerlua?appid=${appIdStr}&auth_code=${AUTH_CODE}`;

    await setDoc(doc(db, 'games', id), {
      ...data,
      is_base_game: true,
      technical_category: techCategory,
      ryuu_manifest_api: manifestApiUrl,
      ryuu_lua_api: luaApiUrl,
      fix_drive_id: fixUrl
    }, { merge: true });

    updatedCount++;
  }

  console.log('\n==================================================');
  console.log('✅ SINCRONIZACIÓN CON API DE RYUU COMPLETADA');
  console.log('==================================================');
  console.log(`- Juegos Base Actualizados con API Ryuu: ${updatedCount}`);
  console.log(`- DLCs/Soundtracks Eliminados: ${deletedCount}`);
  process.exit(0);
}

syncRyuuApiToFirestore();
