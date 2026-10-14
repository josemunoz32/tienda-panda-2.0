with open('src/pages/Productos/ProductoForm.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Normalize CRLF to LF for consistent replacement
content = content.replace('\r\n', '\n')

old_import = 'import { useNavigate, useParams, useSearchParams } from "react-router-dom";'
new_import = 'import { useNavigate, useParams, useSearchParams } from "react-router-dom";\nimport { useMoneda } from "../../context/MonedaContext";'
if old_import in content:
    content = content.replace(old_import, new_import, 1)

old_decl = 'export default function ProductoForm() {\n  const [categorias, setCategorias] = useState([]);'
new_decl = '''export default function ProductoForm() {
  const { valorDolar, actualizarValorDolar } = useMoneda();
  const rate = valorDolar || 900;
  const [editingDolar, setEditingDolar] = useState(false);
  const [dolarInput, setDolarInput] = useState(String(rate));
  const [categorias, setCategorias] = useState([]);'''
if old_decl in content:
    content = content.replace(old_decl, new_decl, 1)

old_handle = '''  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => {
      // Si cambia la categoría, limpiar los precios para forzar el render de los campos correctos
      if (name === "categoryId") {
        return {
          ...prev,
          categoryId: value,
          priceCLP: "",
          priceUSD: "",
          pricePrimariaCLP: "",
          pricePrimariaUSD: "",
          priceSecundariaCLP: "",
          priceSecundariaUSD: "",
          costo_clp: "",
          costo_usd: "",
          costoPrimariaCLP: "",
          costoPrimariaUSD: "",
          costoSecundariaCLP: "",
          costoSecundariaUSD: "",
          preciosPorMes: [],
        };
      }
      return { ...prev, [name]: value };
    });
  };'''

new_handle = '''  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => {
      if (name === "categoryId") {
        return {
          ...prev,
          categoryId: value,
          priceCLP: "",
          priceUSD: "",
          pricePrimariaCLP: "",
          pricePrimariaUSD: "",
          priceSecundariaCLP: "",
          priceSecundariaUSD: "",
          costo_clp: "",
          costo_usd: "",
          costoPrimariaCLP: "",
          costoPrimariaUSD: "",
          costoSecundariaCLP: "",
          costoSecundariaUSD: "",
          preciosPorMes: [],
        };
      }
      const updated = { ...prev, [name]: value };
      const numVal = Number(value);
      if (name === "priceCLP") {
        updated.priceUSD = value && !isNaN(numVal) && numVal > 0 ? (numVal / rate).toFixed(2) : "";
      } else if (name === "pricePrimariaCLP") {
        updated.pricePrimariaUSD = value && !isNaN(numVal) && numVal > 0 ? (numVal / rate).toFixed(2) : "";
      } else if (name === "priceSecundariaCLP") {
        updated.priceSecundariaUSD = value && !isNaN(numVal) && numVal > 0 ? (numVal / rate).toFixed(2) : "";
      } else if (name === "costo_clp") {
        updated.costo_usd = value && !isNaN(numVal) && numVal > 0 ? (numVal / rate).toFixed(2) : "";
      } else if (name === "costoPrimariaCLP") {
        updated.costoPrimariaUSD = value && !isNaN(numVal) && numVal > 0 ? (numVal / rate).toFixed(2) : "";
      } else if (name === "costoSecundariaCLP") {
        updated.costoSecundariaUSD = value && !isNaN(numVal) && numVal > 0 ? (numVal / rate).toFixed(2) : "";
      }
      return updated;
    });
  };'''
if old_handle in content:
    content = content.replace(old_handle, new_handle, 1)

# Add banner in UI before price inputs
banner_code = '''
        {/* Banner de Dólar Fijo Centralizado */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(162, 89, 255, 0.12), rgba(97, 0, 255, 0.08))',
          border: '1.5px solid rgba(162, 89, 255, 0.35)',
          borderRadius: 12,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          margin: '4px 0 12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.2rem' }}>💵</span>
            <div>
              <div style={{ fontWeight: 800, color: '#7b2ff2', fontSize: '0.92rem' }}>
                Dólar fijo del sistema: ${rate} CLP
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                Solo ingresa el valor en CLP y la conversión a USD se calcula automáticamente.
              </div>
            </div>
          </div>
          {editingDolar ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number"
                value={dolarInput}
                onChange={e => setDolarInput(e.target.value)}
                style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1.5px solid #7b2ff2', fontSize: '0.9rem' }}
              />
              <button
                type="button"
                onClick={async () => {
                  const n = Number(dolarInput);
                  if (n > 0) {
                    await actualizarValorDolar(n);
                    setEditingDolar(false);
                  }
                }}
                style={{ background: '#7b2ff2', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setEditingDolar(false)}
                style={{ background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setDolarInput(String(rate)); setEditingDolar(true); }}
              style={{ background: 'rgba(123, 47, 242, 0.1)', color: '#7b2ff2', border: '1px solid #7b2ff2', borderRadius: 8, padding: '4px 12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
            >
              ⚙️ Cambiar valor dólar
            </button>
          )}
        </div>
'''

old_switch_target = '{esSwitch && ('
if old_switch_target in content:
    content = content.replace(old_switch_target, banner_code + '\n        ' + old_switch_target, 1)

# In streaming inputs, autocalculate USD on CLP change
old_clp_mes = 'onChange={e => setNuevoPrecioMes({ ...nuevoPrecioMes, clp: e.target.value })}'
new_clp_mes = 'onChange={e => { const val = e.target.value; setNuevoPrecioMes(prev => ({ ...prev, clp: val, usd: val && !isNaN(val) ? (Number(val) / rate).toFixed(2) : "" })); }}'
content = content.replace(old_clp_mes, new_clp_mes, 1)

old_costo_mes = 'onChange={e => setNuevoPrecioMes({ ...nuevoPrecioMes, costoClp: e.target.value })}'
new_costo_mes = 'onChange={e => { const val = e.target.value; setNuevoPrecioMes(prev => ({ ...prev, costoClp: val, costoUsd: val && !isNaN(val) ? (Number(val) / rate).toFixed(2) : "" })); }}'
content = content.replace(old_costo_mes, new_costo_mes, 1)

with open('src/pages/Productos/ProductoForm.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("ProductoForm updated successfully!")
