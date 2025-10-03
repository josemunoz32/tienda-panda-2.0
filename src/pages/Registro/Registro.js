import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { GoogleAuthProvider } from "firebase/auth";
import "../IniciarSesion/IniciarSesion.css";
import logo from "../../assets/logos/miicono.png";

const googleProvider = new GoogleAuthProvider();

function PasswordStrengthMeter({ password }) {
  const getStrength = (pwd) => {
    let score = 0;
    if (!pwd) return 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };
  const strength = getStrength(password);
  const levels = [
    { label: "Débil", color: "#ff6b6b" },
    { label: "Aceptable", color: "#fbbf24" },
    { label: "Buena", color: "#34d399" },
    { label: "Fuerte", color: "#4f46e5" },
  ];
  return (
    <div style={{ width: "100%", maxWidth: 320, margin: "-10px auto 10px auto" }}>
      <div style={{ height: 8, borderRadius: 6, background: "#2d1846", marginBottom: 4, overflow: "hidden" }}>
        <div style={{
          width: `${(strength / 4) * 100}%`,
          height: "100%",
          background: levels[strength - 1]?.color || "#ff6b6b",
          transition: "width 0.3s"
        }} />
      </div>
      <div style={{ color: levels[strength - 1]?.color || "#ff6b6b", fontSize: 13, minHeight: 18, textAlign: "left", fontWeight: 600 }}>
        {password ? levels[strength - 1]?.label || "Débil" : ""}
      </div>
    </div>
  );
}

export default function Registro() {
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    repeatPassword: "",
    phoneNumber: "",
  });
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateFields = () => {
    if (!form.displayName || !form.email || !form.password || !form.repeatPassword || !form.phoneNumber) {
      setError("Por favor, completa todos los campos.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError("El correo electrónico no es válido.");
      return false;
    }
    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return false;
    }
    if (form.password !== form.repeatPassword) {
      setError("Las contraseñas no coinciden.");
      return false;
    }
    const phoneRegex = /^[0-9]{7,15}$/;
    if (!phoneRegex.test(form.phoneNumber)) {
      setError("El teléfono debe contener solo números (7-15 dígitos).");
      return false;
    }
    return true;
  };

  const handleChange = (e) => {
    // Prevent user from typing '+' in phoneNumber
    if (e.target.name === "phoneNumber") {
      let value = e.target.value.replace(/\+/g, "");
      setForm({ ...form, phoneNumber: value });
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
    setError("");
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!validateFields()) return;
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      await updateProfile(userCredential.user, {
        displayName: form.displayName,
      });
      await setDoc(
        doc(db, "users", userCredential.user.uid),
        {
          phoneNumber: form.phoneNumber,
          displayName: form.displayName,
          email: form.email,
          photoURL: userCredential.user.photoURL || "",
          role: "user"
        },
        { merge: true }
      );
      setSuccess(true);
      setForm({ displayName: "", email: "", password: "", repeatPassword: "", phoneNumber: "" });
  setTimeout(() => navigate("/home"), 1200);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Ya existe una cuenta con ese correo electrónico.");
      } else if (err.code === "auth/invalid-email") {
        setError("El correo electrónico no es válido.");
      } else if (err.code === "auth/weak-password") {
        setError("La contraseña es muy débil. Usa al menos 6 caracteres.");
      } else {
        setError("Ocurrió un error inesperado. Intenta de nuevo o contacta soporte.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      await setDoc(
        doc(db, "users", user.uid),
        {
          phoneNumber: user.phoneNumber || "",
          displayName: user.displayName || "",
          email: user.email || "",
          photoURL: user.photoURL || "",
          role: "user"
        },
        { merge: true }
      );
      setSuccess(true);
  setTimeout(() => navigate("/home"), 1200);
    } catch (err) {
      if (err.code === "auth/account-exists-with-different-credential") {
        setError("Ya existe una cuenta con este correo pero con otro método de acceso. Usa el método correcto.");
      } else if (err.code === "auth/popup-closed-by-user") {
        setError("El registro con Google fue cancelado.");
      } else {
        setError("Ocurrió un error inesperado. Intenta de nuevo o contacta soporte.");
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
      <h2 className="iniciar-title">Registro</h2>
      <form className="iniciar-form" onSubmit={handleSubmit}>
        <input
          name="displayName"
          placeholder="Nombre"
          value={form.displayName}
          onChange={handleChange}
          autoComplete="name"
          disabled={loading}
        />
        <input
          name="email"
          type="email"
          placeholder="Correo electrónico"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          disabled={loading}
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          value={form.password}
          onChange={handleChange}
          autoComplete="new-password"
          disabled={loading}
        />
        {/* Medidor de seguridad de contraseña */}
        <PasswordStrengthMeter password={form.password} />
        <input
          name="repeatPassword"
          type="password"
          placeholder="Repetir contraseña"
          value={form.repeatPassword}
          onChange={handleChange}
          autoComplete="new-password"
          disabled={loading}
        />
        <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
          <span style={{
            background: "#2d1846",
            color: "#a78bfa",
            borderRadius: "6px 0 0 6px",
            padding: "10px 12px",
            fontWeight: 600,
            border: "1px solid #4f46e5",
            borderRight: "none",
            fontSize: 15
          }}>+ </span>
          <input
            name="phoneNumber"
            placeholder="Teléfono"
            value={form.phoneNumber}
            onChange={handleChange}
            autoComplete="tel"
            disabled={loading}
            style={{
              borderRadius: "0 6px 6px 0",
              borderLeft: "none",
              border: "1px solid #4f46e5",
              paddingLeft: 10,
              width: "100%"
            }}
            type="tel"
            pattern="[0-9]{7,15}"
            inputMode="numeric"
            maxLength={15}
          />
        </div>
        <button className="iniciar-btn" type="submit" disabled={loading}>
          {loading ? "Registrando..." : "Registrarse"}
        </button>
      </form>
      <button className="iniciar-google" onClick={handleGoogleRegister} disabled={loading}>
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
          <span>Registrarse con Google</span>
        </span>
      </button>
      {error && <div className="iniciar-error">{error}</div>}
      {success && <div className="iniciar-success">¡Registro exitoso! Ya puedes iniciar sesión.</div>}
      <div style={{ marginTop: 18, textAlign: 'center' }}>
        <span style={{ fontSize: 14, color: '#bdb6e6' }}>
          ¿Ya tienes cuenta?{' '}
          <span
            style={{ color: '#7c3aed', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
            onClick={() => navigate('/iniciar-sesion')}
          >
            Inicia sesión
          </span>
        </span>
      </div>
    </div>
  );
}
