import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import pendienteImg from "../../assets/estadopedido/pendiente.png";
import { auth, db } from "../../firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  Clock,
  CheckCircle2,
  Copy,
  Check,
  Gamepad2,
  ShoppingBag,
  Home,
  BookOpen,
  Send,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { buildValidarPagoPendienteWspUrl, getOrderPlatformInfo } from "../../utils/whatsappHelper";

function ConfirmacionPendiente() {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState(auth.currentUser);
  const [nombre, setNombre] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [orderData, setOrderData] = useState(location.state || null);
  const [loadingOrder, setLoadingOrder] = useState(!location.state);

  // Escuchar usuario
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        getDoc(doc(db, "users", currentUser.uid))
          .then((snap) => {
            if (snap.exists()) {
              const d = snap.data();
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
            setOrderData({
              orderId: latest.globalOrderId || latest.id,
              pedidoId: latest.globalOrderId || latest.id,
              productos: latest.productos || [],
              producto: Array.isArray(latest.productos) && latest.productos.length > 0
                ? latest.productos.map((p) => p.nombre || p.title || p.name).join(", ")
                : (latest.producto || "Juegos PandaStore"),
              plataforma: latest.plataforma && latest.plataforma !== "Nintendo Switch / PC" ? latest.plataforma : "PC / Steam",
              total: latest.totalCLP || latest.total || 0,
              moneda: latest.moneda || "CLP",
              metodoPago: latest.metodoPago || "Transferencia",
              nombre: latest.nombre || currentUser.displayName || "",
              email: latest.email || currentUser.email || ""
            });
          }
        }
      } catch (err) {
        console.error("Error buscando pedido pendiente:", err);
      } finally {
        setLoadingOrder(false);
      }
    }

    fetchLatestOrder();
  }, [user, orderData]);

  const platformInfo = useMemo(() => getOrderPlatformInfo(orderData), [orderData]);
  const finalNombre = orderData?.nombre || nombre || user?.displayName || "Cliente";
  const finalEmail = orderData?.email || user?.email || "";
  const finalOrderId = orderData?.orderId || orderData?.pedidoId || "";
  const finalPlataforma = platformInfo.platformLabel;
  const finalTotal = orderData?.total || orderData?.totalCLP || null;
  const finalMoneda = orderData?.moneda || "CLP";
  const finalMetodo = orderData?.metodoPago || "Transferencia";

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

  // Enlace para WhatsApp con mensaje pendiente personalizado
  const whatsappUrl = useMemo(() => {
    return buildValidarPagoPendienteWspUrl({
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
    <div className="cp-page-container">
      <div className="cp-ambient-glow cp-glow-top" />
      <div className="cp-ambient-glow cp-glow-bottom" />

      <main className="cp-card">
        {/* Strip ámbar-naranja */}
        <div className="cp-top-bar" />

        {/* Hero Section */}
        <div className="cp-hero-section">
          <div className="cp-img-container">
            <div className="cp-img-halo" />
            <img src={pendienteImg} alt="Pago Pendiente" className="cp-img" />
            <div className="cp-floating-badge">
              <Clock size={16} className="cp-badge-icon" />
              <span>En Revisión</span>
            </div>
          </div>

          <h1 className="cp-main-title">
            PAGO PENDIENTE
          </h1>
          <p className="cp-subtitle">
            Tu solicitud fue registrada con éxito en PandaStore y se encuentra en proceso de validación.
          </p>
        </div>

        {/* User Alert Callout Box (Requested in Audio) */}
        <div className="cp-notice-box">
          <div className="cp-notice-header">
            <AlertCircle size={20} className="cp-notice-icon" />
            <span className="cp-notice-title">¿Cómo agilizar la activación?</span>
          </div>
          <p className="cp-notice-text">
            Espera a que un administrador verifique y marque como <strong>exitosa tu compra</strong>, o <strong>escríbenos directamente a WhatsApp</strong> con tu comprobante de pago para validarlo de inmediato y no tener que esperar.
          </p>
        </div>

        {/* PRIMARY CTA: VALIDAR PAGO POR WHATSAPP */}
        <div className="cp-wsp-cta-container">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cp-wsp-btn"
            id="btn-validar-pago-wsp"
          >
            <div className="cp-wsp-btn-icon-wrap">
              <svg className="cp-wsp-svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
              </svg>
            </div>
            <div className="cp-wsp-btn-text">
              <span className="cp-wsp-btn-title">VALIDAR PAGO POR WHATSAPP</span>
              <span className="cp-wsp-btn-subtitle">
                Envíanos tu comprobante para aprobar tu pedido al instante
              </span>
            </div>
            <Send size={20} className="cp-wsp-arrow" />
          </a>
        </div>

        {/* Order Details Snapshot */}
        {(finalOrderId || productosList.length > 0 || finalTotal) && (
          <div className="cp-order-box">
            <div className="cp-order-header">
              <div className="cp-order-id-group">
                <span className="cp-order-label">N° DE PEDIDO:</span>
                {finalOrderId ? (
                  <div className="cp-order-id-badge" onClick={handleCopyId} title="Copiar ID de pedido">
                    <span className="cp-order-id-text">#{finalOrderId.slice(0, 14)}...</span>
                    <button className="cp-copy-btn" type="button" aria-label="Copiar ID">
                      {copiedId ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                    </button>
                    {copiedId && <span className="cp-copied-toast">¡Copiado!</span>}
                  </div>
                ) : (
                  <span className="cp-order-id-text">Registrado en tu perfil</span>
                )}
              </div>
              <span className="cp-status-pill">
                <Clock size={13} /> Esperando Verificación
              </span>
            </div>

            {productosList.length > 0 && (
              <div className="cp-products-list">
                {productosList.slice(0, 3).map((p, idx) => (
                  <div key={idx} className="cp-prod-row">
                    <div className="cp-prod-icon-wrap">
                      <Gamepad2 size={18} className="cp-prod-icon" />
                    </div>
                    <div className="cp-prod-info">
                      <span className="cp-prod-name">{p.nombre || p.title || p.name || "Juego Digital"}</span>
                      <span className="cp-prod-plat">{p.variante ? `${p.plataforma || finalPlataforma || "PlayStation"} (${p.variante.charAt(0).toUpperCase() + p.variante.slice(1).toLowerCase()})` : (p.plataforma || finalPlataforma || "Digital")}</span>
                    </div>
                    {p.precio ? (
                      <span className="cp-prod-price">
                        {finalMoneda === "USD"
                          ? `$${Number(p.precio).toFixed(2)} USD`
                          : `$${Number(p.precio).toLocaleString("es-CL")} CLP`}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            <div className="cp-order-footer">
              <div className="cp-footer-item">
                <span className="cp-footer-lbl">Método:</span>
                <span className="cp-footer-val">{finalMetodo.toUpperCase()}</span>
              </div>
              {finalTotal && (
                <div className="cp-footer-item cp-footer-total">
                  <span className="cp-footer-lbl">Total:</span>
                  <span className="cp-footer-total-val">
                    {finalMoneda === "USD"
                      ? `$${Number(finalTotal).toFixed(2)} USD`
                      : `$${Number(finalTotal).toLocaleString("es-CL")} CLP`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3-Step Process Timeline */}
        <div className="cp-timeline-section">
          <div className="cp-timeline-header">
            <span className="cp-timeline-label">ESTADO DEL PROCESO</span>
            <span className="cp-timeline-step-indicator">Paso 2 de 3</span>
          </div>

          <div className="cp-steps-container">
            {/* Paso 1: Completado */}
            <div className="cp-step-item cp-step-done">
              <div className="cp-step-indicator-col">
                <div className="cp-step-dot cp-dot-done">
                  <Check size={14} />
                </div>
                <div className="cp-step-line cp-line-done" />
              </div>
              <div className="cp-step-content">
                <span className="cp-step-name">Pago registrado</span>
                <span className="cp-step-desc">Tu comprobante y orden fueron recibidos en la plataforma.</span>
              </div>
            </div>

            {/* Paso 2: Activo (En revisión) */}
            <div className="cp-step-item cp-step-active">
              <div className="cp-step-indicator-col">
                <div className="cp-step-dot cp-dot-active">
                  <span className="cp-pulsing-circle" />
                  <Clock size={15} />
                </div>
                <div className="cp-step-line" />
              </div>
              <div className="cp-step-content">
                <div className="cp-step-title-row">
                  <span className="cp-step-name">En revisión por administrador</span>
                  <span className="cp-active-tag">En progreso</span>
                </div>
                <span className="cp-step-desc">
                  Comprobando transferencia bancaria o fondos. Se actualizará automáticamente.
                </span>
              </div>
            </div>

            {/* Paso 3: Futuro */}
            <div className="cp-step-item cp-step-future">
              <div className="cp-step-indicator-col">
                <div className="cp-step-dot cp-dot-future">
                  <CheckCircle2 size={14} />
                </div>
              </div>
              <div className="cp-step-content">
                <span className="cp-step-name">Aprobación y entrega</span>
                <span className="cp-step-desc">Tu compra se marcará como exitosa y recibirás tus claves por correo y en tu perfil.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Action Buttons */}
        <div className="cp-actions-section">
          <div className="cp-actions-grid">
            <button
              type="button"
              className="cp-action-btn cp-action-orders"
              onClick={() => navigate("/mispedidos")}
            >
              <div className="cp-action-icon">
                <ShoppingBag size={18} />
              </div>
              <div className="cp-action-details">
                <span className="cp-action-title">Ver Mis Pedidos</span>
                <span className="cp-action-sub">Consultar estado en vivo</span>
              </div>
            </button>

            <button
              type="button"
              className="cp-action-btn cp-action-guide"
              onClick={() => navigate(platformInfo.guideRoute)}
            >
              <div className="cp-action-icon">
                <BookOpen size={18} />
              </div>
              <div className="cp-action-details">
                <span className="cp-action-title">{platformInfo.guideTitle}</span>
                <span className="cp-action-sub">{platformInfo.guideSub}</span>
              </div>
            </button>

            <button
              type="button"
              className="cp-action-btn cp-action-home"
              onClick={() => navigate("/home")}
            >
              <div className="cp-action-icon">
                <Home size={18} />
              </div>
              <div className="cp-action-details">
                <span className="cp-action-title">Volver a la Tienda</span>
                <span className="cp-action-sub">Ir a la página principal</span>
              </div>
            </button>
          </div>
        </div>

        {/* Security & Support footer */}
        <div className="cp-support-footer">
          <div className="cp-tip-row">
            <HelpCircle size={16} className="cp-tip-icon" />
            <span className="cp-tip-text">
              El tiempo promedio de validación es de <strong>10 a 30 minutos</strong> en horario de atención. Escríbenos si necesitas tu juego urgente.
            </span>
          </div>
        </div>
      </main>

      <style>{`
        .cp-page-container {
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

        .cp-ambient-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
        }
        .cp-glow-top {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(255, 152, 0, 0.28) 0%, rgba(255, 214, 0, 0.12) 60%, transparent 80%);
          top: -120px;
          left: 50%;
          transform: translateX(-50%);
        }
        .cp-glow-bottom {
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, rgba(123, 47, 242, 0.22) 0%, rgba(255, 152, 0, 0.08) 60%, transparent 80%);
          bottom: -150px;
          right: 5%;
        }

        .cp-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 620px;
          background: rgba(22, 12, 38, 0.9);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1.5px solid rgba(255, 152, 0, 0.35);
          border-radius: 28px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.75), 0 0 45px rgba(255, 152, 0, 0.2);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding-bottom: 28px;
          animation: cpCardAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes cpCardAppear {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .cp-top-bar {
          width: 100%;
          height: 6px;
          background: linear-gradient(90deg, #ff7c00 0%, #FFD600 50%, #ff9800 100%);
        }

        .cp-hero-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 30px 24px 10px 24px;
        }

        .cp-img-container {
          position: relative;
          width: 125px;
          height: 125px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }

        .cp-img-halo {
          position: absolute;
          width: 105px;
          height: 105px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 152, 0, 0.38) 0%, rgba(255, 214, 0, 0.2) 65%, transparent 80%);
          filter: blur(14px);
          animation: cpPulseHalo 3s ease-in-out infinite;
        }

        @keyframes cpPulseHalo {
          0%, 100% { transform: scale(0.95); opacity: 0.75; }
          50% { transform: scale(1.18); opacity: 1; }
        }

        .cp-img {
          width: 110px;
          height: 110px;
          object-fit: contain;
          position: relative;
          z-index: 2;
          filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.6));
          animation: cpFloatImg 4s ease-in-out infinite;
        }

        @keyframes cpFloatImg {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        .cp-floating-badge {
          position: absolute;
          bottom: 2px;
          right: -6px;
          z-index: 3;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #381e05;
          border: 1.5px solid #f59e0b;
          color: #fbbf24;
          font-size: 0.76rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 999px;
          box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .cp-main-title {
          margin: 0;
          font-size: 1.8rem;
          font-weight: 900;
          letter-spacing: 0.02em;
          background: linear-gradient(135deg, #ffffff 0%, #fbbf24 50%, #f97316 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.2;
        }

        .cp-subtitle {
          margin: 10px 0 0 0;
          font-size: 0.95rem;
          color: #baa9cb;
          line-height: 1.5;
          max-width: 480px;
        }

        /* Notice Box (Audio requirement) */
        .cp-notice-box {
          margin: 18px 24px 0 24px;
          background: rgba(245, 158, 11, 0.12);
          border: 1.5px solid rgba(245, 158, 11, 0.4);
          border-radius: 18px;
          padding: 16px 18px;
          box-shadow: 0 4px 20px rgba(245, 158, 11, 0.15);
        }

        .cp-notice-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #fbbf24;
          margin-bottom: 6px;
        }

        .cp-notice-icon {
          color: #f59e0b;
          flex-shrink: 0;
        }

        .cp-notice-title {
          font-size: 0.88rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .cp-notice-text {
          margin: 0;
          font-size: 0.92rem;
          color: #fef3c7;
          line-height: 1.55;
        }

        .cp-notice-text strong {
          color: #ffffff;
          font-weight: 800;
        }

        /* PRIMARY CTA: WHATSAPP */
        .cp-wsp-cta-container {
          margin: 20px 24px 0 24px;
        }

        .cp-wsp-btn {
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

        .cp-wsp-btn::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transform: skewX(-20deg);
          animation: cpShimmer 3.2s infinite;
        }

        @keyframes cpShimmer {
          0% { left: -100%; }
          30%, 100% { left: 160%; }
        }

        .cp-wsp-btn:hover {
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 14px 40px rgba(37, 211, 102, 0.55), 0 0 28px rgba(37, 211, 102, 0.35);
          filter: brightness(1.05);
        }

        .cp-wsp-btn:active {
          transform: translateY(-1px) scale(0.99);
        }

        .cp-wsp-btn-icon-wrap {
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

        .cp-wsp-svg {
          width: 24px;
          height: 24px;
          fill: #ffffff;
        }

        .cp-wsp-btn-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          text-align: left;
        }

        .cp-wsp-btn-title {
          font-size: 1.05rem;
          font-weight: 900;
          letter-spacing: 0.02em;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .cp-wsp-btn-subtitle {
          font-size: 0.78rem;
          opacity: 0.94;
          font-weight: 600;
          line-height: 1.3;
        }

        .cp-wsp-arrow {
          flex-shrink: 0;
          opacity: 0.85;
          transition: transform 0.2s;
        }

        .cp-wsp-btn:hover .cp-wsp-arrow {
          transform: translateX(4px);
          opacity: 1;
        }

        /* Order Details Box */
        .cp-order-box {
          margin: 20px 24px 0 24px;
          background: rgba(30, 16, 50, 0.65);
          border: 1px solid rgba(255, 152, 0, 0.25);
          border-radius: 18px;
          padding: 16px 18px;
        }

        .cp-order-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 152, 0, 0.15);
        }

        .cp-order-id-group {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.84rem;
        }

        .cp-order-label {
          color: #9f8fb0;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .cp-order-id-badge {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 152, 0, 0.15);
          border: 1px solid rgba(255, 152, 0, 0.35);
          color: #fed7aa;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }

        .cp-order-id-badge:hover {
          background: rgba(255, 152, 0, 0.25);
          border-color: #f59e0b;
        }

        .cp-copy-btn {
          background: none;
          border: none;
          color: #fdba74;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
        }

        .cp-copied-toast {
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

        .cp-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(251, 191, 36, 0.12);
          border: 1px solid rgba(251, 191, 36, 0.35);
          color: #fbbf24;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 999px;
        }

        .cp-products-list {
          padding: 12px 0 8px 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cp-prod-row {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(14, 7, 28, 0.45);
          border: 1px solid rgba(255, 152, 0, 0.14);
          border-radius: 12px;
          padding: 8px 12px;
        }

        .cp-prod-icon-wrap {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: rgba(255, 152, 0, 0.18);
          border: 1px solid rgba(255, 152, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fdba74;
          flex-shrink: 0;
        }

        .cp-prod-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }

        .cp-prod-name {
          color: #f1edfa;
          font-size: 0.9rem;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cp-prod-plat {
          color: #baa4d6;
          font-size: 0.76rem;
          font-weight: 600;
        }

        .cp-prod-price {
          color: #fbbf24;
          font-size: 0.9rem;
          font-weight: 800;
          flex-shrink: 0;
        }

        .cp-order-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 152, 0, 0.15);
          font-size: 0.85rem;
        }

        .cp-footer-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cp-footer-lbl {
          color: #9f8fb0;
        }

        .cp-footer-val {
          color: #fed7aa;
          font-weight: 700;
        }

        .cp-footer-total-val {
          color: #fbbf24;
          font-size: 1.05rem;
          font-weight: 900;
        }

        /* Timeline Section */
        .cp-timeline-section {
          margin: 22px 24px 0 24px;
          background: rgba(30, 16, 50, 0.55);
          border: 1px solid rgba(255, 152, 0, 0.2);
          border-radius: 18px;
          padding: 16px 18px;
        }

        .cp-timeline-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .cp-timeline-label {
          font-size: 0.76rem;
          font-weight: 800;
          color: #baa4d6;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .cp-timeline-step-indicator {
          font-size: 0.76rem;
          color: #fbbf24;
          font-weight: 700;
          background: rgba(251, 191, 36, 0.12);
          padding: 2px 8px;
          border-radius: 6px;
        }

        .cp-steps-container {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .cp-step-item {
          display: flex;
          gap: 14px;
          position: relative;
        }

        .cp-step-indicator-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 28px;
          flex-shrink: 0;
        }

        .cp-step-dot {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }

        .cp-dot-done {
          background: rgba(34, 197, 94, 0.2);
          border: 1.5px solid #22c55e;
          color: #22c55e;
        }

        .cp-dot-active {
          background: rgba(245, 158, 11, 0.25);
          border: 1.5px solid #f59e0b;
          color: #fbbf24;
          position: relative;
        }

        .cp-pulsing-circle {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid #f59e0b;
          animation: cpPulseStep 1.8s ease-out infinite;
        }

        @keyframes cpPulseStep {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        .cp-dot-future {
          background: rgba(148, 163, 184, 0.1);
          border: 1.5px solid rgba(148, 163, 184, 0.3);
          color: #64748b;
        }

        .cp-step-line {
          width: 2px;
          height: 38px;
          background: rgba(255, 152, 0, 0.25);
          margin: 2px 0;
        }

        .cp-line-done {
          background: #22c55e;
        }

        .cp-step-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-bottom: 18px;
          flex: 1;
        }

        .cp-step-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cp-step-name {
          font-size: 0.9rem;
          font-weight: 800;
          color: #ffffff;
        }

        .cp-active-tag {
          font-size: 0.68rem;
          font-weight: 800;
          color: #fbbf24;
          background: rgba(251, 191, 36, 0.15);
          border: 1px solid rgba(251, 191, 36, 0.35);
          padding: 1px 6px;
          border-radius: 999px;
          text-transform: uppercase;
        }

        .cp-step-desc {
          font-size: 0.78rem;
          color: #a08ab8;
          line-height: 1.4;
        }

        /* Actions Section */
        .cp-actions-section {
          margin: 22px 24px 0 24px;
        }

        .cp-actions-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .cp-action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 8px;
          background: rgba(30, 16, 50, 0.65);
          border: 1px solid rgba(255, 152, 0, 0.22);
          border-radius: 14px;
          padding: 12px 8px;
          color: #ffffff;
          cursor: pointer;
          transition: transform 0.18s, background 0.18s, border-color 0.18s;
          font-family: inherit;
        }

        .cp-action-btn:hover {
          transform: translateY(-2px);
          background: rgba(45, 22, 75, 0.85);
          border-color: rgba(255, 152, 0, 0.45);
        }

        .cp-action-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(255, 152, 0, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fdba74;
        }

        .cp-action-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .cp-action-title {
          font-size: 0.84rem;
          font-weight: 800;
          color: #f1edfa;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cp-action-sub {
          font-size: 0.72rem;
          color: #9282a8;
          font-weight: 500;
        }

        /* Support Footer */
        .cp-support-footer {
          margin: 20px 24px 0 24px;
          background: rgba(14, 6, 26, 0.55);
          border: 1px solid rgba(255, 152, 0, 0.16);
          border-radius: 14px;
          padding: 12px 16px;
        }

        .cp-tip-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .cp-tip-icon {
          color: #fbbf24;
          flex-shrink: 0;
        }

        .cp-tip-text {
          font-size: 0.8rem;
          color: #d1c4e9;
          line-height: 1.45;
        }

        .cp-tip-text strong {
          color: #fbbf24;
        }

        @media (max-width: 540px) {
          .cp-page-container {
            padding: 30px 12px 60px 12px;
          }
          .cp-card {
            border-radius: 22px;
          }
          .cp-hero-section {
            padding: 22px 16px 10px 16px;
          }
          .cp-main-title {
            font-size: 1.5rem;
          }
          .cp-subtitle {
            font-size: 0.88rem;
          }
          .cp-notice-box,
          .cp-wsp-cta-container,
          .cp-order-box,
          .cp-timeline-section,
          .cp-actions-section,
          .cp-support-footer {
            margin-left: 14px;
            margin-right: 14px;
          }
          .cp-actions-grid {
            grid-template-columns: 1fr;
          }
          .cp-action-btn {
            flex-direction: row;
            text-align: left;
            padding: 10px 14px;
          }
          .cp-wsp-btn-title {
            font-size: 0.92rem;
          }
        }
      `}</style>
    </div>
  );
}

export default ConfirmacionPendiente;
