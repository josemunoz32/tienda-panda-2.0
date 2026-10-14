with open('src/pages/Admin/AdminRevendedores.css', 'r', encoding='utf-8') as f:
    content = f.read().replace('\r\n', '\n')

css_append = """
/* ==========================================================================
   ESTILOS GESTOR DE MÁRGENES & DESCUENTOS B2B
   ========================================================================== */
.adm-discounts-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.adm-disc-master-panel {
  background: linear-gradient(135deg, rgba(30, 12, 60, 0.85) 0%, rgba(15, 6, 35, 0.95) 100%);
  border: 1px solid rgba(168, 85, 247, 0.35);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.adm-disc-master-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.adm-disc-master-title h2 {
  font-size: 1.35rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
}

.adm-disc-master-info p {
  color: #c4b5fd;
  font-size: 0.92rem;
  line-height: 1.6;
  margin: 0 0 20px 0;
  max-width: 950px;
}

.adm-disc-master-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(168, 85, 247, 0.2);
}

.adm-disc-global-switch-card,
.adm-disc-profit-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.control-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: #f1f5f9;
}

.btn-toggle-switch {
  padding: 8px 16px;
  border-radius: 10px;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-toggle-switch.on {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.6);
}

.btn-toggle-switch.on:hover {
  background: rgba(239, 68, 68, 0.4);
  color: #fff;
}

.btn-toggle-switch.off {
  background: rgba(0, 245, 212, 0.2);
  color: #00f5d4;
  border: 1px solid #00f5d4;
}

.btn-toggle-switch.off:hover {
  background: rgba(0, 245, 212, 0.4);
  color: #fff;
}

.adm-disc-input-profit {
  width: 100px;
  background: rgba(15, 6, 35, 0.9);
  border: 1px solid #00f5d4;
  color: #00f5d4;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 800;
  text-align: right;
  outline: none;
}

.btn-save-discounts {
  background: linear-gradient(135deg, #00f5d4 0%, #7b2ff2 100%);
  color: #08031d;
  font-weight: 900;
  border: none;
  padding: 12px 28px;
  border-radius: 12px;
  font-size: 0.95rem;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(0, 245, 212, 0.25);
}

.btn-save-discounts:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 22px rgba(0, 245, 212, 0.45);
}

.btn-save-discounts.large {
  padding: 16px 40px;
  font-size: 1.1rem;
}

.adm-disc-success-toast {
  background: rgba(0, 245, 212, 0.15);
  border: 1px solid #00f5d4;
  color: #00f5d4;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 700;
  animation: fadeIn 0.3s ease;
}

/* GRID DE TARJETAS */
.adm-disc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

.adm-disc-card {
  background: rgba(18, 9, 38, 0.85);
  border: 1px solid rgba(168, 85, 247, 0.25);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.adm-disc-card.active {
  border-color: rgba(0, 245, 212, 0.4);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
}

.adm-disc-card.disabled {
  opacity: 0.65;
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(15, 6, 28, 0.5);
}

.adm-disc-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.adm-disc-card-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #fff;
}

.adm-disc-card-hint {
  font-size: 0.75rem;
  color: #94a3b8;
  display: block;
}

.btn-cat-toggle {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 800;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cat-toggle.enabled {
  background: rgba(0, 245, 212, 0.15);
  color: #00f5d4;
  border: 1px solid rgba(0, 245, 212, 0.5);
}

.btn-cat-toggle.disabled {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.adm-disc-type-pills {
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 4px;
  gap: 6px;
}

.type-pill {
  flex: 1;
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 8px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.type-pill.selected {
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(168, 85, 247, 0.35);
}

.adm-disc-value-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 4px;
}

.adm-disc-input-wrap {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(168, 85, 247, 0.4);
  border-radius: 10px;
  padding: 0 10px;
}

.input-prefix, .input-suffix {
  color: #c4b5fd;
  font-size: 0.9rem;
  font-weight: 800;
}

.adm-disc-value-input {
  width: 90px;
  background: transparent;
  border: none;
  color: #fff;
  padding: 8px 6px;
  font-size: 1.1rem;
  font-weight: 900;
  text-align: right;
  outline: none;
}

.adm-disc-quick-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.quick-chip {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-chip:hover {
  background: rgba(168, 85, 247, 0.2);
  border-color: #a855f7;
  color: #fff;
}

.quick-chip.active {
  background: rgba(0, 245, 212, 0.18);
  border-color: #00f5d4;
  color: #00f5d4;
}

/* CAJA DE SIMULACIÓN EN VIVO */
.adm-disc-sim-box {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.sim-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: 700;
  color: #e2e8f0;
}

.sim-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sim-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.sim-row.highlight {
  font-size: 0.95rem;
  padding-top: 4px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
}

.sim-badge-row {
  margin-top: 4px;
}

.sim-badge-green {
  display: inline-block;
  background: rgba(0, 245, 212, 0.12);
  border: 1px solid rgba(0, 245, 212, 0.4);
  color: #00f5d4;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.74rem;
  font-weight: 800;
}

.sim-disabled-notice {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #f87171;
  font-weight: 700;
  font-size: 0.85rem;
  padding: 4px 0;
}
"""

with open('src/pages/Admin/AdminRevendedores.css', 'w', encoding='utf-8') as f:
    f.write(content + css_append)

print("AdminRevendedores.css updated with discount manager styles!")
