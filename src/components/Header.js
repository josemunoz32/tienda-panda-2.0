import React, { useEffect, useState, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { catUrl } from '../utils/slugify';
import { useMoneda } from "../context/MonedaContext";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { doc, collection, getDocs, deleteDoc, onSnapshot, getDoc, updateDoc, setDoc } from "firebase/firestore";
import BannerHeader from "./BannerHeader";
import { handleCartAddOrRemove } from "../utils/cartHelpers";
import { markCartActive } from "../utils/abandonedCart";
import { isOnlineOnlySteamProduct } from "../utils/steamCatalogCache";
import { getProductPricing, parseNumberCLP } from "../utils/priceHelper";
import { hasActiveSteamDistributorAccess, hasResellerBenefits } from "../utils/userRoles";
import homeHalloweenIcon from '../assets/halloween/menu-icons/home-halloween.webp';
import categoriesHalloweenIcon from '../assets/halloween/menu-icons/categories-halloween.webp';
import installationHalloweenIcon from '../assets/halloween/menu-icons/installation-halloween.webp';
import "./Header.css";

// Retorna el precio base en CLP del producto para que el motor
// de divisas lo convierta en tiempo real con formatearPrecio según el dólar actual.
export function getMinPriceByMoneda(prod) {
  if (!prod) return null;
  const precios = [];
  if (prod.priceCLP) precios.push(Number(prod.priceCLP));
  if (prod.pricePrimariaCLP) precios.push(Number(prod.pricePrimariaCLP));
  if (prod.priceSecundariaCLP) precios.push(Number(prod.priceSecundariaCLP));
  if (Array.isArray(prod.preciosPorMes)) {
    prod.preciosPorMes.forEach(p => { if (p.clp) precios.push(Number(p.clp)); });
  }
  if (precios.length === 0) {
    if (prod.precio_clp) precios.push(Number(prod.precio_clp));
    if (prod.price && !isNaN(prod.price) && Number(prod.price) > 0) precios.push(Number(prod.price));
  }
  const min = precios.length > 0 ? Math.min(...precios.filter(x => x > 0)) : null;
  return min;
}

function formatPrecio(precio, moneda) {
  if (!precio || isNaN(precio)) return "";
  if (moneda === "USD") {
    return `$${Number(precio).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  // CLP y cualquier otra moneda: mostrar como CLP
  return `$${Number(precio).toLocaleString("es-CL")}`;
}

function getCatLocalImage(catName) {
  const n = (catName || '').toLowerCase();
  if (n.includes('steam')) return require('../assets/logos/logosteam.png');
  if (n.includes('stream')) return require('../assets/categorias y prom,o/streaming.png');
  if (n.includes('suscri')) return require('../assets/categorias y prom,o/suscripciones.png');
  if (n.includes('switch') || (n.includes('nintendo') && !n.includes('pack'))) return require('../assets/categorias y prom,o/switch.png');
  if (n.includes('ps5') || n.includes('playstation 5') || n.includes('playstation5')) return require('../assets/categorias y prom,o/psn.png');
  if (n.includes('ps4') || n.includes('playstation 4') || n.includes('playstation4')) return require('../assets/categorias y prom,o/psn.png');
  if (n.includes('psn') || n.includes('playstation')) return require('../assets/categorias y prom,o/psn.png');
  return null;
}


function getConsoleModalImage(catName) {
  const n = (catName || '').toLowerCase();
  if (n.includes('steam')) return require('../assets/logos/steam.png');
  if (n.includes('ps5') || n.includes('playstation 5') || n.includes('playstation5')) return require('../assets/logos/ps5.png');
  if (n.includes('ps4') || n.includes('playstation 4') || n.includes('playstation4')) return require('../assets/logos/ps4.png');
  return require('../assets/categorias y prom,o/switch.png');
}

function isPlaystationCat(name) {
  const n = (name || '').toLowerCase();
  return n.includes('ps4') || n.includes('ps5') || n.includes('playstation');
}

function isSwitchCat(name) {
  const n = (name || '').toLowerCase();
  return n.includes('switch') || (n.includes('nintendo') && !n.includes('pack'));
}

function isSteamCat(name) {
  const n = (name || '').toLowerCase();
  return n.includes('steam');
}

function getCartVariantLabel(item) {
  const explicit = String(item?.variante || "").trim();
  if (explicit) return explicit.charAt(0).toUpperCase() + explicit.slice(1).toLowerCase();
  const lineId = String(item?.cartLineId || item?.id || "").toLowerCase();
  if (lineId.endsWith("__primaria")) return "Primaria";
  if (lineId.endsWith("__secundaria")) return "Secundaria";
  return "";
}

export default function Header({ user, onRoleChange, onSidebarChange }) {
  // Modal para variantes/suscripción (opcional, si quieres usarlo en el header)
  const [modal, setModal] = useState({ open: false, prod: null, opciones: [], tipo: null });
  // ...existing code...

  // Elimina un producto de favoritos
  const handleRemoveFromFav = async (prodId) => {
    if (!user) {
      let localFavs = [];
      try {
        const stored = localStorage.getItem('guestFavs');
        if (stored) localFavs = JSON.parse(stored);
      } catch(e) {}
      localFavs = localFavs.filter(f => f.productId !== prodId && f.id !== prodId);
      localStorage.setItem('guestFavs', JSON.stringify(localFavs));
      window.dispatchEvent(new Event('localFavUpdated'));
      return;
    }
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
    await handleCart({ ...customProd }, null);
    setModal({ open: false, prod: null, opciones: [], tipo: null });
  };
  const { moneda, setMoneda, formatearPrecio, convertirDesdeCLP } = useMoneda();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setUserData(null);
      return;
    }
    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        const userRole = data.role || "user";
        setRole(userRole);
        if (typeof onRoleChange === "function") onRoleChange(userRole);
      }
    });
    return () => unsub();
  }, [user, onRoleChange]);

  const isDistributor = hasActiveSteamDistributorAccess(userData);
  const [categorias, setCategorias] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartProducts, setCartProducts] = useState({});
  const [favProducts, setFavProducts] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const cartMenuRef = useRef();
  const [favorites, setFavorites] = useState([]);
  const [favOpen, setFavOpen] = useState(false);
  const favMenuRef = useRef();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef();
  const [consoleModal, setConsoleModal] = useState(null); // 'playstation' | 'switch' | null
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

  const guestId = useMemo(() => {
    let gid = localStorage.getItem('panda_guest_id');
    if (!gid) {
      gid = 'guest_' + Math.random().toString(36).substring(2, 7).toUpperCase();
      localStorage.setItem('panda_guest_id', gid);
    }
    return gid;
  }, []);

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

    // El mini-carrito calcula el importe base en CLP según la variante y rol del usuario
  const getCartDisplayPriceCLP = (prod) => {
    if (!prod) return 0;
    const baseId = prod.productId || String(prod.id || prod.cartLineId || '').split('__')[0];
    const fullProduct = cartProducts[baseId] || cartProducts[prod.productId] || cartProducts[prod.cartLineId] || cartProducts[prod.id] || prod;
    const variant = (getCartVariantLabel(prod) || getCartVariantLabel(fullProduct) || String(prod?.variante || '')).toLowerCase();
    const selectedPlan = Array.isArray(fullProduct?.preciosPorMes)
      ? fullProduct.preciosPorMes.find((plan) => Number(plan?.meses) === Number(prod?.meses))
      : null;

    let publicCLP = 0;
    if (variant === "primaria") {
      publicCLP = parseNumberCLP(fullProduct?.pricePrimariaCLP || prod?.pricePrimariaCLP || prod?.precioPublicoCLP || prod?.priceCLP || fullProduct?.priceCLP);
    } else if (variant === "secundaria") {
      publicCLP = parseNumberCLP(fullProduct?.priceSecundariaCLP || prod?.priceSecundariaCLP || prod?.precioPublicoCLP || prod?.priceCLP || fullProduct?.priceCLP);
    } else if (selectedPlan?.clp) {
      publicCLP = parseNumberCLP(selectedPlan.clp);
    } else {
      publicCLP = parseNumberCLP(prod?.precioPublicoCLP || prod?.priceCLP || fullProduct?.priceCLP || fullProduct?.pricePrimariaCLP || 0);
    }

    if (publicCLP <= 0 && prod?.priceCLP && parseNumberCLP(prod.priceCLP) > 0) {
      publicCLP = parseNumberCLP(prod.priceCLP);
    }

    const isReseller = hasResellerBenefits(userData || role) || Boolean(prod?.isResellerPrice);
    if (isReseller && publicCLP > 0) {
      const pricing = getProductPricing({
        ...fullProduct,
        ...prod,
        variante: variant,
        selectedPriceCLP: publicCLP,
        priceCLP: publicCLP,
        categoryName: prod.categoryName || prod.categoria || fullProduct?.categoryName || fullProduct?.categoria || fullProduct?.plataforma || ""
      }, "revendedor", userData?.purchaseCount || userData?.comprasRealizadas || 0);
      return pricing.precioFinal;
    }

    return publicCLP;
  };

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
    results = results.filter(p => !isOnlineOnlySteamProduct(p));
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
      const fetchLocal = async () => {
        let lCart = [], lFav = [];
        try {
          const c = localStorage.getItem('guestCart');
          if (c) lCart = JSON.parse(c);
          const f = localStorage.getItem('guestFavs');
          if (f) lFav = JSON.parse(f);
        } catch(e) {}
        
        setCart(lCart);
        const cProds = {};
        for (const item of lCart) {
          const baseId = item.productId || String(item.id || item.cartLineId || '').split('__')[0];
          const snap = await getDoc(doc(db, "products", baseId));
          if (snap.exists()) {
            const data = snap.data();
            cProds[baseId] = data;
            if (item.id) cProds[item.id] = data;
            if (item.cartLineId) cProds[item.cartLineId] = data;
            if (item.productId) cProds[item.productId] = data;
          }
        }
        setCartProducts(cProds);
        
        setFavorites(lFav);
        const fProds = {};
        for (const item of lFav) {
          const baseId = item.productId || String(item.id || '').split('__')[0];
          const snap = await getDoc(doc(db, "products", baseId));
          if (snap.exists()) {
            const data = snap.data();
            fProds[baseId] = data;
            if (item.id) fProds[item.id] = data;
            if (item.productId) fProds[item.productId] = data;
          }
        }
        setFavProducts(fProds);
      };
      
      fetchLocal();
      const handleLocalUpdate = () => fetchLocal();
      window.addEventListener('localCartUpdated', handleLocalUpdate);
      window.addEventListener('localFavUpdated', handleLocalUpdate);
      return () => {
        window.removeEventListener('localCartUpdated', handleLocalUpdate);
        window.removeEventListener('localFavUpdated', handleLocalUpdate);
      };
    }
    
    // Migrar datos de invitado al iniciar sesión
    const migrateLocal = async () => {
      try {
        const c = localStorage.getItem('guestCart');
        const f = localStorage.getItem('guestFavs');
        if (c) {
          const lCart = JSON.parse(c);
          for (const item of lCart) {
            await setDoc(doc(db, `users/${user.uid}/cart`, item.cartLineId || item.productId || item.id), item);
          }
          localStorage.removeItem('guestCart');
        }
        if (f) {
          const lFav = JSON.parse(f);
          for (const item of lFav) {
            await setDoc(doc(db, `users/${user.uid}/favorites`, item.productId || item.id), item);
          }
          localStorage.removeItem('guestFavs');
        }
      } catch(e) {}
    };
    migrateLocal();
    const cartUnsub = onSnapshot(collection(db, `users/${user.uid}/cart`), async snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCart(items);
      const prods = {};
      let totalCLP = 0;
      for (const item of items) {
        const baseId = item.productId || String(item.id || item.cartLineId || '').split('__')[0];
        const prodSnap = await getDoc(doc(db, "products", baseId));
        if (prodSnap.exists()) {
          const data = prodSnap.data();
          prods[baseId] = data;
          if (item.id) prods[item.id] = data;
          if (item.cartLineId) prods[item.cartLineId] = data;
          if (item.productId) prods[item.productId] = data;
          totalCLP += Number(item.priceCLP || data.priceCLP || 0);
        }
      }
      setCartProducts(prods);
      
      // Registrar carrito para carritos abandonados
      if (items.length > 0) {
        markCartActive(user.uid, items, totalCLP);
      }
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
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    if (cartOpen || favOpen || profileOpen) document.addEventListener("mousedown", handleClickOutside);
    else document.removeEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [cartOpen, favOpen, profileOpen]);

  const handleRemoveFromCart = async (prodId) => {
    if (!user) {
      let localCart = [];
      try {
        const stored = localStorage.getItem('guestCart');
        if (stored) localCart = JSON.parse(stored);
      } catch(e) {}
      localCart = localCart.filter(item => (item.cartLineId || item.id) !== prodId && item.productId !== prodId);
      localStorage.setItem('guestCart', JSON.stringify(localCart));
      window.dispatchEvent(new Event('localCartUpdated'));
      return;
    }
    await deleteDoc(doc(db, `users/${user.uid}/cart`, prodId));
    setCart(c => c.filter(p => (p.cartLineId || p.id) !== prodId));
  };

  // Agrupación de categorías para el sidebar y modal de consola
  const playstationCats = categorias.filter(c => isPlaystationCat(c.name));
  const switchCats = categorias.filter(c => isSwitchCat(c.name));
  const otherCats = categorias.filter(c => !isPlaystationCat(c.name) && !isSwitchCat(c.name));
  // Switch 2: busca en Firestore si ya existe, si no → próximamente
  const switch2Cat = switchCats.find(c => c.name.toLowerCase().includes('2'));
  const switch1Cat = switchCats.find(c => !c.name.toLowerCase().includes('2'));

  return (
    <>
      <BannerHeader
        user={user}
        isDistributor={isDistributor}
        onMenuClick={() => setSidebarOpen(true)}
        onCartClick={() => {
          if (cartOpen) {
            setCartOpen(false);
          } else {
            setFavOpen(false);
            setProfileOpen(false);
            setCartOpen(true);
          }
        }}
        onFavClick={() => {
          if (favOpen) {
            setFavOpen(false);
          } else {
            setCartOpen(false);
            setProfileOpen(false);
            setFavOpen(true);
          }
        }}
        onProfileClick={() => {
          if (profileOpen) {
            setProfileOpen(false);
          } else {
            setCartOpen(false);
            setFavOpen(false);
            setProfileOpen(true);
          }
        }}
        cartCount={cart.length}
        favCount={favorites.length}
        favOpen={favOpen}
        cartOpen={cartOpen}
        profileOpen={profileOpen}
      />

      {/* Menú lateral y overlays (sidebar) */}
      {sidebarOpen && (
        <>
          <div className="header-navbar-overlay" onClick={() => setSidebarOpen(false)} />
          <aside className="header-navbar-sidebar dark-sidebar" ref={sidebarRef}>
            <div className="sidebar-logo-title">
              <Link to="/home" onClick={() => setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', flex: 1, minWidth: 0 }}>
                <img src={require('../assets/logos/miicono.png')} alt="Logo" style={{ height: 48, width: 48, objectFit: 'cover', borderRadius: '50%', background: '#fff', padding: 2, boxShadow: '0 2px 12px #a259ff44', border: '2.5px solid #a259ff', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.2 }}>PandaStore</div>
                  <div style={{ fontSize: '0.75rem', color: '#a259ff', fontWeight: 500, opacity: 0.85 }}>Tu tienda de juegos</div>
                </div>
              </Link>
              <button className="header-navbar-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú">
                <span className="material-icons" style={{ fontSize: 24 }}>close</span>
              </button>
            </div>
            <nav>
              <ul className="sidebar-nav-list">
                <li>
                  <Link to="/home" onClick={() => setSidebarOpen(false)} className="sidebar-nav-item">
                    <div className="sidebar-nav-icon-box">
                      <img src={homeHalloweenIcon} alt="" className="sidebar-nav-menu-icon" />
                    </div>
                    <span>Inicio</span>
                  </Link>
                </li>
                <li>
                  <Link to="/promos" onClick={() => setSidebarOpen(false)} className="sidebar-nav-item">
                    <img src={require('../assets/categorias y prom,o/promos.png')} alt="Promos" className="sidebar-nav-thumb" />
                    <span>Promociones</span>
                  </Link>
                </li>
                <li>
                  <Link to="/packs-nintendo" onClick={() => setSidebarOpen(false)} className="sidebar-nav-item">
                    <img src={require('../assets/categorias y prom,o/pack-switch.png')} alt="Packs Nintendo" className="sidebar-nav-thumb" />
                    <span>Packs Nintendo</span>
                  </Link>
                </li>

                {/* ── Categorías expandible ── */}
                {categorias.length > 0 && (
                  <li className="sidebar-details-wrap">
                    <details className="sidebar-details">
                      <summary className="sidebar-nav-item sidebar-summary">
                        <div className="sidebar-nav-icon-box">
                          <img src={categoriesHalloweenIcon} alt="" className="sidebar-nav-menu-icon" />
                        </div>
                        <span style={{flex:1, fontWeight:700}}>Categorías</span>
                        <span className="material-icons sidebar-arrow">expand_more</span>
                      </summary>
                      <ul className="sidebar-cat-list">
                        {/* PlayStation agrupado */}
                        {playstationCats.length > 0 && (
                          <li>
                            <button
                              onClick={() => { setConsoleModal('playstation'); setSidebarOpen(false); }}
                              className="sidebar-nav-item sidebar-cat-item sidebar-console-btn"
                            >
                              <img src={require('../assets/categorias y prom,o/psn.png')} alt="PlayStation" className="sidebar-nav-cat-thumb" />
                              <span style={{flex:1}}>Juegos PlayStation (PS4 / PS5)</span>
                              <span className="material-icons" style={{fontSize:18,color:'#a259ff88'}}>chevron_right</span>
                            </button>
                          </li>
                        )}

                        {/* Nintendo Switch agrupado */}
                        {switchCats.length > 0 && (
                          <li>
                            <button
                              onClick={() => { setConsoleModal('switch'); setSidebarOpen(false); }}
                              className="sidebar-nav-item sidebar-cat-item sidebar-console-btn"
                            >
                              <img src={require('../assets/categorias y prom,o/switch.png')} alt="Nintendo Switch" className="sidebar-nav-cat-thumb" />
                              <span style={{flex:1}}>Juegos Nintendo Switch</span>
                              <span className="material-icons" style={{fontSize:18,color:'#a259ff88'}}>chevron_right</span>
                            </button>
                          </li>
                        )}

                        {/* Resto de categorías */}
                        {otherCats.map(cat => {
                          const catImg = cat.imageUrl || getCatLocalImage(cat.name);
                          return (
                            <li key={cat.id}>
                              <Link to={catUrl(cat.name, cat.id)} onClick={() => setSidebarOpen(false)} className="sidebar-nav-item sidebar-cat-item">
                                {catImg ? (
                                  <img src={catImg} alt={cat.name} className="sidebar-nav-cat-thumb" />
                                ) : (
                                  <div className="sidebar-nav-icon-box" style={{width:44,height:44,borderRadius:12}}>
                                    <span className="material-icons" style={{fontSize:20,color:'#a259ff'}}>videogame_asset</span>
                                  </div>
                                )}
                                <span>{cat.name}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  </li>
                )}

                {/* ── Instalación expandible (Nintendo + PlayStation unificadas) ── */}
                <li className="sidebar-details-wrap">
                  <details className="sidebar-details">
                    <summary className="sidebar-nav-item sidebar-summary">
                      <div className="sidebar-nav-icon-box" style={{ background: "rgba(56, 189, 248, 0.15)" }}>
                        <img src={installationHalloweenIcon} alt="" className="sidebar-nav-menu-icon" />
                      </div>
                      <span style={{ flex: 1, fontWeight: 700 }}>Instalación</span>
                      <span className="material-icons sidebar-arrow">expand_more</span>
                    </summary>
                    <ul className="sidebar-cat-list">
                      <li>
                        <Link
                          to="/instalacion-nintendo"
                          onClick={() => setSidebarOpen(false)}
                          className="sidebar-nav-item sidebar-cat-item sidebar-nav-item-nintendo"
                        >
                          <img src={require('../assets/categorias y prom,o/switch.png')} alt="Nintendo" className="sidebar-nav-cat-thumb" />
                          <span style={{ flex: 1 }}>Instalación Nintendo</span>
                          <span className="material-icons" style={{ fontSize: 18, color: '#a259ff88' }}>chevron_right</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/instalacion-playstation"
                          onClick={() => setSidebarOpen(false)}
                          className="sidebar-nav-item sidebar-cat-item sidebar-nav-item-playstation"
                        >
                          <img
                            src={require('../assets/logos/icono-play.png')}
                            alt="PlayStation"
                            className="sidebar-nav-cat-thumb"
                            style={{ filter: "brightness(0) invert(1)" }}
                          />
                          <span style={{ flex: 1 }}>Instalación PlayStation</span>
                          <span className="material-icons" style={{ fontSize: 18, color: '#a259ff88' }}>chevron_right</span>
                        </Link>
                      </li>
                    </ul>
                  </details>
                </li>
                <li>
                  <Link to="/descargar-launcher" onClick={() => setSidebarOpen(false)} className="sidebar-nav-item sidebar-special-card steam-launcher-card">
                    <div className="sidebar-special-icon-wrap steam-icon-glow">
                      <img src={require('../assets/logos/logosteam.png')} alt="Panda Launcher Steam + Activador" className="sidebar-special-thumb" />
                    </div>
                    <div className="sidebar-special-text">
                      <div className="sidebar-special-title">Panda Launcher Steam + Activador</div>
                      <div className="sidebar-special-subtitle">Descarga todo en 1, DLCs y tutoriales</div>
                    </div>
                    <span className="sidebar-special-badge gold">v2.4.32</span>
                  </Link>
                </li>

                <li className="sidebar-promo-banners">
                  <Link to="/promos" onClick={() => setSidebarOpen(false)} className="sidebar-promo-banner-link">
                    <img src={require('../assets/fotos publicidad menu/cupon.png')} alt="Cupón de descuento" className="sidebar-promo-banner-img" />
                  </Link>
                  <Link to="/provedores" onClick={() => setSidebarOpen(false)} className="sidebar-promo-banner-link">
                    <img src={require('../assets/fotos publicidad menu/provedores.png')} alt="Provedores" className="sidebar-promo-banner-img" />
                  </Link>
                </li>

                {/* ── Solo sin sesión ── */}
                {!user && (
                  <>
                    <li>
                      <Link to="/soporte" onClick={() => setSidebarOpen(false)} className="sidebar-nav-item">
                        <div className="sidebar-nav-icon-box">
                          <span className="material-icons" style={{fontSize:22,color:'#a259ff'}}>support_agent</span>
                        </div>
                        <span>Soporte</span>
                      </Link>
                    </li>
                    <li className="sidebar-divider" />
                    <li>
                      <Link to="/iniciar-sesion" onClick={() => setSidebarOpen(false)} className="sidebar-nav-item sidebar-login-item">
                        <div className="sidebar-nav-icon-box sidebar-login-icon">
                          <span className="material-icons" style={{fontSize:22,color:'#fff'}}>login</span>
                        </div>
                        <span>Iniciar Sesión</span>
                      </Link>
                    </li>
                    <li>
                      <Link to="/registro" onClick={() => setSidebarOpen(false)} className="sidebar-nav-item">
                        <div className="sidebar-nav-icon-box">
                          <span className="material-icons" style={{fontSize:22,color:'#a259ff'}}>person_add</span>
                        </div>
                        <span>Registrarse</span>
                      </Link>
                    </li>
                  </>
                )}

                {/* ── Acceso Distribuidor Steam ── */}
                {user && isDistributor && (
                  <li>
                    <Link
                      to="/portal-distribuidor"
                      onClick={() => setSidebarOpen(false)}
                      className="sidebar-nav-item"
                      style={{
                        background: "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.18) 100%)",
                        border: "1.2px solid rgba(56, 189, 248, 0.45)",
                        boxShadow: "0 4px 14px rgba(6, 182, 212, 0.15)"
                      }}
                    >
                      <div className="sidebar-nav-icon-box" style={{ background: "linear-gradient(135deg, #38bdf8, #0284c7)" }}>
                        <span className="material-icons" style={{ fontSize: 20, color: "#08031d", fontWeight: 900 }}>vpn_key</span>
                      </div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 900, color: "#38bdf8", letterSpacing: "0.2px" }}>Portal Distribuidor</span>
                        <span style={{ fontSize: "0.74rem", color: "#cbd5e1", fontWeight: 600 }}>
                          Plan {(userData?.distributor_plan || "básico").toUpperCase()} · {userData?.custom_quota || 60} claves/mes
                        </span>
                      </div>
                      <span className="material-icons" style={{ fontSize: 16, color: "#38bdf8" }}>chevron_right</span>
                    </Link>
                  </li>
                )}
                {user && !isDistributor && (
                  <li>
                    <Link
                      to="/portal-distribuidor"
                      onClick={() => setSidebarOpen(false)}
                      className="sidebar-nav-item"
                      style={{
                        background: "linear-gradient(135deg, rgba(124, 58, 237, .16), rgba(168, 85, 247, .1))",
                        border: "1.2px solid rgba(192, 132, 252, .38)"
                      }}
                    >
                      <div className="sidebar-nav-icon-box" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                        <span className="material-icons" style={{ fontSize: 20, color: "#fff", fontWeight: 900 }}>storefront</span>
                      </div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 900, color: "#e9d5ff" }}>Ser distribuidor Steam</span>
                        <span style={{ fontSize: ".74rem", color: "#c4b5d6", fontWeight: 600 }}>Conoce los planes y sus beneficios</span>
                      </div>
                      <span className="material-icons" style={{ fontSize: 16, color: "#d8b4fe" }}>chevron_right</span>
                    </Link>
                  </li>
                )}

                {/* ── Solo con sesión admin ── */}
                {user && role === "admin" && (
                  <li>
                    <Link to="/admin/dashboard" onClick={() => setSidebarOpen(false)} className="sidebar-nav-item sidebar-admin-summary">
                      <div className="sidebar-nav-icon-box sidebar-admin-icon">
                        <span className="material-icons" style={{fontSize:22,color:'#fff'}}>admin_panel_settings</span>
                      </div>
                      <span style={{flex:1}}>Panel Admin</span>
                      <span className="material-icons" style={{fontSize:16,color:'#a259ff88'}}>chevron_right</span>
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          </aside>
        </>
      )}

      {/* Overlay oscuro para modales flotantes (favoritos, carrito, perfil) */}
      {(cartOpen || favOpen || profileOpen) && (
        <div
          className="header-dropdown-overlay"
          onClick={() => {
            setCartOpen(false);
            setFavOpen(false);
            setProfileOpen(false);
          }}
        />
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
                        {min ? (moneda === 'USD' ? `USD: ${formatPrecio(min, moneda)}` : formatearPrecio(min)) : 'Sin precio'}
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
        <div ref={cartMenuRef} className="header-navbar-dropdown cart-dropdown" style={{ marginTop: 12 }}>
          {/* Header */}
          <div className="cart-drop-header">
            <div className="cart-drop-title">
              <div className="cart-drop-icon-wrap">
                <span className="material-icons" style={{ fontSize: 18, color: '#a259ff' }}>shopping_cart</span>
              </div>
              <span>Carrito</span>
              {cart.length > 0 && <span className="cart-drop-count">{cart.length}</span>}
            </div>
            <button className="cart-drop-close" onClick={() => setCartOpen(false)} aria-label="Cerrar carrito">
              <span className="material-icons" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="cart-drop-empty">
              <span className="material-icons cart-drop-empty-icon">shopping_cart</span>
              <p>Tu carrito está vacío</p>
              <span>Agrega productos para comenzar</span>
            </div>
          ) : (
            <>
              <ul className="cart-drop-list">
                {cart.map(prod => {
                  const priceCLP = getCartDisplayPriceCLP(prod);
                  const precioDisplay = formatearPrecio(priceCLP);
                  const variantLabel = getCartVariantLabel(prod);
                  const isResellerItem = hasResellerBenefits(userData) || Boolean(prod.isResellerPrice);
                  const isSwitch = prod.consoleName && prod.consoleName.toLowerCase().includes('switch');
                  const isPS = Boolean(variantLabel) || (prod.consoleName && (prod.consoleName.toLowerCase().includes('ps4') || prod.consoleName.toLowerCase().includes('ps5')));
                  const consoleBg = isSwitch ? 'rgba(228,0,15,0.15)' : isPS ? 'rgba(0,67,156,0.2)' : 'rgba(162,89,255,0.15)';
                  const consoleColor = isSwitch ? '#ff7070' : isPS ? '#60a5fa' : '#c4b5fd';
                  const consoleBorder = isSwitch ? 'rgba(228,0,15,0.35)' : isPS ? 'rgba(96,165,250,0.3)' : 'rgba(162,89,255,0.3)';
                  const platformLabel = prod.consoleName || prod.plataforma || prod.platform || prod.categoryName || (isPS ? 'PlayStation' : '');
                  return (
                    <li key={prod.cartLineId || prod.id} className="cart-drop-item">
                      <div className="cart-drop-img-wrap">
                        {prod.imageUrl
                          ? <img src={prod.imageUrl} alt={prod.name} className="cart-drop-img" />
                          : <span className="material-icons" style={{ fontSize: 22, color: '#a259ff88' }}>videogame_asset</span>
                        }
                      </div>
                      <div className="cart-drop-info">
                        <div className="cart-drop-name">{prod.name}</div>
                        <div className="cart-drop-meta" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          {platformLabel && (
                            <span className="cart-drop-console" style={{ background: consoleBg, color: consoleColor, borderColor: consoleBorder }}>
                              {platformLabel}
                            </span>
                          )}
                          {variantLabel && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: variantLabel.toLowerCase() === 'primaria' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(168, 85, 247, 0.25)',
                              color: variantLabel.toLowerCase() === 'primaria' ? '#93c5fd' : '#d8b4fe',
                              border: `1px solid ${variantLabel.toLowerCase() === 'primaria' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(168, 85, 247, 0.5)'}`,
                              padding: '2px 7px',
                              borderRadius: 6,
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }}>
                              🎮 Cuenta {variantLabel}
                            </span>
                          )}
                          {prod.meses && (
                            <span style={{
                              background: 'rgba(162, 89, 255, 0.2)',
                              color: '#c4b5fd',
                              border: '1px solid rgba(162, 89, 255, 0.4)',
                              padding: '2px 7px',
                              borderRadius: 6,
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }}>
                              ⏱️ {prod.meses} mes{prod.meses > 1 ? 'es' : ''}
                            </span>
                          )}
                          {isResellerItem && (
                            <span style={{
                              background: 'rgba(234, 179, 8, 0.2)',
                              color: '#facc15',
                              border: '1px solid rgba(234, 179, 8, 0.4)',
                              padding: '2px 6px',
                              borderRadius: 6,
                              fontSize: '0.7rem',
                              fontWeight: 700
                            }}>
                              💎 Revendedor
                            </span>
                          )}
                        </div>
                        <div className="cart-drop-price" style={{ marginTop: 4, fontWeight: 800, fontSize: '0.95rem', color: '#4ade80' }}>
                          {precioDisplay || '—'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFromCart(prod.cartLineId || prod.id)}
                        aria-label="Eliminar del carrito"
                        className="cart-drop-remove"
                      >
                        <span className="material-icons" style={{ fontSize: 16 }}>close</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Footer */}
              <div className="cart-drop-footer">
                <div className="cart-drop-total-row">
                  <span className="cart-drop-total-label">Total estimado</span>
                  <span className="cart-drop-total-amount">{(() => {
                    const totalCLP = cart.reduce((acc, p) => acc + (getCartDisplayPriceCLP(p) || 0), 0);
                    return formatearPrecio(totalCLP);
                  })()}</span>
                </div>
                <CartBuyButton user={user} setCartOpen={setCartOpen} />
                <p className="cart-drop-note">
                  <span className="material-icons" style={{ fontSize: 13 }}>bolt</span>
                  Entrega digital inmediata tras confirmar
                </p>
              </div>
            </>
          )}
        </div>
      )}
      {/* ── Modal selector de consola ── */}
      {consoleModal && (
        <div className="console-modal-overlay" onClick={() => setConsoleModal(null)}>
          <div className="console-modal" onClick={e => e.stopPropagation()}>
            <button className="console-modal-close" onClick={() => setConsoleModal(null)} aria-label="Cerrar">
              <span className="material-icons" style={{fontSize:20}}>close</span>
            </button>

            {consoleModal === 'playstation' ? (
              <>
                <div className="console-modal-icon">🎮</div>
                <h2 className="console-modal-title">¿Qué consola PlayStation tienes?</h2>
                <p className="console-modal-subtitle">Te mostramos el catálogo exacto para tu consola</p>
                <div className="console-modal-options">
                  {playstationCats
                    .sort((a, b) => {
                      const an = a.name.toLowerCase(), bn = b.name.toLowerCase();
                      if (an.includes('ps4')) return -1;
                      if (bn.includes('ps4')) return 1;
                      return 0;
                    })
                    .map(cat => (
                      <button
                        key={cat.id}
                        className="console-option-btn"
                        onClick={() => { navigate(catUrl(cat.name, cat.id)); setConsoleModal(null); }}
                      >
                        <img src={getConsoleModalImage(cat.name)} alt={cat.name} />
                        <span>{cat.name}</span>
                      </button>
                    ))}
                </div>
              </>
            ) : (
              <>
                <div className="console-modal-icon">🕹️</div>
                <h2 className="console-modal-title">¿Qué Nintendo Switch tienes?</h2>
                <p className="console-modal-subtitle">Elige tu consola para ver el catálogo correcto</p>
                <div className="console-modal-options">
                  {switch1Cat && (
                    <button
                      className="console-option-btn"
                      onClick={() => { navigate(catUrl(switch1Cat.name, switch1Cat.id)); setConsoleModal(null); }}
                    >
                      <img src={require('../assets/categorias y prom,o/switch.png')} alt="Nintendo Switch" />
                      <span>Nintendo Switch</span>
                      <span style={{fontSize:'0.75rem',color:'#c4b5fd',fontWeight:500}}>Switch / OLED / Lite</span>
                    </button>
                  )}
                  {switch2Cat ? (
                    <button
                      className="console-option-btn"
                      onClick={() => { navigate(catUrl(switch2Cat.name, switch2Cat.id)); setConsoleModal(null); }}
                    >
                      <img src={require('../assets/categorias y prom,o/switch.png')} alt="Nintendo Switch 2" />
                      <span>Nintendo Switch 2</span>
                    </button>
                  ) : (
                    <div className="console-option-btn console-option-soon">
                      <img src={require('../assets/categorias y prom,o/switch.png')} alt="Switch 2" style={{opacity:0.5}} />
                      <span>Nintendo Switch 2</span>
                      <span className="console-coming-soon">⏳ Próximamente</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Dropdown de perfil */}
      {profileOpen && (
        <div ref={profileMenuRef} className="header-navbar-dropdown profile-dropdown" style={{
          background: 'linear-gradient(160deg, #1a1035 0%, #2d1950 60%, #1a1035 100%)',
          borderRadius: 22,
          boxShadow: '0 24px 64px rgba(0,0,0,0.85), 0 0 0 1.5px rgba(162,89,255,0.4)',
          padding: 0,
          minWidth: 290,
          maxWidth: 340,
          color: '#fff',
          border: '1.5px solid rgba(162,89,255,0.35)',
          overflow: 'hidden',
          backdropFilter: 'blur(24px) saturate(200%)',
          WebkitBackdropFilter: 'blur(24px) saturate(200%)',
        }}>
          {/* Botón cerrar arriba a la derecha */}
          <button
            onClick={() => setProfileOpen(false)}
            aria-label="Cerrar perfil"
            style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, background: 'rgba(255,255,255,0.08)', border: 'none', fontSize: 20, cursor: 'pointer', color: '#fff9', fontWeight: 700, borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s' }}
            onMouseOver={e => { e.currentTarget.style.background = '#a259ff44'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff9'; }}
          >×</button>

          {user ? (
            <>
              {/* Hero del usuario logueado */}
              <div style={{ padding: '28px 20px 20px', textAlign: 'center', borderBottom: '1px solid rgba(162,89,255,0.15)', background: 'linear-gradient(180deg, rgba(162,89,255,0.12) 0%, transparent 100%)' }}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', border: '3px solid #a259ff', boxShadow: '0 0 0 4px rgba(162,89,255,0.2), 0 4px 20px #a259ff44', display: 'block', margin: '0 auto 12px' }} />
                ) : (
                  <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'linear-gradient(135deg, #7b2ff2, #a259ff)', border: '3px solid #a259ff', boxShadow: '0 0 0 4px rgba(162,89,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <span style={{ fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1, textTransform: 'uppercase' }}>
                      {(user.displayName || user.email || '?')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                {user.displayName && (
                  <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.2px', marginBottom: 4 }}>{user.displayName}</div>
                )}
                <div style={{ fontSize: 12, color: '#a78bfa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{user.email}</div>
                {hasResellerBenefits(userData || role) && (
                  <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.4)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: '#facc15' }}>
                    <span>💎 Revendedor B2B</span>
                    {typeof userData?.wallet_balance === 'number' && (
                      <span style={{ color: '#34d399', borderLeft: '1px solid rgba(234, 179, 8, 0.3)', paddingLeft: 8 }}>
                        💼 ${Number(userData.wallet_balance || 0).toLocaleString('es-CL')}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Links del perfil */}
              <nav style={{ padding: '10px 10px 8px' }}>
                {[
                  { to: '/perfil', icon: 'manage_accounts', label: 'Mi Perfil', desc: 'Edita tu información y billetera' },
                  ...(isDistributor ? [{
                    to: '/portal-distribuidor',
                    icon: 'vpn_key',
                    label: 'Portal Distribuidor',
                    desc: 'Emitir Claves Steam & Cupos',
                    highlight: true,
                    badge: 'STEAM B2B'
                  }] : [{
                    to: '/portal-distribuidor',
                    icon: 'storefront',
                    label: 'Ser Distribuidor Steam',
                    desc: 'Planes Básico, Pro, Supreme y Vitalicio',
                    accent: true
                  }]),
                  ...(role === 'admin' ? [{
                    to: '/admin/dashboard',
                    icon: 'admin_panel_settings',
                    label: 'Panel Administrador',
                    desc: 'Gestión general de la tienda',
                    admin: true
                  }] : []),
                  { to: '/mispedidos', icon: 'receipt_long', label: 'Mis Pedidos', desc: 'Historial y licencias' },
                  { to: '/soporte', icon: 'support_agent', label: 'Soporte', desc: 'Ayuda y contacto' },
                ].map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setProfileOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 10px',
                      borderRadius: 13,
                      color: item.highlight ? '#00f5d4' : item.accent ? '#f59e0b' : '#e2d9f3',
                      textDecoration: 'none',
                      transition: 'all 0.15s',
                      marginBottom: 4,
                      background: item.highlight ? 'rgba(0, 245, 212, 0.08)' : item.accent ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                      border: item.highlight ? '1px solid rgba(0, 245, 212, 0.35)' : item.accent ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = item.highlight ? 'rgba(0, 245, 212, 0.18)' : 'rgba(162,89,255,0.14)'}
                    onMouseOut={e => e.currentTarget.style.background = item.highlight ? 'rgba(0, 245, 212, 0.08)' : item.accent ? 'rgba(245, 158, 11, 0.08)' : 'transparent'}
                  >
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      background: item.highlight ? 'linear-gradient(135deg, #00f5d4, #10b981)' : item.accent ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(162,89,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <span className="material-icons" style={{ fontSize: 20, color: (item.highlight || item.accent) ? '#08031d' : '#c084fc', fontWeight: (item.highlight || item.accent) ? 900 : 400 }}>{item.icon}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>{item.label}</span>
                        {item.badge && (
                          <span style={{ fontSize: 9, fontWeight: 900, background: '#00f5d4', color: '#08031d', padding: '1px 5px', borderRadius: 4, letterSpacing: 0.5 }}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: item.highlight ? '#a7f3d0' : '#a78bfa', marginTop: 1 }}>{item.desc}</div>
                    </div>
                    <span style={{ color: item.highlight ? '#00f5d4' : '#a259ff88', fontSize: 18, lineHeight: 1 }}>›</span>
                  </Link>
                ))}
              </nav>

              {/* Cerrar sesión */}
              <div style={{ padding: '4px 10px 14px' }}>
                <button
                  onClick={() => { handleLogout(); setProfileOpen(false); }}
                  style={{ width: '100%', padding: '11px 0', background: 'linear-gradient(90deg, rgba(239,68,68,0.14), rgba(185,28,28,0.14))', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 13, color: '#f87171', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .18s' }}
                  onMouseOver={e => { e.currentTarget.style.background = 'linear-gradient(90deg, rgba(239,68,68,0.28), rgba(185,28,28,0.28))'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.55)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'linear-gradient(90deg, rgba(239,68,68,0.14), rgba(185,28,28,0.14))'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                >
                  <span className="material-icons" style={{ fontSize: 18 }}>logout</span>
                  Cerrar Sesión
                </button>
              </div>
            </>
          ) : (
            /* Vista invitado profesional cuando no hay usuario autenticado */
            <div style={{ padding: '22px 18px 20px', textAlign: 'center' }}>
              <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto 12px' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(162,89,255,0.3), rgba(0,245,212,0.3))', border: '2px solid #a259ff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(162,89,255,0.3)' }}>
                  <img src={require('../assets/logos/miicono.png')} alt="Panda Logo" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                </div>
                <span style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: '50%', background: '#10b981', border: '2.5px solid #1a1035', boxShadow: '0 0 8px #10b981' }} title="Online" />
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                Modo Invitado Activo
              </div>

              <h3 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 800, color: '#fff' }}>Gamer Invitado</h3>
              <p style={{ margin: '0 0 14px', fontSize: 11.5, color: '#a78bfa' }}>ID Sesión: <code style={{ color: '#00f5d4', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4 }}>{guestId}</code></p>

              {/* Caja de resumen local */}
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(162,89,255,0.2)', borderRadius: 14, padding: '12px 14px', marginBottom: 16, textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 12.5, color: '#e2d9f3' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-icons" style={{ fontSize: 16, color: '#00f5d4' }}>shopping_bag</span>
                    Carrito local
                  </span>
                  <span style={{ fontWeight: 800, color: '#00f5d4' }}>{cart.length} {cart.length === 1 ? 'ítem' : 'ítems'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: '#e2d9f3' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-icons" style={{ fontSize: 16, color: '#ff4757' }}>favorite</span>
                    Favoritos
                  </span>
                  <span style={{ fontWeight: 800, color: '#ff4757' }}>{favorites.length} {favorites.length === 1 ? 'guardado' : 'guardados'}</span>
                </div>
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.35 }}>
                  💾 Tu carrito y favoritos se guardan localmente. Al iniciar sesión o registrarte se sincronizarán automáticamente con tu cuenta.
                </div>
              </div>

              {/* Botones de acción rápida */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => { setProfileOpen(false); setCartOpen(true); }}
                  style={{ flex: 1, padding: '8px 10px', background: 'rgba(0,245,212,0.12)', border: '1px solid rgba(0,245,212,0.3)', borderRadius: 10, color: '#00f5d4', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Ver Carrito
                </button>
                <button
                  type="button"
                  onClick={() => { setProfileOpen(false); setFavOpen(true); }}
                  style={{ flex: 1, padding: '8px 10px', background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 10, color: '#ff4757', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Ver Favoritos
                </button>
              </div>

              {/* Botones de Auth */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link to="/iniciar-sesion" onClick={() => setProfileOpen(false)} style={{ background: 'linear-gradient(90deg, #7b2ff2, #a259ff)', color: '#fff', padding: '10px 16px', borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: 13, display: 'block', textAlign: 'center', boxShadow: '0 4px 14px rgba(162,89,255,0.4)' }}>
                  Iniciar Sesión
                </Link>
                <Link to="/registro" onClick={() => setProfileOpen(false)} style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', padding: '10px 16px', borderRadius: 12, fontWeight: 600, textDecoration: 'none', fontSize: 13, display: 'block', textAlign: 'center', border: '1px solid rgba(255,255,255,0.14)' }}>
                  Crear Cuenta Gratis
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
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
