import React, { useEffect, useState } from "react";
import PayPalButton from "../../components/PayPalButton";
import { PayPalButtonWrapper } from "../Pagos/PayPalButtonWrapper";
import { db, auth } from "../../firebase";
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

  // --- Datos de prueba ---
  const datosTransferencia = `
Banco: Banco Falabella
Tipo de cuenta: Cuenta Corriente
N° Cuenta: 19822486630
Titular: jose muñoz
RUT: 21.715.187-2
Email: comprobantesswitch2@gmail.com
Monto: ${formatPrecio(totalConDescuentoRedondeado, "CLP")}
`;

  const datosCrypto = `
USDT (BEP20): 0x7320E27e6FEB10d2bA387928c5bb6675b2AD2965
Monto: ${formatPrecio(totalConDescuentoRedondeado, "USD")}
`;

  return (
    <div style={{
      position: "relative",
      minHeight: "100vh",
      width: "100vw",
      overflowX: "hidden",
      background: "transparent"
    }}>
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
        zIndex: 2,
        maxWidth: 900,
        margin: "auto",
        padding: "2rem 1rem",
        background: "linear-gradient(180deg, #fff 85%, #f4f1ff 100%)",
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(123,47,242,0.15)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
        {/* Campo para cupón */}
        <div style={{ width: '100%', maxWidth: 400, margin: '0 auto 18px auto', display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Código de cupón"
            value={cupon}
            onChange={e => setCupon(e.target.value)}
            style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #bdbdbd', fontSize: 16 }}
          />
          <button type="button" onClick={validarCupon} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}>
            Aplicar cupón
          </button>
        </div>
        {cuponError && <div style={{ color: '#e53935', marginBottom: 8 }}>{cuponError}</div>}
        {descuento > 0 && <div style={{ color: '#43a047', marginBottom: 8 }}>Cupón aplicado: -{descuento}%</div>}
        <h2 className="checkout-title">Checkout del Carrito</h2>

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
              Total: <span style={descuento > 0 ? {textDecoration:'line-through',color:'#888'} : {}}>{formatPrecio(total, selectedMoneda)}</span>
                {descuento > 0 && (
                  <span style={{color:'#1976d2',fontWeight:700,marginLeft:8}}>
                    {formatPrecio(totalConDescuentoRedondeado, selectedMoneda)}
                    {huboRedondeo && (
                      <span style={{color:'#43a047',fontWeight:500,fontSize:'0.95em',marginLeft:6}}>
                        (redondeado hacia arriba)
                      </span>
                    )}
                  </span>
                )}
            </div>

            {/* Checkbox términos */}
            <div className="checkout-terms" style={{color: "#393053", fontWeight: 600}}>
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={(e) => setAceptaTerminos(e.target.checked)}
                style={{ accentColor: "#7b2ff2", width: 18, height: 18, marginRight: 8 }}
              />
              <span>
                Acepto los{" "}
                <a href="#" target="_blank" rel="noopener noreferrer" style={{ color: "#7b2ff2", textDecoration: "underline", fontWeight: 700 }}>
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
                      maxWidth: 600,
                      background: "#e0e0e0",
                      color: "#888",
                      fontWeight: 700,
                      padding: "16px",
                      fontSize: "1.18rem",
                      border: "none",
                      borderRadius: 14,
                      marginTop: "1.5rem",
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
                  maxWidth: 600,
                  background: "linear-gradient(90deg,#7b2ff2,#00a650 90%)",
                  color: "#fff",
                  fontWeight: 800,
                  padding: "16px",
                  fontSize: "1.18rem",
                  border: "none",
                  borderRadius: 14,
                  marginTop: "1.5rem",
                  cursor: aceptaTerminos ? "pointer" : "not-allowed",
                  boxShadow: "0 3px 12px #7b2ff244",
                  letterSpacing: ".03em",
                  textTransform: "uppercase",
                  transition: "background 0.18s, box-shadow 0.18s, transform 0.15s",
                  opacity: aceptaTerminos ? 1 : 0.6
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
                <span style={{
                  fontWeight: 900,
                  fontSize: 22,
                  letterSpacing: ".04em",
                  marginRight: 10,
                  verticalAlign: "middle"
                }}>💳</span>
                Pagar seguro con <span style={{color:"#FFD600", fontWeight:900, marginLeft:6}}>MercadoPago</span>
              </button>
            )}

            {(metodoPago === "transferencia" || metodoPago === "crypto") && (
              <div className="checkout-info-box">
                <div className="info-title">
                  {metodoPago === "transferencia"
                    ? "Datos para realizar la transferencia:"
                    : "Dirección para pago con criptomoneda:"}
                </div>
                <pre style={{
                  background: "#fff",
                  padding: "0.8rem",
                  borderRadius: 8,
                  fontSize: "1.05rem",
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                  color: "#393053",
                  fontWeight: 600,
                  marginBottom: 10,
                  boxShadow: "0 1px 4px #7b2ff211"
                }}>
                  {metodoPago === "transferencia" ? datosTransferencia : datosCrypto}
                </pre>
                <label className="check-paid" style={{color: "#393053", fontWeight: 600, marginTop: 12, display: "flex", alignItems: "center"}}>
                  <input
                    type="checkbox"
                    checked={transferenciaRealizada}
                    onChange={(e) => setTransferenciaRealizada(e.target.checked)}
                    style={{ accentColor: "#7b2ff2", width: 18, height: 18, marginRight: 8 }}
                  />
                  Ya he realizado el pago
                </label>
                <button
                  className="btn-finalizar"
                  style={{
                    width: "100%",
                    maxWidth: 600,
                    background: "linear-gradient(90deg,#7b2ff2,#1976d2 90%)",
                    color: "#fff",
                    fontWeight: 800,
                    padding: "16px",
                    fontSize: "1.13rem",
                    border: "none",
                    borderRadius: 14,
                    marginTop: "1.5rem",
                    cursor: !aceptaTerminos || !transferenciaRealizada ? "not-allowed" : "pointer",
                    opacity: !aceptaTerminos || !transferenciaRealizada ? 0.6 : 1,
                    boxShadow: "0 3px 12px #7b2ff244",
                    letterSpacing: ".03em",
                    textTransform: "uppercase",
                    transition: "background 0.18s, box-shadow 0.18s, transform 0.15s"
                  }}
                  disabled={!aceptaTerminos || !transferenciaRealizada}
                  onClick={async () => {
                    if (!aceptaTerminos) {
                      alert('Debes aceptar los términos y condiciones.');
                      return;
                    }
                    if (!transferenciaRealizada) {
                      alert('Debes marcar que ya realizaste el pago.');
                      return;
                    }
                    if (!user || !user.uid) {
                      alert('Debes iniciar sesión para finalizar la compra.');
                      return;
                    }
                    if (!cart || cart.length === 0) {
                      alert('Tu carrito está vacío.');
                      return;
                    }
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
                      // 1. Guardar en colección global 'orders' y obtener el ID real
                      const globalOrder = {
                        productos,
                        total: totalConDescuentoRedondeado,
                        moneda: selectedMoneda,
                        metodoPago,
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
                      // 3. Solo enviar correo si el método de pago NO es transferencia ni crypto
                      if (metodoPago !== 'transferencia' && metodoPago !== 'crypto') {
                        try {
                          await fetch('https://us-central1-pandastoreupdate.cloudfunctions.net/sendConfirmationEmail', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              orderId: orderRef.id,
                              globalOrderId: orderRef.id,
                              docId: orderRef.id,
                              clienteEmail: user.email
                            })
                          });
                        } catch (err) {}
                      }
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
                      alert('Error al guardar el pedido: ' + (err.message || err));
                    }
                  }}
                >
                  <span style={{
                    fontWeight: 900,
                    fontSize: 20,
                    letterSpacing: ".04em",
                    marginRight: 8,
                    verticalAlign: "middle"
                  }}>✔️</span>
                  Confirmar pago y finalizar compra
                </button>
              </div>
            )}
          </>
        )}

        {/* --- CSS --- */}
        <style>{`
          .checkout-container {
            max-width: 900px;
            margin: auto;
            padding: 2rem 1rem;
            background: linear-gradient(180deg, #fff 85%, #f4f1ff 100%);
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(123,47,242,0.15);
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .checkout-title {
            font-size: clamp(1.8rem, 2.5vw, 2.2rem);
            font-weight: 800;
            color: #7b2ff2;
            margin-bottom: 1rem;
            text-align: center;
          }
          .checkout-method {
            width: 100%;
            max-width: 400px;
            display: flex;
            justify-content: space-between;
            margin-bottom: 1rem;
            gap: 10px;
          }
          .checkout-method label {
            font-weight: 600;
            color: #7b2ff2;
          }
          .checkout-method select {
            flex: 1;
            padding: 0.6rem;
            border-radius: 10px;
            border: 1.5px solid #a084e8;
            background: #f7f6fd;
            font-weight: 600;
            font-size: 1rem;
          }
          .checkout-empty {
            color: #888;
            font-size: 1.1rem;
            margin: 2rem 0;
          }
          .checkout-cart-list {
            list-style: none;
            padding: 0;
            width: 100%;
            max-width: 600px;
          }
          .checkout-cart-item {
            display: flex;
            align-items: center;
            background: #f7f6fd;
            margin-bottom: 12px;
            padding: 12px;
            border-radius: 12px;
            box-shadow: 0 2px 6px rgba(123,47,242,0.1);
          }
          .checkout-cart-item img {
            width: 50px;
            height: 50px;
            object-fit: cover;
            margin-right: 12px;
            border-radius: 8px;
            border: 1.5px solid #a084e8;
          }
          .item-info {
            flex: 1;
          }
          .item-name {
            font-weight: 600;
            font-size: 1rem;
            color: #393053;
          }
          .item-price {
            color: #7b2ff2;
            font-weight: 600;
          }
          .item-detail {
            font-weight: 400;
            color: #777;
            margin-left: 6px;
          }
          .checkout-total {
            font-size: clamp(1.4rem, 3vw, 1.8rem);
            font-weight: 800;
            margin-top: 1.5rem;
            color: #7b2ff2;
            text-align: right;
            width: 100%;
            max-width: 600px;
          }
          .checkout-terms {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 1rem;
            max-width: 600px;
            width: 100%;
          }
          .checkout-terms a {
            color: #7b2ff2;
          }
          .btn-mercadopago, .btn-finalizar {
            width: 100%;
            max-width: 600px;
            background: linear-gradient(90deg,#00a650,#7b2ff2);
            color: #fff;
            font-weight: 700;
            padding: 14px;
            font-size: 1.1rem;
            border: none;
            border-radius: 12px;
            margin-top: 1.5rem;
            cursor: pointer;
            box-shadow: 0 3px 12px rgba(123,47,242,0.3);
            transition: 0.2s;
          }
          .btn-mercadopago:disabled, .btn-finalizar:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .btn-mercadopago:hover:not(:disabled),
          .btn-finalizar:hover:not(:disabled) {
            transform: translateY(-2px);
          }
          .checkout-info-box {
            margin-top: 2rem;
            background: #f7f6fd;
            padding: 1.2rem;
            border-radius: 12px;
            width: 100%;
            max-width: 600px;
            box-shadow: 0 2px 8px rgba(123,47,242,0.1);
          }
          .checkout-info-box pre {
            background: #fff;
            padding: 0.8rem;
            border-radius: 8px;
            font-size: 0.95rem;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          .info-title {
            font-weight: 700;
            color: #7b2ff2;
            margin-bottom: 0.8rem;
          }
          .check-paid {
            display: flex;
            align-items: center;
            margin-top: 1rem;
            gap: 6px;
          }

          /* --- Responsivo --- */
          @media (max-width: 768px) {
            .checkout-method {
              flex-direction: column;
              align-items: stretch;
            }
            .checkout-title {
              font-size: 1.6rem;
            }
            .checkout-cart-item {
              flex-direction: row;
            }
          }
          @media (max-width: 480px) {
            .checkout-container {
              border-radius: 0;
              box-shadow: none;
              padding: 1rem 0.5rem;
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
