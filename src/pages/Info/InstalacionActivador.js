import React from "react";
import { Helmet } from "react-helmet-async";
import "./InstalacionActivador.css";
import activacionVideo from "../../assets/activacion.mp4";
import pandaLogo from "../../assets/logos/miicono.png";
import wspLogo from "../../assets/logos/logowsp.png";
import igLogo from "../../assets/logos/logoig.png";

export default function InstalacionActivador() {
  const ACTIVATOR_GOFILE_URL = "https://gofile.io/d/M3OCMCv3";

  return (
    <div className="activator-install-root">
      <Helmet>
        <title>Descargar PandaStore Activador Steam | Herramienta Oficial PC</title>
        <meta name="description" content="Descarga el Activador Oficial de PandaStore para juegos de Steam en PC. Guía paso a paso con video explicativo y descarga segura en 1 click." />
        <meta name="keywords" content="pandastore activador, activador steam pc, generar codigo steam pandastore, instalador steam pc, activacion steam 1 click" />
        <meta property="og:title" content="PandaStore Activador Steam Oficial | Descarga para PC" />
        <meta property="og:description" content="Descarga el software oficial para activar tus juegos de Steam en simples pasos. 100% seguro." />
        <meta property="og:url" content="https://pandastoreupdate.web.app/instalacion-activador" />
        <meta property="og:image" content="https://pandastoreupdate.web.app/favicon.png" />
        <link rel="canonical" href="https://pandastoreupdate.web.app/instalacion-activador" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "PandaStore Activator",
            "operatingSystem": "Windows 10, Windows 11 (64-bit)",
            "applicationCategory": "UtilitiesApplication",
            "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
            "publisher": { "@type": "Organization", "name": "PandaStore", "url": "https://pandastoreupdate.web.app" }
          })}
        </script>
      </Helmet>
      {/* ── Encabezado ── */}
      <header className="activator-header">
        <div className="activator-badge">
          <span>⚡</span>
          <span>Herramienta Oficial PandaStore</span>
        </div>
        <h1 className="activator-title">
          <span>PandaStore</span>
          <span className="activator-title-gradient">Activador</span>
        </h1>
        <p className="activator-subtitle">
          Descarga nuestro software oficial para generar tu código y activar tus juegos de Steam en simples pasos.
        </p>
        <div className="activator-divider" />
      </header>

      {/* ── Tarjeta Hero de Descarga ── */}
      <section className="activator-download-hero">
        <div className="hero-app-info">
          <img src={pandaLogo} alt="PandaStore" className="hero-panda-logo" />
          <div className="hero-app-meta">
            <h2>PandaStoreActivator.exe</h2>
            <div className="hero-app-tags">
              <span className="hero-tag highlight">v1.0 Oficial</span>
              <span className="hero-tag">Windows 10 / 11 (64-bit)</span>
              <span className="hero-tag">21.4 MB</span>
              <span className="hero-tag">Activación 1-Click</span>
            </div>
          </div>
        </div>

        {/* Descarga oficial del activador */}
        <div className="hero-buttons-group" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <a
            href={ACTIVATOR_GOFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-activator-download"
          >
            <span style={{ fontSize: "1.3rem" }}>⚡</span>
            <span>Descargar PandaStore Activador</span>
          </a>
        </div>

        <div className="hero-security-notice">
          <span style={{ color: "#10b981", fontSize: "1.1rem" }}>🛡️</span>
          <span>100% Seguro y Libre de Virus.</span>
        </div>
      </section>

      {/* ── Sección de Video Tutorial ── */}
      <section className="activator-video-section">
        <div className="section-title-wrap">
          <h3>
            <span>🎥</span>
            <span>Video Tutorial de Instalación y Activación</span>
          </h3>
          <p>Mira la demostración paso a paso de cómo generar tu código y activar tu juego:</p>
        </div>

        <div className="video-player-container">
          <video
            controls
            playsInline
            preload="metadata"
            src={activacionVideo}
          >
            Tu navegador no soporta la reproducción de video HTML5.
          </video>
        </div>
      </section>

      {/* ── Canal de Soporte con logos oficiales ── */}
      <footer className="activator-support-banner">
        <div className="support-text">
          <h4>💬 ¿Tienes dudas con la activación?</h4>
          <p>Nuestro equipo de soporte está disponible para asistirte en todo momento.</p>
        </div>

        <div className="support-buttons">
          <a
            href="https://wa.me/56974751810?text=Hola%20PandaStore!%20Necesito%20ayuda%20con%20el%20PandaStore%20Activador"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-support btn-support-wa"
          >
            <img src={wspLogo} alt="WhatsApp" className="support-icon-img" />
            <span>WhatsApp Soporte</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
