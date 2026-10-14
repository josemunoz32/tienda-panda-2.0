import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
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

async function bindKnown() {
  const nowStr = new Date().toISOString();

  // 1. zetase321@gmail.com -> Key: PANDA-GMYH-8A7E
  console.log("Vinculando PANDA-GMYH-8A7E (zetase321@gmail.com)...");
  await updateDoc(doc(db, "licenses", "PANDA-GMYH-8A7E"), {
    hwid: "061A680BD314E7E14C7373E2B70AF3220F86FAD54C31DD2A741686DC867390BE",
    activatedAt: nowStr,
    updatedAt: nowStr
  });
  console.log("PANDA-GMYH-8A7E vinculada con exito!");

  // 2. tabares1003@gmail.com -> Key: PANDA-WCUT-H6V5
  console.log("Vinculando PANDA-WCUT-H6V5 (tabares1003@gmail.com)...");
  await updateDoc(doc(db, "licenses", "PANDA-WCUT-H6V5"), {
    hwid: "747CDB10B511E627239BAA3EDB45FA3EE6327BA56D9AAEF7362AF3021B3DEC88",
    activatedAt: nowStr,
    updatedAt: nowStr
  });
  console.log("PANDA-WCUT-H6V5 vinculada con exito!");

  // 3. Reset test key PANDA-JV2M-KW6U hwid to null so it is clean
  console.log("Limpiando test HWID de PANDA-JV2M-KW6U...");
  await updateDoc(doc(db, "licenses", "PANDA-JV2M-KW6U"), {
    hwid: null,
    updatedAt: nowStr
  });
  console.log("PANDA-JV2M-KW6U reseteada!");
}

bindKnown();
