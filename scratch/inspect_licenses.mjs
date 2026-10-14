import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspect() {
  const snap = await getDocs(collection(db, "licenses"));
  const libres = [];
  snap.forEach(d => {
    const data = d.data();
    if (!data.hwid) {
      libres.push({
        id: d.id,
        key: data.key,
        email: data.client_email,
        orderId: data.orderId,
        gamesCount: data.allowed_games?.length,
        games: data.allowed_games,
        createdAt: data.createdAt,
        deliveredAt: data.deliveredAt,
        status: data.status
      });
    }
  });

  console.log("=== LICENCIAS MARCADAS COMO LIBRE (SIN HWID) ===");
  console.log("Total libres:", libres.length);
  for (const l of libres) {
    let orderInfo = "Sin orderId";
    if (l.orderId) {
      try {
        const oSnap = await getDoc(doc(db, "orders", l.orderId));
        if (oSnap.exists()) {
          const oData = oSnap.data();
          orderInfo = `Estado: ${oData.estado || oData.status}, Email: ${oData.email}, Cliente: ${oData.nombre || oData.clientName}, Prods: ${(oData.productos || []).map(p => p.name).join(", ")}`;
        } else {
          orderInfo = "Order no existe en orders";
        }
      } catch (e) {
        orderInfo = "Error fetching order: " + e.message;
      }
    }
    console.log({
      key: l.key,
      email: l.email,
      orderId: l.orderId,
      orderDetail: orderInfo,
      games: l.games,
      createdAt: l.createdAt
    });
  }
}

inspect();
