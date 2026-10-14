with open('src/pages/Admin/AdminLayout.js', 'r', encoding='utf-8') as f:
    content = f.read().replace('\r\n', '\n')

# 1. Add import
old_import = 'import React, { useState } from "react";'
new_import = 'import React, { useState, useEffect } from "react";\nimport { useMoneda } from "../../context/MonedaContext";'
if old_import in content:
    content = content.replace(old_import, new_import, 1)

# 2. Add state inside AdminLayout
old_component = 'export default function AdminLayout({ user, role }) {\n  const [sidebarOpen, setSidebarOpen] = useState(false);'
new_component = '''export default function AdminLayout({ user, role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { valorDolar, actualizarValorDolar } = useMoneda();
  const rate = valorDolar || 900;
  const [dolarInput, setDolarInput] = useState(String(rate));
  const [guardadoMsg, setGuardadoMsg] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setDolarInput(String(rate));
  }, [rate]);

  const handleSaveDolar = async (val) => {
    const num = Number(val !== undefined ? val : dolarInput);
    if (!num || num <= 0) return;
    setGuardando(true);
    try {
      await actualizarValorDolar(num);
      setGuardadoMsg(true);
      setTimeout(() => setGuardadoMsg(false), 3500);
    } catch (e) {
      console.error("Error al fijar dólar:", e);
    } finally {
      setGuardando(false);
    }
  };'''
if old_component in content:
    content = content.replace(old_component, new_component, 1)

# 3. Add pill in sidebar brand
old_sidebar_brand = '<span className="adm-sidebar-subtitle">Panel Administrativo</span>'
new_sidebar_brand = '''<span className="adm-sidebar-subtitle">Panel Administrativo</span>

          {/* Mini pill Dólar Sidebar */}
          <div className="adm-sidebar-dolar-pill">
            <span className="material-icons" style={{ fontSize: '1rem', color: '#10b981' }}>payments</span>
            <span style={{ fontSize: '0.74rem', color: '#e2e8f0', fontWeight: 600 }}>Dólar Web:</span>
            <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 800 }}>${rate} CLP</span>
          </div>'''
if old_sidebar_brand in content:
    content = content.replace(old_sidebar_brand, new_sidebar_brand, 1)

# 4. Add top bar inside <main className="adm-layout-main">
old_main = '<main className="adm-layout-main">\n        <Outlet />\n      </main>'
new_main = '''<main className="adm-layout-main">
        {/* Barra Global de Control Central de Divisas / Dólar Web */}
        <div className="adm-global-dolar-bar">
          <div className="adm-dolar-bar-left">
            <div className="adm-dolar-icon-box">
              <span className="material-icons adm-dolar-icon">currency_exchange</span>
              <span className="adm-dolar-live-dot" title="Sincronización en vivo con toda la tienda" />
            </div>
            <div className="adm-dolar-text-box">
              <div className="adm-dolar-tagline">
                <span className="adm-dolar-badge">CONTROL CENTRAL DE DIVISAS</span>
                <span className="adm-dolar-status-live">● EN VIVO (FIRESTORE)</span>
              </div>
              <div className="adm-dolar-rate-headline">
                1 USD = <span className="adm-dolar-headline-val">${rate.toLocaleString("es-CL")} CLP</span>
                <span className="adm-dolar-scope-desc">· Aplica en tiempo real a Steam, PS4/PS5, Switch, Packs y Promos</span>
              </div>
            </div>
          </div>

          <div className="adm-dolar-bar-right">
            {/* Botones de acceso rápido a montos típicos */}
            <div className="adm-dolar-presets-wrap">
              <span className="adm-dolar-presets-label">Fijar rápido:</span>
              {[700, 850, 900, 920, 950].map((presetVal) => (
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

            {/* Input personalizado y botón actualizar */}
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
                {guardando ? "Guardando..." : "Actualizar"}
              </button>
            </form>
          </div>

          {/* Toast de confirmación de cambio */}
          {guardadoMsg && (
            <div className="adm-dolar-floating-alert">
              ✅ ¡Dólar fijado a ${rate} CLP! Todos los precios en USD de la web se han actualizado al instante.
            </div>
          )}
        </div>

        <Outlet />
      </main>'''
if old_main in content:
    content = content.replace(old_main, new_main, 1)

with open('src/pages/Admin/AdminLayout.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("AdminLayout.js updated successfully!")
