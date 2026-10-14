import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { catUrl } from "../../utils/slugify";
import { useMoneda, PAISES_CONFIG } from "../../context/MonedaContext";

// Logos e imágenes oficiales del proyecto
import pandaHalloween from "../../assets/halloween/panda-bienvenida-halloween.png";
import steamImg from "../../assets/logos/logosteam.png";
import psnImg from "../../assets/categorias y prom,o/psn.png";
import switchImg from "../../assets/categorias y prom,o/switch.png";
import packSwitchImg from "../../assets/categorias y prom,o/pack-switch.png";
import streamingImg from "../../assets/categorias y prom,o/streaming.png";
import suscripcionesImg from "../../assets/categorias y prom,o/suscripciones.png";
import promosImg from "../../assets/categorias y prom,o/promos.png";
import provedoresImg from "../../assets/fotos publicidad menu/provedores.png";

import "./WelcomeCategoriesModal.css";

export default function WelcomeCategoriesModal({ visible, onClose, categoryIds, categoryNames }) {
  const navigate = useNavigate();
  const { pais, setPais, moneda } = useMoneda();
  const [showPaises, setShowPaises] = useState(false);

  if (!visible) return null;

  const handleNavigateCat = (key, customPath = null) => {
    onClose();
    if (customPath) {
      navigate(customPath);
      return;
    }

    if (key === "promos") {
      navigate("/promos");
      return;
    }

    if (key === "packs-switch") {
      navigate("/packs-nintendo");
      return;
    }

    if (key === "proveedores") {
      navigate("/proveedores");
      return;
    }

    if (key === "steam") {
      if (categoryIds?.steam) {
        navigate(catUrl(categoryNames?.steam || "Juegos Steam", categoryIds.steam));
      } else {
        navigate("/productos");
      }
      return;
    }

    if (key === "nintendo") {
      if (categoryIds?.nintendo) {
        navigate(catUrl(categoryNames?.nintendo || "Nintendo Switch", categoryIds.nintendo));
      } else {
        navigate("/productos");
      }
      return;
    }

    if (key === "psn" || key === "ps4") {
      if (categoryIds?.ps4) {
        navigate(catUrl(categoryNames?.ps4 || "Ps4", categoryIds.ps4));
      } else if (categoryIds?.ps5) {
        navigate(catUrl(categoryNames?.ps5 || "Ps5", categoryIds.ps5));
      } else {
        navigate("/productos");
      }
      return;
    }

    if (key === "ps5") {
      if (categoryIds?.ps5) {
        navigate(catUrl(categoryNames?.ps5 || "Ps5", categoryIds.ps5));
      } else {
        navigate("/productos");
      }
      return;
    }

    if (key === "streaming") {
      if (categoryIds?.streaming) {
        navigate(catUrl(categoryNames?.streaming || "Streaming", categoryIds.streaming));
      } else {
        navigate("/productos");
      }
      return;
    }

    if (key === "suscripciones") {
      if (categoryIds?.suscripciones) {
        navigate(catUrl(categoryNames?.suscripciones || "Suscripciones", categoryIds.suscripciones));
      } else {
        navigate("/productos");
      }
      return;
    }

    navigate("/productos");
  };

  const categoriasList = [
    {
      id: "steam",
      name: "Steam PC",
      tag: "Catálogo PC",
      img: steamImg,
      bg: "#1b2838",
      glow: "rgba(102, 192, 244, 0.5)",
      action: () => handleNavigateCat("steam")
    },
    {
      id: "psn",
      name: "PlayStation",
      tag: "PS4 & PS5",
      img: psnImg,
      glow: "rgba(0, 114, 206, 0.5)",
      action: () => handleNavigateCat("psn")
    },
    {
      id: "nintendo",
      name: "Nintendo Switch",
      tag: "Switch 1 & 2",
      img: switchImg,
      glow: "rgba(255, 42, 109, 0.5)",
      action: () => handleNavigateCat("nintendo")
    },
    {
      id: "packs-switch",
      name: "Packs Nintendo",
      tag: "Ofertas 2x1 y 3x1",
      img: packSwitchImg,
      glow: "rgba(255, 75, 43, 0.5)",
      action: () => handleNavigateCat("packs-switch")
    },
    {
      id: "promos",
      name: "Promociones",
      tag: "Precios Rebajados",
      img: promosImg,
      glow: "rgba(255, 215, 0, 0.5)",
      action: () => handleNavigateCat("promos")
    },
    {
      id: "streaming",
      name: "Streaming",
      tag: "Cuentas & Pases",
      img: streamingImg,
      glow: "rgba(0, 245, 212, 0.5)",
      action: () => handleNavigateCat("streaming")
    },
    {
      id: "suscripciones",
      name: "Suscripciones",
      tag: "Membresías VIP",
      img: suscripcionesImg,
      glow: "rgba(255, 183, 3, 0.5)",
      action: () => handleNavigateCat("suscripciones")
    },
    {
      id: "proveedores",
      name: "Emprendedores",
      tag: "Packs Mayoristas",
      img: provedoresImg,
      glow: "rgba(123, 47, 242, 0.5)",
      action: () => handleNavigateCat("proveedores")
    }
  ];

  const currentPaisConfig = PAISES_CONFIG.find(p => p.codigo === pais) || PAISES_CONFIG[0];

  return (
    <div className="welcome-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="welcome-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Glow de fondo */}
        <div className="welcome-modal-ambient-glow" aria-hidden="true" />

        {/* Botón Cerrar '✕' */}
        <button
          className="welcome-modal-close-btn"
          onClick={onClose}
          aria-label="Cerrar modal"
          title="Cerrar"
        >
          ✕
        </button>

        {/* Encabezado */}
        <div className="welcome-modal-header">
          <div className="welcome-logo-badge">
            <img src={pandaHalloween} alt="Pandita de Halloween de PandaStore" className="welcome-panda-avatar" />
            <span className="welcome-online-dot" />
          </div>
          <p className="welcome-modal-kicker">🎃 Especial de Halloween</p>
          <h2 className="welcome-modal-title">¡Buu! Bienvenido a PandaStore</h2>
          <p className="welcome-modal-subtitle">
            Nuestro pandita tiene las mejores ofertas escondidas. Elige tu plataforma y empieza a jugar:
          </p>
        </div>

        {/* Selector de país / moneda compacto */}
        <div className="welcome-pais-selector-wrap">
          <div className="welcome-pais-current" onClick={() => setShowPaises(!showPaises)}>
            <span className="welcome-pais-lbl">Moneda actual:</span>
            <img
              src={`https://flagcdn.com/w40/${currentPaisConfig.codigo.toLowerCase()}.png`}
              alt={currentPaisConfig.nombre}
              className="welcome-pais-flag"
            />
            <span className="welcome-pais-code">{currentPaisConfig.nombre} ({currentPaisConfig.moneda})</span>
            <span className="welcome-pais-arrow">{showPaises ? "▲" : "▼"}</span>
          </div>

          {showPaises && (
            <div className="welcome-paises-dropdown">
              {PAISES_CONFIG.map((p) => (
                <button
                  key={p.codigo}
                  className={`welcome-pais-opt ${pais === p.codigo ? "active" : ""}`}
                  onClick={() => {
                    setPais(p.codigo);
                    setShowPaises(false);
                  }}
                >
                  <img
                    src={`https://flagcdn.com/w40/${p.codigo.toLowerCase()}.png`}
                    alt={p.nombre}
                    className="welcome-pais-flag-sm"
                  />
                  <span>{p.nombre}</span>
                  <span className="welcome-pais-cur-badge">{p.moneda}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid de Categorías con Fotos Oficiales */}
        <div className="welcome-cats-grid">
          {categoriasList.map((cat) => (
            <button
              key={cat.id}
              className="welcome-cat-card"
              onClick={cat.action}
              style={{ "--cat-glow": cat.glow }}
            >
              <div
                className="welcome-cat-thumb-box"
                style={cat.bg ? { background: cat.bg } : undefined}
              >
                <img src={cat.img} alt={cat.name} className="welcome-cat-img" loading="eager" />
              </div>
              <div className="welcome-cat-info">
                <div className="welcome-cat-text-col">
                  <span className="welcome-cat-name">{cat.name}</span>
                  <span className="welcome-cat-sub">{cat.tag}</span>
                </div>
                <span className="welcome-cat-arrow">➔</span>
              </div>
            </button>
          ))}
        </div>

        {/* Pie del Modal */}
        <div className="welcome-modal-footer">
          <button className="welcome-btn-explore" onClick={onClose}>
            Entrar a la Tienda Encantada
          </button>
        </div>
      </div>
    </div>
  );
}
