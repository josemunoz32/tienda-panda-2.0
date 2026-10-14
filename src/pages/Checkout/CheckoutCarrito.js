import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PayPalButtonWrapper } from "../Pagos/PayPalButtonWrapper";
import UpsellRecs from "../../components/UpsellRecs";
import DlcUpsellBanner from "../../components/DlcUpsellBanner/DlcUpsellBanner";
import { db, auth, storage } from "../../firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  addDoc,
  setDoc,
  onSnapshot,
  updateDoc,
  increment,
} from "firebase/firestore";
import { useMoneda, roundUpUSD } from "../../context/MonedaContext";
import { useNavigate } from "react-router-dom";
import { trackBeginCheckout, trackPurchase } from "../../utils/analytics";
import { markCartActive, markCartConverted, updateCartCustomerInfo } from "../../utils/abandonedCart";
import { getGamerLevel } from "../../utils/gamerLevel";
import { registerReferralPurchase, deductReferralCredits } from "../../utils/referralHelper";
import { getProductPricing, parseNumberCLP } from "../../utils/priceHelper";
import { hasResellerBenefits, hasB2BAccess } from "../../utils/userRoles";
import { DEFAULT_PAYMENT_SETTINGS, normalizePaymentSettings, PAYMENT_SETTINGS_DOC, validatePaymentProofFile, visibleBankAccounts, visibleForUser } from "../../utils/paymentMethods";
import Loader from "../../components/Loader";
import "./PandaCheckoutCards.css";

// Para monedas distintas de USD, retorna el precio CLP como base para conversión posterior.
export function getMinPriceByMoneda(prod, moneda) {
  const precios = [];
  if (!prod) return null;
  if (moneda === "USD") {
    if (prod.priceUSD) precios.push(Number(prod.priceUSD));
    if (prod.pricePrimariaUSD) precios.push(Number(prod.pricePrimariaUSD));
    if (prod.priceSecundariaUSD) precios.push(Number(prod.priceSecundariaUSD));
    if (Array.isArray(prod.preciosPorMes)) {
      prod.preciosPorMes.forEach((p) => { if (p.usd) precios.push(Number(p.usd)); });
    }
  } else {
    if (prod.priceCLP) precios.push(Number(prod.priceCLP));
    if (prod.pricePrimariaCLP) precios.push(Number(prod.pricePrimariaCLP));
    if (prod.priceSecundariaCLP) precios.push(Number(prod.priceSecundariaCLP));
    if (Array.isArray(prod.preciosPorMes)) {
      prod.preciosPorMes.forEach((p) => { if (p.clp) precios.push(Number(p.clp)); });
    }
  }
  const min = precios.length > 0 ? Math.min(...precios.filter((x) => x > 0)) : null;
  return min;
}

// Los DLC son una venta exclusiva de Steam. Algunos productos PS antiguos
// conservan app_id como referencia interna; eso nunca los transforma en Steam.
function isSteamCartProduct(item, catalogProduct) {
  const product = { ...(catalogProduct || {}), ...(item || {}) };
  const platform = String(product.plataforma || product.platform || product.consoleName || "").toLowerCase();
  const category = String(product.categoria || product.categoryName || "").toLowerCase();
  const isPlayStation = platform.includes("ps4") || platform.includes("ps5") || platform.includes("playstation") ||
    platform.includes("play 4") || platform.includes("play 5") ||
    category.includes("ps4") || category.includes("ps5") || category.includes("playstation") ||
    category.includes("play 4") || category.includes("play 5") ||
    Boolean(product.pricePrimariaCLP || product.priceSecundariaCLP || product.pricePrimariaUSD || product.priceSecundariaUSD);
  if (isPlayStation) return false;
  return platform.includes("steam") || category.includes("steam") || Boolean(product.isSteam) || String(product.productId || product.id || "").startsWith("ryuu_");
}

function getCartVariantLabel(item) {
  const explicit = String(item?.variante || "").trim();
  if (explicit) return explicit.charAt(0).toUpperCase() + explicit.slice(1).toLowerCase();
  const lineId = String(item?.cartLineId || item?.id || "").toLowerCase();
  if (lineId.endsWith("__primaria")) return "Primaria";
  if (lineId.endsWith("__secundaria")) return "Secundaria";
  return "";
}

function formatPrecio(precio, moneda) {
  if (!precio || isNaN(precio)) return "$0";
  if (moneda === "USD") {
    return `$${Number(precio).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (moneda === "CLP") {
    return `$${Math.round(Number(precio)).toLocaleString("es-CL")}`;
  }
  return `$${Math.round(Number(precio)).toLocaleString("es-CL")}`;
}

export default function CheckoutCarrito({ user: propUser }) {
  const [user, setUser] = useState(propUser || auth.currentUser);
  const [customAlert, setCustomAlert] = useState(null);
  const showAlert = (msg) => setCustomAlert(msg);
  const [cupon, setCupon] = useState("");
  const [cuponInfo, setCuponInfo] = useState(null);
  const [cuponError, setCuponError] = useState("");
  const [descuento, setDescuento] = useState(0);
  const navigate = useNavigate();
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [transferenciaRealizada, setTransferenciaRealizada] = useState(false);
  const [bancoSeleccionado, setBancoSeleccionado] = useState(null);
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [comprobanteUploading, setComprobanteUploading] = useState(false);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [metodoPago, setMetodoPago] = useState("");
  const { moneda, infoPais, convertirDesdeCLP, formatearPrecio, tasas, valorDolar } = useMoneda();
  const [selectedMoneda, setSelectedMoneda] = useState(moneda);
  const [paymentSettings, setPaymentSettings] = useState(DEFAULT_PAYMENT_SETTINGS);

  useEffect(() => onSnapshot(doc(db, ...PAYMENT_SETTINGS_DOC), (snap) => {
    setPaymentSettings(normalizePaymentSettings(snap.exists() ? snap.data() : {}));
  }, () => {}), []);

  useEffect(() => {
    setSelectedMoneda(moneda);
  }, [moneda]);

  // Formato exacto y consistente para checkout (sin distorsión de redondeos al 500 de catálogo)
  const formatMontoCheckout = (montoCLP, montoUSD, method = null) => {
    const activeMethod = method || metodoPago;
    if (selectedMoneda === "USD") {
      const u = (typeof montoUSD === "number" && !isNaN(montoUSD) && montoUSD > 0)
        ? montoUSD
        : (convertirDesdeCLP ? convertirDesdeCLP(montoCLP, "USD", activeMethod) : Number(montoCLP || 0) / (valorDolar || 900));
      const redondeado = roundUpUSD(u);
      return `$${Number(redondeado || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (selectedMoneda === "CLP") {
      return `$${Math.round(Number(montoCLP || 0)).toLocaleString("es-CL")}`;
    }
    const convertido = convertirDesdeCLP ? convertirDesdeCLP(montoCLP, selectedMoneda, activeMethod) : montoCLP;
    const cfg = infoPais;
    if (convertido === null || convertido === undefined) {
      return `$${Math.round(Number(montoCLP || 0)).toLocaleString("es-CL")}`;
    }
    return `${cfg?.simbolo || '$'}${Math.round(convertido).toLocaleString("es-CL")}`;
  };

  const [cart, setCart] = useState([]);
  const [cartProducts, setCartProducts] = useState({});
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setUser(u));
    return unsub;
  }, []);
  const [userProfile, setUserProfile] = useState({ firstName: "", lastName: "", ordersCount: 0, referralCredits: 0 });
  const [usarReferralCredits, setUsarReferralCredits] = useState(false);
  const [userOrdersCount, setUserOrdersCount] = useState(0);
  const [cuponDebounceTimer, setCuponDebounceTimer] = useState(null);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const handleSyncGuestInfo = (emailOverride, firstOverride, lastOverride, phoneOverride) => {
    const e = emailOverride !== undefined ? emailOverride : guestEmail;
    const f = firstOverride !== undefined ? firstOverride : guestFirstName;
    const l = lastOverride !== undefined ? lastOverride : guestLastName;
    const p = phoneOverride !== undefined ? phoneOverride : guestPhone;
    const fullName = `${f || ''} ${l || ''}`.trim();
    if (e || p || fullName) {
      updateCartCustomerInfo(e, fullName, p);
    }
  };

  useEffect(() => {
    if (user) {
      updateCartCustomerInfo(user.email, user.displayName, user.phoneNumber, user.uid);
      getDoc(doc(db, "users", user.uid)).then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          setUserProfile({
            ...d,
            firstName: d.firstName || "",
            lastName: d.lastName || "",
            role: d.role || "user",
            wallet_balance: Number(d.wallet_balance) || 0,
            ordersCount: d.ordersCount || 0,
            referralCredits: d.referralCredits || 0
          });
        }
      }).catch(err => console.error("Error loading user profile in cart:", err));

      // Escuchar cambios de saldo de billetera en vivo
      const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setUserProfile(prev => ({
            ...prev,
            ...d,
            role: d.role || "user",
            wallet_balance: Number(d.wallet_balance) || 0
          }));
        }
      });
      return () => unsub();
    }
  }, [user]);

  // Sincronizar automáticamente el método de pago válido según el país seleccionado
  useEffect(() => {
    setSelectedMoneda(moneda);
    const isRevendedor = hasB2BAccess(userProfile);
    const countryAllowed = (infoPais?.metodosPago || ['PayPal', 'Crypto'])
      .map(m => m.toLowerCase().replace(/\s/g, ''));
    const valid = [];
    if (isRevendedor) valid.push('billetera');
    countryAllowed.forEach(m => {
      if ((m === 'transferencia' || m === 'transfer') && infoPais?.codigo === 'CL' && paymentSettings.transfer?.enabled !== false && visibleForUser(paymentSettings.transfer, userProfile)) {
        valid.push('transferencia');
      } else if (m === 'mercadopago' && infoPais?.codigo === 'CL' && paymentSettings.mercadoPago?.enabled !== false) {
        valid.push('mercadopago');
      } else if (m === 'prex') {
        valid.push('prex');
      } else if (m === 'crypto' && paymentSettings.crypto?.enabled !== false && paymentSettings.crypto?.address && visibleForUser(paymentSettings.crypto, userProfile)) {
        valid.push('crypto');
      } else if (m === 'paypal') {
        valid.push('paypal');
      }
    });

    if (!metodoPago || !valid.includes(metodoPago)) {
      setMetodoPago(valid[0] || '');
    }
  }, [moneda, infoPais?.codigo, infoPais?.metodosPago, paymentSettings, userProfile]);

  // Manejo de actualización de cantidad de ítems
  const handleUpdateQuantity = async (item, delta) => {
    const currentQty = Number(item.cantidad || item.quantity || 1);
    const newQty = currentQty + delta;

    if (newQty <= 0) {
      await handleRemoveItem(item);
      return;
    }

    if (user) {
      try {
        const itemDocId = item.id || item.productId;
        await updateDoc(doc(db, `users/${user.uid}/cart`, itemDocId), {
          cantidad: newQty,
          quantity: newQty
        });
      } catch (err) {
        console.error("Error al actualizar cantidad:", err);
      }
    } else {
      let localCart = [];
      try {
        const stored = localStorage.getItem('guestCart');
        if (stored) localCart = JSON.parse(stored);
      } catch(e) {}
      const targetId = item.productId || item.id;
      localCart = localCart.map(it => {
        if ((it.productId || it.id) === targetId) {
          return { ...it, cantidad: newQty, quantity: newQty };
        }
        return it;
      });
      localStorage.setItem('guestCart', JSON.stringify(localCart));
      setCart(localCart);
      window.dispatchEvent(new Event('localCartUpdated'));
    }
  };

  // Manejo de eliminación de ítem
  const handleRemoveItem = async (item) => {
    if (user) {
      try {
        const itemDocId = item.id || item.productId;
        await deleteDoc(doc(db, `users/${user.uid}/cart`, itemDocId));
      } catch (err) {
        console.error("Error al eliminar ítem:", err);
      }
    } else {
      let localCart = [];
      try {
        const stored = localStorage.getItem('guestCart');
        if (stored) localCart = JSON.parse(stored);
      } catch(e) {}
      const targetId = item.productId || item.id;
      localCart = localCart.filter(it => (it.productId || it.id) !== targetId);
      localStorage.setItem('guestCart', JSON.stringify(localCart));
      setCart(localCart);
      window.dispatchEvent(new Event('localCartUpdated'));
    }
  };

  // Manejo de adición de DLCs oficiales al carrito
  const handleAddDlcToCart = async (dlcItem) => {
    setCart(prev => {
      const exists = prev.some(p => (p.productId || p.id) === dlcItem.id);
      if (exists) return prev;
      return [...prev, dlcItem];
    });

    if (!user) {
      let lCart = [];
      try {
        const c = localStorage.getItem('guestCart');
        if (c) lCart = JSON.parse(c);
      } catch(e) {}
      if (!lCart.some(i => (i.productId || i.id) === dlcItem.id)) {
        lCart.push(dlcItem);
        localStorage.setItem('guestCart', JSON.stringify(lCart));
        window.dispatchEvent(new Event('localCartUpdated'));
      }
    } else {
      try {
        await setDoc(doc(db, `users/${user.uid}/cart`, dlcItem.id), dlcItem);
      } catch (err) {
        console.error("Error al persistir DLC en carrito:", err);
      }
    }
  };

  // Fuente única del precio B2B de un ítem. Se conserva el precio público por
  // separado para poder recalcular sin perder la variante o el plan elegido.
  const getResellerCartPrice = (item, fullProd) => {
    const variant = getCartVariantLabel(item).toLowerCase();
    const selectedPlan = Array.isArray(fullProd?.preciosPorMes)
      ? fullProd.preciosPorMes.find((plan) => Number(plan?.meses) === Number(item?.meses))
      : null;
    const variantPrice = variant === "primaria"
      ? parseNumberCLP(fullProd?.pricePrimariaCLP || item?.pricePrimariaCLP)
      : variant === "secundaria"
        ? parseNumberCLP(fullProd?.priceSecundariaCLP || item?.priceSecundariaCLP)
        : (selectedPlan?.clp ? parseNumberCLP(selectedPlan.clp) : 0);

    const publicPriceCLP = variantPrice || parseNumberCLP(item?.precioPublicoCLP || item?.priceCLP || fullProd?.priceCLP || 0);
    if (publicPriceCLP <= 0) return null;
    return getProductPricing({
      ...fullProd,
      ...item,
      variante: getCartVariantLabel(item),
      selectedPriceCLP: publicPriceCLP,
      priceCLP: publicPriceCLP,
      categoryName: item?.categoryName || item?.categoria || fullProd?.categoryName || fullProd?.categoria || fullProd?.plataforma || ""
    }, "revendedor", userProfile?.purchaseCount || userProfile?.comprasRealizadas || 0);
  };

  // Total base en CLP considerando cantidades y precios B2B para revendedores
  const totalCLP = cart.reduce((acc, item) => {
    const qty = Number(item.cantidad || item.quantity || 1);
    const cleanBaseId = String(item.productId || item.id || '').split('__')[0];
    const fullProd = cartProducts[cleanBaseId] || cartProducts[item.productId] || cartProducts[item.cartLineId] || cartProducts[item.id] || item;
    
    let unitPrice = 0;
    if (hasResellerBenefits(userProfile)) {
      const pricing = getResellerCartPrice(item, fullProd);
      unitPrice = Number(pricing?.precioFinal || item.priceCLP || 0);
    } else {
      const variant = getCartVariantLabel(item).toLowerCase();
      let variantPrice = 0;
      if (variant === "primaria") {
        variantPrice = parseNumberCLP(fullProd?.pricePrimariaCLP || item?.pricePrimariaCLP || item?.priceCLP);
      } else if (variant === "secundaria") {
        variantPrice = parseNumberCLP(fullProd?.priceSecundariaCLP || item?.priceSecundariaCLP || item?.priceCLP);
      }
      const fromItem = variantPrice || parseNumberCLP(item.priceCLP || 0);
      unitPrice = fromItem > 0 ? fromItem : (fullProd ? (getMinPriceByMoneda(fullProd, 'CLP') || 0) : 0);
    }
    return acc + (unitPrice * qty);
  }, 0);

  const subtotal = selectedMoneda === "CLP" ? totalCLP : (convertirDesdeCLP(totalCLP) || totalCLP);
  


  // Función para comprobar si un ítem coincide con la categoría del cupón
  function itemMatchesCategory(item, fullProd, categoria) {
    if (!categoria || categoria === 'todas') return true;
    const lc = (s) => (s || '').toString().toLowerCase();
    const pName = lc(item?.name || fullProd?.name);
    const pPlat = lc(item?.consoleName || item?.plataforma || fullProd?.plataforma);
    const pCat = lc(item?.categoria || item?.categoryName || fullProd?.categoria || fullProd?.categoryName);
    const pId = lc(item?.productId || item?.id || fullProd?.id);

    if (categoria === 'steam') {
      return pPlat.includes('steam') || pPlat.includes('pc') || pCat.includes('steam') || pName.includes('steam') || fullProd?.isDenuvoActivation || pId.startsWith('steam_') || pId.startsWith('ryuu_');
    }
    if (categoria === 'nintendo') {
      return pPlat.includes('switch') || pPlat.includes('nintendo') || pCat.includes('switch') || pCat.includes('nintendo') || pName.includes('switch');
    }
    if (categoria === 'playstation') {
      return pPlat.includes('ps4') || pPlat.includes('ps5') || pPlat.includes('playstation') || pCat.includes('ps4') || pCat.includes('ps5') || pCat.includes('playstation');
    }
    if (categoria === 'packs') {
      return pCat.includes('pack') || pName.includes('pack') || pId.includes('pack');
    }
    if (categoria === 'sagas') {
      return pCat.includes('saga') || pName.includes('saga') || pId.includes('saga');
    }
    if (categoria === 'streaming') {
      return pCat.includes('stream') || pCat.includes('suscri') || pPlat.includes('stream') || pPlat.includes('suscri') || pName.includes('netflix') || pName.includes('spotify') || pName.includes('disney');
    }
    return true;
  }

  // Descuento cupón (con soporte de categoría y carritos mixtos)
  const cupCat = cuponInfo?.categoria || 'todas';
  const elegiblesCLP = cart.reduce((acc, item) => {
    const cleanBaseId = String(item.productId || item.id || '').split('__')[0];
    const fullProd = cartProducts[cleanBaseId] || cartProducts[item.id] || cartProducts[item.productId] || item;
    if (itemMatchesCategory(item, fullProd, cupCat)) {
      const qty = Number(item.cantidad || item.quantity || 1);
      const fromItem = Number(item.priceCLP || item.pricePrimariaCLP || item.priceSecundariaCLP || 0);
      const unitPrice = fromItem > 0 ? fromItem : (fullProd ? (getMinPriceByMoneda(fullProd, 'CLP') || 0) : 0);
      return acc + (unitPrice * qty);
    }
    return acc;
  }, 0);

  const esRevendedor = hasB2BAccess(userProfile) || cart.some(p => p.isResellerPrice);
  // Los precios B2B ya incluyen su condición comercial: no admiten cupones.
  const descuentoCuponMontoCLP = esRevendedor ? 0 : elegiblesCLP * (descuento / 100);
  const elegiblesLocal = selectedMoneda === "CLP" ? elegiblesCLP : (convertirDesdeCLP(elegiblesCLP) || elegiblesCLP);
  const descuentoCuponMonto = esRevendedor ? 0 : elegiblesLocal * (descuento / 100);

  // Gamer Level permanent discount (Bronce 0%, Plata 5%, Oro 10%, Diamante 15%)
  const gamerLevel = getGamerLevel(userOrdersCount);
  // Los precios B2B ya son netos y no acumulan descuentos de nivel.
  const gamerLevelDiscountPercent = esRevendedor ? 0 : (gamerLevel.discountPercent || 0);
  const descuentoNivelMontoCLP = totalCLP * (gamerLevelDiscountPercent / 100);
  const descuentoNivelMonto = subtotal * (gamerLevelDiscountPercent / 100);

  // Descuento por saldo de referidos
  const maxReferralCreditsCLP = (user && usarReferralCredits)
    ? Math.min(userProfile.referralCredits || 0, Math.max(0, totalCLP - descuentoCuponMontoCLP - descuentoNivelMontoCLP))
    : 0;
  const descuentoReferralCLP = Math.max(0, maxReferralCreditsCLP);
  const descuentoReferralMonto = selectedMoneda === "CLP" ? descuentoReferralCLP : (convertirDesdeCLP(descuentoReferralCLP) || descuentoReferralCLP);

  // Descuento total combinado
  const descuentoTotalCLP = descuentoCuponMontoCLP + descuentoNivelMontoCLP + descuentoReferralCLP;
  const descuentoTotalMonto = descuentoCuponMonto + descuentoNivelMonto + descuentoReferralMonto;

  // El catálogo es neto: al cliente final se le agrega IVA; B2B compra neto.
  const IVA_RATE = 0.19;
  const baseNetaCLP = Math.max(0, totalCLP - descuentoTotalCLP);
  const ivaCLP = esRevendedor ? 0 : Math.round(baseNetaCLP * IVA_RATE);
  const totalFinalCLP = baseNetaCLP + ivaCLP;
  const rawTotalFinal = selectedMoneda === "USD"
    ? (convertirDesdeCLP(totalFinalCLP) || (totalFinalCLP / (valorDolar || 900)))
    : (convertirDesdeCLP(totalFinalCLP) || totalFinalCLP);
  const totalFinal = selectedMoneda === "USD" ? roundUpUSD(rawTotalFinal) : rawTotalFinal;

  const iva = selectedMoneda === "USD"
    ? (convertirDesdeCLP(ivaCLP) || (ivaCLP / (valorDolar || 900)))
    : (convertirDesdeCLP(ivaCLP) || ivaCLP);
  const baseNeta = selectedMoneda === "USD" ? (convertirDesdeCLP(baseNetaCLP) || baseNetaCLP) : (convertirDesdeCLP(baseNetaCLP) || baseNetaCLP);

  const totalConDescuentoRedondeado =
    selectedMoneda === "CLP" && metodoPago === "mercadopago"
      ? Math.ceil(totalFinalCLP)
      : totalFinalCLP;

  // Total en USD: Crypto sin comisión, PayPal con margen (fórmula canónica segura basada en CLP / dólar administrativo)
  const rawTotalUSD = selectedMoneda === "USD"
    ? totalFinal
    : (totalFinalCLP / (Number(valorDolar) || 900));
  const totalUSD = roundUpUSD(rawTotalUSD);
  const totalUSDPayPal = totalUSD !== null ? roundUpUSD(totalUSD * 1.054 + 0.5) : null;

  // Validar cupón (soporta logueados y guests, verifica por UID y por email)
  const validarCupon = async (codigoOverride) => {
    const codigoAValidar = (codigoOverride !== undefined ? codigoOverride : cupon).trim();
    setCuponError("");
    setCuponInfo(null);
    setDescuento(0);
    if (esRevendedor) {
      setCupon("");
      setCuponError("Los cupones son exclusivos para clientes finales y no aplican a cuentas B2B.");
      return;
    }
    if (!codigoAValidar) return;
    try {
      const snap = await getDocs(collection(db, "cupones"));
      const match = snap.docs.find(d => {
        const cod = d.data().codigo;
        return cod && cod.toString().trim().toLowerCase() === codigoAValidar.toLowerCase();
      });
      if (!match) {
        setCuponError("Cupón no válido");
        return;
      }
      const data = match.data();
      if (data.activo === false) {
        setCuponError("Cupón inactivo");
        return;
      }

      // Validación robusta de expiración (Timestamp, string YYYY-MM-DD o ISO, Date)
      if (data.expiracion) {
        let expDate = null;
        if (typeof data.expiracion?.toDate === 'function') {
          expDate = data.expiracion.toDate();
        } else if (typeof data.expiracion === 'string') {
          const str = data.expiracion.includes('T') ? data.expiracion : `${data.expiracion}T23:59:59`;
          expDate = new Date(str);
        } else if (data.expiracion?.seconds) {
          expDate = new Date(data.expiracion.seconds * 1000);
        } else if (data.expiracion instanceof Date) {
          expDate = data.expiracion;
        }
        if (expDate && !isNaN(expDate.getTime()) && expDate < new Date()) {
          setCuponError("Cupón expirado");
          return;
        }
      }

      const usadoPorArray = Array.isArray(data.usadoPor) ? data.usadoPor : [];
      const usadoPorEmailsArray = Array.isArray(data.usadoPorEmails) ? data.usadoPorEmails : [];

      if (data.usoMaximo && typeof data.usoMaximo === 'number' && usadoPorArray.length >= data.usoMaximo) {
        setCuponError("Cupón agotado");
        return;
      }
      // Verificar por UID (usuario logueado)
      if (user && usadoPorArray.includes(user.uid)) {
        setCuponError("Ya usaste este cupón anteriormente");
        return;
      }
      // Verificar por email (usuario logueado o invitado)
      const emailAValidar = (user?.email || guestEmail || "").trim().toLowerCase();
      if (emailAValidar && usadoPorEmailsArray.map(e => String(e).toLowerCase()).includes(emailAValidar)) {
        setCuponError("Este correo ya usó este cupón anteriormente");
        return;
      }
      if (data.descuento > 50) {
        setCuponError("El descuento máximo permitido es 50%");
        return;
      }
      // Validar si el cupón es para una categoría específica
      if (data.categoria && data.categoria !== 'todas') {
        const hasMatching = cart.some(item => {
          const fullProd = cartProducts[item.id] || cartProducts[item.productId];
          return itemMatchesCategory(item, fullProd, data.categoria);
        });
        if (!hasMatching) {
          const catNames = { steam: 'Steam PC', nintendo: 'Nintendo Switch', playstation: 'PlayStation', packs: 'Packs de Juegos', sagas: 'Sagas', streaming: 'Streaming' };
          setCuponError(`Este cupón solo aplica para: ${catNames[data.categoria] || data.categoria}`);
          return;
        }
      }
      setCuponInfo({ ...data, id: match.id });
      setDescuento(Number(data.descuento) || 0);
    } catch (err) {
      console.error("Error al validar cupón:", err);
      setCuponError("Error al validar cupón");
    }
  };

  // Auto-validación con debounce al escribir el código
  const handleCuponChange = (e) => {
    const val = e.target.value;
    setCupon(val);
    setCuponError("");
    if (!val.trim()) { setCuponInfo(null); setDescuento(0); return; }
    if (cuponDebounceTimer) clearTimeout(cuponDebounceTimer);
    const timer = setTimeout(() => { validarCupon(val.trim()); }, 800);
    setCuponDebounceTimer(timer);
  };

  const marcarCuponUsado = async () => {
    if (!cuponInfo) return;
    try {
      const cuponRef = doc(db, "cupones", cuponInfo.id);
      const updateData = {};
      if (user) {
        updateData.usadoPor = [...(cuponInfo.usadoPor || []), user.uid];
      }
      const emailUsado = (user?.email || guestEmail || "").trim().toLowerCase();
      if (emailUsado) {
        updateData.usadoPorEmails = [...(cuponInfo.usadoPorEmails || []), emailUsado];
      }
      if (Object.keys(updateData).length > 0) {
        await updateDoc(cuponRef, updateData);
      }
    } catch (e) {}
  };

  // Efectos de carga de perfil de usuario
  useEffect(() => {
    if (user?.uid) {
      getDoc(doc(db, "users", user.uid)).then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserProfile({
            ...data,
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            ordersCount: data.ordersCount || 0,
            referralCredits: data.referralCredits || 0,
          });
          if (typeof data.ordersCount === 'number') {
            setUserOrdersCount(data.ordersCount);
          }
        }
      });
      getDocs(collection(db, `users/${user.uid}/orders`)).then(ordersSnap => {
        if (ordersSnap.size > 0) {
          setUserOrdersCount(ordersSnap.size);
        }
      }).catch(() => {});
    }
  }, [user]);

  // Carga de carrito en tiempo real
  useEffect(() => {
    if (!user) {
      const fetchLocal = async () => {
        let lCart = [];
        try {
          const c = localStorage.getItem('guestCart');
          if (c) lCart = JSON.parse(c);
        } catch(e) {}
        setCart(lCart);
        if (lCart.length > 0) {
          const tCLP = lCart.reduce((s, i) => s + (Number(i.priceCLP) || 0), 0);
          trackBeginCheckout(lCart, tCLP, 'CLP', 'guest');
          markCartActive(null, lCart, tCLP);
        }
        const prods = {};
        for (const item of lCart) {
          if (item.isPromo) continue;
          const cleanBaseId = String(item.productId || item.id || '').split('__')[0];
          if (!cleanBaseId) continue;
          const prodSnap = await getDoc(doc(db, "products", cleanBaseId));
          if (prodSnap.exists()) {
            const data = { id: prodSnap.id, ...prodSnap.data() };
            prods[cleanBaseId] = data;
            if (item.id) prods[item.id] = data;
            if (item.productId) prods[item.productId] = data;
            if (item.cartLineId) prods[item.cartLineId] = data;
          }
        }
        setCartProducts(prods);
      };
      fetchLocal();
      const handleLocalUpdate = () => fetchLocal();
      window.addEventListener('localCartUpdated', handleLocalUpdate);
      return () => window.removeEventListener('localCartUpdated', handleLocalUpdate);
    }

    const cartRef = collection(db, `users/${user.uid}/cart`);
    const unsubscribe = onSnapshot(cartRef, async (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCart(items);
      if (items.length > 0) {
        const tCLP = items.reduce((s, i) => s + (Number(i.priceCLP) || 0), 0);
        markCartActive(user.uid, items, tCLP);
        trackBeginCheckout(items, tCLP, 'CLP', user.uid);
      }
      const prods = {};
      for (const item of items) {
        if (item.isPromo) continue;
        const cleanBaseId = String(item.productId || item.id || '').split('__')[0];
        if (!cleanBaseId) continue;
        const prodSnap = await getDoc(doc(db, "products", cleanBaseId));
        if (prodSnap.exists()) {
          const data = { id: prodSnap.id, ...prodSnap.data() };
          prods[cleanBaseId] = data;
          if (item.id) prods[item.id] = data;
          if (item.productId) prods[item.productId] = data;
          if (item.cartLineId) prods[item.cartLineId] = data;
        }
      }
      setCartProducts(prods);
    });
    return () => unsubscribe();
  }, [user]);

  const bancos = visibleBankAccounts(paymentSettings, userProfile).map((account) => ({
    id: account.id, nombre: account.name, logo: account.logo, color: account.color || '#a259ff', bg: `${account.color || '#a259ff'}22`,
    datos: `Titular: ${account.holder}\nRUT: ${account.rut}\nTipo de cuenta: ${account.type}\nN° Cuenta: ${account.number}\nEmail: ${account.email}`,
  }));
  // Monto exacto a enviar en USDT (1 USDT = 1 USD). Mismo valor total de la orden en USD.
  const cryptoUSDT = totalUSD;

  const finalizarCompra = async () => {
    if (procesandoPago) return;
    if (!aceptaTerminos) {
      showAlert("Debes aceptar los términos y condiciones para continuar.");
      return;
    }
    if (metodoPago === 'transferencia' && (!bancoSeleccionado || !comprobanteFile)) {
      showAlert("Selecciona la cuenta a la que transferirás y adjunta el comprobante de pago.");
      return;
    }
    if (metodoPago === 'crypto' && !transferenciaRealizada) {
      showAlert("Debes marcar que ya realizaste el pago.");
      return;
    }
    if (metodoPago === 'prex' && !comprobanteFile) {
      showAlert("Debes adjuntar el comprobante de pago Prex.");
      return;
    }
    if (!user && (!guestEmail || !guestFirstName || !guestLastName)) {
      showAlert("Debes ingresar tu correo, nombre y apellido para finalizar la compra como invitado.");
      return;
    }
    if (user?.uid) {
      const previousOrders = await getDocs(collection(db, "users", user.uid, "orders"));
      if (previousOrders.docs.some((entry) => {
        const order = entry.data();
        return order.transferenciaEstado === "pendiente" && (order.metodoPago === "transferencia" || order.metodoPago === "prex");
      })) {
        const continuePayment = window.confirm("Ya tienes un pago en revisión. ¿Estás seguro de que deseas continuar con otro pago?\n\nSi tienes dudas, contacta a Soporte PandaStore.");
        if (!continuePayment) return;
      }
    }

    setProcesandoPago(true);
    let comprobanteUrl = null;
    if ((metodoPago === 'transferencia' || metodoPago === 'prex') && comprobanteFile) {
      if (!user?.uid) {
        showAlert('Para proteger tu comprobante, inicia sesión antes de subirlo.');
        setProcesandoPago(false);
        return;
      }
      const fileError = validatePaymentProofFile(comprobanteFile);
      if (fileError) {
        showAlert(fileError);
        setProcesandoPago(false);
        return;
      }
      setComprobanteUploading(true);
      try {
        const safeName = comprobanteFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const sRef = storageRef(storage, `comprobantes/${user.uid}/${Date.now()}_${safeName}`);
        await uploadBytes(sRef, comprobanteFile);
        comprobanteUrl = await getDownloadURL(sRef);
      } catch (uploadErr) {
        setComprobanteUploading(false);
        setProcesandoPago(false);
        showAlert('Error al subir el comprobante: ' + (uploadErr.message || uploadErr));
        return;
      }
      setComprobanteUploading(false);
    }

    try {
      const nombreCliente = user ? ((userProfile.firstName || user?.displayName?.split(' ')[0] || '') +
        ' ' + (userProfile.lastName || user?.displayName?.split(' ').slice(1).join(' ') || '')) 
        : `${guestFirstName} ${guestLastName}`;
      const emailFinal = user?.email || guestEmail;
      
      const pedido = {
        productos: cart.map(item => {
          const prodInfo = cartProducts[item.id] || {};
          const resellerPricing = hasResellerBenefits(userProfile)
            ? getResellerCartPrice(item, prodInfo)
            : null;
          const orderUnitPrice = Number(resellerPricing?.precioFinal) || Number(item.priceCLP || item.precio || 0);
          const isSaga = Boolean(item.isSaga || prodInfo.isSaga);
          const isPromo = Boolean(item.isPromo || prodInfo.isPromo);
          const isSteam = Boolean(item.isSteam || prodInfo.isSteam || isSaga || (item.plataforma && String(item.plataforma).toLowerCase().includes('steam')) || (prodInfo.plataforma && String(prodInfo.plataforma).toLowerCase().includes('steam')) || item.categoryId === 'steam' || prodInfo.categoryId === 'steam');
          const dlcNames = Array.isArray(item.selectedDlcs) && item.selectedDlcs.length > 0
            ? item.selectedDlcs.map(d => d.name).join(', ')
            : '';
          const promoDesc = item.promoGames && item.promoGames.length > 0 ? item.promoGames.map(g => g.name).join(' + ') : 'Pack promocional';
          const fullDesc = dlcNames ? `${promoDesc} • DLCs: ${dlcNames}` : promoDesc;
          return {
            id: item.id || item.productId,
            name: item.isPromo ? item.name : (prodInfo.name || item.name),
            cantidad: item.cantidad || item.quantity || 1,
            precio: orderUnitPrice,
            description: item.isPromo ? fullDesc : (item.description || item.name),
            category_id: item.category_id || item.categoryId || prodInfo.categoryId || (isSaga || isSteam ? "steam" : "others"),
            categoryId: item.categoryId || item.category_id || prodInfo.categoryId || (isSaga || isSteam ? "steam" : "others"),
            categoryName: item.categoryName || prodInfo.categoryName || (isSaga || isSteam ? "Steam" : null),
            plataforma: item.plataforma || prodInfo.plataforma || (isSaga || isSteam ? "steam" : null),
            isSaga,
            isPromo,
            isSteam,
            appId: item.appId || item.app_id || prodInfo.appId || prodInfo.app_id || null,
            app_id: item.app_id || item.appId || prodInfo.app_id || prodInfo.appId || null,
            games: item.games || prodInfo.games || null,
            promoGames: item.promoGames || prodInfo.promoGames || null,
            vipExtras: item.vipExtras || prodInfo.vipExtras || null,
            selectedVipExtras: item.selectedVipExtras || null,
            selectedDlcs: item.selectedDlcs || prodInfo.selectedDlcs || null,
            dlcsCount: item.dlcsCount || (item.selectedDlcs ? item.selectedDlcs.length : 0),
            imageUrl: item.imageUrl || item.image || prodInfo.imageUrl || null,
            variante: item.variante || getCartVariantLabel(item) || null,
            meses: item.meses || null
          };
        }),
        subtotal,
        subtotalCLP: totalCLP,
        descuentoPorcentaje: esRevendedor ? 0 : descuento,
        descuentoCuponMonto: selectedMoneda === 'USD' ? descuentoCuponMonto : descuentoCuponMontoCLP,
        iva: selectedMoneda === 'USD' ? iva : ivaCLP,
        tasaIva: IVA_RATE,
        total: totalFinal,
        moneda: selectedMoneda,
        totalCLP: totalFinalCLP,
        totalLocal: totalFinal,
        monedaLocal: selectedMoneda,
        pais: infoPais?.codigo || 'CL',
        tasaUsada: tasas?.[selectedMoneda.toLowerCase()] ?? 1,
        metodoPago,
        email: emailFinal,
        nombre: nombreCliente.trim() || emailFinal,
        fecha: new Date().toISOString(),
        uid: user?.uid || 'guest',
        isGuest: !user,
        phone: user ? '' : guestPhone,
        shipping: {},
        cotizacion: {
          baseCLP: totalFinalCLP,
          valorDolar: Number(valorDolar || 900),
          moneda: selectedMoneda,
          tasaUsada: tasas?.[selectedMoneda.toLowerCase()] ?? 1,
          totalLocal: totalFinal,
          totalUSD: totalUSD,
          cryptoUSDT: totalUSD,
          metodoPago: metodoPago,
          createdAt: new Date().toISOString()
        }
      };

      if (metodoPago === 'transferencia' || metodoPago === 'crypto' || metodoPago === 'prex') {
        pedido.transferenciaEstado = 'pendiente';
      }
      if (metodoPago === 'billetera') {
        const currentBalance = Number(userProfile.wallet_balance || 0);
        if (currentBalance < totalFinalCLP) {
          showAlert(`Saldo insuficiente en tu Billetera Virtual. Tu saldo es $${currentBalance.toLocaleString('es-CL')} y el pedido es de $${totalFinalCLP.toLocaleString('es-CL')}. Puedes recargar en tu Perfil.`);
          setProcesandoPago(false);
          return;
        }
        pedido.estado = 'aprobado';
        pedido.transferenciaEstado = 'aprobado';
      }
      if (comprobanteUrl) {
        pedido.comprobanteUrl = comprobanteUrl;
        pedido.banco = bancoSeleccionado;
      }

      const orderRef = await addDoc(collection(db, "orders"), pedido);
      if (user) {
        await setDoc(doc(db, `users/${user.uid}/orders`, orderRef.id), {
          ...pedido,
          globalOrderId: orderRef.id
        });

        if (metodoPago === 'billetera') {
          await updateDoc(doc(db, "users", user.uid), {
            wallet_balance: increment(-totalFinalCLP)
          });
          await addDoc(collection(db, "wallet_transactions"), {
            userId: user.uid,
            userEmail: user.email,
            tipo: "compra_carrito",
            monto: -totalFinalCLP,
            descripcion: `Pago de pedido #${orderRef.id} con Billetera Virtual B2B`,
            orderId: orderRef.id,
            createdAt: new Date().toISOString()
          });
        }
        
        try {
          await updateDoc(doc(db, "users", user.uid), {
            ordersCount: (userProfile.ordersCount || 0) + 1
          });
        } catch(err) {}

        trackPurchase(orderRef.id, cart, pedido.totalCLP || pedido.total || 0, pedido.moneda || 'CLP', user.uid);
        markCartConverted(user.uid);
        await registerReferralPurchase(user.uid, user.email);
        if (usarReferralCredits && descuentoReferralCLP > 0) {
          await deductReferralCredits(user.uid, descuentoReferralCLP);
        }
        const cartRef = collection(db, `users/${user.uid}/cart`);
        const cartDocs = await getDocs(cartRef);
        for (const docu of cartDocs.docs) { await deleteDoc(doc(db, `users/${user.uid}/cart`, docu.id)); }
      } else {
        trackPurchase(orderRef.id, cart, pedido.totalCLP || pedido.total || 0, pedido.moneda || 'CLP', 'guest');
        localStorage.removeItem('guestCart');
        await registerReferralPurchase(null, guestEmail);
        window.dispatchEvent(new Event('localCartUpdated'));
      }

      if (!esRevendedor && cuponInfo && descuento > 0) {
        await marcarCuponUsado();
      }
      
      try {
        await fetch('https://us-central1-pandastoreupdate.cloudfunctions.net/sendConfirmationEmail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderRef.id,
            globalOrderId: orderRef.id,
            docId: orderRef.id,
            clienteEmail: emailFinal
          })
        });
      } catch (err) {}

      const navOrderState = {
        orderId: orderRef.id,
        pedidoId: orderRef.id,
        productos: cart.map(item => ({
          nombre: item.nombre || item.title || item.name || 'Juego',
          plataforma: item.plataforma || item.platform || 'PC / Steam',
          precio: item.precio || item.price || 0,
          cantidad: item.cantidad || item.quantity || 1,
          imagen: item.imagen || item.imageUrl || '',
          variante: item.variante || getCartVariantLabel(item) || null,
          meses: item.meses || null
        })),
        producto: cart.map(item => item.nombre || item.title || item.name).filter(Boolean).join(', '),
        plataforma: cart.some(i => (i.plataforma || '').toLowerCase().includes('nintendo'))
          ? 'Nintendo Switch'
          : (cart.some(i => (i.plataforma || '').toLowerCase().includes('playstation')) ? 'PlayStation' : (cart[0]?.plataforma || 'PC / Steam')),
        total: totalFinalCLP,
        moneda: 'CLP',
        metodoPago,
        nombre: nombreCliente.trim() || emailFinal,
        email: emailFinal
      };

      if (metodoPago === 'transferencia' || metodoPago === 'crypto' || metodoPago === 'prex') {
        navigate('/confirmacion-pendiente', { state: navOrderState });
      } else {
        navigate('/confirmacion-exitosa', { state: navOrderState });
      }
    } catch (e) {
      setProcesandoPago(false);
      showAlert("Ocurrió un error al guardar tu pedido.");
    }
  };

  const totalItemsCount = cart.reduce((s, i) => s + Number(i.cantidad || i.quantity || 1), 0);

  return (
    <div className="panda-checkout-page">
      {/* Alert modal */}
      {customAlert && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(10,5,30,0.85)', backdropFilter: 'blur(6px)',
          zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(26,16,53,0.98) 0%, rgba(45,25,80,0.98) 100%)',
            border: '1.5px solid rgba(162,89,255,0.4)', borderRadius: 16, padding: '24px 28px',
            maxWidth: 380, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
          }}>
            <p style={{ color: '#e8e0f5', fontSize: '1rem', marginBottom: 20 }}>{customAlert}</p>
            <button
              onClick={() => setCustomAlert(null)}
              className="panda-card coupon-btn"
              style={{ maxWidth: 120, margin: '0 auto' }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal procesando pago */}
      {procesandoPago && (
        <Loader
          text="Procesando..."
          subtext={comprobanteUploading ? "Subiendo comprobante..." : "PandaStore • Guardando tu pedido"}
          fullScreen={true}
        />
      )}

      {/* Header */}
      <div className="panda-checkout-header">
        <h1>Carrito de Compras</h1>
        <p>Revisa tus juegos, aplica cupones y finaliza tu pedido de forma segura</p>
      </div>

      <div className="panda-checkout-wrapper">
        {cart.length === 0 ? (
          <div className="panda-card" style={{ padding: 40, textAlign: "center", borderRadius: 16 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🛒</div>
            <h3 style={{ color: "#c4b5fd", margin: "0 0 8px" }}>Tu carrito está vacío</h3>
            <p style={{ color: "#a08ab8", fontSize: "0.92rem", marginBottom: 20 }}>
              Explora nuestro catálogo para encontrar las mejores ofertas y juegos digitales.
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="panda-card coupon-btn"
              style={{ maxWidth: 220, margin: "0 auto" }}
            >
              Explorar Juegos
            </button>
          </div>
        ) : (
          <div className="panda-master-container">

            {/* TARJETA 1: TU CARRITO */}
            <div className="panda-card cart">
              <div className="title">
                <span>Tu carrito</span>
                <span className="title-badge">{totalItemsCount} {totalItemsCount === 1 ? 'producto' : 'productos'}</span>
              </div>
              <div className="products">
                {cart.map((item) => {
                  const qty = Number(item.cantidad || item.quantity || 1);
                  const cleanBaseId = String(item.productId || item.id || '').split('__')[0];
                  const fullProd = cartProducts[cleanBaseId] || cartProducts[item.productId] || cartProducts[item.cartLineId] || cartProducts[item.id] || item;
                  const variant = getCartVariantLabel(item).toLowerCase();
                  let variantPrice = 0;
                  if (variant === "primaria") {
                    variantPrice = parseNumberCLP(fullProd?.pricePrimariaCLP || item?.pricePrimariaCLP || item?.priceCLP);
                  } else if (variant === "secundaria") {
                    variantPrice = parseNumberCLP(fullProd?.priceSecundariaCLP || item?.priceSecundariaCLP || item?.priceCLP);
                  }
                  const fromItem = variantPrice || parseNumberCLP(item.priceCLP || 0);
                  let precioCLPUnitario = fromItem || (fullProd ? getMinPriceByMoneda(fullProd, 'CLP') || 0 : 0);
                  let esRevendedorItem = false;
                  if (hasResellerBenefits(userProfile)) {
                    const pricing = getResellerCartPrice(item, fullProd);
                    precioCLPUnitario = Number(pricing?.precioFinal || fromItem || 0);
                    esRevendedorItem = Boolean(pricing?.esRevendedor);
                  }
                  const precioCLPItem = precioCLPUnitario * qty;
                  const precioDisplay = precioCLPItem ? formatMontoCheckout(precioCLPItem, item.price) : "";
                  const catalogProduct = cartProducts[cleanBaseId] || cartProducts[item.productId] || cartProducts[item.id];
                  const prodName = item.isPromo ? item.name : (catalogProduct?.name || item.name);
                  const imgUrl = item.imageUrl || catalogProduct?.imageUrl;

                  let detalle = "";
                  if (esRevendedorItem) detalle = "💎 Precio Revendedor";
                  const variantLabel = getCartVariantLabel(item);
                  const itemConsole = item.consoleName || item.plataforma || catalogProduct?.plataforma || (variantLabel ? "PlayStation" : "");
                  if (itemConsole && !variantLabel) detalle = (detalle ? `${detalle} • ` : "") + itemConsole;
                  if (variantLabel) detalle = (detalle ? `${detalle} • ` : "") + `${itemConsole ? itemConsole + ' ' : ''}Cuenta ${variantLabel}`;
                  if (item.meses) detalle = (detalle ? `${detalle} • ` : "") + `Meses: ${item.meses}`;
                  if (item.dlcTitle) detalle = (detalle ? `${detalle} • ` : "") + item.dlcTitle;
                  if (item.isPromo && item.promoGames && item.promoGames.length > 0) detalle = item.promoGames.map(g => g.name).join(' + ');
                  if (item.selectedDlcs && item.selectedDlcs.length > 0) {
                    const dlcTag = `🎁 +${item.selectedDlcs.length} DLCs: ${item.selectedDlcs.map(d => d.name).join(', ')}`;
                    detalle = detalle ? `${detalle} • ${dlcTag}` : dlcTag;
                  }

                  return (
                    <div key={item.id} className="product">
                      <div className="product-thumb">
                        {imgUrl ? (
                          <img src={imgUrl} alt={prodName} />
                        ) : (
                          <svg fill="none" viewBox="0 0 24 24" height={24} width={24} stroke="#a259ff" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="product-info">
                        <span>{prodName}</span>
                        {detalle && <p>{detalle}</p>}
                      </div>
                      <div className="quantity">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item, -1)}
                          title="Disminuir o quitar"
                        >
                          <svg fill="none" viewBox="0 0 24 24" height={13} width={13} stroke="currentColor">
                            <path strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" d="M20 12L4 12" />
                          </svg>
                        </button>
                        <label>{qty}</label>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item, 1)}
                          title="Aumentar cantidad"
                        >
                          <svg fill="none" viewBox="0 0 24 24" height={13} width={13} stroke="currentColor">
                            <path strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" d="M12 4V20M20 12H4" />
                          </svg>
                        </button>
                      </div>
                      <div className="product-price">
                        {precioDisplay}
                      </div>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => handleRemoveItem(item)}
                        title="Eliminar del carrito"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* DLCs oficiales upsell (solo si hay juegos base en el carrito) */}
              {cart.some(item => isSteamCartProduct(item, cartProducts[item.productId] || cartProducts[item.id])) && (
                <div style={{ padding: '0 16px 4px' }}>
                  <DlcUpsellBanner
                    cartItems={cart
                      .filter(item => isSteamCartProduct(item, cartProducts[item.productId] || cartProducts[item.id]))
                      .map(item => {
                        const catalogProduct = cartProducts[item.productId] || cartProducts[item.id];
                        return {
                          ...item,
                          app_id: item.app_id || item.appId || catalogProduct?.app_id || (String(catalogProduct?.id || '').startsWith("ryuu_") ? catalogProduct.id.replace("ryuu_", "") : null),
                          name: item.name || catalogProduct?.name
                        };
                      })}
                    onAddDlc={handleAddDlcToCart}
                    moneda={selectedMoneda}
                    formatearPrecio={formatearPrecio}
                  />
                </div>
              )}

              {/* Upsell recomendaciones en carrito */}
              <div style={{ padding: '0 16px 12px' }}>
                <UpsellRecs
                  currentIds={cart.map(p => p.id)}
                  categoryId={cart[0]?.categoryId}
                  onAdded={(prod) => {
                    setCart(prev => prev.some(p => p.id === prod.id) ? prev : [...prev, prod]);
                  }}
                />
              </div>
            </div>

            {/* TARJETA 2: APLICAR CUPONES (solo clientes finales) */}
            {!esRevendedor && <div className="panda-card coupons">
              <div className="title">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🏷️</span>
                  <span>Cupón de Descuento</span>
                </div>
                <span className="title-badge" style={{ color: '#c4b5fd', background: 'rgba(196, 181, 253, 0.1)', fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                  OPCIONAL
                </span>
              </div>

              <div className="coupon-card-body">
                {descuento > 0 && cuponInfo ? (
                  <div className="coupon-active-badge">
                    <div className="coupon-active-left">
                      <div className="coupon-tag-icon">🏷️</div>
                      <div>
                        <div className="coupon-active-code">
                          {cuponInfo.codigo || cupon}
                          <span className="coupon-active-tag">-{descuento}% OFF</span>
                        </div>
                        <div className="coupon-active-desc">
                          {cuponInfo.categoria && cuponInfo.categoria !== 'todas'
                            ? `Aplicado a categoría ${cuponInfo.categoria}`
                            : 'Descuento aplicado a tu pedido'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="coupon-remove-btn"
                      onClick={() => { setDescuento(0); setCuponInfo(null); setCupon(""); setCuponError(""); }}
                      title="Quitar cupón"
                    >
                      ✕ Quitar
                    </button>
                  </div>
                ) : (
                  <>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (cupon.trim()) validarCupon(cupon.trim());
                      }}
                      className="coupon-form-group"
                    >
                      <div className="coupon-input-wrapper">
                        <span className="coupon-input-icon">🎟️</span>
                        <input
                          type="text"
                          placeholder="Ingresa tu cupón (ej: PANDA10)"
                          className="coupon-modern-input"
                          value={cupon}
                          onChange={handleCuponChange}
                          autoCapitalize="characters"
                          spellCheck="false"
                        />
                        {cupon && !cuponInfo && !cuponError && (
                          <span style={{ fontSize: 13, opacity: 0.7 }}>⏳</span>
                        )}
                        {cupon && (
                          <button
                            type="button"
                            className="coupon-clear-input"
                            onClick={() => { setCupon(""); setCuponError(""); setDescuento(0); setCuponInfo(null); }}
                            title="Limpiar"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <button
                        type="submit"
                        className="coupon-submit-btn"
                        disabled={!cupon.trim()}
                        onClick={() => {
                          if (cupon.trim()) validarCupon(cupon.trim());
                        }}
                      >
                        Aplicar
                      </button>
                    </form>

                    {cuponError && (
                      <div className="coupon-error-banner">
                        <span>⚠️</span>
                        <span>{cuponError}</span>
                      </div>
                    )}
                  </>
                )}

                {/* Saldo de Referidos disponible para usar */}
                {user && (userProfile.referralCredits || 0) > 0 && (
                  <div style={{ marginTop: 6, padding: '12px 14px', background: 'rgba(123, 47, 242, 0.12)', border: '1px solid rgba(196, 181, 253, 0.25)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>🤝</span>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                          Saldo de Referidos PandaStore
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>
                          Tienes ${(userProfile.referralCredits || 0).toLocaleString('es-CL')} CLP acumulados
                        </div>
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.82rem', color: '#c4b5fd', fontWeight: 700, userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={usarReferralCredits}
                        onChange={(e) => setUsarReferralCredits(e.target.checked)}
                        style={{ accentColor: '#7b2ff7', width: 16, height: 16, cursor: 'pointer' }}
                      />
                      Usar saldo
                    </label>
                  </div>
                )}
              </div>
            </div>}


            {/* TARJETA 3: RESUMEN Y CHECKOUT */}
            <div className="panda-card checkout">
              <div className="title">
                <span>Checkout y Pago</span>
                <span className="title-badge" style={{ color: '#38bdf8', background: 'rgba(56,189,248,0.15)' }}>
                  {esRevendedor ? 'Precio B2B · sin IVA' : 'IVA adicional (19%)'}
                </span>
              </div>

              {/* Desglose con impuestos */}
              <div className="details">
                <span>Subtotal:</span>
                <span>{formatMontoCheckout(totalCLP, subtotal)}</span>

                {descuento > 0 && (
                  <>
                    <span className="discount-label">Descuento cupón (-{descuento}%):</span>
                    <span className="discount-value">
                      -{formatMontoCheckout(descuentoCuponMontoCLP, descuentoCuponMonto)}
                    </span>
                  </>
                )}

                {gamerLevel.discountPercent > 0 && (
                  <>
                    <span className="discount-label" style={{ color: gamerLevel.color, fontWeight: 700 }}>
                      {gamerLevel.badge} Nivel {gamerLevel.name} (-{gamerLevel.discountPercent}%):
                    </span>
                    <span className="discount-value" style={{ color: gamerLevel.color, fontWeight: 700 }}>
                      -{formatMontoCheckout(descuentoNivelMontoCLP, descuentoNivelMonto)}
                    </span>
                  </>
                )}

                {usarReferralCredits && descuentoReferralCLP > 0 && (
                  <>
                    <span className="discount-label" style={{ color: '#4ade80' }}>Crédito Referidos:</span>
                    <span className="discount-value" style={{ color: '#4ade80' }}>
                      -{formatMontoCheckout(descuentoReferralCLP, descuentoReferralMonto)}
                    </span>
                  </>
                )}


                <span className="iva-label">
                  {esRevendedor ? 'IVA B2B:' : 'IVA (19%):'}
                </span>
                <span className="iva-value">
                  {formatMontoCheckout(ivaCLP, iva)}
                </span>

                <div className="details-divider" />

                <span style={{ fontWeight: 800, color: '#ffffff', fontSize: 13.5 }}>Total final a pagar:</span>
                <span style={{ fontWeight: 800, color: '#ffffff', fontSize: 14.5 }}>
                  {formatMontoCheckout(totalFinalCLP, totalFinal)}
                </span>
              </div>

              {/* Datos de contacto para invitados */}
              {!user && (
                <div className="panda-checkout-section">
                  <div className="panda-checkout-section-title">
                    <span>👤</span> Tus datos para recibir los juegos
                  </div>
                  <div className="panda-guest-grid">
                    <input
                      type="text"
                      placeholder="Nombre"
                      className="panda-guest-input"
                      value={guestFirstName}
                      onChange={e => setGuestFirstName(e.target.value)}
                      onBlur={e => handleSyncGuestInfo(undefined, e.target.value, undefined, undefined)}
                    />
                    <input
                      type="text"
                      placeholder="Apellido"
                      className="panda-guest-input"
                      value={guestLastName}
                      onChange={e => setGuestLastName(e.target.value)}
                      onBlur={e => handleSyncGuestInfo(undefined, undefined, e.target.value, undefined)}
                    />
                  </div>
                  <div className="panda-guest-grid full">
                    <input
                      type="email"
                      placeholder="Correo electrónico (donde recibirás tus pedidos)"
                      className="panda-guest-input"
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                      onBlur={e => handleSyncGuestInfo(e.target.value, undefined, undefined, undefined)}
                    />
                  </div>
                  <div className="panda-guest-grid full">
                    <input
                      type="tel"
                      placeholder="Teléfono (Opcional)"
                      className="panda-guest-input"
                      value={guestPhone}
                      onChange={e => setGuestPhone(e.target.value)}
                      onBlur={e => handleSyncGuestInfo(undefined, undefined, undefined, e.target.value)}
                    />
                  </div>
                  <div style={{ fontSize: 11.5, color: '#a08ab8', textAlign: 'center', marginTop: 4 }}>
                    ¿Ya tienes cuenta? <a href="/iniciar-sesion" style={{ color: '#c4b5fd', textDecoration: 'underline' }}>Inicia sesión aquí</a>
                  </div>
                </div>
              )}

              {/* Selector de métodos de pago */}
              <div className="panda-checkout-section">
                <div className="panda-checkout-section-title">
                  <span>💳</span> Selecciona método de pago
                </div>
                {(() => {
                  const isRevendedor = hasB2BAccess(userProfile);
                  const METODOS_INFO = {
                    billetera:     { icon: '💼', label: `Billetera Virtual (${formatMontoCheckout(userProfile.wallet_balance || 0)})`, color: '#34d399', bg: 'rgba(52,211,153,0.15)', desc: (userProfile.wallet_balance || 0) >= totalFinalCLP ? 'Paga con tu saldo disponible' : 'Saldo insuficiente · recarga tu billetera' },
                    transferencia: { svgBank: true, label: 'Transferencia Bancaria', color: '#4fc3f7', bg: 'rgba(79,195,247,0.10)', desc: 'Cuentas oficiales disponibles · Sin comisión' },
                    mercadopago:   { logo: '/logos/tarjetas.png', label: 'Tarjeta débito / crédito (Chile)', color: '#009ee3', bg: 'rgba(0,158,227,0.12)', desc: 'Tarjetas de débito y crédito · hasta 12 cuotas' },
                    crypto:        { logo: '/logos/binance.png', label: 'Crypto (USDT)', color: '#26a17b', bg: 'rgba(38,161,123,0.12)', desc: 'USDT BEP20 (Binance Smart Chain)' },
                    prex:          { logo: '/logos/prex.jpg', label: 'Prex', color: '#ce93d8', bg: 'rgba(206,147,216,0.12)', desc: 'Transferencia directa desde App Prex' },
                    paypal:        { logo: '/logos/paypal.png', label: 'PayPal', color: '#003087', bg: 'rgba(0,48,135,0.18)', desc: 'Saldo PayPal o tarjetas internacionales (+USD $4)' },
                  };
                  const countryAllowed = (infoPais?.metodosPago || ['PayPal', 'Crypto'])
                    .map((method) => method.toLowerCase().replace(/\s/g, ''));
                  const allMetodos = [];
                  if (isRevendedor) {
                    allMetodos.push('billetera');
                  }
                  countryAllowed.forEach((m) => {
                    if (isRevendedor && (m === 'prex' || m === 'paypal')) return;
                    if (m === 'transferencia' || m === 'transfer') {
                      if (infoPais?.codigo === 'CL' && paymentSettings.transfer?.enabled !== false && visibleForUser(paymentSettings.transfer, userProfile)) {
                        allMetodos.push('transferencia');
                      }
                    } else if (m === 'mercadopago') {
                      if (infoPais?.codigo === 'CL' && paymentSettings.mercadoPago?.enabled !== false) {
                        allMetodos.push('mercadopago');
                      }
                    } else if (m === 'prex') {
                      allMetodos.push('prex');
                    } else if (m === 'crypto') {
                      if (paymentSettings.crypto?.enabled !== false && paymentSettings.crypto?.address && visibleForUser(paymentSettings.crypto, userProfile)) {
                        allMetodos.push('crypto');
                      }
                    } else if (m === 'paypal') {
                      allMetodos.push('paypal');
                    }
                  });
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                      {allMetodos.map((m, idx) => {
                        const key = m.toLowerCase().replace(/\s/g, '');
                        const info = METODOS_INFO[key] || { icon: '💰', label: m, color: '#a259ff', bg: 'rgba(162,89,255,0.10)', desc: '' };
                        const isSelected = metodoPago === key;
                        const isRecomendado = idx === 0;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setMetodoPago(key)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 12,
                              background: isSelected ? info.bg : 'rgba(255,255,255,0.03)',
                              border: `1.5px solid ${isSelected ? info.color : 'rgba(162,89,255,0.2)'}`,
                              borderRadius: 10, padding: '10px 14px',
                              cursor: 'pointer', transition: 'all 0.18s',
                              boxShadow: isSelected ? `0 0 14px ${info.color}33` : 'none',
                              width: '100%', textAlign: 'left',
                              position: 'relative',
                              boxSizing: 'border-box'
                            }}
                          >
                            {isRecomendado && (
                              <span style={{
                                position: 'absolute', top: -8, right: 12,
                                background: 'linear-gradient(90deg,#f7931a,#ffcc02)',
                                color: '#1a1035', fontSize: 10, fontWeight: 800,
                                borderRadius: 20, padding: '1px 8px',
                                boxShadow: '0 2px 8px #f7931a44',
                                letterSpacing: 0.3,
                              }}>⭐ Recomendado</span>
                            )}
                            <span style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {info.logo ? (
                                <img src={info.logo} alt={info.label} style={{ width: 30, height: 30, objectFit: 'contain', borderRadius: 6 }} />
                              ) : info.svgBank ? (
                                <svg viewBox="0 0 36 36" width="30" height="30" fill="none">
                                  <rect width="36" height="36" rx="7" fill="rgba(79,195,247,0.18)"/>
                                  <polygon points="18,7 32,15 4,15" fill="#4fc3f7"/>
                                  <rect x="7" y="16" width="4" height="9" rx="1" fill="#4fc3f7"/>
                                  <rect x="14" y="16" width="4" height="9" rx="1" fill="#4fc3f7"/>
                                  <rect x="21" y="16" width="4" height="9" rx="1" fill="#4fc3f7"/>
                                  <rect x="28" y="16" width="2" height="9" rx="1" fill="#4fc3f7"/>
                                  <rect x="4" y="27" width="28" height="3" rx="1" fill="#4fc3f7"/>
                                </svg>
                              ) : (
                                <span style={{ fontSize: 22 }}>💰</span>
                              )}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, color: isSelected ? '#fff' : '#e8e0f5', fontSize: 13.5 }}>{info.label}</div>
                              {info.desc && <div style={{ fontSize: 11, color: isSelected ? '#d1c4e9' : '#a08ab8', marginTop: 1 }}>{info.desc}</div>}
                            </div>
                            <span style={{
                              width: 18, height: 18, borderRadius: '50%',
                              border: `2px solid ${isSelected ? info.color : 'rgba(162,89,255,0.3)'}`,
                              background: isSelected ? info.color : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              {isSelected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'block' }} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {esRevendedor && metodoPago === 'billetera' && Number(userProfile.wallet_balance || 0) < totalFinalCLP && (
                <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 12, border: "1.5px solid rgba(239, 68, 68, 0.4)", background: "rgba(239, 68, 68, 0.12)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fca5a5", fontSize: 13, fontWeight: 700 }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <span>Saldo insuficiente: tienes ${Number(userProfile.wallet_balance || 0).toLocaleString("es-CL")} CLP y el pedido es de ${totalFinalCLP.toLocaleString("es-CL")} CLP.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/perfil?tab=billetera&recharge=1")}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", fontWeight: 800, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 2px 10px rgba(16, 185, 129, 0.3)" }}
                  >
                    <span>💼</span>
                    <span>Cargar más saldo a mi Billetera ahora</span>
                  </button>
                </div>
              )}

              {/* Subsección contextual Banco */}
              {selectedMoneda === 'CLP' && metodoPago === 'transferencia' && (
                <div className="panda-checkout-section" style={{ background: 'rgba(79,195,247,0.04)' }}>
                  <div style={{ fontWeight: 700, color: '#4fc3f7', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
                    Elige a qué cuenta transferir
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                    {bancos.map(banco => (
                      <button
                        key={banco.id}
                        type="button"
                        onClick={() => setBancoSeleccionado(banco.id)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                      >
                        <div style={{
                          width: 58, height: 58, borderRadius: '50%',
                          background: banco.bg,
                          border: `2.5px solid ${bancoSeleccionado === banco.id ? banco.color : 'rgba(162,89,255,0.25)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden',
                          boxShadow: bancoSeleccionado === banco.id ? `0 0 16px ${banco.color}55` : 'none',
                          transition: 'all 0.2s',
                        }}>
                          <img src={banco.logo} alt={banco.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: bancoSeleccionado === banco.id ? '#e8e0f5' : '#a08ab8', textAlign: 'center', maxWidth: 75 }}>
                          {banco.nombre}
                        </span>
                      </button>
                    ))}
                  </div>

                  {bancoSeleccionado && (() => {
                    const banco = bancos.find(b => b.id === bancoSeleccionado);
                    return (
                      <div style={{ background: banco.bg, borderRadius: 10, padding: '12px 14px', border: `1px solid ${banco.color}55`, marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, color: banco.color, marginBottom: 6, fontSize: 13 }}>Datos de {banco.nombre}</div>
                        <pre style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '8px 10px', fontSize: '0.82rem', color: '#e8e0f5', fontWeight: 600, margin: '0 0 8px', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{banco.datos}</pre>
                        <button type="button" onClick={() => navigator.clipboard.writeText(banco.datos)} style={{ width: '100%', padding: '8px', borderRadius: 8, border: `1px solid ${banco.color}`, background: 'rgba(0,0,0,.18)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Copiar datos bancarios</button>
                        <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px solid ${banco.color}44`, display: 'flex', justifyContent: 'space-between', gap: 8, color: '#dff', fontWeight: 800 }}><span>Monto a transferir</span><span>{formatMontoCheckout(totalFinalCLP, totalFinal)}</span></div>
                      </div>
                    );
                  })()}

                  {bancoSeleccionado && (
                    <div style={{ width: '100%' }}>
                      <label style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        background: 'rgba(162,89,255,0.07)',
                        border: `1.5px dashed ${comprobanteFile ? '#a259ff' : 'rgba(162,89,255,0.35)'}`,
                        borderRadius: 10, padding: '10px 14px', cursor: 'pointer', transition: 'all 0.2s',
                      }}>
                        <span style={{ fontSize: 22 }}>{comprobanteFile ? '✅' : '📎'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#e8e0f5', fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {comprobanteFile ? comprobanteFile.name : 'Adjuntar comprobante de pago'}
                          </div>
                          <div style={{ fontSize: 11, color: '#a08ab8' }}>
                            {comprobanteFile ? '✓ Listo para procesar' : 'JPG, PNG o PDF · Máx 10MB'}
                          </div>
                        </div>
                        <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                          onChange={e => setComprobanteFile(e.target.files[0] || null)} />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Subsección Prex */}
              {metodoPago === 'prex' && (
                <div className="panda-checkout-section" style={{ background: 'rgba(206,147,216,0.04)' }}>
                  <div style={{ fontWeight: 700, color: '#ce93d8', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
                    Datos de Cuenta Prex
                  </div>
                  <pre style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '10px', fontSize: '0.82rem', color: '#e8e0f5', fontWeight: 600, margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>
                    {`Cuenta Prex: 14276042\nNombre: Jose Muñoz\nCorreo: joseroberto999999@gmail.com\nMonto total (IVA incl.): ${formatMontoCheckout(totalFinalCLP, totalFinal)}`}
                  </pre>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'rgba(162,89,255,0.07)',
                    border: `1.5px dashed ${comprobanteFile ? '#a259ff' : 'rgba(162,89,255,0.35)'}`,
                    borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                  }}>
                    <span style={{ fontSize: 22 }}>{comprobanteFile ? '✅' : '📎'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#e8e0f5', fontSize: 12.5 }}>
                        {comprobanteFile ? comprobanteFile.name : 'Subir comprobante Prex'}
                      </div>
                    </div>
                    <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                      onChange={e => setComprobanteFile(e.target.files[0] || null)} />
                  </label>
                </div>
              )}

              {/* Subsección Crypto */}
              {metodoPago === 'crypto' && (
                <div className="panda-checkout-section" style={{ background: 'rgba(38,161,123,0.06)' }}>
                  <div style={{ fontWeight: 800, color: '#a7f3d0', fontSize: 15, marginBottom: 10 }}>Criptomoneda</div>
                  <div style={{ display: 'grid', gap: 7, background: 'rgba(4,30,24,.72)', border: '1px solid rgba(38,161,123,.48)', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 12.5 }}><div><span style={{ color: '#86efac' }}>Moneda: </span><b>{paymentSettings.crypto.name}</b></div><div><span style={{ color: '#86efac' }}>Red: </span><b>{paymentSettings.crypto.network}</b></div><div style={{ wordBreak: 'break-all' }}><span style={{ color: '#86efac' }}>Dirección: </span><code>{paymentSettings.crypto.address}</code></div><div style={{ fontSize: 15, color: '#5eead4', fontWeight: 900 }}>Monto a enviar: {cryptoUSDT.toFixed(2)} USDT</div></div>
                  <button type="button" onClick={() => navigator.clipboard.writeText(paymentSettings.crypto.address)} style={{ width: '100%', marginBottom: 12, padding: '9px', borderRadius: 8, border: '1px solid #26a17b', background: 'rgba(38,161,123,.12)', color: '#a7f3d0', fontWeight: 800, cursor: 'pointer' }}>Copiar dirección {paymentSettings.crypto.name}</button>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e8e0f5', fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={transferenciaRealizada}
                      onChange={e => setTransferenciaRealizada(e.target.checked)}
                      style={{ accentColor: '#26a17b', width: 16, height: 16 }}
                    />
                    Ya he realizado la transferencia USDT
                  </label>
                </div>
              )}

              {/* Subsección PayPal */}
              {metodoPago === 'paypal' && (
                <div className="panda-checkout-section" style={{ background: 'rgba(0,48,135,0.1)' }}>
                  <div style={{ color: '#ffd180', fontSize: 12.5, marginBottom: 10, fontWeight: 600 }}>
                    💱 Se cobrará en USD: <strong>USD {totalUSDPayPal?.toFixed(2)}</strong> (incluye IVA chileno y comisión de PayPal)
                  </div>
                  <PayPalButtonWrapper
                    aceptaTerminos={aceptaTerminos}
                    cart={cart}
                    cartProducts={cartProducts}
                    user={user}
                    userProfile={userProfile}
                    total={totalUSDPayPal ?? totalFinal}
                    selectedMoneda="USD"
                  />
                </div>
              )}

              {/* Términos y condiciones */}
              <div style={{ padding: '12px 18px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="terminos-carrito"
                  checked={aceptaTerminos}
                  onChange={e => setAceptaTerminos(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#a259ff', cursor: 'pointer' }}
                />
                <label htmlFor="terminos-carrito" style={{ color: '#e8e0f5', fontSize: 12, cursor: 'pointer' }}>
                  Acepto los <a href="/terminos" target="_blank" rel="noopener noreferrer" style={{ color: '#c4b5fd', textDecoration: 'underline' }}>términos y condiciones de PandaStore</a>
                </label>
              </div>

              {/* Footer de Tarjeta 3 */}
              <div className="checkout--footer">
                <div className="checkout-price-box">
                  <span className="price-label">Total a pagar</span>
                  <div className="price">
                    <span>
                      {formatMontoCheckout(totalFinalCLP, totalFinal)}
                    </span>
                    <span className="iva-badge">IMPUESTOS INCLUIDOS</span>
                  </div>
                </div>

                {metodoPago === 'mercadopago' && selectedMoneda === 'CLP' ? (
                  <button
                    type="button"
                    className="checkout-btn"
                    disabled={!aceptaTerminos}
                    onClick={async () => {
                      if (!aceptaTerminos) return;
                      const emailFinal = user ? user.email : guestEmail;
                      if (!user && (!guestEmail || !guestFirstName || !guestLastName)) {
                        showAlert('Ingresa tu correo, nombre y apellido para pagar.');
                        return;
                      }
                      try {
                        const montoFinal = Math.max(1, totalConDescuentoRedondeado);
                        const response = await fetch('https://us-central1-pandastoreupdate.cloudfunctions.net/createMercadoPagoPreference', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            cart: cart.map(item => ({
                              id: item.id || item.productId,
                              name: item.isPromo ? item.name : (cartProducts[item.id]?.name || item.name),
                              description: item.description || item.name,
                              category_id: item.category_id || "others",
                              quantity: item.cantidad || item.quantity || 1,
                              precio: Math.round(montoFinal / (cart.reduce((s, i) => s + (i.cantidad || 1), 0) || 1))
                            })),
                            email: emailFinal,
                            uid: user ? user.uid : 'guest',
                            total: montoFinal,
                            firstName: user ? userProfile.firstName : guestFirstName,
                            lastName: user ? userProfile.lastName : guestLastName,
                            shipping: {}
                          })
                        });
                        const data = await response.json();
                        if (data.init_point) {
                          window.location.href = data.init_point;
                        } else {
                          showAlert('No se pudo iniciar el pago. Intenta nuevamente.');
                        }
                      } catch (err) {
                        showAlert('Error al conectar con MercadoPago: ' + (err.message || err));
                      }
                    }}
                  >
                    Pagar con tarjeta débito / crédito
                  </button>
                ) : metodoPago === 'paypal' ? null : (
                  <button
                    type="button"
                    className="checkout-btn"
                    disabled={
                      procesandoPago ||
                      comprobanteUploading ||
                      !aceptaTerminos ||
                      !metodoPago ||
                      (metodoPago === 'transferencia' && (!bancoSeleccionado || !comprobanteFile || comprobanteUploading)) ||
                      (metodoPago === 'prex' && (!comprobanteFile || comprobanteUploading)) ||
                      (metodoPago === 'crypto' && !transferenciaRealizada)
                    }
                    onClick={finalizarCompra}
                  >
                    {procesandoPago ? 'Procesando pedido...' : comprobanteUploading ? 'Subiendo...' : 'Confirmar Pedido'}
                  </button>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
