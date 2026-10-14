import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function checkFixes() {
  const fixesZipNames = [
    'Borderlands 3',
    'Dragons Dogma 2',
    'Granblue Fantasy Relink',
    'Lies of P',
    'Monster Hunter Rise',
    'NARUTO SHIPPUDEN Ultimate Ninja',
    'P5R',
    'Remnant II',
    'Tiny Tina'
  ];

  const snap = await getDocs(collection(db, 'games'));
  const games = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log('=== ESTADO DE LOS 9 FIXES EN FIRESTORE ===');
  fixesZipNames.forEach(fn => {
    const g = games.find(game => game.name.toLowerCase().includes(fn.toLowerCase()) || fn.toLowerCase().includes(game.name.toLowerCase()));
    if (g) {
      console.log(`Juego: ${g.name} | AppID: ${g.id} | Fix Link: ${g.fix_drive_id || 'SIN FIX'}`);
    } else {
      console.log(`Juego query: '${fn}' NO ENCONTRADO EN FIRESTORE`);
    }
  });
  process.exit(0);
}

checkFixes();
