
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { catUrl, prodUrl } from '../../utils/slugify';
import { useMoneda } from "../../context/MonedaContext";
import { db, auth } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  deleteDoc
} from "firebase/firestore";
import { handleCartAddOrRemove } from "../../utils/cartHelpers";
import defaultBanner from "../../assets/default-banner.jpg";
import mobileBanner from "../../assets/mobile-banner.jpg";
import ps4Logo from '../../assets/logos/ps4.png';
import ps5Logo from '../../assets/logos/ps5.png';
import switchLogo from '../../assets/logos/switch.png';
import streamingLogo from '../../assets/logos/streaming.png';
import suscripcionesLogo from '../../assets/logos/suscripciones.png';
import ventasHeader from '../../assets/home/ventas.png';
import letreroPromos from '../../assets/letreros/promociones.png';
import letreroNintendo from '../../assets/letreros/nintendo switch.png';
import letreroPS4 from '../../assets/letreros/play 4.png';
import letreroPS5 from '../../assets/letreros/play 5.png';
import letreroStreaming from '../../assets/letreros/streaming.png';
import letreroSuscripciones from '../../assets/letreros/suscripciones.png';
import pandaLoader from '../../assets/logos/miicono.png';
import "./Home.css";

// Modal pregunta rápida para usuarios nuevos
function ModalPregunta({ visible, onClose, onSelect }) {
  if (!visible) return null;
  return (
    <div className="modal-pregunta-overlay">
      <div className="modal-pregunta-card animated-fadein">
        <div className="card-border-top"></div>
        <h3>¿Qué estás buscando?</h3>
        <div className="modal-pregunta-opciones">
          <button onClick={() => onSelect("promos")}>Promociones</button>
          <button onClick={() => onSelect("ps4")}>Juegos PS4</button>
          <button onClick={() => onSelect("ps5")}>Juegos PS5</button>
          <button onClick={() => onSelect("nintendo switch 1 y 2")}>Nintendo Switch 1 y 2</button>
          <button onClick={() => onSelect("streaming")}>Streaming</button>
          <button onClick={() => onSelect("suscripciones")}>Suscripciones</button>
        </div>
        <button className="modal-pregunta-cerrar" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}

function HomeLoadingScreen() {
  return (
    <div className="home-loading-screen" role="status" aria-live="polite">
      <div className="home-loading-card">
        <div className="home-loading-orbit" aria-hidden="true" />
        <img src={pandaLoader} alt="Panda Store" className="home-loading-icon" />
        <div className="home-loading-copy">
          <h2>Panda Store</h2>
          <p>Cargando catalogo y novedades...</p>
        </div>
        <div className="home-loading-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

// (All misplaced CSS removed. Use Home.css for styles.)

// Formatea el precio según la moneda
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

// Carrusel de destacados tipo swiper simple
function DestacadosCarrusel({ productos, moneda, handleFav, favIds, openAuthModal, user }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const max = productos.length;
  const mostrar = 3;
  const start = Math.max(0, Math.min(index, max - mostrar));
  const visibles = productos.slice(start, start + mostrar);

  const handlePrev = () => setIndex(i => Math.max(0, i - 1));
  const handleNext = () => setIndex(i => Math.min(max - mostrar, i + 1));

  const onTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
  };
  const onTouchMove = (e) => {
    const touch = e.touches[0];
    touchEndX.current = touch.clientX;
  };
  const onTouchEnd = () => {
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const dx = touchEndX.current - touchStartX.current;
      if (Math.abs(dx) > 40) {
        if (dx < 0 && index < max - mostrar) handleNext();
        if (dx > 0 && index > 0) handlePrev();
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div style={{display:'flex',alignItems:'center',gap:12,justifyContent:'center',maxWidth:900,margin:'0 auto'}}>
      <button onClick={handlePrev} disabled={start === 0} style={{fontSize:28,background:'none',border:'none',color:'#a084e8',cursor:'pointer',opacity:start===0?0.3:1}}>&lt;</button>
      <div
        style={{display:'flex',gap:24,overflow:'hidden',touchAction:'pan-y'}}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {visibles.map(prod => {
          let min = null;
          const precios = [];
          if (moneda === "CLP") {
            if (prod.priceCLP) precios.push(Number(prod.priceCLP));
            if (prod.pricePrimariaCLP) precios.push(Number(prod.pricePrimariaCLP));
            if (prod.priceSecundariaCLP) precios.push(Number(prod.priceSecundariaCLP));
            if (Array.isArray(prod.preciosPorMes)) {
              prod.preciosPorMes.forEach(p => { if (p.clp) precios.push(Number(p.clp)); });
            }
          } else if (moneda === "USD") {
            if (prod.priceUSD) precios.push(Number(prod.priceUSD));
            if (prod.pricePrimariaUSD) precios.push(Number(prod.pricePrimariaUSD));
            if (prod.priceSecundariaUSD) precios.push(Number(prod.priceSecundariaUSD));
            if (Array.isArray(prod.preciosPorMes)) {
              prod.preciosPorMes.forEach(p => { if (p.usd) precios.push(Number(p.usd)); });
            }
          }
          if (precios.length > 0) {
            min = Math.min(...precios.filter(x => x > 0));
          }
          return (
            <div key={prod.id} className="card1" style={{display:'flex',alignItems:'center',justifyContent:'center',padding:0,boxSizing:'border-box',position:'relative',background:'none',boxShadow:'none',border:'none',cursor:'pointer'}}>
              {prod.imageUrl && (
                <Link to={prodUrl(prod.name, prod.id)} style={{display:'block',width:'100%',height:'100%'}} onClick={e => {
                  if (!user) {
                    e.preventDefault();
                    if (typeof openAuthModal === 'function') openAuthModal();
                  }
                }}>
                  <img
                    src={prod.imageUrl}
                    alt={prod.name}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: 220,
                      maxWidth: 260,
                      display: 'block',
                      objectFit: 'contain',
                      background: 'transparent',
                      borderRadius: 12,
                      margin: '0 auto',
                      padding: 0,
                      boxShadow: 'none',
                      border: 'none',
                      transition: 'box-shadow 0.18s, transform 0.18s'
                    }}
                  />
                </Link>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={handleNext} disabled={start >= max - mostrar} style={{fontSize:28,background:'none',border:'none',color:'#a084e8',cursor:'pointer',opacity:start>=max-mostrar?0.3:1}}>&gt;</button>
    </div>
  );
}

export default function Home() {
  // Modal pregunta rápida: mostrar SIEMPRE al entrar/recargar en / o /home
  const [showModal, setShowModal] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    return path === "/" || path === "/home";
  });

  const handleSelect = async (opcion) => {
    setShowModal(false);
    if (opcion === "promos") {
      navigate("/promos");
      return;
    }

    // Nintendo Switch 1 y 2 debe ir a la categoría Nintendo
    if (opcion === "nintendo" || opcion === "nintendo switch 1 y 2") {
      if (categoryIds?.nintendo) {
        navigate(catUrl(categoryNames?.nintendo, categoryIds.nintendo));
        return;
      }
      // fallback si aún no cargó categoryIds
    }

    // Buscar el ID de la categoría por nombre y redirigir
    const nombreMap = {
      ps4: "ps4",
      ps5: "ps5",
      nintendo: "nintendo",
      "nintendo switch 1 y 2": "nintendo",
      streaming: "streaming",
      suscripciones: "suscripciones"
    };
    const nombreBuscado = nombreMap[opcion.toLowerCase()];
    if (!nombreBuscado) return;
    try {
      const snapshot = await getDocs(collection(db, "categories"));
      const normalize = (s) => (s || "").toString().trim().toLowerCase();
      const cat = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .find(c => {
          const name = normalize(c?.name);
          return name && name.includes(nombreBuscado);
        });
      if (cat) {
        navigate(catUrl(cat.name, cat.id));
      }
    } catch (e) {
      // Si falla, no hace nada
    }
  };
  const [filtroAplicado, setFiltroAplicado] = useState(false);
  const [productosAleatorios, setProductosAleatorios] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const openAuthModal = () => setShowAuthModal(true);
  const closeAuthModal = () => setShowAuthModal(false);
  // Pasar openAuthModal como propiedad a DestacadosCarrusel
  const { moneda } = useMoneda();
  // Ref para el canvas de fondo galaxia
  const galaxyRef = useRef(null);
  const enableGalaxy = false;

  // Preview de Promociones (4 imágenes)
  const promosPreview = useMemo(() => ([
    { key: 'promo-2x', title: 'Arma tu pack 2X', img: require('../../assets/promos/2x30.png') },
    { key: 'promo-3x', title: 'Arma tu pack 3X', img: require('../../assets/promos/3x40.png') },
    { key: 'promo-4x', title: 'Arma tu pack 4X', img: require('../../assets/promos/4x55.png') },
    { key: 'promo-kart', title: 'Kart + Pase', img: require('../../assets/promos/kart + pase.png') },
  ]), []);

  // Estados necesarios antes de cualquier uso
  const [productos, setProductos] = useState([]);
  const [destacados, setDestacados] = useState([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [order, setOrder] = useState("price-asc");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  // Limpiar todos los filtros (mostrar todos los juegos)
  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setSelectedCat("");
    setMinPrice("");
    setMaxPrice("");
    setOrder("price-asc");
    setFiltroAplicado(false);
    setShowResults(false);
    setPage(1);
  };

  // Si se navega a /home, resetear filtros para mostrar todo
  useEffect(() => {
    if (location && typeof location.pathname === "string" && location.pathname.toLowerCase().includes("/home")) {
      handleClearFilters();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.pathname]);

  // Mostrar el modal cada vez que se entra a Home (/ o /home)
  useEffect(() => {
    const path = (location?.pathname || "").toLowerCase();
    if (path === "/" || path === "/home") {
      setShowModal(true);
    }
  }, [location?.pathname]);

  // SEO: Set page title for Home
  useEffect(() => {
    document.title = 'PandaStore | Tienda de Videojuegos Digitales - PS4, PS5, Nintendo Switch, Streaming';
    return () => { document.title = 'PandaStore | Tienda de Videojuegos Digitales'; };
  }, []);

  // PAGINATION STATE
  const [page, setPage] = useState(1);
  const perPage = 30; // Puedes ajustar la cantidad por página

  // Fondo galaxia animado con partículas y estrellas fugaces
  useEffect(() => {
    if (!enableGalaxy) return;
    const canvas = galaxyRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationId;

    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }
    resizeCanvas();

    // Más partículas y estrellas fugaces (más cantidad y más grandes)
    const particles = Array.from({length: 400}, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2.5 + 1.2, // estrellas más grandes
      speed: Math.random() * 0.18 + 0.08,
      alpha: Math.random() * 0.8 + 0.5 // más brillantes
    }));

    let shootingStars = [];
    function spawnShootingStar() {
      if (Math.random() < 0.025) {
        shootingStars.push({
          x: Math.random() * width * 0.8 + width * 0.1,
          y: Math.random() * height * 0.4 + height * 0.05,
          len: Math.random() * 180 + 80,
          speed: Math.random() * 10 + 8,
          angle: Math.PI / 4 + (Math.random() - 0.5) * 0.18,
          alpha: 1
        });
      }
    }

    function draw() {
  ctx.clearRect(0, 0, width, height);
  // Fondo gradiente galaxia real
  const grad = ctx.createRadialGradient(width/2, height/2, width*0.08, width/2, height/2, width*0.95);
  grad.addColorStop(0, '#4f5b93'); // centro más claro
  grad.addColorStop(0.18, '#232a3a');
  grad.addColorStop(0.38, '#181c2b');
  grad.addColorStop(0.7, '#0a0a13');
  grad.addColorStop(1, '#000');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

      // Partículas (estrellas) mucho más notorias
      for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#b5e0ff';
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.restore();
        p.y += p.speed;
        if (p.y > height) {
          p.y = 0;
          p.x = Math.random() * width;
        }
      }

      // Estrellas fugaces
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        ctx.save();
        ctx.globalAlpha = s.alpha;
        ctx.strokeStyle = 'rgba(173,216,230,0.85)';
        ctx.lineWidth = 2.6;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - Math.cos(s.angle) * s.len, s.y - Math.sin(s.angle) * s.len);
        ctx.stroke();
        ctx.restore();
        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.alpha -= 0.009;
        if (s.alpha <= 0) shootingStars.splice(i, 1);
      }
      spawnShootingStar();
      animationId = requestAnimationFrame(draw);
    }
    draw();
    window.addEventListener('resize', resizeCanvas);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);
  useEffect(() => {
    // Unificar lógica de filtrado igual que en el render principal
    // Función para normalizar texto (elimina tildes/acentos)
    function normalize(str) {
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }
    let results = productos.filter(prod => {
      const texto = normalize(searchInput.trim());
      let match = true;
      if (texto) {
        const precios = [];
        if (moneda === "CLP") {
          if (prod.priceCLP) precios.push(String(prod.priceCLP));
          if (prod.pricePrimariaCLP) precios.push(String(prod.pricePrimariaCLP));
          if (prod.priceSecundariaCLP) precios.push(String(prod.priceSecundariaCLP));
          if (Array.isArray(prod.preciosPorMes)) {
            prod.preciosPorMes.forEach(p => { if (p.clp) precios.push(String(p.clp)); });
          }
        } else if (moneda === "USD") {
          if (prod.priceUSD) precios.push(String(prod.priceUSD));
          if (prod.pricePrimariaUSD) precios.push(String(prod.pricePrimariaUSD));
          if (prod.priceSecundariaUSD) precios.push(String(prod.priceSecundariaUSD));
          if (Array.isArray(prod.preciosPorMes)) {
            prod.preciosPorMes.forEach(p => { if (p.usd) precios.push(String(p.usd)); });
          }
        }
        match = (
          (prod.name && normalize(prod.name).includes(texto)) ||
          (prod.description && normalize(prod.description).includes(texto)) ||
          precios.some(precio => normalize(precio).includes(texto))
        );
      }
      if (!match) return false;
      if (selectedCat && prod.categoryId !== selectedCat) return false;
      return true;
    });
    // Filtrar por precio mínimo/máximo globalmente
    results = results.filter(prod => {
      const preciosNum = [];
      if (moneda === "CLP") {
        if (prod.priceCLP) preciosNum.push(Number(prod.priceCLP));
        if (prod.pricePrimariaCLP) preciosNum.push(Number(prod.pricePrimariaCLP));
        if (prod.priceSecundariaCLP) preciosNum.push(Number(prod.priceSecundariaCLP));
        if (Array.isArray(prod.preciosPorMes)) {
          prod.preciosPorMes.forEach(p => { if (p.clp) preciosNum.push(Number(p.clp)); });
        }
      } else if (moneda === "USD") {
        if (prod.priceUSD) preciosNum.push(Number(prod.priceUSD));
        if (prod.pricePrimariaUSD) preciosNum.push(Number(prod.pricePrimariaUSD));
        if (prod.priceSecundariaUSD) preciosNum.push(Number(prod.priceSecundariaUSD));
        if (Array.isArray(prod.preciosPorMes)) {
          prod.preciosPorMes.forEach(p => { if (p.usd) preciosNum.push(Number(p.usd)); });
        }
      }
      const min = preciosNum.length > 0 ? Math.min(...preciosNum.filter(x => x > 0)) : null;
      if (minPrice && (min === null || min < Number(minPrice))) return false;
      if (maxPrice && (min === null || min > Number(maxPrice))) return false;
      return true;
    });
    // Si no hay búsqueda, ni filtro, ni orden personalizado, mostrar productos aleatorios
  const noFiltros = !searchInput && !selectedCat && !minPrice && !maxPrice && (!order || order === 'price-asc');
    if (noFiltros) {
      results = [...results].sort(() => 0.5 - Math.random());
    } else {
      // Ordenamiento profesional
      function getMinPrice(prod) {
        const precios = [];
        if (moneda === "CLP") {
          if (prod.priceCLP) precios.push(Number(prod.priceCLP));
          if (prod.pricePrimariaCLP) precios.push(Number(prod.pricePrimariaCLP));
          if (prod.priceSecundariaCLP) precios.push(Number(prod.priceSecundariaCLP));
          if (Array.isArray(prod.preciosPorMes)) {
            prod.preciosPorMes.forEach(p => { if (p.clp) precios.push(Number(p.clp)); });
          }
        } else if (moneda === "USD") {
          if (prod.priceUSD) precios.push(Number(prod.priceUSD));
          if (prod.pricePrimariaUSD) precios.push(Number(prod.pricePrimariaUSD));
          if (prod.priceSecundariaUSD) precios.push(Number(prod.priceSecundariaUSD));
          if (Array.isArray(prod.preciosPorMes)) {
            prod.preciosPorMes.forEach(p => { if (p.usd) precios.push(Number(p.usd)); });
          }
        }
        return precios.length > 0 ? Math.min(...precios.filter(x => x > 0)) : 9999999;
      }
      if(order==="price-asc") results.sort((a,b)=>(getMinPrice(a)-getMinPrice(b)));
      else if(order==="price-desc") results.sort((a,b)=>(getMinPrice(b)-getMinPrice(a)));
      else if(order==="az") results.sort((a,b)=>a.name.localeCompare(b.name));
      else if(order==="za") results.sort((a,b)=>b.name.localeCompare(a.name));
    }
  setSearchResults(results);
  }, [searchInput, productos, selectedCat, minPrice, maxPrice, moneda, order]);

  // Recibir filtros del header
  useEffect(() => {
    window.setHomeFilters = ({ selectedCat, minPrice, maxPrice }) => {
      setSelectedCat(selectedCat);
      setMinPrice(minPrice);
      setMaxPrice(maxPrice);
    };
    return () => { window.setHomeFilters = null; };
  }, []);
  const [testimonios, setTestimonios] = useState([]);
  useEffect(() => {
    getDocs(collection(db, "testimonios")).then(snapshot => {
      setTestimonios(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);
  const [categorias, setCategorias] = useState([]);
  // Obtener categorías de Firestore
  useEffect(() => {
    getDocs(collection(db, "categories")).then(snapshot => {
      setCategorias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);
  const [modal, setModal] = useState({ open: false, prod: null, opciones: [], tipo: null });
  const [loading, setLoading] = useState(true);
  const [inCart, setInCart] = useState({});
  const [favIds, setFavIds] = useState([]);
  const user = auth.currentUser;

  const getMinPriceForHome = (prod) => {
    const precios = [];
    if (moneda === "CLP") {
      if (prod?.priceCLP) precios.push(Number(prod.priceCLP));
      if (prod?.pricePrimariaCLP) precios.push(Number(prod.pricePrimariaCLP));
      if (prod?.priceSecundariaCLP) precios.push(Number(prod.priceSecundariaCLP));
      if (Array.isArray(prod?.preciosPorMes)) {
        prod.preciosPorMes.forEach((p) => { if (p?.clp) precios.push(Number(p.clp)); });
      }
    } else if (moneda === "USD") {
      if (prod?.priceUSD) precios.push(Number(prod.priceUSD));
      if (prod?.pricePrimariaUSD) precios.push(Number(prod.pricePrimariaUSD));
      if (prod?.priceSecundariaUSD) precios.push(Number(prod.priceSecundariaUSD));
      if (Array.isArray(prod?.preciosPorMes)) {
        prod.preciosPorMes.forEach((p) => { if (p?.usd) precios.push(Number(p.usd)); });
      }
    }
    const nums = precios.filter((x) => Number.isFinite(x) && x > 0);
    return nums.length ? Math.min(...nums) : null;
  };

  const categoryIds = useMemo(() => {
    const norm = (s) => (s || "").toString().trim().toLowerCase();
    const findByIncludesAny = (needles) => {
      const ns = needles.map(norm);
      const found = categorias.find((c) => {
        const name = norm(c?.name);
        return ns.some((n) => n && name.includes(n));
      });
      return found ? found.id : null;
    };
    const findByIncludesAll = (needles) => {
      const ns = needles.map(norm);
      const found = categorias.find((c) => {
        const name = norm(c?.name);
        return ns.every((n) => n && name.includes(n));
      });
      return found ? found.id : null;
    };
    return {
      nintendo: findByIncludesAll(["nintendo", "switch"]),
      ps4: findByIncludesAny(["ps4", "play 4", "play4", "playstation 4"]),
      ps5: findByIncludesAny(["ps5", "play 5", "play5", "playstation 5"]),
      streaming: findByIncludesAny(["streaming"]),
      suscripciones: findByIncludesAny(["suscrip"]),
    };
  }, [categorias]);

  const categoryNames = useMemo(() => {
    const nameOf = (id) => categorias.find(c => c.id === id)?.name || '';
    return {
      nintendo: nameOf(categoryIds.nintendo),
      ps4: nameOf(categoryIds.ps4),
      ps5: nameOf(categoryIds.ps5),
      streaming: nameOf(categoryIds.streaming),
      suscripciones: nameOf(categoryIds.suscripciones),
    };
  }, [categoryIds, categorias]);

  const previewByCategory = useMemo(() => {
    const take8 = (catId) => {
      if (!catId) return [];
      return productos.filter((p) => p?.categoryId === catId).slice(0, 8);
    };
    return {
      nintendo: take8(categoryIds.nintendo),
      ps4: take8(categoryIds.ps4),
      ps5: take8(categoryIds.ps5),
      streaming: take8(categoryIds.streaming),
      suscripciones: take8(categoryIds.suscripciones),
    };
  }, [productos, categoryIds]);

  useEffect(() => {
    const fetchProductos = async () => {
      const snapshot = await getDocs(collection(db, "products"));
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  setProductos(prods);
  // Generar destacados aleatorios solo una vez
  setDestacados(prods.length > 0 ? [...prods].sort(() => 0.5 - Math.random()).slice(0, 10) : []);
  // Mezclar productos solo una vez para el listado principal
  setProductosAleatorios(prods.length > 0 ? [...prods].sort(() => 0.5 - Math.random()) : []);
  setLoading(false);
    };
    fetchProductos();
  }, []);

  useEffect(() => {
    if (!user) return;
    const cartUnsub = onSnapshot(collection(db, `users/${user.uid}/cart`), snap => {
      const cartMap = {};
      snap.docs.forEach(d => { cartMap[d.id] = true; });
      setInCart(cartMap);
    });
    const favUnsub = onSnapshot(collection(db, `users/${user.uid}/favorites`), snap => {
      setFavIds(snap.docs.map(d => d.id));
    });
    return () => {
      cartUnsub();
      favUnsub();
    };
  }, [user]);


  const handleCart = async (prod) => {
    if (!user) {
      openAuthModal();
      return;
    }
    await handleCartAddOrRemove({
      db,
      user,
      prod,
      moneda,
      cartIds: Object.keys(inCart),
      setModal
    });
  };

  // Modal handler para cuando el usuario selecciona una opción de precio
  const handleCartModal = async (opcion) => {
    const { prod, tipo } = modal;
    const cartRef = doc(db, `users/${user.uid}/cart`, prod.id);
    let extra = {};
    if (tipo === 'ps') {
      extra = { variante: opcion.value, [`price${opcion.moneda}`]: opcion.price };
    } else if (tipo === 'suscripcion') {
      extra = { meses: opcion.value, [`price${opcion.moneda}`]: opcion.price };
    }
    await setDoc(cartRef, {
      productId: prod.id,
      name: prod.name,
      imageUrl: prod.imageUrl || null,
      quantity: 1,
      ...extra
    });
    setModal({ open: false, prod: null, opciones: [], tipo: null });
  };
  // handleCartModal removed: now unused, as cart logic is unified and modal cart add is not supported in this view

  const handleFav = async (prod) => {
    if (!user) {
      openAuthModal();
      return;
    }
    const favRef = doc(db, `users/${user.uid}/favorites`, prod.id);
    if (favIds.includes(prod.id)) {
      await deleteDoc(favRef);
    } else {
      await setDoc(favRef, {
        productId: prod.id,
        name: prod.name,
        priceCLP: prod.priceCLP || null,
        imageUrl: prod.imageUrl || null
      });
    }
  };


  // Selección de imagen según categoría
  let bannerImg = defaultBanner;

  // Mostrar hint de scroll solo en móvil
  useEffect(() => {
    const hint = document.getElementById('cat-scroll-hint');
    if (!hint) return;
    const show = window.innerWidth <= 700;
    hint.style.display = show ? 'block' : 'none';
    const onResize = () => {
      hint.style.display = window.innerWidth <= 700 ? 'block' : 'none';
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    // Reiniciar a la página 1 si cambian los filtros/búsqueda
    setPage(1);
  }, [search, selectedCat, minPrice, maxPrice, moneda]);

  if (loading) return <HomeLoadingScreen />;

  return (
    <>
      {/* Modal solo en la raíz o /home, y solo la primera vez */}
      {showModal && (
        <ModalPregunta
          visible={showModal}
          onClose={() => setShowModal(false)}
          onSelect={handleSelect}
        />
      )}
      <div
        className="home-root"
        style={{
          position: 'relative',
          minHeight: '100vh',
          overflow: 'hidden',
          zIndex: 10,
          background: 'transparent',
          paddingBottom: 60,
          marginTop: window.innerWidth <= 700 ? 90 : 220 // margen restaurado para header/banner
        }}
      >
      {/* Modal de autenticación */}
      {showAuthModal && (
        <div className="modal-bg" style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(24,18,43,0.82)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={e => {if(e.target.classList.contains('modal-bg'))closeAuthModal();}}>
          <div style={{background:'#fff',borderRadius:18,padding:'38px 32px 28px 32px',boxShadow:'0 8px 32px #7b2ff244',maxWidth:380,width:'90%',textAlign:'center',position:'relative'}}>
            <h2 style={{fontWeight:800,fontSize:'1.35rem',color:'#7b2ff2',marginBottom:12}}>Debes iniciar sesión</h2>
            <p style={{color:'#222',fontSize:'1.08rem',marginBottom:22}}>Para agregar productos al carrito, favoritos o ver detalles, primero debes iniciar sesión o crear una cuenta.</p>
            <div style={{display:'flex',gap:16,justifyContent:'center',marginBottom:8}}>
              <button onClick={()=>{closeAuthModal();navigate('/iniciar-sesion');}} style={{background:'linear-gradient(90deg,#7b2ff2 0%,#a084e8 100%)',color:'#fff',fontWeight:700,fontSize:'1.08rem',border:'none',borderRadius:10,padding:'12px 24px',boxShadow:'0 2px 12px #7b2ff244',cursor:'pointer'}}>Iniciar sesión</button>
              <button onClick={()=>{closeAuthModal();navigate('/registro');}} style={{background:'linear-gradient(90deg,#f357a8 0%,#7b2ff2 100%)',color:'#fff',fontWeight:700,fontSize:'1.08rem',border:'none',borderRadius:10,padding:'12px 24px',boxShadow:'0 2px 12px #7b2ff244',cursor:'pointer'}}>Registrarse</button>
            </div>
            <button onClick={closeAuthModal} style={{background:'none',border:'none',color:'#a084e8',fontWeight:600,fontSize:'1rem',marginTop:8,cursor:'pointer'}}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Fondo galaxia animado (desactivado) */}
      {enableGalaxy && (
        <canvas
          ref={galaxyRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Secciones principales del Home */}
      <div
        style={{
          width: '100%',
          maxWidth: 1200,
          margin: '0 auto 18px auto',
          padding: '0 12px',
          position: 'relative',
          zIndex: 2
        }}
      >
        {/* PROMOCIONES */}
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <img src={letreroPromos} alt="Promociones" style={{ maxWidth: 520, width: '92%', height: 'auto' }} />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth < 700 ? '1fr' : 'repeat(4, 1fr)',
            gap: 14,
            justifyItems: 'center',
            marginBottom: 14
          }}
        >
          {promosPreview.map((p) => (
            <Link
              key={p.key}
              to={`/promos?promo=${encodeURIComponent(p.key)}`}
              style={{
                textDecoration: 'none',
                background: '#ffffff10',
                border: '1.5px solid #a084e8',
                borderRadius: 16,
                boxShadow: '0 6px 22px #0003',
                padding: 12,
                width: '100%',
                maxWidth: window.innerWidth < 700 ? 360 : 280,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: window.innerWidth < 700 ? 190 : 150,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}
              >
                <img
                  src={p.img}
                  alt={p.title}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                />
              </div>
              <div style={{ color: '#fff', fontWeight: 900, textAlign: 'center', textShadow: '0 2px 10px #0006' }}>{p.title}</div>
            </Link>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <Link
            to="/promos"
            style={{
              background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
              color: '#fff',
              fontWeight: 900,
              fontSize: '1.05rem',
              border: 'none',
              borderRadius: 12,
              padding: '12px 34px',
              boxShadow: '0 8px 22px #22c55e33',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            Ver más
          </Link>
        </div>

        {/* Helper inline para secciones por categoría */}
        {([
          { key: 'nintendo', img: letreroNintendo, alt: 'Nintendo Switch', catId: categoryIds.nintendo, catName: categoryNames.nintendo, items: previewByCategory.nintendo },
          { key: 'ps4', img: letreroPS4, alt: 'PS4', catId: categoryIds.ps4, catName: categoryNames.ps4, items: previewByCategory.ps4 },
          { key: 'ps5', img: letreroPS5, alt: 'PS5', catId: categoryIds.ps5, catName: categoryNames.ps5, items: previewByCategory.ps5 },
          { key: 'streaming', img: letreroStreaming, alt: 'Streaming', catId: categoryIds.streaming, catName: categoryNames.streaming, items: previewByCategory.streaming },
          { key: 'suscripciones', img: letreroSuscripciones, alt: 'Suscripciones', catId: categoryIds.suscripciones, catName: categoryNames.suscripciones, items: previewByCategory.suscripciones },
        ]).map((sec) => (
          <div key={sec.key} style={{ marginBottom: 26 }}>
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <img src={sec.img} alt={sec.alt} style={{ maxWidth: 520, width: '92%', height: 'auto' }} />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth < 700 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                gap: 14,
                justifyItems: 'center'
              }}
            >
              {(sec.items || []).map((prod) => {
                const min = getMinPriceForHome(prod);
                return (
                  <Link
                    key={prod.id}
                    to={prodUrl(prod.name, prod.id)}
                    onClick={(e) => {
                      if (!user) {
                        e.preventDefault();
                        openAuthModal();
                      }
                    }}
                    style={{ textDecoration: 'none', width: '100%', maxWidth: 280 }}
                  >
                    <div
                      style={{
                        background: '#ffffff10',
                        border: '1.5px solid #a084e8',
                        borderRadius: 16,
                        boxShadow: '0 6px 22px #0003',
                        padding: 12,
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10,
                        minHeight: 250
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: 150,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}
                      >
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            loading="lazy"
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', borderRadius: 12, background: '#ffffff18' }} />
                        )}
                      </div>
                      <div
                        style={{
                          color: '#fff',
                          fontWeight: 900,
                          textAlign: 'center',
                          textShadow: '0 2px 10px #0006',
                          lineHeight: 1.15,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          minHeight: 42
                        }}
                      >
                        {prod.name}
                      </div>
                      <div style={{ marginTop: 'auto' }}>
                        <span
                          style={{
                            background: '#2a126b',
                            color: '#fff',
                            borderRadius: 999,
                            padding: '6px 14px',
                            fontWeight: 900,
                            boxShadow: '0 2px 10px #2a126b22',
                            whiteSpace: 'nowrap',
                            display: 'inline-block'
                          }}
                        >
                          {min ? `${formatPrecio(min, moneda)} ${moneda}` : `Ver producto`}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
              <Link
                to={sec.catId ? catUrl(sec.catName, sec.catId) : '/productos'}
                style={{
                  background: 'linear-gradient(90deg, #7b2ff2 0%, #f357a8 100%)',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: '1.05rem',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 34px',
                  boxShadow: '0 8px 22px #7b2ff233',
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
              >
                Ver más
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Ventas anteriores (testimonios) */}
      <div className="home-testimonios" style={{ marginTop: 34 }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <img
            src={ventasHeader}
            alt="Ventas anteriores"
            style={{
              maxWidth: '600px',
              width: '95%',
              height: 'auto',
              display: 'inline-block'
            }}
          />
        </div>

        <div
          className="home-testimonios-list"
          style={{
            display: 'flex',
            overflowX: 'auto',
            gap: 24,
            padding: '8px 0 18px 0',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            justifyContent: 'center',
            alignItems: 'stretch',
            maxWidth: '100vw',
            margin: '0 auto'
          }}
        >
          {testimonios.slice(0, 6).map((t) => (
            <div
              key={t.id}
              style={{
                background: 'rgba(34,34,44,0.98)',
                borderRadius: 18,
                boxShadow: '0 4px 24px #7b2ff233, 0 1.5px 0 #a084e8',
                border: '2px solid #393053',
                padding: 18,
                minWidth: 180,
                maxWidth: 220,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: 10,
                position: 'relative',
                overflow: 'visible',
                color: '#fff',
                scrollSnapAlign: 'center',
                aspectRatio: '1/1'
              }}
            >
              <div style={{ width: '100%', height: 0, paddingBottom: '100%' }}>
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    background: 'transparent',
                    borderRadius: 14,
                    overflow: 'hidden',
                    marginBottom: 14,
                    boxShadow: '0 2px 12px #a084e822'
                  }}
                >
                  <img
                    src={t.imagen}
                    alt="Testimonio"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                      borderRadius: 14,
                      background: 'transparent'
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <style>{`
          @media (min-width: 700px) {
            .home-testimonios-list {
              overflow-x: visible !important;
              justify-content: center !important;
              flex-wrap: nowrap !important;
              gap: 24px !important;
              max-width: 1200px;
              margin: 0 auto;
            }
            .home-testimonios-list > div {
              min-width: 140px !important;
              max-width: 180px !important;
              flex: 1 1 0 !important;
            }
          }
        `}</style>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
          <Link
            to="/testimonios"
            style={{
              background: 'linear-gradient(90deg, #7b2ff2 0%, #f357a8 100%)',
              color: '#fff',
              fontWeight: 900,
              fontSize: '1.05rem',
              border: 'none',
              borderRadius: 12,
              padding: '12px 34px',
              boxShadow: '0 8px 22px #7b2ff233',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            Ver más Ventas
          </Link>
        </div>
      </div>
      </div>
    </>
  );
}



