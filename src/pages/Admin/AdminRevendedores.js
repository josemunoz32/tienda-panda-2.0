import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  increment,
  addDoc
} from "firebase/firestore";
import {
  Users,
  Wallet,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  MessageCircle,
  Search,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  Eye,
  Percent,
  Sliders,
  Check,
  Save,
  Tag,
  ShieldAlert,
  Sparkles,
  ShoppingBag,
  Package,
  Zap,
  Info,
  TrendingUp,
  UserX
} from "lucide-react";
import {
  DEFAULT_RESELLER_DISCOUNTS,
  getResellerDiscountsConfig,
  setResellerDiscountsConfig,
  formatCLP,
  calcularPrecioRevendedor
} from "../../utils/priceHelper";
import "./AdminRevendedores.css";

const FUNCTIONS_BASE = "https://us-central1-pandastoreupdate.cloudfunctions.net";

async function sendRevendedorEmail(sol, tipo, motivo = "") {
  if (!sol.email) return;
  try {
    const currentUser = auth.currentUser;
    const token = currentUser ? await currentUser.getIdToken() : "";
    
    let asunto = "";
    let htmlBody = "";
    const nombre = sol.nombre || sol.email.split("@")[0] || "Emprendedor";

    if (tipo === "aprobada") {
      asunto = "🎉 ¡Felicidades! Tu cuenta de Revendedor Oficial PandaStore ha sido Aprobada";
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0a28; color: #ffffff; padding: 28px; border-radius: 16px; border: 1px solid #7b2ff2;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #00f5d4; font-size: 26px; margin: 0;">¡Bienvenido al Programa B2B PandaStore! 🎮</h1>
            <p style="color: #c4b5fd; font-size: 15px; margin-top: 8px;">Hola <strong>${nombre}</strong>, tu postulación como Revendedor Oficial ha sido <strong>APROBADA</strong> exitosamente.</p>
          </div>
          <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid rgba(0, 245, 212, 0.3);">
            <h3 style="color: #00f5d4; margin-top: 0;">Tus Beneficios Activos:</h3>
            <ul style="color: #e2e8f0; line-height: 1.8; padding-left: 20px;">
              <li>💎 <strong>50% de Descuento</strong> automático en todo el catálogo de Steam y Packs Especiales.</li>
              <li>🏷️ <strong>-$5.000 CLP de Descuento</strong> en títulos de Nintendo Switch y PlayStation.</li>
              <li>💳 <strong>Billetera Virtual B2B:</strong> Recarga saldo con Mercado Pago automático o transferencia y compra en 1-clic.</li>
              <li>⚡ Soporte prioritario y entregas automatizadas.</li>
            </ul>
          </div>
          <div style="text-align: center; margin-top: 28px;">
            <a href="https://pandastoregames.com/iniciar-sesion" style="display: inline-block; background: linear-gradient(135deg, #00f5d4 0%, #7b2ff2 100%); color: #08031d; font-weight: 900; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 16px;">
              Ingresar a mi Cuenta B2B
            </a>
          </div>
          <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px;">
            PandaStore Chile · Videojuegos Digitales al por Mayor · WhatsApp: +56 9 7475 1810
          </p>
        </div>
      `;
    } else {
      asunto = "Información sobre tu postulación a Revendedor PandaStore";
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0a28; color: #ffffff; padding: 28px; border-radius: 16px; border: 1px solid rgba(239, 68, 68, 0.4);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #f87171; font-size: 24px; margin: 0;">Actualización de tu Solicitud B2B</h2>
            <p style="color: #c4b5fd; font-size: 15px; margin-top: 8px;">Hola <strong>${nombre}</strong>, hemos revisado tu postulación para Revendedor Oficial.</p>
          </div>
          <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <p style="color: #e2e8f0; line-height: 1.6; margin: 0;">
              En esta oportunidad tu solicitud no pudo ser aprobada por el siguiente motivo:
            </p>
            <blockquote style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 10px 14px; margin: 12px 0 0; color: #fca5a5; font-style: italic;">
              ${motivo || "No cumple con los requisitos mínimos de postulación."}
            </blockquote>
          </div>
          <p style="color: #94a3b8; font-size: 13px; text-align: center;">
            Si crees que esto fue un error o deseas resolver dudas con el administrador, puedes escribirnos directamente por WhatsApp al <strong>+56 9 7475 1810</strong>.
          </p>
        </div>
      `;
    }

    await fetch(`${FUNCTIONS_BASE}/enviarCorreoPromocional`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        asunto,
        htmlBody,
        destinatarios: [sol.email]
      })
    });
  } catch (emailErr) {
    console.warn("No se pudo enviar correo de notificación al revendedor:", emailErr);
  }
}

export default function AdminRevendedores({ user, role }) {
  const [activeTab, setActiveTab] = useState("solicitudes"); // solicitudes | recargas | revendedores
  const [solicitudes, setSolicitudes] = useState([]);
  const [recargas, setRecargas] = useState([]);
  const [revendedores, setRevendedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal imagen comprobante
  const [previewComprobante, setPreviewComprobante] = useState(null);
  
  // Modal ajuste manual
  const [selectedUserForAdjust, setSelectedUserForAdjust] = useState(null);
  const [selectedUserForOrders, setSelectedUserForOrders] = useState(null);
  const [allOrders, setAllOrders] = useState([]);

  // Estado para gestión dinámica de descuentos y márgenes por categoría
  const [discountsConfig, setDiscountsConfig] = useState(DEFAULT_RESELLER_DISCOUNTS);
  const [savingDiscounts, setSavingDiscounts] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [saveErrorMsg, setSaveErrorMsg] = useState("");

  // Estado para la auditoría de productos del catálogo en tiempo real
  const [storeProducts, setStoreProducts] = useState([]);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [adjustingProducts, setAdjustingProducts] = useState(false);
  const [adjustSuccessMsg, setAdjustSuccessMsg] = useState("");

  useEffect(() => {
    const unsubProds = onSnapshot(collection(db, "products"), (snap) => {
      const prods = [];
      snap.forEach(d => {
        prods.push({ id: d.id, ...d.data() });
      });
      setStoreProducts(prods);
    }, (err) => {
      console.warn("Error cargando productos para auditoría:", err.message);
    });
    return () => unsubProds();
  }, []);

  const auditResults = React.useMemo(() => {
    if (!storeProducts || storeProducts.length === 0) {
      return { total: 0, healthy: [], lowMargin: [], loss: [] };
    }

    const healthy = [];
    const lowMargin = [];
    const loss = [];

    storeProducts.forEach(p => {
      const retailPrice = Number(p.priceCLP || p.pricePrimariaCLP || p.precio_clp || p.price || 0);
      if (retailPrice <= 0) return;

      const cat = (p.categoria || p.category || p.categoryId || "").toLowerCase();
      const plat = (p.plataforma || p.platform || "").toLowerCase();
      const tags = p.tags || [];

      let catKey = "otros";
      if (plat.includes("steam") || cat.includes("steam")) catKey = "steam";
      else if (cat.includes("streaming") || plat.includes("streaming") || cat.includes("pantalla")) catKey = "streaming";
      else if (plat.includes("switch") || cat.includes("switch") || cat.includes("nintendo")) catKey = "switch";
      else if (plat.includes("ps4") || plat.includes("ps5") || plat.includes("playstation") || cat.includes("playstation")) catKey = "playstation";
      else if (cat.includes("suscrip") || cat.includes("membres") || cat.includes("plus")) catKey = "suscripciones";

      const catRule = discountsConfig.categories?.[catKey] || DEFAULT_RESELLER_DISCOUNTS.categories[catKey];
      const targetMinProfit = Number(catRule?.minProfitCLP) > 0 
        ? Number(catRule.minProfitCLP) 
        : (Number(discountsConfig.minProfitCLP) > 0 ? Number(discountsConfig.minProfitCLP) : 5000);

      let cost = Number(p.costo_clp || p.costoPrimariaCLP || p.costo || 0);
      if (cost <= 0 && catKey === "switch") cost = 5000;

      const resellerPrice = calcularPrecioRevendedor(retailPrice, cat, plat, tags, cost, 0);
      const resellerProfit = resellerPrice - cost;
      const clientProfit = retailPrice - cost;

      let suggestedRetail = retailPrice;
      if (catRule.type === "percent") {
        const pct = Math.min(90, Math.max(0, Number(catRule.value) || 0));
        const divisor = (100 - pct) / 100;
        suggestedRetail = Math.ceil((cost + targetMinProfit) / (divisor > 0 ? divisor : 1));
      } else {
        const discount = Number(catRule.value) || 5000;
        suggestedRetail = cost + targetMinProfit + discount;
      }

      const itemAudit = {
        id: p.id,
        name: p.name || p.title || "Producto",
        catKey,
        retailPrice,
        cost,
        resellerPrice,
        resellerProfit,
        clientProfit,
        targetMinProfit,
        suggestedRetail
      };

      if (retailPrice < cost || resellerProfit < 0) {
        loss.push(itemAudit);
      } else if (resellerProfit < targetMinProfit) {
        lowMargin.push(itemAudit);
      } else {
        healthy.push(itemAudit);
      }
    });

    return {
      total: storeProducts.length,
      healthy,
      lowMargin,
      loss
    };
  }, [storeProducts, discountsConfig]);

  const handleBatchAdjustPrices = async () => {
    const affected = [...auditResults.loss, ...auditResults.lowMargin];
    if (affected.length === 0) {
      alert("No hay productos con márgenes en riesgo para ajustar.");
      return;
    }

    if (!window.confirm(`¿Estás seguro de ajustar automáticamente el precio de ${affected.length} productos en el catálogo para garantizar el margen mínimo?`)) {
      return;
    }

    setAdjustingProducts(true);
    setAdjustSuccessMsg("");
    try {
      let updatedCount = 0;
      for (const item of affected) {
        if (!item.id || !item.suggestedRetail) continue;
        const prodRef = doc(db, "products", item.id);
        await updateDoc(prodRef, {
          priceCLP: item.suggestedRetail,
          pricePrimariaCLP: item.suggestedRetail,
          precio_clp: item.suggestedRetail,
          price: item.suggestedRetail,
          updatedAt: new Date().toISOString()
        });
        updatedCount++;
      }
      setAdjustSuccessMsg(`🎉 ¡Se actualizaron con éxito los precios de ${updatedCount} productos! Ahora todos cumplen con tu margen de ganancia.`);
      setTimeout(() => setAdjustSuccessMsg(""), 8000);
      setShowAuditModal(false);
    } catch (err) {
      alert("Error al actualizar precios: " + err.message);
    } finally {
      setAdjustingProducts(false);
    }
  };

  const handleAdjustSingleProduct = async (item) => {
    try {
      const prodRef = doc(db, "products", item.id);
      await updateDoc(prodRef, {
        priceCLP: item.suggestedRetail,
        pricePrimariaCLP: item.suggestedRetail,
        precio_clp: item.suggestedRetail,
        price: item.suggestedRetail,
        updatedAt: new Date().toISOString()
      });
      alert(`✅ Precio de "${item.name}" actualizado a ${formatCLP(item.suggestedRetail)}.`);
    } catch (err) {
      alert("Error al actualizar producto: " + err.message);
    }
  };

  useEffect(() => {
    const unsubDisc = onSnapshot(doc(db, "config", "reseller_discounts"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.categories) {
          setDiscountsConfig({
            ...DEFAULT_RESELLER_DISCOUNTS,
            ...data,
            categories: { ...DEFAULT_RESELLER_DISCOUNTS.categories, ...data.categories }
          });
        }
      }
    }, (err) => {
      console.warn("Error leyendo config/reseller_discounts:", err.message);
    });
    return () => unsubDisc();
  }, []);

  const handleSaveDiscounts = async () => {
    setSavingDiscounts(true);
    setSaveSuccessMsg("");
    setSaveErrorMsg("");
    try {
      // 1. Sanitizar para remover cualquier valor undefined
      const cleanConfig = JSON.parse(JSON.stringify(discountsConfig));
      cleanConfig.updatedAt = new Date().toISOString();

      // 2. Persistir en Firestore
      await setDoc(doc(db, "config", "reseller_discounts"), cleanConfig, { merge: true });

      // 3. Sincronizar en memoria y localStorage inmediatamente
      setResellerDiscountsConfig(cleanConfig);
      try {
        localStorage.setItem("pandaResellerDiscounts", JSON.stringify(cleanConfig));
        window.dispatchEvent(new CustomEvent("resellerDiscountsUpdated", { detail: cleanConfig }));
      } catch (e) {}

      setSaveSuccessMsg("✅ ¡Configuración de márgenes y descuentos guardada con éxito! Actualizada en toda la tienda en vivo.");
      setTimeout(() => setSaveSuccessMsg(""), 6000);
    } catch (err) {
      console.error("Error al guardar descuentos:", err);
      const errMsg = err?.message || String(err);
      setSaveErrorMsg(`❌ Error al guardar en base de datos: ${errMsg}`);
      alert("Error al guardar descuentos: " + errMsg);
    } finally {
      setSavingDiscounts(false);
    }
  };

  const handleToggleGlobal = () => {
    setDiscountsConfig(prev => ({ ...prev, globalEnabled: !prev.globalEnabled }));
  };

  const handleMinProfitChange = (val) => {
    setDiscountsConfig(prev => ({ ...prev, minProfitCLP: Math.max(0, Number(val) || 0) }));
  };

  const handleCategoryToggle = (catKey) => {
    setDiscountsConfig(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [catKey]: {
          ...prev.categories[catKey],
          enabled: !prev.categories[catKey].enabled
        }
      }
    }));
  };

  const handleCategoryTypeChange = (catKey, newType) => {
    setDiscountsConfig(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [catKey]: {
          ...prev.categories[catKey],
          type: newType,
          value: newType === "percent" ? 50 : 5000
        }
      }
    }));
  };

  const handleCategoryValueChange = (catKey, newVal) => {
    setDiscountsConfig(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [catKey]: {
          ...prev.categories[catKey],
          value: Math.max(0, Number(newVal) || 0)
        }
      }
    }));
  };

  const handleCategoryMinProfitChange = (catKey, val) => {
    setDiscountsConfig(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [catKey]: {
          ...prev.categories[catKey],
          minProfitCLP: Math.max(0, Number(val) || 0)
        }
      }
    }));
  };

  const calculateSimulatedPrice = (basePrice, rule) => {
    if (!discountsConfig.globalEnabled || !rule || rule.enabled === false) {
      return { finalPrice: basePrice, discount: 0, percent: 0, isFree: false };
    }
    let finalPrice = basePrice;
    if (rule.type === "percent") {
      const pct = Math.min(100, Math.max(0, Number(rule.value) || 0));
      const desc = Math.round((basePrice * pct) / 100);
      finalPrice = Math.max(500, basePrice - desc);
    } else {
      const fijo = Math.max(0, Number(rule.value) || 0);
      finalPrice = Math.max(500, basePrice - fijo);
    }
    // Proteger margen mínimo simulado con costo estimado $5.000 CLP
    const categoryMinProfit = Number(rule.minProfitCLP) > 0 ? Number(rule.minProfitCLP) : Number(discountsConfig.minProfitCLP || 5000);
    const estimatedCost = 5000;
    const floorPrice = estimatedCost + categoryMinProfit;
    if (finalPrice < floorPrice && basePrice >= floorPrice) {
      finalPrice = floorPrice;
    }
    const discount = Math.max(0, basePrice - finalPrice);
    const percent = Math.round((discount / basePrice) * 100);
    return { finalPrice, discount, percent, isFree: discount >= basePrice };
  };
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Estado para gestión y reembolso de compras B2B pagadas con billetera
  const [b2bOrders, setB2bOrders] = useState([]);
  const [refundLoadingId, setRefundLoadingId] = useState(null);

  // Escuchar pedidos pagados con billetera virtual en tiempo real
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("fecha", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const ordersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllOrders(ordersList);
      const walletOrders = ordersList.filter(o => 
        o.metodoPago === "billetera" || 
        o.paymentMethod === "billetera" ||
        o.metodo_pago === "billetera" ||
        o.pagoBilletera === true
      );
      setB2bOrders(walletOrders);
    }, (err) => console.error("Error al escuchar pedidos billetera:", err));
    return () => unsub();
  }, []);

  // Handler de 1-clic para Reembolsar pedido pagado con billetera
  const handleReembolsarPedidoBilletera = async (order) => {
    if (order.reembolsado) {
      alert("Este pedido ya fue reembolsado anteriormente.");
      return;
    }
    const monto = Number(order.totalCLP || order.total || order.monto || 0);
    if (!monto || monto <= 0) {
      alert("El pedido no tiene un monto válido a reembolsar.");
      return;
    }
    const targetUid = order.uid || order.userId;
    if (!targetUid) {
      alert("No se encontró el UID del usuario asociado a este pedido.");
      return;
    }

    const confirmar = window.confirm(
      `¿Confirmas el REEMBOLSO de ${formatCLP(monto)} a la billetera virtual del revendedor (${order.email || order.userEmail || targetUid})?\n\nLos fondos se acreditarán inmediatamente a su saldo de PandaStore y el pedido quedará marcado como 'reembolsado'.`
    );
    if (!confirmar) return;

    setRefundLoadingId(order.id);
    try {
      // 1. Reintegrar saldo atómicamente a la cuenta del usuario
      await updateDoc(doc(db, "users", targetUid), {
        wallet_balance: increment(monto)
      });

      // 2. Registrar la transacción en el historial de billetera
      await addDoc(collection(db, "wallet_transactions"), {
        userId: targetUid,
        userEmail: order.email || order.userEmail || "",
        tipo: "reembolso_pedido",
        monto: monto,
        orderId: order.id,
        descripcion: `Reembolso de compra B2B - Pedido #${order.id?.slice(-8) || order.id} (${formatCLP(monto)})`,
        createdAt: new Date().toISOString(),
        adminEmail: user?.email || "admin"
      });

      // 3. Marcar pedido como reembolsado para bloquear doble reembolso
      await updateDoc(doc(db, "orders", order.id), {
        reembolsado: true,
        reembolsadoAt: new Date().toISOString(),
        reembolsadoPor: user?.email || "admin",
        estado: "reembolsado",
        transferenciaEstado: "reembolsado"
      });

      // 4. Si existe copia en users/{uid}/orders/{id}, actualizarla también
      try {
        await updateDoc(doc(db, `users/${targetUid}/orders`, order.id), {
          reembolsado: true,
          reembolsadoAt: new Date().toISOString(),
          estado: "reembolsado"
        });
      } catch (e) {}

      alert(`✅ ¡Reembolso de ${formatCLP(monto)} acreditado exitosamente a la billetera de ${order.email || order.userEmail || 'usuario'}!`);
      loadRevendedores();
    } catch (err) {
      console.error("Error al reembolsar a billetera:", err);
      alert(`Error al procesar reembolso: ${err.message}`);
    } finally {
      setRefundLoadingId(null);
    }
  };

  // Escuchar solicitudes de revendedores
  useEffect(() => {
    const q = query(collection(db, "solicitudes_revendedores"), orderBy("fecha", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSolicitudes(list);
    }, (err) => console.error("Error al escuchar solicitudes:", err));
    return () => unsub();
  }, []);

  // Escuchar recargas de billetera pendientes
  useEffect(() => {
    const q = query(collection(db, "recargas_billetera"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRecargas(list);
    }, (err) => console.error("Error al escuchar recargas:", err));
    return () => unsub();
  }, []);

  // Cargar usuarios con rol revendedor
  const loadRevendedores = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const list = [];
      snap.forEach(d => {
        const u = d.data();
        if (u.role === "revendedor" || u.resellerStatus === "aprobado") {
          list.push({ id: d.id, ...u });
        }
      });
      setRevendedores(list);
    } catch (err) {
      console.error("Error cargando revendedores:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRevendedores();
  }, []);

  // Aprobar solicitud de revendedor
  const handleAprobarSolicitud = async (sol) => {
    if (!window.confirm(`¿Aprobar a ${sol.nombre || sol.email} como Revendedor Oficial de PandaStore?`)) return;
    try {
      // 1. Actualizar usuario en Firestore
      if (sol.userId) {
        await updateDoc(doc(db, "users", sol.userId), {
          role: "revendedor",
          resellerStatus: "aprobado",
          revendedor_desde: new Date().toISOString(),
          wallet_balance: increment(0)
        });
      }
      // 2. Actualizar solicitud
      await updateDoc(doc(db, "solicitudes_revendedores", sol.id), {
        estado: "aprobada",
        aprobadaAt: new Date().toISOString(),
        aprobadaPor: user?.email || "admin"
      });

      // 3. Enviar correo de confirmación
      await sendRevendedorEmail(sol, "aprobada");

      alert(`🎉 ¡${sol.nombre || sol.email} ahora tiene el rol Revendedor Oficial! Notificación enviada por correo.`);
      loadRevendedores();
    } catch (err) {
      alert(`Error al aprobar revendedor: ${err.message}`);
    }
  };

  // Revocar rol de revendedor (quitar rol y regresar a cliente)
  const handleRevocarRevendedor = async (rev) => {
    if (!rev) return;
    const confirmMsg = `¿Estás seguro de REVOCAR el rol de Revendedor a ${rev.displayName || rev.email}?\n\n• Su cuenta volverá a tener rol de Cliente regular.\n• Perderá el acceso mayorista B2B.\n• Su saldo actual (${formatCLP(rev.wallet_balance || 0)}) se mantendrá en su billetera.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      // 1. Actualizar usuario en users
      await updateDoc(doc(db, "users", rev.id), {
        role: "cliente",
        resellerStatus: "revocado",
        isReseller: false,
        b2b_access: false,
        revocado_el: new Date().toISOString(),
        revocado_por: user?.email || "admin"
      });

      // 2. Actualizar estado en solicitudes_revendedores si existe
      try {
        const solSnap = await getDocs(query(collection(db, "solicitudes_revendedores"), where("userId", "==", rev.id)));
        for (const sDoc of solSnap.docs) {
          await updateDoc(doc(db, "solicitudes_revendedores", sDoc.id), {
            estado: "revocada",
            revocadaAt: new Date().toISOString(),
            revocadaPor: user?.email || "admin"
          });
        }
      } catch (subErr) {
        // Silently ignore if not found
      }

      alert(`✅ Se ha revocado el rol de revendedor a ${rev.email}. Su cuenta ha vuelto a ser Cliente regular.`);
      loadRevendedores();
    } catch (err) {
      console.error("Error al revocar rol:", err);
      alert("Error al revocar rol de revendedor: " + err.message);
    }
  };

  // Rechazar solicitud
  const handleRechazarSolicitud = async (sol) => {
    const motivo = window.prompt("Motivo del rechazo (opcional):", "No cumple con los requisitos mínimos.");
    if (motivo === null) return;
    try {
      if (sol.userId) {
        await updateDoc(doc(db, "users", sol.userId), {
          resellerStatus: "rechazado"
        }).catch(() => {});
      }

      await updateDoc(doc(db, "solicitudes_revendedores", sol.id), {
        estado: "rechazada",
        rechazadaAt: new Date().toISOString(),
        motivoRechazo: motivo
      });

      // Enviar correo de notificación de rechazo
      await sendRevendedorEmail(sol, "rechazada", motivo);

      alert("Solicitud rechazada y correo enviado.");
    } catch (err) {
      alert(`Error al rechazar: ${err.message}`);
    }
  };

  // Validar y acreditar recarga de billetera
  const handleAcreditarRecarga = async (recarga) => {
    const monto = Number(recarga.montoCLP || recarga.monto || 0);
    if (monto <= 0) {
      alert("Monto inválido");
      return;
    }

    if (!window.confirm(`¿Confirmas que recibiste la transferencia y deseas acreditar ${formatCLP(monto)} a la billetera de ${recarga.userEmail}?`)) {
      return;
    }

    try {
      // 1. Sumar saldo atómicamente a la billetera del usuario
      await updateDoc(doc(db, "users", recarga.userId), {
        wallet_balance: increment(monto)
      });

      // 2. Marcar recarga como aprobada
      await updateDoc(doc(db, "recargas_billetera", recarga.id), {
        estado: "aprobada",
        validadaAt: new Date().toISOString(),
        validadaPor: user?.email || "admin"
      });

      // 3. Registrar en historial de transacciones de billetera
      await addDoc(collection(db, "wallet_transactions"), {
        userId: recarga.userId,
        userEmail: recarga.userEmail,
        tipo: "recarga_transferencia",
        monto: monto,
        descripcion: `Depósito Transferencia Bancaria Aprobado (${formatCLP(monto)})`,
        createdAt: new Date().toISOString(),
        recargaId: recarga.id
      });

      alert(`✅ ¡Se acreditaron exitosamente ${formatCLP(monto)} a ${recarga.userEmail}!`);
      loadRevendedores();
    } catch (err) {
      alert(`Error al acreditar saldo: ${err.message}`);
    }
  };

  // Rechazar recarga
  const handleRechazarRecarga = async (recarga) => {
    const motivo = window.prompt("Motivo del rechazo de la recarga:", "Comprobante no válido o pago no reflejado.");
    if (motivo === null) return;
    try {
      await updateDoc(doc(db, "recargas_billetera", recarga.id), {
        estado: "rechazada",
        motivoRechazo: motivo,
        rechazadaAt: new Date().toISOString()
      });
      alert("Recarga marcada como rechazada.");
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Ajuste manual de saldo
  const handleAjustarSaldoManual = async (e) => {
    e.preventDefault();
    if (!selectedUserForAdjust) return;
    const monto = Number(adjustAmount);
    if (isNaN(monto) || monto === 0) {
      alert("Ingresa un monto válido (positivo para sumar, negativo para restar).");
      return;
    }

    setAdjustLoading(true);
    try {
      await updateDoc(doc(db, "users", selectedUserForAdjust.id), {
        wallet_balance: increment(monto)
      });

      await addDoc(collection(db, "wallet_transactions"), {
        userId: selectedUserForAdjust.id,
        userEmail: selectedUserForAdjust.email,
        tipo: monto > 0 ? "ajuste_manual_credito" : "ajuste_manual_debito",
        monto: monto,
        descripcion: `Ajuste manual administrativo: ${adjustNote || 'Sin nota'} (${formatCLP(monto)})`,
        createdAt: new Date().toISOString(),
        adminEmail: user?.email || "admin"
      });

      alert(`✅ Saldo ajustado en ${formatCLP(monto)} a ${selectedUserForAdjust.email}`);
      setSelectedUserForAdjust(null);
      setAdjustAmount("");
      setAdjustNote("");
      loadRevendedores();
    } catch (err) {
      alert(`Error al ajustar saldo: ${err.message}`);
    } finally {
      setAdjustLoading(false);
    }
  };

  // Estadísticas rápidas
  const totalRevendedores = revendedores.length;
  const solicitudesPendientes = solicitudes.filter(s => s.estado === "pendiente").length;
  const recargasPendientes = recargas.filter(r => r.estado === "pendiente").length;
  const saldoTotalBilleteras = revendedores.reduce((acc, r) => acc + (Number(r.wallet_balance) || 0), 0);

  return (
    <div className="adm-rev-container">
      {/* HEADER */}
      <div className="adm-rev-header">
        <div>
          <h1 className="adm-rev-title">
            <Wallet className="adm-rev-title-icon" /> Gestión de Revendedores & Billetera B2B
          </h1>
          <p className="adm-rev-subtitle">
            Control de postulaciones, validación de transferencias bancarias y saldos virtuales de distribuidores.
          </p>
        </div>
        <button className="adm-rev-btn-refresh" onClick={loadRevendedores} title="Actualizar datos">
          <RefreshCw size={18} /> Actualizar
        </button>
      </div>

      {/* KPI METRICS */}
      <div className="adm-rev-kpis">
        <div className="adm-rev-kpi-card">
          <div className="adm-rev-kpi-icon icon-purple"><Users size={24} /></div>
          <div>
            <div className="adm-rev-kpi-value">{totalRevendedores}</div>
            <div className="adm-rev-kpi-label">Revendedores Activos</div>
          </div>
        </div>

        <div className="adm-rev-kpi-card">
          <div className="adm-rev-kpi-icon icon-yellow"><Clock size={24} /></div>
          <div>
            <div className="adm-rev-kpi-value">{solicitudesPendientes}</div>
            <div className="adm-rev-kpi-label">Postulaciones Pendientes</div>
          </div>
        </div>

        <div className="adm-rev-kpi-card">
          <div className="adm-rev-kpi-icon icon-green"><ArrowUpRight size={24} /></div>
          <div>
            <div className="adm-rev-kpi-value">{recargasPendientes}</div>
            <div className="adm-rev-kpi-label">Recargas por Validar</div>
          </div>
        </div>

        <div className="adm-rev-kpi-card">
          <div className="adm-rev-kpi-icon icon-cyan"><DollarSign size={24} /></div>
          <div>
            <div className="adm-rev-kpi-value">{formatCLP(saldoTotalBilleteras)}</div>
            <div className="adm-rev-kpi-label">Saldo Total en Billeteras</div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="adm-rev-tabs">
        <button
          className={`adm-rev-tab ${activeTab === "solicitudes" ? "active" : ""}`}
          onClick={() => setActiveTab("solicitudes")}
        >
          <Users size={18} />
          <span>Postulaciones {solicitudesPendientes > 0 && <span className="tab-badge">{solicitudesPendientes}</span>}</span>
        </button>

        <button
          className={`adm-rev-tab ${activeTab === "recargas" ? "active" : ""}`}
          onClick={() => setActiveTab("recargas")}
        >
          <Wallet size={18} />
          <span>Validar Recargas {recargasPendientes > 0 && <span className="tab-badge warning">{recargasPendientes}</span>}</span>
        </button>

        <button
          className={`adm-rev-tab ${activeTab === "revendedores" ? "active" : ""}`}
          onClick={() => setActiveTab("revendedores")}
        >
          <ShieldCheck size={18} />
          <span>Revendedores Activos ({totalRevendedores})</span>
        </button>

        <button
          className={`adm-rev-tab ${activeTab === "compras_b2b" ? "active" : ""}`}
          onClick={() => setActiveTab("compras_b2b")}
        >
          <ShoppingBag size={18} />
          <span>Compras B2B (Billetera) {b2bOrders.length > 0 && <span className="tab-badge" style={{ background: '#34d399', color: '#0f172a' }}>{b2bOrders.length}</span>}</span>
        </button>

        <button
          className={`adm-rev-tab ${activeTab === "descuentos" ? "active" : ""}`}
          onClick={() => setActiveTab("descuentos")}
        >
          <Percent size={18} />
          <span>Márgenes & Descuentos</span>
        </button>
      </div>

      {/* SEARCH BAR (Oculta en la pestaña de descuentos) */}
      {activeTab !== "descuentos" && (
      <div className="adm-rev-search-bar">
        <Search size={18} color="#94a3b8" />
        <input
          type="text"
          placeholder="Buscar por nombre, email o WhatsApp..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="clear-btn" onClick={() => setSearchTerm("")}>✕</button>
        )}
      </div>
      )}

      {/* TAB 1: SOLICITUDES DE POSTULACIÓN */}
      {activeTab === "solicitudes" && (
        <div className="adm-rev-table-wrapper">
          <table className="adm-rev-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nombre / Negocio</th>
                <th>Contacto</th>
                <th>Canal de Venta</th>
                <th>Experiencia</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes
                .filter(s => {
                  if (!searchTerm) return true;
                  const term = searchTerm.toLowerCase();
                  return (
                    (s.nombre || "").toLowerCase().includes(term) ||
                    (s.email || "").toLowerCase().includes(term) ||
                    (s.whatsapp || "").toLowerCase().includes(term)
                  );
                })
                .map((sol) => (
                  <tr key={sol.id}>
                    <td>
                      <span className="text-muted">
                        {sol.fecha ? new Date(sol.fecha).toLocaleDateString("es-CL") : "N/A"}
                      </span>
                    </td>
                    <td>
                      <strong>{sol.nombre || "Sin nombre"}</strong>
                      <div className="text-sub">{sol.email}</div>
                    </td>
                    <td>
                      {sol.whatsapp ? (
                        <a
                          href={`https://wa.me/${String(sol.whatsapp).replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="adm-rev-wsp-link"
                        >
                          <MessageCircle size={14} /> +{sol.whatsapp}
                        </a>
                      ) : (
                        <span className="text-muted">No especificado</span>
                      )}
                    </td>
                    <td>
                      <span className="adm-rev-tag">{sol.canal || "Instagram / Redes"}</span>
                    </td>
                    <td className="adm-rev-text-cell">
                      {sol.experiencia || "Nuevo emprendedor"}
                    </td>
                    <td>
                      <span className={`status-pill status-${sol.estado || "pendiente"}`}>
                        {sol.estado || "pendiente"}
                      </span>
                    </td>
                    <td>
                      {sol.estado === "pendiente" ? (
                        <div className="action-btns">
                          <button
                            className="btn-approve"
                            onClick={() => handleAprobarSolicitud(sol)}
                            title="Aprobar rol de revendedor"
                          >
                            <CheckCircle size={16} /> Aprobar
                          </button>
                          <button
                            className="btn-reject"
                            onClick={() => handleRechazarSolicitud(sol)}
                            title="Rechazar solicitud"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted">Procesada</span>
                      )}
                    </td>
                  </tr>
                ))}
              {solicitudes.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8">
                    No hay solicitudes de revendedores registradas aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: VALIDAR RECARGAS BILLETERA */}
      {activeTab === "recargas" && (
        <div className="adm-rev-table-wrapper">
          <table className="adm-rev-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Revendedor</th>
                <th>Monto CLP</th>
                <th>Banco / Método</th>
                <th>Comprobante</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recargas
                .filter(r => {
                  if (!searchTerm) return true;
                  const term = searchTerm.toLowerCase();
                  return (
                    (r.userEmail || "").toLowerCase().includes(term) ||
                    (r.userName || "").toLowerCase().includes(term) ||
                    String(r.montoCLP || "").includes(term)
                  );
                })
                .map((rec) => (
                  <tr key={rec.id}>
                    <td>
                      <span className="text-muted">
                        {rec.createdAt ? new Date(rec.createdAt).toLocaleString("es-CL", { dateStyle: 'short', timeStyle: 'short' }) : "N/A"}
                      </span>
                    </td>
                    <td>
                      <strong>{rec.userName || "Revendedor"}</strong>
                      <div className="text-sub">{rec.userEmail}</div>
                    </td>
                    <td>
                      <span className="adm-rev-amount">{formatCLP(rec.montoCLP || rec.monto)}</span>
                      {rec.cotizacion && (
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>
                          {rec.cotizacion.moneda && rec.cotizacion.moneda !== "CLP" && (
                            <span>{rec.cotizacion.moneda} {rec.cotizacion.totalLocal || rec.cotizacion.montoLocalOriginal} · </span>
                          )}
                          <span style={{ color: "#5eead4" }}>{rec.cotizacion.cryptoUSDT || (Math.ceil((rec.montoCLP / 900) * 2) / 2).toFixed(2)} USDT</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="adm-rev-tag">{rec.banco || "Transferencia Bancaria"}</span>
                    </td>
                    <td>
                      {rec.comprobanteUrl ? (
                        <button
                          className="btn-view-receipt"
                          onClick={() => setPreviewComprobante(rec.comprobanteUrl)}
                        >
                          <Eye size={14} /> Ver Foto
                        </button>
                      ) : (
                        <span className="text-muted">Sin archivo</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill status-${rec.estado || "pendiente"}`}>
                        {rec.estado || "pendiente"}
                      </span>
                    </td>
                    <td>
                      {rec.estado === "pendiente" ? (
                        <div className="action-btns">
                          <button
                            className="btn-approve"
                            onClick={() => handleAcreditarRecarga(rec)}
                            title="Acreditar saldo a billetera"
                          >
                            <CheckCircle size={16} /> Acreditar Saldo
                          </button>
                          <button
                            className="btn-reject"
                            onClick={() => handleRechazarRecarga(rec)}
                            title="Rechazar comprobante"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted">Validada</span>
                      )}
                    </td>
                  </tr>
                ))}
              {recargas.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8">
                    No hay solicitudes de recargas registradas aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: REVENDEDORES ACTIVOS */}
      {activeTab === "revendedores" && (
        <div className="adm-rev-table-wrapper">
          <table className="adm-rev-table">
            <thead>
              <tr>
                <th>Revendedor</th>
                <th>Email</th>
                <th>Revendedor Desde</th>
                <th>Saldo Billetera</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {revendedores
                .filter(r => {
                  if (!searchTerm) return true;
                  const term = searchTerm.toLowerCase();
                  return (
                    (r.displayName || "").toLowerCase().includes(term) ||
                    (r.email || "").toLowerCase().includes(term)
                  );
                })
                .map((rev) => (
                  <tr key={rev.id}>
                    <td>
                      <strong>{rev.displayName || rev.firstName || "Sin nombre"}</strong>
                    </td>
                    <td>{rev.email}</td>
                    <td>
                      <span className="text-muted">
                        {rev.revendedor_desde ? new Date(rev.revendedor_desde).toLocaleDateString("es-CL") : "Activo"}
                      </span>
                    </td>
                    <td>
                      <span className="adm-rev-wallet-badge">
                        <Wallet size={14} /> {formatCLP(rev.wallet_balance || 0)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                          className="btn-adjust"
                          onClick={() => setSelectedUserForAdjust(rev)}
                          title="Ajustar saldo manualmente"
                        >
                          <DollarSign size={14} /> Ajustar Saldo
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedUserForOrders(rev)}
                          style={{
                            background: "rgba(162, 89, 255, 0.15)",
                            border: "1px solid rgba(162, 89, 255, 0.4)",
                            color: "#c084fc",
                            borderRadius: 8,
                            padding: "6px 12px",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6
                          }}
                          title="Ver todas las compras y reembolsar saldo"
                        >
                          <ShoppingBag size={14} /> Ver Compras
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevocarRevendedor(rev)}
                          style={{
                            background: "rgba(239, 68, 68, 0.14)",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            color: "#f87171",
                            borderRadius: 8,
                            padding: "6px 12px",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6
                          }}
                          title="Revocar rol de revendedor y regresar a cliente regular"
                        >
                          <UserX size={14} /> Revocar Rol
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {revendedores.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-8">
                    Aún no hay revendedores aprobados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3.5: COMPRAS B2B (PAGADAS CON BILLETERA) Y REEMBOLSO */}
      {activeTab === "compras_b2b" && (
        <div className="adm-rev-table-wrap">
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(162,89,255,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 8, fontSize: "1.1rem" }}>
                <ShoppingBag size={20} color="#00f5d4" />
                Historial de Compras B2B con Billetera Virtual
              </h3>
              <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.82rem" }}>
                Revisa las órdenes pagadas con saldo virtual y emite reembolsos inmediatos a la billetera en caso de cancelación.
              </p>
            </div>
            <div style={{ background: "rgba(0,245,212,0.12)", border: "1px solid rgba(0,245,212,0.3)", borderRadius: 10, padding: "6px 14px", color: "#00f5d4", fontWeight: 800, fontSize: "0.85rem" }}>
              Total Órdenes: {b2bOrders.length}
            </div>
          </div>

          <table className="adm-rev-table">
            <thead>
              <tr>
                <th>ID Pedido / Fecha</th>
                <th>Revendedor</th>
                <th>Productos / Ítems</th>
                <th>Total Billetera</th>
                <th>Estado</th>
                <th style={{ textAlign: "right" }}>Acción Administrador</th>
              </tr>
            </thead>
            <tbody>
              {b2bOrders
                .filter(o => {
                  if (!searchTerm) return true;
                  const term = searchTerm.toLowerCase();
                  const oid = String(o.id || "").toLowerCase();
                  const email = String(o.email || o.userEmail || "").toLowerCase();
                  const prodsStr = Array.isArray(o.productos)
                    ? o.productos.map(p => p.name || p.nombre || "").join(" ").toLowerCase()
                    : String(o.producto?.name || "").toLowerCase();
                  return oid.includes(term) || email.includes(term) || prodsStr.includes(term);
                })
                .map(o => {
                  const prods = Array.isArray(o.productos) ? o.productos : (o.producto ? [o.producto] : []);
                  const total = Number(o.totalCLP || o.total || o.monto || 0);
                  const isRefunded = Boolean(o.reembolsado || o.estado === "reembolsado");
                  const dateStr = o.fecha ? new Date(o.fecha).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Reciente";

                  return (
                    <tr key={o.id} style={{ background: isRefunded ? "rgba(239, 68, 68, 0.04)" : "transparent" }}>
                      <td>
                        <div style={{ fontWeight: 800, color: "#fff", fontSize: "0.88rem" }}>
                          #{o.id?.slice(-8) || o.id}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: 2 }}>
                          {dateStr}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: "0.85rem" }}>
                          {o.email || o.userEmail || "Revendedor"}
                        </div>
                        <div style={{ color: "#c4b5fd", fontSize: "0.75rem" }}>
                          UID: {o.uid || o.userId || "—"}
                        </div>
                      </td>
                      <td style={{ maxWidth: 320 }}>
                        {prods.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            {prods.slice(0, 3).map((item, pIdx) => (
                              <div key={pIdx} style={{ fontSize: "0.8rem", color: "#cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                • <strong>{item.name || item.nombre || "Juego"}</strong> {item.variante ? `(${item.variante})` : ""}
                              </div>
                            ))}
                            {prods.length > 3 && (
                              <span style={{ fontSize: "0.72rem", color: "#a259ff" }}>
                                +{prods.length - 3} producto(s) más
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Juego digital PandaStore</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 900, color: "#00f5d4", fontSize: "0.95rem" }}>
                          {formatCLP(total)}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                          💼 Pagado con Billetera
                        </div>
                      </td>
                      <td>
                        {isRefunded ? (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: "rgba(239,68,68,0.15)",
                            color: "#f87171",
                            border: "1px solid rgba(239,68,68,0.4)",
                            borderRadius: 8,
                            padding: "4px 10px",
                            fontSize: "0.75rem",
                            fontWeight: 800
                          }}>
                            💸 Reembolsado
                          </span>
                        ) : (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: "rgba(16,185,129,0.15)",
                            color: "#34d399",
                            border: "1px solid rgba(16,185,129,0.4)",
                            borderRadius: 8,
                            padding: "4px 10px",
                            fontSize: "0.75rem",
                            fontWeight: 800
                          }}>
                            ✅ Aprobado / Cobrado
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {isRefunded ? (
                          <button
                            type="button"
                            disabled
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              color: "#94a3b8",
                              borderRadius: 8,
                              padding: "6px 12px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              cursor: "not-allowed"
                            }}
                          >
                            ✔ Saldo Reembolsado
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReembolsarPedidoBilletera(o)}
                            disabled={refundLoadingId === o.id}
                            style={{
                              background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                              border: "1px solid #f87171",
                              color: "#fff",
                              borderRadius: 8,
                              padding: "7px 14px",
                              fontSize: "0.78rem",
                              fontWeight: 800,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              boxShadow: "0 2px 10px rgba(239,68,68,0.35)",
                              transition: "all 0.15s ease"
                            }}
                            title="Reintegrar saldo inmediatamente a la billetera virtual del cliente"
                          >
                            <span>💸</span>
                            <span>{refundLoadingId === o.id ? "Procesando..." : "Reembolsar a Billetera"}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              {b2bOrders.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                    💼 Aún no hay compras registradas con billetera virtual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: MÁRGENES & DESCUENTOS POR CATEGORÍA */}
      {activeTab === "descuentos" && (
        <div className="adm-discounts-wrapper">
          {/* BANNER INFORMATIVO & CONTROLES MAESTROS */}
          <div className="adm-disc-master-panel">
            <div className="adm-disc-master-info">
              <div className="adm-disc-master-title">
                <Sliders size={22} color="#00f5d4" />
                <h2>Control de Descuentos & Márgenes B2B</h2>
              </div>
              <p>
                Modifica los beneficios en tiempo real para todos los revendedores. Puedes elegir entre <strong>descuento porcentual (%)</strong> o <strong>monto fijo en pesos ($ CLP)</strong> para cada categoría, o desactivar el descuento por completo para que paguen precio público normal.
              </p>
            </div>

            <div className="adm-disc-master-controls">
              {/* Switch Global */}
              <div className="adm-disc-global-switch-card">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="control-label">Interruptor Maestro Global:</span>
                  <span style={{ fontSize: '0.82rem', color: discountsConfig.globalEnabled ? '#00f5d4' : '#f87171', fontWeight: 700 }}>
                    {discountsConfig.globalEnabled ? '🟢 Descuentos ACTIVO en toda la tienda' : '🔴 Descuentos PAUSADOS (Pagan precio normal)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleGlobal}
                  className={`btn-toggle-switch ${discountsConfig.globalEnabled ? 'on' : 'off'}`}
                >
                  {discountsConfig.globalEnabled ? 'DESACTIVAR TODO' : 'ACTIVAR DESCUENTOS'}
                </button>
              </div>

              {/* Margen mínimo de ganancia protegida */}
              <div className="adm-disc-profit-card">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="control-label">Margen Mínimo Protegido PandaStore:</span>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    Ganancia mínima neta por juego sobre el costo del proveedor.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#00f5d4', fontWeight: 800 }}>$</span>
                  <input
                    type="number"
                    className="adm-disc-input-profit"
                    value={discountsConfig.minProfitCLP || 5000}
                    onChange={(e) => handleMinProfitChange(e.target.value)}
                    step="500"
                    min="0"
                  />
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>CLP</span>
                </div>
              </div>
            </div>

            {/* BOTÓN GUARDAR CAMBIOS */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 12 }}>
              {saveSuccessMsg ? (
                <div className="adm-disc-success-toast">
                  {saveSuccessMsg}
                </div>
              ) : (
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  💡 Los cambios guardados se propagan instantáneamente a la web y al carrito de los revendedores.
                </span>
              )}

              <button
                type="button"
                className="btn-save-discounts"
                onClick={handleSaveDiscounts}
                disabled={savingDiscounts}
              >
                <Save size={18} />
                {savingDiscounts ? "Guardando..." : "Guardar Todos los Descuentos"}
              </button>
            </div>
          </div>

          {/* AUDITORÍA DE MÁRGENES Y ALERTAS EN TIEMPO REAL */}
          <div style={{
            background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.9) 100%)",
            border: (auditResults.loss.length > 0 || auditResults.lowMargin.length > 0)
              ? "1.5px solid rgba(245, 158, 11, 0.5)"
              : "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: "16px",
            padding: "20px 24px",
            marginBottom: "24px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <ShieldAlert size={22} color={auditResults.loss.length > 0 ? "#ef4444" : auditResults.lowMargin.length > 0 ? "#f59e0b" : "#10b981"} />
                  <h3 style={{ margin: 0, color: "#fff", fontSize: "1.15rem", fontWeight: 800 }}>
                    Auditoría de Márgenes y Alertas del Catálogo en Vivo
                  </h3>
                </div>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>
                  Escaneo en tiempo real de todos los productos frente a los costos y márgenes mínimos que configuras en este panel.
                </p>
              </div>

              {/* SEMÁFORO DE PRODUCTOS */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <div style={{
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  borderRadius: "10px",
                  padding: "8px 14px",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#34d399" }}>
                    {auditResults.healthy.length}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#a7f3d0", fontWeight: 700, textTransform: "uppercase" }}>
                    🟢 Margen Óptimo
                  </div>
                </div>

                <div style={{
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                  borderRadius: "10px",
                  padding: "8px 14px",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#fbbf24" }}>
                    {auditResults.lowMargin.length}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#fde68a", fontWeight: 700, textTransform: "uppercase" }}>
                    ⚠️ Margen Bajo
                  </div>
                </div>

                <div style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  borderRadius: "10px",
                  padding: "8px 14px",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#f87171" }}>
                    {auditResults.loss.length}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#fca5a5", fontWeight: 700, textTransform: "uppercase" }}>
                    🚨 Riesgo Pérdida
                  </div>
                </div>
              </div>
            </div>

            {/* MENSAJES DE ALERTA Y ACCIÓN */}
            {(auditResults.loss.length > 0 || auditResults.lowMargin.length > 0) ? (
              <div style={{
                marginTop: 16,
                padding: "12px 16px",
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12
              }}>
                <div style={{ color: "#fde68a", fontSize: "0.85rem", lineHeight: 1.5 }}>
                  ⚠️ <strong>¡Alerta de Rentabilidad!</strong> Con la regla actual, tienes <strong>{auditResults.loss.length} productos en riesgo de pérdida</strong> y <strong>{auditResults.lowMargin.length} productos</strong> donde ganarías menos del margen mínimo configurado.
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => setShowAuditModal(true)}
                    style={{
                      background: "rgba(245, 158, 11, 0.2)",
                      border: "1px solid #f59e0b",
                      color: "#fbbf24",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    <Eye size={14} /> Ver {auditResults.loss.length + auditResults.lowMargin.length} Afectados
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchAdjustPrices}
                    disabled={adjustingProducts}
                    style={{
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      border: "none",
                      color: "#fff",
                      borderRadius: "8px",
                      padding: "8px 16px",
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 2px 10px rgba(16, 185, 129, 0.3)"
                    }}
                  >
                    <Zap size={14} /> {adjustingProducts ? "Ajustando..." : "⚡ Ajustar Precios Automáticamente"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                marginTop: 16,
                padding: "10px 16px",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "10px",
                color: "#6ee7b7",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <CheckCircle size={16} color="#34d399" />
                <span>¡Excelente! Todos los productos analizados cumplen con el margen mínimo configurado. No tienes pérdidas proyectadas.</span>
              </div>
            )}

            {adjustSuccessMsg && (
              <div style={{
                marginTop: 12,
                padding: "10px 16px",
                background: "rgba(16, 185, 129, 0.2)",
                border: "1px solid #10b981",
                borderRadius: "8px",
                color: "#6ee7b7",
                fontSize: "0.85rem",
                fontWeight: 700
              }}>
                {adjustSuccessMsg}
              </div>
            )}
          </div>

          {/* GRID DE TARJETAS POR CATEGORÍA */}
          <div className="adm-disc-grid">
            {Object.entries(discountsConfig.categories || DEFAULT_RESELLER_DISCOUNTS.categories).map(([catKey, rule]) => {
              const baseTestPrice = catKey === "steam" ? 2000 : 18000;
              const sim = calculateSimulatedPrice(baseTestPrice, rule);

              return (
                <div key={catKey} className={`adm-disc-card ${rule.enabled && discountsConfig.globalEnabled ? 'active' : 'disabled'}`}>
                  {/* Card Header */}
                  <div className="adm-disc-card-head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.4rem' }}>{rule.icon || '🏷️'}</span>
                      <div>
                        <h3 className="adm-disc-card-title">{rule.label || catKey}</h3>
                        <span className="adm-disc-card-hint">{rule.defaultHint || 'Aplica a esta categoría'}</span>
                      </div>
                    </div>
                    {/* Toggle Categoría */}
                    <button
                      type="button"
                      onClick={() => handleCategoryToggle(catKey)}
                      className={`btn-cat-toggle ${rule.enabled ? 'enabled' : 'disabled'}`}
                    >
                      {rule.enabled ? 'Descuento Activo' : 'Sin Descuento'}
                    </button>
                  </div>

                  {/* Body: Configuración de Tipo y Valor */}
                  <div className="adm-disc-card-body">
                    {/* Selector de Tipo (Porcentaje vs Monto Fijo) */}
                    <div className="adm-disc-type-pills">
                      <button
                        type="button"
                        className={`type-pill ${rule.type === 'percent' ? 'selected' : ''}`}
                        onClick={() => handleCategoryTypeChange(catKey, 'percent')}
                      >
                        <Percent size={14} /> Porcentaje (%)
                      </button>
                      <button
                        type="button"
                        className={`type-pill ${rule.type === 'fixed_clp' ? 'selected' : ''}`}
                        onClick={() => handleCategoryTypeChange(catKey, 'fixed_clp')}
                      >
                        <DollarSign size={14} /> Monto Fijo ($ CLP)
                      </button>
                    </div>

                    {/* Input de Valor */}
                    <div className="adm-disc-value-row">
                      <label style={{ fontSize: '0.85rem', color: '#c4b5fd', fontWeight: 700 }}>
                        {rule.type === 'percent' ? 'Porcentaje de Descuento:' : 'Monto de Descuento:'}
                      </label>
                      <div className="adm-disc-input-wrap">
                        {rule.type === 'fixed_clp' && <span className="input-prefix">$</span>}
                        <input
                          type="number"
                          className="adm-disc-value-input"
                          value={rule.value || 0}
                          onChange={(e) => handleCategoryValueChange(catKey, e.target.value)}
                          min="0"
                          max={rule.type === 'percent' ? 100 : 100000}
                          step={rule.type === 'percent' ? 5 : 500}
                        />
                        <span className="input-suffix">
                          {rule.type === 'percent' ? '%' : 'CLP'}
                        </span>
                      </div>
                    </div>

                    {/* Botones de Ajuste Rápido */}
                    <div className="adm-disc-quick-chips">
                      {rule.type === 'percent' ? (
                        [0, 10, 20, 30, 40, 50].map(val => (
                          <button
                            key={val}
                            type="button"
                            className={`quick-chip ${rule.value === val ? 'active' : ''}`}
                            onClick={() => handleCategoryValueChange(catKey, val)}
                          >
                            {val === 0 ? '0% (Sin Dcto)' : `${val}%`}
                          </button>
                        ))
                      ) : (
                        [0, 1000, 2000, 3000, 5000, 10000].map(val => (
                          <button
                            key={val}
                            type="button"
                            className={`quick-chip ${rule.value === val ? 'active' : ''}`}
                            onClick={() => handleCategoryValueChange(catKey, val)}
                          >
                            {val === 0 ? '$0' : `$${(val / 1000)}k`}
                          </button>
                        ))
                      )}
                    </div>

                    {/* Margen Mínimo de Ganancia PandaStore para esta Categoría */}
                    <div className="adm-disc-value-row" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed rgba(162, 89, 255, 0.25)' }}>
                      <label style={{ fontSize: '0.82rem', color: '#00f5d4', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ShieldAlert size={14} color="#00f5d4" />
                        Margen Mínimo de Ganancia PandaStore:
                      </label>
                      <div className="adm-disc-input-wrap">
                        <span className="input-prefix">$</span>
                        <input
                          type="number"
                          className="adm-disc-value-input"
                          style={{ borderColor: 'rgba(0, 245, 212, 0.4)', color: '#00f5d4' }}
                          value={rule.minProfitCLP !== undefined ? rule.minProfitCLP : (discountsConfig.minProfitCLP || 5000)}
                          onChange={(e) => handleCategoryMinProfitChange(catKey, e.target.value)}
                          min="0"
                          max={50000}
                          step={500}
                        />
                        <span className="input-suffix">CLP</span>
                      </div>
                    </div>

                    {/* Botones rápidos de margen mínimo */}
                    <div className="adm-disc-quick-chips" style={{ marginTop: 4 }}>
                      {[1000, 2000, 3000, 4000, 5000, 6000].map(mVal => {
                        const currentMargin = rule.minProfitCLP !== undefined ? rule.minProfitCLP : (discountsConfig.minProfitCLP || 5000);
                        return (
                          <button
                            key={mVal}
                            type="button"
                            className={`quick-chip ${currentMargin === mVal ? 'active' : ''}`}
                            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                            onClick={() => handleCategoryMinProfitChange(catKey, mVal)}
                          >
                            +${mVal / 1000}k
                          </button>
                        );
                      })}
                    </div>

                    {/* CAJA DE SIMULACIÓN EN VIVO */}
                    <div className="adm-disc-sim-box">
                      <div className="sim-title">
                        <span>📊 Ejemplo de Cobro Real:</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          Juego base {formatCLP(baseTestPrice)}
                        </span>
                      </div>
                      
                      {rule.enabled && discountsConfig.globalEnabled && sim.discount > 0 ? (
                        <div className="sim-details">
                          <div className="sim-row">
                            <span style={{ color: '#94a3b8' }}>Precio Público:</span>
                            <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{formatCLP(baseTestPrice)}</span>
                          </div>
                          <div className="sim-row highlight">
                            <span style={{ color: '#00f5d4', fontWeight: 800 }}>Paga Revendedor:</span>
                            <span style={{ color: '#00f5d4', fontWeight: 900, fontSize: '1.05rem' }}>{formatCLP(sim.finalPrice)}</span>
                          </div>
                          <div className="sim-badge-row">
                            <span className="sim-badge-green">
                              💎 Ahorro Revendedor: -{formatCLP(sim.discount)} ({sim.percent}% OFF)
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="sim-disabled-notice">
                          <span>🚫 Sin Descuento Activo</span>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>El revendedor pagará el 100% del precio público ({formatCLP(baseTestPrice)}).</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* BOTÓN FLOTANTE INFERIOR */}
          <div style={{ textAlign: 'center', marginTop: 28, paddingBottom: 20 }}>
            {saveSuccessMsg && (
              <div style={{
                maxWidth: 600,
                margin: "0 auto 16px",
                padding: "12px 18px",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1.5px solid #10b981",
                borderRadius: "10px",
                color: "#6ee7b7",
                fontWeight: 700,
                fontSize: "0.95rem"
              }}>
                {saveSuccessMsg}
              </div>
            )}
            {saveErrorMsg && (
              <div style={{
                maxWidth: 600,
                margin: "0 auto 16px",
                padding: "12px 18px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1.5px solid #ef4444",
                borderRadius: "10px",
                color: "#fca5a5",
                fontWeight: 700,
                fontSize: "0.95rem"
              }}>
                {saveErrorMsg}
              </div>
            )}
            <button
              type="button"
              className="btn-save-discounts large"
              onClick={handleSaveDiscounts}
              disabled={savingDiscounts}
            >
              <Save size={20} />
              {savingDiscounts ? "Guardando Cambios en Servidor..." : "💾 Guardar Todos los Descuentos y Márgenes"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL COMPROBANTE PREVIEW */}
      {previewComprobante && (
        <div className="adm-rev-modal-overlay" onClick={() => setPreviewComprobante(null)}>
          <div className="adm-rev-modal-receipt" onClick={(e) => e.stopPropagation()}>
            <button className="adm-rev-modal-close" onClick={() => setPreviewComprobante(null)}>✕</button>
            <h3>Comprobante de Transferencia</h3>
            <div className="adm-rev-receipt-img-wrap">
              <img src={previewComprobante} alt="Comprobante" />
            </div>
            <a
              href={previewComprobante}
              target="_blank"
              rel="noreferrer"
              className="adm-rev-btn-full"
            >
              <ExternalLink size={16} /> Abrir imagen original en nueva pestaña
            </a>
          </div>
        </div>
      )}

      {/* MODAL AJUSTE MANUAL SALDO */}
      {selectedUserForAdjust && (
        <div className="adm-rev-modal-overlay" onClick={() => setSelectedUserForAdjust(null)}>
          <div className="adm-rev-modal-adjust" onClick={(e) => e.stopPropagation()}>
            <button className="adm-rev-modal-close" onClick={() => setSelectedUserForAdjust(null)}>✕</button>
            <h3>Ajustar Saldo Manual de Billetera</h3>
            <p className="text-muted">
              Revendedor: <strong>{selectedUserForAdjust.email}</strong><br/>
              Saldo Actual: <strong>{formatCLP(selectedUserForAdjust.wallet_balance || 0)}</strong>
            </p>
            <form onSubmit={handleAjustarSaldoManual}>
              <div className="form-group">
                <label>Monto a ajustar en CLP (+ para sumar, - para restar):</label>
                <input
                  type="number"
                  placeholder="Ej: 10000 o -5000"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Motivo o Nota del Ajuste:</label>
                <input
                  type="text"
                  placeholder="Ej: Bonificación, corrección de orden, recarga en efectivo..."
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setSelectedUserForAdjust(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={adjustLoading}>
                  {adjustLoading ? "Guardando..." : "Confirmar Ajuste"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE PRODUCTOS EN RIESGO / AUDITORÍA */}
      {showAuditModal && (
        <div className="adm-rev-modal-overlay" onClick={() => setShowAuditModal(false)}>
          <div className="adm-rev-modal-adjust" style={{ maxWidth: 840, maxHeight: "85vh", overflowY: "auto", width: "95%" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 8, fontSize: "1.2rem" }}>
                  <ShieldAlert size={22} color="#f59e0b" />
                  Productos del Catálogo con Margen en Riesgo ({auditResults.loss.length + auditResults.lowMargin.length})
                </h3>
                <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.82rem" }}>
                  Lista de productos cuyo precio cliente actual no permite garantizar tu margen mínimo de ganancia al venderle a revendedores.
                </p>
              </div>
              <button className="adm-rev-modal-close" onClick={() => setShowAuditModal(false)}>✕</button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <button
                type="button"
                onClick={handleBatchAdjustPrices}
                disabled={adjustingProducts}
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  border: "none",
                  color: "#fff",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <Zap size={14} /> {adjustingProducts ? "Ajustando..." : `⚡ Ajustar Todos los (${auditResults.loss.length + auditResults.lowMargin.length}) Precios`}
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="adm-rev-table" style={{ fontSize: "0.85rem" }}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio Actual</th>
                    <th>Costo Est.</th>
                    <th>Ganancia Rev.</th>
                    <th>Precio Sugerido</th>
                    <th style={{ textAlign: "right" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {[...auditResults.loss, ...auditResults.lowMargin].map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                      </td>
                      <td>
                        <span style={{ textTransform: "uppercase", fontSize: "0.72rem", background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: 4 }}>
                          {item.catKey}
                        </span>
                      </td>
                      <td>{formatCLP(item.retailPrice)}</td>
                      <td>{formatCLP(item.cost)}</td>
                      <td>
                        <span style={{
                          color: item.resellerProfit < 0 ? "#f87171" : "#fbbf24",
                          fontWeight: 800
                        }}>
                          {item.resellerProfit < 0 ? `-${formatCLP(Math.abs(item.resellerProfit))}` : `+${formatCLP(item.resellerProfit)}`}
                        </span>
                        <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                          (Exige: {formatCLP(item.targetMinProfit)})
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: "#00f5d4" }}>
                          {formatCLP(item.suggestedRetail)}
                        </strong>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleAdjustSingleProduct(item)}
                          style={{
                            background: "rgba(0, 245, 212, 0.15)",
                            border: "1px solid rgba(0, 245, 212, 0.4)",
                            color: "#00f5d4",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          Fijar a {formatCLP(item.suggestedRetail)}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* MODAL HISTORIAL DE COMPRAS DEL REVENDEDOR Y REEMBOLSO */}
      {selectedUserForOrders && (
        <div className="adm-rev-modal-overlay" onClick={() => setSelectedUserForOrders(null)}>
          <div className="adm-rev-modal-content" style={{ maxWidth: 840, width: "95%" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(162, 89, 255, 0.2)", paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 8, fontSize: "1.2rem" }}>
                  <ShoppingBag size={22} color="#00f5d4" />
                  Compras de {selectedUserForOrders.displayName || selectedUserForOrders.email}
                </h3>
                <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.82rem" }}>
                  Saldo Billetera actual: <strong style={{ color: "#00f5d4" }}>{formatCLP(selectedUserForOrders.wallet_balance || 0)}</strong> · Correo: {selectedUserForOrders.email}
                </p>
              </div>
              <button
                type="button"
                className="clear-btn"
                onClick={() => setSelectedUserForOrders(null)}
                style={{ fontSize: "1.2rem", color: "#94a3b8", cursor: "pointer", background: "none", border: "none" }}
              >
                ✕
              </button>
            </div>

            {(() => {
              const uOrders = allOrders.filter(o => 
                (o.uid && o.uid === selectedUserForOrders.id) ||
                (o.userId && o.userId === selectedUserForOrders.id) ||
                (o.email && o.email.toLowerCase() === selectedUserForOrders.email?.toLowerCase()) ||
                (o.userEmail && o.userEmail.toLowerCase() === selectedUserForOrders.email?.toLowerCase())
              );

              if (uOrders.length === 0) {
                return (
                  <div style={{ textAlign: "center", padding: "36px 20px", color: "#94a3b8" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 8 }}>🛒</div>
                    <p style={{ margin: 0, fontSize: "0.95rem" }}>Este revendedor aún no ha registrado compras en la tienda.</p>
                  </div>
                );
              }

              return (
                <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                  <table className="adm-rev-table" style={{ fontSize: "0.85rem" }}>
                    <thead>
                      <tr>
                        <th>Pedido / Fecha</th>
                        <th>Productos</th>
                        <th>Total</th>
                        <th>Método de Pago</th>
                        <th style={{ textAlign: "right" }}>Reembolso Billetera</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uOrders.map((o) => {
                        const prods = Array.isArray(o.productos) ? o.productos : (o.producto ? [o.producto] : []);
                        const total = Number(o.totalCLP || o.total || o.monto || 0);
                        const isWallet = o.metodoPago === "billetera" || o.paymentMethod === "billetera" || o.metodo_pago === "billetera" || o.pagoBilletera === true;
                        const isRefunded = Boolean(o.reembolsado || o.estado === "reembolsado");
                        const dateStr = o.fecha ? new Date(o.fecha).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Reciente";

                        return (
                          <tr key={o.id} style={{ background: isRefunded ? "rgba(239, 68, 68, 0.05)" : "transparent" }}>
                            <td>
                              <div style={{ fontWeight: 800, color: "#fff" }}>#{o.id?.slice(-8) || o.id}</div>
                              <div style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: 2 }}>{dateStr}</div>
                            </td>
                            <td>
                              {prods.map((item, pIdx) => (
                                <div key={pIdx} style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
                                  • {item.name || item.nombre || "Juego"} {item.variante ? `(${item.variante})` : ""}
                                </div>
                              ))}
                            </td>
                            <td>
                              <strong style={{ color: isWallet ? "#00f5d4" : "#fff" }}>{formatCLP(total)}</strong>
                            </td>
                            <td>
                              {isWallet ? (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#00f5d4", background: "rgba(0,245,212,0.12)", padding: "3px 8px", borderRadius: 6, fontSize: "0.76rem", fontWeight: 700 }}>
                                  💼 Billetera B2B
                                </span>
                              ) : (
                                <span style={{ color: "#94a3b8", fontSize: "0.76rem" }}>
                                  💳 {o.metodoPago || o.paymentMethod || "Transferencia / WebPay"}
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {isWallet ? (
                                isRefunded ? (
                                  <span style={{ color: "#f87171", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "4px 8px", fontSize: "0.75rem", fontWeight: 800 }}>
                                    💸 Reembolsado
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleReembolsarPedidoBilletera(o)}
                                    disabled={refundLoadingId === o.id}
                                    style={{
                                      background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                                      color: "#fff",
                                      border: "none",
                                      borderRadius: 6,
                                      padding: "6px 12px",
                                      fontSize: "0.75rem",
                                      fontWeight: 800,
                                      cursor: "pointer",
                                      boxShadow: "0 2px 8px rgba(239,68,68,0.3)"
                                    }}
                                  >
                                    {refundLoadingId === o.id ? "Procesando..." : "💸 Reembolsar"}
                                  </button>
                                )
                              ) : (
                                <span style={{ color: "#64748b", fontSize: "0.72rem", fontStyle: "italic" }}>
                                  Solo billetera
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
