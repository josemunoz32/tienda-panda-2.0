import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import MagicBento from "../../components/MagicBento/MagicBento";
import "./LauncherDownloadPage.css";

import tutorialVideo from "../../assets/video tutorial exe/importante.mp4";
import activacionVideo from "../../assets/activacion.mp4";
import winLogo from "../../assets/logos/window.logo.png";
import linuxLogo from "../../assets/logos/linux.png";

export default function LauncherDownloadPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);
  const [activeTab, setActiveTab] = useState("windows"); // 'windows' | 'steamdeck'
  const [copiedCmd, setCopiedCmd] = useState(false);

  // Download Progress States
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState("");

  const deckOverrideCmd = 'WINEDLLOVERRIDES="dwmapi,winmm,xinput1_4=n,b" %command%';

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(deckOverrideCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  const WIN_GOFILE_URL = "https://github.com/josemunoz32/tienda-panda-2.0/releases/download/v2.4.23/PandaStoreSetup.exe"; // Instalador Todo en 1 v2.4.23 oficial (GitHub Releases CDN alta velocidad)
  const DECK_CARD_ELEMENT = (
    <div className="platform-card deck disabled">
      <div className="card-badge coming-soon">PRÓXIMAMENTE</div>
      <div className="card-header">
        <span className="platform-icon">🎮</span>
        <div>
          <h3>PandaStore Deck (Linux / SteamOS)</h3>
          <span className="version-tag">En Desarrollo v3.0</span>
        </div>
      </div>
      <p className="card-desc">
        Versión nativa optimizada para Steam Deck y sistemas Linux en desarrollo continuo.
      </p>
      <div className="card-features">
        <div className="feature-item">
          <span className="check">⏳</span> Próximamente Soporte 1-Click
        </div>
        <div className="feature-item">
          <span className="check">🛠️</span> Optimización para SteamOS
        </div>
      </div>
      <button className="btn-download btn-disabled" disabled>
        ⏳ Próximamente
      </button>
    </div>
  );

  const handleDownloadWithProgress = () => {
    window.open(WIN_GOFILE_URL, "_blank");
  };

  const handleDownloadDeckWithProgress = () => {
    // Steam Deck download is disabled (Coming Soon v3.0)
  };

  useEffect(() => {
    fetchGamesFromFirestore();
  }, []);

  const fetchGamesFromFirestore = async () => {
    setLoadingGames(true);
    try {
      const snap = await getDocs(collection(db, "games"));
      const list = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setGames(list);
    } catch (err) {
      console.error("Error al cargar juegos de Firestore:", err);
    } finally {
      setLoadingGames(false);
    }
  };

  const filteredGames = games.filter((g) => {
    const q = searchTerm.toLowerCase();
    return (
      (g.name && g.name.toLowerCase().includes(q)) ||
      (g.app_id && g.app_id.includes(q)) ||
      (g.steam_folder_name && g.steam_folder_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="launcher-download-container">
      <Helmet>
        <title>Descargar Panda Launcher Steam + Activador Oficial | PandaStore PC</title>
        <meta name="description" content="Descarga el instalador oficial todo en 1 de Panda Launcher Steam + Activador v2.4.22 para Windows 10/11. Todo en 1: gestiona biblioteca, añade DLCs y activa cualquier juego de Steam en 1 click." />
        <meta name="keywords" content="descargar pandastore launcher, activador steam pc, panda launcher steam activador, pandastore setup exe, launcher juegos pc, activador steam pandastore, instalador steam deck" />
        <meta property="og:title" content="Descargar Panda Launcher Steam + Activador Oficial | PandaStore PC" />
        <meta property="og:description" content="Instala y activa tus juegos de Steam en segundos con Panda Launcher + Activador integrado. Compatible con Windows 10/11 y Steam Deck." />
        <meta property="og:url" content="https://pandastoreupdate.web.app/descargar-launcher" />
        <meta property="og:image" content="https://pandastoreupdate.web.app/favicon.png" />
        <meta name="twitter:title" content="Panda Launcher Steam + Activador Oficial | PandaStore PC" />
        <meta name="twitter:description" content="Descarga oficial y segura del instalador todo en 1 Panda Launcher Steam + Activador v2.4.22 para Windows y SteamOS." />
        <meta name="twitter:image" content="https://pandastoreupdate.web.app/favicon96.png" />
        <link rel="canonical" href="https://pandastoreupdate.web.app/descargar-launcher" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Panda Launcher Steam + Activador",
            "operatingSystem": "Windows 10, Windows 11, SteamOS (Linux)",
            "applicationCategory": "GameApplication",
            "softwareVersion": "2.4.22",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "publisher": {
              "@type": "Organization",
              "name": "PandaStore",
              "url": "https://pandastoreupdate.web.app"
            }
          })}
        </script>
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
              <span className="title-purple">+ Activador</span> <span className="title-version">v2.4.22</span>
            </h1>
          </div>

          <p className="launcher-subtitle">
            Todo en un solo instalador: Panda Launcher oficial y Activador Steam integrado. Sincroniza tus juegos autorizados, añade DLCs y activa cualquier juego VIP en 1 solo click.
          </p>

          {/* Download Button Component */}
          <div className="launcher-actions" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {!isDownloading ? (
              <>
                <button onClick={handleDownloadWithProgress} className="btn-download-hero" style={{ minWidth: 280 }}>
                  <div className="btn-download-icon-wrap" style={{ background: '#00adef' }}>
                    <img src={winLogo} alt="Windows" style={{ width: 26, height: 26, objectFit: 'contain' }} />
                  </div>
                  <div className="btn-download-text-wrap">
                    <span className="btn-download-title">Descargar Panda Launcher + Activador (109 MB)</span>
                    <span className="btn-download-sub">Versión v2.4.22 oficial • Todo en 1 (Launcher + Activador) • Windows 10/11</span>
                  </div>
                </button>

                <button disabled className="btn-download-hero" style={{ background: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', opacity: 0.7, cursor: 'not-allowed' }}>
                  <div className="btn-download-icon-wrap" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <img src={linuxLogo} alt="Steam Deck / Linux" style={{ width: 28, height: 28, objectFit: 'contain', filter: 'grayscale(100%)' }} />
                  </div>
                  <div className="btn-download-text-wrap">
                    <span className="btn-download-title">PandaStore (Steam Deck)</span>
                    <span className="btn-download-sub">⏳ En Desarrollo • Próximamente v3.0</span>
                  </div>
                </button>
              </>
            ) : (
              <div className="download-progress-container">
                <div className="download-progress-status">
                  <span className="spinner-icon">⚡</span>
                  <span className="status-text">{downloadStatus}</span>
                </div>
                <div className="download-progress-bar-track">
                  <div
                    className="download-progress-bar-fill"
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          <section className="launcher-entitlements-guide" aria-label="Guía de biblioteca y DLC">
            <div>
              <span className="launcher-guide-eyebrow">GUÍA ÚNICA</span>
              <h2>Tu juego base y tus DLC, siempre en la misma biblioteca</h2>
              <p>Ingresa con la clave entregada por PandaStore. El launcher conserva tus licencias anteriores y sincroniza los DLC nuevos sin quitar el juego base.</p>
            </div>
            <div className="launcher-guide-steps">
              <div><strong>1. Descarga</strong><span>Instala Panda Launcher + Activador v2.4.22 con el instalador oficial.</span></div>
              <div><strong>2. Sincroniza</strong><span>Consulta tu biblioteca y las compras pendientes.</span></div>
              <div><strong>3. Agrega DLC</strong><span>Cuando compres DLC después, abre el mismo launcher y selecciónalos desde tu biblioteca.</span></div>
              <div><strong>4. Códigos oficiales</strong><span>Si tu pedido incluye una clave oficial o activación VIP, usa el Activador integrado en tu PC.</span></div>
            </div>
          </section>
        </div>

        {/* System Selector Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
          <button
            onClick={() => setActiveTab("windows")}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 24px',
              borderRadius: 24,
              border: activeTab === 'windows' ? '2px solid #a259ff' : '1px solid rgba(255,255,255,0.1)',
              background: activeTab === 'windows' ? 'rgba(162,89,255,0.25)' : 'rgba(255,255,255,0.04)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s'
            }}
          >
            <img src={winLogo} alt="Windows" style={{ width: 18, height: 18 }} /> Guía para Windows
          </button>

          <button
            onClick={() => setActiveTab("rogally")}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 24px',
              borderRadius: 24,
              border: activeTab === 'rogally' ? '2px solid #ff0055' : '1px solid rgba(255,255,255,0.1)',
              background: activeTab === 'rogally' ? 'rgba(255,0,85,0.25)' : 'rgba(255,255,255,0.04)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s'
            }}
          >
            🎮 Guía ASUS ROG Ally / Portátiles
          </button>

          <button
            onClick={() => setActiveTab("steamdeck")}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 24px',
              borderRadius: 24,
              border: activeTab === 'steamdeck' ? '2px solid #66c0f4' : '1px solid rgba(255,255,255,0.1)',
              background: activeTab === 'steamdeck' ? 'rgba(102,192,244,0.25)' : 'rgba(255,255,255,0.04)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s'
            }}
          >
            <img src={linuxLogo} alt="Linux" style={{ width: 18, height: 18 }} /> Guía para Steam Deck (SteamOS)
          </button>
        </div>

        {/* WINDOWS TAB CONTENT */}
        {activeTab === "windows" && (
          <>
            {/* Section 1: Pasos de Proceso y Funcionamiento (Grid 1-6) */}
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
                    <p>Descarga el ejecutable oficial de PandaStore para Windows.</p>
                  </div>
                </div>

                <div className="step-item-card">
                  <div className="step-number-circle">2</div>
                  <div className="step-icon-wrap">
                    <span className="material-icons">settings</span>
                  </div>
                  <div className="step-text-content">
                    <h4>Abre el Launcher</h4>
                    <p>El launcher portátil se ejecuta y configura automáticamente.</p>
                  </div>
                </div>

                <div className="step-item-card">
                  <div className="step-number-circle">3</div>
                  <div className="step-icon-wrap">
                    <span className="material-icons">verified_user</span>
                  </div>
                  <div className="step-text-content">
                    <h4>Preparación del entorno</h4>
                    <p>Se optimiza el sistema y se registran los componentes.</p>
                  </div>
                </div>

                <div className="step-item-card">
                  <div className="step-number-circle">4</div>
                  <div className="step-icon-wrap">
                    <span className="material-icons">person</span>
                  </div>
                  <div className="step-text-content">
                    <h4>Inicia sesión</h4>
                    <p>Ingresa con tu cuenta y accede a todo el catálogo.</p>
                  </div>
                </div>

                <div className="step-item-card">
                  <div className="step-number-circle">5</div>
                  <div className="step-icon-wrap">
                    <span className="material-icons">sports_esports</span>
                  </div>
                  <div className="step-text-content">
                    <h4>Selecciona y descarga</h4>
                    <p>Elige tus juegos favoritos y comienza la descarga directamente.</p>
                  </div>
                </div>

                <div className="step-item-card">
                  <div className="step-number-circle">6</div>
                  <div className="step-icon-wrap">
                    <span className="material-icons">check_circle</span>
                  </div>
                  <div className="step-text-content">
                    <h4>¡Listo para jugar!</h4>
                    <p>Disfruta de tus juegos de Steam sin complicaciones.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Dual Video Tutorials Section */}
            <div className="launcher-video-tutorial-section" id="tutorial-player-anchor">
              <div className="section-header-title" style={{ justifyContent: 'center', marginBottom: 24 }}>
                <span className="material-icons section-title-icon" style={{ color: '#a259ff' }}>ondemand_video</span>
                <h2>VIDEOTUTORIALES: LAUNCHER Y ACTIVADOR</h2>
              </div>

              <div className="dual-videos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
                {/* Video 1: Launcher & Instalación */}
                <div className="video-card-inner" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '24px 20px' }}>
                  <div className="video-card-title-row" style={{ marginBottom: 4 }}>
                    <span className="material-icons play-square-icon" style={{ color: '#ffd700', fontSize: 26 }}>rocket_launch</span>
                    <div>
                      <h3 style={{ fontSize: 17, margin: 0, color: '#fff' }}>1. Descarga e Instalación del Launcher</h3>
                      <span style={{ fontSize: 12, color: '#ffd700', fontWeight: 600 }}>Panda Launcher v2.4.22 Oficial</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: '#c9c5e8', margin: 0, lineHeight: 1.45 }}>
                    Aprende cómo descargar, instalar y sincronizar tu biblioteca de juegos autorizados y DLCs adquiridos.
                  </p>
                  <div className="video-player-box" style={{ borderRadius: 16, overflow: 'hidden', background: '#000', border: '1.5px solid rgba(255, 215, 0, 0.35)', width: '100%', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                    <video
                      controls
                      controlsList="nodownload"
                      playsInline
                      preload="metadata"
                      className="tutorial-video-player"
                      style={{ width: '100%', display: 'block', maxHeight: 300, objectFit: 'cover' }}
                    >
                      <source src={tutorialVideo} type="video/mp4" />
                      Tu navegador no soporta la reproducción de video MP4.
                    </video>
                  </div>
                </div>

                {/* Video 2: Activación de Juegos VIP con Activador */}
                <div className="video-card-inner" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '24px 20px' }}>
                  <div className="video-card-title-row" style={{ marginBottom: 4 }}>
                    <span className="material-icons play-square-icon" style={{ color: '#00f5d4', fontSize: 26 }}>bolt</span>
                    <div>
                      <h3 style={{ fontSize: 17, margin: 0, color: '#fff' }}>2. Activación con Activador Steam</h3>
                      <span style={{ fontSize: 12, color: '#00f5d4', fontWeight: 600 }}>Generar Código y Activación 1-Click</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: '#c9c5e8', margin: 0, lineHeight: 1.45 }}>
                    Paso a paso para generar tu código con PandaStoreActivator y activar cualquier juego VIP en Steam en segundos.
                  </p>
                  <div className="video-player-box" style={{ borderRadius: 16, overflow: 'hidden', background: '#000', border: '1.5px solid rgba(0, 245, 212, 0.35)', width: '100%', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                    <video
                      controls
                      controlsList="nodownload"
                      playsInline
                      preload="metadata"
                      className="tutorial-video-player"
                      src={activacionVideo}
                      style={{ width: '100%', display: 'block', maxHeight: 300, objectFit: 'cover' }}
                    >
                      Tu navegador no soporta la reproducción de video HTML5.
                    </video>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ASUS ROG ALLY & PORTÁTILES WINDOWS TAB CONTENT */}
        {activeTab === "rogally" && (
          <div className="launcher-steps-section" style={{ textAlign: 'left' }}>
            <div className="section-header-title" style={{ justifyContent: 'center' }}>
              <span className="material-icons section-title-icon" style={{ color: '#ff0055' }}>sports_esports</span>
              <h2>GUÍA OPTIMIZADA: ASUS ROG ALLY, LEGION GO Y MSI CLAW</h2>
            </div>

            <p style={{ textAlign: 'center', color: '#e2d9f3', fontSize: 14, maxWidth: 800, margin: '0 auto 24px auto' }}>
              Las consolas portátiles con Windows 11 (como la <strong>ASUS ROG Ally</strong>, <strong>Lenovo Legion Go</strong> o <strong>MSI Claw</strong>) ejecutan la versión oficial completa de PandaStore Launcher. Sigue estos pasos para que nunca falle y evitar que Steam se quede bloqueado en segundo plano:
            </p>

            {/* Steps Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '24px 0' }}>
              <div className="step-item-card" style={{ padding: 18, border: '1px solid rgba(255, 0, 85, 0.3)' }}>
                <div className="step-number-circle" style={{ background: '#ff0055', color: '#fff' }}>1</div>
                <div>
                  <h4 style={{ color: '#ff4d88', margin: '0 0 6px 0', fontSize: 15 }}>Modo Control de Escritorio</h4>
                  <p style={{ fontSize: 12.5, color: '#ccc', margin: 0 }}>
                    Presiona el botón <strong>Centro de Comando</strong> en tu ROG Ally (botón izquierdo con el logo de ASUS) y cambia el modo de mando a <strong>Modo Escritorio (Desktop Mode)</strong>. Así podrás usar el joystick como ratón y los gatillos como clics táctiles.
                  </p>
                </div>
              </div>

              <div className="step-item-card" style={{ padding: 18, border: '1px solid rgba(255, 0, 85, 0.3)' }}>
                <div className="step-number-circle" style={{ background: '#ff0055', color: '#fff' }}>2</div>
                <div>
                  <h4 style={{ color: '#ff4d88', margin: '0 0 6px 0', fontSize: 15 }}>Ejecutar como Administrador</h4>
                  <p style={{ fontSize: 12.5, color: '#ccc', margin: 0 }}>
                    Descarga el instalador oficial todo en 1 (PandaStoreSetup.exe). Ejecútalo para instalar Panda Launcher y el Activador en tu dispositivo Windows 11.
                  </p>
                </div>
              </div>

              <div className="step-item-card" style={{ padding: 18, border: '1.5px solid #10b981' }}>
                <div className="step-number-circle" style={{ background: '#10b981', color: '#fff' }}>3</div>
                <div>
                  <h4 style={{ color: '#34d399', margin: '0 0 6px 0', fontSize: 15 }}>Activar e Iniciar Descarga Automática</h4>
                  <p style={{ fontSize: 12.5, color: '#ccc', margin: 0 }}>
                    Ingresa tu clave en el launcher, busca tu juego y presiona <strong>"⚡ Activar"</strong>. El launcher cerrará Steam limpiamente, inyectará los parches y <strong>abrirá automáticamente la ventana emergente de descarga en Steam</strong>.
                  </p>
                </div>
              </div>

              <div className="step-item-card" style={{ padding: 18, border: '1px solid rgba(255, 0, 85, 0.3)' }}>
                <div className="step-number-circle" style={{ background: '#ff0055', color: '#fff' }}>4</div>
                <div>
                  <h4 style={{ color: '#ff4d88', margin: '0 0 6px 0', fontSize: 15 }}>¡Volver a Modo Mando / Jugar!</h4>
                  <p style={{ fontSize: 12.5, color: '#ccc', margin: 0 }}>
                    Una vez que el juego comience a descargarse, cambia nuevamente el Centro de Comando a <strong>Modo Mando (Gamepad Mode)</strong> o abre Steam Big Picture para jugar a 120Hz fluidos con los controles integrados.
                  </p>
                </div>
              </div>
            </div>

            {/* Soluciones a problemas frecuentes en ROG Ally */}
            <div style={{ background: 'linear-gradient(135deg, rgba(255,0,85,0.08), rgba(20,16,36,0.95))', border: '1.5px solid rgba(255,0,85,0.4)', borderRadius: 16, padding: 24, margin: '24px 0' }}>
              <h3 style={{ color: '#ff4d88', marginTop: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 17 }}>
                <span className="material-icons">build</span> ¿Steam carga pero no abre o queda en bucle en ROG Ally?
              </h3>
              <p style={{ fontSize: 13.5, color: '#e2d9f3', lineHeight: 1.6 }}>
                En Windows 11 para consolas portátiles, Steam a menudo queda suspendido en segundo plano o bloqueado por Armoury Crate. Aplica estas 2 soluciones rápidas:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 14 }}>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <h5 style={{ color: '#00ffcc', margin: '0 0 8px 0', fontSize: 14 }}>🔧 Solución 1: Cerrar procesos colgados de Steam</h5>
                  <p style={{ fontSize: 12, color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
                    Abre el Administrador de Tareas (Ctrl+Shift+Esc o táctil), busca <strong>Steam</strong> y finaliza todas las tareas de Steam. Al volver a abrir PandaStore Launcher y presionar "Activar", Steam se iniciará limpio y sin bloqueos.
                  </p>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.4)', padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <h5 style={{ color: '#00ffcc', margin: '0 0 8px 0', fontSize: 14 }}>🛡️ Solución 2: Exclusión en Windows Defender</h5>
                  <p style={{ fontSize: 12, color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
                    Ve a <strong>Seguridad de Windows</strong> &gt; <strong>Protección contra virus</strong> &gt; <strong>Administrar configuración</strong> &gt; <strong>Exclusiones</strong> &gt; Agregar exclusión de carpeta: <code>C:\Program Files (x86)\Steam</code> para que Defender no interfiera con los archivos inyectados.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEAM DECK TAB CONTENT */}
        {activeTab === "steamdeck" && (
          <div className="launcher-steps-section" style={{ textAlign: 'left' }}>
            <div className="section-header-title" style={{ justifyContent: 'center' }}>
              <img src={linuxLogo} alt="Steam Deck" style={{ width: 28, height: 28 }} />
              <h2>PASO A PASO: INSTALACIÓN EN STEAM DECK (STEAM OS)</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, margin: '24px 0' }}>
              <div className="step-item-card" style={{ padding: 16 }}>
                <div className="step-number-circle" style={{ background: '#66c0f4', color: '#1b2838' }}>1</div>
                <div>
                  <h4 style={{ color: '#66c0f4', margin: '0 0 6px 0', fontSize: 15 }}>Modo Escritorio</h4>
                  <p style={{ fontSize: 12.5, color: '#ccc', margin: 0 }}>Entra al <strong>Modo Escritorio</strong> en tu Steam Deck y descarga <code>PandaStoreDeckSetup.exe</code>.</p>
                </div>
              </div>

              <div className="step-item-card" style={{ padding: 16 }}>
                <div className="step-number-circle" style={{ background: '#66c0f4', color: '#1b2838' }}>2</div>
                <div>
                  <h4 style={{ color: '#66c0f4', margin: '0 0 6px 0', fontSize: 15 }}>Añadir a Steam</h4>
                  <p style={{ fontSize: 12.5, color: '#ccc', margin: 0 }}>Abre Steam -&gt; <strong>Añadir un producto</strong> -&gt; <strong>Juego no de Steam</strong> y selecciona el ejecutable.</p>
                </div>
              </div>

              <div className="step-item-card" style={{ padding: 16 }}>
                <div className="step-number-circle" style={{ background: '#66c0f4', color: '#1b2838' }}>3</div>
                <div>
                  <h4 style={{ color: '#66c0f4', margin: '0 0 6px 0', fontSize: 15 }}>Activar Proton</h4>
                  <p style={{ fontSize: 12.5, color: '#ccc', margin: 0 }}>Propiedades -&gt; <strong>Compatibilidad</strong> -&gt; Marca "Forzar herramienta" y elige <strong>Proton Experimental</strong>.</p>
                </div>
              </div>

              <div className="step-item-card" style={{ padding: 16 }}>
                <div className="step-number-circle" style={{ background: '#66c0f4', color: '#1b2838' }}>4</div>
                <div>
                  <h4 style={{ color: '#66c0f4', margin: '0 0 6px 0', fontSize: 15 }}>Pegar Parámetro</h4>
                  <p style={{ fontSize: 12.5, color: '#ccc', margin: 0 }}>En <strong>Propiedades -&gt; General</strong> pega el parámetro obligatorio de abajo.</p>
                </div>
              </div>

              <div className="step-item-card" style={{ padding: 16, border: '1.5px solid #00ffcc' }}>
                <div className="step-number-circle" style={{ background: '#00ffcc', color: '#1b2838' }}>5</div>
                <div>
                  <h4 style={{ color: '#00ffcc', margin: '0 0 6px 0', fontSize: 15 }}>¡Abrir desde Steam!</h4>
                  <p style={{ fontSize: 12.5, color: '#ccc', margin: 0 }}>Haz clic en <strong>Jugar dentro de Steam</strong> (en Modo Escritorio o Modo Juego) y disfruta tus juegos.</p>
                </div>
              </div>
            </div>

            {/* COPYABLE COMMAND BOX FOR STEAM DECK */}
            <div style={{ background: 'rgba(27, 40, 56, 0.9)', border: '1.5px solid #66c0f4', borderRadius: 16, padding: 24, margin: '32px 0' }}>
              <h4 style={{ color: '#66c0f4', marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-icons">terminal</span> Paso 4: Parámetro de Lanzamiento Obligatorio (DLL Override)
              </h4>
              <p style={{ fontSize: 14, color: '#e2d9f3', marginBottom: 16 }}>
                En las <strong>Propiedades -&gt; General -&gt; Parámetros de lanzamiento</strong>, copia y pega exactamente esta línea para activar la compatibilidad oficial en SteamOS:
              </p>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#0a0e14', padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(102,192,244,0.3)' }}>
                <code style={{ flex: 1, color: '#00ffcc', fontFamily: 'monospace', fontSize: 13.5, wordBreak: 'break-all' }}>
                  {deckOverrideCmd}
                </code>
                <button
                  onClick={handleCopyCmd}
                  style={{
                    background: copiedCmd ? '#00c853' : '#66c0f4',
                    color: '#1b2838',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s'
                  }}
                >
                  <span className="material-icons" style={{ fontSize: 16 }}>{copiedCmd ? 'check' : 'content_copy'}</span>
                  {copiedCmd ? '¡Copiado!' : 'Copiar Parámetro'}
                </button>
              </div>
            </div>
          </div>
        )}

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
                color: 'rgba(18, 14, 34, 0.9)',
                title: 'Combinación Inteligente de Activaciones v2.4.8',
                description: 'Instalación optimizada de manifiestos oficiales PandaStore y parches en la nube para garantizar 100% compatibilidad.',
                label: 'NUEVO v2.4.8',
                icon: '⚡'
              },
              {
                color: 'rgba(18, 14, 34, 0.9)',
                title: 'Seguridad Avanzada',
                description: 'Token de acceso oculto en memoria. Nadie puede robar tus credenciales aunque descompilen el programa.',
                label: 'SEGURIDAD',
                icon: '🔐'
              },
              {
                color: 'rgba(18, 14, 34, 0.9)',
                title: 'Anti-Crasheos',
                description: 'Sistema de captura global de errores. Si algo falla, el Launcher lo registra y sigue funcionando.',
                label: 'ESTABILIDAD',
                icon: '🛡️'
              },
              {
                color: 'rgba(18, 14, 34, 0.9)',
                title: 'Auto-Actualización',
                description: 'Se actualiza solo al abrirse. Sin descargar nada manualmente, siempre tienes la última versión.',
                label: 'AUTO-UPDATE',
                icon: '🚀'
              },
              {
                color: 'rgba(18, 14, 34, 0.9)',
                title: 'Soporte 24/7',
                description: 'Estamos para ayudarte en todo momento con asistencia remota y directa vía WhatsApp.',
                label: 'ASISTENCIA',
                icon: '💬'
              }
            ]}
          />
        </div>

        {/* Big Bottom Catalog CTA Pill */}
        <div className="bottom-cta-container">
          <button
            className="btn-bottom-games-cta"
            onClick={() => setShowCatalog(!showCatalog)}
          >
            <span className="material-icons">sports_esports</span>
            <span>{showCatalog ? "Ocultar Catálogo de Juegos" : `¡Tu biblioteca de juegos, en un solo lugar! (${games.length} Títulos) →`}</span>
          </button>
        </div>

        {/* Dynamic Games List Section (Visible when toggled) */}
        {showCatalog && (
          <div className="catalog-games-section">
            <div className="catalog-header">
              <div>
                <h2 className="catalog-title">🎮 Catálogo de Juegos Compatibles ({games.length} Títulos)</h2>
                <p className="catalog-sub">Explora los títulos soportados por el launcher.</p>
              </div>
              <div className="catalog-search-wrapper">
                <input
                  type="text"
                  placeholder="🔎 Buscar por nombre (ej: Elden, RE4, FC25)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="catalog-search-input"
                />
              </div>
            </div>

            {loadingGames ? (
              <div className="catalog-loading">
                <div className="spinner"></div>
                <p>Cargando lista de juegos desde el servidor...</p>
              </div>
            ) : (
              <>
                <div className="catalog-count-badge">
                  {filteredGames.length} juegos encontrados
                </div>

                <div className="catalog-games-grid">
                  {filteredGames.map((game, index) => (
                    <div key={game.id || index} className="catalog-game-card">
                      <h4 className="game-title">{game.name || "Juego de Steam"}</h4>
                    </div>
                  ))}
                </div>

                {filteredGames.length === 0 && (
                  <div className="catalog-no-results">
                    🔍 No se encontraron juegos con la búsqueda "<strong>{searchTerm}</strong>".
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}




