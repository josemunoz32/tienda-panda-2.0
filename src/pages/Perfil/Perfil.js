import { notifyNewResellerApplication, notifyNewWalletRecharge } from "../../utils/telegramNotifications";
import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db, storage } from "../../firebase";
import { doc, getDoc, setDoc, collection, getDocs, orderBy, query, addDoc, where, onSnapshot } from "firebase/firestore";
import { updateProfile, sendPasswordResetEmail, signOut } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Cropper from "react-easy-crop";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Package,
  Award,
  LogOut,
  Camera,
  Edit3,
  KeyRound,
  Copy,
  Check,
  ExternalLink,
  Gift,
  Clock,
  CheckCircle2,
  AlertCircle,
  Gamepad2,
  Sparkles,
  Lock,
  ChevronRight,
  ShoppingBag,
  Star,
  RefreshCw,
  Wallet,
  DollarSign,
  UploadCloud,
  Send,
  MessageCircle,
  Search,
  CreditCard,
  Building2,
  X
} from "lucide-react";
import "./Perfil.css";
import pandaIcon from "../../assets/logos/miicono.png";
import wspLogo from "../../assets/logos/logowsp.png";
import switchImg from "../../assets/categorias y prom,o/switch.png";
import psnImg from "../../assets/categorias y prom,o/psn.png";
import steamImg from "../../assets/logos/logosteam.png";
import suscripcionesImg from "../../assets/categorias y prom,o/suscripciones.png";
import streamingImg from "../../assets/logos/streaming.png";
import ps5Img from "../../assets/logos/ps5.png";
import ps4Img from "../../assets/logos/ps4.png";
import PandaModalAlert from "../../components/PandaModalAlert/PandaModalAlert";
import { getGamerLevel, GAMER_LEVELS } from "../../utils/gamerLevel";
import { getOrCreateReferralCode, buildReferralLink, getReferralStats } from "../../utils/referralHelper";
import { getUserRoleLabels, hasResellerBenefits, hasSteamDistributorAccess, hasB2BAccess, isSuperAdmin } from "../../utils/userRoles";
import { DEFAULT_PAYMENT_SETTINGS, normalizePaymentSettings, PAYMENT_SETTINGS_DOC, validatePaymentProofFile, visibleBankAccounts, visibleForUser } from "../../utils/paymentMethods";
import { useMoneda, roundUpUSD } from "../../context/MonedaContext";
import { catUrl } from "../../utils/slugify";

const BANCOS_OFICIALES = [
  {
    id: 'mercadopago',
    nombre: 'Mercado Pago',
    tipo: 'Cuenta Vista',
    titular: 'José Roberto Muñoz Osses',
    rut: '21.715.187-2',
    numero: '1095508563',
    email: 'comprobantesswitch2@gmail.com',
    color: '#009ee3',
    badge: 'Acreditación Rápida',
    logo: '/logos%20bancos/mercadopago.jpg'
  },
  {
    id: 'estado',
    nombre: 'BancoEstado',
    tipo: 'Cuenta RUT / Cuenta Vista',
    titular: 'Matías Muñoz',
    rut: '236326845',
    numero: '236326845',
    email: 'comprobantesswitch2@gmail.com',
    color: '#f5941d',
    badge: 'Cuenta RUT',
    logo: '/logos%20bancos/banco%20estado.png'
  },
  {
    id: 'santander',
    nombre: 'Banco Santander',
    tipo: 'Cuenta Corriente',
    titular: 'Jose Roberto Muñoz Osses',
    rut: '21.715.187-2',
    numero: '0 000 97 74931 0',
    email: 'comprobantesswitch2@gmail.com',
    color: '#ec1c24',
    badge: 'Cuenta Corriente',
    logo: '/logos%20bancos/santander.png'
  }
];

// Helper image cropper
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (err) => reject(err));
    img.setAttribute("crossOrigin", "anonymous");
    img.src = url;
  });

const getCroppedImg = async (file, crop) => {
  const image = await createImage(URL.createObjectURL(file));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = crop.width;
  canvas.height = crop.height;

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No se pudo recortar la imagen."));
        return;
      }
      resolve(blob);
    }, "image/jpeg", 0.9);
  });
};

export default function Perfil({ user: propUser }) {
  const { infoPais, formatearPrecio, convertirDesdeCLP, tasas, valorDolar, isReseller: isResellerCtx } = useMoneda();
  const isChile = infoPais?.codigo === "CL";
  const supportsCrypto = true;
  const displayPrice = (amountCLP) => formatearPrecio(Number(amountCLP) || 0);
  const rechargeInputToCLP = (amount, method = null) => {
    const value = Number(amount) || 0;
    const activeMethod = method || rechargePaymentMethod;
    if (activeMethod === "crypto") {
      return Math.round(value * Number(valorDolar || 900));
    }
    return Math.round(value);
  };
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(propUser || auth.currentUser);
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("datos"); // datos, pedidos, seguridad, beneficios, referidos

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get("tab") === "billetera") setActiveTab("billetera");
    if (query.get("recharge") === "1") setIsRechargeModalOpen(true);
  }, [location.search]);

  // Referidos
  const [referralCode, setReferralCode] = useState("");
  const [referralStats, setReferralStats] = useState({ total: 0, completed: 0, credits: 0, referrals: [] });
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [loadingReferral, setLoadingReferral] = useState(false);

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
  });
  const [savingData, setSavingData] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [saveErrorMsg, setSaveErrorMsg] = useState("");

  // Photo cropper state
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Key copy state
  const [copiedKey, setCopiedKey] = useState(null);

  // Password reset email state
  const [pwdResetSent, setPwdResetSent] = useState(false);
  const [pwdResetLoading, setPwdResetLoading] = useState(false);

  // Billetera Virtual (Revendedores)
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [rechargeMsg, setRechargeMsg] = useState("");
  const [rechargeBanco, setRechargeBanco] = useState("Mercado Pago (Cuenta Vista)");
  const [rechargeFile, setRechargeFile] = useState(null);
  const [rechargeUploading, setRechargeUploading] = useState(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [rechargePaymentMethod, setRechargePaymentMethod] = useState(() => {
    return isChile ? "mercadopago" : "crypto";
  });
  const [mpLoading, setMpLoading] = useState(false);
  const [copiedBankIndex, setCopiedBankIndex] = useState(null);
  const [walletBankId, setWalletBankId] = useState("mercadopago");
  const [paymentSettings, setPaymentSettings] = useState(DEFAULT_PAYMENT_SETTINGS);
  const [b2bCategories, setB2bCategories] = useState([]);
  const isCommercialProfile = hasResellerBenefits(profile) || hasSteamDistributorAccess(profile);
  const referralsAvailable = !isCommercialProfile;
  const walletBanks = visibleBankAccounts(paymentSettings, profile).map((account) => ({ id: account.id, nombre: account.name, tipo: account.type, titular: account.holder, rut: account.rut, numero: account.number, email: account.email, logo: account.logo, color: account.color || '#a259ff', badge: account.type || 'Cuenta oficial' }));
  const activeWalletBank = walletBanks.find((bank) => bank.id === walletBankId) || walletBanks[0];

  const handleSelectRechargeMethod = (method) => {
    if (method === "crypto" && rechargePaymentMethod !== "crypto") {
      const cur = Number(rechargeAmount) || 15000;
      const usdt = cur >= 500 ? Math.max(10, Math.round(cur / Number(valorDolar || 900))) : 50;
      setRechargeAmount(String(usdt));
      setRechargeBanco(`${paymentSettings.crypto?.name || "USDT"} (${paymentSettings.crypto?.network || "BEP20"})`);
    } else if (method !== "crypto" && rechargePaymentMethod === "crypto") {
      const cur = Number(rechargeAmount) || 50;
      const clp = cur < 500 ? Math.max(5000, Math.round(cur * Number(valorDolar || 900))) : 15000;
      setRechargeAmount(String(clp));
      if (method === "transferencia") {
        setRechargeBanco(activeWalletBank?.nombre || "Transferencia bancaria");
      } else {
        setRechargeBanco("Mercado Pago (Cuenta Vista)");
      }
    }
    setRechargePaymentMethod(method);
  };

  useEffect(() => {
    if (!isChile && rechargePaymentMethod === "mercadopago") {
      setRechargePaymentMethod("crypto");
    }
  }, [isChile, rechargePaymentMethod]);

  useEffect(() => onSnapshot(doc(db, ...PAYMENT_SETTINGS_DOC), (snap) => {
    setPaymentSettings(normalizePaymentSettings(snap.exists() ? snap.data() : {}));
  }, () => {}), []);

  useEffect(() => {
    getDocs(collection(db, "categories"))
      .then((snapshot) => setB2bCategories(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))))
      .catch(() => setB2bCategories([]));
  }, []);

  // Postulación a Revendedor
  const [solicitudRevendedor, setSolicitudRevendedor] = useState(null);
  const [postularForm, setPostularForm] = useState({
    whatsapp: ""
  });
  const [postularLoading, setPostularLoading] = useState(false);
  const [postularMsg, setPostularMsg] = useState("");

  // Custom Modal Alert / Confirm (replaces browser alerts)
  const [modalAlert, setModalAlert] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    confirmText: "Aceptar",
    cancelText: "Cancelar",
    danger: false,
    onConfirm: null,
    onCancel: null,
  });

  const showAlert = ({ type = "info", title, message, confirmText = "Aceptar", onConfirm }) => {
    setModalAlert({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText: "Cancelar",
      danger: false,
      onConfirm: () => {
        setModalAlert(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: null,
    });
  };

  const showConfirm = ({ title, message, confirmText = "Confirmar", cancelText = "Cancelar", danger = false, onConfirm }) => {
    setModalAlert({
      isOpen: true,
      type: "confirm",
      title,
      message,
      confirmText,
      cancelText,
      danger,
      onConfirm: () => {
        setModalAlert(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: () => setModalAlert(prev => ({ ...prev, isOpen: false })),
    });
  };

  // Load user & profile data
  useEffect(() => {
    let isMounted = true;
    const failsafeTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 3500);

    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      const activeUser = currentUser || propUser;
      if (isMounted) setUser(activeUser);

      if (!activeUser) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        // Fetch user document from Firestore
        const userDocSnap = await getDoc(doc(db, "users", activeUser.uid));
        const data = userDocSnap.exists() ? userDocSnap.data() : {};

        const fullProfile = {
          displayName: data.displayName || activeUser.displayName || "Gamer Panda",
          email: activeUser.email || "",
          phoneNumber: data.phoneNumber || activeUser.phoneNumber || "",
          photoURL: activeUser.photoURL || data.photoURL || "",
          pandaPoints: typeof data.pandaPoints === "number" ? data.pandaPoints : 50,
          role: data.role || "user",
          resellerStatus: data.resellerStatus || "",
          steam_distributor: data.steam_distributor === true,
          distributor_plan: data.distributor_plan || "",
          custom_quota: data.custom_quota,
          extra_keys: data.extra_keys,
          wallet_balance: Number(data.wallet_balance) || 0,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          createdAt: data.createdAt || null,
        };

        setProfile(fullProfile);
        setFormData({
          displayName: fullProfile.displayName,
          firstName: fullProfile.firstName,
          lastName: fullProfile.lastName,
          phoneNumber: fullProfile.phoneNumber,
        });
        setPostularForm({
          whatsapp: fullProfile.phoneNumber || "",
        });

        // Escuchar saldo de billetera y cambios de rol en tiempo real
        onSnapshot(doc(db, "users", activeUser.uid), (snap) => {
          if (snap.exists()) {
            const fresh = snap.data();
            setProfile(prev => ({
              ...prev,
              role: fresh.role || "user",
              resellerStatus: fresh.resellerStatus || "",
              steam_distributor: fresh.steam_distributor === true,
              distributor_plan: fresh.distributor_plan || "",
              custom_quota: fresh.custom_quota,
              extra_keys: fresh.extra_keys,
              wallet_balance: Number(fresh.wallet_balance) || 0
            }));
          }
        });

        // Verificar si tiene postulación a revendedor
        try {
          const solSnap = await getDocs(query(collection(db, "solicitudes_revendedores"), where("userId", "==", activeUser.uid)));
          if (!solSnap.empty) {
            setSolicitudRevendedor(solSnap.docs[0].data());
          }
        } catch (e) {
          console.warn("No se pudo verificar solicitudes:", e);
        }

        // Si es revendedor, cargar transacciones de billetera
        if (hasB2BAccess(data)) {
          try {
            const wSnap = await getDocs(query(collection(db, "wallet_transactions"), where("userId", "==", activeUser.uid), orderBy("createdAt", "desc")));
            setWalletTransactions(wSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          } catch (e) {
            console.warn("No se pudieron cargar transacciones de billetera:", e);
          }
        }

        // Fetch customer orders
        try {
          const ordersSnap = await getDocs(
            collection(db, `users/${activeUser.uid}/orders`)
          );
          const list = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          // Sort by date newest first
          list.sort((a, b) => {
            const timeA = new Date(a.fecha || 0).getTime();
            const timeB = new Date(b.fecha || 0).getTime();
            return timeB - timeA;
          });
          setOrders(list);
        } catch (e) {
          console.warn("No se pudieron cargar pedidos del usuario:", e);
        }
      } catch (err) {
        console.error("Error al cargar perfil:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(failsafeTimer);
      unsub();
    };
  }, [propUser]);

  // Cargar datos de referidos al abrir ese tab
  useEffect(() => {
    if (referralsAvailable && activeTab === 'referidos' && user?.uid) {
      setLoadingReferral(true);
      Promise.all([
        getOrCreateReferralCode(user.uid),
        getReferralStats(user.uid)
      ]).then(([code, stats]) => {
        setReferralCode(code);
        setReferralStats(stats);
        setLoadingReferral(false);
      }).catch(() => setLoadingReferral(false));
    }
  }, [activeTab, referralsAvailable, user]);

  useEffect(() => {
    if (isCommercialProfile && activeTab === "beneficios") setActiveTab("datos");
  }, [activeTab, isCommercialProfile]);

  useEffect(() => {
    if (!referralsAvailable && activeTab === "referidos") setActiveTab("datos");
  }, [activeTab, referralsAvailable]);

  // Handle Edit form submission
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingData(true);
    setSaveSuccessMsg("");
    setSaveErrorMsg("");

    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: formData.displayName.trim(),
        });
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName: formData.displayName.trim(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phoneNumber: formData.phoneNumber.trim(),
        },
        { merge: true }
      );

      setProfile(prev => ({
        ...prev,
        displayName: formData.displayName.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
      }));

      setSaveSuccessMsg("¡Datos actualizados correctamente!");
      setIsEditing(false);
      setTimeout(() => setSaveSuccessMsg(""), 4000);
    } catch (err) {
      setSaveErrorMsg("Error al guardar los cambios: " + err.message);
    } finally {
      setSavingData(false);
    }
  };

  // Manejar Recarga con Mercado Pago API (Automática e Inmediata)
  const handleRecargarMercadoPago = async (e) => {
    if (e) e.preventDefault();
    const amount = rechargeInputToCLP(rechargeAmount);
    if (!amount || amount < 5000) {
      showAlert({
        type: "warning",
        title: "Monto Mínimo Requerido",
        message: "El depósito mínimo para recargar tu Billetera Virtual es de $5.000 CLP."
      });
      return;
    }

    setMpLoading(true);
    try {
      const response = await fetch('https://us-central1-pandastoreupdate.cloudfunctions.net/createMercadoPagoPreference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: [{
            id: `wallet_recharge_${Date.now()}`,
            name: `Recarga de Billetera PandaStore ($${amount.toLocaleString("es-CL")} CLP)`,
            description: "Recarga automática de saldo B2B revendedor",
            category_id: "wallet",
            quantity: 1,
            precio: amount
          }],
          email: user.email,
          uid: user.uid,
          total: amount,
          firstName: profile?.firstName || profile?.displayName || "Revendedor",
          lastName: profile?.lastName || "Panda",
          shipping: {}
        })
      });
      const data = await response.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        showAlert({
          type: "error",
          title: "Error al iniciar pago",
          message: "No se pudo conectar con Mercado Pago. Intenta nuevamente o usa transferencia bancaria."
        });
      }
    } catch (err) {
      showAlert({
        type: "error",
        title: "Error con Mercado Pago",
        message: err.message || "Ocurrió un error al contactar Mercado Pago."
      });
    } finally {
      setMpLoading(false);
    }
  };

  // Manejar Recarga de Billetera Virtual (Revendedores - Transferencia Manual)
  const handleRecargarBilletera = async (e) => {
    e.preventDefault();
    setRechargeMsg("");
    const amount = rechargeInputToCLP(rechargeAmount);
    if (!amount || amount < 5000) {
      showAlert({
        type: "warning",
        title: "Monto Mínimo Requerido",
        message: "El depósito mínimo para recargar tu Billetera Virtual es de $5.000 CLP."
      });
      return;
    }

    if (!rechargeFile) {
      showAlert({
        type: "warning",
        title: "Comprobante Requerido",
        message: "Debes adjuntar la foto o captura del comprobante de transferencia bancaria."
      });
      return;
    }
    const existingRequests = await getDocs(query(collection(db, "recargas_billetera"), where("userId", "==", user.uid)));
    if (existingRequests.docs.some((entry) => entry.data().estado === "pendiente")) {
      showAlert({
        type: "warning",
        title: "Recarga en revisión",
        message: "Ya enviaste un comprobante de recarga. Espera la validación antes de enviar otro pago."
      });
      return;
    }
    const fileError = validatePaymentProofFile(rechargeFile);
    if (fileError) {
      showAlert({ type: "warning", title: "Comprobante no válido", message: fileError });
      return;
    }

    setRechargeUploading(true);
    try {
      const safeName = rechargeFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `comprobantes_billetera/${user.uid}/${Date.now()}_${safeName}`;
      const sRef = ref(storage, storagePath);
      await uploadBytes(sRef, rechargeFile);
      const fileUrl = await getDownloadURL(sRef);

      const cotizacionData = {
        baseCLP: amount,
        valorDolar: Number(valorDolar || 900),
        moneda: rechargePaymentMethod === "crypto" ? "USDT" : "CLP",
        montoLocalOriginal: rechargePaymentMethod === "crypto" ? Number(rechargeAmount) : amount,
        totalLocal: rechargePaymentMethod === "crypto" ? Number(rechargeAmount) : amount,
        totalUSD: roundUpUSD(amount / (Number(valorDolar) || 900)),
        cryptoUSDT: roundUpUSD(amount / (Number(valorDolar) || 900)),
        metodoPago: rechargePaymentMethod,
        createdAt: new Date().toISOString()
      };

      const nombreBanco = rechargePaymentMethod === "crypto"
        ? `${paymentSettings.crypto?.name || "USDT"} · ${paymentSettings.crypto?.network || "Red no indicada"}`
        : (activeWalletBank?.nombre || rechargeBanco || "Transferencia bancaria");

      await addDoc(collection(db, "recargas_billetera"), {
        userId: user.uid,
        userEmail: user.email,
        userName: profile.displayName || user.email,
        montoCLP: amount,
        cotizacion: cotizacionData,
        banco: nombreBanco,
        comprobanteUrl: fileUrl,
        estado: "pendiente",
        createdAt: new Date().toISOString()
      });

      // Notificar al bot de Telegram del Administrador
      notifyNewWalletRecharge({
        userName: profile.displayName || user.email,
        userEmail: user.email,
        montoCLP: amount,
        banco: nombreBanco,
        comprobanteUrl: fileUrl
      }).catch((e) => console.error("Error enviando alerta telegram recarga:", e));

      showAlert({
        type: "success",
        title: "¡Recarga Notificada!",
        message: `Tu comprobante por $${amount.toLocaleString("es-CL")} CLP fue enviado exitosamente. El equipo de PandaStore validará la transferencia y acreditará tu saldo a la brevedad.`
      });

      setRechargeAmount("");
      setRechargeFile(null);
      setIsRechargeModalOpen(false);
    } catch (err) {
      showAlert({
        type: "error",
        title: "Error al enviar comprobante",
        message: err.message
      });
    } finally {
      setRechargeUploading(false);
    }
  };

  // Manejar Postulación a Revendedor Oficial
  const handlePostularRevendedor = async (e) => {
    e.preventDefault();
    const phone = (postularForm.whatsapp || "").trim();
    if (!phone) {
      showAlert({
        type: "warning",
        title: "WhatsApp Requerido",
        message: "Por favor ingresa tu número de WhatsApp para contactarte."
      });
      return;
    }

    setPostularLoading(true);
    try {
      const displayName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Revendedor";
      const solData = {
        userId: user.uid,
        email: user.email,
        nombre: displayName,
        whatsapp: phone,
        estado: "pendiente",
        fecha: new Date().toISOString()
      };

      await addDoc(collection(db, "solicitudes_revendedores"), solData);
      setSolicitudRevendedor(solData);

      // Notificar al bot de Telegram del Administrador
      notifyNewResellerApplication({
        nombre: displayName,
        email: user.email,
        whatsapp: phone
      }).catch((e) => console.error("Error enviando alerta telegram revendedor:", e));

      // Guardar teléfono en el usuario si no lo tenía
      await setDoc(doc(db, "users", user.uid), {
        phoneNumber: phone,
        resellerStatus: "pendiente"
      }, { merge: true });

      const waMsg = encodeURIComponent(
        `Hola PandaStore! 👋 Acabo de solicitar cambiar mi cuenta a Revendedor Oficial B2B.\n\n👤 Usuario: ${displayName}\n📧 Correo: ${user.email}\n📱 WhatsApp: ${phone}\n\n¿Podrías revisar mi postulación para activar mi rol mayorista? ¡Muchas gracias!`
      );
      try {
        window.open(`https://wa.me/56974751810?text=${waMsg}`, "_blank");
      } catch (e) {}

      showAlert({
        type: "success",
        title: "🎉 ¡Postulación Enviada con Éxito!",
        message: "Tu solicitud ha sido registrada en el sistema. El administrador validará tu cuenta para activar los precios mayoristas. Se abrió un enlace a WhatsApp (+56 9 7475 1810) para notificarle de inmediato."
      });
    } catch (err) {
      showAlert({
        type: "error",
        title: "Error al enviar postulación",
        message: err.message
      });
    } finally {
      setPostularLoading(false);
    }
  };

  // Crop complete
  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedPixels(croppedAreaPixels);
  }, []);

  // Save cropped photo
  const handleSavePhoto = async () => {
    if (!imageToCrop || !croppedPixels) return;
    setUploadingPhoto(true);

    try {
      const croppedBlob = await getCroppedImg(imageToCrop, croppedPixels);
      const storageRef = ref(storage, `user_uploads/${user.uid}/profile_${Date.now()}.jpg`);
      await uploadBytes(storageRef, croppedBlob);
      const photoURL = await getDownloadURL(storageRef);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL });
      }

      await setDoc(doc(db, "users", user.uid), { photoURL }, { merge: true });

      setProfile(prev => ({ ...prev, photoURL }));
      setImageToCrop(null);
      setSaveSuccessMsg("¡Foto de perfil actualizada con éxito!");
      setTimeout(() => setSaveSuccessMsg(""), 4000);
    } catch (err) {
      showAlert({
        type: "error",
        title: "Error al subir foto",
        message: err.message || "No se pudo actualizar tu foto de perfil.",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Copy Key
  const handleCopyKey = (keyText) => {
    if (!keyText) return;
    navigator.clipboard.writeText(keyText);
    setCopiedKey(keyText);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Send Password Reset Email
  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setPwdResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setPwdResetSent(true);
      setTimeout(() => setPwdResetSent(false), 7000);
    } catch (e) {
      showAlert({
        type: "error",
        title: "Error al enviar correo",
        message: "No se pudo enviar el correo de restablecimiento: " + e.message,
      });
    } finally {
      setPwdResetLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    showConfirm({
      title: "¿Cerrar sesión?",
      message: "¿Seguro que deseas salir de tu cuenta de PandaStore?",
      confirmText: "Cerrar Sesión",
      cancelText: "Permanecer aquí",
      danger: true,
      onConfirm: async () => {
        await signOut(auth);
        navigate("/home");
      },
    });
  };

  if (loading) {
    return (
      <div className="perfil-container">
        <div className="perfil-loading-box">
          <RefreshCw className="animate-spin" size={36} color="#a259ff" />
          <span>Cargando tu perfil gamer...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="perfil-container">
        <div className="perfil-loading-box">
          <AlertCircle size={44} color="#f87171" />
          <span className="perfil-badge-role perfil-badge-role--guest">Invitado</span>
          <h3>Estás navegando como invitado</h3>
          <p style={{ color: "#c4b5fd", fontSize: "0.9rem" }}>
            Inicia sesión o crea una cuenta para ver tu perfil, tus claves, pedidos y postular al programa de revendedores.
          </p>
          <Link to="/iniciar-sesion" className="perfil-save-btn" style={{ textDecoration: "none", marginTop: 10 }}>
            Iniciar Sesión
          </Link>
          <Link to="/registro" className="perfil-logout-btn" style={{ textDecoration: "none", marginTop: 8 }}>
            Crear cuenta y postular a Revendedor
          </Link>
        </div>
      </div>
    );
  }

  const avatarSrc = profile?.photoURL || user.photoURL || pandaIcon;
  const gamerLevel = getGamerLevel(orders.length);
  const roleLabels = getUserRoleLabels(profile);
  const isReseller = hasResellerBenefits(profile);
  const hasDistributorAccess = hasSteamDistributorAccess(profile);
  const isB2B = hasB2BAccess(profile);
  const hasCommercialRole = isCommercialProfile;
  const userIsSuperAdmin = isSuperAdmin(profile);
  const canApplyToResellerProgram = !isReseller && !hasDistributorAccess && !userIsSuperAdmin;

  // Cálculo de estadísticas de fidelidad y compras verificadas
  const approvedOrders = orders.filter(o => 
    o.estado === "exitoso" || 
    o.estado === "aprobado" || 
    o.transferenciaEstado === "aprobado" || 
    o.transferenciaEstado === "exitoso"
  );
  const totalGamesPurchased = approvedOrders.reduce((acc, o) => {
    if (Array.isArray(o.productos) && o.productos.length > 0) {
      return acc + o.productos.length;
    }
    return acc + 1;
  }, 0);
  const totalSpentCLP = approvedOrders.reduce((acc, o) => acc + (Number(o.totalCLP || o.total || o.monto) || 0), 0);
  const estimatedSavingsCLP = Math.max(0, (totalGamesPurchased * 32000) - totalSpentCLP);
  const loyaltyCycleProgress = totalGamesPurchased % 10;
  const loyaltyRewardsAvailable = Math.floor(totalGamesPurchased / 10);
  const gamesNeededForNextReward = 10 - loyaltyCycleProgress;

  // Antigüedad de la cuenta
  const rawCreation = user?.metadata?.creationTime || profile?.createdAt;
  const createdDate = rawCreation ? new Date(rawCreation) : null;
  const accountAgeLabel = createdDate && !isNaN(createdDate) 
    ? createdDate.toLocaleDateString("es-CL", { month: "long", year: "numeric" })
    : "Miembro Oficial";

  return (
    <div className="perfil-container">
      {/* ── HERO BANNER & PROFILE CARD ── */}
      <div className="perfil-hero-card">
        <div className="perfil-hero-banner" />

        <div className="perfil-hero-body">
          <div className="perfil-spotlight-status">
            <span className="perfil-online-dot" />
            Cuenta PandaStore activa
          </div>
          <div className="perfil-user-main">
            {/* Avatar with hover change */}
            <label className="perfil-avatar-wrapper" title="Cambiar foto de perfil">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setImageToCrop(e.target.files[0]);
                  }
                }}
                style={{ display: "none" }}
              />
              <img src={avatarSrc} alt={profile?.displayName} className="perfil-avatar-img" />
              <div className="perfil-avatar-change-overlay">
                <Camera size={20} />
                <span>Cambiar</span>
              </div>
            </label>

            {/* User Meta */}
            <div className="perfil-user-meta">
              <span className="perfil-spotlight-kicker">MI CUENTA PANDASTORE</span>
              <div className="perfil-user-badges">
                {roleLabels.map((label) => (
                  <span key={label} className={`perfil-badge-role perfil-badge-role--${label === "Super Admin" ? "super-admin" : label === "Revendedor" ? "revendedor" : label === "Distribuidor Steam" ? "distribuidor" : "cliente"}`}>
                    {label === "Super Admin" ? <Sparkles size={12} /> : <ShieldCheck size={12} />}
                    {label}
                  </span>
                ))}
                {!userIsSuperAdmin && !hasCommercialRole && (
                  <span className="perfil-badge-vip" style={{ background: `${gamerLevel.color}25`, border: `1px solid ${gamerLevel.color}66`, color: gamerLevel.color }}>
                    <Award size={12} /> Nivel {gamerLevel.name} {gamerLevel.badge}
                  </span>
                )}
                <span className="perfil-badge-online">
                  <span className="perfil-online-dot" /> Cuenta Activa
                </span>
              </div>

              <h1 className="perfil-user-name">
                {profile?.displayName || "Gamer PandaStore"}
              </h1>

              <p className="perfil-user-email">
                <Mail size={14} color="#a78bfa" />
                <span>{user.email}</span>
                {user.emailVerified && (
                  <CheckCircle2 size={14} color="#34d399" title="Correo verificado" />
                )}
              </p>
              <p className="perfil-user-summary">
                Gestiona tus pedidos, beneficios y seguridad desde un solo lugar.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="perfil-hero-actions">
            <button type="button" className="perfil-hero-quick-action" onClick={() => setActiveTab("pedidos")}>
              <Package size={16} />
              <span>Mis pedidos</span>
            </button>
            <button type="button" className="perfil-hero-quick-action perfil-hero-quick-action--primary" onClick={() => { setActiveTab("datos"); setIsEditing(true); }}>
              <Edit3 size={16} />
              <span>Editar perfil</span>
            </button>
            <button
              type="button"
              className="perfil-logout-btn"
              onClick={handleLogout}
              title="Cerrar sesión"
            >
              <LogOut size={16} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

      {/* ── STATS HIGHLIGHTS RIBBON ── */}
      <div className="perfil-stats-grid">
        {!hasCommercialRole && (
          <div className="perfil-stat-card" style={{ border: `1px solid ${gamerLevel.color}44` }}>
            <div className="perfil-stat-icon-wrap" style={{ background: `${gamerLevel.color}22`, color: gamerLevel.color, fontSize: "1.4rem" }}>
              {gamerLevel.badge}
            </div>
            <div className="perfil-stat-info">
              <div className="perfil-stat-num" style={{ color: gamerLevel.color }}>
                Nivel {gamerLevel.name}
              </div>
              <div className="perfil-stat-label">
                {gamerLevel.discountPercent > 0 ? `${gamerLevel.discountPercent}% descuento permanente` : "Nivel inicial Gamer"}
              </div>
            </div>
          </div>
        )}

        {/* Stat 2: Total Juegos Adquiridos */}
        <div className="perfil-stat-card">
          <div className="perfil-stat-icon-wrap" style={{ background: "rgba(162, 89, 255, 0.15)", color: "#c084fc" }}>
            <Gamepad2 size={24} />
          </div>
          <div className="perfil-stat-info">
            <div className="perfil-stat-num">{totalGamesPurchased}</div>
            <div className="perfil-stat-label">Juegos en tu biblioteca</div>
          </div>
        </div>

        {/* Stat 3: Ahorro Estimado */}
        <div className="perfil-stat-card">
          <div className="perfil-stat-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
            <Sparkles size={24} />
          </div>
          <div className="perfil-stat-info">
            <div className="perfil-stat-num" style={{ color: "#34d399" }}>
              {estimatedSavingsCLP > 0 ? formatearPrecio(estimatedSavingsCLP) : "Total"}
            </div>
            <div className="perfil-stat-label">Ahorro gamer estimado</div>
          </div>
        </div>

        {/* Stat 4: Antigüedad de la Cuenta */}
        <div className="perfil-stat-card">
          <div className="perfil-stat-icon-wrap" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
            <Clock size={24} />
          </div>
          <div className="perfil-stat-info">
            <div className="perfil-stat-num" style={{ fontSize: "1rem", color: "#38bdf8", textTransform: "capitalize" }}>
              {accountAgeLabel}
            </div>
            <div className="perfil-stat-label">Antigüedad en PandaStore</div>
          </div>
        </div>

        {isB2B && (
          <div className="perfil-stat-card" style={{ border: "1px solid rgba(52, 211, 153, 0.4)", background: "rgba(52, 211, 153, 0.08)" }}>
            <div className="perfil-stat-icon-wrap" style={{ background: "rgba(52, 211, 153, 0.2)", color: "#34d399" }}>
              <Wallet size={24} />
            </div>
            <div className="perfil-stat-info">
              <div className="perfil-stat-num" style={{ color: "#34d399" }}>
                {displayPrice(profile.wallet_balance || 0)}
              </div>
              <div className="perfil-stat-label">Saldo Billetera B2B</div>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* BANNER DISTRIBUIDOR OFICIAL STEAM ACTIVO */}
      {hasDistributorAccess && (
        <div className="perfil-distributor-badge-card" style={{
          background: "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.2) 100%)",
          border: "1.5px solid rgba(56, 189, 248, 0.4)",
          borderRadius: 16,
          padding: "18px 24px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "rgba(56, 189, 248, 0.2)",
              color: "#38bdf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <KeyRound size={26} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  background: "#38bdf8",
                  color: "#0c0418",
                  padding: "2px 8px",
                  borderRadius: 999,
                  textTransform: "uppercase"
                }}>
                  Distribuidor Oficial Steam
                </span>
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                  Plan {profile.distributor_plan ? profile.distributor_plan.toUpperCase() : "BÁSICO"}
                </span>
              </div>
              <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>
                Portal de Emisión de Claves Activo
              </h4>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.85rem", color: "#cbd5e1" }}>
                Cupo asignado: <strong>{profile.custom_quota || 60} claves/mes</strong> {profile.extra_keys ? `(+${profile.extra_keys} extras)` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/portal-distribuidor")}
            style={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              border: "1px solid #38bdf8",
              color: "#fff",
              fontWeight: 800,
              fontSize: "0.9rem",
              padding: "10px 20px",
              borderRadius: 12,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 0 15px rgba(56, 189, 248, 0.3)"
            }}
          >
            <span>Ir al Portal Distribuidor</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* BANNER PROMOCIONAL DISTRIBUIDOR STEAM (CLIENTES REGULARES) */}
      {canApplyToResellerProgram && (
        <div className="perfil-reseller-cta-banner" style={{
          background: "linear-gradient(135deg, rgba(30, 15, 60, 0.8) 0%, rgba(10, 25, 50, 0.8) 100%)",
          borderColor: "rgba(56, 189, 248, 0.35)",
          marginBottom: 20
        }}>
          <div className="reseller-cta-left">
            <div className="reseller-cta-badge" style={{ background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8", borderColor: "#38bdf8" }}>
              🔑 DISTRIBUIDOR AUTORIZADO STEAM
            </div>
            <h3 className="reseller-cta-title">¿Quieres vender juegos de Steam y ganar dinero?</h3>
            <p className="reseller-cta-desc">
              Únete a nuestra red de Distribuidores Steam: accede a los 4 planes (Básico, Pro, Supreme y Vitalicio) desde $50.000 CLP/mes, emite claves para tus clientes por WhatsApp y obtén márgenes de hasta el 800%.
            </p>
          </div>
          <button
            type="button"
            className="reseller-cta-btn"
            style={{ background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", borderColor: "#38bdf8" }}
            onClick={() => navigate("/portal-distribuidor")}
          >
            <span>🚀 Ver Planes de Distribuidor</span>
          </button>
        </div>
      )}

      {/* BANNER PROMOCIONAL SER REVENDEDOR (CLIENTES REGULARES) */}
      {canApplyToResellerProgram && (
        <div className="perfil-reseller-cta-banner">
          <div className="reseller-cta-left">
            <div className="reseller-cta-badge">💼 OPORTUNIDAD B2B MAYORISTA</div>
            <h3 className="reseller-cta-title">¿Quieres vender videojuegos y ganar dinero?</h3>
            <p className="reseller-cta-desc">
              Conviértete en Revendedor Oficial PandaStore: accede a Steam al 50% de descuento, cuentas de Nintendo Switch y PlayStation con precios mayoristas, billetera virtual y entregas inmediatas.
            </p>
          </div>
          <button
            type="button"
            className="reseller-cta-btn"
            onClick={() => setActiveTab("revendedor")}
          >
            <span>🚀 Postular como Revendedor</span>
          </button>
        </div>
      )}

      {/* ── FEEDBACK MESSAGES ── */}
      {saveSuccessMsg && (
        <div style={{
          background: "rgba(16, 185, 129, 0.16)",
          border: "1px solid rgba(16, 185, 129, 0.4)",
          color: "#34d399",
          padding: "12px 18px",
          borderRadius: 14,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontWeight: 700,
          fontSize: "0.9rem"
        }}>
          <CheckCircle2 size={18} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {saveErrorMsg && (
        <div style={{
          background: "rgba(239, 68, 68, 0.16)",
          border: "1px solid rgba(239, 68, 68, 0.4)",
          color: "#fca5a5",
          padding: "12px 18px",
          borderRadius: 14,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontWeight: 700,
          fontSize: "0.9rem"
        }}>
          <AlertCircle size={18} />
          <span>{saveErrorMsg}</span>
        </div>
      )}

      {/* ── INTERACTIVE TABS ── */}
      <div className="perfil-nav-tabs">
        <button
          type="button"
          className={`perfil-nav-tab ${activeTab === "datos" ? "active" : ""}`}
          onClick={() => setActiveTab("datos")}
        >
          <User size={18} />
          <span>Datos & Edición</span>
        </button>

        <button
          type="button"
          className={`perfil-nav-tab ${activeTab === "pedidos" ? "active" : ""}`}
          onClick={() => setActiveTab("pedidos")}
        >
          <Package size={18} />
          <span>Mis Compras ({orders.length})</span>
        </button>

        <button
          type="button"
          className={`perfil-nav-tab ${activeTab === "seguridad" ? "active" : ""}`}
          onClick={() => setActiveTab("seguridad")}
        >
          <Lock size={18} />
          <span>Seguridad</span>
        </button>

        {!hasCommercialRole && (
          <button
            type="button"
            className={`perfil-nav-tab ${activeTab === "beneficios" ? "active" : ""}`}
            onClick={() => setActiveTab("beneficios")}
          >
            <Gift size={18} />
            <span>Niveles Gamer &amp; Perks</span>
          </button>
        )}

        {referralsAvailable && (
          <button
            type="button"
            className={`perfil-nav-tab ${activeTab === "referidos" ? "active" : ""}`}
            onClick={() => setActiveTab("referidos")}
          >
            <span style={{ fontSize: '1rem' }}>🤝</span>
            <span>Mis Referidos</span>
          </button>
        )}

        {isB2B && (
          <button
            type="button"
            className={`perfil-nav-tab ${activeTab === "billetera" ? "active" : ""}`}
            onClick={() => setActiveTab("billetera")}
          >
            <Wallet size={18} />
            <span>Mi Billetera B2B ({displayPrice(profile.wallet_balance || 0)})</span>
          </button>
        )}

        {canApplyToResellerProgram && (
          <button
            type="button"
            className={`perfil-nav-tab ${activeTab === "revendedor" ? "active" : ""}`}
            onClick={() => setActiveTab("revendedor")}
          >
            <span style={{ fontSize: '1rem' }}>💼</span>
            <span>Ser Revendedor</span>
          </button>
        )}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="perfil-tab-panel">
        {/* ── TAB 1: DATOS & EDICIÓN ── */}
        {activeTab === "datos" && (
          <div className="perfil-split-grid">
            {/* Box 1: Current Info summary */}
            <div className="perfil-card-box">
              <div className="perfil-box-header">
                <h3 className="perfil-box-title">
                  <User size={20} color="#a259ff" />
                  <span>Información de la Cuenta</span>
                </h3>
                <button
                  type="button"
                  className="perfil-save-btn"
                  onClick={() => setIsEditing(!isEditing)}
                  style={{
                    padding: "6px 14px",
                    fontSize: "0.82rem",
                    margin: 0,
                    background: isEditing ? "rgba(255,255,255,0.1)" : undefined,
                    border: isEditing ? "1px solid rgba(255,255,255,0.2)" : undefined
                  }}
                >
                  <Edit3 size={14} />
                  <span>{isEditing ? "Cancelar" : "Modificar"}</span>
                </button>
              </div>

              <div className="perfil-data-list">
                <div className="perfil-data-item">
                  <User size={20} className="perfil-data-icon" />
                  <div>
                    <div className="perfil-data-label">Nombre o Alias</div>
                    <div className="perfil-data-val">{profile?.displayName || "-"}</div>
                  </div>
                </div>

                <div className="perfil-data-item">
                  <Mail size={20} className="perfil-data-icon" />
                  <div>
                    <div className="perfil-data-label">Correo Electrónico</div>
                    <div className="perfil-data-val">{user.email}</div>
                  </div>
                </div>

                <div className="perfil-data-item">
                  <Phone size={20} className="perfil-data-icon" />
                  <div>
                    <div className="perfil-data-label">Teléfono o WhatsApp</div>
                    <div className="perfil-data-val">{profile?.phoneNumber || "No registrado"}</div>
                  </div>
                </div>

                <div className="perfil-data-item">
                  <Award size={20} className="perfil-data-icon" />
                  <div>
                    <div className="perfil-data-label">Tipo de Cuenta</div>
                    <div className="perfil-data-val" style={{ color: "#facc15" }}>
                      {roleLabels.join(" · ")}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2: Edit Form or Tips */}
            <div className="perfil-card-box">
              <div className="perfil-box-header">
                <h3 className="perfil-box-title">
                  <Edit3 size={20} color="#f472b6" />
                  <span>{isEditing ? "Editar mis Datos" : "Foto y Personalización"}</span>
                </h3>
              </div>

              {isEditing ? (
                <form className="perfil-form" onSubmit={handleSaveProfile}>
                  <div className="perfil-form-field">
                    <label className="perfil-form-label">Nombre de Pantalla / Alias</label>
                    <input
                      type="text"
                      className="perfil-form-input"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="Ej. Matías Gamer"
                      required
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="perfil-form-field">
                      <label className="perfil-form-label">Nombre</label>
                      <input
                        type="text"
                        className="perfil-form-input"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        placeholder="Nombre"
                      />
                    </div>
                    <div className="perfil-form-field">
                      <label className="perfil-form-label">Apellido</label>
                      <input
                        type="text"
                        className="perfil-form-input"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        placeholder="Apellido"
                      />
                    </div>
                  </div>

                  <div className="perfil-form-field">
                    <label className="perfil-form-label">Teléfono o WhatsApp</label>
                    <input
                      type="tel"
                      className="perfil-form-input"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="+56 9 1234 5678"
                    />
                  </div>

                  <button type="submit" className="perfil-save-btn" disabled={savingData}>
                    {savingData ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </form>
              ) : (
                <div>
                  <p style={{ color: "#c4b5fd", fontSize: "0.88rem", lineHeight: 1.5, margin: "0 0 16px" }}>
                    Tu foto de perfil aparece en tus reseñas públicas y en tu panel de cliente. Puedes subir una foto personalizada o cambiarla cuando quieras.
                  </p>
                  <label className="perfil-save-btn" style={{ cursor: "pointer", display: "inline-flex" }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setImageToCrop(e.target.files[0]);
                        }
                      }}
                      style={{ display: "none" }}
                    />
                    <Camera size={18} />
                    <span>Subir Nueva Foto de Perfil</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: MIS PEDIDOS & CLAVES ── */}
        {activeTab === "pedidos" && (
          <div>
            {orders.length === 0 ? (
              <div className="perfil-card-box" style={{ textAlign: "center", padding: "48px 20px" }}>
                <Package size={52} color="#a259ff" style={{ margin: "0 auto 12px", opacity: 0.6 }} />
                <h3 style={{ margin: "0 0 6px", fontSize: "1.2rem", color: "#fff" }}>
                  Aún no tienes pedidos registrados
                </h3>
                <p style={{ color: "#c4b5fd", fontSize: "0.88rem", maxWidth: 440, margin: "0 auto 20px" }}>
                  Explora nuestro catálogo con cientos de juegos para Steam PC, Nintendo Switch y PlayStation con entrega inmediata.
                </p>
                <Link to="/home" className="perfil-save-btn" style={{ textDecoration: "none", display: "inline-flex" }}>
                  <Gamepad2 size={18} />
                  <span>Ver Catálogo de Juegos</span>
                </Link>
              </div>
            ) : (
              <div className="perfil-orders-list">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: "0.85rem", color: "#c4b5fd", fontWeight: 700 }}>
                    Mostrando tus {orders.length} pedidos más recientes
                  </span>
                  <Link
                    to="/mispedidos"
                    style={{
                      color: "#c084fc",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      textDecoration: "none"
                    }}
                  >
                    <span>Abrir panel completo de Mis Pedidos</span>
                    <ExternalLink size={14} />
                  </Link>
                </div>

                {orders.map((ord) => {
                  const prods = Array.isArray(ord.productos) ? ord.productos : [];
                  const isDone = ord.estado === "exitoso";
                  const isPending = ord.estado === "pendiente";

                  return (
                    <div key={ord.id} className="perfil-order-card">
                      {/* Top Row: ID, Date, Status */}
                      <div className="perfil-order-top">
                        <div className="perfil-order-id-group">
                          <Package size={18} color="#a259ff" />
                          <span style={{ fontWeight: 800, color: "#fff", fontSize: "0.95rem" }}>
                            Pedido #{ord.id?.slice(-8) || ord.id}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span className="perfil-order-date">
                            {ord.fecha ? new Date(ord.fecha).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" }) : "Reciente"}
                          </span>

                          <span style={{
                            background: isDone ? "rgba(16,185,129,0.18)" : isPending ? "rgba(245,158,11,0.18)" : "rgba(239,68,68,0.18)",
                            color: isDone ? "#34d399" : isPending ? "#fbbf24" : "#f87171",
                            border: `1px solid ${isDone ? "rgba(16,185,129,0.4)" : isPending ? "rgba(245,158,11,0.4)" : "rgba(239,68,68,0.4)"}`,
                            borderRadius: 14,
                            padding: "3px 10px",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            textTransform: "uppercase"
                          }}>
                            {ord.estado || "Pendiente"}
                          </span>
                        </div>
                      </div>

                      {/* Products List */}
                      <div className="perfil-order-prods-box">
                        {prods.length > 0 ? (
                          prods.map((p, idx) => (
                            <div key={idx} className="perfil-order-prod-item">
                              <Gamepad2 size={16} color="#00f5d4" />
                              <span>{p.name || p.nombre || p.title || "Juego Digital"}</span>
                            </div>
                          ))
                        ) : (
                          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.82rem" }}>
                            Detalle de entrega en proceso
                          </div>
                        )}
                      </div>

                      {/* Steam Vault Key if delivered */}
                      {ord.licenseKey && (
                        <div className="perfil-order-key-box">
                          <div>
                            <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#00f5d4", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
                              🔑 Clave de Activación PandaStore Launcher
                            </div>
                            <div className="perfil-order-key-code">
                              {ord.licenseKey}
                            </div>
                          </div>

                          <button
                            type="button"
                            className="perfil-order-copy-btn"
                            onClick={() => handleCopyKey(ord.licenseKey)}
                          >
                            {copiedKey === ord.licenseKey ? <Check size={14} /> : <Copy size={14} />}
                            <span>{copiedKey === ord.licenseKey ? "¡Copiada!" : "Copiar Clave"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: SEGURIDAD ── */}
        {activeTab === "seguridad" && (
          <div className="perfil-security-grid">
            <div className="perfil-card-box">
              <div className="perfil-box-header">
                <h3 className="perfil-box-title">
                  <Lock size={20} color="#a259ff" />
                  <span>Contraseña y Acceso</span>
                </h3>
              </div>

              <p style={{ color: "#c4b5fd", fontSize: "0.88rem", lineHeight: 1.5, margin: "0 0 16px" }}>
                Para proteger tu cuenta, puedes solicitar un correo de restablecimiento seguro directo a <strong>{user.email}</strong>.
              </p>

              {pwdResetSent ? (
                <div style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.4)",
                  color: "#34d399",
                  padding: "12px",
                  borderRadius: 12,
                  fontSize: "0.85rem",
                  fontWeight: 700
                }}>
                  ¡Correo enviado! Revisa tu bandeja de entrada o spam para cambiar tu clave.
                </div>
              ) : (
                <button
                  type="button"
                  className="perfil-save-btn"
                  onClick={handlePasswordReset}
                  disabled={pwdResetLoading}
                >
                  <KeyRound size={16} />
                  <span>{pwdResetLoading ? "Enviando enlace..." : "Enviar enlace para cambiar contraseña"}</span>
                </button>
              )}
            </div>

            <div className="perfil-card-box">
              <div className="perfil-box-header">
                <h3 className="perfil-box-title">
                  <ShieldCheck size={20} color="#34d399" />
                  <span>Garantía PandaStore 24/7</span>
                </h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: "0.86rem", color: "#c4b5fd" }}>
                <div>
                  <strong style={{ color: "#fff" }}>🛡️ Activaciones Seguras:</strong> Tus juegos y claves están respaldados en tu perfil de forma permanente.
                </div>
                <div>
                  <strong style={{ color: "#fff" }}>⚡ PandaStore Launcher:</strong> Si adquiriste juegos para Steam PC, descárgalos con soporte oficial.
                </div>
                <div>
                  <strong style={{ color: "#fff" }}>💬 Asistencia Directa:</strong> ¿Dudas con la instalación? Escríbenos por WhatsApp o Telegram y te ayudamos al instante.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: NIVELES GAMER & PERKS ── */}
        {!hasCommercialRole && activeTab === "beneficios" && (
          <div className="perfil-card-box">
            <div className="perfil-box-header">
              <h3 className="perfil-box-title">
                <Sparkles size={20} color={gamerLevel.color} />
                <span>Club de Niveles Gamer PandaStore</span>
              </h3>
            </div>

            {/* Animated Progress Bar to next tier */}
            <div style={{
              background: `linear-gradient(135deg, ${gamerLevel.color}22 0%, rgba(30, 0, 60, 0.6) 100%)`,
              border: `1.5px solid ${gamerLevel.color}66`,
              borderRadius: 16,
              padding: 18,
              marginTop: 12,
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '2.2rem' }}>{gamerLevel.badge}</span>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                      Eres Nivel <span style={{ color: gamerLevel.color }}>{gamerLevel.name}</span>
                    </div>
                    <div style={{ color: '#c4b5fd', fontSize: '0.85rem' }}>
                      Tienes <b>{orders.length}</b> {orders.length === 1 ? 'pedido completado' : 'pedidos completados'}
                    </div>
                  </div>
                </div>
                <div style={{
                  background: `${gamerLevel.color}33`,
                  border: `1px solid ${gamerLevel.color}`,
                  color: gamerLevel.color,
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontWeight: 800,
                  fontSize: '0.88rem'
                }}>
                  {gamerLevel.discountPercent > 0 ? `-${gamerLevel.discountPercent}% Dcto Permanente` : "Nivel Inicial"}
                </div>
              </div>

              {/* Barra de progreso animada */}
              {(() => {
                const tiers = GAMER_LEVELS;
                const currentIdx = tiers.findIndex(t => t.name === gamerLevel.name);
                const isMax = currentIdx === tiers.length - 1;
                const min = gamerLevel.minOrders;
                const max = isMax ? orders.length : (tiers[currentIdx + 1]?.minOrders || min + 1);
                const progress = isMax ? 100 : Math.min(100, Math.round(((orders.length - min) / (max - min)) * 100));
                const nextTierData = !isMax ? tiers[currentIdx + 1] : null;
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.78rem', color: '#c4b5fd', fontWeight: 600 }}>
                        {gamerLevel.badge} {gamerLevel.name}
                      </span>
                      {nextTierData && (
                        <span style={{ fontSize: '0.78rem', color: '#a08ab8', fontWeight: 600 }}>
                          {nextTierData.badge} {nextTierData.name}
                        </span>
                      )}
                      {isMax && (
                        <span style={{ fontSize: '0.78rem', color: gamerLevel.color, fontWeight: 700 }}>
                          💎 ¡Nivel Máximo!
                        </span>
                      )}
                    </div>
                    <div style={{
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: 50,
                      height: 14,
                      overflow: 'hidden',
                      border: `1px solid ${gamerLevel.color}33`
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${gamerLevel.color}cc, ${gamerLevel.color})`,
                        borderRadius: 50,
                        transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: `0 0 12px ${gamerLevel.color}88`
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: '0.72rem', color: '#a08ab8' }}>{orders.length} compras</span>
                      {!isMax && (
                        <span style={{ fontSize: '0.72rem', color: '#c4b5fd', fontWeight: 600 }}>
                          🚀 {gamerLevel.ordersToNext} más para <b style={{ color: nextTierData?.color }}>{nextTierData?.name}</b>
                        </span>
                      )}
                      <span style={{ fontSize: '0.72rem', color: gamerLevel.color, fontWeight: 700 }}>{progress}%</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* All Tiers Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              {GAMER_LEVELS.map((tier) => {
                const isCurrent = tier.name === gamerLevel.name;
                return (
                  <div
                    key={tier.name}
                    style={{
                      background: isCurrent ? `${tier.color}15` : "rgba(162,89,255,0.04)",
                      border: `1.5px solid ${isCurrent ? tier.color : "rgba(162,89,255,0.18)"}`,
                      borderRadius: 16,
                      padding: 16,
                      position: 'relative',
                      boxShadow: isCurrent ? `0 0 16px ${tier.color}33` : 'none'
                    }}
                  >
                    {isCurrent && (
                      <span style={{
                        position: 'absolute',
                        top: -9,
                        right: 12,
                        background: tier.color,
                        color: '#000',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '1px 8px',
                        borderRadius: 10,
                        textTransform: 'uppercase'
                      }}>
                        Nivel Actual
                      </span>
                    )}
                    <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>{tier.badge}</div>
                    <h4 style={{ margin: "0 0 4px", color: tier.color, fontSize: "1.05rem", fontWeight: 800 }}>
                      Nivel {tier.name}
                    </h4>
                    <div style={{ color: "#a08ab8", fontSize: "0.78rem", marginBottom: 10 }}>
                      {tier.minOrders === 0 ? "0 a 2 compras" : tier.minOrders === 3 ? "3 a 5 compras" : tier.minOrders === 6 ? "6 a 9 compras" : "10 o más compras"}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16, color: "#c4b5fd", fontSize: "0.8rem", display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {tier.perks.map((p, idx) => (
                        <li key={idx} style={{ color: p.includes("descuento") ? "#00f5d4" : "#e8e0f5", fontWeight: p.includes("descuento") ? 700 : 400 }}>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* ── PROGRAMA DE FIDELIDAD PANDA: 10 JUEGOS = 1 REGALO ── */}
            <div style={{
              marginTop: 28,
              background: 'linear-gradient(135deg, rgba(30, 0, 60, 0.8) 0%, rgba(15, 5, 35, 0.95) 100%)',
              border: '2px solid rgba(251, 191, 36, 0.4)',
              borderRadius: 20,
              padding: 24,
              boxShadow: '0 8px 32px rgba(251, 191, 36, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    boxShadow: '0 4px 15px rgba(251, 191, 36, 0.4)'
                  }}>
                    🎁
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.25rem', fontWeight: 800 }}>
                      Programa de Fidelidad Panda: <span style={{ color: '#fbbf24' }}>10 Juegos = 1 de Regalo</span>
                    </h3>
                    <p style={{ margin: '4px 0 0', color: '#c4b5fd', fontSize: '0.85rem' }}>
                      Por cada 10 títulos comprados con tu cuenta, desbloqueas un juego completamente <strong>GRATIS</strong> a tu elección.
                    </p>
                  </div>
                </div>

                <div style={{
                  background: loyaltyRewardsAvailable > 0 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                  border: `1px solid ${loyaltyRewardsAvailable > 0 ? '#fbbf24' : 'rgba(255, 255, 255, 0.15)'}`,
                  color: loyaltyRewardsAvailable > 0 ? '#fbbf24' : '#e2e8f0',
                  padding: '8px 16px',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span>⭐ Regalos Acumulados:</span>
                  <span style={{ fontSize: '1.2rem', color: loyaltyRewardsAvailable > 0 ? '#00f5d4' : '#fff' }}>
                    {loyaltyRewardsAvailable}
                  </span>
                </div>
              </div>

              {/* Barra de progreso de los 10 juegos */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 700 }}>
                    Progreso del Ciclo Actual: <strong style={{ color: '#00f5d4' }}>{loyaltyCycleProgress} de 10</strong> juegos
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 700 }}>
                    {loyaltyCycleProgress === 0 && totalGamesPurchased >= 10
                      ? '🎉 ¡Ciclo completado!'
                      : `Faltan ${gamesNeededForNextReward} para el próximo regalo`}
                  </span>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: 50,
                  height: 16,
                  overflow: 'hidden',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  padding: 2
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.max(6, (loyaltyCycleProgress / 10) * 100)}%`,
                    background: 'linear-gradient(90deg, #f59e0b, #fbbf24, #00f5d4)',
                    borderRadius: 50,
                    transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 0 14px rgba(251, 191, 36, 0.6)'
                  }} />
                </div>
              </div>

              {/* Si tiene regalos listos para canjear */}
              {loyaltyRewardsAvailable > 0 ? (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(217, 119, 6, 0.25) 100%)',
                  border: '1.5px solid #fbbf24',
                  borderRadius: 16,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '2rem' }}>🎉</span>
                    <div>
                      <div style={{ color: '#fbbf24', fontWeight: 900, fontSize: '1.05rem' }}>
                        ¡FELICIDADES! TIENES {loyaltyRewardsAvailable} JUEGO(S) DE REGALO DISPONIBLE(S)
                      </div>
                      <div style={{ color: '#e2e8f0', fontSize: '0.82rem', marginTop: 2 }}>
                        Canjea tu beneficio ahora mismo contactando a soporte oficial con tu correo registrado.
                      </div>
                    </div>
                  </div>

                  <a
                    href={`https://wa.me/56974751810?text=${encodeURIComponent(
                      `🐼 *PANDA STORE - CANJE DE REGALO POR FIDELIDAD (10 JUEGOS)* 🎁\n\n¡Hola PandaStore! He completado mis compras y quiero canjear mi juego de regalo por fidelidad:\n\n📧 *Mi Email:* ${user?.email || ""}\n🎮 *Total Juegos Adquiridos:* ${totalGamesPurchased}\n⭐ *Regalos Disponibles:* ${loyaltyRewardsAvailable}\n🎁 *Juego que solicito de regalo:* [Indica aquí el juego que quieres]`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                      color: '#fff',
                      padding: '12px 22px',
                      borderRadius: 14,
                      fontWeight: 900,
                      fontSize: '0.92rem',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 16px rgba(37, 211, 102, 0.4)'
                    }}
                  >
                    <span>🎁</span>
                    <span>Reclamar Juego Gratis por WhatsApp</span>
                  </a>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '0.82rem',
                  color: '#c4b5fd',
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <span>💡</span>
                  <span>
                    Llevas <strong>{totalGamesPurchased}</strong> {totalGamesPurchased === 1 ? 'juego adquirido' : 'juegos adquiridos'}. Cada vez que sumes 10 juegos en tus pedidos aprobados, este botón dorado se activará para que pidas tu juego gratis directo por WhatsApp.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 5: MIS REFERIDOS ── */}
        {referralsAvailable && activeTab === "referidos" && (
          <div className="perfil-card-box" style={{ maxWidth: 680 }}>
            <div className="perfil-box-header">
              <h3 className="perfil-box-title">
                <span style={{ fontSize: '1.4rem' }}>🤝</span>
                <span>Sistema de Referidos PandaStore</span>
              </h3>
            </div>

            {/* Explicación */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(123,47,242,0.2) 0%, rgba(243,87,168,0.1) 100%)',
              border: '1px solid rgba(196,181,253,0.2)',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 24,
              fontSize: '0.88rem',
              color: '#c4b5fd',
              lineHeight: 1.6
            }}>
              <div style={{ fontWeight: 700, color: '#fff', marginBottom: 8, fontSize: '1rem' }}>
                💸 Gana $1.000 CLP por cada amigo que compre
              </div>
              <p style={{ margin: 0 }}>
                Comparte tu link único. Cuando un amigo ingrese con él y realice una compra,
                <b style={{ color: '#4ade80' }}> automáticamente recibes $1.000 CLP de crédito</b> en tu cuenta.
              </p>
            </div>

            {loadingReferral ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#a08ab8' }}>Cargando tu código...</div>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#a08ab8', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Tu link de referido único
                  </label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
                    <div style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(196,181,253,0.25)',
                      borderRadius: 10,
                      padding: '12px 14px',
                      fontSize: '0.82rem',
                      color: '#e8e0f5',
                      wordBreak: 'break-all',
                      fontFamily: 'monospace'
                    }}>
                      {referralCode ? buildReferralLink(referralCode) : '—'}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const link = buildReferralLink(referralCode);
                        navigator.clipboard.writeText(link);
                        setCopiedReferral(true);
                        setTimeout(() => setCopiedReferral(false), 2000);
                      }}
                      style={{
                        background: copiedReferral ? 'rgba(74,222,128,0.2)' : 'rgba(123,47,242,0.35)',
                        border: `1px solid ${copiedReferral ? '#4ade80' : 'rgba(196,181,253,0.3)'}`,
                        color: copiedReferral ? '#4ade80' : '#c4b5fd',
                        borderRadius: 10,
                        padding: '12px 18px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {copiedReferral ? <><Check size={16} /> Copiado!</> : <><Copy size={16} /> Copiar Link</>}
                    </button>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '0.76rem', color: '#a08ab8' }}>
                    Código: <b style={{ color: '#c4b5fd' }}>{referralCode || '—'}</b>
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Amigos con tu link', value: referralStats.total, color: '#c4b5fd', icon: '👥' },
                    { label: 'Compras confirmadas', value: referralStats.completed, color: '#4ade80', icon: '✅' },
                    { label: 'Crédito ganado', value: `$${(referralStats.credits || 0).toLocaleString('es-CL')}`, color: '#f357a8', icon: '💰' }
                  ].map((stat, i) => (
                    <div key={i} style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(196,181,253,0.15)',
                      borderRadius: 12,
                      padding: '14px 10px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{stat.icon}</div>
                      <div style={{ fontWeight: 800, fontSize: '1.4rem', color: stat.color }}>{stat.value}</div>
                      <div style={{ fontSize: '0.72rem', color: '#a08ab8', marginTop: 2 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {referralStats.credits > 0 && (
                  <div style={{
                    marginBottom: 20,
                    padding: '14px 18px',
                    background: 'linear-gradient(135deg, rgba(74,222,128,0.12) 0%, rgba(123,47,242,0.15) 100%)',
                    border: '1px solid rgba(74,222,128,0.3)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#4ade80', fontSize: '0.95rem' }}>
                        🎉 ¡Tienes ${(referralStats.credits).toLocaleString('es-CL')} CLP de crédito disponible!
                      </div>
                      <div style={{ color: '#c4b5fd', fontSize: '0.8rem', marginTop: 2 }}>
                        Puedes aplicar este saldo directamente al pagar en el carrito.
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/checkoutcarrito')}
                      style={{
                        background: 'linear-gradient(135deg, #7b2ff7 0%, #f357a8 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 16px',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(123,47,242,0.4)'
                      }}
                    >
                      Ir a mi Carrito
                    </button>
                  </div>
                )}

                {referralStats.referrals.length > 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 10px', fontSize: '0.88rem', color: '#c4b5fd', fontWeight: 700 }}>
                      Historial de referidos
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {referralStats.referrals.map((r, idx) => (
                        <div key={r.id || idx} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(196,181,253,0.1)',
                          borderRadius: 8,
                          padding: '10px 14px',
                          fontSize: '0.8rem'
                        }}>
                          <span style={{ color: '#e8e0f5' }}>
                            {r.referredEmail ? r.referredEmail.replace(/(.{3}).*(@.*)/, '$1***$2') : 'Invitado'}
                          </span>
                          <span style={{
                            color: r.purchaseComplete ? '#4ade80' : '#fbbf24',
                            fontWeight: 700,
                            background: r.purchaseComplete ? 'rgba(74,222,128,0.12)' : 'rgba(251,191,36,0.12)',
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: '0.72rem'
                          }}>
                            {r.purchaseComplete ? '✅ Compra confirmada' : '⏳ Pendiente'}
                          </span>
                          {r.purchaseComplete && (
                            <span style={{ color: '#f357a8', fontWeight: 700 }}>+$1.000</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── TAB 6: MI BILLETERA B2B (REVENDEDORES) ── */}
        {activeTab === "billetera" && isB2B && (
          <div className="perfil-wallet-view">
            {/* Tarjeta de Saldo */}
            <div className="perfil-wallet-card">
              <div className="perfil-wallet-glow" />
              <div className="perfil-wallet-card-header">
                <div>
                  <span className="wallet-badge">💼 Cuenta Revendedor Oficial</span>
                  <h3 className="wallet-card-title">Saldo Disponible en Billetera</h3>
                </div>
                <div className="wallet-chip-icon">
                  <Wallet size={28} color="#34d399" />
                </div>
              </div>

              <div className="wallet-card-balance-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                <div className="wallet-card-balance">
                  {displayPrice(profile.wallet_balance || 0)}
                </div>
                <button
                  type="button"
                  className="wallet-recharge-trigger-btn"
                  onClick={() => {
                    const defaultMethod = isChile ? "mercadopago" : "crypto";
                    setRechargeAmount(defaultMethod === "crypto" ? "50" : "15000");
                    setRechargeFile(null);
                    setRechargePaymentMethod(defaultMethod);
                    setRechargeBanco(defaultMethod === "crypto" ? `${paymentSettings.crypto?.name || "USDT"} (${paymentSettings.crypto?.network || "BEP20"})` : (defaultMethod === "mercadopago" ? "Mercado Pago (Cuenta Vista)" : (activeWalletBank?.nombre || "Transferencia bancaria")));
                    setIsRechargeModalOpen(true);
                  }}
                  style={{
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    padding: "11px 22px",
                    fontWeight: 800,
                    fontSize: "0.92rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: "0 4px 18px rgba(16, 185, 129, 0.4)",
                    transition: "all 0.2s ease"
                  }}
                >
                  <DollarSign size={18} />
                  <span>➕ Cargar Saldo</span>
                </button>
              </div>

            </div>

            {/* ── CATÁLOGO MAYORISTA B2B POR CATEGORÍAS ── */}
            <div className="b2b-categories-section">
              <div className="b2b-cat-header">
                <div>
                  <h3 className="b2b-cat-title">
                    <Gamepad2 size={22} color="#a855f7" /> Catálogo Mayorista B2B PandaStore
                  </h3>
                  <p className="b2b-cat-subtitle">
                    Accede directamente a cada categoría con tus precios mayoristas aplicados automáticamente.
                  </p>
                </div>
              </div>

              <div className="b2b-cat-cards-grid">
                {/* Nintendo Switch Card */}
                <div className="b2b-category-card b2b-card-switch">
                  <div className="b2b-card-img-wrap">
                    <img src={switchImg} alt="Nintendo Switch" className="b2b-card-img" />
                  </div>
                  <div className="b2b-card-body">
                    <h4 className="b2b-card-name">Nintendo Switch</h4>
                    <p className="b2b-card-info">
                      Cuentas primarias y secundarias para encontrar títulos y modalidades para tu catálogo.
                    </p>
                    <Link to="/categoria/switch" className="b2b-cat-link-btn">
                      Ver Catálogo Switch →
                    </Link>
                  </div>
                </div>

                {/* PlayStation Card */}
                <div className="b2b-category-card b2b-card-psn">
                  <div className="b2b-card-img-wrap">
                    <img src={psnImg} alt="PlayStation" className="b2b-card-img" />
                  </div>
                  <div className="b2b-card-body">
                    <h4 className="b2b-card-name">PlayStation PS5 & PS4</h4>
                    <p className="b2b-card-info">
                      Licencias digitales originales con entrega automática por correo y garantía total.
                    </p>
                    <Link to="/categoria/playstation" className="b2b-cat-link-btn">
                      Ver Catálogo PSN →
                    </Link>
                  </div>
                </div>

                {/* Steam Card con logo oficial */}
                <div className="b2b-category-card b2b-card-steam">
                  <div className="b2b-card-img-wrap">
                    <img src={steamImg} alt="Steam PC" className="b2b-card-img" style={{ maxHeight: 75 }} />
                  </div>
                  <div className="b2b-card-body">
                    <h4 className="b2b-card-name">Steam PC Gamer</h4>
                    <p className="b2b-card-info">
                      Juegos para PC, lanzamientos y catálogo Steam listos para entregar a tus clientes.
                    </p>
                    <Link to="/categoria/steam" className="b2b-cat-link-btn">
                      Ver Catálogo Steam →
                    </Link>
                  </div>
                </div>

                {/* Suscripciones & Panda Pass */}
                <div className="b2b-category-card b2b-card-pass">
                  <div className="b2b-card-img-wrap">
                    <img src={suscripcionesImg} alt="Suscripciones" className="b2b-card-img" />
                  </div>
                  <div className="b2b-card-body">
                    <h4 className="b2b-card-name">Panda Pass & Promos</h4>
                    <p className="b2b-card-info">
                      Combos de juegos, Game Pass mensual y Panda Pass Steam al mejor precio mayorista.
                    </p>
                    <Link to="/promos" className="b2b-cat-link-btn">
                      Ver Promos & Pass →
                    </Link>
                  </div>
                </div>
                {b2bCategories
                  .filter((category) => !/switch|playstation|steam|suscrip|promo|pass/i.test(category.name || ""))
                  .map((category) => {
                    const categoryName = (category.name || "").toLowerCase();
                    const categoryImage = categoryName.includes("stream")
                      ? streamingImg
                      : categoryName.includes("ps5") || /playstation\s*5/.test(categoryName)
                      ? ps5Img
                      : categoryName.includes("ps4") || /playstation\s*4/.test(categoryName)
                      ? ps4Img
                      : category.imageUrl || category.image || category.imagen || suscripcionesImg;

                    return (
                      <div
                        className={`b2b-category-card ${categoryName.includes("stream") ? "b2b-card-streaming" : ""} ${categoryName.includes("ps5") || /playstation\s*5/.test(categoryName) ? "b2b-card-ps5" : ""} ${categoryName.includes("ps4") || /playstation\s*4/.test(categoryName) ? "b2b-card-ps4" : ""}`}
                        key={category.id}
                      >
                        <div className="b2b-card-img-wrap">
                          <img src={categoryImage} alt={category.name || "Categoría PandaStore"} className="b2b-card-img" />
                        </div>
                        <div className="b2b-card-body">
                          <h4 className="b2b-card-name">{category.name || "Categoría PandaStore"}</h4>
                          <p className="b2b-card-info">{category.description || "Explora esta categoría con tus condiciones B2B aplicadas."}</p>
                          <Link to={catUrl(category.name, category.id)} className="b2b-cat-link-btn">Ver catálogo →</Link>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* MODAL DE RECARGA DE BILLETERA VIRTUAL */}
            {isRechargeModalOpen && createPortal(
              <div className="wallet-modal-overlay" onClick={() => setIsRechargeModalOpen(false)}>
                <div className="wallet-modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="wallet-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="wallet-modal-icon-wrap">
                        <Wallet size={24} color="#10b981" />
                      </div>
                      <div>
                        <h3 className="wallet-modal-title">Cargar Saldo a tu Billetera</h3>
                        <span className="wallet-modal-sub">
                          {rechargePaymentMethod === "crypto" ? "Mínimo de recarga: 10 USDT" : "Mínimo de recarga: $5.000 CLP"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="wallet-modal-close-btn"
                      onClick={() => setIsRechargeModalOpen(false)}
                      aria-label="Cerrar modal"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Selector de Método de Pago */}
                  <div className="wallet-method-tabs">
                    {isChile && paymentSettings.mercadoPago.enabled && (
                      <button
                        type="button"
                        className={`wallet-method-tab ${rechargePaymentMethod === "mercadopago" ? "active" : ""}`}
                        onClick={() => handleSelectRechargeMethod("mercadopago")}
                      >
                        <CreditCard size={18} />
                        <span>Tarjeta débito / crédito (Chile) · hasta 12 cuotas</span>
                      </button>
                    )}
                    {isChile && paymentSettings.transfer.enabled && visibleForUser(paymentSettings.transfer, profile) && (
                      <button
                        type="button"
                        className={`wallet-method-tab ${rechargePaymentMethod === "transferencia" ? "active" : ""}`}
                        onClick={() => handleSelectRechargeMethod("transferencia")}
                      >
                        <Building2 size={18} />
                        <span>Transferencia Bancaria (Chile)</span>
                      </button>
                    )}
                    {supportsCrypto && paymentSettings.crypto.enabled && paymentSettings.crypto.address && visibleForUser(paymentSettings.crypto, profile) && (
                      <button
                        type="button"
                        className={`wallet-method-tab ${rechargePaymentMethod === "crypto" ? "active" : ""}`}
                        onClick={() => handleSelectRechargeMethod("crypto")}
                      >
                        <Wallet size={18} />
                        <span>{paymentSettings.crypto.name} · {paymentSettings.crypto.network} (USDT)</span>
                      </button>
                    )}
                  </div>

                  {/* VISTA 1: MERCADO PAGO (SOLO CHILE) */}
                  {rechargePaymentMethod === "mercadopago" && (
                    <div className="wallet-mp-section">
                      <div className="wallet-notice-box mp-notice">
                        <span style={{ fontSize: "1.4rem" }}>⚡</span>
                        <div>
                          <strong>Acreditación Automática e Inmediata</strong>
                          <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                            Aceptamos tarjetas de débito y crédito hasta 12 cuotas, o saldo de Mercado Pago. Una vez completado el pago, tu saldo se actualizará automáticamente.
                          </p>
                        </div>
                      </div>

                      <div className="wallet-input-group">
                        <label>Monto a recargar en CLP (mínimo $5.000 CLP) *</label>
                        <div className="wallet-amount-input-wrap">
                          <span className="wallet-currency-prefix">$</span>
                          <input
                            type="number"
                            placeholder="15000"
                            min={5000}
                            step="1000"
                            value={rechargeAmount}
                            onChange={(e) => setRechargeAmount(e.target.value)}
                          />
                          <span className="wallet-currency-suffix">CLP</span>
                        </div>
                      </div>

                      <div className="wallet-quick-amounts">
                        {[5000, 15000, 30000, 75000, 100000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            className={`wallet-quick-amt-btn ${Number(rechargeAmount) === amt ? "selected" : ""}`}
                            onClick={() => setRechargeAmount(String(amt))}
                          >
                            ${amt.toLocaleString("es-CL")} CLP {amt === 15000 ? "(Recomendado)" : ""}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="wallet-modal-submit-btn mp-btn"
                        disabled={mpLoading || !rechargeAmount || Number(rechargeAmount) < 5000}
                        onClick={handleRecargarMercadoPago}
                      >
                        <CreditCard size={18} />
                        <span>{mpLoading ? "Conectando con la pasarela..." : `Pagar ${rechargeAmount && Number(rechargeAmount) >= 5000 ? `$${Number(rechargeAmount).toLocaleString("es-CL")} CLP` : ""} con tarjeta`}</span>
                      </button>
                    </div>
                  )}

                  {/* VISTA 2: CRYPTO (USDT) */}
                  {rechargePaymentMethod === "crypto" && (
                    <div className="wallet-transfer-section">
                      <section className="wallet-crypto-card" aria-label="Datos para transferencia USDT">
                        <div className="wallet-crypto-card-head">
                          <div className="wallet-crypto-icon"><Wallet size={19} /></div>
                          <div>
                            <strong>Transferencia en USDT</strong>
                            <span>{paymentSettings.crypto?.name || "USDT"} · Red {paymentSettings.crypto?.network || "BEP20"}</span>
                          </div>
                        </div>
                        <div className="wallet-crypto-address">
                          <span>Dirección de destino</span>
                          <code>{paymentSettings.crypto?.address}</code>
                        </div>
                        <button type="button" className="wallet-crypto-copy-btn" onClick={() => navigator.clipboard.writeText(paymentSettings.crypto?.address || "")}>
                          <Copy size={16} /> Copiar dirección USDT
                        </button>
                      </section>

                      <div className="wallet-input-group" style={{ marginTop: 12 }}>
                        <label>
                          Monto a recargar en USDT *
                        </label>
                        <div className="wallet-amount-input-wrap">
                          <span className="wallet-currency-prefix">₮</span>
                          <input
                            type="number"
                            placeholder="50"
                            min={10}
                            step="1"
                            value={rechargeAmount}
                            onChange={(e) => setRechargeAmount(e.target.value)}
                          />
                          <span className="wallet-currency-suffix">USDT</span>
                        </div>
                      </div>

                      <div className="wallet-quick-amounts">
                        {[10, 25, 50, 100, 200].map((amt) => {
                          const isSelected = Number(rechargeAmount) === amt;
                          return (
                            <button
                              key={amt}
                              type="button"
                              className={`wallet-quick-amt-btn ${isSelected ? "selected" : ""}`}
                              onClick={() => setRechargeAmount(String(amt))}
                            >
                              {amt} USDT {amt === 50 ? "(Recomendado)" : ""}
                            </button>
                          );
                        })}
                      </div>

                      {rechargeAmount && Number(rechargeAmount) > 0 && (
                        <div className="wallet-crypto-amount-summary">
                          <span>Monto exacto a transferir</span>
                          <strong>{Number(rechargeAmount).toFixed(2)} USDT</strong>
                          <small>Se acreditarán ${(Number(rechargeAmount) * Number(valorDolar || 900)).toLocaleString("es-CL")} CLP netos en tu billetera, usando dólar administrativo a ${valorDolar || 900}.</small>
                        </div>
                      )}

                      <form onSubmit={handleRecargarBilletera} className="wallet-transfer-form">
                        <label className={`wallet-proof-picker ${rechargeFile ? "has-file" : ""}`}>
                          <input type="file" accept="image/*,.pdf" onChange={(e) => setRechargeFile(e.target.files[0] || null)} required />
                          <span className="wallet-proof-picker-copy">
                            {rechargeFile ? <CheckCircle2 size={18} /> : <UploadCloud size={18} />}
                            <span>
                              <strong>{rechargeFile ? "Comprobante listo para enviar" : "Adjunta tu comprobante USDT"}</strong>
                              <small>{rechargeFile ? rechargeFile.name : "PNG, JPG, WEBP o PDF · Máx. 10 MB"}</small>
                            </span>
                          </span>
                          <span className="wallet-proof-picker-action">{rechargeFile ? "Cambiar" : "Seleccionar archivo"}</span>
                        </label>

                        <button
                          type="submit"
                          className="wallet-modal-submit-btn transfer-btn"
                          disabled={rechargeUploading || !rechargeFile || Number(rechargeAmount) < 10}
                        >
                          <UploadCloud size={18} />
                          <span>{rechargeUploading ? "Enviando comprobante…" : rechargeFile ? "Enviar comprobante a revisión" : "Adjunta un comprobante para continuar"}</span>
                        </button>
                      </form>
                    </div>
                  )}

                  {/* VISTA 4: TRANSFERENCIA BANCARIA DIRECTA (CHILE) */}
                  {rechargePaymentMethod === "transferencia" && (
                    <div className="wallet-transfer-section">
                      <div className="wallet-notice-box transfer-notice">
                        <span style={{ fontSize: "1.4rem" }}>⏳</span>
                        <div>
                          <strong>Transferencia Bancaria Directa</strong>
                          <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                            Transfiere a cualquiera de nuestras cuentas oficiales chilenas, ingresa el monto y adjunta el comprobante.
                          </p>
                          {!isChile && (
                            <div style={{ fontSize: "0.74rem", color: "#fbbf24", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 6, padding: "4px 8px", marginTop: 6 }}>
                              ⚠️ Esta cuenta solo recibe <strong>Pesos Chilenos (CLP)</strong>.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Selector de banco */}
                      <div className="wallet-bank-selector" aria-label="Selecciona una cuenta bancaria">
                        {walletBanks.map((banco) => (
                          <button
                            key={banco.id}
                            type="button"
                            className={`wallet-bank-choice ${walletBankId === banco.id ? "active" : ""}`}
                            style={{ "--wallet-bank-color": banco.color }}
                            onClick={() => {
                              setWalletBankId(banco.id);
                              setRechargeBanco(`${banco.nombre} (${banco.tipo})`);
                            }}
                          >
                            <img src={banco.logo} alt="" />
                            <span>{banco.nombre}</span>
                            <small>{banco.badge}</small>
                          </button>
                        ))}
                      </div>

                      {activeWalletBank && (
                        <div className="wallet-bank-active-card" style={{ borderColor: `${activeWalletBank.color}66` }}>
                          <div className="wallet-bank-active-head">
                            <img src={activeWalletBank.logo} alt={`Logo ${activeWalletBank.nombre}`} />
                            <div>
                              <strong style={{ color: activeWalletBank.color }}>{activeWalletBank.nombre}</strong>
                              <span>{activeWalletBank.tipo}</span>
                            </div>
                            <em style={{ color: activeWalletBank.color, background: `${activeWalletBank.color}1f` }}>{activeWalletBank.badge}</em>
                          </div>
                          <div className="wallet-bank-active-fields">
                            <div><span>Titular</span><strong>{activeWalletBank.titular}</strong></div>
                            <div><span>RUT</span><code>{activeWalletBank.rut}</code></div>
                            <div><span>N° Cuenta</span><code>{activeWalletBank.numero}</code></div>
                            <div><span>Correo</span><code>{activeWalletBank.email}</code></div>
                          </div>
                          <button
                            type="button"
                            className="wallet-bank-copy-all"
                            onClick={() => {
                              const bank = activeWalletBank;
                              navigator.clipboard.writeText(`Banco: ${bank.nombre}\nTipo de cuenta: ${bank.tipo}\nTitular: ${bank.titular}\nRUT: ${bank.rut}\nN° de cuenta: ${bank.numero}\nCorreo: ${bank.email}`);
                              setCopiedBankIndex(bank.id);
                              setTimeout(() => setCopiedBankIndex(null), 2000);
                            }}
                          >
                            {copiedBankIndex === activeWalletBank.id ? <Check size={15} /> : <Copy size={15} />}
                            {copiedBankIndex === activeWalletBank.id ? "Datos copiados" : "Copiar todos los datos"}
                          </button>
                        </div>
                      )}

                      <div className="wallet-input-group" style={{ marginTop: 12 }}>
                        <label>Monto transferido en CLP (mínimo $5.000 CLP) *</label>
                        <div className="wallet-amount-input-wrap">
                          <span className="wallet-currency-prefix">$</span>
                          <input
                            type="number"
                            placeholder="5000"
                            min={5000}
                            step="1000"
                            value={rechargeAmount}
                            onChange={(e) => setRechargeAmount(e.target.value)}
                          />
                          <span className="wallet-currency-suffix">CLP</span>
                        </div>
                      </div>

                      <div className="wallet-quick-amounts">
                        {[5000, 15000, 30000, 75000, 100000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            className={`wallet-quick-amt-btn ${Number(rechargeAmount) === amt ? "selected" : ""}`}
                            onClick={() => setRechargeAmount(String(amt))}
                          >
                            ${amt.toLocaleString("es-CL")} CLP {amt === 15000 ? "(Recomendado)" : ""}
                          </button>
                        ))}
                      </div>

                      <form onSubmit={handleRecargarBilletera} className="wallet-transfer-form">
                        <div className="wallet-input-group">
                          <label>Foto o Captura del Comprobante de Transferencia *</label>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => setRechargeFile(e.target.files[0])}
                            required
                          />
                          {rechargeFile && (
                            <div style={{ color: "#34d399", fontSize: "0.82rem", marginTop: 4 }}>
                              ✓ Archivo seleccionado: {rechargeFile.name}
                            </div>
                          )}
                        </div>

                        <button
                          type="submit"
                          className="wallet-modal-submit-btn transfer-btn"
                          disabled={rechargeUploading || !rechargeFile || Number(rechargeAmount) < 5000}
                        >
                          <UploadCloud size={18} />
                          <span>{rechargeUploading ? "Subiendo Comprobante..." : "Enviar Comprobante para Validación"}</span>
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>,
              document.body
            )}

            {/* Historial de Transacciones */}
            <div className="perfil-wallet-history">
              <h3 className="recharge-title" style={{ marginTop: 24 }}>
                <Clock size={18} color="#a855f7" /> Historial de Movimientos de Billetera
              </h3>
              {walletTransactions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                  {walletTransactions.map(tx => {
                    const isPositive = Number(tx.monto) > 0;
                    return (
                      <div
                        key={tx.id}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 12,
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
                            {tx.descripcion || tx.tipo}
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 2 }}>
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleString("es-CL", { dateStyle: 'short', timeStyle: 'short' }) : "Reciente"}
                          </div>
                        </div>
                        <div style={{
                          fontWeight: 800,
                          fontSize: '1rem',
                          color: isPositive ? '#4ade80' : '#f87171'
                        }}>
                          {isPositive ? `+${(Number(tx.monto)).toLocaleString("es-CL")}` : `${(Number(tx.monto)).toLocaleString("es-CL")}`} CLP
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '0.88rem', padding: '16px 0' }}>
                  No tienes movimientos de billetera registrados todavía.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 7: POSTULACIÓN SER REVENDEDOR (CLIENTES) ── */}
        {activeTab === "revendedor" && canApplyToResellerProgram && (
          <div className="perfil-reseller-promo">
            {solicitudRevendedor && solicitudRevendedor.estado === "pendiente" ? (
              <div style={{
                background: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.4)',
                borderRadius: 18,
                padding: '28px 20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>⏳</div>
                <h3 style={{ color: '#facc15', margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800 }}>
                  Tu Postulación está en Revisión Manual
                </h3>
                <p style={{ color: '#cbd5e1', fontSize: '0.92rem', maxWidth: 620, margin: '0 auto 16px', lineHeight: 1.5 }}>
                  Recibimos tus datos para ser Revendedor Oficial de PandaStore. Por políticas de seguridad, el administrador revisa cada postulación individualmente antes de habilitar el rol y los precios mayoristas.
                </p>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
                  padding: '14px',
                  maxWidth: 500,
                  margin: '0 auto 20px',
                  textAlign: 'left',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ color: '#94a3b8', marginBottom: 4 }}>
                    <strong>Negocio:</strong> {solicitudRevendedor.nombre || "Registrado"}
                  </div>
                  <div style={{ color: '#94a3b8', marginBottom: 4 }}>
                    <strong>WhatsApp registrado:</strong> {solicitudRevendedor.whatsapp || "No especificado"}
                  </div>
                  <div style={{ color: '#94a3b8' }}>
                    <strong>Estado actual:</strong> <span style={{ color: '#facc15', fontWeight: 700 }}>Pendiente de Aprobación por Admin</span>
                  </div>
                </div>

                <a
                  href={`https://wa.me/56974751810?text=${encodeURIComponent(
                    `Hola PandaStore! 👋 Acabo de postular como Revendedor Oficial B2B.\n\n👤 Usuario: ${solicitudRevendedor.nombre || ""}\n📧 Correo: ${user?.email || ""}\n📱 WhatsApp: ${solicitudRevendedor.whatsapp || ""}\n\n¿Podrías revisar mi postulación para activar mi rol mayorista? ¡Muchas gracias!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                    color: '#fff',
                    textDecoration: 'none',
                    padding: '14px 20px',
                    borderRadius: 16,
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    boxShadow: '0 8px 28px rgba(37, 211, 102, 0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    maxWidth: 480,
                    margin: '0 auto',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}>
                      <img
                        src={wspLogo}
                        alt="WhatsApp Oficial"
                        style={{
                          width: 32,
                          height: 32,
                          objectFit: 'contain',
                          display: 'block',
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', minWidth: 0 }}>
                      <span style={{ fontSize: '0.94rem', fontWeight: 900, color: '#fff', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Avisar al Admin por WhatsApp
                      </span>
                      <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'rgba(255,255,255,0.95)', marginTop: 2 }}>
                        Validación rápida · +56 9 7475 1810
                      </span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '1.1rem',
                    color: '#fff',
                    fontWeight: 900,
                    background: 'rgba(0,0,0,0.18)',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    →
                  </span>
                </a>
              </div>
            ) : (
              <div>
                <div className="reseller-promo-hero">
                  <div className="reseller-promo-badge">💼 PROGRAMA OFICIAL B2B</div>
                  <h3 className="reseller-promo-title">Conviértete en Revendedor Oficial de PandaStore</h3>
                  <p className="reseller-promo-desc">
                    Emprende o expande tu tienda de videojuegos. Accede a precios con descuento mayorista garantizado, Billetera Virtual en 1-clic y soporte prioritario.
                  </p>
                </div>

                <div className="reseller-perks-grid">
                  <div className="reseller-perk-card">
                    <div className="perk-icon">🎮</div>
                    <div className="perk-title">Steam PC a Mitad de Precio</div>
                    <div className="perk-desc">50% de descuento directo en todos los juegos de Steam. Margen asegurado.</div>
                  </div>
                  <div className="reseller-perk-card">
                    <div className="perk-icon">🕹️</div>
                    <div className="perk-title">Consolas Switch &amp; PS -$5.000</div>
                    <div className="perk-desc">Descuento fijo de $5.000 CLP en cada cuenta de Nintendo Switch, PS4 y PS5.</div>
                  </div>
                  <div className="reseller-perk-card">
                    <div className="perk-icon">⚡</div>
                    <div className="perk-title">Billetera Virtual 1-Clic</div>
                    <div className="perk-desc">Paga al instante con tu saldo recargado sin comisiones bancarias.</div>
                  </div>
                </div>

                <form onSubmit={handlePostularRevendedor} className="reseller-apply-form">
                  <h4 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 14px', fontWeight: 800 }}>
                    Solicitud para Cambiar a Cuenta Revendedor B2B
                  </h4>

                  <div className="form-group-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Correo Electrónico Registrado (Tu Cuenta)</label>
                      <input
                        type="email"
                        value={user?.email || ""}
                        disabled
                        style={{ opacity: 0.75, cursor: "not-allowed", background: "rgba(255,255,255,0.03)" }}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>WhatsApp de Contacto (con código de país) *</label>
                      <input
                        type="text"
                        placeholder="Ej: +56 9 1234 5678"
                        value={postularForm.whatsapp}
                        onChange={(e) => setPostularForm({ whatsapp: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="perfil-save-btn"
                    disabled={postularLoading}
                    style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
                  >
                    <Send size={18} />
                    <span>{postularLoading ? "Enviando Solicitud..." : "🚀 Enviar Postulación a Revendedor"}</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── PHOTO CROP MODAL ── */}

      {imageToCrop && (
        <div className="perfil-cropper-overlay" onClick={() => setImageToCrop(null)}>
          <div className="perfil-cropper-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 4px", fontSize: "1.2rem", fontWeight: 800, color: "#fff" }}>
              Recortar Foto de Perfil
            </h3>
            <p style={{ margin: "0 0 14px", fontSize: "0.82rem", color: "#c4b5fd" }}>
              Ajusta el zoom y la posición para tu avatar gamer
            </p>

            <div className="perfil-cropper-box">
              <Cropper
                image={URL.createObjectURL(imageToCrop)}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="round"
                showGrid={false}
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setImageToCrop(null)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "10px 16px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={uploadingPhoto}
                className="perfil-save-btn"
                style={{ margin: 0 }}
              >
                {uploadingPhoto ? "Guardando..." : "Aplicar Foto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ALERT & CONFIRM PERSONALIZADO GAMER ── */}
      <PandaModalAlert
        isOpen={modalAlert.isOpen}
        type={modalAlert.type}
        title={modalAlert.title}
        message={modalAlert.message}
        confirmText={modalAlert.confirmText}
        cancelText={modalAlert.cancelText}
        danger={modalAlert.danger}
        onConfirm={modalAlert.onConfirm}
        onCancel={modalAlert.onCancel}
      />
    </div>
  );
}
