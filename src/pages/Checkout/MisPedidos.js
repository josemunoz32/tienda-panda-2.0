import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function MisPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [role, setRole] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [ordenar, setOrdenar] = useState("reciente");
  const [user, setUser] = useState(null);

  // Esperar a que Firebase Auth inicialice (auth.currentUser puede ser null en el primer render)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then(docSnap => {
      if (docSnap.exists()) {
        // Si no tiene campo role, asumir 'user'
        setRole(docSnap.data().role || 'user');
      } else {
        setRole('user');
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user || !role) return;
    setCargando(true);
    if (role === "admin") {
      // Una sola consulta a la colección global 'orders' — mucho más rápido que N+1 subconsultas
      getDocs(collection(db, "orders")).then(snap => {
        const porUsuario = {};
        snap.docs.forEach(d => {
          const pedido = { id: d.id, ...d.data() };
          const uid = pedido.uid || 'desconocido';
          if (!porUsuario[uid]) {
            porUsuario[uid] = {
              userId: uid,
              pedidos: [],
              user: { displayName: pedido.nombre || pedido.email || uid, email: pedido.email || '' }
            };
          }
          porUsuario[uid].pedidos.push(pedido);
        });
        setPedidos(Object.values(porUsuario).filter(u => u.pedidos.length > 0));
        setCargando(false);
      }).catch(() => setCargando(false));
    } else {
      getDocs(collection(db, `users/${user.uid}/orders`)).then(snapshot => {
        const pedidos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPedidos(pedidos);
        setCargando(false);
      }).catch(() => setCargando(false));
    }
  }, [user, role]);

  return (
    <div style={{
      maxWidth: 950,
      margin: "48px auto 48px auto",
      padding: "32px 0",
      borderRadius: 18,
      background: "rgba(34,34,44,0.98)",
      boxShadow: "0 4px 32px #7b2ff244, 0 1.5px 0 #a084e8",
      border: "2px solid #393053",
      fontFamily: "Poppins, Montserrat, Segoe UI, Arial, sans-serif",
      color: "#fff",
      minHeight: 400,
      position: "relative",
      zIndex: 2 // <-- Asegura que el contenido esté sobre el fondo animado
    }}>
      {cargando && (
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
              {role === 'admin' ? 'Cargando todos los pedidos...' : 'Cargando tus pedidos...'}
            </div>
            <div style={{ color: '#a08ab8', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {role === 'admin' ? 'Tiempo estimado: ~3 seg' : 'Tiempo estimado: ~2 seg'}
            </div>
          </div>
          <style>{`@keyframes pandaSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      <h2 style={{
        fontSize: 32,
        fontWeight: 800,
        marginBottom: 28,
        textAlign: "center",
        color: "#FFD600",
        letterSpacing: "0.03em",
        textShadow: "0 2px 12px #7b2ff244, 0 1px 0 #18122B"
      }}>
        Mis Pedidos
      </h2>
      {!cargando && pedidos.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          marginBottom: 18, padding: '0 24px', gap: 10
        }}>
          <label style={{ color: '#a084e8', fontWeight: 600, fontSize: '0.95rem' }}>Ordenar:</label>
          <select
            value={ordenar}
            onChange={e => setOrdenar(e.target.value)}
            style={{
              padding: '7px 14px', borderRadius: 10,
              border: '1.5px solid rgba(162,89,255,0.4)',
              background: 'rgba(45,25,80,0.95)', color: '#e8e0f5',
              fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', outline: 'none'
            }}
          >
            <option value="reciente">Más recientes primero</option>
            <option value="antiguo">Más antiguos primero</option>
          </select>
        </div>
      )}
      {role === "admin" ? (
        !cargando && pedidos.length === 0 ? (
          <div style={{ color: '#a084e8', fontSize: 20, textAlign: "center", fontWeight: 600 }}>No hay pedidos registrados.</div>
        ) : (
          <div>
            {pedidos
              .sort((a, b) => {
                const fechaA = Math.max(...a.pedidos.map(p => p.fecha ? new Date(p.fecha).getTime() : 0));
                const fechaB = Math.max(...b.pedidos.map(p => p.fecha ? new Date(p.fecha).getTime() : 0));
                return ordenar === 'reciente' ? fechaB - fechaA : fechaA - fechaB;
              })
              .map(({ userId, pedidos, user }) => (
              <div key={userId} style={{
                marginBottom: 38,
                background: "rgba(44,19,80,0.18)",
                borderRadius: 14,
                border: "1.5px solid #a084e8",
                boxShadow: "0 2px 12px #7b2ff244",
                padding: "18px 18px 12px 18px"
              }}>
                <h3 style={{
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 10,
                  color: "#FFD600"
                }}>
                  Usuario: <span style={{color:"#fff"}}>{user.displayName || userId}</span>
                  <span style={{fontSize:14, color:"#a084e8", marginLeft:8}}>({userId})</span>
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {pedidos
                    .sort((a, b) => {
                      const fa = a.fecha ? new Date(a.fecha).getTime() : 0;
                      const fb = b.fecha ? new Date(b.fecha).getTime() : 0;
                      return ordenar === 'reciente' ? fb - fa : fa - fb;
                    })
                    .map(pedido => (
                    <li key={pedido.id} style={{
                      borderBottom: '1px solid #a084e8',
                      marginBottom: 22,
                      paddingBottom: 16,
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: 10,
                      marginTop: 12,
                      boxShadow: "0 1px 8px #7b2ff211"
                    }}>
                      <div style={{fontWeight:600, fontSize:17, marginBottom:6}}>
                        <span style={{color:"#FFD600"}}>Fecha:</span> <span style={{color:"#fff"}}>{new Date(pedido.fecha).toLocaleString()}</span>
                      </div>
                      <div><b>Método de pago:</b> <span style={{color:"#FFD600"}}>{pedido.metodoPago}</span></div>
                      <div><b>Total:</b> <span style={{color:"#FFD600"}}>{formatPrecioPedido(pedido.total, pedido.moneda)}</span></div>
                      <div><b>Correo:</b> <span style={{color:"#fff"}}>{pedido.email}</span></div>
                      <div><b>Nombre:</b> <span style={{color:"#fff"}}>{pedido.nombre}</span></div>
                      <div style={{marginTop:8, fontWeight:600}}>Productos:</div>
                      <ul style={{ marginLeft: 16, marginTop: 4 }}>
                        {Array.isArray(pedido.productos)
                          ? pedido.productos.map((prod, idx) => (
                              <li key={idx} style={{color:"#fff", marginBottom: 6, padding: '6px 0'}}>
                                <span style={{color:"#FFD600", fontWeight:700}}>{prod.name}</span> (x{prod.cantidad}) - {formatPrecioPedido(prod.precio, pedido.moneda)}

                              </li>
                            ))
                          : <li style={{ color: '#888' }}>Sin productos</li>
                        }
                      </ul>
                      {(pedido.metodoPago === 'transferencia' || pedido.metodoPago === 'crypto') && (
                        <div style={{ marginTop: 10 }}>
                          <label style={{ fontWeight: 600, marginRight: 8 }}>Estado de pago:</label>
                          <select
                            value={pedido.transferenciaEstado || 'pendiente'}
                            onChange={async e => {
                              const nuevoEstado = e.target.value;
                              // Actualizar colección global (fuente principal del admin)
                              await updateDoc(doc(db, 'orders', pedido.id), { transferenciaEstado: nuevoEstado });
                              // También actualizar subcollection del usuario
                              try {
                                const userPedidoRef = doc(db, `users/${userId}/orders`, pedido.id);
                                const userPedidoSnap = await getDoc(userPedidoRef);
                                if (userPedidoSnap.exists()) {
                                  await updateDoc(userPedidoRef, { transferenciaEstado: nuevoEstado });
                                }
                              } catch (_) {}
                              setPedidos(pedidos => pedidos.map(u => u.userId === userId ? {
                                ...u,
                                pedidos: u.pedidos.map(p => p.id === pedido.id ? { ...p, transferenciaEstado: nuevoEstado } : p)
                              } : u));
                              if (nuevoEstado === 'exitoso') {
                                const idToSend = pedido.globalOrderId || pedido.id;
                                try {
                                  await fetch('https://us-central1-pandastoreupdate.cloudfunctions.net/sendConfirmationEmail', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      orderId: idToSend,
                                      globalOrderId: pedido.globalOrderId || '',
                                      docId: pedido.id,
                                      clienteEmail: pedido.email
                                    })
                                  });
                                } catch (err) {}
                              }
                            }}
                            style={{
                              padding: '6px 18px',
                              borderRadius: 8,
                              border: '1.5px solid #a084e8',
                              background: '#1a1a2e',
                              color: '#fff',
                              fontWeight: 600,
                              fontSize: '1.01rem',
                              marginLeft: 8
                            }}
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="exitoso">Exitoso</option>
                            <option value="rechazado">Rechazado</option>
                          </select>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      ) : (
        !cargando && pedidos.length === 0 ? (
          <div style={{ color: '#a084e8', fontSize: 20, textAlign: "center", fontWeight: 600 }}>No tienes pedidos registrados.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {pedidos
              .sort((a, b) => {
                const fa = a.fecha ? new Date(a.fecha).getTime() : 0;
                const fb = b.fecha ? new Date(b.fecha).getTime() : 0;
                return ordenar === 'reciente' ? fb - fa : fa - fb;
              })
              .map(pedido => (
              <li key={pedido.id} style={{
                borderBottom: '1px solid #a084e8',
                marginBottom: 22,
                paddingBottom: 16,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 10,
                marginTop: 12,
                boxShadow: "0 1px 8px #7b2ff211"
              }}>
                <div style={{fontWeight:600, fontSize:17, marginBottom:6}}>
                  <span style={{color:"#FFD600"}}>Fecha:</span> <span style={{color:"#fff"}}>{new Date(pedido.fecha).toLocaleString()}</span>
                </div>
                <div><b>Método de pago:</b> <span style={{color:"#FFD600"}}>{pedido.metodoPago}</span></div>
                <div><b>Total:</b> <span style={{color:"#FFD600"}}>{pedido.moneda} {pedido.total}</span></div>
                <div><b>Correo:</b> <span style={{color:"#fff"}}>{pedido.email}</span></div>
                <div><b>Nombre:</b> <span style={{color:"#fff"}}>{pedido.nombre}</span></div>
                <div style={{marginTop:8, fontWeight:600}}>Productos:</div>
                <ul style={{ marginLeft: 16, marginTop: 4 }}>
                  {Array.isArray(pedido.productos)
                    ? pedido.productos.map((prod, idx) => (
                        <li key={idx} style={{color:"#fff", marginBottom: 6, padding: '6px 0'}}>
                          <span style={{color:"#FFD600", fontWeight:700}}>{prod.name}</span> (x{prod.cantidad}) - {formatPrecioPedido(prod.precio, pedido.moneda)}
                        </li>
                      ))
                    : <li style={{ color: '#888' }}>Sin productos</li>
                  }
                </ul>
                {pedido.metodoPago === 'transferencia' && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ fontWeight: 600, marginRight: 8 }}>Estado de pago:</label>
                    <span style={{
                      color: pedido.transferenciaEstado === 'exitoso' ? '#4caf50' : pedido.transferenciaEstado === 'rechazado' ? '#d32f2f' : '#FFD600',
                      fontWeight: 700,
                      fontSize: '1.01rem'
                    }}>
                      {pedido.transferenciaEstado === 'exitoso' ? 'Exitoso' : pedido.transferenciaEstado === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )
      )}

    </div>
  );
}

// Formatea el precio según la moneda del pedido
function formatPrecioPedido(precio, moneda) {
  if (!precio || isNaN(Number(precio))) return "";
  if (moneda === "USD") {
    return `USD $${Number(precio).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (moneda === "CLP") {
    return `CLP $${Number(precio).toLocaleString("es-CL")}`;
  }
  return `${moneda} $${precio}`;
}
