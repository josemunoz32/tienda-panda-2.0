import React, { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import "./LauncherDownloadPage.css";

import winLogo from "../../assets/logos/window.logo.png";

// Videos alojados en GitHub Releases (no gastan transferencia de Firebase Hosting)
const tutorialVideo = "https://github.com/josemunoz32/tienda-panda-2.0/releases/download/media-videos/tutorial-launcher.mp4";
const activacionVideo = "https://github.com/josemunoz32/tienda-panda-2.0/releases/download/media-videos/tutorial-activacion.mp4";

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
          preload="none"
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
    "https://github.com/josemunoz32/tienda-panda-2.0/releases/download/v2.4.42/PandaStoreSetup.exe";

  const handleDownload = () => {
    window.open(WIN_DOWNLOAD_URL, "_blank");
  };

  return (
    <div className="launcher-download-container">
      <Helmet>
        <title>Descargar Panda Launcher Steam + Activador Oficial | PandaStore PC</title>
        <meta
          name="description"
          content="Descarga Panda Launcher para Windows 10/11: tus juegos quedan directamente en tu biblioteca de Steam. Incluye videotutoriales y guía de instalación paso a paso."
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
        {/* Título + descarga */}
        <div className="launcher-hero-section">
          <div className="launcher-badge">
            <img src={winLogo} alt="" className="launcher-badge-win" /> SOLO PARA WINDOWS 10 / 11
          </div>

          <div className="launcher-hero-logo-row">
            <img
              src={require("../../assets/logos/miicono.png")}
              alt="PandaStore Logo"
              className="launcher-hero-logo"
            />
            <h1 className="launcher-title">
              Panda Launcher <span className="title-purple">Steam</span>
            </h1>
          </div>

          <p className="launcher-subtitle">
            Instala el launcher oficial de PandaStore y tus juegos quedan{" "}
            <strong>directamente en tu biblioteca de Steam</strong>, en tu propia cuenta.
          </p>

          <div className="launcher-highlights">
            <span className="launcher-highlight">
              <span className="material-icons">sports_esports</span> Juegos directo a tu biblioteca
            </span>
            <span className="launcher-highlight">
              <span className="material-icons">desktop_windows</span> Windows 10 / 11
            </span>
            <span className="launcher-highlight">
              <span className="material-icons">autorenew</span> Se actualiza solo
            </span>
          </div>

          <div className="launcher-actions">
            <button onClick={handleDownload} className="btn-download-hero">
              <div className="btn-download-icon-wrap" style={{ background: "#00adef" }}>
                <img src={winLogo} alt="Windows" style={{ width: 26, height: 26, objectFit: "contain" }} />
              </div>
              <div className="btn-download-text-wrap">
                <span className="btn-download-title">Descargar para Windows</span>
                <span className="btn-download-sub">PandaStoreSetup.exe • 112 MB • Windows 10 / 11</span>
              </div>
              <span className="material-icons btn-download-arrow">download</span>
            </button>
          </div>
        </div>

        {/* Videos */}
        <div className="launcher-video-tutorial-section" id="tutorial-player-anchor">
          <div className="section-header-title launcher-section-center">
            <span className="material-icons section-title-icon" style={{ color: "#a259ff" }}>
              ondemand_video
            </span>
            <h2>VIDEOTUTORIALES</h2>
          </div>

          <div className="dual-videos-grid">
            <TutorialVideoCard
              title="1. Descarga e instalación del Launcher"
              subtitle="Cómo descargar, instalar e iniciar sesión para que tus juegos queden en tu biblioteca de Steam."
              badge="Panda Launcher"
              badgeColor="#ffd700"
              icon="rocket_launch"
              videoSrc={tutorialVideo}
            />
            <TutorialVideoCard
              title="2. Activación con el Activador Steam"
              subtitle="Paso a paso para activar tus juegos VIP en Steam en segundos."
              badge="Activación en 1 clic"
              badgeColor="#00f5d4"
              icon="bolt"
              videoSrc={activacionVideo}
            />
          </div>
        </div>

        {/* Cómo instalar */}
        <div className="launcher-steps-section">
          <div className="section-header-title launcher-section-center">
            <span className="material-icons section-title-icon">settings</span>
            <h2>¿CÓMO INSTALAR EN WINDOWS?</h2>
          </div>

          <div className="steps-six-grid">
            {[
              ["download", "Descarga el Launcher", "Presiona el botón de descarga y guarda el instalador oficial para Windows."],
              ["settings", "Abre el instalador", "Ejecuta PandaStoreSetup.exe y se instalará automáticamente en tu PC."],
              ["verified_user", "Preparación automática", "El launcher instala por sí solo los componentes que necesitan tus juegos."],
              ["person", "Inicia sesión", "Ingresa tu código de acceso y verás tus juegos autorizados."],
              ["sports_esports", "Agrega tus juegos", "Tus juegos quedan directamente en tu biblioteca de Steam, listos para descargar."],
              ["check_circle", "¡Listo para jugar!", "Abre Steam, descarga el juego y a disfrutar."],
            ].map(([icon, title, text], i) => (
              <div className="step-item-card" key={title}>
                <div className="step-number-circle">{i + 1}</div>
                <div className="step-icon-wrap">
                  <span className="material-icons">{icon}</span>
                </div>
                <div className="step-text-content">
                  <h4>{title}</h4>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
