import React, { useEffect, useState } from "react";
import { useLocation } from 'react-router-dom';
// GalaxyBackground desactivado
import nuevoFondo from "./assets/nuevo fondo 2.0/fondo nuevo.png";
import HalloweenOverlay from "./components/HalloweenOverlay";
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Registro from './pages/Registro/Registro';
import IniciarSesion from './pages/IniciarSesion/IniciarSesion';
import Home from './pages/Home/Home';
import Perfil from './pages/Perfil/Perfil';
import Header from './components/Header';
import Footer from './pages/Footer/Footer';
import AdminDashboard from "./pages/Admin/AdminDashboard";
import { auth } from './firebase';
import SalesNotification from './components/SalesNotification';
import CategoriaPage from "./pages/Categorias/CategoriaPage";
import ProductoForm from "./pages/Productos/ProductoForm";
import CategoriasList from "./pages/Categorias/CategoriasList";
import ProductosList from "./pages/Productos/ProductosList";
import ProductDetail from "./pages/Productos/ProductDetail";
import ConfirmacionExitosa from './pages/Info/ConfirmacionExitosa';
import ConfirmacionPendiente from './pages/Info/ConfirmacionPendiente';
import FAQ from './pages/Info/FAQ';
import Terminos from './pages/Info/Terminos';
import SobreNosotros from './pages/Info/SobreNosotros';
import AdminUsuarios from './pages/Admin/AdminUsuarios';
import AdminResenas from './pages/Admin/AdminResenas';
import CheckoutCompraDirecta from './pages/Checkout/CheckoutCompraDirecta';
import TestimoniosPage from "./pages/Testimonios/TestimoniosPage";
import CheckoutCarrito from "./pages/Checkout/CheckoutCarrito";
import MisPedidos from "./pages/Checkout/MisPedidos";
import CompraConfirmada from "./pages/Checkout/CompraConfirmada";
import InstalacionNintendo from "./pages/Info/InstalacionNintendo";
import SoporteCliente from "./pages/Soporte/SoporteCliente";
import AdminSoporte from "./pages/Admin/AdminSoporte";

import AdminCupones from './pages/Admin/AdminCupones';
import PromosList from './pages/Promos/PromosList';
import GlobalChatbot from './components/GlobalChatbot';

const MOBILE_LAYOUT_BREAKPOINT = 700;
const VIEWPORT_MODE_STORAGE_KEY = 'pandaViewportMode';
const VIEWPORT_RELOAD_TIME_KEY = 'pandaViewportReloadAt';

// Rutas protegidas
function PrivateRoute({ user, children }) {
  if (!user) return <Navigate to="/iniciar-sesion" replace />;
  return children;
}

function AdminRoute({ user, role, children }) {
  if (!user) return <Navigate to="/iniciar-sesion" replace />;
  if (role !== "admin") return <Navigate to="/home" replace />;
  return children;
}

function App() {
  // Scroll al top al cambiar de ruta
  function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [pathname]);
    return null;
  }
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        // Obtener rol del usuario
        const { getDoc, doc } = await import("firebase/firestore");
        const { db } = await import("./firebase");
        const userDoc = await getDoc(doc(db, "users", u.uid));
        setRole(userDoc.exists() ? userDoc.data().role : null);
      } else {
        setRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Cargar PayPal JS SDK dinámicamente usando el client-id del .env
  useEffect(() => {
    // Evita cargar el script si ya existe
    if (document.getElementById("paypal-sdk")) return;
    if (process.env.REACT_APP_PAYPAL_CLIENT_ID) {
      const script = document.createElement("script");
      script.id = "paypal-sdk";
      script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.REACT_APP_PAYPAL_CLIENT_ID}&currency=USD`;
      script.async = true;
      document.body.appendChild(script);
      return () => {
        if (document.getElementById("paypal-sdk")) {
          document.body.removeChild(script);
        }
      };
    }
  }, []);

  useEffect(() => {
    const root = document.getElementById('root');
    // Aplicar fondo global directamente al body y root
    document.body.style.backgroundImage = `url("${nuevoFondo}")`;
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = (typeof window !== 'undefined' && window.innerWidth < 600) ? 'scroll' : 'fixed';

    // También en <html> por si algún contenedor deja ver el fondo del documento
    document.documentElement.style.backgroundImage = `url("${nuevoFondo}")`;
    document.documentElement.style.backgroundRepeat = 'no-repeat';
    document.documentElement.style.backgroundSize = 'cover';
    document.documentElement.style.backgroundPosition = 'center';
    document.documentElement.style.backgroundAttachment = (typeof window !== 'undefined' && window.innerWidth < 600) ? 'scroll' : 'fixed';
    if (root) {
      root.style.background = 'transparent';
      root.style.backgroundColor = 'transparent';
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_LAYOUT_BREAKPOINT}px)`);
    const getViewportMode = () => (mediaQuery.matches ? 'mobile' : 'desktop');

    const syncViewportMode = () => {
      sessionStorage.setItem(VIEWPORT_MODE_STORAGE_KEY, getViewportMode());
    };

    const handleViewportModeChange = () => {
      const nextMode = getViewportMode();
      const previousMode = sessionStorage.getItem(VIEWPORT_MODE_STORAGE_KEY);

      if (!previousMode) {
        syncViewportMode();
        return;
      }

      if (previousMode === nextMode) return;

      const now = Date.now();
      const lastReloadAt = Number(sessionStorage.getItem(VIEWPORT_RELOAD_TIME_KEY) || '0');

      sessionStorage.setItem(VIEWPORT_MODE_STORAGE_KEY, nextMode);

      if (now - lastReloadAt < 2000) return;

      sessionStorage.setItem(VIEWPORT_RELOAD_TIME_KEY, String(now));
      window.location.reload();
    };

    syncViewportMode();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleViewportModeChange);
      return () => mediaQuery.removeEventListener('change', handleViewportModeChange);
    }

    mediaQuery.addListener(handleViewportModeChange);
    return () => mediaQuery.removeListener(handleViewportModeChange);
  }, []);

  return (
  <Router>
    <ScrollToTop />
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        backgroundImage: `url("${nuevoFondo}")`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
    <div
      className="main-bg-container"
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'transparent',
      }}
    >
      <Header user={user} onRoleChange={setRole} onSidebarChange={setIsMenuOpen} />
      <div style={{ background: 'transparent' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/iniciar-sesion" element={<IniciarSesion />} />
          <Route path="/home" element={<Home />} />
          <Route path="/categorias" element={<CategoriasList />} />
          <Route path="/productos" element={<ProductosList />} />
          <Route path="/categoria/:id" element={<CategoriaPage />} />
          <Route path="/testimonios" element={<TestimoniosPage />} />
          <Route path="/producto/:id" element={<ProductDetail />} />
          <Route path="/preguntas-frecuentes" element={<FAQ />} />
          <Route path="/terminos" element={<Terminos />} />
          <Route path="/sobre-nosotros" element={<SobreNosotros />} />
          <Route path="/instalacion-nintendo" element={<InstalacionNintendo />} />
          <Route path="/soporte" element={<SoporteCliente />} />
          <Route path="/promos" element={<PromosList />} />
          <Route path="/confirmacion-exitosa" element={<ConfirmacionExitosa/>} />
          <Route path="/confirmacion-pendiente" element={<ConfirmacionPendiente/>} />

          {/* Rutas solo para usuarios logueados */}
          <Route path="/perfil" element={
            <PrivateRoute user={user}><Perfil /></PrivateRoute>
          } />
          <Route path="/mispedidos" element={
            <PrivateRoute user={user}><MisPedidos /></PrivateRoute>
          } />
          <Route path="/checkoutcarrito" element={
            <PrivateRoute user={user}><CheckoutCarrito /></PrivateRoute>
          } />
          <Route path="/comprar-ahora" element={
            <PrivateRoute user={user}><CheckoutCompraDirecta /></PrivateRoute>
          } />
          <Route path="/compra-confirmada" element={
            <PrivateRoute user={user}><CompraConfirmada /></PrivateRoute>
          } />

          {/* Rutas de gestión de productos solo para admin */}
          <Route path="/producto/nuevo" element={
            <AdminRoute user={user} role={role}><ProductoForm /></AdminRoute>
          } />
          <Route path="/producto/editar/:id" element={
            <AdminRoute user={user} role={role}><ProductoForm /></AdminRoute>
          } />
          <Route path="/admin/usuarios" element={
            <AdminRoute user={user} role={role}><AdminUsuarios user={user} role={role} /></AdminRoute>
          } />
          <Route path="/admin/resenas" element={
            <AdminRoute user={user} role={role}><AdminResenas user={user} role={role} /></AdminRoute>
          } />
          <Route path="/admin/dashboard" element={
            <AdminRoute user={user} role={role}><AdminDashboard /></AdminRoute>
          } />
          <Route path="/admin/soporte" element={
            <AdminRoute user={user} role={role}><AdminSoporte /></AdminRoute>
          } />
          <Route path="/admin/cupones" element={
            <AdminRoute user={user} role={role}><AdminCupones /></AdminRoute>
          } />
        </Routes>
        <Footer />
        <SalesNotification isMenuOpen={isMenuOpen} />
        <GlobalChatbot user={user} />
      </div>
    </div>
    </Router>
  );
}

export default App;