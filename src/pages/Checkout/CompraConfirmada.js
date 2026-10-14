import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { collection, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import confirmadoImg from "../../assets/estadopedido/confimado.png";
import {
  CheckCircle2,
  AlertOctagon,
  Gamepad2,
  Download,
  Copy,
  Check,
  ShoppingBag,
  Home,
  BookOpen,
  Send,
  ShieldCheck,
  RefreshCw,
  Sparkles
} from "lucide-react";
import {
  buildSolicitarInstalacionWspUrl,
  buildSoporteErrorWspUrl,
  getOrderPlatformInfo
} from "../../utils/whatsappHelper";

function CompraConfirmada() {
  const location = useLocation();
  const navigate = useNavigate();

  const [status, setStatus] = useState("pending"); // "pending", "success", "error"
  const [mensaje, setMensaje] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [orderSummary, setOrderSummary] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      getDoc(doc(db, "users", user.uid))
        .then((s) => {
          if (s.exists()) setUserProfile(s.data());
        })
        .catch(() => {});
    }

    const params = new URLSearchParams(location.search);
    const paypalOrderId = params.get("token");
    const payerId = params.get("PayerID");

    async function procesarCompra() {
      if (!user) {
        setStatus("error");
        setMensaje("No se detectó una sesión activa para procesar la confirmación.");
        return;
      }

      try {
        const snap = await getDocs(collection(db, `users/${user.uid}/cart`));
        const productos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const totalCalculado = productos.reduce(
          (acc, prod) => acc + (prod.precio || prod.price || 0) * (prod.cantidad || prod.quantity || 1),
          0
        );

        const summaryData = {
          orderId: paypalOrderId || `ORD-${Date.now().toString().slice(-8)}`,
          pedidoId: paypalOrderId || `ORD-${Date.now().toString().slice(-8)}`,
          productos,
          producto: productos.map((p) => p.nombre || p.title || p.name).filter(Boolean).join(", "),
          plataforma: productos.some((p) => ((p.plataforma || "") + (p.nombre || "")).toLowerCase().includes("nintendo"))
            ? "Nintendo Switch"
            : productos.some((p) => ((p.plataforma || "") + (p.nombre || "")).toLowerCase().includes("playstation") || ((p.plataforma || "") + (p.nombre || "")).toLowerCase().includes("ps5") || ((p.plataforma || "") + (p.nombre || "")).toLowerCase().includes("ps4"))
            ? "PlayStation"
            : (productos[0]?.plataforma || "PC / Steam"),
          total: totalCalculado,
          moneda: paypalOrderId ? "USD" : "CLP",
          metodoPago: paypalOrderId ? "PayPal" : "MercadoPago",
          email: user.email,
          nombre: user.displayName || user.email || "Cliente"
        };
        setOrderSummary(summaryData);

        if (productos.length === 0) {
          // Si el carrito ya estaba vacío (ej. por refresh), buscar el último pedido
          try {
            const ordersSnap = await getDocs(collection(db, `users/${user.uid}/orders`));
            if (!ordersSnap.empty) {
              const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
              orders.sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime());
              const latest = orders[0];
              if (latest) {
                const isNint = (latest.plataforma || "").toLowerCase().includes("nintendo") || (latest.productos || []).some(p => ((p.plataforma || '') + (p.nombre || '')).toLowerCase().includes('nintendo'));
                const isPlay = (latest.plataforma || "").toLowerCase().includes("playstation") || (latest.productos || []).some(p => ((p.plataforma || '') + (p.nombre || '')).toLowerCase().includes('playstation'));
                setOrderSummary({
                  orderId: latest.globalOrderId || latest.id,
                  pedidoId: latest.globalOrderId || latest.id,
                  productos: latest.productos || [],
                  producto: latest.producto || "Juegos PandaStore",
                  plataforma: isNint ? "Nintendo Switch" : isPlay ? "PlayStation" : (latest.plataforma && latest.plataforma !== "Nintendo Switch / PC" ? latest.plataforma : "PC / Steam"),
                  total: latest.totalCLP || latest.total || 0,
                  moneda: latest.moneda || "CLP",
                  metodoPago: latest.metodoPago || "Aprobado",
                  email: latest.email || user.email,
                  nombre: latest.nombre || user.displayName || "Cliente"
                });
                setStatus("success");
                setMensaje("Tu pedido anterior ya se encontraba registrado y aprobado.");
                return;
              }
            }
          } catch (_) {}

          setStatus("error");
          setMensaje("No se encontraron productos en el carrito para procesar.");
          return;
        }

        const pedido = {
          productos,
          total: totalCalculado,
          moneda: paypalOrderId ? "USD" : "CLP",
          metodoPago: paypalOrderId ? "paypal" : "mercadopago",
          email: user.email,
          nombre: user.displayName || "",
          fecha: new Date().toISOString(),
          uid: user.uid
        };

        let ok = false;
        if (paypalOrderId && payerId) {
          // Capturar y guardar pedido PayPal
          const resp = await fetch(
            "https://us-central1-pandastoreupdate.cloudfunctions.net/capturePayPalOrder",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: paypalOrderId })
            }
          );
          if (resp.ok) {
            setStatus("success");
            setMensaje("¡Pago con PayPal aprobado y pedido registrado exitosamente!");
            ok = true;
          } else {
            setStatus("error");
            const data = await resp.json().catch(() => ({}));
            setMensaje(data.error || "Error al capturar el pago con PayPal.");
          }
        } else {
          // Flujo normal (MercadoPago, etc)
          const resp = await fetch(
            "https://us-central1-pandastoreupdate.cloudfunctions.net/confirmarCompra",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pedido, clienteEmail: user.email })
            }
          );
          if (resp.ok) {
            setStatus("success");
            setMensaje("¡Compra confirmada y pedido guardado en tu cuenta!");
            ok = true;
          } else {
            setStatus("error");
            const data = await resp.json().catch(() => ({}));
            setMensaje(data.error || "Error al guardar el pedido.");
          }
        }

        // Vaciar el carrito solo si la compra fue exitosa
        if (ok) {
          for (const d of snap.docs) {
            await deleteDoc(doc(db, `users/${user.uid}/cart`, d.id));
          }
        }
      } catch (err) {
        setStatus("error");
        setMensaje("Ocurrió un error inesperado al procesar: " + (err.message || err));
      }
    }

    procesarCompra();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Detectar plataforma y guía dinámica
  const platformInfo = useMemo(() => getOrderPlatformInfo(orderSummary), [orderSummary]);

  // Generar URL de WhatsApp para solicitar instalación
  const whatsappUrl = useMemo(() => {
    return buildSolicitarInstalacionWspUrl({
      nombre: orderSummary?.nombre || userProfile?.displayName || auth.currentUser?.displayName,
      email: orderSummary?.email || auth.currentUser?.email,
      pedidoId: orderSummary?.orderId || orderSummary?.pedidoId,
      productos: orderSummary?.productos || [],
      producto: orderSummary?.producto,
      plataforma: platformInfo.platformLabel,
      total: orderSummary?.total,
      moneda: orderSummary?.moneda || "CLP",
      metodoPago: orderSummary?.metodoPago || "Aprobado"
    });
  }, [orderSummary, userProfile, platformInfo]);

  // Enlace para WhatsApp en caso de error
  const whatsappErrorUrl = useMemo(() => {
    return buildSoporteErrorWspUrl({
      nombre: auth.currentUser?.displayName,
      email: auth.currentUser?.email,
      error: mensaje,
      metodoPago: "Checkout Web"
    });
  }, [mensaje]);

  const handleCopyId = () => {
    const id = orderSummary?.orderId || orderSummary?.pedidoId;
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2200);
    });
  };

  return (
    <div className="cc-page-container">
      <div className="cc-ambient-glow cc-glow-top" />
      <div className="cc-ambient-glow cc-glow-bottom" />

      <main className="cc-card">
        {/* Top Strip */}
        <div
          className="cc-top-bar"
          style={{
            background:
              status === "success"
                ? "linear-gradient(90deg, #7b2ff2 0%, #25D366 50%, #34d399 100%)"
                : status === "error"
                ? "linear-gradient(90deg, #ef4444 0%, #dc2626 50%, #991b1b 100%)"
                : "linear-gradient(90deg, #7b2ff2 0%, #3b82f6 50%, #a855f7 100%)"
          }}
        />

        {/* ===================== ESTADO: PENDING (PROCESANDO) ===================== */}
        {status === "pending" && (
          <div className="cc-state-container cc-state-pending">
            <div className="cc-spinner-box">
              <div className="cc-spinner-ring" />
              <div className="cc-spinner-core">
                <RefreshCw size={26} className="cc-spinning-icon" />
              </div>
            </div>

            <h1 className="cc-main-title">PROCESANDO COMPRA</h1>
            <p className="cc-subtitle">
              Estamos comunicándonos con la pasarela de pago para confirmar tu transacción. Por favor espera un momento sin cerrar esta ventana.
            </p>

            <div className="cc-pending-badge">
              <span className="cc-pulse-dot" />
              <span>Verificando transacción en tiempo real...</span>
            </div>
          </div>
        )}

        {/* ===================== ESTADO: SUCCESS (EXITOSA) ===================== */}
        {status === "success" && (
          <div className="cc-state-container cc-state-success">
            <div className="cc-img-container">
              <div className="cc-img-halo" />
              <img src={confirmadoImg} alt="Compra confirmada" className="cc-img" />
              <div className="cc-floating-badge">
                <CheckCircle2 size={16} />
                <span>Pago Aprobado</span>
              </div>
            </div>

            <h1 className="cc-main-title">¡COMPRA CONFIRMADA!</h1>
            <p className="cc-subtitle">
              {mensaje || "Tu pago fue aprobado exitosamente y tu pedido ha sido registrado en PandaStore."}
            </p>

            {/* Order Details Snapshot */}
            {orderSummary && (
              <div className="cc-order-box">
                <div className="cc-order-header">
                  <div className="cc-order-id-group">
                    <span className="cc-order-label">N° DE PEDIDO:</span>
                    <div className="cc-order-id-badge" onClick={handleCopyId} title="Copiar ID">
                      <span className="cc-order-id-text">
                        #{String(orderSummary.orderId || orderSummary.pedidoId).slice(0, 14)}...
                      </span>
                      <button className="cc-copy-btn" type="button" aria-label="Copiar ID">
                        {copiedId ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                      </button>
                      {copiedId && <span className="cc-copied-toast">¡Copiado!</span>}
                    </div>
                  </div>
                  <span className="cc-status-pill">
                    <Sparkles size={13} /> Listo para entrega
                  </span>
                </div>

                {Array.isArray(orderSummary.productos) && orderSummary.productos.length > 0 && (
                  <div className="cc-products-list">
                    {orderSummary.productos.slice(0, 3).map((p, idx) => (
                      <div key={idx} className="cc-prod-row">
                        <div className="cc-prod-icon-wrap">
                          <Gamepad2 size={18} />
                        </div>
                        <div className="cc-prod-info">
                          <span className="cc-prod-name">
                            {p.nombre || p.title || p.name || "Juego Digital"}
                          </span>
                          <span className="cc-prod-plat">
                            {p.plataforma && p.plataforma !== "Nintendo Switch / PC" ? p.plataforma : platformInfo.platformLabel}
                          </span>
                        </div>
                        {p.precio ? (
                          <span className="cc-prod-price">
                            {orderSummary.moneda === "USD"
                              ? `$${Number(p.precio).toFixed(2)} USD`
                              : `$${Number(p.precio).toLocaleString("es-CL")} CLP`}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                <div className="cc-order-footer">
                  <div className="cc-footer-item">
                    <span className="cc-footer-lbl">Método:</span>
                    <span className="cc-footer-val">{(orderSummary.metodoPago || "Aprobado").toUpperCase()}</span>
                  </div>
                  {orderSummary.total ? (
                    <div className="cc-footer-item cc-footer-total">
                      <span className="cc-footer-lbl">Total:</span>
                      <span className="cc-footer-total-val">
                        {orderSummary.moneda === "USD"
                          ? `$${Number(orderSummary.total).toFixed(2)} USD`
                          : `$${Number(orderSummary.total).toLocaleString("es-CL")} CLP`}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* PRIMARY CTA: SOLICITAR INSTALACIÓN POR WHATSAPP */}
            <div className="cc-wsp-cta-container">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="cc-wsp-btn"
                id="btn-confirmada-solicitar-instalacion"
              >
                <div className="cc-wsp-btn-icon-wrap">
                  <svg className="cc-wsp-svg" viewBox="0 0 448 512" fill="currentColor">
                    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                  </svg>
                </div>
                <div className="cc-wsp-btn-text">
                  <span className="cc-wsp-btn-title">
                    {platformInfo.wspButtonTitle || "SOLICITAR INSTALACIÓN POR WHATSAPP"}
                  </span>
                  <span className="cc-wsp-btn-subtitle">
                    {platformInfo.wspButtonSub || "Envíanos los datos de tu orden para guiarte con la entrega e instalación"}
                  </span>
                </div>
                <Send size={20} className="cc-wsp-arrow" />
              </a>
            </div>

            {/* Quick Action Grid - Platform Adaptive */}
            <div className="cc-actions-section">
              <div className="cc-actions-grid">
                {platformInfo.showGuideBtn && platformInfo.guideRoute && (
                  <button
                    type="button"
                    className="cc-action-btn cc-action-guide"
                    onClick={() => navigate(platformInfo.guideRoute)}
                  >
                    <div className="cc-action-icon">
                      <BookOpen size={18} />
                    </div>
                    <div className="cc-action-details">
                      <span className="cc-action-title">
                        {platformInfo.guideTitle}
                      </span>
                      <span className="cc-action-sub">{platformInfo.guideSub}</span>
                    </div>
                  </button>
                )}

                {platformInfo.showLauncherBtn && (
                  <button
                    type="button"
                    className="cc-action-btn cc-action-launcher"
                    onClick={() => navigate("/descargar-launcher")}
                  >
                    <div className="cc-action-icon">
                      <Download size={18} />
                    </div>
                    <div className="cc-action-details">
                      <span className="cc-action-title">Descargar Launcher</span>
                      <span className="cc-action-sub">Instalador oficial PC</span>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  className="cc-action-btn cc-action-orders"
                  onClick={() => navigate("/mispedidos")}
                >
                  <div className="cc-action-icon">
                    <ShoppingBag size={18} />
                  </div>
                  <div className="cc-action-details">
                    <span className="cc-action-title">Mis Pedidos y Claves</span>
                    <span className="cc-action-sub">Ver compras activas</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="cc-action-btn cc-action-home"
                  onClick={() => navigate("/home")}
                >
                  <div className="cc-action-icon">
                    <Home size={18} />
                  </div>
                  <div className="cc-action-details">
                    <span className="cc-action-title">Volver a la Tienda</span>
                    <span className="cc-action-sub">Ir al catálogo</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Guarantee footer */}
            <div className="cc-support-footer">
              <div className="cc-support-badge">
                <ShieldCheck size={18} color="#34d399" />
                <span>Compra protegida y garantizada por PandaStore</span>
              </div>
            </div>
          </div>
        )}

        {/* ===================== ESTADO: ERROR ===================== */}
        {status === "error" && (
          <div className="cc-state-container cc-state-error">
            <div className="cc-error-icon-wrap">
              <AlertOctagon size={48} className="cc-error-icon" />
            </div>

            <h1 className="cc-main-title cc-error-title">¡ERROR EN LA COMPRA!</h1>
            <p className="cc-subtitle cc-error-subtitle">
              {mensaje || "No pudimos validar tu pago o los productos del carrito no pudieron procesarse."}
            </p>

            <div className="cc-error-cta-group">
              <a
                href={whatsappErrorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="cc-wsp-btn cc-wsp-btn-help"
              >
                <div className="cc-wsp-btn-icon-wrap">
                  <svg className="cc-wsp-svg" viewBox="0 0 448 512" fill="currentColor">
                    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                  </svg>
                </div>
                <div className="cc-wsp-btn-text">
                  <span className="cc-wsp-btn-title">CONSULTAR ASISTENCIA EN WHATSAPP</span>
                  <span className="cc-wsp-btn-subtitle">Un asesor revisará tu orden para ayudarte de inmediato</span>
                </div>
                <Send size={20} className="cc-wsp-arrow" />
              </a>

              <div className="cc-error-actions-row">
                <button
                  type="button"
                  className="cc-action-btn"
                  onClick={() => navigate("/checkoutcarrito")}
                >
                  <RefreshCw size={16} />
                  <span>Reintentar compra en carrito</span>
                </button>
                <button
                  type="button"
                  className="cc-action-btn"
                  onClick={() => navigate("/home")}
                >
                  <Home size={16} />
                  <span>Volver a la Tienda</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .cc-page-container {
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

        .cc-ambient-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
        }
        .cc-glow-top {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(123, 47, 242, 0.28) 0%, rgba(37, 211, 102, 0.12) 60%, transparent 80%);
          top: -120px;
          left: 50%;
          transform: translateX(-50%);
        }
        .cc-glow-bottom {
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, rgba(243, 87, 168, 0.2) 0%, rgba(123, 47, 242, 0.08) 60%, transparent 80%);
          bottom: -150px;
          right: 5%;
        }

        .cc-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 620px;
          background: rgba(18, 9, 36, 0.9);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1.5px solid rgba(162, 89, 255, 0.3);
          border-radius: 28px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.75), 0 0 45px rgba(123, 47, 242, 0.25);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding-bottom: 28px;
          animation: ccCardAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes ccCardAppear {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .cc-top-bar {
          width: 100%;
          height: 6px;
        }

        .cc-state-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 24px 20px 10px 20px;
        }

        /* Spinner for Pending */
        .cc-spinner-box {
          position: relative;
          width: 100px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }

        .cc-spinner-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 3px solid rgba(162, 89, 255, 0.15);
          border-top-color: #a259ff;
          border-right-color: #7b2ff2;
          animation: ccSpin 1.2s linear infinite;
        }

        @keyframes ccSpin {
          to { transform: rotate(360deg); }
        }

        .cc-spinner-core {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(123, 47, 242, 0.2);
          border: 1px solid rgba(162, 89, 255, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #c4b5fd;
        }

        .cc-spinning-icon {
          animation: ccSpin 2.5s linear infinite;
        }

        .cc-pending-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(123, 47, 242, 0.2);
          border: 1px solid rgba(162, 89, 255, 0.35);
          color: #e0d0ff;
          font-size: 0.85rem;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 999px;
          margin-top: 20px;
        }

        .cc-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #a259ff;
          box-shadow: 0 0 10px #a259ff;
          animation: ccDotPulse 1.4s infinite;
        }

        @keyframes ccDotPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        /* Hero Image */
        .cc-img-container {
          position: relative;
          width: 130px;
          height: 130px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }

        .cc-img-halo {
          position: absolute;
          width: 110px;
          height: 110px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(52, 211, 153, 0.35) 0%, rgba(123, 47, 242, 0.2) 65%, transparent 80%);
          filter: blur(14px);
          animation: ccPulseHalo 3s ease-in-out infinite;
        }

        @keyframes ccPulseHalo {
          0%, 100% { transform: scale(0.95); opacity: 0.7; }
          50% { transform: scale(1.18); opacity: 1; }
        }

        .cc-img {
          width: 115px;
          height: 115px;
          object-fit: contain;
          position: relative;
          z-index: 2;
          filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.6));
          animation: ccFloatImg 4s ease-in-out infinite;
        }

        @keyframes ccFloatImg {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }

        .cc-floating-badge {
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

        .cc-main-title {
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

        .cc-subtitle {
          margin: 10px 0 0 0;
          font-size: 0.96rem;
          color: #aba0c2;
          line-height: 1.5;
          max-width: 490px;
        }

        /* Order Box */
        .cc-order-box {
          margin: 18px 4px 0 4px;
          width: 100%;
          background: rgba(30, 15, 60, 0.6);
          border: 1px solid rgba(162, 89, 255, 0.25);
          border-radius: 18px;
          padding: 16px 18px;
          text-align: left;
        }

        .cc-order-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(162, 89, 255, 0.15);
        }

        .cc-order-id-group {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.84rem;
        }

        .cc-order-label {
          color: #8f82a8;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .cc-order-id-badge {
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

        .cc-order-id-badge:hover {
          background: rgba(123, 47, 242, 0.4);
          border-color: #a259ff;
        }

        .cc-copy-btn {
          background: none;
          border: none;
          color: #bfa8e6;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
        }

        .cc-copied-toast {
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

        .cc-status-pill {
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

        .cc-products-list {
          padding: 12px 0 8px 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cc-prod-row {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(14, 7, 28, 0.45);
          border: 1px solid rgba(162, 89, 255, 0.14);
          border-radius: 12px;
          padding: 8px 12px;
        }

        .cc-prod-icon-wrap {
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

        .cc-prod-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }

        .cc-prod-name {
          color: #f1edfa;
          font-size: 0.9rem;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cc-prod-plat {
          color: #a78bfa;
          font-size: 0.76rem;
          font-weight: 600;
        }

        .cc-prod-price {
          color: #34d399;
          font-size: 0.9rem;
          font-weight: 800;
          flex-shrink: 0;
        }

        .cc-order-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid rgba(162, 89, 255, 0.15);
          font-size: 0.85rem;
        }

        .cc-footer-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cc-footer-lbl {
          color: #8b80a0;
        }

        .cc-footer-val {
          color: #d1c4e9;
          font-weight: 700;
        }

        .cc-footer-total-val {
          color: #34d399;
          font-size: 1.05rem;
          font-weight: 900;
        }

        /* PRIMARY CTA: WHATSAPP */
        .cc-wsp-cta-container {
          margin-top: 22px;
          width: 100%;
        }

        .cc-wsp-btn {
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

        .cc-wsp-btn::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transform: skewX(-20deg);
          animation: ccShimmer 3.2s infinite;
        }

        @keyframes ccShimmer {
          0% { left: -100%; }
          30%, 100% { left: 160%; }
        }

        .cc-wsp-btn:hover {
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 14px 40px rgba(37, 211, 102, 0.55), 0 0 28px rgba(37, 211, 102, 0.35);
          filter: brightness(1.05);
        }

        .cc-wsp-btn-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .cc-wsp-svg {
          width: 24px;
          height: 24px;
          fill: #ffffff;
        }

        .cc-wsp-btn-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          text-align: left;
        }

        .cc-wsp-btn-title {
          font-size: 1.05rem;
          font-weight: 900;
          letter-spacing: 0.02em;
        }

        .cc-wsp-btn-subtitle {
          font-size: 0.78rem;
          opacity: 0.94;
          font-weight: 600;
          line-height: 1.3;
        }

        .cc-wsp-arrow {
          flex-shrink: 0;
          opacity: 0.85;
          transition: transform 0.2s;
        }

        .cc-wsp-btn:hover .cc-wsp-arrow {
          transform: translateX(4px);
          opacity: 1;
        }

        /* Actions Section */
        .cc-actions-section {
          margin-top: 20px;
          width: 100%;
        }

        .cc-actions-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .cc-action-btn {
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

        .cc-action-btn:hover {
          transform: translateY(-2px);
          background: rgba(45, 22, 85, 0.85);
          border-color: rgba(162, 89, 255, 0.5);
        }

        .cc-action-icon {
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

        .cc-action-guide .cc-action-icon {
          background: rgba(239, 68, 68, 0.18);
          color: #f87171;
        }

        .cc-action-launcher .cc-action-icon {
          background: rgba(59, 130, 246, 0.18);
          color: #60a5fa;
        }

        .cc-action-orders .cc-action-icon {
          background: rgba(168, 85, 247, 0.18);
          color: #c084fc;
        }

        .cc-action-home .cc-action-icon {
          background: rgba(234, 179, 8, 0.18);
          color: #facc15;
        }

        .cc-action-details {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }

        .cc-action-title {
          font-size: 0.88rem;
          font-weight: 800;
          color: #f1edfa;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cc-action-sub {
          font-size: 0.74rem;
          color: #8b80a0;
          font-weight: 500;
        }

        /* Support Footer */
        .cc-support-footer {
          margin-top: 20px;
          width: 100%;
          background: rgba(14, 6, 26, 0.55);
          border: 1px solid rgba(162, 89, 255, 0.16);
          border-radius: 14px;
          padding: 12px 16px;
        }

        .cc-support-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #c4b5fd;
          font-size: 0.82rem;
          font-weight: 600;
        }

        /* Error Styles */
        .cc-error-icon-wrap {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.15);
          border: 2px solid rgba(239, 68, 68, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ef4444;
          box-shadow: 0 0 25px rgba(239, 68, 68, 0.25);
          margin-bottom: 16px;
        }

        .cc-error-title {
          background: linear-gradient(135deg, #ffffff 0%, #ef4444 60%, #b91c1c 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .cc-error-subtitle {
          color: #fca5a5;
        }

        .cc-error-cta-group {
          width: 100%;
          margin-top: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .cc-wsp-btn-help {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .cc-error-actions-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        @media (max-width: 540px) {
          .cc-page-container {
            padding: 30px 12px 60px 12px;
          }
          .cc-card {
            border-radius: 22px;
          }
          .cc-main-title {
            font-size: 1.5rem;
          }
          .cc-subtitle {
            font-size: 0.88rem;
          }
          .cc-actions-grid {
            grid-template-columns: 1fr;
          }
          .cc-wsp-btn-title {
            font-size: 0.92rem;
          }
          .cc-error-actions-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default CompraConfirmada;
