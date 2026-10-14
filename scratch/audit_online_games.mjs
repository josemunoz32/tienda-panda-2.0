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

const KNOWN_ONLINE_SUSPECTS = [
  'rust', 'dayz', 'pubg', 'rainbow six', 'dead by daylight', 'sea of thieves',
  'hunt: showdown', 'hunt showdown', 'helldivers 2', 'battlefield 2042',
  'warzone', 'the division', 'destiny 2', 'overwatch', 'scum', 'conan exiles',
  'hell let loose', 'throne and liberty', 'the first descendant', 'once human',
  'elite dangerous', 'counter-strike', 'dota 2', 'team fortress', 'warframe',
  'paladins', 'smite', 'naraka', 'black desert', 'skull and bones', 'marvel rivals',
  'mortal online', 'fallout 76', 'squad', 'arma 3', 'payday 3', 'chivalry 2',
  'mordhau', 'for honor', 'insurgency', 'war thunder', 'world of tanks', 'world of warships',
  'party animals', 'among us', 'phasmophobia', 'lethal company', 'deceit', 'texas chain saw',
  'friday the 13th', 'evil dead', 'crossout', 'enlisted', 'viva piñata', 'fall guys',
  'v rising', 'path of exile', 'new world', 'lost ark', 'final fantasy xiv', 'star wars: the old republic',
  'elder scrolls online', 'guild wars 2'
];

async function scan() {
  console.log("=== 1. ESCANEANDO FIRESTORE 'products' ===");
  const productsSnap = await getDocs(collection(db, "products"));
  const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Total productos en Firestore: ${products.length}`);

  const steamProducts = products.filter(p => {
    const cat = ((p.categoryName || '') + ' ' + (p.categoryId || '') + ' ' + (p.plataforma || '')).toLowerCase();
    return cat.includes('steam') || p.app_id || (p.id && p.id.startsWith('steam'));
  });
  console.log(`Productos de Steam en Firestore: ${steamProducts.length}`);

  const flaggedProducts = [];
  for (const p of products) {
    const name = (p.name || '').toLowerCase();
    const match = KNOWN_ONLINE_SUSPECTS.find(s => name.includes(s));
    if (match) {
      flaggedProducts.push({ id: p.id, name: p.name, category: p.categoryName || p.categoryId, match, appId: p.app_id });
    }
  }
  console.log(`Productos marcados como online/sospechosos en Firestore: ${flaggedProducts.length}`);
  console.log(JSON.stringify(flaggedProducts, null, 2));

  console.log("\n=== 2. ESCANEANDO 'steam_import_data.json' ===");
  const importPath = path.join(process.cwd(), 'src/assets/steam_import_data.json');
  if (fs.existsSync(importPath)) {
    const importData = JSON.parse(fs.readFileSync(importPath, 'utf8'));
    console.log(`Total juegos en steam_import_data.json: ${importData.length}`);
    const flaggedImport = importData.filter(g => {
      const name = (g.name || '').toLowerCase();
      return KNOWN_ONLINE_SUSPECTS.some(s => name.includes(s));
    });
    console.log(`Juegos sospechosos en steam_import_data.json: ${flaggedImport.length}`);
    flaggedImport.forEach(g => console.log(` - [${g.app_id}] ${g.name}`));
  }

  console.log("\n=== 3. ESCANEANDO 'steam_fast_lookup.json' ===");
  const lookupPath = path.join(process.cwd(), 'src/assets/steam_fast_lookup.json');
  if (fs.existsSync(lookupPath)) {
    const lookupData = JSON.parse(fs.readFileSync(lookupPath, 'utf8'));
    const keys = Object.keys(lookupData);
    console.log(`Total keys en steam_fast_lookup.json: ${keys.length}`);
    const flaggedLookup = [];
    for (const k of keys) {
      if (KNOWN_ONLINE_SUSPECTS.some(s => k.includes(s.replace(/[^a-z0-9]/g, '')))) {
        flaggedLookup.push({ key: k, data: lookupData[k] });
      }
    }
    console.log(`Keys sospechosas en steam_fast_lookup.json: ${flaggedLookup.length}`);
    flaggedLookup.forEach(item => console.log(` - key: ${item.key} -> app_id: ${item.data.app_id}`));
  }

  console.log("\n=== 4. ESCANEANDO 'vipGamesData.json' ===");
  const vipPath = path.join(process.cwd(), 'src/utils/vipGamesData.json');
  if (fs.existsSync(vipPath)) {
    const vipData = JSON.parse(fs.readFileSync(vipPath, 'utf8'));
    const flaggedVip = vipData.filter(g => {
      const name = (g.name || '').toLowerCase();
      return KNOWN_ONLINE_SUSPECTS.some(s => name.includes(s));
    });
    console.log(`Juegos sospechosos en vipGamesData.json: ${flaggedVip.length}`);
    flaggedVip.forEach(g => console.log(` - [${g.app_id}] ${g.name}`));
  }

  process.exit(0);
}

scan().catch(e => { console.error(e); process.exit(1); });
