import React, { useState } from "react";
import ReactDOM from "react-dom";
import { trackClickTelegram } from "../../utils/analytics";

import "./WelcomeCategoriesModal.css";

// Canal oficial de Telegram (ofertas, packs nuevos y sorteos)
export const TELEGRAM_CHANNEL_URL = "https://t.me/juegosNintendoSwitchChile2";

// Logo oficial de Telegram (mismo trazado SVG que usa el footer del sitio)
function TelegramLogo({ size = 76 }) {
  return (
    <svg viewBox="0 0 496 512" width={size} height={size} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M248 8C111 8 0 119 0 256S111 504 248 504 496 393 496 256 385 8 248 8zM363 176.7c-3.7 39.2-19.9 134.4-28.1 178.3-3.5 18.6-10.3 24.8-16.9 25.4-14.4 1.3-25.3-9.5-39.3-18.7-21.8-14.3-34.2-23.2-55.3-37.2-24.5-16.1-8.6-25 5.3-39.5 3.7-3.8 67.1-61.5 68.3-66.7.2-.7.3-3.1-1.2-4.4s-3.6-.8-5.1-.5q-3.3.7-104.6 69.1-14.8 10.2-26.9 9.9c-8.9-.2-25.9-5-38.6-9.1-15.5-5-27.9-7.7-26.8-16.3q.8-6.7 18.5-13.7 108.4-47.2 144.6-62.3c68.9-28.6 83.2-33.6 92.5-33.8 2.1 0 6.6.5 9.6 2.9a10.5 10.5 0 0 1 3.5 6.7A43.8 43.8 0 0 1 363 176.7z"
      />
    </svg>
  );
}

const BENEFICIOS = [
  ["🔥", "Ofertas y descuentos exclusivos del canal"],
  ["🎮", "Packs nuevos de Nintendo Switch antes que nadie"],
  ["⚡", "Avisos de estrenos y juegos que vuelven a estar disponibles"],
];

// Mensaje de bienvenida: invita a unirse al canal de Telegram.
// (Conserva el nombre y las props del antiguo modal de categorías para no tocar Home.)
export default function WelcomeCategoriesModal({ visible, onClose }) {
  // Si el modal ya venía visible en el HTML prerenderizado (index.html), no repetir la animación de
  // entrada al montarlo con React: se vería parpadear.
  const [instant] = useState(() => {
    const prerendered = typeof window !== "undefined" && window.__welcomePrerendered === true;
    if (prerendered) window.__welcomePrerendered = false;
    return prerendered;
  });

  if (!visible) return null;
  if (typeof document === "undefined") return null;

  const handleJoin = () => {
    try { trackClickTelegram("welcome_modal"); } catch (_) {}
    window.open(TELEGRAM_CHANNEL_URL, "_blank", "noopener,noreferrer");
    onClose();
  };

  return ReactDOM.createPortal(
    <div className={`welcome-modal-overlay${instant ? " welcome-modal--instant" : ""}`} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="welcome-modal-title">
      <div className="welcome-modal-card welcome-tg-card" onClick={(e) => e.stopPropagation()}>
        <div className="welcome-modal-ambient-glow welcome-tg-glow" aria-hidden="true" />

        <button className="welcome-modal-close-btn" onClick={onClose} aria-label="Cerrar" title="Cerrar">
          ✕
        </button>

        <div className="welcome-tg-header">
          <div className="welcome-tg-logo">
            <TelegramLogo />
          </div>
          <p className="welcome-modal-kicker welcome-tg-kicker">Canal oficial PandaStore</p>
          <h2 id="welcome-modal-title" className="welcome-modal-title">¡Únete a nuestro canal de Telegram!</h2>
          <p className="welcome-modal-subtitle">
            Las mejores ofertas de juegos digitales llegan primero al canal.
          </p>
        </div>

        <ul className="welcome-tg-benefits">
          {BENEFICIOS.map(([icon, text]) => (
            <li key={text}>
              <span className="welcome-tg-benefit-icon" aria-hidden="true">{icon}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <div className="welcome-tg-actions">
          <a
            href={TELEGRAM_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="welcome-tg-join-btn"
            onClick={(e) => { e.preventDefault(); handleJoin(); }}
          >
            <TelegramLogo size={22} />
            Unirme al canal
          </a>
          <button type="button" className="welcome-tg-later-btn" onClick={onClose}>
            Ahora no, ver la tienda
          </button>
        </div>
        <p className="welcome-tg-note">Es gratis y puedes salir cuando quieras.</p>
      </div>
    </div>,
    document.body
  );
}
