// src/firebaseDb.js
// Instancia del SDK completo de Firestore (tiempo real, consultas, escrituras con compensación de
// latencia). Vive aparte de firebase.js para que no entre en el bundle inicial: las páginas con
// carga diferida la importan directo y el código de la carga inicial la pide con loadFirestore().
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { app } from "./firebase";

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  // Caché en memoria: la persistente (IndexedDB multi-pestaña) escribía todo el catálogo en cada
  // primera visita y era el mayor costo de CPU de la carga. Home ya cachea productos en sessionStorage.
  localCache: memoryLocalCache(),
});
