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

console.log("Inicializando Firebase para reemplazar base de datos de Steam...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function resetAndUploadPricedSteam() {
  try {
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

    console.log("Obteniendo ID de categoría 'Juegos Steam'...");
    const catSnap = await getDocs(collection(db, "categories"));
    let steamCatId = null;

    catSnap.forEach(d => {
      if (d.data().name && d.data().name.toLowerCase().includes("steam")) {
        steamCatId = d.id;
      }
    });

    console.log("Limpiando juegos actuales de Steam en Firestore...");
    const prodSnap = await getDocs(collection(db, "products"));
    const toDelete = [];
    prodSnap.forEach(d => {
      if (d.data().categoryId === steamCatId || (d.data().plataforma && d.data().plataforma.toLowerCase() === "steam")) {
        toDelete.push(d.ref);
      }
    });

    let bDel = writeBatch(db);
    let countDel = 0;
    for (let i = 0; i < toDelete.length; i++) {
      bDel.delete(toDelete[i]);
      countDel++;
      if (countDel % 400 === 0) {
        await bDel.commit();
        bDel = writeBatch(db);
      }
    }
    if (countDel % 400 !== 0) {
      await bDel.commit();
    }
    console.log(`Eliminados ${toDelete.length} productos anteriores.`);

    const steamDataPath = path.join(process.cwd(), 'src/assets/steam_import_data.json');
    const steamItems = JSON.parse(fs.readFileSync(steamDataPath, 'utf8'));
    console.log(`Subiendo los ${steamItems.length} juegos limpios y desduplicados con precios asignados...`);

    let bAdd = writeBatch(db);
    let countAdd = 0;
    for (let i = 0; i < steamItems.length; i++) {
      const game = steamItems[i];
      const docRef = doc(collection(db, "products"));

      bAdd.set(docRef, {
        name: game.name,
        priceCLP: game.priceCLP,
        priceUSD: game.priceUSD,
        pricePrimariaCLP: game.pricePrimariaCLP,
        pricePrimariaUSD: game.pricePrimariaUSD,
        priceSecundariaCLP: game.priceSecundariaCLP,
        priceSecundariaUSD: game.priceSecundariaUSD,
        categoryId: steamCatId,
        plataforma: "Steam",
        genero: game.genero,
        idioma: "Español / Multilenguaje",
        anio: "2026",
        comentario: game.comentario,
        imageUrl: "",
        tags: game.tags,
        isGreenTier: game.isGreenTier,
        isSteamPromoEligible: !game.isGreenTier,
        stock: "1000",
        createdAt: new Date().toISOString()
      });

      countAdd++;
      if (countAdd % 400 === 0) {
        await bAdd.commit();
        bAdd = writeBatch(db);
      }
    }

    if (countAdd % 400 !== 0) {
      await bAdd.commit();
    }

    console.log("==========================================");
    console.log(`✅ BASE DE DATOS DE STEAM ACTUALIZADA EXITOSAMENTE`);
    console.log(`- Juegos limpios sin duplicados subidos: ${countAdd}`);
    console.log("==========================================");
    process.exit(0);

  } catch(err) {
    console.error("Error al actualizar productos de Steam:", err);
    process.exit(1);
  }
}

resetAndUploadPricedSteam();
