import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const GOFILE_PREMIUM_TOKEN = 'ZtkBWxSMe9wsPfJJGl8i6j77x6LgbwoQ';

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
const tempDir = path.join(process.cwd(), 'scratch/parallel_zips');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

async function getGofileServer() {
  const serverRes = await fetch('https://api.gofile.io/servers', {
    headers: { 'Authorization': `Bearer ${GOFILE_PREMIUM_TOKEN}` }
  });
  const serverJson = await serverRes.json();
  return serverJson?.data?.servers?.[0]?.name || 'store4';
}

async function uploadSingleFolder(folderName, docs, serverName, index, total) {
  console.log(`[${index}/${total}] 📦 Iniciando comprimido y subida paralela: '${folderName}'`);

  let targetDoc = null;
  const lowerFolder = folderName.toLowerCase();

  // REGLAS DE NOMBRES ESPECIALES SOLICITADAS POR EL USUARIO:
  if (lowerFolder.includes('requiem') || lowerFolder.includes('resident')) {
    targetDoc = docs.find(g => (g.name || '').toLowerCase().includes('requiem') || (g.steam_folder_name || '').toLowerCase().includes('requiem'));
  } else if (lowerFolder.includes('afop') || lowerFolder.includes('avatar')) {
    targetDoc = docs.find(g => (g.name || '').toLowerCase().includes('avatar') || (g.steam_folder_name || '').toLowerCase().includes('avatar'));
  } else {
    targetDoc = docs.find(g => (g.steam_folder_name || g.name || '').toLowerCase() === lowerFolder);
  }

  if (!targetDoc && fs.existsSync(steamPath)) {
    const matchFolder = fs.readdirSync(steamPath).find(f => f.toLowerCase() === lowerFolder);
    if (matchFolder) {
      const luaFile = fs.readdirSync(path.join(steamPath, matchFolder)).find(f => f.endsWith('.lua'));
      if (luaFile) {
        const appId = path.basename(luaFile, '.lua');
        targetDoc = docs.find(g => g.id === appId);
      }
    }
  }

  const safeFileName = folderName.replace(/[^a-zA-Z0-9]/g, '_');
  const tempZipFile = path.join(tempDir, `${safeFileName}_fix_${Date.now()}.zip`);

  try {
    const safeSource = path.join(fixesPath, folderName).replace(/'/g, "''");
    const safeOut = tempZipFile.replace(/'/g, "''");

    // Zip file using powershell
    await execPromise(`powershell -Command "Compress-Archive -Path '${safeSource}\\*' -DestinationPath '${safeOut}' -Force"`);

    // Upload using curl for max network throughput
    const curlCmd = `curl -s -X POST -H "Authorization: Bearer ${GOFILE_PREMIUM_TOKEN}" -F "file=@${tempZipFile}" "https://${serverName}.gofile.io/contents/uploadfile"`;
    const { stdout } = await execPromise(curlCmd, { maxBuffer: 1024 * 1024 * 50 });
    const uploadJson = JSON.parse(stdout);

    const folderCode = uploadJson?.data?.parentFolderCode || uploadJson?.data?.code;

    if (folderCode) {
      const contentsRes = await fetch(`https://api.gofile.io/contents/${folderCode}`, {
        headers: { 'Authorization': `Bearer ${GOFILE_PREMIUM_TOKEN}` }
      });
      const contentsJson = await contentsRes.json();
      const children = contentsJson?.data?.children || {};
      const childKeys = Object.keys(children);
      let directLink = '';
      if (childKeys.length > 0) directLink = children[childKeys[0]]?.link;

      const finalFixUrl = directLink || `https://gofile.io/d/${folderCode}`;
      console.log(`   ✔ [OK] '${folderName}' -> GoFile Premium: ${finalFixUrl}`);

      if (targetDoc) {
        await setDoc(doc(db, 'games', targetDoc.id), { fix_drive_id: finalFixUrl }, { merge: true });
        console.log(`   ✅ Firestore AppID ${targetDoc.id} vinculado: '${targetDoc.name}'`);
      } else {
        const normalizedAppId = folderName.replace(/[^0-9]/g, '') || `fix_${safeFileName}`;
        await setDoc(doc(db, 'games', normalizedAppId), { name: folderName, steam_folder_name: folderName, fix_drive_id: finalFixUrl }, { merge: true });
        console.log(`   ✅ Firestore documento creado para: '${folderName}'`);
      }
    } else {
      console.error(`⚠️ Error al subir '${folderName}':`, JSON.stringify(uploadJson));
    }

  } catch (err) {
    console.error(`❌ Error procesando '${folderName}':`, err.message);
  } finally {
    if (fs.existsSync(tempZipFile)) {
      try { fs.unlinkSync(tempZipFile); } catch {}
    }
  }
}

async function runParallelUploads() {
  const fixFolders = fs.readdirSync(fixesPath).filter(f => fs.statSync(path.join(fixesPath, f)).isDirectory());
  const snap = await getDocs(collection(db, 'games'));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const serverName = await getGofileServer();
  console.log(`🚀 Iniciando subida masiva paralela de ${fixFolders.length} Fixes a servidor GoFile Premium: ${serverName}...`);

  const CONCURRENCY = 3; // 3 concurrent uploads
  for (let i = 0; i < fixFolders.length; i += CONCURRENCY) {
    const chunk = fixFolders.slice(i, i + CONCURRENCY);
    console.log(`\n--- Procesando Lote de ${chunk.length} Fixes [${i + 1} a ${i + chunk.length} de ${fixFolders.length}] ---`);
    
    await Promise.all(
      chunk.map((folderName, idx) => uploadSingleFolder(folderName, docs, serverName, i + idx + 1, fixFolders.length))
    );
  }

  console.log('\n==========================================');
  console.log('🎉 MIGRACIÓN PARALELA A GOFILE PREMIUM COMPLETADA AL 100%');
  console.log('==========================================');
  process.exit(0);
}

runParallelUploads().catch(err => {
  console.error('Error global:', err);
  process.exit(1);
});
