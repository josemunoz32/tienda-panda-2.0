import React, { useEffect, useState } from "react";
import GalaxyBackground from "./components/GalaxyBackground";
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
import WhatsappButton from './components/WhatsappButton';
import AdminCupones from './pages/Admin/AdminCupones';

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
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

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

  return (
    <Router>
        <GalaxyBackground />
      <Header user={user} onRoleChange={setRole} />
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
      <WhatsappButton />
    </Router>
  );
}

export default App;