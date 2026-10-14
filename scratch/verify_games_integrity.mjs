import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

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

async function verifyAllGames() {
  const snap = await getDocs(collection(db, 'games'));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`=== AUDITORÍA COMPLETA DE NUBE FIRESTORE (${docs.length} JUEGOS) ===\n`);

  let missingLua = [];
  let missingFixUrl = [];
  let validGames = [];

  for (const game of docs) {
    const name = game.name || game.steam_folder_name || game.id;
    const hasLua = !!game.lua_content;
    const fixUrl = game.fix_drive_id || game.fix_download_url || "";

    if (!hasLua) {
      missingLua.push({ id: game.id, name });
    }
    if (!fixUrl) {
      missingFixUrl.push({ id: game.id, name });
    }
    if (hasLua && fixUrl) {
      validGames.push({ id: game.id, name, fixUrl });
    }
  }

  console.log(`✅ Juegos 100% COMPLETOS (con LUA + Link de Fix GoFile): ${validGames.length}`);
  console.log(`⚠️ Juegos sin LUA activador: ${missingLua.length}`);
  console.log(`ℹ️ Juegos solo con LUA (sin Fix configurado / no requieren fix): ${missingFixUrl.length}\n`);

  if (missingLua.length > 0) {
    console.log("--- Lista de Juegos sin LUA ---");
    missingLua.forEach(g => console.log(`  - AppID: ${g.id} | Nombre: ${g.name}`));
  }

  process.exit(0);
}

verifyAllGames();
