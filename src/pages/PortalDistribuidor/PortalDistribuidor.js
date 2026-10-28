import { notifyNewDistributorRequest } from "../../utils/telegramNotifications";
import React, { useState, useEffect, useMemo } from "react";
import { auth, db, storage } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  increment,
  addDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Key,
  ShieldCheck,
  Wallet,
  PlusCircle,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  Search,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Zap,
  ShoppingBag,
  CreditCard,
  Building2,
  ArrowRight,
  Crown,
  CheckCircle,
  Info,
  Upload,
  MessageCircle
} from "lucide-react";
import Loader from "../../components/Loader";
import { fetchRyuuCatalog, getDlcsForGame } from "../../utils/ryuuDlcHelper";
import vipGamesList from "../../utils/vipGamesData.json";
import { DEFAULT_PAYMENT_SETTINGS, normalizePaymentSettings, PAYMENT_SETTINGS_DOC, validatePaymentProofFile, visibleBankAccounts, visibleForUser } from "../../utils/paymentMethods";
import { hasActiveSteamDistributorAccess } from "../../utils/userRoles";
import { useMoneda, roundUpUSD } from "../../context/MonedaContext";
import "./PortalDistribuidor.css";

// ─── CONSTANTES OFICIALES: 7 JUEGOS UBISOFT Y 7 JUEGOS EA (LuaTools) ─────────
export const UBISOFT_7_APP_IDS = new Set(["66088", "1081", "4740", "5266", "6145", "17903", "1771"]);
export const EA_7_APP_IDS = new Set(["16425677", "16425884", "16425751", "16425629", "198188", "1035208", "196787"]);

export function isUbisoftVipGame(game) {
  if (!game) return false;
  const appId = String(typeof game === "object" ? (game.app_id || game.appid || game.id || game.vip_app_id || "") : "");
  if (appId && UBISOFT_7_APP_IDS.has(appId)) return true;
  const rawName = typeof game === "string" ? game : (game.name || "");
  const clean = rawName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    clean.includes("blackflagresynced") ||
    (clean.includes("assassin") && clean.includes("blackflag")) ||
    (clean.includes("assassin") && clean.includes("shadows")) ||
    clean.includes("frontiersofpandora") ||
    clean === "farcry6" ||
    (clean.includes("princeofpersia") && clean.includes("lostcrown")) ||
    clean.includes("starwarsoutlaws") ||
    (clean.includes("ghostrecon") && clean.includes("wildlands"))
  );
}

export function isEaVipGame(game) {
  if (!game) return false;
  const appId = String(typeof game === "object" ? (game.app_id || game.appid || game.id || game.vip_app_id || "") : "");
  if (appId && EA_7_APP_IDS.has(appId)) return true;
  const rawName = typeof game === "string" ? game : (game.name || "");
  const clean = rawName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    clean.includes("fc26") ||
    clean.includes("fc27") ||
    clean.includes("fifa26") ||
    clean.includes("fifa27") ||
    clean.includes("maddennfl26") ||
    (clean.includes("pga") && clean.includes("tour")) ||
    clean.includes("lostinrandom") ||
    (clean.includes("needforspeed") && clean.includes("payback")) ||
    (clean.includes("needforspeed") && clean.includes("unbound"))
  );
}

// ─── HELPER: IDENTIFICAR TIPO Y PRECIO DE ACTIVACIÓN VIP (EA, UBISOFT, DENUVO) ─
export function getActivationCodeInfo(game) {
  if (!game) return { requiresCode: false, type: null, price: 0, badgeLabel: "", icon: "🔑" };

  const rawName = typeof game === "string" ? game : (game.name || "");
  const name = rawName.toLowerCase().trim();
  const clean = rawName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const appId = String(typeof game === "object" ? (game.app_id || game.appid || game.id || game.vip_app_id || "") : "");

  // 1. EXACTAMENTE los 7 Juegos de EA (LuaTools)
  // FC 27 es estreno -> $8.000 CLP revendedor ($17.000 CLP cliente final). Los otros 6 -> $5.000 CLP.
  if (isEaVipGame(game)) {
    const isFc27 = appId === "16425884" || clean.includes("fc27") || name.includes("fc 27") || clean.includes("fifa27") || name.includes("fifa 27");
    if (isFc27) {
      return {
        requiresCode: true,
        type: "ea",
        price: 8000,
        badgeLabel: "⚽ EA Sports FC 27 (FIFA 27) - Estreno (+ $8.000 CLP)",
        platform: "EA",
        icon: "⚽"
      };
    }
    return {
      requiresCode: true,
      type: "ea",
      price: 5000,
      badgeLabel: clean.includes("fc26") || clean.includes("fifa26") ? "⚽ EA Sports FC 26 (FIFA 26) (+ $5.000 CLP)" : "⚽ EA Games (+ $5.000 CLP)",
      platform: "EA",
      icon: "⚽"
    };
  }

  // 2. EXACTAMENTE los 7 Juegos de Ubisoft (LuaTools) -> $3.000 CLP
  // El resto de títulos de Ubisoft (Far Cry 5, AC Valhalla, etc.) NO tienen este valor, son normales.
  if (isUbisoftVipGame(game)) {
    return {
      requiresCode: true,
      type: "ubisoft",
      price: 3000,
      badgeLabel: "🦅 Ubisoft (+ $3.000 CLP)",
      platform: "Ubisoft",
      icon: "🦅"
    };
  }

  // 3. Steam Denuvo (~86 juegos VIP Denuvo) -> $1.000 CLP
  // El resto de títulos de Ubisoft o EA NO tienen recargo especial; si tienen Denuvo en Steam pagan normal $1.000 CLP.
  const vipMatch = Array.isArray(vipGamesList)
    ? vipGamesList.find((v) => {
        if (appId && String(v.app_id) === appId) return true;
        if (v.name && v.name.toLowerCase().trim() === name) return true;
        return false;
      })
    : null;

  if (vipMatch && (vipMatch.platform === "Steam" || !vipMatch.platform)) {
    return {
      requiresCode: true,
      type: "denuvo",
      price: 1000,
      badgeLabel: "🔑 Código Denuvo (+ $1.000 CLP)",
      platform: "Steam",
      icon: "🔑"
    };
  }

  const isDenuvo =
    (typeof game === "object" && (game.requires_code === true || game.requires_activation_code === true || game.is_denuvo === true || game.technical_category === "denuvo" || Boolean(game.isDenuvoActivation))) ||
    [
      "black myth",
      "wukong",
      "dragon's dogma",
      "dragons dogma",
      "persona 3 reload",
      "persona 5 royal",
      "dead space",
      "jedi: survivor",
      "jedi survivor",
      "hogwarts legacy",
      "lies of p",
      "silent hill 2",
      "stellar blade",
      "monster hunter wilds",
      "metaphor",
      "f1 24",
      "f1 23",
      "f1 25",
      "atomfall",
      "crimson desert",
      "borderlands 4",
      "demon slayer",
      "nba 2k"
    ].some((k) => name.includes(k));

  if (isDenuvo) {
    return {
      requiresCode: true,
      type: "denuvo",
      price: 1000,
      badgeLabel: "🔑 Código Denuvo (+ $1.000 CLP)",
      platform: "Steam",
      icon: "🔑"
    };
  }

  return { requiresCode: false, type: null, price: 0, badgeLabel: "", icon: "🔑" };
}

export function checkRequiresActivationCode(game) {
  return getActivationCodeInfo(game).requiresCode;
}

// ─── DEFINICIÓN DE LOS 5 PLANES OFICIALES STEAM ─────────────────────────
export const DISTRIBUTOR_PLANS = {
  inicial: {
    id: "inicial",
    name: "Distribuidor Inicial",
    badge: "Para Empezar 🌱",
    baseQuota: 20,
    price: 20000,
    unitPriceEstimate: 1000,
    color: "#06b6d4",
    gradient: "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(14, 116, 144, 0.3) 100%)",
    borderColor: "#06b6d4",
    description: "Ideal para dar tus primeros pasos y comenzar a revender juegos con una inversión mínima.",
    features: [
      "20 Claves de Activación Mensuales ($1.000 c/u)",
      "Acceso al Launcher Oficial PandaStore",
      "Descargas de juegos a máxima velocidad",
      "Panel de emisión con formato para WhatsApp",
      "Pausar o reactivar claves en tiempo real",
      "Soporte por WhatsApp"
    ]
  },
  basico: {
    id: "basico",
    name: "Distribuidor Básico",
    badge: "Crecimiento 📈",
    baseQuota: 60,
    price: 50000,
    unitPriceEstimate: 833,
    color: "#38bdf8",
    gradient: "linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(3, 105, 161, 0.3) 100%)",
    borderColor: "#38bdf8",
    description: "Para revendedores en crecimiento que buscan mayor margen por cada clave vendida.",
    features: [
      "60 Claves de Activación Mensuales (~$833 c/u)",
      "Acceso al Launcher Oficial PandaStore",
      "Descargas de juegos a máxima velocidad",
      "Panel de emisión con formato para WhatsApp",
      "Pausar o reactivar claves en tiempo real",
      "Soporte prioritario por WhatsApp"
    ]
  },
  pro: {
    id: "pro",
    name: "Distribuidor Pro",
    badge: "Más Popular 🔥",
    isPopular: true,
    baseQuota: 130,
    price: 85000,
    unitPriceEstimate: 653,
    freeAllAccess: 3,
    color: "#a855f7",
    gradient: "linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(126, 34, 206, 0.35) 100%)",
    borderColor: "#c084fc",
    description: "Para revendedores con clientes activos que buscan maximizar rentabilidad y variedad.",
    features: [
      "130 Claves de Activación Mensuales (~$653 c/u)",
      "🎁 3 Claves ALL-ACCESS (+70.000 Juegos) GRATIS cada mes",
      "Acceso al Launcher Oficial PandaStore",
      "Panel avanzado con gestión de clientes",
      "Pausar, reactivar y control anti-reventa",
      "Generador de mensajes instantáneos WhatsApp",
      "Soporte VIP preferencial"
    ]
  },
  supreme: {
    id: "supreme",
    name: "Distribuidor Supreme",
    badge: "Máxima Ganancia 🚀",
    baseQuota: 250,
    price: 139000,
    unitPriceEstimate: 556,
    freeAllAccess: 8,
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(180, 83, 9, 0.35) 100%)",
    borderColor: "#fbbf24",
    description: "El plan de más alto rendimiento comercial para comunidades gamers y tiendas consolidadas.",
    features: [
      "250 Claves de Activación Mensuales (~$556 c/u)",
      "🌟 8 Claves ALL-ACCESS (+70.000 Juegos) GRATIS cada mes",
      "Costo por clave más bajo del mercado (Margen hasta 800%)",
      "Emisión ilimitada simultánea",
      "Control total de licencias y clientes",
      "Atención y soporte prioritario 24/7",
      "Acceso anticipado a nuevos estrenos y updates"
    ]
  },
  vitalicio: {
    id: "vitalicio",
    name: "Plan Vitalicio",
    badge: "Pago Único Perpetuo 👑",
    isLifetime: true,
    baseQuota: 70,
    price: 270000,
    color: "#10b981",
    gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(4, 120, 87, 0.35) 100%)",
    borderColor: "#34d399",
    description: "Inversión única y definitiva. 70 claves mensuales de por vida sin volver a pagar mensualidad jamás.",
    features: [
      "70 Claves Mensuales DE POR VIDA",
      "Cero mensualidades futuras (Pago Único)",
      "Renovación de cupo automática el día 1 de cada mes",
      "Panel de distribuidor vitalicio desbloqueado",
      "Launcher oficial y actualizaciones perpetuas",
      "Canal de contacto directo con el fundador de PandaStore"
    ]
  }
};

// ─── PAQUETES DE CLAVES EXTRAS ──────────────────────────────────────────
const EXTRA_KEY_PACKS = [
  { id: "extra_5", count: 5, price: 5000, label: "+5 Claves Extras", badge: "$1.000 c/u" },
  { id: "extra_10", count: 10, price: 9000, label: "+10 Claves Extras", badge: "$900 c/u (Ahorro $1.000)" },
  { id: "extra_25", count: 25, price: 20000, label: "+25 Claves Extras", badge: "$800 c/u (Ahorro $5.000)" }
];

// ─── CUENTAS BANCARIAS OFICIALES ────────────────────────────────────────
const STORE_BANK_ACCOUNTS = [
  {
    id: "mercadopago",
    banco: "Mercado Pago",
    tipo: "Cuenta Vista",
    titular: "José Roberto Muñoz Osses",
    rut: "21.715.187-2",
    numero: "1095508563",
    email: "comprobantesswitch2@gmail.com",
    badge: "Acreditación Rápida",
    color: "#009ee3",
    logo: "/logos%20bancos/mercadopago.jpg"
  },
  {
    id: "bancoestado",
    banco: "BancoEstado",
    tipo: "Cuenta RUT / Cuenta Vista",
    titular: "Matías Muñoz",
    rut: "236326845",
    numero: "236326845",
    email: "comprobantesswitch2@gmail.com",
    badge: "Cuenta RUT",
    color: "#f5941d",
    logo: "/logos%20bancos/banco%20estado.png"
  },
  {
    id: "santander",
    banco: "Banco Santander",
    tipo: "Cuenta Corriente",
    titular: "Jose Roberto Muñoz Osses",
    rut: "21.715.187-2",
    numero: "0 000 97 74931 0",
    email: "comprobantesswitch2@gmail.com",
    badge: "Cuenta Corriente",
    color: "#ec1c24",
    logo: "/logos%20bancos/santander.png"
  }
];

function formatCLP(amount) {
  const num = Math.round(Number(amount) || 0);
  return "$" + num.toLocaleString("es-CL");
}

function generateRandomKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segment = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `PANDA-${segment(4)}-${segment(4)}-${segment(4)}`;
}

export default function PortalDistribuidor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { formatearPrecio, convertirDesdeCLP, infoPais, tasas, valorDolar, obtenerCotizacion } = useMoneda();
  const isChile = infoPais?.codigo === "CL";
  const supportsCrypto = true;
  // En el portal de distribuidor SOLO se opera en CLP (Chile) o USDT (Internacional)
  const displayPrice = (amountCLP) => {
    const amt = Number(amountCLP) || 0;
    if (isChile) return `$${Math.round(amt).toLocaleString("es-CL")} CLP`;
    const u = roundUpUSD(amt / Number(valorDolar || 900));
    return `${u.toFixed(2)} USDT`;
  };
  const handleSelectPaymentMethod = (method) => {
    if (purchaseTarget?.type === "recharge_wallet") {
      if (method === "crypto" && paymentMethod !== "crypto") {
        const cur = Number(rechargeDisplayAmount) || 15000;
        const usdt = cur >= 500 ? Math.max(10, Math.round(cur / Number(valorDolar || 900))) : 50;
        setRechargeDisplayAmount(String(usdt));
      } else if (method !== "crypto" && paymentMethod === "crypto") {
        const cur = Number(rechargeDisplayAmount) || 50;
        const clp = cur < 500 ? Math.max(5000, Math.round(cur * Number(valorDolar || 900))) : 15000;
        setRechargeDisplayAmount(String(clp));
      }
    }
    setPaymentMethod(method);
  };
  const rechargeInputToCLP = (amount, method = null) => {
    const value = Number(amount) || 0;
    const activeMethod = method || paymentMethod;
    if (activeMethod === "crypto") {
      return Math.round(value * Number(valorDolar || 900));
    }
    return Math.round(value);
  };
  const displayRechargeInput = (amount, method = null) => {
    const value = Number(amount) || 0;
    const activeMethod = method || paymentMethod;
    if (activeMethod === "crypto") {
      return `${value.toFixed(2)} USDT`;
    }
    return `$${Math.round(value).toLocaleString("es-CL")} CLP`;
  };

  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isDistributor, setIsDistributor] = useState(false);
  const [loading, setLoading] = useState(true);

  // Vista para distribuidores: "panel" o "planes"
  const [distributorView, setDistributorView] = useState("panel");

  // Claves emitidas por este distribuidor
  const [licenses, setLicenses] = useState([]);
  const [searchLicense, setSearchLicense] = useState("");
  const [copiedKey, setCopiedKey] = useState(null);
  const [copiedWsp, setCopiedWsp] = useState(null);

  // Formulario de emisión de nueva clave
  const [clientEmail, setClientEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [validityType, setValidityType] = useState("monthly"); // monthly | permanent
  const [isAllAccess, setIsAllAccess] = useState(false);
  const [selectedGames, setSelectedGames] = useState([]);
  const [gameSearchInput, setGameSearchInput] = useState("");
  const [availableGames, setAvailableGames] = useState([]);
  const [ryuuCatalog, setRyuuCatalog] = useState([]);
  const [submittingKey, setSubmittingKey] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Modal de Compra / Pago (Sirve para Planes, Claves Extras y Recarga de Billetera)
  // purchaseTarget: { type: 'plan' | 'extra_pack' | 'recharge_wallet', item: ... }
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseTarget, setPurchaseTarget] = useState(null);
  const [rechargeDisplayAmount, setRechargeDisplayAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("mercadopago"); // mercadopago | transferencia | billetera
  const [selectedBankId, setSelectedBankId] = useState("mercadopago");
  const [voucherFile, setVoucherFile] = useState(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState({ type: null, msg: "" });
  const [paymentResult, setPaymentResult] = useState(null);
  const [pendingPaymentWarning, setPendingPaymentWarning] = useState(false);
  const [pendingPaymentConfirmed, setPendingPaymentConfirmed] = useState(false);
  const [copiedAccountField, setCopiedAccountField] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState(DEFAULT_PAYMENT_SETTINGS);

  // Banner de bienvenida o confirmación
  const [celebrationBanner, setCelebrationBanner] = useState(null);

  // En el portal, los botones flotantes no deben cubrir formularios en móvil.
  useEffect(() => {
    document.body.classList.add("portal-distribuidor-page");
    return () => document.body.classList.remove("portal-distribuidor-page");
  }, []);

  useEffect(() => onSnapshot(doc(db, ...PAYMENT_SETTINGS_DOC), (snap) => {
    setPaymentSettings(normalizePaymentSettings(snap.exists() ? snap.data() : {}));
  }, () => {}), []);

  // 1. Cargar usuario y verificar permisos de distribuidor en tiempo real
  useEffect(() => {
    let unsubUser = null;
    let isMounted = true;

    const failsafeTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 3000);

    const unsubAuth = auth.onAuthStateChanged((u) => {
      if (!isMounted) return;
      setCurrentUser(u);

      if (!u) {
        setIsDistributor(false);
        setUserData(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, "users", u.uid);
      if (unsubUser) unsubUser();

      unsubUser = onSnapshot(
        userRef,
        (docSnap) => {
          if (!isMounted) return;
          if (docSnap.exists()) {
            const d = docSnap.data();
            setUserData(d);
            setIsDistributor(hasActiveSteamDistributorAccess(d));
          } else {
            setIsDistributor(false);
          }
          setLoading(false);
        },
        (err) => {
          console.warn("Snapshot user error:", err);
          if (isMounted) setLoading(false);
        }
      );
    });

    return () => {
      isMounted = false;
      clearTimeout(failsafeTimer);
      if (unsubUser) unsubUser();
      unsubAuth();
    };
  }, []);

  // 2. Manejar retorno de Mercado Pago si fue aprobado
  useEffect(() => {
    const status = searchParams.get("status") || searchParams.get("collection_status");

    if (status === "approved" && currentUser) {
      setCelebrationBanner("¡Pago recibido con éxito por Mercado Pago! Tu cuenta ha sido actualizada de inmediato.");
      setPaymentResult({
        type: "success",
        title: "Pago exitoso",
        message: "Tu pago fue confirmado correctamente. Estamos preparando la actualización de tu cuenta."
      });
      // Limpiar query params de la URL sin recargar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams, currentUser]);

  // 3. Cargar catálogo Ryuu para información de DLCs
  useEffect(() => {
    let isMounted = true;
    fetchRyuuCatalog()
      .then((cat) => {
        if (isMounted && Array.isArray(cat)) {
          setRyuuCatalog(cat);
        }
      })
      .catch((e) => console.warn("Error cargando catálogo Ryuu:", e));

    return () => {
      isMounted = false;
    };
  }, []);

  // 4. Cargar catálogo de juegos de Firestore para el selector y combinar catálogo VIP
  useEffect(() => {
    const loadGames = async () => {
      try {
        const snap = await getDocs(collection(db, "games"));
        const list = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.name && !list.some((g) => g.name === data.name)) {
            const activationInfo = getActivationCodeInfo({
              ...data,
              id: d.id,
              name: data.name
            });
            list.push({
              id: d.id,
              name: data.name,
              app_id: data.app_id || data.steam_appid || data.steamAppId || d.id,
              requires_code: activationInfo.requiresCode,
              activation_info: activationInfo
            });
          }
        });

        // Asegurar que todos los 95 juegos VIP de vipGamesData.json estén disponibles para búsqueda
        if (Array.isArray(vipGamesList)) {
          vipGamesList.forEach((v) => {
            const appIdStr = String(v.app_id || v.id);
            const exists = list.some(
              (g) =>
                String(g.app_id) === appIdStr ||
                g.name.toLowerCase().trim() === (v.name || "").toLowerCase().trim()
            );
            if (!exists && v.name) {
              const activationInfo = getActivationCodeInfo(v);
              list.push({
                id: `vip-${appIdStr}`,
                name: v.name,
                app_id: appIdStr,
                requires_code: activationInfo.requiresCode,
                activation_info: activationInfo
              });
            }
          });
        }

        // Integrar el catálogo global de Ryuu (60k+ juegos de Steam)
        try {
          const ryuuData = await fetchRyuuCatalog();
          if (Array.isArray(ryuuData) && ryuuData.length > 0) {
            const NON_BASE_REGEX = /\b(soundtrack|original sound track|artbook|digital artbook|wallpaper pack|dedicated server|mod kit|sdk)\b/i;
            const existingIds = new Set(list.map((g) => String(g.app_id || g.id)));
            ryuuData.forEach((r) => {
              const appIdStr = String(r.appid);
              if (!appIdStr || existingIds.has(appIdStr)) return;
              const rType = (r.type || "game").toLowerCase();
              const rName = r.name || "";
              if (rType !== "game" || NON_BASE_REGEX.test(rName)) return;

              const activationInfo = getActivationCodeInfo({
                ...r,
                id: appIdStr,
                name: rName
              });

              list.push({
                id: appIdStr,
                name: rName,
                app_id: appIdStr,
                requires_code: activationInfo.requiresCode,
                activation_info: activationInfo
              });
              existingIds.add(appIdStr);
            });
          }
        } catch (ryuuErr) {
          console.warn("No se pudo cargar el catálogo global de Ryuu en distribuidor:", ryuuErr);
        }

        // Construir campo _search enriquecido con sinónimos (FIFA, FC, etc.)
        list.forEach((g) => {
          const raw = `${g.name || ""} ${g.app_id || ""}`.toLowerCase();
          let aliases = "";
          if (raw.includes("ea sports fc") || raw.includes("fifa")) {
            aliases = " fifa fc24 fc25 fc26 fc27 ea fc fútbol soccer";
          }
          g._search = `${raw}${aliases}`.trim();
        });

        setAvailableGames(list);
      } catch (e) {
        console.error("Error al cargar juegos:", e);
      }
    };
    loadGames();
  }, []);

  // 5. Escuchar licencias emitidas por el distribuidor logueado
  useEffect(() => {
    if (!currentUser || !isDistributor) return;
    const q = query(
      collection(db, "licenses"),
      where("distributor_id", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLicenses(list);
      },
      (err) => console.error("Error al escuchar licencias:", err)
    );

    return () => unsub();
  }, [currentUser, isDistributor]);

  // Cálculos de cuotas del distribuidor
  const activePlanKey = userData?.distributor_plan || "basico";
  const planConfig = DISTRIBUTOR_PLANS[activePlanKey] || DISTRIBUTOR_PLANS.basico;
  const baseQuota = userData?.custom_quota || planConfig.baseQuota;
  const extraKeys = userData?.extra_keys || 0;
  const totalQuota = baseQuota + extraKeys;
  const issuedKeysCount = licenses.length;
  const remainingKeys = Math.max(0, totalQuota - issuedKeysCount);
  const walletBalance = Number(userData?.wallet_balance) || 0;

  // Cálculos de recargos de Billetera Virtual (All-Access y Juegos con Código: EA $5k, Ubisoft $3k, Denuvo $1k)
  const selectedGamesWithCode = useMemo(() => {
    return selectedGames.filter((g) => g.requiresCode);
  }, [selectedGames]);

  const activationSurcharge = useMemo(() => {
    return selectedGamesWithCode.reduce(
      (acc, g) => acc + (Number(g.activationPrice) || 1000),
      0
    );
  }, [selectedGamesWithCode]);

  const allAccessCharge = isAllAccess ? 10000 : 0;
  const totalWalletRequired = allAccessCharge + activationSurcharge;

  // Handlers para Selección de Juegos y DLCs
  const handleAddGame = (g) => {
    if (selectedGames.some((item) => item.name === g.name)) return;

    // Buscar en Ryuu para asociar DLCs
    let ryuuGame = null;
    if (Array.isArray(ryuuCatalog)) {
      ryuuGame = ryuuCatalog.find(
        (r) =>
          String(r.appid) === String(g.app_id) ||
          (r.name && r.name.toLowerCase() === g.name.toLowerCase())
      );
    }
    const effectiveAppId = ryuuGame?.appid || g.app_id;
    const dlcs = getDlcsForGame(effectiveAppId, ryuuCatalog);
    const codeInfo = g.activation_info || getActivationCodeInfo(g);

    setSelectedGames((prev) => [
      ...prev,
      {
        id: g.id,
        name: g.name,
        app_id: effectiveAppId,
        requiresCode: codeInfo.requiresCode,
        activationType: codeInfo.type,
        activationPrice: codeInfo.price,
        activationBadgeLabel: codeInfo.badgeLabel,
        activationIcon: codeInfo.icon,
        platform: codeInfo.platform,
        dlcMode: "base", // 'base' | 'all' | 'custom'
        availableDlcs: dlcs || [],
        selectedDlcIds: []
      }
    ]);
  };

  const handleRemoveGame = (gameName) => {
    setSelectedGames((prev) => prev.filter((g) => g.name !== gameName));
  };

  const handleUpdateDlcMode = (gameName, mode) => {
    setSelectedGames((prev) =>
      prev.map((g) => {
        if (g.name !== gameName) return g;
        return {
          ...g,
          dlcMode: mode,
          selectedDlcIds:
            mode === "all"
              ? (g.availableDlcs || []).map((d) => d.dlc_app_id)
              : mode === "custom" && g.selectedDlcIds.length === 0
              ? (g.availableDlcs || []).map((d) => d.dlc_app_id)
              : g.selectedDlcIds
        };
      })
    );
  };

  const handleToggleDlc = (gameName, dlcId) => {
    setSelectedGames((prev) =>
      prev.map((g) => {
        if (g.name !== gameName) return g;
        const exists = g.selectedDlcIds.includes(dlcId);
        const nextIds = exists
          ? g.selectedDlcIds.filter((id) => id !== dlcId)
          : [...g.selectedDlcIds, dlcId];
        return { ...g, selectedDlcIds: nextIds };
      })
    );
  };

  const handleSelectAllDlcs = (gameName, selectAll) => {
    setSelectedGames((prev) =>
      prev.map((g) => {
        if (g.name !== gameName) return g;
        return {
          ...g,
          selectedDlcIds: selectAll ? (g.availableDlcs || []).map((d) => d.dlc_app_id) : []
        };
      })
    );
  };

  // Copiar Clave Simple
  const handleCopyKey = (keyText) => {
    navigator.clipboard.writeText(keyText);
    setCopiedKey(keyText);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Copiar Mensaje Formateado para WhatsApp del Cliente
  const handleCopyWspMessage = (lic) => {
    const isAll = lic.allowed_games?.includes("*") || lic.isAllAccess;

    let gamesDesc = "";
    if (isAll) {
      gamesDesc = "🌟 Acceso Total: Catálogo Completo All-Access (+70.000 Juegos)";
    } else if (Array.isArray(lic.game_configs) && lic.game_configs.length > 0) {
      gamesDesc = lic.game_configs
        .map((g) => {
          let dlcInfo = "";
          if (g.dlc_mode === "all") {
            dlcInfo = " 🎁 [Juego Base + Todos los DLCs]";
          } else if (g.dlc_mode === "custom" && g.selected_dlcs?.length > 0) {
            dlcInfo = ` 🎯 [Juego Base + ${g.selected_dlcs.length} DLCs seleccionados]`;
          } else {
            dlcInfo = " 🎮 [Juego Base]";
          }
          let codeTag = "";
          if (g.requires_code) {
            if (g.activation_type === "ea" || (g.name && g.name.toLowerCase().includes("ea sports"))) {
              codeTag = " ⚽ (Activación EA App)";
            } else if (g.activation_type === "ubisoft" || (g.name && (g.name.toLowerCase().includes("creed") || g.name.toLowerCase().includes("far cry")))) {
              codeTag = " 🦅 (Activación Ubisoft Connect)";
            } else {
              codeTag = " 🔑 (Código Denuvo Steam)";
            }
          }
          return `• ${g.name}${dlcInfo}${codeTag}`;
        })
        .join("\n");
    } else if (lic.game_names?.length > 0) {
      gamesDesc = lic.game_names.map((n) => `• ${n}`).join("\n");
    } else {
      gamesDesc = `${lic.allowed_games?.length || 1} juego(s) seleccionado(s)`;
    }

    const vigencia = lic.license_type === "monthly" ? "30 Días (Mensual)" : "Permanente";

    const hasActivationCode =
      lic.has_activation_code ||
      (lic.game_configs && lic.game_configs.some((g) => g.requires_code));

    const hasEA = lic.game_configs?.some((g) => g.activation_type === "ea");
    const hasUbi = lic.game_configs?.some((g) => g.activation_type === "ubisoft");
    const hasDenuvo = lic.game_configs?.some((g) => g.activation_type === "denuvo" || (!g.activation_type && g.requires_code));

    let platformsNote = [];
    if (hasEA) platformsNote.push("EA App");
    if (hasUbi) platformsNote.push("Ubisoft Connect");
    if (hasDenuvo) platformsNote.push("Steam / Denuvo");
    const platformsStr = platformsNote.length > 0 ? ` (${platformsNote.join(", ")})` : "";

    const codeNotice = hasActivationCode
      ? `\n\n🔑 *IMPORTANTE - CÓDIGO DE ACTIVACIÓN${platformsStr}:*\nUno o más de tus juegos requiere código de activación único. Cuando abras el juego en PandaStore Launcher, si te solicita código, pídelo por este chat indicando tu clave para entregártelo de inmediato.`
      : "";

    const msg =
      `🎮 *¡Hola ${lic.client_name || ""}! Aquí tienes tu acceso oficial a PandaStore Launcher* 🐼✨\n\n` +
      `🔑 *Tu Clave de Activación:*\n\`${lic.key}\`\n\n` +
      `📦 *Juegos Habilitados:*\n${gamesDesc}\n\n` +
      `⏳ *Vigencia:* ${vigencia}\n\n` +
      `📥 *Descarga e instala el Launcher Oficial aquí:*\n` +
      `https://pandastoregaming.cl/descargar-launcher\n\n` +
      `🚀 *Pasos rápidos:*\n` +
      `1. Abre PandaStore Launcher en tu PC.\n` +
      `2. Pega tu clave de activación.\n` +
      `3. ¡Haz clic en tu juego y a jugar!${codeNotice}\n\n` +
      `*Garantía y soporte oficial PandaStore.*`;

    navigator.clipboard.writeText(msg);
    setCopiedWsp(lic.id);
    setTimeout(() => setCopiedWsp(null), 2500);
  };

  // Pausar / Reactivar Licencia
  const handleToggleLicenseStatus = async (lic) => {
    const newStatus = lic.status === "active" ? "suspended" : "active";
    const actionName = newStatus === "active" ? "reactivar" : "pausar";
    if (!window.confirm(`¿Deseas ${actionName} la clave de ${lic.client_email}?`)) return;

    try {
      await updateDoc(doc(db, "licenses", lic.id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      alert(`Error al actualizar estado: ${e.message}`);
    }
  };

  // Generar Licencia
  const handleGenerateKey = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    // La UI puede quedar abierta unos instantes mientras Firestore propaga una
    // suspensión. Este guard evita una emisión desde una sesión ya revocada.
    if (!hasActiveSteamDistributorAccess(userData)) {
      setFormError("Tu plan de distribuidor no está activo. No puedes emitir nuevas claves.");
      return;
    }

    if (remainingKeys <= 0) {
      setFormError("Has alcanzado tu límite de claves del mes. Compra un paquete de Claves Extras o sube de plan para continuar.");
      return;
    }

    if (!clientEmail.trim()) {
      setFormError("Debes ingresar el correo del cliente.");
      return;
    }

    if (!isAllAccess && selectedGames.length === 0) {
      setFormError("Debes seleccionar al menos un juego o marcar 'Catálogo Completo All-Access'.");
      return;
    }

    // Regla de Margen Billetera Virtual: All-Access ($10.000) y/o Códigos de Activación (EA $5k, Ubi $3k, Denuvo $1k)
    if (totalWalletRequired > 0) {
      if (walletBalance < totalWalletRequired) {
        const details = [];
        if (isAllAccess) details.push("$10.000 CLP por All-Access");
        if (activationSurcharge > 0) {
          const breakdown = selectedGamesWithCode
            .map((g) => `${g.activationIcon || "🔑"} ${g.name} (${formatCLP(g.activationPrice || 1000)})`)
            .join(", ");
          details.push(`${formatCLP(activationSurcharge)} CLP por ${selectedGamesWithCode.length} juego(s) con activación: ${breakdown}`);
        }
        setFormError(
          `Saldo insuficiente en tu Billetera Virtual. Se requieren ${formatCLP(
            totalWalletRequired
          )} CLP (${details.join(" + ")}). Tu saldo actual es ${formatCLP(
            walletBalance
          )} CLP. Por favor recarga tu billetera para emitir esta clave.`
        );
        return;
      }
    }

    setSubmittingKey(true);

    try {
      const newKey = generateRandomKey();
      const now = new Date();
      const expiryDate =
        validityType === "monthly" ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;

      // 1. Debitar monto total requerido de la billetera virtual
      if (totalWalletRequired > 0) {
        await updateDoc(doc(db, "users", currentUser.uid), {
          wallet_balance: increment(-totalWalletRequired)
        });

        const descs = [];
        if (isAllAccess) descs.push("All-Access ($10.000 CLP)");
        if (activationSurcharge > 0) {
          const gameItems = selectedGamesWithCode
            .map((g) => `${g.name} [${g.activationIcon || "🔑"} ${formatCLP(g.activationPrice || 1000)}]`)
            .join(", ");
          descs.push(`Códigos de activación: ${gameItems} (Total: ${formatCLP(activationSurcharge)} CLP)`);
        }

        await addDoc(collection(db, "wallet_transactions"), {
          userId: currentUser.uid,
          userEmail: currentUser.email,
          tipo: "emision_licencia_distribuidor",
          monto: -totalWalletRequired,
          descripcion: `Emisión de Clave (${newKey}) para ${clientEmail.trim()}: ${descs.join(" + ")}`,
          createdAt: now.toISOString()
        });
      }

      // 2. Mapear configuraciones de juegos y DLCs
      const gameConfigs = isAllAccess
        ? []
        : selectedGames.map((g) => ({
            name: g.name,
            app_id: g.app_id,
            requires_code: Boolean(g.requiresCode),
            activation_type: g.activationType || null,
            activation_price: g.activationPrice || 0,
            platform: g.platform || "Steam",
            dlc_mode: g.dlcMode || "base",
            selected_dlcs:
              g.dlcMode === "all"
                ? (g.availableDlcs || []).map((d) => d.dlc_app_id)
                : g.dlcMode === "custom"
                ? (g.selectedDlcIds || [])
                : []
          }));

      const gameNamesList = isAllAccess
        ? ["Catálogo Completo All-Access"]
        : selectedGames.map((g) => g.name);

      // 3. Guardar la licencia en la colección 'licenses'
      const licensePayload = {
        key: newKey,
        client_email: clientEmail.trim(),
        client_name: clientName.trim() || clientEmail.trim(),
        license_type: validityType,
        expiry_date: expiryDate,
        status: "active",
        allowed_games: isAllAccess ? ["*"] : selectedGames.map((g) => g.app_id || g.name),
        game_names: gameNamesList,
        game_configs: gameConfigs,
        has_activation_code: selectedGamesWithCode.length > 0,
        activation_code_games: selectedGamesWithCode.map((g) => ({
          name: g.name,
          type: g.activationType,
          price: g.activationPrice,
          platform: g.platform
        })),
        isAllAccess: Boolean(isAllAccess),
        distributor_id: currentUser.uid,
        distributor_email: currentUser.email,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      await setDoc(doc(db, "licenses", newKey), licensePayload);

      setFormSuccess(`🎉 ¡Clave generada con éxito! Copia el mensaje de WhatsApp para enviárselo a tu cliente.`);
      setClientEmail("");
      setClientName("");
      setSelectedGames([]);
      setIsAllAccess(false);
    } catch (err) {
      setFormError(`Error al emitir clave: ${err.message}`);
    } finally {
      setSubmittingKey(false);
    }
  };

  // ─── ABRIR MODAL DE COMPRA (PLAN, CLAVES EXTRAS O RECARGA DE BILLETERA) ────
  const handleOpenPurchase = (targetType, item) => {
    if (!currentUser) {
      navigate("/iniciar-sesion?redirect=/portal-distribuidor");
      return;
    }
    setPurchaseTarget({ type: targetType, item });
    const defaultMethod = isChile ? "transferencia" : "crypto";
    setPaymentMethod(defaultMethod);
    if (targetType === "recharge_wallet") {
      setRechargeDisplayAmount(defaultMethod === "crypto" ? "50" : "15000");
    } else {
      setRechargeDisplayAmount("");
    }
    setVoucherFile(null);
    setPaymentFeedback({ type: null, msg: "" });
    setPendingPaymentConfirmed(false);
    setPurchaseModalOpen(true);
  };

  // ─── COPIAR TODOS LOS DATOS BANCARIOS (FORMATO UNIFICADO TIPO MERCADO PAGO) ───
  const handleCopyAllBankData = async (bank) => {
    const text = [
      `Banco: ${bank.banco}`,
      `Tipo de cuenta: ${bank.tipo}`,
      `Titular: ${bank.titular}`,
      `RUT: ${bank.rut}`,
      `N° de cuenta: ${bank.numero}`,
      `Correo: ${bank.email}`
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopiedAccountField(`all_${bank.id}`);
      setTimeout(() => setCopiedAccountField(null), 3000);
    } catch (_) {
      setPaymentFeedback({ type: "error", msg: "No se pudo copiar. Selecciona los datos manualmente e inténtalo otra vez." });
    }
  };

  // ─── PROCESAR PAGO (MERCADO PAGO / TRANSFERENCIA / BILLETERA) ───────────
  const handleExecutePayment = async (e) => {
    if (e) e.preventDefault();
    if (!purchaseTarget || !currentUser) return;

    setPaymentFeedback({ type: null, msg: "" });
    const isPlan = purchaseTarget.type === "plan";
    const isRecharge = purchaseTarget.type === "recharge_wallet";
    const item = purchaseTarget.item;
    const amount = isRecharge ? rechargeInputToCLP(rechargeDisplayAmount) : (Number(item.price) || 0);
    if (isRecharge && amount < 5000) {
      setPaymentFeedback({
        type: "error",
        msg: paymentMethod === "crypto" ? "El monto mínimo de recarga es 10 USDT." : "El monto mínimo de recarga es $5.000 CLP."
      });
      return;
    }
    const title = isPlan
      ? `Plan ${item.name}`
      : isRecharge
      ? "Recarga de Billetera Virtual"
      : item.label;

    // Un comprobante pendiente no impide elegir otro método, pero el cliente
    // debe confirmarlo expresamente para evitar pagos duplicados por error.
    if (!pendingPaymentConfirmed) {
      try {
        const pendingPayments = await getDocs(query(collection(db, "solicitudes_distribuidores"), where("userId", "==", currentUser.uid)));
        if (pendingPayments.docs.some((entry) => entry.data().estado === "pendiente")) {
          setPurchaseModalOpen(false);
          setPendingPaymentWarning(true);
          return;
        }
      } catch (error) {
        console.warn("No se pudo verificar pagos pendientes:", error);
      }
    }

    // OPCIÓN 1: PAGO CON MERCADO PAGO
    if (paymentMethod === "mercadopago") {
      setPaymentSubmitting(true);
      try {
        const cartItem = {
          id: isPlan
            ? `dist_plan_${item.id}`
            : isRecharge
            ? `dist_recharge_${amount}`
            : `dist_extra_${item.count}`,
          name: isPlan
            ? `Activación Plan ${item.name} - Distribuidor Steam PandaStore`
            : isRecharge
            ? `Recarga de Billetera Virtual PandaStore (${formatCLP(amount)} CLP)`
            : `Recarga de ${item.label} (${item.count} claves) - PandaStore`,
          description: isPlan
            ? `Cupo de ${item.baseQuota} claves mensuales para reventa autorizada`
            : isRecharge
            ? `Abono de saldo para emisiones All-Access y códigos de activación Denuvo`
            : `Paquete de ${item.count} claves de activación adicionales`,
          category_id: "distribuidor",
          quantity: 1,
          precio: amount
        };

        const response = await fetch(
          "https://us-central1-pandastoreupdate.cloudfunctions.net/createMercadoPagoPreference",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cart: [cartItem],
              email: currentUser.email,
              uid: currentUser.uid,
              total: amount,
              firstName: userData?.firstName || userData?.displayName || "Distribuidor",
              lastName: userData?.lastName || "Panda",
              shipping: {}
            })
          }
        );

        const data = await response.json();
        if (data.init_point) {
          window.location.href = data.init_point;
        } else {
          throw new Error("No se pudo generar la pasarela de Mercado Pago. Intenta con transferencia bancaria.");
        }
      } catch (err) {
        setPaymentFeedback({
          type: "error",
          msg: `Error al conectar con Mercado Pago: ${err.message}`
        });
        setPaymentSubmitting(false);
      }
      return;
    }

    // OPCIÓN 2: TRANSFERENCIA BANCARIA / CRYPTO MANUAL
    if (paymentMethod === "transferencia" || paymentMethod === "crypto") {
      if (!voucherFile) {
        setPaymentFeedback({
          type: "error",
          msg: "Por favor adjunta la foto o captura del comprobante de pago."
        });
        return;
      }
      const fileError = validatePaymentProofFile(voucherFile);
      if (fileError) {
        setPaymentFeedback({ type: "error", msg: fileError });
        return;
      }

      setPaymentSubmitting(true);
      try {
        const safeName = voucherFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `comprobantes_distribuidor/${currentUser.uid}/${Date.now()}_${safeName}`;
        const sRef = ref(storage, storagePath);
        await uploadBytes(sRef, voucherFile);
        const fileUrl = await getDownloadURL(sRef);

        const bankInfo = paymentMethod === "crypto"
          ? { banco: `${paymentSettings.crypto.name || "USDT"} (${paymentSettings.crypto.network || "Red no indicada"})` }
          : (visibleBankAccounts(paymentSettings, userData).find((b) => b.id === selectedBankId) || STORE_BANK_ACCOUNTS[0]);
        const bankName = bankInfo?.banco || bankInfo?.name || "Transferencia bancaria";

        const cotizacionGuardada = {
          baseCLP: amount,
          valorDolar: Number(valorDolar || 900),
          moneda: paymentMethod === "crypto" ? "USDT" : "CLP",
          montoLocalOriginal: paymentMethod === "crypto" ? (isRecharge ? Number(rechargeDisplayAmount) : roundUpUSD(amount / Number(valorDolar || 900))) : amount,
          totalLocal: paymentMethod === "crypto" ? (isRecharge ? Number(rechargeDisplayAmount) : roundUpUSD(amount / Number(valorDolar || 900))) : amount,
          totalUSD: roundUpUSD(amount / (Number(valorDolar) || 900)),
          cryptoUSDT: roundUpUSD(amount / (Number(valorDolar) || 900)),
          metodoPago: paymentMethod,
          createdAt: new Date().toISOString()
        };

        // Guardar solicitud de distribuidor
        await addDoc(collection(db, "solicitudes_distribuidores"), {
          userId: currentUser.uid,
          userEmail: currentUser.email,
          userName: userData?.displayName || userData?.firstName || currentUser.email,
          tipo: isPlan ? "adquisicion_plan" : isRecharge ? "recarga_billetera" : "compra_claves_extras",
          planId: isPlan ? item.id : null,
          planName: isPlan ? item.name : null,
          extraCount: !isPlan && !isRecharge ? item.count : 0,
          itemTitle: title,
          montoCLP: amount,
          cotizacion: cotizacionGuardada,
          banco: bankName,
          comprobanteUrl: fileUrl,
          estado: "pendiente",
          createdAt: new Date().toISOString()
        });

        // Notificar al bot de Telegram del Administrador
        notifyNewDistributorRequest({
          userName: userData?.displayName || userData?.firstName || currentUser.email,
          userEmail: currentUser.email,
          tipo: isPlan ? "adquisicion_plan" : isRecharge ? "recarga_billetera" : "compra_claves_extras",
          planName: isPlan ? item.name : null,
          extraCount: !isPlan && !isRecharge ? item.count : 0,
          montoCLP: amount,
          metodoPago: paymentMethod,
          banco: bankName,
          comprobanteUrl: fileUrl
        }).catch((e) => console.error("Error enviando alerta telegram distribuidor:", e));

        setPurchaseModalOpen(false);
        setVoucherFile(null);
        setPaymentResult({
          type: "review",
          title: "Pago en revisión",
          message: "Recibimos tu comprobante. Nuestro equipo verificará el pago y te avisará cuando quede confirmado."
        });
      } catch (err) {
        setPaymentFeedback({
          type: "error",
          msg: `Error al subir comprobante: ${err.message}`
        });
      } finally {
        setPaymentSubmitting(false);
      }
      return;
    }

    // OPCIÓN 3: PAGO CON SALDO BILLETERA VIRTUAL
    if (paymentMethod === "billetera") {
      if (walletBalance < amount) {
        setPaymentFeedback({
          type: "error",
          msg: `Saldo insuficiente. Tu saldo es ${displayPrice(walletBalance)} y necesitas ${displayPrice(amount)}.`
        });
        return;
      }

      setPaymentSubmitting(true);
      try {
        const now = new Date();

        if (isPlan) {
          // Activar o mejorar plan de distribuidor
          const expiresAt = item.isLifetime
            ? null
            : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

          await updateDoc(doc(db, "users", currentUser.uid), {
            role: "distribuidor",
            steam_distributor: true,
            distributor_plan: item.id,
            custom_quota: item.baseQuota,
            distributor_expires_at: expiresAt,
            distributor_status: "active",
            distributor_since: userData?.distributor_since || now.toISOString(),
            wallet_balance: increment(-amount),
            updatedAt: now.toISOString()
          });

          await addDoc(collection(db, "wallet_transactions"), {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            tipo: "compra_plan_distribuidor",
            monto: -amount,
            descripcion: `Activación de Plan ${item.name} (${item.baseQuota} claves)`,
            createdAt: now.toISOString()
          });

          setPaymentResult({ type: "success", title: "Pago exitoso", message: `Tu plan ${item.name} fue activado. Tu cuota mensual ya está disponible.` });
          setIsDistributor(true);
          setDistributorView("panel");
        } else {
          // Compra de Claves Extras
          await updateDoc(doc(db, "users", currentUser.uid), {
            wallet_balance: increment(-amount),
            extra_keys: increment(item.count)
          });

          await addDoc(collection(db, "wallet_transactions"), {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            tipo: "compra_claves_extras_distribuidor",
            monto: -amount,
            descripcion: `Compra de ${item.label} (+${item.count} cupos extras)`,
            createdAt: now.toISOString()
          });

          setPaymentResult({ type: "success", title: "Pago exitoso", message: `Se sumaron ${item.count} claves extras a tu cuenta.` });
        }
        setPurchaseModalOpen(false);
      } catch (err) {
        setPaymentFeedback({
          type: "error",
          msg: `Error en la transacción: ${err.message}`
        });
      } finally {
        setPaymentSubmitting(false);
      }
    }
  };

  if (loading) {
    return <Loader text="Cargando Portal de Distribuidor..." subtext="PandaStore B2B" fullScreen={true} />;
  }

  const selectedPaymentAmount = purchaseTarget?.type === "recharge_wallet"
    ? rechargeInputToCLP(rechargeDisplayAmount)
    : Number(purchaseTarget?.item?.price || 0);

  // ═════════════════════════════════════════════════════════════════════════
  // SECCIÓN 1: VISTA PÚBLICA / CATALOGO DE PLANES (Si no es distribuidor o si hace clic en ver planes)
  // ═════════════════════════════════════════════════════════════════════════
  const shouldShowPlansCatalog = !isDistributor || distributorView === "planes";

  return (
    <div className="dist-portal-container">
      {/* BANNER DE CELEBRACIÓN O RETORNO */}
      {celebrationBanner && (
        <div className="dist-celebration-banner">
          <Sparkles size={20} />
          <span>{celebrationBanner}</span>
          <button onClick={() => setCelebrationBanner(null)}>✕</button>
        </div>
      )}

      {/* ── HEADER PRINCIPAL ── */}
      <div className="dist-portal-header">
        <div>
          <div className="dist-portal-badge">
            <Sparkles size={14} /> PORTAL EXCLUSIVO DISTRIBUIDORES B2B
          </div>
          <h1 className="dist-portal-title">
            {shouldShowPlansCatalog && !isDistributor
              ? "Conviértete en Distribuidor Autorizado Steam"
              : "Panel de Distribuidor Steam PandaStore"}
          </h1>
          <p className="dist-portal-subtitle">
            {shouldShowPlansCatalog && !isDistributor
              ? "Adquiere tu plan con activación inmediata por Mercado Pago, Transferencia o Saldo. Vende licencias de Steam y genera altos ingresos con tu propio margen."
              : "Emite licencias para tus clientes, administra vigencias y expande tu negocio gaming con soporte oficial."}
          </p>
        </div>

        {/* CONTROLES DISTRIBUIDOR ACTIVO */}
        {isDistributor && (
          <div className="dist-portal-user-box">
            <div className="dist-plan-pill">
              <Crown size={14} /> {planConfig.name}
            </div>
            <div className="dist-quota-pill">
              <Key size={14} /> Cupo: <strong>{remainingKeys} / {totalQuota} claves</strong>
            </div>
            <div
              className="dist-wallet-pill"
              onClick={() =>
                handleOpenPurchase("recharge_wallet", {
                  id: "recharge",
                  name: "Recarga de Billetera Virtual",
                  price: 10000,
                  label: "Recarga de Saldo Billetera"
                })
              }
              title="Haz clic para recargar saldo en tu Billetera Virtual"
            >
              <Wallet size={14} />
              <span>Billetera: <strong>{displayPrice(walletBalance)}</strong></span>
              <span className="dist-wallet-plus">+</span>
            </div>
            <button
              className="dist-btn-toggle-view"
              onClick={() => setDistributorView(distributorView === "panel" ? "planes" : "panel")}
            >
              {distributorView === "panel" ? "Ver planes y mejorar" : "Volver a mi panel"}
            </button>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          VISTA: CATÁLOGO DE LOS 4 PLANES (Para nuevos o quienes quieren mejorar)
          ════════════════════════════════════════════════════════════════════════ */}
      {shouldShowPlansCatalog ? (
        <div className="dist-plans-showcase-wrap">
          <section className="dist-pricing-section" aria-labelledby="dist-pricing-title">
            <div className="dist-pricing-heading">
              <span className="dist-pricing-eyebrow"><Sparkles size={14} /> PLANES PARA DISTRIBUIDORES</span>
              <h2 id="dist-pricing-title">Haz crecer tu negocio con PandaStore</h2>
              <p>Elige el volumen de claves que necesitas. Todos los planes se activan por 30 días y puedes subir de nivel cuando quieras.</p>
            </div>

            <div className="dist-pricing-start-card">
              <div>
                <strong>¿Aún estás evaluando?</strong>
                <span>Revisa los beneficios de cada plan antes de contratar. Sin cobros ocultos.</span>
              </div>
              <a className="dist-pricing-start-link" href="#dist-pricing-benefits">Ver beneficios</a>
            </div>

            {/* Los tres planes mensuales siguen usando exactamente el flujo de compra actual. */}
            <div className="dist-pricing-cards">
              {Object.values(DISTRIBUTOR_PLANS).filter((plan) => !plan.isLifetime).map((plan) => {
              const isCurrent = isDistributor && userData?.distributor_plan === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`dist-pricing-card ${plan.isPopular ? "featured" : ""}`}
                  style={{ "--plan-color": plan.borderColor, "--plan-glow": plan.color }}
                >
                  <div className="dist-pricing-card-topline">
                    <span>{plan.isPopular ? "MÁS ELEGIDO" : "PLAN MENSUAL"}</span>
                    {plan.isPopular && <Sparkles size={15} />}
                  </div>
                  <h3>{plan.name.replace("Distribuidor ", "")}</h3>
                  <p className="dist-pricing-description">{plan.description}</p>

                  <div className="dist-pricing-price">
                    <strong>
                      {displayPrice(plan.price)}
                    </strong>
                    <span>/ mes</span>
                  </div>
                  <div className="dist-pricing-quota">
                    <Key size={15} /> {plan.baseQuota} claves mensuales
                    {plan.unitPriceEstimate && <small>· desde {displayPrice(plan.unitPriceEstimate)} c/u</small>}
                  </div>

                  <ul className="dist-pricing-features">
                    {plan.features.map((feat, idx) => (
                      <li key={idx}>
                        <Check size={16} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="dist-pricing-action">
                    {isCurrent ? (
                      <button className="dist-pricing-button current" disabled>
                        ✓ Tu Plan Actual
                      </button>
                    ) : (
                      <button
                        className="dist-pricing-button"
                        onClick={() => handleOpenPurchase("plan", plan)}
                      >
                        <span>{isDistributor ? "Cambiar a este plan" : "Elegir plan"}</span>
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            </div>

            <div className="dist-lifetime-option">
              <div><Crown size={20} /><strong>¿Prefieres pagar una sola vez?</strong><span>Plan Vitalicio: 70 claves mensuales para siempre.</span></div>
              <button onClick={() => handleOpenPurchase("plan", DISTRIBUTOR_PLANS.vitalicio)}>Ver Plan Vitalicio <ArrowRight size={16} /></button>
            </div>

            <div className="dist-pricing-benefits" id="dist-pricing-benefits">
              <span><Zap size={17} /> Margen competitivo</span>
              <span><ShieldCheck size={17} /> Launcher oficial</span>
              <span><ShoppingBag size={17} /> Gestión desde tu panel</span>
              <span><Clock size={17} /> Activación rápida</span>
            </div>
          </section>

          {/* PREGUNTAS FRECUENTES RÁPIDAS */}
          <div className="dist-faq-box">
            <h3 className="dist-faq-title">
              <Info size={20} color="#38bdf8" /> ¿Cómo funciona la reventa con PandaStore?
            </h3>
            <div className="dist-faq-grid">
              <div className="faq-card">
                <strong>1. Eliges tu Plan</strong>
                <p>Pagas con Mercado Pago o Transferencia y tu panel se activa automáticamente.</p>
              </div>
              <div className="faq-card">
                <strong>2. Creas las Claves para tus Clientes</strong>
                <p>Ingresas su correo, eliges el juego o Catálogo Completo, y generas su clave en 1 clic.</p>
              </div>
              <div className="faq-card">
                <strong>3. Entregas por WhatsApp</strong>
                <p>Copias el mensaje pre-diseñado y tu cliente descarga el Launcher oficial para jugar de inmediato.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════════════
           VISTA: DASHBOARD DEL DISTRIBUIDOR (Para distribuidores activos)
           ════════════════════════════════════════════════════════════════════ */
        <>
          {/* CUOTA METRICS & EXTRA KEYS RIBBON */}
          <div className="dist-metrics-grid">
            <div className="dist-metric-card">
              <div className="metric-label">Cupo Total del Mes</div>
              <div className="metric-value">{totalQuota} claves</div>
              <div className="metric-sub">
                Base: {baseQuota} + Extras: {extraKeys}
              </div>
            </div>

            <div className="dist-metric-card">
              <div className="metric-label">Claves Emitidas</div>
              <div className="metric-value text-purple">{issuedKeysCount}</div>
              <div className="metric-sub">Activas en tus clientes</div>
            </div>

            <div className="dist-metric-card">
              <div className="metric-label">Claves Restantes</div>
              <div className="metric-value text-green">{remainingKeys}</div>
              <div className="metric-sub">Disponibles para emitir hoy</div>
            </div>

            <div className="dist-metric-card wallet-metric-card">
              <div className="metric-label">
                <Wallet size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />
                Saldo Billetera Virtual
              </div>
              <div className={`metric-value ${walletBalance > 0 ? "text-green" : "text-amber"}`}>
                {displayPrice(walletBalance)}
              </div>
              <div className="metric-sub">All-Access ({displayPrice(10000)}) · EA ({displayPrice(5000)}) · Ubisoft ({displayPrice(3000)}) · Denuvo ({displayPrice(1000)})</div>
              <button
                type="button"
                className="btn-quick-recharge-wallet"
                onClick={() =>
                  handleOpenPurchase("recharge_wallet", {
                    id: "recharge",
                    name: "Recarga de Billetera Virtual",
                    price: 10000,
                    label: "Recarga de Saldo Billetera"
                  })
                }
              >
                <PlusCircle size={14} /> Recargar Saldo
              </button>
            </div>

            <div className="dist-metric-card action-card">
              <div>
                <div className="metric-label">¿Te faltan claves?</div>
                <div className="extra-keys-title">Cero desconexión de clientes</div>
              </div>
              <button
                className="btn-buy-extra-keys"
                onClick={() => handleOpenPurchase("extra_pack", EXTRA_KEY_PACKS[0])}
              >
                <Zap size={16} /> Comprar Claves Extras
              </button>
            </div>
          </div>

          {/* GRID: GENERADOR (IZQ) + LISTA DE CLAVES (DER) */}
          <div className="dist-content-grid">
            {/* COLUMNA 1: FORMULARIO GENERADOR */}
            <div className="dist-card dist-form-card">
              <h2 className="dist-card-title">
                <PlusCircle size={20} color="#a855f7" /> Emitir Nueva Licencia Steam
              </h2>
              <p className="dist-card-desc">Crea un acceso oficial instantáneo para tu cliente.</p>

              {formError && (
                <div className="dist-alert alert-error">
                  <AlertCircle size={18} /> <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="dist-alert alert-success">
                  <CheckCircle2 size={18} /> <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleGenerateKey}>
                <div className="dist-form-group">
                  <label>Correo Electrónico del Cliente *</label>
                  <input
                    type="email"
                    placeholder="cliente@ejemplo.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="dist-form-group">
                  <label>Nombre del Cliente (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej: Carlos Silva"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>

                <div className="dist-form-group">
                  <label>Vigencia de la Licencia</label>
                  <div className="dist-radio-group">
                    <label className={`dist-radio-btn ${validityType === "monthly" ? "active" : ""}`}>
                      <input
                        type="radio"
                        name="validity"
                        value="monthly"
                        checked={validityType === "monthly"}
                        onChange={() => setValidityType("monthly")}
                      />
                      <span>📅 Mensual (30 Días)</span>
                    </label>
                    <label className={`dist-radio-btn ${validityType === "permanent" ? "active" : ""}`}>
                      <input
                        type="radio"
                        name="validity"
                        value="permanent"
                        checked={validityType === "permanent"}
                        onChange={() => setValidityType("permanent")}
                      />
                      <span>♾️ Permanente</span>
                    </label>
                  </div>
                </div>

                <div className="dist-form-group">
                  <label>Modo de Catálogo</label>
                  <div
                    className={`dist-all-access-card ${isAllAccess ? "selected" : ""}`}
                    onClick={() => setIsAllAccess(!isAllAccess)}
                  >
                    <div className="all-access-checkbox">{isAllAccess && <Check size={16} />}</div>
                    <div>
                      <div className="all-access-title">🌟 Catálogo Completo All-Access (+70.000 Juegos)</div>
                      <div className="all-access-sub">
                        Acceso total ilimitado. <strong>Recargo de $10.000 CLP</strong> descontado de tu Billetera Virtual.
                      </div>
                    </div>
                  </div>
                </div>

                {!isAllAccess && (
                  <div className="dist-form-group">
                    <label>Seleccionar Juegos Específicos o Combo</label>
                    <div className="game-search-wrap">
                      <Search size={16} color="#94a3b8" />
                      <input
                        type="text"
                        placeholder="Buscar juego en catálogo Steam..."
                        value={gameSearchInput}
                        onChange={(e) => setGameSearchInput(e.target.value)}
                      />
                    </div>

                    {gameSearchInput.trim() && (
                      <div className="game-search-results">
                        {availableGames
                          .filter((g) => {
                            const q = gameSearchInput.toLowerCase().trim();
                            const cleanQ = q.replace(/[^a-z0-9]/g, "");
                            const searchStr = (g._search || `${g.name || ""} ${g.app_id || ""}`).toLowerCase();
                            return searchStr.includes(q) || (cleanQ && searchStr.includes(cleanQ)) || g.name.toLowerCase().includes(q);
                          })
                          .slice(0, 10)
                          .map((g) => {
                            const info = g.activation_info || getActivationCodeInfo(g);
                            return (
                              <div
                                key={g.id}
                                className="game-result-item"
                                onClick={() => {
                                  handleAddGame(g);
                                  setGameSearchInput("");
                                }}
                              >
                                <div className="game-result-info">
                                  <span className="game-name">{g.name}</span>
                                  {info.requiresCode && (
                                    <span className={`golden-tag-mini ${info.type || "denuvo"}`}>
                                      {info.icon} {info.badgeLabel || "Requiere Código (+ $1.000 CLP)"}
                                    </span>
                                  )}
                                </div>
                                <PlusCircle size={16} color="#a855f7" />
                              </div>
                            );
                          })}
                      </div>
                    )}

                    {/* LISTA DE JUEGOS SELECCIONADOS CON SELECTOR DE DLCS */}
                    {selectedGames.length > 0 && (
                      <div className="selected-games-container">
                        <div className="selected-games-header">
                          <span>Juegos Seleccionados ({selectedGames.length})</span>
                          <span className="selected-games-help">
                            Elige si deseas Juego Base, Todos los DLCs o DLCs específicos:
                          </span>
                        </div>

                        {selectedGames.map((game) => (
                          <div key={game.name} className="selected-game-config-card">
                            <div className="game-card-top-row">
                              <div className="game-card-title-wrap">
                                <span className="game-card-name">{game.name}</span>
                                {game.requiresCode && (
                                  <span className={`golden-activation-badge ${game.activationType || "denuvo"}`}>
                                    <span className={`golden-circle-icon ${game.activationType || "denuvo"}`}>
                                      {game.activationIcon || "🔑"}
                                    </span>
                                    <span>{game.activationBadgeLabel || `Requiere código (+${displayPrice(game.activationPrice || 1000)})`}</span>
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                className="btn-remove-game"
                                onClick={() => handleRemoveGame(game.name)}
                                title="Quitar juego"
                              >
                                ✕
                              </button>
                            </div>

                            {/* SELECTOR DE MODO DLC */}
                            <div className="game-dlc-section">
                              <div className="dlc-mode-buttons">
                                <button
                                  type="button"
                                  className={`btn-dlc-mode ${game.dlcMode === "base" ? "active" : ""}`}
                                  onClick={() => handleUpdateDlcMode(game.name, "base")}
                                >
                                  🎮 Solo Juego Base
                                </button>
                                <button
                                  type="button"
                                  className={`btn-dlc-mode ${game.dlcMode === "all" ? "active" : ""}`}
                                  onClick={() => handleUpdateDlcMode(game.name, "all")}
                                >
                                  🎁 Juego Base + Todos los DLCs ({game.availableDlcs?.length || 0})
                                </button>
                                {game.availableDlcs && game.availableDlcs.length > 0 && (
                                  <button
                                    type="button"
                                    className={`btn-dlc-mode ${game.dlcMode === "custom" ? "active" : ""}`}
                                    onClick={() => handleUpdateDlcMode(game.name, "custom")}
                                  >
                                    🎯 Elegir DLCs ({game.selectedDlcIds?.length || 0}/{game.availableDlcs.length})
                                  </button>
                                )}
                              </div>

                              {/* CHECKLIST DE DLCS SI ELIGIÓ CUSTOM */}
                              {game.dlcMode === "custom" && game.availableDlcs && game.availableDlcs.length > 0 && (
                                <div className="custom-dlc-picker-box">
                                  <div className="dlc-picker-toolbar">
                                    <span className="dlc-picker-count">
                                      {game.selectedDlcIds?.length || 0} de {game.availableDlcs.length} DLCs seleccionados
                                    </span>
                                    <div className="dlc-picker-quick-actions">
                                      <button
                                        type="button"
                                        onClick={() => handleSelectAllDlcs(game.name, true)}
                                      >
                                        Marcar Todos
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSelectAllDlcs(game.name, false)}
                                      >
                                        Desmarcar
                                      </button>
                                    </div>
                                  </div>

                                  <div className="dlc-checklist-scroll">
                                    {game.availableDlcs.map((dlc) => {
                                      const isChecked = (game.selectedDlcIds || []).includes(dlc.dlc_app_id);
                                      return (
                                        <label
                                          key={dlc.dlc_app_id}
                                          className={`dlc-checkbox-item ${isChecked ? "checked" : ""}`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleToggleDlc(game.name, dlc.dlc_app_id)}
                                          />
                                          <span className="dlc-item-title">{dlc.name}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {game.dlcMode === "all" && (
                                <div className="dlc-status-info">
                                  ✓ Se habilitará el Juego Base junto con todos los{" "}
                                  <strong>{game.availableDlcs?.length || 0} DLCs y expansiones</strong> registrados.
                                </div>
                              )}

                              {game.dlcMode === "base" && (
                                <div className="dlc-status-info base">
                                  ✓ Solo Juego Base estándar (sin paquetes DLC adicionales).
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* DESGLOSE DE CARGOS DE BILLETERA VIRTUAL */}
                {totalWalletRequired > 0 && (
                  <div className="dist-wallet-cost-breakdown">
                    <div className="breakdown-header">
                      <div className="breakdown-title">
                        <Wallet size={16} color="#34d399" />
                        <span>Cargos a tu Billetera Virtual:</span>
                      </div>
                      <strong className="breakdown-total">{displayPrice(totalWalletRequired)}</strong>
                    </div>

                    <div className="breakdown-rows">
                      {isAllAccess && (
                        <div className="breakdown-row">
                          <span>🌟 Catálogo Completo All-Access:</span>
                          <span>$10.000 CLP</span>
                        </div>
                      )}
                      {selectedGamesWithCode.length > 0 &&
                        selectedGamesWithCode.map((g) => (
                          <div key={g.name} className="breakdown-row">
                            <span>
                              {g.activationIcon || "🔑"} {g.name}{" "}
                              <small style={{ color: "#94a3b8" }}>
                                ({g.activationType === "ea" ? "EA Games" : g.activationType === "ubisoft" ? "Ubisoft" : "Código Denuvo"})
                              </small>
                              :
                            </span>
                            <span>+{displayPrice(g.activationPrice || 1000)}</span>
                          </div>
                        ))}
                    </div>

                    <div className="breakdown-status-bar">
                      <span>
                        Tu saldo actual: <strong>{displayPrice(walletBalance)}</strong>
                      </span>
                      {walletBalance >= totalWalletRequired ? (
                        <span className="status-sufficient">✓ Saldo suficiente</span>
                      ) : (
                        <div className="status-deficit-wrap">
                          <span className="status-deficit">
                            Saldo insuficiente (faltan {displayPrice(totalWalletRequired - walletBalance)})
                          </span>
                          <button
                            type="button"
                            className="btn-quick-recharge-inline"
                            onClick={() =>
                              handleOpenPurchase("recharge_wallet", {
                                id: "recharge",
                                name: "Recarga de Billetera Virtual",
                                price: Math.max(10000, totalWalletRequired - walletBalance),
                                label: "Recarga de Saldo Billetera"
                              })
                            }
                          >
                            <PlusCircle size={13} /> Recargar Billetera
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="dist-btn-submit"
                  disabled={
                    submittingKey ||
                    remainingKeys <= 0 ||
                    (totalWalletRequired > 0 && walletBalance < totalWalletRequired)
                  }
                >
                  {submittingKey ? "Generando Clave..." : "🚀 Generar Clave de Activación"}
                </button>
              </form>
            </div>

            {/* COLUMNA 2: TABLA DE CLAVES EMITIDAS */}
            <div className="dist-card dist-table-card">
              <div className="dist-table-header">
                <div>
                  <h2 className="dist-card-title">
                    <Key size={20} color="#34d399" /> Claves Emitidas ({licenses.length})
                  </h2>
                  <p className="dist-card-desc">Historial de licencias de tus clientes.</p>
                </div>
                <div className="dist-table-search">
                  <Search size={16} color="#94a3b8" />
                  <input
                    type="text"
                    placeholder="Buscar clave o cliente..."
                    value={searchLicense}
                    onChange={(e) => setSearchLicense(e.target.value)}
                  />
                </div>
              </div>

              <div className="dist-table-scroll">
                <table className="dist-table">
                  <thead>
                    <tr>
                      <th>Clave</th>
                      <th>Cliente</th>
                      <th>Juegos</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licenses
                      .filter((lic) => {
                        if (!searchLicense) return true;
                        const term = searchLicense.toLowerCase();
                        return (
                          lic.key.toLowerCase().includes(term) ||
                          (lic.client_email || "").toLowerCase().includes(term) ||
                          (lic.client_name || "").toLowerCase().includes(term)
                        );
                      })
                      .map((lic) => (
                        <tr key={lic.id}>
                          <td>
                            <div className="dist-key-cell">
                              <code>{lic.key}</code>
                              <button
                                className="btn-copy-icon"
                                onClick={() => handleCopyKey(lic.key)}
                                title="Copiar Clave"
                              >
                                {copiedKey === lic.key ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </td>
                          <td>
                            <strong>{lic.client_name || lic.client_email}</strong>
                            <div className="text-sub">{lic.client_email}</div>
                          </td>
                          <td>
                            {lic.isAllAccess ? (
                              <span className="badge-all-access">🌟 All-Access (+70.000)</span>
                            ) : Array.isArray(lic.game_configs) && lic.game_configs.length > 0 ? (
                              <div className="table-game-configs-list">
                                {lic.game_configs.map((gc) => (
                                  <div key={gc.name} className="table-game-config-item">
                                    <span className="table-game-name">• {gc.name}</span>
                                    {gc.dlc_mode === "all" && (
                                      <span className="table-dlc-badge all">Todos los DLCs</span>
                                    )}
                                    {gc.dlc_mode === "custom" && (
                                      <span className="table-dlc-badge custom">
                                        +{gc.selected_dlcs?.length || 0} DLCs
                                      </span>
                                    )}
                                    {gc.requires_code && (
                                      <span className="table-code-icon" title="Requiere Código de Activación">
                                        🔑
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="badge-games">{lic.allowed_games?.length || 1} juego(s)</span>
                            )}
                          </td>
                          <td>
                            <span className={`pill-status status-${lic.status}`}>
                              {lic.status === "active" ? "Activa" : lic.status === "suspended" ? "Pausada" : "Revocada"}
                            </span>
                          </td>
                          <td>
                            <div className="dist-action-buttons">
                              <button
                                className="btn-wsp"
                                onClick={() => handleCopyWspMessage(lic)}
                                title="Copiar mensaje formateado para enviar por WhatsApp"
                              >
                                {copiedWsp === lic.id ? (
                                  <>
                                    <Check size={14} /> ¡Copiado!
                                  </>
                                ) : (
                                  <>
                                    <Copy size={14} /> Copiar WhatsApp
                                  </>
                                )}
                              </button>

                              <button
                                className={`btn-toggle-status ${lic.status === "active" ? "pause" : "resume"}`}
                                onClick={() => handleToggleLicenseStatus(lic)}
                                title={lic.status === "active" ? "Pausar clave" : "Reactivar clave"}
                              >
                                {lic.status === "active" ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {licenses.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-muted">
                          Aún no has emitido claves este mes. ¡Genera la primera arriba!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL DE COMPRA UNIVERSAL: PLAN, CLAVES EXTRAS O RECARGA DE BILLETERA
          (Soporta Mercado Pago, Transferencia Bancaria y Saldo Billetera)
          ════════════════════════════════════════════════════════════════════════ */}
      {purchaseModalOpen && purchaseTarget && (
        <div className="dist-modal-overlay" onClick={() => setPurchaseModalOpen(false)}>
          <div className="dist-modal-card dist-payment-modal" onClick={(e) => e.stopPropagation()}>
            <button className="dist-modal-close" onClick={() => setPurchaseModalOpen(false)}>
              ✕
            </button>

            <div className="modal-icon-header">
              {purchaseTarget.type === "plan" ? (
                <Crown size={32} color="#f59e0b" />
              ) : purchaseTarget.type === "recharge_wallet" ? (
                <Wallet size={32} color="#34d399" />
              ) : (
                <Zap size={32} color="#38bdf8" />
              )}
            </div>

            <h3 className="modal-title">
              {purchaseTarget.type === "plan"
                ? `Contratar ${purchaseTarget.item.name}`
                : purchaseTarget.type === "recharge_wallet"
                ? "Recargar Billetera Virtual"
                : `Comprar ${purchaseTarget.item.label}`}
            </h3>
            <p className="modal-sub">
              {purchaseTarget.type === "plan"
                ? `Recibirás ${purchaseTarget.item.baseQuota} claves mensuales listas para emitir.`
                : purchaseTarget.type === "recharge_wallet"
                ? "Abona saldo a tu cuenta para emitir All-Access y Juegos con Códigos de Activación."
                : `Se agregarán ${purchaseTarget.item.count} claves extras a tu cupo de este mes.`}
            </p>

            {/* SELECTOR DE MONTO PARA RECARGA DE BILLETERA */}
            {purchaseTarget.type === "recharge_wallet" && (
              <div className="recharge-amount-picker">
                <label className="recharge-picker-label" htmlFor="portal-recharge-amount">
                  Monto a recargar {paymentMethod === "crypto" ? "en USDT" : "en CLP"}
                </label>
                <div className="recharge-custom-amount">
                  <span aria-hidden="true">{paymentMethod === "crypto" ? "₮" : "$"}</span>
                  <input
                    id="portal-recharge-amount"
                    type="number"
                    min={paymentMethod === "crypto" ? 10 : 5000}
                    step={paymentMethod === "crypto" ? "1" : "1000"}
                    inputMode="numeric"
                    value={rechargeDisplayAmount}
                    onChange={(event) => setRechargeDisplayAmount(event.target.value)}
                    placeholder={paymentMethod === "crypto" ? "50" : "15000"}
                    aria-describedby="portal-recharge-help"
                  />
                  <span className="recharge-custom-currency">{paymentMethod === "crypto" ? "USDT" : "CLP"}</span>
                </div>
                <p id="portal-recharge-help" className="recharge-picker-help">
                  {paymentMethod === "crypto"
                    ? `Mínimo 10 USDT. Se acreditarán $${(Number(rechargeDisplayAmount || 0) * Number(valorDolar || 900)).toLocaleString("es-CL")} CLP netos a tu Billetera Virtual (1 USDT = $${valorDolar || 900} CLP).`
                    : "Mínimo $5.000 CLP. El saldo se acredita 100% neto a tu Billetera Virtual."}
                </p>
                <div className="recharge-options-grid">
                  {(paymentMethod === "crypto"
                    ? [
                        { val: 10, label: "10 USDT" },
                        { val: 25, label: "25 USDT" },
                        { val: 50, label: "50 USDT", rec: true },
                        { val: 100, label: "100 USDT" }
                      ]
                    : [
                        { val: 5000, label: "$5.000" },
                        { val: 15000, label: "$15.000", rec: true },
                        { val: 30000, label: "$30.000" },
                        { val: 75000, label: "$75.000" }
                      ]
                  ).map((chip) => (
                    <button
                      key={chip.val}
                      type="button"
                      className={`btn-recharge-chip ${Number(rechargeDisplayAmount) === chip.val ? "active" : ""}`}
                      onClick={() => setRechargeDisplayAmount(String(chip.val))}
                    >
                      <span className="recharge-chip-val">{chip.label}</span>
                      {chip.rec && <span className="recharge-chip-rec">Recomendado</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* RESUMEN DE PAGO */}
            <div className="payment-summary-box">
              <div className="summary-row">
                <span>Total a Pagar:</span>
                <span className="summary-price">
                  {purchaseTarget.type === "recharge_wallet"
                    ? displayRechargeInput(rechargeDisplayAmount)
                    : (paymentMethod === "crypto"
                        ? `${roundUpUSD(selectedPaymentAmount / Number(valorDolar || 900)).toFixed(2)} USDT`
                        : `$${Math.round(selectedPaymentAmount).toLocaleString("es-CL")} CLP`)}
                </span>
              </div>
            </div>

            {/* SELECTOR DE MÉTODO DE PAGO */}
            <div className="payment-tabs-selector">
              {isChile && paymentSettings.mercadoPago.enabled && (
                <button
                  type="button"
                  className={`payment-tab-btn ${paymentMethod === "mercadopago" ? "active" : ""}`}
                  onClick={() => handleSelectPaymentMethod("mercadopago")}
                >
                  <CreditCard size={16} />
                  <span>Tarjeta débito / crédito (Chile) · hasta 12 cuotas</span>
                </button>
              )}

              {isChile && paymentSettings.transfer.enabled && visibleForUser(paymentSettings.transfer, userData) && (
                <button
                  type="button"
                  className={`payment-tab-btn ${paymentMethod === "transferencia" ? "active" : ""}`}
                  onClick={() => handleSelectPaymentMethod("transferencia")}
                >
                  <Building2 size={16} />
                  <span>Transferencia Bancaria (Chile)</span>
                </button>
              )}
              {supportsCrypto && paymentSettings.crypto.enabled && paymentSettings.crypto.address && visibleForUser(paymentSettings.crypto, userData) && (
                <button
                  type="button"
                  className={`payment-tab-btn ${paymentMethod === "crypto" ? "active" : ""}`}
                  onClick={() => handleSelectPaymentMethod("crypto")}
                >
                  <Wallet size={16} />
                  <span>{paymentSettings.crypto.name} (USDT)</span>
                </button>
              )}
              {purchaseTarget.type !== "recharge_wallet" && (
                <button
                  type="button"
                  className={`payment-tab-btn ${paymentMethod === "billetera" ? "active" : ""}`}
                  onClick={() => handleSelectPaymentMethod("billetera")}
                >
                  <Wallet size={16} />
                  <span>Billetera Virtual</span>
                </button>
              )}
            </div>

            {/* FEEDBACK DEL PROCESO */}
            {paymentFeedback.msg && (
              <div
                className={`payment-feedback-alert ${
                  paymentFeedback.type === "success" ? "alert-success" : "alert-error"
                }`}
              >
                {paymentFeedback.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span>{paymentFeedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleExecutePayment}>
              {/* VISTA 1: MERCADO PAGO */}
              {paymentMethod === "mercadopago" && (
                <div className="payment-content-view">
                  <div className="mp-badge-notice">
                    <Sparkles size={16} color="#009ee3" />
                    <span>Pago 100% Automático e Inmediato</span>
                  </div>
                  <p className="view-help-text">
                    Paga de forma segura con tarjeta de débito o crédito chilena, con hasta 12 cuotas. Al finalizar, tu cuenta se actualizará de inmediato.
                  </p>
                  <button type="submit" className="btn-confirm-payment mp-btn" disabled={paymentSubmitting}>
                    {paymentSubmitting ? "Conectando..." : "💳 Pagar con tarjeta"}
                  </button>
                </div>
              )}

              {/* VISTA 2: TRANSFERENCIA BANCARIA */}
              {paymentMethod === "transferencia" && (() => {
                const visibleBanks = visibleBankAccounts(paymentSettings, userData).map((b) => ({ ...b, banco: b.name, tipo: b.type, titular: b.holder, numero: b.number, badge: b.type || "Cuenta oficial" }));
                const activeBank = visibleBanks.find((b) => b.id === selectedBankId) || visibleBanks[0];
                if (!activeBank) return <div className="payment-content-view">No hay cuentas bancarias habilitadas para tu tipo de usuario.</div>;
                const isAllCopied = copiedAccountField === `all_${activeBank.id}`;

                return (
                  <div className="payment-content-view">
                    <p className="view-help-text">
                      Transfiere <strong>{displayPrice(selectedPaymentAmount)}</strong> a la cuenta seleccionada y adjunta el comprobante para activación inmediata:
                    </p>

                    {/* SELECTOR DE BANCO LIMPIO EN PESTAÑAS (SIN DUPLICADOS) */}
                    <div className="bank-pills-selector">
                      {visibleBanks.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          className={`bank-pill-btn ${selectedBankId === b.id ? "active" : ""}`}
                          onClick={() => setSelectedBankId(b.id)}
                          style={{
                            "--bank-color": b.color
                          }}
                        >
                          <img className="bank-pill-logo" src={b.logo} alt="" aria-hidden="true" />
                          <span className="bank-pill-name">{b.banco}</span>
                          <span className="bank-pill-badge">{b.badge}</span>
                        </button>
                      ))}
                    </div>

                    {/* TARJETA ELEGANTE ÚNICA DEL BANCO SELECCIONADO */}
                    <div className="active-bank-card" style={{ borderColor: `${activeBank.color}55` }}>
                      <div className="active-bank-header">
                        <div className="active-bank-title-wrap">
                          <div className="bank-avatar-icon" style={{ background: `${activeBank.color}20`, color: activeBank.color }}>
                            <img className="active-bank-logo" src={activeBank.logo} alt={`Logo ${activeBank.banco}`} />
                          </div>
                          <div>
                            <strong className="active-bank-name" style={{ color: activeBank.color }}>
                              {activeBank.banco}
                            </strong>
                            <span className="active-bank-type">{activeBank.tipo}</span>
                          </div>
                        </div>
                        <span className="active-bank-badge" style={{ backgroundColor: `${activeBank.color}20`, color: activeBank.color }}>
                          {activeBank.badge}
                        </span>
                      </div>

                      <div className="active-bank-fields">
                        <div className="active-bank-row">
                          <span className="row-label">Titular:</span>
                          <span className="row-val">{activeBank.titular}</span>
                        </div>

                        <div className="active-bank-row">
                          <span className="row-label">RUT:</span>
                          <code className="row-val">{activeBank.rut}</code>
                        </div>

                        <div className="active-bank-row">
                          <span className="row-label">N° Cuenta:</span>
                          <code className="row-val">{activeBank.numero}</code>
                        </div>

                        <div className="active-bank-row">
                          <span className="row-label">Correo:</span>
                          <code className="row-val">{activeBank.email}</code>
                        </div>

                        <div className="active-bank-row highlight-amount-row">
                          <span className="row-label">Monto a Transferir:</span>
                          <div style={{ textAlign: "right" }}>
                            <span className="row-val-amount">${Number(selectedPaymentAmount).toLocaleString("es-CL")} CLP</span>
                            {infoPais?.moneda !== "CLP" && (
                              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                                ≈ {displayPrice(selectedPaymentAmount)} (Referencial)
                              </div>
                            )}
                          </div>
                        </div>

                        {infoPais?.moneda !== "CLP" && (
                          <div style={{ fontSize: "0.74rem", color: "#fbbf24", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, padding: "6px 10px", marginTop: 8 }}>
                            ⚠️ <strong>Atención cuentas de Chile:</strong> Esta cuenta bancaria recibe exclusivamente <strong>Pesos Chilenos (CLP)</strong>. Si estás en el extranjero, te recomendamos pagar con <strong>Crypto (USDT)</strong> para evitar diferencias de tipo de cambio bancario.
                          </div>
                        )}
                      </div>

                      {/* BOTÓN GENERAL TIPO MERCADO PAGO: COPIA TODOS LOS DATOS EN 1 CLICK */}
                      <button
                        type="button"
                        className={`btn-copy-all-bank-data ${isAllCopied ? "copied" : ""}`}
                        onClick={() => handleCopyAllBankData(activeBank)}
                      >
                        {isAllCopied ? (
                          <>
                            <Check size={16} /> ¡Todos los datos copiados al portapapeles!
                          </>
                        ) : (
                          <>
                            <Copy size={16} /> Copiar todos los datos de transferencia
                          </>
                        )}
                      </button>
                    </div>

                    {/* SUBIDA DE COMPROBANTE CON DROPZONE ELEGANTE */}
                    <div className="voucher-upload-box">
                      <label className="voucher-label">
                        <Upload size={15} color="#38bdf8" /> Adjuntar Comprobante de Transferencia *
                      </label>
                      <div className="voucher-dropzone" onClick={() => document.getElementById("dist-voucher-input")?.click()}>
                        <input
                          id="dist-voucher-input"
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => setVoucherFile(e.target.files[0] || null)}
                          style={{ display: "none" }}
                          required
                        />
                        {voucherFile ? (
                          <div className="voucher-file-chosen">
                            <CheckCircle2 size={24} color="#34d399" />
                            <div className="voucher-file-info">
                              <span className="voucher-file-name">{voucherFile.name}</span>
                              <span className="voucher-file-size">
                                {(voucherFile.size / 1024).toFixed(1)} KB • Listo para enviar
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn-remove-voucher"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVoucherFile(null);
                                const inp = document.getElementById("dist-voucher-input");
                                if (inp) inp.value = "";
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="voucher-dropzone-prompt">
                            <Upload size={22} color="#94a3b8" />
                            <span className="dropzone-text">
                              Haz clic aquí para seleccionar tu comprobante (PNG, JPG o PDF)
                            </span>
                            <span className="dropzone-sub">Captura de pantalla o comprobante bancario</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn-confirm-payment transfer-btn"
                      disabled={paymentSubmitting || !voucherFile}
                    >
                      {paymentSubmitting ? "Enviando Comprobante..." : "📤 Enviar Comprobante y Activar"}
                    </button>
                  </div>
                );
              })()}



              {paymentMethod === "crypto" && (() => {
                const usdtMonto = purchaseTarget.type === "recharge_wallet"
                  ? (Number(rechargeDisplayAmount) || 0)
                  : roundUpUSD(selectedPaymentAmount / Number(valorDolar || 900));
                const clpEquivalente = purchaseTarget.type === "recharge_wallet"
                  ? Math.round(usdtMonto * Number(valorDolar || 900))
                  : selectedPaymentAmount;
                return (
                  <div className="payment-content-view">
                    <p className="view-help-text">
                      <b>Criptomoneda (USDT)</b><br/>
                      Moneda: {paymentSettings.crypto.name} · Red: {paymentSettings.crypto.network}<br/>
                      <code style={{ wordBreak: "break-all" }}>Dirección: {paymentSettings.crypto.address}</code><br/>
                      <strong style={{ color: "#5eead4", fontSize: "1.05rem", display: "block", marginTop: 8 }}>
                        Monto exacto a enviar: {usdtMonto.toFixed(2)} USDT<br/>
                        <span style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 500 }}>
                          (Equivalente a ${Number(clpEquivalente).toLocaleString("es-CL")} CLP netos al dólar administrativo ${valorDolar || 900})
                        </span>
                      </strong>
                    </p>
                    <button type="button" className="btn-copy-all-bank-data" onClick={() => navigator.clipboard.writeText(paymentSettings.crypto.address)}>
                      Copiar dirección {paymentSettings.crypto.name}
                    </button>
                    <label className={`voucher-label crypto-voucher-label ${voucherFile ? "has-file" : ""}`}>
                      <span className="crypto-voucher-copy">
                        {voucherFile ? <CheckCircle2 size={17} /> : <Upload size={17} />}
                        <span>
                          <strong>{voucherFile ? "Comprobante listo" : "Adjuntar comprobante de pago"}</strong>
                          <small>{voucherFile ? voucherFile.name : "PNG, JPG, WEBP o PDF · Máx. 10 MB"}</small>
                        </span>
                      </span>
                      <span className="crypto-file-picker">{voucherFile ? "Cambiar archivo" : "Seleccionar archivo"}</span>
                      <input type="file" accept="image/*,application/pdf" onChange={(e) => setVoucherFile(e.target.files[0] || null)} required />
                    </label>
                    <button type="submit" className="btn-confirm-payment crypto-btn" disabled={paymentSubmitting || !voucherFile}>
                      {paymentSubmitting ? "Enviando comprobante…" : voucherFile ? "Enviar comprobante a revisión" : "Adjunta un comprobante para continuar"}
                    </button>
                  </div>
                );
              })()}

              {/* VISTA 3: BILLETERA VIRTUAL */}
              {paymentMethod === "billetera" && (
                <div className="payment-content-view">
                  <div className="wallet-balance-box">
                    <span>Tu Saldo Disponible:</span>
                    <strong style={{ color: walletBalance >= purchaseTarget.item.price ? "#34d399" : "#ef4444" }}>
                      {displayPrice(walletBalance)}
                    </strong>
                  </div>

                  {walletBalance < purchaseTarget.item.price ? (
                    <div className="wallet-insufficient-notice">
                      <AlertCircle size={16} />
                      <span>
                        Tu saldo es insuficiente para cubrir {displayPrice(purchaseTarget.item.price)}. Puedes elegir otro método o recargar tu billetera.
                      </span>
                      <button
                        type="button"
                        className="wallet-recharge-now-btn"
                        onClick={() => {
                          const missingAmount = Math.max(5000, Number(purchaseTarget.item.price || 0) - walletBalance);
                          setPurchaseTarget({ type: "recharge_wallet", item: { price: missingAmount } });
                          setPaymentMethod(isChile ? "transferencia" : "crypto");
                          setVoucherFile(null);
                          setPaymentFeedback({ type: null, msg: "" });
                        }}
                      >
                        <Wallet size={16} /> Agregar saldo ahora
                      </button>
                    </div>
                  ) : (
                    <p className="view-help-text">
                      El monto será debitado inmediatamente de tu Billetera Virtual y tu plan o cuota se acreditará al instante.
                    </p>
                  )}

                  <button
                    type="submit"
                    className="btn-confirm-payment wallet-btn"
                    disabled={paymentSubmitting || walletBalance < purchaseTarget.item.price}
                  >
                    {paymentSubmitting ? "Procesando..." : "⚡ Activar Ahora con Saldo"}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
      {paymentResult && (
        <div className="dist-payment-result-overlay" role="dialog" aria-modal="true" aria-labelledby="payment-result-title">
          <div className={`dist-payment-result-card ${paymentResult.type}`}>
            <div className="dist-payment-result-icon">
              {paymentResult.type === "success" ? <CheckCircle2 size={34} /> : <Clock size={34} />}
            </div>
            <h3 id="payment-result-title">{paymentResult.title}</h3>
            <p>{paymentResult.message}</p>
            <button type="button" onClick={() => setPaymentResult(null)}>
              Entendido
            </button>
          </div>
        </div>
      )}
      {pendingPaymentWarning && (
        <div className="dist-payment-result-overlay" role="dialog" aria-modal="true" aria-labelledby="pending-payment-title">
          <div className="dist-payment-result-card review">
            <div className="dist-payment-result-icon"><AlertCircle size={34} /></div>
            <h3 id="pending-payment-title">Ya tienes un pago en revisión</h3>
            <p>Detectamos un comprobante pendiente de validación. ¿Estás seguro de que deseas continuar con otro pago?</p>
            <div className="dist-pending-payment-actions">
              <button type="button" className="dist-support-payment-btn" onClick={() => navigate("/soporte")}><MessageCircle size={17} /> Contactar soporte</button>
              <button type="button" onClick={() => { setPendingPaymentWarning(false); setPendingPaymentConfirmed(true); setPurchaseModalOpen(true); }}>Sí, continuar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
