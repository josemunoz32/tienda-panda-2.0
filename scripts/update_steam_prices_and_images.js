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

console.log("Inicializando Firebase para Actualización de Precios e Imágenes de Steam...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function updateSteamPricesAndImages() {
  try {
    console.log("Iniciando sesión como admin...");
    const email = "steamseeder_pandastore@gmail.com";
    const password = "PandaStoreSteam123!";
    let user = null;

    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      user = res.user;
    } catch(e) {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      user = res.user;
    }

    const catSnap = await getDocs(collection(db, "categories"));
    let steamCatId = null;
    catSnap.forEach(d => {
      if (d.data().name && d.data().name.toLowerCase().includes("steam")) {
        steamCatId = d.id;
      }
    });

    console.log("Obteniendo todos los productos de Steam...");
    const prodSnap = await getDocs(collection(db, "products"));
    let updatedCount = 0;
    let batch = writeBatch(db);
    let batchOperations = 0;

    for (const d of prodSnap.docs) {
      const data = d.data();
      const isSteam = (data.categoryId === steamCatId) || (data.plataforma === "Steam") || (Array.isArray(data.tags) && data.tags.includes("Steam"));

      if (!isSteam) continue;

      const currentPriceCLP = Number(data.priceCLP || 2000);
      const isEligible = data.isSteamPromoEligible !== false;

      // REGLA SOLICITADA POR EL USUARIO:
      // - Precio base juegos: 2000
      // - Estrenos / Más populares: 4500 (reemplaza cualquier 5000 u 8000)
      let newPriceCLP = 2000;
      if (!isEligible || currentPriceCLP >= 4500) {
        newPriceCLP = 4500;
      } else {
        newPriceCLP = 2000;
      }

      const newPriceUSD = (newPriceCLP / 900).toFixed(2);
      const appid = data.appid;
      const imageUrl = (appid && Number(appid) > 0)
        ? `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`
        : (data.imageUrl || "");

      batch.update(doc(db, "products", d.id), {
        priceCLP: String(newPriceCLP),
        priceUSD: newPriceUSD,
        pricePrimariaCLP: String(newPriceCLP),
        pricePrimariaUSD: newPriceUSD,
        imageUrl: imageUrl
      });

      updatedCount++;
      batchOperations++;

      if (batchOperations >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        batchOperations = 0;
      }
    }

    if (batchOperations > 0) {
      await batch.commit();
    }

    console.log(`=== ACTUALIZACIÓN DE PRECIOS E IMÁGENES COMPLETADA ===`);
    console.log(`Se actualizaron ${updatedCount} juegos de Steam a $2.000 CLP (base) y $4.500 CLP (estrenos/populares) con sus fotos reales de Steam CDN.`);

  } catch(err) {
    console.error("Error actualizando productos Steam:", err);
  }
}

updateSteamPricesAndImages();
