import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

console.log("Inicializando Firebase con projectId:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

function normalizeName(name) {
  return (name || '').toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function runUpload() {
  try {
    console.log("Obteniendo categorías de Firestore...");
    const catSnap = await getDocs(collection(db, "categories"));
    const categories = [];
    catSnap.forEach(d => categories.push({ id: d.id, ...d.data() }));
    
    console.log("Categorías encontradas:", categories.map(c => `${c.name} (${c.id})`));
    
    let ps4CatId = categories.find(c => c.name.toLowerCase().includes('ps4'))?.id;
    let ps5CatId = categories.find(c => c.name.toLowerCase().includes('ps5'))?.id;
    
    if (!ps5CatId && categories.length > 0) ps5CatId = categories[0].id;
    if (!ps4CatId && categories.length > 0) ps4CatId = categories[0].id;

    console.log("Obteniendo productos existentes para deduplicación...");
    const prodSnap = await getDocs(collection(db, "products"));
    const existingNamesSet = new Set();
    prodSnap.forEach(d => {
      const p = d.data();
      if (p.name) {
        existingNamesSet.add(normalizeName(p.name));
      }
    });
    console.log(`Productos existentes en base de datos: ${existingNamesSet.size}`);

    const jsonPath = 'C:\\Users\\Usuario\\.gemini\\antigravity-ide\\brain\\68e1783f-d081-4b07-a224-5b0c660b5a93\\scratch\\products_extracted.json';
    const productsData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    let addedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < productsData.length; i++) {
      const p = productsData[i];
      const normName = normalizeName(p.name);

      if (existingNamesSet.has(normName)) {
        console.log(`[OMITIDO - YA EXISTE] (${i+1}/${productsData.length}): ${p.name}`);
        skippedCount++;
        continue;
      }

      console.log(`[SUBIENDO] (${i+1}/${productsData.length}): ${p.name}...`);
      
      let imageUrl = "";
      if (p.imagePath && fs.existsSync(p.imagePath)) {
        try {
          const imgBuffer = fs.readFileSync(p.imagePath);
          const fileName = `products/${Date.now()}_${p.sku || 'game'}_cover.jpg`;
          const fileRef = ref(storage, fileName);
          await uploadBytes(fileRef, imgBuffer, { contentType: 'image/jpeg' });
          imageUrl = await getDownloadURL(fileRef);
        } catch (imgErr) {
          console.error(`Error al subir imagen para ${p.name}:`, imgErr.message);
        }
      }

      const platLower = (p.plataforma || '').toLowerCase();
      let targetCatId = ps5CatId;
      if (platLower === 'ps4' && ps4CatId) {
        targetCatId = ps4CatId;
      }

      const docData = {
        name: p.name,
        description: p.comentario || 'ENTREGA INMEDIATA',
        stock: "99",
        categoryId: targetCatId,
        imageUrl: imageUrl,
        priceCLP: p.pricePrimariaCLP || "",
        priceUSD: p.pricePrimariaUSD || "",
        pricePrimariaCLP: p.pricePrimariaCLP || "",
        pricePrimariaUSD: p.pricePrimariaUSD || "",
        priceSecundariaCLP: p.priceSecundariaCLP || "",
        priceSecundariaUSD: p.priceSecundariaUSD || "",
        switchCompat: "ambas",
        preciosPorMes: [],
        tags: [p.genero, "Digital"],
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "products"), docData);
      existingNamesSet.add(normName);
      addedCount++;
      console.log(`✓ [ÉXITO] Subido: ${p.name} (Primaria: $${p.pricePrimariaCLP || 'N/A'}, Sec: $${p.priceSecundariaCLP || 'N/A'})`);
    }

    console.log(`\n==========================================`);
    console.log(`PROCESO COMPLETADO EXITOSAMENTE`);
    console.log(`Juegos agregados a Firestore: ${addedCount}`);
    console.log(`Juegos ya existentes (omitidos): ${skippedCount}`);
    console.log(`==========================================`);

    process.exit(0);

  } catch (err) {
    console.error("Error grave en la automatización:", err);
    process.exit(1);
  }
}

runUpload();
