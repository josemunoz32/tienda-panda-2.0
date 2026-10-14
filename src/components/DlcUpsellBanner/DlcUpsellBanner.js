import React, { useEffect, useState, useMemo } from "react";
import {
  fetchRyuuCatalog,
  getDlcsForGame,
  getDlcBundlePrice,
  formatClp,
  fetchOfficialSteamDlcName,
  DLC_PRICE_UNIT
} from "../../utils/ryuuDlcHelper";
import "./DlcUpsellBanner.css";

export default function DlcUpsellBanner({
  cartItems = [],
  onAddDlc,
  moneda = "CLP",
  formatearPrecio
}) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGames, setExpandedGames] = useState({});
  const [dlcNames, setDlcNames] = useState({});

  useEffect(() => {
    let isMounted = true;
    fetchRyuuCatalog().then(data => {
      if (isMounted) {
        setCatalog(data || []);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  // Identificar los juegos base que están en el carrito resolviendo por AppID o nombre
  const { gamesWithDlcs, existingDlcAppIds } = useMemo(() => {
    if (!Array.isArray(cartItems) || cartItems.length === 0 || !Array.isArray(catalog) || catalog.length === 0) {
      return { gamesWithDlcs: [], existingDlcAppIds: new Set() };
    }

    const baseGames = [];
    const existingDlcAppIds = new Set();

    cartItems.forEach(item => {
      if (item.isDlc && item.dlc_app_id) {
        existingDlcAppIds.add(String(item.dlc_app_id));
      } else {
        let resolvedAppId = item.app_id || item.appId || item.steamAppId;

        // Si el id es ryuu_XXXXX o numérico puro
        if (!resolvedAppId) {
          const rawId = String(item.productId || item.id || "").trim();
          if (rawId.startsWith("ryuu_")) {
            resolvedAppId = rawId.replace("ryuu_", "");
          } else if (/^\d{3,8}$/.test(rawId)) {
            resolvedAppId = rawId;
          }
        }

        // Si aún no tenemos appId, buscar en el catálogo por nombre del juego
        let matchedName = item.name || item.title || "";
        if (!resolvedAppId && matchedName) {
          const cleanTarget = matchedName.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (cleanTarget) {
            const matched = catalog.find(g => {
              if (!g.name) return false;
              return g.name.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanTarget;
            }) || catalog.find(g => {
              if (!g.name) return false;
              const gClean = g.name.toLowerCase().replace(/[^a-z0-9]/g, "");
              return cleanTarget.length >= 4 && (gClean.startsWith(cleanTarget) || cleanTarget.startsWith(gClean));
            });

            if (matched && matched.appid) {
              resolvedAppId = String(matched.appid);
              matchedName = matched.name || matchedName;
            }
          }
        }

        if (resolvedAppId) {
          // Evitar juegos base duplicados
          if (!baseGames.some(bg => bg.appId === String(resolvedAppId))) {
            baseGames.push({
              appId: String(resolvedAppId),
              name: matchedName || "Juego Base",
              imageUrl: item.imageUrl || item.image || ""
            });
          }
        }
      }
    });

    const gamesWithDlcs = [];
    baseGames.forEach(bg => {
      const allDlcs = getDlcsForGame(bg.appId, catalog);
      if (allDlcs.length > 0) {
        gamesWithDlcs.push({
          baseGame: bg,
          dlcs: allDlcs
        });
      }
    });

    return { gamesWithDlcs, existingDlcAppIds };
  }, [cartItems, catalog]);

  // Cargar nombres oficiales de Steam en segundo plano si son numéricos
  useEffect(() => {
    if (!gamesWithDlcs.length) return;
    let isMounted = true;
    gamesWithDlcs.forEach(({ dlcs }) => {
      dlcs.forEach(async (dlc) => {
        if (dlc.needsSteamLookup && !dlcNames[dlc.dlc_app_id]) {
          const official = await fetchOfficialSteamDlcName(dlc.dlc_app_id);
          if (official && isMounted) {
            setDlcNames(prev => ({ ...prev, [dlc.dlc_app_id]: official }));
          }
        }
      });
    });
    return () => { isMounted = false; };
  }, [gamesWithDlcs, dlcNames]);

  if (loading || gamesWithDlcs.length === 0) {
    return null;
  }

  const renderPrice = (clpAmount) => {
    if (typeof formatearPrecio === "function") {
      return formatearPrecio(clpAmount);
    }
    return formatClp(clpAmount);
  };

  const toggleExpand = (appId) => {
    setExpandedGames(prev => ({ ...prev, [appId]: !prev[appId] }));
  };

  return (
    <div className="dlc-upsell-container">
      {gamesWithDlcs.map(({ baseGame, dlcs }) => {
        const bundlePrice = getDlcBundlePrice(dlcs.length);
        const normalTotal = dlcs.length * DLC_PRICE_UNIT;
        const savings = normalTotal - bundlePrice;
        const isExpanded = !!expandedGames[baseGame.appId];
        const visibleDlcs = isExpanded ? dlcs : dlcs.slice(0, 4);

        const unaddedDlcs = dlcs.filter(d => !existingDlcAppIds.has(String(d.dlc_app_id)));
        const allAdded = unaddedDlcs.length === 0;

        return (
          <div key={baseGame.appId} className="dlc-game-block">
            {/* Cabecera compacta */}
            <div className="dlc-upsell-header">
              <div className="dlc-upsell-title-box">
                <span className="dlc-upsell-icon">🎁</span>
                <div>
                  <h4 className="dlc-upsell-title">
                    DLCs oficiales para <strong style={{ color: "#00f5d4" }}>{baseGame.name}</strong>
                  </h4>
                  <div className="dlc-upsell-subtitle">
                    {dlcs.length} DLCs disponibles • Añade tus favoritos o el pack completo
                  </div>
                </div>
              </div>

              {/* Botón Pack completo compacto en header */}
              {dlcs.length >= 2 && (
                <button
                  type="button"
                  className="dlc-pack-btn-compact"
                  disabled={allAdded}
                  style={allAdded ? { opacity: 0.6, cursor: 'default', background: 'rgba(34, 197, 94, 0.2)', borderColor: 'rgba(34, 197, 94, 0.4)' } : {}}
                  onClick={() => {
                    if (onAddDlc && unaddedDlcs.length > 0) {
                      const unitBundlePrice = Math.round(bundlePrice / dlcs.length);
                      unaddedDlcs.forEach((dlc, idx) => {
                        const thisPrice = (idx === unaddedDlcs.length - 1)
                          ? (bundlePrice - (unitBundlePrice * (dlcs.length - 1)))
                          : unitBundlePrice;

                        const dlcDisplayName = dlcNames[dlc.dlc_app_id] || dlc.name;
                        onAddDlc({
                          id: `dlc-${baseGame.appId}-${dlc.dlc_app_id}`,
                          productId: `dlc-${baseGame.appId}-${dlc.dlc_app_id}`,
                          name: `${dlcDisplayName}`,
                          baseGameName: baseGame.name,
                          baseGameAppId: baseGame.appId,
                          dlc_app_id: String(dlc.dlc_app_id),
                          dlcTitle: `Pack DLCs (${baseGame.name})`,
                          imageUrl: dlc.header_image || baseGame.imageUrl || null,
                          priceCLP: Math.max(500, thisPrice),
                          cantidad: 1,
                          quantity: 1,
                          isDlc: true,
                          isDigital: true
                        });
                      });
                    }
                  }}
                  title={allAdded ? 'Todos los DLCs ya están en el carrito' : `Añadir todos los ${dlcs.length} DLCs por ${renderPrice(bundlePrice)}`}
                >
                  {allAdded ? '✓ Pack en el carrito' : `⚡ Todo el Pack: ${renderPrice(bundlePrice)}`}
                </button>
              )}
            </div>

            {/* Tira compacta de precios en una sola línea */}
            <div className="dlc-upsell-promo-strip">
              <span>💡 <strong>Precios DLC:</strong> 1x {renderPrice(1000)} • 2x {renderPrice(1800)} • 3x {renderPrice(2500)} • <strong>Pack {dlcs.length >= 5 ? '5+' : `${dlcs.length}`}: {renderPrice(bundlePrice)}</strong></span>
            </div>

            {/* Grid de DLCs en cuadraditos pequeños */}
            <div className="dlc-upsell-grid-square">
              {visibleDlcs.map(dlc => {
                const isAdded = existingDlcAppIds.has(String(dlc.dlc_app_id));
                const dlcDisplayName = dlcNames[dlc.dlc_app_id] || dlc.name;

                return (
                  <div key={dlc.dlc_app_id} className={`dlc-card-square ${isAdded ? 'is-added' : ''}`}>
                    <div className="dlc-sq-thumb-wrap">
                      {dlc.header_image ? (
                        <img
                          src={dlc.header_image}
                          alt={dlcDisplayName}
                          className="dlc-sq-thumb"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      ) : (
                        <div className="dlc-sq-thumb-placeholder">🎮</div>
                      )}
                      <span className="dlc-sq-badge">DLC</span>
                    </div>

                    <div className="dlc-sq-name" title={dlcDisplayName}>
                      {dlcDisplayName}
                    </div>

                    <div className="dlc-sq-footer">
                      <span className="dlc-sq-price">
                        {renderPrice(dlc.price_clp || DLC_PRICE_UNIT)}
                      </span>
                      <button
                        type="button"
                        className={`dlc-sq-btn ${isAdded ? "added" : ""}`}
                        disabled={isAdded}
                        onClick={() => {
                          if (onAddDlc && !isAdded) {
                            onAddDlc({
                              id: `dlc-${baseGame.appId}-${dlc.dlc_app_id}`,
                              productId: `dlc-${baseGame.appId}-${dlc.dlc_app_id}`,
                              name: `${dlcDisplayName}`,
                              baseGameName: baseGame.name,
                              baseGameAppId: baseGame.appId,
                              dlc_app_id: String(dlc.dlc_app_id),
                              dlcTitle: `DLC de ${baseGame.name}`,
                              imageUrl: dlc.header_image || baseGame.imageUrl || null,
                              priceCLP: DLC_PRICE_UNIT,
                              cantidad: 1,
                              quantity: 1,
                              isDlc: true,
                              isDigital: true
                            });
                          }
                        }}
                      >
                        {isAdded ? "✓" : "+ Añadir"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Toggle para ver más / menos DLCs si son más de 4 */}
            {dlcs.length > 4 && (
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <button
                  type="button"
                  className="dlc-toggle-expand-btn"
                  onClick={() => toggleExpand(baseGame.appId)}
                >
                  {isExpanded
                    ? "▲ Ver menos DLCs"
                    : `▾ Ver los ${dlcs.length - 4} DLCs restantes de ${baseGame.name}`
                  }
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
