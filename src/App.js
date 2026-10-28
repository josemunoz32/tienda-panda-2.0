import React, { useEffect, useState, lazy, Suspense } from "react";
import { useLocation } from 'react-router-dom';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import nuevoFondo from "./assets/halloween/fondo-halloween.webp";
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Header from './components/Header';
import Footer from './pages/Footer/Footer';
import WhatsappButton from './components/WhatsappButton';
import InstagramFloatingBadge from './components/InstagramFloatingBadge/InstagramFloatingBadge';
import CookieBanner from './components/CookieBanner/CookieBanner';
import { auth } from './firebase';
import usePresence from './utils/usePresence';
import { trackPageView } from './utils/analytics';
import { captureReferralFromUrl } from './utils/referralHelper';
import Loader from './components/Loader';
import PandaModalAlert from './components/PandaModalAlert/PandaModalAlert';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-loaded pages (Code Splitting para carga ultra-rápida)
const Home = lazy(() => import('./pages/Home/Home'));
const DesarrolloWeb = lazy(() => import('./pages/DesarrolloWeb/DesarrolloWeb'));
const Registro = lazy(() => import('./pages/Registro/Registro'));
const IniciarSesion = lazy(() => import('./pages/IniciarSesion/IniciarSesion'));
const Perfil = lazy(() => import('./pages/Perfil/Perfil'));
const CategoriaPage = lazy(() => import('./pages/Categorias/CategoriaPage'));
const CategoriasList = lazy(() => import('./pages/Categorias/CategoriasList'));
const ProductosList = lazy(() => import('./pages/Productos/ProductosList'));
const ProductDetail = lazy(() => import('./pages/Productos/ProductDetail'));
const ConfirmacionExitosa = lazy(() => import('./pages/Info/ConfirmacionExitosa'));
const ConfirmacionPendiente = lazy(() => import('./pages/Info/ConfirmacionPendiente'));
const FAQ = lazy(() => import('./pages/Info/FAQ'));
const Terminos = lazy(() => import('./pages/Info/Terminos'));
const SobreNosotros = lazy(() => import('./pages/Info/SobreNosotros'));
const CheckoutCompraDirecta = lazy(() => import('./pages/Checkout/CheckoutCompraDirecta'));
const TestimoniosPage = lazy(() => import('./pages/Testimonios/TestimoniosPage'));
const CheckoutCarrito = lazy(() => import('./pages/Checkout/CheckoutCarrito'));
const MisPedidos = lazy(() => import('./pages/Checkout/MisPedidos'));
const CompraConfirmada = lazy(() => import('./pages/Checkout/CompraConfirmada'));
const InstalacionNintendo = lazy(() => import('./pages/Info/InstalacionNintendo'));
const InstalacionPlaystation = lazy(() => import('./pages/Info/InstalacionPlaystation'));
const InstalacionActivador = lazy(() => import('./pages/Info/InstalacionActivador'));
const SoporteCliente = lazy(() => import('./pages/Soporte/SoporteCliente'));
const PromosList = lazy(() => import('./pages/Promos/PromosList'));
const ProvedoresPage = lazy(() => import('./pages/Provedores/ProvedoresPage'));
const PacksNintendo = lazy(() => import('./pages/Packs/PacksNintendo'));
const SagasPage = lazy(() => import('./pages/Sagas/SagasPage'));

// Lazy-loaded Admin Pages
const AdminLayout = lazy(() => import('./pages/Admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const ProductoForm = lazy(() => import('./pages/Productos/ProductoForm'));
const AdminUsuarios = lazy(() => import('./pages/Admin/AdminUsuarios'));
const AdminResenas = lazy(() => import('./pages/Admin/AdminResenas'));
const AdminPreguntas = lazy(() => import('./pages/Admin/AdminPreguntas'));
const AdminSoporte = lazy(() => import('./pages/Admin/AdminSoporte'));
const AdminUserActivity = lazy(() => import('./pages/Admin/AdminUserActivity'));
const AdminExportEmails = lazy(() => import('./pages/Admin/AdminExportEmails'));
const AdminAutoImport = lazy(() => import('./pages/Admin/AdminAutoImport'));
const AdminCupones = lazy(() => import('./pages/Admin/AdminCupones'));
const AdminCorreos = lazy(() => import('./pages/Admin/AdminCorreos'));
const AdminArmarPack = lazy(() => import('./pages/Admin/AdminArmarPack'));
const AdminLicencias = lazy(() => import('./pages/Admin/AdminLicencias'));
const AdminRevendedores = lazy(() => import('./pages/Admin/AdminRevendedores'));
const AdminDistribuidores = lazy(() => import('./pages/Admin/AdminDistribuidores'));
const AdminJuegosSinPublicar = lazy(() => import('./pages/Admin/AdminJuegosSinPublicar'));
const AdminMetodosPago = lazy(() => import('./pages/Admin/AdminMetodosPago'));
const PortalDistribuidor = lazy(() => import('./pages/PortalDistribuidor/PortalDistribuidor'));
const CustomPackDetail = lazy(() => import('./pages/Packs/CustomPackDetail'));
const LauncherDownloadPage = lazy(() => import('./pages/Info/LauncherDownloadPage'));
const MiRutinaPage = lazy(() => import('./pages/Fitness/MiRutinaPage'));

const MOBILE_LAYOUT_BREAKPOINT = 700;
const VIEWPORT_MODE_STORAGE_KEY = 'pandaViewportMode';

// Fallback de carga elegante
const PageFallback = () => <Loader text="Cargando..." subtext="PandaStore" fullScreen={true} />;

function ScrollToTop({ userId, authLoading }) {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Wait for the initial auth lookup so a returning signed-in customer is
    // not incorrectly stored as a guest on the first page of the session.
    if (!authLoading) trackPageView(pathname, userId || null);
    captureReferralFromUrl();
  }, [pathname, userId, authLoading]);
  return null;
}

function LivePresence() {
  const { pathname } = useLocation();
  usePresence(pathname);
  return null;
}

// Rutas protegidas
function PrivateRoute({ user, authLoading, children }) {
  if (authLoading) return <PageFallback />;
  if (!user) return <Navigate to="/iniciar-sesion" replace />;
  return children;
}

function AdminRoute({ user, role, authLoading, children }) {
  if (authLoading) return <PageFallback />;
  if (!user) return <Navigate to="/iniciar-sesion" replace />;
  if (role !== "admin") return <Navigate to="/home" replace />;
  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Global styled modal alert replacing browser "localhost dice" alerts
  const [globalModal, setGlobalModal] = useState({
    isOpen: false,
    type: "info",
    title: "PandaStore",
    message: "",
    confirmText: "Entendido",
    cancelText: "Cancelar",
    danger: false,
    onConfirm: null,
    onCancel: null,
  });

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => {
      const text = typeof msg === "string" ? msg : JSON.stringify(msg);
      let type = "info";
      let title = "Notificación PandaStore";
      const lower = text.toLowerCase();
      if (lower.includes("error") || lower.includes("falló") || lower.includes("problema") || lower.includes("detalle")) {
        type = "error";
        title = "Atención Gamer";
      } else if (lower.includes("éxito") || lower.includes("exitoso") || lower.includes("aprobado") || lower.includes("completad")) {
        type = "success";
        title = "¡Excelente!";
      } else if (lower.includes("debes") || lower.includes("por favor") || lower.includes("campo") || lower.includes("requerid")) {
        type = "warning";
        title = "Aviso importante";
      }

      setGlobalModal({
        isOpen: true,
        type,
        title,
        message: text,
        confirmText: "Entendido",
        onConfirm: () => setGlobalModal(prev => ({ ...prev, isOpen: false })),
        onCancel: null,
      });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (!mounted) return;
      setUser(u);
      if (u) {
        try {
          const { getDoc, doc } = await import("firebase/firestore");
          const { db } = await import("./firebase");
          let userDoc;
          try {
            userDoc = await getDoc(doc(db, "users", u.uid));
          } catch (e) {
            userDoc = await getDoc(doc(db, "users", u.uid), { source: 'cache' });
          }
          if (mounted) setRole(userDoc && userDoc.exists() ? userDoc.data().role : null);
        } catch (err) {
          console.error("Error al obtener rol:", err);
          if (mounted) setRole(null);
        }
      } else {
        if (mounted) setRole(null);
      }
      if (mounted) setAuthLoading(false);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);


  useEffect(() => {
    const root = document.getElementById('root');
    document.body.style.backgroundImage = `url("${nuevoFondo}")`;
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = (typeof window !== 'undefined' && window.innerWidth < 600) ? 'scroll' : 'fixed';

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

  // Mantiene la escala visual de la tienda al usar los atajos de zoom más comunes.
  // El menú y los ajustes propios del navegador siempre prevalecen por accesibilidad.
  useEffect(() => {
    const preventKeyboardZoom = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (["+", "-", "=", "0"].includes(event.key)) event.preventDefault();
    };

    const preventWheelZoom = (event) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault();
    };

    window.addEventListener("keydown", preventKeyboardZoom);
    window.addEventListener("wheel", preventWheelZoom, { passive: false });

    return () => {
      window.removeEventListener("keydown", preventKeyboardZoom);
      window.removeEventListener("wheel", preventWheelZoom);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_LAYOUT_BREAKPOINT}px)`);
    const getViewportMode = () => (mediaQuery.matches ? 'mobile' : 'desktop');

    const syncViewportMode = () => {
      try {
        sessionStorage.setItem(VIEWPORT_MODE_STORAGE_KEY, getViewportMode());
      } catch (e) {
        /* ignore */
      }
    };

    syncViewportMode();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncViewportMode);
      return () => mediaQuery.removeEventListener('change', syncViewportMode);
    }

    mediaQuery.addListener(syncViewportMode);
    return () => mediaQuery.removeListener(syncViewportMode);
  }, []);

  return (
    <HelmetProvider>
      <Router>
        <Helmet>
          <title>PandaStore Chile | Juegos Digitales Steam, Switch y PS5</title>
          <meta name="description" content="Compra juegos digitales para Steam PC, Nintendo Switch, PS5 y PS4 en PandaStore Chile. Packs 2x1, entrega inmediata 24/7 y garantía total." />
          <meta name="keywords" content="comprar juegos digitales, juegos steam baratos, juegos pc baratos, activador steam pc, pandastore launcher, juegos ps4 baratos, juegos ps5 digitales, cuentas primarias ps5, cuentas secundarias ps4, juegos nintendo switch baratos, nintendo switch 2 juegos digitales, ofertas videojuegos steam, plataformas de streaming chile, netflix barato, spotify premium chile, disney plus chile, max hbo chile, cuentas streaming baratas, tienda gamer online chile, comprar juegos digitales chile, pandastore gaming" />
          <link rel="canonical" href="https://pandastoregaming.cl/" />

          {/* Open Graph */}
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="PandaStore Chile" />
          <meta property="og:locale" content="es_CL" />
          <meta property="og:url" content="https://pandastoregaming.cl/" />
          <meta property="og:title" content="PandaStore | Tienda #1 de Videojuegos Digitales • Steam PC, Nintendo Switch, PS5 y PS4" />
          <meta property="og:description" content="La tienda líder en videojuegos digitales: Steam PC con activador oficial, Nintendo Switch 1 y 2, PlayStation 5 y PS4. Precios imbatibles, packs 2x1 y entrega inmediata 24/7." />
          <meta property="og:image" content="https://pandastoregaming.cl/banner.png" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content="PandaStore — Tu tienda de videojuegos digitales" />

          {/* Twitter Card */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:site" content="@pandastoreapp" />
          <meta name="twitter:title" content="PandaStore | Tienda #1 de Videojuegos Digitales" />
          <meta name="twitter:description" content="Steam PC, Nintendo Switch, PS5 y PS4 al mejor precio. Activación inmediata 24/7." />
          <meta name="twitter:image" content="https://pandastoregaming.cl/banner.png" />
        </Helmet>

        <LivePresence />
        <ScrollToTop userId={user?.uid} authLoading={authLoading} />
        <ErrorBoundary>
          <Suspense fallback={<PageFallback />}>
            <Routes>
            {/* Rutas admin anidadas bajo AdminLayout */}
            <Route path="/admin" element={
              <AdminRoute user={user} role={role} authLoading={authLoading}>
                <AdminLayout user={user} role={role} />
              </AdminRoute>
            }>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="usuarios" element={<AdminUsuarios user={user} role={role} />} />
              <Route path="resenas" element={<AdminResenas user={user} role={role} />} />
              <Route path="cupones" element={<AdminCupones />} />
              <Route path="correos" element={<AdminCorreos user={user} role={role} />} />
              <Route path="preguntas" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="soporte" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="actividad" element={<AdminUserActivity user={user} role={role} />} />
              <Route path="exportar-correos" element={<Navigate to="/admin/correos" replace />} />
              <Route path="auto-import" element={<AdminAutoImport />} />
              <Route path="armar-pack" element={<AdminArmarPack />} />
              <Route path="licencias" element={<AdminLicencias />} />
              <Route path="revendedores" element={<AdminRevendedores user={user} role={role} />} />
              <Route path="distribuidores" element={<AdminDistribuidores user={user} role={role} />} />
              <Route path="juegos-sin-publicar" element={<AdminJuegosSinPublicar />} />
              <Route path="metodos-pago" element={<AdminMetodosPago />} />
            </Route>
            
            {/* Rutas Privadas de Entrenamiento PandaFit (URL Oculta) */}
            <Route path="/mi-rutina-fit" element={<MiRutinaPage />} />
            <Route path="/rutina-gym" element={<MiRutinaPage />} />
            <Route path="/pandafit" element={<MiRutinaPage />} />

            {/* Rutas Exclusivas de Desarrollo Web & E-Commerce (Layout independiente sin logos de juegos) */}
            <Route path="/pandastoredesarrollo" element={<DesarrolloWeb mode="onepage" />} />
            <Route path="/desarrollo-web" element={<DesarrolloWeb mode="onepage" />} />
            <Route path="/desarrollo-web/onepage" element={<DesarrolloWeb mode="onepage" />} />
            <Route path="/onepage" element={<DesarrolloWeb mode="onepage" />} />
            <Route path="/ecommerce" element={<DesarrolloWeb mode="ecommerce" />} />
            <Route path="/desarrollo-web/ecommerce" element={<DesarrolloWeb mode="ecommerce" />} />
            <Route path="/pandastoreecommerce" element={<DesarrolloWeb mode="ecommerce" />} />

            {/* Todas las demás rutas con Header/Footer */}
            <Route path="*" element={
              <>
                <div
                  aria-hidden="true"
                  style={{
                    position: 'fixed',
                    inset: 0,
                    width: '100%',
                    maxWidth: '100%',
                    zIndex: 0,
                    pointerEvents: 'none',
                    backgroundImage: `url("${nuevoFondo}")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                    backgroundColor: '#120526'
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
                    <Suspense fallback={<PageFallback />}>
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
                        <Route path="/instalacion-playstation" element={<InstalacionPlaystation />} />
                        <Route path="/instalacion-activador" element={<Navigate to="/descargar-launcher" replace />} />
                        <Route path="/instalacion-activador-steam" element={<Navigate to="/descargar-launcher" replace />} />
                        <Route path="/soporte" element={<SoporteCliente />} />
                        <Route path="/promos" element={<PromosList />} />
                        <Route path="/sagas" element={<SagasPage />} />
                        <Route path="/sagas-legendarias" element={<SagasPage />} />
                        <Route path="/packs-nintendo" element={<PacksNintendo />} />
                        <Route path="/pack/:packId" element={<CustomPackDetail />} />
                        <Route path="/provedores" element={<ProvedoresPage />} />
                        <Route path="/proveedores" element={<ProvedoresPage />} />
                        <Route path="/emprendedores" element={<ProvedoresPage />} />
                        <Route path="/revendedores" element={<Navigate to="/iniciar-sesion?mode=revendedor" replace />} />
                        <Route path="/revendedor" element={<Navigate to="/iniciar-sesion?mode=revendedor" replace />} />
                        <Route path="/registro-revendedor" element={<Navigate to="/iniciar-sesion?mode=revendedor" replace />} />
                        <Route path="/descargar-launcher" element={<LauncherDownloadPage />} />
                        <Route path="/portal-distribuidor" element={<PortalDistribuidor />} />
                        <Route path="/confirmacion-exitosa" element={<ConfirmacionExitosa/>} />
                        <Route path="/success" element={<ConfirmacionExitosa/>} />
                        <Route path="/confirmacion-pendiente" element={<ConfirmacionPendiente/>} />
                        <Route path="/pending" element={<ConfirmacionPendiente/>} />

                        {/* Rutas solo para usuarios logueados */}
                        <Route path="/perfil" element={
                          <PrivateRoute user={user} authLoading={authLoading}><Perfil user={user} /></PrivateRoute>
                        } />
                        <Route path="/mispedidos" element={
                          <PrivateRoute user={user} authLoading={authLoading}><MisPedidos /></PrivateRoute>
                        } />
                        <Route path="/checkoutcarrito" element={<CheckoutCarrito user={user} />} />
                        <Route path="/comprar-ahora" element={<CheckoutCompraDirecta user={user} />} />
                        <Route path="/compra-confirmada" element={<CompraConfirmada user={user} />} />

                        {/* Rutas de gestión de productos solo para admin */}
                        <Route path="/producto/nuevo" element={
                          <AdminRoute user={user} role={role} authLoading={authLoading}><ProductoForm /></AdminRoute>
                        } />
                        <Route path="/producto/editar/:id" element={
                          <AdminRoute user={user} role={role} authLoading={authLoading}><ProductoForm /></AdminRoute>
                        } />
                      </Routes>
                    </Suspense>
                    <Footer />
                    <InstagramFloatingBadge />
                    <WhatsappButton />
                    <CookieBanner />
                  </div>
                </div>
              </>
            } />
          </Routes>
        </Suspense>
      </ErrorBoundary>

        {/* Global Gamer Modal Alert (Zero "localhost dice" dialogs) */}
        <PandaModalAlert
          isOpen={globalModal.isOpen}
          type={globalModal.type}
          title={globalModal.title}
          message={globalModal.message}
          confirmText={globalModal.confirmText}
          cancelText={globalModal.cancelText}
          danger={globalModal.danger}
          onConfirm={globalModal.onConfirm}
          onCancel={globalModal.onCancel}
        />
      </Router>
    </HelmetProvider>
  );
}

export default App;
