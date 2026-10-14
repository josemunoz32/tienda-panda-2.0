import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import "./Terminos.css";
import wspLogo from "../../assets/logos/logowsp.png";
import igLogo from "../../assets/logos/logoig.png";
import nintendoLogo from "../../assets/logos/icono-nintendo.png";
import playstationLogo from "../../assets/logos/icono-play.png";
import streamingLogo from "../../assets/logos/streaming.png";

import steamLogo from "../../assets/logos/logosteam.png";

const WSP_URL = "https://wa.me/56974751810?text=Hola%20PandaStore!%20Tengo%20una%20consulta";

export default function Terminos() {
  const [activeTab, setActiveTab] = useState("nintendo");

  return (
    <div className="terminos-root">
      <Helmet>
        <title>Términos del Servicio y Garantía Oficial | PandaStore</title>
        <meta name="description" content="Consulta los términos de compra, políticas de garantía y activación para Steam PC, Nintendo Switch, PS4 y PS5 en PandaStore. Soporte 24/7 y seguridad garantizada." />
        <meta name="keywords" content="garantia pandastore, terminos y condiciones videojuegos digitales, politicas steam pc, garantia cuentas playstation, garantia switch pandastore" />
        <meta property="og:title" content="Términos del Servicio y Garantía Oficial | PandaStore" />
        <meta property="og:description" content="Políticas oficiales de compra y garantía 100% segura para todos tus videojuegos digitales en PandaStore." />
        <meta property="og:url" content="https://pandastoreupdate.web.app/terminos" />
        <meta property="og:image" content="https://pandastoreupdate.web.app/banner.png" />
        <link rel="canonical" href="https://pandastoreupdate.web.app/terminos" />
      </Helmet>
      {/* ── HERO HEADER COMPACTO ── */}
      <header className="terminos-hero">
        <h1 className="terminos-title">
          Términos y <span className="terminos-title-accent">Políticas de Garantía</span>
        </h1>
        <p className="terminos-subtitle">
          Selecciona una plataforma para ver sus reglas oficiales, condiciones y garantías detalladas.
        </p>

        {/* ── SELECTOR CIRCULAR DE CATEGORÍAS ── */}
        <div className="platform-circles-container">
          <button
            type="button"
            className={`platform-circle-btn ${activeTab === "nintendo" ? "active active-nintendo" : ""}`}
            onClick={() => setActiveTab("nintendo")}
          >
            <div className="circle-avatar circle-avatar--nintendo">
              <img src={nintendoLogo} alt="Nintendo Switch" className="circle-logo-img" />
            </div>
            <span className="circle-label">Nintendo Switch</span>
          </button>

          <button
            type="button"
            className={`platform-circle-btn ${activeTab === "playstation" ? "active active-playstation" : ""}`}
            onClick={() => setActiveTab("playstation")}
          >
            <div className="circle-avatar circle-avatar--playstation">
              <img src={playstationLogo} alt="PlayStation" className="circle-logo-img play-circle-icon" />
            </div>
            <span className="circle-label">PlayStation</span>
          </button>

          <button
            type="button"
            className={`platform-circle-btn ${activeTab === "steam" ? "active active-steam" : ""}`}
            onClick={() => setActiveTab("steam")}
          >
            <div className="circle-avatar circle-avatar--steam">
              <img src={steamLogo} alt="Steam PC" className="circle-logo-img" />
            </div>
            <span className="circle-label">Steam (PC)</span>
          </button>

          <button
            type="button"
            className={`platform-circle-btn ${activeTab === "streaming" ? "active active-streaming" : ""}`}
            onClick={() => setActiveTab("streaming")}
          >
            <div className="circle-avatar circle-avatar--streaming">
              <img src={streamingLogo} alt="Streaming" className="circle-logo-img" />
            </div>
            <span className="circle-label">Streaming</span>
          </button>

          <button
            type="button"
            className={`platform-circle-btn ${activeTab === "garantia" ? "active active-garantia" : ""}`}
            onClick={() => setActiveTab("garantia")}
          >
            <div className="circle-avatar circle-avatar--garantia">
              <span className="circle-emoji">🛡️</span>
            </div>
            <span className="circle-label">Resumen</span>
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════
          SECCIÓN 1: NINTENDO SWITCH
      ══════════════════════════════════════ */}
      {/* ══════════════════════════════════════
          SECCIÓN 1: NINTENDO SWITCH
      ══════════════════════════════════════ */}
      {activeTab === "nintendo" && (
        <section className="terminos-card terminos-card--nintendo" id="sec-nintendo">
          <div className="card-header">
            <div className="card-header-title">
              <img src={nintendoLogo} alt="Nintendo" className="platform-header-img" />
              <h2>Nintendo Switch — Cuentas Digitales</h2>
            </div>
            <span className="card-tag tag-nintendo">Garantía 7 Días</span>
          </div>

          <div className="card-body">
            <div className="block-group">
              <h3 className="block-title">📦 1. Naturaleza de las Cuentas Nintendo</h3>
              <p className="block-desc">
                Recibirás las credenciales de una cuenta digital autorizada con el juego cargado para descargar e instalar en tu consola.
              </p>
              <div className="card-alert alert-warning">
                <div className="alert-header">
                  <span className="alert-icon">⚠️</span>
                  <h4>Duración Indefinida & Garantía de 7 Días</h4>
                </div>
                <p>
                  Las cuentas de Nintendo Switch <strong>NO SON PERMANENTES</strong>. Pueden durar poco o mucho tiempo (semanas, meses o años). Por este motivo de costo tan reducido, <strong>la garantía oficial cubre estrictamente los primeros 7 días (1 semana)</strong> desde la entrega.
                </p>
                <ul className="alert-list">
                  <li><strong>Causas de anulación inmediata de garantía:</strong> Cerrar sesión de la cuenta entregada, borrar el usuario de la consola o intentar modificar la contraseña.</li>
                </ul>
              </div>
            </div>

            <div className="block-group">
              <h3 className="block-title">▶️ 2. Modo de Instalación y Juego</h3>
              <ul className="info-list">
                <li><span className="li-icon">1️⃣</span><span>Añade el nuevo usuario a tu Nintendo Switch y descarga el juego desde la eShop.</span></li>
                <li><span className="li-icon">2️⃣</span><span>Juega desde tu <strong>perfil personal habitual</strong>.</span></li>
                <li><span className="li-icon">🚫</span><span>Nunca borres la cuenta entregada ni cambies sus datos de acceso.</span></li>
              </ul>
            </div>

            <div className="card-tip">
              <div className="tip-header">
                <span className="tip-icon">✈️</span>
                <h4>Tip Panda: Jugar en Modo Avión</h4>
              </div>
              <p>
                Al jugar títulos de un solo jugador con el <strong>Modo Avión activado</strong> se reduce la verificación en línea de Nintendo, lo cual ayuda a maximizar la duración del juego en tu consola.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════
          SECCIÓN 2: PLAYSTATION (PS4 / PS5)
      ══════════════════════════════════════ */}
      {activeTab === "playstation" && (
        <section className="terminos-card terminos-card--playstation" id="sec-playstation">
          <div className="card-header">
            <div className="card-header-title">
              <img src={playstationLogo} alt="PlayStation" className="platform-header-img play-header-icon" />
              <h2>PlayStation PS4 & PS5 — Cuentas Full Legales</h2>
            </div>
            <span className="card-tag tag-playstation">Garantía de por Vida</span>
          </div>

          <div className="card-body">
            <div className="block-group">
              <h3 className="block-title">📦 1. Cuentas Legales con Garantía De Por Vida</h3>
              <p className="block-desc">
                Todas nuestras cuentas de PlayStation (PS4 y PS5) son <strong>100% legales y oficiales</strong>. Cuentan con <strong>GARANTÍA DE POR VIDA (Lifetime)</strong> mientras se mantengan las normas de instalación intactas.
              </p>
              <ul className="info-list">
                <li>
                  <span className="li-icon">⭐</span>
                  <span><strong>Cuenta Principal:</strong> Puedes jugar desde tu perfil personal de siempre con trofeos y partidas guardadas en tu usuario.</span>
                </li>
                <li>
                  <span className="li-icon">🎮</span>
                  <span><strong>Cuenta Secundaria:</strong> Inicias el juego ingresando directamente al perfil entregado con conexión a internet.</span>
                </li>
              </ul>
            </div>

            <div className="card-alert alert-success">
              <div className="alert-header">
                <span className="alert-icon">🛡️</span>
                <h4>Cobertura Total PlayStation</h4>
              </div>
              <p>
                Garantizamos el soporte continuo ante cualquier eventualidad de licencias de Sony durante toda la vida útil del producto, siempre y cuando no se modifiquen los datos de acceso ni se elimine la cuenta de la consola.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════
          SECCIÓN 3: STEAM (PC) — CATÁLOGO & ACTIVACIÓN
      ══════════════════════════════════════ */}
      {activeTab === "steam" && (
        <section className="terminos-card terminos-card--steam" id="sec-steam">
          <div className="card-header">
            <div className="card-header-title">
              <img src={steamLogo} alt="Steam" className="platform-header-img" />
              <h2>Steam (PC) — Catálogo de Juegos & Launcher PandaStore</h2>
            </div>
            <span className="card-tag tag-steam">Garantía Total en Modo Seguro</span>
          </div>

          <div className="card-body">
            <div className="block-group">
              <h3 className="block-title">🎮 1. Naturaleza del Servicio Steam PC</h3>
              <p className="block-desc">
                Acceso a más de <strong>58.000 juegos y DLCs de Steam</strong> para computador personal (PC / Windows) mediante archivos de configuración, scripts de sincronización y PandaStore Launcher.
              </p>

              <div className="card-alert alert-success">
                <div className="alert-header">
                  <span className="alert-icon">🛡️</span>
                  <h4>Garantía Total Siempre que Jueguen en Modo Seguro</h4>
                </div>
                <p>
                  Tu compra cuenta con <strong>GARANTÍA TOTAL Y PERMANENTE</strong> siempre y cuando utilices el sistema en <strong>Modo Seguro</strong> según las instrucciones provistas. El juego queda instalado y configurado directamente en tu <strong>computador local</strong> sin alteraciones externas.
                </p>
              </div>
            </div>

            <div className="block-group">
              <h3 className="block-title">🕹️ 2. Modos de Juego Permitidos y Compatibilidad</h3>
              <div className="garantia-grid">
                <div className="garantia-box" style={{ borderColor: "rgba(0, 245, 212, 0.4)" }}>
                  <div className="box-title" style={{ color: "#00f5d4" }}>✅ Modo Campaña / Historia (100% Funcional)</div>
                  <p>Todos los títulos con modo campaña individual, aventura o un jugador funcionan al 100% de manera ilimitada y permanente en tu PC.</p>
                </div>
                <div className="garantia-box" style={{ borderColor: "rgba(162, 89, 255, 0.4)" }}>
                  <div className="box-title" style={{ color: "#c4b5fd" }}>👥 Cooperativo Local & Multijugador LAN</div>
                  <p>Juegos que soportan cooperativo en la misma pantalla (pantalla dividida), mandos múltiples o redes locales funcionan impecable.</p>
                </div>
                <div className="garantia-box" style={{ borderColor: "rgba(255, 180, 0, 0.4)" }}>
                  <div className="box-title" style={{ color: "#ffb400" }}>🏆 Logros de Steam (No Disponibles)</div>
                  <p>Los juegos activados no desbloquean ni sincronizan logros (achievements) en el perfil de Steam. El servicio está enfocado en disfrutar la historia y juego completo.</p>
                </div>
              </div>
            </div>

            <div className="block-group">
              <div className="card-alert alert-warning" style={{ borderColor: "#ef4444", background: "rgba(239, 68, 68, 0.08)" }}>
                <div className="alert-header">
                  <span className="alert-icon">🚫</span>
                  <h4 style={{ color: "#fca5a5" }}>NO SON Cuentas Full Access / Ni para Servidores Masivos Online</h4>
                </div>
                <p>
                  Los juegos están diseñados y garantizados <strong>únicamente para Modo Historia / Campaña individual y Cooperativo Local</strong>.
                </p>
                <ul className="alert-list">
                  <li><strong>Logros de Steam (Achievements):</strong> Los juegos se ejecutan en entorno local protegido, por lo que <strong>NO desbloquean ni registran logros en tu perfil de Steam</strong> ni otorgan cromos coleccionables. El servicio no incluye garantía ni soporte para logros.</li>
                  <li><strong>Servidores Masivos Oficiales Excluidos:</strong> No aplica para títulos 100% online que requieran servidores masivos oficiales con anti-cheats invasivos (como <em>Rust, PUBG, Apex Legends, Destiny 2, Warzone, Rainbow Six Siege</em>, etc.).</li>
                  <li><strong>Modo Online Comunitario:</strong> Solo unos pocos juegos específicos cuentan con soporte online comunitario o fix LAN; la inmensa mayoría es exclusivamente para un jugador o cooperativo local.</li>
                  <li><strong>Política de Compra y Devoluciones:</strong> No se realizan reembolsos ni cambios si el comprador adquirió el juego esperando jugar en servidores online masivos oficiales o conseguir logros en su perfil, ya que el servicio está claramente delimitado para modo historia y cooperativo local en PC.</li>
                  <li><strong>Garantía de PC Local:</strong> Tu activación queda protegida en tu máquina personal (HWID) con garantía permanente en Modo Seguro.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════
          SECCIÓN 4: STREAMING & SUSCRIPCIONES
      ══════════════════════════════════════ */}
      {activeTab === "streaming" && (
        <section className="terminos-card terminos-card--streaming" id="sec-streaming">
          <div className="card-header">
            <div className="card-header-title">
              <img src={streamingLogo} alt="Streaming" className="platform-header-img" />
              <h2>Streaming y Suscripciones Digitales</h2>
            </div>
            <span className="card-tag tag-streaming">Garantía x Período Adquirido</span>
          </div>

          <div className="card-body">
            <div className="block-group">
              <h3 className="block-title">📦 1. Cobertura Según Período Contratado</h3>
              <p className="block-desc">
                En servicios de streaming y membresías (Netflix, Disney+, YouTube Premium, PS Plus, Spotify, etc.), la garantía cubre <strong>EXACTAMENTE EL TIEMPO ADQUIRIDO</strong>.
              </p>
              <div className="garantia-grid">
                <div className="garantia-box">
                  <div className="box-title">📅 1 Mes Comprado</div>
                  <p><strong>1 Mes Completo (30 días)</strong> de garantía y reemplazo inmediato en caso de cualquier caída de perfil o cuenta.</p>
                </div>
                <div className="garantia-box">
                  <div className="box-title">🗓️ 3+ Meses Comprados</div>
                  <p><strong>Garantía durante todo el período contratado</strong> (3, 6 o 12 meses completos según tu compra).</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════
          SECCIÓN 5: RESUMEN DE GARANTÍAS
      ══════════════════════════════════════ */}
      {activeTab === "garantia" && (
        <section className="terminos-card terminos-card--garantia" id="sec-garantia">
          <div className="card-header">
            <div className="card-header-title">
              <span className="platform-icon garantia-icon">🛡️</span>
              <h2>Resumen Oficial de Garantías PandaStore</h2>
            </div>
            <span className="card-tag tag-garantia">Tabla de Cobertura</span>
          </div>

          <div className="card-body">
            <div className="garantia-table-wrapper">
              <table className="garantia-table">
                <thead>
                  <tr>
                    <th>Plataforma / Servicio</th>
                    <th>Naturaleza del Producto</th>
                    <th>Garantía Oficial</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div className="table-platform-cell">
                        <img src={nintendoLogo} alt="" className="table-icon-img" />
                        <strong>Nintendo Switch</strong>
                      </div>
                    </td>
                    <td>Cuentas digitales (Duración indefinida)</td>
                    <td><span className="badge-garantia badge-nintendo">7 Días (1 Semana)</span></td>
                  </tr>
                  <tr>
                    <td>
                      <div className="table-platform-cell">
                        <img src={playstationLogo} alt="" className="table-icon-img play-table-icon" />
                        <strong>PlayStation (PS4/PS5)</strong>
                      </div>
                    </td>
                    <td>Cuentas Full Legales (Principal/Secundaria)</td>
                    <td><span className="badge-garantia badge-psn">De Por Vida (Lifetime)</span></td>
                  </tr>
                  <tr>
                    <td>
                      <div className="table-platform-cell">
                        <img src={steamLogo} alt="" className="table-icon-img" />
                        <strong>Steam (PC / Windows)</strong>
                      </div>
                    </td>
                    <td>Juegos en PC local / Modo Seguro / Historia</td>
                    <td><span className="badge-garantia badge-steam">Garantía Total Permanente</span></td>
                  </tr>
                  <tr>
                    <td>
                      <div className="table-platform-cell">
                        <img src={streamingLogo} alt="" className="table-icon-img" />
                        <strong>Streaming / Suscripciones</strong>
                      </div>
                    </td>
                    <td>Cuentas y perfiles asignados</td>
                    <td><span className="badge-garantia badge-streaming">Tiempo Adquirido (1 a 12 meses)</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER DE SOPORTE Y CONTACTO DIRECTO ── */}
      <footer className="terminos-footer">
        <div className="footer-content">
          <h3>¿Tienes dudas sobre las Garantías?</h3>
          <p>Nuestro equipo está disponible 24/7 para responder todas tus preguntas por nuestros canales oficiales:</p>
          <div className="footer-buttons">
            <a
              href={WSP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-contact btn-wsp"
            >
              <img src={wspLogo} alt="WhatsApp" className="contact-btn-img" />
              <span>WhatsApp (+56 9 7475 1810)</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
