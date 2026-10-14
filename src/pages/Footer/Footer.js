import React from "react";
import { Link } from "react-router-dom";
import miIcono from "../../assets/logos/miicono.png";
import logoIg from "../../assets/logos/logoig.png";
import logoWsp from "../../assets/logos/logowsp.png";
import footerBackground from "../../assets/footer/pandastore-footer-gaming.png";
import "./Footer.css";

const footerLinks = [
  { to: "/packs-nintendo", label: "Packs Nintendo Switch" },
  { to: "/descargar-launcher", label: "PandaStore Launcher + Activador PC" },
  { to: "/promos", label: "Promociones y Panda Pass" },
  { to: "/preguntas-frecuentes", label: "Preguntas frecuentes" },
  { to: "/sobre-nosotros", label: "Sobre nosotros" },
  { to: "/terminos", label: "Términos y garantías" },
];

const socialLinks = [
  { href: "https://wa.me/56974751810?text=Hola%20PandaStore!%20Vengo%20desde%20la%20p%C3%A1gina%20web", label: "WhatsApp", icon: logoWsp },
  { href: "https://www.instagram.com/pandastoregaming.cl/", label: "Instagram", icon: logoIg },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="panda-footer">
      <div className="panda-footer__background" style={{ backgroundImage: `url(${footerBackground})` }} aria-hidden="true" />
      <div className="panda-footer__veil" aria-hidden="true" />
      <svg className="panda-footer__curve panda-footer__curve--back" viewBox="0 0 1440 132" preserveAspectRatio="none" aria-hidden="true"><path d="M0,75 C210,138 405,14 725,62 C1030,108 1220,14 1440,68 L1440,0 L0,0 Z" /></svg>
      <svg className="panda-footer__curve panda-footer__curve--front" viewBox="0 0 1440 132" preserveAspectRatio="none" aria-hidden="true"><path d="M0,88 C265,20 468,124 748,77 C1048,27 1234,118 1440,56 L1440,0 L0,0 Z" /></svg>
      <div className="panda-footer__content">
        <Link className="panda-footer__brand" to="/home" aria-label="Ir al inicio de PandaStore">
          <span className="panda-footer__logo-shell"><img src={miIcono} alt="" /></span>
          <span><strong>Panda<span>Store</span></strong><small>PLATAFORMA GAMER OFICIAL</small></span>
        </Link>
        <p className="panda-footer__message">Videojuegos digitales, suscripciones y activación segura para jugar sin límites.</p>
        <nav className="panda-footer__links" aria-label="Enlaces del pie de página">
          {footerLinks.map(({ to, label }) => <Link key={to} to={to}>{label}</Link>)}
        </nav>
        <div className="panda-footer__socials" aria-label="Redes sociales oficiales">
          {socialLinks.map(({ href, label, icon }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`PandaStore en ${label}`}><img src={icon} alt="" /><span>{label}</span></a>)}
          <a href="https://t.me/NintendoChile2" target="_blank" rel="noopener noreferrer" aria-label="PandaStore en Telegram"><svg viewBox="0 0 496 512" aria-hidden="true"><path d="M248 8C111 8 0 119 0 256S111 504 248 504 496 393 496 256 385 8 248 8zM363 176.7c-3.7 39.2-19.9 134.4-28.1 178.3-3.5 18.6-10.3 24.8-16.9 25.4-14.4 1.3-25.3-9.5-39.3-18.7-21.8-14.3-34.2-23.2-55.3-37.2-24.5-16.1-8.6-25 5.3-39.5 3.7-3.8 67.1-61.5 68.3-66.7.2-.7.3-3.1-1.2-4.4s-3.6-.8-5.1-.5q-3.3.7-104.6 69.1-14.8 10.2-26.9 9.9c-8.9-.2-25.9-5-38.6-9.1-15.5-5-27.9-7.7-26.8-16.3q.8-6.7 18.5-13.7 108.4-47.2 144.6-62.3c68.9-28.6 83.2-33.6 92.5-33.8 2.1 0 6.6.5 9.6 2.9a10.5 10.5 0 0 1 3.5 6.7A43.8 43.8 0 0 1 363 176.7z" /></svg><span>Telegram</span></a>
        </div>
        <div className="panda-footer__meta"><span>© {currentYear} PandaStore Gaming. Todos los derechos reservados.</span><span className="panda-footer__status"><i /> Servidores online</span></div>
      </div>
    </footer>
  );
}
