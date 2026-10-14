import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
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
  ShieldCheck,
  Key,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  DollarSign,
  PlusCircle,
  Edit2,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  Zap,
  Building2,
  ExternalLink,
  Check,
  X,
  Clock,
  Sparkles,
  ShoppingBag
} from "lucide-react";
import "./AdminDistribuidores.css";

const PLAN_CONFIG = {
  basico: { name: "Básico (60 claves)", baseQuota: 60, price: 50000, color: "#38bdf8" },
  pro: { name: "Pro (130 claves + 3 All-Access)", baseQuota: 130, price: 85000, color: "#c084fc" },
  supreme: { name: "Supreme (250 claves + 8 All-Access)", baseQuota: 250, price: 139000, color: "#fbbf24" },
  vitalicio: { name: "Vitalicio (70 claves perpetuas)", baseQuota: 70, price: 270000, color: "#34d399", isLifetime: true }
};

function formatCLP(amount) {
  const num = Math.round(Number(amount) || 0);
  return "$" + num.toLocaleString("es-CL");
}

export default function AdminDistribuidores({ user, role }) {
  const [distribuidores, setDistribuidores] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [transferRequests, setTransferRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [allOrders, setAllOrders] = useState([]);
  const [selectedDistForOrders, setSelectedDistForOrders] = useState(null);
  const [refundLoadingId, setRefundLoadingId] = useState(null);

  // Modal Asignar / Editar Distribuidor
  const [showModal, setShowModal] = useState(false);
  const [editingDist, setEditingDist] = useState(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("basico");
  const [customQuota, setCustomQuota] = useState("");
  const [expiryDays, setExpiryDays] = useState(30);
  const [modalLoading, setModalLoading] = useState(false);

  // Modal Recarga de Claves Extras
  const [showExtraKeysModal, setShowExtraKeysModal] = useState(false);
  const [distForExtras, setDistForExtras] = useState(null);
  const [extraKeysToAdd, setExtraKeysToAdd] = useState(5);
  const [extraKeysReason, setExtraKeysReason] = useState("");
  const [extraKeysLoading, setExtraKeysLoading] = useState(false);

  // Cargar datos
  const loadData = async () => {
    setLoading(true);
    try {
      const [usersSnap, licSnap, reqSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "licenses")),
        getDocs(collection(db, "solicitudes_distribuidores"))
      ]);

      const distList = [];
      const userList = [];
      usersSnap.forEach((d) => {
        const u = { id: d.id, ...d.data() };
        userList.push(u);
        if (u.role === "distribuidor" || u.steam_distributor === true) {
          distList.push(u);
        }
      });

      const licList = [];
      licSnap.forEach((d) => {
        licList.push({ id: d.id, ...d.data() });
      });

      const reqList = [];
      reqSnap.forEach((d) => {
        reqList.push({ id: d.id, ...d.data() });
      });
      reqList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      setDistribuidores(distList);
      setAllUsers(userList);
      setLicenses(licList);
      setTransferRequests(reqList);
    } catch (e) {
      console.error("Error cargando distribuidores:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      setAllOrders(list);
    });
    return () => unsub();
  }, []);

  // ─── REEMBOLSAR PEDIDO A BILLETERA (SOLO SI FUE PAGADO CON BILLETERA) ────
  const handleReembolsarPedidoBilletera = async (order, dist) => {
    if (!order || !dist) return;
    const isWallet =
      order.metodoPago === "billetera" ||
      order.paymentMethod === "billetera" ||
      order.metodo_pago === "billetera" ||
      order.pagoBilletera === true;

    if (!isWallet) {
      alert(
        "Solo se pueden reembolsar automáticamente a la billetera los pedidos pagados con Billetera (Saldo B2B). Este pedido fue procesado con otro medio de pago."
      );
      return;
    }
    if (order.reembolsado === true || order.estado === "reembolsado") {
      alert("Este pedido ya fue marcado como reembolsado previamente.");
      return;
    }

    const monto = Number(order.totalCLP || order.total || order.monto || 0);
    if (monto <= 0) {
      alert("El monto de este pedido es inválido ($0).");
      return;
    }

    const confirmMsg = `¿Confirmas el REEMBOLSO de ${formatCLP(monto)} a la billetera de ${
      dist.displayName || dist.email
    }?\n\n- Se sumará inmediatamente ${formatCLP(monto)} a su saldo de billetera.\n- El pedido #${
      order.id?.slice(-8) || order.id
    } quedará como Reembolsado.`;
    if (!window.confirm(confirmMsg)) return;

    setRefundLoadingId(order.id);
    try {
      // 1. Acreditar saldo a users/{dist.id}.wallet_balance
      await updateDoc(doc(db, "users", dist.id), {
        wallet_balance: increment(monto)
      });

      // 2. Marcar pedido en colección global orders
      await updateDoc(doc(db, "orders", order.id), {
        reembolsado: true,
        estado: "reembolsado",
        fechaReembolso: new Date().toISOString(),
        reembolsadoPor: user?.email || "admin"
      });

      // 3. Subcolección users/{dist.id}/orders/{order.id}
      try {
        await updateDoc(doc(db, "users", dist.id, "orders", order.id), {
          reembolsado: true,
          estado: "reembolsado",
          fechaReembolso: new Date().toISOString()
        });
      } catch (subErr) {
        // Silently ignore if not in subcollection
      }

      // 4. Registrar en wallet_transactions para trazabilidad
      await addDoc(collection(db, "wallet_transactions"), {
        userId: dist.id,
        userEmail: dist.email,
        tipo: "reembolso_pedido",
        monto: monto,
        orderId: order.id,
        descripcion: `Reembolso de pedido #${order.orderNumber || order.id?.slice(-8) || order.id} a distribuidor`,
        createdAt: new Date().toISOString(),
        adminEmail: user?.email || "admin"
      });

      // 5. Actualizar en el estado local de distribuidores el saldo reflejado
      setDistribuidores((prev) =>
        prev.map((d) =>
          d.id === dist.id
            ? { ...d, wallet_balance: (Number(d.wallet_balance) || 0) + monto }
            : d
        )
      );
      if (selectedDistForOrders && selectedDistForOrders.id === dist.id) {
        setSelectedDistForOrders((prev) => ({
          ...prev,
          wallet_balance: (Number(prev.wallet_balance) || 0) + monto
        }));
      }

      alert(`✅ ¡Reembolso exitoso! Se han devuelto ${formatCLP(monto)} a la billetera de ${dist.email}.`);
    } catch (err) {
      console.error("Error al reembolsar pedido a distribuidor:", err);
      alert("Error al procesar el reembolso: " + err.message);
    } finally {
      setRefundLoadingId(null);
    }
  };

  // ─── GUARDAR O ASIGNAR DISTRIBUIDOR (EXISTENTE O NUEVO POR CORREO) ───────
  const handleSaveDistribuidor = async (e) => {
    e.preventDefault();
    setModalLoading(true);

    try {
      const emailClean = selectedUserEmail.trim().toLowerCase();
      let targetUser = editingDist;

      if (!targetUser) {
        targetUser = allUsers.find(
          (u) => (u.email || "").toLowerCase() === emailClean
        );
      }

      // Si no está en allUsers, buscar en la colección users por si acaso
      if (!targetUser) {
        const qUsers = query(collection(db, "users"), where("email", "==", emailClean));
        const qSnap = await getDocs(qUsers);
        if (!qSnap.empty) {
          const foundDoc = qSnap.docs[0];
          targetUser = { id: foundDoc.id, ...foundDoc.data() };
        }
      }

      // Si definitivamente NO existe en los usuarios registrados de PandaStore:
      if (!targetUser) {
        alert(
          `❌ El correo "${emailClean}" no pertenece a ningún usuario registrado.\n\nPara asignarle el rol de distribuidor, el cliente DEBE estar registrado previamente en PandaStore.\n\nPídele que cree su cuenta en la tienda (con ese mismo correo) y luego podrás asignarlo.`
        );
        setModalLoading(false);
        return;
      }

      const planConf = PLAN_CONFIG[selectedPlan] || PLAN_CONFIG.basico;
      const quota = Number(customQuota) || planConf.baseQuota;
      const now = new Date();
      const expiresAt = planConf.isLifetime
        ? null
        : new Date(now.getTime() + Number(expiryDays) * 24 * 60 * 60 * 1000).toISOString();

      // El acceso Steam es una capacidad adicional: no reemplaza el rol de
      // revendedor ni sus precios mayoristas.
      await updateDoc(doc(db, "users", targetUser.id), {
        steam_distributor: true,
        distributor_plan: selectedPlan,
        custom_quota: quota,
        distributor_expires_at: expiresAt,
        distributor_status: "active",
        distributor_since: targetUser.distributor_since || now.toISOString(),
        updatedAt: now.toISOString()
      });

      alert(`🎉 ¡Listo! Rol de Distribuidor Steam asignado a ${targetUser.email} (Plan ${planConf.name} con ${quota} claves/mes).`);

      setShowModal(false);
      setEditingDist(null);
      setSelectedUserEmail("");
      loadData();
    } catch (err) {
      alert(`Error al guardar distribuidor: ${err.message}`);
    } finally {
      setModalLoading(false);
    }
  };

  // ─── RECARGAR CLAVES EXTRAS RÁPIDO PARA UN DISTRIBUIDOR ─────────────────
  const handleAddExtraKeys = async (e) => {
    e.preventDefault();
    if (!distForExtras) return;
    const qty = Number(extraKeysToAdd);
    if (!qty || qty <= 0) {
      alert("Ingresa una cantidad válida de claves.");
      return;
    }

    setExtraKeysLoading(true);
    try {
      await updateDoc(doc(db, "users", distForExtras.id), {
        extra_keys: increment(qty),
        updatedAt: new Date().toISOString()
      });

      await addDoc(collection(db, "wallet_transactions"), {
        userId: distForExtras.id,
        userEmail: distForExtras.email,
        tipo: "recarga_admin_claves_extras",
        monto: 0,
        descripcion: `Recarga manual de +${qty} claves extras por Administrador (${extraKeysReason || "Gestión directa"})`,
        createdAt: new Date().toISOString()
      });

      alert(`🎉 Se añadieron +${qty} claves extras a ${distForExtras.email} correctamente.`);
      setShowExtraKeysModal(false);
      setDistForExtras(null);
      setExtraKeysReason("");
      loadData();
    } catch (err) {
      alert(`Error al añadir claves extras: ${err.message}`);
    } finally {
      setExtraKeysLoading(false);
    }
  };

  // ─── PAUSAR / REACTIVAR DISTRIBUIDOR ────────────────────────────────────
  const handleToggleStatus = async (dist) => {
    const currentStatus = dist.distributor_status || "active";
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    const msg = newStatus === "active" ? "reactivar" : "suspender";

    if (!window.confirm(`¿Deseas ${msg} el acceso distribuidor de ${dist.email}?`)) return;

    try {
      await updateDoc(doc(db, "users", dist.id), {
        distributor_status: newStatus,
        updatedAt: new Date().toISOString()
      });
      loadData();
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  };

  // ─── GESTIONAR SOLICITUD DE TRANSFERENCIA (APROBAR / RECHAZAR) ──────────
  const handleApproveTransfer = async (req) => {
    if (!window.confirm(`¿Aprobar solicitud de transferencia de ${req.userEmail} por ${formatCLP(req.montoCLP)}?`)) {
      return;
    }

    try {
      const now = new Date();
      if (req.tipo === "adquisicion_plan") {
        const planKey = req.planId || "basico";
        const planConf = PLAN_CONFIG[planKey] || PLAN_CONFIG.basico;
        const expiresAt = planConf.isLifetime
          ? null
          : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

        // setDoc con merge soporta también cuentas Auth que aún no tenían
        // documento completo en /users, evitando aprobar una solicitud sin
        // habilitar realmente el portal.
        await setDoc(doc(db, "users", req.userId), {
          steam_distributor: true,
          distributor_plan: planKey,
          custom_quota: planConf.baseQuota,
          distributor_expires_at: expiresAt,
          distributor_status: "active",
          distributor_since: now.toISOString(),
          updatedAt: now.toISOString()
        }, { merge: true });
      } else if (req.tipo === "recarga_billetera") {
        await updateDoc(doc(db, "users", req.userId), {
          wallet_balance: increment(Number(req.montoCLP) || 0),
          updatedAt: now.toISOString()
        });
      } else {
        // Claves extras
        const extrasCount = req.extraCount || 5;
        await updateDoc(doc(db, "users", req.userId), {
          extra_keys: increment(extrasCount),
          updatedAt: now.toISOString()
        });
      }

      await updateDoc(doc(db, "solicitudes_distribuidores", req.id), {
        estado: "aprobada",
        aprobadoPor: user?.email || "admin",
        aprobadoAt: now.toISOString()
      });

      alert(req.tipo === "adquisicion_plan"
        ? "🎉 ¡Plan aprobado! El distribuidor ya puede ingresar al Portal Steam."
        : req.tipo === "recarga_billetera"
        ? "🎉 ¡Recarga aprobada! El saldo ya fue acreditado en la billetera."
        : "🎉 ¡Claves extras aprobadas y acreditadas correctamente!");
      loadData();
    } catch (err) {
      alert(`Error al aprobar: ${err.message}`);
    }
  };

  const handleRejectTransfer = async (req) => {
    const motivo = prompt("Motivo de rechazo (opcional):", "Comprobante no coincide o no recibido.");
    if (motivo === null) return;

    try {
      await updateDoc(doc(db, "solicitudes_distribuidores", req.id), {
        estado: "rechazada",
        motivoRechazo: motivo,
        rechazadoAt: new Date().toISOString()
      });
      alert("Solicitud rechazada.");
      loadData();
    } catch (err) {
      alert(`Error al rechazar: ${err.message}`);
    }
  };

  const pendingRequests = transferRequests.filter((r) => r.estado === "pendiente");

  return (
    <div className="adm-dist-container">
      {/* HEADER */}
      <div className="adm-dist-header">
        <div>
          <h1 className="adm-dist-title">
            <ShieldCheck className="adm-dist-title-icon" /> Control Maestro de Distribuidores Steam
          </h1>
          <p className="adm-dist-subtitle">
            Supervisa planes Steam (Básico $50k / Pro $85k / Supreme $139k / Vitalicio $270k), cuotas mensuales y recargas.
          </p>
        </div>

        <div className="adm-dist-header-actions">
          <button className="btn-refresh" onClick={loadData} title="Refrescar">
            <RefreshCw size={18} />
          </button>
          <button
            className="btn-add-dist"
            onClick={() => {
              setEditingDist(null);
              setSelectedUserEmail("");
              setSelectedPlan("basico");
              setCustomQuota("60");
              setExpiryDays(30);
              setShowModal(true);
            }}
          >
            <PlusCircle size={18} /> Asignar Nuevo Distribuidor
          </button>
        </div>
      </div>

      {/* KPIS */}
      <div className="adm-dist-kpis">
        <div className="adm-dist-kpi-card">
          <div className="kpi-icon icon-blue">
            <Users size={24} />
          </div>
          <div>
            <div className="kpi-num">{distribuidores.filter((dist) => dist.distributor_status !== "suspended").length}</div>
            <div className="kpi-txt">Distribuidores Activos</div>
          </div>
        </div>

        <div className="adm-dist-kpi-card">
          <div className="kpi-icon icon-purple">
            <Key size={24} />
          </div>
          <div>
            <div className="kpi-num">{licenses.filter((l) => l.distributor_id).length}</div>
            <div className="kpi-txt">Claves Emitidas en Clientes</div>
          </div>
        </div>

        <div className="adm-dist-kpi-card">
          <div className="kpi-icon icon-green">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="kpi-num">
              {formatCLP(
                distribuidores.filter((dist) => dist.distributor_status !== "suspended").reduce(
                  (acc, d) => acc + (PLAN_CONFIG[d.distributor_plan]?.price || 50000),
                  0
                )
              )}
            </div>
            <div className="kpi-txt">Facturación Estimada / Mes</div>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN DE SOLICITUDES POR TRANSFERENCIA PENDIENTES ── */}
      {pendingRequests.length > 0 && (
        <div className="adm-pending-requests-card">
          <div className="pending-card-header">
            <div className="pending-badge">
              <Building2 size={16} /> {pendingRequests.length} Solicitud(es) por Transferencia Pendientes
            </div>
            <p className="pending-sub">
              Clientes que transfirieron para activar un Plan de Distribuidor o Claves Extras.
            </p>
          </div>

          <div className="pending-requests-table-scroll">
            <table className="adm-dist-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Solicitud</th>
                  <th>Monto</th>
                  <th>Banco</th>
                  <th>Comprobante</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <span className="text-muted">
                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString("es-CL") : "Hoy"}
                      </span>
                    </td>
                    <td>
                      <strong>{req.userName || req.userEmail}</strong>
                      <div className="text-sub">{req.userEmail}</div>
                    </td>
                    <td>
                      <span className="dist-plan-tag" style={{ borderColor: "#a855f7", color: "#c084fc" }}>
                        {req.itemTitle || (req.tipo === "adquisicion_plan" ? "Plan Distribuidor" : "Claves Extras")}
                      </span>
                    </td>
                    <td>
                      <strong className="text-green">{formatCLP(req.montoCLP)}</strong>
                      {req.cotizacion && (
                        <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: 3 }}>
                          {req.cotizacion.metodoPago === "crypto" && (
                            <span style={{ color: "#38bdf8" }}>USDT: {req.cotizacion.cryptoUSDT || req.cotizacion.totalUSD}</span>
                          )}
                          {req.cotizacion.metodoPago === "prex" && (
                            <span style={{ color: "#c084fc" }}>Prex: ${req.cotizacion.totalLocal?.toLocaleString("es-CL")} {req.cotizacion.moneda}</span>
                          )}
                          {req.cotizacion.moneda && req.cotizacion.moneda !== "CLP" && req.cotizacion.metodoPago !== "crypto" && req.cotizacion.metodoPago !== "prex" && (
                            <span>Local: ${req.cotizacion.totalLocal?.toLocaleString("es-CL")} {req.cotizacion.moneda}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <code>{req.banco || "Manual"}</code>
                    </td>
                    <td>
                      {req.comprobanteUrl ? (
                        <a
                          href={req.comprobanteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-view-voucher"
                        >
                          <ExternalLink size={13} /> Ver Comprobante
                        </a>
                      ) : (
                        <span className="text-muted">Sin archivo</span>
                      )}
                    </td>
                    <td>
                      <div className="dist-action-cell">
                        <button
                          className="btn-approve"
                          onClick={() => handleApproveTransfer(req)}
                          title="Aprobar y Activar Plan"
                        >
                          <Check size={14} /> Aprobar
                        </button>
                        <button
                          className="btn-reject"
                          onClick={() => handleRejectTransfer(req)}
                          title="Rechazar"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEARCH */}
      <div className="adm-dist-search-bar">
        <Search size={18} color="#94a3b8" />
        <input
          type="text"
          placeholder="Buscar distribuidor por correo o nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* TABLE */}
      <div className="adm-dist-table-card">
        <table className="adm-dist-table">
          <thead>
            <tr>
              <th>Distribuidor</th>
              <th>Plan Activo</th>
              <th>Cuota Mensual</th>
              <th>Claves Emitidas</th>
              <th>Saldo Billetera</th>
              <th>Vencimiento</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {distribuidores
              .filter((d) => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                return (
                  (d.email || "").toLowerCase().includes(term) ||
                  (d.displayName || "").toLowerCase().includes(term)
                );
              })
              .map((dist) => {
                const plan = PLAN_CONFIG[dist.distributor_plan] || PLAN_CONFIG.basico;
                const distLicCount = licenses.filter((l) => l.distributor_id === dist.id).length;
                const quota = dist.custom_quota || plan.baseQuota;
                const isSuspended = dist.distributor_status === "suspended";

                return (
                  <tr key={dist.id} className={isSuspended ? "row-suspended" : ""}>
                    <td>
                      <strong>{dist.displayName || dist.firstName || "Sin nombre"}</strong>
                      <div className="text-sub">{dist.email}</div>
                      {dist.pre_registered_distributor && (
                        <span className="badge-pre-registered">Pre-registrado</span>
                      )}
                    </td>
                    <td>
                      <span className="dist-plan-tag" style={{ borderColor: plan.color, color: plan.color }}>
                        {plan.name}
                      </span>
                    </td>
                    <td>
                      <strong>{quota}</strong> claves{" "}
                      {dist.extra_keys ? (
                        <span className="extra-tag">+{dist.extra_keys} extras</span>
                      ) : (
                        ""
                      )}
                    </td>
                    <td>
                      <span className="dist-key-counter">
                        <Key size={14} /> {distLicCount} / {quota + (dist.extra_keys || 0)}
                      </span>
                    </td>
                    <td>
                      <span className="dist-wallet-tag">{formatCLP(dist.wallet_balance || 0)}</span>
                    </td>
                    <td>
                      <span className="text-muted">
                        {dist.distributor_expires_at
                          ? new Date(dist.distributor_expires_at).toLocaleDateString("es-CL")
                          : "♾️ Perpetuo"}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${isSuspended ? "status-suspended" : "status-active"}`}>
                        {isSuspended ? "Suspendido" : "Activo"}
                      </span>
                    </td>
                    <td>
                      <div className="dist-action-cell">
                        {/* VER COMPRAS DEL DISTRIBUIDOR */}
                        <button
                          className="btn-action-orders"
                          onClick={() => setSelectedDistForOrders(dist)}
                          title="Ver compras y pedidos del distribuidor"
                          style={{
                            background: "rgba(56, 189, 248, 0.12)",
                            color: "#38bdf8",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                            padding: "6px 9px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "0.74rem",
                            fontWeight: 600
                          }}
                        >
                          <ShoppingBag size={14} />
                          <span>Compras</span>
                        </button>

                        {/* BOTÓN RECARGAR CLAVES EXTRAS */}
                        <button
                          className="btn-action-extras"
                          onClick={() => {
                            setDistForExtras(dist);
                            setExtraKeysToAdd(5);
                            setShowExtraKeysModal(true);
                          }}
                          title="Añadir Claves Extras (+5, +10, etc.)"
                        >
                          <Zap size={14} />
                        </button>

                        {/* EDITAR PLAN */}
                        <button
                          className="btn-action-edit"
                          onClick={() => {
                            setEditingDist(dist);
                            setSelectedUserEmail(dist.email);
                            setSelectedPlan(dist.distributor_plan || "basico");
                            setCustomQuota(String(dist.custom_quota || plan.baseQuota));
                            setShowModal(true);
                          }}
                          title="Editar Plan y Cuotas"
                        >
                          <Edit2 size={14} />
                        </button>

                        {/* PAUSAR / REANUDAR */}
                        <button
                          className={`btn-action-toggle ${isSuspended ? "resume" : "pause"}`}
                          onClick={() => handleToggleStatus(dist)}
                          title={isSuspended ? "Reactivar distribuidor" : "Suspender distribuidor"}
                        >
                          {isSuspended ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            {distribuidores.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center py-8 text-muted">
                  No hay distribuidores configurados todavía. ¡Asigna el primero arriba!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── MODAL ASIGNAR / EDITAR DISTRIBUIDOR ──────────────────────────── */}
      {showModal && (
        <div className="adm-dist-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="adm-dist-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="adm-dist-modal-close" onClick={() => setShowModal(false)}>
              ✕
            </button>
            <div className="adm-dist-modal-eyebrow">PandaStore · Steam B2B</div>
            <h3 className="adm-dist-modal-title">{editingDist ? "Editar plan y cupos" : "Asignar nuevo distribuidor"}</h3>
            <p className="adm-dist-modal-intro">
              {editingDist
                ? `Modificando acceso para ${editingDist.email}`
                : "Escribe o busca el correo del cliente para habilitar su rol y cuota"}
            </p>

            <form onSubmit={handleSaveDistribuidor}>
              {!editingDist && (
                <div className="form-group">
                  <label>Correo del Usuario Registrado en PandaStore:</label>
                  <input
                    type="email"
                    list="registered-users-list"
                    placeholder="cliente@ejemplo.com"
                    value={selectedUserEmail}
                    onChange={(e) => setSelectedUserEmail(e.target.value)}
                    required
                  />
                  <datalist id="registered-users-list">
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.email}>
                        {u.displayName ? `${u.displayName} (${u.email})` : u.email}
                      </option>
                    ))}
                  </datalist>
                  <span className="field-hint">
                    💡 Selecciona un usuario registrado de la lista o escribe su correo. El usuario debe tener cuenta creada en la tienda.
                  </span>
                </div>
              )}

              <div className="form-group adm-dist-plan-field">
                <label>Plan de Distribución Steam:</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => {
                    const p = e.target.value;
                    setSelectedPlan(p);
                    setCustomQuota(String(PLAN_CONFIG[p]?.baseQuota || 60));
                  }}
                  className="adm-dist-select"
                >
                  <option value="basico">Distribuidor Básico ($50.000 / mes - 60 claves)</option>
                  <option value="pro">Distribuidor Pro ($85.000 / mes - 130 claves + 3 All-Access)</option>
                  <option value="supreme">Distribuidor Supreme ($139.000 / mes - 250 claves + 8 All-Access)</option>
                  <option value="vitalicio">Plan Vitalicio ($270.000 único - 70 claves perpetuas)</option>
                </select>
              </div>

              <div className="adm-dist-modal-fields">
              <div className="form-group">
                <label>Cupo Base de Claves al Mes:</label>
                <input
                  type="number"
                  value={customQuota}
                  onChange={(e) => setCustomQuota(e.target.value)}
                  required
                />
              </div>

              {selectedPlan !== "vitalicio" && (
                <div className="form-group">
                  <label>Días de Vigencia (desde hoy):</label>
                  <input
                    type="number"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(e.target.value)}
                    required
                  />
                </div>
              )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={modalLoading}>
                  {modalLoading ? "Guardando..." : "Guardar Distribuidor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL RECARGAR CLAVES EXTRAS ─────────────────────────────────── */}
      {showExtraKeysModal && distForExtras && (
        <div className="adm-dist-modal-overlay" onClick={() => setShowExtraKeysModal(false)}>
          <div className="adm-dist-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="adm-dist-modal-close" onClick={() => setShowExtraKeysModal(false)}>
              ✕
            </button>
            <div className="modal-icon-header">
              <Zap size={28} color="#eab308" />
            </div>
            <div className="adm-dist-modal-eyebrow">Gestión de cuota</div>
            <h3 className="adm-dist-modal-title">Recargar claves extras</h3>
            <p className="adm-dist-modal-intro">
              Añade cupos inmediatos a <strong>{distForExtras.email}</strong> sin cambiar su plan base.
            </p>

            <form onSubmit={handleAddExtraKeys}>
              <div className="quick-extra-chips">
                {[5, 10, 25, 50].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    className={`quick-chip ${extraKeysToAdd === qty ? "active" : ""}`}
                    onClick={() => setExtraKeysToAdd(qty)}
                  >
                    +{qty} Claves
                  </button>
                ))}
              </div>

              <div className="form-group">
                <label>Cantidad de Claves Extras a Sumar:</label>
                <input
                  type="number"
                  min="1"
                  value={extraKeysToAdd}
                  onChange={(e) => setExtraKeysToAdd(Number(e.target.value))}
                  required
                />
              </div>

              <div className="form-group">
                <label>Motivo o Nota Interna (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ej: Pago verificado por transferencia BancoEstado"
                  value={extraKeysReason}
                  onChange={(e) => setExtraKeysReason(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowExtraKeysModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save extra-save" disabled={extraKeysLoading}>
                  {extraKeysLoading ? "Guardando..." : `Sumar +${extraKeysToAdd} Claves`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ─── MODAL HISTORIAL DE COMPRAS DEL DISTRIBUIDOR Y REEMBOLSO ──────────── */}
      {selectedDistForOrders && (
        <div className="adm-dist-modal-overlay" onClick={() => setSelectedDistForOrders(null)}>
          <div className="adm-dist-modal-card" style={{ maxWidth: 880, width: "95%" }} onClick={(e) => e.stopPropagation()}>
            <button className="adm-dist-modal-close" onClick={() => setSelectedDistForOrders(null)}>
              ✕
            </button>
            <div className="adm-dist-modal-eyebrow">Distribuidor B2B · Compras</div>
            <h3 className="adm-dist-modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShoppingBag size={20} color="#38bdf8" />
              Compras de {selectedDistForOrders.displayName || selectedDistForOrders.email}
            </h3>
            <p className="adm-dist-modal-intro" style={{ marginBottom: 16 }}>
              Saldo Billetera: <strong style={{ color: "#38bdf8" }}>{formatCLP(selectedDistForOrders.wallet_balance || 0)}</strong> · Correo: {selectedDistForOrders.email}
            </p>

            {(() => {
              const dOrders = allOrders.filter(
                (o) =>
                  (o.uid && o.uid === selectedDistForOrders.id) ||
                  (o.userId && o.userId === selectedDistForOrders.id) ||
                  (o.email && o.email.toLowerCase() === selectedDistForOrders.email?.toLowerCase()) ||
                  (o.userEmail && o.userEmail.toLowerCase() === selectedDistForOrders.email?.toLowerCase())
              );

              if (dOrders.length === 0) {
                return (
                  <div style={{ textAlign: "center", padding: "36px 20px", color: "#94a3b8" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 8 }}>🛒</div>
                    <p style={{ margin: 0, fontSize: "0.95rem" }}>Este distribuidor aún no ha registrado compras en la tienda.</p>
                  </div>
                );
              }

              return (
                <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                  <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left", color: "#94a3b8" }}>
                        <th style={{ padding: "8px 10px" }}>Pedido / Fecha</th>
                        <th style={{ padding: "8px 10px" }}>Productos</th>
                        <th style={{ padding: "8px 10px" }}>Total</th>
                        <th style={{ padding: "8px 10px" }}>Método de Pago</th>
                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Reembolso Billetera</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dOrders.map((o) => {
                        const prods = Array.isArray(o.productos) ? o.productos : o.producto ? [o.producto] : [];
                        const total = Number(o.totalCLP || o.total || o.monto || 0);
                        const isWallet =
                          o.metodoPago === "billetera" ||
                          o.paymentMethod === "billetera" ||
                          o.metodo_pago === "billetera" ||
                          o.pagoBilletera === true;
                        const isRefunded = Boolean(o.reembolsado || o.estado === "reembolsado");
                        const dateStr = o.fecha
                          ? new Date(o.fecha).toLocaleDateString("es-CL", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          : "Reciente";

                        return (
                          <tr
                            key={o.id}
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                              background: isRefunded ? "rgba(239, 68, 68, 0.05)" : "transparent"
                            }}
                          >
                            <td style={{ padding: "10px" }}>
                              <div style={{ fontWeight: 800, color: "#fff" }}>#{o.id?.slice(-8) || o.id}</div>
                              <div style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: 2 }}>{dateStr}</div>
                            </td>
                            <td style={{ padding: "10px" }}>
                              {prods.map((item, pIdx) => (
                                <div key={pIdx} style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
                                  • {item.name || item.nombre || "Juego"} {item.variante ? `(${item.variante})` : ""}
                                </div>
                              ))}
                            </td>
                            <td style={{ padding: "10px" }}>
                              <strong style={{ color: isWallet ? "#38bdf8" : "#fff" }}>{formatCLP(total)}</strong>
                            </td>
                            <td style={{ padding: "10px" }}>
                              {isWallet ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    color: "#38bdf8",
                                    background: "rgba(56,189,248,0.12)",
                                    padding: "3px 8px",
                                    borderRadius: 6,
                                    fontSize: "0.76rem",
                                    fontWeight: 700
                                  }}
                                >
                                  💼 Billetera B2B
                                </span>
                              ) : (
                                <span style={{ color: "#94a3b8", fontSize: "0.76rem" }}>
                                  💳 {o.metodoPago || o.paymentMethod || "Transferencia / WebPay"}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "10px", textAlign: "right" }}>
                              {isWallet ? (
                                isRefunded ? (
                                  <span
                                    style={{
                                      color: "#f87171",
                                      background: "rgba(239,68,68,0.15)",
                                      border: "1px solid rgba(239,68,68,0.3)",
                                      borderRadius: 6,
                                      padding: "4px 8px",
                                      fontSize: "0.75rem",
                                      fontWeight: 800
                                    }}
                                  >
                                    💸 Reembolsado
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleReembolsarPedidoBilletera(o, selectedDistForOrders)}
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
