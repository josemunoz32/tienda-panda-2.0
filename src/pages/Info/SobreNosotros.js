import React from "react";
import "./SobreNosotros.css";

// Definición de iconos SVG
const icons = {
  email: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 4h16v16H4V4zm0 0l8 8 8-8" stroke="#a084e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  whatsapp: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      {/* El color de stroke en WhatsApp se cambia a verde para mantener la iconografía estándar, aunque el CSS general es morado */}
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.67.15-.198.297-.767.967-.94 1.164-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.007-.372-.009-.571-.009-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.099 3.205 5.077 4.372.71.306 1.263.489 1.695.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.288.173-1.413-.074-.124-.272-.198-.57-.347z" stroke="#25d366" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  instagram: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      {/* El color de stroke en Instagram se cambia al característico rosa/rojo */}
      <rect x="2" y="2" width="20" height="20" rx="6" stroke="#e1306c" strokeWidth="2"/>
      <circle cx="12" cy="12" r="5" stroke="#e1306c" strokeWidth="2"/>
      <circle cx="17" cy="7" r="1.2" fill="#e1306c"/>
    </svg>
  ),
};

// Componente principal
function SobreNosotros() {
  return (
    <div className="sobre-root">
      <h1 className="sobre-title">Sobre Nosotros</h1>
      
      {/* Frase destacada */}
      <div className="sobre-frase">"Tu juego, nuestra misión. ¡Conéctate con confianza, juega sin límites!"</div>

      {/* Sección: Nuestra Historia */}
      <section className="sobre-section">
        <h2>Nuestra Historia</h2>
        <p>
          Panda Store 2.0 nació en 2022 con una misión clara: convertirse en la tienda de referencia para la venta de juegos digitales. Desde nuestros inicios, nos hemos enfocado en la rapidez y la eficiencia para llevar la mejor experiencia de juego a cualquier parte del mundo. Hemos crecido gracias a la confianza de nuestros clientes, ofreciendo un servicio ágil y de calidad que se adapta a las necesidades del gamer moderno.
        </p>
      </section>

      {/* Sección: Nuestra Visión */}
      <section className="sobre-section">
        <h2>Nuestra Visión</h2>
        <p>
          Buscamos consolidarnos como la plataforma más confiable y líder en el sector de juegos digitales a nivel global. Nuestra visión es simple: mantener la excelencia en el servicio que nos ha caracterizado durante estos años y ser reconocidos como los mejores en atención al cliente. Queremos que cada compra en Panda Store 2.0 sea una experiencia superior, segura y satisfactoria para nuestra comunidad.
        </p>
      </section>

      {/* Sección: Contacto */}
      <section className="sobre-section">
        <h2>Contacto</h2>
        <ul className="sobre-contacto-list">
          <li>{icons.email} <span>Email:</span> pandastore2.0soporte@gmail.com</li>
          <li>{icons.whatsapp} <span>WhatsApp:</span> +56 9 7475 1810</li>
          <li>{icons.instagram} <span>Instagram:</span> @juegos_nintendo_switch_chile2</li>
        </ul>
        <p>Puedes escribirnos por cualquiera de estos medios y te responderemos a la brevedad.</p>
      </section>
    </div>
  );
}

export default SobreNosotros;