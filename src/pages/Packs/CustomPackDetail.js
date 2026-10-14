import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { db, auth } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useMoneda } from "../../context/MonedaContext";
import "./CustomPackDetail.css";
import pandaLoader from "../../assets/logos/miicono.png";
import Loader from "../../components/Loader";

export default function CustomPackDetail() {
  const { packId } = useParams();
  const navigate = useNavigate();
  const { moneda, formatearPrecio, convertirDesdeCLP } = useMoneda();

  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const failsafeTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 3000);

    async function fetchPack() {
      if (!packId) {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
        return;
      }
      try {
        const docRef = doc(db, "customPacks", packId);
        const docSnap = await getDoc(docRef);

        if (!isMounted) return;
        if (docSnap.exists()) {
          setPack({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Error al cargar el pack:", err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchPack();

    return () => {
      isMounted = false;
      clearTimeout(failsafeTimer);
    };
  }, [packId]);

  const handleBuyPack = async () => {
    if (!pack) return;
    setAddingToCart(true);

    try {
      const user = auth.currentUser;
      const itemId = `custom-pack-${pack.id}`;
      
      const cartItem = {
        id: itemId,
        productId: itemId,
        isPromo: true,
        isCustomPack: true,
        name: pack.titulo,
        priceCLP: Number(pack.precio_clp),
        priceUSD: pack.precio_usd ? Number(pack.precio_usd) : Math.round((Number(pack.precio_clp) / 900) * 100) / 100,
        imageUrl: pack.juegos?.[0]?.imageUrl || null,
        cantidad: 1,
        plataforma: "steam",
        categoryId: "steam",
        categoryName: "Steam",
        isSteam: true,
        promoGames: (pack.juegos || []).map(g => ({ id: g.id, name: g.name }))
      };

      if (user) {
        await setDoc(doc(db, `users/${user.uid}/cart`, itemId), cartItem);
      } else {
        let localCart = [];
        try {
          const stored = localStorage.getItem("guestCart");
          if (stored) localCart = JSON.parse(stored);
        } catch (e) {}

        // Reemplazar o agregar el ítem
        const existingIdx = localCart.findIndex((i) => i.id === itemId);
        if (existingIdx >= 0) {
          localCart[existingIdx] = cartItem;
        } else {
          localCart.push(cartItem);
        }
        localStorage.setItem("guestCart", JSON.stringify(localCart));
        window.dispatchEvent(new Event("localCartUpdated"));
      }

      // Redirigir directamente al checkout del carrito
      navigate("/checkoutcarrito");
    } catch (err) {
      console.error("Error al agregar pack al carrito:", err);
      alert("Ocurrió un problema al agregar el pack al carrito.");
      setAddingToCart(false);
    }
  };

  if (loading) {
    return <Loader text="Cargando..." subtext="PandaStore • Tu Pack Especial" fullScreen={true} />;
  }

  if (error || !pack) {
    return (
      <div className="cpd-error-screen">
        <div className="cpd-error-card">
          <span className="cpd-error-icon">⚠️</span>
          <h2>Pack no encontrado o no disponible</h2>
          <p>El enlace que estás buscando puede haber caducado o no existir.</p>
          <Link to="/promos" className="cpd-btn-back">
            Ver Promociones Disponibles
          </Link>
        </div>
      </div>
    );
  }

  // Formato de precio según la moneda seleccionada por el usuario en el header/país
  const precioMostrar = formatearPrecio ? formatearPrecio(pack.precio_clp) : `$${Number(pack.precio_clp || 0).toLocaleString("es-CL")} CLP`;

  return (
    <>
      <Helmet>
        <title>{`${pack.titulo} | PandaStore`}</title>
        <meta
          name="description"
          content={`Compra este pack exclusivo: ${pack.titulo} con los mejores juegos al mejor precio en PandaStore.`}
        />
      </Helmet>

      <div className="cpd-container">
        <div className="cpd-card">
          {/* Badge */}
          <div className="cpd-badge">
            <span className="cpd-badge-sparkle">✨</span> Pack Personalizado Exclusivo
          </div>

          {/* Título y Precio */}
          <h1 className="cpd-title">{pack.titulo}</h1>

          <div className="cpd-price-tag">
            <span className="cpd-price-label">Precio Especial:</span>
            <span className="cpd-price-value">{precioMostrar}</span>
          </div>

          {pack.descripcion && (
            <div className="cpd-description">
              <p>💬 "{pack.descripcion}"</p>
            </div>
          )}

          {/* Juegos incluidos */}
          <div className="cpd-games-section">
            <h2>🎮 Juegos incluidos en este Pack:</h2>
            <div className="cpd-games-grid">
              {(pack.juegos || []).map((game, index) => (
                <div key={game.id || index} className="cpd-game-card">
                  <div className="cpd-game-img-wrapper">
                    <img
                      src={game.imageUrl || game.image || "/logo.png"}
                      alt={game.name}
                      onError={(e) => {
                        e.target.src = "/logo.png";
                      }}
                    />
                  </div>
                  <span className="cpd-game-name">{game.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Botón Principal de Compra */}
          <button
            className="cpd-btn-buy"
            onClick={handleBuyPack}
            disabled={addingToCart}
          >
            {addingToCart ? (
              "Agregando al carrito..."
            ) : (
              <>
                <span>🛒 Comprar Este Pack y Pagar</span>
                <span className="cpd-btn-arrow">→</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
