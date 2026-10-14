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

async function checkNonBase() {
  const qGames = await getDocs(collection(db, "games"));
  console.log(`Checking ${qGames.size} games in Firestore...`);
  let nonBaseCount = 0;
  qGames.forEach(d => {
    const data = d.data();
    const name = (data.name || '').toLowerCase();
    const folder = (data.steam_folder_name || '').toLowerCase();
    const isNonBase = NON_BASE_KEYWORDS.some(kw => name.includes(kw) || folder.includes(kw)) || data.is_base_game === false;
    if (isNonBase) {
      nonBaseCount++;
      console.log(`Non-base #${nonBaseCount}: docId=${d.id} | appId=${data.app_id} | name="${data.name}" | is_base_game=${data.is_base_game}`);
    }
  });
  console.log(`Total non-base found in Firestore games: ${nonBaseCount}`);
}

checkNonBase().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
