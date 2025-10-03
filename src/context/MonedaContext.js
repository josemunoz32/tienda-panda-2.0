import React, { createContext, useContext, useState, useEffect } from "react";

const MonedaContext = createContext();

export function MonedaProvider({ children }) {
  const [moneda, setMonedaState] = useState(() => {
    // Leer moneda guardada en localStorage o default a CLP
    return localStorage.getItem("moneda") || "CLP";
  });

  // Guardar en localStorage cada vez que cambie
  useEffect(() => {
    localStorage.setItem("moneda", moneda);
  }, [moneda]);

  // Setter que actualiza estado y localStorage
  const setMoneda = (val) => {
    setMonedaState(val);
    localStorage.setItem("moneda", val);
  };

  return (
    <MonedaContext.Provider value={{ moneda, setMoneda }}>
      {children}
    </MonedaContext.Provider>
  );
}

export function useMoneda() {
  return useContext(MonedaContext);
}
