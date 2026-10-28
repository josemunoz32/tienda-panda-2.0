/**
 * referralHelper.js
 * Sistema de referidos PandaStore
 * - Cada usuario tiene un código único PANDA-xxxxxx
 * - Al comprar con ref=CODIGO, el referidor gana $1.000 CLP de crédito
 * - El crédito se acumula en users/{uid}.referralCredits
 */

import { db } from '../firebase';
import {
  doc, getDoc, setDoc, updateDoc, addDoc,
  collection, query, where, getDocs
} from 'firebase/firestore';

const BASE_URL = window.location.origin; // e.g. http://localhost:3000 or https://pandastoregaming.cl

/** Genera un código único de referido basado en el UID */
export function generateReferralCode(uid) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PANDA-';
  // Usar los primeros 6 caracteres del uid como base + chars aleatorios
  for (let i = 0; i < 6; i++) {
    const idx = uid.charCodeAt(i % uid.length) % chars.length;
    code += chars[idx];
  }
  return code;
}

/** Obtiene o crea el código de referido del usuario en Firestore */
export async function getOrCreateReferralCode(uid) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (snap.exists() && snap.data().referralCode) {
    return snap.data().referralCode;
  }
  const code = generateReferralCode(uid);
  await updateDoc(userRef, { referralCode: code });
  return code;
}

/** Construye el link de referido completo */
export function buildReferralLink(code) {
  return `${BASE_URL}/home?ref=${code}`;
}

/** Captura el código de referido del URL y lo guarda en localStorage */
export function captureReferralFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && ref.startsWith('PANDA-')) {
      localStorage.setItem('pandaReferralCode', ref);
      sessionStorage.setItem('pandaReferralCode', ref);
    }
  } catch (e) {}
}

/** Obtiene el código de referido guardado en storage */
export function getSavedReferralCode() {
  return localStorage.getItem('pandaReferralCode') || sessionStorage.getItem('pandaReferralCode') || null;
}

/** Limpia el código de referido después de usarlo */
export function clearReferralCode() {
  localStorage.removeItem('pandaReferralCode');
  sessionStorage.removeItem('pandaReferralCode');
}

/**
 * Registra una compra de referido en Firestore
 * Se llama al completar una compra exitosa
 * @param {string} buyerUid - UID o null si es guest
 * @param {string} buyerEmail - Email del comprador
 */
export async function registerReferralPurchase(buyerUid, buyerEmail) {
  try {
    const refCode = getSavedReferralCode();
    if (!refCode) return;

    // Buscar el referidor por código
    const q = query(collection(db, 'users'), where('referralCode', '==', refCode));
    const snap = await getDocs(q);
    if (snap.empty) return;

    const referrerDoc = snap.docs[0];
    const referrerId = referrerDoc.id;

    // No auto-referido
    if (buyerUid && referrerId === buyerUid) return;

    // Verificar que el comprador NO haya sido ya referido antes (revisión estricta por UID y por Email)
    const normalizedEmail = (buyerEmail || "").trim().toLowerCase();
    if (normalizedEmail) {
      const emailQ = query(
        collection(db, 'referrals'),
        where('referredEmail', '==', normalizedEmail),
        where('purchaseComplete', '==', true)
      );
      const emailSnap = await getDocs(emailQ);
      if (!emailSnap.empty) {
        clearReferralCode();
        return; // Ya completó su primera compra anteriormente, no se premia otra vez
      }
    }

    if (buyerUid) {
      const uidQ = query(
        collection(db, 'referrals'),
        where('referredUid', '==', buyerUid),
        where('purchaseComplete', '==', true)
      );
      const uidSnap = await getDocs(uidQ);
      if (!uidSnap.empty) {
        clearReferralCode();
        return; // Ya completó su primera compra anteriormente
      }
    }

    const buyerIdentifier = buyerUid || normalizedEmail;
    const existingQ = query(
      collection(db, 'referrals'),
      where('referredIdentifier', '==', buyerIdentifier),
      where('purchaseComplete', '==', true)
    );
    const existingSnap = await getDocs(existingQ);
    if (!existingSnap.empty) {
      clearReferralCode();
      return; // Ya fue referido antes
    }

    // Crear documento de referido
    await addDoc(collection(db, 'referrals'), {
      referrerId,
      referrerCode: refCode,
      referredUid: buyerUid || null,
      referredEmail: buyerEmail || null,
      referredIdentifier: buyerIdentifier,
      purchaseComplete: true,
      creditAwarded: false,
      creditAmount: 1000, // CLP
      createdAt: new Date().toISOString()
    });

    // Agregar crédito al referidor
    const currentCredits = referrerDoc.data().referralCredits || 0;
    await updateDoc(doc(db, 'users', referrerId), {
      referralCredits: currentCredits + 1000
    });

    clearReferralCode();
  } catch (e) {
    console.warn('[Referral] Error al registrar referido:', e);
  }
}

/** Obtiene los referidos del usuario (para mostrar en el perfil) */
export async function getReferralStats(uid) {
  try {
    const q = query(collection(db, 'referrals'), where('referrerId', '==', uid));
    const snap = await getDocs(q);
    const referrals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const total = referrals.length;
    const completed = referrals.filter(r => r.purchaseComplete).length;
    const credits = referrals.filter(r => r.purchaseComplete).reduce((acc, r) => acc + (r.creditAmount || 1000), 0);
    return { total, completed, credits, referrals };
  } catch (e) {
    return { total: 0, completed: 0, credits: 0, referrals: [] };
  }
}

/** Descuenta créditos de referidos del usuario al aplicarlos a una compra */
export async function deductReferralCredits(uid, amount) {
  try {
    if (!uid || amount <= 0) return;
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;
    const current = snap.data().referralCredits || 0;
    const newAmount = Math.max(0, current - amount);
    await updateDoc(userRef, { referralCredits: newAmount });
  } catch (e) {
    console.warn('[Referral] Error al descontar créditos:', e);
  }
}
