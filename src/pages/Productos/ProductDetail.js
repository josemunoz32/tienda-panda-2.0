// ...existing code...
// ...existing code...
    // ...existing code...
// ...existing code...
  // ...existing code...
import React, { useState, useEffect } from "react";

import "./ProductDetail.css";
import { useMoneda } from "../../context/MonedaContext";
import { useParams, Link, useNavigate } from "react-router-dom";
import { prodUrl, extractId } from '../../utils/slugify';
import { db, auth } from "../../firebase";
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

// Componente para mostrar la descripción con ver más/ver menos
function DescripcionExpandible({ descripcion }) {
  const [expand, setExpand] = useState(false);
  const maxLen = 180;
  if (!descripcion) return null;
  const isLong = descripcion.length > maxLen;
  return (
  <div style={{marginBottom: 10, background:'rgba(36,0,70,0.55)', borderRadius:12, padding:'10px 14px', maxWidth: '100%', overflow:'hidden', position:'relative', minHeight:48, border:'1px solid rgba(162,89,255,0.2)'}}>
      <b style={{color:'#c4b5fd'}}>Descripción:</b>{' '}
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
          style={{
            background:'none',
            color:'#7b2ff2',
            border:'none',
            fontWeight:700,
            cursor:'pointer',
            marginLeft:8,
            fontSize:'1rem',
            textDecoration:'underline',
            padding:0
          }}
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
function PriceSelector({ producto, selectedOption, onChange, selectStyle }) {
  const { moneda } = useMoneda();
  const options = [];
  if (!producto) return null;
  const rawPlataforma = (producto.plataforma || producto.platform || "").toLowerCase();
  const plataformas = rawPlataforma.split(/[,/\\ ]+/).map(p => p.trim()).filter(Boolean);
  let plataformaLabel = "";
  const onlyPS4 = plataformas.length === 1 && plataformas[0] === "ps4";
  const onlyPS5 = plataformas.length === 1 && plataformas[0] === "ps5";
  const onlyPS4PS5 = plataformas.length === 2 && plataformas.includes("ps4") && plataformas.includes("ps5");
  if (onlyPS4) {
    plataformaLabel = "PS4";
  } else if (onlyPS5) {
    plataformaLabel = "PS5";
  } else if (onlyPS4PS5) {
    plataformaLabel = "PS4/PS5";
  } else if (plataformas.includes("ps4") && !plataformas.includes("ps5")) {
    plataformaLabel = "PS4";
  } else if (plataformas.includes("ps5") && !plataformas.includes("ps4")) {
    plataformaLabel = "PS5";
  } else {
    plataformaLabel = "";
  }
  if (moneda === "CLP") {
    if (producto.priceCLP)
      options.push({ label: `Switch CLP: ${producto.priceCLP}`, value: String(producto.priceCLP) });
    if (producto.pricePrimariaCLP)
      options.push({ label: `${plataformaLabel} Primaria CLP: ${producto.pricePrimariaCLP}`, value: String(producto.pricePrimariaCLP) });
    if (producto.priceSecundariaCLP)
      options.push({ label: `${plataformaLabel} Secundaria CLP: ${producto.priceSecundariaCLP}`, value: String(producto.priceSecundariaCLP) });
    if (Array.isArray(producto.preciosPorMes)) {
      producto.preciosPorMes.forEach((p) => {
        if (p.clp)
          options.push({ label: `Suscripción ${p.meses} mes(es) CLP: ${p.clp}`, value: String(p.clp) });
      });
    }
  } else if (moneda === "USD") {
    if (producto.priceUSD)
      options.push({ label: `Switch USD: ${producto.priceUSD}`, value: String(producto.priceUSD) });
    if (producto.pricePrimariaUSD)
      options.push({ label: `${plataformaLabel} Primaria USD: ${producto.pricePrimariaUSD}`, value: String(producto.pricePrimariaUSD) });
    if (producto.priceSecundariaUSD)
      options.push({ label: `${plataformaLabel} Secundaria USD: ${producto.priceSecundariaUSD}`, value: String(producto.priceSecundariaUSD) });
    if (Array.isArray(producto.preciosPorMes)) {
      producto.preciosPorMes.forEach((p) => {
        if (p.usd)
          options.push({ label: `Suscripción ${p.meses} mes(es) USD: ${p.usd}`, value: String(p.usd) });
      });
    }
  }
  if (options.length === 0) return <span style={{ color: "#888" }}>Sin precio en {moneda}</span>;
  return (
    <select
      style={{ marginLeft: 8, ...(selectStyle || {}) }}
      value={selectedOption}
      onChange={onChange}
    >
      <option value="">Selecciona una opción</option>
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
  // Estado para la variante/meses seleccionados
  const [selectedOption, setSelectedOption] = useState("");
  const [fav, setFav] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [showSelectMsg, setShowSelectMsg] = useState(false);
  const [copyMsg, setCopyMsg] = useState(false); // Para mensaje de copiado

  // Limpia la selección si el producto ya no está en el carrito
  useEffect(() => {
    if (!inCart) {
      setSelectedOption("");
    }
  }, [inCart]);

  // Oculta el mensaje cuando el usuario selecciona una opción
  useEffect(() => {
    if (selectedOption && showSelectMsg) setShowSelectMsg(false);
  }, [selectedOption, showSelectMsg]);

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
  function getSelectedDetails() {
    if (!selectedOption) return {};
    if (producto && producto.preciosPorMes && Array.isArray(producto.preciosPorMes)) {
      const meses = producto.preciosPorMes.find(p => String(p.clp) === selectedOption || String(p.usd) === selectedOption);
      if (meses) return { meses: meses.meses, priceCLP: meses.clp, priceUSD: meses.usd };
    }
    if (producto) {
      if (selectedOption === String(producto.priceCLP)) return { priceCLP: producto.priceCLP };
      if (selectedOption === String(producto.priceUSD)) return { priceUSD: producto.priceUSD };
      if (selectedOption === String(producto.pricePrimariaCLP)) return { variante: "Primaria", priceCLP: producto.pricePrimariaCLP };
      if (selectedOption === String(producto.pricePrimariaUSD)) return { variante: "Primaria", priceUSD: producto.pricePrimariaUSD };
      if (selectedOption === String(producto.priceSecundariaCLP)) return { variante: "Secundaria", priceCLP: producto.priceSecundariaCLP };
      if (selectedOption === String(producto.priceSecundariaUSD)) return { variante: "Secundaria", priceUSD: producto.priceSecundariaUSD };
    }
    return {};
  }

  // Handler para Comprar ahora
  const navigate = useNavigate();
  function handleComprarAhora() {
  if (!producto || !selectedOption) return;
  const detalles = getSelectedDetails();
  // Asegura que el id nunca se pierda
  navigate("/comprar-ahora", { state: { producto: { ...producto, ...detalles, id: producto.id } } });
  }
  // Estado de carga para preguntas
  const [questionLoading, setQuestionLoading] = useState(true);
  // Estado para preguntas y respuestas
  const [questions, setQuestions] = useState([]);
  const [questionText, setQuestionText] = useState("");
  // Obtener URL del producto para compartir
  const productUrl = typeof window !== 'undefined' ? window.location.href : '';
  // Estado de usuario
  const [user, setUser] = useState(null);
  // Obtener id de la URL
  const { id: rawId } = useParams();
  const id = extractId(rawId);
  // Estado del producto
  const [producto, setProducto] = useState(null);
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
  const { moneda } = useMoneda();
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

  // Detectar si el usuario es admin
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    getDoc(doc(db, "users", user.uid)).then(docu => {
      setIsAdmin(docu.exists() && docu.data().role === "admin");
    });
  }, [user]);

  // Fetches product data from Firestore
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      setNetworkError(false);
      try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProducto({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        if (err && err.code === "unavailable") setNetworkError(true);
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

  // Fetch reviews in real time
  useEffect(() => {
    if (!id) return;
    setReviewLoading(true);
    const reviewsRef = collection(db, "products", id, "reviews");
    const q = query(reviewsRef, orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      let myReview = null;
      snap.forEach(doc => {
        const data = doc.data();
        arr.push({ id: doc.id, ...data });
        if (user && data.userId === user.uid) myReview = { id: doc.id, ...data };
      });
      setReviews(arr);
      setUserReview(myReview);
      setReviewLoading(false);
    });
    return () => unsub();
  }, [id, user]);
  // Calcular promedio de calificación
  const avgRating = reviews.length > 0 ? (reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length).toFixed(1) : null;
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
          date: new Date().toISOString()
        });
      } else {
        await addDoc(reviewsRef, {
          userId: user.uid,
          userName: user.displayName || user.email || "Usuario",
          rating,
          comment,
          date: new Date().toISOString()
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
      }
    };
    fetchFav();
  }, [user, producto, id]);

  // Sincroniza el estado inCart en tiempo real escuchando toda la colección de carrito
  useEffect(() => {
    if (!user || !producto) {
      setInCart(false);
      return;
    }
    const cartColRef = collection(db, `users/${user.uid}/cart`);
    const unsub = onSnapshot(cartColRef, (snap) => {
      let found = false;
      snap.forEach(docu => {
        if ((docu.id === (producto.id || id))) {
          found = true;
        }
      });
      setInCart(found);
    });
    return () => unsub();
  }, [user, producto, id]);

  const handleFav = async () => {
    if (!user) {
      alert("Debes iniciar sesión para agregar a favoritos.");
      return;
    }
  const favRef = doc(db, `users/${user.uid}/favorites`, producto.id || id);
    if (fav) {
      await deleteDoc(favRef);
      setFav(false);
    } else {
      await setDoc(favRef, {
        productId: producto.id || id,
        name: producto.name,
        imageUrl: producto.imageUrl || null,
        priceCLP: producto.priceCLP || null,
        priceUSD: producto.priceUSD || null
      });
      setFav(true);
    }
  };

  const handleCart = async () => {
    if (!user) {
      alert("Debes iniciar sesión para agregar al carrito.");
      return;
    }
    const baseId = producto.id || id;
    const cartRef = doc(db, `users/${user.uid}/cart`, baseId);
    if (inCart) {
      await deleteDoc(cartRef);
      setInCart(false);
      setSelectedOption("");
    } else {
      if (!selectedOption) {
        setShowSelectMsg(true);
        // Limpia el timeout anterior si existe
        if (window._selectMsgTimeout) clearTimeout(window._selectMsgTimeout);
        window._selectMsgTimeout = setTimeout(() => setShowSelectMsg(false), 1500);
        return;
      }
      const detalles = getSelectedDetails();
      await setDoc(cartRef, {
        productId: baseId,
        name: producto.name,
        imageUrl: producto.imageUrl || null,
        quantity: 1,
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
      setRelacionados(arr);
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

  // SEO: Dynamic meta tags & Product schema
  useEffect(() => {
    if (!producto) return;
    const title = `${producto.name} | PandaStore - Videojuegos Digitales`;
    document.title = title;

    const setMeta = (attr, key, content) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    const desc = producto.description
      ? producto.description.slice(0, 160)
      : `Compra ${producto.name} en PandaStore. Entrega digital inmediata.`;
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', window.location.href);
    if (producto.imageUrl) setMeta('property', 'og:image', producto.imageUrl);
    setMeta('property', 'og:type', 'product');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', desc);
    if (producto.imageUrl) setMeta('name', 'twitter:image', producto.imageUrl);

    // Product JSON-LD
    const price = producto.priceUSD || producto.pricePrimariaUSD || producto.priceCLP || null;
    const currency = producto.priceUSD || producto.pricePrimariaUSD ? 'USD' : 'CLP';
    const schema = {
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
          { "@type": "ListItem", "position": 2, "name": "Productos", "item": "https://pandastoreupdate.web.app/productos" },
          { "@type": "ListItem", "position": 3, "name": producto.name, "item": window.location.href }
        ]
      }
    };
    let scriptEl = document.querySelector('script#product-jsonld');
    if (!scriptEl) { scriptEl = document.createElement('script'); scriptEl.id = 'product-jsonld'; scriptEl.type = 'application/ld+json'; document.head.appendChild(scriptEl); }
    scriptEl.textContent = JSON.stringify(schema);

    return () => {
      document.title = 'PandaStore | Tienda de Videojuegos Digitales';
      const s = document.querySelector('script#product-jsonld');
      if (s) s.remove();
    };
  }, [producto, id]);

  // Asegura que no se renderice nada del producto si producto es null
  if (loading) return <div>Cargando...</div>;
  if (networkError) return <div style={{color:'#b71c1c',fontWeight:700,padding:24}}>No se pudo conectar con el servidor. Verifica tu conexión a internet.</div>;
  if (!producto) return <div>Producto no encontrado.</div>;

  return (
    <div className="producto-container">
      {/* ORDEN: TITULO - IMAGEN - DETALLES */}
      <div className="producto-header">
        <h1>{producto.name}</h1>
        <button
          className={`favorito${fav ? " active" : ""}`}
          onClick={handleFav}
          title={fav ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          ★
        </button>
        {avgRating && (
          <div style={{margin: "8px 0"}}>
            <StarRating rating={Math.round(avgRating)} />
            <span style={{marginLeft: 6, color: "#888"}}>{avgRating} / 5</span>
          </div>
        )}
      </div>
      <div className="producto-imagen">
        {producto.imageUrl && (
          <img
            src={producto.imageUrl}
            alt={producto.name}
            style={{maxWidth: "100%", marginBottom: 12, display: "block", marginLeft: "auto", marginRight: "auto"}}
          />
        )}
      </div>
      <div className="producto-detalles">
        <h2>Detalles</h2>
        <div className="precio">
          <PriceSelector
            producto={producto}
            selectedOption={selectedOption}
            onChange={handleOptionChange}
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
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.25)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              background: 'linear-gradient(90deg,#7b2ff2 0%,#f357a8 100%)',
              color: '#fff',
              padding: '18px 28px',
              borderRadius: 14,
              fontWeight: 700,
              fontSize: '1.08rem',
              maxWidth: '90vw',
              width: 'fit-content',
              textAlign: 'center',
              whiteSpace: 'pre-line',
              wordBreak: 'break-word',
              boxShadow: '0 4px 32px #0008',
            }}>
              Por favor, selecciona una opción antes de agregar el producto al carrito.
            </div>
          </div>
        )}
        {typeof producto.stock === 'number' && !isNaN(producto.stock) && (
          <div className="stock">
            <b>Stock:</b>{" "}
            {producto.stock > 5 && (
              <span style={{color: 'green', fontWeight: 600}}>✔️ En stock ({producto.stock})</span>
            )}
            {producto.stock > 0 && producto.stock <= 5 && (
              <span style={{color: '#e6a700', fontWeight: 600}}>⚠️ Pocas unidades ({producto.stock})</span>
            )}
            {producto.stock === 0 && (
              <span style={{color: 'red', fontWeight: 600}}>❌ Sin stock</span>
            )}
          </div>
        )}
        <DescripcionExpandible descripcion={producto.description} />
        <div className="botones-acciones">
          <button
            className="btn-carrito"
            onClick={handleCart}
            // El botón siempre habilitado, pero muestra mensaje si no hay opción
            style={
              inCart
                ? {
                    background: '#ffdddd',
                    color: '#b71c1c',
                    fontWeight: 700,
                    border: '1px solid #b71c1c',
                    transition: 'background 0.2s, color 0.2s',
                  }
                : {
                    background: undefined,
                    color: undefined
                  }
            }
          >
            {inCart ? "Quitar del carrito" : "Agregar al carrito"}
          </button>
          <button
            className="btn-comprar"
            onClick={handleComprarAhora}
            disabled={producto.stock <= 0 || !selectedOption}
          >
            Comprar ahora
          </button>
        </div>
        {/* Compartir */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(162,89,255,0.2)' }}>
          <div style={{ color: '#a08ab8', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Compartir producto</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', position: 'relative', flexWrap: 'wrap' }}>
            <a
              href="#"
              onClick={e => { e.preventDefault(); window.open(`https://wa.me/?text=${encodeURIComponent(producto.name + ' ' + window.location.href)}`, '_blank', 'noopener'); }}
              title="Compartir en WhatsApp"
              style={{
                textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 12,
                background: 'rgba(37,211,102,0.12)',
                border: '1.5px solid rgba(37,211,102,0.4)',
                color: '#25d366', fontWeight: 700, fontSize: '0.95rem',
                transition: 'background 0.2s, border-color 0.2s, transform 0.15s',
                cursor: 'pointer'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.22)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.12)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.528 5.847L.057 23.786a.5.5 0 0 0 .614.641l6.094-1.596A11.946 11.946 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.373l-.358-.214-3.718.974.996-3.63-.234-.374A9.818 9.818 0 1 1 12 21.818z"/></svg>
              WhatsApp
            </a>
            <button
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
          </div>
        </div>
      </div>

      {/* SECCIÓN RESEÑAS */}
      <div className="section" style={{gridColumn: "span 2"}}>
        <h3>Reseñas de usuarios</h3>
        {reviewLoading ? <div>Cargando reseñas...</div> : (
          <>
            {reviews.length === 0 && <div>No hay reseñas aún.</div>}
            {reviews.filter(r => r.visible !== false).map(r => (
              <div key={r.id} style={{
                marginBottom: 12,
                padding: '14px 18px',
                background: 'rgba(36,0,70,0.55)',
                borderRadius: 14,
                border: '1.5px solid rgba(162,89,255,0.25)',
                boxShadow: '0 2px 10px rgba(123,47,242,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: '#c4b5fd', fontSize: '0.97rem' }}>{r.userName}</span>
                  <StarRating rating={r.rating} />
                </div>
                <div style={{ fontSize: '0.95rem', color: '#d4c8f0', lineHeight: 1.6 }}>{r.comment}</div>
                <div style={{ fontSize: 11, color: '#6b5e8a', marginTop: 4 }}>{r.date && r.date.substring(0, 10)}</div>
              </div>
            ))}
          </>
        )}
        {isLoggedIn && (
          <form onSubmit={handleReviewSubmit} style={{ marginTop: 20, width: '100%', maxWidth: '100%' }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#c4b5fd', fontWeight: 700, marginBottom: 8, fontSize: '0.97rem' }}>Tu calificación:</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1,2,3,4,5].map(i => (
                  <span key={i} style={{ cursor: 'pointer', fontSize: 28, color: i <= rating ? '#ffc107' : 'rgba(162,89,255,0.3)', transition: 'color 0.15s, transform 0.15s', display: 'inline-block' }}
                    onClick={() => setRating(i)}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >&#9733;</span>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                placeholder="Escribe tu reseña..."
                style={{
                  width: '100%', resize: 'vertical',
                  padding: '10px 14px', borderRadius: 10,
                  border: '1.5px solid rgba(162,89,255,0.4)',
                  background: 'rgba(30,0,60,0.8)', color: '#e8e0f5',
                  fontSize: '0.97rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
                }}
              />
            </div>
            {submitError && <div style={{ color: '#ff6b6b', marginBottom: 10, fontSize: '0.9rem' }}>{submitError}</div>}
            <button
              type="submit"
              disabled={reviewLoading || !rating || comment.trim().length < 5}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: reviewLoading || !rating || comment.trim().length < 5
                  ? 'rgba(162,89,255,0.25)'
                  : 'linear-gradient(90deg,#7b2ff2,#a259ff)',
                color: '#fff', fontWeight: 700, fontSize: '1rem',
                cursor: reviewLoading || !rating || comment.trim().length < 5 ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {userReview ? 'Actualizar reseña' : 'Enviar reseña'}
            </button>
            {userReview && <div style={{ marginTop: 8, color: '#a08ab8', fontSize: '0.87rem', textAlign: 'center' }}>Ya enviaste una reseña para este producto.</div>}
          </form>
        )}
      </div>

      {/* SECCIÓN RELACIONADOS */}
      <div className="section" style={{gridColumn: "span 2"}}>
        <h3>También te puede interesar</h3>
        {(relacionados && relacionados.length > 0 && relacionados.some(prod => prod && prod.imageUrl)) ? (
          <div className="relacionados-carousel">
            {showArrows && (
              <button
                className="relacionados-arrow"
                onClick={handlePrevRelacionado}
                aria-label="Anterior"
                style={{left: 0}}
              >‹</button>
            )}
            <div className="relacionados-viewport">
              <div
                className="relacionados-track"
                style={{
                  width: "100%",
                  justifyContent: "center"
                }}
              >
                {getCarruselSlice(relacionadoIndex, slidesToShow).map((prod, idx) => (
                  <Link
                    key={prod.id + '-' + idx}
                    to={prodUrl(prod.name, prod.id)}
                    className="relacionados-slide"
                    style={{
                      width: `${100 / slidesToShow}%`,
                      maxWidth: `${100 / slidesToShow}%`,
                      flex: `0 0 ${100 / slidesToShow}%`,
                      display: "flex",
                      justifyContent: "center"
                    }}
                  >
                    {prod.imageUrl && <img src={prod.imageUrl} alt={prod.name} />}
                  </Link>
                ))}
              </div>
            </div>
            {showArrows && (
              <button
                className="relacionados-arrow"
                onClick={handleNextRelacionado}
                aria-label="Siguiente"
                style={{right: 0}}
              >›</button>
            )}
          </div>
        ) : (
          <div style={{color: '#888'}}>No hay productos relacionados.</div>
        )}
      </div>

      {/* SECCIÓN PREGUNTAS Y RESPUESTAS */}
      <div className="section" style={{gridColumn: "span 2"}}>
        <h3>Preguntas y respuestas</h3>
        {questionLoading ? <div>Cargando preguntas...</div> : (
          <>
            {questions.length === 0 && <div>No hay preguntas aún.</div>}
            {questions.map(q => (
              <PreguntaRespuesta key={q.id} pregunta={q} onResponder={handleAnswer} user={user} isAdmin={isAdmin} />
            ))}
          </>
        )}
        {isLoggedIn && (
          <form onSubmit={handleAsk} style={{ marginTop: 16, width: '100%', maxWidth: '100%' }}>
            <div style={{ color: '#c4b5fd', fontWeight: 700, marginBottom: 10, fontSize: '0.97rem' }}>Haz una pregunta:</div>
            <input
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              placeholder="Escribe tu pregunta..."
              style={{
                width: '100%', marginBottom: 10, padding: '10px 14px', borderRadius: 10,
                border: '1.5px solid rgba(162,89,255,0.4)',
                background: 'rgba(30,0,60,0.8)', color: '#e8e0f5',
                fontSize: '0.97rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
              }}
            />
            {questionError && <div style={{ color: '#ff6b6b', marginBottom: 8, fontSize: '0.9rem' }}>{questionError}</div>}
            <button
              type="submit"
              disabled={questionLoading || questionText.trim().length < 5}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: questionLoading || questionText.trim().length < 5
                  ? 'rgba(162,89,255,0.25)'
                  : 'linear-gradient(90deg,#7b2ff2,#a259ff)',
                color: '#fff', fontWeight: 700, fontSize: '1rem',
                cursor: questionLoading || questionText.trim().length < 5 ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >Enviar pregunta</button>
          </form>
        )}
      </div>
      <div style={{ gridColumn: 'span 2', marginTop: 8, marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => window.history.back()}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '11px 28px', borderRadius: 14,
            border: '1.5px solid rgba(162,89,255,0.35)',
            background: 'rgba(123,47,242,0.08)',
            color: '#a08ab8', fontWeight: 600, fontSize: '0.97rem',
            cursor: 'pointer', letterSpacing: '0.02em',
            transition: 'background 0.2s, color 0.2s, border-color 0.2s, transform 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,47,242,0.2)'; e.currentTarget.style.color = '#c4b5fd'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(123,47,242,0.08)'; e.currentTarget.style.color = '#a08ab8'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
          Volver atrás
        </button>
      </div>
    </div>
  );
}