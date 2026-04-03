import React from "react";
import "./InstalacionNintendo.css";

import img1 from "../../assets/instalacionnintendo/1.png";
import img2 from "../../assets/instalacionnintendo/2.png";
import img3 from "../../assets/instalacionnintendo/3.png";
import img4 from "../../assets/instalacionnintendo/4.png";
import img5 from "../../assets/instalacionnintendo/5.png";
import img6 from "../../assets/instalacionnintendo/6.png";
import img7 from "../../assets/instalacionnintendo/7.png";
import img8 from "../../assets/instalacionnintendo/8.png";

const pasos = [
  { img: img1, label: "Paso 1 — Accede a la configuración de usuario" },
  { img: img2, label: "Paso 2 — Selecciona 'Agregar usuario'" },
  { img: img3, label: "Paso 3 — Ingresa las credenciales de la cuenta entregada" },
  { img: img4, label: "Paso 4 — Confirma el inicio de sesión" },
  { img: img5, label: "Paso 5 — Ve a la Nintendo eShop" },
  { img: img6, label: "Paso 6 — Descarga el juego" },
  { img: img7, label: "Paso 7 — Espera que finalice la descarga" },
  { img: img8, label: "Paso 8 — ¡Listo! Juega desde tu perfil personal" },
];

export default function InstalacionNintendo() {
  return (
    <div className="install-root">

      {/* ── Título ── */}
      <h1 className="install-title">
        <span className="install-title-icon">🎮</span>
        <span className="install-title-text">Guía de Instalación — Nintendo Switch</span>
      </h1>
      <p className="install-title-sub">Sigue cada paso con atención para instalar correctamente tu juego</p>
      <div className="install-divider" />

      {/* ── Canal de contacto ── */}
      <div className="install-channel-banner">
        <div className="install-channel-title">
          💬 ¿Necesitas ayuda con tu instalación?
        </div>
        <div className="install-channel-buttons">
          <a
            href="https://wa.me/56974751810"
            className="install-btn install-btn--whatsapp"
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* WhatsApp icon */}
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#25D366"/><path d="M23.5 8.5C21.6 6.6 19.1 5.5 16.5 5.5C11.3 5.5 7 9.8 7 15C7 17 7.6 18.9 8.6 20.5L7 25l4.7-1.5C13.2 24.4 14.8 25 16.5 25C21.7 25 26 20.7 26 15.5C26 12.9 24.9 10.4 23.5 8.5ZM16.5 23.3C15 23.3 13.6 22.8 12.4 22L12 21.8l-3 1 1-2.9-.3-.4C9 18.3 8.7 16.9 8.7 15.5C8.7 11.1 12.1 7.7 16.5 7.7C18.7 7.7 20.7 8.5 22.2 10C23.8 11.5 24.5 13.4 24.5 15.5C24.5 19.9 21.1 23.3 16.5 23.3ZM21 17.4C20.8 17.3 19.7 16.7 19.5 16.7C19.3 16.6 19.2 16.6 19 16.8C18.9 17 18.4 17.6 18.3 17.8C18.2 17.9 18.1 17.9 17.9 17.8C17.8 17.8 17.1 17.5 16.2 16.7C15.5 16.1 15 15.3 14.9 15.1C14.8 14.9 14.9 14.8 15 14.7C15.1 14.6 15.2 14.5 15.3 14.3C15.4 14.2 15.5 14.1 15.5 14C15.5 13.8 15.5 13.7 15.4 13.6C15.3 13.5 14.8 12.4 14.6 12C14.4 11.6 14.2 11.6 14.1 11.6H13.7C13.5 11.6 13.3 11.7 13.1 11.9C12.9 12.1 12.3 12.7 12.3 13.8C12.3 14.9 13.1 15.9 13.2 16.1C13.3 16.2 14.8 18.4 17 19.4C19.2 20.3 19.2 20 19.6 20C20 20 20.9 19.4 21.1 18.8C21.3 18.2 21.3 17.7 21.2 17.6C21.1 17.5 21.1 17.5 21 17.4Z" fill="white"/></svg>
            WhatsApp
          </a>
          <a
            href="https://instagram.com/juegos_nintendo_switch_chile2"
            className="install-btn install-btn--instagram"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="6" stroke="#a259ff" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="#a259ff" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.2" fill="#a259ff"/></svg>
            Instagram
          </a>
          <a
            href="https://t.me/NintendoChile2"
            className="install-btn install-btn--telegram"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#229ED9"/><path d="M17.5 7.5L5.5 11.8c-.8.3-.8.8 0 1l3 1 1.2 3.8c.2.6.5.7.9.4l1.7-1.5 3.3 2.4c.6.4 1 .2 1.1-.5l1.8-9.2c.2-.9-.3-1.3-1-1.7z" fill="white"/></svg>
            Telegram
          </a>
        </div>
        <div className="install-channel-note">
          ⚠️ Por favor contáctanos <strong>solo por un canal</strong> — el mismo que usaste para comprar. Si compraste por Instagram, escríbenos ahí. Si fue por WhatsApp, por WhatsApp. Así te atendemos más rápido y sin confusiones.
        </div>
      </div>

      {/* ── Pasos ── */}
      <div className="install-steps-title">
        📋 Pasos de instalación — Sigue el orden
      </div>
      <div className="install-steps-grid">
        {pasos.map((paso, idx) => (
          <div className="install-step-card" key={idx}>
            <div className="install-step-header">{paso.label}</div>
            <img src={paso.img} alt={paso.label} />
          </div>
        ))}
      </div>

      {/* ── Bloque importante ── */}
      <div className="install-important">
        <div className="install-important-header">
          ⚠️ IMPORTANTE — Lee esto antes de instalar
        </div>
        <div className="install-important-body">
          <ul className="install-ilist">
            <li><span className="ii">🔒</span><span><strong>NO CAMBIES</strong> ningún dato de la cuenta que te entregamos (usuario, contraseña o correo).</span></li>
            <li><span className="ii">🚫</span><span><strong>NO vuelvas a ingresar</strong> a esa cuenta después de descargar los juegos. Tu rol es jugar desde tu perfil personal.</span></li>
            <li><span className="ii">👤</span><span><strong>SIEMPRE JUEGA</strong> desde tu perfil personal — el tuyo, no el que te entregamos.</span></li>
            <li><span className="ii">⏳</span><span><strong>DURACIÓN:</strong> estas cuentas no son permanentes. Duran tiempo indefinido — pueden durar meses o más si se siguen las instrucciones.</span></li>
            <li><span className="ii">❌</span><span>Si no respetas estas reglas, <strong>pierdes la garantía</strong> y la cuenta puede ser bloqueada por Nintendo.</span></li>
            <li><span className="ii">✅</span><span><strong>Garantía: 1 semana</strong> desde la entrega, siempre que se hayan seguido las instrucciones.</span></li>
          </ul>

          <div className="install-tip">
            <div className="install-tip-title">✈️ Tip: Modo Avión puede ayudar</div>
            <p>Jugar con el <strong>modo avión activado</strong> reduce las validaciones en línea de Nintendo y puede extender la vida de la cuenta. <strong>No garantiza permanencia</strong>, pero es una buena práctica mientras juegas.</p>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="install-footer">
        🪄 ¡Sigue bien los pasos y disfruta tus juegos sin problemas!
      </div>

    </div>
  );
}
