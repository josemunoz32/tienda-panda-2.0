import React, { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";


const styles = {
  container: {
    maxWidth: 900,
    margin: "40px auto",
    padding: 24,
    background: "rgba(255,255,255,0.85)", // semitransparente
    borderRadius: 16,
    boxShadow: "0 4px 24px 0 rgba(0,0,0,0.10)",
    border: "2px solid #e0e0e0",
    backdropFilter: 'blur(2px)',
  },
  title: {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 700,
    fontSize: 32,
    color: '#1e293b',
    marginBottom: 24,
    letterSpacing: 1,
    textAlign: 'center',
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#f8fafc",
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: "0 2px 8px 0 rgba(0,0,0,0.04)",
  },
  th: {
    background: "#38bdf8",
    color: "#fff",
    fontWeight: 600,
    padding: "14px 8px",
    fontSize: 16,
    borderBottom: "2px solid #bae6fd",
    fontFamily: 'Montserrat, sans-serif',
  },
  td: {
    padding: "12px 8px",
    fontSize: 15,
    color: "#334155",
    borderBottom: "1px solid #e0e0e0",
    fontFamily: 'Montserrat, sans-serif',
    textAlign: 'center',
  },
  button: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "7px 18px",
    fontWeight: 600,
    fontFamily: 'Montserrat, sans-serif',
    cursor: "pointer",
    transition: "background 0.2s",
    boxShadow: "0 1px 4px 0 rgba(239,68,68,0.10)",
  },
  buttonHover: {
    background: "#b91c1c",
  },
  error: {
    color: '#ef4444',
    fontWeight: 600,
    textAlign: 'center',
    marginBottom: 12,
  },
  loading: {
    color: '#0ea5e9',
    fontWeight: 500,
    textAlign: 'center',
    marginBottom: 12,
  },
};

export default function AdminUsuarios({ user, role }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    if (!user || role !== "admin") {
      navigate("/home");
      return;
    }
    // Cargar usuarios reales
    const fetchUsuarios = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "users"));
        const arr = snap.docs.map(docu => ({ id: docu.id, ...docu.data() }));
        setUsuarios(arr);
      } catch (e) {
        setError("Error al cargar usuarios");
      }
      setLoading(false);
    };
    fetchUsuarios();
  }, [user, navigate]);

  const eliminarUsuario = async (uid) => {
    if (!window.confirm("¿Seguro que deseas eliminar este usuario?")) return;
    try {
      await deleteDoc(doc(db, "users", uid));
      setUsuarios(usuarios.filter(u => u.id !== uid));
    } catch (e) {
      alert("Error al eliminar usuario");
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Gestión de Usuarios</h1>
      {error && <p style={styles.error}>{error}</p>}
      {loading ? (
        <p style={styles.loading}>Cargando...</p>
      ) : (
        <div style={{overflowX: 'auto'}}>
          <table style={styles.table}>
            <thead>
              <tr>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Nombre</th>
                  <th style={styles.th}>Rol</th>
                  <th style={styles.th}>UID</th>
                  <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} style={{ background: '#fff', transition: 'background 0.2s' }}>
                  <td style={styles.td}>{u.email || "Sin campo"}</td>
                  <td style={styles.td}>{u.displayName ? u.displayName : ((u.firstName || u.lastName) ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "Sin campo")}</td>
                  <td style={styles.td}>{u.role || "usuario"}</td>
                  <td style={styles.td}>{u.id}</td>
                  <td style={styles.td}>
                    <button
                      style={hovered === u.id ? { ...styles.button, ...styles.buttonHover } : styles.button}
                      onMouseEnter={() => setHovered(u.id)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => eliminarUsuario(u.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
