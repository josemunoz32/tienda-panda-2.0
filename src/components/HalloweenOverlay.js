import React from 'react';
import './HalloweenOverlay.css';

// Componente Halloween: Extensión temática formal del header.
export default function HalloweenOverlay() {
  
  // Velas: Siluetas estáticas para replicar la decoración del banner
  const candles = [
    { top: '80vh', left: '10vw', size: 100, delay: 0.1, rotation: -5 },
    { top: '75vh', right: '15vw', size: 80, delay: 0.2, rotation: 5 },
    { top: '65vh', left: '25vw', size: 90, delay: 0.3, rotation: 2 },
  ];

  // Líneas luminosas tipo neón
  const neonLines = Array.from({ length: 5 }).map((_, i) => (
    <div
      className="neon-line"
      style={{
        left: `${10 + i * 18}vw`,
        top: '0',
        height: '100vh',
        animationDelay: `${i * 2}s`,
      }}
      key={`neonline-${i}`}
    />
  ));

  const renderCandles = () => {
    return candles.map((c, i) => (
      <div 
        className="candle-silhouette" 
        style={{ 
          top: c.top, 
          left: c.left, 
          right: c.right,
          width: `${c.size}px`, 
          height: `${c.size * 2}px`, // Vela alta
          transform: `rotate(${c.rotation}deg)`,
          animationDelay: `${c.delay}s` 
        }} 
        key={`candle-${i}`}
        aria-hidden="true"
      >
        <div className="candle-base" />
        <div className="candle-flame" />
      </div>
    ));
  };
    
  return (
    <div
      className="halloween-overlay"
      aria-hidden="true"
      style={{
        backgroundImage: "url('/fondo_Halloween.jpg')",
        backgroundPosition: 'center center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Líneas luminosas tipo neón */}
      {neonLines}

      {/* Telarañas Sutiles - Posicionadas estratégicamente */}
      <div className="web-sutil web-bottom-left" />
      <div className="web-sutil web-bottom-right" />

      {/* Velas - Extensión de la decoración del banner */}
      {renderCandles()}

      {/* Niebla de Ambiente Sutil (Para dar profundidad al color morado) */}
      <div className="fog-ambient" />
    </div>
  );
}