// src/firestoreLazy.js
// Carga bajo demanda del SDK completo de Firestore para el código que corre en la carga inicial
// (Header, Home, contexto de moneda, helpers de carrito). Resuelve con todas las funciones de
// "firebase/firestore" más la instancia `db`. Los visitantes sin sesión nunca lo descargan.
let firestorePromise = null;

export function loadFirestore() {
  if (!firestorePromise) {
    firestorePromise = Promise.all([import("firebase/firestore"), import("./firebaseDb")])
      .then(([sdk, { db }]) => ({ ...sdk, db }));
  }
  return firestorePromise;
}
