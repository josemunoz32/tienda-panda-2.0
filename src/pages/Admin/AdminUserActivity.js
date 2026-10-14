import React, { useEffect, useState } from "react";
import { collectionGroup, getDocs, getDoc, doc, collection, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";

export default function AdminUserActivity({ user, role }) {
  const [activeTab, setActiveTab] = useState("abandoned"); // "abandoned" | "cart" | "favorites"
  const [abandonedList, setAbandonedList] = useState([]);
  const [cartsGrouped, setCartsGrouped] = useState([]);
  const [favsGrouped, setFavsGrouped] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || role !== "admin") {
      navigate("/home");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Carritos Abandonados & Navegación (abandonedCarts)
        const cartsQuery = query(collection(db, "abandonedCarts"), orderBy("lastUpdated", "desc"), limit(50));
        const cartsSnap = await getDocs(cartsQuery).catch(() => ({ docs: [] }));
        const abData = cartsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAbandonedList(abData);

        // 2. Fetch Carritos de usuarios registrados (subcollectionGroup)
        const cartSnap = await getDocs(collectionGroup(db, "cart")).catch(() => ({ docs: [] }));
        const favSnap = await getDocs(collectionGroup(db, "favorites")).catch(() => ({ docs: [] }));

        const groupItems = async (snap) => {
          const grouped = {};
          snap.docs.forEach(d => {
            const userId = d.ref.parent.parent.id;
            if (!grouped[userId]) grouped[userId] = [];
            grouped[userId].push({ id: d.id, ...d.data() });
          });

          const result = [];
          for (const uid in grouped) {
            const userDoc = await getDoc(doc(db, "users", uid)).catch(() => null);
            const userData = userDoc && userDoc.exists() ? userDoc.data() : {};

            const itemsPopulated = await Promise.all(grouped[uid].map(async (item) => {
              if (!item.name || !item.imageUrl) {
                const pDoc = await getDoc(doc(db, "products", item.productId || item.id)).catch(() => null);
                if (pDoc && pDoc.exists()) {
                  return { ...item, ...pDoc.data() };
                }
              }
              return item;
            }));

            result.push({
              uid,
              user: userData,
              items: itemsPopulated
            });
          }
          return result;
        };

        const [cData, fData] = await Promise.all([
          groupItems(cartSnap),
          groupItems(favSnap)
        ]);

        setCartsGrouped(cData);
        setFavsGrouped(fData);
      } catch (e) {
        console.error("Error al cargar actividad de usuarios", e);
      }
      setLoading(false);
    };

    fetchData();
  }, [user, navigate, role]);

  const formatCLP = (amount) => {
    return `$${Math.round(amount || 0).toLocaleString("es-CL")} CLP`;
  };

  const formatDate = (val) => {
    if (!val) return "Reciente";
    const d = val.toDate ? val.toDate() : new Date(val);
    if (isNaN(d.getTime())) return "Reciente";
    return d.toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{
      maxWidth: 1200,
      margin: "24px auto",
      padding: "24px 20px",
      background: "#0c061a",
      borderRadius: 20,
      border: "1px solid #2d184d",
      boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
      color: "#f1f5f9",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 24, borderBottom: "1px solid #23143d", paddingBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, color: "#ffffff", display: "flex", alignItems: "center", gap: 10 }}>
            <span>🛒</span> Carritos y Juegos Vistos en Vivo
          </h1>
          <p style={{ margin: "6px 0 0 0", color: "#a78bfa", fontSize: 13.5 }}>
            Monitorea en tiempo real qué clientes o visitantes tienen juegos en su carrito y qué títulos estuvieron viendo en la tienda.
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/correos")}
          style={{
            background: "linear-gradient(135deg, #a855f7, #ec4899)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 18px",
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(236,72,153,0.3)"
          }}
        >
          📧 Abrir Campañas de Correo →
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab("abandoned")}
          style={{
            padding: "10px 20px",
            borderRadius: 12,
            border: activeTab === "abandoned" ? "1.5px solid #ec4899" : "1px solid rgba(255,255,255,0.1)",
            background: activeTab === "abandoned" ? "rgba(236,72,153,0.25)" : "rgba(255,255,255,0.04)",
            color: activeTab === "abandoned" ? "#fff" : "#94a3b8",
            fontWeight: 800,
            fontSize: 13.5,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.2s"
          }}
        >
          <span>🔥</span> Carritos Abandonados e Invitados ({abandonedList.length})
        </button>

        <button
          onClick={() => setActiveTab("cart")}
          style={{
            padding: "10px 20px",
            borderRadius: 12,
            border: activeTab === "cart" ? "1.5px solid #a855f7" : "1px solid rgba(255,255,255,0.1)",
            background: activeTab === "cart" ? "rgba(168,85,247,0.25)" : "rgba(255,255,255,0.04)",
            color: activeTab === "cart" ? "#fff" : "#94a3b8",
            fontWeight: 800,
            fontSize: 13.5,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.2s"
          }}
        >
          <span>👤</span> Carritos Usuarios Registrados ({cartsGrouped.length})
        </button>

        <button
          onClick={() => setActiveTab("favorites")}
          style={{
            padding: "10px 20px",
            borderRadius: 12,
            border: activeTab === "favorites" ? "1.5px solid #38bdf8" : "1px solid rgba(255,255,255,0.1)",
            background: activeTab === "favorites" ? "rgba(56,189,248,0.25)" : "rgba(255,255,255,0.04)",
            color: activeTab === "favorites" ? "#fff" : "#94a3b8",
            fontWeight: 800,
            fontSize: 13.5,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.2s"
          }}
        >
          <span>❤️</span> Favoritos Guardados ({favsGrouped.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#c084fc", fontWeight: 700, fontSize: 16 }}>
          <span style={{ fontSize: 28, display: "block", marginBottom: 12 }}>⏳</span>
          Cargando carritos y actividad de navegación en vivo...
        </div>
      ) : null}

      {/* TAB 1: CARRITOS ABANDONADOS E INVITADOS CON JUEGOS VISTOS */}
      {!loading && activeTab === "abandoned" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {abandonedList.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px dashed #331f54" }}>
              <span style={{ fontSize: 36, display: "block", marginBottom: 10 }}>🎉</span>
              <p style={{ color: "#94a3b8", margin: 0, fontSize: 15, fontWeight: 600 }}>
                No hay carritos abandonados pendientes en este momento.
              </p>
            </div>
          ) : (
            abandonedList.map((cart) => {
              const hasEmail = Boolean(cart.email || cart.customerEmail);
              const cleanEmail = (cart.email || cart.customerEmail || "").trim().toLowerCase();
              const hasPhone = Boolean(cart.customerPhone);
              const cleanPhone = hasPhone ? cart.customerPhone.replace(/[^0-9]/g, "") : "";
              const clientName = cart.customerName || (hasEmail ? cleanEmail.split("@")[0] : (cart.uid ? "Usuario Registrado" : "Visitante Invitado"));
              const items = Array.isArray(cart.items) ? cart.items : [];
              const viewed = Array.isArray(cart.viewedProducts) ? cart.viewedProducts : [];
              const firstGameName = items[0]?.name || viewed[0]?.name || "tus juegos seleccionados";

              return (
                <div
                  key={cart.id}
                  style={{
                    background: "#140a27",
                    border: "1px solid #2d184d",
                    borderRadius: 16,
                    padding: "20px",
                    boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
                    transition: "all 0.2s"
                  }}
                >
                  {/* Fila superior: Cliente, Contacto, Total y Botones de Acción */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, borderBottom: "1px solid #23143d", paddingBottom: 14, marginBottom: 16 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 16, fontWeight: 900, color: "#ffffff" }}>
                          {clientName}
                        </span>
                        {cart.isGuest ? (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(236,72,153,0.18)", color: "#f472b6", border: "1px solid rgba(236,72,153,0.3)" }}>
                            🛒 Invitado Web
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(168,85,247,0.18)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)" }}>
                            👤 Con Cuenta
                          </span>
                        )}
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: cart.status === "converted" ? "rgba(52,211,153,0.18)" : "rgba(251,146,60,0.18)",
                          color: cart.status === "converted" ? "#34d399" : "#fb923c",
                          border: cart.status === "converted" ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(251,146,60,0.3)"
                        }}>
                          {cart.status === "converted" ? "✅ Compra Completada" : "🛒 Carrito Abandonado"}
                        </span>
                      </div>

                      {/* Datos de contacto */}
                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6, fontSize: 13 }}>
                        {hasEmail ? (
                          <span style={{ color: "#c4b5fd" }}>
                            📧 <strong>{cleanEmail}</strong>
                          </span>
                        ) : (
                          <span style={{ color: "#64748b" }}>
                            🆔 Sesión: {cart.id?.slice(0, 12)}…
                          </span>
                        )}
                        {hasPhone && (
                          <span style={{ color: "#34d399" }}>
                            📱 WhatsApp: {cart.customerPhone}
                          </span>
                        )}
                        <span style={{ color: "#94a3b8" }}>
                          🕒 {formatDate(cart.lastUpdated || cart.updatedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Total y Botones de Acción */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#facc15" }}>
                        {formatCLP(cart.totalCLP || 0)}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {hasEmail && (
                          <button
                            type="button"
                            onClick={() => {
                              navigate(`/admin/correos?recuperarEmail=${encodeURIComponent(cleanEmail)}&nombre=${encodeURIComponent(clientName)}&juego=${encodeURIComponent(firstGameName)}`);
                            }}
                            style={{
                              padding: "6px 14px",
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 800,
                              background: "linear-gradient(135deg, #a855f7, #ec4899)",
                              color: "#fff",
                              border: "none",
                              cursor: "pointer",
                              boxShadow: "0 2px 8px rgba(236,72,153,0.3)"
                            }}
                          >
                            ✉️ Enviar Oferta / Cupón
                          </button>
                        )}
                        {hasPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                              `¡Hola ${clientName}! Te escribimos de PandaStore 🐼 Vimos que guardaste ${firstGameName} en tu carrito pero aún no completas tu pedido. ¿Te gustaría un cupón de descuento especial para que te lo lleves hoy?`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: "6px 14px",
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 800,
                              background: "#25D366",
                              color: "#fff",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4
                            }}
                          >
                            💬 WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 1: JUEGOS EN EL CARRITO */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#f472b6", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>🛒</span> Juegos en su Carrito ({items.length})
                    </div>
                    {items.length === 0 ? (
                      <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>No hay juegos guardados en el carrito.</p>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                        {items.map((it, idx) => (
                          <div
                            key={idx}
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(236,72,153,0.25)",
                              borderRadius: 10,
                              padding: "8px 12px",
                              display: "flex",
                              alignItems: "center",
                              gap: 10
                            }}
                          >
                            {it.imageUrl || it.image ? (
                              <img
                                src={it.imageUrl || it.image}
                                alt={it.name}
                                style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                              />
                            ) : (
                              <div style={{ width: 44, height: 44, borderRadius: 8, background: "rgba(236,72,153,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                                🎮
                              </div>
                            )}
                            <div style={{ overflow: "hidden" }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={it.name}>
                                {it.name || it.title || "Juego Digital"}
                              </div>
                              <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 2 }}>
                                {formatCLP(it.priceCLP || it.precio || it.price)} {it.cantidad > 1 ? `(x${it.cantidad})` : ""} {it.consoleName ? <span style={{ color: "#a855f7" }}>({it.consoleName})</span> : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECCIÓN 2: JUEGOS QUE ESTUVO VIENDO */}
                  {viewed.length > 0 && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed rgba(255,255,255,0.08)" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>👀</span> Juegos que Estuvo Viendo en la Tienda ({viewed.length})
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                        {viewed.map((vp, vIdx) => (
                          <div
                            key={vIdx}
                            style={{
                              background: "rgba(255,255,255,0.02)",
                              border: "1px solid rgba(56,189,248,0.22)",
                              borderRadius: 10,
                              padding: "8px 12px",
                              display: "flex",
                              alignItems: "center",
                              gap: 10
                            }}
                          >
                            {vp.imageUrl || vp.image ? (
                              <img
                                src={vp.imageUrl || vp.image}
                                alt={vp.name}
                                style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                              />
                            ) : (
                              <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(56,189,248,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                                👁️
                              </div>
                            )}
                            <div style={{ overflow: "hidden" }}>
                              <div style={{ fontWeight: 700, fontSize: 12.5, color: "#f0f9ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={vp.name}>
                                {vp.name || vp.title || "Juego Visitado"}
                              </div>
                              <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>
                                {vp.priceCLP ? formatCLP(vp.priceCLP) : "Interés Gamer"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2 & 3: CARRITOS REGISTRADOS Y FAVORITOS */}
      {!loading && activeTab !== "abandoned" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {(activeTab === "cart" ? cartsGrouped : favsGrouped).length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px dashed #331f54" }}>
              <p style={{ color: "#94a3b8", margin: 0, fontSize: 15, fontWeight: 600 }}>
                No hay {activeTab === "cart" ? "carritos de usuarios registrados" : "favoritos guardados"} registrados actualmente.
              </p>
            </div>
          ) : (
            (activeTab === "cart" ? cartsGrouped : favsGrouped).map((data, index) => {
              const uName = data.user?.displayName || [data.user?.firstName, data.user?.lastName].filter(Boolean).join(" ") || "Usuario Registrado";
              const uEmail = data.user?.email || data.uid;
              const firstGameName = data.items[0]?.name || "tus juegos";

              return (
                <div
                  key={index}
                  style={{
                    background: "#140a27",
                    border: "1px solid #2d184d",
                    borderRadius: 16,
                    padding: "20px",
                    boxShadow: "0 6px 20px rgba(0,0,0,0.35)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #23143d", paddingBottom: 12, marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>{uName}</div>
                      <div style={{ fontSize: 13, color: "#a78bfa" }}>📧 {uEmail}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ color: activeTab === "cart" ? "#ec4899" : "#38bdf8", fontWeight: 800, fontSize: 13 }}>
                        {data.items.length} {activeTab === "cart" ? "en carrito" : "en favoritos"}
                      </span>
                      {uEmail.includes("@") && (
                        <button
                          type="button"
                          onClick={() => {
                            navigate(`/admin/correos?recuperarEmail=${encodeURIComponent(uEmail)}&nombre=${encodeURIComponent(uName)}&juego=${encodeURIComponent(firstGameName)}`);
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 800,
                            background: "linear-gradient(135deg, #a855f7, #ec4899)",
                            color: "#fff",
                            border: "none",
                            cursor: "pointer"
                          }}
                        >
                          ✉️ Enviar Oferta
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                    {data.items.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 10,
                          padding: "10px",
                          display: "flex",
                          alignItems: "center",
                          gap: 12
                        }}
                      >
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 48, height: 48, borderRadius: 8, background: "rgba(168,85,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                            🎮
                          </div>
                        )}
                        <div style={{ overflow: "hidden" }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={item.name}>
                            {item.name || "Juego Digital"}
                          </div>
                          <div style={{ fontSize: 12, color: "#facc15", marginTop: 2, fontWeight: 700 }}>
                            {formatCLP(item.priceCLP || item.price)}
                            {item.consoleName ? <span style={{ color: "#94a3b8", fontSize: "0.8rem", marginLeft: 4 }}>({item.consoleName})</span> : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
