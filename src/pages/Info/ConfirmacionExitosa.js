import React, { useEffect, useState } from "react";
import confirmadoImg from "../../assets/estadopedido/confimado.png";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

function ConfirmacionExitosa() {
  const user = auth.currentUser;
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    async function loadUserProfile() {
      try {
        if (!user) return;
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setAvatarUrl(d.photoURL || d.avatarUrl || null);
          setNombre(d.displayName || d.name || "");
        }
      } catch (_) {}
    }
    loadUserProfile();
  }, [user]);

  return (
    <div className="confirmacion-estado-bg">
      <div className="card confirmacion-card">
        <div className="card__img">
          <img src={confirmadoImg} alt="Compra confirmada" />
        </div>
        <div className="card__avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" />
          ) : (
            <div className="avatar-fallback">{(nombre || "").slice(0,1).toUpperCase() || "U"}</div>
          )}
        </div>
        <div className="card__title">¡COMPRA CONFIRMADA!</div>
        <div className="card__subtitle">Tu pago fue aprobado y tu pedido está siendo procesado.</div>
        <div className="card__wrapper">
          <a className="card__btn card__btn-solid" href="/home">Volver al inicio</a>
        </div>
        <div className="card__contacts">
          <div className="card__contacts-title">Para instalación, contáctanos en:</div>
            <div className="social-icons">
              <a href="https://wa.me/56974751810" target="_blank" rel="noopener noreferrer" title="WhatsApp" className="social-btn whatsapp">
                <svg viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
                  <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                </svg>
              </a>
              <a href="https://instagram.com/juegos_nintendo_switch_chile2" target="_blank" rel="noopener noreferrer" title="Instagram" className="social-btn instagram">
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"
                    fill="#E1306C"
                  />
                </svg>
              </a>
              <a href="https://t.me/NintendoChile2" target="_blank" rel="noopener noreferrer" title="Telegram" className="social-btn telegram">
                <svg viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg">
                  <path d="M248 8C111 8 0 119 0 256S111 504 248 504 496 393 496 256 385 8 248 8zM363 176.7c-3.7 39.2-19.9 134.4-28.1 178.3-3.5 18.6-10.3 24.8-16.9 25.4-14.4 1.3-25.3-9.5-39.3-18.7-21.8-14.3-34.2-23.2-55.3-37.2-24.5-16.1-8.6-25 5.3-39.5 3.7-3.8 67.1-61.5 68.3-66.7 .2-.7 .3-3.1-1.2-4.4s-3.6-.8-5.1-.5q-3.3 .7-104.6 69.1-14.8 10.2-26.9 9.9c-8.9-.2-25.9-5-38.6-9.1-15.5-5-27.9-7.7-26.8-16.3q.8-6.7 18.5-13.7 108.4-47.2 144.6-62.3c68.9-28.6 83.2-33.6 92.5-33.8 2.1 0 6.6 .5 9.6 2.9a10.5 10.5 0 0 1 3.5 6.7A43.8 43.8 0 0 1 363 176.7z"/>
                </svg>
              </a>
            </div>
        </div>
      </div>
      <style>{`
        .confirmacion-estado-bg {
          min-height: 100vh;
          width: 100vw;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          position: static;
          padding: 32px 0;
        }
        .card.confirmacion-card {
          --main-color: #1976d2;
          --submain-color: #78858F;
          --bg-color: #fff;
          width: 360px;
          min-height: 480px;
          border-radius: 24px;
          background: var(--bg-color);
          box-shadow: 0 6px 32px #1976d233, 0 1.5px 0 #1976d2;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow: visible;
          padding-bottom: 24px;
        }
        .card__img {
          height: 180px;
          width: 100%;
          margin-bottom: 8px;
        }
        .card__img img {
          height: 100%;
          width: 100%;
          object-fit: contain;
          border-radius: 24px 24px 0 0;
          padding: 8px;
        }
        .card__avatar {
          position: relative;
          width: 104px;
          height: 104px;
          background: var(--bg-color);
          border-radius: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow: 0 2px 12px #1976d244;
          overflow: hidden;
          margin-top: -52px;
          margin-bottom: 12px;
          z-index: 2;
        }
        .card__avatar img {
          width: 100px;
          height: 100px;
          object-fit: cover;
          border-radius: 50%;
        }
        .avatar-fallback {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: #e3f2fd;
          color: #1976d2;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 2rem;
        }
        .card__title {
          margin-top: 0;
          font-weight: 900;
          font-size: 1.45rem;
          color: var(--main-color);
          text-shadow: 0 2px 12px #1976d244, 0 1px 0 #fff;
          text-align: center;
          padding: 0 12px;
        }
        .card__subtitle {
          margin-top: 10px;
          font-weight: 600;
          font-size: 1rem;
          color: #393053;
          text-align: center;
          padding: 0 16px;
        }
        .card__wrapper {
          margin-top: 22px;
          display: flex;
          gap: 10px;
          justify-content: center;
          align-items: center;
        }
        .card__btn {
          width: auto;
          min-width: 160px;
          height: 38px;
          border: 2px solid var(--main-color);
          border-radius: 8px;
          font-weight: 800;
          font-size: 1rem;
          color: var(--main-color);
          background: var(--bg-color);
          text-transform: none;
          transition: all 0.2s;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px #1976d222;
        }
        .card__btn-solid {
          background: var(--main-color);
          color: var(--bg-color);
        }
        .card__btn:hover {
          background: var(--main-color);
          color: var(--bg-color);
        }
        .card__btn-solid:hover {
          background: var(--bg-color);
          color: var(--main-color);
        }
        .card__contacts { margin-top: 24px; width: 100%; padding: 0 14px 0 14px; }
        .card__contacts-title { text-align: center; color: #393053; font-weight: 700; font-size: 1rem; margin-bottom: 12px; }
        .social-icons {
          display: flex;
          gap: 18px;
          margin-top: 8px;
          justify-content: center;
        }
        .social-btn {
          padding: 0;
          margin: 0;
          position: relative;
          text-decoration: none;
          background: none !important;
          border-radius: 0;
          box-shadow: none;
          width: auto;
          height: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s;
        }
        .social-btn:hover {
          transform: translateY(-5px) scale(1.1);
        }
        .social-btn svg {
          display: block;
          width: 38px;
          height: 38px;
          transition: fill 0.3s ease-in-out;
        }
        .social-btn.whatsapp svg path { fill: #25D366; }
        .social-btn.instagram svg path { fill: #E1306C; }
        .social-btn.telegram svg path { fill: #229ED9; }
        .social-btn:active, .social-btn:focus {
          outline: none;
        }
        @media (max-width: 600px) {
          .social-btn svg { width: 34px; height: 34px; }
        }
        @media (max-width: 600px) {
          .card.confirmacion-card { width: 96vw; min-height: unset; height: auto; padding-bottom: 18px; }
          .card__img { height: 150px; }
          .card__avatar { width: 82px; height: 82px; margin-top: -41px; margin-bottom: 10px; }
          .card__title { font-size: 1.18rem; }
          .card__subtitle { font-size: 0.98rem; }
          .card__wrapper { margin-top: 16px; }
          .social-icons { gap: 12px; }
        }
      `}</style>
    </div>
  );
}

export default ConfirmacionExitosa;
