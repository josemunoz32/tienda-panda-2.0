import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch } from "firebase/firestore";
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

console.log("Inicializando Firebase para subir los 830 juegos exactos...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function uploadExactGamesNoSkip() {
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

    console.log("ID Categoría Steam:", steamCatId);

    const steamDataPath = path.join(process.cwd(), 'src/assets/steam_import_data.json');
    const steamItems = JSON.parse(fs.readFileSync(steamDataPath, 'utf8'));
    console.log(`Subiendo exactamente los ${steamItems.length} juegos sin omitir ninguno...`);

    let addedCount = 0;
    let batch = writeBatch(db);
    let batchSize = 0;

    for (let i = 0; i < steamItems.length; i++) {
      const game = steamItems[i];
      const docRef = doc(collection(db, "products"));

      batch.set(docRef, {
        name: game.name,
        priceCLP: "4990",
        priceUSD: "5.54",
        pricePrimariaCLP: "4990",
        pricePrimariaUSD: "5.54",
        priceSecundariaCLP: "4990",
        priceSecundariaUSD: "5.54",
        categoryId: steamCatId,
        plataforma: "Steam",
        genero: "Steam Promo",
        idioma: "Español / Multilenguaje",
        anio: "2026",
        comentario: "INCLUIDO EN PROMOS STEAM (3x $4.990 / 10x $9.990 / 23x $17.990)",
        imageUrl: "",
        tags: ["Steam", "Promo", "3x4990", "10x9990", "23x17990"],
        isSteamPromoEligible: true,
        stock: "1000",
        createdAt: new Date().toISOString()
      });

      addedCount++;
      batchSize++;

      if (batchSize >= 400) {
        console.log(`Guardando lote de 400 juegos... (${addedCount}/${steamItems.length})`);
        await batch.commit();
        batch = writeBatch(db);
        batchSize = 0;
      }
    }

    if (batchSize > 0) {
      console.log(`Guardando lote final de ${batchSize} juegos...`);
      await batch.commit();
    }

    console.log("==========================================");
    console.log(`✅ SUBIDA COMPLETADA EXITOSAMENTE`);
    console.log(`- Juegos subidos exactamente a Firestore: ${addedCount}`);
    console.log("==========================================");
    process.exit(0);

  } catch(err) {
    console.error("Error al subir los juegos exactos:", err);
    process.exit(1);
  }
}

uploadExactGamesNoSkip();
