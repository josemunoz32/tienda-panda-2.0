// Devuelve el menor precio disponible según moneda y variantes
import { getMinPriceByMoneda } from '../../components/Header';
import { handleCartAddOrRemove } from '../../utils/cartHelpers';

import React, { useEffect, useState } from "react";
import { useMoneda } from "../../context/MonedaContext";
import { db, auth } from "../../firebase";
import { useParams, Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, setDoc, onSnapshot } from "firebase/firestore";
import "./CategoriaPage.css";
import { prodUrl, extractId } from '../../utils/slugify';

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

export default function CategoriaPage() {
  const { id: rawId } = useParams();
  const id = extractId(rawId);
  const { moneda } = useMoneda();
  // Buscador local para la categoría
  const [productos, setProductos] = useState([]);
  const [search, setSearch] = useState(""); // valor aplicado
  const [searchInput, setSearchInput] = useState(""); // mientras escribe
  const [filtroAplicado, setFiltroAplicado] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [order, setOrder] = useState("price-asc");
  const [page, setPage] = useState(1);
  const perPage = 30;
  // Mostrar productos aleatorios SOLO en la primera carga, si no hay filtros activos
  const [primeraCarga, setPrimeraCarga] = useState(true);

  useEffect(() => {
    // Normalizar texto y filtrar como en Home (ignora tildes)
    function normalize(str) {
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }
    const texto = normalize(searchInput.trim());
    let results = [...productos]; // ya vienen filtrados por categoría desde Firestore

    // Búsqueda
    if (texto) {
      results = results.filter(prod => {
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
        return (
          (prod.name && normalize(prod.name).includes(texto)) ||
          (prod.description && normalize(prod.description).includes(texto)) ||
          precios.some(precio => normalize(precio).includes(texto))
        );
      });
    }

    // Filtros de precio
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

    // Orden o aleatorio similar a Home: si no hay filtros, mezclar
    const noFiltros = !searchInput && !minPrice && !maxPrice && (!order || order === 'price-asc');
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
    if (noFiltros) {
      results = [...results].sort(() => 0.5 - Math.random());
    } else {
      if(order==="price-asc") results.sort((a,b)=>(getMinPrice(a)-getMinPrice(b)));
      else if(order==="price-desc") results.sort((a,b)=>(getMinPrice(b)-getMinPrice(a)));
      else if(order==="az") results.sort((a,b)=>a.name.localeCompare(b.name));
      else if(order==="za") results.sort((a,b)=>b.name.localeCompare(a.name));
    }
    setSearchResults(results);
  }, [searchInput, productos, minPrice, maxPrice, moneda, order]);

  // Cuando el usuario cambia cualquier filtro/búsqueda, desactivar primeraCarga
  useEffect(() => {
    if (!primeraCarga) return;
    if (searchInput.trim() || minPrice || maxPrice || order !== "price-asc") {
      setPrimeraCarga(false);
    }
  }, [searchInput, minPrice, maxPrice, order, primeraCarga]);

  const [modal, setModal] = useState({ open: false, prod: null, opciones: [], tipo: null });
  // const { id } = useParams(); // Eliminado, ya está arriba
  const [categoria, setCategoria] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartIds, setCartIds] = useState([]);
  const [favIds, setFavIds] = useState([]);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchData = async () => {
      let userRole = null;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) userRole = userDoc.data().role;
      }
      setRole(userRole);

      // Obtener todas las categorías para navegación
      const catsSnap = await getDocs(collection(db, "categories"));
      const cats = catsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategorias(cats);

      const catDoc = await getDoc(doc(db, "categories", id));
      setCategoria(catDoc.exists() ? { id: catDoc.id, ...catDoc.data() } : null);

      // Solo productos de la categoría de la URL
      const productsQuery = query(collection(db, "products"), where("categoryId", "==", id));
      const snapshot = await getDocs(productsQuery);
      setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchData();
  }, [id, user]);

  // Sincronización en tiempo real de carrito y favoritos
  useEffect(() => {
    if (!user) return;
    const cartUnsub = onSnapshot(collection(db, `users/${user.uid}/cart`), snap => {
      setCartIds(snap.docs.map(d => d.id));
    });
    const favUnsub = onSnapshot(collection(db, `users/${user.uid}/favorites`), snap => {
      setFavIds(snap.docs.map(d => d.id));
    });
    return () => {
      cartUnsub();
      favUnsub();
    };
  }, [user]);

  // SEO: Dynamic meta tags + Breadcrumb schema for category page
  useEffect(() => {
    if (!categoria) return;
    const title = `${categoria.name} | PandaStore - Videojuegos Digitales`;
    document.title = title;
    const desc = `Compra juegos de ${categoria.name} en PandaStore. Cat\u00e1logo con entrega digital inmediata y precios accesibles.`;
    let el = document.querySelector('meta[name="description"]');
    if (el) el.setAttribute('content', desc);
    let og = document.querySelector('meta[property="og:title"]');
    if (og) og.setAttribute('content', title);
    let ogd = document.querySelector('meta[property="og:description"]');
    if (ogd) ogd.setAttribute('content', desc);

    // Breadcrumb schema
    const schema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pandastoreupdate.web.app/home" },
        { "@type": "ListItem", "position": 2, "name": "Categor\u00edas", "item": "https://pandastoreupdate.web.app/categorias" },
        { "@type": "ListItem", "position": 3, "name": categoria.name, "item": window.location.href }
      ]
    };
    let scriptEl = document.querySelector('script#cat-breadcrumb-jsonld');
    if (!scriptEl) { scriptEl = document.createElement('script'); scriptEl.id = 'cat-breadcrumb-jsonld'; scriptEl.type = 'application/ld+json'; document.head.appendChild(scriptEl); }
    scriptEl.textContent = JSON.stringify(schema);

    return () => {
      document.title = 'PandaStore | Tienda de Videojuegos Digitales';
      const s = document.querySelector('script#cat-breadcrumb-jsonld');
      if (s) s.remove();
    };
  }, [categoria]);

  // Handlers para agregar/quitar del carrito y favoritos
  const [showAuthModal, setShowAuthModal] = useState(false);
  const openAuthModal = () => setShowAuthModal(true);
  const closeAuthModal = () => setShowAuthModal(false);

  const handleCart = async (prod) => {
    if (!user) {
      openAuthModal();
      return;
    }
    if (cartIds.includes(prod.id)) {
      // Quitar del carrito directamente
      const cartRef = doc(db, `users/${user.uid}/cart`, prod.id);
      await deleteDoc(cartRef);
    } else {
      await handleCartAddOrRemove({
        db,
        user,
        prod,
        moneda,
        cartIds,
        setModal
      });
    }
  };

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
      cantidad: 1,
      ...extra
    });
    setModal({ open: false, prod: null, opciones: [], tipo: null });
  };

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

  const handleDelete = async (prodId) => {
    await deleteDoc(doc(db, "products", prodId));
    setProductos(productos.filter(p => p.id !== prodId));
  };

  // Reiniciar a la página 1 si cambian los filtros/búsqueda/categoría
  React.useEffect(() => {
    setPage(1);
  }, [search, minPrice, maxPrice, moneda, id]);

  if (loading) return (
    <div className="catpage-loading">
      <div className="catpage-loading-orbit" />
      <p className="catpage-loading-text">Cargando productos...</p>
    </div>
  );
  if (!categoria) return <div style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#a084e8',fontWeight:700,fontSize:'1.15rem'}}>Categor&iacute;a no encontrada.</div>;

  const isSwitch = (categoria?.name || '').toLowerCase().includes('switch');
  const totalPages = Math.ceil(searchResults.length / perPage);
  const paginated = searchResults.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="catpage-root home-root">

      {/* Modal auth */}
      {showAuthModal && (
        <div className="catpage-auth-overlay" onClick={e => { if (e.target === e.currentTarget) closeAuthModal(); }}>
          <div className="catpage-auth-card">
            <h2>Debes iniciar sesi&oacute;n</h2>
            <p>Para agregar productos al carrito, favoritos o ver detalles, primero debes iniciar sesi&oacute;n o crear una cuenta.</p>
            <div className="catpage-auth-btns">
              <button className="catpage-auth-btn primary" onClick={() => { closeAuthModal(); navigate('/iniciar-sesion'); }}>Iniciar sesi&oacute;n</button>
              <button className="catpage-auth-btn secondary" onClick={() => { closeAuthModal(); navigate('/registro'); }}>Registrarse</button>
            </div>
            <button className="catpage-auth-cancel" onClick={closeAuthModal}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Hero header */}
      <div className="catpage-hero">
        <h1 className="catpage-hero-title">{categoria?.name || 'Categor\u00eda'}</h1>
        <span className="catpage-hero-line" />
        <br />
        <span className="catpage-hero-count">{searchResults.length} producto{searchResults.length !== 1 ? 's' : ''}</span>
        {isSwitch && (
          <div className="catpage-switch-compat">
            <span className="catpage-switch-compat-icon">🎮</span>
            <span>Compatible con <strong>Nintendo Switch 1</strong> y <strong>Switch 2</strong></span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="catpage-search-wrap">
        <div className="catpage-search-card">
          <div className="catpage-search-row">
            <div className="catpage-search-field">
              <span className="catpage-search-icon">&#128269;</span>
              <input
                type="text"
                className="catpage-search-input"
                placeholder={`Buscar en ${categoria?.name || 'categor\u00eda'}...`}
                value={searchInput}
                onChange={e => { setSearchInput(e.target.value); setFiltroAplicado(false); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const term = searchInput.trim();
                    if (!term) return;
                    setSearch(term);
                    setFiltroAplicado(true);
                  }
                }}
              />
            </div>
            <button
              className="catpage-search-btn"
              disabled={!searchInput.trim().length}
              onClick={() => {
                const term = searchInput.trim();
                if (!term) return;
                setSearch(term);
                setFiltroAplicado(true);
              }}
            >Buscar</button>
            {(filtroAplicado || search) && (
              <button
                className="catpage-clear-btn"
                title="Limpiar"
                onClick={() => { setSearchInput(""); setSearch(""); setMinPrice(""); setMaxPrice(""); setOrder('price-asc'); setFiltroAplicado(false); setPage(1); }}
              >&#10005;</button>
            )}
          </div>

          {/* Sort pills */}
          <div className="catpage-sort-row">
            <span className="catpage-sort-label">Ordenar:</span>
            <div className="catpage-sort-pills">
              <button className={`catpage-sort-pill${order === 'price-asc' ? ' active' : ''}`} onClick={() => setOrder('price-asc')}>
                <span>&#8593;</span> Menor precio
              </button>
              <button className={`catpage-sort-pill${order === 'price-desc' ? ' active' : ''}`} onClick={() => setOrder('price-desc')}>
                <span>&#8595;</span> Mayor precio
              </button>
            </div>
          </div>
        </div>

        {/* Autocomplete dropdown */}
        {!filtroAplicado && searchInput.trim().length > 0 && searchResults.length > 0 && (
          <div className="catpage-autocomplete">
            {searchResults.slice(0, 12).map(prod => (
              <Link key={prod.id} to={prodUrl(prod.name, prod.id)} className="catpage-autocomplete-item" onClick={e => {
                if (!user) { e.preventDefault(); openAuthModal(); } else { setSearch(prod.name); }
              }}>
                {prod.imageUrl && <img src={prod.imageUrl} alt={prod.name} className="catpage-autocomplete-img" />}
                <span>{prod.name}</span>
              </Link>
            ))}
            {searchResults.length > 12 && (
              <div style={{padding:'8px 14px',textAlign:'center',color:'rgba(160,132,232,0.6)',fontSize:'0.85rem',fontWeight:500}}>
                Mostrando los primeros 12 resultados...
              </div>
            )}
          </div>
        )}
        {!filtroAplicado && searchInput.trim().length > 0 && searchResults.length === 0 && (
          <div className="catpage-autocomplete">
            <div className="catpage-autocomplete-empty">
              Sin resultados para &quot;{searchInput}&quot;
            </div>
          </div>
        )}
      </div>

      {/* Product grid */}
      <div className="catpage-grid-container">
        {searchResults.length === 0 ? (
          <div className="catpage-empty">No se encontraron productos</div>
        ) : (
          <>
            <div className="catpage-grid">
              {paginated.map(prod => (
                <div
                  key={prod.id}
                  className="catpage-card"
                  onClick={e => {
                    if (e.target.tagName === 'BUTTON' || (e.target.closest && e.target.closest('button'))) return;
                    if (e.target.tagName === 'A' || (e.target.closest && e.target.closest('a'))) return;
                    if (!user) { openAuthModal(); return; }
                    navigate(prodUrl(prod.name, prod.id));
                  }}
                >
                  {/* Fav */}
                  <button className="catpage-fav-btn" onClick={e => { e.stopPropagation(); handleFav(prod); }} title={favIds.includes(prod.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
                    <span className={`catpage-fav-star ${favIds.includes(prod.id) ? 'on' : 'off'}`}>&#9733;</span>
                  </button>

                  {prod.imageUrl && (
                    <img src={prod.imageUrl} alt={prod.name} className="catpage-card-img" loading="lazy" />
                  )}

                  <div className="catpage-card-name">
                    <Link to={prodUrl(prod.name, prod.id)}>{prod.name}</Link>
                  </div>

                  {isSwitch && (
                    <div className="catpage-switch-badge">
                      <span className="catpage-switch-badge-dot" />
                      Switch 1 &amp; 2
                    </div>
                  )}

                  {(() => {
                    const min = getMinPriceByMoneda(prod, moneda);
                    return min ? (
                      <div className="catpage-price-badge">
                        Desde: <span className="price-val">{formatPrecio(min, moneda)}</span>
                      </div>
                    ) : (
                      <div className="catpage-no-price">Sin precio en {moneda}</div>
                    );
                  })()}

                  <button
                    className={`catpage-cart-btn${cartIds.includes(prod.id) ? ' in-cart' : ''}`}
                    onClick={async e => {
                      e.stopPropagation();
                      if (!user) { openAuthModal(); return; }
                      await handleCart(prod);
                    }}
                  >
                    {cartIds.includes(prod.id) ? (
                      <><span style={{fontSize:'0.9rem'}}>&#10005;</span> Quitar del carrito</>
                    ) : (
                      <><svg className="catpage-cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Agregar al carrito</>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="catpage-pagination">
                <button
                  className="catpage-page-btn"
                  disabled={page === 1}
                  onClick={() => { setPage(p => Math.max(1, p - 1)); setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 10); }}
                >&#8592; Anterior</button>
                <span className="catpage-page-info">
                  {page} / {totalPages}
                </span>
                <button
                  className="catpage-page-btn"
                  disabled={page >= totalPages}
                  onClick={() => { setPage(p => Math.min(totalPages, p + 1)); setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 10); }}
                >Siguiente &#8594;</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Variant / Subscription modal */}
      {modal.open && (
        <div className="catpage-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal({ open: false, prod: null, opciones: [], tipo: null }); }}>
          <div className="catpage-modal-card">
            <h3>Selecciona una opci&oacute;n</h3>
            <ul className="catpage-modal-options">
              {modal.opciones.map(op => (
                <li key={op.value}>
                  <button className="catpage-modal-option-btn" onClick={() => handleCartModal(op)}>{op.label}</button>
                </li>
              ))}
            </ul>
            <button className="catpage-modal-cancel" onClick={() => setModal({ open: false, prod: null, opciones: [], tipo: null })}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
