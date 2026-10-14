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

const targets = [
  'Call of Duty Modern Warfare',
  'Gears of War Reloaded',
  'I Am Bread',
  'TCG Card Shop Simulator',
  'The Outlast Trials'
];

const steamPath = path.join(process.cwd(), 'fixes/Pack_Steam/archivos_juego');

async function syncNewLuas() {
  const snap = await getDocs(collection(db, 'games'));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  for (const name of targets) {
    const dirPath = path.join(steamPath, name);
    if (!fs.existsSync(dirPath)) {
      console.log('❌ No existe directorio:', dirPath);
      continue;
    }

    const luaFile = fs.readdirSync(dirPath).find(f => f.endsWith('.lua'));
    if (!luaFile) {
      console.log('⚠️ No se encontró archivo .lua en:', name);
      continue;
    }

    const appId = path.basename(luaFile, '.lua');
    const luaContent = fs.readFileSync(path.join(dirPath, luaFile), 'utf8');

    console.log(`✔ Juego: '${name}' | AppID detectado: ${appId}`);

    let targetDoc = docs.find(g => g.id === appId || (g.name || '').toLowerCase() === name.toLowerCase());

    await setDoc(doc(db, 'games', appId), {
      name: name,
      steam_folder_name: name,
      lua_file: luaContent,
      price: targetDoc?.price || 2490,
      badge: targetDoc?.badge || 'POPULAR',
      category: targetDoc?.category || 'Acción',
      description: targetDoc?.description || `Disfruta de ${name} con activación oficial en PandaStore.`
    }, { merge: true });

    console.log(`✅ ${name} (AppID: ${appId}) actualizado con éxito en Firestore!`);
  }

  console.log('🎉 Todos los archivos .lua nuevos se subieron correctamente.');
  process.exit(0);
}

syncNewLuas().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
