with open('src/pages/Admin/AdminDashboard.js', 'r', encoding='utf-8') as f:
    content = f.read().replace('\r\n', '\n')

old_import = 'import "./AdminDashboard.css";'
new_import = 'import "./AdminDashboard.css";\nimport { useMoneda } from "../../context/MonedaContext";'
if old_import in content:
    content = content.replace(old_import, new_import, 1)

old_comp = 'export default function AdminDashboard() {\n  const [store, setStore] = useState(null);'
new_comp = 'export default function AdminDashboard() {\n  const { valorDolar } = useMoneda();\n  const [store, setStore] = useState(null);'
if old_comp in content:
    content = content.replace(old_comp, new_comp, 1)

old_grid = '<Metric icon="↗" label="Ganancia calculable CLP" value={model.profitOrders ? money(model.profit) : "Sin respaldo"} color="#fbbf24" />\n    </section>'
new_grid = '''<Metric icon="↗" label="Ganancia calculable CLP" value={model.profitOrders ? money(model.profit) : "Sin respaldo"} color="#fbbf24" />
      <Metric icon="💵" label="Dólar Web Fijado" value={`$${(valorDolar || 900).toLocaleString("es-CL")} CLP`} color="#10b981" />
    </section>'''
if old_grid in content:
    content = content.replace(old_grid, new_grid, 1)

with open('src/pages/Admin/AdminDashboard.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("AdminDashboard.js updated successfully!")
