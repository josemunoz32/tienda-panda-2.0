import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Search, Check, Sparkles, Gift, CheckCheck, Trash2 } from "lucide-react";
import {
  fetchRyuuCatalog,
  getDlcsForGame,
  getDlcBundlePrice,
  fetchOfficialSteamDlcName
} from "../../utils/ryuuDlcHelper";
import "./PromoDlcModal.css";

export default function PromoDlcModal({
  isOpen,
  onClose,
  game,
  initialSelectedDlcs = [],
  onSaveDlcs,
  formatearPrecio,
  isReseller = false,
  ryuuCatalog = []
}) {
  const [catalog, setCatalog] = useState(ryuuCatalog || []);
  const [dlcs, setDlcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDlcMap, setSelectedDlcMap] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  // Cargar catálogo si no vino en props
  useEffect(() => {
    if (!isOpen) return;
    if (catalog && catalog.length > 0) {
      setLoading(false);
      return;
    }
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
  }, [isOpen, catalog]);

  // Resolver AppId y extraer DLCs del juego
  useEffect(() => {
    if (!isOpen || !game) return;

    // Inicializar mapa de seleccionados con los que ya venían
    const initialMap = {};
    (initialSelectedDlcs || []).forEach((d) => {
      const id = String(d.dlc_app_id || d.id || d.appId || "");
      if (id) initialMap[id] = d;
    });
    setSelectedDlcMap(initialMap);

    // Si el producto ya trae su array de DLCs
    if (Array.isArray(game.dlcs) && game.dlcs.length > 0) {
      setDlcs(game.dlcs);
      setLoading(false);
      return;
    }

    let appId =
      game.app_id ||
      game.appId ||
      (String(game.id || "").startsWith("ryuu_")
        ? game.id.replace("ryuu_", "")
        : null);

    // Si no tiene appId numérico, intentar buscar en catálogo por nombre
    if ((!appId || !/^\d+$/.test(String(appId).trim())) && game.name && catalog.length > 0) {
      const cleanName = game.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const match = catalog.find((g) => {
        if (!g.name) return false;
        const c = g.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        return c === cleanName || (cleanName.length >= 5 && (c.startsWith(cleanName) || cleanName.startsWith(c)));
      });
      if (match && match.appid) {
        appId = String(match.appid);
      }
    }

    if (appId && catalog.length > 0) {
      const list = getDlcsForGame(appId, catalog);
      setDlcs(list);
      setLoading(false);

      // Lookup de nombres oficiales si algún DLC sólo tiene appid numérico
      let isMounted = true;
      list.forEach(async (d) => {
        if (d.needsSteamLookup) {
          const official = await fetchOfficialSteamDlcName(d.dlc_app_id);
          if (official && isMounted) {
            setDlcs((prev) =>
              prev.map((item) =>
                item.dlc_app_id === d.dlc_app_id
                  ? { ...item, name: official, needsSteamLookup: false }
                  : item
              )
            );
          }
        }
      });
      return () => {
        isMounted = false;
      };
    } else if (!loading) {
      setDlcs([]);
    }
  }, [isOpen, game, catalog]);

  // Lista filtrada por búsqueda
  const filteredDlcs = useMemo(() => {
    if (!searchQuery.trim()) return dlcs;
    const q = searchQuery.toLowerCase().trim();
    return dlcs.filter(
      (d) =>
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.dlc_app_id && String(d.dlc_app_id).includes(q))
    );
  }, [dlcs, searchQuery]);

  const selectedList = useMemo(() => Object.values(selectedDlcMap), [selectedDlcMap]);
  const selectedCount = selectedList.length;

  const currentExtraPrice = useMemo(() => {
    const raw = getDlcBundlePrice(selectedCount);
    return isReseller ? Math.round(raw * 0.5) : raw;
  }, [selectedCount, isReseller]);

  const packFullPrice = useMemo(() => {
    const raw = getDlcBundlePrice(dlcs.length);
    return isReseller ? Math.round(raw * 0.5) : raw;
  }, [dlcs.length, isReseller]);

  if (!isOpen || !game) return null;

  const toggleDlc = (dlc) => {
    const id = String(dlc.dlc_app_id);
    setSelectedDlcMap((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = {
          dlc_app_id: id,
          id,
          name: dlc.name,
          header_image: dlc.header_image,
          gameId: game.id,
          gameName: game.name,
          gameAppId: game.app_id || game.appId || null
        };
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const newMap = {};
    dlcs.forEach((d) => {
      const id = String(d.dlc_app_id);
      newMap[id] = {
        dlc_app_id: id,
        id,
        name: d.name,
        header_image: d.header_image,
        gameId: game.id,
        gameName: game.name,
        gameAppId: game.app_id || game.appId || null
      };
    });
    setSelectedDlcMap(newMap);
  };

  const handleDeselectAll = () => {
    setSelectedDlcMap({});
  };

  const handleConfirm = () => {
    if (onSaveDlcs) {
      onSaveDlcs(selectedList);
    }
    if (onClose) onClose();
  };

  const gameImg =
    game.imageUrl ||
    game.image ||
    (game.app_id
      ? `https://cdn.akamai.steamstatic.com/steam/apps/${game.app_id}/header.jpg`
      : null);

  return createPortal(
    <div
      className="promo-dlc-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className="promo-dlc-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="promo-dlc-modal-header">
          <div className="promo-dlc-header-left">
            <div className="promo-dlc-game-thumb-wrap">
              {gameImg ? (
                <img
                  src={gameImg}
                  alt={game.name}
                  className="promo-dlc-game-thumb"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                <Gift size={20} color="#00f5d4" />
              )}
            </div>
            <div className="promo-dlc-header-titles">
              <div className="promo-dlc-header-badge">
                <Sparkles size={12} />
                <span>EXPANSIONES & DLCS OFICIALES</span>
              </div>
              <h3 className="promo-dlc-game-name" title={game.name}>
                {game.name}
              </h3>
              <div className="promo-dlc-header-sub">
                {dlcs.length} DLC{dlcs.length !== 1 ? "s" : ""} disponible{dlcs.length !== 1 ? "s" : ""} para sumar a tu promo
              </div>
            </div>
          </div>
          <button
            type="button"
            className="promo-dlc-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Pricing banner pill */}
        <div className="promo-dlc-pricing-banner">
          <div className="promo-dlc-pricing-content">
            <span className="promo-dlc-pricing-badge">💡 Precios Promo:</span>
            <div className="promo-dlc-pricing-tiers">
              <span>1x {formatearPrecio ? formatearPrecio(isReseller ? 500 : 1000) : "$1.000"}</span>
              <span>•</span>
              <span>2x {formatearPrecio ? formatearPrecio(isReseller ? 900 : 1800) : "$1.800"}</span>
              <span>•</span>
              <span>3x {formatearPrecio ? formatearPrecio(isReseller ? 1250 : 2500) : "$2.500"}</span>
              <span>•</span>
              <span>4x {formatearPrecio ? formatearPrecio(isReseller ? 1500 : 3000) : "$3.000"}</span>
              <span>•</span>
              <strong className="promo-dlc-pricing-highlight">
                Pack Completo: {formatearPrecio ? formatearPrecio(isReseller ? 1750 : 3500) : "$3.500"}
              </strong>
            </div>
          </div>
          {isReseller && (
            <div className="promo-dlc-reseller-tag">💎 50% Revendedor</div>
          )}
        </div>

        {/* Toolbar de búsqueda y selección rápida */}
        <div className="promo-dlc-toolbar">
          <div className="promo-dlc-search-wrap">
            <Search size={14} className="promo-dlc-search-icon" />
            <input
              type="text"
              className="promo-dlc-search-input"
              placeholder="Buscar DLC por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="promo-dlc-search-clear"
                onClick={() => setSearchQuery("")}
              >
                &times;
              </button>
            )}
          </div>

          <div className="promo-dlc-bulk-actions">
            <button
              type="button"
              className="promo-dlc-bulk-btn select-all"
              onClick={handleSelectAll}
              title={`Agregar todos los ${dlcs.length} DLCs por ${formatearPrecio ? formatearPrecio(packFullPrice) : "$3.500"}`}
            >
              <CheckCheck size={14} />
              <span>Todos ({formatearPrecio ? formatearPrecio(packFullPrice) : "$3.500"})</span>
            </button>
            {selectedCount > 0 && (
              <button
                type="button"
                className="promo-dlc-bulk-btn deselect-all"
                onClick={handleDeselectAll}
                title="Quitar selección"
              >
                <Trash2 size={13} />
                <span>Limpiar ({selectedCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Body / DLC Grid */}
        <div className="promo-dlc-body">
          {loading ? (
            <div className="promo-dlc-loading">
              <div className="promo-dlc-spinner" />
              <span>Cargando DLCs disponibles...</span>
            </div>
          ) : dlcs.length === 0 ? (
            <div className="promo-dlc-empty">
              <span style={{ fontSize: "2rem" }}>🎮</span>
              <h4>Este juego no tiene DLCs adicionales disponibles</h4>
              <p>El juego base incluye su contenido principal completo.</p>
            </div>
          ) : filteredDlcs.length === 0 ? (
            <div className="promo-dlc-empty">
              <span style={{ fontSize: "2rem" }}>🔍</span>
              <h4>No hay DLCs que coincidan con "{searchQuery}"</h4>
            </div>
          ) : (
            <div className="promo-dlc-grid">
              {filteredDlcs.map((dlc) => {
                const isChecked = Boolean(selectedDlcMap[String(dlc.dlc_app_id)]);
                return (
                  <div
                    key={dlc.dlc_app_id}
                    className={`promo-dlc-item ${isChecked ? "selected" : ""}`}
                    onClick={() => toggleDlc(dlc)}
                  >
                    <div className="promo-dlc-checkbox">
                      {isChecked && <Check size={13} color="#000" strokeWidth={3} />}
                    </div>

                    <div className="promo-dlc-item-thumb-wrap">
                      {dlc.header_image ? (
                        <img
                          src={dlc.header_image}
                          alt={dlc.name}
                          loading="lazy"
                          className="promo-dlc-item-thumb"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <Gift size={16} color="#00f5d4" />
                      )}
                    </div>

                    <div className="promo-dlc-item-info">
                      <div className="promo-dlc-item-name" title={dlc.name}>
                        {dlc.name}
                      </div>
                      <div className="promo-dlc-item-meta">
                        <span className="promo-dlc-item-tag">DLC Steam</span>
                        {isChecked && (
                          <span className="promo-dlc-item-added">✓ Agregado</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="promo-dlc-modal-footer">
          <div className="promo-dlc-footer-summary">
            <div className="promo-dlc-summary-count">
              {selectedCount > 0 ? (
                <>
                  <span className="promo-dlc-summary-glow">🎁 {selectedCount} DLC{selectedCount !== 1 ? "s" : ""}</span>
                  <span>seleccionado{selectedCount !== 1 ? "s" : ""}</span>
                </>
              ) : (
                <span>Sin DLCs seleccionados</span>
              )}
            </div>
            {selectedCount > 0 && (
              <div className="promo-dlc-summary-price">
                + {formatearPrecio ? formatearPrecio(currentExtraPrice) : `$${currentExtraPrice.toLocaleString("es-CL")}`}
              </div>
            )}
          </div>

          <div className="promo-dlc-footer-actions">
            <button
              type="button"
              className="promo-dlc-btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="promo-dlc-btn-primary"
              onClick={handleConfirm}
            >
              {selectedCount > 0 ? (
                <>
                  <Sparkles size={16} />
                  <span>
                    Aplicar {selectedCount} DLC{selectedCount !== 1 ? "s" : ""} (+{formatearPrecio ? formatearPrecio(currentExtraPrice) : `$${currentExtraPrice}`})
                  </span>
                </>
              ) : (
                <span>Continuar sin DLCs</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
