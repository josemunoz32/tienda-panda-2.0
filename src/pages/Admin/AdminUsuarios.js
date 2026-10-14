import React, { useEffect, useState, useMemo } from "react";
import DataTable6 from "../../components/DataTable6/DataTable6";
import { collection, getDocs, deleteDoc, doc, updateDoc, increment, addDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { getUserRoleLabels, hasMultipleBusinessRoles, hasResellerBenefits, hasSteamDistributorAccess, isSuperAdmin } from "../../utils/userRoles";
import "./AdminUsuarios.css";

export default function AdminUsuarios({ user, role }) {
  const [usuarios, setUsuarios] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedText, setCopiedText] = useState(null);
  const [roleSaving, setRoleSaving] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (role === undefined) return;
    if (!user || role !== "admin") {
      navigate("/home");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersSnap, ordersSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "orders"))
        ]);

        const userList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const orderList = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        setUsuarios(userList);
        setOrders(orderList);

        if (userList.length > 0 && !selectedUser) {
          setSelectedUser(userList[0]);
        }
      } catch (e) {
        setError("Error al cargar la base de datos de usuarios");
      }
      setLoading(false);
    };

    fetchData();
  }, [user, role, navigate]);

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const updateSelectedUser = (userId, changes) => {
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, ...changes } : u));
    setSelectedUser(prev => prev?.id === userId ? { ...prev, ...changes } : prev);
  };

  const handleRoleCapability = async (targetUser, capability) => {
    const enabled = capability === "admin"
      ? isSuperAdmin(targetUser)
      : capability === "reseller"
        ? hasResellerBenefits(targetUser)
        : hasSteamDistributorAccess(targetUser);

    if (capability === "admin" && enabled && targetUser.id === user?.uid) {
      setError("No puedes quitarte tu propio acceso Super Admin desde esta pantalla.");
      return;
    }

    const capabilityName = capability === "admin" ? "Super Admin" : capability === "reseller" ? "Revendedor" : "Distribuidor Steam";
    const action = enabled ? "quitar" : "activar";
    if (!window.confirm(`¿Confirmas ${action} el acceso “${capabilityName}” para ${targetUser.email}? Los demás roles se conservarán.`)) return;

    let changes;
    if (capability === "admin") {
      changes = {
        role: enabled
          ? (hasResellerBenefits(targetUser) ? "revendedor" : hasSteamDistributorAccess(targetUser) ? "distribuidor" : "usuario")
          : "admin"
      };
    } else if (capability === "reseller") {
      changes = enabled
        ? {
            resellerStatus: "revocado",
            role: targetUser.role === "revendedor"
              ? (hasSteamDistributorAccess(targetUser) ? "distribuidor" : "usuario")
              : targetUser.role
          }
        : {
            resellerStatus: "aprobado",
            revendedor_desde: targetUser.revendedor_desde || new Date().toISOString(),
            wallet_balance: Number(targetUser.wallet_balance) || 0,
            role: isSuperAdmin(targetUser) ? targetUser.role : "revendedor"
          };
    } else {
      changes = enabled
        ? {
            steam_distributor: false,
            distributor_status: "inactive",
            role: targetUser.role === "distribuidor"
              ? (hasResellerBenefits(targetUser) ? "revendedor" : "usuario")
              : targetUser.role
          }
        : {
            steam_distributor: true,
            distributor_status: "active",
            distributor_plan: targetUser.distributor_plan || "basico",
            custom_quota: Number(targetUser.custom_quota) || 60,
            distributor_since: targetUser.distributor_since || new Date().toISOString()
          };
    }

    setRoleSaving(`${targetUser.id}-${capability}`);
    setError("");
    try {
      await updateDoc(doc(db, "users", targetUser.id), changes);
      updateSelectedUser(targetUser.id, changes);
      setSuccess(`${capabilityName} ${enabled ? "eliminado" : "activado"} para ${targetUser.email}.`);
    } catch (e) {
      setError(`No se pudo actualizar el acceso: ${e.message}`);
    } finally {
      setRoleSaving("");
    }
  };

  const eliminarUsuario = async (uid, email) => {
    if (!window.confirm(`¿Seguro que deseas eliminar definitivamente a ${email || uid}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, "users", uid));
      setSuccess("Usuario eliminado con éxito");
      const filtered = usuarios.filter(u => u.id !== uid);
      setUsuarios(filtered);
      setSelectedUser(filtered[0] || null);
    } catch (e) {
      setError("Error al eliminar usuario");
    }
  };

  const handleAdjustWallet = async (targetUser, amount, note) => {
    try {
      await updateDoc(doc(db, "users", targetUser.id), {
        wallet_balance: increment(amount)
      });
      await addDoc(collection(db, "wallet_transactions"), {
        userId: targetUser.id,
        userEmail: targetUser.email,
        tipo: amount > 0 ? "ajuste_manual_credito" : "ajuste_manual_debito",
        monto: amount,
        descripcion: `Ajuste manual administrativo: ${note} ($${Math.round(amount).toLocaleString('es-CL')} CLP)`,
        createdAt: new Date().toISOString(),
        adminEmail: user?.email || "admin"
      });
      updateSelectedUser(targetUser.id, {
        wallet_balance: (Number(targetUser.wallet_balance) || 0) + amount
      });
      setSuccess(`✅ Saldo ajustado en $${Math.round(amount).toLocaleString('es-CL')} CLP para ${targetUser.email}`);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(`Error al ajustar saldo: ${err.message}`);
      setTimeout(() => setError(""), 4000);
    }
  };

  // ── Columnas de DataTable 6 ──
  const columns = useMemo(() => [
    {
      key: "usuario",
      label: "Usuario & Perfil",
      sortable: true,
      render: (u) => {
        const name = u.displayName || ((u.firstName || u.lastName) ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : null);
        const initials = (name || u.email || "U").slice(0, 2).toUpperCase();
        return (
          <div className="usr-cell-profile">
            <div className="usr-avatar">{initials}</div>
            <div className="usr-names-wrap">
              <strong className="usr-name-text">{name || "Sin nombre"}</strong>
              <span className="usr-email-sub">{u.email || "Sin correo"}</span>
            </div>
          </div>
        );
      }
    },
    {
      key: "role",
      label: "Rol",
      sortable: true,
      align: "center",
      render: (u) => {
        const labels = getUserRoleLabels(u);
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center" }}>
            {labels.map((label) => (
              <span key={label} className={`dt6-chip ${label === "Super Admin" || label === "Revendedor" ? "dt6-chip-active" : "dt6-chip-info"}`}>
                {label}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      key: "pedidos",
      label: "Pedidos",
      align: "center",
      render: (u) => {
        const userOrders = orders.filter(o => o.userId === u.id || o.email === u.email || o.clienteEmail === u.email);
        return (
          <span className="usr-orders-count">
            {userOrders.length} {userOrders.length === 1 ? "compra" : "compras"}
          </span>
        );
      }
    },
    {
      key: "createdAt",
      label: "Registro",
      sortable: true,
      render: (u) => {
        if (!u.createdAt) return "-";
        const d = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
        if (isNaN(d.getTime())) return "-";
        return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
      }
    }
  ], [orders]);

  // ── Filtros ──
  const filterOptions = useMemo(() => [
    { key: "all", label: "Todos", icon: "👥", count: usuarios.length, filterFn: () => true },
    {
      key: "admins",
      label: "Administradores",
      icon: "🛡️",
      count: usuarios.filter(isSuperAdmin).length,
      filterFn: isSuperAdmin
    },
    {
      key: "clients",
      label: "Clientes",
      icon: "👤",
      count: usuarios.filter(u => !isSuperAdmin(u) && !hasResellerBenefits(u) && !hasSteamDistributorAccess(u)).length,
      filterFn: u => !isSuperAdmin(u) && !hasResellerBenefits(u) && !hasSteamDistributorAccess(u)
    },
    {
      key: "resellers",
      label: "Revendedores",
      icon: "💼",
      count: usuarios.filter(hasResellerBenefits).length,
      filterFn: hasResellerBenefits
    },
    {
      key: "distributors",
      label: "Distribuidores Steam",
      icon: "🔑",
      count: usuarios.filter(hasSteamDistributorAccess).length,
      filterFn: hasSteamDistributorAccess
    },
    {
      key: "multiple_roles",
      label: "Roles múltiples",
      icon: "✦",
      count: usuarios.filter(hasMultipleBusinessRoles).length,
      filterFn: hasMultipleBusinessRoles
    }
  ], [usuarios]);

  // ── Renderer de Detalle Sincronizado ──
  const renderUserDetail = (u) => {
    const name = u.displayName || ((u.firstName || u.lastName) ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "Usuario");
    const isAdmin = isSuperAdmin(u);
    const roleLabels = getUserRoleLabels(u);
    const userOrders = orders.filter(o => o.userId === u.id || o.email === u.email || o.clienteEmail === u.email);
    const totalSpent = userOrders.reduce((acc, o) => acc + (Number(o.totalCLP || o.total || 0)), 0);

    return (
      <div className="usr-detail-wrap">
        {/* Hero Card */}
        <div className="usr-hero-card">
          <div className="usr-hero-avatar">
            {(name || u.email || "U").slice(0, 2).toUpperCase()}
          </div>
          <div className="usr-hero-info">
            <div className="usr-hero-role-pill">
              {roleLabels.join(" · ").toUpperCase()}
            </div>
            <h3 className="usr-hero-name">{name}</h3>
            <span className="usr-hero-email">{u.email}</span>
          </div>
        </div>

        {/* Notificaciones */}
        {error && <div className="cup-alert cup-alert-error">⚠️ {error}</div>}
        {success && <div className="cup-alert cup-alert-success">✅ {success}</div>}

        {/* Acciones Rápidas */}
        <div className="dt6-actions-row" style={{ marginTop: 4, marginBottom: 14 }}>
          <button
            className="dt6-btn-secondary"
            onClick={() => handleCopy(u.id, "UID")}
            title="Copiar UID de Firebase"
          >
            <span className="material-icons" style={{ fontSize: 16 }}>badge</span>
            {copiedText === "UID" ? "¡UID Copiado!" : "Copiar UID"}
          </button>

          {u.email && (
            <a
              href={`mailto:${u.email}?subject=Contacto%20PandaStore`}
              className="dt6-btn-secondary"
              style={{ textDecoration: "none" }}
              title="Contactar vía email"
            >
              <span className="material-icons" style={{ fontSize: 16 }}>email</span>
              Escribir
            </a>
          )}

          <button
            className="dt6-btn-danger"
            onClick={() => eliminarUsuario(u.id, u.email)}
            title="Eliminar usuario"
          >
            <span className="material-icons" style={{ fontSize: 16 }}>delete</span>
          </button>
        </div>

        <div className="usr-role-manager">
          <div className="usr-role-manager-head">
            <div>
              <strong>Roles y accesos</strong>
              <span>Activa o elimina cada permiso sin borrar los demás.</span>
            </div>
          </div>
          <div className="usr-role-actions">
            {[
              { key: "admin", label: "Super Admin", active: isAdmin, icon: "admin_panel_settings" },
              { key: "reseller", label: "Revendedor", active: hasResellerBenefits(u), icon: "storefront" },
              { key: "distributor", label: "Distribuidor Steam", active: hasSteamDistributorAccess(u), icon: "vpn_key" }
            ].map((access) => {
              const saving = roleSaving === `${u.id}-${access.key}`;
              return (
                <button
                  key={access.key}
                  type="button"
                  className={`usr-role-action ${access.active ? "is-active" : ""}`}
                  disabled={saving || (access.key === "admin" && access.active && u.id === user?.uid)}
                  onClick={() => handleRoleCapability(u, access.key)}
                >
                  <span className="material-icons">{access.icon}</span>
                  <span className="usr-role-action-copy">
                    <strong>{access.label}</strong>
                    <small>{access.active ? "Activo · quitar" : "Sin acceso · activar"}</small>
                  </span>
                  <span className="usr-role-action-state">{saving ? "…" : access.active ? "✓" : "+"}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Resumen de Compras / Estadísticas */}
        <div className="usr-stats-strip">
          <div className="usr-stat-box">
            <span className="usr-stat-val">{userOrders.length}</span>
            <span className="usr-stat-lbl">Pedidos totales</span>
          </div>
          <div className="usr-stat-box">
            <span className="usr-stat-val" style={{ color: "#38bdf8" }}>
              ${Math.round(totalSpent).toLocaleString("es-CL")}
            </span>
            <span className="usr-stat-lbl">Gasto total (CLP)</span>
          </div>
          <div className="usr-stat-box">
            <span className="usr-stat-val" style={{ color: "#4ade80" }}>
              {u.emailVerified ? "Sí" : "Normal"}
            </span>
            <span className="usr-stat-lbl">Verificado</span>
          </div>
        </div>

        {/* Metadatos y Datos de la Cuenta */}
        <div className="dt6-detail-section">
          <div className="dt6-detail-section-title">
            <span className="material-icons" style={{ fontSize: 15 }}>fingerprint</span>
            Información Técnica & Perfil
          </div>
          <div className="dt6-properties-grid">
            <div className="dt6-property-row" style={{ background: 'rgba(52, 211, 153, 0.08)', borderRadius: 8, padding: '8px 10px' }}>
              <span className="dt6-property-key" style={{ color: '#34d399', fontWeight: 700 }}>💼 Saldo Billetera:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="dt6-property-val" style={{ color: '#34d399', fontWeight: 800, fontSize: '0.98rem' }}>
                  ${Number(u.wallet_balance || 0).toLocaleString("es-CL")} CLP
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const montoStr = window.prompt(`Cargar o ajustar saldo para ${u.email}:\nIngresa el monto en CLP (+ para sumar, - para restar):`, "10000");
                    if (!montoStr) return;
                    const monto = Number(montoStr.replace(/[^0-9-]/g, ''));
                    if (isNaN(monto) || monto === 0) {
                      alert("Monto inválido");
                      return;
                    }
                    const nota = window.prompt("Motivo de la recarga:", "Recarga manual por WhatsApp") || "Recarga manual";
                    handleAdjustWallet(u, monto, nota);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  + Cargar Saldo
                </button>
              </div>
            </div>
            <div className="dt6-property-row">
              <span className="dt6-property-key">ID de Usuario (UID):</span>
              <span className="dt6-property-val" style={{ fontFamily: "monospace" }}>{u.id}</span>
            </div>
            <div className="dt6-property-row">
              <span className="dt6-property-key">Teléfono / WhatsApp:</span>
              <span className="dt6-property-val">{u.phone || u.telefono || "No especificado"}</span>
            </div>
            <div className="dt6-property-row">
              <span className="dt6-property-key">País:</span>
              <span className="dt6-property-val">{u.pais || "Chile (CL)"}</span>
            </div>
            <div className="dt6-property-row">
              <span className="dt6-property-key">Fecha de Registro:</span>
              <span className="dt6-property-val">
                {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleString("es-CL") : (u.createdAt ? String(u.createdAt) : "-")}
              </span>
            </div>
          </div>
        </div>

        {/* Historial de Compras Recientes */}
        <div className="dt6-detail-section">
          <div className="dt6-detail-section-title">
            <span className="material-icons" style={{ fontSize: 15 }}>shopping_bag</span>
            Historial de Compras ({userOrders.length})
          </div>
          {userOrders.length === 0 ? (
            <div className="cup-empty-uses">El usuario aún no tiene compras registradas en la tienda.</div>
          ) : (
            <div className="usr-orders-list">
              {userOrders.slice(0, 4).map((o, idx) => (
                <div key={idx} className="usr-order-item">
                  <div className="usr-order-top">
                    <span className="usr-order-id">#{o.id.slice(-6).toUpperCase()}</span>
                    <span className="usr-order-price">
                      ${Number(o.totalCLP || o.total || 0).toLocaleString("es-CL")}
                    </span>
                  </div>
                  <div className="usr-order-meta">
                    <span>{o.metodoPago || "WebPay / Transferencia"}</span>
                    <span>{o.fecha?.toDate ? o.fecha.toDate().toLocaleDateString() : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="admin-usuarios-page">
      <DataTable6
        data={usuarios}
        columns={columns}
        idKey="id"
        title="Gestión de Usuarios y Clientes"
        subtitle="Auditoría de cuentas, permisos de administración y trazabilidad de compras en tiempo real"
        searchPlaceholder="Buscar por nombre, email o UID..."
        filterOptions={filterOptions}
        renderDetail={renderUserDetail}
        selectedItem={selectedUser}
        onSelectItem={(u) => {
          setSelectedUser(u);
          setError("");
          setSuccess("");
        }}
        badgeText="DATA TABLE 6"
        emptyMessage="No se encontraron usuarios coincidentes"
      />
    </div>
  );
}
