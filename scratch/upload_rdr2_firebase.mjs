import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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
const storage = getStorage(app);

async function testRdr2StorageUpload() {
  const fixDir = path.join(process.cwd(), 'fixes/Pack_Fixes/fixes/Red Dead Redemption 2');
  console.log('Archivos a subir de RDR2:');
  const files = fs.readdirSync(fixDir);
  console.log(files);

  const tempZip = path.join(process.cwd(), 'scratch/rdr2_firebase_fix.zip');
  if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
  
  const cmd = `powershell -Command "Compress-Archive -Path '${fixDir}\\*' -DestinationPath '${tempZip}' -Force"`;
  execSync(cmd);

  console.log('Zip comprimido. Tamaño:', fs.statSync(tempZip).size, 'bytes');

  const fileBuffer = fs.readFileSync(tempZip);
  const storageRef = ref(storage, 'fixes/Red_Dead_Redemption_2_fix.zip');
  console.log('Subiendo a Firebase Storage...');
  const snapshot = await uploadBytes(storageRef, fileBuffer, { contentType: 'application/zip' });
  const directUrl = await getDownloadURL(snapshot.ref);

  console.log('✅ URL Directa de RDR2 en Firebase Storage:', directUrl);

  // Link in Firestore
  await setDoc(doc(db, 'games', '1174180'), {
    fix_drive_id: directUrl,
    steam_folder_name: 'Red Dead Redemption 2'
  }, { merge: true });

  console.log('✅ RDR2 vinculado en Firestore con éxito!');
  process.exit(0);
}

testRdr2StorageUpload().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
