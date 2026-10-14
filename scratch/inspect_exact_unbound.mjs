import { initializeApp } from "firebase/app";
import { getFirestore, getDoc, doc } from "firebase/firestore";
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

const keys = [
  'PANDA-GMYH-8A7E',
  'PANDA-SWKV-LRZT',
  'PANDA-V3WX-N9ZW-Y9N5',
  'PANDA-VR2K-KJHW',
  'PANDA-WCUT-H6V5'
];

async function inspectExact() {
  for (const k of keys) {
    const s = await getDoc(doc(db, "licenses", k));
    if (s.exists()) {
      console.log(`\n=== DOC: ${k} ===`);
      console.log(JSON.stringify(s.data(), null, 2));
    } else {
      console.log(`Doc ${k} NOT found`);
    }
  }
}

inspectExact();
