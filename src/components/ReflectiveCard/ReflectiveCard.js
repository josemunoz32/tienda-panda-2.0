import React, { useEffect, useRef } from 'react';
import './ReflectiveCard.css';
import { Coins, Sparkles, ShieldCheck, Gamepad2 } from 'lucide-react';
import { useMoneda } from '../../context/MonedaContext';

const ReflectiveCard = ({
  blurStrength = 12,
  color = 'white',
  metalness = 1,
  roughness = 0.4,
  overlayColor = 'rgba(26, 10, 60, 0.45)',
  displacementStrength = 20,
  noiseScale = 1,
  specularConstant = 1.2,
  grayscale = 0.2,
  glassDistortion = 10,
  categoriaName = 'Juegos Digitales',
  className = '',
  style = {}
}) => {
  const videoRef = useRef(null);
  const { moneda, setMoneda } = useMoneda();

  useEffect(() => {
    let stream = null;

    const startWebcam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        // Webcam optional fallback
      }
    };

    startWebcam();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const baseFrequency = 0.03 / Math.max(0.1, noiseScale);
  const saturation = 1 - Math.max(0, Math.min(1, grayscale));

  const cssVariables = {
    '--blur-strength': `${blurStrength}px`,
    '--metalness': metalness,
    '--roughness': roughness,
    '--overlay-color': overlayColor,
    '--text-color': color,
    '--saturation': saturation
  };

  return (
    <div className={`reflective-card-container ${className}`} style={{ ...style, ...cssVariables }}>
      <svg className="reflective-svg-filters" aria-hidden="true">
        <defs>
          <filter id="metallic-displacement" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="turbulence" baseFrequency={baseFrequency} numOctaves="2" result="noise" />
            <feColorMatrix in="noise" type="luminanceToAlpha" result="noiseAlpha" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={displacementStrength}
              xChannelSelector="R"
              yChannelSelector="G"
              result="rippled"
            />
            <feSpecularLighting
              in="noiseAlpha"
              surfaceScale={displacementStrength}
              specularConstant={specularConstant}
              specularExponent="20"
              lightingColor="#a259ff"
              result="light"
            >
              <fePointLight x="0" y="0" z="300" />
            </feSpecularLighting>
            <feComposite in="light" in2="rippled" operator="in" result="light-effect" />
            <feBlend in="light-effect" in2="rippled" mode="screen" result="metallic-result" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="solidAlpha"
            />
            <feMorphology in="solidAlpha" operator="erode" radius="45" result="erodedAlpha" />
            <feGaussianBlur in="erodedAlpha" stdDeviation="10" result="blurredMap" />
            <feComponentTransfer in="blurredMap" result="glassMap">
              <feFuncA type="linear" slope="0.5" intercept="0" />
            </feComponentTransfer>
            <feDisplacementMap
              in="metallic-result"
              in2="glassMap"
              scale={glassDistortion}
              xChannelSelector="A"
              yChannelSelector="A"
              result="final"
            />
          </filter>
        </defs>
      </svg>

      <video ref={videoRef} autoPlay playsInline muted className="reflective-video" />

      {/* Fallback purple animated ambient bg if no webcam */}
      <div className="reflective-ambient-bg" />
      <div className="reflective-noise" />
      <div className="reflective-sheen" />
      <div className="reflective-border" />

      <div className="reflective-content">
        {/* Header */}
        <div className="reflective-card-header">
          <div className="reflective-badge">
            <ShieldCheck size={14} className="reflective-icon-purple" />
            <span>PANDASTORE VIP</span>
          </div>
          <div className="reflective-cat-tag">
            <Gamepad2 size={16} />
            <span>{categoriaName}</span>
          </div>
        </div>

        {/* Body: Moneda Selector */}
        <div className="reflective-card-body">
          <div className="reflective-section-title">
            <Coins size={18} className="reflective-gold-icon" />
            <span>ELIGE TU MONEDA</span>
          </div>

          <div className="reflective-currency-toggle">
            <button
              className={`currency-pill ${moneda === 'CLP' ? 'active' : ''}`}
              onClick={() => setMoneda('CLP')}
            >
              <span className="flag">🇨🇱</span>
              <span className="currency-code">CLP ($)</span>
            </button>
            <button
              className={`currency-pill ${moneda === 'USD' ? 'active' : ''}`}
              onClick={() => setMoneda('USD')}
            >
              <span className="flag">🇺🇸</span>
              <span className="currency-code">USD ($)</span>
            </button>
          </div>
        </div>

        {/* Footer: Soporte Oficial */}
        <div className="reflective-card-footer">
          <div className="reflective-ig-info">
            <span className="reflective-ig-label">SOPORTE Y COMUNIDAD</span>
            <span className="reflective-ig-handle">Atención 24/7 Oficial</span>
          </div>
          <a
            href="https://t.me/NintendoChile2"
            target="_blank"
            rel="noopener noreferrer"
            className="reflective-ig-btn"
            title="Ir a Telegram"
          >
            <ShieldCheck size={20} color="#a259ff" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default ReflectiveCard;
