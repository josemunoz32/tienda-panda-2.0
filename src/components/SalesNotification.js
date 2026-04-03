import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { prodUrl } from '../utils/slugify';
import { getAllProductsWithImage } from "../utils/allProducts";
import { notificationNames } from "../utils/notificationNames";
import { auth } from "../firebase"; // Agrega esta línea para obtener el usuario

// Shuffle y ciclo de nombres únicos
function shuffle(array) {
  let arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

let shuffledNames = shuffle(notificationNames);
let nameIndex = 0;
function getNextName() {
  if (nameIndex >= shuffledNames.length) {
    shuffledNames = shuffle(notificationNames);
    nameIndex = 0;
  }
  return shuffledNames[nameIndex++];
}
const demoActions = [
  "compró", "añadió a favoritos", "agregó al carrito"
];

const styles = {
  container: {
    position: 'fixed',
    left: 16,
    bottom: 20,
    zIndex: 9999,
    minWidth: 200,
    maxWidth: 270,
    width: '60vw',
    background: '#18122b',
    color: '#fff',
    borderRadius: 18,
    boxShadow: '0 4px 24px #7b2ff299',
    display: 'flex',
    alignItems: 'center',
    padding: '14px 14px',
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 600,
    fontSize: 16,
    gap: 16,
    border: '2.5px solid #a084e8',
    boxSizing: 'border-box',
    right: 90,
    opacity: 1,
    transform: 'translateY(0)',
    transition: 'opacity 0.7s cubic-bezier(.4,2,.6,1), transform 0.7s cubic-bezier(.4,2,.6,1)',
  },
  containerHidden: {
    opacity: 0,
    transform: 'translateY(40px)',
    pointerEvents: 'none',
  },
  img: {
    width: 64,
    height: 64,
    borderRadius: 12,
    objectFit: 'contain',
    border: '2.5px solid #fff',
    boxShadow: '0 2px 12px #0005',
    background: 'none',
    flexShrink: 0,
    padding: 0,
    display: 'block',
  },
  text: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  user: {
    fontWeight: 700,
    color: '#38bdf8',
    fontSize: 17,
    maxWidth: 120,
    display: 'inline-block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    verticalAlign: 'middle',
  },
  action: {
    fontWeight: 500,
    color: '#cbd5e1',
    fontSize: 13,
    marginLeft: 4,
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    display: 'inline',
  },
  product: {
    fontWeight: 700,
    color: '#fff',
    fontSize: 16,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }
};

// Media query para móvil
const mobileStyle = `
@media (max-width: 600px) {
  .sales-notification {
    left: 2vw !important;
    right: 80px !important;
    min-width: unset !important;
    max-width: 70vw !important;
    width: 62vw !important;
    padding: 10px 4px !important;
    font-size: 14px !important;
    border-radius: 14px !important;
  }
  .sales-notification img {
    width: 48px !important;
    height: 48px !important;
    border-radius: 8px !important;
  }
}
`;

// Nuevo hook para detectar móvil
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isMobile;
}

// Recibe isMenuOpen como prop (debes pasarla desde el componente padre)
export default function SalesNotification({ isMenuOpen }) {
  const [products, setProducts] = useState([]);
  const [event, setEvent] = useState(null);
  const [visible, setVisible] = useState(true);
  const [idx, setIdx] = useState(0);
  const [fastCount, setFastCount] = useState(0);
  const navigate = useNavigate();
  const user = auth.currentUser;
  const isMobile = useIsMobile();

  useEffect(() => {
    getAllProductsWithImage().then(setProducts);
  }, []);

  useEffect(() => {
    if (products.length === 0) return;
    // Primeras 3 notificaciones rápidas (cada 6s)
    if (fastCount < 3) {
      const prod = products[Math.floor(Math.random() * products.length)];
      const user = getNextName();
      const action = demoActions[Math.floor(Math.random() * demoActions.length)];
      setEvent({ user, action, product: prod.name, image: prod.image, id: prod.id });
      setVisible(true);
      const showTime = 5000;
      const hideTime = 1000;
      const timer1 = setTimeout(() => setVisible(false), showTime);
      const timer2 = setTimeout(() => {
        setIdx(i => i + 1);
        setFastCount(c => c + 1);
      }, showTime + hideTime);
      return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }
    // Después, modo realista: baja frecuencia
    const showNothing = Math.random() < 0.8;
    if (showNothing) {
      setVisible(false);
      const idleTime = 15000 + Math.random() * 25000; // 15-40s sin notificación
      const timer = setTimeout(() => setIdx(i => i + 1), idleTime);
      return () => clearTimeout(timer);
    }
    // Generar evento aleatorio con producto real
    const prod = products[Math.floor(Math.random() * products.length)];
    const user = getNextName();
    const action = demoActions[Math.floor(Math.random() * demoActions.length)];
    setEvent({ user, action, product: prod.name, image: prod.image, id: prod.id });
    setVisible(true);
    const showTime = 8000;
    const hideTime = 2000;
    const timer1 = setTimeout(() => setVisible(false), showTime);
    const timer2 = setTimeout(() => setIdx(i => i + 1), showTime + hideTime);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [products, idx, fastCount]);

  // Los hooks ya están arriba, ahora sí puedes condicionar el render:
  if (isMenuOpen) return null;
  if (!event) return null;

  const notificationStyle = {
    ...styles.container,
    ...(visible ? {} : styles.containerHidden),
    cursor: user ? 'pointer' : 'not-allowed'
  };

  const handleNotificationClick = () => {
    if (user && event && event.id) {
      navigate(prodUrl(event.product, event.id));
    }
  };

  return (
    <>
      <style>{mobileStyle}</style>
      <div
        style={notificationStyle}
        className="sales-notification"
        onClick={handleNotificationClick}
        role="button"
        tabIndex={0}
        onKeyPress={e => { if (user && e.key === 'Enter') handleNotificationClick(); }}
        aria-disabled={!user}
      >
        <img src={event.image} alt={event.product} style={styles.img} />
        <div style={styles.text}>
          <span>
            <span style={styles.user}>{event.user}</span>
            <span style={styles.action}> {event.action}:</span>
          </span>
          <span style={styles.product}>{event.product}</span>
        </div>
      </div>
    </>
  );
}

