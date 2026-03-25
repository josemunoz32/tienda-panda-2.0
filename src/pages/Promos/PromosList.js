import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMoneda } from "../../context/MonedaContext";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { getMinPriceByMoneda } from "../../components/Header";
import { useLocation } from "react-router-dom";
import letreroPromos from "../../assets/letreros/promociones.png";

function formatPrecio(precio, moneda) {
  if (!precio || isNaN(precio)) return "";
  if (moneda === "USD") {
    return `$${Number(precio).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (moneda === "CLP") {
    return `$${Number(precio).toLocaleString("es-CL")}`;
  }
  return precio;
}

const PHONE = "56974751810"; // mismo número usado en WhatsappButton

// Configuración de promociones
const PROMOS = [
  { key: "promo-2x", name: "2X$30.000", priceCLP: 30000, image: require("../../assets/promos/2x30.png"), selectCount: 2, restricted: true },
  { key: "promo-3x", name: "3X$40.000", priceCLP: 40000, image: require("../../assets/promos/3x40.png"), selectCount: 3, restricted: true },
  { key: "promo-4x", name: "4X$55.000", priceCLP: 55000, image: require("../../assets/promos/4x55.png"), selectCount: 4, restricted: true },
  { key: "promo-kart", name: "KART + PASE", priceCLP: 22000, image: require("../../assets/promos/kart + pase.png"), selectCount: 1 },
  { key: "promo-violet", name: "VIOLET + DLC", priceCLP: 24000, image: require("../../assets/promos/violet + dlc.png"), selectCount: 1 },
  { key: "promo-scarlet", name: "SCARLET + DLC", priceCLP: 24000, image: require("../../assets/promos/scarlet + dlc.png"), selectCount: 1 },
  { key: "promo-animal", name: "ANIMAL + DLC", priceCLP: 20000, image: require("../../assets/promos/animal +dlc.png"), selectCount: 1 },
  { key: "promo-cuphead", name: "CUPHEAD + DLC", priceCLP: 12000, image: require("../../assets/promos/cuphead + dlc.png"), selectCount: 1 },
  { key: "promo-wild", name: "Zelda Wild + Pass", priceCLP: 24000, image: require("../../assets/promos/wild + dlc.png"), selectCount: 1 },
  { key: "promo-sword", name: "Pokemon Sword + DLC", priceCLP: 23000, image: require("../../assets/promos/pokemon espada + dlc.png"), selectCount: 1 },
  { key: "promo-shield", name: "Pokemon Shield + DLC", priceCLP: 23000, image: require("../../assets/promos/pokemon escudo +dlc.png"), selectCount: 1 },
  { key: "promo-splatoon", name: "Splatoon 3 + DLC", priceCLP: 24000, image: require("../../assets/promos/splatoon 3 + dlc.png"), selectCount: 1 },
];

export default function PromosList() {
  const { moneda } = useMoneda();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activePromo, setActivePromo] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [modalTopOffset, setModalTopOffset] = useState(96);
  const [highlightPromoKey, setHighlightPromoKey] = useState(null);

  const promoRefs = useRef({});

  const closeModal = () => {
    setModalOpen(false);
    setActivePromo(null);
    setSelectedIds([]);
    setSearch("");
  };

  useEffect(() => {
    // Productos
    getDocs(collection(db, "products")).then((snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    // Categorías (para restringir a Nintendo Switch)
    getDocs(collection(db, "categories")).then((snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Si llegamos desde Home con ?promo=promo-2x, hacer scroll al promo y resaltarlo
  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const promoKey = params.get("promo");
    if (!promoKey) return;

    const el = promoRefs.current?.[promoKey];
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightPromoKey(promoKey);
    const t = setTimeout(() => setHighlightPromoKey(null), 1600);
    return () => clearTimeout(t);
  }, [location.search, loading]);

  // Calcular offset dinámico para que el modal nunca se mezcle con el header.
  // En desktop el header (banner) es alto, por eso el paddingTop fijo no alcanza.
  useEffect(() => {
    if (!modalOpen) return;

    const computeOffset = () => {
      const headerEl = document.querySelector(".banner-header");
      const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 0;
      const base = headerHeight ? Math.ceil(headerHeight + 16) : 96;
      // Evitar que el modal quede demasiado abajo si la pantalla es baja
      const maxAllowed = Math.max(96, Math.floor(window.innerHeight * 0.65));
      setModalTopOffset(Math.min(base, maxAllowed));
    };

    computeOffset();
    window.addEventListener("resize", computeOffset);
    return () => window.removeEventListener("resize", computeOffset);
  }, [modalOpen]);

  // Cerrar modal con tecla Esc
  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  // Umbral de precio para selección restringida
  const threshold = moneda === "USD" ? 22 : 20000;

  // Detectar categoría "Nintendo Switch" por nombre
  const nintendoCategoryId = useMemo(() => {
    const match = categories.find((c) => {
      const n = (c.name || "").toLowerCase();
      return n.includes("nintendo") && n.includes("switch");
    });
    return match ? match.id : null;
  }, [categories]);

  const eligibleProducts = useMemo(() => {
    if (!activePromo || !activePromo.restricted) return [];
    if (!nintendoCategoryId) return [];
    // Filtrar por categoría Nintendo Switch y por precio mínimo
    const filtered = products.filter((p) => {
      if (p.categoryId !== nintendoCategoryId) return false;
      const min = getMinPriceByMoneda(p, moneda);
      if (!min) return false;
      if (moneda === "USD") return min <= 22; // USD ≤ 22
      return min <= 20000; // CLP ≤ 20000
    });
    const texto = search.trim().toLowerCase();
    return !texto
      ? filtered
      : filtered.filter((p) => (p.name || "").toLowerCase().includes(texto));
  }, [products, activePromo, moneda, search, nintendoCategoryId]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (activePromo && prev.length >= activePromo.selectCount) return prev; // limitar cantidad
      return [...prev, id];
    });
  };

  const openSelection = (promo) => {
    if (promo.restricted && promo.selectCount > 1) {
      setActivePromo(promo);
      setSelectedIds([]);
      setSearch("");
      setModalOpen(true);
    } else {
      // Compra directa por WhatsApp para promos de 1 juego
      const msg = encodeURIComponent(
        `Hola! Quiero comprar la promoción: ${promo.name} por ${formatPrecio(
          promo.priceCLP,
          moneda
        )}.`
      );
      window.open(`https://wa.me/${PHONE}?text=${msg}`, "_blank");
    }
  };

  const confirmSelection = () => {
    if (!activePromo) return;
    const chosen = products.filter((p) => selectedIds.includes(p.id));
    if (chosen.length !== activePromo.selectCount) return;
    const names = chosen.map((p) => p.name).join(", ");
    const msg = encodeURIComponent(
      `Hola! Quiero comprar la promoción: ${activePromo.name} (${formatPrecio(
        activePromo.priceCLP,
        moneda
      )}). Juegos seleccionados: ${names}.`
    );
    window.open(`https://wa.me/${PHONE}?text=${msg}`, "_blank");
    closeModal();
  };

  if (loading) {
    return (
      <div style={{ color: "#fff", textAlign: "center", padding: 40 }}>Cargando promociones...</div>
    );
  }

  return (
    <div
      className="home-root"
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        zIndex: 10,
        background: "transparent",
        padding: "32px 0 60px 0",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 12px", marginTop: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <img
            src={letreroPromos}
            alt="Promociones"
            style={{ maxWidth: 520, width: "92%", height: "auto" }}
          />
        </div>
        <p style={{ color: "#fff9", textAlign: "center", marginBottom: 24 }}>
          Packs especiales: elige tus juegos dentro del límite de precio.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
            justifyItems: 'center',
            justifyContent: 'center',
          }}
        >
          {PROMOS.map((promo, idx) => (
            <div
              key={promo.key || idx}
              ref={(node) => {
                if (node && promo.key) promoRefs.current[promo.key] = node;
              }}
              style={{
                background: "#ffffff10",
                border: highlightPromoKey && promo.key === highlightPromoKey ? "3px solid #22c55e" : "1.5px solid #a084e8",
                borderRadius: 14,
                boxShadow: highlightPromoKey && promo.key === highlightPromoKey ? "0 0 0 6px #22c55e22, 0 10px 34px #0005" : "0 6px 28px #0004",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                minHeight: 340,
                maxWidth: 340,
                width: '100%',
                margin: '0 auto',
              }}
            >
              {promo.image && (
                <div style={{
                  width: '100%',
                  height: 170,
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  textAlign: 'center',
                }}>
                  <img
                    src={promo.image}
                    alt={promo.name}
                    style={{
                      maxWidth: window.innerWidth < 600 ? '80%' : '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      display: 'block',
                      margin: '0 auto',
                    }}
                  />
                </div>
              )}
              <div style={{
                padding: "12px 12px 14px 12px",
                display: "flex",
                flexDirection: "column",
                minHeight: 150,
                flex: 1,
                alignItems: window.innerWidth < 600 ? 'center' : 'flex-start'
              }}>
                <div style={{
                  color: "#fff",
                  fontWeight: 900,
                  marginBottom: 6,
                  lineHeight: 1.2,
                  fontSize: window.innerWidth < 600 ? 17 : 18,
                  textAlign: 'center',
                  letterSpacing: 0.2,
                  textShadow: '0 2px 8px #0007',
                  fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
                }}>
                  {(() => {
                    const base = (promo.name || "").includes("$") ? (promo.name || "").split("$")[0] : promo.name;
                    if (promo.restricted && promo.selectCount > 1) return `Arma tu pack ${base}`;
                    return base;
                  })()}
                </div>
                <div style={{ marginTop: "auto", textAlign: 'center' }}>
                  <span style={{
                    background: "#2a126b",
                    color: "#fff",
                    borderRadius: 999,
                    padding: "6px 16px",
                    fontWeight: 800,
                    boxShadow: "0 2px 8px #2a126b22",
                    fontSize: window.innerWidth < 600 ? 16 : 17,
                    display: 'inline-block',
                  }}>{formatPrecio(promo.priceCLP, moneda)}</span>
                </div>
                {promo.restricted ? (
                  <div style={{ color: "#fff9", fontSize: window.innerWidth < 600 ? 13 : 14, marginBottom: 8, textAlign: 'center', fontWeight: 500 }}>
                    Selecciona {promo.selectCount} juego(s) con precio menor o igual a {moneda === "USD" ? "22" : "20.000"} {moneda}
                  </div>
                ) : null}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
                  <button
                    onClick={() => openSelection(promo)}
                    style={{
                      flex: 1,
                      background: "linear-gradient(90deg,#22c55e 0%,#16a34a 100%)",
                      color: "#fff",
                      fontWeight: 800,
                      borderRadius: 12,
                      padding: window.innerWidth < 600 ? '13px 0' : '12px 0',
                      border: 'none',
                      boxShadow: '0 2px 12px #22c55e44',
                      cursor: 'pointer',
                      fontSize: window.innerWidth < 600 ? 16 : 17,
                      letterSpacing: 0.2,
                      minWidth: 170,
                      maxWidth: 260,
                      width: '100%',
                      transition: 'background 0.18s, box-shadow 0.18s',
                    }}
                  >
                    {promo.restricted && promo.selectCount > 1 ? "Seleccionar juegos" : "Comprar por WhatsApp"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && activePromo && (
        <div
          className="modal-bg"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(24,18,43,0.95)",
            backdropFilter: "blur(2px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: modalTopOffset,
            paddingBottom: 24,
          }}
          onClick={(e) => {
            if (e.target.classList.contains("modal-bg")) closeModal();
          }}
        >
          <div
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #faf8ff 100%)",
              borderRadius: 18,
              padding: "22px 22px 18px 22px",
              boxShadow: "0 16px 48px #0b102144",
              border: "2px solid #a084e8",
              maxWidth: 1080,
              width: "92%",
              position: "relative",
              maxHeight: `calc(100vh - ${modalTopOffset}px - 24px)`,
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  gap: 8,
                  marginBottom: 2
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      fontWeight: 900,
                      color: selectedIds.length === activePromo.selectCount ? "#22c55e" : "#7b2ff2",
                      fontSize: 16,
                      letterSpacing: 0.5,
                      padding: "4px 14px",
                      borderRadius: 10,
                      background: selectedIds.length === activePromo.selectCount ? "#e7fbe9" : "#f3eaff",
                      border: selectedIds.length === activePromo.selectCount ? "2px solid #22c55e" : "2px solid #a084e8",
                      boxShadow: selectedIds.length === activePromo.selectCount ? "0 2px 10px #22c55e22" : "0 2px 10px #a084e822",
                      fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
                      fontSize: 17,
                      minWidth: 140,
                      justifyContent: 'center',
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:6}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      Seleccionados: {selectedIds.length} / {activePromo.selectCount}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        background: "#2a126b",
                        color: "#fff",
                        borderRadius: 999,
                        padding: "6px 14px",
                        fontWeight: 800,
                        boxShadow: "0 2px 8px #2a126b44",
                        fontSize: 16,
                        minWidth: 90,
                        textAlign: 'center',
                      }}>Límite: {moneda === "USD" ? "$22" : "$20.000"}</span>

                      <button
                        type="button"
                        onClick={closeModal}
                        aria-label="Cerrar"
                        title="Cerrar"
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 14,
                          border: "none",
                          background: "linear-gradient(135deg,#ef4444 0%, #b91c1c 100%)",
                          color: "#ffffff",
                          display: "grid",
                          placeItems: "center",
                          cursor: "pointer",
                          boxShadow: "0 6px 18px #0b10211f",
                          flex: '0 0 auto'
                        }}
                      >
                        <span style={{ fontSize: 22, fontWeight: 900, lineHeight: 1 }}>&times;</span>
                      </button>
                    </span>
                  </div>
                  <div style={{ color: "#555", fontWeight: 600, fontSize: 15, marginTop: 2, textAlign: 'left' }}>
                    Busca y marca los juegos de Nintendo Switch.
                  </div>
                </div>
              </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar juegos..."
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "2px solid #a084e8",
                marginBottom: 12,
                outline: "none",
                boxShadow: "0 2px 10px #a084e822"
              }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 16,
                maxHeight: `calc(100vh - ${modalTopOffset}px - 260px)`,
                overflowY: "auto",
                paddingRight: 6,
              }}
            >
              {eligibleProducts.map((p) => {
                const min = getMinPriceByMoneda(p, moneda);
                const checked = selectedIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "64px 1fr auto",
                      gap: 14,
                      border: checked ? "2px solid #22c55e" : "2px solid #a084e8",
                      borderRadius: 14,
                      padding: 12,
                      alignItems: "center",
                      background: checked ? "linear-gradient(180deg,#f3fff6 0%,#ffffff 100%)" : "#fff",
                      boxShadow: checked ? "0 6px 18px #22c55e22" : "0 4px 14px #0b102112",
                      cursor: "pointer",
                      color: "#111",
                      transition: "transform .12s ease, box-shadow .18s ease, border .18s ease",
                    }}
                  >
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 12, boxShadow: "0 2px 10px #0001" }} />
                    ) : (
                      <div style={{ width: 64, height: 64, borderRadius: 12, background: "#eee" }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 64 }}>
                      <div style={{ fontWeight: 900, color: "#111", lineHeight: 1.2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.name}</div>
                      <div style={{ marginTop: "auto" }}>
                        <span style={{
                          background: "#2a126b",
                          color: "#fff",
                          borderRadius: 999,
                          padding: "5px 12px",
                          fontWeight: 800,
                          boxShadow: "0 2px 8px #2a126b22",
                          display: "inline-block",
                          whiteSpace: "nowrap",
                          fontSize: 15,
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          /* Responsive font size for desktop */
                          ...(window.innerWidth > 600 ? { fontSize: 13 } : {})
                        }}>{min ? `${formatPrecio(min, moneda)} ${moneda}` : "Sin precio"}</span>
                      </div>
                    </div>
                    <input type="checkbox" checked={checked} onChange={() => toggleSelect(p.id)} style={{ width: 22, height: 22 }} />
                  </label>
                );
              })}
              {eligibleProducts.length === 0 && (
                <div style={{ color: "#333", padding: 12, fontWeight: 700 }}>
                  No hay juegos disponibles dentro del límite de precio en Nintendo Switch.
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
              <div style={{ width: '100%', display: 'flex', flexDirection: window.innerWidth < 600 ? 'column' : 'row', gap: window.innerWidth < 600 ? 10 : 18, alignItems: window.innerWidth < 600 ? 'stretch' : 'center', justifyContent: 'space-between', marginTop: 14 }}>
                <div style={{ fontWeight: 800, color: "#222", background: "#f3eaff", border: "1.5px solid #a084e8", borderRadius: 10, padding: "8px 12px", boxShadow: "0 2px 10px #a084e822", fontSize: 15, minWidth: 140, textAlign: 'center' }}>
                  Seleccionados: {selectedIds.length} / {activePromo.selectCount}
                </div>
                <button
                  onClick={confirmSelection}
                  disabled={selectedIds.length !== activePromo.selectCount}
                  style={{
                    background: selectedIds.length === activePromo.selectCount ? "linear-gradient(90deg,#22c55e 0%,#16a34a 100%)" : "#bdbdbd",
                    color: "#fff",
                    fontWeight: 900,
                    borderRadius: 16,
                    padding: window.innerWidth < 600 ? "15px 10px" : "16px 26px",
                    border: "none",
                    fontSize: window.innerWidth < 600 ? 17 : 18,
                    letterSpacing: 0.2,
                    boxShadow: selectedIds.length === activePromo.selectCount ? "0 8px 22px #22c55e44" : "0 2px 8px #0002",
                    cursor: selectedIds.length === activePromo.selectCount ? "pointer" : "not-allowed",
                    transition: "background 0.18s, box-shadow 0.18s, color 0.18s, transform 0.18s",
                    outline: selectedIds.length === activePromo.selectCount ? "2px solid #22c55e" : "none",
                    transform: selectedIds.length === activePromo.selectCount ? "scale(1.04)" : "none",
                    fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: window.innerWidth < 600 ? 14 : 12,
                    minHeight: 54,
                    marginTop: window.innerWidth < 600 ? 0 : 0
                  }}
                >
                  <span style={{display:'flex',alignItems:'center',gap:window.innerWidth<600?10:8}}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth:24, minHeight:24 }}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 3h-1a2 2 0 0 0-2 2v2"></path><polyline points="8 10 12 14 16 10"></polyline></svg>
                    <span style={{fontWeight:800, fontSize:window.innerWidth<600?16:18, letterSpacing:0.2, lineHeight:1.1}}>Confirmar compra por WhatsApp</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
