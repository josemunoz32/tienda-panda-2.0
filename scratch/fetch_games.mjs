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

async function run() {
  const snap = await getDocs(collection(db, 'games'));
  const games = snap.docs.map(d => ({ appId: d.id, name: d.data().name, hasFix: !!d.data().fix_drive_id }));
  console.log('TOTAL_GAMES:', games.length);
  console.log('GAMES_WITH_FIX:', games.filter(g => g.hasFix).length);
  
  games.sort((a, b) => a.name.localeCompare(b.name));
  
  if (!fs.existsSync('scratch')) fs.mkdirSync('scratch');
  fs.writeFileSync('listado_juegos.json', JSON.stringify(games, null, 2));
  console.log('Fichero escrito con exito:', games.length);
  process.exit(0);
}

run();
