// Componente de botón PayPal oficial para React
import React, { useEffect, useRef } from "react";

export default function PayPalButton({ createOrder, onApprove, disabled }) {
  const paypalRef = useRef();


  useEffect(() => {
    if (!window.paypal || !paypalRef.current) return;
    paypalRef.current.innerHTML = "";
    const paypalButtons = window.paypal.Buttons({
      style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'paypal' },
      createOrder: async (data, actions) => {
        return createOrder();
      },
      onApprove: async (data, actions) => {
        await onApprove(data);
      },
      onError: (err) => {
        alert("Error en PayPal: " + (err.message || err));
      },
      onCancel: () => {
        alert("Pago cancelado por el usuario.");
      },
      fundingSource: undefined,
      onInit: (data, actions) => {
        if (disabled) actions.disable();
        else actions.enable();
      },
    });
    paypalButtons.render(paypalRef.current);
    // Limpieza robusta al desmontar
    return () => {
      try {
        paypalButtons.close && paypalButtons.close();
      } catch (e) {}
      if (paypalRef.current) paypalRef.current.innerHTML = "";
    };
  }, [createOrder, onApprove, disabled]);

  return <div ref={paypalRef} />;
}
