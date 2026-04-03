import React from "react";
import miIcono from "../../assets/logos/miicono.png";

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer-pro">
            <div className="footer-content">
                {/* 1. SECCIÓN DE MARCA Y DESCRIPCIÓN */}
                <div className="footer-section brand-section">
                    <div className="footer-brand">
                        <img src={miIcono} alt="PandaStore logo" className="footer-logo-img" />
                        <span className="footer-title">PandaStore</span>
                    </div>
                    <p className="footer-tagline">Tu nivel sube con nosotros. ¡Juega con estilo!</p>
                </div>

                {/* 2. SECCIÓN DE ENLACES RÁPIDOS */}
                <div className="footer-section links-section">
                    <h4>Enlaces rápidos</h4>
                    <nav>
                        <a href="/preguntas-frecuentes">Preguntas Frecuentes</a>
                        <a href="/soporte">Contáctanos</a>
                        <a href="/perfil">Mi Perfil</a>
                    </nav>
                </div>

                {/* 3. SECCIÓN DE INFORMACIÓN LEGAL */}
                <div className="footer-section info-section">
                    <h4>Información</h4>
                    <nav>
                        <a href="/terminos">Términos y Condiciones</a>
                        <a href="/sobre-nosotros">Sobre Nosotros</a>
                    </nav>
                </div>

                {/* 4. SECCIÓN DE REDES SOCIALES */}
                {/* NOTA: Esta sección no necesita una clase de alineación específica, se hará con CSS por clase */}
                <div className="footer-section social-section">
                    <h4>Síguenos</h4>
                    <div className="social-icons">
                        {/* WhatsApp SVG */}
                        <a href="https://wa.me/56974751810" target="_blank" rel="noopener noreferrer" title="WhatsApp" className="social-btn whatsapp">
                            <svg viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
                                <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                            </svg>
                        </a>
                        {/* Instagram SVG */}
                        <a href="https://instagram.com/juegos_nintendo_switch_chile2" target="_blank" rel="noopener noreferrer" title="Instagram" className="social-btn instagram">
                            <svg viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
                                <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/>
                            </svg>
                        </a>
                        {/* Telegram SVG */}
                        <a href="https://t.me/NintendoChile2" target="_blank" rel="noopener noreferrer" title="Telegram" className="social-btn telegram">
                            <svg viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg">
                                <path d="M248 8C111 8 0 119 0 256S111 504 248 504 496 393 496 256 385 8 248 8zM363 176.7c-3.7 39.2-19.9 134.4-28.1 178.3-3.5 18.6-10.3 24.8-16.9 25.4-14.4 1.3-25.3-9.5-39.3-18.7-21.8-14.3-34.2-23.2-55.3-37.2-24.5-16.1-8.6-25 5.3-39.5 3.7-3.8 67.1-61.5 68.3-66.7 .2-.7 .3-3.1-1.2-4.4s-3.6-.8-5.1-.5q-3.3 .7-104.6 69.1-14.8 10.2-26.9 9.9c-8.9-.2-25.9-5-38.6-9.1-15.5-5-27.9-7.7-26.8-16.3q.8-6.7 18.5-13.7 108.4-47.2 144.6-62.3c68.9-28.6 83.2-33.6 92.5-33.8 2.1 0 6.6 .5 9.6 2.9a10.5 10.5 0 0 1 3.5 6.7A43.8 43.8 0 0 1 363 176.7z"/>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>

            {/* BARRA INFERIOR DE COPYRIGHT */}
            <div className="footer-bottom">
                <span>&copy; {currentYear} PandaStore. Todos los derechos reservados.</span>
                <span className="footer-dev-credit">
                    <span className="footer-dev-sep">|</span>
                    Dise&ntilde;ado por
                    <a href="https://instagram.com/jm.websolutions" target="_blank" rel="noopener noreferrer" className="footer-dev-link">
                        <img src="/logoJmSolution.png" alt="JM WebSolutions" className="footer-dev-logo" />
                        <span className="footer-dev-name">JM WebSolutions</span>
                    </a>
                </span>
            </div>

            <style>{`
                /* Estilos base del footer */
                .footer-pro {
                    position: relative; 
                    width: 100%;
                    background: #1a1a1a; 
                    color: #e0e0e0; 
                    font-family: 'Poppins', sans-serif; 
                    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.5); 
                    padding: 30px 0 0 0; 
                    margin-top: 40px; 
                }

                .footer-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 16px 20px 16px;
                    display: flex;
                    justify-content: space-between; 
                    flex-wrap: wrap; 
                    gap: 30px; 
                }

                .footer-section {
                    flex: 1 1 200px; 
                    min-width: 150px;
                    /* Alineación por defecto: izquierda */
                    text-align: left; 
                }

                .footer-brand {
                    display: flex;
                    align-items: center;
                    margin-bottom: 10px;
                }

                .footer-logo-img {
                    width: 40px;
                    height: 40px;
                    margin-right: 10px;
                    filter: drop-shadow(0 0 5px #f357a8); 
                }

                .footer-title {
                    font-size: 1.8rem;
                    font-weight: 900;
                    color: #fff;
                    letter-spacing: 0.05em;
                }
                
                .footer-tagline {
                    font-size: 0.9rem;
                    color: #999;
                    line-height: 1.4;
                }

                .footer-section h4 {
                    margin-bottom: 15px;
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #7b2ff2; 
                    border-bottom: 2px solid #f357a8; 
                    padding-bottom: 5px;
                    display: inline-block;
                    margin-left: 0; 
                    margin-right: 0;
                }

                .footer-section nav {
                    display: flex;
                    flex-direction: column;
                    /* Alineamos los links a la izquierda para desktop */
                    align-items: flex-start; 
                }
                
                /* Estilos para los enlaces normales (no sociales) */
                .footer-section a {
                    color: #e0e0e0;
                    text-decoration: none;
                    margin-bottom: 8px;
                    font-size: 0.95rem;
                    transition: color 0.2s, transform 0.2s;
                    position: relative;
                    padding-left: 15px;
                }
                
                .footer-section a:before {
                    content: '»'; 
                    position: absolute;
                    left: 0;
                    color: #f357a8;
                    font-weight: bold;
                }

                .footer-section a:hover {
                    color: #FFD600; 
                    transform: translateX(3px); 
                }
                
                /* --- CORRECCIÓN CLAVE PARA DESKTOP --- */
                .footer-section.social-section {
                    /* Centramos el texto (el <h4>) de la columna de redes sociales */
                    text-align: center; 
                }

                /* Estilos para los botones de redes sociales */
                .social-icons {
                    display: flex;
                    gap: 15px; 
                    margin-top: 10px;
                    /* Centramos los íconos sociales SIEMPRE */
                    justify-content: center; 
                }
                /* -------------------------------------- */


                .social-btn {
                    padding: 0;
                    margin: 0; 
                    position: relative;
                    text-decoration: none;
                    /* Quitar fondo, borde redondeado y sombra */
                    background: none;
                    border-radius: 0;
                    box-shadow: none;
                    width: auto;
                    height: auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.3s;
                }

                .social-btn:hover {
                    transform: translateY(-5px) scale(1.1); 
                }

                .social-btn svg {
                    display: block;
                    width: 38px;
                    height: 38px;
                    transition: fill 0.3s ease-in-out;
                }

                /* Colores de ícono permanentes */
                .social-btn.whatsapp svg path { fill: #25D366; } 
                .social-btn.instagram svg path { fill: #E1306C; }
                .social-btn.telegram svg path { fill: #229ED9; }

                /* Quitamos los colores de fondo de hover para mantener el look oscuro */
                .social-btn.whatsapp:hover,
                .social-btn.instagram:hover,
                .social-btn.telegram:hover { 
                    background-color: #333; 
                }

                .footer-bottom {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-wrap: wrap;
                    gap: 6px;
                    padding: 12px 16px;
                    font-size: 0.85rem;
                    background: #111; 
                    border-top: 1px solid #2f2f2f;
                    color: #888;
                }

                .footer-dev-sep {
                    color: #3a2a5a;
                    margin: 0 6px;
                }

                .footer-dev-credit {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    color: #666;
                    font-size: 0.82rem;
                }

                .footer-dev-logo {
                    width: 20px;
                    height: 20px;
                    object-fit: contain;
                    border-radius: 4px;
                    opacity: 0.75;
                    transition: opacity 0.2s;
                }

                .footer-dev-name {
                    font-weight: 700;
                    color: #7b2ff2;
                    letter-spacing: 0.02em;
                    transition: color 0.2s;
                }

                .footer-dev-credit:hover .footer-dev-logo { opacity: 1; }
                .footer-dev-credit:hover .footer-dev-name { color: #a259ff; }

                .footer-dev-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    text-decoration: none;
                }
                .footer-dev-link:before { content: none !important; }

                /* --- MEDIA QUERIES (RESPONSIVE): Centrado para Móvil (Mantiene el centrado) --- */
                @media (max-width: 768px) {
                    .footer-content {
                        flex-direction: column;
                        align-items: center;
                        text-align: center; 
                        gap: 25px;
                    }
                    
                    .footer-section {
                        flex: 1 1 100%;
                        min-width: 100%;
                        max-width: 300px; 
                        text-align: center; 
                    }
                    
                    .footer-section h4 {
                        margin-left: auto;
                        margin-right: auto;
                    }
                    
                    .footer-brand {
                        justify-content: center; 
                    }
                    
                    .footer-section nav {
                        align-items: center; 
                    }
                    
                    .footer-section a {
                        padding-left: 0;
                        margin-bottom: 5px;
                    }
                    
                    .footer-section a:before {
                        content: none; 
                    }
                    
                    /* El .social-icons ya tiene justify-content: center por defecto, así que se mantiene */
                }
            `}</style>
        </footer>
    );
};

export default Footer;