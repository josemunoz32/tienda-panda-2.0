import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import "./ImageZoomModal.css";

export default function ImageZoomModal({ src, title, onClose }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const posStartRef = useRef({ x: 0, y: 0 });

  // Prevenir scroll en body al abrir el modal
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleZoomIn = (e) => {
    if (e) e.stopPropagation();
    setScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = (e) => {
    if (e) e.stopPropagation();
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPos({ x: 0, y: 0 });
      return next;
    });
  };

  const handleReset = (e) => {
    if (e) e.stopPropagation();
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  // ── Dragging handlers (Mouse & Touch) ──
  const startDrag = (clientX, clientY) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: clientX, y: clientY };
    posStartRef.current = { ...pos };
  };

  const moveDrag = (clientX, clientY) => {
    if (!isDragging || scale <= 1) return;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    setPos({
      x: posStartRef.current.x + dx,
      y: posStartRef.current.y + dy,
    });
  };

  const endDrag = () => {
    setIsDragging(false);
  };

  // Mouse Events
  const handleMouseDown = (e) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      moveDrag(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => endDrag();

  // Touch Events
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (isDragging && e.touches.length === 1) {
      moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => endDrag();

  // Double click / Tap to toggle 2x zoom
  const handleImageClick = (e) => {
    e.stopPropagation();
    if (scale === 1) {
      setScale(2.2);
    } else {
      handleReset();
    }
  };

  return ReactDOM.createPortal(
    <div className="img-modal-portal-overlay" onClick={onClose}>
      {/* ── BARRA SUPERIOR DE HERRAMIENTAS ── */}
      <div className="img-modal-top-bar" onClick={(e) => e.stopPropagation()}>
        <div className="img-modal-info">
          <span className="modal-title-text">{title || "Vista Previa de Guía"}</span>
          <span className="zoom-level-indicator">{Math.round(scale * 100)}%</span>
        </div>

        <div className="img-modal-controls">
          <button className="ctrl-btn" onClick={handleZoomIn} title="Acercar">
            ➕ Ampliar
          </button>
          <button className="ctrl-btn" onClick={handleZoomOut} title="Alejar">
            ➖ Alejar
          </button>
          <button className="ctrl-btn reset-btn" onClick={handleReset} title="Restablecer">
            🔄 Reset
          </button>
          <button className="ctrl-btn close-btn" onClick={onClose} title="Cerrar">
            ✕
          </button>
        </div>
      </div>

      {/* ── ÁREA DE ARRASTRE Y IMAGEN ── */}
      <div
        className={`img-modal-canvas ${scale > 1 ? (isDragging ? "is-grabbing" : "is-grabbable") : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={src}
          alt={title}
          className="modal-zoomable-image"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onClick={handleImageClick}
        />
      </div>

      {/* ── INSTRUCCIONES EN PIE ── */}
      <div className="img-modal-footer-hint" onClick={(e) => e.stopPropagation()}>
        {scale > 1
          ? "🖐️ Arrastra la imagen con el dedo o el mouse para moverte hacia arriba, abajo y lados."
          : "💡 Toca la imagen o presiona + Ampliar para activar el modo de arrastre libre."}
      </div>
    </div>,
    document.body
  );
}
