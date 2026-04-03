import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import confirmadoImg from "../../assets/estadopedido/confimado.png";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

function ConfirmacionExitosa() {
  const user = auth.currentUser;
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [nombre, setNombre] = useState("");
  const navigate = useNavigate();

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
    <div className="ce-bg">
      <div className="ce-card">

        {/* Header glow strip */}
        <div className="ce-header-strip" />

        {/* Imagen confirmado */}
        <div className="ce-img-wrap">
          <img src={confirmadoImg} alt="Compra confirmada" className="ce-img" />
        </div>

        {/* Avatar */}
        <div className="ce-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="ce-avatar-img" />
          ) : (
            <div className="ce-avatar-fallback">{(nombre || "").slice(0, 1).toUpperCase() || "U"}</div>
          )}
        </div>

        {/* Titulo */}
        <div className="ce-title">
          <span className="ce-title-icon">&#127881;</span>
          <span className="ce-title-text">&iexcl;COMPRA CONFIRMADA!</span>
        </div>
        <p className="ce-subtitle">Tu pago fue aprobado y tu pedido est&aacute; siendo procesado.</p>

        {/* Divider */}
        <div className="ce-divider" />

        {/* Botones */}
        <div className="ce-btn-group">
          <button className="ce-btn ce-btn-install" onClick={() => navigate("/instalacion-nintendo")}>
            &#127918; Ver gu&iacute;a de instalaci&oacute;n
          </button>
          <a className="ce-btn ce-btn-home" href="/home">&#127968; Volver al inicio</a>
        </div>

        {/* Contacto social */}
        <div className="ce-contacts">
          <div className="ce-contacts-title">&iquest;Dudas? Cont&aacute;ctanos por:</div>
          <div className="ce-social-row">
            <a href="https://wa.me/56974751810" target="_blank" rel="noopener noreferrer" className="ce-social-btn ce-wa">
              <svg viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
              WhatsApp
            </a>
            <a href="https://instagram.com/juegos_nintendo_switch_chile2" target="_blank" rel="noopener noreferrer" className="ce-social-btn ce-ig">
              <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z" fill="#E1306C"/></svg>
              Instagram
            </a>
            <a href="https://t.me/NintendoChile2" target="_blank" rel="noopener noreferrer" className="ce-social-btn ce-tg">
              <svg viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg"><path d="M248 8C111 8 0 119 0 256S111 504 248 504 496 393 496 256 385 8 248 8zM363 176.7c-3.7 39.2-19.9 134.4-28.1 178.3-3.5 18.6-10.3 24.8-16.9 25.4-14.4 1.3-25.3-9.5-39.3-18.7-21.8-14.3-34.2-23.2-55.3-37.2-24.5-16.1-8.6-25 5.3-39.5 3.7-3.8 67.1-61.5 68.3-66.7 .2-.7 .3-3.1-1.2-4.4s-3.6-.8-5.1-.5q-3.3 .7-104.6 69.1-14.8 10.2-26.9 9.9c-8.9-.2-25.9-5-38.6-9.1-15.5-5-27.9-7.7-26.8-16.3q.8-6.7 18.5-13.7 108.4-47.2 144.6-62.3c68.9-28.6 83.2-33.6 92.5-33.8 2.1 0 6.6 .5 9.6 2.9a10.5 10.5 0 0 1 3.5 6.7A43.8 43.8 0 0 1 363 176.7z"/></svg>
              Telegram
            </a>
          </div>
        </div>

      </div>
      <style>{`
        .ce-bg {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 16px;
        }
        .ce-card {
          background: rgba(26,16,53,0.97);
          border: 1.5px solid rgba(162,89,255,0.35);
          border-radius: 24px;
          width: 400px;
          max-width: 96vw;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow: hidden;
          position: relative;
          box-shadow: 0 8px 48px rgba(123,47,242,0.35), 0 2px 0 rgba(162,89,255,0.18);
          padding-bottom: 32px;
        }
        .ce-header-strip {
          width: 100%;
          height: 6px;
          background: linear-gradient(90deg, #7b2ff2 0%, #FFD600 50%, #a259ff 100%);
        }
        .ce-img-wrap {
          width: 100%;
          display: flex;
          justify-content: center;
          padding: 20px 16px 0 16px;
        }
        .ce-img {
          width: 130px;
          height: 130px;
          object-fit: contain;
          filter: drop-shadow(0 4px 18px rgba(162,89,255,0.5));
        }
        .ce-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 3px solid rgba(162,89,255,0.6);
          box-shadow: 0 0 18px rgba(162,89,255,0.4);
          overflow: hidden;
          margin: 14px 0 6px 0;
          background: rgba(40,20,80,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ce-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }
        .ce-avatar-fallback {
          font-size: 2rem;
          font-weight: 900;
          color: #c4b5fd;
        }
        .ce-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          padding: 0 12px;
        }
        .ce-title-icon { font-size: 1.5rem; }
        .ce-title-text {
          font-size: 1.4rem;
          font-weight: 900;
          background: linear-gradient(90deg, #FFD600 0%, #a259ff 60%, #7b2ff2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: 0.01em;
        }
        .ce-subtitle {
          font-size: 0.98rem;
          color: #a08ab8;
          text-align: center;
          margin: 8px 0 0 0;
          padding: 0 20px;
          font-weight: 500;
        }
        .ce-divider {
          width: 80px;
          height: 4px;
          border-radius: 2px;
          background: linear-gradient(90deg, #7b2ff2, #FFD600);
          margin: 18px auto 0 auto;
        }
        .ce-btn-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: calc(100% - 48px);
          margin-top: 20px;
        }
        .ce-btn {
          width: 100%;
          padding: 13px 0;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 800;
          cursor: pointer;
          text-align: center;
          text-decoration: none;
          display: block;
          border: none;
          transition: transform 0.18s, box-shadow 0.18s, opacity 0.18s;
          font-family: inherit;
        }
        .ce-btn:hover { transform: translateY(-2px); opacity: 0.9; }
        .ce-btn-install {
          background: linear-gradient(90deg, #7b2ff2 0%, #a259ff 100%);
          color: #fff;
          box-shadow: 0 4px 18px rgba(123,47,242,0.45);
        }
        .ce-btn-home {
          background: transparent;
          color: #c4b5fd;
          border: 1.5px solid rgba(162,89,255,0.45) !important;
          box-shadow: none;
        }
        .ce-btn-home:hover { background: rgba(162,89,255,0.12); color: #fff; }
        .ce-contacts {
          width: calc(100% - 48px);
          margin-top: 22px;
          background: rgba(40,20,80,0.55);
          border: 1px solid rgba(162,89,255,0.22);
          border-radius: 14px;
          padding: 14px 12px;
        }
        .ce-contacts-title {
          text-align: center;
          color: #8b80a0;
          font-size: 0.82rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 12px;
        }
        .ce-social-row {
          display: flex;
          gap: 8px;
          justify-content: center;
        }
        .ce-social-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 9px;
          font-size: 0.82rem;
          font-weight: 700;
          text-decoration: none;
          border: 1.5px solid transparent;
          transition: transform 0.18s, background 0.18s;
        }
        .ce-social-btn:hover { transform: translateY(-2px); }
        .ce-social-btn svg { width: 18px; height: 18px; flex-shrink: 0; }
        .ce-wa { background: rgba(37,211,102,0.1); color: #25D366; border-color: rgba(37,211,102,0.3); }
        .ce-wa svg path { fill: #25D366; }
        .ce-wa:hover { background: rgba(37,211,102,0.2); }
        .ce-ig { background: rgba(225,48,108,0.1); color: #E1306C; border-color: rgba(225,48,108,0.3); }
        .ce-ig svg path { fill: #E1306C; }
        .ce-ig:hover { background: rgba(225,48,108,0.2); }
        .ce-tg { background: rgba(34,158,217,0.1); color: #229ED9; border-color: rgba(34,158,217,0.3); }
        .ce-tg svg path { fill: #229ED9; }
        .ce-tg:hover { background: rgba(34,158,217,0.2); }
        @media (max-width: 480px) {
          .ce-card { padding-bottom: 22px; }
          .ce-title-text { font-size: 1.15rem; }
          .ce-social-btn span { display: none; }
          .ce-social-btn { padding: 8px 14px; }
          .ce-social-btn svg { width: 22px; height: 22px; }
        }
      `}</style>
    </div>
  );
}

export default ConfirmacionExitosa;
