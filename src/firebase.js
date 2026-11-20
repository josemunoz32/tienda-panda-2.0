// src/firebase.js
import { initializeApp } from "firebase/app";
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence, browserPopupRedirectResolver, GoogleAuthProvider } from "firebase/auth";
import { getFirestore as getFirestoreLite } from "firebase/firestore/lite";

// Reemplaza estos valores con tu configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
  ...(process.env.REACT_APP_FIREBASE_DATABASE_URL ? { databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL } : {})
};

const app = initializeApp(firebaseConfig);
// Realtime Database se carga bajo demanda (presencia y panel admin) para sacarlo del bundle inicial.
// Resuelve con las funciones del SDK más la instancia `database`, o null si no hay URL configurada.
let databasePromise = null;
const loadDatabase = () => {
  if (!process.env.REACT_APP_FIREBASE_DATABASE_URL) return Promise.resolve(null);
  if (!databasePromise) {
    databasePromise = import("firebase/database").then((m) => ({ ...m, database: m.getDatabase(app) }));
  }
  return databasePromise;
};

// initializeAuth sin popupRedirectResolver: getAuth() precargaba en cada visita el iframe de login
// de Google (~130 KB entre iframe.js y apis.google.com). El resolver se pasa solo al hacer signInWithPopup.
const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
});
const googleProvider = new GoogleAuthProvider();
// Analytics (gtag ~180 KB) se carga con la primera interacción real del visitante (igual que
// Meta Pixel y Clarity en index.html), para no competir con la carga inicial. Los eventos previos
// quedan en cola y se envían apenas carga.
const analyticsReady = typeof window === "undefined" ? null : new Promise((resolve) => {
  const events = ["pointerdown", "touchstart", "wheel", "keydown", "mousemove"];
  const onInteract = (e) => {
    // Solo gestos reales (ver el mismo filtro en public/index.html)
    if (!e.isTrusted || (e.type === "mousemove" && !e.movementX && !e.movementY)) return;
    events.forEach((evt) => window.removeEventListener(evt, onInteract, { passive: true }));
    resolve();
  };
  events.forEach((evt) => window.addEventListener(evt, onInteract, { passive: true }));
})
  .then(() => import("firebase/analytics"))
  .then((m) => ({ logEvent: m.logEvent, instance: m.getAnalytics(app) }));

const logAnalyticsEvent = (name, params) => {
  if (!analyticsReady) return;
  analyticsReady.then(({ logEvent, instance }) => logEvent(instance, name, params)).catch(() => {});
};
export { app, loadDatabase, auth, googleProvider, browserPopupRedirectResolver, logAnalyticsEvent };

// Instancia Firestore Lite (REST, sin conexiones persistentes) para lecturas/escrituras puntuales de
// la carga inicial. El SDK completo (db) vive en firebaseDb.js; Storage y Functions en firebaseServices.js.
export const dbLite = getFirestoreLite(app);
