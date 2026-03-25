// Devuelve el menor precio disponible según moneda y variantes
import { getMinPriceByMoneda } from '../../components/Header';
import { handleCartAddOrRemove } from '../../utils/cartHelpers';

import React, { useEffect, useState } from "react";
import { useMoneda } from "../../context/MonedaContext";
import { db, auth } from "../../firebase";
import { useParams, Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, setDoc, onSnapshot } from "firebase/firestore";

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
  const { id } = useParams();
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

  if (loading) return <div>Cargando...</div>;
  if (!categoria) return <div>Categoría no encontrada.</div>;

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

      {/* Buscador principal (mismo estilo que Home) */}
      <div className="home-buscador" style={{
        maxWidth: 520,
        margin: '32px auto 24px auto',
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
              placeholder={`Buscar en ${categoria?.name || 'categoría'}...`}
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
          <button
            disabled={!searchInput.trim().length}
            onClick={() => {
              const term = searchInput.trim();
              if (!term) return;
              setSearch(term);
              setFiltroAplicado(true);
            }}
            style={{
              background: !searchInput.trim().length ? '#9ca3af' : '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 16px',
              height: 44,
              fontWeight: 800,
              fontSize: '1rem',
              boxShadow: '0 2px 8px #7b2ff244',
              cursor: !searchInput.trim().length ? 'not-allowed' : 'pointer',
              transition: 'background 0.18s, color 0.18s, box-shadow 0.18s, transform 0.15s',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3
            }}
          >
            Aplicar
          </button>
          {(filtroAplicado || minPrice || maxPrice || search || order !== 'price-asc') && (
            <button onClick={() => { setSearchInput(""); setSearch(""); setMinPrice(""); setMaxPrice(""); setOrder('price-asc'); setFiltroAplicado(false); setPage(1); }} style={{
              background:'#374151',
              color:'#fff',
              border:'none',
              borderRadius:10,
              padding:'10px 14px',
              height:44,
              fontWeight:700,
              fontSize:'0.98rem',
              boxShadow:'0 2px 8px #7b2ff244',
              cursor:'pointer'
            }}>Quitar filtro</button>
          )}
          <button className="home-buscar-filtros-btn" onClick={() => setShowFilters(f => !f)} style={{
            background: '#f357a8',
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
        {/* Botones de ordenamiento visual, solo visibles si showFilters */}
        {showFilters && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'stretch',
            margin: '18px 0 8px 0',
            width: '100%'
          }}>
            <div style={{
              display:'flex',
              gap:10,
              justifyContent:'flex-start',
              width:'100%',
              flexWrap:'nowrap',
              overflowX:'auto',
              borderBottom:'1.5px solid #a084e8',
              paddingBottom:10,
              scrollbarWidth:'none',
              WebkitOverflowScrolling:'touch',
              msOverflowStyle:'none',
              minHeight: '56px'
            }}>
              <button className={`btn${order==='price-asc' ? ' incart' : ''}`} style={{padding:'7px 18px',fontSize:'1rem',minWidth:120,flex:'0 0 auto'}} onClick={()=>setOrder('price-asc')}>Menor precio</button>
              <button className={`btn${order==='price-desc' ? ' incart' : ''}`} style={{padding:'7px 18px',fontSize:'1rem',minWidth:120,flex:'0 0 auto'}} onClick={()=>setOrder('price-desc')}>Mayor precio</button>
              <button className={`btn${order==='az' ? ' incart' : ''}`} style={{padding:'7px 18px',fontSize:'1rem',minWidth:90,flex:'0 0 auto'}} onClick={()=>setOrder('az')}>A-Z</button>
              <button className={`btn${order==='za' ? ' incart' : ''}`} style={{padding:'7px 18px',fontSize:'1rem',minWidth:90,flex:'0 0 auto'}} onClick={()=>setOrder('za')}>Z-A</button>
            </div>
            <div style={{
              display: 'flex',
              gap: 10,
              width: '100%',
              maxWidth: 500,
              margin: '4px auto 0 auto',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <input
                type="number"
                placeholder="Precio mín"
                value={minPrice}
                min={0}
                onChange={e => {
                  const val = e.target.value;
                  if (val === "" || Number(val) >= 0) setMinPrice(val);
                }}
                style={{
                  width:'110px',
                  padding:'10px 12px',
                  borderRadius:8,
                  border:'1.5px solid #a084e8',
                  background:'#1a1a2e',
                  color:'#fff',
                  fontSize:'1rem',
                  fontFamily:'Poppins, Montserrat, Segoe UI, Arial, sans-serif',
                  fontWeight:500,
                  outline:'none',
                  marginTop:0
                }}
              />
              <input
                type="number"
                placeholder="Precio máx"
                value={maxPrice}
                min={0}
                onChange={e => {
                  const val = e.target.value;
                  if (val === "" || Number(val) >= 0) setMaxPrice(val);
                }}
                style={{
                  width:'110px',
                  padding:'10px 12px',
                  borderRadius:8,
                  border:'1.5px solid #a084e8',
                  background:'#1a1a2e',
                  color:'#fff',
                  fontSize:'1rem',
                  fontFamily:'Poppins, Montserrat, Segoe UI, Arial, sans-serif',
                  fontWeight:500,
                  outline:'none',
                  marginTop:0
                }}
              />
              <button
                onClick={() => { setSearchInput(""); setSearch(""); setMinPrice(""); setMaxPrice(""); setOrder('price-asc'); setFiltroAplicado(false); setPage(1); }}
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: '1.5px solid #a084e8',
                  background: '#374151',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1rem',
                  marginLeft: 8,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px #7b2ff244',
                  transition: 'background 0.18s, box-shadow 0.18s, transform 0.15s',
                  outline: 'none',
                  marginTop: 0
                }}
              >Quitar filtro</button>
            </div>
          </div>
        )}
        {!filtroAplicado && searchInput.trim().length > 0 && searchResults.length > 0 && (
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
            {searchResults.slice(0,15).map(prod => (
              <Link key={prod.id} to={`/producto/${prod.id}`} onClick={e => {
                if (!user) {
                  e.preventDefault();
                  openAuthModal();
                } else {
                  setSearch(prod.name);
                }
              }} style={{display:'flex', alignItems:'center', gap:8, padding:10, borderBottom:'1px solid #eee', textDecoration:'none', color:'#222', fontFamily:'Poppins, Montserrat, Segoe UI, Arial, sans-serif', fontWeight:600, fontSize:'1.01rem'}}>
                {prod.imageUrl && <img src={prod.imageUrl} alt={prod.name} style={{width:32, height:32, objectFit:'cover', borderRadius:4}} />}
                <span>{prod.name}</span>
              </Link>
            ))}
            {searchResults.length > 15 && (
              <div style={{padding: '8px 14px', color: '#888', fontWeight: 500, fontSize: '0.95rem', background: '#f7f7fa', borderTop: '1px solid #eee', textAlign:'center'}}>
                Mostrando solo los primeros 15 resultados...
              </div>
            )}
          </div>
        )}
        {!filtroAplicado && searchInput.trim().length > 0 && searchResults.length === 0 && (
          <div style={{
            background:'#fff',
            border:'1.5px solid #a084e8',
            borderRadius:8,
            marginTop:8,
            zIndex:10,
            position:'relative',
            boxShadow:'0 2px 12px #7b2ff244',
            padding:'12px 16px',
            textAlign:'center',
            fontWeight:700,
            color:'#444'
          }}>
            Productos no encontrados
          </div>
        )}
      </div>
      {/* Lista de productos */}
      {/* Contador de productos totales filtrados */}
      <div
        style={{
          width: '100%',
          maxWidth: 1400,
          margin: '0 auto 10px auto',
          textAlign: 'left',
          fontWeight: 800,
          fontSize: '1.18rem',
          color: '#FFD600',
          letterSpacing: '0.01em',
          paddingLeft: 8,
          paddingBottom: 4,
          background: 'none',
          borderRadius: 0,
          boxShadow: 'none',
          minHeight: 'unset',
          padding: 0,
          borderLeft: 'none',
          borderBottom: 'none',
          display: 'block'
        }}
      >
  {`Productos encontrados: ${searchResults.length}`}
      </div>
      <div className="home-productos-list" style={{display:'flex', flexDirection:'column', alignItems:'center', width:'100%'}}>
        {(() => {
          // Paginate searchResults
          const paginated = searchResults.slice((page-1)*perPage, page*perPage);
          if (searchResults.length === 0) {
            return <div style={{padding:32, textAlign:'center', color:'#888', fontSize:20, fontWeight:700}}>Productos no encontrados</div>;
          }
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
                  <div
                    key={prod.id}
                    className="card1 card1-full-mobile"
                    style={{
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      padding: 18,
                      boxSizing: 'border-box',
                      position: 'relative',
                      background: 'rgba(44,19,80,0.18)',
                      borderRadius: 14,
                      border: '1.5px solid #a084e8',
                      boxShadow: '0 2px 12px #7b2ff244',
                      minWidth: 220,
                      maxWidth: 260,
                      marginBottom: 10,
                      cursor: 'pointer'
                    }}
                    onClick={e => {
                      if (
                        e.target.tagName === 'BUTTON' ||
                        (e.target.closest && e.target.closest('button'))
                      ) return;
                      if (!user) {
                        openAuthModal();
                        return;
                      }
                      navigate(`/producto/${prod.id}`);
                    }}
                  >
                    {/* Estrella de favoritos igual que Home */}
                    <button
                      onClick={e => { e.stopPropagation(); handleFav(prod); }}
                      className={`star-fav-btn${favIds.includes(prod.id) ? ' fav' : ''}`}
                      title={favIds.includes(prod.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 14,
                        zIndex: 2,
                        borderRadius: '50%',
                        padding: 2,
                        border: 'none',
                        background: 'transparent',
                        color: favIds.includes(prod.id) ? '#FFD600' : '#fff',
                        fontSize: 22,
                        cursor: 'pointer',
                        boxShadow: 'none',
                        transition: 'color 0.18s'
                      }}
                    >
                      <span
                        role="img"
                        aria-label="star"
                        style={{
                          color: favIds.includes(prod.id) ? '#FFD600' : '#fff',
                          textShadow: favIds.includes(prod.id)
                            ? '0 0 8px #FFD60099, 0 1px 0 #18122B'
                            : '0 1px 6px #7b2ff244'
                        }}
                      >★</span>
                    </button>
                    {prod.imageUrl && (
                      <img src={prod.imageUrl} alt={prod.name} style={{
                        width: '98%',
                        height: 180,
                        maxWidth: 240,
                        display: 'block',
                        objectFit: 'contain',
                        background: 'transparent',
                        borderRadius: 12,
                        margin: '8px auto 16px auto',
                        padding: 0,
                        boxShadow: 'none',
                        border: 'none'
                      }} />
                    )}
                    <div style={{
                      marginBottom: 4,
                      fontWeight: 700,
                      fontSize: '1.08rem',
                      color: '#fff',
                      textAlign: 'center',
                      width: '100%'
                    }}>
                      <Link to={`/producto/${prod.id}`} style={{ color: '#fff', textDecoration: 'none' }}>{prod.name}</Link>
                    </div>
                    <div style={{
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
                        const min = getMinPriceByMoneda(prod, moneda);
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
                          <span style={{ color: '#888' }}>Sin precio en {moneda}</span>
                        );
                      })()}
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', width: '100%', marginTop: 4 }}>
                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          if (!user) { openAuthModal(); return; }
                          await handleCart(prod);
                        }}
                        className={`btn${cartIds.includes(prod.id) ? ' incart' : ''}`}
                        style={{
                          marginTop: 8,
                          marginBottom: 2,
                          background: cartIds.includes(prod.id)
                            ? 'linear-gradient(90deg, #d32f2f 0%, #a084e8 100%)'
                            : 'linear-gradient(90deg, #7b2ff2 0%, #f357a8 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 18px',
                          fontWeight: 700,
                          fontSize: '1.01rem',
                          boxShadow: '0 2px 8px #7b2ff244',
                          cursor: 'pointer',
                          transition: 'background 0.18s, box-shadow 0.18s, transform 0.15s'
                        }}
                      >
                        {cartIds.includes(prod.id) ? 'Quitar del carrito' : 'Agregar al carrito'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {/* PAGINATION CONTROLS SOLO SI HAY MÁS DE UNA PÁGINA */}
              {searchResults.length > perPage && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 18,
                  margin: '40px auto 0 auto',
                  width: '100%',
                  maxWidth: 520,
                  flexWrap: 'wrap',
                  padding: '0 8px',
                }}>
                  <button
                    onClick={() => {
                      setPage(p => {
                        const newPage = Math.max(1, p-1);
                        setTimeout(() => window.scrollTo({top:0,behavior:'smooth'}), 10);
                        return newPage;
                      });
                    }}
                    disabled={page === 1}
                    style={{
                      padding: '14px 24px',
                      borderRadius: 14,
                      border: '2px solid #a084e8',
                      background: 'rgba(44,19,80,0.18)',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '1.08rem',
                      boxShadow: '0 2px 12px #7b2ff244',
                      transition: 'background 0.18s, box-shadow 0.18s, transform 0.15s',
                      outline: 'none',
                      minWidth: 110,
                      width: '100%',
                      maxWidth: 180,
                      margin: '0 0.5rem',
                    }}
                  >Anterior</button>
                  <span style={{
                    color: '#fff',
                    fontWeight: 800,
                    alignSelf: 'center',
                    fontSize: '1.08rem',
                    letterSpacing: '0.02em',
                    background: 'rgba(44,19,80,0.18)',
                    borderRadius: 10,
                    padding: '12px 18px',
                    border: '2px solid #a084e8',
                    boxShadow: '0 2px 12px #7b2ff244',
                    margin: '0 0.5rem',
                    textAlign: 'center',
                    minWidth: 120,
                    width: '100%',
                    maxWidth: 180,
                    wordBreak: 'break-word',
                  }}>Página {page} de {Math.ceil(searchResults.length/perPage)}</span>
                  <button
                    onClick={() => {
                      setPage(p => {
                        const newPage = Math.min(Math.ceil(searchResults.length/perPage), p+1);
                        setTimeout(() => window.scrollTo({top:0,behavior:'smooth'}), 10);
                        return newPage;
                      });
                    }}
                    disabled={page >= Math.ceil(searchResults.length/perPage)}
                    style={{
                      padding: '14px 24px',
                      borderRadius: 14,
                      border: '2px solid #a084e8',
                      background: 'rgba(44,19,80,0.18)',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: page >= Math.ceil(searchResults.length/perPage) ? 'not-allowed' : 'pointer',
                      fontSize: '1.08rem',
                      boxShadow: '0 2px 12px #7b2ff244',
                      transition: 'background 0.18s, box-shadow 0.18s, transform 0.15s',
                      outline: 'none',
                      minWidth: 110,
                      width: '100%',
                      maxWidth: 180,
                      margin: '0 0.5rem',
                    }}
                  >Siguiente</button>
                </div>
              )}
            </>
          );
        })()}
      </div>
      {/* Modal para seleccionar variante/suscripción */}
      {/* El modal solo se muestra si se agrega, nunca para quitar */}
      {modal.open && (
        <div className="modal-bg" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: '#0008',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 60, // <-- Espacio para no topar el header
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: '#fff',
            padding: 32,
            borderRadius: 18,
            minWidth: 320,
            maxWidth: 400,
            boxShadow: '0 8px 32px #7b2ff244',
            border: '2px solid #a084e8',
            position: 'relative',
            marginTop: 32 // <-- Extra margen por si acaso
          }}>
            <h3 style={{
              fontWeight: 800,
              fontSize: '1.25rem',
              color: '#7b2ff2',
              marginBottom: 18,
              textAlign: 'center'
            }}>Selecciona una opción</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {modal.opciones.map(op => (
                <li key={op.value} style={{ marginBottom: 18 }}>
                  <button
                    style={{
                      width: '100%',
                      padding: '16px 0',
                      borderRadius: 12,
                      border: '2px solid #a084e8',
                      background: '#e3f2fd',
                      fontWeight: 700,
                      fontSize: '1.15rem',
                      color: '#393053',
                      boxShadow: '0 2px 8px #7b2ff244',
                      cursor: 'pointer',
                      transition: 'background 0.18s, box-shadow 0.18s, transform 0.15s',
                      outline: 'none',
                      textShadow: '0 1px 6px #7b2ff244'
                    }}
                    onClick={() => handleCartModal(op)}
                  >
                    {op.label}
                  </button>
                </li>
              ))}
            </ul>
            <button
              style={{
                marginTop: 8,
                width: '100%',
                padding: '14px 0',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(90deg, #7b2ff2 0%, #f357a8 100%)',
                color: '#fff',
                fontWeight: 800,
                fontSize: '1.13rem',
                boxShadow: '0 2px 8px #7b2ff244',
                cursor: 'pointer',
                transition: 'background 0.18s, box-shadow 0.18s, transform 0.15s',
                outline: 'none',
                letterSpacing: '0.02em'
              }}
              onClick={() => setModal({ open: false, prod: null, opciones: [], tipo: null })}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
