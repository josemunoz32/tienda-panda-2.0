import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const firebaseConfig = {
  apiKey: envVars.REACT_APP_FIREBASE_API_KEY,
  authDomain: envVars.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: envVars.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const patterns = [
  { label: 'Farming Simulator 2011-2015', test: (name, appId) => /farming\s*simulator.*(2011|2013|15\b|2015)/i.test(name) || ['90200', '220260', '313160'].includes(String(appId)) },
  { label: 'Spore', test: (name, appId) => /\bspore\b/i.test(name) || String(appId) === '17390' },
  { label: 'Crysis 2007 / Warhead', test: (name, appId) => (/crysis\b/i.test(name) && !/remastered/i.test(name)) || ['17300', '17330'].includes(String(appId)) },
  { label: 'Arma 2 / 3', test: (name, appId) => /\barma\s*(2|3|ii|iii)\b/i.test(name) || ['33900', '33930', '107410'].includes(String(appId)) },
  { label: 'Fallout 3', test: (name, appId) => /fallout\s*3\b/i.test(name) || ['22300', '22370'].includes(String(appId)) },
  { label: 'FlatOut Ultimate Carnage', test: (name, appId) => /flatout.*ultimate\s*carnage/i.test(name) || String(appId) === '12360' },
  { label: 'The Settlers 7', test: (name, appId) => /settlers.*7/i.test(name) || ['48120', '57520'].includes(String(appId)) },
  { label: 'Anno 1404', test: (name, appId) => /anno\s*1404/i.test(name) || ['33250', '33230'].includes(String(appId)) },
  { label: 'The Guild 2', test: (name, appId) => /the\s*guild\s*2/i.test(name) || ['39650', '39660', '39670'].includes(String(appId)) },
  { label: 'Diablo IV', test: (name, appId) => /diablo\s*(iv|4)/i.test(name) || String(appId) === '2344520' },
  { label: 'Call of Duty MW2 / MW3 / Black Ops', test: (name, appId) => /call\s*of\s*duty.*(modern\s*warfare\s*(2|3|ii|iii)|black\s*ops)/i.test(name) || ['10180', '42680', '42700', '42710', '311210', '1938090', '2519060'].includes(String(appId)) },
  { label: 'Battlefield (EA App)', test: (name, appId) => /battlefield/i.test(name) || ['1238820', '1238860', '1238840', '1517290', '1238880', '1238810'].includes(String(appId)) }
];

async function run() {
  const snap = await getDocs(collection(db, "games"));
  console.log(`Total documentos en Firestore: ${snap.size}`);
  
  const matches = [];
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const name = data.name || '';
    const appId = data.app_id || data.appId || '';

    for (const p of patterns) {
      if (p.test(name, appId)) {
        matches.push({
          docId: docSnap.id,
          name: name,
          appId: appId,
          category: p.label
        });
        break;
      }
    }
  });

  console.log(`\nJuegos encontrados para remover (${matches.length}):`);
  matches.forEach(m => {
    console.log(`- [${m.category}] Doc: ${m.docId} | AppID: ${m.appId} | Nombre: ${m.name}`);
  });

  fs.writeFileSync('scratch/matched_removals.json', JSON.stringify(matches, null, 2));
}

run().catch(console.error);
