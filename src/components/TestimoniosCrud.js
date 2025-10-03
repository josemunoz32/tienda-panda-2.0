import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc } from "firebase/firestore";

export default function TestimoniosCrud() {
  const [testimonios, setTestimonios] = useState([]);
  const [imagenFile, setImagenFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 16;

  useEffect(() => {
    const fetchRoleAndTestimonios = async () => {
      const user = auth.currentUser;
      if (user) {
        // Leer el claim 'role' directamente del token de autenticación
        const tokenResult = await user.getIdTokenResult(true); // fuerza refresco
        setRole(tokenResult.claims.role);
      }
      const snapshot = await getDocs(collection(db, "testimonios"));
      setTestimonios(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchRoleAndTestimonios();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!imagenFile || role !== "admin") return;
    try {
      // Subir imagen a Firebase Storage
      const storage = getStorage();
      const storageRef = ref(storage, `testimonios/${Date.now()}_${imagenFile.name}`);
      await uploadBytes(storageRef, imagenFile);
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, "testimonios"), { imagen: url });
      setImagenFile(null);
      // Recargar testimonios
      const snapshot = await getDocs(collection(db, "testimonios"));
      setTestimonios(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      setErrorMsg("No tienes permisos para subir imágenes. Contacta al administrador o revisa las reglas de Firebase Storage.");
    }
  };

  const handleDelete = async (id) => {
    if (role !== "admin") return;
    await deleteDoc(doc(db, "testimonios", id));
    setTestimonios(testimonios.filter(t => t.id !== id));
  };

  return (
    <div style={{
      maxWidth: 900,
      margin: '0 auto',
      padding: '32px 0',
      fontFamily: 'Poppins, Montserrat, Segoe UI, Arial, sans-serif',
      background: 'transparent',
      position: 'relative',
      zIndex: 1
    }}>
      <h2 style={{
        textAlign: 'center',
        fontWeight: 800,
        fontSize: '2rem',
        letterSpacing: '0.03em',
        color: '#FFD600',
        textShadow: '0 2px 12px #7b2ff244, 0 1px 0 #18122B',
        marginBottom: 32,
        background: 'transparent'
      }}>
        Ventas anteriores
      </h2>
      {/* Solo mostrar el formulario si el usuario es admin */}
      {role === "admin" && (
        <form onSubmit={handleAdd} style={{
          marginBottom: 32,
          background: 'rgba(44,19,80,0.18)',
          borderRadius: 16,
          border: '1.5px solid #a084e8',
          boxShadow: '0 2px 12px #7b2ff244',
          padding: '18px 18px 12px 18px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <input
            type="file"
            accept="image/*"
            onChange={e => setImagenFile(e.target.files[0])}
            style={{
              width: '100%',
              marginBottom: 12,
              color: '#fff',
              background: '#1a1a2e',
              border: '1.5px solid #a084e8',
              borderRadius: 8,
              padding: '8px 12px'
            }}
          />
          <button type="submit" style={{
            background: 'linear-gradient(90deg, #7b2ff2 0%, #f357a8 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 28px',
            fontWeight: 700,
            fontSize: '1.08rem',
            boxShadow: '0 2px 8px #7b2ff244',
            cursor: 'pointer',
            transition: 'background 0.18s, box-shadow 0.18s, transform 0.15s'
          }}>
            Agregar venta
          </button>
          {errorMsg && <div style={{color:'#d32f2f',marginTop:8}}>{errorMsg}</div>}
        </form>
      )}
      {loading ? (
        <div style={{textAlign:'center', color:'#a084e8', fontWeight:600, fontSize:'1.1rem'}}>Cargando testimonios...</div>
      ) : (
        <>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 28,
            justifyContent: 'center'
          }}>
            {testimonios
              .slice((page - 1) * perPage, page * perPage)
              .map(t => (
                <div key={t.id} style={{
                  background: 'rgba(34,34,44,0.98)',
                  borderRadius: 18,
                  boxShadow: '0 4px 24px #7b2ff233, 0 1.5px 0 #a084e8',
                  border: '2px solid #393053',
                  padding: 18,
                  minWidth: 220,
                  maxWidth: 260,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginBottom: 10,
                  position: 'relative',
                  overflow: 'visible', // <-- Cambia a visible para que el botón se vea fuera del contenedor de imagen
                  color: '#fff'
                }}>
                  <div style={{
                    width: '100%',
                    height: 0,
                    paddingBottom: '100%'
                  }}>
                    <div style={{
                      width: '100%',
                      height: '100%',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      background: 'transparent',
                      borderRadius: 14,
                      overflow: 'hidden',
                      marginBottom: 14,
                      boxShadow: '0 2px 12px #a084e822'
                    }}>
                      <img
                        src={t.imagen}
                        alt="Testimonio"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          display: 'block',
                          borderRadius: 14,
                          background: 'transparent'
                        }}
                      />
                    </div>
                  </div>
                  {/* Solo mostrar el botón eliminar si el usuario es admin */}
                  {role === "admin" && (
                    <button
                      onClick={() => handleDelete(t.id)}
                      style={{
                        background: 'linear-gradient(90deg, #d32f2f 0%, #a084e8 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 28px',
                        fontWeight: 700,
                        fontSize: '1.08rem',
                        marginTop: 18, // <-- Asegura separación del área de imagen
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px #7b2ff244',
                        transition: 'background 0.18s, box-shadow 0.18s, transform 0.15s',
                        zIndex: 2,
                        position: 'relative'
                      }}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              ))}
          </div>
          {/* PAGINACIÓN SOLO SI HAY MÁS DE 16 */}
          {testimonios.length > perPage && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
              margin: '32px 0 0 0',
              width: '100%'
            }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: '1.5px solid #a084e8',
                  background: '#1a1a2e',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '1.08rem'
                }}
              >Anterior</button>
              <span style={{
                color: '#fff',
                fontWeight: 600,
                alignSelf: 'center',
                fontSize: '1.08rem'
              }}>
                Página {page} de {Math.ceil(testimonios.length / perPage)}
              </span>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(testimonios.length / perPage), p + 1))}
                disabled={page >= Math.ceil(testimonios.length / perPage)}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: '1.5px solid #a084e8',
                  background: '#1a1a2e',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: page >= Math.ceil(testimonios.length / perPage) ? 'not-allowed' : 'pointer',
                  fontSize: '1.08rem'
                }}
              >Siguiente</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
