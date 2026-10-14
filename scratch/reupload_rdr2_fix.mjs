import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const GOFILE_TOKEN = '19qIvNHm7hdOCeLa4XJucl1VlYeqJM2F';

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

async function reuploadRdr2() {
  const sourceDir = path.join(process.cwd(), 'fixes/Pack_Fixes/fixes/Red Dead Redemption 2');
  const tempZip = path.join(process.cwd(), 'scratch/rdr2_fix_clean.zip');

  if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
  
  console.log('📦 Comprimiendo archivos del Fix de RDR2...');
  const safeSource = sourceDir.replace(/'/g, "''");
  const safeOut = tempZip.replace(/'/g, "''");
  const cmd = `powershell -Command "Compress-Archive -Path '${safeSource}\\*' -DestinationPath '${safeOut}' -Force"`;
  execSync(cmd, { stdio: 'inherit' });

  let serverName = 'store1';
  try {
    const serverRes = await fetch('https://api.gofile.io/servers', {
      headers: { 'Authorization': `Bearer ${GOFILE_TOKEN}` }
    });
    const serverJson = await serverRes.json();
    serverName = serverJson?.data?.servers?.[0]?.name || 'store1';
  } catch (err) {}

  console.log(`🚀 Subiendo RDR2 Fix a GoFile (${serverName})...`);
  const fileBuffer = fs.readFileSync(tempZip);
  const fileBlob = new Blob([fileBuffer], { type: 'application/zip' });
  const formData = new FormData();
  formData.append('file', fileBlob, 'Red_Dead_Redemption_2_fix.zip');

  const uploadRes = await fetch(`https://${serverName}.gofile.io/contents/uploadfile`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GOFILE_TOKEN}` },
    body: formData
  });

  const uploadJson = await uploadRes.json();
  const directLink = uploadJson?.data?.directLink;
  const downloadPage = uploadJson?.data?.downloadPage;
  const fileId = uploadJson?.data?.fileId;
  const fixUrl = directLink || downloadPage || (fileId ? `https://gofile.io/d/${fileId}` : '');

  console.log('✅ URL obtenida de GoFile:', fixUrl);

  if (fixUrl) {
    await setDoc(doc(db, 'games', '1174180'), {
      fix_drive_id: fixUrl,
      steam_folder_name: 'Red Dead Redemption 2'
    }, { merge: true });
    console.log('✅ RDR2 actualizado exitosamente en Firestore con nuevo Fix y carpeta correcta!');
  }

  if (fs.existsSync(tempZip)) {
    try { fs.unlinkSync(tempZip); } catch {}
  }
  process.exit(0);
}

reuploadRdr2().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
