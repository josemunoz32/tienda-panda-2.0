import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";
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
const auth = getAuth(app);
const db = getFirestore(app);

async function inspectAndCleanLicenses() {
  const email = "steamseeder_pandastore@gmail.com";
  const password = "PandaStoreSteam123!";
  await signInWithEmailAndPassword(auth, email, password);

  // Load all games from games collection to have a lookup
  const qGames = await getDocs(collection(db, "games"));
  const gameMap = new Map(); // appId -> gameDoc
  const gameByName = new Map(); // normalizedName -> appId
  qGames.forEach(d => {
    const data = d.data();
    const aId = String(data.app_id || d.id).trim();
    gameMap.set(aId, data);
    if (data.name) {
      const norm = data.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (norm) gameByName.set(norm, aId);
    }
  });

  const snap = await getDocs(collection(db, "licenses"));
  console.log(`Checking ${snap.size} licenses...`);

  for (const d of snap.docs) {
    const data = d.data();
    const key = data.key || d.id;
    let allowedGames = data.allowed_games || [];
    let allowedDlcs = data.allowed_dlcs || [];
    let modified = false;

    console.log(`\nLicense: ${key} (${data.client_email})`);
    console.log(`  Raw allowed_games:`, allowedGames);
    console.log(`  Raw allowed_dlcs:`, allowedDlcs);

    // If allowed_games contains "*", it's full access
    if (allowedGames.includes("*")) {
      console.log(`  -> Full access license (*)`);
      continue;
    }

    // Clean allowed_games
    const cleanGames = new Set();
    for (const g of allowedGames) {
      if (!g) continue;
      const strG = String(g).trim();
      if (!strG) continue;

      // If it's a numeric appId
      if (/^\d+$/.test(strG)) {
        cleanGames.add(strG);
        continue;
      }

      // If it's a game name
      const normG = strG.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (gameByName.has(normG)) {
        cleanGames.add(gameByName.get(normG));
        continue;
      }

      // Check special names like "Ready or Not" -> 1144200
      if (normG.includes("readyornot")) {
        cleanGames.add("1144200");
        continue;
      }
      if (normG.includes("modernwarfare3") || normG.includes("mw3")) {
        cleanGames.add("42680");
        continue;
      }
      if (normG.includes("modernwarfare4") || normG.includes("modernwarfare2007") || normG.includes("cod4")) {
        cleanGames.add("7940");
        continue;
      }
      if (normG.includes("blackflag")) {
        cleanGames.add("66088");
        continue;
      }

      // If pack with +
      if (strG.includes("+")) {
        const parts = strG.replace(/^[^(]*\(/, '').replace(/\)[^)]*$/, '').split("+");
        for (const p of parts) {
          const normP = p.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normP.includes("dayz")) cleanGames.add("221100");
          if (normP.includes("battlefield1")) cleanGames.add("1238840");
          if (normP.includes("monsterhunter")) cleanGames.add("582010");
          if (gameByName.has(normP)) cleanGames.add(gameByName.get(normP));
        }
        continue;
      }

      // Preserve if unknown
      cleanGames.add(strG);
    }

    // If 4224910 was in allowed_games (Boiling Point DLC), replace or ensure 1144200 is present
    if (cleanGames.has("4224910")) {
      cleanGames.delete("4224910");
      cleanGames.add("1144200");
    }

    const newGamesArr = Array.from(cleanGames);
    if (JSON.stringify(newGamesArr) !== JSON.stringify(allowedGames)) {
      console.log(`  -> UPDATING allowed_games:`, newGamesArr);
      await updateDoc(doc(db, "licenses", d.id), {
        allowed_games: newGamesArr
      });
      modified = true;
    }
  }

  console.log("\nAll licenses checked and cleaned!");
}

inspectAndCleanLicenses().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
