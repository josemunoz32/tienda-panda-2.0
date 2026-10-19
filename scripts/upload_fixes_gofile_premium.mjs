import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const GOFILE_PREMIUM_TOKEN = process.env.GOFILE_PREMIUM_TOKEN || "";

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

function zipFolderNative(sourceDir, outPath) {
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
  const safeSource = sourceDir.replace(/'/g, "''");
  const safeOut = outPath.replace(/'/g, "''");
  const cmd = `powershell -Command "Compress-Archive -Path '${safeSource}\\*' -DestinationPath '${safeOut}' -Force"`;
  execSync(cmd, { stdio: 'ignore' });
  return outPath;
}

async function uploadFixesToGofilePremium() {
  if (!fs.existsSync(fixesPath)) {
    console.error("No se encontró la carpeta fixes:", fixesPath);
    return;
  }

  const fixFolders = fs.readdirSync(fixesPath).filter(f => fs.statSync(path.join(fixesPath, f)).isDirectory());
  console.log(`🚀 Iniciando subida de ${fixFolders.length} Fixes a GoFile Premium con Token Token Premium...`);

  // Fetch GoFile Server
  const serverRes = await fetch("https://api.gofile.io/servers", {
    headers: { "Authorization": `Bearer ${GOFILE_PREMIUM_TOKEN}` }
  });
  const serverJson = await serverRes.json();
  const serverName = serverJson?.data?.servers?.[0]?.name || "store-eu-par-7";

  const tempDir = path.join(process.cwd(), 'scratch/temp_zip_fixes_premium');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const snap = await getDocs(collection(db, "games"));
  const allGameDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  let count = 0;

  for (const folderName of fixFolders) {
    count++;
    
    // Find AppID match by steam_folder_name or local folder search
    let targetDoc = allGameDocs.find(g => (g.steam_folder_name || g.name || '').toLowerCase() === folderName.toLowerCase());

    if (!targetDoc && fs.existsSync(steamPath)) {
      const matchFolder = fs.readdirSync(steamPath).find(f => f.toLowerCase() === folderName.toLowerCase());
      if (matchFolder) {
        const luaFile = fs.readdirSync(path.join(steamPath, matchFolder)).find(f => f.endsWith('.lua'));
        if (luaFile) {
          const appId = path.basename(luaFile, '.lua');
          targetDoc = allGameDocs.find(g => g.id === appId);
        }
      }
    }

    const safeFileName = folderName.replace(/[^a-zA-Z0-9]/g, '_');
    const tempZipFile = path.join(tempDir, `${safeFileName}_fix.zip`);

    try {
      console.log(`\n[${count}/${fixFolders.length}] 📦 Comprimiendo y subiendo Fix Premium de: '${folderName}'...`);
      zipFolderNative(path.join(fixesPath, folderName), tempZipFile);

      const fileBuffer = fs.readFileSync(tempZipFile);
      const fileBlob = new Blob([fileBuffer], { type: 'application/zip' });
      const formData = new FormData();
      formData.append('file', fileBlob, `${safeFileName}_fix.zip`);

      const uploadRes = await fetch(`https://${serverName}.gofile.io/contents/uploadfile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GOFILE_PREMIUM_TOKEN}`
        },
        body: formData
      });

      const uploadJson = await uploadRes.json();
      const folderCode = uploadJson?.data?.parentFolderCode || uploadJson?.data?.code;

      if (!folderCode) {
        console.error(`⚠️ Error en subida GoFile para ${folderName}:`, JSON.stringify(uploadJson));
        continue;
      }

      // Query folder contents to get direct web link with premium token
      const contentsRes = await fetch(`https://api.gofile.io/contents/${folderCode}`, {
        headers: { 'Authorization': `Bearer ${GOFILE_PREMIUM_TOKEN}` }
      });
      const contentsJson = await contentsRes.json();
      
      const children = contentsJson?.data?.children || {};
      const childKeys = Object.keys(children);
      let directLink = "";

      if (childKeys.length > 0) {
        directLink = children[childKeys[0]]?.link;
      }

      const finalFixUrl = directLink || `https://gofile.io/d/${folderCode}`;
      console.log(`✅ Subido a GoFile Premium (${folderName}): ${finalFixUrl}`);

      // Save to Firestore
      if (targetDoc) {
        await setDoc(doc(db, "games", targetDoc.id), {
          fix_drive_id: finalFixUrl
        }, { merge: true });
        console.log(`✔ Enlace de Fix actualizado en Firestore para: '${targetDoc.name}' (AppID: ${targetDoc.id})`);
      } else {
        const normalizedAppId = folderName.replace(/[^0-9]/g, '') || `fix_${safeFileName}`;
        await setDoc(doc(db, "games", normalizedAppId), {
          name: folderName,
          steam_folder_name: folderName,
          fix_drive_id: finalFixUrl
        }, { merge: true });
        console.log(`✔ Enlace de Fix creado en Firestore para juego huérfano: '${folderName}'`);
      }

    } catch (err) {
      console.error(`❌ Error en '${folderName}':`, err.message);
    } finally {
      if (fs.existsSync(tempZipFile)) {
        try { fs.unlinkSync(tempZipFile); } catch {}
      }
    }
  }

  console.log("\n==========================================");
  console.log("🎉 MIGRACIÓN COMPLETA A GOFILE PREMIUM REPOSICIONADA CON ÉXITO");
  console.log("==========================================");
  process.exit(0);
}

uploadFixesToGofilePremium().catch(err => {
  console.error("Error global:", err);
  process.exit(1);
});
