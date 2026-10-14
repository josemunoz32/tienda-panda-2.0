import { notifyNewResellerApplication } from "../../utils/telegramNotifications";
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, googleProvider, db } from "../../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import {
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Sparkles,
  MessageCircle,
  BriefcaseBusiness,
} from "lucide-react";
import "./IniciarSesion.css";
import logo from "../../assets/logos/miicono.png";
import wspLogo from "../../assets/logos/logowsp.png";

// ── Password Strength Calculator ─────────────────────────────────────────────
function calculateStrength(pwd) {
  let score = 0;
  if (!pwd) return { score: 0, label: "", color: "#ef4444", pct: 0 };
  if (pwd.length >= 6) score++;
  if (pwd.length >= 8 && /[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { score: 1, label: "Débil", color: "#f87171", pct: 25 };
  if (score === 2) return { score: 2, label: "Aceptable", color: "#fbbf24", pct: 50 };
  if (score === 3) return { score: 3, label: "Buena", color: "#34d399", pct: 75 };
  return { score: 4, label: "Excelente", color: "#818cf8", pct: 100 };
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.51h3.15c1.84-1.69 2.9-4.18 2.9-7.28Z" />
      <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.35l-3.15-2.51c-.87.58-1.99.92-3.3.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.59A9.75 9.75 0 0 0 12 21.75Z" />
      <path fill="#FBBC05" d="M6.53 13.78A5.86 5.86 0 0 1 6.22 12c0-.62.11-1.22.31-1.78V7.63H3.28A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06 1.03 4.37l3.25-2.59Z" />
      <path fill="#EA4335" d="M12 6.19c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.28 14.62 2.25 12 2.25a9.75 9.75 0 0 0-8.72 5.38l3.25 2.59C7.3 7.91 9.46 6.19 12 6.19Z" />
    </svg>
  );
}

export default function IniciarSesion({ initialTab = "login" }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Detect tab from props, query params (?mode=registro), or pathname
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname === "/registro") return "register";
    const params = new URLSearchParams(location.search);
    if (params.get("mode") === "registro") return "register";
    return initialTab;
  });

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regForm, setRegForm] = useState({
    displayName: "",
    email: "",
    password: "",
    repeatPassword: "",
    phoneNumber: "",
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegRepeatPassword, setShowRegRepeatPassword] = useState(false);

  // Common state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Forgot password modal
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState("");
  // Reseller modal
  const [resellerModalOpen, setResellerModalOpen] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("mode") === "revendedor" || params.get("revendedor") === "true" || params.get("revendedor") === "1";
  });
  const [resellerForm, setResellerForm] = useState({
    email: "",
    password: "",
    whatsapp: ""
  });
  const [resellerLoading, setResellerLoading] = useState(false);
  const [resellerSuccess, setResellerSuccess] = useState(false);
  const [resellerError, setResellerError] = useState("");

  const saveResellerApplication = async (applicantUser, whatsapp) => {
    const applicantUid = applicantUser.uid;
    const email = applicantUser.email || resellerForm.email.trim();
    const userRef = doc(db, "users", applicantUid);
    const requestRef = doc(db, "solicitudes_revendedores", applicantUid);
    const existingRequest = await getDoc(requestRef);

    // La cuenta nace como cliente. Este flujo jamás concede capacidades B2B.
    const userSnapshot = await getDoc(userRef);
    if (!userSnapshot.exists()) {
      await setDoc(userRef, {
        email,
        displayName: applicantUser.displayName || email.split("@")[0],
        photoURL: applicantUser.photoURL || "",
        phoneNumber: whatsapp,
        role: "user",
        resellerStatus: "pendiente",
        pandaPoints: 50,
        createdAt: Date.now()
      });
    }

    // Un documento por UID evita solicitudes duplicadas y spam desde la UI.
    if (!existingRequest.exists()) {
      await setDoc(requestRef, {
        userId: applicantUid,
        email,
        whatsapp,
        nombre: applicantUser.displayName || email.split("@")[0],
        estado: "pendiente",
        authMethod: applicantUser.providerData?.some((provider) => provider.providerId === "google.com") ? "google" : "password",
        fecha: new Date().toISOString()
      });

      // Notificar al bot de Telegram del administrador
      notifyNewResellerApplication({
        nombre: applicantUser.displayName || email.split("@")[0],
        email,
        whatsapp
      }).catch((err) => console.error("Error enviando alerta telegram revendedor:", err));
    }

    setResellerForm((current) => ({ ...current, email, whatsapp }));
  };

  const handleResellerSubmit = async (e) => {
    e.preventDefault();
    setResellerLoading(true);
    setResellerError("");

    const email = (resellerForm.email || "").trim();
    const password = (resellerForm.password || "").trim();
    const whatsapp = (resellerForm.whatsapp || "").trim();

    if (!email || !password || !whatsapp) {
      setResellerError("Por favor completa tu correo, contraseña y WhatsApp.");
      setResellerLoading(false);
      return;
    }

    if (password.length < 6) {
      setResellerError("La contraseña debe tener al menos 6 caracteres.");
      setResellerLoading(false);
      return;
    }

    try {
      let applicantUid = null;
      let applicantUser = auth.currentUser;

      // Si no ha iniciado sesión, crear o autenticar la cuenta para que tenga login listo
      if (!applicantUser) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          applicantUser = userCredential.user;
          applicantUid = applicantUser.uid;

          const defaultName = email.split("@")[0];
          await updateProfile(applicantUser, { displayName: defaultName });

          await setDoc(doc(db, "users", applicantUid), {
            email,
            displayName: defaultName,
            phoneNumber: whatsapp,
            role: "user",
            resellerStatus: "pendiente",
            pandaPoints: 50,
            createdAt: Date.now()
          }, { merge: true });
        } catch (authErr) {
          if (authErr.code === "auth/email-already-in-use") {
            try {
              const cred = await signInWithEmailAndPassword(auth, email, password);
              applicantUser = cred.user;
              applicantUid = applicantUser.uid;
            } catch (loginErr) {
              setResellerError("Ya existe una cuenta con este correo. Ingresa tu contraseña actual para verificar y postular.");
              setResellerLoading(false);
              return;
            }
          } else {
            throw authErr;
          }
        }
      } else {
        applicantUid = applicantUser.uid;
      }

      await saveResellerApplication(applicantUser, whatsapp);

      setResellerSuccess(true);
    } catch (err) {
      setResellerError("Error al enviar postulación: " + (err.message || err));
    } finally {
      setResellerLoading(false);
    }
  };

  const handleResellerGoogleSubmit = async () => {
    const whatsapp = (resellerForm.whatsapp || "").trim();
    if (!whatsapp) {
      setResellerError("Ingresa tu WhatsApp antes de continuar con Google.");
      return;
    }

    setResellerLoading(true);
    setResellerError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await saveResellerApplication(result.user, whatsapp);
      setResellerSuccess(true);
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user") {
        setResellerError("El inicio de sesión con Google fue cancelado.");
      } else {
        setResellerError("No se pudo enviar tu postulación con Google. Intenta nuevamente.");
      }
    } finally {
      setResellerLoading(false);
    }
  };

  // Sync tab with pathname if path changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("mode") === "revendedor" || params.get("revendedor") === "true" || params.get("revendedor") === "1") {
      setResellerModalOpen(true);
    }
    if (location.pathname === "/registro") {
      setActiveTab("register");
    } else if (location.pathname === "/iniciar-sesion") {
      if (params.get("mode") === "registro") {
        setActiveTab("register");
      } else {
        setActiveTab("login");
      }
    }
    setError("");
    setSuccessMsg("");
  }, [location.pathname, location.search]);

  // Switch tab handler
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setError("");
    setSuccessMsg("");
  };

  // ── Login Submit ───────────────────────────────────────────────────────────
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!loginEmail || !loginPassword) {
      setError("Por favor completa tu correo y contraseña.");
      return;
    }

    setLoading(true);
    try {
      // Set persistence based on "Recordarme"
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      setSuccessMsg("¡Bienvenido a PandaStore! Redirigiendo...");
      setTimeout(() => navigate("/home"), 600);
    } catch (err) {
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Correo o contraseña incorrectos. Verifica tus datos.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Demasiados intentos fallidos. Por seguridad, espera unos minutos o restablece tu contraseña.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Error de conexión. Verifica tu conexión a internet.");
      } else if (err.code === "auth/invalid-email") {
        setError("El formato del correo electrónico no es válido.");
      } else {
        setError("No se pudo iniciar sesión. Intenta de nuevo o contacta soporte.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Register Submit ────────────────────────────────────────────────────────
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const { displayName, email, password, repeatPassword, phoneNumber } = regForm;

    if (!email || !password || !repeatPassword) {
      setError("Por favor ingresa tu correo y contraseña.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("El correo electrónico no tiene un formato válido.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== repeatPassword) {
      setError("Las contraseñas no coinciden. Verifícalas.");
      return;
    }

    const cleanPhone = (phoneNumber || "").replace(/[^0-9]/g, "").trim();
    const finalDisplayName = (displayName || "").trim() || email.trim().split("@")[0];

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(userCredential.user, {
        displayName: finalDisplayName,
      });

      await setDoc(
        doc(db, "users", userCredential.user.uid),
        {
          phoneNumber: cleanPhone,
          displayName: finalDisplayName,
          email: email.trim(),
          photoURL: userCredential.user.photoURL || "",
          role: "user",
          pandaPoints: 50, // Welcome reward bonus
          createdAt: Date.now(),
        },
        { merge: true }
      );

      setSuccessMsg("¡Cuenta creada con éxito! Bienvenido a PandaStore.");
      setTimeout(() => navigate("/home"), 1000);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Ya existe una cuenta con este correo. Puedes iniciar sesión directamente.");
      } else if (err.code === "auth/weak-password") {
        setError("La contraseña es muy débil. Usa letras y números.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Error de conexión a internet. Intenta nuevamente.");
      } else {
        setError("Error al registrarse. Intenta de nuevo o contacta soporte.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Google One-Click Auth ──────────────────────────────────────────────────
  const handleGoogleAuth = async () => {
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      let role = "user";
      let pandaPoints = 50;

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        if (data.role) role = data.role;
        if (typeof data.pandaPoints === "number") pandaPoints = data.pandaPoints;
      }

      await setDoc(
        userDocRef,
        {
          email: user.email || "",
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
          phoneNumber: user.phoneNumber || (userDocSnap.exists() ? userDocSnap.data().phoneNumber : "") || "",
          role,
          pandaPoints,
          lastLogin: Date.now(),
        },
        { merge: true }
      );

      setSuccessMsg("¡Conectado con Google! Ingresando...");
      setTimeout(() => navigate("/home"), 600);
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user") {
        setError("El inicio de sesión con Google fue cancelado.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Error de conexión. Verifica tu internet.");
      } else if (err.code === "auth/account-exists-with-different-credential") {
        setError("Ya existe una cuenta con este correo pero con otro método. Usa tu contraseña habitual.");
      } else {
        setError("No se pudo conectar con Google. Intenta nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password Submit ─────────────────────────────────────────────────
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError("");
    if (!forgotEmail) {
      setForgotError("Ingresa tu correo electrónico.");
      return;
    }
    setForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setForgotSuccess(true);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setForgotError("No encontramos una cuenta con ese correo.");
      } else if (err.code === "auth/invalid-email") {
        setForgotError("El correo electrónico no es válido.");
      } else {
        setForgotError("No pudimos enviar el correo de recuperación. Intenta más tarde.");
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const strength = calculateStrength(regForm.password);

  return (
    <div className="auth1-page-wrapper">
      {/* Ambient background glows */}
      <div className="auth1-ambient-glow auth1-glow-1" />
      <div className="auth1-ambient-glow auth1-glow-2" />
      <div className="auth1-ambient-glow auth1-glow-3" />

      {/* Centered Sign-In Card (Authentication 1 Block) */}
      <div className="auth1-card">
        {/* Header with Logo */}
        <div className="auth1-header">
          <div className="auth1-logo-badge">
            <img src={logo} alt="PandaStore" className="auth1-logo-img" />
          </div>
          <h2 className="auth1-title">
            {activeTab === "login" ? (
              <>Bienvenido a <span>PandaStore</span></>
            ) : (
              <>Crea tu <span>Cuenta Gamer</span></>
            )}
          </h2>
          <p className="auth1-subtitle">
            {activeTab === "login"
              ? "Ingresa a tu cuenta para gestionar tus juegos, claves y pedidos."
              : "Únete gratis y obtén 50 Panda Points de bienvenida."}
          </p>
        </div>

        {/* Connected Tabs (Iniciar Sesión <-> Registrarse) */}
        <div className="auth1-tabs">
          <button
            type="button"
            className={`auth1-tab-btn ${activeTab === "login" ? "active" : ""}`}
            onClick={() => handleTabSwitch("login")}
          >
            <LogIn size={16} />
            <span>Iniciar Sesión</span>
          </button>
          <button
            type="button"
            className={`auth1-tab-btn ${activeTab === "register" ? "active" : ""}`}
            onClick={() => handleTabSwitch("register")}
          >
            <UserPlus size={16} />
            <span>Crear Cuenta</span>
          </button>
        </div>

        {/* Google 1-Click Social Provider Button */}
        <button
          type="button"
          className="auth1-google-btn"
          onClick={handleGoogleAuth}
          disabled={loading}
          title="Conectar con Google"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <g>
              <circle fill="#fff" cx="24" cy="24" r="24" />
              <path fill="#4285F4" d="M34.6 24.2c0-.7-.1-1.4-.2-2H24v4.1h6c-.3 1.5-1.3 2.7-2.7 3.5v2.9h4.4c2.6-2.4 4.1-5.9 4.1-10.5z" />
              <path fill="#34A853" d="M24 36c3.2 0 5.8-1.1 7.7-2.9l-4.4-2.9c-1.2.8-2.7 1.3-4.3 1.3-3.3 0-6-2.2-7-5.1h-4.5v3.1C13.8 33.7 18.5 36 24 36z" />
              <path fill="#FBBC05" d="M17 26.4c-.2-.7-.3-1.4-.3-2.4s.1-1.7.3-2.4v-3.1h-4.5C11.5 20.3 11 22.1 11 24s.5 3.7 1.5 5.5l4.5-3.1z" />
              <path fill="#EA4335" d="M24 18.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C29.8 15.1 27.2 14 24 14c-5.5 0-10.2 2.3-12.5 5.6l4.5 3.1c1-2.9 3.7-5.1 7-5.1z" />
            </g>
          </svg>
          <span>{activeTab === "login" ? "Continuar con Google" : "Registrarse con Google"}</span>
        </button>

        {/* Divider */}
        <div className="auth1-divider">
          <span>o con correo electrónico</span>
        </div>

        {/* ── TAB 1: INICIAR SESIÓN ── */}
        {activeTab === "login" && (
          <form className="auth1-form" onSubmit={handleLoginSubmit}>
            <div className="auth1-field">
              <label className="auth1-label">
                <Mail size={13} /> Correo Electrónico
              </label>
              <div className="auth1-input-wrapper">
                <span className="auth1-input-icon"><Mail size={17} /></span>
                <input
                  type="email"
                  className="auth1-input"
                  placeholder="ejemplo@correo.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  autoComplete="username"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="auth1-field">
              <label className="auth1-label">
                <Lock size={13} /> Contraseña
              </label>
              <div className="auth1-input-wrapper">
                <span className="auth1-input-icon"><Lock size={17} /></span>
                <input
                  type={showLoginPassword ? "text" : "password"}
                  className="auth1-input"
                  placeholder="Ingresa tu contraseña"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
                {/* Password Reveal Button */}
                <button
                  type="button"
                  className="auth1-reveal-btn"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  title={showLoginPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  tabIndex={-1}
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Keep me signed in & Forgot Password */}
            <div className="auth1-options-row">
              <label className="auth1-checkbox-label">
                <input
                  type="checkbox"
                  className="auth1-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Recordarme en este equipo</span>
              </label>

              <button
                type="button"
                className="auth1-forgot-link"
                onClick={() => {
                  setForgotEmail(loginEmail);
                  setForgotSuccess(false);
                  setForgotError("");
                  setForgotModalOpen(true);
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Error / Success messages */}
            {error && (
              <div className="auth1-error-alert">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="auth1-success-alert">
                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit CTA */}
            <button type="submit" className="auth1-submit-btn" disabled={loading}>
              <LogIn size={18} />
              <span>{loading ? "Iniciando sesión..." : "Iniciar Sesión"}</span>
            </button>
          </form>
        )}

        {/* ── TAB 2: REGISTRO ── */}
        {activeTab === "register" && (
          <form className="auth1-form" onSubmit={handleRegisterSubmit}>
            <div className="auth1-field">
              <label className="auth1-label">
                <User size={13} /> Tu Nombre o Alias
              </label>
              <div className="auth1-input-wrapper">
                <span className="auth1-input-icon"><User size={17} /></span>
                <input
                  type="text"
                  className="auth1-input"
                  placeholder="Ej. Matías C. o PandaGamer"
                  value={regForm.displayName}
                  onChange={(e) => setRegForm({ ...regForm, displayName: e.target.value })}
                  autoComplete="name"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="auth1-field">
              <label className="auth1-label">
                <Mail size={13} /> Correo Electrónico
              </label>
              <div className="auth1-input-wrapper">
                <span className="auth1-input-icon"><Mail size={17} /></span>
                <input
                  type="email"
                  className="auth1-input"
                  placeholder="tu@correo.com"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  autoComplete="email"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Teléfono */}
            <div className="auth1-field">
              <label className="auth1-label">
                <Phone size={13} /> WhatsApp o Teléfono <span style={{ opacity: 0.6, fontSize: 11 }}>(Opcional)</span>
              </label>
              <div className="auth1-phone-group">
                <div className="auth1-phone-prefix">
                  <span>🇨🇱</span> +56
                </div>
                <input
                  type="tel"
                  className="auth1-input auth1-phone-input"
                  placeholder="9 1234 5678"
                  value={regForm.phoneNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setRegForm({ ...regForm, phoneNumber: val });
                  }}
                  autoComplete="tel"
                  disabled={loading}
                  maxLength={12}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="auth1-field">
              <label className="auth1-label">
                <Lock size={13} /> Contraseña
              </label>
              <div className="auth1-input-wrapper">
                <span className="auth1-input-icon"><Lock size={17} /></span>
                <input
                  type={showRegPassword ? "text" : "password"}
                  className="auth1-input"
                  placeholder="Mínimo 6 caracteres"
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="auth1-reveal-btn"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  title={showRegPassword ? "Ocultar" : "Mostrar"}
                  tabIndex={-1}
                >
                  {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password strength meter */}
              {regForm.password && (
                <div className="auth1-strength-wrap">
                  <div className="auth1-strength-bar-bg">
                    <div
                      className="auth1-strength-bar-fill"
                      style={{
                        width: `${strength.pct}%`,
                        background: strength.color,
                      }}
                    />
                  </div>
                  <div className="auth1-strength-label" style={{ color: strength.color }}>
                    <span>Seguridad de contraseña:</span>
                    <span>{strength.label}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Repetir Contraseña */}
            <div className="auth1-field">
              <label className="auth1-label">
                <Lock size={13} /> Repetir Contraseña
              </label>
              <div className="auth1-input-wrapper">
                <span className="auth1-input-icon"><Lock size={17} /></span>
                <input
                  type={showRegRepeatPassword ? "text" : "password"}
                  className="auth1-input"
                  placeholder="Confirma tu contraseña"
                  value={regForm.repeatPassword}
                  onChange={(e) => setRegForm({ ...regForm, repeatPassword: e.target.value })}
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="auth1-reveal-btn"
                  onClick={() => setShowRegRepeatPassword(!showRegRepeatPassword)}
                  title={showRegRepeatPassword ? "Ocultar" : "Mostrar"}
                  tabIndex={-1}
                >
                  {showRegRepeatPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error / Success messages */}
            {error && (
              <div className="auth1-error-alert">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="auth1-success-alert">
                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit CTA */}
            <button type="submit" className="auth1-submit-btn" disabled={loading}>
              <UserPlus size={18} />
              <span>{loading ? "Creando cuenta..." : "Crear mi Cuenta Gratis"}</span>
            </button>
          </form>
        )}

        {/* ── B2B RESELLER BANNER (INTEGRADO EN LA TARJETA) ── */}
        <div className="auth1-reseller-integrated">
          <div className="auth1-reseller-header">
            <span className="auth1-reseller-icon"><BriefcaseBusiness size={19} strokeWidth={2.2} /></span>
            <div className="auth1-reseller-titles">
              <span className="auth1-reseller-badge">¿Quieres emprender o vender juegos?</span>
              <p className="auth1-reseller-sub">
                Obtén increíbles precios para emprender y vender juegos, con acceso a nuestra Billetera Virtual B2B.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="auth1-reseller-btn"
            onClick={() => {
              setResellerSuccess(false);
              setResellerError("");
              setResellerModalOpen(true);
            }}
          >
            Postular como Revendedor Oficial
          </button>
        </div>
      </div>

      {/* ── RESELLER APPLICATION MODAL ─────────────────────────────────── */}
      {resellerModalOpen && (
        <div className="auth1-modal-overlay" onClick={() => setResellerModalOpen(false)}>
          <div className="auth1-modal-card" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="auth1-modal-close"
              onClick={() => setResellerModalOpen(false)}
            >
              <X size={18} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(168, 85, 247, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#c084fc",
                fontSize: "1.2rem"
              }}>
                <BriefcaseBusiness size={21} strokeWidth={2.2} />
              </div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#fff" }}>
                Postular como Revendedor
              </h3>
            </div>

            <p style={{ margin: "0 0 16px", fontSize: "0.85rem", color: "#c4b5fd", lineHeight: 1.45 }}>
              Crea o vincula tu cuenta de acceso mayorista B2B en PandaStore.
            </p>

            {resellerSuccess ? (
              <div style={{
                background: "linear-gradient(145deg, rgba(16, 24, 39, 0.95) 0%, rgba(13, 148, 136, 0.12) 100%)",
                border: "1.5px solid rgba(16, 185, 129, 0.45)",
                borderRadius: 18,
                padding: "24px 20px",
                textAlign: "center",
                boxShadow: "0 12px 36px rgba(0, 0, 0, 0.5), 0 0 20px rgba(16, 185, 129, 0.15)",
                backdropFilter: "blur(12px)",
              }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.4)",
                  borderRadius: 999,
                  padding: "4px 14px",
                  color: "#34d399",
                  fontSize: "0.76rem",
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  marginBottom: 14
                }}>
                  <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399" }} />
                  Solicitud Guardada · Espera tu Validación
                </div>

                <div style={{
                  width: 54,
                  height: 54,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.35) 100%)",
                  border: "1.5px solid rgba(52, 211, 153, 0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                  boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)"
                }}>
                  <CheckCircle2 size={30} color="#34d399" />
                </div>

                <h4 style={{ margin: "0 0 8px", color: "#fff", fontSize: "1.2rem", fontWeight: 900, letterSpacing: "-0.01em" }}>
                  ¡Gracias por postular como revendedor!
                </h4>
                <p style={{ margin: "0 0 18px", color: "#cbd5e1", fontSize: "0.88rem", lineHeight: 1.5 }}>
                  Tu solicitud quedó en la lista de revisión. Mientras un administrador la valida, tu cuenta seguirá funcionando como cliente y podrás navegar y comprar normalmente. Al aprobarse, verás automáticamente los precios y beneficios de revendedor.
                </p>

                {/* BOTÓN WHATSAPP OFICIAL CON LOGO REAL ULTRA-REFINADO */}
                <a
                  href={`https://wa.me/56974751810?text=${encodeURIComponent(
                    `Hola PandaStore! 👋 Acabo de postular como Revendedor Oficial B2B con mi cuenta PandaStore.\n\n📧 Correo: ${resellerForm.email}\n📱 WhatsApp: ${resellerForm.whatsapp}\n\n¿Podrías revisar mi postulación para activar mi rol mayorista? ¡Muchas gracias!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="reseller-wsp-banner-btn"
                  style={{
                    background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                    color: "#fff",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 14,
                    padding: "12px 18px",
                    borderRadius: 16,
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    boxShadow: "0 8px 26px rgba(37, 211, 102, 0.45), inset 0 1px 0 rgba(255,255,255,0.3)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    marginBottom: 12,
                    width: "100%",
                    boxSizing: "border-box",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "rgba(255, 255, 255, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                    }}>
                      <img
                        src={wspLogo}
                        alt="WhatsApp Oficial"
                        style={{
                          width: 32,
                          height: 32,
                          objectFit: "contain",
                          display: "block",
                          filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.3))"
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <span style={{ fontSize: "0.94rem", fontWeight: 900, color: "#fff", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        Avisar al Admin por WhatsApp
                      </span>
                      <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "rgba(255, 255, 255, 0.95)", marginTop: 2 }}>
                        Aprobación inmediata · +56 9 7475 1810
                      </span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: "1.1rem",
                    color: "#fff",
                    fontWeight: 900,
                    background: "rgba(0,0,0,0.18)",
                    borderRadius: "50%",
                    width: 28,
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    →
                  </span>
                </a>

                {/* BOTÓN CONTINUAR A LA TIENDA */}
                <button
                  type="button"
                  onClick={() => {
                    setResellerModalOpen(false);
                    navigate("/home", { state: { resellerNotice: true } });
                  }}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.16)",
                    color: "#e2e8f0",
                    borderRadius: 12,
                    padding: "11px 16px",
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    width: "100%",
                    marginTop: 4,
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)"; }}
                >
                  Continuar al Inicio (Home)
                </button>
              </div>
            ) : (
              <form onSubmit={handleResellerSubmit}>
                <div className="auth1-field">
                  <label className="auth1-label">Correo Electrónico *</label>
                  <input
                    type="email"
                    className="auth1-input"
                    placeholder="correo@ejemplo.com"
                    value={resellerForm.email}
                    onChange={(e) => setResellerForm({ ...resellerForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="auth1-field" style={{ marginTop: 10 }}>
                  <label className="auth1-label">Contraseña de Acceso *</label>
                  <input
                    type="password"
                    className="auth1-input"
                    placeholder="Crea tu contraseña (mín. 6 caracteres)"
                    value={resellerForm.password}
                    onChange={(e) => setResellerForm({ ...resellerForm, password: e.target.value })}
                    required
                  />
                </div>

                <div className="auth1-field" style={{ marginTop: 10 }}>
                  <label className="auth1-label">WhatsApp de Contacto *</label>
                  <input
                    type="text"
                    className="auth1-input"
                    placeholder="+56 9 1234 5678"
                    value={resellerForm.whatsapp}
                    onChange={(e) => setResellerForm({ ...resellerForm, whatsapp: e.target.value })}
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={handleResellerGoogleSubmit}
                  disabled={resellerLoading}
                  className="auth1-submit-btn"
                  style={{ marginTop: 12, background: "#fff", color: "#1f2937", border: "1px solid #d1d5db", boxShadow: "0 2px 8px rgba(0,0,0,.16)" }}
                >
                  <GoogleLogo />
                  <span>{resellerLoading ? "Conectando..." : "Continuar con Google"}</span>
                </button>

                <p style={{ margin: "9px 0 0", color: "#a78bfa", fontSize: "0.74rem", textAlign: "center" }}>
                  Google sólo inicia tu cuenta: la aprobación como revendedor siempre la realiza PandaStore.
                </p>

                {resellerError && (
                  <div className="auth1-error-alert" style={{ marginTop: 10 }}>
                    <AlertCircle size={16} />
                    <span>{resellerError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="auth1-submit-btn"
                  disabled={resellerLoading}
                  style={{ marginTop: 16 }}
                >
                  <span>{resellerLoading ? "Enviando solicitud..." : "Enviar solicitud"}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      {forgotModalOpen && (
        <div className="auth1-modal-overlay" onClick={() => setForgotModalOpen(false)}>
          <div className="auth1-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="auth1-modal-close"
              onClick={() => setForgotModalOpen(false)}
            >
              <X size={18} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(162, 89, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#c084fc",
              }}>
                <KeyRound size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#fff" }}>
                Restablecer Contraseña
              </h3>
            </div>

            <p style={{ margin: "0 0 18px", fontSize: "0.85rem", color: "#c4b5fd", lineHeight: 1.45 }}>
              Ingresa el correo asociado a tu cuenta PandaStore. Te enviaremos un enlace seguro para crear una nueva clave.
            </p>

            {forgotSuccess ? (
              <div style={{
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                padding: "16px",
                borderRadius: 12,
                textAlign: "center",
              }}>
                <CheckCircle2 size={36} color="#34d399" style={{ margin: "0 auto 8px" }} />
                <h4 style={{ margin: "0 0 4px", color: "#fff", fontSize: "0.98rem", fontWeight: 800 }}>
                  ¡Correo enviado con éxito!
                </h4>
                <p style={{ margin: 0, color: "#a7f3d0", fontSize: "0.82rem" }}>
                  Revisa tu bandeja de entrada o spam en <strong>{forgotEmail}</strong> y sigue las instrucciones.
                </p>
                <button
                  type="button"
                  className="auth1-submit-btn"
                  onClick={() => setForgotModalOpen(false)}
                  style={{ marginTop: 14 }}
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit}>
                <div className="auth1-field">
                  <label className="auth1-label"><Mail size={13} /> Tu Correo Electrónico</label>
                  <div className="auth1-input-wrapper">
                    <span className="auth1-input-icon"><Mail size={17} /></span>
                    <input
                      type="email"
                      className="auth1-input"
                      placeholder="ejemplo@correo.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      disabled={forgotLoading}
                    />
                  </div>
                </div>

                {forgotError && (
                  <div className="auth1-error-alert" style={{ marginTop: 10 }}>
                    <AlertCircle size={16} />
                    <span>{forgotError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="auth1-submit-btn"
                  disabled={forgotLoading}
                  style={{ marginTop: 16 }}
                >
                  <Mail size={16} />
                  <span>{forgotLoading ? "Enviando..." : "Enviar enlace de restablecimiento"}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
