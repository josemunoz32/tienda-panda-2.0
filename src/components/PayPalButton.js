// Componente de botón PayPal oficial para React (Carga On-Demand bajo demanda)
import React, { useEffect, useRef, useState } from "react";

export default function PayPalButton({ createOrder, onApprove, disabled }) {
  const paypalRef = useRef();
  const [sdkReady, setSdkReady] = useState(Boolean(window.paypal));

  useEffect(() => {
    if (window.paypal) {
      setSdkReady(true);
      return;
    }
    const clientId = process.env.REACT_APP_PAYPAL_CLIENT_ID || 'sb';
    let script = document.getElementById("paypal-sdk");
    if (!script) {
      script = document.createElement("script");
      script.id = "paypal-sdk";
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
      script.async = true;
      script.onload = () => setSdkReady(true);
      document.body.appendChild(script);
    } else {
      script.addEventListener("load", () => setSdkReady(true));
    }
  }, []);

  useEffect(() => {
    if (!sdkReady || !window.paypal || !paypalRef.current) return;
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
  }, [sdkReady, createOrder, onApprove, disabled]);

  return (
    <div ref={paypalRef}>
      {!sdkReady && <div style={{ color: '#aaa', textAlign: 'center', padding: '10px' }}>Cargando pasarela PayPal...</div>}
    </div>
  );
}
