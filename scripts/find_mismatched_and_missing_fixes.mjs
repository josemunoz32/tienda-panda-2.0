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

const fixesPath = path.join(process.cwd(), 'fixes/Pack_Fixes/fixes');
const steamPath = path.join(process.cwd(), 'fixes/Pack_Steam/archivos_juego');

async function analyzeMismatches() {
  try {
    const snap = await getDocs(collection(db, "games"));
    const firestoreGames = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const fixFolders = fs.readdirSync(fixesPath).filter(f => fs.statSync(path.join(fixesPath, f)).isDirectory());
    const steamFolders = fs.readdirSync(steamPath).filter(f => fs.statSync(path.join(steamPath, f)).isDirectory());

    console.log("==========================================");
    console.log("ANÁLISIS COMPLETO DE MATCHER DE FIXES");
    console.log("==========================================");

    const report = [];

    for (const fixName of fixFolders) {
      // Find matching game doc in Firestore
      let match = firestoreGames.find(g =>
        g.name.toLowerCase() === fixName.toLowerCase() ||
        g.steam_folder_name.toLowerCase() === fixName.toLowerCase()
      );

      // Special manual mappings if names differ
      if (!match) {
        const lowerFix = fixName.toLowerCase();
        if (lowerFix === 'afop') {
          match = firestoreGames.find(g => g.name.toLowerCase().includes('avatar'));
        } else if (lowerFix.includes('resident evil requiem') || lowerFix.includes('biohazard requiem')) {
          match = firestoreGames.find(g => g.name.toLowerCase().includes('resident evil requiem'));
        } else if (lowerFix === 'sekiro') {
          match = firestoreGames.find(g => g.name.toLowerCase().includes('sekiro'));
        } else if (lowerFix.includes('hogwarts')) {
          match = firestoreGames.find(g => g.name.toLowerCase().includes('hogwart'));
        } else if (lowerFix.includes('grand theft auto iv') || lowerFix.includes('gta iv')) {
          match = firestoreGames.find(g => g.name.toLowerCase().includes('gta iv') || g.name.toLowerCase().includes('grand theft auto iv'));
        } else if (lowerFix.includes('lego batman')) {
          match = firestoreGames.find(g => g.name.toLowerCase().includes('lego batman'));
        } else if (lowerFix.includes('assassins creed valhalla')) {
          match = firestoreGames.find(g => g.name.toLowerCase().includes('valhalla'));
        }
      }

      const hasUrl = !!(match && match.fix_drive_id);
      report.push({
        fixFolder: fixName,
        matchedGame: match ? `${match.name} (AppID: ${match.id})` : '⚠️ No encontrado en LUA',
        appId: match?.id,
        status: hasUrl ? '✅ CONFIGURADO' : '❌ PENDIENTE',
        url: match?.fix_drive_id || ''
      });
    }

    console.log("\n--- REPORTES DE LOS 53 FIXES ---");
    report.forEach((r, idx) => {
      console.log(`[${idx + 1}] Fix Folder: "${r.fixFolder}"`);
      console.log(`    Juego Web: ${r.matchedGame}`);
      console.log(`    Estado: ${r.status}`);
      if (r.url) console.log(`    URL GoFile: ${r.url}`);
      console.log("-".repeat(40));
    });

    const pending = report.filter(r => r.status === '❌ PENDIENTE');
    console.log(`\n==========================================`);
    console.log(`TOTAL CONFIGURADOS: ${report.length - pending.length} de 53`);
    console.log(`TOTAL PENDIENTES: ${pending.length} de 53`);
    console.log(`==========================================`);

    console.log("\nLISTA DE FIXES PENDIENTES PARA SUBIDA MANUAL:");
    pending.forEach(p => {
      console.log(`- Carpetas Fix: "${p.fixFolder}" ➔ Juego Web: ${p.matchedGame}`);
    });

    process.exit(0);

  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

analyzeMismatches();
