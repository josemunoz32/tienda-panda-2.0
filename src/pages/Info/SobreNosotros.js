import React, { useEffect } from "react";
import "./SobreNosotros.css";

// Definición de iconos SVG
const icons = {
  email: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 4h16v16H4V4zm0 0l8 8 8-8" stroke="#a084e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  instagram: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="#e1306c" strokeWidth="2" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" stroke="#e1306c" strokeWidth="2" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="#e1306c" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

// Componente principal
function SobreNosotros() {
  useEffect(() => {
    document.title = 'Sobre Nosotros | PandaStore - Tienda de Videojuegos Digitales';
    const setMeta = (attr, key, content) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (el) el.setAttribute('content', content);
    };
    setMeta('name', 'description', 'Conoce PandaStore, la tienda #1 de videojuegos digitales en Latinoamérica fundada en 2022. Entrega inmediata 24/7, Steam PC con Activador oficial, Nintendo Switch 1 y 2, PlayStation 5, PS4 y packs con garantía total.');
    setMeta('property', 'og:title', 'Sobre Nosotros | PandaStore - Tienda de Videojuegos Digitales');
    setMeta('property', 'og:url', 'https://pandastoreupdate.web.app/sobre-nosotros');
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', 'https://pandastoreupdate.web.app/sobre-nosotros');
    const schema = {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "Sobre PandaStore",
      "description": "PandaStore: Tienda #1 de videojuegos digitales en Latinoamérica. Fundada en 2022. Steam PC con Activador, PS5, PS4, Nintendo Switch 1 y 2 y suscripciones.",
      "url": "https://pandastoreupdate.web.app/sobre-nosotros",
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pandastoreupdate.web.app/home" },
          { "@type": "ListItem", "position": 2, "name": "Sobre Nosotros", "item": "https://pandastoreupdate.web.app/sobre-nosotros" }
        ]
      }
    };
    let scriptEl = document.querySelector('script#about-jsonld');
    if (!scriptEl) { scriptEl = document.createElement('script'); scriptEl.id = 'about-jsonld'; scriptEl.type = 'application/ld+json'; document.head.appendChild(scriptEl); }
    scriptEl.textContent = JSON.stringify(schema);
    return () => {
      document.title = 'PandaStore | Tienda de Videojuegos Digitales';
      const s = document.querySelector('script#about-jsonld');
      if (s) s.remove();
      let canonical2 = document.querySelector('link[rel="canonical"]');
      if (canonical2) canonical2.setAttribute('href', 'https://pandastoreupdate.web.app/');
    };
  }, []);

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
          <li>
            {icons.instagram} <span>Instagram Oficial:</span>{" "}
            <a
              href="https://www.instagram.com/pandastoregaming.cl/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#ff70a6", fontWeight: "bold", textDecoration: "none" }}
            >
              @pandastoregaming.cl
            </a>
          </li>
        </ul>
        <p>Puedes escribirnos por cualquiera de estos medios y te responderemos a la brevedad.</p>
      </section>
    </div>
  );
}

export default SobreNosotros;