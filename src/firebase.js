// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, logEvent } from "firebase/analytics";

// Reemplaza estos valores con tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAU1Nc1yjcf2AIc0rZh3mFyo5cCBAbwreo",
  authDomain: "pandastoreupdate.firebaseapp.com",
  projectId: "pandastoreupdate",
  storageBucket: "pandastoreupdate.firebasestorage.app",
  messagingSenderId: "921208695397",
  appId: "1:921208695397:web:6b801a2748d8d74326b48c",
  measurementId: "G-KDJDW2XTFK"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);
const functions = getFunctions(app);


const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const analytics = getAnalytics(app);
export { app, database, storage, functions, auth, googleProvider, analytics, logEvent };
export const db = getFirestore(app);