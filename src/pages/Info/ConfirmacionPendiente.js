import React from "react";
import pendienteImg from "../../assets/estadopedido/pendiente.png";

function ConfirmacionPendiente() {
  return (
    <div className="confirmacion-estado-bg">
      <div className="confirmacion-estado-card pendiente">
        <img
          src={pendienteImg}
          alt="pendiente"
          className="confirmacion-estado-img"
        />
        <h1>PAGO PENDIENTE DE CONFIRMACIÓN</h1>
        <p>
          Tu pago fue registrado pero requiere confirmación manual.<br />
          Un administrador revisará tu pago y te notificaremos por correo cuando esté aprobado.
        </p>
        <a className="confirmacion-estado-link" href="/home">
          Volver al inicio
        </a>
      </div>
      <style>{`
        .confirmacion-estado-bg {
          min-height: 70vh;
          width: 100vw;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          position: static;
        }
        .confirmacion-estado-card {
          background: #fff;
          border-radius: 22px;
          box-shadow: 0 6px 32px #ff980033, 0 1.5px 0 #ff9800;
          max-width: 410px;
          width: 96vw;
          margin: 0 auto;
          padding: 38px 24px 32px 24px;
          text-align: center;
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .confirmacion-estado-card.pendiente h1 {
          color: #ff9800;
          font-weight: 900;
          font-size: 1.7rem;
          margin: 18px 0 10px 0;
          letter-spacing: 0.01em;
          text-shadow: 0 2px 12px #ff980044, 0 1px 0 #fff;
        }
        .confirmacion-estado-card p {
          font-size: 1.15rem;
          color: #393053;
          margin-bottom: 18px;
          font-weight: 600;
        }
        .confirmacion-estado-img {
          width: 110px;
          margin: 0 auto 18px auto;
          display: block;
          filter: drop-shadow(0 2px 8px #ff980044);
        }
        .confirmacion-estado-link {
          display: inline-block;
          margin-top: 18px;
          color: #ff9800;
          background: #fffbe6;
          font-weight: 800;
          font-size: 1.1rem;
          padding: 10px 28px;
          border-radius: 12px;
          text-decoration: none;
          box-shadow: 0 2px 8px #ff980022;
          transition: background 0.18s, color 0.18s;
        }
        .confirmacion-estado-link:hover {
          background: #ff9800;
          color: #fff;
        }
        @media (max-width: 600px) {
          .confirmacion-estado-card {
            padding: 18px 4vw 18px 4vw;
            max-width: 98vw;
          }
          .confirmacion-estado-img {
            width: 80px;
          }
        }
      `}</style>
    </div>
  );
// Este archivo es de acceso público, no requiere autenticación ni protección de ruta.
}

export default ConfirmacionPendiente;
