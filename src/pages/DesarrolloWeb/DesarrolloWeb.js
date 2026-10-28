import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import miIcono from '../../assets/logos/miicono.png';
import logoWsp from '../../assets/logos/logowsp.png';
import logoIg from '../../assets/logos/logoig.png';
import footerBackground from '../../assets/footer/pandastore-footer-gaming.png';
import DarkVeil from '../../components/DarkVeil/DarkVeil';

// Portafolio: Imágenes reales de proyectos en src/assets/paginas desarrollo
import imgDavital from '../../assets/paginas desarrollo/httpsdavitalnutrition.cl.webp';
import imgPandaStore from '../../assets/paginas desarrollo/pandastoregaming.cl.png';
import imgReservaGo from '../../assets/paginas desarrollo/reservago.cl.webp';
import imgSinLink from '../../assets/paginas desarrollo/sin link.webp';
import imgVitaNacion from '../../assets/paginas desarrollo/vitanacion.cl.webp';

import '../../pages/Footer/Footer.css';
import './DesarrolloWeb.css';

// ══ ÍCONOS VECTORIALES SVG 100% MINIMALISTAS Y MORADOS ═══════════════
const PurpleIcon = ({ name, size = 22 }) => {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: '#a259ff',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  switch (name) {
    case 'zap': // Velocidad / Carga
      return (
        <svg {...props}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case 'smartphone': // Móvil
      return (
        <svg {...props}>
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      );
    case 'shield': // SSL & Seguridad
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'check-circle': // Sin mensualidades / Propiedad
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'headphones': // Soporte
      return (
        <svg {...props}>
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
      );
    case 'target': // Conversión
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case 'rocket': // Portada Hero
      return (
        <svg {...props}>
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        </svg>
      );
    case 'users': // Nosotros
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'layout': // Servicios
      return (
        <svg {...props}>
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
        </svg>
      );
    case 'image': // Galería
      return (
        <svg {...props}>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      );
    case 'message': // WhatsApp / Contacto
      return (
        <svg {...props}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'map-pin': // Ubicación
      return (
        <svg {...props}>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case 'share': // Redes sociales
      return (
        <svg {...props}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      );
    case 'mail': // Formulario
      return (
        <svg {...props}>
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      );
    case 'file-text': // Estructura One Page
      return (
        <svg {...props}>
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case 'cart': // Carrito
      return (
        <svg {...props}>
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
      );
    case 'credit-card': // Pasarelas de Pago
      return (
        <svg {...props}>
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      );
    case 'package': // Catálogo
      return (
        <svg {...props}>
          <path d="m7.5 4.27 9 5.15" />
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      );
    case 'chart': // Stock y Métricas
      return (
        <svg {...props}>
          <path d="M3 3v18h18" />
          <path d="M18 17V9" />
          <path d="M13 17V5" />
          <path d="M8 17v-3" />
        </svg>
      );
    case 'bell': // Notificaciones
      return (
        <svg {...props}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
    case 'tag': // Descuentos
      return (
        <svg {...props}>
          <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
          <path d="M7 7h.01" />
        </svg>
      );
    case 'search': // SEO
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case 'video': // Capacitación
      return (
        <svg {...props}>
          <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
          <rect x="2" y="6" width="14" height="12" rx="2" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
};

export default function DesarrolloWeb({ mode = 'onepage' }) {
  const location = useLocation();
  const currentMode =
    mode === 'ecommerce' || location.pathname.includes('ecommerce')
      ? 'ecommerce'
      : 'onepage';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState(null);

  const WHATSAPP_PHONE = '56974751810';
  const buildWhatsAppLink = (message) => {
    return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentMode]);

  const currentYear = new Date().getFullYear();

  // Características de Landing Page (One Page) con íconos morados minimalistas
  const onePageFeatures = [
    { icon: 'rocket', title: 'Portada de Alto Impacto (Hero)', desc: 'Diseño visual envolvente con llamado a la acción claro para capturar clientes al instante.' },
    { icon: 'users', title: 'Nosotros e Historia de Marca', desc: 'Presenta tu negocio, trayectoria y genera confianza inmediata en tus visitantes.' },
    { icon: 'layout', title: 'Catálogo de Servicios Detallado', desc: 'Muestra tus soluciones con tarjetas interactivas, íconos y explicaciones claras.' },
    { icon: 'image', title: 'Galería de Trabajos y Proyectos', desc: 'Exhibe fotografías en alta definición de tus productos, instalaciones o casos de éxito.' },
    { icon: 'message', title: 'Botón Flotante de WhatsApp', desc: 'Canal directo a tu teléfono para que tus clientes te escriban en 1 solo clic.' },
    { icon: 'map-pin', title: 'Mapa Google Maps Interactivo', desc: 'Ubicación exacta de tu local o sucursal para que tus visitas lleguen sin complicaciones.' },
    { icon: 'share', title: 'Conexión a Redes Sociales', desc: 'Enlaces directos a tu Instagram, Facebook, TikTok y perfiles corporativos.' },
    { icon: 'mail', title: 'Formulario de Contacto Directo', desc: 'Recibe solicitudes y cotizaciones directamente a tu correo electrónico o WhatsApp.' },
    { icon: 'smartphone', title: '100% Adaptado a Móviles (Responsive)', desc: 'Navegación ultra fluida optimizada especialmente para smartphones y tablets.' },
    { icon: 'shield', title: 'Certificado de Seguridad SSL (HTTPS)', desc: 'Conexión cifrada y segura con candado verde para proteger la navegación de tus usuarios.' },
  ];

  // Características de Tienda Online (E-Commerce) con íconos morados minimalistas
  const eCommerceFeatures = [
    { icon: 'file-text', title: 'Todo lo del Plan One Page', desc: 'Estructura corporativa completa, secciones institucionales y diseño de marca exclusivo.' },
    { icon: 'cart', title: 'Carrito de Compras Optimizado', desc: 'Experiencia de compra moderna, intuitiva y sin fricciones para maximizar conversiones.' },
    { icon: 'credit-card', title: 'Pasarelas de Pago Chilenas', desc: 'Integración con WebPay Plus (Débito/Crédito), MercadoPago y datos para Transferencia.' },
    { icon: 'package', title: 'Catálogo Autoadministrable', desc: 'Panel fácil donde puedes crear, modificar o eliminar productos en segundos.' },
    { icon: 'chart', title: 'Control de Stock y Variantes', desc: 'Gestión inteligente de inventario, tallas, colores, sku y alertas de producto agotado.' },
    { icon: 'bell', title: 'Notificaciones Instantáneas', desc: 'Avisos automáticos de cada compra directamente a tu WhatsApp y bandeja de correo.' },
    { icon: 'tag', title: 'Cupones y Descuentos', desc: 'Genera promociones con códigos de descuento porcentuales o montos fijos.' },
    { icon: 'search', title: 'SEO Avanzado para Buscadores', desc: 'Configuración técnica para que cada producto aparezca posicionado en Google Chile.' },
    { icon: 'video', title: 'Capacitación en Video', desc: 'Tutoriales guiados para que administres pedidos, clientes y despachos con total autonomía.' },
    { icon: 'headphones', title: 'Soporte y Asesoría Chilena', desc: 'Acompañamiento continuo por WhatsApp para resolver dudas y apoyar el crecimiento de tu tienda.' },
  ];

  // Proyectos del Portafolio Studio
  const portfolioProjects = [
    {
      name: 'pandastoregaming.cl',
      category: 'E-Commerce Gamer & WebPay',
      desc: 'Plataforma completa de comercio electrónico con más de 100 productos, pasarela WebPay Plus, catálogo interactivo y cobros automáticos.',
      image: imgPandaStore,
      url: 'https://pandastoregaming.cl',
      hasLink: true,
      highlight: true,
      badge: 'E-Commerce en Vivo',
    },
    {
      name: 'reservago.cl',
      category: 'Plataforma de Reservas & Citas',
      desc: 'Sistema web premium de reservas y agendamiento de horas para salones, barberías y profesionales con confirmación automática.',
      image: imgReservaGo,
      url: 'https://reservago.cl',
      hasLink: true,
      highlight: false,
      badge: 'Plataforma Web',
    },
    {
      name: 'vitanacion.cl',
      category: 'Tienda Online de Suplementos',
      desc: 'E-commerce moderno y rápido para suplementación deportiva y bienestar, con carrito fluido, inventario y despacho a todo Chile.',
      image: imgVitaNacion,
      url: 'https://vitanacion.cl',
      hasLink: true,
      highlight: false,
      badge: 'E-Commerce en Vivo',
    },
    {
      name: 'davitalnutrition.cl',
      category: 'E-Commerce Nutrición Integral',
      desc: 'Sitio comercial con diseño inmersivo para venta de colágeno y salud natural, con optimización móvil y pedidos directos.',
      image: imgDavital,
      url: 'https://davitalnutrition.cl',
      hasLink: true,
      highlight: false,
      badge: 'E-Commerce en Vivo',
    },
    {
      name: 'Catálogo Digital para Pymes',
      category: 'Catálogo Comercial & WhatsApp',
      desc: 'Solución ágil para emprendedores con carrito express, galería de productos y derivación de pedidos directamente a WhatsApp.',
      image: imgSinLink,
      url: null,
      hasLink: false,
      highlight: false,
      badge: 'Desarrollo a Medida',
    },
  ];

  return (
    <div className="pdev-root">
      <Helmet>
        <title>
          {currentMode === 'onepage'
            ? 'Landing Pages One Page en Chile | PandaStore'
            : 'Tiendas Online E-Commerce con WebPay | PandaStore'}
        </title>
        <meta
          name="description"
          content={
            currentMode === 'onepage'
              ? 'Landing Pages One Page profesionales en Chile desde $150.000 + IVA. Rápida, optimizada para celular, ventas por WhatsApp y certificado SSL.'
              : 'Tiendas Online E-Commerce profesionales en Chile desde $500.000 + IVA. Pagos con WebPay Plus Transbank, inventario automático y autoadministrable.'
          }
        />
        <meta
          name="keywords"
          content={
            currentMode === 'onepage'
              ? 'landing page chile, crear pagina web santiago, diseño web pymes chile, una sola pagina web, programador web chile, pandastore chile'
              : 'crear tienda online chile, ecommerce webpay plus transbank, diseño tiendas online chile, tienda virtual santiago, pandastore ecommerce'
          }
        />
        <meta name="robots" content="index, follow" />
        <link
          rel="canonical"
          href={
            currentMode === 'onepage'
              ? 'https://pandastoregaming.cl/pandastoredesarrollo'
              : 'https://pandastoregaming.cl/ecommerce'
          }
        />

        {/* Open Graph / Facebook / WhatsApp */}
        <meta property="og:type" content="website" />
        <meta
          property="og:url"
          content={
            currentMode === 'onepage'
              ? 'https://pandastoregaming.cl/pandastoredesarrollo'
              : 'https://pandastoregaming.cl/ecommerce'
          }
        />
        <meta
          property="og:title"
          content={
            currentMode === 'onepage'
              ? 'PandaStore | Landing Pages One Page en Chile ($150.000 + IVA)'
              : 'PandaStore | Tiendas Online E-Commerce con WebPay en Chile'
          }
        />
        <meta
          property="og:description"
          content={
            currentMode === 'onepage'
              ? 'Lanza tu página web One Page moderna y rápida para vender más por WhatsApp. Entrega ágil y sin mensualidades forzadas.'
              : 'Tu tienda virtual completa con cobros automáticos WebPay Plus, catálogo interactivo y diseño profesional adaptado a celulares.'
          }
        />
        <meta property="og:image" content="https://pandastoregaming.cl/logo512.png" />
        <meta property="og:site_name" content="PandaStore Chile" />
        <meta property="og:locale" content="es_CL" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={
            currentMode === 'onepage'
              ? 'PandaStore | Landing Pages One Page en Chile'
              : 'PandaStore | Tiendas Online E-Commerce en Chile'
          }
        />
        <meta
          name="twitter:description"
          content={
            currentMode === 'onepage'
              ? 'Landing Pages profesionales desde $150.000 + IVA optimizadas para celular y WhatsApp.'
              : 'Tiendas online con pagos WebPay Plus, catálogo autoadministrable y soporte técnico en Chile.'
          }
        />
        <meta name="twitter:image" content="https://pandastoregaming.cl/logo512.png" />

        {/* Schema.org Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ProfessionalService',
            name: 'PandaStore Desarrollo Web',
            url: 'https://pandastoregaming.cl/pandastoredesarrollo',
            logo: 'https://pandastoregaming.cl/logo192.png',
            image: 'https://pandastoregaming.cl/logo512.png',
            description:
              'Agencia de diseño y desarrollo web en Chile. Especialistas en Landing Pages One Page y Tiendas Online E-Commerce con integración WebPay Plus.',
            telephone: '+56945826972',
            priceRange: '$150.000 - $500.000 CLP',
            address: {
              '@type': 'PostalAddress',
              addressCountry: 'CL',
              addressRegion: 'Santiago',
            },
            offers: [
              {
                '@type': 'Offer',
                name: 'Landing Page One Page',
                price: '150000',
                priceCurrency: 'CLP',
                availability: 'https://schema.org/InStock',
              },
              {
                '@type': 'Offer',
                name: 'Tienda Online E-Commerce con WebPay Plus',
                price: '500000',
                priceCurrency: 'CLP',
                availability: 'https://schema.org/InStock',
              },
            ],
          })}
        </script>
      </Helmet>

      {/* ══ HEADER FLOTANTE ESTILO ARC (CÁPSULA CON FROSTED GLASS) ════ */}
      <div className="pdev-floating-nav-wrapper">
        <header className="pdev-header-pill">
          {/* Marca / Logo PandaStore (Blanco sólido) */}
          <Link
            to={currentMode === 'onepage' ? '/pandastoredesarrollo' : '/ecommerce'}
            className="pdev-brand"
            aria-label="PandaStore Desarrollo Web"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="pdev-brand-logo-wrap">
              <img src={miIcono} alt="PandaStore Logo" className="pdev-brand-img" />
            </div>
            <span className="pdev-brand-title">PandaStore</span>
          </Link>

          {/* Navegación Desktop Tipo Píldoras Arc */}
          <nav className="pdev-nav-desktop" aria-label="Navegación Desktop">
            <Link
              to="/pandastoredesarrollo"
              className={`pdev-nav-pill ${currentMode === 'onepage' ? 'active' : ''}`}
            >
              One Page
            </Link>
            <Link
              to="/ecommerce"
              className={`pdev-nav-pill ${currentMode === 'ecommerce' ? 'active' : ''}`}
            >
              E-Commerce
            </Link>
            <a href="#beneficios" className="pdev-nav-pill">
              ¿Por qué nosotros?
            </a>
            <a href="#portafolio" className="pdev-nav-pill">
              Portafolio
            </a>
          </nav>

          {/* Botón WhatsApp CTA Estilo Botón Cápsula Blanco Arc */}
          <div className="pdev-header-right">
            <a
              href={buildWhatsAppLink(
                currentMode === 'onepage'
                  ? '¡Hola PandaStore! Quisiera cotizar una Landing Page One Page por $150.000 + IVA.'
                  : '¡Hola PandaStore! Quisiera cotizar una Tienda Online E-Commerce por $500.000 + IVA.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="pdev-btn-cta-arc"
            >
              <span>Cotizar Proyecto</span>
            </a>

            {/* Hamburguesa Móvil */}
            <button
              type="button"
              className={`pdev-hamburger-btn ${mobileMenuOpen ? 'open' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menú de navegación"
              aria-expanded={mobileMenuOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </header>

        {/* Menú Móvil Desplegable Flotante */}
        {mobileMenuOpen && (
          <nav className="pdev-mobile-drawer" aria-label="Menú móvil">
            <Link
              to="/pandastoredesarrollo"
              className={`pdev-mobile-link ${currentMode === 'onepage' ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>One Page (Landing Page)</span>
              <span className="pdev-mobile-badge">$150.000 + IVA</span>
            </Link>
            <Link
              to="/ecommerce"
              className={`pdev-mobile-link ${currentMode === 'ecommerce' ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>E-Commerce (Tienda Online)</span>
              <span className="pdev-mobile-badge">$500.000 + IVA</span>
            </Link>
            <a
              href="#beneficios"
              className="pdev-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              ¿Por qué nosotros?
            </a>
            <a
              href="#portafolio"
              className="pdev-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Portafolio de Proyectos
            </a>
            <a
              href={buildWhatsAppLink(
                currentMode === 'onepage'
                  ? '¡Hola PandaStore! Quisiera cotizar una Landing Page One Page por $150.000 + IVA.'
                  : '¡Hola PandaStore! Quisiera cotizar una Tienda Online E-Commerce por $500.000 + IVA.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="pdev-mobile-cta"
              onClick={() => setMobileMenuOpen(false)}
            >
              <img src={logoWsp} alt="WhatsApp" className="pdev-btn-wsp-icon" />
              <span>Cotizar Proyecto por WhatsApp</span>
            </a>
          </nav>
        )}
      </div>

      {/* ══ SECCIÓN 1: HERO (CON FONDO DARKVEIL REACT BITS) ══════════════ */}
      <div
        className="pdev-hero-wrapper"
        id="hero"
        style={{ background: 'radial-gradient(circle at 50% 15%, #26104f 0%, #0b0518 52%, #070311 100%)' }}
      >
        <div className="pdev-veil-canvas-wrap" aria-hidden="true">
          <DarkVeil
            color="#7b2ff2"
            speed={0.5}
            flow={1}
            scale={1}
            warp={0.15}
            brightness={1}
            glow={0.5}
            grain={0.03}
            quality={0.5}
            mouseInteraction={true}
          />
        </div>

        <section className="pdev-hero">
          <h1 className="pdev-hero-title">
            {currentMode === 'onepage'
              ? 'Creamos tu Landing Page One Page por $150.000 + IVA'
              : 'Creamos tu Tienda Online por $500.000 + IVA'}
          </h1>

          <p className="pdev-hero-desc">
            {currentMode === 'onepage'
              ? 'Diseño moderno, rápido y optimizado para celular, enfocado en convertir visitas en ventas reales por WhatsApp.'
              : 'Plataforma con cobros automáticos WebPay Plus, catálogo autoadministrable y control de inventario en tiempo real.'}
          </p>

          <div className="pdev-hero-actions">
            <a
              href={buildWhatsAppLink(
                currentMode === 'onepage'
                  ? '¡Hola PandaStore! Quiero cotizar una página One Page para mi negocio.'
                  : '¡Hola PandaStore! Quiero cotizar una tienda E-Commerce con pagos online.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="pdev-btn-hero22-primary"
            >
              <span>
                {currentMode === 'onepage'
                  ? 'Cotizar Plan One Page por WhatsApp'
                  : 'Cotizar Mi Tienda Online por WhatsApp'}
              </span>
            </a>
            <a href="#plan-detalle" className="pdev-btn-hero22-secondary">
              Ver Qué Incluye
            </a>
          </div>
        </section>
      </div>

      {/* ══ SECCIÓN 2: PLAN SPOTLIGHT & QUÉ INCLUYE (FONDO BLANCO) ═══════ */}
      <section className="pdev-plan-light-section" id="plan-detalle">
        <div className="pdev-plan-spotlight-light">
          {/* Cabecera del plan */}
          <div className="pdev-spotlight-top-light">
            <div className="pdev-spotlight-info-light">
              <h2>
                {currentMode === 'onepage' ? 'Landing Page (One Page)' : 'Tienda Online (E-Commerce)'}
              </h2>
              <p>
                {currentMode === 'onepage'
                  ? 'Ideal para profesionales independientes, pymes, servicios técnicos y campañas publicitarias directas.'
                  : 'Vende tus productos físicos o digitales las 24 horas del día con cobros automáticos e inventario inteligente.'}
              </p>
            </div>

            <div className="pdev-spotlight-price-box-light">
              <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                Inversión Inicial
              </span>
              <div className="pdev-spotlight-amount-light">
                {currentMode === 'onepage' ? '$150.000' : '$500.000'}
                <span className="pdev-spotlight-iva-light">CLP + IVA</span>
              </div>
              <div className="pdev-price-monthly-box">
                <div className="pdev-price-monthly-header">
                  <span className="pdev-price-monthly-tag">Hosting & Mantención Opcional</span>
                  <span className="pdev-price-monthly-val">$15.000 <small>CLP/mes</small></span>
                </div>
                <p className="pdev-price-monthly-desc">
                  Servidor cloud de alta velocidad, copias de seguridad semanales y soporte continuo por WhatsApp.
                </p>
              </div>
            </div>
          </div>

          {/* Sección Qué incluye: Íconos y títulos compactos con acordeón interactivo */}
          <div className="pdev-includes-title-row-light">
            <div>
              <h3>
                {currentMode === 'onepage'
                  ? '¿Qué incluye tu Landing Page One Page?'
                  : '¿Qué incluye tu Tienda Online E-Commerce?'}
              </h3>
              <p className="pdev-includes-hint">
                Toca cualquier función para desplegar sus detalles
              </p>
            </div>
          </div>

          <div className="pdev-includes-grid-light">
            {(currentMode === 'onepage' ? onePageFeatures : eCommerceFeatures).map((feat, idx) => {
              const isExpanded = expandedItem === idx;
              return (
                <div
                  key={idx}
                  className={`pdev-include-item-light ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => setExpandedItem(isExpanded ? null : idx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedItem(isExpanded ? null : idx);
                    }
                  }}
                  aria-expanded={isExpanded}
                >
                  <div className="pdev-include-header-row">
                    <div className="pdev-include-icon-light" aria-hidden="true">
                      <PurpleIcon name={feat.icon} size={20} />
                    </div>
                    <h4 className="pdev-include-title-text">{feat.title}</h4>
                    <span className="pdev-include-chevron" aria-hidden="true">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#a259ff"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.25s ease'
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="pdev-include-body-light">
                      <p>{feat.desc}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Botón de acción WhatsApp */}
          <div className="pdev-spotlight-cta-wrap-light">
            <a
              href={buildWhatsAppLink(
                currentMode === 'onepage'
                  ? '¡Hola PandaStore! Me interesa cotizar el plan Landing Page (One Page) desde $150.000 + IVA.'
                  : '¡Hola PandaStore! Me interesa cotizar el plan Tienda Online (E-Commerce) desde $500.000 + IVA.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="pdev-spotlight-btn-light"
            >
              <img src={logoWsp} alt="" className="pdev-btn-inline-wsp" />
              <span>
                {currentMode === 'onepage'
                  ? 'Cotizar Plan One Page por WhatsApp'
                  : 'Cotizar Mi Tienda Online por WhatsApp'}
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ══ SECCIÓN 3: FEATURES 5 (¿POR QUÉ NOSOTROS? - FONDO OSCURO CON DARKVEIL) ═══ */}
      <section
        className="pdev-features5-section"
        id="beneficios"
        style={{ background: 'radial-gradient(circle at 50% 20%, #201044 0%, #0b0518 55%, #070311 100%)' }}
      >
        <div className="pdev-veil-canvas-wrap" aria-hidden="true">
          <DarkVeil
            color="#6b12ff"
            speed={0.4}
            flow={0.9}
            scale={1.1}
            warp={0.15}
            brightness={1}
            glow={0.45}
            grain={0.03}
            quality={0.5}
            mouseInteraction={true}
          />
        </div>

        <div className="pdev-features5-head">
          <span className="pdev-features5-tag">¿Por qué trabajar con nosotros?</span>
          <h2 className="pdev-features5-title">Tecnología de Punta al Alcance de tu Bolsillo</h2>
          <p className="pdev-features5-desc">
            Nos enfocamos en páginas modernas que cargan en milisegundos y convierten visitantes en compradores.
          </p>
        </div>

        {/* Bloque Features 5 de 6 tarjetas unificadas con íconos morados minimalistas */}
        <div className="pdev-features5-grid">
          <div className="pdev-features5-item">
            <div className="pdev-features5-icon">
              <PurpleIcon name="zap" size={32} />
            </div>
            <h3 className="pdev-features5-item-title">Carga Ultrarrápida</h3>
            <p className="pdev-features5-item-desc">
              Usamos tecnologías modernas y CDN que hacen que tu web abra al instante sin demoras molestas.
            </p>
          </div>

          <div className="pdev-features5-item">
            <div className="pdev-features5-icon">
              <PurpleIcon name="smartphone" size={32} />
            </div>
            <h3 className="pdev-features5-item-title">Diseño 100% Celular</h3>
            <p className="pdev-features5-item-desc">
              Más del 80% de tus clientes compran desde su smartphone. Tu web se verá impecable en cualquier pantalla.
            </p>
          </div>

          <div className="pdev-features5-item">
            <div className="pdev-features5-icon">
              <PurpleIcon name="shield" size={32} />
            </div>
            <h3 className="pdev-features5-item-title">Seguridad &amp; SSL Certificado</h3>
            <p className="pdev-features5-item-desc">
              Configuración completa con certificado HTTPS oficial y protección de datos para tus clientes.
            </p>
          </div>

          <div className="pdev-features5-item">
            <div className="pdev-features5-icon">
              <PurpleIcon name="check-circle" size={32} />
            </div>
            <h3 className="pdev-features5-item-title">Sin Mensualidades Forzadas</h3>
            <p className="pdev-features5-item-desc">
              El sitio web es 100% de tu propiedad. No te amarramos a contratos mensuales obligatorios de mantenimiento.
            </p>
          </div>

          <div className="pdev-features5-item">
            <div className="pdev-features5-icon">
              <PurpleIcon name="headphones" size={32} />
            </div>
            <h3 className="pdev-features5-item-title">Soporte Cercano en Chile</h3>
            <p className="pdev-features5-item-desc">
              Atención directa por WhatsApp con personas reales que entienden tus requerimientos de inmediato.
            </p>
          </div>

          <div className="pdev-features5-item">
            <div className="pdev-features5-icon">
              <PurpleIcon name="target" size={32} />
            </div>
            <h3 className="pdev-features5-item-title">Enfoque en Conversión</h3>
            <p className="pdev-features5-item-desc">
              Cada botón, texto y sección está estructurado estratégicamente para que recibas más mensajes y ventas.
            </p>
          </div>
        </div>
      </section>

      {/* ══ SECCIÓN 4: PORTAFOLIO DE PROYECTOS (FONDO BLANCO) ═══════════ */}
      <section className="pdev-portfolio-light-section" id="portafolio">
        <div className="pdev-portfolio-head-light">
          <span className="pdev-portfolio-tag-light">Casos de Éxito &amp; Clientes</span>
          <h2 className="pdev-portfolio-title-light">Proyectos construidos a la medida de cada cliente</h2>
          <p className="pdev-portfolio-desc-light">
            Conoce algunos de los sitios web, tiendas en línea y plataformas desarrolladas con nuestro estándar de velocidad, diseño y conversión.
          </p>
        </div>

        <div className="pdev-portfolio-grid">
          {portfolioProjects.map((project, idx) => (
            <div
              key={idx}
              className={`pdev-studio-card ${project.highlight ? 'highlight' : ''}`}
            >
              <div className="pdev-card-glow-aura" aria-hidden="true" />
              
              <div className="pdev-card-img-wrap">
                <span className="pdev-card-badge">{project.badge}</span>
                <img
                  src={project.image}
                  alt={`Proyecto ${project.name}`}
                  className="pdev-card-img"
                  loading="lazy"
                />
              </div>

              <div className="pdev-card-body">
                <div className="pdev-card-footer">
                  <div className="pdev-card-title-col">
                    <span className="pdev-card-category">{project.category}</span>
                    <h4 className="pdev-card-title">{project.name}</h4>
                  </div>

                  {project.hasLink ? (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pdev-card-arrow-btn"
                      aria-label={`Ver proyecto en vivo ${project.name}`}
                      title={`Visitar ${project.name}`}
                    >
                      →
                    </a>
                  ) : (
                    <span className="pdev-card-no-link-badge">A Medida</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ SECCIÓN 5: FOOTER OFICIAL PANDASTORE (FONDO OSCURO) ═════════ */}
      <footer className="panda-footer">
        <div
          className="panda-footer__background"
          style={{ backgroundImage: `url(${footerBackground})` }}
          aria-hidden="true"
        />
        <div className="panda-footer__veil" aria-hidden="true" />
        <svg className="panda-footer__curve panda-footer__curve--back" viewBox="0 0 1440 132" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,75 C210,138 405,14 725,62 C1030,108 1220,14 1440,68 L1440,0 L0,0 Z" />
        </svg>
        <svg className="panda-footer__curve panda-footer__curve--front" viewBox="0 0 1440 132" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,88 C265,20 468,124 748,77 C1048,27 1234,118 1440,56 L1440,0 L0,0 Z" />
        </svg>

        <div className="panda-footer__content">
          <Link
            className="panda-footer__brand"
            to={currentMode === 'onepage' ? '/pandastoredesarrollo' : '/ecommerce'}
            aria-label="Ir al inicio de PandaStore Desarrollo Web"
          >
            <span className="panda-footer__logo-shell">
              <img src={miIcono} alt="PandaStore Logo" />
            </span>
            <span>
              <strong>Panda<span>Store</span></strong>
              <small>DESARROLLO WEB &amp; E-COMMERCE</small>
            </span>
          </Link>

          <p className="panda-footer__message">
            Plataforma de desarrollo web, landing pages y tiendas online profesionales para emprendedores y empresas en Chile.
          </p>

          <nav className="panda-footer__links" aria-label="Enlaces de desarrollo web">
            <Link to="/pandastoredesarrollo">Landing Page (One Page)</Link>
            <Link to="/ecommerce">Tienda Online (E-Commerce)</Link>
            <a href="#beneficios">¿Por qué nosotros?</a>
            <a href="#portafolio">Portafolio</a>
            <a href={buildWhatsAppLink('Hola PandaStore, necesito soporte técnico para mi página web.')}>
              Soporte Técnico
            </a>
          </nav>

          {/* ÚNICAMENTE LOS 3 LOGOS OFICIALES: WHATSAPP, INSTAGRAM Y TELEGRAM */}
          <div className="panda-footer__socials" aria-label="Redes sociales oficiales">
            <a
              href={buildWhatsAppLink('¡Hola PandaStore! Vengo desde la sección de desarrollo web.')}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="PandaStore en WhatsApp"
            >
              <img src={logoWsp} alt="" />
              <span>WhatsApp</span>
            </a>

            <a
              href="https://www.instagram.com/pandastoregaming.cl/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="PandaStore en Instagram"
            >
              <img src={logoIg} alt="" />
              <span>Instagram</span>
            </a>

            <a
              href="https://t.me/NintendoChile2"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="PandaStore en Telegram"
            >
              <svg viewBox="0 0 496 512" aria-hidden="true">
                <path d="M248 8C111 8 0 119 0 256S111 504 248 504 496 393 496 256 385 8 248 8zM363 176.7c-3.7 39.2-19.9 134.4-28.1 178.3-3.5 18.6-10.3 24.8-16.9 25.4-14.4 1.3-25.3-9.5-39.3-18.7-21.8-14.3-34.2-23.2-55.3-37.2-24.5-16.1-8.6-25 5.3-39.5 3.7-3.8 67.1-61.5 68.3-66.7.2-.7.3-3.1-1.2-4.4s-3.6-.8-5.1-.5q-3.3.7-104.6 69.1-14.8 10.2-26.9 9.9c-8.9-.2-25.9-5-38.6-9.1-15.5-5-27.9-7.7-26.8-16.3q.8-6.7 18.5-13.7 108.4-47.2 144.6-62.3c68.9-28.6 83.2-33.6 92.5-33.8 2.1 0 6.6.5 9.6 2.9a10.5 10.5 0 0 1 3.5 6.7A43.8 43.8 0 0 1 363 176.7z" />
              </svg>
              <span>Telegram</span>
            </a>
          </div>

          <div className="panda-footer__meta">
            <span>© {currentYear} PandaStore Desarrollo Web. Todos los derechos reservados.</span>
            <span className="panda-footer__status">
              <i /> Servidores online
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
