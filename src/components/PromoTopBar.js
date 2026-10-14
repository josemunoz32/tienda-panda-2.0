import React, { useState } from "react";
import "./PromoTopBar.css";
import { Sparkles, Copy, Check, X } from "lucide-react";

const COUPON_CODE = "PANDA15";

export default function PromoTopBar() {
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(COUPON_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (dismissed) return null;

  return (
    <div className="promo-topbar-root" onClick={handleCopy} role="banner">
      <div className="promo-topbar-glow" />
      
      <div className="promo-topbar-content">
        <div className="promo-topbar-badge">
          <Sparkles size={13} className="promo-sparkle" />
          <span>15% OFF</span>
        </div>

        <div className="promo-topbar-text">
          <span className="promo-label">CUPÓN EXCLUSIVO:</span>
          <div className="coupon-code-pill">
            <span className="coupon-highlight">{COUPON_CODE}</span>
          </div>
        </div>

        <button 
          className={`promo-topbar-copy-btn ${copied ? "copied" : ""}`} 
          onClick={handleCopy}
          aria-label="Copiar cupón de descuento"
        >
          {copied ? (
            <>
              <Check size={13} strokeWidth={3} />
              <span>¡COPIADO!</span>
            </>
          ) : (
            <>
              <Copy size={13} strokeWidth={2.2} />
              <span>COPIAR</span>
            </>
          )}
        </button>
      </div>

      <button
        className="promo-topbar-close"
        onClick={(e) => {
          e.stopPropagation();
          setDismissed(true);
        }}
        aria-label="Cerrar barra promocional"
      >
        <X size={15} strokeWidth={2.2} />
      </button>
    </div>
  );
}
