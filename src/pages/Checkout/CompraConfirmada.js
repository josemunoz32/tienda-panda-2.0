import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { auth } from "../../firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";

function CompraConfirmada() {
  const location = useLocation();
  const [status, setStatus] = useState("pending"); // "pending", "success", "error"
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const params = new URLSearchParams(location.search);
    const paypalOrderId = params.get("token");
    const payerId = params.get("PayerID");

    async function procesarCompra() {
      try {
        const snap = await getDocs(collection(db, `users/${user.uid}/cart`));
        const productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (productos.length === 0) {
          setStatus("error");
          setMensaje("No se encontraron productos en el carrito.");
          return;
        }
        const pedido = {
          productos,
          total: productos.reduce((acc, prod) => acc + (prod.precio || 0), 0),
          moneda: paypalOrderId ? "USD" : "CLP",
          metodoPago: paypalOrderId ? "paypal" : "mercadopago",
          email: user.email,
          nombre: user.displayName || "",
          fecha: new Date().toISOString(),
          uid: user.uid,
        };
        let ok = false;
        if (paypalOrderId && payerId) {
          // Capturar y guardar pedido PayPal
          const resp = await fetch("https://us-central1-pandastoreupdate.cloudfunctions.net/capturePayPalOrder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: paypalOrderId }),
          });
          if (resp.ok) {
            setStatus("success");
            setMensaje("¡Pago con PayPal aprobado y pedido guardado!");
            ok = true;
          } else {
            setStatus("error");
            const data = await resp.json().catch(() => ({}));
            setMensaje(data.error || "Error al capturar el pago con PayPal.");
          }
        } else {
          // Flujo normal (MercadoPago, transferencia, etc)
          const resp = await fetch("https://us-central1-pandastoreupdate.cloudfunctions.net/confirmarCompra", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pedido, clienteEmail: user.email }),
          });
          if (resp.ok) {
            setStatus("success");
            setMensaje("¡Compra confirmada y pedido guardado!");
            ok = true;
          } else {
            setStatus("error");
            const data = await resp.json().catch(() => ({}));
            setMensaje(data.error || "Error al guardar el pedido.");
          }
        }
        // Vaciar el carrito solo si la compra fue exitosa
        if (ok) {
          for (const d of snap.docs) {
            await deleteDoc(doc(db, `users/${user.uid}/cart`, d.id));
          }
        }
      } catch (err) {
        setStatus("error");
        setMensaje("Ocurrió un error inesperado: " + (err.message || err));
      }
    }
    procesarCompra();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  return (
    <div style={{ maxWidth: 600, margin: "60px auto", padding: 32, background: "#fff", borderRadius: 16, textAlign: "center" }}>
      {status === "pending" && (
        <>
          <h1 style={{ color: "#1976d2", fontWeight: 800 }}>Procesando compra...</h1>
          <p style={{ fontSize: 20, marginTop: 18 }}>Por favor espera un momento.</p>
        </>
      )}
      {status === "success" && (
        <>
          <h1 style={{ color: "#1976d2", fontWeight: 800 }}>¡Compra confirmada!</h1>
          <p style={{ fontSize: 20, marginTop: 18 }}>{mensaje}<br />Pronto recibirás un correo con los detalles de tu pedido.</p>
          <img
            src="https://cdn-icons-png.flaticon.com/512/190/190411.png"
            alt="check"
            style={{ width: 120, marginTop: 32 }}
          />
        </>
      )}
      {status === "error" && (
        <>
          <h1 style={{ color: "#d32f2f", fontWeight: 800 }}>¡Error en la compra!</h1>
          <p style={{ fontSize: 20, marginTop: 18 }}>{mensaje}</p>
          <img
            src="https://cdn-icons-png.flaticon.com/512/463/463612.png"
            alt="error"
            style={{ width: 120, marginTop: 32 }}
          />
        </>
      )}
      <div style={{ marginTop: 32 }}>
        <a
          href="/home"
          style={{ color: "#1976d2", fontWeight: 700, fontSize: 18 }}
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}

export default CompraConfirmada;
// ...existing code...
