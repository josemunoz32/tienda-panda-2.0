
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from 'react-helmet-async';
import { catUrl, prodUrl } from '../../utils/slugify';
import { useMoneda, PAISES_CONFIG } from "../../context/MonedaContext";
import { db, auth } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  limit,
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
import steamLogo from '../../assets/logos/logosteam.png';
import wspLogo from '../../assets/logos/logowsp.png';
import steamFastLookup from '../../assets/steam_fast_lookup.json';
import pandaLoader from '../../assets/logos/miicono.png';
import DepthCarousel from "../../components/DepthCarousel/DepthCarousel";
import StrokeText from "../../components/StrokeText/StrokeText";
import SpecularButton from "../../components/SpecularButton/SpecularButton";
import DriftWall from "../../components/DriftWall/DriftWall";
import AccordionGallery from "../../components/AccordionGallery/AccordionGallery";
import Loader from "../../components/Loader";
import WelcomeCategoriesModal from "../../components/WelcomeCategoriesModal/WelcomeCategoriesModal";
import ReviewRewardModal, { REVIEW_REWARD_KEY } from "../../components/ReviewRewardModal/ReviewRewardModal";
import "./Home.css";

function HomeLoadingScreen() {
  return <Loader text="Cargando..." subtext="PandaStore • Catálogo & Novedades" fullScreen={true} />;
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
  // Modal de bienvenida con categorías oficiales que sale al entrar a la web
  const [showModal, setShowModal] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    return path === "/" || path === "/home";
  });
  const [showReviewReward, setShowReviewReward] = useState(false);

  const openReviewRewardIfEligible = async () => {
    if (localStorage.getItem(REVIEW_REWARD_KEY)) return;

    const currentUser = auth.currentUser;
    if (currentUser?.uid) {
      try {
        const existingReview = await getDocs(query(
          collection(db, "testimonios_reviews"),
          where("userId", "==", currentUser.uid),
          limit(1)
        ));
        if (!existingReview.empty) {
          // Evita volver a consultar y mostrar el incentivo a un cliente que ya participó.
          localStorage.setItem(REVIEW_REWARD_KEY, "true");
          return;
        }
      } catch (error) {
        console.warn("No se pudo comprobar la reseña anterior del cliente:", error);
        return;
      }
    }
    setShowReviewReward(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    void openReviewRewardIfEligible();
  };

  const handleSelect = async (opcion) => {
    localStorage.setItem("pandaModalDismissed", "true");
    setShowModal(false);
    if (opcion === "promos") {
      navigate("/promos");
      return;
    }

    if (opcion === "steam") {
      if (categoryIds?.steam) {
        navigate(catUrl(categoryNames?.steam || 'Juegos Steam', categoryIds.steam));
        return;
      }
    }

    // Nintendo Switch 1 y 2 debe ir a la categoría Nintendo
    if (opcion === "nintendo" || opcion === "nintendo switch 1 y 2") {
      if (categoryIds?.nintendo) {
        navigate(catUrl(categoryNames?.nintendo || 'Nintendo Switch', categoryIds.nintendo));
        return;
      }
      // fallback si aún no cargó categoryIds
    }

    // Buscar el ID de la categoría por nombre y redirigir
    const nombreMap = {
      steam: "steam",
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
  const [resellerBannerDismissed, setResellerBannerDismissed] = useState(false);
  // (Removido openAuthModal para permitir acceso a invitados)
  const { moneda, formatearPrecio, pais, setPais } = useMoneda();
  // Ref para el canvas de fondo galaxia
  const galaxyRef = useRef(null);
  const enableGalaxy = false;

  // Preview de Promociones (4 imágenes)
  const promosPreview = useMemo(() => ([
    { key: 'promo-basica-2x', title: 'Arma tu pack 2X Básica', img: require('../../assets/promos/2 x 25.000 basica.png') },
    { key: 'promo-basica-3x', title: 'Arma tu pack 3X Básica', img: require('../../assets/promos/3x1 $35.000 basica.png') },
    { key: 'promo-deluxe-2x', title: 'Arma tu pack Deluxe 2X', img: require('../../assets/promos/deluxe 2 x 30.000.png') },
    { key: 'promo-deluxe-3x', title: 'Arma tu pack Deluxe 3X', img: require('../../assets/promos/deluxe 3 x40.000.png') },
  ]), []);

  const promoCarouselItems = useMemo(() => (
    promosPreview.map(p => ({
      image: p.img,
      alt: p.title,
      title: p.title,
      subtitle: '🔥 Oferta Especial',
      key: p.key
    }))
  ), [promosPreview]);

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

  // Eliminado el useEffect manual de SEO, usamos Helmet en el return

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

    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 60 : 160;
    const particles = Array.from({length: particleCount}, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2.2 + 1.0,
      speed: Math.random() * 0.18 + 0.08,
      alpha: Math.random() * 0.8 + 0.5
    }));

    let shootingStars = [];
    function spawnShootingStar() {
      if (Math.random() < 0.02) {
        shootingStars.push({
          x: Math.random() * width * 0.8 + width * 0.1,
          y: Math.random() * height * 0.4 + height * 0.05,
          len: Math.random() * 140 + 60,
          speed: Math.random() * 9 + 6,
          angle: Math.PI / 4 + (Math.random() - 0.5) * 0.18,
          alpha: 1
        });
      }
    }

    function draw() {
      if (document.hidden) {
        animationId = requestAnimationFrame(draw);
        return;
      }
      ctx.clearRect(0, 0, width, height);

      // Fondo gradiente galaxia real
      const grad = ctx.createRadialGradient(width/2, height/2, width*0.08, width/2, height/2, width*0.95);
      grad.addColorStop(0, '#4f5b93');
      grad.addColorStop(0.18, '#232a3a');
      grad.addColorStop(0.38, '#181c2b');
      grad.addColorStop(0.7, '#0a0a13');
      grad.addColorStop(1, '#000');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Partículas (estrellas) optimizadas sin shadowBlur para prevenir memory leaks
      ctx.fillStyle = '#ffffff';
      for (const p of particles) {
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
        ctx.fill();
        p.y += p.speed;
        if (p.y > height) {
          p.y = 0;
          p.x = Math.random() * width;
        }
      }

      // Estrellas fugaces optimizadas
      ctx.lineWidth = 2.2;
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        ctx.globalAlpha = s.alpha;
        ctx.strokeStyle = 'rgba(173,216,230,0.85)';
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - Math.cos(s.angle) * s.len, s.y - Math.sin(s.angle) * s.len);
        ctx.stroke();
        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.alpha -= 0.012;
        if (s.alpha <= 0) shootingStars.splice(i, 1);
      }
      spawnShootingStar();
      animationId = requestAnimationFrame(draw);
    }
    draw();
    window.addEventListener('resize', resizeCanvas, { passive: true });
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
  const driftWallItems = useMemo(() => {
    if (!Array.isArray(testimonios) || testimonios.length === 0) return [];
    return testimonios.map(t => ({
      image: t.imagen,
      title: t.nombre || t.titulo || 'Venta PandaStore',
      href: '/testimonios'
    }));
  }, [testimonios]);
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
    // Siempre usar CLP como base; formatearPrecio del contexto convierte a la moneda activa
    if (prod?.priceCLP) precios.push(Number(prod.priceCLP));
    if (prod?.pricePrimariaCLP) precios.push(Number(prod.pricePrimariaCLP));
    if (prod?.priceSecundariaCLP) precios.push(Number(prod.priceSecundariaCLP));
    if (Array.isArray(prod?.preciosPorMes)) {
      prod.preciosPorMes.forEach((p) => { if (p?.clp) precios.push(Number(p.clp)); });
    }
    const nums = precios.filter((x) => Number.isFinite(x) && x > 0);
    return nums.length ? Math.min(...nums) : null;
  };

  const categoryIds = useMemo(() => {
    const norm = (s) => (s || "").toString().trim().toLowerCase();
    const findCat = (predicate, fallbackId) => {
      const found = categorias.find(c => predicate(norm(c?.name), c?.id));
      return found ? found.id : fallbackId;
    };
    return {
      steam: findCat((n, id) => id === 'lW3JaYVl6iDINZI57WE1' || n.includes('steam'), 'lW3JaYVl6iDINZI57WE1'),
      nintendo: findCat((n, id) => id === 'VtQaPwP0xXdC1qdz6Hvq' || ((n.includes('nintendo') || n.includes('switch')) && !n.includes('2')), 'VtQaPwP0xXdC1qdz6Hvq'),
      ps4: findCat((n, id) => id === 'xA4NsfBdY5MOvqegPDBw' || (n.includes('ps4') || n.includes('play 4') || n.includes('playstation 4')), 'xA4NsfBdY5MOvqegPDBw'),
      ps5: findCat((n, id) => id === 'cLMyaADucf7zGkC73DWK' || (n.includes('ps5') || n.includes('play 5') || n.includes('playstation 5')), 'cLMyaADucf7zGkC73DWK'),
      streaming: findCat((n, id) => id === 'KY1aLOOEMmQAunfZq5Ya' || n.includes('streaming'), 'KY1aLOOEMmQAunfZq5Ya'),
      suscripciones: findCat((n, id) => id === 'SKkWSCanKlQ8yP6CJgnr' || n.includes('suscrip'), 'SKkWSCanKlQ8yP6CJgnr'),
    };
  }, [categorias]);

  const categoryNames = useMemo(() => {
    const nameOf = (id, fallback) => categorias.find(c => c.id === id)?.name || fallback;
    return {
      steam: nameOf(categoryIds.steam, 'Juegos Steam'),
      nintendo: nameOf(categoryIds.nintendo, 'Nintendo Switch'),
      ps4: nameOf(categoryIds.ps4, 'Ps4'),
      ps5: nameOf(categoryIds.ps5, 'Ps5'),
      streaming: nameOf(categoryIds.streaming, 'Streaming'),
      suscripciones: nameOf(categoryIds.suscripciones, 'Suscripciones'),
    };
  }, [categoryIds, categorias]);

  const resolveSteamCover = (prod) => {
    if (prod?.imageUrl && prod.imageUrl.trim() !== "") return prod.imageUrl;
    const appId = prod?.app_id || (prod?.id && !isNaN(prod.id) ? prod.id : null);
    const cleanN = (prod?.name || '').toLowerCase()
      .replace(/\|.*$/g, '')
      .replace(/\+.*dlc.*/g, '')
      .replace(/\b(dlc|expansion|edition|deluxe|remastered|definitive)\b/g, '')
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

    if (steamFastLookup && steamFastLookup[cleanN]?.imageUrl) {
      return steamFastLookup[cleanN].imageUrl;
    }
    if (appId) {
      return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
    }
    return null;
  };

  const previewByCategory = useMemo(() => {
    const takeProds = (catId, isSteam = false) => {
      if (!catId) return [];
      const list = productos.filter((p) => p?.categoryId === catId);
      if (isSteam) {
        const steamResolved = list
          .map(p => {
            const img = resolveSteamCover(p);
            return {
              ...p,
              imageUrl: img,
              priceCLP: p.priceCLP ? Number(p.priceCLP) : 2000
            };
          })
          .filter(p => Boolean(p.imageUrl));

        const POPULAR_KEYWORDS = ['resident evil', 'tomb raider', 'f1', 'wolfenstein', 'god of war', 'elden ring', 'cyberpunk', 'batman', 'final fantasy', 'ark', 'sonic'];
        steamResolved.sort((a, b) => {
          const aPop = POPULAR_KEYWORDS.some(k => (a.name || '').toLowerCase().includes(k)) ? 1 : 0;
          const bPop = POPULAR_KEYWORDS.some(k => (b.name || '').toLowerCase().includes(k)) ? 1 : 0;
          return bPop - aPop;
        });

        return steamResolved.slice(0, 10);
      }
      return list.slice(0, 8);
    };

    return {
      steam: takeProds(categoryIds.steam, true),
      nintendo: takeProds(categoryIds.nintendo),
      ps4: takeProds(categoryIds.ps4),
      ps5: takeProds(categoryIds.ps5),
      streaming: takeProds(categoryIds.streaming),
      suscripciones: takeProds(categoryIds.suscripciones),
    };
  }, [productos, categoryIds]);

  useEffect(() => {
    let isMounted = true;
    const failsafeTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 2500);

    const fetchProductos = async () => {
      try {
        const snapshot = await getDocs(collection(db, "products"));
        if (!isMounted) return;
        const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProductos(prods);
        // Generar destacados aleatorios solo una vez
        setDestacados(prods.length > 0 ? [...prods].sort(() => 0.5 - Math.random()).slice(0, 10) : []);
        // Mezclar productos solo una vez para el listado principal
        setProductosAleatorios(prods.length > 0 ? [...prods].sort(() => 0.5 - Math.random()) : []);
      } catch (err) {
        console.error("Error al cargar productos en Home:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProductos();

    return () => {
      isMounted = false;
      clearTimeout(failsafeTimer);
    };
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
    if (!prod) return;
    let customProd = { ...prod };
    if (tipo === 'ps') {
      customProd.variante = opcion.value;
      customProd.priceCLP = opcion.priceCLP;
      if (opcion.priceUSD) customProd.priceUSD = opcion.priceUSD;
      if (opcion.precioPublicoCLP) customProd.precioPublicoCLP = opcion.precioPublicoCLP;
      if (opcion.isResellerPrice) customProd.isResellerPrice = true;
    } else if (tipo === 'suscripcion') {
      customProd.meses = opcion.value;
      customProd.priceCLP = opcion.priceCLP;
      if (opcion.priceUSD) customProd.priceUSD = opcion.priceUSD;
      if (opcion.precioPublicoCLP) customProd.precioPublicoCLP = opcion.precioPublicoCLP;
      if (opcion.isResellerPrice) customProd.isResellerPrice = true;
    }
    await handleCartAddOrRemove({
      db,
      user,
      prod: customProd,
      moneda,
      cartIds: Object.keys(inCart),
      setModal: null
    });
    setModal({ open: false, prod: null, opciones: [], tipo: null });
  };
  // handleCartModal removed: now unused, as cart logic is unified and modal cart add is not supported in this view

  const handleFav = async (prod) => {
    if (!user) {
      let localFavs = [];
      try {
        const stored = localStorage.getItem('guestFavs');
        if (stored) localFavs = JSON.parse(stored);
      } catch(e) {}
      if (favIds.includes(prod.id)) {
        localFavs = localFavs.filter(f => f.productId !== prod.id);
      } else {
        localFavs.push({
          productId: prod.id,
          name: prod.name,
          imageUrl: prod.imageUrl || null,
          priceCLP: prod.priceCLP || null,
          priceUSD: prod.priceUSD || null
        });
      }
      localStorage.setItem('guestFavs', JSON.stringify(localFavs));
      window.dispatchEvent(new Event('localFavUpdated'));
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

  const isMobile = window.innerWidth <= 700;

  return (
    <>
      <Helmet>
        <title>PandaStore | Tienda de Videojuegos Digitales • Steam PC, Nintendo Switch, PS5 y PS4 Baratos</title>
        <meta name="description" content="Tienda online #1 de videojuegos digitales en Latinoamérica. Juegos para Steam PC con Activador oficial, Nintendo Switch 1 y 2, PlayStation 5 y PS4. Cuentas primarias y secundarias, packs 2x1 y estrenos VIP con entrega inmediata 24/7." />
        <meta name="keywords" content="comprar juegos digitales, juegos steam baratos, juegos pc baratos, activador steam pc, pandastore launcher, juegos ps4 baratos, juegos ps5 digitales, cuentas primarias ps5, cuentas secundarias ps4, juegos nintendo switch baratos, nintendo switch 2 juegos digitales, ofertas videojuegos steam, tienda gamer online, comprar juegos digitales chile, juegos digitales argentina, juegos digitales mexico, juegos digitales colombia, entrega inmediata videojuegos, black myth wukong pc barato, ea sports fc 25 barato, elden ring pc barato, silent hill 2 remake barato, dragon ball sparking zero steam, gta v pc barato, comprar juegos steam offline, packs de juegos steam, suscripcion ps plus barata, nintendo switch online barato, pandastore" />
        <meta property="og:title" content="PandaStore | Tienda #1 de Videojuegos Digitales • Steam PC, Switch, PS5 y PS4" />
        <meta property="og:description" content="Catálogo líder de videojuegos digitales en Latinoamérica: Steam PC, Nintendo Switch 1 y 2, PlayStation 5 y PS4. Entrega inmediata 24/7 y mejor precio garantizado." />
        <meta property="og:url" content="https://pandastoreupdate.web.app/" />
        <meta property="og:image" content="https://pandastoreupdate.web.app/banner.png" />
        <meta name="twitter:title" content="PandaStore | Tienda #1 de Videojuegos Digitales • Steam PC, Switch, PS5 y PS4" />
        <meta name="twitter:description" content="Compra juegos digitales para Steam PC, Nintendo Switch 1 y 2, PS5 y PS4 en PandaStore. Entrega inmediata 24/7 y garantía total." />
        <meta name="twitter:image" content="https://pandastoreupdate.web.app/banner.png" />
        <link rel="canonical" href="https://pandastoreupdate.web.app/" />
        <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "PandaStore | Tienda #1 de Videojuegos Digitales",
          "url": "https://pandastoreupdate.web.app/",
          "description": "La mayor tienda de videojuegos digitales en Latinoamérica: Steam PC con activador, Nintendo Switch 1 y 2, PS5 y PS4. Entrega 24/7.",
          "isPartOf": {
            "@type": "WebSite",
            "name": "PandaStore",
            "url": "https://pandastoreupdate.web.app/"
          }
        })}
        </script>
      </Helmet>
      {showModal && (
        <WelcomeCategoriesModal
          visible={showModal}
          onClose={handleCloseModal}
          categoryIds={categoryIds}
          categoryNames={categoryNames}
        />
      )}
      {showReviewReward && (
        <ReviewRewardModal
          visible={showReviewReward}
          onClose={() => setShowReviewReward(false)}
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
          paddingBottom: 80,
          marginTop: isMobile ? 90 : 220,
        }}
      >
      {/* Auth modal removido */}

      <div className="home-content">

        {/* ── AVISO DE VALIDACIÓN REVENDEDOR (FULL RESPONSIVE & CON LOGO WSP OFICIAL) ── */}
        {location.state?.resellerNotice && !resellerBannerDismissed && (
          <div style={{
            margin: "0 0 24px 0",
            background: "linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(6, 78, 59, 0.94) 100%)",
            border: "1.5px solid rgba(52, 211, 153, 0.55)",
            borderRadius: 20,
            padding: "16px 20px",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5), 0 0 25px rgba(16, 185, 129, 0.2)",
            backdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            animation: "fadeIn 0.3s ease"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 260, flex: "1 1 300px" }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 4px 14px rgba(37, 211, 102, 0.4)"
              }}>
                <img
                  src={wspLogo}
                  alt="WhatsApp Oficial"
                  style={{ width: 32, height: 32, objectFit: "contain", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))" }}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#34d399", fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <span>⏳ POSTULACIÓN ENVIADA</span>
                  <span>•</span>
                  <span>ESPERA TU VALIDACIÓN</span>
                </div>
                <h4 style={{ margin: "2px 0 0", color: "#fff", fontSize: "1rem", fontWeight: 900 }}>
                  ¡Gracias por postular como Revendedor Oficial!
                </h4>
                <p style={{ margin: "2px 0 0", color: "#cbd5e1", fontSize: "0.82rem", lineHeight: 1.4 }}>
                  Tu solicitud está en revisión. Por ahora puedes navegar como cliente; cuando un administrador apruebe tu cuenta, se activarán automáticamente tus precios y beneficios mayoristas. ¿Quieres acelerar la revisión? Escríbenos por WhatsApp.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
              <a
                href="https://wa.me/56974751810?text=Hola%20PandaStore!%20👋%20Acabo%20de%20postular%20como%20Revendedor%20Oficial%20B2B.%20¿Podrías%20validar%20mi%20cuenta?%20¡Gracias!"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: "0.86rem",
                  textDecoration: "none",
                  padding: "10px 18px",
                  borderRadius: 14,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 6px 18px rgba(37, 211, 102, 0.45)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  cursor: "pointer"
                }}
              >
                <span>Avisar al Admin por WhatsApp</span>
                <span style={{ fontSize: "1rem" }}>→</span>
              </a>
              <button
                type="button"
                onClick={() => setResellerBannerDismissed(true)}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  color: "#94a3b8",
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  transition: "all 0.2s"
                }}
                title="Cerrar aviso"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════
            SECCIÓN: PROMOCIONES (DepthCarousel)
        ══════════════════════════════════ */}
        <section className="home-section">
          <div className="home-sec-hdr">
            <div className="home-sec-title-container">
              <StrokeText
                text="Promociones"
                strokeColor="#a259ff"
                fillColor="#ffffff"
                strokeWidth={1.6}
                fontSize={42}
                fontWeight={900}
                letterSpacing={-1}
                trigger="loop"
                fillMode="wipe"
              />
            </div>
            <SpecularButton
              size="sm"
              radius={20}
              tint="#a259ff"
              tintOpacity={0.15}
              lineColor="#a259ff"
              baseColor="#2d1b4e"
              intensity={1.2}
              autoAnimate
              onClick={() => navigate('/promos')}
            >
              Ver todo <span className="material-icons" style={{fontSize:16,verticalAlign:'middle',marginLeft:2}}>arrow_forward</span>
            </SpecularButton>
          </div>

          <div className="home-section-dual-content">
            <div className="home-depth-carousel-wrapper" style={{ height: '460px', position: 'relative', margin: '0' }}>
              <DepthCarousel
                items={promoCarouselItems}
                depth={220}
                spread={90}
                tilt={22}
                tiltDirection="right"
                perspective={1400}
                visibleCards={4}
                falloff={0.2}
                blur={6}
                autoplay
                autoplayDelay={3200}
                loop
                showControls
                showIndicators
                onItemClick={(item) => {
                  if (item.link) navigate(item.link);
                }}
              />
            </div>

            <div className="home-desktop-side-grid">
              {promosPreview.slice(0, 4).map((promo) => (
                <Link key={promo.key} to="/promos" className="home-desktop-mini-card">
                  <img src={promo.img} alt={promo.title} className="home-desktop-mini-img" loading="lazy" />
                  <span className="home-desktop-mini-title">{promo.title}</span>
                  <span className="home-desktop-mini-price">🔥 Oferta Pack</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="home-sec-cta-wrap">
            <SpecularButton
              size="md"
              radius={24}
              tint="#00f5d4"
              tintOpacity={0.18}
              lineColor="#00f5d4"
              baseColor="#0d3b34"
              intensity={1.3}
              autoAnimate
              onClick={() => navigate('/promos')}
            >
              <span className="material-icons" style={{fontSize:18}}>local_fire_department</span>
              Ver todas las Promociones
            </SpecularButton>
          </div>
        </section>

        {/* ══════════════════════════════════
            SECCIONES POR CATEGORÍA (DepthCarousel + PC Grid)
        ══════════════════════════════════ */}
        {([
          { key: 'steam',         title: 'Steam',           strokeColor: '#a259ff', catId: categoryIds.steam,         catName: categoryNames.steam,         items: previewByCategory.steam,         fallbackImg: steamLogo,            badge: '🔥 Catálogo PC' },
          { key: 'nintendo',      title: 'Nintendo Switch', strokeColor: '#ff2a6d', catId: categoryIds.nintendo,      catName: categoryNames.nintendo,      items: previewByCategory.nintendo,      fallbackImg: letreroNintendo,      badge: '🎮 Switch 1 & 2' },
          { key: 'ps4',           title: 'Juegos PS4',      strokeColor: '#0072ce', catId: categoryIds.ps4,           catName: categoryNames.ps4,           items: previewByCategory.ps4,           fallbackImg: letreroPS4,           badge: '⚡ PS4 Digital' },
          { key: 'ps5',           title: 'Juegos PS5',      strokeColor: '#00d4ff', catId: categoryIds.ps5,           catName: categoryNames.ps5,           items: previewByCategory.ps5,           fallbackImg: letreroPS5,           badge: '🚀 PS5 Next-Gen' },
          { key: 'streaming',     title: 'Streaming',       strokeColor: '#00f5d4', catId: categoryIds.streaming,     catName: categoryNames.streaming,     items: previewByCategory.streaming,     fallbackImg: letreroStreaming,     badge: '📺 Cuentas & Pases' },
          { key: 'suscripciones', title: 'Suscripciones',   strokeColor: '#ffb703', catId: categoryIds.suscripciones, catName: categoryNames.suscripciones, items: previewByCategory.suscripciones, fallbackImg: letreroSuscripciones, badge: '⭐ Membresías VIP' },
        ]).map((sec, secIdx) => {
          let carouselData = (Array.isArray(sec.items) && sec.items.length > 0)
            ? sec.items.map(prod => ({
                image: prod.imageUrl || sec.fallbackImg || pandaLoader,
                alt: prod.name,
                title: prod.name,
                subtitle: getMinPriceForHome(prod) ? formatearPrecio(getMinPriceForHome(prod)) : sec.badge,
                link: prodUrl(prod.name, prod.id),
                key: prod.id
              }))
            : [
                { image: sec.fallbackImg || pandaLoader, alt: sec.title, title: sec.title, subtitle: sec.badge, link: sec.catId ? catUrl(sec.catName, sec.catId) : '/productos' }
              ];

          // Si hay menos de 4 tarjetas, duplicar para mantener la experiencia 3D de DepthCarousel
          if (carouselData.length > 1 && carouselData.length < 4) {
            const original = [...carouselData];
            let step = 0;
            while (carouselData.length < 4) {
              const prefix = `dup-${step++}`;
              for (let i = 0; i < original.length && carouselData.length < 4; i++) {
                const it = original[i];
                carouselData.push({ ...it, key: `${it.key || i}-${prefix}` });
              }
            }
          }

          const targetUrl = sec.catId ? catUrl(sec.catName, sec.catId) : '/productos';

          return (
            <section key={sec.key} className="home-section" id={sec.key === 'nintendo' ? 'home-catalogo' : undefined}>
              <div className="home-sec-hdr">
                <div className="home-sec-title-container">
                  <StrokeText
                    text={sec.title}
                    strokeColor={sec.strokeColor}
                    fillColor="#ffffff"
                    strokeWidth={1.6}
                    fontSize={40}
                    fontWeight={900}
                    letterSpacing={-1}
                    trigger="loop"
                    fillMode="wipe"
                  />
                </div>
                <SpecularButton
                  size="sm"
                  radius={20}
                  tint={sec.strokeColor}
                  tintOpacity={0.15}
                  lineColor={sec.strokeColor}
                  baseColor="#1e2030"
                  intensity={1.2}
                  autoAnimate
                  onClick={() => navigate(targetUrl)}
                >
                  Ver todo <span className="material-icons" style={{fontSize:16,verticalAlign:'middle',marginLeft:2}}>arrow_forward</span>
                </SpecularButton>
              </div>

              <div className="home-section-dual-content">
                <div className="home-depth-carousel-wrapper" style={{ height: '460px', position: 'relative', margin: '0' }}>
                  <DepthCarousel
                    items={carouselData}
                    depth={210}
                    spread={88}
                    tilt={22}
                    tiltDirection={secIdx % 2 === 0 ? 'right' : 'left'}
                    perspective={1400}
                    visibleCards={4}
                    falloff={0.2}
                    blur={6}
                    autoplay
                    autoplayDelay={3400 + secIdx * 300}
                    loop
                    showControls
                    showIndicators
                    onItemClick={(item) => {
                      if (item.link) navigate(item.link);
                    }}
                  />
                </div>

                {Array.isArray(sec.items) && sec.items.length > 0 && (
                  <div className="home-desktop-side-grid">
                    {sec.items.slice(0, 4).map((prod) => (
                      <Link key={prod.id} to={prodUrl(prod.name, prod.id)} className="home-desktop-mini-card">
                        <img src={prod.imageUrl || sec.fallbackImg || pandaLoader} alt={prod.name} className="home-desktop-mini-img" loading="lazy" />
                        <span className="home-desktop-mini-title">{prod.name}</span>
                        <span className="home-desktop-mini-price">
                          {getMinPriceForHome(prod) ? formatearPrecio(getMinPriceForHome(prod)) : 'Ver precio'}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="home-sec-cta-wrap">
                <SpecularButton
                  size="md"
                  radius={24}
                  tint={sec.strokeColor}
                  tintOpacity={0.2}
                  lineColor={sec.strokeColor}
                  baseColor="#2d1f48"
                  intensity={1.3}
                  autoAnimate
                  onClick={() => navigate(targetUrl)}
                >
                  <span className="material-icons" style={{fontSize:18}}>explore</span>
                  Ver todo {sec.title}
                </SpecularButton>
              </div>
            </section>
          );
        })}

        {/* ══════════════════════════════════
            SECCIÓN: VENTAS / TESTIMONIOS (DriftWall)
        ══════════════════════════════════ */}
        {testimonios.length > 0 && (
          <section className="home-section home-section-testi">
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <img src={ventasHeader} alt="Ventas anteriores" style={{ maxWidth: 520, width: '92%', height: 'auto' }} />
            </div>
            <div className="home-driftwall-wrapper" style={{ height: 480, position: 'relative', width: '100%', overflow: 'hidden', borderRadius: 20, margin: '20px 0' }}>
              <DriftWall
                items={driftWallItems}
                columns={5}
                tileWidth={220}
                tileHeight={140}
                gap={18}
                tilt={16}
                turn={-14}
                perspective={1200}
                depth={120}
                speed={42}
                direction="up"
                variance={0.45}
                parallax={0.6}
                lift={64}
                fade={0.6}
                dim={0.65}
                overlayColor="#060010"
              />
            </div>
            <div className="home-sec-cta-wrap" style={{marginTop: 24}}>
              <SpecularButton
                size="md"
                radius={24}
                tint="#a259ff"
                tintOpacity={0.2}
                lineColor="#a259ff"
                baseColor="#2d1f48"
                intensity={1.3}
                autoAnimate
                onClick={() => navigate('/testimonios')}
              >
                Ver más ventas
              </SpecularButton>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════
            FOOTER CTA FINAL
        ══════════════════════════════════ */}
        <div className="home-footer-cta">
          <div className="home-footer-cta-orb" />
          <h2 className="home-footer-cta-title">Tu próximo juego favorito te espera</h2>
          <p className="home-footer-cta-sub">Compra en segundos, recibe al instante. Miles de títulos para PS4, PS5, Nintendo Switch y más.</p>
          <div style={{display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap',alignItems:'center'}}>
            <SpecularButton
              size="lg"
              radius={26}
              tint="#00f5d4"
              tintOpacity={0.25}
              lineColor="#00f5d4"
              baseColor="#0e3d36"
              intensity={1.5}
              autoAnimate
              onClick={() => navigate('/promos')}
            >
              Ver Ofertas
            </SpecularButton>
            <SpecularButton
              size="lg"
              radius={26}
              tint="#a259ff"
              tintOpacity={0.25}
              lineColor="#a259ff"
              baseColor="#321b54"
              intensity={1.5}
              autoAnimate
              onClick={() => navigate(categoryIds.nintendo ? catUrl(categoryNames.nintendo, categoryIds.nintendo) : '/productos')}
            >
              Ver Catálogo
            </SpecularButton>
          </div>
        </div>

      </div>
    </div>

    {/* Variant / Subscription modal */}
    {modal.open && (
      <div className="catpage-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal({ open: false, prod: null, opciones: [], tipo: null }); }}>
        <div className="catpage-modal-card">
          <h3>Selecciona una opci&oacute;n</h3>
          <ul className="catpage-modal-options">
            {modal.opciones.map(op => (
              <li key={op.value}>
                <button
                  className="catpage-modal-option-btn"
                  onClick={() => handleCartModal(op)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    width: "100%",
                    padding: "12px 16px"
                  }}
                >
                  <span style={{ fontSize: "1rem", fontWeight: 700 }}>{op.label}</span>
                  <span style={{ fontSize: "1.05rem", fontWeight: 800, color: op.isResellerPrice ? "#00f5d4" : "#ffffff" }}>
                    {formatearPrecio(op.priceCLP)}
                  </span>
                  {op.isResellerPrice && (
                    <span style={{
                      fontSize: "0.72rem",
                      color: "#00f5d4",
                      background: "rgba(0, 245, 212, 0.15)",
                      border: "1px solid rgba(0, 245, 212, 0.3)",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontWeight: 700
                    }}>
                      💎 Descuento Revendedor (-$5.000)
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <button className="catpage-modal-cancel" onClick={() => setModal({ open: false, prod: null, opciones: [], tipo: null })}>Cancelar</button>
        </div>
      </div>
    )}
    </>
  );
}



