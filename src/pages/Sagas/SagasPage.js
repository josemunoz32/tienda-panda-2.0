import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useMoneda } from '../../context/MonedaContext';
import { db, auth } from '../../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { STEAM_SAGAS } from '../../utils/sagasData';
import { hasResellerBenefits } from '../../utils/userRoles';
import './SagasPage.css';

export default function SagasPage() {
  const { formatearPrecio } = useMoneda();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isReseller, setIsReseller] = useState(false);
  const [sagaPreviewModal, setSagaPreviewModal] = useState({ open: false, saga: null, selectedVipExtras: [] });

  const user = auth.currentUser;

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) setIsReseller(hasResellerBenefits(snap.data()));
    }).catch(() => {});
  }, [user?.uid]);

  const filteredSagas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return STEAM_SAGAS;
    return STEAM_SAGAS.filter(saga => {
      const matchName = saga.name.toLowerCase().includes(q);
      const matchGames = saga.games.some(g => g.toLowerCase().includes(q));
      const matchVip = (saga.vipExtras || []).some(v => v.name.toLowerCase().includes(q));
      return matchName || matchGames || matchVip;
    });
  }, [search]);

  const addSagaToCart = async (saga, selectedVipExtras = [], goToCheckout = true) => {
    if (!saga) return;
    const packId = `promo-${saga.key}-${Date.now()}`;
    const extraPrice = (selectedVipExtras || []).reduce((acc, curr) => acc + (curr.priceCLP || 8000), 0);
    const publicPriceCLP = (saga.priceCLP || 0) + extraPrice;
    const finalPriceCLP = isReseller ? Math.round(publicPriceCLP * 0.5) : publicPriceCLP;

    const vipText = selectedVipExtras.length > 0
      ? ` + Extras VIP: ${selectedVipExtras.map(v => v.name).join(', ')}`
      : '';

    const cartItem = {
      id: packId,
      productId: packId,
      isPromo: true,
      isSaga: true,
      plataforma: "steam",
      categoryId: "juegos-steam",
      categoryName: "Juegos Steam",
      isSteam: true,
      appId: saga.appId || null,
      name: `${saga.name} (${saga.games.join(" + ")})${vipText}`,
      priceCLP: finalPriceCLP,
      precioPublicoCLP: publicPriceCLP,
      priceUSD: finalPriceCLP / 900,
      isResellerPrice: isReseller,
      imageUrl: saga.image,
      cantidad: 1,
      games: saga.games,
      promoGames: [
        ...saga.games.map(t => ({ id: t, name: t, plataforma: "steam" })),
        ...(selectedVipExtras || []).map(v => ({ id: v.id, name: `${v.name} (VIP Extra)`, appId: v.appId || null, plataforma: "steam" }))
      ]
    };

    if (user) {
      await setDoc(doc(db, `users/${user.uid}/cart`, packId), cartItem);
    } else {
      let localCart = [];
      try {
        const stored = localStorage.getItem('guestCart');
        if (stored) localCart = JSON.parse(stored);
      } catch (e) {}
      localCart.push(cartItem);
      localStorage.setItem('guestCart', JSON.stringify(localCart));
      window.dispatchEvent(new Event('localCartUpdated'));
    }
    setSagaPreviewModal({ open: false, saga: null, selectedVipExtras: [] });
    if (goToCheckout) {
      navigate('/checkoutcarrito');
    }
  };

  return (
    <div className="sagas-page-container">
      <Helmet>
        <title>Sagas y Franquicias Legendarias Steam PC | Colecciones Completas - PandaStore</title>
        <meta name="description" content="Colecciones y sagas completas de videojuegos para Steam PC en PandaStore: Resident Evil, Call of Duty, Assassin's Creed, Dark Souls, Yakuza y más al mejor precio con entrega inmediata 24/7." />
        <meta name="keywords" content="sagas steam pc, coleccion resident evil pc, saga call of duty steam, saga assassins creed pc barato, franquicias videojuegos pc, sagas completas steam, pandastore" />
        <meta property="og:title" content="Sagas y Franquicias Legendarias Steam PC | PandaStore" />
        <meta property="og:description" content="Juega tus sagas favoritas completas en Steam PC con entrega inmediata 24/7 y modo historia completo." />
        <meta property="og:url" content="https://pandastoregaming.cl/sagas" />
        <meta property="og:image" content="https://pandastoregaming.cl/banner.png" />
        <meta name="twitter:title" content="Sagas y Franquicias Legendarias Steam PC | PandaStore" />
        <meta name="twitter:description" content="Colecciones completas de videojuegos para PC al mejor precio en PandaStore." />
        <meta name="twitter:image" content="https://pandastoregaming.cl/banner.png" />
        <link rel="canonical" href="https://pandastoregaming.cl/sagas" />
        <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Sagas y Franquicias Legendarias Steam PC",
          "description": "Colecciones y sagas completas de videojuegos para Steam PC.",
          "url": "https://pandastoregaming.cl/sagas",
          "isPartOf": { "@type": "VideoGameStore", "name": "PandaStore", "url": "https://pandastoregaming.cl" }
        })}
        </script>
      </Helmet>

      {/* Hero Header */}
      <div className="sagas-hero-banner">
        <div className="sagas-hero-title-badge">
          <span>🏆</span> COLECCIONES Y FRANQUICIAS STEAM
        </div>
        <h1 className="sagas-hero-heading">Sagas Legendarias Completa</h1>
        <p className="sagas-hero-sub">
          Disfruta de tus sagas favoritas con todos sus juegos en Modo Historia Completo. Elige tus promos base y suma lanzamientos VIP exclusivos.
        </p>
      </div>

      {/* Search Input */}
      <div className="sagas-search-wrap">
        <span className="sagas-search-icon">🔍</span>
        <input
          type="text"
          className="sagas-search-input"
          placeholder="Buscar saga o juego (ej. Resident Evil, Yakuza, Sonic, Assassin's Creed...)"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Grid of Sagas */}
      <div className="sagas-grid">
        {filteredSagas.map(saga => (
          <div
            key={saga.key}
            className="saga-card"
            onClick={() => setSagaPreviewModal({ open: true, saga, selectedVipExtras: [] })}
          >
            <div className="saga-card-cover-wrap">
              <img
                src={saga.image}
                alt={saga.name}
                className="saga-card-cover-img"
                onError={(e) => { e.target.src = '/banner22.jpg'; }}
              />
              <span className="saga-card-badge-count">🏆 {saga.games.length} Juegos</span>
              {saga.vipExtras && saga.vipExtras.length > 0 && (
                <span className="saga-card-badge-vip">⭐ VIP Extras</span>
              )}
            </div>

            <div className="saga-card-body">
              <div className="saga-card-title">{saga.name}</div>
              <div className="saga-card-games-preview">
                {saga.games.join(' · ')}
              </div>

              <div className="saga-card-footer">
                <span className="saga-card-price">{formatearPrecio(isReseller ? Math.round(saga.priceCLP * 0.5) : saga.priceCLP)}</span>
                <button
                  type="button"
                  className="saga-card-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSagaPreviewModal({ open: true, saga, selectedVipExtras: [] });
                  }}
                >
                  Ver Juegos
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Saga Modal */}
      {sagaPreviewModal.open && sagaPreviewModal.saga && (() => {
        const saga = sagaPreviewModal.saga;
        const selectedVipExtras = sagaPreviewModal.selectedVipExtras || [];
        const extraPrice = selectedVipExtras.reduce((acc, curr) => acc + (curr.priceCLP || 8000), 0);
        const publicPrice = (saga.priceCLP || 0) + extraPrice;
        const totalPrice = isReseller ? Math.round(publicPrice * 0.5) : publicPrice;

        const toggleVipExtra = (vipItem) => {
          const exists = selectedVipExtras.some(v => v.id === vipItem.id);
          let updated = [];
          if (exists) {
            updated = selectedVipExtras.filter(v => v.id !== vipItem.id);
          } else {
            updated = [...selectedVipExtras, vipItem];
          }
          setSagaPreviewModal(prev => ({ ...prev, selectedVipExtras: updated }));
        };

        return ReactDOM.createPortal(
          <div
            className="steam-saga-modal-backdrop"
            onClick={e => { if (e.target === e.currentTarget) setSagaPreviewModal({ open: false, saga: null, selectedVipExtras: [] }); }}
          >
            <div className="steam-saga-modal-container">
              {/* Header */}
              <div className="steam-saga-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '1.2rem' }}>🏆</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="steam-saga-modal-title">{saga.name}</div>
                    <div className="steam-saga-modal-subtitle">Colección completa · {saga.games.length} Juegos base incluidos</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span className="steam-saga-modal-price">{formatearPrecio(totalPrice)}</span>
                  <button
                    type="button"
                    className="steam-saga-modal-close"
                    onClick={() => setSagaPreviewModal({ open: false, saga: null, selectedVipExtras: [] })}
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* Banner */}
              <div className="steam-saga-modal-banner-wrap">
                <img
                  src={saga.image}
                  alt={saga.name}
                  className="steam-saga-modal-banner-img"
                  onError={(e) => { e.target.src = '/banner22.jpg'; }}
                />
                <div className="steam-saga-modal-banner-overlay">
                  <span className="steam-saga-modal-banner-badge">
                    🎮 Modo Historia Completo · Entrega Inmediata
                  </span>
                </div>
              </div>

              {/* Alert */}
              <div className="steam-saga-modal-alert">
                <span>✅</span>
                <span>Todos los juegos se juegan en <strong>Modo Historia Completo</strong> con acceso directo.</span>
              </div>

              {/* Base Games */}
              <div className="steam-saga-modal-games-list">
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#c4b5fd', textTransform: 'uppercase', marginBottom: 6 }}>
                  Juegos base incluidos ({saga.games.length}):
                </div>
                {saga.games.map((gameName, idx) => (
                  <div key={idx} className="steam-saga-game-row">
                    <div className="steam-saga-game-check">✓</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="steam-saga-game-name">{gameName}</div>
                      <div className="steam-saga-game-sub">Juego completo · PandaStore Launcher</div>
                    </div>
                    <span className="steam-saga-game-tag">Incluido</span>
                  </div>
                ))}
              </div>

              {/* VIP Extras */}
              {saga.vipExtras && saga.vipExtras.length > 0 && (
                <div className="steam-saga-vip-extras-wrap" style={{
                  margin: '12px 0',
                  padding: '12px 14px',
                  background: 'linear-gradient(135deg, rgba(255, 183, 3, 0.08), rgba(123, 47, 242, 0.12))',
                  border: '1.2px solid rgba(255, 183, 3, 0.4)',
                  borderRadius: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#ffb703', fontWeight: 900, fontSize: '0.82rem', textTransform: 'uppercase' }}>
                      ⭐ Extras VIP Opcionales (+ {formatearPrecio(isReseller ? 4000 : 8000)} c/u)
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#e0baff', fontWeight: 700 }}>
                      {selectedVipExtras.length} seleccionado(s)
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {saga.vipExtras.map((vip) => {
                      const isSelected = selectedVipExtras.some(v => v.id === vip.id);
                      return (
                        <div
                          key={vip.id}
                          onClick={() => toggleVipExtra(vip)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: isSelected ? 'linear-gradient(135deg, rgba(255, 183, 3, 0.25), rgba(162, 89, 255, 0.3))' : 'rgba(0,0,0,0.3)',
                            border: isSelected ? '1.5px solid #ffb703' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 18, height: 18, borderRadius: 4,
                              background: isSelected ? '#ffb703' : 'rgba(255,255,255,0.1)',
                              color: isSelected ? '#000' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 900,
                            }}>
                              ✓
                            </div>
                            <div>
                              <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.84rem' }}>{vip.name}</div>
                              <div style={{ color: '#ffb703', fontSize: '0.72rem', fontWeight: 700 }}>Estreno VIP Exclusivo</div>
                            </div>
                          </div>
                          <span style={{ color: isSelected ? '#00f5d4' : '#e0baff', fontWeight: 900, fontSize: '0.82rem' }}>
                            + {formatearPrecio(isReseller ? Math.round((vip.priceCLP || 8000) * 0.5) : (vip.priceCLP || 8000))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="steam-saga-modal-footer">
                <button
                  type="button"
                  className="steam-saga-btn-primary"
                  onClick={() => addSagaToCart(saga, selectedVipExtras, true)}
                >
                  <span>🛒</span>
                  <span>Comprar Colección Ahora · {formatearPrecio(totalPrice)}</span>
                </button>
                <button
                  type="button"
                  className="steam-saga-btn-secondary"
                  onClick={() => addSagaToCart(saga, selectedVipExtras, false)}
                >
                  + Agregar al carrito y seguir viendo
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
