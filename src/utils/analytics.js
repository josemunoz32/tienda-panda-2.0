/**
 * analytics.js — Servicio central de analítica
 * Guarda eventos en Firestore + dispara Firebase Analytics + Meta Pixel
 */
import { db, analytics, logEvent } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { recordViewedProduct } from "./abandonedCart";
import { getVisitorId } from "./visitorIdentity";

// ── Session ID único por pestaña + visitante persistente por navegador ──
const SESSION_ID = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function getBaseProps() {
  return {
    sessionId: SESSION_ID,
    visitorId: getVisitorId(),
    page: window.location.pathname,
    referrer: document.referrer || "direct",
    userAgent: navigator.userAgent,
    timestamp: serverTimestamp(),
  };
}

// ── Guarda evento en Firestore ──
async function saveEvent(eventName, props = {}) {
  try {
    await addDoc(collection(db, "analyticsEvents"), {
      event: eventName,
      ...getBaseProps(),
      ...props,
    });
  } catch (_) {}
}

// ── Dispara Meta Pixel si está disponible ──
function fbq(eventType, eventName, params = {}) {
  if (typeof window.fbq === "function") {
    window.fbq(eventType, eventName, params);
  }
}

// ──────────────────────────────────────────────
// EVENTOS PÚBLICOS
// ──────────────────────────────────────────────

export function trackPageView(page, userId = null) {
  const props = { userId };
  logEvent(analytics, "page_view", { page_path: page });
  fbq("track", "PageView");
  saveEvent("page_view", props);
}

export function trackViewItem(product, userId = null) {
  const params = {
    item_id: product.id,
    item_name: product.name,
    price: product.priceCLP || 0,
    currency: "CLP",
  };
  logEvent(analytics, "view_item", params);
  fbq("track", "ViewContent", { content_ids: [product.id], content_name: product.name, value: product.priceCLP || 0, currency: "CLP" });
  saveEvent("view_item", { productId: product.id, productName: product.name, value: product.priceCLP || 0, userId });
  recordViewedProduct(product);
}

export function trackAddToCart(product, userId = null) {
  const params = {
    item_id: product.id,
    item_name: product.name,
    price: product.priceCLP || 0,
    currency: "CLP",
  };
  logEvent(analytics, "add_to_cart", params);
  fbq("track", "AddToCart", { content_ids: [product.id], content_name: product.name, value: product.priceCLP || 0, currency: "CLP" });
  saveEvent("add_to_cart", { productId: product.id, productName: product.name, value: product.priceCLP || 0, userId });
}

export function trackRemoveFromCart(product, userId = null) {
  logEvent(analytics, "remove_from_cart", { item_id: product.id, item_name: product.name });
  saveEvent("remove_from_cart", { productId: product.id, productName: product.name, userId });
}

export function trackBeginCheckout(items = [], total = 0, currency = "CLP", userId = null) {
  logEvent(analytics, "begin_checkout", { value: total, currency, items: items.length });
  fbq("track", "InitiateCheckout", { value: total, currency, num_items: items.length });
  saveEvent("begin_checkout", { value: total, currency, itemCount: items.length, userId });
}

export function trackPurchase(orderId, items = [], total = 0, currency = "CLP", userId = null) {
  logEvent(analytics, "purchase", { transaction_id: orderId, value: total, currency, items: items.length });
  fbq("track", "Purchase", { value: total, currency, content_ids: items.map(i => i.id || i.productId) });
  saveEvent("purchase", { orderId, value: total, currency, itemCount: items.length, userId });
}

export function trackSearch(query, resultsCount = 0, userId = null) {
  logEvent(analytics, "search", { search_term: query });
  saveEvent("search", { query, searchTerm: query, resultsCount, userId });
}

export function trackLogin(method = "email", userId = null) {
  logEvent(analytics, "login", { method });
  saveEvent("login", { method, userId });
}

export function trackSignUp(method = "email", userId = null) {
  logEvent(analytics, "sign_up", { method });
  saveEvent("sign_up", { method, userId });
}

export function trackClickWhatsapp(context = "", userId = null) {
  logEvent(analytics, "click_whatsapp", { context });
  saveEvent("click_whatsapp", { context, userId });
}

export function trackClickInstagram(context = "", userId = null) {
  logEvent(analytics, "click_instagram", { context });
  saveEvent("click_instagram", { context, userId });
}
