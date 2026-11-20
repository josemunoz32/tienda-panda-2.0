// src/firebaseServices.js
// Storage y Cloud Functions fuera de firebase.js para que no entren en el bundle inicial:
// solo los usan páginas con carga diferida (admin, perfil, checkout, etc.).
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { app } from "./firebase";

export const storage = getStorage(app);
export const functions = getFunctions(app);
