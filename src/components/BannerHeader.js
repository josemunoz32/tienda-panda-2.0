/*
  BannerHeader.js
  Header visualmente atractivo y profesional con imagen de fondo/banner, sticky y responsivo.
  Incluye el nombre "Panda Store" centrado, íconos de carrito, usuario y favoritos, y menú hamburguesa.
*/


import React from "react";
import { Link } from "react-router-dom";
import "./BannerHeader.css";
import { useMoneda } from "../context/MonedaContext";

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

export default function BannerHeader({
  user,
  onMenuClick,
  onCartClick,
  onFavClick,
  cartCount,
  favCount,
  favOpen,
  cartOpen,
  cartItems = [],
  favItems = []
}) {
  const { moneda, setMoneda } = useMoneda();
  // Resalta iconos si los menús están abiertos
  const isFavOpen = !!favOpen;
  const isCartOpen = !!cartOpen;
  return (
    <header className="banner-header" style={{
      position: 'sticky',
      top: 0,
      left: 0,
      width: '100vw',
      zIndex: 100,
      overflow: 'hidden',
      minHeight: 320,
      boxShadow: '0 2px 16px #0002',
      background: '#4a1a8a',
      backdropFilter: 'blur(2px)',
      transition: 'box-shadow .2s',
    }}>
      <style>{`
        @media (max-width: 700px) {
          .banner-header {
            min-height: 90px !important;
          }
          .banner-header-img {
            height: 90px !important;
          }
        }
      `}</style>
      <img
        src="/banner.png"
        alt="Banner Panda Store"
        className="banner-header-img"
        style={{
          width: '100vw',
          height: '320px',
          objectFit: 'cover',
          objectPosition: 'center center',
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 0,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
      <div className="banner-header-inner" style={{position:'relative',zIndex:1}}>
        <div className="banner-header-left">
          <button className="banner-header-hamburger" onClick={onMenuClick} aria-label="Abrir menú">
            <span className="material-icons">menu</span>
          </button>
        </div>
        {/* Selector de moneda flotante, centrado arriba, atractivo y responsivo */}
        <div className="banner-header-currency-float" style={{
          position:'absolute',
          left:'50%',
          top:8,
          transform:'translateX(-50%)',
          zIndex:10,
          pointerEvents:'auto',
          display:'flex',
          justifyContent:'center',
          width:'auto',
        }}>
          <style>{`
            @media (max-width: 600px) {
              .banner-header-currency-float {
                top: 2px !important;
              }
              .banner-header-currency-float select {
                font-size: 12px !important;
                padding: 1.5px 7px !important;
                min-width: 44px !important;
                border-radius: 10px !important;
              }
              .banner-header-badge {
                font-size: 9px !important;
                min-width: 11px !important;
                height: 11px !important;
                padding: 0 2px !important;
                top: -2px !important;
                right: -2px !important;
                background: #00c853 !important;
                border: 1px solid #fff !important;
                box-shadow: 0 1px 3px #0004 !important;
                font-weight: bold !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }
              .banner-header-icon.unified-icon {
                font-size: 16px !important;
                width: 20px !important;
                height: 20px !important;
                min-width: 20px !important;
                min-height: 20px !important;
                padding: 0 !important;
              }
            }
          `}</style>
          <select value={moneda} onChange={e => setMoneda(e.target.value)}
            style={{
              fontSize:16,
              padding:'5px 16px',
              borderRadius:18,
              border:'none',
              background:'rgba(255,255,255,0.93)',
              fontWeight:700,
              boxShadow:'0 2px 10px #0002',
              minWidth:80,
              outline:'none',
              color:'#222',
              letterSpacing:1,
              textAlign:'center',
              transition:'box-shadow .2s',
            }}
            className="banner-header-currency-select"
          >
            <option value="CLP">CLP</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div className="banner-header-right">
          <div className="banner-header-actions" style={{display:'flex',gap:10,background:'none',boxShadow:'none'}}>
            <button
              className="banner-header-icon unified-icon"
              onClick={() => onFavClick && onFavClick()}
              aria-label="Favoritos"
              style={{
                position: 'relative',
                fontSize: 24,
                width: 36,
                height: 36,
                minWidth: 36,
                minHeight: 36,
                padding: 0,
                background: 'none',
                border: 'none',
                borderRadius: '50%',
                boxShadow: 'none',
                outline: 'none',
                transition: 'background 0.18s, border 0.18s, box-shadow 0.18s',
              }}
            >
              <span style={{fontSize:26,lineHeight:1,verticalAlign:'middle',background:'none',boxShadow:'none'}}>⭐</span>
              {favCount > 0 && (
                <span className="banner-header-badge" style={{position:'absolute',top:-7,right:-7,background:'#43a047',color:'#fff',borderRadius:'50%',fontSize:13,minWidth:18,padding:'0 5px',fontWeight:700,display:'inline-block',boxShadow:'0 1px 4px #0002'}}>{favCount}</span>
              )}
            </button>
            <button
              className="banner-header-icon unified-icon"
              onClick={() => onCartClick && onCartClick()}
              aria-label="Carrito"
              style={{
                position: 'relative',
                fontSize: 24,
                width: 36,
                height: 36,
                minWidth: 36,
                minHeight: 36,
                padding: 0,
                background: 'none',
                border: 'none',
                borderRadius: '50%',
                boxShadow: 'none',
                outline: 'none',
                transition: 'background 0.18s, border 0.18s, box-shadow 0.18s',
              }}
            >
              <span style={{fontSize:26,lineHeight:1,verticalAlign:'middle',background:'none',boxShadow:'none'}}>🛒</span>
              {cartCount > 0 && (
                <span className="banner-header-badge" style={{position:'absolute',top:-7,right:-7,background:'#43a047',color:'#fff',borderRadius:'50%',fontSize:13,minWidth:18,padding:'0 5px',fontWeight:700,display:'inline-block',boxShadow:'0 1px 4px #0002'}}>{cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
