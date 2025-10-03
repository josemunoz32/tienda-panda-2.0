import React from "react";
import PayPalButton from "../../components/PayPalButton";
import { getMinPriceByMoneda } from "../Checkout/CheckoutCarrito";

export function PayPalButtonWrapper({ aceptaTerminos, cart, cartProducts, user, userProfile, total, selectedMoneda }) {
  const createOrder = async () => {
    if (!aceptaTerminos) {
      alert("Debes aceptar los términos y condiciones para continuar.");
      return;
    }
    const payload = {
      cart: cart.map(prod => ({
        id: prod.id,
        name: prod.name,
        description: cartProducts[prod.id]?.description || prod.name,
        category_id: cartProducts[prod.id]?.category_id || "others",
        precio: getMinPriceByMoneda(cartProducts[prod.id], selectedMoneda)
      })),
      email: user?.email || '',
      firstName: userProfile.firstName || user?.displayName?.split(' ')[0] || '',
      lastName: userProfile.lastName || user?.displayName?.split(' ').slice(1).join(' ') || '',
      total,
      uid: user?.uid || '',
      shipping: {},
    };
    const response = await fetch("https://us-central1-pandastoreupdate.cloudfunctions.net/createPayPalOrder", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (data && data.orderID) {
      return data.orderID; // Devuelve el orderID directo del backend
    } else {
      alert("Error al crear la orden de PayPal: " + (data.error || "Sin orderID"));
      throw new Error("No orderID");
    }
  };

  const onApprove = async (data) => {
    try {
      const resp = await fetch("https://us-central1-pandastoreupdate.cloudfunctions.net/capturePayPalOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderID }),
      });
      const result = await resp.json();
      if (resp.ok && result.success) {
        alert("¡Pago con PayPal aprobado y pedido guardado!");
        window.location.href = "/confirmacion-exitosa";
      } else {
        alert("Error al capturar el pago: " + (result.error || "Desconocido"));
      }
    } catch (e) {
      alert("Error al capturar el pago: " + (e.message || e));
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      <PayPalButton
        disabled={!aceptaTerminos}
        createOrder={createOrder}
        onApprove={onApprove}
      />
    </div>
  );
}
