import React, { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";

export default function AdminUsuarios({ user, role }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [error, setError] = useState("");

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
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
      <h1>Gestión de Usuarios</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading ? <p>Cargando...</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Nombre</th>
              <th>UID</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id}>
                <td>{u.email || "Sin campo"}</td>
                <td>{(u.firstName || u.lastName) ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "Sin campo"}</td>
                <td>{u.id}</td>
                <td>
                  <button onClick={() => eliminarUsuario(u.id)} style={{ color: 'red' }}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
