import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import ImageZoomModal from "../../components/ImageZoomModal";
import "./InstalacionPlaystation.css";

import primariaImg from "../../assets/instalacion psn/primaria.jpg";
import secundariaImg from "../../assets/instalacion psn/secundaria.jpg";
import playLogo from "../../assets/logos/icono-play.png";
import wspLogo from "../../assets/logos/logowsp.png";
import igLogo from "../../assets/logos/logoig.png";

const WSP_URL = "https://wa.me/56974751810?text=Hola%20PandaStore!%20Necesito%20ayuda%20con%20la%20instalaci%C3%B3n%20en%20PlayStation";

export default function InstalacionPlaystation() {
  const [activeTab, setActiveTab] = useState("primaria");
  const [modalImage, setModalImage] = useState(null);

  const openZoom = (src, title) => {
    setModalImage({ src, title });
  };

  const closeZoom = () => {
    setModalImage(null);
  };

  return (
    <div className="install-ps-root">
      <Helmet>
        <title>Cómo Instalar Juegos en PS4 y PS5 | Cuenta Primaria y Secundaria - PandaStore</title>
        <meta name="description" content="Aprende cómo configurar y activar juegos digitales en PlayStation 4 y PlayStation 5. Guía oficial para cuenta principal y secundaria con soporte 24/7." />
        <meta name="keywords" content="como instalar juegos ps5, cuenta primaria ps4 como funciona, cuenta secundaria ps5, guia playstation digital, soporte ps4 pandastore" />
        <meta property="og:title" content="Guía de Instalación PS4 y PS5 | PandaStore" />
        <meta property="og:description" content="Tutorial paso a paso para configurar tus juegos digitales en PS4 y PS5 en modalidad cuenta principal o secundaria." />
        <meta property="og:url" content="https://pandastoregaming.cl/instalacion-playstation" />
        <link rel="canonical" href="https://pandastoregaming.cl/instalacion-playstation" />
        <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "Cómo Configurar Juegos Digitales en PlayStation (PS4 y PS5)",
          "description": "Tutorial paso a paso para activar tu juego digital en consola PS4 o PS5 en modo cuenta primaria o cuenta secundaria.",
          "step": [
            { "@type": "HowToStep", "position": 1, "name": "Crear nuevo usuario", "text": "Enciende tu consola e inicia sesión agregando un nuevo usuario con los datos entregados por PandaStore." },
            { "@type": "HowToStep", "position": 2, "name": "Activar como principal o secundaria", "text": "Si compraste cuenta primaria, activa la consola como principal en Ajustes > Gestión de cuentas. Si compraste secundaria, déjala desactivada." },
            { "@type": "HowToStep", "position": 3, "name": "Descargar el juego desde la biblioteca", "text": "Ingresa a la Biblioteca de juegos o PlayStation Store y pon a descargar el título adquirido." }
          ]
        })}
        </script>
      </Helmet>
      {/* ── Título ── */}
      <header className="install-ps-header">
        <div className="install-ps-badge">
          <img src={playLogo} alt="PS" className="ps-badge-icon" />
          <span>GUÍA DE CONFIGURACIÓN Y ACTIVACIÓN</span>
        </div>
        <h1 className="install-ps-title">
          Instalación <span className="title-accent">PlayStation (PS4 & PS5)</span>
        </h1>
        <p className="install-ps-subtitle">
          Aprende cómo configurar tu juego digital en modalidad <strong>Cuenta Principal</strong> o <strong>Cuenta Secundaria</strong>.
        </p>
      </header>

      {/* ── Selector de Modalidad ── */}
      <div className="install-ps-tabs">
        <button
          className={`ps-tab-btn ${activeTab === "primaria" ? "active" : ""}`}
          onClick={() => setActiveTab("primaria")}
        >
          ⭐ Cuenta Principal (Juega en tu usuario)
        </button>
        <button
          className={`ps-tab-btn ${activeTab === "secundaria" ? "active" : ""}`}
          onClick={() => setActiveTab("secundaria")}
        >
          🎮 Cuenta Secundaria (Juega en el usuario entregado)
        </button>
      </div>

      {/* ── Contenido de la Modalidad ── */}
      {activeTab === "primaria" ? (
        <section className="install-ps-content-card">
          <div className="card-top-header">
            <h2>⭐ Guía Paso a Paso: Cuenta Principal</h2>
            <span className="mode-badge mode-primaria">Modalidad Principal</span>
          </div>

          <div className="card-guide-body">
            <p className="guide-intro">
              En la modalidad <strong>Principal</strong>, activas el usuario entregado como consola principal en tu PS4 o PS5. Esto te permite descargar el juego e iniciarlo directamente desde <strong>tu propio perfil de siempre</strong>, acumulando trofeos y jugando online con tu nombre de usuario habitual.
            </p>

            <div
              className="guide-image-wrapper zoomable"
              onClick={() => openZoom(primariaImg, "Guía Cuenta Principal PlayStation")}
            >
              <div className="image-zoom-badge">🔍 Toca para ampliar y arrastrar libremente</div>
              <img
                src={primariaImg}
                alt="Instrucciones Cuenta Principal PlayStation"
                className="guide-infographic-img"
              />
            </div>

            <div className="steps-summary-box">
              <h3>📋 Pasos Clave de Instalación:</h3>
              <ol className="ps-steps-list">
                <li>Añade un nuevo usuario en tu consola PS4 / PS5 ingresando con el correo y contraseña entregados por PandaStore.</li>
                <li>Activa la cuenta como <strong>Consola Principal / Compartir Consola</strong> en la configuración de la cuenta.</li>
                <li>Dirígete a la <strong>Biblioteca de Juegos</strong> y pon a descargar el título adquirido.</li>
                <li>Cambia a tu <strong>perfil personal de siempre</strong> y ¡a disfrutar! No necesitas volver a abrir la cuenta entregada.</li>
              </ol>
            </div>
          </div>
        </section>
      ) : (
        <section className="install-ps-content-card">
          <div className="card-top-header">
            <h2>🎮 Guía Paso a Paso: Cuenta Secundaria</h2>
            <span className="mode-badge mode-secundaria">Modalidad Secundaria</span>
          </div>

          <div className="card-guide-body">
            <p className="guide-intro">
              En la modalidad <strong>Secundaria</strong>, juegas ingresando directamente a la cuenta enviada por nuestro equipo. Requiere mantener la consola conectada a internet para validar las licencias de Sony.
            </p>

            <div
              className="guide-image-wrapper zoomable"
              onClick={() => openZoom(secundariaImg, "Guía Cuenta Secundaria PlayStation")}
            >
              <div className="image-zoom-badge">🔍 Toca para ampliar y arrastrar libremente</div>
              <img
                src={secundariaImg}
                alt="Instrucciones Cuenta Secundaria PlayStation"
                className="guide-infographic-img"
              />
            </div>

            <div className="steps-summary-box">
              <h3>📋 Pasos Clave de Instalación:</h3>
              <ol className="ps-steps-list">
                <li>Añade un nuevo usuario en tu consola con los datos entregados por PandaStore.</li>
                <li><strong>NO actives</strong> la cuenta como Principal (déjala como Secundaria sin compartir consola).</li>
                <li>Ingresa a la <strong>Biblioteca de Juegos</strong> y descarga el título.</li>
                <li>Inicia y juega el juego <strong>únicamente dentro de la cuenta entregada</strong> con conexión a internet activa.</li>
              </ol>
            </div>
          </div>
        </section>
      )}

      {/* ── Normas Importantes de Seguridad ── */}
      <div className="install-ps-important">
        <div className="important-title-row">
          <span className="imp-icon">🛡️</span>
          <h3>Reglas Importantes para Mantener la Garantía de por Vida</h3>
        </div>
        <ul className="important-rules-list">
          <li>
            <span className="rule-icon">🚫</span>
            <span><strong>PROHIBIDO MODIFICAR DATOS:</strong> No intentes cambiar la contraseña, correo de acceso o activar verificación en dos pasos.</span>
          </li>
          <li>
            <span className="rule-icon">🚫</span>
            <span><strong>NO ELIMINES LA CUENTA:</strong> La cuenta debe mantenerse dentro de tu consola para preservar las licencias del juego.</span>
          </li>
          <li>
            <span className="rule-icon">✅</span>
            <span><strong>GARANTÍA DE POR VIDA:</strong> Todas nuestras cuentas PSN son 100% legales. Tu compra cuenta con cobertura total ante bloqueos de licencias si respetas los pasos.</span>
          </li>
        </ul>
      </div>

      {/* ── Canales de Atención ── */}
      <footer className="install-ps-footer">
        <h3>💬 ¿Tienes dudas o necesitas ayuda personalizada?</h3>
        <p>Nuestro equipo de soporte te asiste en tiempo real para activar tu juego en minutos:</p>
        <div className="ps-footer-buttons">
          <a href={WSP_URL} target="_blank" rel="noopener noreferrer" className="ps-btn btn-wsp">
            <img src={wspLogo} alt="WhatsApp" className="ps-btn-img" />
            <span>WhatsApp (+56 9 7475 1810)</span>
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
