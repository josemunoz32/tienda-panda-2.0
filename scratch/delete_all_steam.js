import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, deleteDoc, writeBatch } from "firebase/firestore";
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

console.log("Inicializando Firebase para eliminar todos los productos de Steam...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function deleteAllSteamProducts() {
  try {
    const email = "steamseeder_pandastore@gmail.com";
    const password = "PandaStoreSteam123!";
    let user = null;

    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      user = res.user;
      console.log("Sesión iniciada UID:", user.uid);
    } catch(e) {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      user = res.user;
    }

    console.log("Obteniendo ID de categoría 'Juegos Steam'...");
    const catSnap = await getDocs(collection(db, "categories"));
    let steamCatId = null;

    catSnap.forEach(d => {
      if (d.data().name && d.data().name.toLowerCase().includes("steam")) {
        steamCatId = d.id;
      }
    });

    console.log("ID de categoría Steam a limpiar:", steamCatId);

    console.log("Consultando todos los productos...");
    const prodSnap = await getDocs(collection(db, "products"));
    console.log(`Total productos en la base de datos: ${prodSnap.docs.length}`);

    const steamDocsToDelete = [];
    prodSnap.forEach(d => {
      const data = d.data();
      const isSteamCat = steamCatId && data.categoryId === steamCatId;
      const isSteamPlat = data.plataforma && data.plataforma.toLowerCase() === "steam";
      if (isSteamCat || isSteamPlat) {
        steamDocsToDelete.push(d.ref);
      }
    });

    console.log(`Encontrados ${steamDocsToDelete.length} productos de Steam para eliminar.`);

    let deletedCount = 0;
    let batch = writeBatch(db);
    let batchSize = 0;

    for (let i = 0; i < steamDocsToDelete.length; i++) {
      batch.delete(steamDocsToDelete[i]);
      deletedCount++;
      batchSize++;

      if (batchSize >= 400) {
        console.log(`Eliminando lote de 400 registros... (${deletedCount}/${steamDocsToDelete.length})`);
        await batch.commit();
        batch = writeBatch(db);
        batchSize = 0;
      }
    }

    if (batchSize > 0) {
      console.log(`Eliminando lote final de ${batchSize} registros...`);
      await batch.commit();
    }

    console.log("==========================================");
    console.log(`✅ ELIMINACIÓN COMPLETADA EXITOSAMENTE`);
    console.log(`- Total de productos de Steam eliminados: ${deletedCount}`);
    console.log("==========================================");
    process.exit(0);

  } catch(err) {
    console.error("Error al eliminar productos de Steam:", err);
    process.exit(1);
  }
}

deleteAllSteamProducts();
