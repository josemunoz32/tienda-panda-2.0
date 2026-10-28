import React from "react";
import { Helmet } from "react-helmet-async";
import "./FAQ.css";

const CATEGORIAS_FAQ = [
  {
    nombre: "Steam PC & Launcher",
    subcategorias: [
      {
        nombre: "Preguntas Frecuentes – Steam PC",
        preguntas: [
          {
            q: "¿Cómo funciona la entrega y activación de juegos de Steam en PC?",
            a: "La entrega es inmediata y 100% digital 24/7. Puedes activar tus juegos mediante nuestro PandaStore Launcher oficial para Windows o usar el activador paso a paso. Con 1 solo click tu juego queda configurado y listo para jugar."
          },
          {
            q: "¿Los juegos de Steam conservan mis partidas guardadas y logros?",
            a: "Sí, tus partidas guardadas se almacenan localmente en tu computadora o dispositivo y tus logros funcionan con total normalidad."
          },
          {
            q: "¿Puedo jugar en Steam Deck con SteamOS?",
            a: "Sí, PandaStore Launcher cuenta con compatibilidad y guía paso a paso optimizada para Steam Deck en Modo Escritorio."
          },
          {
            q: "¿Los juegos de Steam reciben actualizaciones?",
            a: "Sí, todos los juegos pueden recibir actualizaciones y parches correspondientes a través de nuestro sistema sin perder tu progreso de juego."
          },
          {
            q: "¿Qué medios de pago aceptan?",
            a: "Aceptamos WebPay, MercadoPago, Transferencias bancarias directas (Chile, Argentina, Colombia, México, Perú, etc.), PayPal, Prex y Criptomonedas (USDT)."
          }
        ]
      }
    ]
  },
  {
    nombre: "Nintendo",
    subcategorias: [
      {
        nombre: "Preguntas Frecuentes – Nintendo",
        preguntas: [
          {
            q: "¿Cómo recibo los juegos de Nintendo?",
            a: "Los juegos de Nintendo se entregan mediante un usuario externo que contiene el juego. Puedes descargarlo y jugar desde tu propia cuenta personal, pero el juego permanecerá en el usuario original."
          },
          {
            q: "¿Puedo modificar la cuenta que me entregan?",
            a: "No, no se puede modificar, eliminar ni cambiar la contraseña de los usuarios entregados. Solo puedes acceder a los juegos desde tu propia cuenta."
          },
          {
            q: "¿Los juegos de Nintendo tienen garantía?",
            a: "Al tratarse de cuentas digitales primarias de entrega inmediata a precio promocional, la garantía cubre la correcta activación y descarga inicial en tu consola."
          },
          {
            q: "¿Qué pasa con las suscripciones online y expansiones de Nintendo?",
            a: "Las suscripciones online y expansiones son 100% legales. Se entregan dentro de 24 horas y podrás usarlas desde tu cuenta siguiendo las instrucciones del usuario proporcionado."
          },
          {
            q: "¿Cuánto demora la entrega de un juego de Nintendo?",
            a: "La entrega de los juegos de Nintendo suele tardar entre 1 y 9 horas, dependiendo de la disponibilidad."
          },
          {
            q: "¿Puedo usar varios juegos de Nintendo al mismo tiempo?",
            a: "Sí, mientras tengas acceso a los usuarios entregados, puedes descargar y jugar los juegos en tu propia cuenta."
          },
          {
            q: "¿Es seguro comprar juegos de Nintendo en su tienda?",
            a: "Sí, el proceso de entrega es 100% seguro, verificado por cientos de ventas exitosas y recibirás tu usuario listo para jugar con soporte paso a paso."
          }
        ]
      }
    ]
  },
  {
    nombre: "PSN",
    subcategorias: [
      {
        nombre: "Preguntas Frecuentes – PSN (PS4 y PS5)",
        preguntas: [
          {
            q: "¿Cómo recibo los juegos de PSN?",
            a: "Los juegos de PSN se entregan mediante un usuario externo. Puedes descargar y jugar los juegos en tu propia cuenta personal, o usarlos directamente desde el usuario entregado."
          },
          {
            q: "¿Puedo modificar la cuenta que me entregan?",
            a: "No, no se puede cambiar, eliminar ni modificar la información del usuario entregado. Solo se puede usar para acceder a los juegos que contiene."
          },
          {
            q: "¿Qué tipo de cuentas ofrecen?",
            a: "Ofrecemos:\n\nCuenta primaria: El juego se puede jugar directamente en tu propio usuario personal.\n\nCuenta secundaria: El juego solo se puede jugar desde el usuario entregado, no en tu cuenta personal."
          },
          {
            q: "¿Cuánto demora la entrega de un juego de PSN?",
            a: "La entrega suele tardar entre 1 y 9 horas, dependiendo de la disponibilidad del juego."
          },
          {
            q: "¿Los juegos de PSN tienen garantía?",
            a: "Sí, los juegos son 100% legales y cuentan con garantía total de funcionamiento."
          },
          {
            q: "¿Qué sucede si tengo problemas con la cuenta o el juego?",
            a: "Nuestro soporte está disponible para ayudarte con la activación o cualquier problema. Tu compra está totalmente respaldada."
          },
          {
            q: "¿Puedo revender o modificar los usuarios entregados?",
            a: "No, las cuentas entregadas no se pueden revender, modificar ni eliminar. Están solo para uso personal y descarga de los juegos."
          }
        ]
      }
    ]
  }
];

const ALL_PREGUNTAS_FAQ = CATEGORIAS_FAQ.flatMap(cat =>
  cat.subcategorias.flatMap(sub => sub.preguntas)
);

const FAQ_SCHEMA_STATIC = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": ALL_PREGUNTAS_FAQ.map(p => ({
    "@type": "Question",
    "name": p.q,
    "acceptedAnswer": { "@type": "Answer", "text": p.a }
  }))
};

// Estructura base para la página de Preguntas Frecuentes (FAQ)
export default function FAQ() {
  const [openIndex, setOpenIndex] = React.useState(0); // Abre la primera categoría por defecto
  const [openQuestion, setOpenQuestion] = React.useState({});

  return (
    <div className="faq-root">
      <Helmet>
        <title>Preguntas Frecuentes y Garantía | Videojuegos Digitales - PandaStore</title>
        <meta name="description" content="¿Tienes dudas sobre cómo comprar o activar juegos en PandaStore? Conoce cómo funciona la entrega 24/7 en Steam PC, Nintendo Switch, PS4/PS5, medios de pago y garantía." />
        <meta name="keywords" content="preguntas frecuentes videojuegos, garantia pandastore, como activar juegos steam, cuenta primaria ps5 garantia, soporte pandastore" />
        <meta property="og:title" content="Preguntas Frecuentes | Soporte y Garantía PandaStore" />
        <meta property="og:description" content="Resolvemos todas tus preguntas sobre juegos de Steam PC, Nintendo Switch y PlayStation en PandaStore." />
        <meta property="og:url" content="https://pandastoregaming.cl/preguntas-frecuentes" />
        <meta property="og:image" content="https://pandastoregaming.cl/favicon.png" />
        <link rel="canonical" href="https://pandastoregaming.cl/preguntas-frecuentes" />
        <script type="application/ld+json">{JSON.stringify(FAQ_SCHEMA_STATIC)}</script>
      </Helmet>
      <h1 className="faq-title">Preguntas Frecuentes</h1>
      <div>
        {CATEGORIAS_FAQ.map((cat, idx) => (
          <div key={cat.nombre} className="faq-category">
            <button
              className="faq-category-btn"
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              aria-expanded={openIndex === idx}
              aria-controls={`faq-cat-content-${idx}`}
            >
              {/* Contenido del botón con el nombre de la categoría */}
              <span>{cat.nombre}</span>
            </button>
            {openIndex === idx && (
              <div className="faq-category-content" id={`faq-cat-content-${idx}`}>
                {cat.subcategorias.map((sub, subIdx) => (
                  <div key={sub.nombre} style={{marginBottom: 18}}>
                    {/* USAMOS LA NUEVA CLASE PARA EL TÍTULO DE SUBCATEGORÍA */}
                    <div className="faq-subcategory-title">{sub.nombre}</div>
                    
                    <div className="faq-questions-grid">
                      {sub.preguntas.map((p, i) => {
                        const qKey = `${idx}-${subIdx}-${i}`;
                        const isOpen = openQuestion[qKey];
                        return (
                          <div key={i} className="faq-question-item">
                            <button
                              className="faq-question"
                              aria-expanded={isOpen}
                              aria-controls={`faq-answer-${qKey}`}
                              onClick={() => setOpenQuestion(prev => ({ ...prev, [qKey]: !prev[qKey] }))}
                            >
                              <span>{p.q}</span>
                              <span className="faq-arrow" style={{
                                display: 'inline-block',
                                marginLeft: 12,
                                transition: 'transform 0.2s',
                                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                              }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M7 10l5 5 5-5" stroke="#7ed6ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </span>
                            </button>
                            {isOpen && (
                              <div className="faq-answer" id={`faq-answer-${qKey}`}>{p.a}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}