import React from "react";
import "./FiestasPatriasOverlay.css";
import guirnaldaImg from "../assets/18 de septiembre/guirnaldas_chile.png";

export default function FiestasPatriasOverlay() {
  return (
    <div className="fiestas-patrias-overlay" aria-hidden="true">
      {/* 1. Guirnalda Superior Izquierda (colgando hacia el centro) */}
      <img
        src={guirnaldaImg}
        alt=""
        className="fiestas-garland garland-top-left"
      />
      {/* 2. Guirnalda Superior Derecha (cruzada hacia el centro) */}
      <img
        src={guirnaldaImg}
        alt=""
        className="fiestas-garland garland-top-right"
      />
      {/* 3. Guirnalda Media Izquierda (cruzada en el fondo) */}
      <img
        src={guirnaldaImg}
        alt=""
        className="fiestas-garland garland-mid-left"
      />
      {/* 4. Guirnalda Media Derecha (cruzada en el fondo opuesto) */}
      <img
        src={guirnaldaImg}
        alt=""
        className="fiestas-garland garland-mid-right"
      />
      {/* 5. Guirnalda Inferior */}
      <img
        src={guirnaldaImg}
        alt=""
        className="fiestas-garland garland-bottom"
      />
    </div>
  );
}
