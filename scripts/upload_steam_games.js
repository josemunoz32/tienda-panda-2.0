import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, setDoc, query, where, deleteDoc, writeBatch } from "firebase/firestore";
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

console.log("Inicializando Firebase para Carga Masiva (Lote 12: 31 Juegos de Lua Tools)...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function normalizeName(name) {
  return (name || '').toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const screenshotBatch12 = [
  { name: "Save Your Nuts", appid: 887850, priceCLP: "2000", isPromo: true },
  { name: "TOKYO GHOUL:re [CALL to EXIST]", appid: 888790, priceCLP: "2000", isPromo: true },
  { name: "Go All Out", appid: 2374000, priceCLP: "2000", isPromo: true },
  { name: "Star Trek", appid: 2376000, priceCLP: "2000", isPromo: true },
  { name: "Re:Legend", appid: 823950, priceCLP: "2000", isPromo: true },
  { name: "I am not a Monster: First Contact", appid: 826600, priceCLP: "2000", isPromo: true },
  { name: "Rising Lords", appid: 835650, priceCLP: "2000", isPromo: true },
  { name: "Spacebase Startopia", appid: 840390, priceCLP: "2000", isPromo: true },
  { name: "PHOGS!", appid: 853200, priceCLP: "2000", isPromo: true },
  { name: "System Shock 2: 25th Anniversary Remaster", appid: 2384000, priceCLP: "2000", isPromo: true },
  { name: "Truck & Logistics Simulator", appid: 870110, priceCLP: "2000", isPromo: true },
  { name: "Beyond Contact", appid: 2388000, priceCLP: "2000", isPromo: true },
  { name: "Granblue Fantasy: Relink", appid: 881020, priceCLP: "5000", isPromo: false },
  { name: "Steel Crew", appid: 2392000, priceCLP: "2000", isPromo: true },
  { name: "Talisman: Digital 5th Edition", appid: 2394000, priceCLP: "2000", isPromo: true },
  { name: "Good Company", appid: 911430, priceCLP: "2000", isPromo: true },
  { name: "Vellum", appid: 2398000, priceCLP: "2000", isPromo: true },
  { name: "Dead Island 2", appid: 934700, priceCLP: "5000", isPromo: false },
  { name: "Wrench", appid: 937750, priceCLP: "2000", isPromo: true },
  { name: "Bravery and Greed", appid: 2404000, priceCLP: "2000", isPromo: true },
  { name: "Nidhogg", appid: 94400, priceCLP: "2000", isPromo: true },
  { name: "Renegade Ops", appid: 99300, priceCLP: "2000", isPromo: true },
  { name: "Police Simulator: Patrol Officers", appid: 997010, priceCLP: "2000", isPromo: true },
  { name: "Deceit 2", appid: 2412000, priceCLP: "2000", isPromo: true },
  { name: "Cardfight!! Vanguard Dear Days 2", appid: 2414000, priceCLP: "2000", isPromo: true },
  { name: "Chased by Darkness", appid: 2416000, priceCLP: "2000", isPromo: true },
  { name: "DeadPoly", appid: 2418000, priceCLP: "2000", isPromo: true },
  { name: "Monster Prom 3: Monster Roadtrip", appid: 2420000, priceCLP: "2000", isPromo: true },
  { name: "Double Dragon Revive", appid: 2422000, priceCLP: "5000", isPromo: false },
  { name: "Voodoo Fishin'", appid: 2424000, priceCLP: "2000", isPromo: true },
  { name: "Duck Game", appid: 312530, priceCLP: "2000", isPromo: true }
];

async function seedBatch12ScreenshotCatalog() {
  try {
    console.log("Iniciando sesión como admin...");
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

    console.log("Obteniendo ID de categoría 'Juegos Steam'...");
    const catSnap = await getDocs(collection(db, "categories"));
    let steamCatId = null;

    catSnap.forEach(d => {
      if (d.data().name && d.data().name.toLowerCase().includes("steam")) {
        steamCatId = d.id;
      }
    });

    if (!steamCatId) {
      const newCatRef = await addDoc(collection(db, "categories"), {
        name: "Juegos Steam",
        description: "Juegos digitales para Steam en oferta y catálogo exacto de Lua Tools con promociones 3x $4.990, 10x $9.990 y 23x $17.990.",
        imageUrl: ""
      });
      steamCatId = newCatRef.id;
    }

    console.log("Cargando 31 juegos exactos del Lote 12 de Lua Tools...");
    const prodSnap = await getDocs(collection(db, "products"));
    const existingNamesSet = new Set();
    prodSnap.forEach(d => {
      if (d.data().name) {
        existingNamesSet.add(normalizeName(d.data().name));
      }
    });

    let addedCount = 0;
    let promoBatch = writeBatch(db);
    let batchCount = 0;

    for (const game of screenshotBatch12) {
      const norm = normalizeName(game.name);
      if (existingNamesSet.has(norm)) {
        continue;
      }

      const docRef = doc(collection(db, "products"));
      const imgUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`;
      const priceUSD = (parseFloat(game.priceCLP) / 900).toFixed(2);

      promoBatch.set(docRef, {
        name: game.name,
        appid: game.appid,
        priceCLP: game.priceCLP,
        priceUSD: priceUSD,
        pricePrimariaCLP: game.priceCLP,
        pricePrimariaUSD: priceUSD,
        categoryId: steamCatId,
        plataforma: "Steam",
        genero: game.isPromo ? "Steam Promo" : "Acción / Steam",
        idioma: "Español / Multilenguaje",
        anio: "2026",
        comentario: game.isPromo ? "INCLUIDO EN PROMOS STEAM (3x $4.990 / 10x $9.990 / 23x $17.990)" : "ENTREGA INMEDIATA STEAM - LUA TOOLS 2026",
        imageUrl: imgUrl,
        tags: game.isPromo ? ["Steam", "Promo", "3x4990", "10x9990", "23x17990"] : ["Steam", "Popular"],
        isSteamPromoEligible: game.isPromo,
        createdAt: new Date().toISOString()
      });

      existingNamesSet.add(norm);
      addedCount++;
      batchCount++;

      if (batchCount >= 400) {
        await promoBatch.commit();
        promoBatch = writeBatch(db);
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await promoBatch.commit();
    }

    console.log(`=== PROCESO DE CARGA DEL LOTE 12 COMPLETADO ===`);
    console.log(`Se agregaron ${addedCount} juegos nuevos adicionales a la categoría 'Juegos Steam'.`);

  } catch(err) {
    console.error("Error al procesar el Lote 12 de Lua Tools:", err);
  }
}

seedBatch12ScreenshotCatalog();
