import React, { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import MagicBento from "../../components/MagicBento/MagicBento";
import "./LauncherDownloadPage.css";

import tutorialVideo from "../../assets/video tutorial exe/importante.mp4";
import activacionVideo from "../../assets/activacion.mp4";
import winLogo from "../../assets/logos/window.logo.png";

function TutorialVideoCard({ title, subtitle, badge, badgeColor, videoSrc, icon }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div
      className="video-card-inner"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: "24px 20px"
      }}
    >
      <div className="video-card-title-row" style={{ marginBottom: 4 }}>
        <span
          className="material-icons play-square-icon"
          style={{ color: badgeColor, fontSize: 26 }}
        >
          {icon}
        </span>
        <div>
          <h3 style={{ fontSize: 17, margin: 0, color: "#fff" }}>{title}</h3>
          <span style={{ fontSize: 12, color: badgeColor, fontWeight: 600 }}>
            {badge}
          </span>
        </div>
      </div>
      <p style={{ fontSize: 13, color: "#c9c5e8", margin: 0, lineHeight: 1.45 }}>
        {subtitle}
      </p>
      <div
        className="video-player-box"
        onClick={togglePlay}
        style={{
          position: "relative",
          borderRadius: 16,
          overflow: "hidden",
          background: "#000",
          border: `1.5px solid ${badgeColor}88`,
          width: "100%",
          aspectRatio: "16/9",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          cursor: "pointer"
        }}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          playsInline
          preload="auto"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "contain",
            background: "#000"
          }}
        >
          <source src={videoSrc} type="video/mp4" />
          Tu navegador no soporta la reproducción de video HTML5.
        </video>

        {!isPlaying && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.4)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              transition: "opacity 0.2s ease",
              pointerEvents: "none"
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${badgeColor}, #6c2cf5)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 0 25px ${badgeColor}aa`,
                color: "#fff"
              }}
            >
              <span
                className="material-icons"
                style={{ fontSize: 34, marginLeft: 4 }}
              >
                play_arrow
              </span>
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#ffffff",
                textShadow: "0 2px 8px rgba(0,0,0,0.8)"
              }}
            >
              ▶ Clic para reproducir video
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LauncherDownloadPage() {
  const WIN_DOWNLOAD_URL =
    "https://github.com/josemunoz32/tienda-panda-2.0/releases/download/v2.4.34/PandaStoreSetup.exe";

  const handleDownload = () => {
    window.open(WIN_DOWNLOAD_URL, "_blank");
  };

  return (
    <div className="launcher-download-container">
      <Helmet>
        <title>Descargar Panda Launcher Steam + Activador Oficial | PandaStore PC</title>
        <meta
          name="description"
          content="Descarga el instalador oficial todo en 1 de Panda Launcher Steam + Activador v2.4.34 para Windows 10/11. Gestiona tu biblioteca, añade DLCs y activa cualquier juego de Steam en 1 click."
        />
        <meta
          name="keywords"
          content="descargar pandastore launcher, activador steam pc, panda launcher steam activador, pandastore setup exe, launcher juegos pc, activador steam pandastore"
        />
        <meta
          property="og:title"
          content="Descargar Panda Launcher Steam + Activador Oficial | PandaStore PC"
        />
        <meta
          property="og:description"
          content="Instala y activa tus juegos de Steam en segundos con Panda Launcher + Activador integrado para Windows 10/11."
        />
        <meta property="og:url" content="https://pandastoregaming.cl/descargar-launcher" />
        <meta property="og:image" content="https://pandastoregaming.cl/favicon.png" />
        <link rel="canonical" href="https://pandastoregaming.cl/descargar-launcher" />
      </Helmet>

      <div className="launcher-download-card">
        {/* Header Hero Section */}
        <div className="launcher-hero-section">
          <div className="launcher-badge">
            <span className="badge-rocket">🚀</span> INSTALADOR TODO EN 1 OFICIAL
          </div>

          <div className="launcher-hero-logo-row">
            <img
              src={require("../../assets/logos/miicono.png")}
              alt="PandaStore Logo"
              className="launcher-hero-logo"
            />
            <h1 className="launcher-title">
              Panda Launcher Steam <br />
              <span className="title-purple">+ Activador</span>{" "}
              <span className="title-version">v2.4.34</span>
            </h1>
          </div>

          <p className="launcher-subtitle">
            Todo en un solo instalador: Panda Launcher oficial y Activador Steam integrado.
            Sincroniza tus juegos autorizados, añade DLCs, compatibilidad universal con
            ejecutables modificados y activa cualquier juego VIP en 1 solo click.
          </p>

          {/* Download Button Component (Solo Windows) */}
          <div
            className="launcher-actions"
            style={{ display: "flex", justifyContent: "center" }}
          >
            <button
              onClick={handleDownload}
              className="btn-download-hero"
              style={{ minWidth: 320 }}
            >
              <div
                className="btn-download-icon-wrap"
                style={{ background: "#00adef" }}
              >
                <img
                  src={winLogo}
                  alt="Windows"
                  style={{ width: 26, height: 26, objectFit: "contain" }}
                />
              </div>
              <div className="btn-download-text-wrap">
                <span className="btn-download-title">
                  Descargar Panda Launcher + Activador (111 MB)
                </span>
                <span className="btn-download-sub">
                  Versión v2.4.34 oficial • Todo en 1 (Launcher + Activador) • Windows 10/11
                </span>
              </div>
            </button>
          </div>

          {/* Release Notes Banner v2.4.34 */}
          <div className="launcher-release-notes-banner">
            <div className="release-notes-header">
              <span className="release-badge">✨ NOVEDADES DE LA VERSIÓN v2.4.34</span>
              <span className="release-date">Última actualización oficial</span>
            </div>
            <ul className="release-notes-list">
              <li>
                <span className="note-icon">🎮</span>
                <div>
                  <strong>Soporte Universal de Launchers y Fixes:</strong>
                  <span>
                    Compatibilidad directa con juegos que tienen ejecutables propios o modificados
                    como Red Dead Redemption 2, saga GTA, Online Fixes (Spacewar) y parches Ryuu.
                  </span>
                </div>
              </li>
              <li>
                <span className="note-icon">⚡</span>
                <div>
                  <strong>Botón "Jugar" Directo y Anti-Bloqueos:</strong>
                  <span>
                    Ejecuta el juego directamente reconociendo el lanzador correcto e inyectando
                    steam_appid.txt para evitar bloqueos o cierres de Steam.
                  </span>
                </div>
              </li>
              <li>
                <span className="note-icon">📂</span>
                <div>
                  <strong>Reconocimiento de Carpetas Locales:</strong>
                  <span>
                    Detecta juegos descargados en cualquier biblioteca de Steam (steamapps/common/) al
                    instante, incluso sin archivos de manifiesto .acf.
                  </span>
                </div>
              </li>
              <li>
                <span className="note-icon">🛡️</span>
                <div>
                  <strong>Respaldo Automático de Partidas:</strong>
                  <span>
                    Guarda copias de seguridad de tu progreso localmente en tu PC antes de cada inicio
                    de juego para que nunca pierdas tu partida.
                  </span>
                </div>
              </li>
              <li>
                <span className="note-icon">🔑</span>
                <div>
                  <strong>Activador Steam VIP Integrado:</strong>
                  <span>
                    Incluye el activador oficial para juegos con DRM y activación en 1 solo clic.
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Section 1: Pasos de Proceso y Funcionamiento en Windows (Grid 1-6) */}
        <div className="launcher-steps-section">
          <div className="section-header-title">
            <span className="material-icons section-title-icon">settings</span>
            <h2>¿CÓMO INSTALAR EN WINDOWS?</h2>
          </div>

          <div className="steps-six-grid">
            <div className="step-item-card">
              <div className="step-number-circle">1</div>
              <div className="step-icon-wrap">
                <span className="material-icons">download</span>
              </div>
              <div className="step-text-content">
                <h4>Descarga el Launcher</h4>
                <p>Descarga el instalador oficial todo en 1 de PandaStore para Windows.</p>
              </div>
            </div>

            <div className="step-item-card">
              <div className="step-number-circle">2</div>
              <div className="step-icon-wrap">
                <span className="material-icons">settings</span>
              </div>
              <div className="step-text-content">
                <h4>Abre el Instalador</h4>
                <p>Ejecuta PandaStoreSetup.exe y se instalará automáticamente en tu PC.</p>
              </div>
            </div>

            <div className="step-item-card">
              <div className="step-number-circle">3</div>
              <div className="step-icon-wrap">
                <span className="material-icons">verified_user</span>
              </div>
              <div className="step-text-content">
                <h4>Preparación del entorno</h4>
                <p>Se optimiza el sistema y se registran los componentes requeridos.</p>
              </div>
            </div>

            <div className="step-item-card">
              <div className="step-number-circle">4</div>
              <div className="step-icon-wrap">
                <span className="material-icons">person</span>
              </div>
              <div className="step-text-content">
                <h4>Inicia sesión</h4>
                <p>Ingresa con tu clave de licencia y accede a tus juegos autorizados.</p>
              </div>
            </div>

            <div className="step-item-card">
              <div className="step-number-circle">5</div>
              <div className="step-icon-wrap">
                <span className="material-icons">sports_esports</span>
              </div>
              <div className="step-text-content">
                <h4>Selecciona y descarga</h4>
                <p>Elige tus juegos favoritos y comienza la descarga directamente en Steam.</p>
              </div>
            </div>

            <div className="step-item-card">
              <div className="step-number-circle">6</div>
              <div className="step-icon-wrap">
                <span className="material-icons">check_circle</span>
              </div>
              <div className="step-text-content">
                <h4>¡Listo para jugar!</h4>
                <p>Disfruta de tus juegos de Steam con guardado en nube y sin complicaciones.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Dual Video Tutorials Section */}
        <div className="launcher-video-tutorial-section" id="tutorial-player-anchor">
          <div
            className="section-header-title"
            style={{ justifyContent: "center", marginBottom: 24 }}
          >
            <span
              className="material-icons section-title-icon"
              style={{ color: "#a259ff" }}
            >
              ondemand_video
            </span>
            <h2>VIDEOTUTORIALES: LAUNCHER Y ACTIVADOR</h2>
          </div>

          <div
            className="dual-videos-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: 24
            }}
          >
            {/* Video 1: Launcher & Instalación */}
            <TutorialVideoCard
              title="1. Descarga e Instalación del Launcher"
              subtitle="Aprende cómo descargar, instalar y sincronizar tu biblioteca de juegos autorizados y DLCs adquiridos."
              badge="Panda Launcher v2.4.34 Oficial"
              badgeColor="#ffd700"
              icon="rocket_launch"
              videoSrc={tutorialVideo}
            />

            {/* Video 2: Activación de Juegos VIP con Activador */}
            <TutorialVideoCard
              title="2. Activación con Activador Steam"
              subtitle="Paso a paso para generar tu código con PandaStoreActivator y activar cualquier juego VIP en Steam en segundos."
              badge="Generar Código y Activación 1-Click"
              badgeColor="#00f5d4"
              icon="bolt"
              videoSrc={activacionVideo}
            />
          </div>
        </div>

        {/* Section 3: Magic Bento Features */}
        <div className="magic-bento-section-wrapper">
          <div className="section-header-title">
            <span className="star-icon">⭐</span>
            <h2>Características exclusivas del Launcher</h2>
          </div>
          <MagicBento
            textAutoHide={false}
            enableStars={true}
            enableSpotlight={true}
            enableBorderGlow={true}
            enableTilt={true}
            enableMagnetism={true}
            clickEffect={true}
            spotlightRadius={320}
            particleCount={14}
            glowColor="162, 89, 255"
            cards={[
              {
                color: "rgba(18, 14, 34, 0.9)",
                title: "Compatibilidad Universal v2.4.34",
                description:
                  "Soporte inteligente para launchers modificados (RDR2, GTA, Online Fixes), inyección directa de AppID y ejecución 100% optimizada sin bloqueos de Steam.",
                label: "NUEVO v2.4.34",
                icon: "⚡"
              },
              {
                color: "rgba(18, 14, 34, 0.9)",
                title: "Seguridad Avanzada",
                description:
                  "Token de acceso oculto en memoria. Nadie puede robar tus credenciales aunque descompilen el programa.",
                label: "SEGURIDAD",
                icon: "🔐"
              },
              {
                color: "rgba(18, 14, 34, 0.9)",
                title: "Anti-Crasheos",
                description:
                  "Sistema de captura global de errores. Si algo falla, el Launcher lo registra y sigue funcionando.",
                label: "ESTABILIDAD",
                icon: "🛡️"
              },
              {
                color: "rgba(18, 14, 34, 0.9)",
                title: "Auto-Actualización",
                description:
                  "Se actualiza solo al abrirse. Sin descargar nada manualmente, siempre tienes la última versión.",
                label: "AUTO-UPDATE",
                icon: "🚀"
              },
              {
                color: "rgba(18, 14, 34, 0.9)",
                title: "Soporte 24/7",
                description:
                  "Estamos para ayudarte en todo momento con asistencia remota y directa vía WhatsApp.",
                label: "ASISTENCIA",
                icon: "💬"
              }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
