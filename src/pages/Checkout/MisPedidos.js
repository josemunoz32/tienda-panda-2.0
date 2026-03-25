import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";

export default function MisPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [role, setRole] = useState(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then(docSnap => {
      if (docSnap.exists()) {
        setRole(docSnap.data().role);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user || !role) return;
    if (role === "admin") {
      getDocs(collection(db, "users")).then(async usersSnap => {
        const allPedidos = [];
        for (const userDoc of usersSnap.docs) {
          const userId = userDoc.id;
          const pedidosSnap = await getDocs(collection(db, `users/${userId}/orders`));
            let pedidos = pedidosSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), userId }));
            pedidos = pedidos.sort((a, b) => (b.fecha || 0) - (a.fecha || 0));
          if (pedidos.length > 0) {
            allPedidos.push({ userId, pedidos, user: userDoc.data() });
          }
        }
        setPedidos(allPedidos);
      });
    } else {
      getDocs(collection(db, `users/${user.uid}/orders`)).then(snapshot => {
          let pedidos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          pedidos = pedidos.sort((a, b) => (b.fecha || 0) - (a.fecha || 0));
        setPedidos(pedidos);
      });
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
      {role === "admin" ? (
        pedidos.length === 0 ? (
          <div style={{ color: '#a084e8', fontSize: 20, textAlign: "center", fontWeight: 600 }}>No hay pedidos registrados.</div>
        ) : (
          <div>
            {pedidos
              // Ordenar por fecha del pedido más reciente del usuario
              .sort((a, b) => {
                const fechaA = a.pedidos[0]?.fecha || 0;
                const fechaB = b.pedidos[0]?.fecha || 0;
                return fechaB - fechaA;
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
                    .sort((a, b) => (b.fecha || 0) - (a.fecha || 0))
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
                              const userPedidoRef = doc(db, `users/${userId}/orders`, pedido.id);
                              const userPedidoSnap = await getDoc(userPedidoRef);
                              if (userPedidoSnap.exists()) {
                                await updateDoc(userPedidoRef, { transferenciaEstado: nuevoEstado });
                              }
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
        pedidos.length === 0 ? (
          <div style={{ color: '#a084e8', fontSize: 20, textAlign: "center", fontWeight: 600 }}>No tienes pedidos registrados.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {pedidos
              .sort((a, b) => (b.fecha || 0) - (a.fecha || 0))
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
