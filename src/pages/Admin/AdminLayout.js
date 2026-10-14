import React, { useState, useEffect } from "react";
import { useMoneda } from "../../context/MonedaContext";
import { Outlet, Link, useLocation } from "react-router-dom";
import pandaAdminLogo from "../../logo.png";
import "./AdminLayout.css";

const NAV_SECTIONS = [
  {
    id: "analytics",
    title: "1. Analítica & Métricas",
    icon: "insights",
    badge: "LIVE",
    items: [
      { path: "/admin/dashboard", icon: "dashboard", label: "Tablero Analítico Pro", badge: "PRO" },
      { path: "/admin/actividad", icon: "shopping_cart", label: "Carritos y Tráfico en Vivo", badge: "LIVE" },
    ],
  },
  {
    id: "catalog",
    title: "2. Catálogo & Productos",
    icon: "inventory_2",
    badge: "CORE",
    items: [
      { path: "/productos", icon: "storefront", label: "Catálogo de Productos" },
      { path: "/admin/juegos-sin-publicar", icon: "sports_esports", label: "Switch: Packs & Stock", badge: "BOT" },
      { path: "/admin/auto-import", icon: "cloud_upload", label: "Carga Masiva (Steam / PSN)" },
      { path: "/admin/armar-pack", icon: "card_giftcard", label: "Armar Pack Promos" },
    ],
  },
  {
    id: "launcher",
    title: "3. Launcher & Licencias",
    icon: "vpn_key",
    badge: "KEYS",
    items: [
      { path: "/admin/licencias", icon: "key", label: "Licencias y Claves Steam", badge: "STEAM" },
    ],
  },
  {
    id: "sales_b2b",
    title: "4. Ventas, B2B & Pagos",
    icon: "payments",
    items: [
      { path: "/admin/revendedores", icon: "account_balance_wallet", label: "Revendedores & Billeteras", badge: "B2B" },
      { path: "/admin/distribuidores", icon: "hub", label: "Distribuidores Steam B2B" },
      { path: "/admin/metodos-pago", icon: "credit_card", label: "Métodos de Pago" },
    ],
  },
  {
    id: "marketing",
    title: "5. Clientes & Marketing",
    icon: "people",
    items: [
      { path: "/admin/usuarios", icon: "group", label: "Usuarios y Clientes" },
      { path: "/admin/cupones", icon: "confirmation_number", label: "Cupones de Descuento" },
      { path: "/admin/resenas", icon: "rate_review", label: "Moderación de Reseñas" },
      { path: "/admin/correos", icon: "email", label: "Campañas de Email", badge: "MAIL" },
    ],
  },
];

export default function AdminLayout({ user, role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { valorDolar, actualizarValorDolar, tasas, margenesMetodos, actualizarTasasMonedas, actualizarMargenesMetodos } = useMoneda();
  const rate = valorDolar || 900;
  const [dolarInput, setDolarInput] = useState(String(rate));
  const [guardadoMsg, setGuardadoMsg] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | section.id
  const location = useLocation();

  // Modal de control de divisas y márgenes de protección
  const [ratesModalOpen, setRatesModalOpen] = useState(false);
  const [localRatesInput, setLocalRatesInput] = useState({ ars: 1350, cop: 4150, pen: 3.75, mxn: 19.5, uyu: 40.5, ves: 36.5, ...(tasas || {}) });
  const [localMarginsInput, setLocalMarginsInput] = useState({ mercadopago: 0.035, paypal: 0.054, prex: 0.02, crypto: 0.00, transferencia: 0.00, ...(margenesMetodos || {}) });

  useEffect(() => {
    if (tasas) setLocalRatesInput(prev => ({ ...prev, ...tasas }));
  }, [tasas]);

  useEffect(() => {
    if (margenesMetodos) setLocalMarginsInput(prev => ({ ...prev, ...margenesMetodos }));
  }, [margenesMetodos]);

  useEffect(() => {
    setDolarInput(String(rate));
  }, [rate]);

  const handleSaveDolar = async (val) => {
    const num = Number(val !== undefined ? val : dolarInput);
    if (!num || num <= 0) return;
    setGuardando(true);
    try {
      await actualizarValorDolar(num);
      setDolarInput(String(num));
      setGuardadoMsg(true);
      setTimeout(() => setGuardadoMsg(false), 3500);
    } catch (e) {
      console.error("Error al fijar dólar:", e);
    } finally {
      setGuardando(false);
    }
  };

  const closeSidebar = () => setSidebarOpen(false);

  const filteredSections = activeFilter === "all"
    ? NAV_SECTIONS
    : NAV_SECTIONS.filter((s) => s.id === activeFilter);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="adm-hamburger"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Abrir menú"
      >
        <span className="material-icons">
          {sidebarOpen ? "close" : "menu"}
        </span>
      </button>

      {/* Overlay (mobile) */}
      <div
        className={`adm-sidebar-overlay${sidebarOpen ? " open" : ""}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`adm-sidebar${sidebarOpen ? " open" : ""}`}>
        {/* Brand */}
        <div className="adm-sidebar-brand">
          <div className="adm-sidebar-brand-row">
            <div className="adm-sidebar-brand-identity">
              <img className="adm-sidebar-panda" src={pandaAdminLogo} alt="Pandita PandaStore" />
              <div>
                <span className="adm-sidebar-logo">PandaStore</span>
                <span className="adm-sidebar-subtitle">Centro de control</span>
              </div>
            </div>
            <span className="adm-sidebar-pill-v2">ADMIN PRO</span>
          </div>
          <span className="adm-sidebar-brand-description">Gestión, catálogo y operaciones en un solo lugar.</span>

          {/* Mini Widget Dólar en Sidebar */}
          <div className="adm-sidebar-dolar-pill" title="Tasa de cambio actual fija de la tienda">
            <span className="material-icons" style={{ fontSize: '1.05rem', color: '#10b981' }}>currency_exchange</span>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Dólar Web Fijo</span>
              <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 900 }}>${rate.toLocaleString("es-CL")} CLP</span>
            </div>
            <span className="adm-dolar-live-dot" style={{ marginLeft: 'auto' }} />
          </div>

          {/* Filtro Rápido de Secciones */}
          <div className="adm-sidebar-mode-switcher">
            <button
              className={`adm-mode-btn ${activeFilter === "all" ? "active" : ""}`}
              onClick={() => setActiveFilter("all")}
              title="Ver todas las áreas"
            >
              🌐 Todas
            </button>
            <button
              className={`adm-mode-btn ${activeFilter === "catalog" ? "active" : ""}`}
              onClick={() => setActiveFilter("catalog")}
              title="Solo Catálogo y Juegos"
            >
              🎮 Catálogo
            </button>
            <button
              className={`adm-mode-btn ${activeFilter === "sales_b2b" ? "active" : ""}`}
              onClick={() => setActiveFilter("sales_b2b")}
              title="Solo Ventas y Revendedores"
            >
              💼 B2B
            </button>
          </div>
        </div>

        {/* Nav por Secciones */}
        <nav className="adm-sidebar-nav">
          {filteredSections.map((sec) => (
            <div key={sec.id} className="adm-nav-group">
              <div className="adm-nav-group-header">
                <span className="material-icons adm-nav-group-icon" style={{ fontSize: '1rem', color: '#a78bfa' }}>
                  {sec.icon}
                </span>
                <span className="adm-nav-group-title">{sec.title}</span>
                {sec.badge && <span className="adm-nav-group-badge">{sec.badge}</span>}
              </div>
              <div className="adm-nav-group-items">
                {sec.items.map((item) => {
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== "/productos" &&
                      item.path !== "/admin/dashboard" &&
                      location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`adm-nav-item${isActive ? " active" : ""}`}
                      onClick={closeSidebar}
                    >
                      <span className="material-icons adm-item-icon">{item.icon}</span>
                      <span className="adm-nav-label">{item.label}</span>
                      {item.badge && (
                        <span className={`adm-item-live-badge ${item.badge.toLowerCase()}`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="adm-sidebar-bottom">
          <Link to="/home" className="adm-sidebar-back" onClick={closeSidebar}>
            <span className="material-icons">arrow_back</span>
            Ir a la tienda
          </Link>
          {user?.email && (
            <div className="adm-sidebar-user" title={user.email}>
              <span className="adm-user-dot" />
              {user.email}
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="adm-layout-main">
        {/* Barra Central Rediseñada: Tasa de Dólar Fijo & Sincronización Web */}
        <div className="adm-global-dolar-bar">
          <div className="adm-dolar-bar-left">
            <div className="adm-dolar-icon-box">
              <span className="material-icons adm-dolar-icon">currency_exchange</span>
              <span className="adm-dolar-live-dot" title="Sincronización en vivo con Firestore" />
            </div>
            <div className="adm-dolar-text-box">
              <div className="adm-dolar-tagline">
                <span className="adm-dolar-badge">TASA DE CAMBIO FIJA TIENDA</span>
                <span className="adm-dolar-status-live">● EN VIVO (FIRESTORE)</span>
              </div>
              <div className="adm-dolar-rate-headline">
                1 USD = <span className="adm-dolar-headline-val">${rate.toLocaleString("es-CL")} CLP</span>
                <span className="adm-dolar-scope-desc">· Aplica al instante a Steam, Switch, PlayStation, Packs y Carrito</span>
              </div>
            </div>
          </div>

          <div className="adm-dolar-bar-right">
            {/* Presets rápidos */}
            <div className="adm-dolar-presets-wrap">
              <span className="adm-dolar-presets-label">Acceso Rápido:</span>
              {[850, 900, 920, 950, 1000].map((presetVal) => (
                <button
                  key={presetVal}
                  type="button"
                  className={`adm-dolar-preset-pill ${rate === presetVal ? "active" : ""}`}
                  onClick={() => handleSaveDolar(presetVal)}
                  disabled={guardando}
                  title={`Fijar dólar inmediatamente a $${presetVal} CLP`}
                >
                  ${presetVal}
                </button>
              ))}
            </div>

            {/* Input personalizado */}
            <form
              className="adm-dolar-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveDolar();
              }}
            >
              <div className="adm-dolar-input-wrapper">
                <span className="adm-dolar-currency-prefix">$</span>
                <input
                  type="number"
                  className="adm-dolar-number-input"
                  value={dolarInput}
                  onChange={(e) => setDolarInput(e.target.value)}
                  placeholder="900"
                  min="100"
                  max="5000"
                  title="Ingresa el valor del dólar en pesos chilenos"
                />
                <span className="adm-dolar-currency-suffix">CLP</span>
              </div>
              <button
                type="submit"
                className="adm-dolar-update-btn"
                disabled={guardando || Number(dolarInput) === rate}
              >
                {guardando ? (
                  <span className="material-icons" style={{ fontSize: '1rem', animation: 'spin 1s linear infinite' }}>sync</span>
                ) : (
                  <>
                    <span className="material-icons" style={{ fontSize: '0.95rem' }}>save</span>
                    Guardar
                  </>
                )}
              </button>

              <button
                type="button"
                className="adm-dolar-update-btn"
                style={{ background: "rgba(162,89,255,0.18)", border: "1px solid rgba(162,89,255,0.5)", color: "#c4b5fd" }}
                onClick={() => setRatesModalOpen(true)}
                title="Configurar tasas de divisa por país (ARS, COP, PEN...) y márgenes de métodos"
              >
                <span className="material-icons" style={{ fontSize: '0.95rem' }}>tune</span>
                Tasas & Márgenes
              </button>
            </form>
          </div>

          {/* Toast flotante */}
          {guardadoMsg && (
            <div className="adm-dolar-floating-alert">
              <span className="material-icons" style={{ fontSize: '1.1rem' }}>check_circle</span>
              ¡Tasa de cambio guardada a ${rate.toLocaleString("es-CL")} CLP! Sincronizada en vivo en toda la tienda.
            </div>
          )}
        </div>

        {/* Modal de Tasas de Divisas & Márgenes de Protección */}
        {ratesModalOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(8px)",
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20
            }}
            onClick={() => setRatesModalOpen(false)}
          >
            <div
              style={{
                background: "#0f081d",
                border: "1px solid rgba(162,89,255,0.4)",
                borderRadius: 16,
                padding: "24px",
                maxWidth: 680,
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 20px 60px rgba(0,0,0,0.9)"
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="material-icons" style={{ color: "#00f5d4", fontSize: "1.6rem" }}>payments</span>
                  <h3 style={{ margin: 0, color: "#fff", fontSize: "1.2rem", fontWeight: 800 }}>
                    Control de Divisas & Protección Antifraude
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRatesModalOpen(false)}
                  style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.3rem" }}
                >
                  ✕
                </button>
              </div>

              <p style={{ color: "#94a3b8", fontSize: "0.82rem", margin: "0 0 18px 0", lineHeight: 1.5 }}>
                Establece la tasa oficial de cada moneda respecto a <strong>1 USD</strong> y los márgenes de pasarela. Los precios en toda la tienda se calculan bajo la fórmula canónica: <code style={{ color: "#00f5d4" }}>Precio Local = (Precio CLP ÷ ${rate} CLP) × Tasa</code>.
              </p>

              {/* SECCIÓN 1: TASAS DE DIVISA VS 1 USD */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <strong style={{ color: "#00f5d4", fontSize: "0.88rem", display: "block", marginBottom: 10 }}>
                  💵 Tasas Internacionales (Divisa local por cada 1 USD):
                </strong>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#cbd5e1", display: "block", marginBottom: 4 }}>🇦🇷 ARS (Argentina):</label>
                    <input
                      type="number"
                      step="10"
                      value={localRatesInput.ars || 1350}
                      onChange={e => setLocalRatesInput(prev => ({ ...prev, ars: Number(e.target.value) }))}
                      style={{ width: "100%", padding: "7px 10px", background: "#1b1130", border: "1px solid rgba(162,89,255,0.3)", borderRadius: 8, color: "#fff", fontSize: "0.85rem", boxSizing: "border-box" }}
                    />
                    <small style={{ color: "#fbbf24", fontSize: "0.68rem" }}>Protegido real</small>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#cbd5e1", display: "block", marginBottom: 4 }}>🇨🇴 COP (Colombia):</label>
                    <input
                      type="number"
                      step="50"
                      value={localRatesInput.cop || 4150}
                      onChange={e => setLocalRatesInput(prev => ({ ...prev, cop: Number(e.target.value) }))}
                      style={{ width: "100%", padding: "7px 10px", background: "#1b1130", border: "1px solid rgba(162,89,255,0.3)", borderRadius: 8, color: "#fff", fontSize: "0.85rem", boxSizing: "border-box" }}
                    />
                    <small style={{ color: "#94a3b8", fontSize: "0.68rem" }}>Pesos x USD</small>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#cbd5e1", display: "block", marginBottom: 4 }}>🇵🇪 PEN (Perú):</label>
                    <input
                      type="number"
                      step="0.05"
                      value={localRatesInput.pen || 3.75}
                      onChange={e => setLocalRatesInput(prev => ({ ...prev, pen: Number(e.target.value) }))}
                      style={{ width: "100%", padding: "7px 10px", background: "#1b1130", border: "1px solid rgba(162,89,255,0.3)", borderRadius: 8, color: "#fff", fontSize: "0.85rem", boxSizing: "border-box" }}
                    />
                    <small style={{ color: "#94a3b8", fontSize: "0.68rem" }}>Soles x USD</small>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#cbd5e1", display: "block", marginBottom: 4 }}>🇲🇽 MXN (México):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={localRatesInput.mxn || 19.5}
                      onChange={e => setLocalRatesInput(prev => ({ ...prev, mxn: Number(e.target.value) }))}
                      style={{ width: "100%", padding: "7px 10px", background: "#1b1130", border: "1px solid rgba(162,89,255,0.3)", borderRadius: 8, color: "#fff", fontSize: "0.85rem", boxSizing: "border-box" }}
                    />
                    <small style={{ color: "#94a3b8", fontSize: "0.68rem" }}>Pesos x USD</small>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#cbd5e1", display: "block", marginBottom: 4 }}>🇺🇾 UYU (Uruguay):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={localRatesInput.uyu || 40.5}
                      onChange={e => setLocalRatesInput(prev => ({ ...prev, uyu: Number(e.target.value) }))}
                      style={{ width: "100%", padding: "7px 10px", background: "#1b1130", border: "1px solid rgba(162,89,255,0.3)", borderRadius: 8, color: "#fff", fontSize: "0.85rem", boxSizing: "border-box" }}
                    />
                    <small style={{ color: "#94a3b8", fontSize: "0.68rem" }}>Pesos UYU x USD</small>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#cbd5e1", display: "block", marginBottom: 4 }}>🇻🇪 VES (Venezuela):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={localRatesInput.ves || 36.5}
                      onChange={e => setLocalRatesInput(prev => ({ ...prev, ves: Number(e.target.value) }))}
                      style={{ width: "100%", padding: "7px 10px", background: "#1b1130", border: "1px solid rgba(162,89,255,0.3)", borderRadius: 8, color: "#fff", fontSize: "0.85rem", boxSizing: "border-box" }}
                    />
                    <small style={{ color: "#94a3b8", fontSize: "0.68rem" }}>Bolívares x USD</small>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: MÁRGENES DE PROTECCIÓN POR MÉTODO */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <strong style={{ color: "#c084fc", fontSize: "0.88rem", display: "block", marginBottom: 10 }}>
                  🛡️ Márgenes de Protección por Método (% extra para cubrir comisión pasarela):
                </strong>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#cbd5e1", display: "block", marginBottom: 4 }}>Mercado Pago:</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="number"
                        step="0.5"
                        value={((localMarginsInput.mercadopago || 0) * 100).toFixed(1)}
                        onChange={e => setLocalMarginsInput(prev => ({ ...prev, mercadopago: Number(e.target.value) / 100 }))}
                        style={{ width: "100%", padding: "7px 10px", background: "#1b1130", border: "1px solid rgba(162,89,255,0.3)", borderRadius: 8, color: "#fff", fontSize: "0.85rem", boxSizing: "border-box" }}
                      />
                      <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>%</span>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#cbd5e1", display: "block", marginBottom: 4 }}>PayPal:</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="number"
                        step="0.5"
                        value={((localMarginsInput.paypal || 0) * 100).toFixed(1)}
                        onChange={e => setLocalMarginsInput(prev => ({ ...prev, paypal: Number(e.target.value) / 100 }))}
                        style={{ width: "100%", padding: "7px 10px", background: "#1b1130", border: "1px solid rgba(162,89,255,0.3)", borderRadius: 8, color: "#fff", fontSize: "0.85rem", boxSizing: "border-box" }}
                      />
                      <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>%</span>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#cbd5e1", display: "block", marginBottom: 4 }}>Prex:</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="number"
                        step="0.5"
                        value={((localMarginsInput.prex || 0) * 100).toFixed(1)}
                        onChange={e => setLocalMarginsInput(prev => ({ ...prev, prex: Number(e.target.value) / 100 }))}
                        style={{ width: "100%", padding: "7px 10px", background: "#1b1130", border: "1px solid rgba(162,89,255,0.3)", borderRadius: 8, color: "#fff", fontSize: "0.85rem", boxSizing: "border-box" }}
                      />
                      <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>%</span>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#cbd5e1", display: "block", marginBottom: 4 }}>Crypto (USDT):</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="number"
                        step="0.5"
                        value={((localMarginsInput.crypto || 0) * 100).toFixed(1)}
                        onChange={e => setLocalMarginsInput(prev => ({ ...prev, crypto: Number(e.target.value) / 100 }))}
                        style={{ width: "100%", padding: "7px 10px", background: "#1b1130", border: "1px solid rgba(162,89,255,0.3)", borderRadius: 8, color: "#fff", fontSize: "0.85rem", boxSizing: "border-box" }}
                      />
                      <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* VISTA PREVIA EN VIVO DE $50.000 CLP */}
              <div style={{ background: "rgba(0,245,212,0.06)", border: "1px dashed rgba(0,245,212,0.3)", borderRadius: 12, padding: 12, marginBottom: 18, fontSize: "0.8rem" }}>
                <span style={{ color: "#00f5d4", fontWeight: 700 }}>🔍 Vista Previa en Vivo (Producto o Plan de $50.000 CLP):</span>
                <div style={{ marginTop: 6, color: "#e2e8f0", display: "flex", flexWrap: "wrap", gap: 12 }}>
                  <span>💵 USD: <strong>${(50000 / rate).toFixed(2)}</strong></span>
                  <span>🇦🇷 ARS: <strong>${Math.round((50000 / rate) * (localRatesInput.ars || 1350)).toLocaleString("es-CL")}</strong></span>
                  <span>🇨🇴 COP: <strong>${Math.round((50000 / rate) * (localRatesInput.cop || 4150)).toLocaleString("es-CL")}</strong></span>
                  <span>🇵🇪 PEN: <strong>S/ {((50000 / rate) * (localRatesInput.pen || 3.75)).toFixed(2)}</strong></span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setRatesModalOpen(false)}
                  style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", padding: "8px 16px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setGuardando(true);
                    await actualizarTasasMonedas(localRatesInput);
                    await actualizarMargenesMetodos(localMarginsInput);
                    setGuardando(false);
                    setRatesModalOpen(false);
                    setGuardadoMsg(true);
                    setTimeout(() => setGuardadoMsg(false), 3500);
                  }}
                  style={{ background: "linear-gradient(135deg, #00f5d4 0%, #059669 100%)", border: "none", color: "#000", padding: "8px 18px", borderRadius: 8, fontWeight: 800, cursor: "pointer" }}
                >
                  Guardar Tasas & Márgenes
                </button>
              </div>
            </div>
          </div>
        )}

        <Outlet />
      </main>
    </>
  );
}

