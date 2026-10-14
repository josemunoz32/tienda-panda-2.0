import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const app = initializeApp({
  apiKey: envVars.REACT_APP_FIREBASE_API_KEY,
  authDomain: envVars.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: envVars.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.REACT_APP_FIREBASE_APP_ID
});

const auth = getAuth(app);
const db = getFirestore(app);

async function cleanClientFacingPromos() {
  const email = "steamseeder_pandastore@gmail.com";
  const password = "PandaStoreSteam123!";
  const res = await signInWithEmailAndPassword(auth, email, password);
  console.log("Sesión autenticada como:", res.user.email);

  const snap = await getDocs(collection(db, "products"));
  let updatedCount = 0;

  for (const d of snap.docs) {
    const data = d.data();
    const comment = data.comentario || "";
    const tags = data.tags || [];

    // Chequear si tiene texto que mencione código de activación o es Denuvo
    if (data.isDenuvoActivation || comment.includes("ACTIVACIÓN POR CÓDIGO") || tags.includes("Denuvo")) {
      const priceFormatted = Number(data.priceCLP || 8000).toLocaleString('es-CL');
      const cleanClientPromo = `INCLUYE 2 JUEGOS DE REGALO A ELECCIÓN ($${priceFormatted})`;

      // En tags y flags internos mantenemos Denuvo, isDenuvoActivation: true
      const updatedTags = Array.from(new Set([
        ...tags.filter(t => t !== "Activación"),
        "Denuvo",
        "Regalo2Juegos"
      ]));

      console.log(`[LIMPIANDO COMENTARIO CLIENTE] ${data.name}`);
      console.log(`  Antes: "${comment}"`);
      console.log(`  Ahora: "${cleanClientPromo}"`);

      await updateDoc(doc(db, "products", d.id), {
        comentario: cleanClientPromo,
        isDenuvoActivation: true, // Flag administrativo intacto
        tags: updatedTags,
        updatedAt: new Date().toISOString()
      });

      updatedCount++;
    }
  }

  console.log(`\n✅ ${updatedCount} productos actualizados con comentario limpio para el cliente.`);
}

cleanClientFacingPromos().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
