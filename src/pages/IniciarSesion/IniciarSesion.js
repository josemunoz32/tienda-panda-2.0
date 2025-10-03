import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider } from "../../firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";
import "./IniciarSesion.css";
import logo from "../../assets/logos/miicono.png";

export default function IniciarSesion() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateFields = () => {
    if (!email || !password) {
      setError("Por favor, completa todos los campos.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("El correo electrónico no es válido.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validateFields()) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/home");
    } catch (err) {
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Credenciales inválidas. Verifica tu correo y contraseña.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Demasiados intentos fallidos. Restablece tu contraseña o espera unos minutos.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Error de red. Verifica tu conexión a internet.");
      } else if (err.code === "auth/invalid-email") {
        setError("El correo electrónico no es válido.");
      } else if (err.code === "auth/internal-error") {
        setError("Error interno del servidor. Intenta de nuevo más tarde.");
      } else if (err.code === "auth/invalid-credential") {
        setError("Credenciales inválidas. Verifica tu correo y contraseña.");
      } else {
        // Solo mostrar detalles técnicos en desarrollo, nunca en producción
        let devMsg = "";
        if (process.env.NODE_ENV === "development" && err.code) {
          devMsg = `\n[${err.code}] ${err.message}`;
        }
        setError(`Ocurrió un error inesperado. Intenta de nuevo o contacta soporte.${devMsg}`.trim());
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      // Siempre registrar/actualizar el usuario con role 'user' en Firestore
      await setDoc(
        doc(db, "users", user.uid),
        {
          email: user.email || "",
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
          phoneNumber: user.phoneNumber || "",
          role: "user" // Siempre forzar role user
        },
        { merge: true }
      );
      navigate("/home");
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user") {
        setError("El inicio de sesión con Google fue cancelado.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Error de red. Verifica tu conexión a internet.");
      } else if (err.code === "auth/account-exists-with-different-credential") {
        setError("Ya existe una cuenta con este correo pero con otro método de acceso. Usa el método correcto.");
      } else if (err.code === "auth/cancelled-popup-request") {
        setError("El proceso de inicio de sesión fue cancelado. Intenta nuevamente.");
      } else {
        setError("Error al iniciar sesión con Google. Intenta de nuevo o contacta soporte.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="iniciar-root">
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <img src={logo} alt="Logo Pandastore" style={{ width: 70, height: 70, borderRadius: "50%", boxShadow: "0 2px 12px #7c3aed55" }} />
      </div>
      <h2 className="iniciar-title">Iniciar Sesión</h2>
      <form className="iniciar-form" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={error && !email ? "input-error" : ""}
          autoComplete="username"
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={error && !password ? "input-error" : ""}
          autoComplete="current-password"
          disabled={loading}
        />
        <button className="iniciar-btn" type="submit" disabled={loading}>
          {loading ? "Ingresando..." : "Iniciar Sesión"}
        </button>
      </form>
      <button className="iniciar-google" onClick={handleGoogle} disabled={loading}>
        <span className="google-content">
          <svg width="22" height="22" viewBox="0 0 48 48">
            <g>
              <circle fill="#fff" cx="24" cy="24" r="24" />
              <path fill="#4285F4" d="M34.6 24.2c0-.7-.1-1.4-.2-2H24v4.1h6c-.3 1.5-1.3 2.7-2.7 3.5v2.9h4.4c2.6-2.4 4.1-5.9 4.1-10.5z" />
              <path fill="#34A853" d="M24 36c3.2 0 5.8-1.1 7.7-2.9l-4.4-2.9c-1.2.8-2.7 1.3-4.3 1.3-3.3 0-6-2.2-7-5.1h-4.5v3.1C13.8 33.7 18.5 36 24 36z" />
              <path fill="#FBBC05" d="M17 26.4c-.2-.7-.3-1.4-.3-2.4s.1-1.7.3-2.4v-3.1h-4.5C11.5 20.3 11 22.1 11 24s.5 3.7 1.5 5.5l4.5-3.1z" />
              <path fill="#EA4335" d="M24 18.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C29.8 15.1 27.2 14 24 14c-5.5 0-10.2 2.3-12.5 5.6l4.5 3.1c1-2.9 3.7-5.1 7-5.1z" />
            </g>
          </svg>
          <span>Iniciar con Google</span>
        </span>
      </button>
      {error && <div className="iniciar-error">{error}</div>}
      <div style={{ marginTop: 18, textAlign: 'center' }}>
        <span style={{ fontSize: 14, color: '#bdb6e6' }}>
          ¿No tienes cuenta?{' '}
          <span
            style={{ color: '#7c3aed', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
            onClick={() => navigate('/registro')}
          >
            Regístrate
          </span>
        </span>
      </div>
    </div>
  );
}
