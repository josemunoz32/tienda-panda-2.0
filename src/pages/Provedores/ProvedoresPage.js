import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useMoneda } from "../../context/MonedaContext";
import { auth, db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";
import provedoresImg from "../../assets/gana dinero/provedores.jpg";
import wspLogo from "../../assets/logos/logowsp.png";
import "./ProvedoresPage.css";

const PACKS_PROVEDORES = [
  {
    id: "provedores-steam-launcher-mensual",
    title: "Método Steam + Launcher PandaStore (Membresía Mensual)",
    subtitle: "Acceso mensual al sistema oficial de PandaStore Launcher. Incluye panel de administrador para generar claves y entregárselas a tus propios clientes.",
    priceCLP: 49990,
    priceUSD: 52,
    tag: "PLAN MENSUAL · REVENDEDORES",
    color: "#00f5d4",
    grad: "linear-gradient(145deg, rgba(0, 245, 212, 0.22) 0%, rgba(12, 35, 45, 0.95) 100%)",
    icon: "rocket_launch",
    info: {
      queEs: "Te entregamos acceso directo a nuestro sistema oficial de PandaStore Launcher (archivo .EXE listo para usar) y un usuario de administrador exclusivo.",
      comoFunciona: "Desde tu panel web de administrador podrás crear claves de activación (de prueba, temporales o permanentes) para juegos o DLCs y vendérselas directamente a tus clientes.",
      marca: "Funciona bajo el software oficial de PandaStore Launcher (con nuestro logo, icono y servidores oficiales).",
      ventajas: [
        "Acceso masivo a más de 58.000 juegos y DLCs de Steam con descargas automáticas de parches.",
        "Generador de licencias de administrador para crear códigos a tus clientes.",
        "Bloqueo por hardware (HWID) para que las claves no sean compartidas ilegalmente.",
        "Soporte técnico continuo y actualizaciones automáticas del ejecutable."
      ],
      linkLauncher: true,
    }
  },
  {
    id: "provedores-steam-launcher-vitalicio",
    title: "Método Steam + Launcher PandaStore (Acceso Vitalicio / Pago Único)",
    subtitle: "Acceso permanente de por vida a nuestro Launcher PandaStore y panel admin. Genera licencias para tus clientes para siempre sin mensualidades.",
    priceCLP: 150000,
    priceUSD: 155,
    tag: "⭐ MÁS ELEGIDO · ACCESO DE POR VIDA",
    color: "#ffb703",
    grad: "linear-gradient(145deg, rgba(255, 183, 3, 0.22) 0%, rgba(45, 30, 10, 0.95) 100%)",
    icon: "workspace_premium",
    info: {
      queEs: "Acceso permanente e ilimitado de por vida a nuestro software oficial PandaStore Launcher mediante un pago único, ahorrándote más de $450.000 al año en mensualidades.",
      comoFunciona: "Clave maestra de administrador vitalicia para generar claves a tus clientes cuando quieras, activación de juegos Steam, parches automáticos y sincronización en tiempo real.",
      marca: "Funciona bajo el software oficial de PandaStore Launcher (con nuestro logo, icono y servidores oficiales).",
      ventajas: [
        "Un solo pago y acceso de por vida: sin cuotas mensuales ni cobros sorpresa.",
        "Panel de administrador permanente para generar todas las claves que desees.",
        "Acceso al catálogo completo de más de 58.000 juegos y DLCs de Steam, y archivos de instalación en la nube.",
        "Soporte VIP preferencial de por vida y auto-actualizaciones continuas del software."
      ],
      linkLauncher: true,
    }
  },
  {
    id: "provedores-steam-launcher-whitelabel",
    title: "Launcher Steam 100% Personalizado (Tu Propia Marca / White Label)",
    subtitle: "Desarrollamos y compilamos tu propio Launcher .EXE exclusivo: con el nombre, logos y colores de tu propia tienda. 100% independiente de PandaStore.",
    priceCLP: 350000,
    priceUSD: 360,
    tag: "💎 WHITE LABEL · TU PROPIA MARCA EXCLUSIVA",
    color: "#f43f5e",
    grad: "linear-gradient(145deg, rgba(244, 63, 94, 0.25) 0%, rgba(45, 10, 25, 0.95) 100%)",
    icon: "branding_watermark",
    info: {
      queEs: "Desarrollamos y compilamos una aplicación .EXE nativa personalizada exclusivamente para tu tienda de videojuegos. No tendrá ninguna mención, logo ni referencia a PandaStore: es 100% el software de tu marca.",
      comoFunciona: "Te entregamos el instalador y ejecutable (.exe) personalizado con el logo, icono de Windows, nombre y colores de tu tienda, junto a un panel de control independiente para generar claves de tus clientes.",
      marca: "100% Marca Blanca / White Label. Todo el branding pertenece a tu tienda.",
      ventajas: [
        "Entrega rápida llave en mano en menos de 1 semana, listo para vender.",
        "Tu propio icono (.ico), logos, colores corporativos y enlaces a tus redes.",
        "Generador de licencias propio con candado HWID para tus clientes.",
        "Infraestructura masiva con más de 58.000 juegos y DLCs de Steam, scripts .LUA y auto-actualizaciones transparentes.",
        "Soporte técnico directo de desarrollo para asegurar el funcionamiento óptimo."
      ],
      isWhiteLabel: true,
    }
  },
  {
    id: "provedores-todos",
    title: "Todos los Proveedores (Consolas & Streaming)",
    subtitle: "El pack definitivo: Incluye TODO el directorio mayorista de PlayStation (PS4/PS5), Nintendo Switch y Cuentas de Streaming.",
    priceCLP: 15000,
    priceUSD: 15,
    tag: "PACK COMPLETO · TODO EN UNO",
    color: "#a259ff",
    grad: "linear-gradient(145deg, rgba(162, 89, 255, 0.18) 0%, rgba(20, 14, 45, 0.95) 100%)",
    icon: "inventory_2",
    info: {
      queEs: "Incluye los contactos y enlaces de proveedores verificados para consolas PlayStation, Nintendo Switch y plataformas de streaming.",
      comoFunciona: "Accedes al listado de proveedores mayoristas internacionales y chilenos con los precios más bajos del mercado para revender con alto margen.",
      modalidades: [
        "PlayStation: Proveedores con cuentas principales y secundarias.",
        "Nintendo Switch: Proveedores con cuentas 100% primarias.",
        "Streaming: Cuentas completas y cuentas a dominio directo al correo."
      ],
      ventajas: [
        "Ahorro de más del 50% comprando los 3 directorios juntos.",
        "Proveedores con stock permanente y respuesta rápida.",
        "Garantías variadas según cada proveedor (semanales, anuales y de por vida)."
      ]
    }
  },
  {
    id: "provedores-playstation",
    title: "PlayStation (PS4 & PS5)",
    subtitle: "Contactos directos de proveedores mayoristas de juegos y membresías digitales para consolas PS4 y PS5.",
    priceCLP: 10000,
    priceUSD: 10,
    tag: "SOLO PLAYSTATION",
    color: "#3b82f6",
    grad: "linear-gradient(145deg, rgba(59, 130, 246, 0.18) 0%, rgba(14, 20, 45, 0.95) 100%)",
    icon: "sports_esports",
    info: {
      queEs: "Directorio de proveedores directos y mayoristas de licencias de juegos para consolas PlayStation 4 y PlayStation 5.",
      comoFunciona: "Los proveedores suministran cuentas digitales con juegos en dos modalidades:",
      modalidades: [
        "Cuenta Principal: El cliente activa la cuenta como principal en su PS4/PS5 y juega directamente desde su propio usuario personal con sus trofeos y partidas.",
        "Cuenta Secundaria: El cliente juega directamente desde el usuario entregado requiriendo conexión a internet."
      ],
      ventajas: [
        "Proveedores con distintos rangos de garantía: de por vida, 12 meses o semanal.",
        "Catálogo masivo con lanzamientos recientes y clásicos a precio mayorista.",
        "Guía de activación y recomendaciones para evitar problemas de licencias."
      ]
    }
  },
  {
    id: "provedores-nintendo",
    title: "Nintendo Switch (Cuentas Primarias)",
    subtitle: "Proveedores mayoristas de juegos digitales para Nintendo Switch con cuentas 100% primarias.",
    priceCLP: 10000,
    priceUSD: 10,
    tag: "SOLO NINTENDO",
    color: "#ef4444",
    grad: "linear-gradient(145deg, rgba(239, 68, 68, 0.18) 0%, rgba(45, 14, 20, 0.95) 100%)",
    icon: "gamepad",
    info: {
      queEs: "Lista de proveedores mayoristas especializados en juegos digitales para la consola Nintendo Switch.",
      comoFunciona: "Modalidad Full Primaria: El proveedor entrega una cuenta, tu cliente la ingresa a su Nintendo Switch, descarga el juego completo y luego juega exclusivamente desde su usuario personal (nunca desde el usuario entregado).",
      modalidades: [
        "100% Cuentas Primarias: Máxima comodidad para el jugador.",
        "Juega desde el usuario propio con sus perfiles de guardado."
      ],
      ventajas: [
        "Precios de costo muy por debajo de la eShop oficial.",
        "Proveedores con amplio catálogo de exclusivos de Nintendo y juegos multiplataforma.",
        "Recomendaciones de seguridad incluidas para garantizar la permanencia del juego."
      ]
    }
  },
  {
    id: "provedores-streaming",
    title: "Plataformas de Streaming",
    subtitle: "Proveedores oficiales de cuentas y perfiles para Netflix, Disney+, Max, Spotify, Prime Video, YouTube Premium y más.",
    priceCLP: 5000,
    priceUSD: 5,
    tag: "SOLO STREAMING",
    color: "#00f5d4",
    grad: "linear-gradient(145deg, rgba(0, 245, 212, 0.18) 0%, rgba(10, 35, 40, 0.95) 100%)",
    icon: "live_tv",
    info: {
      queEs: "Listado de proveedores mayoristas extranjeros y chilenos verificados que venden cuentas de entretenimiento y streaming digital.",
      comoFunciona: "Los proveedores ofrecen dos formatos principales para la venta a tus clientes:",
      modalidades: [
        "Cuentas Completas: Cuentas ya activas con membresía pagada listas para entregar y usar.",
        "Cuentas a Dominio: Cuentas creadas directamente al correo electrónico de tu cliente, renovables mes a mes en su propio correo."
      ],
      ventajas: [
        "Servicios: Netflix, Disney+, Max (HBO), Spotify Premium, Prime Video, YouTube Premium, Crunchyroll, etc.",
        "Altísimo margen de ganancia por suscripción.",
        "Proveedores con métodos estables y soporte rápido ante caídas."
      ]
    }
  }
];

// Steam se administra exclusivamente desde el Portal de Distribuidor.
const PROVIDER_DIRECTORY_PACKS = [
  "provedores-nintendo",
  "provedores-playstation",
  "provedores-todos",
  "provedores-streaming"
].map((id) => PACKS_PROVEDORES.find((pack) => pack.id === id)).filter(Boolean);

const SERVICIOS_COTIZACION = [
  {
    title: "Checker Bots Automáticos",
    desc: "Bots a medida para verificar cuentas, validar licencias y monitorear stock 24/7.",
    icon: "smart_toy",
    color: "#22c55e",
  },
  {
    title: "Tiendas Web Llave en Mano",
    desc: "Sitio web completo como PandaStore: catálogo, carrito de compras, pagos y panel admin.",
    icon: "storefront",
    color: "#38bdf8",
  },
  {
    title: "Scripts y Código a Medida",
    desc: "Automatizaciones personalizadas, bots de Telegram/Discord y sistemas web a pedido.",
    icon: "code",
    color: "#f59e0b",
  },
];

export default function ProvedoresPage() {
  const navigate = useNavigate();
  const { moneda, formatearPrecio } = useMoneda();
  const [infoModalPack, setInfoModalPack] = useState(null);
  const [addedId, setAddedId] = useState(null);

  // Agregar al carrito
  const handleAddToCart = async (pack) => {
    const cartItem = {
      productId: pack.id,
      name: `Proveedores: ${pack.title}`,
      imageUrl: provedoresImg,
      cantidad: 1,
      priceCLP: pack.priceCLP,
      priceUSD: pack.priceUSD,
    };

    const currentUser = auth.currentUser;

    if (!currentUser) {
      let localCart = [];
      try {
        const stored = localStorage.getItem("guestCart");
        if (stored) localCart = JSON.parse(stored);
      } catch (e) {}

      localCart = localCart.filter((item) => item.productId !== pack.id);
      localCart.push(cartItem);
      localStorage.setItem("guestCart", JSON.stringify(localCart));
      window.dispatchEvent(new Event("localCartUpdated"));
    } else {
      try {
        const cartRef = doc(db, `users/${currentUser.uid}/cart`, pack.id);
        await setDoc(cartRef, cartItem);
      } catch (err) {
        console.error("Error guardando en carrito:", err);
      }
    }

    setAddedId(pack.id);
    setTimeout(() => setAddedId(null), 2500);
  };

  // Comprar Ahora (flujo directo de compra)
  const handleComprarAhora = (pack) => {
    const productoBuy = {
      id: pack.id,
      name: `Proveedores: ${pack.title}`,
      priceCLP: pack.priceCLP,
      priceUSD: pack.priceUSD,
      imageUrl: provedoresImg,
      desc: pack.subtitle,
    };
    navigate("/comprar-ahora", { state: { producto: productoBuy } });
  };

  // Cotización de Webs y Bots por WhatsApp
  const handleCotizarServiceByWsp = (serviceTitle) => {
    const msg = `Hola! Quisiera solicitar presupuesto y cotización personalizada para el servicio de: "${serviceTitle}" 👋`;
    window.open(`https://wa.me/56974751810?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="prov-clean-root">
      {/* ── HEADER ── */}
      <header className="prov-clean-header">
        <span className="prov-clean-badge">PANDASTORE BUSINESS · EMPRENDEDORES</span>
        <h1 className="prov-clean-title">
          Directorio Mayorista de <span className="title-accent">Proveedores</span>
        </h1>
        <p className="prov-clean-sub">
          Directorios verificados para Nintendo Switch, PlayStation y plataformas de Streaming, listos para impulsar tu catálogo.
        </p>
      </header>

      <section className="prov-steam-redirect" aria-label="Planes para distribuidores Steam">
        <div className="prov-steam-redirect-icon"><span className="material-icons">rocket_launch</span></div>
        <div>
          <span className="prov-steam-redirect-eyebrow">PANDASTORE LAUNCHER</span>
          <h2>¿Buscas distribuir juegos de Steam?</h2>
          <p>Los métodos y planes de Steam ahora se gestionan desde el Portal de Distribuidor, con cupos, panel de emisión y soporte especializado.</p>
        </div>
        <button type="button" onClick={() => navigate("/portal-distribuidor")}>
          Ver planes de Distribuidor Steam <span className="material-icons">arrow_forward</span>
        </button>
      </section>

      {/* ── CARDS DE PROVEEDORES (COMPRAR AHORA Y AÑADIR AL CARRITO) ── */}
      <section className="prov-packs-section">
        <div className="prov-directory-heading">
          <span>DIRECTORIOS DISPONIBLES</span>
          <h2>Elige el mercado que quieres abastecer</h2>
        </div>
        <div className="prov-packs-grid">
          {PROVIDER_DIRECTORY_PACKS.map((pack) => {
            const displayPrice = moneda === "USD" ? `$${pack.priceUSD} USD` : formatearPrecio(pack.priceCLP);
            const isAdded = addedId === pack.id;

            return (
              <div key={pack.id} className={`prov-pack-card ${pack.id === "provedores-todos" ? "featured" : ""}`}>
                <div className="pack-card-top">
                  <span className="material-icons pack-card-icon" style={{ color: pack.color }}>
                    {pack.icon}
                  </span>
                  <span
                    className="pack-tag-pill"
                    style={{ background: `${pack.color}22`, color: pack.color, borderColor: `${pack.color}44` }}
                  >
                    {pack.tag}
                  </span>
                </div>

                <h3 className="pack-card-title">{pack.title}</h3>
                <p className="pack-card-subtitle">{pack.subtitle}</p>

                <div className="pack-card-price">
                  <span className="price-val" style={{ color: pack.color }}>
                    {displayPrice}
                  </span>
                </div>

                {isAdded && (
                  <div className="pack-added-badge">
                    ✅ ¡Añadido al Carrito!
                  </div>
                )}

                <div className="pack-card-actions">
                  <button
                    type="button"
                    className="btn-pack-info"
                    onClick={() => setInfoModalPack(pack)}
                  >
                    <span className="material-icons" style={{ fontSize: 16 }}>info</span>
                    <span>Ver Información</span>
                  </button>

                  <button className="btn-pack-buy" onClick={() => handleComprarAhora(pack)}>
                    ⚡ Comprar Ahora
                  </button>

                  <button className="btn-pack-cart" onClick={() => handleAddToCart(pack)}>
                    🛒 Añadir al Carrito
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SERVICIOS A MEDIDA (WHATSAPP & COTIZACIÓN) ── */}
      <section className="prov-custom-section">
        <div className="custom-section-header">
          <span className="prov-clean-badge">DESARROLLO & HERRAMIENTAS</span>
          <h2>Webs, Checker Bots & Código a Medida</h2>
          <p>¿Buscas bots automáticos o tu propia tienda web? Estos servicios se cotizan de forma personalizada según lo que requieras.</p>
        </div>

        <div className="custom-services-grid">
          {SERVICIOS_COTIZACION.map((s) => (
            <div key={s.title} className="custom-service-card">
              <div className="service-card-header">
                <span className="material-icons" style={{ color: s.color, fontSize: 28 }}>{s.icon}</span>
                <span className="service-badge" style={{ color: s.color, borderColor: `${s.color}33` }}>COTIZACIÓN</span>
              </div>
              <h3 className="service-title">{s.title}</h3>
              <p className="service-desc">{s.desc}</p>
              <button
                className="btn-service-quote"
                onClick={() => handleCotizarServiceByWsp(s.title)}
              >
                <img src={wspLogo} alt="WhatsApp" className="btn-wsp-img" />
                <span>Cotizar por WhatsApp</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── MODAL DETALLADO DE INFORMACIÓN (CREATE PORTAL) ── */}
      {infoModalPack && typeof document !== "undefined" && createPortal(
        <div className="prov-info-modal-overlay" onClick={() => setInfoModalPack(null)}>
          <div className="prov-info-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="prov-info-modal-header" style={{ borderBottomColor: `${infoModalPack.color}44` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                <span className="material-icons" style={{ color: infoModalPack.color, fontSize: "32px", flexShrink: 0 }}>
                  {infoModalPack.icon}
                </span>
                <div style={{ minWidth: 0 }}>
                  <span
                    className="pack-tag-pill"
                    style={{ background: `${infoModalPack.color}22`, color: infoModalPack.color, borderColor: `${infoModalPack.color}44` }}
                  >
                    {infoModalPack.tag}
                  </span>
                  <h2 className="prov-info-modal-title">{infoModalPack.title}</h2>
                </div>
              </div>
              <button
                type="button"
                className="prov-info-modal-close"
                onClick={() => setInfoModalPack(null)}
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <div className="prov-info-modal-body">
              {/* Fila de Precio */}
              <div className="prov-info-price-row">
                <span className="prov-info-price-label">Inversión / Precio:</span>
                <span className="prov-info-price-val" style={{ color: infoModalPack.color }}>
                  {moneda === "USD" ? `$${infoModalPack.priceUSD} USD` : formatearPrecio(infoModalPack.priceCLP)}
                </span>
              </div>

              {/* ¿En qué consiste? */}
              {infoModalPack.info?.queEs && (
                <div className="prov-info-block">
                  <h4 className="prov-info-block-title">
                    <span className="material-icons">help_outline</span> ¿En qué consiste?
                  </h4>
                  <p className="prov-info-block-p">{infoModalPack.info.queEs}</p>
                </div>
              )}

              {/* ¿Cómo funciona? */}
              {infoModalPack.info?.comoFunciona && (
                <div className="prov-info-block">
                  <h4 className="prov-info-block-title">
                    <span className="material-icons">tune</span> Funcionamiento del Servicio
                  </h4>
                  <p className="prov-info-block-p">{infoModalPack.info.comoFunciona}</p>
                </div>
              )}

              {/* Modalidades específicas (Cuentas principales, secundarias, dominio) */}
              {Array.isArray(infoModalPack.info?.modalidades) && (
                <div className="prov-info-block">
                  <h4 className="prov-info-block-title">
                    <span className="material-icons">account_tree</span> Tipos y Modalidades de Cuentas
                  </h4>
                  <ul className="prov-info-list">
                    {infoModalPack.info.modalidades.map((item, idx) => (
                      <li key={idx}>
                        <span className="material-icons prov-list-icon" style={{ color: infoModalPack.color }}>check_circle</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Marca e Identidad */}
              {infoModalPack.info?.marca && (
                <div className="prov-info-block" style={{ background: "rgba(255,255,255,0.03)", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <h4 className="prov-info-block-title" style={{ color: "#c4b5fd" }}>
                    <span className="material-icons">verified</span> Identidad del Software
                  </h4>
                  <p className="prov-info-block-p" style={{ margin: 0 }}>{infoModalPack.info.marca}</p>
                </div>
              )}

              {/* Ventajas y Beneficios */}
              {Array.isArray(infoModalPack.info?.ventajas) && (
                <div className="prov-info-block">
                  <h4 className="prov-info-block-title">
                    <span className="material-icons">stars</span> Ventajas y Beneficios Incluidos
                  </h4>
                  <ul className="prov-info-list">
                    {infoModalPack.info.ventajas.map((v, idx) => (
                      <li key={idx}>
                        <span className="material-icons prov-list-icon" style={{ color: "#34d399" }}>bolt</span>
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA Launcher Demo */}
              {infoModalPack.info?.linkLauncher && (
                <div className="prov-info-launcher-cta">
                  <div>
                    <span style={{ fontWeight: 800, color: "#fff", display: "block", fontSize: "0.92rem" }}>
                      🚀 ¿Quieres ver y probar el Launcher antes de comprar?
                    </span>
                    <span style={{ fontSize: "12px", color: "#cbd5e1" }}>
                      Descarga la versión ejecutable demo y revisa el tutorial de activación y uso en PC.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-info-launcher"
                    onClick={() => {
                      setInfoModalPack(null);
                      navigate("/descargar-launcher");
                    }}
                  >
                    📥 Probar Launcher Demo
                  </button>
                </div>
              )}

              {/* CTA White Label */}
              {infoModalPack.info?.isWhiteLabel && (
                <div className="prov-info-launcher-cta" style={{ borderColor: "rgba(244, 63, 94, 0.4)", background: "rgba(244, 63, 94, 0.12)" }}>
                  <div>
                    <span style={{ fontWeight: 800, color: "#fff", display: "block", fontSize: "0.92rem" }}>
                      💬 ¿Deseas coordinar el diseño con tu logo y marca?
                    </span>
                    <span style={{ fontSize: "12px", color: "#cbd5e1" }}>
                      Conversa de inmediato con nuestro desarrollador por WhatsApp para definir colores, iconos y entrega en menos de 1 semana.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-info-wsp"
                    onClick={() => {
                      const msg = `Hola PandaStore! Me interesa adquirir el "Launcher Steam 100% Personalizado (Tu Propia Marca / White Label)". Quiero coordinar el diseño con mi logo y nombre de tienda 👋`;
                      window.open(`https://wa.me/56974751810?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                  >
                    <img src={wspLogo} alt="WhatsApp" style={{ width: 18, height: 18 }} />
                    <span>Coordinar por WhatsApp</span>
                  </button>
                </div>
              )}
            </div>

            <div className="prov-info-modal-footer">
              <button
                type="button"
                className="btn-modal-buy"
                onClick={() => {
                  const p = infoModalPack;
                  setInfoModalPack(null);
                  handleComprarAhora(p);
                }}
              >
                ⚡ Comprar Ahora
              </button>
              <button
                type="button"
                className="btn-modal-cart"
                onClick={() => {
                  handleAddToCart(infoModalPack);
                }}
              >
                🛒 Añadir al Carrito
              </button>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setInfoModalPack(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
