import re

path = r"c:\Users\Usuario\proyectopandastore20\src\pages\Admin\AdminDistribuidores.js"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add ShoppingBag to lucide-react import
if "ShoppingBag," not in content and "ShoppingBag" not in content:
    content = content.replace("Sparkles\n} from \"lucide-react\";", "Sparkles,\n  ShoppingBag\n} from \"lucide-react\";")
    print("Added ShoppingBag import")

# 2. Add state and effect and handler
state_block = '''  const [searchTerm, setSearchTerm] = useState("");
  const [allOrders, setAllOrders] = useState([]);
  const [selectedDistForOrders, setSelectedDistForOrders] = useState(null);
  const [refundLoadingId, setRefundLoadingId] = useState(null);'''

content = content.replace('  const [searchTerm, setSearchTerm] = useState("");', state_block, 1)

# Add listener in useEffect
effect_block = '''  useEffect(() => {
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
  }, []);'''

content = content.replace('''  useEffect(() => {
    loadData();
  }, []);''', effect_block, 1)

# Add handleReembolsarPedidoBilletera before handleSaveDistribuidor
refund_handler = '''  // ─── REEMBOLSAR PEDIDO A BILLETERA (SOLO SI FUE PAGADO CON BILLETERA) ────
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
    }?\\n\\n- Se sumará inmediatamente ${formatCLP(monto)} a su saldo de billetera.\\n- El pedido #${
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

  // ─── GUARDAR O ASIGNAR DISTRIBUIDOR'''

content = content.replace("  // ─── GUARDAR O ASIGNAR DISTRIBUIDOR", refund_handler, 1)

# Add "Ver Compras" button in action cell
old_action_cell = '''                        {/* BOTÓN RECARGAR CLAVES EXTRAS */}'''
new_action_cell = '''                        {/* VER COMPRAS DEL DISTRIBUIDOR */}
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

                        {/* BOTÓN RECARGAR CLAVES EXTRAS */}'''

content = content.replace(old_action_cell, new_action_cell, 1)

# Add Modal at the end of component
orders_modal = '''      {/* ─── MODAL HISTORIAL DE COMPRAS DEL DISTRIBUIDOR Y REEMBOLSO ──────────── */}
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
}'''

content = content.replace("    </div>\n  );\n}", orders_modal, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("AdminDistribuidores.js patched successfully!")
