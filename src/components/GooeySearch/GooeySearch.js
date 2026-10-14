import React, { useRef } from 'react';
import styled from 'styled-components';

/**
 * GooeySearch Component (Fused All-in-One)
 * Everything fused inside the animated gooey search capsule:
 * [ 🔍 Icon ] [ Input Field ] [ ✕ Clear ] [ ⚡ Filtros (badge) ] [ 🚀 Buscar ]
 * Full responsive, zero stray buttons, cyber neon palette (#a259ff, #00f5d4, #ff2a6d).
 */
const GooeySearch = ({
  value = '',
  onChange,
  onKeyDown,
  onSearch,
  onClear,
  placeholder = 'Buscar videojuegos...',
  onOpenFilterModal,
  activeFilterCount = 0,
  totalResults = null,
  isFiltered = false,
  activeFilterLabel = null,
  onClearSpecificFilter = null,
  className = '',
}) => {
  const inputRef = useRef(null);

  const handleClearText = () => {
    if (onChange) onChange({ target: { value: '' } });
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDownInternal = (e) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(value);
    }
    if (onKeyDown) onKeyDown(e);
  };

  return (
    <StyledWrapper className={`gooey-search-wrapper ${className}`}>
      {/* FUSED GOOEY SEARCH CAPSULE */}
      <div className="search-orb-container">
        {/* Gooey Blobs Animated Background */}
        <div className="gooey-background-layer" aria-hidden="true">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
          <div className="blob-bridge" />
        </div>

        {/* The Glassmorphism Input Overlay with ALL controls fused inside */}
        <div className="input-overlay">
          {/* Left search icon */}
          <div
            className="search-icon-wrapper"
            onClick={() => onSearch && onSearch(value)}
            title="Buscar"
            role="button"
            tabIndex={0}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
              <circle cx={11} cy={11} r={8} />
              <line x1={21} y1={21} x2="16.65" y2="16.65" />
            </svg>
          </div>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            className="modern-input"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDownInternal}
            autoComplete="off"
            spellCheck="false"
          />

          {/* Clear text button (✕) */}
          {value && value.length > 0 && (
            <button
              type="button"
              className="clear-icon-btn"
              onClick={handleClearText}
              title="Borrar texto"
              aria-label="Borrar texto"
            >
              ✕
            </button>
          )}

          {/* FUSED FILTROS BUTTON (Inside the capsule) */}
          {onOpenFilterModal && (
            <button
              type="button"
              className={`fused-filter-btn ${activeFilterCount > 0 ? 'has-active' : ''}`}
              onClick={onOpenFilterModal}
              title="Abrir filtros de plataforma y género"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
                <line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
              <span className="btn-text">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="filter-badge-counter">{activeFilterCount}</span>
              )}
            </button>
          )}

          {/* FUSED BUSCAR BUTTON (Inside the capsule) */}
          {onSearch && (
            <button
              type="button"
              className="fused-search-btn"
              onClick={() => onSearch(value)}
              title="Realizar búsqueda"
            >
              <span className="btn-text">Buscar</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}

          {/* Bottom neon focus glow line */}
          <div className="focus-indicator" />
        </div>

        {/* SVG Filter Definition */}
        <svg className="gooey-svg-filter" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <filter id="enhanced-goo-search">
              <feGaussianBlur in="SourceGraphic" stdDeviation={10} result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="goo" />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>
      </div>

      {/* COMPACT ACTIVE FILTERS BAR (Only shown if filtered or results counted) */}
      {(isFiltered || (value && value.trim()) || activeFilterCount > 0) && (
        <div className="active-filters-strip">
          {totalResults !== null && (
            <span className="results-count-badge">
              <strong>{totalResults}</strong> {totalResults === 1 ? 'juego' : 'juegos'}
            </span>
          )}

          {activeFilterLabel && (
            <span className="active-filter-chip">
              <span>{activeFilterLabel}</span>
              {onClearSpecificFilter && (
                <button
                  type="button"
                  className="chip-remove-btn"
                  onClick={onClearSpecificFilter}
                  title="Quitar este filtro"
                >
                  ✕
                </button>
              )}
            </span>
          )}

          {onClear && (
            <button
              type="button"
              className="clear-all-btn"
              onClick={onClear}
              title="Restablecer todos los filtros"
            >
              Limpiar todo ✕
            </button>
          )}
        </div>
      )}
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  width: 100%;
  max-width: 680px;
  margin: 12px auto 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 25;
  box-sizing: border-box;
  padding: 0 8px;

  /* --- SEARCH ORB CONTAINER --- */
  .search-orb-container {
    position: relative;
    width: 100%;
    height: 62px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    font-family: 'Poppins', 'Montserrat', system-ui, -apple-system, sans-serif;
  }

  /* --- GOOEY BACKGROUND WITH BLOBS --- */
  .gooey-background-layer {
    position: absolute;
    top: -4px;
    left: 2%;
    right: 2%;
    bottom: -4px;
    filter: url("#enhanced-goo-search");
    z-index: 1;
    pointer-events: none;
    opacity: 0.88;
    transition: opacity 0.4s ease;
  }

  .blob {
    position: absolute;
    border-radius: 50%;
    transition: all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .blob-1 {
    width: 140px;
    height: 58px;
    left: 0;
    top: 2px;
    background: linear-gradient(135deg, #7b2ff2, #a259ff);
    animation: blob-float 6s infinite alternate ease-in-out;
  }

  .blob-2 {
    width: 140px;
    height: 58px;
    right: 0;
    top: 2px;
    background: linear-gradient(135deg, #00f5d4, #00bbf9);
    animation: blob-float 7.5s infinite alternate-reverse ease-in-out;
  }

  .blob-3 {
    width: 220px;
    height: 58px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #ff2a6d, #9d4edd);
    opacity: 0.82;
  }

  .blob-bridge {
    position: absolute;
    height: 38px;
    width: 76%;
    left: 12%;
    top: 12px;
    background: linear-gradient(90deg, #7b2ff2, #00f5d4);
    opacity: 0.9;
    border-radius: 40px;
  }

  /* --- INPUT OVERLAY: FUSED CAPSULE --- */
  .input-overlay {
    position: relative;
    z-index: 10;
    width: 100%;
    height: 52px;
    background: rgba(14, 8, 36, 0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1.6px solid rgba(162, 89, 255, 0.4);
    border-radius: 30px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 6px 3px 14px;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.06) inset;
    transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
    box-sizing: border-box;
  }

  .search-icon-wrapper {
    color: #00f5d4;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: transform 0.2s ease, color 0.2s ease;
  }

  .search-icon-wrapper:hover {
    transform: scale(1.1);
    color: #ffffff;
  }

  .search-icon {
    width: 19px;
    height: 19px;
    filter: drop-shadow(0 0 6px rgba(0, 245, 212, 0.6));
  }

  .modern-input {
    background: transparent;
    border: none;
    outline: none;
    flex: 1;
    min-width: 60px;
    color: #ffffff;
    font-size: 0.94rem;
    font-weight: 500;
    padding: 0 6px;
    letter-spacing: 0.01em;
    font-family: inherit;
  }

  .modern-input::placeholder {
    color: rgba(203, 213, 225, 0.62);
    font-weight: 400;
    font-size: 0.88rem;
    text-overflow: ellipsis;
  }

  .clear-icon-btn {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: #cbd5e1;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s ease;
  }

  .clear-icon-btn:hover {
    background: rgba(255, 42, 109, 0.4);
    color: #ffffff;
    transform: scale(1.1);
  }

  /* --- FUSED FILTROS BUTTON (Inside the bar) --- */
  .fused-filter-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgba(162, 89, 255, 0.16);
    border: 1.2px solid rgba(162, 89, 255, 0.45);
    color: #ffffff;
    height: 38px;
    padding: 0 12px;
    border-radius: 20px;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.22s ease;
    flex-shrink: 0;
    font-family: inherit;
  }

  .fused-filter-btn:hover {
    background: rgba(162, 89, 255, 0.32);
    border-color: #a259ff;
    box-shadow: 0 0 14px rgba(162, 89, 255, 0.45);
    transform: translateY(-1px);
  }

  .fused-filter-btn.has-active {
    background: rgba(0, 245, 212, 0.18);
    border-color: #00f5d4;
    color: #00f5d4;
    box-shadow: 0 0 14px rgba(0, 245, 212, 0.35);
  }

  .filter-badge-counter {
    background: #00f5d4;
    color: #0c0620;
    font-size: 0.72rem;
    font-weight: 900;
    padding: 1px 6px;
    border-radius: 10px;
    line-height: 1.2;
    box-shadow: 0 0 8px rgba(0, 245, 212, 0.8);
  }

  /* --- FUSED BUSCAR BUTTON (Inside the bar) --- */
  .fused-search-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: linear-gradient(135deg, #7b2ff2, #a259ff);
    border: none;
    color: #ffffff;
    height: 38px;
    padding: 0 14px;
    border-radius: 20px;
    font-size: 0.84rem;
    font-weight: 800;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.22s ease;
    flex-shrink: 0;
    box-shadow: 0 4px 14px rgba(123, 47, 242, 0.35);
    font-family: inherit;
  }

  .fused-search-btn:hover {
    background: linear-gradient(135deg, #8b3ff2, #b46fff);
    box-shadow: 0 0 18px rgba(162, 89, 255, 0.6);
    transform: translateY(-1px);
  }

  /* --- FOCUS STATES --- */
  .focus-indicator {
    position: absolute;
    bottom: 0;
    left: 50%;
    width: 0%;
    height: 2.5px;
    background: linear-gradient(90deg, #00f5d4, #a259ff, #ff2a6d);
    transform: translateX(-50%);
    transition: width 0.4s ease;
    border-radius: 3px;
    box-shadow: 0 0 14px rgba(0, 245, 212, 0.8);
  }

  .search-orb-container:focus-within .input-overlay {
    transform: translateY(-2px);
    background: rgba(18, 10, 46, 0.95);
    border-color: rgba(0, 245, 212, 0.6);
    box-shadow:
      0 16px 40px rgba(0, 0, 0, 0.5),
      0 0 22px rgba(0, 245, 212, 0.3),
      0 0 35px rgba(162, 89, 255, 0.25);
  }

  .search-orb-container:focus-within .focus-indicator {
    width: 60%;
  }

  .search-orb-container:focus-within .blob-1 {
    transform: scale(1.12) translateX(-12px);
    filter: brightness(1.25);
  }

  .search-orb-container:focus-within .blob-2 {
    transform: scale(1.12) translateX(12px);
    filter: brightness(1.25);
  }

  /* --- COMPACT ACTIVE FILTERS STRIP --- */
  .active-filters-strip {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 8px;
    padding: 0 4px;
    width: 100%;
    justify-content: center;
  }

  .results-count-badge {
    font-size: 0.76rem;
    color: rgba(203, 213, 225, 0.85);
    background: rgba(162, 89, 255, 0.12);
    border: 1px solid rgba(162, 89, 255, 0.25);
    border-radius: 16px;
    padding: 2px 9px;
  }

  .results-count-badge strong {
    color: #00f5d4;
    font-weight: 800;
  }

  .active-filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 245, 212, 0.15);
    border: 1px solid rgba(0, 245, 212, 0.4);
    color: #00f5d4;
    padding: 2px 10px;
    border-radius: 16px;
    font-size: 0.76rem;
    font-weight: 700;
  }

  .chip-remove-btn {
    background: none;
    border: none;
    color: #00f5d4;
    cursor: pointer;
    font-size: 10px;
    padding: 0;
    line-height: 1;
    display: flex;
    align-items: center;
    opacity: 0.8;
  }

  .chip-remove-btn:hover {
    opacity: 1;
    color: #ff2a6d;
  }

  .clear-all-btn {
    background: rgba(255, 42, 109, 0.12);
    border: 1px solid rgba(255, 42, 109, 0.35);
    color: #ff5c8a;
    font-size: 0.74rem;
    font-weight: 700;
    padding: 2px 10px;
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .clear-all-btn:hover {
    background: rgba(255, 42, 109, 0.28);
    color: #ffffff;
    box-shadow: 0 0 10px rgba(255, 42, 109, 0.4);
  }

  /* --- KEYFRAMES --- */
  @keyframes blob-float {
    0% {
      border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
      transform: translate(0, 0);
    }
    50% {
      border-radius: 60% 40% 50% 50% / 30% 60% 40% 70%;
      transform: translate(4px, -4px);
    }
    100% {
      border-radius: 50% 50% 30% 70% / 60% 40% 60% 40%;
      transform: translate(-4px, 4px);
    }
  }

  .gooey-svg-filter {
    position: absolute;
    width: 0;
    height: 0;
    pointer-events: none;
  }

  /* --- FULL RESPONSIVE --- */
  @media (max-width: 600px) {
    .search-orb-container {
      height: 56px;
    }
    .input-overlay {
      height: 48px;
      padding: 2px 4px 2px 10px;
      gap: 4px;
    }
    .modern-input {
      font-size: 0.86rem;
      padding: 0 4px;
    }
    .modern-input::placeholder {
      font-size: 0.8rem;
    }
    .fused-filter-btn {
      height: 34px;
      padding: 0 9px;
      font-size: 0.78rem;
    }
    .fused-search-btn {
      height: 34px;
      padding: 0 10px;
      font-size: 0.8rem;
    }
    .fused-search-btn .btn-text {
      display: none;
    }
  }

  @media (max-width: 400px) {
    .fused-filter-btn .btn-text {
      display: none;
    }
    .fused-filter-btn {
      padding: 0 8px;
    }
  }
`;

export default GooeySearch;
