import React, { useState, useEffect, useMemo } from "react";
import { Helmet } from 'react-helmet-async';
import { db } from "../../firebase";
import { collection, query, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import "./PacksNintendo.css";
import pandaLoader from "../../assets/logos/miicono.png";
import Loader from "../../components/Loader";
import { isFreeToPlayGame, resolveCanonical } from "../../utils/switchStockHelper";


const TELEGRAM = "https://t.me/NintendoChile2";

function formatCLP(n) {
  return `$${Number(n).toLocaleString("es-CL")} CLP`;
}

function formatUSDT(n) {
  return `${Number(n)} USDT`;
}

// ── Modal de contacto ────────────────────────────────────────────
function ModalComprar({ pack, onClose }) {
  if (!pack) return null;

  const mensaje = encodeURIComponent(
    `🎮 Hola! Me interesa este pack:\n\n` +
    `📌 ${pack.titulo}\n` +
    `🎮 Juegos: ${(pack.juegos || []).slice(0, 5).join(", ")}${(pack.juegos || []).length > 5 ? "..." : ""}\n` +
    `💰 Precio: ${formatCLP(pack.precio_clp)} | ${formatUSDT(pack.precio_usdt)}\n\n` +
    `¿Está disponible?`
  );

  const redes = [
    {
      key: "instagram",
      label: "Instagram",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
      href: "https://www.instagram.com/pandastoregaming.cl/",
      color: "#E1306C",
    },
    {
      key: "telegram",
      label: "Telegram",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      href: `${TELEGRAM}`,
      color: "#229ED9",
    },
  ];

  return (
    <div className="pn-modal-overlay" onClick={onClose}>
      <div className="pn-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="pn-modal-close" onClick={onClose}>✕</button>
        <div className="pn-modal-icon">🛒</div>
        <h2 className="pn-modal-title">Elige cómo contactarnos</h2>
        <p className="pn-modal-sub">Te enviamos los detalles del pack por la red que elijas</p>
        <div className="pn-modal-pack-preview">
          <span className="pn-modal-pack-name">{pack.titulo}</span>
          <span className="pn-modal-pack-price">{formatCLP(pack.precio_clp)}</span>
        </div>
        <div className="pn-modal-redes">
          {redes.map((r) => (
            <a
              key={r.key}
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`pn-modal-red pn-modal-red--${r.key}`}
              onClick={onClose}
            >
              {r.icon}
              <span>{r.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Loading screen ───────────────────────────────────────────────
function PacksLoadingScreen() {
  return <Loader text="Cargando..." subtext="PandaStore • Packs Nintendo" fullScreen={true} />;
}

// ── Página principal ─────────────────────────────────────────────
export default function PacksNintendo() {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalPack, setModalPack] = useState(null);
  const [expandido, setExpandido] = useState(null);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  // Filtros
  const [buscarJuego, setBuscarJuego] = useState("");
  const [ordenarPor, setOrdenarPor] = useState("nuevo");
  const [minJuegos, setMinJuegos] = useState("");

  useEffect(() => {
    let isMounted = true;
    const failsafeTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 12000);

    const q = query(collection(db, "packs_nintendo"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!isMounted) return;
        setPacks(
          snap.docs.map((d) => {
            const data = d.data();
            const raw = Array.isArray(data.juegos) ? data.juegos : [];
            return {
              id: d.id,
              ...data,
              juegos: raw.filter((j) => !isFreeToPlayGame(j))
            };
          })
        );
        setLoading(false);
      },
      (err) => {
        console.warn("Fallo al suscribirse a packs_nintendo con orderBy, usando fallback sin orden:", err);
        getDocs(collection(db, "packs_nintendo"))
          .then((snap) => {
            if (!isMounted) return;
            setPacks(
              snap.docs.map((d) => {
                const data = d.data();
                const raw = Array.isArray(data.juegos) ? data.juegos : [];
                return {
                  id: d.id,
                  ...data,
                  juegos: raw.filter((j) => !isFreeToPlayGame(j))
                };
              })
            );
            setLoading(false);
          })
          .catch((e) => {
            console.error("Error al cargar packs_nintendo:", e);
            if (isMounted) setLoading(false);
          });
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(failsafeTimer);
      unsub();
    };
  }, []);

  const packsFiltrados = useMemo(() => {
    let lista = packs.filter((p) => p.disponible !== false);
    if (buscarJuego.trim()) {
      const q = buscarJuego.trim().toLowerCase();
      const qCanon = resolveCanonical(q);
      const palabras = q.split(/\s+/).filter(Boolean);

      lista = lista.filter((p) => {
        const nick = (p.nickname || "").toLowerCase();
        const titulo = (p.titulo || "").toLowerCase();
        const rawJuegos = (p.juegos || []);

        // Coincidencia directa por nickname o ID de pack
        if (nick.includes(q) || (p.id_pack || "").toLowerCase().includes(q)) return true;
        if (titulo.includes(q)) return true;

        // Coincidencia canónica o por palabras en la lista de juegos
        return rawJuegos.some((j) => {
          const jLower = j.toLowerCase();
          if (palabras.every((pal) => jLower.includes(pal))) return true;
          if (qCanon && resolveCanonical(j) === qCanon) return true;
          return false;
        });
      });
    }
    if (minJuegos !== "") lista = lista.filter((p) => (p.juegos || []).length >= Number(minJuegos));
    if (ordenarPor === "precio_asc") lista.sort((a, b) => Number(a.precio_clp) - Number(b.precio_clp));
    if (ordenarPor === "precio_desc") lista.sort((a, b) => Number(b.precio_clp) - Number(a.precio_clp));
    return lista;
  }, [packs, buscarJuego, ordenarPor, minJuegos]);

  const totalDisponibles = packs.filter((p) => p.disponible !== false).length;
  const hayFiltrosActivos = buscarJuego || ordenarPor !== "nuevo" || minJuegos !== "";

  function limpiarFiltros() {
    setBuscarJuego("");
    setOrdenarPor("nuevo");
    setMinJuegos("");
  }

  function aplicarFiltros() {
    setFiltrosAbiertos(false);
  }

  if (loading) return <PacksLoadingScreen />;

  return (
    <div className="pn-page">
      <Helmet>
        <title>Packs Nintendo Switch 1 y 2 | Cuentas Digitales con Múltiples Juegos - PandaStore</title>
        <meta name="description" content="Descubre nuestros packs exclusivos para Nintendo Switch y Switch 2. Cuentas con múltiples juegos incluidos a precios imbatibles. ¡Entrega inmediata 24/7 y garantía total!" />
        <meta name="keywords" content="packs nintendo switch, juegos nintendo switch baratos, cuentas nintendo switch, packs switch 2, mario zelda pokemon pack, pandastore" />
        <meta property="og:title" content="Packs Nintendo Switch 1 y 2 | PandaStore" />
        <meta property="og:description" content="Ahorra en grande con cuentas que incluyen 2, 3 o más juegos top de Nintendo Switch." />
        <meta property="og:url" content="https://pandastoregaming.cl/packs-nintendo" />
        <meta property="og:image" content="https://pandastoregaming.cl/favicon.png" />
        <meta name="twitter:title" content="Packs Nintendo Switch | PandaStore" />
        <meta name="twitter:description" content="Packs de juegos digitales para Nintendo Switch a precios de oferta." />
        <meta name="twitter:image" content="https://pandastoregaming.cl/favicon96.png" />
        <link rel="canonical" href="https://pandastoregaming.cl/packs-nintendo" />
        <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Packs Nintendo Switch - PandaStore",
          "description": "Cuentas y packs con múltiples juegos para Nintendo Switch y Switch 2.",
          "url": "https://pandastoregaming.cl/packs-nintendo",
          "isPartOf": { "@type": "VideoGameStore", "name": "PandaStore", "url": "https://pandastoregaming.cl" }
        })}
        </script>
      </Helmet>
      {/* HERO */}
      <div className="pn-hero">
        <h1 className="pn-hero-title">
          <span className="pn-hero-icon">🎮</span> Packs Nintendo Switch
        </h1>
        <p className="pn-hero-sub">Cuentas con juegos incluidos</p>
        <div className="pn-hero-counter">
          <span className="pn-counter-num">{totalDisponibles}</span>
          <span className="pn-counter-label">
            pack{totalDisponibles !== 1 ? "s" : ""} disponible{totalDisponibles !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* BUSCADOR + FILTRO TOGGLE */}
      <div className="pn-toolbar">
        <div className="pn-search-wrap">
          <svg className="pn-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="pn-input pn-search"
            type="text"
            placeholder="Buscar juego o pack..."
            value={buscarJuego}
            onChange={(e) => setBuscarJuego(e.target.value)}
          />
          {buscarJuego && (
            <button className="pn-search-clear" onClick={() => setBuscarJuego("")}>✕</button>
          )}
        </div>
        <button
          className={`pn-btn-filtros${filtrosAbiertos ? " pn-btn-filtros--open" : ""}${hayFiltrosActivos ? " pn-btn-filtros--active" : ""}`}
          onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/>
          </svg>
          Filtros{hayFiltrosActivos ? " ●" : ""}
        </button>
      </div>

      {/* PANEL DE FILTROS COLAPSABLE */}
      {filtrosAbiertos && (
        <div className="pn-filtros-panel">
          <div className="pn-filtros-grid">
            <div className="pn-field">
              <label className="pn-label">Ordenar por precio</label>
              <select className="pn-select" value={ordenarPor} onChange={(e) => setOrdenarPor(e.target.value)}>
                <option value="nuevo">Más nuevos</option>
                <option value="precio_asc">Menor a mayor</option>
                <option value="precio_desc">Mayor a menor</option>
              </select>
            </div>

            <div className="pn-field">
              <label className="pn-label">Cantidad de juegos</label>
              <select className="pn-select" value={minJuegos} onChange={(e) => setMinJuegos(e.target.value)}>
                <option value="">Todos</option>
                <option value="3">3+ juegos</option>
                <option value="5">5+ juegos</option>
                <option value="8">8+ juegos</option>
                <option value="10">10+ juegos</option>
                <option value="15">15+ juegos</option>
              </select>
            </div>
          </div>

          <div className="pn-filtros-acciones">
            <button className="pn-btn-aplicar" onClick={aplicarFiltros}>Aplicar</button>
            {hayFiltrosActivos && (
              <button className="pn-btn-limpiar" onClick={limpiarFiltros}>Limpiar</button>
            )}
          </div>
        </div>
      )}

      {/* RESULTADO */}
      <div className="pn-result-bar">
        Mostrando <strong>{packsFiltrados.length}</strong> de <strong>{totalDisponibles}</strong>
      </div>

      {/* GRID */}
      {packsFiltrados.length === 0 ? (
        <div className="pn-empty">
          <span className="pn-empty-icon">🔍</span>
          <p>No se encontraron packs con esos filtros</p>
          <button className="pn-btn-limpiar" onClick={limpiarFiltros}>Ver todos los packs</button>
        </div>
      ) : (
        <div className="pn-grid">
          {packsFiltrados.map((pack) => {
            const isExp = expandido === pack.id;
            const juegosTotal = (pack.juegos || []).length;
            const juegosVisibles = isExp ? pack.juegos || [] : (pack.juegos || []).slice(0, 5);
            const tieneMore = !isExp && juegosTotal > 5;

            return (
              <div
                key={pack.id}
                className={`pn-card${pack.disponible === false ? " pn-card--agotado" : ""}`}
              >
                {pack.disponible === false && <div className="pn-agotado-ribbon">AGOTADO</div>}

                <div className="pn-card-head">
                  <div className="pn-card-title-wrap">
                    {pack.horario_limitado && (
                      <span className="pn-badge-horario">⏰ 12:00 – 20:00</span>
                    )}
                    <span className="pn-card-title">{pack.titulo}</span>
                    {pack.nickname && !pack.titulo?.includes(pack.nickname) && (
                      <span style={{ fontSize: "0.76rem", color: "#c084fc", fontWeight: 700, marginLeft: "6px" }}>
                        👤 Nick: {pack.nickname}
                      </span>
                    )}
                  </div>
                  <span className="pn-card-count">{juegosTotal} juego{juegosTotal !== 1 ? "s" : ""}</span>
                </div>

                <ul className="pn-games-list">
                  {juegosVisibles.map((j, i) => (
                    <li key={i}>
                      <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10" className="pn-game-dot" aria-hidden="true">
                        <circle cx="8" cy="8" r="6" />
                      </svg>
                      {j}
                    </li>
                  ))}
                </ul>

                {tieneMore && (
                  <button className="pn-ver-mas" onClick={() => setExpandido(pack.id)}>
                    +{juegosTotal - 5} juegos más ▼
                  </button>
                )}
                {isExp && (
                  <button className="pn-ver-mas" onClick={() => setExpandido(null)}>
                    Ver menos ▲
                  </button>
                )}

                <div className="pn-divider" />

                <div className="pn-prices">
                  <div className="pn-price-main">{formatCLP(pack.precio_clp)}</div>
                  <div className="pn-price-alt">{formatUSDT(pack.precio_usdt)}</div>
                </div>

                <div className="pn-metodos">💙 PayPal &nbsp;·&nbsp; 🪙 Cripto &nbsp;·&nbsp; 🏦 Transf. &nbsp;·&nbsp; 💵 Depósito</div>

                <button
                  className="pn-btn-comprar"
                  onClick={() => setModalPack(pack)}
                  disabled={pack.disponible === false}
                >
                  🛒 Comprar este pack
                </button>

                {pack.timestamp?.toDate && (
                  <span className="pn-fecha">
                    {pack.timestamp.toDate().toLocaleDateString("es-CL", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ModalComprar pack={modalPack} onClose={() => setModalPack(null)} />
    </div>
  );
}
