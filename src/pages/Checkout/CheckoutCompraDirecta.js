import React, { useState, useEffect } from "react";
import { useMoneda } from "../../context/MonedaContext";
import { useNavigate, useLocation } from "react-router-dom";
import { db, auth, storage } from "../../firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
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
  const [bancoSeleccionado, setBancoSeleccionado] = useState(null);
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [comprobanteUploading, setComprobanteUploading] = useState(false);
  const [procesandoPago, setProcesandoPago] = useState(false);
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
    if (metodoPago === 'transferencia' && (!bancoSeleccionado || !comprobanteFile)) {
      alert("Selecciona la cuenta a la que transferirás y adjunta el comprobante de pago.");
      return;
    }
    if (metodoPago === 'crypto' && !transferenciaRealizada) {
      alert("Debes marcar que ya realizaste el pago.");
      return;
    }
    if (!user || !user.uid) {
      alert("Debes iniciar sesión para finalizar la compra.");
      return;
    }
    setProcesandoPago(true);
  let pedidoGuardado = false;
    let comprobanteUrl = null;
    if (metodoPago === 'transferencia' && comprobanteFile) {
      setComprobanteUploading(true);
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
    }
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
      if (comprobanteUrl) {
        pedido.comprobanteUrl = comprobanteUrl;
        pedido.banco = bancoSeleccionado;
      }

      // Debug: log the pedido object before saving
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
      setProcesandoPago(false);
      console.error("Error al guardar pedido:", e);
      if (e && e.message) {
        alert("Ocurrió un error al guardar tu pedido: " + e.message);
      } else {
        alert("Ocurrió un error al guardar tu pedido. Intenta nuevamente.");
      }
      return;
    }
  };

  // Datos de bancos para transferencia
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
  const datosCrypto = `USDT (BEP20): 0x7320E27e6FEB10d2bA387928c5bb6675b2AD2965\nMonto: USD ${totalConDescuento}`;

  return (
    <div
      className="checkout-compra-directa-root"
      style={{
        maxWidth: 620,
        margin: "40px auto",
        marginTop: 100,
        padding: "2rem 1.5rem",
        background: "linear-gradient(135deg, rgba(26,16,53,0.95) 0%, rgba(45,25,80,0.95) 60%, rgba(26,16,53,0.95) 100%)",
        borderRadius: 24,
        boxShadow: "0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(162,89,255,0.15)",
        fontFamily: "Poppins, Montserrat, Segoe UI, Arial, sans-serif",
        minHeight: 420,
        position: "relative",
        zIndex: 2,
        width: "98vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backdropFilter: "blur(12px)",
        border: "1.5px solid rgba(162,89,255,0.18)",
        color: "#e8e0f5"
      }}
    >
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
      <h2 style={{
        fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
        fontWeight: 800,
        marginBottom: 18,
        color: "#c4b5fd",
        textAlign: "center",
        letterSpacing: "-0.02em"
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
          marginBottom: 8,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 14,
          border: "1px solid rgba(162,89,255,0.08)",
          padding: "10px 12px",
          transition: 'background 0.15s'
        }}>
          {producto.imageUrl && <img src={producto.imageUrl} alt={producto.name} style={{
            width: 44,
            height: 44,
            objectFit: 'cover',
            marginRight: 12,
            borderRadius: 10,
            border: "1.5px solid rgba(162,89,255,0.3)"
          }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: "#e8e0f5", fontSize: '0.95rem' }}>{producto.name}</div>
            <div style={{ fontSize: '0.9rem', color: '#c4b5fd', fontWeight: 600 }}>
              {moneda}: {formatPrecio(precio, moneda)} {detalle && <span style={{ color: '#fff5', marginLeft: 6, fontWeight: 400 }}>({detalle})</span>}
            </div>
          </div>
        </li>
      </ul>
      <div style={{
        fontWeight: 800,
        fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
        marginTop: '1.2rem',
        textAlign: 'right',
        color: "#fff",
        width: "100%",
        maxWidth: 540,
        padding: '12px 0',
        borderTop: '1px solid rgba(162,89,255,0.15)'
      }}>
        Total: <span style={descuento > 0 ? {textDecoration:'line-through',color:'#fff5'} : {}}>{formatPrecio(precio, moneda)}</span>
        {descuento > 0 && (
          <span style={{color:'#81c784',fontWeight:700,marginLeft:8}}>
            {metodoPago === 'mercadopago' && moneda === 'CLP'
              ? formatPrecio(totalConDescuentoRedondeado, moneda)
              : formatPrecio(totalConDescuento, moneda)
            }
            {metodoPago === 'mercadopago' && moneda === 'CLP' && totalConDescuento !== totalConDescuentoRedondeado && (
              <span style={{fontSize:14,marginLeft:6,color:'#ff6b6b'}}>(redondeado)</span>
            )}
          </span>
        )}
      </div>
      {/* Campo para cupón */}
      <div style={{ width: '100%', maxWidth: 540, margin: '14px auto', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="¿Tienes un cupón?"
          value={cupon}
          onChange={e => setCupon(e.target.value)}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgba(162,89,255,0.3)', fontSize: '15px', background: 'rgba(255,255,255,0.06)', color: '#e8e0f5', outline: 'none' }}
        />
        <button type="button" onClick={validarCupon} style={{ background: 'linear-gradient(90deg,#7b2ff2,#a259ff)', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 18px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(123,47,242,0.3)' }}>
          Aplicar
        </button>
      </div>
      {cuponError && <div style={{ color: '#ff6b6b', marginBottom: '8px', fontSize: 14 }}>{cuponError}</div>}
      {descuento > 0 && <div style={{ color: '#81c784', marginBottom: '8px', fontSize: 14 }}>Cupón aplicado: -{descuento}%</div>}
      {/* Métodos de pago */}
      <div style={{
        marginBottom: 14,
        width: "100%",
        maxWidth: 540,
        display: "flex",
        alignItems: "center",
        gap: 10
      }}>
        <label style={{ fontWeight: 600, marginRight: 8, color: "#c4b5fd", whiteSpace: 'nowrap' }}>Método de pago:</label>
        <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} style={{
          flex: 1,
          padding: '10px 14px',
          borderRadius: 12,
          border: '1.5px solid rgba(162,89,255,0.4)',
          fontSize: 16,
          fontWeight: 600,
          background: 'rgba(45,25,80,0.95)',
          color: '#e8e0f5',
          outline: 'none',
          cursor: 'pointer'
        }}>
          <option value="" style={{background:'#2d1950',color:'#e8e0f5'}}>Selecciona...</option>
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
      {/* Checkbox términos */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: '1rem',
        width: "100%",
        maxWidth: 540
      }}>
        <input
          type="checkbox"
          checked={aceptaTerminos}
          onChange={e => setAceptaTerminos(e.target.checked)}
          style={{ marginRight: 6, width: 18, height: 18, accentColor: '#a259ff' }}
        />
        <span style={{ color: "#e8e0f5", fontWeight: 600 }}>
          Acepto los <a href="#" target="_blank" rel="noopener noreferrer" style={{ color: "#c4b5fd", textDecoration: "underline" }}>términos y condiciones</a>
        </span>
      </div>
      {/* PayPal */}
      {metodoPago === 'paypal' && moneda === 'USD' && (
        <div style={{ width: "100%", maxWidth: 540, margin: "0 auto" }}>
          <PayPalButtonWrapper
            aceptaTerminos={aceptaTerminos}
            cart={[producto]}
            cartProducts={{ [producto.id]: producto }}
            user={user}
            userProfile={userProfile}
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
            background: 'linear-gradient(90deg, #7b2ff2 0%, #a259ff 100%)',
            color: '#fff',
            fontWeight: 700,
            borderRadius: 14,
            padding: '14px 0',
            fontSize: '1.05rem',
            border: 'none',
            marginTop: 18,
            cursor: aceptaTerminos ? 'pointer' : 'not-allowed',
            opacity: aceptaTerminos ? 1 : 0.5,
            boxShadow: "0 4px 16px rgba(123,47,242,0.3)",
            transition: 'all 0.2s'
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
          Pagar
        </button>
      )}
      {/* Transferencia — selector de banco */}
      {moneda === 'CLP' && metodoPago === 'transferencia' && (
        <div style={{ marginTop: '1.5rem', marginBottom: 24, width: '100%', maxWidth: 540 }}>
          {/* Título */}
          <div style={{ fontWeight: 700, color: '#c4b5fd', fontSize: 15, marginBottom: 18, textAlign: 'center' }}>
            Elige a qué cuenta transferir
          </div>
          {/* Círculos de bancos */}
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
          {/* Datos del banco seleccionado */}
          {bancoSeleccionado && (() => {
            const banco = bancos.find(b => b.id === bancoSeleccionado);
            return (
              <div style={{ background: banco.bg, borderRadius: 14, padding: '14px 16px', border: `1.5px solid ${banco.color}55`, marginBottom: 18 }}>
                <div style={{ fontWeight: 700, color: banco.color, marginBottom: 10, fontSize: 14 }}>Datos de {banco.nombre}</div>
                <pre style={{ background: 'rgba(0,0,0,0.22)', borderRadius: 10, padding: '10px 12px', fontSize: '0.88rem', color: '#e8e0f5', fontWeight: 600, margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                  {banco.datos}{'\n'}Monto: CLP ${Number(totalConDescuento).toLocaleString('es-CL')}
                </pre>
              </div>
            );
          })()}
          {/* Adjuntar comprobante */}
          {bancoSeleccionado && (
            <div style={{ width: '100%', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#c4b5fd', marginBottom: 10, fontSize: 14 }}>Adjuntar comprobante de pago</div>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(162,89,255,0.07)',
                border: `2px dashed ${comprobanteFile ? '#a259ff' : 'rgba(162,89,255,0.35)'}`,
                borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s',
              }}>
                <span style={{ fontSize: 26 }}>{comprobanteFile ? '✅' : '📎'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#e8e0f5', fontSize: 14 }}>
                    {comprobanteFile ? comprobanteFile.name : 'Subir imagen o PDF del comprobante'}
                  </div>
                  <div style={{ fontSize: 12, color: '#a084cc', marginTop: 2 }}>
                    {comprobanteFile ? '✓ Listo para enviar' : 'JPG, PNG o PDF · Máx 10MB'}
                  </div>
                </div>
                <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                  onChange={e => setComprobanteFile(e.target.files[0] || null)} />
              </label>
            </div>
          )}
          <button
            style={{
              width: '100%',
              background: 'linear-gradient(90deg, #7b2ff2 0%, #a259ff 100%)',
              color: '#fff',
              fontWeight: 700,
              borderRadius: 14,
              padding: '14px 0',
              fontSize: '1.05rem',
              border: 'none',
              marginTop: 18,
              cursor: aceptaTerminos && bancoSeleccionado && comprobanteFile && !comprobanteUploading ? 'pointer' : 'not-allowed',
              opacity: aceptaTerminos && bancoSeleccionado && comprobanteFile && !comprobanteUploading ? 1 : 0.5,
              boxShadow: '0 4px 16px rgba(123,47,242,0.3)',
              transition: 'all 0.2s'
            }}
            onClick={finalizarCompra}
            disabled={!aceptaTerminos || !bancoSeleccionado || !comprobanteFile || comprobanteUploading}
          >
            {comprobanteUploading ? 'Subiendo comprobante...' : 'Confirmar pago y finalizar'}
          </button>
        </div>
      )}
      {/* Cripto */}
      {moneda === 'USD' && metodoPago === 'crypto' && (
        <div style={{
          marginTop: '1.5rem',
          marginBottom: 24,
          background: 'rgba(255,255,255,0.04)',
          padding: '1.2rem',
          borderRadius: 16,
          border: '1px solid rgba(162,89,255,0.12)',
          width: '100%',
          maxWidth: 540
        }}>
          <div style={{ fontWeight: 700, marginBottom: 12, color: '#c4b5fd', fontSize: 18 }}>
            Dirección para pago con criptomoneda:
          </div>
          <pre style={{
            background: 'rgba(255,255,255,0.06)',
            padding: 14,
            borderRadius: 10,
            fontSize: '0.95rem',
            color: '#e8e0f5',
            fontWeight: 600,
            marginBottom: 10,
            border: '1px solid rgba(162,89,255,0.1)',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}>
            {datosCrypto}
          </pre>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', fontWeight: 600, color: '#e8e0f5' }}>
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
              background: 'linear-gradient(90deg, #7b2ff2 0%, #a259ff 100%)',
              color: '#fff',
              fontWeight: 700,
              borderRadius: 14,
              padding: '14px 0',
              fontSize: '1.05rem',
              border: 'none',
              marginTop: 18,
              cursor: aceptaTerminos && transferenciaRealizada ? 'pointer' : 'not-allowed',
              opacity: aceptaTerminos && transferenciaRealizada ? 1 : 0.5,
              boxShadow: '0 4px 16px rgba(123,47,242,0.3)',
              transition: 'all 0.2s'
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
            padding: 1.2rem 0.8rem !important;
            max-width: 100vw !important;
            border-radius: 18px !important;
            margin: 16px 8px !important;
          }
          .checkout-compra-directa-root h2 {
            font-size: 1.4rem !important;
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
            font-size: 0.95rem !important;
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
          .checkout-compra-directa-root button,
          .checkout-compra-directa-root input[type="checkbox"] {
            font-size: 1rem !important;
          }
          .checkout-compra-directa-root pre {
            font-size: 0.9rem !important;
            padding: 10px 6px !important;
          }
        }
        @media (max-width: 480px) {
          .checkout-compra-directa-root {
            padding: 1rem 0.5rem !important;
            border-radius: 14px !important;
            margin: 8px 4px !important;
          }
          .checkout-compra-directa-root ul,
          .checkout-compra-directa-root ul li {
            padding: 6px 2px !important;
          }
        }
        `}
      </style>
    </div>
  );
}
