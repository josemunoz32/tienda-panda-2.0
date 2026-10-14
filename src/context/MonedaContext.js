import React, { createContext, useContext, useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { hasResellerBenefits, hasB2BAccess } from "../utils/userRoles";

// Configuración de países soportados (Clientes Finales)
export const PAISES_CONFIG = [
  { codigo: "CL", bandera: "🇨🇱", nombre: "Chile",         moneda: "CLP", simbolo: "$",  decimales: 0, metodosPago: ["Transferencia", "MercadoPago", "Crypto"] },
  { codigo: "PE", bandera: "🇵🇪", nombre: "Perú",          moneda: "PEN", simbolo: "S/", decimales: 2, metodosPago: ["Prex", "PayPal", "Crypto"] },
  { codigo: "AR", bandera: "🇦🇷", nombre: "Argentina",     moneda: "ARS", simbolo: "$",  decimales: 0, metodosPago: ["Prex", "Crypto", "PayPal"] },
  { codigo: "UY", bandera: "🇺🇾", nombre: "Uruguay",       moneda: "UYU", simbolo: "$U", decimales: 0, metodosPago: ["Prex", "PayPal", "Crypto"] },
  { codigo: "CO", bandera: "🇨🇴", nombre: "Colombia",      moneda: "COP", simbolo: "$",  decimales: 0, metodosPago: ["PayPal", "Crypto"] },
  { codigo: "MX", bandera: "🇲🇽", nombre: "México",        moneda: "MXN", simbolo: "$",  decimales: 2, metodosPago: ["PayPal", "Crypto"] },
  { codigo: "VE", bandera: "🇻🇪", nombre: "Venezuela",     moneda: "USD", simbolo: "$",  decimales: 2, metodosPago: ["Crypto", "PayPal"] },
  { codigo: "US", bandera: "🇺🇸", nombre: "Internacional", moneda: "USD", simbolo: "$",  decimales: 2, metodosPago: ["PayPal", "Crypto"] },
];

// Configuración exclusiva para Revendedores B2B / Distribuidores Steam:
// Solo CLP (Chile) y USDT (Internacional con Binance BEP20 al dólar administrativo fijo)
export const RESELLER_PAISES_CONFIG = [
  { codigo: "CL", bandera: "🇨🇱", nombre: "Chile", moneda: "CLP", simbolo: "$", decimales: 0, metodosPago: ["Transferencia", "MercadoPago"] },
  { codigo: "US", bandera: "₮", nombre: "Internacional (USDT)", moneda: "USDT", simbolo: "₮", decimales: 2, metodosPago: ["Crypto"] },
];

const MonedaContext = createContext();

// Tasas oficiales de divisas internacionales calculadas estrictamente respecto a 1 USD
// Si cambia el dólar en CLP, todas las monedas (COP, PEN, ARS, MXN, UYU, VES) se recalculan automáticamente
export const DEFAULT_RATES_VS_USD = {
  usd: 1,
  pen: 3.75,    // Soles peruanos por 1 USD
  cop: 4150,    // Pesos colombianos por 1 USD
  ars: 1350,    // Pesos argentinos protegidos por 1 USD (evita pérdida con dólar oficial)
  mxn: 19.5,    // Pesos mexicanos por 1 USD
  uyu: 40.5,    // Pesos uruguayos por 1 USD
  ves: 36.5     // Bolívares venezolanos por 1 USD
};

export const DEFAULT_PAYMENT_MARGINS = {
  mercadopago: 0.035, // 3.5%
  paypal: 0.054,      // 5.4%
  crypto: 0.00,       // 0%
  transferencia: 0.00,// 0%
  prex: 0.02,         // 2%
  billetera: 0.00     // 0%
};

// Función para redondear montos en USD hacia arriba al 0.50 o al 1.00 más cercano
export const roundUpUSD = (val) => {
  const num = Number(val || 0);
  if (num <= 0) return 0;
  return Math.ceil(num * 2) / 2;
};

export function MonedaProvider({ children }) {
    // Detección automática del rol de Revendedor / B2B
    const [isReseller, setIsReseller] = useState(() => {
      try {
        return localStorage.getItem("pandaIsReseller") === "true";
      } catch {
        return false;
      }
    });

    useEffect(() => {
      const unsub = onAuthStateChanged(auth, async (currentUser) => {
        if (!currentUser) {
          setIsReseller(false);
          try { localStorage.removeItem("pandaIsReseller"); } catch {}
          return;
        }
        try {
          let snap;
          try {
            snap = await getDoc(doc(db, "users", currentUser.uid));
          } catch {
            snap = await getDoc(doc(db, "users", currentUser.uid), { source: 'cache' });
          }
          if (snap && snap.exists()) {
            const uData = snap.data();
            const isB2B = Boolean(hasB2BAccess(uData) || hasResellerBenefits(uData));
            setIsReseller(isB2B);
            try { localStorage.setItem("pandaIsReseller", isB2B ? "true" : "false"); } catch {}
          } else {
            setIsReseller(false);
            try { localStorage.removeItem("pandaIsReseller"); } catch {}
          }
        } catch {
          // Ignorar error transitorio
        }
      });
      return () => unsub();
    }, []);

    const activePaisesList = isReseller ? RESELLER_PAISES_CONFIG : PAISES_CONFIG;

    // Estado del país seleccionado
    const [pais, setPaisState] = useState(() => {
      const savedPais = localStorage.getItem("pais");
      if (savedPais && PAISES_CONFIG.find(p => p.codigo === savedPais)) return savedPais;
      const legacyMoneda = localStorage.getItem("moneda") || "CLP";
      const match = PAISES_CONFIG.find(p => p.moneda === legacyMoneda && p.codigo !== "VE");
      return match ? match.codigo : "CL";
    });

    // Para Revendedores: Si tienen seleccionado otro país que no sea Chile ni USDT, forzar a USDT o Chile
    useEffect(() => {
      if (isReseller && pais !== "CL" && pais !== "US") {
        setPaisState("US");
        try {
          localStorage.setItem("pais", "US");
          localStorage.setItem("moneda", "USDT");
        } catch {}
      }
    }, [isReseller, pais]);

    // Dólar fijo centralizado (por defecto $900 CLP)
    const [valorDolar, setValorDolar] = useState(() => {
      try {
        const cached = localStorage.getItem("dolarFijoPanda");
        if (cached && !isNaN(cached)) return Number(cached);
      } catch {}
      return 900;
    });

    // Tasas administrables
    const [tasas, setTasas] = useState(() => {
      try {
        const cached = localStorage.getItem("tasasCambioPanda");
        if (cached) return { ...DEFAULT_RATES_VS_USD, ...JSON.parse(cached) };
      } catch {}
      return DEFAULT_RATES_VS_USD;
    });

    // Márgenes por método
    const [margenesMetodos, setMargenesMetodos] = useState(() => {
      try {
        const cached = localStorage.getItem("margenesMetodosPanda");
        if (cached) return { ...DEFAULT_PAYMENT_MARGINS, ...JSON.parse(cached) };
      } catch {}
      return DEFAULT_PAYMENT_MARGINS;
    });

    const [cargandoTasas, setCargandoTasas] = useState(false);

    // País e info derivada
    const infoPais = activePaisesList.find(p => p.codigo === pais) || activePaisesList[0];
    const moneda = infoPais.moneda;

    const setPais = (val) => {
      const list = isReseller ? RESELLER_PAISES_CONFIG : PAISES_CONFIG;
      const config = list.find(p => p.codigo === val) || list[0];
      setPaisState(config.codigo);
      try {
        localStorage.setItem("pais", config.codigo);
        localStorage.setItem("moneda", config.moneda);
      } catch {}
    };

    const setMoneda = (val) => {
      const list = isReseller ? RESELLER_PAISES_CONFIG : PAISES_CONFIG;
      const match = list.find(p => (p.moneda === val || (val === "USD" && p.moneda === "USDT")) && p.codigo !== "VE");
      if (match) setPais(match.codigo);
    };

    // Sincronizar configuración general desde Firestore en tiempo real
    useEffect(() => {
      let unsub = () => {};
      try {
        unsub = onSnapshot(doc(db, "config", "general"), (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            if (d.valorDolar && Number(d.valorDolar) > 0) {
              const val = Number(d.valorDolar);
              setValorDolar(val);
              try { localStorage.setItem("dolarFijoPanda", String(val)); } catch {}
            }
            if (d.tasasMonedas && typeof d.tasasMonedas === "object") {
              const merged = { ...DEFAULT_RATES_VS_USD, ...d.tasasMonedas };
              setTasas(merged);
              try { localStorage.setItem("tasasCambioPanda", JSON.stringify(merged)); } catch {}
            }
            if (d.margenesMetodos && typeof d.margenesMetodos === "object") {
              const mergedMarg = { ...DEFAULT_PAYMENT_MARGINS, ...d.margenesMetodos };
              setMargenesMetodos(mergedMarg);
              try { localStorage.setItem("margenesMetodosPanda", JSON.stringify(mergedMarg)); } catch {}
            }
          }
        }, (err) => {
          console.warn("Firestore config/general listener fallback:", err.message);
        });
      } catch (e) {
        console.warn("Failsafe config listener:", e);
      }
      return () => unsub();
    }, []);

    // Actualizar valor del dólar globalmente (Admin)
    const actualizarValorDolar = async (nuevoValor) => {
      const num = Number(nuevoValor);
      if (!num || num <= 0) return;
      setValorDolar(num);
      try { localStorage.setItem("dolarFijoPanda", String(num)); } catch {}
      try {
        await setDoc(doc(db, "config", "general"), { valorDolar: num, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.warn("Error escribiendo en Firestore config/general:", e);
      }
    };

    // Actualizar tasas de cambio de monedas (Admin)
    const actualizarTasasMonedas = async (nuevasTasas) => {
      if (!nuevasTasas || typeof nuevasTasas !== "object") return;
      const merged = { ...tasas, ...nuevasTasas };
      setTasas(merged);
      try { localStorage.setItem("tasasCambioPanda", JSON.stringify(merged)); } catch {}
      try {
        await setDoc(doc(db, "config", "general"), { tasasMonedas: merged, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.warn("Error guardando tasas en Firestore:", e);
      }
    };

    // Actualizar márgenes por método de pago (Admin)
    const actualizarMargenesMetodos = async (nuevosMargenes) => {
      if (!nuevosMargenes || typeof nuevosMargenes !== "object") return;
      const merged = { ...margenesMetodos, ...nuevosMargenes };
      setMargenesMetodos(merged);
      try { localStorage.setItem("margenesMetodosPanda", JSON.stringify(merged)); } catch {}
      try {
        await setDoc(doc(db, "config", "general"), { margenesMetodos: merged, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.warn("Error guardando márgenes en Firestore:", e);
      }
    };

    // ── FÓRMULA CANÓNICA Y SEGURA: Convertir desde CLP a cualquier divisa ──
    const convertirDesdeCLP = (precioCLP, monedaTarget = null, metodoPago = null) => {
      if (precioCLP === null || precioCLP === undefined || isNaN(precioCLP)) return null;
      const precio = Number(precioCLP);
      const targetMoneda = (monedaTarget || moneda || "CLP").toUpperCase();
      const margen = metodoPago && margenesMetodos[metodoPago] ? Number(margenesMetodos[metodoPago]) : 0;
      const currentRate = valorDolar || 900;

      // 1. Caso base: CLP (Chile)
      if (targetMoneda === "CLP") {
        return Math.round(precio * (1 + margen));
      }

      // 2. Paso canónico: CLP -> USD base con dólar administrativo
      const precioEnUSD = (precio / currentRate) * (1 + margen);
      if (targetMoneda === "USD" || targetMoneda === "USDT") return roundUpUSD(precioEnUSD);

      // 3. Paso canónico: USD -> Divisa extranjera (COP, PEN, ARS, MXN, UYU, VES)
      const factorVsUsd = Number(tasas[targetMoneda.toLowerCase()] || DEFAULT_RATES_VS_USD[targetMoneda.toLowerCase()] || 1);
      return precioEnUSD * factorVsUsd;
    };

    // ── COTIZACIÓN CANÓNICA CONGELADA PARA CHECKOUT Y PAGOS ──
    const obtenerCotizacion = ({ precioCLP, monedaTarget = null, metodoPago = null }) => {
      const baseCLP = Number(precioCLP || 0);
      const currentRate = Number(valorDolar || 900);
      const targetMoneda = (monedaTarget || moneda || "CLP").toUpperCase();
      const cfg = activePaisesList.find(p => p.moneda === targetMoneda) || infoPais;
      const margen = metodoPago && margenesMetodos[metodoPago] ? Number(margenesMetodos[metodoPago]) : 0;

      const precioUSDNeto = baseCLP / currentRate;
      const precioUSDConMargen = roundUpUSD(precioUSDNeto * (1 + margen));
      const tasaDivisa = Number(tasas[targetMoneda.toLowerCase()] || DEFAULT_RATES_VS_USD[targetMoneda.toLowerCase()] || 1);

      let montoLocalFinal = 0;
      if (targetMoneda === "CLP") {
        montoLocalFinal = Math.round(baseCLP * (1 + margen));
      } else if (targetMoneda === "USD" || targetMoneda === "USDT") {
        montoLocalFinal = precioUSDConMargen;
      } else {
        const raw = precioUSDConMargen * tasaDivisa;
        montoLocalFinal = (targetMoneda === "COP" || targetMoneda === "ARS" || targetMoneda === "UYU")
          ? Math.round(raw)
          : Number(raw.toFixed(2));
      }

      return {
        baseCLP,
        valorDolar: currentRate,
        moneda: targetMoneda,
        simbolo: cfg.simbolo || "$",
        tasaDivisa,
        margenMetodo: margen,
        metodoPago: metodoPago || "desconocido",
        totalLocal: montoLocalFinal,
        totalUSD: precioUSDConMargen,
        cryptoUSDT: precioUSDConMargen,
        validoMinutos: 15,
        createdAt: new Date().toISOString()
      };
    };

    // Formatear un precio CLP para mostrar en la moneda actual
    const formatearPrecio = (precioCLP, monedaTarget = null, metodoPago = null) => {
      const targetMoneda = (monedaTarget || moneda || "CLP").toUpperCase();
      const cfg = activePaisesList.find(p => p.moneda === targetMoneda) || infoPais;
      const convertido = convertirDesdeCLP(precioCLP, targetMoneda, metodoPago);

      if (convertido === null || convertido === undefined || isNaN(convertido)) {
        if (targetMoneda === "CLP") {
          const cerrado = Math.round(Number(precioCLP || 0));
          return `$${cerrado.toLocaleString("es-CL")}`;
        }
        return cargandoTasas ? "..." : "-";
      }

      // 1. Chile (CLP): Sin redondeos ficticios a múltiplos de 500, número entero exacto original
      if (targetMoneda === "CLP") {
        const cerrado = Math.round(convertido);
        return `${cfg.simbolo}${cerrado.toLocaleString("es-CL")}`;
      }

      // 2. Argentina (ARS) y Colombia (COP): Pesos enteros
      if (targetMoneda === "ARS" || targetMoneda === "COP") {
        const step = targetMoneda === "COP" ? 500 : 100;
        const cerrado = Math.round(convertido / step) * step;
        return `${cfg.simbolo}${cerrado.toLocaleString("es-CL")}`;
      }

      // 3. Uruguay (UYU): Redondeo a 10
      if (targetMoneda === "UYU") {
        const cerrado = Math.round(convertido / 10) * 10;
        return `${cfg.simbolo}${cerrado.toLocaleString("es-CL")}`;
      }

      // 4. Dólar (USD / USDT): Para revendedores muestra USDT, para clientes $
      if (targetMoneda === "USD" || targetMoneda === "USDT") {
        const u = roundUpUSD(convertido);
        return isReseller
          ? `${u.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
          : `$${u.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }

      // 5. Soles (PEN), Pesos Mexicanos (MXN): 2 decimales
      if (cfg.decimales === 2 || targetMoneda === "PEN" || targetMoneda === "MXN") {
        const formatted = Number(convertido).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `${cfg.simbolo}${formatted}`;
      }

      const cerrado = Math.round(convertido);
      return `${cfg.simbolo}${cerrado.toLocaleString("es-CL")}`;
    };

    return (
      <MonedaContext.Provider
        value={{
          moneda,
          setMoneda,
          pais,
          setPais,
          infoPais,
          tasas,
          margenesMetodos,
          cargandoTasas,
          convertirDesdeCLP,
          obtenerCotizacion,
          formatearPrecio,
          PAISES_CONFIG: activePaisesList,
          isReseller: Boolean(isReseller),
          valorDolar,
          actualizarValorDolar,
          actualizarTasasMonedas,
          actualizarMargenesMetodos,
        }}
      >
        {children}
      </MonedaContext.Provider>
    );
}

export function useMoneda() {
  return useContext(MonedaContext);
}
