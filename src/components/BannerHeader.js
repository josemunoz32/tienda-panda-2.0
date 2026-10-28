/*
  BannerHeader.js
  Header visualmente atractivo y profesional con nuevo banner optimizado (18 de septiembre).
  100% responsivo, con presencia majestuosa, iconos vectoriales profesionales y scroll inteligente.
*/

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./BannerHeader.css";
import { useMoneda } from "../context/MonedaContext";
import bannerHalloween from "../assets/halloween/banner-halloween-panoramico.webp";
import { Menu, Heart, ShoppingBag, User as UserIcon, Key } from "lucide-react";

export default function BannerHeader({
  user,
  isDistributor = false,
  onMenuClick,
  onCartClick,
  onFavClick,
  onProfileClick,
  cartCount,
  favCount,
  favOpen,
  cartOpen,
  profileOpen,
}) {
  const navigate = useNavigate();
  const { pais, setPais, infoPais, PAISES_CONFIG } = useMoneda();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // El banner se mantiene fijo y visible permanentemente sin ocultarse en scroll
  useEffect(() => {
    // Mantener visible permanentemente
  }, []);

  // Cerrar dropdown de moneda al hacer click afuera
  useEffect(() => {
    function handleOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [dropdownOpen]);

  const isProfileOpen = !!profileOpen;

  return (
    <header className="banner-header">
      {/* Contenedor del Banner - Escala generosa y presencia completa */}
      <div className="banner-header-media">
        {/* Banner principal nítido */}
        <img
          src={bannerHalloween}
          alt="Panda Store: especial de Halloween"
          className="banner-header-img"
          fetchPriority="high"
          decoding="async"
          width="1920"
          height="289"
        />
        {/* Gradiente sutil arriba para legibilidad perfecta de los controles */}
        <div className="banner-header-top-vignette" />
      </div>

      {/* Barra de controles sobre el banner (menú, moneda, acciones) */}
      <div className="banner-header-inner">
        {/* Izquierda: Botón Menú Hamburguesa */}
        <div className="banner-header-left">
          <button className="banner-header-hamburger" onClick={onMenuClick} aria-label="Abrir menú">
            <Menu size={22} color="#ffffff" strokeWidth={2.4} />
          </button>
        </div>

        {/* Centro: Selector flotante de País/Moneda */}
        <div className="banner-header-currency-float">
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="banner-currency-btn"
              aria-label="Seleccionar país/moneda"
            >
              <img
                src={`https://flagcdn.com/w40/${infoPais.codigo.toLowerCase()}.png`}
                alt={infoPais.nombre}
                className="banner-currency-flag"
              />
              <span className="banner-currency-code">{infoPais.moneda}</span>
              <span className="banner-currency-arrow">▼</span>
            </button>

            {dropdownOpen && (
              <div className="banner-currency-dropdown">
                {PAISES_CONFIG.map(p => (
                  <button
                    key={p.codigo}
                    onClick={() => { setPais(p.codigo); setDropdownOpen(false); }}
                    className={`banner-currency-option ${pais === p.codigo ? 'active' : ''}`}
                  >
                    <img
                      src={`https://flagcdn.com/w40/${p.codigo.toLowerCase()}.png`}
                      alt={p.nombre}
                      className="banner-currency-option-flag"
                    />
                    <span className="banner-currency-option-name">{p.nombre}</span>
                    <span className="banner-currency-option-coin">{p.moneda}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Derecha: Favoritos, Carrito y Perfil */}
        <div className="banner-header-right">
          <div className="banner-header-actions">
            {/* Botón Acceso Rápido Distribuidor */}
            {isDistributor && (
              <button
                className="banner-header-distributor-btn"
                onClick={() => navigate("/portal-distribuidor")}
                title="Acceder al Portal Distribuidor Steam"
                aria-label="Portal Distribuidor Steam"
              >
                <Key size={14} strokeWidth={2.4} className="banner-distributor-icon" />
                <span className="banner-distributor-text">Portal B2B</span>
              </button>
            )}

            {/* Favoritos */}
            <button
              className="banner-header-icon unified-icon"
              onClick={() => onFavClick && onFavClick()}
              aria-label="Favoritos"
            >
              <Heart 
                size={19} 
                strokeWidth={2.2} 
                color={favCount > 0 ? "#ff4757" : "#ffffff"} 
                fill={favCount > 0 ? "#ff4757" : "none"} 
              />
              {favCount > 0 && (
                <span className="banner-header-badge">{favCount}</span>
              )}
            </button>

            {/* Carrito */}
            <button
              className="banner-header-icon unified-icon"
              onClick={() => onCartClick && onCartClick()}
              aria-label="Carrito"
            >
              <ShoppingBag size={19} strokeWidth={2.2} color="#ffffff" />
              {cartCount > 0 && (
                <span className="banner-header-badge">{cartCount}</span>
              )}
            </button>

            {/* Perfil */}
            <button
              className={`banner-header-icon unified-icon banner-profile-btn ${isProfileOpen ? 'profile-open' : ''}`}
              onClick={() => onProfileClick && onProfileClick()}
              aria-label="Perfil"
            >
              {user && user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Perfil"
                  className="banner-profile-avatar"
                />
              ) : (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserIcon size={19} strokeWidth={2.2} color="#ffffff" />
                  <span
                    title="Modo Invitado Activo"
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -3,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#10b981',
                      border: '1.5px solid #140d2b',
                      boxShadow: '0 0 6px #10b981'
                    }}
                  />
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
