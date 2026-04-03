import React from "react";
import pendienteImg from "../../assets/estadopedido/pendiente.png";

function ConfirmacionPendiente() {
  return (
    <div className="cp-bg">
      <div className="cp-card">

        {/* Header strip amarillo-naranja */}
        <div className="cp-header-strip" />

        {/* Imagen */}
        <div className="cp-img-wrap">
          <img src={pendienteImg} alt="Pago pendiente" className="cp-img" />
        </div>

        {/* Título */}
        <div className="cp-title">
          <span className="cp-title-icon">⏳</span>
          <span className="cp-title-text">PAGO PENDIENTE</span>
        </div>
        <p className="cp-subtitle">Tu pago fue registrado y está siendo revisado.</p>

        {/* Divider */}
        <div className="cp-divider" />

        {/* Pasos del proceso */}
        <div className="cp-steps">
          <div className="cp-steps-label">¿Qué pasa ahora?</div>
          <div className="cp-step cp-step-done">
            <div className="cp-step-dot cp-dot-done">✓</div>
            <div className="cp-step-info">
              <span className="cp-step-title">Pago registrado</span>
              <span className="cp-step-desc">Tu comprobante fue recibido correctamente</span>
            </div>
          </div>
          <div className="cp-step-connector" />
          <div className="cp-step cp-step-active">
            <div className="cp-step-dot cp-dot-active">⧗</div>
            <div className="cp-step-info">
              <span className="cp-step-title">En revisión</span>
              <span className="cp-step-desc">Un administrador está verificando tu pago</span>
            </div>
          </div>
          <div className="cp-step-connector" />
          <div className="cp-step cp-step-pending">
            <div className="cp-step-dot cp-dot-pending">✉</div>
            <div className="cp-step-info">
              <span className="cp-step-title">Notificación por correo</span>
              <span className="cp-step-desc">Te avisaremos cuando tu pedido esté aprobado</span>
            </div>
          </div>
        </div>

        {/* Info tip */}
        <div className="cp-tip">
          💡 Por lo general la confirmación tarda menos de <strong>24 horas</strong>. Revisa tu bandeja de entrada.
        </div>

        {/* Botón */}
        <div className="cp-btn-wrap">
          <a className="cp-btn" href="/home">🏠 Volver al inicio</a>
        </div>

      </div>
      <style>{`
        .cp-bg {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 16px;
        }
        .cp-card {
          background: rgba(26,16,53,0.97);
          border: 1.5px solid rgba(255,165,0,0.35);
          border-radius: 24px;
          width: 420px;
          max-width: 96vw;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow: hidden;
          box-shadow: 0 8px 48px rgba(255,140,0,0.2), 0 2px 0 rgba(255,165,0,0.15);
          padding-bottom: 32px;
        }
        .cp-header-strip {
          width: 100%;
          height: 6px;
          background: linear-gradient(90deg, #ff7c00 0%, #FFD600 50%, #ff9800 100%);
        }
        .cp-img-wrap {
          display: flex;
          justify-content: center;
          padding: 22px 0 4px 0;
        }
        .cp-img {
          width: 115px;
          height: 115px;
          object-fit: contain;
          filter: drop-shadow(0 4px 18px rgba(255,152,0,0.5));
        }
        .cp-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 0 12px;
        }
        .cp-title-icon { font-size: 1.4rem; }
        .cp-title-text {
          font-size: 1.35rem;
          font-weight: 900;
          background: linear-gradient(90deg, #FFD600 0%, #ff9800 60%, #ff7c00 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: 0.02em;
        }
        .cp-subtitle {
          font-size: 0.95rem;
          color: #a08ab8;
          text-align: center;
          margin: 8px 0 0 0;
          padding: 0 20px;
          font-weight: 500;
        }
        .cp-divider {
          width: 80px;
          height: 4px;
          border-radius: 2px;
          background: linear-gradient(90deg, #ff9800, #FFD600);
          margin: 18px auto 0 auto;
        }
        .cp-steps {
          width: calc(100% - 48px);
          margin-top: 20px;
          background: rgba(40,20,80,0.55);
          border: 1px solid rgba(255,165,0,0.2);
          border-radius: 14px;
          padding: 16px 16px 12px 16px;
        }
        .cp-steps-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: #8b80a0;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin-bottom: 14px;
        }
        .cp-step {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .cp-step-dot {
          width: 30px;
          height: 30px;
          min-width: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: 900;
        }
        .cp-dot-done { background: rgba(34,197,94,0.2); color: #22c55e; border: 2px solid rgba(34,197,94,0.5); }
        .cp-dot-active { background: rgba(255,152,0,0.2); color: #FFA500; border: 2px solid rgba(255,152,0,0.6); animation: cp-pulse 1.6s ease-in-out infinite; }
        .cp-dot-pending { background: rgba(162,89,255,0.15); color: #a259ff; border: 2px solid rgba(162,89,255,0.4); }
        @keyframes cp-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,152,0,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(255,152,0,0); }
        }
        .cp-step-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-top: 3px;
        }
        .cp-step-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: #e0d0ff;
        }
        .cp-step-desc {
          font-size: 0.8rem;
          color: #7a6e90;
          font-weight: 500;
        }
        .cp-step-connector {
          width: 2px;
          height: 18px;
          background: rgba(162,89,255,0.25);
          margin: 4px 0 4px 14px;
          border-radius: 1px;
        }
        .cp-tip {
          width: calc(100% - 48px);
          margin-top: 16px;
          background: rgba(255,214,0,0.08);
          border: 1px solid rgba(255,214,0,0.25);
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 0.88rem;
          color: #d4c88a;
          line-height: 1.5;
          text-align: center;
        }
        .cp-tip strong { color: #FFD600; }
        .cp-btn-wrap {
          width: calc(100% - 48px);
          margin-top: 18px;
        }
        .cp-btn {
          display: block;
          width: 100%;
          padding: 13px 0;
          border-radius: 12px;
          background: transparent;
          color: #c4b5fd;
          border: 1.5px solid rgba(162,89,255,0.45);
          font-size: 1rem;
          font-weight: 800;
          text-align: center;
          text-decoration: none;
          transition: background 0.18s, color 0.18s, transform 0.18s;
        }
        .cp-btn:hover {
          background: rgba(162,89,255,0.12);
          color: #fff;
          transform: translateY(-2px);
        }
        @media (max-width: 480px) {
          .cp-card { padding-bottom: 22px; }
          .cp-title-text { font-size: 1.1rem; }
        }
      `}</style>
    </div>
  );
}

export default ConfirmacionPendiente;
