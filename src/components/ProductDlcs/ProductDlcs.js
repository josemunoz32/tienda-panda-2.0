import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { db, auth } from "../../firebase";
import { doc, setDoc, deleteDoc, onSnapshot, collection, getDocs } from "firebase/firestore";
import {
  fetchRyuuCatalog,
  getDlcsForGame,
  getDlcBundlePrice,
  formatClp,
  fetchOfficialSteamDlcName,
  DLC_PRICE_UNIT
} from "../../utils/ryuuDlcHelper";
import "./ProductDlcs.css";

export default function ProductDlcs({
  product,
  moneda = "CLP",
  formatearPrecio,
  inCart,
  onAddBaseGameToCart
}) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartDlcIds, setCartDlcIds] = useState(new Set());
  const [ownsBaseGame, setOwnsBaseGame] = useState(false);
  const [isBaseInCart, setIsBaseInCart] = useState(false);
  const [dlcList, setDlcList] = useState([]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [hoveredDlcId, setHoveredDlcId] = useState(null);
  const user = auth.currentUser;

  const rawAppId =
    product?.app_id ||
    product?.appId ||
    (String(product?.id || "").startsWith("ryuu_")
      ? product.id.replace("ryuu_", "")
      : null);
  const appId = rawAppId ? String(rawAppId).trim() : null;

  // Cargar catálogo de Ryuu
  useEffect(() => {
    let isMounted = true;
    fetchRyuuCatalog()
      .then((data) => {
        if (isMounted) {
          setCatalog(data || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Obtener DLCs iniciales y resolver nombres oficiales si hacen falta
  useEffect(() => {
    if (!catalog.length || !product) return;
    let resolvedId = appId;
    if (!resolvedId && product.name) {
      const clean = product.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const match = catalog.find(g => g.name && g.name.toLowerCase().replace(/[^a-z0-9]/g, '') === clean) ||
                    catalog.find(g => g.name && clean.length >= 4 && (g.name.toLowerCase().replace(/[^a-z0-9]/g, '').startsWith(clean) || clean.startsWith(g.name.toLowerCase().replace(/[^a-z0-9]/g, ''))));
      if (match && match.appid) resolvedId = String(match.appid);
    }
    if (!resolvedId) return;
    const initialDlcs = getDlcsForGame(resolvedId, catalog);
    setDlcList(initialDlcs);

    // Si algún DLC necesita lookup oficial en Steam, buscarlo en segundo plano
    let isMounted = true;
    initialDlcs.forEach(async (dlc) => {
      if (dlc.needsSteamLookup) {
        const officialName = await fetchOfficialSteamDlcName(dlc.dlc_app_id);
        if (officialName && isMounted) {
          setDlcList((prev) =>
            prev.map((item) =>
              item.dlc_app_id === dlc.dlc_app_id
                ? { ...item, name: officialName, needsSteamLookup: false }
                : item
            )
          );
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [appId, catalog]);

  // Verificar si el usuario ya compró el juego base en su cuenta
  useEffect(() => {
    if (!user || !appId) {
      setOwnsBaseGame(false);
      return;
    }

    let isMounted = true;
    const checkOwnership = async () => {
      try {
        const ordersSnap = await getDocs(collection(db, `users/${user.uid}/orders`));
        let owned = false;
        const normBaseName = (product?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

        ordersSnap.forEach((docSnap) => {
          const ord = docSnap.data();
          const isSuccessful =
            ord.estado === "exitoso" ||
            ord.estado === "completado" ||
            ord.estado === "aprobado" ||
            ord.status === "completed";

          if (isSuccessful) {
            const prods = Array.isArray(ord.productos)
              ? ord.productos
              : Array.isArray(ord.items)
              ? ord.items
              : [];

            for (const p of prods) {
              const pAppId = String(p.app_id || p.appId || p.baseGameAppId || "");
              const pId = String(p.id || p.productId || "");
              const pName = (p.name || p.nombre || "").toLowerCase().replace(/[^a-z0-9]/g, "");

              if (
                (!p.isDlc && pAppId === appId) ||
                (!p.isDlc && pId === (product?.id || appId)) ||
                (!p.isDlc && normBaseName && pName && pName === normBaseName)
              ) {
                owned = true;
                break;
              }
            }
          }
        });

        if (isMounted) setOwnsBaseGame(owned);
      } catch (err) {
        console.warn("Error al verificar compras del juego base:", err);
      }
    };

    checkOwnership();
    return () => {
      isMounted = false;
    };
  }, [user, appId, product]);

  // Escuchar el carrito del usuario o localStorage para DLCs y juego base
  useEffect(() => {
    const baseId = product?.id || appId;
    const normBaseName = (product?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    if (!user) {
      const updateLocalDlcStatus = () => {
        let lCart = [];
        try {
          const s = localStorage.getItem("guestCart");
          if (s) lCart = JSON.parse(s);
        } catch (e) {}

        const dlcSet = new Set(
          lCart.filter((i) => i.isDlc && i.dlc_app_id).map((i) => String(i.dlc_app_id))
        );
        setCartDlcIds(dlcSet);

        // Verificar si juego base está en guestCart
        const hasBase =
          inCart ||
          lCart.some((i) => {
            if (i.isDlc) return false;
            const iAppId = String(i.app_id || i.appId || "");
            const iId = String(i.id || i.productId || "");
            const iName = (i.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            return (
              (appId && iAppId === appId) ||
              iId === baseId ||
              (normBaseName && iName === normBaseName)
            );
          });
        setIsBaseInCart(hasBase);
      };

      updateLocalDlcStatus();
      window.addEventListener("localCartUpdated", updateLocalDlcStatus);
      return () => window.removeEventListener("localCartUpdated", updateLocalDlcStatus);
    }

    const unsub = onSnapshot(collection(db, `users/${user.uid}/cart`), (snap) => {
      const dlcSet = new Set();
      let hasBase = inCart;

      snap.forEach((d) => {
        const data = d.data();
        if (data.isDlc && data.dlc_app_id) {
          dlcSet.add(String(data.dlc_app_id));
        } else if (!data.isDlc) {
          const iAppId = String(data.app_id || data.appId || "");
          const iId = String(data.id || data.productId || d.id || "");
          const iName = (data.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          if (
            (appId && iAppId === appId) ||
            iId === baseId ||
            (normBaseName && iName === normBaseName)
          ) {
            hasBase = true;
          }
        }
      });

      setCartDlcIds(dlcSet);
      setIsBaseInCart(hasBase);
    });

    return () => unsub();
  }, [user, appId, product, inCart]);

  if (loading || !appId || !catalog.length) return null;
  if (!dlcList || dlcList.length === 0) return null;

  const renderPrice = (clpAmount) => {
    if (typeof formatearPrecio === "function") {
      return formatearPrecio(clpAmount);
    }
    return formatClp(clpAmount);
  };

  // Validación: ¿Puede agregar DLC?
  const canAddDlc = ownsBaseGame || isBaseInCart || inCart;

  // Añadir DLC individual al carrito
  const handleAddDlc = async (dlc, overridePrice = null) => {
    if (!canAddDlc) {
      setShowWarningModal(true);
      return;
    }

    const dlcPrice = overridePrice !== null ? overridePrice : DLC_PRICE_UNIT;
    const dlcId = `dlc-${appId}-${dlc.dlc_app_id}`;
    const dlcItem = {
      id: dlcId,
      productId: dlcId,
      name: dlc.name, // Nombre oficial del DLC
      baseGameName: product.name,
      baseGameAppId: appId,
      dlc_app_id: String(dlc.dlc_app_id),
      dlcTitle: `DLC de ${product.name}`,
      imageUrl: dlc.header_image || product.imageUrl || null,
      priceCLP: dlcPrice,
      priceUSD: Number((dlcPrice / 1000).toFixed(2)),
      cantidad: 1,
      quantity: 1,
      isDlc: true,
      isDigital: true
    };

    if (!user) {
      let lCart = [];
      try {
        const stored = localStorage.getItem("guestCart");
        if (stored) lCart = JSON.parse(stored);
      } catch (e) {}

      if (!lCart.some((i) => (i.productId || i.id) === dlcItem.id)) {
        lCart.push(dlcItem);
        localStorage.setItem("guestCart", JSON.stringify(lCart));
        window.dispatchEvent(new Event("localCartUpdated"));
      }
      return;
    }

    try {
      await setDoc(doc(db, `users/${user.uid}/cart`, dlcItem.id), dlcItem);
    } catch (err) {
      console.error("Error al añadir DLC al carrito:", err);
    }
  };

  // Quitar DLC individual del carrito
  const handleRemoveDlc = async (dlc) => {
    const dlcId = `dlc-${appId}-${dlc.dlc_app_id}`;

    if (!user) {
      let lCart = [];
      try {
        const stored = localStorage.getItem("guestCart");
        if (stored) lCart = JSON.parse(stored);
      } catch (e) {}

      lCart = lCart.filter((i) => (i.productId || i.id) !== dlcId);
      localStorage.setItem("guestCart", JSON.stringify(lCart));
      window.dispatchEvent(new Event("localCartUpdated"));
      return;
    }

    try {
      await deleteDoc(doc(db, `users/${user.uid}/cart`, dlcId));
    } catch (err) {
      console.error("Error al eliminar DLC del carrito:", err);
    }
  };

  // Toggle rápido de DLC
  const handleToggleDlc = (dlc) => {
    const isAdded = cartDlcIds.has(String(dlc.dlc_app_id));
    if (isAdded) {
      handleRemoveDlc(dlc);
    } else {
      handleAddDlc(dlc);
    }
  };

  const bundlePrice = getDlcBundlePrice(dlcList.length);
  const allAdded = dlcList.every((d) => cartDlcIds.has(String(d.dlc_app_id)));

  // Añadir o quitar todos los DLCs
  const handleToggleAllDlcs = async () => {
    if (allAdded) {
      for (const dlc of dlcList) {
        await handleRemoveDlc(dlc);
      }
    } else {
      if (!canAddDlc) {
        setShowWarningModal(true);
        return;
      }
      const unitBundlePrice = Math.round(bundlePrice / dlcList.length);
      for (let idx = 0; idx < dlcList.length; idx++) {
        const dlc = dlcList[idx];
        const thisPrice =
          idx === dlcList.length - 1
            ? bundlePrice - unitBundlePrice * (dlcList.length - 1)
            : unitBundlePrice;
        await handleAddDlc(dlc, thisPrice);
      }
    }
  };

  const handleAddBaseGame = () => {
    setShowWarningModal(false);
    if (typeof onAddBaseGameToCart === "function") {
      onAddBaseGameToCart();
    }
  };

  return (
    <div className="product-dlcs-container">
      {/* Header */}
      <div className="product-dlcs-header">
        <div className="product-dlcs-title-box">
          <span style={{ fontSize: "1.2rem" }}>🎁</span>
          <h3 className="product-dlcs-title">Contenido Descargable (DLCs Oficiales)</h3>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {ownsBaseGame ? (
            <span className="product-dlcs-ownership-badge owned">
              ✓ Juego base en tu cuenta
            </span>
          ) : isBaseInCart || inCart ? (
            <span className="product-dlcs-ownership-badge cart">
              🛒 Juego base en carrito
            </span>
          ) : (
            <span className="product-dlcs-ownership-badge needed">
              ⚠️ Requiere juego base
            </span>
          )}
          <span className="product-dlcs-badge">
            {dlcList.length} DLC{dlcList.length > 1 ? "s" : ""} disponible{dlcList.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Banner de Precios */}
      <div className="product-dlcs-pricing-banner">
        <span>💡 Promoción DLCs:</span>
        <strong>1 DLC: {renderPrice(1000)}</strong> •
        <span>2x {renderPrice(1800)}</span> •
        <span>3x {renderPrice(2500)}</span> •
        <span>4x {renderPrice(3000)}</span> •
        <strong style={{ color: "#00f5d4" }}>Pack Completo: {renderPrice(bundlePrice)}</strong>
      </div>

      {/* Aviso inline claro si no tiene el juego base */}
      {!canAddDlc && (
        <div className="product-dlc-inline-alert">
          <div className="product-dlc-inline-icon">⚠️</div>
          <div className="product-dlc-inline-text">
            <span className="product-dlc-inline-title">Juego base requerido para adquirir DLCs</span>
            <span className="product-dlc-inline-desc">
              Debes tener <strong>{product?.name}</strong> comprado en tu cuenta o agregado al carrito para añadir sus DLCs.
            </span>
          </div>
          <button
            type="button"
            className="product-dlc-inline-btn"
            onClick={handleAddBaseGame}
          >
            🛒 Agregar juego base
          </button>
        </div>
      )}

      {/* Grid de DLCs oficiales */}
      <div className="product-dlcs-grid">
        {dlcList.map((dlc) => {
          const isAdded = cartDlcIds.has(String(dlc.dlc_app_id));
          const isHovered = hoveredDlcId === dlc.dlc_app_id;

          return (
            <div
              key={dlc.dlc_app_id}
              className={`product-dlc-card ${isAdded ? "selected" : ""}`}
            >
              {dlc.header_image && (
                <img
                  src={dlc.header_image}
                  alt={dlc.name}
                  className="product-dlc-thumb"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              )}
              <div className="product-dlc-name" title={dlc.name}>
                {dlc.name}
              </div>
              <div className="product-dlc-footer">
                <span className="product-dlc-price">
                  {renderPrice(DLC_PRICE_UNIT)}
                </span>
                <button
                  type="button"
                  className={`product-dlc-btn ${isAdded ? "added" : ""}`}
                  onMouseEnter={() => setHoveredDlcId(dlc.dlc_app_id)}
                  onMouseLeave={() => setHoveredDlcId(null)}
                  onClick={() => handleToggleDlc(dlc)}
                  title={
                    isAdded
                      ? "Haz clic para quitar este DLC del carrito"
                      : canAddDlc
                      ? "Añadir este DLC al carrito"
                      : "Requiere tener el juego base"
                  }
                >
                  {isAdded ? (isHovered ? "✕ Quitar" : "✓ En carrito") : "+ Añadir"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra de Pack Completo */}
      {dlcList.length >= 2 && (
        <div className="product-dlc-pack-bar">
          <div style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
            {allAdded ? (
              <span style={{ color: "#34d399", fontWeight: 700 }}>
                ✓ Todos los {dlcList.length} DLCs agregados al carrito
              </span>
            ) : (
              <span>
                Lleva los <strong>{dlcList.length} DLCs oficiales</strong> con descuento
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleToggleAllDlcs}
            className={`product-dlc-all-btn ${allAdded ? "all-added" : ""}`}
          >
            {allAdded
              ? `✕ Quitar todos los DLCs`
              : `⚡ Añadir todos los ${dlcList.length} DLCs (${renderPrice(bundlePrice)})`}
          </button>
        </div>
      )}

      {/* Modal de Advertencia con Portal al body */}
      {showWarningModal && typeof document !== "undefined" && createPortal(
        <div className="product-dlc-modal-overlay" onClick={() => setShowWarningModal(false)}>
          <div className="product-dlc-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="product-dlc-modal-icon">⚠️</div>
            <h4 className="product-dlc-modal-title">Juego Base Requerido</h4>
            <p className="product-dlc-modal-desc">
              Para agregar DLCs debes tener el juego base <strong>"{product?.name}"</strong>{" "}
              comprado en tu cuenta o agregado actualmente a tu carrito de compras.
            </p>
            <div className="product-dlc-modal-actions">
              <button
                type="button"
                className="product-dlc-modal-btn-add"
                onClick={handleAddBaseGame}
              >
                🛒 Agregar "{product?.name}" al carrito
              </button>
              <button
                type="button"
                className="product-dlc-modal-btn-cancel"
                onClick={() => setShowWarningModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
