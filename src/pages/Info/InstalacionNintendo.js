import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import ImageZoomModal from "../../components/ImageZoomModal";
import "./InstalacionNintendo.css";

import img1 from "../../assets/instalacionnintendo/1.png";
import img2 from "../../assets/instalacionnintendo/2.png";
import img3 from "../../assets/instalacionnintendo/3.png";
import img4 from "../../assets/instalacionnintendo/4.png";
import img5 from "../../assets/instalacionnintendo/5.png";
import img6 from "../../assets/instalacionnintendo/6.png";
import img7 from "../../assets/instalacionnintendo/7.png";
import img8 from "../../assets/instalacionnintendo/8.png";
import wspLogo from "../../assets/logos/logowsp.png";
import igLogo from "../../assets/logos/logoig.png";

const WSP_URL = "https://wa.me/56974751810?text=Hola%20PandaStore!%20Necesito%20ayuda%20con%20la%20instalaci%C3%B3n%20en%20Nintendo%20Switch";

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
  const [modalImage, setModalImage] = useState(null);

  const openZoom = (src, title) => {
    setModalImage({ src, title });
  };

  const closeZoom = () => {
    setModalImage(null);
  };

  return (
    <div className="install-root">
      <Helmet>
        <title>Cómo Instalar Juegos en Nintendo Switch | Guía Paso a Paso - PandaStore</title>
        <meta name="description" content="Guía visual paso a paso para instalar y activar tus juegos digitales en Nintendo Switch de forma fácil y 100% segura. Soporte 24/7." />
        <meta name="keywords" content="como instalar juegos nintendo switch, activar cuenta switch, tutorial juegos digitales switch, soporte nintendo pandastore" />
        <meta property="og:title" content="Guía de Instalación Nintendo Switch | PandaStore" />
        <meta property="og:description" content="Aprende a instalar tus juegos de Nintendo Switch en simples pasos con imágenes ilustrativas." />
        <meta property="og:url" content="https://pandastoreupdate.web.app/instalacion-nintendo" />
        <link rel="canonical" href="https://pandastoreupdate.web.app/instalacion-nintendo" />
        <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "Cómo Instalar Juegos Digitales en Nintendo Switch",
          "description": "Tutorial oficial para descargar e instalar tus videojuegos de Nintendo Switch con tu cuenta entregada por PandaStore.",
          "step": pasos.map((p, idx) => ({
            "@type": "HowToStep",
            "position": idx + 1,
            "name": p.label,
            "text": p.label
          }))
        })}
        </script>
      </Helmet>

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
            href={WSP_URL}
            className="install-btn install-btn--whatsapp"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={wspLogo} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />
            WhatsApp
          </a>
          <a
            href="https://www.instagram.com/pandastoregaming.cl/"
            className="install-btn install-btn--instagram"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={igLogo} alt="" style={{ width: 18, height: 18, objectFit: "contain", borderRadius: 4 }} />
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
          ⚠️ Por favor contáctanos <strong>solo por un canal</strong> — WhatsApp, Instagram o Telegram. Así te atendemos más rápido y sin confusiones.
        </div>
      </div>

      {/* ── Pasos ── */}
      <div className="install-steps-title">
        📋 Pasos de instalación — Sigue el orden (Toca cualquier imagen para ampliar)
      </div>
      <div className="install-steps-grid">
        {pasos.map((paso, idx) => (
          <div
            className="install-step-card zoomable-step"
            key={idx}
            onClick={() => openZoom(paso.img, paso.label)}
          >
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
            <li><span className="ii">⏳</span><span><strong>DURACIÓN (CUENTAS DE TERCEROS):</strong> estas cuentas <strong>NO SON PERMANENTES</strong>. El cliente solo recibe el acceso, pero <strong>si el tercero (dueño original) cambia la contraseña, cierra o desvincula la cuenta, el juego se perderá</strong>. Tienen un tiempo de duración indefinido, pero <strong>solo garantizamos su funcionamiento por 1 semana (7 días)</strong>.</span></li>
            <li><span className="ii">❌</span><span>Si el cliente cierra sesión, elimina la cuenta, o cambia algún dato, <strong>perderá el juego inmediatamente y sin derecho a reclamo</strong>.</span></li>
            <li><span className="ii">✅</span><span><strong>Garantía: 7 días</strong> desde la entrega, siempre que se hayan seguido las instrucciones.</span></li>
          </ul>

          <div className="install-tip">
            <div className="install-tip-title">✈️ Tip: Modo Avión puede ayudar</div>
            <p>Jugar con el <strong>modo avión activado</strong> reduce las validaciones en línea de Nintendo y puede extender la vida de la cuenta. <strong>No garantiza permanencia</strong>, pero es una buena práctica mientras juegas.</p>
          </div>
        </div>
      </div>

      {/* ── Footer & Canales de Soporte ── */}
      <div className="install-footer" style={{ marginBottom: 20 }}>
        🪄 ¡Sigue bien los pasos y disfruta tus juegos sin problemas!
      </div>

      <footer className="install-nintendo-support" style={{
        marginTop: 20,
        padding: "26px 20px",
        background: "rgba(25, 20, 42, 0.85)",
        border: "1.5px solid rgba(255, 42, 109, 0.35)",
        borderRadius: 18,
        textAlign: "center",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)"
      }}>
        <h3 style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 800, margin: "0 0 8px" }}>
          💬 ¿Tienes dudas o necesitas ayuda con la instalación en Switch?
        </h3>
        <p style={{ color: "#c4b5fd", fontSize: "0.92rem", margin: "0 0 18px" }}>
          Nuestro equipo de soporte te atiende de inmediato por nuestros canales oficiales:
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>
          <a
            href={WSP_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "#25D366",
              color: "#fff",
              padding: "10px 22px",
              borderRadius: 12,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 4px 15px rgba(37, 211, 102, 0.35)",
              transition: "transform 0.2s"
            }}
          >
            <img src={wspLogo} alt="WhatsApp" style={{ width: 26, height: 26, objectFit: "contain" }} />
            <span>WhatsApp (+56 9 7475 1810)</span>
          </a>
          <a
            href="https://www.instagram.com/pandastoregaming.cl/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "linear-gradient(135deg, #E1306C, #C13584, #833AB4)",
              color: "#fff",
              padding: "10px 22px",
              borderRadius: 12,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 4px 15px rgba(225, 48, 108, 0.35)",
              transition: "transform 0.2s"
            }}
          >
            <img src={igLogo} alt="Instagram" style={{ width: 26, height: 26, objectFit: "contain", borderRadius: 6 }} />
            <span>Instagram (@pandastoregaming.cl)</span>
          </a>
        </div>
      </footer>

      {/* ── MODAL DE ZOOM Y ARRASTRE LIBRE ── */}
      {modalImage && (
        <ImageZoomModal
          src={modalImage.src}
          title={modalImage.title}
          onClose={closeZoom}
        />
      )}

    </div>
  );
}
