import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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

async function processInBatches() {
  const fixFolders = fs.readdirSync(fixesPath).filter(f => fs.statSync(path.join(fixesPath, f)).isDirectory());
  const snap = await getDocs(collection(db, 'games'));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const serverRes = await fetch('https://api.gofile.io/servers', {
    headers: { 'Authorization': `Bearer ${GOFILE_PREMIUM_TOKEN}` }
  });
  const serverJson = await serverRes.json();
  const serverName = serverJson?.data?.servers?.[0]?.name || 'store-eu-par-7';

  console.log(`Subiendo fixes secuencialmente a ${serverName}...`);

  const tempDir = path.join(process.cwd(), 'scratch/temp_zip_fast');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  for (let i = 0; i < fixFolders.length; i++) {
    const folderName = fixFolders[i];
    console.log(`[${i+1}/${fixFolders.length}] Procesando Fix: '${folderName}'`);

    let targetDoc = null;
    const lowerFolder = folderName.toLowerCase();

    // MAPPING REGLAS DE NOMBRES ESPECIALES SOLICITADAS POR EL USUARIO:
    // 1. RESIDENT REVI -> BIOHAZARD REQUIEM / RESIDENT EVIL / RESIDENT EVIL REQUIEM
    // 2. AFOP -> Avatar Frontiers of Pandora
    if (lowerFolder.includes('requiem') || lowerFolder.includes('resident')) {
      targetDoc = docs.find(g => (g.name || '').toLowerCase().includes('requiem') || (g.steam_folder_name || '').toLowerCase().includes('requiem'));
    } else if (lowerFolder.includes('afop') || lowerFolder.includes('avatar')) {
      targetDoc = docs.find(g => (g.name || '').toLowerCase().includes('avatar') || (g.steam_folder_name || '').toLowerCase().includes('avatar'));
    } else {
      targetDoc = docs.find(g => (g.steam_folder_name || g.name || '').toLowerCase() === lowerFolder);
    }

    const safeFileName = folderName.replace(/[^a-zA-Z0-9]/g, '_');
    const tempZipFile = path.join(tempDir, `${safeFileName}_fix.zip`);
    if (fs.existsSync(tempZipFile)) fs.unlinkSync(tempZipFile);

    const safeSource = path.join(fixesPath, folderName).replace(/'/g, "''");
    const safeOut = tempZipFile.replace(/'/g, "''");
    execSync(`powershell -Command "Compress-Archive -Path '${safeSource}\\*' -DestinationPath '${safeOut}' -Force"`, { stdio: 'ignore' });

    const fileBuffer = fs.readFileSync(tempZipFile);
    const fileBlob = new Blob([fileBuffer], { type: 'application/zip' });
    const formData = new FormData();
    formData.append('file', fileBlob, `${safeFileName}_fix.zip`);

    const uploadRes = await fetch(`https://${serverName}.gofile.io/contents/uploadfile`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GOFILE_PREMIUM_TOKEN}` },
      body: formData
    });

    const uploadJson = await uploadRes.json();
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
      console.log(`   ✔ URL GoFile Premium: ${finalFixUrl}`);

      if (targetDoc) {
        await setDoc(doc(db, 'games', targetDoc.id), { fix_drive_id: finalFixUrl }, { merge: true });
        console.log(`   ✅ Guardado en Firestore en AppID: ${targetDoc.id} (${targetDoc.name})`);
      } else {
        const normalizedAppId = folderName.replace(/[^0-9]/g, '') || `fix_${safeFileName}`;
        await setDoc(doc(db, 'games', normalizedAppId), { name: folderName, steam_folder_name: folderName, fix_drive_id: finalFixUrl }, { merge: true });
        console.log(`   ✅ Guardado en Firestore en doc: ${normalizedAppId}`);
      }
    }

    if (fs.existsSync(tempZipFile)) fs.unlinkSync(tempZipFile);
  }

  console.log('🎉 PROCESO MASIVO GOFILE PREMIUM FINALIZADO AL 100%');
  process.exit(0);
}

processInBatches().catch(err => {
  console.error(err);
  process.exit(1);
});
