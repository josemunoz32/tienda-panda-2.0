import React from 'react';
import './Loader.css';
import pandaLogo from '../../assets/logos/miicono.webp';

const Loader = ({
  text = "Cargando...",
  subtext = "PandaStore",
  fullScreen = true,
  showLogo = true,
  size = 200,
  minHeight
}) => {
  const letters = (text || "Cargando...").split('');

  return (
    <div
      className={`panda-loader ${fullScreen ? 'panda-loader--full' : 'panda-loader--inline'}`}
      style={!fullScreen && minHeight ? { minHeight } : undefined}
      role="status"
      aria-live="polite"
    >
      <div className="loader-container">
        <div className="loader-wrapper" style={{ width: `${size}px`, height: `${size}px` }}>
          <div className="loader-content">
            {showLogo && (
              <div className="loader-logo-wrap">
                <img src={pandaLogo} alt="Panda Store" className="loader-logo-img" width="77" height="77" decoding="async" />
              </div>
            )}
            <div className="loader-text-row">
              {letters.map((char, index) => (
                <span
                  key={index}
                  className="loader-letter"
                  style={{ animationDelay: `${index * 0.09}s` }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
            </div>
          </div>
          <div className="loader" />
        </div>
        {subtext && <div className="loader-subtext">{subtext}</div>}
      </div>
    </div>
  );
};

export default Loader;
