import React, { useState, useEffect } from "react";
import { useMoneda, roundUpUSD } from "../../context/MonedaContext";
import { useNavigate, useLocation } from "react-router-dom";
import UpsellRecs from "../../components/UpsellRecs";
import DlcUpsellBanner from "../../components/DlcUpsellBanner/DlcUpsellBanner";
import { db, auth, storage } from "../../firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, setDoc, collection, doc, getDoc, getDocs, updateDoc, increment, onSnapshot } from "firebase/firestore";
import { PayPalButtonWrapper } from "../Pagos/PayPalButtonWrapper";
import { trackBeginCheckout, trackPurchase } from "../../utils/analytics";
import { markCartActive, markCartConverted, updateCartCustomerInfo } from "../../utils/abandonedCart";
import { getGamerLevel } from "../../utils/gamerLevel";
import { registerReferralPurchase, deductReferralCredits } from "../../utils/referralHelper";
import { getProductPricing, parseNumberCLP } from "../../utils/priceHelper";
import { hasB2BAccess, hasResellerBenefits } from "../../utils/userRoles";
import { DEFAULT_PAYMENT_SETTINGS, normalizePaymentSettings, PAYMENT_SETTINGS_DOC, validatePaymentProofFile, visibleBankAccounts, visibleForUser } from "../../utils/paymentMethods";
import Loader from "../../components/Loader";
import "./PandaCheckoutCards.css";

// app_id puede existir como referencia interna en productos de PlayStation.
// Los DLC se ofrecen únicamente cuando el juego es inequívocamente Steam.
function isSteamOnlyProduct(product) {
  const platform = String(product?.plataforma || product?.platform || product?.consoleName || "").toLowerCase();
  const category = String(product?.categoria || product?.categoryName || "").toLowerCase();
  const isPlayStation = platform.includes("ps4") || platform.includes("ps5") || platform.includes("playstation") ||
    platform.includes("play 4") || platform.includes("play 5") ||
    category.includes("ps4") || category.includes("ps5") || category.includes("playstation") ||
    category.includes("play 4") || category.includes("play 5") ||
    Boolean(product?.pricePrimariaCLP || product?.priceSecundariaCLP || product?.pricePrimariaUSD || product?.priceSecundariaUSD);
  if (isPlayStation) return false;
  const isSwitch = platform.includes("switch") || platform.includes("nintendo") || category.includes("switch") || category.includes("nintendo");
  if (isSwitch) return false;
  return platform.includes("steam") || category.includes("steam") || Boolean(product?.isSteam) || String(product?.id || "").startsWith("ryuu_");
}

export default function CheckoutCompraDirecta({ user: propUser }) {
  const [user, setUser] = useState(propUser || auth.currentUser);
  const [cupon, setCupon] = useState("");
  const [cuponInfo, setCuponInfo] = useState(null);
  const [cuponError, setCuponError] = useState("");
  const [descuento, setDescuento] = useState(0);
  const { moneda, infoPais, convertirDesdeCLP, formatearPrecio, tasas, valorDolar } = useMoneda();
  const navigate = useNavigate();
  const location = useLocation();
  const producto = location.state?.producto;
  const [cantidad, setCantidad] = useState(1);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [transferenciaRealizada, setTransferenciaRealizada] = useState(false);
  const [bancoSeleccionado, setBancoSeleccionado] = useState(null);
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [comprobanteUploading, setComprobanteUploading] = useState(false);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [metodoPago, setMetodoPago] = useState("");
  const [paymentSettings, setPaymentSettings] = useState(DEFAULT_PAYMENT_SETTINGS);
  const [userProfile, setUserProfile] = useState({ firstName: '', lastName: '', ordersCount: 0, referralCredits: 0 });
  const [usarReferralCredits, setUsarReferralCredits] = useState(false);
  const [userOrdersCount, setUserOrdersCount] = useState(0);
  const [cuponDebounceTimer, setCuponDebounceTimer] = useState(null);
  const [upsellExtra, setUpsellExtra] = useState([]);
  const [resolvedCategoryId, setResolvedCategoryId] = useState(producto?.categoryId || null);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setUser(u));
    return unsub;
  }, []);

  useEffect(() => onSnapshot(doc(db, ...PAYMENT_SETTINGS_DOC), (snap) => {
    setPaymentSettings(normalizePaymentSettings(snap.exists() ? snap.data() : {}));
  }, () => {}), []);

  const handleSyncGuestInfo = (emailOverride, firstOverride, lastOverride, phoneOverride) => {
    const e = emailOverride !== undefined ? emailOverride : guestEmail;
    const f = firstOverride !== undefined ? firstOverride : guestFirstName;
    const l = lastOverride !== undefined ? lastOverride : guestLastName;
    const p = phoneOverride !== undefined ? phoneOverride : guestPhone;
    const fullName = `${f || ''} ${l || ''}`.trim();
    if (e || p || fullName) {
      updateCartCustomerInfo(e, fullName, p, user?.uid || null);
    }
  };

  useEffect(() => {
    if (user) {
      updateCartCustomerInfo(user.email, user.displayName, user.phoneNumber, user.uid);
    }
  }, [user]);

  useEffect(() => {
    if (!resolvedCategoryId && producto?.id) {
      getDoc(doc(db, 'products', producto.id)).then(snap => {
        if (snap.exists()) setResolvedCategoryId(snap.data().categoryId || null);
      });
    }
  }, [resolvedCategoryId, producto]);

  useEffect(() => {
    if (user?.uid) {
      getDoc(doc(db, "users", user.uid)).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserProfile({
            ...data,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
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

  useEffect(() => {
    if (producto) {
      const priceCLP = Number(producto.priceCLP || 0);
      trackBeginCheckout([producto], priceCLP, 'CLP', user?.uid || null);
      markCartActive(user?.uid || null, [producto], priceCLP, {
        email: user?.email || null,
        name: user?.displayName || null,
      });
    }
  }, [producto, user]);

  const esRevendedor = hasB2BAccess(userProfile) || hasResellerBenefits(userProfile) || Boolean(producto?.isResellerPrice);

  // Sincronizar automáticamente el método de pago válido según el país seleccionado
  useEffect(() => {
    const countryAllowed = (infoPais?.metodosPago || ['PayPal', 'Crypto'])
      .map(m => m.toLowerCase().replace(/\s/g, ''));
    const valid = [];
    if (esRevendedor) valid.push('billetera');
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
  }, [infoPais?.codigo, infoPais?.metodosPago, esRevendedor, paymentSettings, userProfile]);

  if (!producto) {
    return (
      <div className="panda-checkout-page">
        <div className="panda-card" style={{ padding: 40, textAlign: "center", borderRadius: 16 }}>
          <h3 style={{ color: "#c4b5fd" }}>No hay producto para comprar</h3>
          <p style={{ color: "#a08ab8" }}>Selecciona un juego desde la tienda para iniciar tu compra directa.</p>
          <button
            onClick={() => navigate('/')}
            className="panda-card coupon-btn"
            style={{ maxWidth: 200, margin: "20px auto 0" }}
          >
            Volver a la tienda
          </button>
        </div>
      </div>
    );
  }

  const getProductPrice = (prod, curr) => {
    if (!prod) return 0;
    const variant = String(prod.variante || prod.variant || "").toLowerCase();
    
    // 1. Obtener precio base en CLP según la variante o duración elegida
    let publicCLP = 0;
    if (variant === "primaria") {
      publicCLP = parseNumberCLP(prod.pricePrimariaCLP || prod.precioPublicoCLP || prod.priceCLP);
    } else if (variant === "secundaria") {
      publicCLP = parseNumberCLP(prod.priceSecundariaCLP || prod.precioPublicoCLP || prod.priceCLP);
    } else if (prod.meses && Array.isArray(prod.preciosPorMes)) {
      const plan = prod.preciosPorMes.find(p => Number(p?.meses) === Number(prod.meses));
      publicCLP = parseNumberCLP(plan?.clp || prod.precioPublicoCLP || prod.priceCLP);
    } else {
      publicCLP = parseNumberCLP(prod.precioPublicoCLP || prod.priceCLP || prod.pricePrimariaCLP || prod.priceSecundariaCLP || 0);
    }

    if (publicCLP <= 0 && prod.priceCLP && parseNumberCLP(prod.priceCLP) > 0) {
      publicCLP = parseNumberCLP(prod.priceCLP);
    }

    // 2. ¿Aplica precio revendedor?
    const isReseller = hasResellerBenefits(userProfile) || Boolean(prod.isResellerPrice);
    
    let finalCLP = publicCLP;
    if (isReseller && publicCLP > 0) {
      const pricing = getProductPricing({
        ...prod,
        variante: variant,
        selectedPriceCLP: publicCLP,
        priceCLP: publicCLP,
        categoryName: prod.categoryName || prod.categoria || prod.plataforma || prod.platform || ""
      }, "revendedor", userProfile?.purchaseCount || userProfile?.comprasRealizadas || 0);
      finalCLP = pricing.precioFinal;
    }

    // 3. Conversión de moneda
    if (curr === "CLP") return finalCLP;
    
    const converted = convertirDesdeCLP ? convertirDesdeCLP(finalCLP) : null;
    if (converted !== null && converted !== undefined) return converted;
    if (curr === "USD") return finalCLP / 1000;
    return finalCLP;
  };

  const basePrice = getProductPrice(producto, moneda);
  const basePriceCLP = getProductPrice(producto, "CLP");

  const upsellTotal = upsellExtra.reduce((acc, p) => acc + getProductPrice(p, moneda), 0);
  const upsellTotalCLP = upsellExtra.reduce((acc, p) => acc + getProductPrice(p, "CLP"), 0);

  // Subtotales con cantidad
  const subtotal = (basePrice * cantidad) + upsellTotal;
  const subtotalCLP = (basePriceCLP * cantidad) + upsellTotalCLP;

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

  // Descuentos de cupón filtrado por categoría si corresponde
  const cupCat = cuponInfo?.categoria || 'todas';
  let elegibleBase = 0;
  let elegibleBaseCLP = 0;
  if (itemMatchesCategory(producto, producto, cupCat)) {
    elegibleBase += basePrice * cantidad;
    elegibleBaseCLP += basePriceCLP * cantidad;
  }
  upsellExtra.forEach(p => {
    if (itemMatchesCategory(p, p, cupCat)) {
      elegibleBase += getProductPrice(p, moneda);
      elegibleBaseCLP += getProductPrice(p, "CLP");
    }
  });

  // Los precios B2B ya incluyen su condición comercial: no admiten cupones.
  const descuentoCuponMonto = esRevendedor ? 0 : elegibleBase * (descuento / 100);
  const descuentoCuponMontoCLP = esRevendedor ? 0 : elegibleBaseCLP * (descuento / 100);

  // Gamer Level permanent discount (Bronce 0%, Plata 5%, Oro 10%, Diamante 15%)
  const gamerLevel = getGamerLevel(userOrdersCount);
  // Los precios B2B ya son netos y no acumulan descuentos de nivel.
  const gamerLevelDiscountPercent = esRevendedor ? 0 : (gamerLevel.discountPercent || 0);
  const descuentoNivelMontoCLP = subtotalCLP * (gamerLevelDiscountPercent / 100);
  const descuentoNivelMonto = subtotal * (gamerLevelDiscountPercent / 100);

  // Descuento por saldo de referidos
  const maxReferralCreditsCLP = (user && usarReferralCredits)
    ? Math.min(userProfile.referralCredits || 0, Math.max(0, subtotalCLP - descuentoCuponMontoCLP - descuentoNivelMontoCLP))
    : 0;
  const descuentoReferralCLP = Math.max(0, maxReferralCreditsCLP);
  const descuentoReferralMonto = moneda === "CLP" ? descuentoReferralCLP : (convertirDesdeCLP(descuentoReferralCLP) || descuentoReferralCLP);

  // Descuento total combinado
  const descuentoTotalCLP = descuentoCuponMontoCLP + descuentoNivelMontoCLP + descuentoReferralCLP;
  const descuentoTotalMonto = descuentoCuponMonto + descuentoNivelMonto + descuentoReferralMonto;

  const IVA_RATE = 0.19;
  const baseNetaCLP = Math.max(0, subtotalCLP - descuentoTotalCLP);
  const ivaCLP = esRevendedor ? 0 : Math.round(baseNetaCLP * IVA_RATE);
  const totalFinalCLP = baseNetaCLP + ivaCLP;
  const rawTotalFinal = moneda === "USD"
    ? (convertirDesdeCLP(totalFinalCLP) || (totalFinalCLP / (valorDolar || 900)))
    : (convertirDesdeCLP(totalFinalCLP) || totalFinalCLP);
  const totalFinal = moneda === "USD" ? roundUpUSD(rawTotalFinal) : rawTotalFinal;
  const iva = moneda === "USD"
    ? (convertirDesdeCLP(ivaCLP) || (ivaCLP / (valorDolar || 900)))
    : (convertirDesdeCLP(ivaCLP) || ivaCLP);
  const baseNeta = moneda === "USD" ? parseFloat((totalFinal - iva).toFixed(2)) : (convertirDesdeCLP(baseNetaCLP) || baseNetaCLP);

  // Total en USD para Crypto y PayPal (fórmula canónica segura basada en CLP / dólar administrativo)
  const rawTotalUSD = moneda === "USD"
    ? totalFinal
    : (totalFinalCLP / (Number(valorDolar) || 900));
  const totalUSD = roundUpUSD(rawTotalUSD);

  const totalUSDPayPal = totalUSD !== null ? roundUpUSD(totalUSD * 1.054 + 0.5) : null;
  const totalConDescuentoRedondeado = Math.ceil(totalFinalCLP);

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
      if (!match) { setCuponError("Cupón no válido"); return; }
      const data = match.data();
      if (data.activo === false) { setCuponError("Cupón inactivo"); return; }

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
      // Verificar por email (logueado o invitado)
      const emailAValidar = (user?.email || guestEmail || "").trim().toLowerCase();
      if (emailAValidar && usadoPorEmailsArray.map(e => String(e).toLowerCase()).includes(emailAValidar)) {
        setCuponError("Este correo ya usó este cupón anteriormente");
        return;
      }
      if (data.descuento > 50) { setCuponError("El descuento máximo permitido es 50%"); return; }
      if (data.categoria && data.categoria !== 'todas') {
        const matchesMain = itemMatchesCategory(producto, producto, data.categoria);
        const matchesUpsell = upsellExtra.some(p => itemMatchesCategory(p, p, data.categoria));
        if (!matchesMain && !matchesUpsell) {
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

  let detalle = "";
  if (producto.variante) detalle = `PlayStation ${producto.variante.charAt(0).toUpperCase() + producto.variante.slice(1).toLowerCase()}`;
  if (producto.meses) detalle = (detalle ? `${detalle} • ` : "") + `Meses: ${producto.meses}`;
  if (hasResellerBenefits(userProfile)) detalle = (detalle ? `${detalle} • ` : "") + "💎 Precio Revendedor";

  function formatPrecio(val, curr) {
    if (!val || isNaN(val)) return "$0";
    if (curr === "USD") {
      return `$${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (curr === "CLP") {
      return `$${Math.round(Number(val)).toLocaleString("es-CL")}`;
    }
    return `$${val}`;
  }

  // Formato exacto y transparente para el checkout (evita redondeos arbitrarios de catálogo como Math.ceil(x/500)*500)
  const formatMontoCheckout = (montoCLP, montoUSD, method = null) => {
    const activeMethod = method || metodoPago;
    if (moneda === "USD") {
      const u = (typeof montoUSD === "number" && !isNaN(montoUSD) && montoUSD > 0)
        ? montoUSD
        : (convertirDesdeCLP ? convertirDesdeCLP(montoCLP, "USD", activeMethod) : Number(montoCLP || 0) / (valorDolar || 900));
      return `$${Number(roundUpUSD(u)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (moneda === "CLP") {
      return `$${Math.round(Number(montoCLP || 0)).toLocaleString("es-CL")}`;
    }
    const convertido = convertirDesdeCLP ? convertirDesdeCLP(montoCLP, moneda, activeMethod) : montoCLP;
    const cfg = infoPais;
    if (convertido === null || convertido === undefined) {
      return `$${Math.round(Number(montoCLP || 0)).toLocaleString("es-CL")}`;
    }
    return `${cfg?.simbolo || '$'}${Math.round(convertido).toLocaleString("es-CL")}`;
  };

  const finalizarCompra = async () => {
    if (procesandoPago) return;
    if (!aceptaTerminos) {
      alert("Debes aceptar los términos y condiciones para continuar.");
      return;
    }
    if (metodoPago === 'transferencia' && (!bancoSeleccionado || !comprobanteFile)) {
      alert("Selecciona la cuenta a la que transferirás y adjunta el comprobante de pago.");
      return;
    }
    if (metodoPago === 'crypto' && !transferenciaRealizada) {
      alert("Debes marcar que ya realizaste el pago.");
      return;
    }
    if (metodoPago === 'prex' && !comprobanteFile) {
      alert("Debes adjuntar el comprobante de pago Prex.");
      return;
    }
    if (metodoPago === 'billetera') {
      const balance = Number(userProfile.wallet_balance || 0);
      if (!user || !esRevendedor || balance < totalFinalCLP) {
        alert(`Saldo insuficiente en Billetera B2B. Disponible: $${balance.toLocaleString('es-CL')}. Puedes recargar desde tu Perfil.`);
        return;
      }
    }
    if (!user && (!guestEmail || !guestFirstName || !guestLastName)) {
      alert("Debes ingresar tu correo, nombre y apellido para finalizar la compra como invitado.");
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
        alert('Para proteger tu comprobante, inicia sesión antes de subirlo.');
        setProcesandoPago(false);
        return;
      }
      const fileError = validatePaymentProofFile(comprobanteFile);
      if (fileError) {
        alert(fileError);
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
        alert('Error al subir el comprobante: ' + (uploadErr.message || uploadErr));
        return;
      }
      setComprobanteUploading(false);
    }

    try {
      if (!producto.id) {
        alert('Error: El producto no tiene un ID válido. No se puede guardar el pedido.');
        return;
      }

      const nombreCliente = user ? ((userProfile.firstName || user?.displayName?.split(' ')[0] || '') +
        ' ' + (userProfile.lastName || user?.displayName?.split(' ').slice(1).join(' ') || '')) 
        : `${guestFirstName} ${guestLastName}`;
      const emailFinal = user?.email || guestEmail;

      const isSaga = Boolean(producto.isSaga);
      const isPromo = Boolean(producto.isPromo);
      const isSteam = Boolean(producto.isSteam || isSaga || (producto.plataforma && String(producto.plataforma).toLowerCase().includes('steam')) || producto.categoryId === 'steam');

      const pedido = {
        productos: [
          {
            id: producto.id,
            name: producto.name,
            cantidad,
            precio: basePrice,
            description: producto.description || producto.name,
            category_id: producto.category_id || producto.categoryId || (isSaga || isSteam ? "steam" : "others"),
            categoryId: producto.categoryId || producto.category_id || (isSaga || isSteam ? "steam" : "others"),
            categoryName: producto.categoryName || (isSaga || isSteam ? "Steam" : null),
            plataforma: producto.plataforma || (isSaga || isSteam ? "steam" : null),
            isSaga,
            isPromo,
            isSteam,
            appId: producto.appId || producto.app_id || null,
            app_id: producto.app_id || producto.appId || null,
            games: producto.games || null,
            promoGames: producto.promoGames || null,
            vipExtras: producto.vipExtras || null,
            selectedVipExtras: producto.selectedVipExtras || null,
            imageUrl: producto.imageUrl || producto.image || null,
            variante: producto.variante || null,
            meses: producto.meses || null
          },
          ...upsellExtra.map(p => ({
            id: p.id,
            name: p.name,
            cantidad: 1,
            precio: convertirDesdeCLP(p.priceCLP) || p.priceCLP,
            description: p.name,
            category_id: p.categoryId || "others",
            categoryId: p.categoryId || "others",
            categoryName: p.categoryName || null,
            plataforma: p.plataforma || (p.categoryId === 'steam' ? 'steam' : null),
            isSteam: p.categoryId === 'steam' || (p.plataforma && String(p.plataforma).toLowerCase().includes('steam')),
            appId: p.appId || p.app_id || null,
            app_id: p.app_id || p.appId || null,
            imageUrl: p.imageUrl || p.image || null,
            upsellOffer: true,
          }))
        ],
        subtotal,
        subtotalCLP,
        descuentoPorcentaje: esRevendedor ? 0 : descuento,
        descuentoCuponMonto: moneda === 'USD' ? descuentoCuponMonto : descuentoCuponMontoCLP,
        iva: moneda === 'USD' ? iva : ivaCLP,
        tasaIva: IVA_RATE,
        total: totalFinal,
        moneda,
        totalCLP: totalFinalCLP,
        totalLocal: totalFinal,
        monedaLocal: moneda,
        pais: infoPais?.codigo || 'CL',
        tasaUsada: tasas?.[moneda.toLowerCase()] ?? 1,
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
          moneda: moneda,
          tasaUsada: tasas?.[moneda.toLowerCase()] ?? 1,
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
        
        try {
          await updateDoc(doc(db, "users", user.uid), {
            ordersCount: (userProfile.ordersCount || 0) + 1,
            ...(metodoPago === 'billetera' ? { wallet_balance: increment(-totalFinalCLP) } : {})
          });
        } catch(err) {}

        if (metodoPago === 'billetera') {
          await addDoc(collection(db, "wallet_transactions"), {
            userId: user.uid,
            userEmail: user.email,
            tipo: "compra_directa",
            monto: -totalFinalCLP,
            descripcion: `Pago de pedido #${orderRef.id} con Billetera Virtual B2B`,
            orderId: orderRef.id,
            createdAt: new Date().toISOString()
          });
        }

        trackPurchase(orderRef.id, [producto], pedido.totalCLP || pedido.total || 0, pedido.moneda || 'CLP', user.uid);
        markCartConverted(user.uid);
        await registerReferralPurchase(user.uid, user.email);
        if (usarReferralCredits && descuentoReferralCLP > 0) {
          await deductReferralCredits(user.uid, descuentoReferralCLP);
        }
      } else {
        trackPurchase(orderRef.id, [producto], pedido.totalCLP || pedido.total || 0, pedido.moneda || 'CLP', 'guest');
        await registerReferralPurchase(null, guestEmail);
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

      const _platLc = String(producto?.plataforma || producto?.platform || '').toLowerCase();
      const detectedPlat = _platLc.includes('nintendo') ? 'Nintendo Switch' : _platLc.includes('playstation') || _platLc.includes('ps4') || _platLc.includes('ps5') ? 'PlayStation' : (producto?.plataforma || producto?.platform || (isSteam ? 'PC / Steam' : 'PC / Steam'));

      const navOrderState = {
        orderId: orderRef.id,
        pedidoId: orderRef.id,
        producto: producto?.nombre || producto?.title || producto?.name || 'Juego PandaStore',
        productos: [
          {
            nombre: producto?.nombre || producto?.title || producto?.name || 'Juego PandaStore',
            plataforma: detectedPlat,
            precio: totalFinalCLP,
            imagen: producto?.imagen || producto?.imageUrl || '',
            variante: producto?.variante || null,
            meses: producto?.meses || null
          }
        ],
        variante: producto?.variante || null,
        plataforma: detectedPlat,
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
      console.error("Error al guardar pedido:", e);
      alert("Ocurrió un error al guardar tu pedido. Intenta nuevamente.");
    }
  };

  const bancos = visibleBankAccounts(paymentSettings, userProfile).map((account) => ({
    id: account.id, nombre: account.name, logo: account.logo, color: account.color || '#a259ff', bg: `${account.color || '#a259ff'}22`,
    datos: `Titular: ${account.holder}\nRUT: ${account.rut}\nTipo de cuenta: ${account.type}\nN° Cuenta: ${account.number}\nEmail: ${account.email}`,
  }));
  // Monto exacto a enviar en USDT (1 USDT = 1 USD). Mismo valor total de la orden en USD.
  const cryptoUSDT = totalUSD;

  return (
    <div className="panda-checkout-page">
      {/* Modal de procesando pago */}
      {procesandoPago && (
        <Loader
          text="Procesando..."
          subtext={comprobanteUploading ? "Subiendo comprobante..." : "PandaStore • Guardando tu pedido"}
          fullScreen={true}
        />
      )}

      {/* Header */}
      <div className="panda-checkout-header">
        <h1>Compra Directa</h1>
        <p>Revisa tu producto, aplica cupones y selecciona tu método de pago</p>
      </div>

      <div className="panda-checkout-wrapper">
        <div className="panda-master-container">

          {/* TARJETA 1: TU COMPRA / PRODUCTOS */}
          <div className="panda-card cart">
            <div className="title">
              <span>Tu compra</span>
              <span className="title-badge">1 producto</span>
            </div>
            <div className="products">
              <div className="product">
                <div className="product-thumb">
                  {producto.imageUrl ? (
                    <img src={producto.imageUrl} alt={producto.name} />
                  ) : (
                    <svg fill="none" viewBox="0 0 24 24" height={26} width={26} stroke="#a259ff" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="product-info">
                  <span>{producto.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    {(producto.consoleName || producto.plataforma || producto.platform) && (
                      <span style={{
                        background: 'rgba(0, 67, 156, 0.2)',
                        color: '#60a5fa',
                        border: '1px solid rgba(96, 165, 250, 0.4)',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        {producto.consoleName || producto.plataforma || producto.platform}
                      </span>
                    )}
                    {producto.variante && (
                      <span style={{
                        background: String(producto.variante).toLowerCase() === 'primaria' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                        color: String(producto.variante).toLowerCase() === 'primaria' ? '#60a5fa' : '#c084fc',
                        border: `1px solid ${String(producto.variante).toLowerCase() === 'primaria' ? 'rgba(96, 165, 250, 0.4)' : 'rgba(192, 132, 252, 0.4)'}`,
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        🎮 Cuenta {producto.variante.charAt(0).toUpperCase() + producto.variante.slice(1).toLowerCase()}
                      </span>
                    )}
                    {producto.meses && (
                      <span style={{
                        background: 'rgba(162, 89, 255, 0.2)',
                        color: '#c4b5fd',
                        border: '1px solid rgba(162, 89, 255, 0.4)',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        ⏱️ {producto.meses} mes(es)
                      </span>
                    )}
                    {esRevendedor && (
                      <span style={{
                        background: 'rgba(234, 179, 8, 0.2)',
                        color: '#facc15',
                        border: '1px solid rgba(234, 179, 8, 0.4)',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        💎 Precio Revendedor
                      </span>
                    )}
                  </div>
                </div>
                <div className="quantity">
                  <button
                    type="button"
                    onClick={() => setCantidad(c => Math.max(1, c - 1))}
                    disabled={cantidad <= 1}
                    aria-label="Disminuir cantidad"
                  >
                    <svg fill="none" viewBox="0 0 24 24" height={13} width={13} stroke="currentColor">
                      <path strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" d="M20 12L4 12" />
                    </svg>
                  </button>
                  <label>{cantidad}</label>
                  <button
                    type="button"
                    onClick={() => setCantidad(c => c + 1)}
                    aria-label="Aumentar cantidad"
                  >
                    <svg fill="none" viewBox="0 0 24 24" height={13} width={13} stroke="currentColor">
                      <path strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" d="M12 4V20M20 12H4" />
                    </svg>
                  </button>
                </div>
                <div className="product-price">
                  {formatMontoCheckout(basePriceCLP * cantidad, basePrice * cantidad)}
                </div>
              </div>

              {/* Extras de Upsell */}
              {upsellExtra.map(p => (
                <div key={p.id} className="product" style={{ background: 'rgba(74, 222, 128, 0.05)', borderRadius: 8, padding: '6px 8px' }}>
                  <div className="product-thumb" style={{ width: 44, height: 44 }}>
                    <img src={p.imageUrl} alt={p.name} />
                  </div>
                  <div className="product-info">
                    <span>{p.name}</span>
                    <p style={{ color: '#4ade80' }}>Pack recomendado (-10%)</p>
                  </div>
                  <div style={{ fontSize: 11, color: '#a08ab8' }}>x1</div>
                  <div className="product-price" style={{ fontSize: 13 }}>
                    {formatMontoCheckout(getProductPrice(p, 'CLP'), getProductPrice(p, 'USD'))}
                  </div>
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => setUpsellExtra(prev => prev.filter(x => x.id !== p.id))}
                    title="Quitar"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Los extras DLC sólo existen para juegos Steam, nunca para PS4/PS5. */}
            {isSteamOnlyProduct(producto) && (
              <div style={{ padding: '0 16px 4px' }}>
                <DlcUpsellBanner
                  cartItems={[
                    {
                      ...producto,
                      app_id: producto?.app_id || producto?.appId || (String(producto?.id || '').startsWith("ryuu_") ? producto.id.replace("ryuu_", "") : null),
                      name: producto?.name
                    },
                    ...upsellExtra.filter(isSteamOnlyProduct)
                  ]}
                  onAddDlc={(dlcItem) => {
                    setUpsellExtra(prev => prev.some(p => p.id === dlcItem.id) ? prev : [...prev, dlcItem]);
                  }}
                  moneda={moneda}
                  formatearPrecio={formatearPrecio}
                />
              </div>
            )}

            {/* Upsell opcional dentro de la tarjeta */}
            <div style={{ padding: '0 16px 12px' }}>
              <UpsellRecs
                currentIds={[producto.id, ...upsellExtra.map(p => p.id)]}
                categoryId={resolvedCategoryId}
                onAdded={(prod) => {
                  setUpsellExtra(prev => prev.some(p => p.id === prod.id) ? prev : [...prev, prod]);
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
              <span>{formatMontoCheckout(subtotalCLP, subtotal)}</span>

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

            {/* Datos para usuarios invitados */}
            {!user && (
              <div className="panda-checkout-section">
                <div className="panda-checkout-section-title">
                  <span>👤</span> Tus datos para recibir el juego
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
                    placeholder="Correo electrónico (donde recibirás el acceso)"
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
                  ¿Tienes cuenta? <a href="/iniciar-sesion" style={{ color: '#c4b5fd', textDecoration: 'underline' }}>Inicia sesión aquí</a>
                </div>
              </div>
            )}

            {/* Selector de métodos de pago */}
            <div className="panda-checkout-section">
              <div className="panda-checkout-section-title">
                <span>💳</span> Selecciona método de pago
              </div>
              {(() => {
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
                if (esRevendedor) {
                  allMetodos.push('billetera');
                }
                countryAllowed.forEach((m) => {
                  if (esRevendedor && (m === 'prex' || m === 'paypal')) return;
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
                              <span style={{ fontSize: 22 }}>{info.icon || '💰'}</span>
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

            {/* Subsección contextual: Banco Transferencia */}
            {moneda === 'CLP' && metodoPago === 'transferencia' && (
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
                  cart={[producto]}
                  cartProducts={{ [producto.id]: producto }}
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
                id="terminos-compra-directa"
                checked={aceptaTerminos}
                onChange={e => setAceptaTerminos(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#a259ff', cursor: 'pointer' }}
              />
              <label htmlFor="terminos-compra-directa" style={{ color: '#e8e0f5', fontSize: 12, cursor: 'pointer' }}>
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

              {metodoPago === 'mercadopago' && moneda === 'CLP' ? (
                <button
                  type="button"
                  className="checkout-btn"
                  disabled={!aceptaTerminos}
                  onClick={async () => {
                    if (!aceptaTerminos) return;
                    const emailFinal = user ? user.email : guestEmail;
                    if (!user && (!guestEmail || !guestFirstName || !guestLastName)) {
                      alert('Ingresa tu correo, nombre y apellido para pagar.');
                      return;
                    }
                    try {
                      const montoFinal = Math.max(1, totalConDescuentoRedondeado);
                      const response = await fetch('https://us-central1-pandastoreupdate.cloudfunctions.net/createMercadoPagoPreference', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          cart: [{
                            id: producto.id,
                            name: producto.name,
                            description: producto.description || producto.name,
                            category_id: producto.category_id || "others",
                            quantity: cantidad,
                            precio: montoFinal
                          }],
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
                        alert('No se pudo iniciar el pago. Intenta nuevamente.');
                      }
                    } catch (err) {
                      alert('Error al conectar con MercadoPago: ' + (err.message || err));
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
                  {procesandoPago ? 'Procesando pedido...' : comprobanteUploading ? 'Subiendo comprobante...' : 'Confirmar Pedido'}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
