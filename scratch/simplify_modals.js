const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'Admin', 'AdminJuegosSinPublicar.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. REEMPLAZAR FORMULARIO EN adjustingPriceGame
const oldAdjustStart = '{/* FORMULARIO DE PRECIOS AUTOMATIZADO */}';
const oldAdjustEnd = '{/* BOTONES DE ACCIÓN */}';

const newAdjustForm = `{/* FORMULARIO SIMPLIFICADO: 1 SOLO INPUT DE PRECIO CLIENTE */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* CAMPO ÚNICO: PRECIO CLIENTE FINAL */}
              <div style={{ background: "rgba(56, 189, 248, 0.05)", padding: "16px", borderRadius: "12px", border: "1.5px solid rgba(56, 189, 248, 0.3)" }}>
                <label style={{ fontSize: "0.9rem", fontWeight: 800, color: "#38bdf8", display: "block", marginBottom: 8 }}>
                  🎮 Ingresa Precio Cliente Final (CLP):
                </label>
                <input
                  type="number"
                  step="500"
                  value={adjustForm.primaria}
                  onChange={(e) => handlePrimariaChange(e.target.value)}
                  placeholder="Ej: 13000"
                  style={{
                    width: "100%",
                    background: "#0f172a",
                    border: "2px solid #38bdf8",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    color: "#fff",
                    fontSize: "1.3rem",
                    fontWeight: 900
                  }}
                />
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginTop: 6 }}>
                  💡 Solo ingresa este valor. El precio de revendedor y las ganancias se calculan de forma automática.
                </span>
              </div>

              {/* TARJETA DE CÁLCULO AUTOMÁTICO EN TIEMPO REAL */}
              <div style={{
                background: "rgba(15, 23, 42, 0.7)",
                border: "1.5px solid rgba(168, 85, 247, 0.3)",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#94a3b8", fontSize: "0.88rem" }}>Precio Revendedor (Automático):</span>
                  <strong style={{ color: "#c084fc", fontSize: "1.2rem" }}>
                    💎 {formatCLP(adjustForm.revendedor)}
                  </strong>
                </div>

                <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)" }} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "8px", padding: "10px" }}>
                    <div style={{ fontSize: "0.74rem", color: "#86efac", textTransform: "uppercase", fontWeight: 700 }}>Tu Ganancia Cliente</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#22c55e", marginTop: 2 }}>
                      +{formatCLP(Number(adjustForm.primaria) - adjustingPriceGame.costCLP)}
                    </div>
                  </div>

                  <div style={{ background: "rgba(168, 85, 247, 0.1)", border: "1px solid rgba(168, 85, 247, 0.3)", borderRadius: "8px", padding: "10px" }}>
                    <div style={{ fontSize: "0.74rem", color: "#d8b4fe", textTransform: "uppercase", fontWeight: 700 }}>Tu Ganancia Revendedor</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#c084fc", marginTop: 2 }}>
                      +{formatCLP(Number(adjustForm.revendedor) - adjustingPriceGame.costCLP)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            `;

const p1 = code.indexOf(oldAdjustStart);
const p2 = code.indexOf(oldAdjustEnd);
if (p1 !== -1 && p2 !== -1 && p2 > p1) {
  code = code.slice(0, p1) + newAdjustForm + code.slice(p2);
  console.log('✅ AdjustForm en modal de ajuste reemplazado con éxito.');
} else {
  console.error('❌ AdjustForm markers no encontrados:', { p1, p2 });
}

// 2. REEMPLAZAR BLOQUE DE VARIANTES EN publishingModalGame
const oldPublishBlockStart = '{vData.selected && (';
// Buscar el bloque que contiene inputs de nombre, portada y precio revendedor
const targetPublishSubstr = '<div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "16px", alignItems: "center" }}>';
const pPublishStart = code.indexOf(targetPublishSubstr);

if (pPublishStart !== -1) {
  // Buscamos el cierre de este bloque de formulario antes del cierre de map
  const pClosingParent = code.indexOf('                  </div>\n                );\n              })}', pPublishStart);
  if (pClosingParent !== -1) {
    const newVariantSelectedBody = `<div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px", background: "rgba(15, 23, 42, 0.6)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(56, 189, 248, 0.25)" }}>
                        {/* UN SOLO INPUT: PRECIO CLIENTE FINAL */}
                        <div>
                          <label style={{ fontSize: "0.86rem", color: "#38bdf8", fontWeight: 800, display: "block", marginBottom: 6 }}>
                            🎮 Ingresa Precio Cliente Final (CLP):
                          </label>
                          <input
                            type="number"
                            step="500"
                            value={vData.pricePrimaria}
                            onChange={(e) => handleModalPricePrimariaChange(typeKey, e.target.value)}
                            placeholder="Ej: 13000"
                            style={{
                              width: "100%",
                              background: "#0f172a",
                              border: "2px solid #38bdf8",
                              borderRadius: "8px",
                              padding: "10px 14px",
                              color: "#fff",
                              fontSize: "1.2rem",
                              fontWeight: 900
                            }}
                          />
                        </div>

                        {/* DESGLOSE AUTOMÁTICO DE PRECIO REVENDEDOR Y GANANCIAS */}
                        <div style={{
                          background: "rgba(0, 0, 0, 0.4)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "8px",
                          padding: "12px 14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#94a3b8", fontSize: "0.84rem" }}>Precio Revendedor (Automático según regla):</span>
                            <strong style={{ color: "#c084fc", fontSize: "1.1rem" }}>
                              💎 {formatCLP(vData.priceRevendedor)}
                            </strong>
                          </div>

                          <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.06)" }} />

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            <div style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.25)", borderRadius: "6px", padding: "8px 10px" }}>
                              <div style={{ fontSize: "0.7rem", color: "#86efac", textTransform: "uppercase", fontWeight: 700 }}>Tu Ganancia Cliente</div>
                              <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#22c55e", marginTop: 2 }}>
                                +{formatCLP((Number(vData.pricePrimaria) || 0) - vData.costCLP)}
                              </div>
                            </div>

                            <div style={{ background: "rgba(168, 85, 247, 0.1)", border: "1px solid rgba(168, 85, 247, 0.25)", borderRadius: "6px", padding: "8px 10px" }}>
                              <div style={{ fontSize: "0.7rem", color: "#d8b4fe", textTransform: "uppercase", fontWeight: 700 }}>Tu Ganancia Revendedor</div>
                              <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#c084fc", marginTop: 2 }}>
                                +{formatCLP((Number(vData.priceRevendedor) || 0) - vData.costCLP)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
`;
    // Encontramos el inicio del {vData.selected && (
    const pSelectedStart = code.lastIndexOf('{vData.selected && (', pPublishStart);
    if (pSelectedStart !== -1) {
      code = code.slice(0, pSelectedStart) + '{vData.selected && (\n                      ' + newVariantSelectedBody + code.slice(pClosingParent);
      console.log('✅ Bloque de variantes en publishingModalGame simplificado con éxito.');
    }
  } else {
    // Si tiene CRLF:
    const pClosingParentCRLF = code.indexOf('                  </div>\r\n                );\r\n              })}', pPublishStart);
    if (pClosingParentCRLF !== -1) {
      const newVariantSelectedBody = `<div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px", background: "rgba(15, 23, 42, 0.6)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(56, 189, 248, 0.25)" }}>
                        {/* UN SOLO INPUT: PRECIO CLIENTE FINAL */}
                        <div>
                          <label style={{ fontSize: "0.86rem", color: "#38bdf8", fontWeight: 800, display: "block", marginBottom: 6 }}>
                            🎮 Ingresa Precio Cliente Final (CLP):
                          </label>
                          <input
                            type="number"
                            step="500"
                            value={vData.pricePrimaria}
                            onChange={(e) => handleModalPricePrimariaChange(typeKey, e.target.value)}
                            placeholder="Ej: 13000"
                            style={{
                              width: "100%",
                              background: "#0f172a",
                              border: "2px solid #38bdf8",
                              borderRadius: "8px",
                              padding: "10px 14px",
                              color: "#fff",
                              fontSize: "1.2rem",
                              fontWeight: 900
                            }}
                          />
                        </div>

                        {/* DESGLOSE AUTOMÁTICO DE PRECIO REVENDEDOR Y GANANCIAS */}
                        <div style={{
                          background: "rgba(0, 0, 0, 0.4)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "8px",
                          padding: "12px 14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#94a3b8", fontSize: "0.84rem" }}>Precio Revendedor (Automático según regla):</span>
                            <strong style={{ color: "#c084fc", fontSize: "1.1rem" }}>
                              💎 {formatCLP(vData.priceRevendedor)}
                            </strong>
                          </div>

                          <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.06)" }} />

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            <div style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.25)", borderRadius: "6px", padding: "8px 10px" }}>
                              <div style={{ fontSize: "0.7rem", color: "#86efac", textTransform: "uppercase", fontWeight: 700 }}>Tu Ganancia Cliente</div>
                              <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#22c55e", marginTop: 2 }}>
                                +{formatCLP((Number(vData.pricePrimaria) || 0) - vData.costCLP)}
                              </div>
                            </div>

                            <div style={{ background: "rgba(168, 85, 247, 0.1)", border: "1px solid rgba(168, 85, 247, 0.25)", borderRadius: "6px", padding: "8px 10px" }}>
                              <div style={{ fontSize: "0.7rem", color: "#d8b4fe", textTransform: "uppercase", fontWeight: 700 }}>Tu Ganancia Revendedor</div>
                              <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#c084fc", marginTop: 2 }}>
                                +{formatCLP((Number(vData.priceRevendedor) || 0) - vData.costCLP)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
`;
      const pSelectedStart = code.lastIndexOf('{vData.selected && (', pPublishStart);
      if (pSelectedStart !== -1) {
        code = code.slice(0, pSelectedStart) + '{vData.selected && (\r\n                      ' + newVariantSelectedBody + code.slice(pClosingParentCRLF);
        console.log('✅ Bloque de variantes en publishingModalGame simplificado con éxito (CRLF).');
      }
    }
  }
}

fs.writeFileSync(filePath, code, 'utf8');
