import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";

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
  appId: envVars.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const NON_BASE_KEYWORDS = [
  'soundtrack', 'ost', 'artbook', 'dlc', 'expansion pack', 'bonus content',
  'wallpaper', 'demo', 'playtest', 'dedicated server', 'sdk', 'mod kit', 'add-on',
  'season pass', 'content pack', 'upgrade pack', 'cosmetic', 'skin pack',
  'supporter pack', 'sound track', 'digital artbook', 'original score', 'pre-order bonus'
];

async function simulateFetchGames() {
  const [snap, prodSnap] = await Promise.all([
    getDocs(collection(db, "games")),
    getDocs(collection(db, "products"))
  ]);

  const list = [];
  snap.forEach(d => {
    list.push({ id: d.id, ...d.data() });
  });

  const steamImportData = JSON.parse(fs.readFileSync("./src/assets/steam_import_data.json", "utf8"));
  steamImportData.forEach(s => {
    const appIdStr = String(s.app_id || s.id || "");
    if (!list.some(g => String(g.app_id || g.id) === appIdStr)) {
      list.push({
        id: appIdStr,
        app_id: appIdStr,
        name: s.name,
        steam_folder_name: s.name
      });
    }
  });

  console.log(`Total games in list: ${list.length}`);
  const nonBaseFound = [];
  list.forEach(item => {
    const name = (item.name || '').toLowerCase();
    const folder = (item.steam_folder_name || '').toLowerCase();
    if (NON_BASE_KEYWORDS.some(kw => name.includes(kw) || folder.includes(kw))) {
      nonBaseFound.push({ id: item.id, appId: item.app_id, name: item.name });
    }
  });

  console.log(`Non-base games found in list: ${nonBaseFound.length}`);
  nonBaseFound.forEach(nb => {
    console.log(`  - [${nb.appId || nb.id}] "${nb.name}"`);
  });
}

simulateFetchGames().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
