import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collectionGroup, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function AdminResenas({ user, role }) {
  const [resenas, setResenas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
      if (role === undefined) return; // Esperar a que role esté definido
      if (!user || role !== "admin") {
        navigate("/home");
        return;
      }
      // Cargar todas las reseñas de todos los productos
      const fetchResenas = async () => {
        setLoading(true);
        try {
          // Trae todas las subcolecciones reviews de todos los productos
          const snap = await getDocs(collectionGroup(db, "reviews"));
          console.log("collectionGroup reviews snapshot:", snap);
          const arr = snap.docs.map(docu => ({
            id: docu.id,
            ...docu.data(),
            ref: docu.ref,
            productoId: docu.ref.parent.parent.id // id del producto
          }));
          console.log("Reseñas mapeadas:", arr);
          setResenas(arr);
        } catch (e) {
          setError("Error al cargar reseñas");
          console.error("Error al cargar reseñas:", e);
        }
        setLoading(false);
      };
      fetchResenas();
    }, [user, role, navigate]);

  const eliminarResena = async (ref) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta reseña?")) return;
    try {
      await deleteDoc(ref);
      setResenas(resenas.filter(r => r.ref !== ref));
    } catch (e) {
      alert("Error al eliminar reseña");
    }
  };

  const toggleVisible = async (ref, visible) => {
    try {
      await updateDoc(ref, { visible: !visible });
      setResenas(resenas.map(r => r.ref === ref ? { ...r, visible: !visible } : r));
    } catch (e) {
      alert("Error al actualizar visibilidad");
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
      <h1>Gestión de Reseñas</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading ? <p>Cargando...</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Usuario</th>
              <th>Reseña</th>
              <th>Fecha</th>
              <th>Visible</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {resenas.map(r => (
              <tr key={r.id}>
                <td>{r.productoId}</td>
                <td>{r.userEmail || r.userName || r.userId || "Sin campo"}</td>
                <td>{r.comment || r.texto || r.text || r.comentario || "Sin campo"}</td>
                <td>{r.date ? (typeof r.date === 'string' ? r.date.substring(0,10) : (r.date.toDate ? r.date.toDate().toLocaleDateString() : "Sin campo")) : "Sin campo"}</td>
                <td>{r.visible === false ? "No" : "Sí"}</td>
                <td>
                  <button onClick={() => eliminarResena(r.ref)} style={{ color: 'red', marginRight: 8 }}>Eliminar</button>
                  <button onClick={() => toggleVisible(r.ref, r.visible === false ? false : true)}>
                    {r.visible === false ? "Mostrar" : "Ocultar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
