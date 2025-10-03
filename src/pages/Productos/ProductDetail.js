      // ...existing code...
// ...existing code...
    // ...existing code...
// ...existing code...
  // ...existing code...
import React, { useState, useEffect } from "react";

import "./ProductDetail.css";
import { useMoneda } from "../../context/MonedaContext";
import { useParams, Link, useNavigate } from "react-router-dom";
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
  <div style={{marginBottom: 10, background:'#23232b', borderRadius:10, padding:'10px 12px', maxWidth: '100%', overflow:'hidden', position:'relative', minHeight:48}}>
      <b style={{color:'#e0e0e0'}}>Descripción:</b>{' '}
      <span style={{
        display:'inline',
        wordBreak:'break-word',
        whiteSpace: expand ? 'pre-line' : 'normal',
        maxHeight: expand ? 'none' : 64,
        overflow: 'hidden',
        fontSize: '1.04rem',
        color:'#f3f3f3',
        lineHeight:1.5
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
    <div style={{marginBottom: 14, borderBottom: '1px solid #eee', paddingBottom: 8}}>
      <div style={{fontWeight: 500}}>{pregunta.userName}: <span style={{color: '#333'}}>{pregunta.text}</span></div>
      {pregunta.answer ? (
        <div style={{marginLeft: 12, color: '#1976d2', fontSize: 15}}><b>Respuesta:</b> {pregunta.answer}</div>
      ) : (
        isAdmin || (user && user.uid !== pregunta.userId) ? (
          <form onSubmit={e => {e.preventDefault(); onResponder(respuesta, pregunta.id); setRespuesta("");}} style={{marginLeft: 12, marginTop: 4}}>
            <input value={respuesta} onChange={e => setRespuesta(e.target.value)} placeholder="Responder..." style={{width: 220, marginRight: 6}} />
            <button type="submit" disabled={!respuesta.trim()}>Responder</button>
          </form>
        ) : null
      )}
      {pregunta.answer && <div style={{fontSize: 11, color: '#888', marginLeft: 12}}>Respondido el {pregunta.answeredAt && pregunta.answeredAt.substring(0,10)}</div>}
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
  // ...existing code...
  const [fav, setFav] = useState(false);
  const [inCart, setInCart] = useState(false);
  // ...existing code...

  // Limpia la selección si el producto ya no está en el carrito
  useEffect(() => {
    if (!inCart) {
      setSelectedOption("");
    }
  }, [inCart]);

  // Handler para el selector de precio/variante
  function handleOptionChange(e) {
    setSelectedOption(e.target.value);
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
  const { id } = useParams();
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
      const docRef = doc(db, "products", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
  setProducto({ id: docSnap.id, ...docSnap.data() });
      } else {
        console.log("No such document!");
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
    // Siempre usar el id base del producto para el documento del carrito
    const baseId = producto.id || id;
    const cartRef = doc(db, `users/${user.uid}/cart`, baseId);
    if (inCart) {
      await deleteDoc(cartRef);
      setInCart(false);
      setSelectedOption("");
    } else {
      // Usar la variante seleccionada como campo adicional
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

  // Cambia la lógica de showArrows para que las flechas aparezcan si hay más de 1 producto (no solo si hay más que slidesToShow)
  const showArrows = relacionados && relacionados.length > 1;

  // Cambia la lógica para obtener relacionados: 
  // Si no hay relacionados, pero hay productos en la base de datos (aparte del actual), igual muestra esos productos.
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

  // Asegura que no se renderice nada del producto si producto es null
  if (loading) return <div>Cargando...</div>;
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
        <div style={{marginTop: 18, display: 'flex', gap: 10, alignItems: 'center'}}>
          <span style={{fontWeight: 500}}>Compartir:</span>
          <a
            href="#"
            onClick={e => {e.preventDefault(); window.open(`https://wa.me/?text=${encodeURIComponent(producto.name + ' ' + window.location.href)}`,'_blank','noopener');}}
            title="Compartir en WhatsApp"
            style={{textDecoration: 'none', fontSize: 20, color: '#25d366', fontWeight: 600}}
          >
            🟢 WhatsApp
          </a>
          <button
            onClick={() => {navigator.clipboard.writeText(window.location.href); alert('¡Link copiado! Ahora pégalo en el chat privado de la red social que prefieras.');}}
            style={{
              fontSize: 18,
              padding: '6px 16px',
              border: 'none',
              borderRadius: 6,
              background: 'linear-gradient(90deg, #7b2ff2 0%, #f357a8 100%)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px #7b2ff233',
              transition: 'background 0.2s, box-shadow 0.2s'
            }}
            title="Copiar link para compartir por privado"
            onMouseDown={e => e.currentTarget.style.background = 'linear-gradient(90deg, #f357a8 0%, #7b2ff2 100%)'}
            onMouseUp={e => e.currentTarget.style.background = 'linear-gradient(90deg, #7b2ff2 0%, #f357a8 100%)'}
          >
            📋 Copiar link
          </button>
        </div>
      </div>

      {/* SECCIÓN RESEÑAS */}
      <div className="section" style={{gridColumn: "span 2"}}>
        <h3>Reseñas de usuarios</h3>
        {reviewLoading ? <div>Cargando reseñas...</div> : (
          <>
            {reviews.length === 0 && <div>No hay reseñas aún.</div>}
            {reviews.filter(r => r.visible !== false).map(r => (
              <div key={r.id} style={{marginBottom: 12, borderBottom: '1px solid #000000ff', paddingBottom: 8}}>
                <div><b>{r.userName}</b> <StarRating rating={r.rating} /></div>
                <div style={{fontSize: 13, color: '#555'}}>{r.comment}</div>
                <div style={{fontSize: 11, color: '#aaa'}}>{r.date && r.date.substring(0, 10)}</div>
              </div>
            ))}
          </>
        )}
        {isLoggedIn && (
          <form onSubmit={handleReviewSubmit} style={{marginTop: 18, padding: 12, borderRadius: 6, maxWidth: 400}}>
            <div style={{marginBottom: 8}}>
              <b>Tu calificación:</b><br/>
              {[1,2,3,4,5].map(i => (
                <span key={i} style={{cursor: 'pointer', fontSize: 22, color: i <= rating ? '#ffc107' : '#ccc'}} onClick={() => setRating(i)}>&#9733;</span>
              ))}
              <span style={{marginLeft: 8}}>{rating > 0 ? rating : ''}</span>
            </div>
            <div style={{marginBottom: 8}}>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Escribe tu reseña..." style={{width: '100%', resize: 'vertical'}} />
            </div>
            {submitError && <div style={{color: 'red', marginBottom: 8}}>{submitError}</div>}
            <button type="submit" disabled={reviewLoading || !rating || comment.trim().length < 5}>
              {userReview ? 'Actualizar reseña' : 'Enviar reseña'}
            </button>
            {userReview && <span style={{marginLeft: 10, color: '#888'}}>Ya enviaste una reseña para este producto.</span>}
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
                    to={`/producto/${prod.id}`}
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
          <form onSubmit={handleAsk} style={{marginTop: 12, padding: 10, borderRadius: 6, maxWidth: 400}}>
            <b>Haz una pregunta:</b><br/>
            <input value={questionText} onChange={e => setQuestionText(e.target.value)} placeholder="Escribe tu pregunta..." style={{width: '100%', marginBottom: 6}} />
            {questionError && <div style={{color: 'red', marginBottom: 6}}>{questionError}</div>}
            <button type="submit" disabled={questionLoading || questionText.trim().length < 5}>Enviar pregunta</button>
          </form>
        )}
      </div>
      <div style={{gridColumn: "span 2", marginTop: 24, textAlign: "center"}}>
        <button
          onClick={() => window.history.back()}
          style={{
            color: '#7b2ff2',
            fontWeight: 700,
            textDecoration: 'underline',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18
          }}
        >
          ← Volver atrás
        </button>
      </div>
    </div>
  );
}