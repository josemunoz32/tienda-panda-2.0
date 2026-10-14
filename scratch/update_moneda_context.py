with open('src/context/MonedaContext.js', 'r', encoding='utf-8') as f:
    content = f.read().replace('\r\n', '\n')

old_code = '''  // Obtener tasas desde API gratuita (CDN, sin clave)
  const fetchTasas = async () => {
    setCargandoTasas(true);
    try {
      const res = await fetch(
        "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/clp.json"
      );
      if (!res.ok) throw new Error("Primary API failed");
      const data = await res.json();
      const rates = data.clp;
      setTasas(rates);
      localStorage.setItem("tasasCambio", JSON.stringify({ rates, timestamp: Date.now() }));
    } catch {
      try {
        const res2 = await fetch(
          "https://latest.currency-api.pages.dev/v1/currencies/clp.json"
        );
        const data2 = await res2.json();
        const rates = data2.clp;
        setTasas(rates);
        localStorage.setItem("tasasCambio", JSON.stringify({ rates, timestamp: Date.now() }));
      } catch (e) {
        console.warn("No se pudo obtener tasas de cambio:", e);
      }
    } finally {
      setCargandoTasas(false);
    }
  };

  useEffect(() => {
    // Solo fetch si el cache está vencido o no existe
    try {
      const cached = localStorage.getItem("tasasCambio");
      if (cached) {
        const { timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 3600000) return;
      }
    } catch {}
    fetchTasas();
    // eslint-disable-next-line
  }, []);

  // Dólar fijo centralizado (por defecto $900 CLP)
  const [valorDolar, setValorDolar] = useState(() => {
    try {
      const cached = localStorage.getItem("dolarFijoPanda");
      if (cached && !isNaN(cached)) return Number(cached);
    } catch {}
    return 900;
  });

  // Sincronizar valor del dólar desde Firestore en tiempo real
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "general"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.valorDolar && Number(d.valorDolar) > 0) {
          const val = Number(d.valorDolar);
          setValorDolar(val);
          try { localStorage.setItem("dolarFijoPanda", String(val)); } catch {}
        }
      }
    }, (err) => {
      console.warn("Error leyendo config/general:", err);
    });
    return () => unsub();
  }, []);

  // Función para que el admin actualice el valor del dólar globalmente
  const actualizarValorDolar = async (nuevoValor) => {
    const num = Number(nuevoValor);
    if (!num || num <= 0) return;
    setValorDolar(num);
    try { localStorage.setItem("dolarFijoPanda", String(num)); } catch {}
    await setDoc(doc(db, "config", "general"), { valorDolar: num }, { merge: true });
  };

  // Tasas de respaldo base CLP por seguridad financiera si falla la red
  const DEFAULT_RATES = {
    clp: 1,
    usd: 1 / (valorDolar || 900),
    pen: 0.00395,
    ars: 1.15,
    uyu: 0.043,
    cop: 4.35,
    mxn: 0.021
  };

  // Convertir un precio CLP a la moneda actual
  const convertirDesdeCLP = (precioCLP) => {
    if (precioCLP === null || precioCLP === undefined || isNaN(precioCLP)) return null;
    const precio = Number(precioCLP);
    if (moneda === "CLP") return precio;
    if (moneda === "USD") return precio / (valorDolar || 900);
    const activeRates = tasas || DEFAULT_RATES;
    const tasa = activeRates[moneda.toLowerCase()] || DEFAULT_RATES[moneda.toLowerCase()];
    if (!tasa) return null;
    return precio * tasa;
  };'''

new_code = '''  // Dólar fijo centralizado (por defecto $900 CLP)
  const [valorDolar, setValorDolar] = useState(() => {
    try {
      const cached = localStorage.getItem("dolarFijoPanda");
      if (cached && !isNaN(cached)) return Number(cached);
    } catch {}
    return 900;
  });

  // Sincronizar valor del dólar desde Firestore en tiempo real con failsafe
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
        }
      }, (err) => {
        console.warn("Firestore config/general listener fallback:", err.message);
      });
    } catch (e) {
      console.warn("Failsafe config listener:", e);
    }
    return () => unsub();
  }, []);

  // Función para que el admin actualice el valor del dólar globalmente
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

  // Tasas oficiales de divisas internacionales calculadas estrictamente respecto a 1 USD
  // Si cambia el dólar en CLP, todas las monedas (COP, PEN, ARS, MXN, UYU) se recalculan automáticamente
  const DEFAULT_RATES_VS_USD = {
    usd: 1,
    pen: 3.75,    // Soles peruanos por 1 USD
    cop: 4150,    // Pesos colombianos por 1 USD
    ars: 1300,    // Pesos argentinos por 1 USD
    mxn: 19.5,    // Pesos mexicanos por 1 USD
    uyu: 40.5     // Pesos uruguayos por 1 USD
  };

  // Obtener tasas de cambio en vivo respecto a USD desde CDN global
  const fetchTasas = async () => {
    setCargandoTasas(true);
    try {
      const res = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json");
      if (!res.ok) throw new Error("Primary USD API failed");
      const data = await res.json();
      const rates = data.usd;
      setTasas(rates);
      localStorage.setItem("tasasCambioUSD", JSON.stringify({ rates, timestamp: Date.now() }));
    } catch {
      try {
        const res2 = await fetch("https://latest.currency-api.pages.dev/v1/currencies/usd.json");
        const data2 = await res2.json();
        const rates = data2.usd;
        setTasas(rates);
        localStorage.setItem("tasasCambioUSD", JSON.stringify({ rates, timestamp: Date.now() }));
      } catch (e) {
        console.warn("Usando tasas de respaldo vs USD:", e);
      }
    } finally {
      setCargandoTasas(false);
    }
  };

  useEffect(() => {
    try {
      const cached = localStorage.getItem("tasasCambioUSD");
      if (cached) {
        const { timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 3600000) return;
      }
    } catch {}
    fetchTasas();
    // eslint-disable-next-line
  }, []);

  // Convertir un precio CLP a la moneda actual directamente dependiente del DÓLAR
  const convertirDesdeCLP = (precioCLP) => {
    if (precioCLP === null || precioCLP === undefined || isNaN(precioCLP)) return null;
    const precio = Number(precioCLP);
    if (moneda === "CLP") return precio;

    // 1. Paso fundamental: Convertir CLP a USD con el dólar fijado
    const currentRate = valorDolar || 900;
    const precioEnUSD = precio / currentRate;
    if (moneda === "USD") return precioEnUSD;

    // 2. Paso dependiente: Convertir USD a la moneda internacional (COP, PEN, ARS, MXN, UYU)
    const activeRates = tasas || DEFAULT_RATES_VS_USD;
    const factorVsUsd = activeRates[moneda.toLowerCase()] || DEFAULT_RATES_VS_USD[moneda.toLowerCase()];
    if (!factorVsUsd) return precioEnUSD;

    return precioEnUSD * factorVsUsd;
  };'''

if old_code in content:
    content = content.replace(old_code, new_code, 1)
    with open('src/context/MonedaContext.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("MonedaContext.js updated with USD-anchored multi-currency conversion!")
else:
    print("Pattern not found in MonedaContext.js")
