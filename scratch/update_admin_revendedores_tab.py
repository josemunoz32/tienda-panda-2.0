with open('src/pages/Admin/AdminRevendedores.js', 'r', encoding='utf-8') as f:
    content = f.read().replace('\r\n', '\n')

# 1. Imports
old_imports = """import {
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
  Eye
} from "lucide-react";"""

new_imports = """import {
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
  Sparkles
} from "lucide-react";
import {
  DEFAULT_RESELLER_DISCOUNTS,
  getResellerDiscountsConfig,
  setResellerDiscountsConfig,
  formatCLP
} from "../../utils/priceHelper";"""

if old_imports in content:
    content = content.replace(old_imports, new_imports, 1)

# 2. State & effect in AdminRevendedores
old_state_init = "  const [selectedUserForAdjust, setSelectedUserForAdjust] = useState(null);"

new_state_init = """  const [selectedUserForAdjust, setSelectedUserForAdjust] = useState(null);

  // Estado para gestión dinámica de descuentos y márgenes por categoría
  const [discountsConfig, setDiscountsConfig] = useState(DEFAULT_RESELLER_DISCOUNTS);
  const [savingDiscounts, setSavingDiscounts] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

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
    try {
      await setDoc(doc(db, "config", "reseller_discounts"), discountsConfig, { merge: true });
      setResellerDiscountsConfig(discountsConfig);
      setSaveSuccessMsg("✅ ¡Configuración de márgenes y descuentos guardada con éxito! Actualizada en toda la tienda en vivo.");
      setTimeout(() => setSaveSuccessMsg(""), 6000);
    } catch (err) {
      alert("Error al guardar descuentos: " + err.message);
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
    const discount = Math.max(0, basePrice - finalPrice);
    const percent = Math.round((discount / basePrice) * 100);
    return { finalPrice, discount, percent, isFree: discount >= basePrice };
  };"""

if old_state_init in content:
    content = content.replace(old_state_init, new_state_init, 1)

# 3. Add 4th Tab Button in Navigation
old_tabs_end = """        <button
          className={`adm-rev-tab ${activeTab === "revendedores" ? "active" : ""}`}
          onClick={() => setActiveTab("revendedores")}
        >
          <ShieldCheck size={18} />
          <span>Revendedores Activos ({totalRevendedores})</span>
        </button>
      </div>"""

new_tabs_end = """        <button
          className={`adm-rev-tab ${activeTab === "revendedores" ? "active" : ""}`}
          onClick={() => setActiveTab("revendedores")}
        >
          <ShieldCheck size={18} />
          <span>Revendedores Activos ({totalRevendedores})</span>
        </button>

        <button
          className={`adm-rev-tab ${activeTab === "descuentos" ? "active" : ""}`}
          onClick={() => setActiveTab("descuentos")}
        >
          <Percent size={18} />
          <span>Márgenes & Descuentos</span>
        </button>
      </div>"""

if old_tabs_end in content:
    content = content.replace(old_tabs_end, new_tabs_end, 1)

# 4. Hide search bar on descuentos tab
old_search = """      {/* SEARCH BAR */}
      <div className="adm-rev-search-bar">"""

new_search = """      {/* SEARCH BAR (Oculta en la pestaña de descuentos) */}
      {activeTab !== "descuentos" && (
      <div className="adm-rev-search-bar">"""

if old_search in content:
    content = content.replace(old_search, new_search, 1)

old_tab1_start = """      {/* TAB 1: SOLICITUDES DE POSTULACIÓN */}"""
new_tab1_start = """      </div>
      )}

      {/* TAB 1: SOLICITUDES DE POSTULACIÓN */}"""

if old_tab1_start in content:
    content = content.replace(old_tab1_start, new_tab1_start, 1)

# 5. Add TAB 4 Content: Márgenes & Descuentos por Categoría
old_tab3_end = """      {/* TAB 3: REVENDEDORES ACTIVOS */}
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
                      <button
                        className="btn-adjust"
                        onClick={() => setSelectedUserForAdjust(rev)}
                      >
                        <DollarSign size={14} /> Ajustar Saldo
                      </button>
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
      )}"""

new_tab4_content = old_tab3_end + """

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
      )}"""

if old_tab3_end in content:
    content = content.replace(old_tab3_end, new_tab4_content, 1)

with open('src/pages/Admin/AdminRevendedores.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("AdminRevendedores.js updated with dynamic discount manager tab!")
