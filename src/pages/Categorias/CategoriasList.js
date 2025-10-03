
import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

export default function CategoriasList() {
  const [categorias, setCategorias] = useState([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/iniciar-sesion");
        return;
      }
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().role === "admin") {
        setIsAdmin(true);
        fetchCategorias();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    };
    checkAdmin();
    // eslint-disable-next-line
  }, []);

  const fetchCategorias = async () => {
    const snapshot = await getDocs(collection(db, "categories"));
    setCategorias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateDoc(doc(db, "categories", editId), { name: nombre, description: descripcion });
        setMsg("¡Categoría actualizada!"); setMsgType("success");
        setEditId(null);
        setNombre("");
        setDescripcion("");
        fetchCategorias();
      } else {
        const docRef = await addDoc(collection(db, "categories"), { name: nombre, description: descripcion });
        setMsg("¡Categoría agregada!"); setMsgType("success");
        setNombre("");
        setDescripcion("");
        fetchCategorias();
        setTimeout(()=>navigate(`/categoria/${docRef.id}`), 1200);
      }
    } catch (err) {
      setMsg("Error al guardar. Intenta de nuevo."); setMsgType("error");
    }
    setTimeout(()=>{ setMsg(""); setMsgType(""); }, 2000);
  };

  const handleEdit = (cat) => {
    setEditId(cat.id);
    setNombre(cat.name);
    setDescripcion(cat.description);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "categories", id));
      setMsg("Categoría eliminada."); setMsgType("success");
      fetchCategorias();
    } catch {
      setMsg("Error al eliminar."); setMsgType("error");
    }
    setConfirmDelete(null);
    setTimeout(()=>{ setMsg(""); setMsgType(""); }, 2000);
  };

  if (loading) return <div>Cargando...</div>;
  if (!isAdmin) return <div>No tienes permisos para acceder a esta página.</div>;

  return (
    <div style={{
      maxWidth:'1000px',
      width:'98vw',
      margin:'40px auto',
      padding:'24px 8px 32px 8px',
      background:'rgba(255,255,255,0.97)',
      borderRadius:18,
      boxShadow:'0 4px 32px #0003',
      border:'1.5px solid #a084e8',
      backdropFilter:'blur(2px)'
    }}>
      <h2 style={{textAlign:'center',color:'#7b2ff2',fontWeight:900,letterSpacing:1}}>Gestión de Categorías</h2>
      {msg && (
        <div style={{
          background: msgType==='success'? '#d1ffd6' : '#ffd1d1',
          color: msgType==='success'? '#1a7f2e' : '#a00',
          border: msgType==='success'? '1.5px solid #1a7f2e' : '1.5px solid #a00',
          borderRadius:8,
          padding:'8px 16px',
          margin:'12px 0',
          textAlign:'center',
          fontWeight:600
        }}>{msg}</div>
      )}
      <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:12,margin:'18px 0'}}>
        <input
          placeholder="Nombre de la categoría"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          required
          style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8',fontSize:'1.08rem',fontWeight:500}}
        />
        <input
          placeholder="Descripción"
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8',fontSize:'1.08rem'}}
        />
        <div style={{display:'flex',gap:10}}>
          <button type="submit" style={{background:'#7b2ff2',color:'#fff',fontWeight:700,padding:'10px 22px',border:'none',borderRadius:8,cursor:'pointer',fontSize:'1.08rem'}}>{editId ? "Actualizar" : "Agregar"}</button>
          {editId && <button type="button" onClick={() => { setEditId(null); setNombre(""); setDescripcion(""); }} style={{background:'#eee',color:'#a084e8',fontWeight:700,padding:'10px 22px',border:'none',borderRadius:8,cursor:'pointer',fontSize:'1.08rem'}}>Cancelar</button>}
        </div>
      </form>
      <input
        type="text"
        placeholder="Buscar categoría..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{width:'100%',padding:8,borderRadius:8,border:'1.5px solid #a084e8',marginBottom:18,fontSize:'1.05rem'}}
      />
      <div style={{display:'flex',flexDirection:'column',gap:18}}>
        {categorias.filter(cat => cat.name.toLowerCase().includes(search.toLowerCase())).map(cat => (
          <div key={cat.id} style={{display:'flex',alignItems:'center',gap:18,background:'#fafaff',borderRadius:12,boxShadow:'0 2px 8px #0001',padding:16,position:'relative'}}>
            {cat.imageUrl && (
              <img src={cat.imageUrl} alt={cat.name} style={{ maxWidth: '70px', borderRadius:8, boxShadow:'0 1px 4px #0001',marginRight:8 }} />
            )}
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:'1.12rem',color:'#7b2ff2'}}>{cat.name}</div>
              <div style={{color:'#444',fontSize:'0.98rem',marginTop:2}}>{cat.description}</div>
            </div>
            <Link to={`/categoria/${cat.id}`} style={{background:'#a084e8',color:'#fff',padding:'7px 16px',borderRadius:7,textDecoration:'none',fontWeight:700,marginRight:6}}>Ver</Link>
            <button onClick={() => handleEdit(cat)} style={{background:'#ffd600',color:'#222',fontWeight:700,padding:'7px 16px',border:'none',borderRadius:7,cursor:'pointer',marginRight:6}}>Editar</button>
            <button onClick={() => setConfirmDelete(cat.id)} style={{background:'#ff4d4f',color:'#fff',fontWeight:700,padding:'7px 16px',border:'none',borderRadius:7,cursor:'pointer'}}>Eliminar</button>
            {confirmDelete === cat.id && (
              <div style={{position:'absolute',top:10,right:120,background:'#fff',border:'2px solid #ff4d4f',borderRadius:8,padding:'12px 18px',zIndex:10,boxShadow:'0 2px 12px #0002'}}>
                <div style={{fontWeight:700,marginBottom:8}}>¿Eliminar esta categoría?</div>
                <button onClick={()=>handleDelete(cat.id)} style={{background:'#ff4d4f',color:'#fff',fontWeight:700,padding:'7px 16px',border:'none',borderRadius:7,marginRight:8}}>Sí, eliminar</button>
                <button onClick={()=>setConfirmDelete(null)} style={{background:'#eee',color:'#a084e8',fontWeight:700,padding:'7px 16px',border:'none',borderRadius:7}}>Cancelar</button>
              </div>
            )}
          </div>
        ))}
        {categorias.length === 0 && <div style={{textAlign:'center',color:'#888',marginTop:24}}>No hay categorías registradas.</div>}
      </div>
    </div>
  );
}
