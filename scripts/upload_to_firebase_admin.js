const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const serviceAccount = require("../pandastoreupdate-firebase-adminsdk-fbsvc-d546d74554.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "pandastoreupdate.firebasestorage.app"
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

function normalizeName(name) {
  return (name || '').toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function runUpload() {
  try {
    console.log("=== INICIANDO SUBIDA AUTOMÁTICA CON PRIVILEGIOS DE ADMIN ===");

    // 1. Obtener categorías
    const catSnap = await db.collection("categories").get();
    const categories = [];
    catSnap.forEach(d => categories.push({ id: d.id, ...d.data() }));
    
    console.log("Categorías obtenidas de Firestore:", categories.map(c => `${c.name} (${c.id})`));
    
    let ps4CatId = categories.find(c => c.name.toLowerCase().includes('ps4'))?.id;
    let ps5CatId = categories.find(c => c.name.toLowerCase().includes('ps5'))?.id;
    
    if (!ps5CatId && categories.length > 0) ps5CatId = categories[0].id;
    if (!ps4CatId && categories.length > 0) ps4CatId = categories[0].id;

    // 2. Obtener productos existentes para deduplicación
    console.log("Comprobando productos existentes para no repetir...");
    const prodSnap = await db.collection("products").get();
    const existingNamesSet = new Set();
    prodSnap.forEach(d => {
      const p = d.data();
      if (p.name) {
        existingNamesSet.add(normalizeName(p.name));
      }
    });
    console.log(`Productos ya existentes en la web: ${existingNamesSet.size}`);

    // 3. Leer los 99 juegos extraídos del Excel
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

      console.log(`[PROCESANDO] (${i+1}/${productsData.length}): ${p.name}...`);
      
      // Subir imagen a Firebase Storage si existe
      let imageUrl = "";
      if (p.imagePath && fs.existsSync(p.imagePath)) {
        try {
          const fileExtension = '.jpg';
          const destinationPath = `products/${Date.now()}_${uuidv4().substring(0, 8)}_cover${fileExtension}`;
          const token = uuidv4();

          const [uploadedFile] = await bucket.upload(p.imagePath, {
            destination: destinationPath,
            metadata: {
              contentType: 'image/jpeg',
              metadata: {
                firebaseStorageDownloadTokens: token
              }
            }
          });

          imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destinationPath)}?alt=media&token=${token}`;
          console.log(`  ✓ Imagen subida con éxito`);
        } catch (imgErr) {
          console.error(`  ✗ Error al subir imagen para ${p.name}:`, imgErr.message);
        }
      }

      // Determinar categoría según la plataforma (PS4 o PS5)
      const platLower = (p.plataforma || '').toLowerCase();
      let targetCatId = ps5CatId;
      if (platLower === 'ps4' && ps4CatId) {
        targetCatId = ps4CatId;
      }

      const mainCLP = p.pricePrimariaCLP || p.priceSecundariaCLP || "";
      const mainUSD = p.pricePrimariaUSD || p.priceSecundariaUSD || "";

      const docData = {
        name: p.name,
        description: p.comentario || 'ENTREGA INMEDIATA',
        stock: "99",
        categoryId: targetCatId,
        imageUrl: imageUrl,
        priceCLP: mainCLP,
        priceUSD: mainUSD,
        pricePrimariaCLP: p.pricePrimariaCLP || "",
        pricePrimariaUSD: p.pricePrimariaUSD || "",
        priceSecundariaCLP: p.priceSecundariaCLP || "",
        priceSecundariaUSD: p.priceSecundariaUSD || "",
        switchCompat: "ambas",
        preciosPorMes: [],
        tags: [p.genero, "Digital"],
        createdAt: new Date().toISOString()
      };

      const docRef = await db.collection("products").add(docData);
      existingNamesSet.add(normName);
      addedCount++;
      console.log(`  ✓ [SUBIDO CORRECAMENTE] ID: ${docRef.id} | Primaria: $${p.pricePrimariaCLP || 'N/A'}, Secundaria: $${p.priceSecundariaCLP || 'N/A'}`);
    }

    console.log(`\n==========================================`);
    console.log(`🎉 PROCESO COMPLETADO CON ÉXITO 🎉`);
    console.log(`Juegos nuevos subidos a la web: ${addedCount}`);
    console.log(`Juegos ya existentes (omitidos): ${skippedCount}`);
    console.log(`==========================================`);

    process.exit(0);
  } catch (err) {
    console.error("Error grave en la ejecución:", err);
    process.exit(1);
  }
}

runUpload();
