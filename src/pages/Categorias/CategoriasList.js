import { Helmet } from 'react-helmet-async';

import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { catUrl } from '../../utils/slugify';

export default function CategoriasList() {
  const [categorias, setCategorias] = useState([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const snapshot = await getDocs(collection(db, "categories"));
        setCategorias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error al cargar categorías:", err);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/iniciar-sesion");
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "admin") {
          setIsAdmin(true);
          fetchCategorias();
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error al verificar admin:", err);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line
  }, []);

  const fetchCategorias = async () => {
    try {
      const snapshot = await getDocs(collection(db, "categories"));
      setCategorias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateDoc(doc(db, "categories", editId), { name: nombre, description: descripcion, ...(imageUrl ? { imageUrl } : {}) });
        setMsg("¡Categoría actualizada!"); setMsgType("success");
        setEditId(null); setNombre(""); setDescripcion(""); setImageUrl("");
        fetchCategorias();
      } else {
        const docRef = await addDoc(collection(db, "categories"), { name: nombre, description: descripcion, ...(imageUrl ? { imageUrl } : {}) });
        setMsg("¡Categoría agregada!"); setMsgType("success");
        setNombre(""); setDescripcion(""); setImageUrl("");
        fetchCategorias();
        setTimeout(()=>navigate(catUrl(nombre, docRef.id)), 1200);
      }
    } catch (err) {
      setMsg("Error al guardar. Intenta de nuevo."); setMsgType("error");
    }
    setTimeout(()=>{ setMsg(""); setMsgType(""); }, 2000);
  };

  const handleCreateSwitch2 = async () => {
    const existe = categorias.some(c => c.name.toLowerCase().includes('switch 2') || c.name.toLowerCase().includes('switch2'));
    if (existe) { setMsg("Nintendo Switch 2 ya existe."); setMsgType("success"); setTimeout(()=>setMsg(""),2500); return; }
    try {
      await addDoc(collection(db, "categories"), {
        name: "Nintendo Switch 2",
        description: "Juegos digitales para Nintendo Switch 2"
      });
      setMsg("✅ ¡Nintendo Switch 2 creada!"); setMsgType("success");
      fetchCategorias();
    } catch(e) { setMsg("Error: " + e.message); setMsgType("error"); }
    setTimeout(()=>setMsg(""), 3000);
  };

  const handleEdit = (cat) => {
    setEditId(cat.id);
    setNombre(cat.name);
    setDescripcion(cat.description || "");
    setImageUrl(cat.imageUrl || "");
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
    <>
      <Helmet>
        <title>Todas las Categorías de Videojuegos | Steam, Nintendo Switch, PS5 y PS4 - PandaStore</title>
        <meta name="description" content="Explora todas las categorías de PandaStore: Juegos para Steam PC, Nintendo Switch 1 y 2, PlayStation 5, PS4, promociones 2x1 y suscripciones gaming al mejor precio." />
        <meta name="keywords" content="categorias videojuegos, catalogo steam pc, juegos nintendo switch, juegos playstation digitales, suscripciones streaming, pandastore" />
        <meta property="og:title" content="Todas las Categorías de Videojuegos | PandaStore" />
        <meta property="og:description" content="Explora el catálogo completo de videojuegos digitales en PandaStore." />
        <meta property="og:url" content="https://pandastoregaming.cl/categorias" />
        <meta property="og:image" content="https://pandastoregaming.cl/banner.png" />
        <link rel="canonical" href="https://pandastoregaming.cl/categorias" />
      </Helmet>
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
      {/* Botón rápido Nintendo Switch 2 */}
      {!categorias.some(c => c.name.toLowerCase().includes('switch 2') || c.name.toLowerCase().includes('switch2')) && (
        <div style={{background:'linear-gradient(135deg,#1a1035,#2d1950)',border:'2px solid #a259ff55',borderRadius:14,padding:'14px 20px',marginBottom:18,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
          <div>
            <div style={{fontWeight:800,fontSize:'1.05rem',color:'#fff'}}>🕹️ Nintendo Switch 2</div>
            <div style={{color:'#c4b5fd',fontSize:'0.88rem',marginTop:2}}>La categoría no existe aún — créala con un click</div>
          </div>
          <button onClick={handleCreateSwitch2} style={{background:'linear-gradient(135deg,#a259ff,#7b2ff2)',color:'#fff',fontWeight:800,padding:'10px 22px',border:'none',borderRadius:10,cursor:'pointer',fontSize:'1.0rem',whiteSpace:'nowrap',boxShadow:'0 4px 16px #a259ff44'}}>
            Crear Nintendo Switch 2
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:12,margin:'18px 0'}}>
        <input placeholder="Nombre de la categoría" value={nombre} onChange={e=>setNombre(e.target.value)} required
          style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8',fontSize:'1.08rem',fontWeight:500}} />
        <input placeholder="Descripción (opcional)" value={descripcion} onChange={e=>setDescripcion(e.target.value)}
          style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8',fontSize:'1.08rem'}} />
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input placeholder="URL de imagen (opcional)" value={imageUrl} onChange={e=>setImageUrl(e.target.value)}
            style={{flex:1,padding:10,borderRadius:8,border:'1.5px solid #a084e8',fontSize:'1.0rem'}} />
          {imageUrl && <img src={imageUrl} alt="preview" style={{width:48,height:48,objectFit:'cover',borderRadius:8,border:'2px solid #a084e8',flexShrink:0}} onError={e=>e.target.style.display='none'} />}
        </div>
        <div style={{display:'flex',gap:10}}>
          <button type="submit" style={{background:'#7b2ff2',color:'#fff',fontWeight:700,padding:'10px 22px',border:'none',borderRadius:8,cursor:'pointer',fontSize:'1.08rem'}}>{editId ? "Actualizar" : "Agregar"}</button>
          {editId && <button type="button" onClick={()=>{setEditId(null);setNombre("");setDescripcion("");setImageUrl("");}} style={{background:'#eee',color:'#a084e8',fontWeight:700,padding:'10px 22px',border:'none',borderRadius:8,cursor:'pointer',fontSize:'1.08rem'}}>Cancelar</button>}
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
            <Link to={catUrl(cat.name, cat.id)} style={{background:'#a084e8',color:'#fff',padding:'7px 16px',borderRadius:7,textDecoration:'none',fontWeight:700,marginRight:6}}>Ver</Link>
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
    </>
  );
}
