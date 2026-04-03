import React, { useEffect } from "react";
import "./FAQ.css";

// Estructura base para la página de Preguntas Frecuentes (FAQ)
export default function FAQ() {
    // Preguntas y respuestas actualizadas para Nintendo y PSN
    const categorias = [
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
                a: "No, los juegos de Nintendo son crackeados, por lo que no cuentan con garantía."
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
                a: "Sí, aunque los juegos son crackeados y no cuentan con garantía, el proceso de entrega es seguro y recibirás un usuario listo para jugar."
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

  const [openIndex, setOpenIndex] = React.useState(null);
  const [openQuestion, setOpenQuestion] = React.useState({});

  // SEO: FAQ Schema JSON-LD (rich results en Google)
  useEffect(() => {
    document.title = 'Preguntas Frecuentes | PandaStore - Videojuegos Digitales';
    const allPreguntas = categorias.flatMap(cat =>
      cat.subcategorias.flatMap(sub => sub.preguntas)
    );
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": allPreguntas.map(p => ({
        "@type": "Question",
        "name": p.q,
        "acceptedAnswer": { "@type": "Answer", "text": p.a }
      }))
    };
    let el = document.querySelector('script#faq-jsonld');
    if (!el) { el = document.createElement('script'); el.id = 'faq-jsonld'; el.type = 'application/ld+json'; document.head.appendChild(el); }
    el.textContent = JSON.stringify(schema);
    return () => {
      document.title = 'PandaStore | Tienda de Videojuegos Digitales';
      const s = document.querySelector('script#faq-jsonld');
      if (s) s.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="faq-root">
      <h1 className="faq-title">Preguntas Frecuentes</h1>
      <div>
        {categorias.map((cat, idx) => (
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