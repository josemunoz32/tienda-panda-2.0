import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import EditarPerfil from "./EditarPerfil";
import './Perfil.css';

export default function Perfil() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    const fetchProfileData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const firestoreData = userDoc.exists() ? userDoc.data() : {};
        setProfile({
          displayName: user.displayName || 'No disponible',
          email: user.email,
          phoneNumber: firestoreData.phoneNumber || user.phoneNumber || 'No disponible',
          photoURL: user.photoURL || '',
        });
      } catch (err) {
        console.error("Error al cargar el perfil:", err);
        setProfile({
          displayName: 'Error',
          email: 'Error',
          phoneNumber: 'Error',
          photoURL: '',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  const handleUpdate = (updated) => {
    setProfile((prev) => ({
      ...prev,
      ...updated,
    }));
  };

  if (isLoading) {
    return (
      <div className="perfil-container" style={{
        minHeight: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#a084e8",
        fontWeight: 600,
        fontSize: 22
      }}>
        Cargando perfil...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="perfil-container" style={{
        minHeight: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#a084e8",
        fontWeight: 600,
        fontSize: 22
      }}>
        No has iniciado sesión.
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="perfil-container" style={{
        minHeight: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#d32f2f",
        fontWeight: 600,
        fontSize: 22
      }}>
        No se pudo cargar el perfil.
      </div>
    );
  }

  return (
    <div
      className="perfil-container"
      style={{
        maxWidth: 480,
        margin: "48px auto",
        padding: "32px 0",
        borderRadius: 18,
        background: "rgba(34,34,44,0.98)",
        boxShadow: "0 4px 32px #7b2ff244, 0 1.5px 0 #a084e8",
        border: "2px solid #393053",
        fontFamily: "Poppins, Montserrat, Segoe UI, Arial, sans-serif",
        color: "#fff",
        minHeight: 400,
        position: "relative",
        zIndex: 2,
        width: "95vw"
      }}
    >
      <div
        className="perfil-card"
        style={{
          background: "rgba(44,19,80,0.18)",
          borderRadius: 14,
          border: "1.5px solid #a084e8",
          boxShadow: "0 2px 12px #7b2ff244",
          padding: "28px 24px 18px 24px",
          margin: "0 auto",
          maxWidth: 400,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}
      >
        <h2
          className="title"
          style={{
            textAlign: "center",
            color: "#FFD600",
            fontWeight: 800,
            fontSize: 26,
            letterSpacing: "0.03em",
            textShadow: "0 2px 12px #7b2ff244, 0 1px 0 #18122B",
            marginBottom: 18
          }}
        >
          Perfil de usuario
        </h2>
        <div
          className="perfil-avatar"
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 18
          }}
        >
          {profile.photoURL && profile.photoURL !== 'https://via.placeholder.com/120' ? (
            <img
              src={profile.photoURL}
              alt="Perfil"
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid #a084e8",
                boxShadow: "0 2px 12px #7b2ff244",
                background: "#eee",
                maxWidth: "100vw"
              }}
            />
          ) : (
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"
              style={{
                display: 'block',
                borderRadius: '50%',
                border: '3px solid #a084e8',
                background: '#fff',
                boxShadow: '0 2px 12px #7b2ff244',
                maxWidth: '100vw'
              }}
            >
              <circle cx="60" cy="60" r="58" fill="#2d1846" stroke="#a084e8" strokeWidth="4"/>
              <ellipse cx="60" cy="88" rx="30" ry="18" fill="#a084e8" fillOpacity="0.13"/>
              <circle cx="60" cy="54" r="26" fill="#fff" stroke="#a084e8" strokeWidth="2.5"/>
              <ellipse cx="60" cy="80" rx="18" ry="10" fill="#e0d7fa" />
              <ellipse cx="60" cy="80" rx="14" ry="8" fill="#fff" />
              <circle cx="60" cy="54" r="16" fill="#e0d7fa" />
              <circle cx="60" cy="54" r="13" fill="#fff" />
            </svg>
          )}
        </div>
        {/* Muestra la info del usuario dentro de la tarjeta, bien alineada */}
        <div
          className="perfil-info"
          style={{
            fontSize: 17,
            color: "#fff",
            marginBottom: 18,
            wordBreak: "break-word",
            width: "100%",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 10,
            padding: "16px 12px",
            boxSizing: "border-box",
            boxShadow: "0 1px 8px #7b2ff211"
          }}
        >
          <p style={{margin: "8px 0"}}>
            <strong style={{ color: "#FFD600" }}>Nombre:</strong> {profile.displayName}
          </p>
          <p style={{margin: "8px 0"}}>
            <strong style={{ color: "#FFD600" }}>Email:</strong> {profile.email}
          </p>
          <p style={{margin: "8px 0"}}>
            <strong style={{ color: "#FFD600" }}>Teléfono:</strong> {profile.phoneNumber}
          </p>
        </div>
        <h2
          className="title"
          style={{
            marginTop: 32,
            textAlign: "center",
            color: "#FFD600",
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: "0.02em",
            textShadow: "0 2px 12px #7b2ff244, 0 1px 0 #18122B"
          }}
        >
          Editar Perfil
        </h2>
        {/* Ajusta el ancho del formulario de edición */}
        <div style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <div style={{
            width: "100%",
            maxWidth: 320, // más pequeño
            margin: "0 auto"
          }}>
            <EditarPerfil user={user} onUpdate={handleUpdate} />
          </div>
        </div>
      </div>
      <style>
        {`
        @media (max-width: 600px) {
          .perfil-container {
            max-width: 99vw !important;
            padding: 12px 0 !important;
            margin: 18px auto !important;
            border-radius: 10px !important;
          }
          .perfil-card {
            padding: 12px 2vw 10px 2vw !important;
            max-width: 99vw !important;
          }
          .perfil-avatar img {
            width: 80px !important;
            height: 80px !important;
          }
          .perfil-info {
            padding: 8px 2px !important;
            font-size: 14px !important;
          }
          .perfil-card form,
          .perfil-card form > * {
            max-width: 96vw !important;
            width: 100% !important;
            box-sizing: border-box;
          }
          .perfil-card input,
          .perfil-card select,
          .perfil-card button {
            font-size: 0.97rem !important;
            padding: 7px 8px !important;
          }
        }
        `}
      </style>
    </div>
  );
}