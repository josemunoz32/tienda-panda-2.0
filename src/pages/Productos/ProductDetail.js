// ...existing code...
// ...existing code...
    // ...existing code...
// ...existing code...
  // ...existing code...
import React, { useState, useEffect } from "react";

import "./ProductDetail.css";
import { useMoneda } from "../../context/MonedaContext";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from 'react-helmet-async';
import { prodUrl, extractId, slugify } from '../../utils/slugify';
import { db, auth } from "../../firebase";
import { trackViewItem } from "../../utils/analytics";
import ProductDlcs from "../../components/ProductDlcs/ProductDlcs";
import { fetchRyuuCatalog } from "../../utils/ryuuDlcHelper";
import Masonry from "../../components/Masonry/Masonry";
import Loader from "../../components/Loader";
import { getProductPricing, formatCLP, parseNumberCLP } from "../../utils/priceHelper";
import { hasResellerBenefits } from "../../utils/userRoles";
import { calculateSwitchStockMap, getGameStockCount, buildStockRequestWhatsappUrl } from "../../utils/switchStockHelper";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  where
} from "firebase/firestore";
import steamImportData from "../../assets/steam_import_data.json";

function cleanTitle(name) {
  if (!name) return "";
  return name
    .replace(/\s*\((?:requiere\s*fix|requiere\s*parche|fix|parche)\)/gi, '')
    .replace(/\s*\[(?:requiere\s*fix|requiere\s*parche|fix|parche)\]/gi, '')
    .trim();
}

function checkIsPlayStation(prod) {
  if (!prod) return false;
  const rawPlat = (prod.plataforma || prod.platform || "").toLowerCase();
  const cat = (prod.categoria || prod.categoryName || "").toLowerCase();
  return (
    rawPlat.includes("ps4") || rawPlat.includes("ps5") || rawPlat.includes("playstation") ||
    rawPlat.includes("play 4") || rawPlat.includes("play 5") ||
    cat.includes("ps4") || cat.includes("ps5") || cat.includes("playstation") ||
    cat.includes("play 4") || cat.includes("play 5") ||
    Boolean(prod.pricePrimariaCLP || prod.priceSecundariaCLP || prod.pricePrimariaUSD || prod.priceSecundariaUSD)
  );
}

// Componente para mostrar la descripción con ver más/ver menos
function DescripcionExpandible({ descripcion }) {
  const [expand, setExpand] = useState(false);
  const maxLen = 180;
  if (!descripcion) return null;
  const isLong = descripcion.length > maxLen;
  return (
  <div className="producto-description-card">
      <b>Descripción</b>{' '}
      <span style={{
        display:'inline',
        wordBreak:'break-word',
        whiteSpace: expand ? 'pre-line' : 'normal',
        maxHeight: expand ? 'none' : 64,
        overflow: 'hidden',
        fontSize: '0.97rem',
        color:'#d4c8f0',
        lineHeight:1.6
      }}>
        {expand || !isLong ? descripcion : descripcion.slice(0, maxLen) + '...'}
      </span>
      {isLong && (
        <button
          type="button"
          onClick={()=>setExpand(e=>!e)}
          className="producto-description-toggle"
        >
          {expand ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </div>
  );
}

// Componente para mostrar preguntas y respuestas
function PreguntaRespuesta({ pregunta, onResponder, user, isAdmin }) {
  const [respuesta, setRespuesta] = useState("");
  return (
    <div style={{
      marginBottom: 16,
      padding: '14px 18px',
      background: 'rgba(36,0,70,0.55)',
      borderRadius: 14,
      border: '1.5px solid rgba(162,89,255,0.3)',
      boxShadow: '0 2px 12px rgba(123,47,242,0.1)'
    }}>
      <div style={{ fontWeight: 600, color: '#c4b5fd', marginBottom: 6, fontSize: '1rem' }}>
        <span style={{ color: '#a259ff', marginRight: 6 }}>💬</span>
        <span style={{ color: '#e8e0f5' }}>{pregunta.userName}:</span>{' '}
        <span style={{ color: '#d4c8f0', fontWeight: 400 }}>{pregunta.text}</span>
      </div>
      {pregunta.answer ? (
        <div style={{
          marginLeft: 16, marginTop: 8,
          padding: '8px 14px',
          background: 'rgba(162,89,255,0.12)',
          borderRadius: 10,
          borderLeft: '3px solid #a259ff',
          color: '#c4b5fd',
          fontSize: '0.97rem'
        }}>
          <span style={{ fontWeight: 700, color: '#a259ff' }}>Respuesta: </span>{pregunta.answer}
        </div>
      ) : (
        (isAdmin || (user && user.uid !== pregunta.userId)) ? (
          <form onSubmit={e => {e.preventDefault(); onResponder(respuesta, pregunta.id); setRespuesta("");}} style={{
            marginLeft: 16, marginTop: 10,
            display: 'flex', gap: 8, alignItems: 'center'
          }}>
            <input
              value={respuesta}
              onChange={e => setRespuesta(e.target.value)}
              placeholder="Responder..."
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 10,
                border: '1.5px solid rgba(162,89,255,0.4)',
                background: 'rgba(30,0,60,0.8)', color: '#e8e0f5',
                fontSize: '0.95rem', outline: 'none', fontFamily: 'inherit'
              }}
            />
            <button type="submit" disabled={!respuesta.trim()} style={{
              padding: '8px 18px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(90deg,#7b2ff2,#a259ff)',
              color: '#fff', fontWeight: 700, cursor: 'pointer',
              fontSize: '0.95rem', opacity: respuesta.trim() ? 1 : 0.5
            }}>Responder</button>
          </form>
        ) : null
      )}
      {pregunta.answer && (
        <div style={{ fontSize: 11, color: '#6b5e8a', marginLeft: 16, marginTop: 4 }}>
          Respondido el {pregunta.answeredAt && pregunta.answeredAt.substring(0, 10)}
        </div>
      )}
    </div>
  );
}

// Componente para mostrar estrellas de calificación

// Componente para mostrar todos los precios disponibles como un <select> controlado
function PriceSelector({ producto, selectedOption, onChange, selectStyle, userProfile }) {
  const { moneda, formatearPrecio } = useMoneda();
  const options = [];
  if (!producto) return null;

  const rawPlataforma = (producto.plataforma || producto.platform || "").toLowerCase();
  const catName = (producto.categoria || "").toLowerCase();
  const plataformas = rawPlataforma.split(/[,/\\ ]+/).map(p => p.trim()).filter(Boolean);

  let plataformaLabel = "";
  if (plataformas.includes("ps4") && plataformas.includes("ps5")) {
    plataformaLabel = "PS4/PS5";
  } else if (plataformas.includes("ps5")) {
    plataformaLabel = "PS5";
  } else if (plataformas.includes("ps4")) {
    plataformaLabel = "PS4";
  } else {
    plataformaLabel = "";
  }

  // Un app_id no convierte un producto PS4/PS5 en Steam. Algunos catálogos
  // antiguos lo usan como referencia interna, por eso la plataforma manda.
  const isSteam = isSteamProduct(producto);

  const isSwitch = rawPlataforma.includes("switch") || catName.includes("switch") || rawPlataforma.includes("nintendo");
  const hasMonthlyPlans = getMonthlyPlans(producto, moneda).length > 0;

  const isPlayStation = !isSteam && !isSwitch && (
    plataformas.includes("ps4") || plataformas.includes("ps5") || 
    rawPlataforma.includes("playstation") || rawPlataforma.includes("ps") || 
    catName.includes("playstation") || catName.includes("ps4") || catName.includes("ps5") ||
    Boolean(producto.pricePrimariaCLP || producto.priceSecundariaCLP || producto.pricePrimariaUSD || producto.priceSecundariaUSD)
  );

  const isReseller = hasResellerBenefits(userProfile);

  // Para cualquier moneda (CLP, USD, PEN, COP, ARS, etc.), usamos el precio base CLP
  // y lo convertimos con formatearPrecio, garantizando respuesta en tiempo real al dólar fijado
  if (!hasMonthlyPlans && isSteam) {
    const steamCLP = producto.priceCLP || producto.pricePrimariaCLP || 2000;
    let steamDisplay = steamCLP;
    if (isReseller && steamCLP > 0) {
      const pr = getProductPricing({
        ...producto,
        categoryName: "steam",
        selectedPriceCLP: steamCLP,
        priceCLP: steamCLP
      }, "revendedor", userProfile?.purchaseCount || userProfile?.comprasRealizadas || 0);
      if (pr?.precioFinal) steamDisplay = pr.precioFinal;
    }
    options.push({
      label: `Steam: ${formatearPrecio(steamDisplay)}`,
      value: String(steamCLP)
    });
  } else if (!hasMonthlyPlans && isPlayStation) {
    const hasPrimary = Boolean(producto.pricePrimariaCLP);
    const hasSecondary = Boolean(producto.priceSecundariaCLP);

    if (hasPrimary) {
      const rawPri = parseNumberCLP(producto.pricePrimariaCLP);
      let priDisplay = rawPri;
      if (isReseller && rawPri > 0) {
        const pr = getProductPricing({ ...producto, variante: 'primaria', selectedPriceCLP: rawPri, priceCLP: rawPri, categoryName: 'playstation' }, 'revendedor', userProfile?.purchaseCount || 0);
        priDisplay = pr.precioFinal;
      }
      options.push({
        label: `${plataformaLabel ? plataformaLabel + ' ' : ''}Primaria: ${formatearPrecio(priDisplay)}`,
        value: `ps-primary:${producto.pricePrimariaCLP}`
      });
    }
    if (hasSecondary) {
      const rawSec = parseNumberCLP(producto.priceSecundariaCLP);
      let secDisplay = rawSec;
      if (isReseller && rawSec > 0) {
        const pr = getProductPricing({ ...producto, variante: 'secundaria', selectedPriceCLP: rawSec, priceCLP: rawSec, categoryName: 'playstation' }, 'revendedor', userProfile?.purchaseCount || 0);
        secDisplay = pr.precioFinal;
      }
      options.push({
        label: `${plataformaLabel ? plataformaLabel + ' ' : ''}Secundaria: ${formatearPrecio(secDisplay)}`,
        value: `ps-secondary:${producto.priceSecundariaCLP}`
      });
    }
  } else if (!hasMonthlyPlans && (producto.priceCLP || producto.precio_clp)) {
    const baseCLP = parseNumberCLP(producto.priceCLP || producto.precio_clp);
    let displayCLP = baseCLP;
    if (isReseller && baseCLP > 0) {
      const pr = getProductPricing({
        ...producto,
        categoryName: isSwitch ? "nintendo" : (catName || "general"),
        selectedPriceCLP: baseCLP,
        priceCLP: baseCLP
      }, "revendedor", userProfile?.purchaseCount || userProfile?.comprasRealizadas || 0);
      if (pr?.precioFinal) displayCLP = pr.precioFinal;
    }
    const labelPrefix = isSwitch ? "Nintendo Switch" : "Estándar";
    options.push({
      label: `${labelPrefix}: ${formatearPrecio(displayCLP)}`,
      value: String(baseCLP)
    });
  }

  if (Array.isArray(producto.preciosPorMes)) {
    producto.preciosPorMes.forEach((p) => {
      if (p.clp) {
        let displayCLP = p.clp;
        if (isReseller && p.clp > 0) {
          const pr = getProductPricing({
            ...producto,
            categoryName: "suscripciones",
            selectedPriceCLP: p.clp,
            priceCLP: p.clp,
            meses: p.meses
          }, "revendedor", userProfile?.purchaseCount || userProfile?.comprasRealizadas || 0);
          if (pr?.precioFinal) displayCLP = pr.precioFinal;
        }
        const tipoServicio = producto.modalidadServicio === "cuenta"
          ? "Cuenta completa"
          : producto.modalidadServicio === "perfil"
            ? "Perfil"
            : producto.modalidadServicio === "dispositivo"
              ? "Dispositivo"
              : "Suscripción";
        options.push({
          label: `${tipoServicio} ${p.meses} mes(es): ${formatearPrecio(displayCLP)}`,
          value: String(p.clp)
        });
      }
    });
  }
  if (options.length === 0) return <span style={{ color: "#888" }}>Sin precio en {moneda}</span>;
  return (
    <select
      style={{ marginLeft: 8, ...(selectStyle || {}) }}
      value={selectedOption}
      onChange={onChange}
    >
      {options.length > 1 && <option value="">Selecciona una opción</option>}
      {options.map((opt, i) => (
        <option key={i} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
// Componente para mostrar estrellas de calificación
function StarRating({ rating }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{color: i <= rating ? '#ffc107' : '#ccc'}}>&#9733;</span>
      ))}
    </span>
  );
}

export default function ProductDetail() {
  const { moneda, formatearPrecio } = useMoneda();
  // Estado del producto y usuario
  const [producto, setProducto] = useState(null);
  const [productCategoryName, setProductCategoryName] = useState("");
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  // Estado para la variante/meses seleccionados
  const [selectedOption, setSelectedOption] = useState("");
  const [fav, setFav] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [cartSelection, setCartSelection] = useState(null);
  const [showSelectMsg, setShowSelectMsg] = useState(false);
  const [copyMsg, setCopyMsg] = useState(false); // Para mensaje de copiado

  const { id: rawId } = useParams();
  const id = extractId(rawId);

  // Los productos de precio único (Switch, Streaming de un plan, Steam, etc.)
  // quedan seleccionados automáticamente. Sólo PS o planes con alternativas reales
  // muestran la elección pendiente.
  useEffect(() => {
    if (!producto) return;
    setSelectedOption(getDefaultProductOption(producto, moneda));
  }, [producto?.id, moneda]);

  // Oculta el mensaje cuando el usuario selecciona una opción
  useEffect(() => {
    if (selectedOption && showSelectMsg) setShowSelectMsg(false);
  }, [selectedOption, showSelectMsg]);

  useEffect(() => {
    if (!showSelectMsg) return undefined;
    const timeout = setTimeout(() => setShowSelectMsg(false), 4200);
    return () => clearTimeout(timeout);
  }, [showSelectMsg]);

  // Handler para el selector de precio/variante
  function handleOptionChange(e) {
    setSelectedOption(e.target.value);
  }

  // Handler para copiar el link del producto
  function handleCopyLink() {
    const url = typeof window !== 'undefined' ? window.location.href : productUrl;
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopyMsg('¡Link copiado!');
        setTimeout(() => setCopyMsg(false), 1800);
      })
      .catch(() => {
        setCopyMsg('Error al copiar');
        setTimeout(() => setCopyMsg(false), 1800);
      });
  }

  // Extrae info de variante/meses según opción seleccionada
  function getSelectedDetails(optionValue = selectedOption) {
    if (!optionValue) return {};
    let details = {};

    const isSteamProd = isSteamProduct(producto);

    if (producto && producto.preciosPorMes && Array.isArray(producto.preciosPorMes)) {
      const meses = producto.preciosPorMes.find(p => String(p.clp) === optionValue || String(p.usd) === optionValue);
      if (meses) details = { meses: meses.meses, priceCLP: meses.clp, priceUSD: meses.usd };
    } else if (producto) {
      if (isSteamProd) {
        const priceNum = Number(optionValue);
        const clpPrice = (priceNum && priceNum > 100) ? priceNum : (Number(producto.priceCLP) || 2000);
        details = { priceCLP: clpPrice };
      } else {
        const psOption = String(optionValue).match(/^ps-(primary|secondary):(.+)$/);
        if (psOption) {
          const isPrimary = psOption[1] === "primary";
          const selectedPrice = parseNumberCLP(psOption[2]) || 0;
          details = moneda === "USD"
            ? {
                variante: isPrimary ? "Primaria" : "Secundaria",
                priceUSD: selectedPrice,
                priceCLP: isPrimary ? parseNumberCLP(producto.pricePrimariaCLP) : parseNumberCLP(producto.priceSecundariaCLP)
              }
            : {
                variante: isPrimary ? "Primaria" : "Secundaria",
                priceCLP: selectedPrice || (isPrimary ? parseNumberCLP(producto.pricePrimariaCLP) : parseNumberCLP(producto.priceSecundariaCLP)),
                priceUSD: isPrimary ? Number(producto.pricePrimariaUSD || 0) : Number(producto.priceSecundariaUSD || 0)
              };
        } else if (optionValue === String(producto.priceCLP)) details = { priceCLP: parseNumberCLP(producto.priceCLP) };
        else if (optionValue === String(producto.priceUSD)) details = { priceUSD: producto.priceUSD };
        else if (optionValue === String(producto.pricePrimariaCLP)) details = { variante: "Primaria", priceCLP: parseNumberCLP(producto.pricePrimariaCLP) };
        else if (optionValue === String(producto.pricePrimariaUSD)) details = { variante: "Primaria", priceUSD: producto.pricePrimariaUSD };
        else if (optionValue === String(producto.priceSecundariaCLP)) details = { variante: "Secundaria", priceCLP: parseNumberCLP(producto.priceSecundariaCLP) };
        else if (optionValue === String(producto.priceSecundariaUSD)) details = { variante: "Secundaria", priceUSD: producto.priceSecundariaUSD };
        else details = { priceCLP: parseNumberCLP(optionValue) };
      }
    }

    // Asegurar que details conserve las propiedades de variantes de PlayStation
    if (producto) {
      if (producto.pricePrimariaCLP && !details.pricePrimariaCLP) details.pricePrimariaCLP = producto.pricePrimariaCLP;
      if (producto.priceSecundariaCLP && !details.priceSecundariaCLP) details.priceSecundariaCLP = producto.priceSecundariaCLP;
      if (producto.pricePrimariaUSD && !details.pricePrimariaUSD) details.pricePrimariaUSD = producto.pricePrimariaUSD;
      if (producto.priceSecundariaUSD && !details.priceSecundariaUSD) details.priceSecundariaUSD = producto.priceSecundariaUSD;
    }

    // Conserva el precio exacto de la variante/duración elegida. El checkout usa
    // esta marca para no reemplazarlo por el precio base del producto.
    const selectedCLP = Number(details.priceCLP || 0);
    if (selectedCLP > 0 && hasResellerBenefits(userProfile)) {
      const pricing = getProductPricing({
        ...producto,
        variante: details.variante,
        categoryName: productCategoryName || producto?.categoria || producto?.categoryName || producto?.plataforma || producto?.platform || "",
        selectedPriceCLP: selectedCLP,
        priceCLP: selectedCLP,
        priceUSD: details.priceUSD || producto?.priceUSD
      }, "revendedor", userProfile?.purchaseCount || userProfile?.comprasRealizadas || 0);
      details = { ...details, precioPublicoCLP: selectedCLP, priceCLP: pricing.precioFinal, isResellerPrice: true };
    }
    return details;
  }

  // Handler para Comprar ahora
  const navigate = useNavigate();
  function handleComprarAhora() {
    if (isSwitchOutOfStock) {
      alert("Este juego de Nintendo Switch se encuentra temporalmente sin stock en nuestros packs. Puedes solicitarlo directamente por WhatsApp.");
      return;
    }
    const optionValue = selectedOption || getDefaultProductOption(producto, moneda);
    if (!producto || (productRequiresOption(producto, moneda) && !optionValue)) {
      setShowSelectMsg(true);
      return;
    }
    const detalles = getSelectedDetails(optionValue);
    const isPS = checkIsPlayStation(producto);
    const platformLabel = (producto.plataforma || producto.platform || productCategoryName || (isPS ? "PlayStation" : "")).trim();
    navigate("/comprar-ahora", {
      state: {
        producto: {
          ...producto,
          ...detalles,
          categoryName: productCategoryName || producto.categoria || platformLabel,
          consoleName: platformLabel,
          id: producto.id || id
        }
      }
    });
  }
  // Estado de carga para preguntas
  const [questionLoading, setQuestionLoading] = useState(true);
  // Estado para preguntas y respuestas
  const [questions, setQuestions] = useState([]);
  const [questionText, setQuestionText] = useState("");
  // Obtener URL del producto para compartir
  const productUrl = typeof window !== 'undefined' ? window.location.href : '';
  // user y producto ya declarados arriba
  // Productos relacionados
  const [relacionados, setRelacionados] = useState([]);
  const [relacionadoIndex, setRelacionadoIndex] = useState(0);
  const [slidesToShow, setSlidesToShow] = useState(3);
  const [questionError, setQuestionError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  // Elimina el auto-scroll y su estado
  const autoScrollTimeout = React.useRef();

  // Responsive: cambia slidesToShow según ancho
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 600) setSlidesToShow(1);
      else if (window.innerWidth < 900) setSlidesToShow(2);
      else setSlidesToShow(3);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Navegación manual
  function handlePrevRelacionado() {
    setRelacionadoIndex(prev =>
      prev === 0 ? relacionados.length - 1 : prev - 1
    );
  }
  function handleNextRelacionado() {
    setRelacionadoIndex(prev =>
      (prev + 1) % relacionados.length
    );
  }

  // Ajusta el índice si cambia el tamaño de pantalla o la cantidad de relacionados
  useEffect(() => {
    if (relacionadoIndex > Math.max(relacionados.length - slidesToShow, 0)) {
      setRelacionadoIndex(0);
    }
  }, [slidesToShow, relacionados.length]);

  // Traer preguntas en tiempo real
  useEffect(() => {
    if (!id) return;
    setQuestionLoading(true);
    const qRef = collection(db, "products", id, "questions");
    const q = query(qRef, orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
      setQuestions(arr);
      setQuestionLoading(false);
    });
    return () => unsub();
  }, [id]);

  // Enviar pregunta
  const handleAsk = async (e) => {
    e.preventDefault();
    setQuestionError("");
    if (!user) { setQuestionError("Debes iniciar sesión para preguntar."); return; }
    if (questionText.trim().length < 5) { setQuestionError("La pregunta debe tener al menos 5 caracteres."); return; }
    try {
      await addDoc(collection(db, "products", id, "questions"), {
        userId: user.uid,
        userName: user.displayName || user.email || "Usuario",
        text: questionText,
        date: new Date().toISOString(),
        answer: "",
        answeredAt: ""
      });
      setQuestionText("");
    } catch {
      setQuestionError("Error al enviar la pregunta");
    }
  };

  // Responder pregunta
  const handleAnswer = async (respuesta, preguntaId) => {
    if (!user) return;
    try {
      const qDoc = doc(db, "products", id, "questions", preguntaId);
      await setDoc(qDoc, { answeredAt: new Date().toISOString(), answer: respuesta }, { merge: true });
    } catch {}
  };
  // id ya declarado arriba
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  // ...existing code...
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // user ya declarado arriba (no volver a declarar)

  // Reseñas
  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [userReview, setUserReview] = useState(null); // Si el usuario ya dejó reseña
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitError, setSubmitError] = useState("");

  // Checks if user is logged in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsLoggedIn(true);
        setUser(user);
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const [switchStockMap, setSwitchStockMap] = useState(new Map());

  // Productos antiguos pueden guardar sólo el ID de Firestore. Resolvemos el
  // nombre real para aplicar la regla B2B correcta (Streaming ≠ Suscripción).
  useEffect(() => {
    let active = true;
    const categoryId = producto?.categoryId;
    if (!categoryId || producto?.categoria) {
      setProductCategoryName(producto?.categoria || "");
      return () => { active = false; };
    }
    getDoc(doc(db, "categories", categoryId)).then((snap) => {
      if (active) setProductCategoryName(snap.exists() ? (snap.data().name || "") : "");
    }).catch(() => {
      if (active) setProductCategoryName("");
    });
    return () => { active = false; };
  }, [producto?.categoryId, producto?.categoria]);

  // Detectar perfil de usuario, rol y compras
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setIsAdmin(false);
      return;
    }
    getDoc(doc(db, "users", user.uid)).then(docu => {
      if (docu.exists()) {
        const data = docu.data();
        setUserProfile(data);
        setIsAdmin(data.role === "admin");
      }
    }).catch(() => {});
  }, [user]);

  // Cargar mapa cuantitativo de stock de Nintendo Switch
  useEffect(() => {
    calculateSwitchStockMap(true).then(res => {
      if (res && res.stockMap) {
        setSwitchStockMap(res.stockMap);
      }
    }).catch(() => {});
  }, []);

  // Fetches product data from Firestore or Steam catalog
  useEffect(() => {
    let isMounted = true;
    const failsafeTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 3500);

    const fetchProduct = async () => {
      if (!rawId && !id) {
        if (isMounted) setLoading(false);
        return;
      }
      setLoading(true);
      setNetworkError(false);
      try {
        let p = null;
        const rawStr = String(rawId || id || '');
        const slugPart = rawStr.includes('--') ? rawStr.split('--')[0] : rawStr;
        const idPart = rawStr.includes('--') ? rawStr.split('--').slice(1).join('--') : (id || rawStr);
        const targetSlug = slugify(slugPart);
        const cleanId = String(idPart).replace(/^(steam_|ryuu_|vip_)/, '');

        // 1. Buscar directamente por doc ID en Firestore (idPart, id o cleanId)
        for (const candidateId of [idPart, id, cleanId].filter(Boolean)) {
          try {
            const docRef = doc(db, "products", candidateId);
            const docSnap = await getDoc(docRef).catch(() => null);
            if (docSnap && docSnap.exists()) {
              p = { id: docSnap.id, ...docSnap.data() };
              break;
            }
          } catch (e) {}
        }

        // 2. Buscar en Firestore por campo 'slug' o por 'app_id'
        if (!p) {
          try {
            if (targetSlug) {
              const qSlug = query(collection(db, "products"), where("slug", "==", targetSlug));
              const snapSlug = await getDocs(qSlug);
              if (!snapSlug.empty) {
                const d = snapSlug.docs[0];
                p = { id: d.id, ...d.data() };
              }
            }
            if (!p && cleanId && !isNaN(cleanId)) {
              const qApp = query(collection(db, "products"), where("app_id", "==", cleanId));
              const snapApp = await getDocs(qApp);
              if (!snapApp.empty) {
                const d = snapApp.docs[0];
                p = { id: d.id, ...d.data() };
              }
            }
          } catch (e) {}
        }

        // 3. Buscar en steamImportData por slug, por app_id o por nombre limpio
        if (!p && Array.isArray(steamImportData)) {
          const matchSteam = steamImportData.find(s => 
            String(s.app_id) === cleanId || 
            String(s.app_id) === idPart ||
            slugify(cleanTitle(s.name || "")) === targetSlug || 
            slugify(s.name || "") === targetSlug || 
            (s.name && cleanTitle(s.name).toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTitle(slugPart).toLowerCase().replace(/[^a-z0-9]/g, ''))
          );
          if (matchSteam) {
            p = {
              id: `steam_${matchSteam.app_id}`,
              app_id: matchSteam.app_id,
              name: cleanTitle(matchSteam.name),
              imageUrl: matchSteam.imageUrl || matchSteam.image || `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${matchSteam.app_id}/header.jpg`,
              image: matchSteam.image || matchSteam.imageUrl,
              priceCLP: matchSteam.priceCLP || 2000,
              priceUSD: matchSteam.priceUSD || 2.22,
              plataforma: "Steam",
              categoria: "Juegos Steam",
              categoryId: "steam",
              description: matchSteam.comentario || "Modo Historia Completo · PandaStore Launcher"
            };
          }
        }

        // 4. Buscar en catálogo Ryuu por slug o appid
        if (!p) {
          try {
            const ryuuCat = await fetchRyuuCatalog();
            if (Array.isArray(ryuuCat)) {
              const matchRyuu = ryuuCat.find(g => 
                String(g.appid) === cleanId ||
                String(g.appid) === idPart ||
                slugify(cleanTitle(g.name || "")) === targetSlug || 
                slugify(g.name || "") === targetSlug
              );
              if (matchRyuu) {
                p = {
                  id: `ryuu_${matchRyuu.appid}`,
                  app_id: matchRyuu.appid,
                  name: cleanTitle(matchRyuu.name),
                  imageUrl: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${matchRyuu.appid}/header.jpg`,
                  image: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${matchRyuu.appid}/header.jpg`,
                  priceCLP: 2000,
                  priceUSD: 2.22,
                  plataforma: "Steam",
                  categoria: "Juegos Steam",
                  categoryId: "steam",
                  description: "Modo Historia Completo · PandaStore Launcher"
                };
              }
            }
          } catch (e) {}
        }

        // 5. Fallback exhaustivo: buscar en todos los productos de Firestore comparando slug y similitud
        if (!p) {
          try {
            const allSnap = await getDocs(collection(db, "products"));
            const matched = allSnap.docs.find(d => {
              const dat = d.data();
              const sClean = slugify(cleanTitle(dat.name || ""));
              const sRaw = slugify(dat.name || "");
              return (
                d.id === idPart ||
                d.id === cleanId ||
                sClean === targetSlug ||
                sRaw === targetSlug ||
                (dat.app_id && String(dat.app_id) === cleanId) ||
                (targetSlug.length > 5 && (sClean.includes(targetSlug) || targetSlug.includes(sClean)))
              );
            });
            if (matched) {
              p = { id: matched.id, ...matched.data() };
            }
          } catch (e) {}
        }

        // 6. Fallback final para Steam si tenemos un AppID numérico válido
        if (!p && cleanId && /^\d+$/.test(cleanId) && Number(cleanId) > 10) {
          const formattedTitle = slugPart ? slugPart.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : `Steam App ${cleanId}`;
          p = {
            id: `steam_${cleanId}`,
            app_id: cleanId,
            name: cleanTitle(formattedTitle),
            imageUrl: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${cleanId}/header.jpg`,
            image: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${cleanId}/header.jpg`,
            priceCLP: 2000,
            priceUSD: 2.22,
            plataforma: "Steam",
            categoria: "Juegos Steam",
            categoryId: "steam",
            description: "Modo Historia Completo · PandaStore Launcher"
          };
        }

        if (p && isMounted) {
          // Limpiar (REQUIERE FIX) del nombre
          p.name = cleanTitle(p.name);

          // Resolver imagen si está vacía
          let resolvedImg = p.imageUrl || p.image || p.header_image || p.cover || "";
          const appId = p.app_id || p.appId || (String(p.id).startsWith("ryuu_") ? p.id.replace("ryuu_", "") : null);

          if (!resolvedImg || !p.app_id) {
            if (appId) {
              p.app_id = appId;
              if (!resolvedImg) {
                resolvedImg = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
              }
            } else if (p.name) {
              const normName = cleanTitle(p.name).toLowerCase().replace(/[^a-z0-9]/g, '');
              const sMatch = steamImportData.find(s => cleanTitle(s.name).toLowerCase().replace(/[^a-z0-9]/g, '') === normName);
              if (sMatch) {
                p.app_id = sMatch.app_id;
                if (!resolvedImg) {
                  resolvedImg = sMatch.imageUrl || sMatch.image || `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${sMatch.app_id}/header.jpg`;
                }
              }
            }
          }

          p.imageUrl = resolvedImg;
          p.image = resolvedImg;

          setProducto(p);
          trackViewItem(p, auth.currentUser?.uid || null);
        }
      } catch (err) {
        if (err && err.code === "unavailable") setNetworkError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProduct();

    return () => {
      isMounted = false;
      clearTimeout(failsafeTimer);
    };
  }, [id, rawId]);

  // Fetch reviews in real time
  useEffect(() => {
    if (!id) return;
    setReviewLoading(true);
    const reviewsRef = collection(db, "products", id, "reviews");
    const q = query(reviewsRef, orderBy("date", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        let myReview = null;
        snap.forEach(doc => {
          const data = doc.data();
          const isAuthor = user && data.userId === user.uid;
          if (data.visible === true || isAuthor) {
            arr.push({ id: doc.id, ...data });
          }
          if (isAuthor) myReview = { id: doc.id, ...data };
        });
        setReviews(arr);
        setUserReview(myReview);
        setReviewLoading(false);
      },
      (err) => {
        console.warn("Error cargando reviews:", err);
        setReviewLoading(false);
      }
    );
    return () => unsub();
  }, [id, user]);
  // Calcular promedio de calificación solo con reseñas aprobadas
  const visibleForAvg = reviews.filter(r => r.visible === true);
  const avgRating = visibleForAvg.length > 0 ? (visibleForAvg.reduce((a, r) => a + (r.rating || 0), 0) / visibleForAvg.length).toFixed(1) : null;
  // Manejar envío de reseña
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    if (!user) {
      setSubmitError("Debes iniciar sesión para dejar una reseña.");
      return;
    }
    if (rating < 1 || rating > 5) {
      setSubmitError("Selecciona una calificación de 1 a 5 estrellas.");
      return;
    }
    if (comment.trim().length < 5) {
      setSubmitError("El comentario debe tener al menos 5 caracteres.");
      return;
    }
    try {
      // Si ya existe reseña, actualizarla
      const reviewsRef = collection(db, "products", id, "reviews");
      if (userReview) {
        const reviewDoc = doc(db, "products", id, "reviews", userReview.id);
        await setDoc(reviewDoc, {
          userId: user.uid,
          userName: user.displayName || user.email || "Usuario",
          rating,
          comment,
          date: new Date().toISOString(),
          visible: false // Pendiente de moderación
        });
      } else {
        await addDoc(reviewsRef, {
          userId: user.uid,
          userName: user.displayName || user.email || "Usuario",
          rating,
          comment,
          date: new Date().toISOString(),
          visible: false // Pendiente de moderación
        });
      }
      setComment("");
      setRating(0);
    } catch (err) {
      setSubmitError("Error al guardar la reseña");
    }
  };

  // Fetches user-specific data (favorites)
  useEffect(() => {
    const fetchFav = async () => {
      if (user && producto) {
        const favRef = doc(db, `users/${user.uid}/favorites`, producto.id || id);
        const favSnap = await getDoc(favRef);
        setFav(favSnap.exists());
      } else if (!user && producto) {
        let localFavs = [];
        try {
          const stored = localStorage.getItem('guestFavs');
          if (stored) localFavs = JSON.parse(stored);
        } catch(e) {}
        setFav(localFavs.some(f => f.productId === (producto.id || id)));
      }
    };
    fetchFav();
    
    const handleLocalFav = () => fetchFav();
    window.addEventListener('localFavUpdated', handleLocalFav);
    return () => window.removeEventListener('localFavUpdated', handleLocalFav);
  }, [user, producto, id]);

  // Sincroniza el estado inCart en tiempo real escuchando toda la colección de carrito
  useEffect(() => {
    if (!user || !producto) {
      if (!user && producto) {
        const checkLocalCart = () => {
          let localCart = [];
          try {
            const stored = localStorage.getItem('guestCart');
            if (stored) localCart = JSON.parse(stored);
          } catch(e) {}
          const optionValue = selectedOption || getDefaultProductOption(producto, moneda);
          const details = getSelectedDetails(optionValue);
          const lineId = getCartLineId(producto.id || id, details);
          const cartItem = localCart.find(c => (c.cartLineId || c.productId) === lineId);
          setInCart(Boolean(cartItem));
          setCartSelection(cartItem || null);
        };
        checkLocalCart();
        window.addEventListener('localCartUpdated', checkLocalCart);
        return () => window.removeEventListener('localCartUpdated', checkLocalCart);
      }
      setInCart(false);
      setCartSelection(null);
      return;
    }
    const cartColRef = collection(db, `users/${user.uid}/cart`);
    const unsub = onSnapshot(cartColRef, (snap) => {
      let found = null;
      const optionValue = selectedOption || getDefaultProductOption(producto, moneda);
      const details = getSelectedDetails(optionValue);
      const lineId = getCartLineId(producto.id || id, details);
      snap.forEach(docu => {
        if (docu.id === lineId) {
          found = { id: docu.id, ...docu.data() };
        }
      });
      setInCart(Boolean(found));
      setCartSelection(found);
    });
    return () => unsub();
  }, [user, producto, id, selectedOption, moneda, userProfile]);

  const handleFav = async () => {
    const baseId = producto.id || id;
    if (!user) {
      let localFavs = [];
      try {
        const stored = localStorage.getItem('guestFavs');
        if (stored) localFavs = JSON.parse(stored);
      } catch(e) {}
      
      if (fav) {
        localFavs = localFavs.filter(f => f.productId !== baseId);
      } else {
        localFavs.push({
          productId: baseId,
          name: producto.name,
          imageUrl: producto.imageUrl || null,
          priceCLP: producto.priceCLP || null,
          priceUSD: producto.priceUSD || null
        });
      }
      localStorage.setItem('guestFavs', JSON.stringify(localFavs));
      window.dispatchEvent(new Event('localFavUpdated'));
      return;
    }
    const favRef = doc(db, `users/${user.uid}/favorites`, baseId);
    if (fav) {
      await deleteDoc(favRef);
      setFav(false);
    } else {
      await setDoc(favRef, {
        productId: baseId,
        name: producto.name,
        imageUrl: producto.imageUrl || null,
        priceCLP: producto.priceCLP || null,
        priceUSD: producto.priceUSD || null
      });
      setFav(true);
    }
  };

  const handleCart = async () => {
    if (isSwitchOutOfStock) {
      alert("Este juego de Nintendo Switch se encuentra temporalmente sin stock en nuestros packs. Puedes solicitarlo directamente por WhatsApp.");
      return;
    }
    const baseId = producto.id || id;
    const optionValue = selectedOption || getDefaultProductOption(producto, moneda);
    if (productRequiresOption(producto, moneda) && !optionValue) {
      setShowSelectMsg(true);
      if (window._selectMsgTimeout) clearTimeout(window._selectMsgTimeout);
      window._selectMsgTimeout = setTimeout(() => setShowSelectMsg(false), 1500);
      return;
    }
    const detalles = getSelectedDetails(optionValue);
    const cartLineId = getCartLineId(baseId, detalles);
    const currentVariant = String(cartSelection?.variante || "").toLowerCase();
    const selectedVariant = String(detalles?.variante || "").toLowerCase();
    const selectionChanged = Boolean(
      inCart && (
        (selectedVariant && selectedVariant !== currentVariant) ||
        (detalles?.meses && Number(detalles.meses) !== Number(cartSelection?.meses))
      )
    );
    if (!user) {
      if (inCart && !selectionChanged) {
        let localCart = [];
        try {
          const stored = localStorage.getItem('guestCart');
          if (stored) localCart = JSON.parse(stored);
        } catch(e) {}
        localCart = localCart.filter(item => (item.cartLineId || item.productId) !== cartLineId);
        localStorage.setItem('guestCart', JSON.stringify(localCart));
        window.dispatchEvent(new Event('localCartUpdated'));
        setSelectedOption("");
      } else {
        let localCart = [];
        try {
          const stored = localStorage.getItem('guestCart');
          if (stored) localCart = JSON.parse(stored);
        } catch(e) {}
        const isPS = checkIsPlayStation(producto);
        const platformLabel = (producto.plataforma || producto.platform || productCategoryName || (isPS ? "PlayStation" : "")).trim();
        const cartItem = {
          cartLineId,
          productId: baseId,
          name: detalles.name || producto.name,
          imageUrl: producto.imageUrl || null,
          categoryName: productCategoryName || producto.categoria || null,
          consoleName: platformLabel,
          pricePrimariaCLP: producto.pricePrimariaCLP || null,
          priceSecundariaCLP: producto.priceSecundariaCLP || null,
          cantidad: 1,
          ...detalles
        };
        const existingIndex = localCart.findIndex(item => (item.cartLineId || item.productId) === cartLineId);
        if (existingIndex >= 0) localCart[existingIndex] = cartItem;
        else localCart.push(cartItem);
        localStorage.setItem('guestCart', JSON.stringify(localCart));
        window.dispatchEvent(new Event('localCartUpdated'));
      }
      return;
    }
    const cartRef = doc(db, `users/${user.uid}/cart`, cartLineId);
    if (inCart && !selectionChanged) {
      await deleteDoc(cartRef);
      setInCart(false);
      setSelectedOption("");
    } else {
      const isPS = checkIsPlayStation(producto);
      const platformLabel = (producto.plataforma || producto.platform || productCategoryName || (isPS ? "PlayStation" : "")).trim();
      await setDoc(cartRef, {
        cartLineId,
        productId: baseId,
        name: detalles.name || producto.name,
        imageUrl: producto.imageUrl || null,
        categoryName: productCategoryName || producto.categoria || null,
        consoleName: platformLabel,
        pricePrimariaCLP: producto.pricePrimariaCLP || null,
        priceSecundariaCLP: producto.priceSecundariaCLP || null,
        cantidad: 1,
        ...detalles
      });
      setInCart(true);
    }
  };

  const showArrows = relacionados && relacionados.length > 1;

  useEffect(() => {
    if (!producto || !id) return;
    const fetchRelacionados = async () => {
      let arr = [];
      if (producto.categoria) {
        const q = query(collection(db, "products"), where("categoria", "==", producto.categoria));
        const snap = await getDocs(q);
        arr = snap.docs
          .filter(docu => docu.id !== id)
          .map(docu => ({ id: docu.id, ...docu.data() }));
      }
      // Si no hay relacionados por categoría, mostrar todos menos el actual
      if (!arr || arr.length === 0) {
        const allSnap = await getDocs(collection(db, "products"));
        arr = allSnap.docs
          .filter(docu => docu.id !== id)
          .map(docu => ({ id: docu.id, ...docu.data() }));
      }
      // Si sigue vacío, intenta mostrar todos los productos (aunque sea el mismo)
      if (!arr || arr.length === 0) {
        const allSnap = await getDocs(collection(db, "products"));
        arr = allSnap.docs.map(docu => ({ id: docu.id, ...docu.data() }));
      }
      // Mezclar los productos relacionados aleatoriamente
      const shuffled = arr.sort(() => 0.5 - Math.random());
      setRelacionados(shuffled);
    };
    fetchRelacionados();
  }, [producto, id]);

  // Define getCarruselSlice dentro del componente antes del return
  function getCarruselSlice(start, count) {
    if (!relacionados || relacionados.length === 0) return [];
    const arr = [];
    for (let i = 0; i < count; i++) {
      const idx = (start + i) % relacionados.length;
      arr.push(relacionados[idx]);
    }
    return arr;
  }

  // Eliminamos el useEffect manual de SEO porque usaremos Helmet abajo

  // Asegura que no se renderice nada del producto si producto es null
  if (loading) return <Loader text="Cargando..." subtext="PandaStore • Detalles del Producto" fullScreen={true} />;
  if (networkError) return <div style={{color:'#b71c1c',fontWeight:700,padding:24}}>No se pudo conectar con el servidor. Verifica tu conexión a internet.</div>;
  if (!producto) return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '50px 20px',
      textAlign: 'center',
      color: '#fff'
    }}>
      <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🎮</div>
      <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#e0baff', marginBottom: 12 }}>
        Producto no disponible o enlace desactualizado
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 480, fontSize: '0.98rem', marginBottom: 24, lineHeight: 1.6 }}>
        El título que buscas pudo haber sido actualizado en el catálogo oficial o requiere una nueva búsqueda.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/home" style={{
          background: 'linear-gradient(135deg, #a259ff, #6100ff)',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: 12,
          fontWeight: 700,
          textDecoration: 'none',
          boxShadow: '0 4px 15px rgba(162,89,255,0.4)'
        }}>
          🏠 Volver al Inicio
        </Link>
        <Link to="/categoria/steam" style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(162,89,255,0.3)',
          color: '#e0baff',
          padding: '12px 24px',
          borderRadius: 12,
          fontWeight: 700,
          textDecoration: 'none'
        }}>
          🕹️ Ver Catálogo Steam
        </Link>
      </div>
    </div>
  );

  // Helper para generar el JSON-LD de Helmet
  const getJsonLd = () => {
    const desc = producto.description ? producto.description.slice(0, 160) : `Compra ${producto.name} en PandaStore. Entrega digital inmediata.`;
    const price = producto.priceUSD || producto.pricePrimariaUSD || producto.priceCLP || null;
    const currency = producto.priceUSD || producto.pricePrimariaUSD ? 'USD' : 'CLP';
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": producto.name,
      "description": desc,
      "image": producto.imageUrl || "",
      "url": window.location.href,
      "brand": { "@type": "Brand", "name": producto.category || "PandaStore" },
      "sku": producto.id || id,
      ...(price ? {
        "offers": {
          "@type": "Offer",
          "price": price,
          "priceCurrency": currency,
          "availability": "https://schema.org/InStock",
          "itemCondition": "https://schema.org/NewCondition",
          "priceValidUntil": "2027-12-31",
          "seller": { "@type": "Organization", "name": "PandaStore" }
        }
      } : {}),
      ...(avgRating && reviews.length > 0 ? {
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": avgRating,
          "reviewCount": reviews.length,
          "bestRating": 5,
          "worstRating": 1
        }
      } : {}),
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pandastoreupdate.web.app/home" },
          { "@type": "ListItem", "position": 2, "name": producto.category || "Videojuegos", "item": "https://pandastoreupdate.web.app/categorias" },
          { "@type": "ListItem", "position": 3, "name": producto.name, "item": window.location.href }
        ]
      }
    };
  };

  const cleanProductName = cleanTitle(producto.name);
  const displayImage = producto.imageUrl || 
    producto.image || 
    producto.header_image || 
    (producto.app_id ? `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${producto.app_id}/header.jpg` : null) ||
    (producto.appId ? `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${producto.appId}/header.jpg` : null);

  const rawPlat = (producto.plataforma || producto.platform || producto.categoria || "").toLowerCase();
  const rawCatId = String(producto.categoryId || "").toLowerCase();
  const isSwitchProd =
    rawPlat.includes("switch") ||
    rawPlat.includes("nintendo") ||
    rawCatId === "vtqapwp0xxdc1qdz6hvq" ||
    rawCatId === "y7j7vsxmugwxfnmkouwx" ||
    rawCatId === "switch" ||
    String(producto.categoria || "").toLowerCase().includes("switch") ||
    String(productCategoryName || "").toLowerCase().includes("switch");
  const isPlayStation = !isSwitchProd && (rawPlat.includes("ps4") || rawPlat.includes("ps5") || rawPlat.includes("playstation") || rawCatId.includes("ps"));
  const switchPacksStock = isSwitchProd ? getGameStockCount(producto.name, switchStockMap, true) : null;
  const isSwitchOutOfStock = isSwitchProd && (switchPacksStock === null || switchPacksStock <= 0);
  const isPcOrSteam = !isPlayStation && !isSwitchProd;

  const platformLabel = isSwitchProd ? "Nintendo Switch" : isPlayStation ? "PS5 / PS4" : "Steam PC";
  const pageTitle = `${cleanProductName} (${platformLabel}) Barato | Comprar Juego Digital - PandaStore`;
  const pageDesc = producto.description ? producto.description.slice(0, 155) : `Compra ${cleanProductName} para ${platformLabel} barato en PandaStore. Entrega digital inmediata 24/7, soporte en español y garantía total.`;

  return (
    <div className="producto-container">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta name="keywords" content={`comprar ${cleanProductName}, ${cleanProductName} barato, ${cleanProductName} ${platformLabel.toLowerCase()}, ${cleanProductName} precio, ${cleanProductName} digital, juegos baratos pc steam, cuentas primarias, pandastore`} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:url" content={window.location.href} />
        {displayImage && <meta property="og:image" content={displayImage} />}
        <meta property="og:type" content="product" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
        {displayImage && <meta name="twitter:image" content={displayImage} />}
        <link rel="canonical" href={window.location.href} />
        <script type="application/ld+json">{JSON.stringify(getJsonLd())}</script>
      </Helmet>
      
      {/* BOTÓN VOLVER SUTIL ARRIBA */}
      <div className="producto-back-row">
        <button
          className="producto-back-button"
          onClick={() => window.history.back()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 20, border: 'none',
            background: 'rgba(255, 255, 255, 0.05)', color: '#c4b5fd',
            fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s, transform 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateX(-3px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#c4b5fd'; e.currentTarget.style.transform = 'translateX(0)'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
          Volver atrás
        </button>
      </div>

      {/* COLUMNA IZQUIERDA: IMAGEN */}
      <div className="producto-imagen">
        {displayImage ? (
          <img
            src={displayImage}
            alt={cleanProductName}
            onError={(e) => {
              const appId = producto?.app_id || producto?.appId;
              if (appId && !e.currentTarget.dataset.triedCloudflare) {
                e.currentTarget.dataset.triedCloudflare = "true";
                e.currentTarget.src = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
              } else if (appId && !e.currentTarget.dataset.triedAkamai) {
                e.currentTarget.dataset.triedAkamai = "true";
                e.currentTarget.src = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
              } else if (!e.currentTarget.dataset.triedBanner) {
                e.currentTarget.dataset.triedBanner = "true";
                e.currentTarget.src = '/banner22.jpg';
              }
            }}
          />
        ) : (
          <div className="producto-imagen-placeholder" style={{
            width: '100%',
            height: '100%',
            minHeight: 280,
            background: 'linear-gradient(145deg, #180d38 0%, #0c061e 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(162, 89, 255, 0.3)',
            borderRadius: 16,
            padding: 20,
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '3rem', marginBottom: 8 }}>🎮</span>
            <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.1rem' }}>{cleanProductName}</span>
            <span style={{ color: '#00f5d4', fontWeight: 700, fontSize: '0.85rem', marginTop: 4 }}>PandaStore Steam</span>
          </div>
        )}
      </div>
      
      {/* COLUMNA DERECHA: DETALLES */}
      <div className="producto-detalles">
        <div className="producto-title-row">
          <div className="producto-title-copy">
            <span className="producto-category-chip">{productCategoryName || producto.plataforma || producto.categoria || 'Producto digital'}</span>
            <h1>{cleanProductName}</h1>
          </div>
          <button
            className={`favorito${fav ? " active" : ""}`}
            onClick={handleFav}
            title={fav ? "Quitar de favoritos" : "Agregar a favoritos"}
            style={{ marginTop: 0 }}
          >
            ★
          </button>
        </div>
        
        {avgRating && (
          <div className="producto-rating-row">
            <StarRating rating={Math.round(avgRating)} />
            <span style={{marginLeft: 8, color: "#a08ab8", fontWeight: 600, fontSize: '0.9rem'}}>{avgRating} / 5</span>
          </div>
        )}
        {/* Selector interactivo de variante PlayStation */}
        {isPlayStation && (producto.pricePrimariaCLP || producto.priceSecundariaCLP) && (
          <div style={{ display: 'flex', gap: 10, margin: '10px 0 14px', flexWrap: 'wrap' }}>
            {producto.pricePrimariaCLP && (() => {
              const rawPri = parseNumberCLP(producto.pricePrimariaCLP);
              let priDisplay = rawPri;
              if (hasResellerBenefits(userProfile) && rawPri > 0) {
                const pr = getProductPricing({ ...producto, variante: 'primaria', selectedPriceCLP: rawPri, priceCLP: rawPri, categoryName: 'playstation' }, 'revendedor', userProfile?.purchaseCount || 0);
                priDisplay = pr.precioFinal;
              }
              const isPriSelected = !selectedOption || selectedOption.startsWith('ps-primary') || selectedOption === String(producto.pricePrimariaCLP) || selectedOption === String(producto.pricePrimariaUSD);
              return (
                <button
                  type="button"
                  onClick={() => setSelectedOption(`ps-primary:${producto.pricePrimariaCLP}`)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: isPriSelected ? '2px solid #00f5d4' : '1px solid rgba(162,89,255,0.4)',
                    background: isPriSelected ? 'rgba(0,245,212,0.18)' : 'rgba(30,0,60,0.6)',
                    color: isPriSelected ? '#00f5d4' : '#fff',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s ease',
                    boxShadow: isPriSelected ? '0 0 12px rgba(0,245,212,0.3)' : 'none'
                  }}
                >
                  <span>🎮 Cuenta Primaria</span>
                  <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                    {formatearPrecio(priDisplay)}
                  </span>
                </button>
              );
            })()}
            {producto.priceSecundariaCLP && (() => {
              const rawSec = parseNumberCLP(producto.priceSecundariaCLP);
              let secDisplay = rawSec;
              if (hasResellerBenefits(userProfile) && rawSec > 0) {
                const pr = getProductPricing({ ...producto, variante: 'secundaria', selectedPriceCLP: rawSec, priceCLP: rawSec, categoryName: 'playstation' }, 'revendedor', userProfile?.purchaseCount || 0);
                secDisplay = pr.precioFinal;
              }
              const isSecSelected = Boolean(selectedOption && (selectedOption.startsWith('ps-secondary') || selectedOption === String(producto.priceSecundariaCLP) || selectedOption === String(producto.priceSecundariaUSD)));
              return (
                <button
                  type="button"
                  onClick={() => setSelectedOption(`ps-secondary:${producto.priceSecundariaCLP}`)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: isSecSelected ? '2px solid #a259ff' : '1px solid rgba(162,89,255,0.4)',
                    background: isSecSelected ? 'rgba(162,89,255,0.25)' : 'rgba(30,0,60,0.6)',
                    color: isSecSelected ? '#c4b5fd' : '#fff',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s ease',
                    boxShadow: isSecSelected ? '0 0 12px rgba(162,89,255,0.3)' : 'none'
                  }}
                >
                  <span>🎮 Cuenta Secundaria</span>
                  <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                    {formatearPrecio(secDisplay)}
                  </span>
                </button>
              );
            })()}
          </div>
        )}
        <div className="precio">
          <PriceSelector
            producto={producto}
            selectedOption={selectedOption}
            onChange={handleOptionChange}
            userProfile={userProfile}
            selectStyle={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #7b2ff2',
              background: '#1a093a',
              color: '#fff',
              fontWeight: 600,
              fontSize: 16,
              outline: 'none',
              boxShadow: '0 2px 8px #7b2ff222',
              marginBottom: 8,
              cursor: 'pointer',
              transition: 'border 0.2s, box-shadow 0.2s'
            }}
          />
        </div>

        {/* Mensaje profesional si no selecciona opción */}
        {showSelectMsg && (
          <div className="product-option-toast" role="alert">
            <div className="product-option-toast-icon">!</div>
            <div>
              <strong>Elige una opción para continuar</strong>
              <span>Selecciona la duración o modalidad antes de agregar al carrito.</span>
            </div>
          </div>
        )}
        <DescripcionExpandible descripcion={producto.description} />
        
        {/* Los DLC se venden exclusivamente para productos Steam (nunca Switch ni PlayStation). */}
        {!isSwitchProd && !isPlayStation && isSteamProduct(producto) && (
          <ProductDlcs
            product={producto}
            moneda={moneda}
            formatearPrecio={formatearPrecio}
            inCart={inCart}
            onAddBaseGameToCart={handleCart}
          />
        )}
        
        {isSwitchOutOfStock ? (
          <div style={{ marginTop: 20, width: '100%' }}>
            <a
              href={buildStockRequestWhatsappUrl(producto.name)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                background: 'linear-gradient(90deg, #25D366, #128C7E)',
                color: '#fff',
                padding: '16px 24px',
                borderRadius: 20,
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: '1.05rem',
                boxShadow: '0 6px 25px rgba(37, 211, 102, 0.45)',
                textAlign: 'center',
                boxSizing: 'border-box'
              }}
            >
              <span style={{ fontSize: 24 }}>📲</span>
              <span>Solicitar Stock por WhatsApp (Agotado en Web)</span>
            </a>
            <div style={{ textAlign: 'center', color: '#c4b5fd', fontSize: '0.85rem', marginTop: 10, fontWeight: 500 }}>
              Te avisaremos apenas un pack o cuenta con este juego esté disponible para entrega inmediata.
            </div>
          </div>
        ) : (
          <div className="botones-acciones producto-action-buttons">
            <button type="button" className={`producto-cart-button${inCart ? ' is-active' : ''}`} onClick={handleCart}>
              <span className="material-icons">{inCart ? "remove_shopping_cart" : "add_shopping_cart"}</span>
              <span>{inCart ? "Quitar del carrito" : "Agregar al carrito"}</span>
            </button>
            <button
              type="button"
              className="producto-buy-button"
              onClick={handleComprarAhora}
              disabled={typeof producto.stock === 'number' && producto.stock <= 0}
            >
              <span>Comprar ahora</span>
              <span className="material-icons">arrow_forward</span>
            </button>
          </div>
        )}

        {/* Compartir */}
        <div className="producto-share-area">
          <div style={{ color: '#a08ab8', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Compartir producto</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', position: 'relative', flexWrap: 'wrap' }}>
            <button className="producto-share-button"
              onClick={handleCopyLink}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 12, border: '1.5px solid rgba(162,89,255,0.45)',
                background: 'rgba(123,47,242,0.12)',
                color: '#c4b5fd', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                transition: 'background 0.2s, border-color 0.2s, transform 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,47,242,0.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(123,47,242,0.12)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              title="Copiar link para compartir"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              {copyMsg ? <span style={{ color: '#a3e635' }}>✓ ¡Copiado!</span> : 'Copiar link'}
            </button>
            <a
              className="producto-whatsapp-share"
              href={`https://wa.me/?text=${encodeURIComponent(`Mira ${cleanProductName} en PandaStore: ${window.location.href}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="material-icons">share</span>
              Enviar por WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* SECCIÓN RELACIONADOS: MASONRY LIMPIO */}
      <div className="section producto-related-section">
        <div className="producto-section-heading">
          <span>Para seguir explorando</span>
          <h3>También te puede interesar</h3>
        </div>
        {(relacionados && relacionados.length > 0 && relacionados.some(prod => prod && prod.imageUrl)) ? (
          <div style={{ width: '100%', position: 'relative' }}>
            <Masonry
              items={relacionados
                .filter(prod => prod && prod.imageUrl)
                .slice(0, 6)
                .map((prod, index) => {
                  const prices = [];
                  if (prod.priceCLP) prices.push(Number(prod.priceCLP));
                  if (prod.pricePrimariaCLP) prices.push(Number(prod.pricePrimariaCLP));
                  if (prod.priceSecundariaCLP) prices.push(Number(prod.priceSecundariaCLP));
                  if (prod.priceUSD) prices.push(Number(prod.priceUSD) * 1000);
                  if (prod.pricePrimariaUSD) prices.push(Number(prod.pricePrimariaUSD) * 1000);
                  if (Array.isArray(prod.preciosPorMes)) {
                    prod.preciosPorMes.forEach(p => { if (p.clp) prices.push(Number(p.clp)); });
                  }
                  const nums = prices.filter(x => Number.isFinite(x) && x > 0);
                  const minPrice = nums.length ? Math.min(...nums) : null;
                  const priceFormatted = minPrice ? formatearPrecio(minPrice) : 'Ver detalles';
                  return {
                    id: prod.id || `rel-${index}`,
                    name: prod.name,
                    img: prod.imageUrl,
                    price: priceFormatted
                  };
                })}
              ease="power3.out"
              duration={0.6}
              stagger={0.06}
              animateFrom="bottom"
              scaleOnHover={true}
              hoverScale={0.97}
              blurToFocus={true}
            />
          </div>
        ) : (
          <div style={{color: '#888'}}>No hay productos relacionados.</div>
        )}
      </div>
    </div>
  );
}

function isSteamProduct(producto) {
  const rawPlat = (producto?.plataforma || producto?.platform || "").toLowerCase();
  const category = (producto?.categoria || producto?.categoryName || producto?.consoleName || "").toLowerCase();
  const isPlayStation = rawPlat.includes("ps4") || rawPlat.includes("ps5") || rawPlat.includes("playstation") ||
    rawPlat.includes("play 4") || rawPlat.includes("play 5") ||
    category.includes("ps4") || category.includes("ps5") || category.includes("playstation") ||
    category.includes("play 4") || category.includes("play 5") ||
    Boolean(
      producto?.pricePrimariaCLP || producto?.priceSecundariaCLP ||
      producto?.pricePrimariaUSD || producto?.priceSecundariaUSD ||
      producto?.pricePrimaria || producto?.priceSecundaria ||
      producto?.primaryPrice || producto?.secondaryPrice
    );
  if (isPlayStation) return false;

  const isSwitch = rawPlat.includes("switch") || rawPlat.includes("nintendo") ||
    category.includes("switch") || category.includes("nintendo");
  if (isSwitch) return false;

  return rawPlat.includes("steam") || category.includes("steam") ||
    Boolean(producto?.isSteam) || String(producto?.id || "").startsWith("ryuu_") ||
    String(producto?.id || "").startsWith("vip-");
}

function getMonthlyPlans(producto, moneda) {
  if (!Array.isArray(producto?.preciosPorMes)) return [];
  return producto.preciosPorMes.filter((plan) => Number(moneda === "USD" ? plan?.usd : plan?.clp) > 0);
}

// Sólo se exige una elección cuando el producto realmente tiene más de una alternativa.
function getDefaultProductOption(producto) {
  if (!producto) return "";
  const plans = getMonthlyPlans(producto, "CLP");
  if (plans.length === 1) return String(plans[0].clp);
  if (plans.length > 1) return "";
  if (isSteamProduct(producto)) {
    const price = producto.priceCLP || producto.pricePrimariaCLP || 2000;
    return String(price);
  }
  const isPS = checkIsPlayStation(producto);
  if (isPS) {
    if (producto.pricePrimariaCLP) return `ps-primary:${producto.pricePrimariaCLP}`;
    if (producto.priceSecundariaCLP) return `ps-secondary:${producto.priceSecundariaCLP}`;
  }
  const variants = [{ key: "primary", price: producto.pricePrimariaCLP }, { key: "secondary", price: producto.priceSecundariaCLP }];
  const availableVariants = variants.filter((variant) => Number(variant.price) > 0);
  if (availableVariants.length === 1) return `ps-${availableVariants[0].key}:${availableVariants[0].price}`;
  if (availableVariants.length > 1) return `ps-primary:${producto.pricePrimariaCLP || availableVariants[0].price}`;
  const standard = producto.priceCLP;
  return Number(standard) > 0 ? String(standard) : "";
}

function productRequiresOption(producto, moneda) {
  if (!producto) return false;
  const plans = getMonthlyPlans(producto, moneda);
  if (plans.length) return plans.length > 1;
  if (isSteamProduct(producto)) return false;
  const variants = moneda === "USD" ? [producto.pricePrimariaUSD, producto.priceSecundariaUSD] : [producto.pricePrimariaCLP, producto.priceSecundariaCLP];
  return variants.filter((price) => Number(price) > 0).length > 1;
}

// Cada modalidad de PlayStation es una línea independiente del carrito. Esto
// evita que Secundaria reemplace o reutilice el importe de Primaria.
function getCartLineId(productId, details = {}) {
  const variant = String(details?.variante || "").toLowerCase();
  if (variant === "primaria" || variant === "secundaria") return `${productId}__${variant}`;
  const months = Number(details?.meses || 0);
  if (months > 0) return `${productId}__${months}m`;
  return productId;
}
