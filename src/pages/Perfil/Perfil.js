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
      <div className="perfil-page">
        <div className="perfil-loading">Cargando perfil...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="perfil-page">
        <div className="perfil-loading">No has iniciado sesión.</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="perfil-page">
        <div className="perfil-loading" style={{color:'#fca5a5'}}>No se pudo cargar el perfil.</div>
      </div>
    );
  }

  return (
    <div className="perfil-page">
      <div className="perfil-wrapper">

        {/* ── Tarjeta de info ── */}
        <div className="perfil-info-card">
          {/* Avatar */}
          <div className="perfil-avatar-wrap">
            {profile.photoURL && profile.photoURL !== 'https://via.placeholder.com/120' ? (
              <img src={profile.photoURL} alt="Foto de perfil" className="perfil-avatar-img" />
            ) : (
              <div className="perfil-avatar-placeholder">
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="56" height="56">
                  <circle cx="32" cy="24" r="14" fill="#a259ff" fillOpacity="0.35" stroke="#c4b5fd" strokeWidth="2"/>
                  <ellipse cx="32" cy="52" rx="20" ry="11" fill="#a259ff" fillOpacity="0.18"/>
                </svg>
              </div>
            )}
          </div>

          {/* Nombre destacado */}
          <div className="perfil-name">{profile.displayName}</div>

          {/* Filas de info */}
          <div className="perfil-info-rows">
            <div className="perfil-info-row">
              <span className="perfil-info-icon">👤</span>
              <div>
                <div className="perfil-info-label">Nombre</div>
                <div className="perfil-info-value">{profile.displayName}</div>
              </div>
            </div>
            <div className="perfil-info-row">
              <span className="perfil-info-icon">✉️</span>
              <div>
                <div className="perfil-info-label">Email</div>
                <div className="perfil-info-value">{profile.email}</div>
              </div>
            </div>
            <div className="perfil-info-row">
              <span className="perfil-info-icon">📱</span>
              <div>
                <div className="perfil-info-label">Teléfono</div>
                <div className="perfil-info-value">{profile.phoneNumber}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tarjeta de edición ── */}
        <div className="perfil-edit-card">
          <div className="perfil-edit-title">
            <span>✏️</span> Editar Perfil
          </div>
          <EditarPerfil user={user} onUpdate={handleUpdate} />
        </div>

      </div>
    </div>
  );
}