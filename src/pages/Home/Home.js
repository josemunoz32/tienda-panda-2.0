import React, { useEffect, useState, useRef } from "react";
import defaultBanner from "../../assets/default-banner.jpg";
import mobileBanner from "../../assets/mobile-banner.jpg";
import "./Home.css";
import { useMoneda } from "../../context/MonedaContext";
// Importar logos de consolas
import ps4Logo from '../../assets/logos/ps4.png';
import ps5Logo from '../../assets/logos/ps5.png';
import switchLogo from '../../assets/logos/switch.png';
import streamingLogo from '../../assets/logos/streaming.png';
import suscripcionesLogo from '../../assets/logos/suscripciones.png';
import { db, auth } from "../../firebase";
import { collection, getDocs, doc, getDoc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { handleCartAddOrRemove } from "../../utils/cartHelpers";
import { Link, useNavigate } from "react-router-dom";

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
function DestacadosCarrusel({ productos, moneda, handleFav, favIds }) {
  const [index, setIndex] = useState(0);
  // Touch/swipe state
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const destacados = productos.length > 0 ? [...productos].sort(() => 0.5 - Math.random()).slice(0, 10) : [];
  const max = destacados.length;
  const mostrar = 3;
  const start = Math.max(0, Math.min(index, max - mostrar));
  const visibles = destacados.slice(start, start + mostrar);

  const handlePrev = () => setIndex(i => Math.max(0, i - 1));
  const handleNext = () => setIndex(i => Math.min(max - mostrar, i + 1));

  // Touch handlers
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
        if (dx < 0 && index < max - mostrar) handleNext(); // swipe left
        if (dx > 0 && index > 0) handlePrev(); // swipe right
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Obtener user y openAuthModal del scope superior
  const user = auth.currentUser;
  const openAuthModal = window.openAuthModalHome;
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
                <Link to={`/producto/${prod.id}`} style={{display:'block',width:'100%',height:'100%'}} onClick={e => {
                  if (!user) {
                    e.preventDefault();
                    if (typeof openAuthModal === 'function') openAuthModal();
                  }
                }}>
                  <img
                    src={prod.imageUrl}
                    alt={prod.name}
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
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const openAuthModal = () => setShowAuthModal(true);
  const closeAuthModal = () => setShowAuthModal(false);
  // Exponer openAuthModal global para el carrusel
  useEffect(() => { window.openAuthModalHome = openAuthModal; return () => { window.openAuthModalHome = undefined; }; }, [openAuthModal]);
  const { moneda } = useMoneda();
  // Ref para el canvas de fondo galaxia
  const galaxyRef = useRef(null);

  // Estados necesarios antes de cualquier uso
  const [productos, setProductos] = useState([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // PAGINATION STATE
  const [page, setPage] = useState(1);
  const perPage = 30; // Puedes ajustar la cantidad por página

  // Fondo galaxia animado con partículas y estrellas fugaces
  useEffect(() => {
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
    let results = productos;
    if (search.trim().length > 0) {
      results = results.filter(p => p.name && p.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (selectedCat) {
      results = results.filter(p => p.categoryId === selectedCat);
    }
    if (minPrice) {
      results = results.filter(p => {
        const precios = [];
        if (moneda === "CLP") {
          if (p.priceCLP) precios.push(Number(p.priceCLP));
          if (p.pricePrimariaCLP) precios.push(Number(p.pricePrimariaCLP));
          if (p.priceSecundariaCLP) precios.push(Number(p.priceSecundariaCLP));
          if (Array.isArray(p.preciosPorMes)) {
            p.preciosPorMes.forEach(val => { if (val.clp) precios.push(Number(val.clp)); });
          }
        } else if (moneda === "USD") {
          if (p.priceUSD) precios.push(Number(p.priceUSD));
          if (p.pricePrimariaUSD) precios.push(Number(p.pricePrimariaUSD));
          if (p.priceSecundariaUSD) precios.push(Number(p.priceSecundariaUSD));
          if (Array.isArray(p.preciosPorMes)) {
            p.preciosPorMes.forEach(val => { if (val.usd) precios.push(Number(val.usd)); });
          }
        }
        const min = precios.length > 0 ? Math.min(...precios.filter(x => x > 0)) : null;
        return min !== null && min >= Number(minPrice);
      });
    }
    if (maxPrice) {
      results = results.filter(p => {
        const precios = [];
        if (moneda === "CLP") {
          if (p.priceCLP) precios.push(Number(p.priceCLP));
          if (p.pricePrimariaCLP) precios.push(Number(p.pricePrimariaCLP));
          if (p.priceSecundariaCLP) precios.push(Number(p.priceSecundariaCLP));
          if (Array.isArray(p.preciosPorMes)) {
            p.preciosPorMes.forEach(val => { if (val.clp) precios.push(Number(val.clp)); });
          }
        } else if (moneda === "USD") {
          if (p.priceUSD) precios.push(Number(p.priceUSD));
          if (p.pricePrimariaUSD) precios.push(Number(p.pricePrimariaUSD));
          if (p.priceSecundariaUSD) precios.push(Number(p.priceSecundariaUSD));
          if (Array.isArray(p.preciosPorMes)) {
            p.preciosPorMes.forEach(val => { if (val.usd) precios.push(Number(val.usd)); });
          }
        }
        const min = precios.length > 0 ? Math.min(...precios.filter(x => x > 0)) : null;
        return min !== null && min <= Number(maxPrice);
      });
    }
    setSearchResults(results.slice(0, 6));
  }, [search, productos, selectedCat, minPrice, maxPrice, moneda]);

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

  useEffect(() => {
    const fetchProductos = async () => {
      const snapshot = await getDocs(collection(db, "products"));
      setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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

  if (loading) return <div>Cargando...</div>;

  return (
    <div
      className="home-root"
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        zIndex: 10,
        background: 'linear-gradient(180deg, #18122B 0%, #393053 100%)',
        paddingBottom: 60
      }}
    >
      {/* Fondo galaxia animado */}
      <canvas ref={galaxyRef} style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* Carrusel de productos destacados */}

      <div className="home-destacados">
        <h2
          style={{
            textAlign: 'center',
            fontFamily: 'Poppins, Montserrat, Segoe UI, Arial, sans-serif',
            fontWeight: 800,
            fontSize: '2.1rem',
            letterSpacing: '0.04em',
            color: '#FFD600',
            textShadow: '0 2px 12px #7b2ff244, 0 1px 0 #18122B',
            margin: '32px 0 18px 0', // Más espacio arriba y abajo
            lineHeight: 1.1
          }}
        >
          Destacados
        </h2>
        <DestacadosCarrusel productos={productos} moneda={moneda} handleFav={handleFav} favIds={favIds} />
      </div>

      {/* Buscador principal */}
      <div className="home-buscador" style={{
        maxWidth: 520,
        margin: '0 auto 24px auto',
        background: 'rgba(44,19,80,0.18)',
        borderRadius: 16,
        boxShadow: '0 2px 12px #7b2ff244',
        padding: '18px 18px 12px 18px',
        border: '1.5px solid #a084e8',
        position: 'relative',
        zIndex: 2
      }}>
        <div className="home-buscar-box" style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <div style={{position:'relative',flex:1}}>
            <input
              type="text"
              className="home-buscar-input"
              placeholder="Buscar productos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 40px 12px 16px',
                fontSize: '1.08rem',
                borderRadius: 10,
                border: '1.5px solid #a084e8',
                outline: 'none',
                background: '#1a1a2e',
                color: '#fff',
                fontFamily: 'Poppins, Montserrat, Segoe UI, Arial, sans-serif',
                fontWeight: 600,
                boxShadow: '0 0 8px #7b2ff222',
                transition: 'border 0.25s, box-shadow 0.25s',
                marginRight: 0,
                boxSizing: 'border-box'
              }}
            />
            <span className="home-buscar-icon" style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 22,
              color: '#FFD600',
              pointerEvents: 'none',
              textShadow: '0 1px 6px #7b2ff244',
              zIndex: 2
            }}>🔍</span>
          </div>
          <button className="home-buscar-filtros-btn" onClick={() => setShowFilters(f => !f)} style={{
            background: 'linear-gradient(90deg, #7b2ff2 0%, #f357a8 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 14px',
            fontWeight: 700,
            fontSize: '1.1rem',
            boxShadow: '0 2px 8px #7b2ff244',
            cursor: 'pointer',
            transition: 'background 0.18s, color 0.18s, box-shadow 0.18s, transform 0.15s',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 44,
            minWidth: 44,
            zIndex: 3
          }}>
            <span className="material-icons">tune</span>
          </button>
        </div>
        {showFilters && (
          <div className="home-buscar-filtros" style={{display:'flex',gap:10,marginBottom:8,flexWrap:'wrap',alignItems:'center',justifyContent:'center'}}>
            <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1.5px solid #a084e8',
              background: '#1a1a2e',
              color: '#fff',
              fontSize: '1rem',
              fontFamily: 'Poppins, Montserrat, Segoe UI, Arial, sans-serif',
              fontWeight: 500,
              outline: 'none',
              minWidth: 140
            }}>
              <option value="">Todas las categorías</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <input type="number" placeholder="Precio mín" value={minPrice} onChange={e => setMinPrice(e.target.value)} style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1.5px solid #a084e8',
              background: '#1a1a2e',
              color: '#fff',
              fontSize: '1rem',
              fontFamily: 'Poppins, Montserrat, Segoe UI, Arial, sans-serif',
              fontWeight: 500,
              outline: 'none',
              minWidth: 90
            }} />
            <input type="number" placeholder="Precio máx" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1.5px solid #a084e8',
              background: '#1a1a2e',
              color: '#fff',
              fontSize: '1rem',
              fontFamily: 'Poppins, Montserrat, Segoe UI, Arial, sans-serif',
              fontWeight: 500,
              outline: 'none',
              minWidth: 90
            }} />
          </div>
        )}
        {search.trim().length > 0 && searchResults.length > 0 && (
          <div className="home-buscar-resultados" style={{
            background:'#fff',
            border:'1.5px solid #a084e8',
            borderRadius:8,
            marginTop:8,
            zIndex:10,
            position:'relative',
            boxShadow:'0 2px 12px #7b2ff244',
            overflow:'hidden'
          }}>
            {searchResults.map(prod => (
                    <Link key={prod.id} to={`/producto/${prod.id}`} onClick={e => {
                      if (!user) {
                        e.preventDefault();
                        openAuthModal();
                      } else {
                        setSearch("");
                      }
                    }} style={{display:'flex', alignItems:'center', gap:8, padding:10, borderBottom:'1px solid #eee', textDecoration:'none', color:'#222', fontFamily:'Poppins, Montserrat, Segoe UI, Arial, sans-serif', fontWeight:600, fontSize:'1.01rem'}}>
      {/* Modal de autenticación profesional */}
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
                {prod.imageUrl && <img src={prod.imageUrl} alt={prod.name} style={{width:32, height:32, objectFit:'cover', borderRadius:4}} />}
                <span>{prod.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Lista de productos */}
      <div className="home-productos-list" style={{display:'flex', flexDirection:'column', alignItems:'center', width:'100%'}}>
        {
          (() => {
            const allProds = productos
              .filter(prod => {
                const texto = search.trim().toLowerCase();
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
                    (prod.name && prod.name.toLowerCase().includes(texto)) ||
                    (prod.description && prod.description.toLowerCase().includes(texto)) ||
                    precios.some(precio => precio.includes(texto))
                  );
                }
                if (!match) return false;
                if (selectedCat && prod.categoryId !== selectedCat) return false;
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
            if (allProds.length === 0) {
              return <div style={{padding:32, textAlign:'center', color:'#888', fontSize:20, fontWeight:500}}>No se encontraron productos que coincidan con tu búsqueda o filtros.</div>;
            }
            const paginated = allProds.slice((page-1)*perPage, page*perPage);
            return (
              <>
                <div
                  className="home-productos-grid"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '28px 18px',
                    width: '100%',
                    maxWidth: 1400,
                    margin: '0 auto'
                  }}
                >
                  {paginated.map(prod => (
                    <Link
                      key={prod.id}
                      to={`/producto/${prod.id}`}
                      onClick={e => {
                        if (!user) {
                          e.preventDefault();
                          openAuthModal();
                        }
                      }}
                      className="card1 card1-full-mobile"
                      style={{
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        padding: 18,
                        boxSizing: 'border-box',
                        position: 'relative',
                        textDecoration: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: 'inherit'
                      }}
                    >
                      <button
                        onClick={e => { e.preventDefault(); handleFav(prod); }}
                        className={`star-fav-btn${favIds.includes(prod.id) ? ' fav' : ''}`}
                        title={favIds.includes(prod.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                        style={{position:'absolute',top:12,right:14,zIndex:2,background:'rgba(0,0,0,0.12)',borderRadius:8,padding:2,border:'none'}}
                      >
                        <span role="img" aria-label="star">★</span>
                      </button>
                      {prod.imageUrl && (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          style={{
                            width: '98%',
                            height: 220,
                            maxWidth: 260,
                            display: 'block',
                            objectFit: 'contain',
                            background: 'transparent',
                            borderRadius: 12,
                            margin: '8px auto 16px auto',
                            padding: 0,
                            boxShadow: 'none',
                            border: 'none'
                          }}
                        />
                      )}
                      <div className="home-producto-nombre" style={{marginBottom: 4, fontWeight: 700, fontSize: '1.08rem', color: '#fff', textAlign: 'center', width: '100%'}}>
                        {prod.name}
                      </div>
                      <div className="home-producto-precio" style={{
                        marginBottom: 12,
                        fontWeight: 700,
                        color: '#fff',
                        fontSize: '1.08rem',
                        textAlign: 'center',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                      }}>
                        {(() => {
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
                          const min = precios.length > 0 ? Math.min(...precios.filter(x => x > 0)) : null;
                          return min ? (
                            <span style={{
                              background: 'linear-gradient(90deg, #7b2ff2 0%, #a084e8 100%)',
                              color: '#fff',
                              borderRadius: 10,
                              padding: '7px 22px',
                              fontWeight: 800,
                              fontSize: '1.08rem',
                              letterSpacing: '0.02em',
                              boxShadow: '0 2px 8px #0002',
                              border: 'none',
                              display: 'inline-block',
                              fontFamily: 'Poppins, Montserrat, Segoe UI, Arial, sans-serif',
                              textShadow: '0 1px 6px #18122B44',
                              marginBottom: 0
                            }}>
                              Desde: {formatPrecio(min, moneda)}
                            </span>
                          ) : (
                            <span style={{color:'#888'}}>Sin precio en {moneda}</span>
                          );
                        })()}
                      </div>
                      <div className="home-producto-btns" style={{display:'flex',gap:8,justifyContent:'center',width:'100%',marginTop:4}}>
                        <button
                          onClick={async e => {
                            e.preventDefault();
                            if (modal.open) return;
                            if (inCart[prod.id]) {
                              // Quitar del carrito directamente
                              if (!user) return;
                              const cartRef = doc(db, `users/${user.uid}/cart`, prod.id);
                              await deleteDoc(cartRef);
                            } else {
                              // Lógica normal de agregar (puede abrir modal)
                              handleCart(prod);
                            }
                          }}
                          disabled={modal.open}
                          className={`btn${inCart[prod.id] ? ' incart' : ''}`}
                          style={{marginTop: 8, marginBottom: 2}}
                        >
                          {inCart[prod.id] ? 'Quitar del carrito' : 'Agregar al carrito'}
                        </button>
                        {/* El modal ya NO va aquí */}
                      </div>
                    </Link>
                  ))}
                </div>
                {/* PAGINATION CONTROLS SOLO SI HAY MÁS DE UNA PÁGINA */}
                {allProds.length > perPage && (
                  <div style={{
                    display:'flex',
                    justifyContent:'center',
                    gap:12,
                    margin:'32px 0 0 0',
                    width:'100%'
                  }}>
                    <button
                      onClick={() => setPage(p => Math.max(1, p-1))}
                      disabled={page === 1}
                      style={{
                        padding:'10px 24px',
                        borderRadius:8,
                        border:'1.5px solid #a084e8',
                        background:'#1a1a2e',
                        color:'#fff',
                        fontWeight:600,
                        cursor:page===1?'not-allowed':'pointer',
                        fontSize:'1.08rem'
                      }}
                    >Anterior</button>
                    <span style={{color:'#fff',fontWeight:600,alignSelf:'center',fontSize:'1.08rem'}}>Página {page} de {Math.ceil(allProds.length/perPage)}</span>
                    <button
                      onClick={() => setPage(p => Math.min(Math.ceil(allProds.length/perPage), p+1))}
                      disabled={page >= Math.ceil(allProds.length/perPage)}
                      style={{
                        padding:'10px 24px',
                        borderRadius:8,
                        border:'1.5px solid #a084e8',
                        background:'#1a1a2e',
                        color:'#fff',
                        fontWeight:600,
                        cursor:page>=Math.ceil(allProds.length/perPage)?'not-allowed':'pointer',
                        fontSize:'1.08rem'
                      }}
                    >Siguiente</button>
                  </div>
                )}
              </>
            );
          })()
        }
      </div>
      {/* Modal para seleccionar variante/suscripción - SOLO UNA INSTANCIA */}
      {modal.open && (
        <div className="modal-bg" onClick={e => {
          // Cierra solo si se hace click fuera del modal
          if (e.target.classList.contains('modal-bg')) setModal({open:false,prod:null,opciones:[],tipo:null});
        }}>
          <div>
            <h3>Selecciona una opción</h3>
            <ul>
              {modal.opciones.map(op => (
                <li key={op.value}>
                  <button onClick={() => handleCartModal(op)}>{op.label}</button>
                </li>
              ))}
            </ul>
            <button onClick={()=>setModal({open:false,prod:null,opciones:[],tipo:null})}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Testimonios de clientes */}
      <div className="home-testimonios" style={{marginTop: 40}}>
        <h2 style={{
          textAlign: 'center',
          fontFamily: 'Poppins, Montserrat, Segoe UI, Arial, sans-serif',
          fontWeight: 800,
          fontSize: '2rem',
          letterSpacing: '0.02em',
          color: '#FFD600',
          marginBottom: 18,
          textShadow: '0 2px 12px #7b2ff244, 0 1px 0 #18122B'
        }}>
          Ventas anteriores
        </h2>
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
            margin: '0 auto',
          }}
        >
          {testimonios.slice(0, 6).map((t, idx) => (
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
                aspectRatio: '1/1',
              }}
            >
              <div style={{
                width: '100%',
                height: 0,
                paddingBottom: '100%'
              }}>
                <div style={{
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
                }}>
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
            }
            .home-testimonios-list > div {
              min-width: 140px !important;
              max-width: 180px !important;
              flex: 1 1 0 !important;
            }
            .home-testimonios-list {
              width: 100%;
              max-width: 1200px;
              margin: 0 auto;
            }
          }
          @media (min-width: 900px) {
            .home-testimonios-list {
              flex-wrap: nowrap !important;
              gap: 28px !important;
            }
            .home-testimonios-list > div {
              min-width: 140px !important;
              max-width: 180px !important;
              flex: 1 1 0 !important;
            }
          }
          @media (min-width: 1024px) {
            .home-testimonios-list {
              flex-wrap: nowrap !important;
              gap: 32px !important;
            }
            .home-testimonios-list > div {
              min-width: 140px !important;
              max-width: 180px !important;
              flex: 1 1 0 !important;
            }
          }
          @media (min-width: 700px) {
            .home-testimonios-list {
              flex-direction: row !important;
              overflow-x: visible !important;
              justify-content: center !important;
            }
            .home-testimonios-list > div {
              margin-bottom: 0 !important;
            }
          }
        `}</style>
        <div style={{display: 'flex', justifyContent: 'center', marginTop: 18}}>
          <a
            href="/testimonios"
            style={{
              background: 'linear-gradient(90deg, #7b2ff2 0%, #f357a8 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1.08rem',
              border: 'none',
              borderRadius: 10,
              padding: '12px 32px',
              boxShadow: '0 2px 12px #7b2ff244',
              textDecoration: 'none',
              transition: 'background 0.18s, box-shadow 0.18s, transform 0.15s',
              cursor: 'pointer',
              fontFamily: 'Poppins, Montserrat, Segoe UI, Arial, sans-serif',
              display: 'inline-block'
            }}
          >
            Ver más Ventas
          </a>
        </div>
      </div>
    </div>
  );
}



