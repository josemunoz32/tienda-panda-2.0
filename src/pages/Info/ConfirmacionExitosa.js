import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import confirmadoImg from "../../assets/estadopedido/confimado.png";
import { auth, db } from "../../firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  CheckCircle2,
  Gamepad2,
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  Send,
  Home,
  BookOpen
} from "lucide-react";
import { buildSolicitarInstalacionWspUrl, getOrderPlatformInfo } from "../../utils/whatsappHelper";

function ConfirmacionExitosa() {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState(auth.currentUser);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [nombre, setNombre] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [orderData, setOrderData] = useState(location.state || null);
  const [loadingOrder, setLoadingOrder] = useState(!location.state);

  // Escuchar cambios de autenticación
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        getDoc(doc(db, "users", currentUser.uid))
          .then((snap) => {
            if (snap.exists()) {
              const d = snap.data();
              setAvatarUrl(d.photoURL || d.avatarUrl || currentUser.photoURL || null);
              setNombre(d.displayName || d.name || currentUser.displayName || "");
            }
          })
          .catch(() => {});
      }
    });
    return () => unsub();
  }, []);

  // Si no vino state en la navegación, buscar el pedido más reciente en Firestore
  useEffect(() => {
    if (orderData && orderData.orderId) {
      setLoadingOrder(false);
      return;
    }

    async function fetchLatestOrder() {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setLoadingOrder(false);
          return;
        }

        const snap = await getDocs(collection(db, `users/${currentUser.uid}/orders`));
        if (!snap.empty) {
          const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          orders.sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime());
          const latest = orders[0];
          if (latest) {
            let plat = latest.plataforma || "";
            if (plat === "Nintendo Switch / PC") plat = "Nintendo Switch";
            if (!plat && Array.isArray(latest.productos) && latest.productos.length > 0) {
              const p0 = latest.productos[0];
              plat = p0.plataforma === "Nintendo Switch / PC" ? "Nintendo Switch" : (p0.plataforma || "");
            }
            if (!plat) plat = "PC / Steam";

            setOrderData({
              orderId: latest.globalOrderId || latest.id,
              pedidoId: latest.globalOrderId || latest.id,
              productos: latest.productos || [],
              producto: Array.isArray(latest.productos) && latest.productos.length > 0
                ? latest.productos.map((p) => p.nombre || p.title || p.name).join(", ")
                : (latest.producto || "Juegos PandaStore"),
              plataforma: plat,
              licenseKey: latest.licenseKey || null,
              total: latest.totalCLP || latest.total || 0,
              moneda: latest.moneda || "CLP",
              metodoPago: latest.metodoPago || "Aprobado",
              nombre: latest.nombre || currentUser.displayName || "",
              email: latest.email || currentUser.email || ""
            });
          }
        }
      } catch (err) {
        console.error("Error buscando último pedido:", err);
      } finally {
        setLoadingOrder(false);
      }
    }

    fetchLatestOrder();
  }, [user, orderData]);

  // Datos normalizados y plataforma dinámica
  const platformInfo = useMemo(() => getOrderPlatformInfo(orderData), [orderData]);
  const finalNombre = orderData?.nombre || nombre || user?.displayName || "Gamer";
  const finalEmail = orderData?.email || user?.email || "";
  const finalOrderId = orderData?.orderId || orderData?.pedidoId || "";
  const finalPlataforma = platformInfo.platformLabel;
  const finalTotal = orderData?.total || orderData?.totalCLP || null;
  const finalMoneda = orderData?.moneda || "CLP";
  const finalMetodo = orderData?.metodoPago || "Aprobado";

  const productosList = useMemo(() => {
    if (Array.isArray(orderData?.productos) && orderData.productos.length > 0) {
      return orderData.productos;
    }
    if (orderData?.producto) {
      return [
        {
          nombre: orderData.producto,
          plataforma: finalPlataforma,
          precio: finalTotal,
          cantidad: 1
        }
      ];
    }
    return [];
  }, [orderData, finalPlataforma, finalTotal]);

  // Generar URL de WhatsApp con mensaje personalizado
  const whatsappUrl = useMemo(() => {
    return buildSolicitarInstalacionWspUrl({
      nombre: finalNombre,
      email: finalEmail,
      pedidoId: finalOrderId,
      productos: productosList,
      producto: orderData?.producto,
      plataforma: finalPlataforma,
      total: finalTotal,
      moneda: finalMoneda,
      metodoPago: finalMetodo
    });
  }, [finalNombre, finalEmail, finalOrderId, productosList, orderData, finalPlataforma, finalTotal, finalMoneda, finalMetodo]);

  // Copiar ID al portapapeles
  const handleCopyId = () => {
    if (!finalOrderId) return;
    navigator.clipboard.writeText(finalOrderId).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2200);
    });
  };

  const isNintendo = finalPlataforma.toLowerCase().includes("nintendo") ||
    productosList.some((p) => (p.plataforma || "").toLowerCase().includes("nintendo"));

  return (
    <div className="ce-page-container">
      <div className="ce-ambient-glow ce-glow-top" />
      <div className="ce-ambient-glow ce-glow-bottom" />

      <main className="ce-card">
        {/* Top neon decorative border */}
        <div className="ce-top-bar" />

        {/* Celebration Hero Badge */}
        <div className="ce-hero-section">
          <div className="ce-img-container">
            <div className="ce-img-halo" />
            <img src={confirmadoImg} alt="Compra Confirmada" className="ce-img" />
            <div className="ce-floating-badge">
              <CheckCircle2 size={18} className="ce-badge-icon" />
              <span>Aprobado</span>
            </div>
          </div>

          {/* User Avatar Chip */}
          <div className="ce-user-chip">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="ce-user-avatar" />
            ) : (
              <div className="ce-user-avatar-fallback">
                {(finalNombre || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <span className="ce-user-name">¡Hola, {finalNombre}!</span>
          </div>

          <h1 className="ce-main-title">
            ¡COMPRA CONFIRMADA!
          </h1>
          <p className="ce-subtitle">
            Tu pago ha sido validado exitosamente. Todo está listo en el sistema de PandaStore para tu entrega.
          </p>
        </div>

        {/* Order Details Summary Box */}
        {(finalOrderId || productosList.length > 0 || finalTotal) && (
          <div className="ce-order-box">
            <div className="ce-order-header">
              <div className="ce-order-id-group">
                <span className="ce-order-label">N° DE PEDIDO:</span>
                {finalOrderId ? (
                  <div className="ce-order-id-badge" onClick={handleCopyId} title="Copiar ID de pedido">
                    <span className="ce-order-id-text">#{finalOrderId.slice(0, 14)}...</span>
                    <button className="ce-copy-btn" type="button" aria-label="Copiar ID">
                      {copiedId ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                    </button>
                    {copiedId && <span className="ce-copied-toast">¡Copiado!</span>}
                  </div>
                ) : (
                  <span className="ce-order-id-text">Generado en tu cuenta</span>
                )}
              </div>
              <span className="ce-status-pill">
                <Sparkles size={13} /> Pago Verificado
              </span>
            </div>

            {/* Product items preview */}
            {productosList.length > 0 && (
              <div className="ce-products-list">
                {productosList.slice(0, 4).map((p, idx) => (
                  <div key={idx} className="ce-prod-row">
                    <div className="ce-prod-icon-wrap">
                      <Gamepad2 size={18} className="ce-prod-icon" />
                    </div>
                    <div className="ce-prod-info">
                      <span className="ce-prod-name">{p.nombre || p.title || p.name || "Juego Digital"}</span>
                      <span className="ce-prod-plat">{p.variante ? `${p.plataforma || finalPlataforma || "PlayStation"} (${p.variante.charAt(0).toUpperCase() + p.variante.slice(1).toLowerCase()})` : (p.plataforma || finalPlataforma || "Digital")}</span>
                    </div>
                    {p.precio ? (
                      <span className="ce-prod-price">
                        {finalMoneda === "USD"
                          ? `$${Number(p.precio).toFixed(2)} USD`
                          : `$${Number(p.precio).toLocaleString("es-CL")} CLP`}
                      </span>
                    ) : null}
                  </div>
                ))}
                {productosList.length > 4 && (
                  <div className="ce-prod-more">
                    +{productosList.length - 4} productos adicionales
                  </div>
                )}
              </div>
            )}

            {/* Total and Payment Method Summary */}
            <div className="ce-order-footer">
              <div className="ce-footer-item">
                <span className="ce-footer-lbl">Método:</span>
                <span className="ce-footer-val">{finalMetodo.toUpperCase()}</span>
              </div>
              {finalTotal && (
                <div className="ce-footer-item ce-footer-total">
                  <span className="ce-footer-lbl">Total pagado:</span>
                  <span className="ce-footer-total-val">
                    {finalMoneda === "USD"
                      ? `$${Number(finalTotal).toFixed(2)} USD`
                      : `$${Number(finalTotal).toLocaleString("es-CL")} CLP`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PLATFORM SPECIFIC DELIVERY SECTION */}
        {platformInfo.platformKey === "steam" && orderData?.licenseKey && (
          <div style={{
            margin: "0 24px 20px 24px",
            background: "linear-gradient(135deg, rgba(0, 245, 212, 0.12) 0%, rgba(162, 89, 255, 0.12) 100%)",
            border: "1.5px solid rgba(0, 245, 212, 0.4)",
            borderRadius: "16px",
            padding: "16px 18px",
            boxShadow: "0 8px 24px rgba(0, 245, 212, 0.15)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "1px", color: "#00f5d4", textTransform: "uppercase" }}>
                🔑 Tu Clave PandaStore Launcher
              </span>
              <span style={{ fontSize: "0.7rem", color: "#34d399", fontWeight: 700, background: "rgba(52, 211, 153, 0.15)", padding: "2px 8px", borderRadius: 999 }}>
                Activa y Verificada
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0, 0, 0, 0.4)", padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <code style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff", letterSpacing: "2px", fontFamily: "monospace" }}>
                {orderData.licenseKey}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(orderData.licenseKey);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: copiedKey ? "#10b981" : "rgba(255, 255, 255, 0.12)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedKey ? "Copiada" : "Copiar"}</span>
              </button>
            </div>
            <div style={{ fontSize: "0.74rem", color: "#cbd5e1", marginTop: 8, lineHeight: 1.4 }}>
              💡 Descarga e instala <strong>PandaStore Launcher</strong> en tu PC, ingresa tu clave y tus juegos y DLCs comprados se desbloquearán al instante.
            </div>
          </div>
        )}

        {platformInfo.platformKey === "nintendo" && (
          <div style={{
            margin: "0 24px 20px 24px",
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.06) 100%)",
            border: "1.5px solid rgba(239, 68, 68, 0.35)",
            borderRadius: "16px",
            padding: "16px 18px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: "1.2rem" }}>🔴</span>
              <strong style={{ color: "#f87171", fontSize: "0.95rem" }}>Instalación en Nintendo Switch</strong>
            </div>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#e2e8f0", lineHeight: 1.5 }}>
              Para instalar tu juego en la consola, pulsa el botón de WhatsApp abajo con tu N° de Pedido para que nuestro equipo te entregue el perfil oficial y te guíe paso a paso.
            </p>
          </div>
        )}

        {platformInfo.platformKey === "playstation" && (
          <div style={{
            margin: "0 24px 20px 24px",
            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(37, 99, 235, 0.06) 100%)",
            border: "1.5px solid rgba(59, 130, 246, 0.35)",
            borderRadius: "16px",
            padding: "16px 18px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: "1.2rem" }}>🔵</span>
              <strong style={{ color: "#60a5fa", fontSize: "0.95rem" }}>Entrega de Cuenta PlayStation (PS4 / PS5)</strong>
            </div>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#e2e8f0", lineHeight: 1.5 }}>
              Para recibir los accesos de tu cuenta PlayStation, pulsa el botón de WhatsApp abajo con tu N° de Pedido para coordinar la entrega inmediata y la activación en tu consola.
            </p>
          </div>
        )}

        {platformInfo.platformKey === "streaming" && (
          <div style={{
            margin: "0 24px 20px 24px",
            background: "linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(219, 39, 119, 0.06) 100%)",
            border: "1.5px solid rgba(236, 72, 153, 0.35)",
            borderRadius: "16px",
            padding: "16px 18px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: "1.2rem" }}>🍿</span>
              <strong style={{ color: "#f472b6", fontSize: "0.95rem" }}>Entrega de Cuenta Streaming</strong>
            </div>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#e2e8f0", lineHeight: 1.5 }}>
              Escríbenos directamente a WhatsApp con tu N° de Pedido para enviarte al instante las credenciales y el perfil asignado para tu servicio.
            </p>
          </div>
        )}

        {/* PRIMARY CTA: SOLICITAR INSTALACIÓN POR WHATSAPP */}
        <div className="ce-wsp-cta-container">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ce-wsp-btn"
            id="btn-solicitar-instalacion-wsp"
          >
            <div className="ce-wsp-btn-icon-wrap">
              <svg className="ce-wsp-svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
              </svg>
            </div>
            <div className="ce-wsp-btn-text">
              <span className="ce-wsp-btn-title">
                {platformInfo.wspButtonTitle || "SOLICITAR INSTALACIÓN POR WHATSAPP"}
              </span>
              <span className="ce-wsp-btn-subtitle">
                {platformInfo.wspButtonSub || "Envíanos tus datos para coordinar la entrega e instalación al instante"}
              </span>
            </div>
            <Send size={20} className="ce-wsp-arrow" />
          </a>
        </div>

        {/* Quick Actions Grid - Platform Adaptive */}
        <div className="ce-actions-section">
          <div className="ce-actions-label">
            {platformInfo.platformKey === "steam" ? "Opciones y descargas oficiales:" : "Opciones de tu pedido:"}
          </div>
          <div className="ce-actions-grid">
            {platformInfo.showGuideBtn && platformInfo.guideRoute && (
              <button
                type="button"
                className="ce-action-btn ce-action-guide"
                onClick={() => navigate(platformInfo.guideRoute)}
              >
                <div className="ce-action-icon">
                  <BookOpen size={18} />
                </div>
                <div className="ce-action-details">
                  <span className="ce-action-title">
                    {platformInfo.guideTitle}
                  </span>
                  <span className="ce-action-sub">{platformInfo.guideSub}</span>
                </div>
              </button>
            )}

            {platformInfo.showLauncherBtn && (
              <button
                type="button"
                className="ce-action-btn ce-action-launcher"
                onClick={() => navigate("/descargar-launcher")}
              >
                <div className="ce-action-icon">
                  <Download size={18} />
                </div>
                <div className="ce-action-details">
                  <span className="ce-action-title">Descargar Launcher</span>
                  <span className="ce-action-sub">Instalador oficial PC</span>
                </div>
              </button>
            )}

            <button
              type="button"
              className="ce-action-btn ce-action-orders"
              onClick={() => navigate("/mispedidos")}
            >
              <div className="ce-action-icon">
                <ShoppingBag size={18} />
              </div>
              <div className="ce-action-details">
                <span className="ce-action-title">Mis Pedidos y Claves</span>
                <span className="ce-action-sub">Ver compras y detalles</span>
              </div>
            </button>

            <button
              type="button"
              className="ce-action-btn ce-action-home"
              onClick={() => navigate("/home")}
            >
              <div className="ce-action-icon">
                <Home size={18} />
              </div>
              <div className="ce-action-details">
                <span className="ce-action-title">Volver a la Tienda</span>
                <span className="ce-action-sub">Seguir explorando</span>
              </div>
            </button>
          </div>
        </div>

        {/* Security & Customer Support Info */}
        <div className="ce-support-footer">
          <div className="ce-support-badge">
            <ShieldCheck size={18} className="ce-support-shield" />
            <span>Compra protegida y garantizada por PandaStore</span>
          </div>

          <div className="ce-social-links">
            <span className="ce-social-label">¿Necesitas ayuda adicional?</span>
            <div className="ce-social-btns">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ce-pill-link ce-pill-wsp"
              >
                WhatsApp Oficial
              </a>
              <a
                href="https://t.me/NintendoChile2"
                target="_blank"
                rel="noopener noreferrer"
                className="ce-pill-link ce-pill-tg"
              >
                Telegram @NintendoChile2
              </a>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .ce-page-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 50px 18px 80px 18px;
          position: relative;
          background: #090314;
          overflow: hidden;
          font-family: inherit;
        }

        .ce-ambient-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
        }
        .ce-glow-top {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(123, 47, 242, 0.28) 0%, rgba(37, 211, 102, 0.12) 60%, transparent 80%);
          top: -120px;
          left: 50%;
          transform: translateX(-50%);
        }
        .ce-glow-bottom {
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, rgba(243, 87, 168, 0.2) 0%, rgba(123, 47, 242, 0.08) 60%, transparent 80%);
          bottom: -150px;
          right: 5%;
        }

        .ce-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 620px;
          background: rgba(18, 9, 36, 0.88);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1.5px solid rgba(162, 89, 255, 0.3);
          border-radius: 28px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.75), 0 0 45px rgba(123, 47, 242, 0.25);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding-bottom: 28px;
          animation: ceCardAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes ceCardAppear {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .ce-top-bar {
          width: 100%;
          height: 6px;
          background: linear-gradient(90deg, #7b2ff2 0%, #25D366 50%, #f357a8 100%);
        }

        .ce-hero-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 30px 24px 12px 24px;
        }

        .ce-img-container {
          position: relative;
          width: 130px;
          height: 130px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }

        .ce-img-halo {
          position: absolute;
          width: 110px;
          height: 110px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(52, 211, 153, 0.35) 0%, rgba(123, 47, 242, 0.2) 65%, transparent 80%);
          filter: blur(14px);
          animation: cePulseHalo 3s ease-in-out infinite;
        }

        @keyframes cePulseHalo {
          0%, 100% { transform: scale(0.95); opacity: 0.7; }
          50% { transform: scale(1.18); opacity: 1; }
        }

        .ce-img {
          width: 115px;
          height: 115px;
          object-fit: contain;
          position: relative;
          z-index: 2;
          filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.6));
          animation: ceFloatImg 4s ease-in-out infinite;
        }

        @keyframes ceFloatImg {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }

        .ce-floating-badge {
          position: absolute;
          bottom: 2px;
          right: 0;
          z-index: 3;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #052e16;
          border: 1.5px solid #34d399;
          color: #34d399;
          font-size: 0.76rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 999px;
          box-shadow: 0 4px 14px rgba(52, 211, 153, 0.4);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .ce-user-chip {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          background: rgba(123, 47, 242, 0.18);
          border: 1px solid rgba(162, 89, 255, 0.35);
          padding: 4px 14px 4px 5px;
          border-radius: 999px;
          margin-bottom: 12px;
        }

        .ce-user-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid #a259ff;
        }

        .ce-user-avatar-fallback {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #7b2ff2;
          color: #fff;
          font-weight: 800;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ce-user-name {
          font-size: 0.88rem;
          color: #e2d9f3;
          font-weight: 700;
        }

        .ce-main-title {
          margin: 0;
          font-size: 1.85rem;
          font-weight: 900;
          letter-spacing: 0.02em;
          background: linear-gradient(135deg, #ffffff 0%, #34d399 45%, #a259ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.2;
        }

        .ce-subtitle {
          margin: 10px 0 0 0;
          font-size: 0.96rem;
          color: #aba0c2;
          line-height: 1.5;
          max-width: 490px;
        }

        /* Order Details Box */
        .ce-order-box {
          margin: 18px 24px 0 24px;
          background: rgba(30, 15, 60, 0.6);
          border: 1px solid rgba(162, 89, 255, 0.25);
          border-radius: 18px;
          padding: 16px 18px;
        }

        .ce-order-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(162, 89, 255, 0.15);
        }

        .ce-order-id-group {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.84rem;
        }

        .ce-order-label {
          color: #8f82a8;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .ce-order-id-badge {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(123, 47, 242, 0.25);
          border: 1px solid rgba(162, 89, 255, 0.4);
          color: #e0d0ff;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }

        .ce-order-id-badge:hover {
          background: rgba(123, 47, 242, 0.4);
          border-color: #a259ff;
        }

        .ce-copy-btn {
          background: none;
          border: none;
          color: #bfa8e6;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
        }

        .ce-copied-toast {
          position: absolute;
          top: -26px;
          right: 0;
          background: #34d399;
          color: #064e3b;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        }

        .ce-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(52, 211, 153, 0.12);
          border: 1px solid rgba(52, 211, 153, 0.35);
          color: #34d399;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 999px;
        }

        .ce-products-list {
          padding: 12px 0 8px 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ce-prod-row {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(14, 7, 28, 0.45);
          border: 1px solid rgba(162, 89, 255, 0.14);
          border-radius: 12px;
          padding: 8px 12px;
        }

        .ce-prod-icon-wrap {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: rgba(123, 47, 242, 0.25);
          border: 1px solid rgba(162, 89, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #c4b5fd;
          flex-shrink: 0;
        }

        .ce-prod-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }

        .ce-prod-name {
          color: #f1edfa;
          font-size: 0.9rem;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ce-prod-plat {
          color: #a78bfa;
          font-size: 0.76rem;
          font-weight: 600;
        }

        .ce-prod-price {
          color: #34d399;
          font-size: 0.9rem;
          font-weight: 800;
          flex-shrink: 0;
        }

        .ce-prod-more {
          text-align: center;
          font-size: 0.78rem;
          color: #8b80a0;
          font-weight: 600;
          padding-top: 4px;
        }

        .ce-order-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid rgba(162, 89, 255, 0.15);
          font-size: 0.85rem;
        }

        .ce-footer-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ce-footer-lbl {
          color: #8b80a0;
        }

        .ce-footer-val {
          color: #d1c4e9;
          font-weight: 700;
        }

        .ce-footer-total-val {
          color: #34d399;
          font-size: 1.05rem;
          font-weight: 900;
        }

        /* PRIMARY CTA: WHATSAPP BUTTON */
        .ce-wsp-cta-container {
          margin: 24px 24px 0 24px;
        }

        .ce-wsp-btn {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          background: linear-gradient(135deg, #25D366 0%, #16a34a 50%, #0d7334 100%);
          border: 1.5px solid rgba(255, 255, 255, 0.4);
          border-radius: 18px;
          padding: 16px 20px;
          text-decoration: none;
          color: #ffffff;
          box-shadow: 0 10px 30px rgba(37, 211, 102, 0.4), 0 0 20px rgba(37, 211, 102, 0.2);
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s, filter 0.22s;
          position: relative;
          overflow: hidden;
        }

        .ce-wsp-btn::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transform: skewX(-20deg);
          animation: ceShimmer 3.2s infinite;
        }

        @keyframes ceShimmer {
          0% { left: -100%; }
          30%, 100% { left: 160%; }
        }

        .ce-wsp-btn:hover {
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 14px 40px rgba(37, 211, 102, 0.55), 0 0 28px rgba(37, 211, 102, 0.35);
          filter: brightness(1.05);
        }

        .ce-wsp-btn:active {
          transform: translateY(-1px) scale(0.99);
        }

        .ce-wsp-btn-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .ce-wsp-svg {
          width: 24px;
          height: 24px;
          fill: #ffffff;
        }

        .ce-wsp-btn-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          text-align: left;
        }

        .ce-wsp-btn-title {
          font-size: 1.05rem;
          font-weight: 900;
          letter-spacing: 0.02em;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .ce-wsp-btn-subtitle {
          font-size: 0.78rem;
          opacity: 0.94;
          font-weight: 600;
          line-height: 1.3;
        }

        .ce-wsp-arrow {
          flex-shrink: 0;
          opacity: 0.85;
          transition: transform 0.2s;
        }

        .ce-wsp-btn:hover .ce-wsp-arrow {
          transform: translateX(4px);
          opacity: 1;
        }

        /* Actions Section */
        .ce-actions-section {
          margin: 22px 24px 0 24px;
        }

        .ce-actions-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: #9282a8;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 12px;
          padding-left: 2px;
        }

        .ce-actions-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .ce-action-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(30, 16, 60, 0.65);
          border: 1px solid rgba(162, 89, 255, 0.25);
          border-radius: 14px;
          padding: 12px 14px;
          color: #ffffff;
          cursor: pointer;
          transition: transform 0.18s, background 0.18s, border-color 0.18s;
          text-align: left;
          font-family: inherit;
        }

        .ce-action-btn:hover {
          transform: translateY(-2px);
          background: rgba(45, 22, 85, 0.85);
          border-color: rgba(162, 89, 255, 0.5);
        }

        .ce-action-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(123, 47, 242, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #c4b5fd;
          flex-shrink: 0;
        }

        .ce-action-guide .ce-action-icon {
          background: rgba(239, 68, 68, 0.18);
          color: #f87171;
        }

        .ce-action-launcher .ce-action-icon {
          background: rgba(59, 130, 246, 0.18);
          color: #60a5fa;
        }

        .ce-action-orders .ce-action-icon {
          background: rgba(168, 85, 247, 0.18);
          color: #c084fc;
        }

        .ce-action-home .ce-action-icon {
          background: rgba(234, 179, 8, 0.18);
          color: #facc15;
        }

        .ce-action-details {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }

        .ce-action-title {
          font-size: 0.88rem;
          font-weight: 800;
          color: #f1edfa;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ce-action-sub {
          font-size: 0.74rem;
          color: #8b80a0;
          font-weight: 500;
        }

        /* Support & Guarantee Footer */
        .ce-support-footer {
          margin: 22px 24px 0 24px;
          background: rgba(14, 6, 26, 0.55);
          border: 1px solid rgba(162, 89, 255, 0.16);
          border-radius: 16px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ce-support-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #c4b5fd;
          font-size: 0.82rem;
          font-weight: 600;
        }

        .ce-support-shield {
          color: #34d399;
          flex-shrink: 0;
        }

        .ce-social-links {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          padding-top: 10px;
          border-top: 1px solid rgba(162, 89, 255, 0.12);
        }

        .ce-social-label {
          font-size: 0.78rem;
          color: #83759b;
          font-weight: 600;
        }

        .ce-social-btns {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .ce-pill-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 8px;
          font-size: 0.76rem;
          font-weight: 700;
          text-decoration: none;
          transition: transform 0.18s, background 0.18s;
        }

        .ce-pill-link:hover {
          transform: translateY(-1px);
        }

        .ce-pill-wsp {
          background: rgba(37, 211, 102, 0.14);
          color: #25D366;
          border: 1px solid rgba(37, 211, 102, 0.35);
        }

        .ce-pill-wsp:hover {
          background: rgba(37, 211, 102, 0.25);
        }

        .ce-pill-tg {
          background: rgba(34, 158, 217, 0.14);
          color: #229ED9;
          border: 1px solid rgba(34, 158, 217, 0.35);
        }

        .ce-pill-tg:hover {
          background: rgba(34, 158, 217, 0.25);
        }

        @media (max-width: 540px) {
          .ce-page-container {
            padding: 30px 12px 60px 12px;
          }
          .ce-card {
            border-radius: 22px;
          }
          .ce-hero-section {
            padding: 22px 16px 10px 16px;
          }
          .ce-main-title {
            font-size: 1.5rem;
          }
          .ce-subtitle {
            font-size: 0.88rem;
          }
          .ce-order-box,
          .ce-wsp-cta-container,
          .ce-actions-section,
          .ce-support-footer {
            margin-left: 14px;
            margin-right: 14px;
          }
          .ce-actions-grid {
            grid-template-columns: 1fr;
          }
          .ce-wsp-btn-title {
            font-size: 0.92rem;
          }
          .ce-social-links {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

export default ConfirmacionExitosa;
