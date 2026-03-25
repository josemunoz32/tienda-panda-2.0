// Devuelve un array de productos reales con imagen y nombre
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export async function getAllProductsWithImage() {
  const snap = await getDocs(collection(db, "products"));
  return snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(p => p.imageUrl && p.name)
    .map(p => ({ id: p.id, name: p.name, image: p.imageUrl }));
}
