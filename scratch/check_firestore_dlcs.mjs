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

async function checkFirestoreGamesInRyuu() {
  const qGames = await getDocs(collection(db, "games"));
  console.log(`Firestore games count: ${qGames.size}`);

  const res = await fetch("https://generator.ryuu.lol/files/games.json");
  const ryuuGames = await res.json();
  const ryuuMap = new Map();
  ryuuGames.forEach(r => {
    if (r.appid) ryuuMap.set(String(r.appid), r);
  });

  let gamesWithDlcs = 0;
  qGames.forEach(d => {
    const data = d.data();
    const appId = String(data.app_id || d.id).trim();
    const rGame = ryuuMap.get(appId);
    if (rGame && rGame.dlc && typeof rGame.dlc === 'object') {
      const dlcKeys = Object.keys(rGame.dlc);
      if (dlcKeys.length > 0) {
        gamesWithDlcs++;
        if (gamesWithDlcs <= 10 || appId === "1144200") {
          console.log(`Game with DLCs in Ryuu: appId=${appId} (${data.name}) -> ${dlcKeys.length} DLCs`);
        }
      }
    }
  });

  console.log(`Total Firestore games that have DLCs in Ryuu: ${gamesWithDlcs} out of ${qGames.size}!`);
}

checkFirestoreGamesInRyuu().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
