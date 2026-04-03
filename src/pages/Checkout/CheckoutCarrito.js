import React, { useEffect, useState } from "react";
import PayPalButton from "../../components/PayPalButton";
import { PayPalButtonWrapper } from "../Pagos/PayPalButtonWrapper";
import { db, auth, storage } from "../../firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  addDoc,
  setDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { useMoneda } from "../../context/MonedaContext";
import { useNavigate } from "react-router-dom";

// --- Funciones auxiliares ---
export function getMinPriceByMoneda(prod, moneda) {
  const precios = [];
  if (!prod) return null;
  if (moneda === "CLP") {
    if (prod.priceCLP) precios.push(Number(prod.priceCLP));
    if (prod.pricePrimariaCLP) precios.push(Number(prod.pricePrimariaCLP));
    if (prod.priceSecundariaCLP) precios.push(Number(prod.priceSecundariaCLP));
    if (Array.isArray(prod.preciosPorMes)) {
      prod.preciosPorMes.forEach((p) => {
        if (p.clp) precios.push(Number(p.clp));
      });
    }
  } else if (moneda === "USD") {
    if (prod.priceUSD) precios.push(Number(prod.priceUSD));
    if (prod.pricePrimariaUSD) precios.push(Number(prod.pricePrimariaUSD));
    if (prod.priceSecundariaUSD) precios.push(Number(prod.priceSecundariaUSD));
    if (Array.isArray(prod.preciosPorMes)) {
      prod.preciosPorMes.forEach((p) => {
        if (p.usd) precios.push(Number(p.usd));
      });
    }
  }
  const min = precios.length > 0 ? Math.min(...precios.filter((x) => x > 0)) : null;
  return min;
}

function formatPrecio(precio, moneda) {
  if (!precio || isNaN(precio)) return "";
  if (moneda === "USD") {
    return `$${Number(precio).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (moneda === "CLP") {
    return `$${Number(precio).toLocaleString("es-CL")}`;
  }
  return precio;
}

// --- Componente principal ---
export default function CheckoutCarrito() {
  // Estado para cupón
  const [cupon, setCupon] = useState("");
  const [cuponInfo, setCuponInfo] = useState(null);
  const [cuponError, setCuponError] = useState("");
  const [descuento, setDescuento] = useState(0);
  const navigate = useNavigate();
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [transferenciaRealizada, setTransferenciaRealizada] = useState(false);
  const [bancoSeleccionado, setBancoSeleccionado] = useState(null);
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [comprobanteUploading, setComprobanteUploading] = useState(false);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [metodoPago, setMetodoPago] = useState("");
  const { moneda } = useMoneda();
  const [selectedMoneda, setSelectedMoneda] = useState(moneda);
  const [cart, setCart] = useState([]);
  const [cartProducts, setCartProducts] = useState({});
  const [categorias, setCategorias] = useState([]);
  const user = auth.currentUser;
  const [userProfile, setUserProfile] = useState({ firstName: "", lastName: "" });

  const total = cart.reduce((acc, prod) => {
    let precio = 0;
    if (selectedMoneda === "CLP" && prod.priceCLP) precio = Number(prod.priceCLP);
    else if (selectedMoneda === "USD" && prod.priceUSD) precio = Number(prod.priceUSD);
    return acc + (precio || 0);
  }, 0);
    const rawTotalConDescuento = Math.max(0, total - (total * (descuento / 100)));
    const totalConDescuentoRedondeado =
      selectedMoneda === "CLP" && metodoPago === "mercadopago"
        ? Math.ceil(rawTotalConDescuento)
        : rawTotalConDescuento;
    const huboRedondeo =
      selectedMoneda === "CLP" && metodoPago === "mercadopago" && rawTotalConDescuento !== totalConDescuentoRedondeado;
  // Validar cupón
  const validarCupon = async () => {
    setCuponError("");
    setCuponInfo(null);
    setDescuento(0);
    if (!cupon) return;
    try {
      const snap = await getDocs(collection(db, "cupones"));
      const match = snap.docs.find(doc => doc.data().codigo.toLowerCase() === cupon.trim().toLowerCase());
      if (!match) {
        setCuponError("Cupón no válido");
        return;
      }
      const data = match.data();
      if (!data.activo) {
        setCuponError("Cupón inactivo");
        return;
      }
      if (data.expiracion && data.expiracion.toDate() < new Date()) {
        const totalConDescuento = Math.max(0, total - (total * (descuento / 100)));
        // Para MercadoPago, CLP debe ser entero
        const totalConDescuentoRedondeado = Math.ceil(totalConDescuento);
        return;
      }
      if (data.usoMaximo && data.usadoPor && data.usadoPor.length >= data.usoMaximo) {
        setCuponError("Cupón agotado");
        return;
      }
      if (data.usadoPor && user && data.usadoPor.includes(user.uid)) {
        setCuponError("Ya usaste este cupón");
        return;
      }
      if (data.descuento > 50) {
        setCuponError("El descuento máximo permitido es 50%");
        return;
      }
      setCuponInfo({ ...data, id: match.id });
      setDescuento(data.descuento);
    } catch (e) {
      setCuponError("Error al validar cupón");
    }
  };
  // Marcar cupón como usado por el usuario (solo si se finaliza la compra)
  const marcarCuponUsado = async () => {
    if (!cuponInfo || !user) return;
    try {
      const cuponRef = doc(db, "cupones", cuponInfo.id);
      await updateDoc(cuponRef, {
        usadoPor: [...(cuponInfo.usadoPor || []), user.uid]
      });
    } catch (e) {
      // opcional: manejar error
    }
  };

  // --- Efectos ---
  useEffect(() => {
    if (user?.uid) {
      getDoc(doc(db, "users", user.uid)).then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserProfile({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
          });
        }
      });
    }
  }, [user]);



  useEffect(() => {
    setSelectedMoneda(moneda);
    setMetodoPago("");
  }, [moneda]);

  useEffect(() => {
    if (!user) return;
    const cartRef = collection(db, `users/${user.uid}/cart`);
    const unsubscribe = onSnapshot(cartRef, async (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCart(items);
      const prods = {};
      for (const item of items) {
        const prodSnap = await getDoc(doc(db, "products", item.id));
        if (prodSnap.exists()) {
          prods[item.id] = prodSnap.data();
        }
      }
      setCartProducts(prods);
    });
    return () => unsubscribe();
  }, [user]);

  // --- Datos de bancos para transferencia ---
  const bancos = [
    {
      id: 'mercadopago',
      nombre: 'Mercado Pago',
      logo: '/logos%20bancos/mercadopago.jpg',
      color: '#009ee3',
      bg: 'rgba(0,158,227,0.15)',
      datos: `Titular: José Roberto Muñoz Osses\nRUT: 21.715.187-2\nTipo de cuenta: Cuenta Vista\nN° Cuenta: 1095508563\nEmail: comprobantesswitch2@gmail.com`,
    },
    {
      id: 'estado',
      nombre: 'BancoEstado',
      logo: '/logos%20bancos/banco%20estado.png',
      color: '#f5941d',
      bg: 'rgba(245,148,29,0.15)',
      datos: `Titular: Matías Muñoz\nRUT: 236326845\nTipo de cuenta: Cuenta RUT / Cuenta Vista\nN° Cuenta: 236326845\nEmail: comprobantesswitch2@gmail.com`,
    },
    {
      id: 'santander',
      nombre: 'Banco Santander',
      logo: '/logos%20bancos/santander.png',
      color: '#ec1c24',
      bg: 'rgba(236,28,36,0.15)',
      datos: `Titular: Jose Roberto Muñoz Osses\nRUT: 21.715.187-2\nTipo de cuenta: Cuenta Corriente\nN° Cuenta: 0 000 97 74931 0\nEmail: comprobantesswitch2@gmail.com`,
    },
  ];

  const datosCrypto = `USDT (BEP20): 0x7320E27e6FEB10d2bA387928c5bb6675b2AD2965\nMonto: ${formatPrecio(totalConDescuentoRedondeado, "USD")}`;

  return (
    <div style={{
      position: "relative",
      minHeight: "100vh",
      width: "100vw",
      overflowX: "hidden",
      background: "transparent",
      paddingTop: 90
    }}>
      {procesandoPago && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(10,5,30,0.88)', backdropFilter: 'blur(8px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(26,16,53,0.98) 0%, rgba(45,25,80,0.98) 100%)',
            border: '1.5px solid rgba(162,89,255,0.35)',
            borderRadius: 24, padding: '2.5rem 2rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
            boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 40px rgba(123,47,242,0.2)',
            minWidth: 280, maxWidth: 360, textAlign: 'center'
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              border: '4px solid rgba(162,89,255,0.2)',
              borderTop: '4px solid #a259ff',
              animation: 'pandaSpin 1s linear infinite'
            }} />
            <div style={{ color: '#c4b5fd', fontWeight: 700, fontSize: '1.2rem' }}>
              Procesando tu pago...
            </div>
            <div style={{ color: '#a08ab8', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {comprobanteUploading ? 'Subiendo comprobante...' : 'Guardando tu pedido...'}
            </div>
            <div style={{
              background: 'rgba(123,47,242,0.12)', border: '1px solid rgba(162,89,255,0.25)',
              borderRadius: 10, padding: '10px 16px',
              color: '#c4b5fd', fontSize: '0.82rem'
            }}>
              ⚠️ Por favor no cierres ni recargues la página
            </div>
          </div>
          <style>{`@keyframes pandaSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {/* Fondo galaxia animado si lo usas en Home */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 0,
          pointerEvents: "none"
        }}
        id="checkout-bg-fondo"
      />
      <div className="checkout-container" style={{
        position: "relative",
        zIndex: 2
      }}>
        <h2 className="checkout-title">Carrito de Compras</h2>

        {/* Carrito vacío */}
        {cart.length === 0 ? (
          <div className="checkout-empty">No hay productos en tu carrito.</div>
        ) : (
          <>
            {/* Lista de productos */}
            <ul className="checkout-cart-list">
              {cart.map((prod) => {
                let precio = "";
                let detalle = "";
                if (selectedMoneda === "CLP" && prod.priceCLP) precio = prod.priceCLP;
                else if (selectedMoneda === "USD" && prod.priceUSD) precio = prod.priceUSD;
                if (prod.variante) detalle = `Variante: ${prod.variante}`;
                if (prod.meses) detalle = `Meses: ${prod.meses}`;
                return (
                  <li key={prod.id} className="checkout-cart-item">
                    {prod.imageUrl && <img src={prod.imageUrl} alt={prod.name} />}
                    <div className="item-info">
                      <div className="item-name">{prod.name}</div>
                      <div className="item-price">
                        {selectedMoneda}: {formatPrecio(precio, selectedMoneda)}{" "}
                        {detalle && <span className="item-detail">({detalle})</span>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Total */}
            <div className="checkout-total">
              Total: <span style={descuento > 0 ? {textDecoration:'line-through',color:'#fff5'} : {}}>{formatPrecio(total, selectedMoneda)}</span>
                {descuento > 0 && (
                  <span style={{color:'#81c784',fontWeight:700,marginLeft:8}}>
                    {formatPrecio(totalConDescuentoRedondeado, selectedMoneda)}
                    {huboRedondeo && (
                      <span style={{color:'#81c784',fontWeight:500,fontSize:'0.95em',marginLeft:6}}>
                        (redondeado hacia arriba)
                      </span>
                    )}
                  </span>
                )}
            </div>

            {/* Campo para cupón */}
            <div style={{ width: '100%', maxWidth: 540, margin: '0 auto 14px auto', display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="¿Tienes un cupón?"
                value={cupon}
                onChange={e => setCupon(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1.5px solid rgba(162,89,255,0.3)', fontSize: 15, background: 'rgba(255,255,255,0.06)', color: '#e8e0f5', outline: 'none' }}
              />
              <button type="button" onClick={validarCupon} style={{ background: 'linear-gradient(90deg,#7b2ff2,#a259ff)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 18px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(123,47,242,0.3)' }}>
                Aplicar
              </button>
            </div>
            {cuponError && <div style={{ color: '#ff6b6b', marginBottom: 8, fontSize: 14 }}>{cuponError}</div>}
            {descuento > 0 && <div style={{ color: '#81c784', marginBottom: 8, fontSize: 14 }}>Cupón aplicado: -{descuento}%</div>}

            {/* Selector método de pago */}
            <div className="checkout-method">
              <label>Método de pago:</label>
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                <option value="">Selecciona...</option>
                {selectedMoneda === "CLP" && (
                  <>
                    <option value="mercadopago">MercadoPago</option>
                    <option value="transferencia">Transferencia</option>
                  </>
                )}
                {selectedMoneda === "USD" && (
                  <>
                    <option value="paypal">PayPal</option>
                    <option value="crypto">Criptomoneda</option>
                  </>
                )}
              </select>
            </div>

            {/* Checkbox términos */}
            <div className="checkout-terms" style={{color: "#e8e0f5", fontWeight: 600}}>
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={(e) => setAceptaTerminos(e.target.checked)}
                style={{ accentColor: "#a259ff", width: 18, height: 18, marginRight: 8 }}
              />
              <span>
                Acepto los{" "}
                <a href="#" target="_blank" rel="noopener noreferrer" style={{ color: "#c4b5fd", textDecoration: "underline", fontWeight: 700 }}>
                  términos y condiciones
                </a>
              </span>
            </div>

            {/* Botones según método */}
            {metodoPago === "paypal" && selectedMoneda === "USD" && (
              <div className="checkout-btn">
                {aceptaTerminos ? (
                  <PayPalButtonWrapper
                    aceptaTerminos={aceptaTerminos}
                    cart={cart}
                    cartProducts={cartProducts}
                    user={user}
                    userProfile={userProfile}
                      total={totalConDescuentoRedondeado}
                    selectedMoneda={selectedMoneda}
                  />
                ) : (
                  <button
                    style={{
                      width: "100%",
                      maxWidth: 540,
                      background: "rgba(255,255,255,0.08)",
                      color: "#fff6",
                      fontWeight: 700,
                      padding: "14px",
                      fontSize: "1.05rem",
                      border: "1.5px solid rgba(162,89,255,0.15)",
                      borderRadius: 14,
                      marginTop: "1.2rem",
                      cursor: "not-allowed"
                    }}
                    disabled
                  >
                    Acepta los términos para pagar con PayPal
                  </button>
                )}
              </div>
            )}

            {metodoPago === "mercadopago" && selectedMoneda === "CLP" && (
              <button
                className="btn-mercadopago"
                style={{
                  width: "100%",
                  maxWidth: 540,
                  background: "linear-gradient(90deg,#7b2ff2,#a259ff)",
                  color: "#fff",
                  fontWeight: 700,
                  padding: "14px",
                  fontSize: "1.05rem",
                  border: "none",
                  borderRadius: 14,
                  marginTop: "1.2rem",
                  cursor: aceptaTerminos ? "pointer" : "not-allowed",
                  boxShadow: "0 4px 16px rgba(123,47,242,0.3)",
                  transition: "all 0.2s",
                  opacity: aceptaTerminos ? 1 : 0.5
                }}
                disabled={!aceptaTerminos}
                onClick={async () => {
                  if (!aceptaTerminos) return;
                  if (!user || !user.email) {
                    alert('Debes iniciar sesión para pagar.');
                    return;
                  }
                  if (!cart || cart.length === 0) {
                    alert('Tu carrito está vacío.');
                    return;
                  }
                  try {
                    // Usar cartProducts para obtener info completa de cada producto
                    // Calcular descuento proporcional por producto
                    let items = cart.map((item) => {
                      const prod = cartProducts[item.id] || {};
                      let precioBase = selectedMoneda === "CLP" ? (item.priceCLP || prod.priceCLP) : (item.priceUSD || prod.priceUSD);
                      let precioConDescuento = precioBase;
                      if (descuento > 0) {
                        // Aplica el descuento proporcional
                        precioConDescuento = precioBase - (precioBase * (descuento / 100));
                      }
                      // Si es MercadoPago CLP, redondear hacia arriba
                      if (selectedMoneda === "CLP" && metodoPago === "mercadopago") {
                        precioConDescuento = Math.ceil(precioConDescuento);
                      }
                      return {
                        id: item.id,
                        name: prod.name || item.name || 'Producto',
                        description: prod.description || item.description || prod.name || 'Producto',
                        category_id: prod.category_id || item.category_id || "others",
                        quantity: 1,
                        precio: precioConDescuento
                      };
                    });
                    // Ajustar el total para evitar problemas de redondeo (MercadoPago usa el total que le envías)
                    // Si la suma de los items no da el totalConDescuentoRedondeado, ajusta el primer item
                    let sumaItems = items.reduce((acc, it) => acc + Number(it.precio), 0);
                    if (sumaItems !== totalConDescuentoRedondeado && items.length > 0) {
                      let diff = totalConDescuentoRedondeado - sumaItems;
                      items[0].precio = Number(items[0].precio) + diff;
                    }
                    const response = await fetch('https://us-central1-pandastoreupdate.cloudfunctions.net/createMercadoPagoPreference', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        cart: items,
                        email: user.email,
                        uid: user.uid,
                          total: totalConDescuentoRedondeado,
                        firstName: userProfile.firstName,
                        lastName: userProfile.lastName,
                        shipping: {}
                      })
                    });
                    const data = await response.json();
                    if (data.init_point) {
                      window.location.href = data.init_point;
                    } else {
                      alert('No se pudo iniciar el pago. Intenta nuevamente.');
                    }
                  } catch (err) {
                    alert('Error al conectar con MercadoPago: ' + (err.message || err));
                  }
                }}
              >
                Pagar
              </button>
            )}

            {metodoPago === "transferencia" && (
              <div className="checkout-info-box" style={{ border: 'none', background: 'none', padding: 0, width: '100%' }}>
                <div style={{ fontWeight: 700, color: '#c4b5fd', fontSize: 15, marginBottom: 18, textAlign: 'center' }}>Elige a qué cuenta transferir</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 22, marginBottom: 22, flexWrap: 'wrap' }}>
                  {bancos.map(banco => (
                    <button key={banco.id} type="button" onClick={() => setBancoSeleccionado(banco.id)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                      <div style={{
                        width: 72, height: 72, borderRadius: '50%',
                        background: banco.bg,
                        border: `3px solid ${bancoSeleccionado === banco.id ? banco.color : 'rgba(162,89,255,0.25)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                        boxShadow: bancoSeleccionado === banco.id ? `0 0 20px ${banco.color}55` : '0 2px 8px #0003',
                        transition: 'all 0.22s',
                      }}><img src={banco.logo} alt={banco.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: bancoSeleccionado === banco.id ? '#e8e0f5' : '#a084cc', textAlign: 'center', maxWidth: 80, lineHeight: 1.3 }}>
                        {banco.nombre}
                      </span>
                    </button>
                  ))}
                </div>
                {bancoSeleccionado && (() => {
                  const banco = bancos.find(b => b.id === bancoSeleccionado);
                  return (
                    <div style={{ background: banco.bg, borderRadius: 14, padding: '14px 16px', border: `1.5px solid ${banco.color}55`, marginBottom: 18 }}>
                      <div style={{ fontWeight: 700, color: banco.color, marginBottom: 10, fontSize: 14 }}>Datos de {banco.nombre}</div>
                      <pre style={{ background: 'rgba(0,0,0,0.22)', borderRadius: 10, padding: '10px 12px', fontSize: '0.88rem', color: '#e8e0f5', fontWeight: 600, margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                        {banco.datos}{'\n'}Monto: {formatPrecio(totalConDescuentoRedondeado, "CLP")}
                      </pre>
                    </div>
                  );
                })()}
                {bancoSeleccionado && (
                  <div style={{ width: '100%', marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, color: '#c4b5fd', marginBottom: 10, fontSize: 14 }}>Adjuntar comprobante de pago</div>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: 'rgba(162,89,255,0.07)',
                      border: `2px dashed ${comprobanteFile ? '#a259ff' : 'rgba(162,89,255,0.35)'}`,
                      borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                      <span style={{ fontSize: 26 }}>{comprobanteFile ? '\u2705' : '\ud83d\udcce'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#e8e0f5', fontSize: 14 }}>
                          {comprobanteFile ? comprobanteFile.name : 'Subir imagen o PDF del comprobante'}
                        </div>
                        <div style={{ fontSize: 12, color: '#a084cc', marginTop: 2 }}>
                          {comprobanteFile ? '\u2713 Listo para enviar' : 'JPG, PNG o PDF \u00b7 M\u00e1x 10MB'}
                        </div>
                      </div>
                      <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                        onChange={e => setComprobanteFile(e.target.files[0] || null)} />
                    </label>
                  </div>
                )}
                <button
                  className="btn-finalizar"
                  style={{
                    width: "100%",
                    maxWidth: 540,
                    background: "linear-gradient(90deg,#7b2ff2,#a259ff)",
                    color: "#fff",
                    fontWeight: 700,
                    padding: "14px",
                    fontSize: "1.05rem",
                    border: "none",
                    borderRadius: 14,
                    marginTop: "1rem",
                    cursor: !aceptaTerminos || !bancoSeleccionado || !comprobanteFile || comprobanteUploading ? "not-allowed" : "pointer",
                    opacity: !aceptaTerminos || !bancoSeleccionado || !comprobanteFile || comprobanteUploading ? 0.5 : 1,
                    boxShadow: "0 4px 16px rgba(123,47,242,0.3)",
                    transition: "all 0.2s"
                  }}
                  disabled={!aceptaTerminos || !bancoSeleccionado || !comprobanteFile || comprobanteUploading}
                  onClick={async () => {
                    if (!aceptaTerminos) { alert('Debes aceptar los términos y condiciones.'); return; }
                    if (!bancoSeleccionado) { alert('Selecciona la cuenta a la que transferirás.'); return; }
                    if (!comprobanteFile) { alert('Debes adjuntar el comprobante de pago.'); return; }
                    if (!user || !user.uid) { alert('Debes iniciar sesión para finalizar la compra.'); return; }
                    if (!cart || cart.length === 0) { alert('Tu carrito está vacío.'); return; }
                    setProcesandoPago(true);
                    setComprobanteUploading(true);
                    let comprobanteUrl = null;
                    try {
                      const sRef = storageRef(storage, `comprobantes/${Date.now()}_${comprobanteFile.name}`);
                      await uploadBytes(sRef, comprobanteFile);
                      comprobanteUrl = await getDownloadURL(sRef);
                    } catch (uploadErr) {
                      setComprobanteUploading(false);
                      setProcesandoPago(false);
                      alert('Error al subir el comprobante: ' + (uploadErr.message || uploadErr));
                      return;
                    }
                    setComprobanteUploading(false);
                    try {
                      const productos = cart.map((item) => {
                        const prod = cartProducts[item.id] || {};
                        // Buscar la categoría/consola en varias posibles propiedades
                        let categoria = prod.categoria || prod.consola || prod.category || prod.platform || item.categoria || item.consola || '';
                        if (!categoria && prod.name) {
                          // Heurística: buscar en el nombre si hay alguna pista
                          const lower = prod.name.toLowerCase();
                          if (lower.includes('ps4')) categoria = 'PS4';
                          else if (lower.includes('ps5')) categoria = 'PS5';
                          else if (lower.includes('switch')) categoria = 'Switch';
                          else if (lower.includes('xbox')) categoria = 'Xbox';
                        }
                        return {
                          id: item.id,
                          name: prod.name || item.name || 'Producto',
                          cantidad: item.cantidad || 1,
                          precio: selectedMoneda === 'CLP' ? (item.priceCLP || prod.priceCLP) : (item.priceUSD || prod.priceUSD),
                          categoria: categoria || 'Sin categoría',
                        };
                      });
                      // 1. Guardar en colección global 'orders'
                      const globalOrder = {
                        productos,
                        total: totalConDescuentoRedondeado,
                        moneda: selectedMoneda,
                        metodoPago: 'transferencia',
                        banco: bancoSeleccionado,
                        comprobanteUrl,
                        fecha: new Date().toISOString(),
                        email: user.email,
                        nombre: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}` : user.displayName || '',
                        transferenciaEstado: 'pendiente',
                        uid: user.uid
                      };
                      const orderRef = await addDoc(collection(db, "orders"), globalOrder);
                      // 2. Guardar en users/{uid}/orders con el mismo ID y referencia global
                      await setDoc(doc(db, `users/${user.uid}/orders`, orderRef.id), {
                        ...globalOrder,
                        globalOrderId: orderRef.id
                      });
                      // 3. Enviar correo al admin
                      try {
                          await fetch('https://us-central1-pandastoreupdate.cloudfunctions.net/sendConfirmationEmail', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              orderId: orderRef.id,
                              clienteEmail: user.email
                            })
                          });
                        } catch (err) {}
                      // Borrar el carrito del usuario
                      try {
                        const cartRef = collection(db, `users/${user.uid}/cart`);
                        const cartDocs = await getDocs(cartRef);
                        for (const docu of cartDocs.docs) {
                          await deleteDoc(doc(db, `users/${user.uid}/cart`, docu.id));
                        }
                        setCart([]);
                      } catch (err) {}
                      navigate('/confirmacion-pendiente');
                    } catch (err) {
                      setProcesandoPago(false);
                      alert('Error al guardar el pedido: ' + (err.message || err));
                    }
                  }}
                >
                  {comprobanteUploading ? 'Subiendo comprobante...' : 'Confirmar pago y finalizar'}
                </button>
              </div>
            )}
            {metodoPago === "crypto" && (
              <div className="checkout-info-box">
                <div className="info-title">Dirección para pago con criptomoneda:</div>
                <pre style={{
                  background: "rgba(255,255,255,0.06)",
                  padding: "0.8rem",
                  borderRadius: 10,
                  fontSize: "0.95rem",
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                  color: "#e8e0f5",
                  fontWeight: 600,
                  marginBottom: 10,
                  border: "1px solid rgba(162,89,255,0.1)"
                }}>
                  {datosCrypto}
                </pre>
                <label className="check-paid" style={{color: "#e8e0f5", fontWeight: 600, marginTop: 12, display: "flex", alignItems: "center"}}>
                  <input
                    type="checkbox"
                    checked={transferenciaRealizada}
                    onChange={(e) => setTransferenciaRealizada(e.target.checked)}
                    style={{ accentColor: "#a259ff", width: 18, height: 18, marginRight: 8 }}
                  />
                  Ya he realizado el pago
                </label>
                <button
                  className="btn-finalizar"
                  style={{
                    width: "100%",
                    maxWidth: 540,
                    background: "linear-gradient(90deg,#7b2ff2,#a259ff)",
                    color: "#fff",
                    fontWeight: 700,
                    padding: "14px",
                    fontSize: "1.05rem",
                    border: "none",
                    borderRadius: 14,
                    marginTop: "1.2rem",
                    cursor: !aceptaTerminos || !transferenciaRealizada ? "not-allowed" : "pointer",
                    opacity: !aceptaTerminos || !transferenciaRealizada ? 0.5 : 1,
                    boxShadow: "0 4px 16px rgba(123,47,242,0.3)",
                    transition: "all 0.2s"
                  }}
                  disabled={!aceptaTerminos || !transferenciaRealizada}
                  onClick={async () => {
                    if (!aceptaTerminos) { alert('Debes aceptar los términos y condiciones.'); return; }
                    if (!transferenciaRealizada) { alert('Debes marcar que ya realizaste el pago.'); return; }
                    if (!user || !user.uid) { alert('Debes iniciar sesión para finalizar la compra.'); return; }
                    if (!cart || cart.length === 0) { alert('Tu carrito está vacío.'); return; }
                    try {
                      const productos = cart.map((item) => {
                        const prod = cartProducts[item.id] || {};
                        let categoria = prod.categoria || prod.consola || prod.category || prod.platform || item.categoria || item.consola || '';
                        if (!categoria && prod.name) {
                          const lower = prod.name.toLowerCase();
                          if (lower.includes('ps4')) categoria = 'PS4';
                          else if (lower.includes('ps5')) categoria = 'PS5';
                          else if (lower.includes('switch')) categoria = 'Switch';
                          else if (lower.includes('xbox')) categoria = 'Xbox';
                        }
                        return { id: item.id, name: prod.name || item.name || 'Producto', cantidad: item.cantidad || 1, precio: selectedMoneda === 'CLP' ? (item.priceCLP || prod.priceCLP) : (item.priceUSD || prod.priceUSD), categoria: categoria || 'Sin categoría' };
                      });
                      const globalOrder = {
                        productos, total: totalConDescuentoRedondeado, moneda: selectedMoneda,
                        metodoPago: 'crypto', fecha: new Date().toISOString(),
                        email: user.email,
                        nombre: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}` : user.displayName || '',
                        transferenciaEstado: 'pendiente', uid: user.uid
                      };
                      const orderRef = await addDoc(collection(db, "orders"), globalOrder);
                      await setDoc(doc(db, `users/${user.uid}/orders`, orderRef.id), { ...globalOrder, globalOrderId: orderRef.id });
                      try {
                        await fetch('https://us-central1-pandastoreupdate.cloudfunctions.net/sendConfirmationEmail', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ orderId: orderRef.id, clienteEmail: user.email })
                        });
                      } catch (err) {}
                      try {
                        const cartRef = collection(db, `users/${user.uid}/cart`);
                        const cartDocs = await getDocs(cartRef);
                        for (const docu of cartDocs.docs) { await deleteDoc(doc(db, `users/${user.uid}/cart`, docu.id)); }
                        setCart([]);
                      } catch (err) {}
                      navigate('/confirmacion-pendiente');
                    } catch (err) { alert('Error al guardar el pedido: ' + (err.message || err)); }
                  }}
                >
                  ✔️ Confirmar pago y finalizar
                </button>
              </div>
            )}
          </>
        )}

        {/* --- CSS --- */}
        <style>{`
          .checkout-container {
            max-width: 620px;
            margin: 40px auto;
            padding: 2rem 1.5rem;
            background: linear-gradient(135deg, rgba(26,16,53,0.95) 0%, rgba(45,25,80,0.95) 60%, rgba(26,16,53,0.95) 100%);
            border-radius: 24px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(162,89,255,0.15);
            display: flex;
            flex-direction: column;
            align-items: center;
            backdrop-filter: blur(12px);
            border: 1.5px solid rgba(162,89,255,0.18);
            color: #e8e0f5;
          }
          .checkout-title {
            font-size: clamp(1.5rem, 2.5vw, 2rem);
            font-weight: 800;
            color: #c4b5fd;
            margin-bottom: 1.2rem;
            text-align: center;
            letter-spacing: -0.02em;
          }
          .checkout-method {
            width: 100%;
            max-width: 400px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.2rem;
            gap: 12px;
          }
          .checkout-method label {
            font-weight: 600;
            color: #c4b5fd;
            white-space: nowrap;
          }
          .checkout-method select {
            flex: 1;
            padding: 10px 14px;
            border-radius: 12px;
            border: 1.5px solid rgba(162,89,255,0.4);
            background: rgba(45,25,80,0.95);
            color: #e8e0f5;
            font-weight: 600;
            font-size: 1rem;
            outline: none;
            transition: border-color 0.2s;
            cursor: pointer;
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23c4b5fd' d='M6 8L0 0h12z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            padding-right: 36px;
          }
          .checkout-method select option {
            background: #2d1950;
            color: #e8e0f5;
            padding: 8px;
          }
          .checkout-method select:focus {
            border-color: #a259ff;
          }
          .checkout-empty {
            color: #fff6;
            font-size: 1.1rem;
            margin: 2rem 0;
            text-align: center;
          }
          .checkout-cart-list {
            list-style: none;
            padding: 0;
            width: 100%;
            max-width: 540px;
            max-height: 260px;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: rgba(162,89,255,0.3) transparent;
          }
          .checkout-cart-list::-webkit-scrollbar {
            width: 5px;
          }
          .checkout-cart-list::-webkit-scrollbar-thumb {
            background: rgba(162,89,255,0.3);
            border-radius: 10px;
          }
          .checkout-cart-item {
            display: flex;
            align-items: center;
            background: rgba(255,255,255,0.05);
            margin-bottom: 8px;
            padding: 10px 12px;
            border-radius: 14px;
            border: 1px solid rgba(162,89,255,0.08);
            transition: background 0.15s;
          }
          .checkout-cart-item:hover {
            background: rgba(162,89,255,0.08);
          }
          .checkout-cart-item img {
            width: 44px;
            height: 44px;
            object-fit: cover;
            margin-right: 12px;
            border-radius: 10px;
            border: 1.5px solid rgba(162,89,255,0.3);
          }
          .item-info {
            flex: 1;
          }
          .item-name {
            font-weight: 600;
            font-size: 0.95rem;
            color: #e8e0f5;
          }
          .item-price {
            color: #c4b5fd;
            font-weight: 600;
            font-size: 0.9rem;
          }
          .item-detail {
            font-weight: 400;
            color: #fff5;
            margin-left: 6px;
          }
          .checkout-total {
            font-size: clamp(1.2rem, 2.5vw, 1.5rem);
            font-weight: 800;
            margin-top: 1.2rem;
            color: #fff;
            text-align: right;
            width: 100%;
            max-width: 540px;
            padding: 12px 0;
            border-top: 1px solid rgba(162,89,255,0.15);
          }
          .checkout-terms {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 1rem;
            max-width: 540px;
            width: 100%;
          }
          .checkout-terms a {
            color: #c4b5fd;
            text-decoration: underline;
          }
          .btn-mercadopago, .btn-finalizar {
            width: 100%;
            max-width: 540px;
            background: linear-gradient(90deg,#7b2ff2,#a259ff);
            color: #fff;
            font-weight: 700;
            padding: 14px;
            font-size: 1.05rem;
            border: none;
            border-radius: 14px;
            margin-top: 1.2rem;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(123,47,242,0.3);
            transition: all 0.2s;
          }
          .btn-mercadopago:disabled, .btn-finalizar:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .btn-mercadopago:hover:not(:disabled),
          .btn-finalizar:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 24px rgba(123,47,242,0.4);
          }
          .checkout-info-box {
            margin-top: 1.5rem;
            background: rgba(255,255,255,0.04);
            padding: 1.2rem;
            border-radius: 16px;
            width: 100%;
            max-width: 540px;
            border: 1px solid rgba(162,89,255,0.12);
          }
          .checkout-info-box pre {
            background: rgba(255,255,255,0.06);
            padding: 0.8rem;
            border-radius: 10px;
            font-size: 0.95rem;
            white-space: pre-wrap;
            word-wrap: break-word;
            color: #e8e0f5;
            border: 1px solid rgba(162,89,255,0.1);
          }
          .info-title {
            font-weight: 700;
            color: #c4b5fd;
            margin-bottom: 0.8rem;
          }
          .check-paid {
            display: flex;
            align-items: center;
            margin-top: 1rem;
            gap: 6px;
          }
          .checkout-btn {
            width: 100%;
            max-width: 540px;
          }

          /* --- Responsivo --- */
          @media (max-width: 768px) {
            .checkout-method {
              flex-direction: column;
              align-items: stretch;
            }
            .checkout-title {
              font-size: 1.4rem;
            }
          }
          @media (max-width: 480px) {
            .checkout-container {
              border-radius: 18px;
              margin: 16px 8px;
              padding: 1.2rem 0.8rem;
            }
            .checkout-cart-item {
              flex-direction: column;
              align-items: flex-start;
            }
            .checkout-cart-item img {
              margin-bottom: 8px;
            }
            .checkout-total {
              text-align: center;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
