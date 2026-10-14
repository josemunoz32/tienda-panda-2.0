import re

# 1. UPDATE AdminRevendedores.js
with open(r'c:\Users\Usuario\proyectopandastore20\src\pages\Admin\AdminRevendedores.js', 'r', encoding='utf-8') as f:
    rev_content = f.read()

# Add selectedUserForOrders and allOrders states
target_state = '  const [selectedUserForAdjust, setSelectedUserForAdjust] = useState(null);'
new_state = '''  const [selectedUserForAdjust, setSelectedUserForAdjust] = useState(null);
  const [selectedUserForOrders, setSelectedUserForOrders] = useState(null);
  const [allOrders, setAllOrders] = useState([]);'''

if target_state in rev_content:
    rev_content = rev_content.replace(target_state, new_state)
    print("AdminRevendedores.js state updated!")
else:
    print("AdminRevendedores.js state target not found")

# Update orders onSnapshot to save allOrders
target_snap = '''    const unsub = onSnapshot(q, (snap) => {
      const allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const walletOrders = allOrders.filter(o => '''
new_snap = '''    const unsub = onSnapshot(q, (snap) => {
      const ordersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllOrders(ordersList);
      const walletOrders = ordersList.filter(o => '''

if target_snap in rev_content:
    rev_content = rev_content.replace(target_snap, new_snap)
    print("AdminRevendedores.js onSnapshot updated!")
else:
    print("AdminRevendedores.js onSnapshot target not found")

# Add "Ver Compras" button in the table row
target_btn = '''                      <button
                        className="btn-adjust"
                        onClick={() => setSelectedUserForAdjust(rev)}
                      >
                        <DollarSign size={14} /> Ajustar Saldo
                      </button>'''

new_btn = '''                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
                      </div>'''

if target_btn in rev_content:
    rev_content = rev_content.replace(target_btn, new_btn)
    print("AdminRevendedores.js table button updated!")
else:
    print("AdminRevendedores.js table button target not found")

# Add modal before the closing </div>
target_end = '    </div>\n  );\n}\n'
modal_jsx = '''      {/* MODAL HISTORIAL DE COMPRAS DEL REVENDEDOR Y REEMBOLSO */}
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
'''

if target_end in rev_content:
    rev_content = rev_content.replace(target_end, modal_jsx)
    print("AdminRevendedores.js modal added!")
else:
    print("AdminRevendedores.js closing target not found")

with open(r'c:\Users\Usuario\proyectopandastore20\src\pages\Admin\AdminRevendedores.js', 'w', encoding='utf-8') as f:
    f.write(rev_content)

print("AdminRevendedores.js finished successfully!")
