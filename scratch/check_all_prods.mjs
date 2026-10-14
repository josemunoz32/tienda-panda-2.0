import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
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

async function checkAllFirestoreProducts() {
  const snap = await getDocs(collection(db, "products"));
  const allProds = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const ONLINE_TERMS = [
    'rust', 'dayz', 'pubg', 'dead by daylight', 'sea of thieves',
    'hunt showdown', 'hunt: showdown', 'helldivers', 'battlefield 2042',
    'warzone', 'the division', 'destiny 2', 'overwatch', 'scum',
    'conan exiles', 'hell let loose', 'throne and liberty', 'first descendant',
    'once human', 'elite dangerous', 'counter-strike', 'dota', 'team fortress',
    'warframe', 'paladins', 'smite', 'naraka', 'black desert', 'skull and bones',
    'marvel rivals', 'mortal online', 'fallout 76', 'payday 3', 'chivalry',
    'mordhau', 'for honor', 'insurgency', 'war thunder', 'world of tanks',
    'world of warships', 'party animals', 'phasmophobia', 'lethal company',
    'deceit', 'texas chain saw', 'friday the 13th', 'evil dead', 'crossout',
    'enlisted', 'fall guys', 'v rising', 'path of exile', 'new world',
    'lost ark', 'final fantasy xiv', 'old republic', 'elder scrolls online',
    'guild wars', 'ark: survival', 'planetside', 'the finals', 'delta force',
    'rainbow six', 'pacify', 'devour', 'golf it', 'gang beasts'
  ];

  const matches = [];
  for (const p of allProds) {
    const name = (p.name || '').toLowerCase();
    for (const term of ONLINE_TERMS) {
      if (name.includes(term)) {
        // Exclude allowed single-player games
        if (name.includes('injustice: gods among us') || name.includes('wolf among us') || name.includes('squadrons') || name.includes('suicide squad')) continue;
        matches.push({
          id: p.id,
          name: p.name,
          categoryName: p.categoryName || '',
          categoryId: p.categoryId || '',
          app_id: p.app_id || p.appId || '',
          term
        });
        break;
      }
    }
  }

  console.log(`Total coincidencias en TODOS los productos de Firestore: ${matches.length}`);
  console.log(JSON.stringify(matches, null, 2));
  process.exit(0);
}

checkAllFirestoreProducts().catch(e => { console.error(e); process.exit(1); });
