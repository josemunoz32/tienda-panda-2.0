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

console.log("Inicializando Firebase para Carga Directa de los 788 juegos de Steam...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function normalizeName(name) {
  return (name || '').toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function uploadAllSteamGames() {
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

    await setDoc(doc(db, "users", user.uid), {
      email: email,
      role: "admin",
      createdAt: new Date().toISOString()
    }, { merge: true });

    console.log("Buscando categoría de Steam...");
    const catSnap = await getDocs(collection(db, "categories"));
    let steamCatId = null;

    catSnap.forEach(d => {
      if (d.data().name && d.data().name.toLowerCase().includes("steam")) {
        steamCatId = d.id;
      }
    });

    if (!steamCatId) {
      console.log("Categoría de Steam no encontrada, usando valor por defecto...");
      steamCatId = catSnap.docs[0]?.id || "steam-cat";
    }

    console.log("ID Categoría Steam:", steamCatId);

    console.log("Leyendo productos en Firestore...");
    const prodSnap = await getDocs(collection(db, "products"));
    const existingNamesSet = new Set();
    prodSnap.forEach(d => {
      if (d.data().name) {
        existingNamesSet.add(normalizeName(d.data().name));
      }
    });

    const steamDataPath = path.join(process.cwd(), 'src/assets/steam_import_data.json');
    const steamItems = JSON.parse(fs.readFileSync(steamDataPath, 'utf8'));
    console.log(`Total de juegos a procesar: ${steamItems.length}`);

    let addedCount = 0;
    let skippedCount = 0;
    let batch = writeBatch(db);
    let batchSize = 0;

    for (let i = 0; i < steamItems.length; i++) {
      const game = steamItems[i];
      const norm = normalizeName(game.name);

      if (existingNamesSet.has(norm)) {
        skippedCount++;
        continue;
      }

      const docRef = doc(collection(db, "products"));
      batch.set(docRef, {
        name: game.name,
        priceCLP: game.priceCLP || "4990",
        priceUSD: game.priceUSD || "5.54",
        pricePrimariaCLP: game.pricePrimariaCLP || "4990",
        pricePrimariaUSD: game.pricePrimariaUSD || "5.54",
        priceSecundariaCLP: game.priceSecundariaCLP || "4990",
        priceSecundariaUSD: game.priceSecundariaUSD || "5.54",
        categoryId: steamCatId,
        plataforma: "Steam",
        genero: game.genero || "Steam Promo",
        idioma: "Español / Multilenguaje",
        anio: "2026",
        comentario: "INCLUIDO EN PROMOS STEAM (3x $4.990 / 10x $9.990 / 23x $17.990)",
        imageUrl: game.imageUrl || "",
        tags: ["Steam", "Promo", "3x4990", "10x9990", "23x17990"],
        isSteamPromoEligible: true,
        stock: "1000",
        createdAt: new Date().toISOString()
      });

      existingNamesSet.add(norm);
      addedCount++;
      batchSize++;

      if (batchSize >= 400) {
        console.log(`Guardando lote de 400 registros... (${addedCount}/${steamItems.length})`);
        await batch.commit();
        batch = writeBatch(db);
        batchSize = 0;
      }
    }

    if (batchSize > 0) {
      console.log(`Guardando lote final de ${batchSize} registros...`);
      await batch.commit();
    }

    console.log("==========================================");
    console.log(`✅ CARGA DIRECTA COMPLETADA EXITOSAMENTE`);
    console.log(`- Juegos agregados a Firestore: ${addedCount}`);
    console.log(`- Juegos omitidos (ya existían): ${skippedCount}`);
    console.log("==========================================");
    process.exit(0);

  } catch(err) {
    console.error("Error al subir juegos a Firestore:", err);
    process.exit(1);
  }
}

uploadAllSteamGames();
