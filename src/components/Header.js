import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { catUrl } from '../utils/slugify';
import { useMoneda } from "../context/MonedaContext";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { doc, collection, getDocs, deleteDoc, onSnapshot, getDoc, updateDoc } from "firebase/firestore";
import BannerHeader from "./BannerHeader";
import { handleCartAddOrRemove } from "../utils/cartHelpers";
import "./Header.css";

export function getMinPriceByMoneda(prod, moneda) {
  const precios = [];
  if (!prod) return null;
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
  return min;
}

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

export default function Header({ user, onRoleChange, onSidebarChange }) {
  // Modal para variantes/suscripción (opcional, si quieres usarlo en el header)
  const [modal, setModal] = useState({ open: false, prod: null, opciones: [], tipo: null });
  // ...existing code...

  // Elimina un producto de favoritos
  const handleRemoveFromFav = async (prodId) => {
    if (!user) return;
    await deleteDoc(doc(db, `users/${user.uid}/favorites`, prodId));
    setFavorites(f => f.filter(p => p.id !== prodId));
  };

  // Cierra sesión
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/iniciar-sesion");
  };


  // ...existing code...

  // Lógica global para agregar/quitar productos al carrito
  const handleCart = async (prod, setModalOverride = null) => {
    await handleCartAddOrRemove({
      db,
      user,
      prod,
      moneda,
      cartIds: cart.map(p => p.id),
      setModal: setModalOverride || setModal
    });
  };

  const handleCartModal = async (opcion) => {
    const { prod, tipo } = modal;
    let customProd = { ...prod };
    if (tipo === 'ps') {
      customProd.variante = opcion.value;
      customProd[`price${opcion.moneda}`] = opcion.price;
    } else if (tipo === 'suscripcion') {
      customProd.meses = opcion.value;
      customProd[`price${opcion.moneda}`] = opcion.price;
    }
    await handleCart({ ...customProd }, null);
    setModal({ open: false, prod: null, opciones: [], tipo: null });
  };
  const { moneda, setMoneda } = useMoneda();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartProducts, setCartProducts] = useState({});
  const [favProducts, setFavProducts] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const cartMenuRef = useRef();
  const [favorites, setFavorites] = useState([]);
  const [favOpen, setFavOpen] = useState(false);
  const favMenuRef = useRef();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  // Estados para filtros avanzados
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCat, setSelectedCat] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  // Estados para responsive y menú lateral
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef();

  // Cierra el sidebar al hacer click fuera
  useEffect(() => {
    function handleSidebarClick(e) {
      if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setSidebarOpen(false);
      }
    }
    if (sidebarOpen) document.addEventListener("mousedown", handleSidebarClick);
    return () => document.removeEventListener("mousedown", handleSidebarClick);
  }, [sidebarOpen]);

  // Notifica a App.js cuando cambia sidebarOpen
  useEffect(() => {
    if (typeof onSidebarChange === 'function') {
      onSidebarChange(sidebarOpen);
    }
  }, [sidebarOpen, onSidebarChange]);

  // Fondo oscuro en body cuando sidebar está abierto (móvil)
  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add("sidebar-dark-bg");
    } else {
      document.body.classList.remove("sidebar-dark-bg");
    }
    return () => document.body.classList.remove("sidebar-dark-bg");
  }, [sidebarOpen]);

  // Actualizar precios del carrito al cambiar moneda
  useEffect(() => {
    if (!user || cart.length === 0) return;
    cart.forEach(async prod => {
      const dbProd = cartProducts[prod.id];
      if (!dbProd) return;
      let newPrice = {};
      // Si es variante o suscripción, respeta la variante/meses
      if (prod.variante) {
        if (moneda === 'CLP' && dbProd.pricePrimariaCLP && prod.variante === 'primaria') newPrice = { priceCLP: dbProd.pricePrimariaCLP };
        else if (moneda === 'CLP' && dbProd.priceSecundariaCLP && prod.variante === 'secundaria') newPrice = { priceCLP: dbProd.priceSecundariaCLP };
        else if (moneda === 'USD' && dbProd.pricePrimariaUSD && prod.variante === 'primaria') newPrice = { priceUSD: dbProd.pricePrimariaUSD };
        else if (moneda === 'USD' && dbProd.priceSecundariaUSD && prod.variante === 'secundaria') newPrice = { priceUSD: dbProd.priceSecundariaUSD };
      } else if (prod.meses) {
        // Suscripción mensual
        if (moneda === 'CLP' && Array.isArray(dbProd.preciosPorMes)) {
          const mesObj = dbProd.preciosPorMes.find(p => p.meses === prod.meses && p.clp);
          if (mesObj) newPrice = { priceCLP: mesObj.clp };
        } else if (moneda === 'USD' && Array.isArray(dbProd.preciosPorMes)) {
          const mesObj = dbProd.preciosPorMes.find(p => p.meses === prod.meses && p.usd);
          if (mesObj) newPrice = { priceUSD: mesObj.usd };
        }
      } else {
        // Producto simple
        if (moneda === 'CLP' && dbProd.priceCLP) newPrice = { priceCLP: dbProd.priceCLP };
        else if (moneda === 'USD' && dbProd.priceUSD) newPrice = { priceUSD: dbProd.priceUSD };
      }
      // Solo actualizar si el precio es diferente
      if ((moneda === 'CLP' && prod.priceCLP !== newPrice.priceCLP) || (moneda === 'USD' && prod.priceUSD !== newPrice.priceUSD)) {
        await updateDoc(doc(db, `users/${user.uid}/cart`, prod.id), newPrice);
      }
    });
    // eslint-disable-next-line
  }, [moneda]);

  // Comunicar filtros a Home
  useEffect(() => {
    if (window.setHomeFilters) {
      window.setHomeFilters({ selectedCat, minPrice, maxPrice });
    }
  }, [selectedCat, minPrice, maxPrice]);

  // Lógica de búsqueda
  useEffect(() => {
    getDocs(collection(db, "products")).then(snapshot => {
      setAllProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  useEffect(() => {
    let results = allProducts;
    // Filtrar por nombre si hay texto
    if (search.trim().length > 0) {
      results = results.filter(p => p.name && p.name.toLowerCase().includes(search.toLowerCase()));
    }
    // Filtrar por categoría
    if (selectedCat) {
      results = results.filter(p => p.categoryId === selectedCat);
    }
    // Filtrar por precios
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
    // Mostrar resultados aunque no haya texto de búsqueda
    setSearchResults(results.slice(0, 6));
  }, [search, allProducts, selectedCat, minPrice, maxPrice, moneda]);

  // Resto de la lógica del componente
  useEffect(() => {
    const fetchRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const r = userDoc.exists() ? userDoc.data().role : null;
        setRole(r);
        if (onRoleChange) onRoleChange(r);
      } else {
        setRole(null);
        if (onRoleChange) onRoleChange(null);
      }
    };
    fetchRole();
  }, [user, onRoleChange]);

  useEffect(() => {
    const fetchCategorias = async () => {
      const snapshot = await getDocs(collection(db, "categories"));
      setCategorias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchCategorias();
  }, []);

  useEffect(() => {
    if (!user) {
      setCart([]);
      setFavorites([]);
      setCartProducts({});
      setFavProducts({}); // Asegúrate de limpiar también los productos de favoritos
      return;
    }
    const cartUnsub = onSnapshot(collection(db, `users/${user.uid}/cart`), async snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCart(items);
      const prods = {};
      for (const item of items) {
        const prodSnap = await getDoc(doc(db, "products", item.productId || item.id));
        if (prodSnap.exists()) {
          prods[item.id] = prodSnap.data();
        }
      }
      setCartProducts(prods);
    });
    const favUnsub = onSnapshot(collection(db, `users/${user.uid}/favorites`), async snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFavorites(items);
      const prods = {};
      for (const item of items) {
        const prodSnap = await getDoc(doc(db, "products", item.productId || item.id));
        if (prodSnap.exists()) {
          prods[item.id] = prodSnap.data();
        }
      }
      setFavProducts(prods);
    });
    return () => {
      cartUnsub();
      favUnsub();
    };
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (cartMenuRef.current && !cartMenuRef.current.contains(event.target)) {
        setCartOpen(false);
      }
      if (favMenuRef.current && !favMenuRef.current.contains(event.target)) {
        setFavOpen(false);
      }
    }
    if (cartOpen || favOpen) document.addEventListener("mousedown", handleClickOutside);
    else document.removeEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [cartOpen, favOpen]);

  const handleRemoveFromCart = async (prodId) => {
    if (!user) return;
    // Elimina el documento del carrito usando el id base
    await deleteDoc(doc(db, `users/${user.uid}/cart`, prodId));
    setCart(c => c.filter(p => p.id !== prodId));
  };

  return (
    <>
      <BannerHeader
        user={user}
        onMenuClick={() => setSidebarOpen(true)}
        onCartClick={() => {
          if (cartOpen) {
            setCartOpen(false);
          } else {
            setFavOpen(false);
            setCartOpen(true);
          }
        }}
        onFavClick={() => {
          if (favOpen) {
            setFavOpen(false);
          } else {
            setCartOpen(false);
            setFavOpen(true);
          }
        }}
        cartCount={cart.length}
        favCount={favorites.length}
        favOpen={favOpen}
        cartOpen={cartOpen}
      />

      {/* Menú lateral y overlays (sidebar) */}
      {sidebarOpen && (
        <>
          <div className="header-navbar-overlay" onClick={() => setSidebarOpen(false)} />
          <aside className="header-navbar-sidebar dark-sidebar" ref={sidebarRef}>
            <div className="sidebar-logo-title">
              <Link to="/home" onClick={() => setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                <img src={require('../assets/logos/miicono.png')} alt="Logo" style={{ height: 46, width: 46, objectFit: 'cover', borderRadius: '50%', background: '#fff', padding: 2, boxShadow: '0 1px 6px #a259ff22', border: '2px solid #a259ff' }} />
                <span style={{
                  fontWeight: 'bold',
                  fontSize: '1.32rem',
                  color: '#fff',
                  letterSpacing: '-0.5px',
                  display: 'inline-block',
                  textShadow: '0 1px 8px #fff8',
                }}>PandaStore</span>
              </Link>
              <button className="header-navbar-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú">
                <span className="material-icons" style={{ fontSize: 32, fontWeight: 900 }}>close</span>
              </button>
            </div>
            <nav>
              <ul>
                {!user && (
                  <>
                    <li><Link to="/home" onClick={() => setSidebarOpen(false)}>Home</Link></li>
                    <li><Link to="/promos" onClick={() => setSidebarOpen(false)}>Promociones</Link></li>
                    <li><Link to="/packs-nintendo" onClick={() => setSidebarOpen(false)}>🎮 Packs Nintendo</Link></li>
                    {categorias.length > 0 && (
                      <li>
                        <details>
                          <summary>Categorías</summary>
                          <ul>
                            {categorias.map(cat => (
                              <li key={cat.id}>
                                <Link to={catUrl(cat.name, cat.id)} onClick={() => setSidebarOpen(false)}>{cat.name}</Link>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </li>
                    )}
                    <li><Link to="/testimonios" onClick={() => setSidebarOpen(false)}>Testimonios</Link></li>
                    <li><Link to="/preguntas-frecuentes" onClick={() => setSidebarOpen(false)}>Preguntas Frecuentes</Link></li>
                    <li><Link to="/terminos" onClick={() => setSidebarOpen(false)}>Términos y Condiciones</Link></li>
                    <li><Link to="/sobre-nosotros" onClick={() => setSidebarOpen(false)}>Sobre Nosotros</Link></li>
                    <li><Link to="/instalacion-nintendo" onClick={() => setSidebarOpen(false)}>Instalación Nintendo</Link></li>
                    <li><Link to="/soporte" onClick={() => setSidebarOpen(false)}>Soporte</Link></li>
                    <li><Link to="/iniciar-sesion" onClick={() => setSidebarOpen(false)}>Iniciar Sesión</Link></li>
                    <li><Link to="/registro" onClick={() => setSidebarOpen(false)}>Registrarse</Link></li>
                  </>
                )}
                {user && (
                  <>
                    <li><Link to="/home" onClick={() => setSidebarOpen(false)}>Home</Link></li>
                    <li><Link to="/promos" onClick={() => setSidebarOpen(false)}>Promociones</Link></li>
                    <li><Link to="/packs-nintendo" onClick={() => setSidebarOpen(false)}>🎮 Packs Nintendo</Link></li>
                    <li><Link to="/perfil" onClick={() => setSidebarOpen(false)}>Perfil</Link></li>
                    <li><Link to="/mispedidos" onClick={() => setSidebarOpen(false)}>Mis Pedidos</Link></li>
                    {categorias.length > 0 && (
                      <li>
                        <details>
                          <summary>Categorías</summary>
                          <ul>
                            {categorias.map(cat => (
                              <li key={cat.id}>
                                <Link to={catUrl(cat.name, cat.id)} onClick={() => setSidebarOpen(false)}>{cat.name}</Link>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </li>
                    )}
                    <li><Link to="/testimonios" onClick={() => setSidebarOpen(false)}>Testimonios</Link></li>
                    <li><Link to="/preguntas-frecuentes" onClick={() => setSidebarOpen(false)}>Preguntas Frecuentes</Link></li>
                    <li><Link to="/terminos" onClick={() => setSidebarOpen(false)}>Términos y Condiciones</Link></li>
                    <li><Link to="/sobre-nosotros" onClick={() => setSidebarOpen(false)}>Sobre Nosotros</Link></li>
                    <li><Link to="/instalacion-nintendo" onClick={() => setSidebarOpen(false)}>Instalación Nintendo</Link></li>
                    <li><Link to="/soporte" onClick={() => setSidebarOpen(false)}>Soporte</Link></li>
                    {user && role === "admin" && (
                      <li>
                        <details>
                          <summary>Zona Admin</summary>
                          <ul>
                            <li><Link to="/admin/dashboard" onClick={() => setSidebarOpen(false)}>Dashboard</Link></li>
                            <li><Link to="/admin/usuarios" onClick={() => setSidebarOpen(false)}>Gestión Usuarios</Link></li>
                            <li><Link to="/admin/resenas" onClick={() => setSidebarOpen(false)}>Gestión Reseñas</Link></li>
                            <li><Link to="/admin/cupones" onClick={() => setSidebarOpen(false)}>Gestión Cupones</Link></li>
                            <li><Link to="/categorias" onClick={() => setSidebarOpen(false)}>CRUD Categorías</Link></li>
                            <li><Link to="/productos" onClick={() => setSidebarOpen(false)}>CRUD Productos</Link></li>
                            <li><Link to="/admin/soporte" onClick={() => setSidebarOpen(false)}>Gestión Soporte</Link></li>
                          </ul>
                        </details>
                      </li>
                    )}
                    <li className="cerrar-sesion">
                      <button onClick={() => { handleLogout(); setSidebarOpen(false); }}>Cerrar sesión</button>
                    </li>
                  </>
                )}
              </ul>
            </nav>
          </aside>
        </>
      )}

      {/* Dropdowns de favoritos y carrito (flotantes) */}
      {favOpen && (
        <div ref={favMenuRef} className="header-navbar-dropdown" style={{
          background: 'linear-gradient(120deg, #1a1035 0%, #2d1950 50%, #1a1035 100%)',
          borderRadius: 20,
          boxShadow: '0 12px 48px #000a, 0 0 0 1px #a259ff22',
          padding: 0,
          minWidth: 320,
          maxWidth: 380,
          color: '#fff',
          border: '1.5px solid #a259ff33',
          marginTop: 12,
          overflow: 'hidden',
        }}>
          {/* Header de favoritos */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px 12px', borderBottom: '1px solid #a259ff22' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>⭐</span>
              <b style={{ fontSize: '1.1rem', letterSpacing: '-0.3px' }}>Favoritos</b>
              {favorites.length > 0 && <span style={{ background: '#a259ff', color: '#fff', borderRadius: 20, padding: '2px 9px', fontSize: 12, fontWeight: 700 }}>{favorites.length}</span>}
            </div>
            <button onClick={() => setFavOpen(false)} aria-label="Cerrar favoritos" style={{ background: '#ffffff0a', border: 'none', fontSize: 22, cursor: 'pointer', color: '#fff9', fontWeight: 700, lineHeight: 1, borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s' }} onMouseOver={e => { e.currentTarget.style.background = '#a259ff33'; e.currentTarget.style.color = '#fff'; }} onMouseOut={e => { e.currentTarget.style.background = '#ffffff0a'; e.currentTarget.style.color = '#fff9'; }}>
              ×
            </button>
          </div>
          {favorites.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#fff6', fontWeight: 500, padding: '32px 18px' }}>
              <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>⭐</div>
              No hay productos en favoritos
            </div>
          ) : (
            <ul className="panel-favoritos-lista" style={{ listStyle: 'none', padding: '8px 14px', margin: 0, maxHeight: 280, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#a259ff55 transparent' }}>
              {favorites.map(prod => {
                const dbProd = favProducts[prod.id] || {};
                const min = getMinPriceByMoneda(dbProd, moneda) ?? getMinPriceByMoneda(prod, moneda);
                return (
                  <li key={prod.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, background: '#ffffff08', borderRadius: 12, padding: '8px 10px', transition: 'background .15s' }}>
                    {prod.imageUrl && <img src={prod.imageUrl} alt={prod.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', border: '1.5px solid #a259ff55', background: '#18122b' }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 14 }}>{prod.name}</div>
                      <div style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 600 }}>
                        {min ? `${moneda}: ${formatPrecio(min, moneda)}` : 'Sin precio'}
                      </div>
                    </div>
                    <button onClick={() => handleRemoveFromFav(prod.id)} aria-label="Eliminar favorito" style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#ff6b6b', fontWeight: 700, borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s' }} onMouseOver={e => e.currentTarget.style.background = '#ff5a5a22'} onMouseOut={e => e.currentTarget.style.background = 'none'}>✕</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {cartOpen && (
        <div ref={cartMenuRef} className="header-navbar-dropdown" style={{
          background: 'linear-gradient(120deg, #1a1035 0%, #2d1950 50%, #1a1035 100%)',
          borderRadius: 20,
          boxShadow: '0 12px 48px #000a, 0 0 0 1px #a259ff22',
          padding: 0,
          minWidth: 320,
          maxWidth: 380,
          color: '#fff',
          border: '1.5px solid #a259ff33',
          marginTop: 12,
          overflow: 'hidden',
        }}>
          {/* Header del carrito */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px 12px', borderBottom: '1px solid #a259ff22' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🛒</span>
              <b style={{ fontSize: '1.1rem', letterSpacing: '-0.3px' }}>Carrito</b>
              {cart.length > 0 && <span style={{ background: '#a259ff', color: '#fff', borderRadius: 20, padding: '2px 9px', fontSize: 12, fontWeight: 700 }}>{cart.length}</span>}
            </div>
            <button onClick={() => setCartOpen(false)} aria-label="Cerrar carrito" style={{ background: '#ffffff0a', border: 'none', fontSize: 22, cursor: 'pointer', color: '#fff9', fontWeight: 700, lineHeight: 1, borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s' }} onMouseOver={e => { e.currentTarget.style.background = '#a259ff33'; e.currentTarget.style.color = '#fff'; }} onMouseOut={e => { e.currentTarget.style.background = '#ffffff0a'; e.currentTarget.style.color = '#fff9'; }}>
              ×
            </button>
          </div>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#fff6', fontWeight: 500, padding: '32px 18px' }}>
              <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>🛒</div>
              Tu carrito está vacío
            </div>
          ) : (
            <>
              <ul style={{ listStyle: 'none', padding: '8px 14px', margin: 0, maxHeight: 280, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#a259ff55 transparent' }}>
                {cart.map(prod => {
                  let precio = null;
                  let detalle = null;
                  if (moneda === 'CLP') {
                    if (prod.priceCLP) precio = prod.priceCLP;
                    if (prod.pricePrimariaCLP) precio = prod.pricePrimariaCLP;
                    if (prod.priceSecundariaCLP) precio = prod.priceSecundariaCLP;
                    if (prod.variante) detalle = `Variante: ${prod.variante}`;
                    if (prod.meses) detalle = `Meses: ${prod.meses}`;
                  } else if (moneda === 'USD') {
                    if (prod.priceUSD) precio = prod.priceUSD;
                    if (prod.pricePrimariaUSD) precio = prod.pricePrimariaUSD;
                    if (prod.priceSecundariaUSD) precio = prod.priceSecundariaUSD;
                    if (prod.variante) detalle = `Variante: ${prod.variante}`;
                    if (prod.meses) detalle = `Meses: ${prod.meses}`;
                  }
                  if (prod[`price${moneda}`]) precio = prod[`price${moneda}`];
                  return (
                    <li key={prod.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, background: '#ffffff08', borderRadius: 12, padding: '8px 10px', transition: 'background .15s' }}>
                      {prod.imageUrl && <img src={prod.imageUrl} alt={prod.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', border: '1.5px solid #a259ff55', background: '#18122b' }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 14 }}>{prod.name}</div>
                        <div style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 600 }}>
                          {precio ? `${moneda}: ${formatPrecio(precio, moneda)}` : 'Sin precio'}
                          {detalle && <span style={{ marginLeft: 4, color: '#fff6' }}>({detalle})</span>}
                        </div>
                      </div>
                      <button onClick={() => handleRemoveFromCart(prod.id)} aria-label="Eliminar del carrito" style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#ff6b6b', fontWeight: 700, borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s' }} onMouseOver={e => e.currentTarget.style.background = '#ff5a5a22'} onMouseOut={e => e.currentTarget.style.background = 'none'}>✕</button>
                    </li>
                  );
                })}
              </ul>
              {/* Footer del carrito: Total + Botón */}
              <div style={{ padding: '12px 18px 16px', borderTop: '1px solid #a259ff22', background: '#0002' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, fontWeight: 700, fontSize: 16 }}>
                  <span style={{ color: '#c4b5fd' }}>Total</span>
                  <span style={{ color: '#fff', fontSize: 18 }}>{formatPrecio(cart.reduce((acc, prod) => {
                    let precio = 0;
                    if (prod[`price${moneda}`]) {
                      precio = Number(prod[`price${moneda}`]);
                    }
                    return acc + (precio || 0);
                  }, 0), moneda)}</span>
                </div>
                <CartBuyButton user={user} setCartOpen={setCartOpen} />
              </div>
            </>
          )}
        </div>
      )}
      {/* cierre correcto del fragmento JSX */}
    </>
  );
}

// Botón separado para manejar la navegación y autenticación
function CartBuyButton({ user, setCartOpen }) {
  const navigate = useNavigate();
  const handleBuy = () => {
    if (typeof setCartOpen === 'function') setCartOpen(false);
    setTimeout(() => {
      if (user) {
        navigate('/checkoutcarrito');
      } else {
        navigate('/iniciar-sesion');
      }
    }, 120);
  };
  return (
    <button
      className="header-navbar-cart-buy-btn"
      onClick={handleBuy}
      type="button"
    >
      <span className="front">Comprar</span>
    </button>
  );
}