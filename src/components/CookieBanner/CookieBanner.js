import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './CookieBanner.css';

const COOKIE_STORAGE_KEY = 'panda_cookie_consent_v1';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verificar si el usuario ya tomó una decisión previa
    try {
      const consent = localStorage.getItem(COOKIE_STORAGE_KEY);
      if (!consent) {
        // Mostrar tras un leve delay para una entrada suave
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch (_) {
      // Ignorar errores de acceso a localStorage en modo incógnito estricto
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem(COOKIE_STORAGE_KEY, 'all');
    } catch (_) {}
    setIsVisible(false);
  };

  const handleAcceptEssential = () => {
    try {
      localStorage.setItem(COOKIE_STORAGE_KEY, 'essential');
    } catch (_) {}
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="panda-cookie-banner-wrapper" role="region" aria-label="Aviso de Cookies">
      <div className="panda-cookie-card">
        <button
          className="panda-cookie-close-btn"
          onClick={handleAcceptEssential}
          title="Cerrar y aceptar solo necesarias"
          aria-label="Cerrar aviso de cookies"
        >
          ✕
        </button>

        <div className="panda-cookie-header">
          <div className="panda-cookie-icon" aria-hidden="true">
            🍪
          </div>
          <div className="panda-cookie-text-block">
            <p className="panda-cookie-title"><strong>Panda Store Gaming usa cookies</strong></p>
            <p className="panda-cookie-desc">
              Utilizamos cookies para personalizar tu experiencia, mantener tus compras en el carrito
              y analizar nuestro tráfico de forma segura. Revisa nuestros{' '}
              <Link to="/terminos" className="panda-cookie-link">
                Términos y Privacidad
              </Link>.
            </p>
          </div>
        </div>

        <div className="panda-cookie-actions">
          <button
            type="button"
            className="panda-cookie-btn panda-cookie-btn-accept"
            onClick={handleAcceptAll}
          >
            Aceptar todas
          </button>
          <button
            type="button"
            className="panda-cookie-btn panda-cookie-btn-essential"
            onClick={handleAcceptEssential}
          >
            Solo necesarias
          </button>
        </div>
      </div>
    </div>
  );
}
