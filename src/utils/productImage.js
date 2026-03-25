// Utilidad para obtener la imagen de un producto por nombre
// Busca coincidencia exacta o parcial (case-insensitive)
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export async function getProductImageByName(productName) {
  if (!productName) return null;
  const snap = await getDocs(collection(db, "products"));
  const lower = productName.toLowerCase();
  // Coincidencia exacta
  let prod = snap.docs.find(doc => (doc.data().name || "").toLowerCase() === lower);
  if (prod && prod.data().imageUrl) return prod.data().imageUrl;
  // Coincidencia parcial
  prod = snap.docs.find(doc => (doc.data().name || "").toLowerCase().includes(lower));
  if (prod && prod.data().imageUrl) return prod.data().imageUrl;
  return null;
}
