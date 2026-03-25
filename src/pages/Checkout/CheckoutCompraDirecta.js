import React, { useState, useEffect } from "react";
import { useMoneda } from "../../context/MonedaContext";
import { useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../../firebase";
import { addDoc, setDoc, collection, doc, getDoc } from "firebase/firestore";
import { getDocs, updateDoc } from "firebase/firestore";
import { PayPalButtonWrapper } from "../Pagos/PayPalButtonWrapper";


export default function CheckoutCompraDirecta() {
  // Estado para cupón
  const [cupon, setCupon] = useState("");
  const [cuponInfo, setCuponInfo] = useState(null);
  const [cuponError, setCuponError] = useState("");
  const [descuento, setDescuento] = useState(0);
  const { moneda } = useMoneda();
  const navigate = useNavigate();
  const location = useLocation();
  const producto = location.state?.producto;
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [transferenciaRealizada, setTransferenciaRealizada] = useState(false);
  const [metodoPago, setMetodoPago] = useState("");
  const [userProfile, setUserProfile] = useState({ firstName: '', lastName: '' });
  const user = auth.currentUser;

  useEffect(() => {
    if (user?.uid) {
      getDoc(doc(db, "users", user.uid)).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserProfile({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
          });
        }
      });
    }
  }, [user]);

  if (!producto) {
    return <div style={{padding:40}}>No hay producto para comprar.</div>;
  }

  let precio = 0;
  if (moneda === "CLP" && producto.priceCLP) precio = Number(producto.priceCLP);
  else if (moneda === "USD" && producto.priceUSD) precio = Number(producto.priceUSD);
  const totalConDescuento = Math.max(0, precio - (precio * (descuento / 100)));
  // Para MercadoPago, CLP debe ser entero
  const totalConDescuentoRedondeado = Math.ceil(totalConDescuento);
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
        setCuponError("Cupón expirado");
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

  let detalle = "";
  if (producto.variante) detalle = `Variante: ${producto.variante}`;
  if (producto.meses) detalle = `Meses: ${producto.meses}`;

  // Formatea el precio según la moneda
  function formatPrecio(precio, moneda) {
    if (!precio || isNaN(precio)) return "";
    if (moneda === "USD") {
      return `$${Number(precio).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (moneda === "CLP") {
      return `$${Number(precio).toLocaleString("es-CL")}`;
    }
    return precio;
  }

  // Lógica de compra directa (igual que carrito, pero sin borrar el carrito)
  const finalizarCompra = async () => {
    if (!aceptaTerminos) {
      alert("Debes aceptar los términos y condiciones para continuar.");
      return;
    }
    if ((metodoPago === 'transferencia' || metodoPago === 'crypto') && !transferenciaRealizada) {
      alert("Debes marcar que ya realizaste el pago.");
      return;
    }
    if (!user || !user.uid) {
      alert("Debes iniciar sesión para finalizar la compra.");
      return;
    }

  let pedidoGuardado = false;
    try {
      // Validar que el producto tenga id
      if (!producto.id) {
        alert('Error: El producto no tiene un ID válido. No se puede guardar el pedido.');
        console.error('Error: producto.id es undefined o vacío:', producto);
        return;
      }

      const nombreCliente = (userProfile.firstName || user?.displayName?.split(' ')[0] || '') +
        ' ' + (userProfile.lastName || user?.displayName?.split(' ').slice(1).join(' ') || '');
      const pedido = {
        productos: [{
          id: producto.id,
          name: producto.name,
          cantidad: 1,
          precio,
          description: producto.description || producto.name,
          category_id: producto.category_id || "others",
          variante: producto.variante || null,
          meses: producto.meses || null
        }],
        total: totalConDescuento,
        moneda,
        metodoPago,
        email: user?.email || '',
        nombre: nombreCliente.trim() || user?.email || '',
        fecha: new Date().toISOString(),
        uid: user?.uid || '',
        shipping: {}
      };
      if (metodoPago === 'transferencia' || metodoPago === 'crypto') {
        pedido.transferenciaEstado = 'pendiente';
      }

      // Debug: log the pedido object before saving
      console.log('Pedido a guardar en Firestore:', JSON.stringify(pedido, null, 2));

      // 1. Crear en orders y obtener el ID global
      const orderRef = await addDoc(collection(db, "orders"), pedido);
      // 2. Guardar en users/{uid}/orders con el mismo ID y referencia global
      await setDoc(doc(db, `users/${user.uid}/orders`, orderRef.id), {
        ...pedido,
        globalOrderId: orderRef.id
      });
      // Marcar cupón como usado si corresponde
      if (cuponInfo && descuento > 0) {
        await marcarCuponUsado();
      }
      // Enviar correo al admin SIEMPRE que se finaliza la compra
      try {
        await fetch('https://us-central1-pandastoreupdate.cloudfunctions.net/sendConfirmationEmail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderRef.id,
            globalOrderId: orderRef.id,
            docId: orderRef.id,
            clienteEmail: user?.email || ''
          })
        });
      } catch (err) { /* opcional: puedes mostrar un mensaje de error si quieres */ }
      if (metodoPago === 'transferencia' || metodoPago === 'crypto') {
        navigate('/confirmacion-pendiente');
      } else {
        navigate('/confirmacion-exitosa');
      }
    } catch (e) {
      console.error("Error al guardar pedido:", e);
      if (e && e.message) {
        alert("Ocurrió un error al guardar tu pedido: " + e.message);
      } else {
        alert("Ocurrió un error al guardar tu pedido. Intenta nuevamente.");
      }
      return;
    }
  };

  // Datos de transferencia/crypto
  const datosTransferencia = `Banco: Banco Falabella\nCuenta: 19822486630\nTipo De Cuenta: Corriente\nTitular: Jose Muñoz\nRUT: 21.715.187-2\nEmail: Comprobantesswitch2@gmail.com\nMonto: CLP ${totalConDescuento}`;
  const datosCrypto = `USDT (BEP20): 0x7320E27e6FEB10d2bA387928c5bb6675b2AD2965\nMonto: USD ${totalConDescuento}`;

  return (
    <div
      className="checkout-compra-directa-root"
      style={{
        maxWidth: 700,
        margin: "40px auto",
        padding: 24,
        background: "linear-gradient(180deg, #fff 80%, #e3e0ff 100%)",
        borderRadius: 18,
        boxShadow: "0 4px 32px #7b2ff244, 0 1.5px 0 #a084e8",
        fontFamily: "Poppins, Montserrat, Segoe UI, Arial, sans-serif",
        minHeight: 420,
        position: "relative",
        zIndex: 2,
        width: "98vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}
    >
      {/* Campo para cupón */}
      <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto 18px auto', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="Código de cupón"
          value={cupon}
          onChange={e => setCupon(e.target.value)}
          style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #bdbdbd', fontSize: '16px' }}
        />
        <button type="button" onClick={validarCupon} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}>
          Aplicar cupón
        </button>
      </div>
      {cuponError && <div style={{ color: '#e53935', marginBottom: '8px' }}>{cuponError}</div>}
      {descuento > 0 && <div style={{ color: '#43a047', marginBottom: '8px' }}>Cupón aplicado: -{descuento}%</div>}
      <h2 style={{
        fontSize: 32,
        fontWeight: 800,
        marginBottom: 18,
        color: "#7b2ff2",
        textAlign: "center",
        letterSpacing: "0.03em",
        textShadow: "0 2px 12px #7b2ff244, 0 1px 0 #fff"
      }}>Compra directa</h2>
      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        width: "100%",
        maxWidth: 540
      }}>
        <li style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 14,
          background: "#f7f6fd",
          borderRadius: 12,
          boxShadow: "0 2px 8px #7b2ff211",
          padding: "10px 12px"
        }}>
          {producto.imageUrl && <img src={producto.imageUrl} alt={producto.name} style={{
            width: 48,
            height: 48,
            objectFit: 'cover',
            marginRight: 12,
            borderRadius: 8,
            border: "1.5px solid #a084e8",
            background: "#fff"
          }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: "#393053", fontSize: 17 }}>{producto.name}</div>
            <div style={{ fontSize: 15, color: '#7b2ff2', fontWeight: 600 }}>
              {moneda}: {formatPrecio(precio, moneda)} {detalle && <span style={{ color: '#888', marginLeft: 6, fontWeight: 400 }}>({detalle})</span>}
            </div>
          </div>
        </li>
      </ul>
      <div style={{
        fontWeight: 800,
        fontSize: 26,
        marginTop: 32,
        textAlign: 'right',
        color: "#7b2ff2",
        width: "100%",
        maxWidth: 540
      }}>
        Total: <span style={descuento > 0 ? {textDecoration:'line-through',color:'#888'} : {}}>{formatPrecio(precio, moneda)}</span>
        {descuento > 0 && (
          <span style={{color:'#1976d2',fontWeight:700,marginLeft:8}}>
            {metodoPago === 'mercadopago' && moneda === 'CLP'
              ? formatPrecio(totalConDescuentoRedondeado, moneda)
              : formatPrecio(totalConDescuento, moneda)
            }
            {metodoPago === 'mercadopago' && moneda === 'CLP' && totalConDescuento !== totalConDescuentoRedondeado && (
              <span style={{fontSize:14,marginLeft:6,color:'#e53935'}}>(redondeado)</span>
            )}
          </span>
        )}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 12,
        width: "100%",
        maxWidth: 540
      }}>
        <input
          type="checkbox"
          checked={aceptaTerminos}
          onChange={e => setAceptaTerminos(e.target.checked)}
          style={{ marginRight: 10, width: 18, height: 18 }}
        />
        <span style={{ color: "#393053", fontWeight: 600 }}>
          Acepto los <a href="#" target="_blank" rel="noopener noreferrer" style={{ color: "#7b2ff2", textDecoration: "underline" }}>términos y condiciones</a>
        </span>
      </div>
      {/* Métodos de pago */}
      <div style={{
        marginBottom: 18,
        width: "100%",
        maxWidth: 420,
        display: "flex",
        alignItems: "center",
        gap: 10
      }}>
        <label style={{ fontWeight: 600, marginRight: 8, color: "#7b2ff2", minWidth: 120 }}>Método de pago:</label>
        <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} style={{
          padding: '8px 14px',
          borderRadius: 10,
          border: '1.5px solid #a084e8',
          fontSize: 16,
          fontWeight: 600,
          background: '#f7f6fd',
          color: '#222',
          outline: 'none',
          minWidth: 160
        }}>
          <option value="">Selecciona...</option>
          {moneda === 'CLP' && <>
            <option value="mercadopago">MercadoPago</option>
            <option value="transferencia">Transferencia</option>
          </>}
          {moneda === 'USD' && <>
            <option value="paypal">PayPal</option>
            <option value="crypto">Criptomoneda</option>
          </>}
        </select>
      </div>
      {/* PayPal */}
      {metodoPago === 'paypal' && moneda === 'USD' && (
        <div style={{ width: "100%", maxWidth: 540, margin: "0 auto" }}>
          <PayPalButtonWrapper
            aceptaTerminos={aceptaTerminos}
            cart={[producto]}
            cartProducts={{ [producto.id]: producto }}
            user={null}
            userProfile={{}}
            total={totalConDescuento}
            selectedMoneda={moneda}
          />
        </div>
      )}
      {/* MercadoPago */}
      {metodoPago === 'mercadopago' && moneda === 'CLP' && (
        <button
          style={{
            width: '100%',
            background: 'linear-gradient(90deg, #00a650 0%, #7b2ff2 100%)',
            color: '#fff',
            fontWeight: 700,
            borderRadius: 10,
            padding: '16px 0',
            fontSize: 22,
            border: 'none',
            marginTop: 18,
            cursor: aceptaTerminos ? 'pointer' : 'not-allowed',
            opacity: aceptaTerminos ? 1 : 0.6,
            boxShadow: "0 2px 8px #7b2ff244"
          }}
          onClick={async () => {
            if (!aceptaTerminos) return;
            if (!user || !user.email) {
              alert('Debes iniciar sesión para pagar.');
              return;
            }
            try {
              // Asegurar que el monto sea al menos 1 y entero
              const montoFinal = Math.max(1, totalConDescuentoRedondeado);
              const response = await fetch('https://us-central1-pandastoreupdate.cloudfunctions.net/createMercadoPagoPreference', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  cart: [{
                    id: producto.id,
                    name: producto.name,
                    description: producto.description || producto.name,
                    category_id: producto.category_id || "others",
                    quantity: 1,
                    precio: montoFinal
                  }],
                  email: user.email,
                  uid: user.uid,
                  total: montoFinal,
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
          disabled={!aceptaTerminos}
        >
          Pagar con MercadoPago ({formatPrecio(totalConDescuentoRedondeado, moneda)})
        </button>
      )}
      {/* Transferencia/Cripto */}
      {((moneda === 'CLP' && metodoPago === 'transferencia') || (moneda === 'USD' && metodoPago === 'crypto')) && (
        <div style={{
          marginTop: 32,
          marginBottom: 24,
          background: '#f7f6fd',
          padding: 22,
          borderRadius: 12,
          boxShadow: "0 2px 8px #7b2ff211",
          width: "100%",
          maxWidth: 540
        }}>
          <div style={{ fontWeight: 700, marginBottom: 12, color: "#7b2ff2", fontSize: 18 }}>
            {metodoPago === 'transferencia' ? 'Datos para realizar la transferencia:' : 'Dirección para pago con criptomoneda:'}
          </div>
          <pre style={{
            background: '#fff',
            padding: 14,
            borderRadius: 8,
            fontSize: 16,
            color: "#393053",
            fontWeight: 600,
            marginBottom: 10,
            boxShadow: "0 1px 4px #7b2ff211"
          }}>
            {metodoPago === 'transferencia' ? datosTransferencia : datosCrypto}
          </pre>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', fontWeight: 600, color: "#393053" }}>
              <input
                type="checkbox" checked={transferenciaRealizada} onChange={e => setTransferenciaRealizada(e.target.checked)}
                style={{ marginRight: 8, width: 18, height: 18 }}
              />
              Ya he realizado el pago
            </label>
          </div>
          <button
            style={{
              width: '100%',
              background: 'linear-gradient(90deg, #1976d2 0%, #7b2ff2 100%)',
              color: '#fff',
              fontWeight: 700,
              borderRadius: 10,
              padding: '16px 0',
              fontSize: 22,
              border: 'none',
              marginTop: 18,
              cursor: aceptaTerminos && transferenciaRealizada ? 'pointer' : 'not-allowed',
              opacity: aceptaTerminos && transferenciaRealizada ? 1 : 0.6,
              boxShadow: "0 2px 8px #7b2ff244"
            }}
            onClick={finalizarCompra}
            disabled={!aceptaTerminos || !transferenciaRealizada}
          >
            Finalizar compra
          </button>
        </div>
      )}
      <style>
        {`
        @media (max-width: 700px) {
          .checkout-compra-directa-root {
            padding: 10px 2vw !important;
            max-width: 100vw !important;
            border-radius: 0 !important;
            min-height: 100vh !important;
          }
          .checkout-compra-directa-root h2 {
            font-size: 1.5rem !important;
            margin-bottom: 12px !important;
          }
          .checkout-compra-directa-root select,
          .checkout-compra-directa-root label {
            font-size: 1rem !important;
          }
          .checkout-compra-directa-root ul,
          .checkout-compra-directa-root ul li {
            max-width: 100vw !important;
            width: 100% !important;
            font-size: 0.97rem !important;
            padding: 8px 4px !important;
          }
          .checkout-compra-directa-root ul li {
            flex-direction: row !important;
            align-items: flex-start !important;
            min-width: 0 !important;
          }
          .checkout-compra-directa-root img {
            width: 38px !important;
            height: 38px !important;
            margin-right: 8px !important;
          }
          .checkout-compra-directa-root .header-navbar-cart-total {
            font-size: 1.1rem !important;
            max-width: 100vw !important;
            padding: 0 2vw !important;
          }
          .checkout-compra-directa-root button,
          .checkout-compra-directa-root input[type="checkbox"] {
            font-size: 1rem !important;
          }
          .checkout-compra-directa-root pre {
            font-size: 0.97rem !important;
            padding: 10px 6px !important;
          }
        }
        @media (max-width: 480px) {
          .checkout-compra-directa-root {
            padding: 6px 0 !important;
          }
          .checkout-compra-directa-root ul,
          .checkout-compra-directa-root ul li {
            padding: 6px 2px !important;
          }
          .checkout-compra-directa-root .header-navbar-cart-total {
            font-size: 1rem !important;
            padding: 0 1vw !important;
          }
        }
        `}
      </style>
    </div>
  );
}
