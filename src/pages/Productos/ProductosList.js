
import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import { collection, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

export default function ProductosList() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [categorias, setCategorias] = useState([]);
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
        setRole("admin");
        fetchProductos();
        fetchCategorias();
      } else {
        setRole("user");
        setLoading(false);
      }
    };
    const fetchProductos = async () => {
      const snapshot = await getDocs(collection(db, "products"));
      setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    const fetchCategorias = async () => {
      const snapshot = await getDocs(collection(db, "categories"));
      setCategorias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    checkAdmin();
    // eslint-disable-next-line
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "products", id));
      setProductos(productos.filter(p => p.id !== id));
      setMsg("Producto eliminado."); setMsgType("success");
    } catch {
      setMsg("Error al eliminar."); setMsgType("error");
    }
    setConfirmDelete(null);
    setTimeout(()=>{ setMsg(""); setMsgType(""); }, 2000);
  };

  if (loading) return <div>Cargando...</div>;
  if (role !== "admin") return <div>No tienes permisos para acceder a esta página.</div>;

  // Helper para mostrar nombre de categoría
  const getCatName = (catId) => {
    const cat = categorias.find(c => c.id === catId);
    return cat ? cat.name : "-";
  };

  return (
    <div style={{maxWidth:'1100px',width:'98vw',margin:'40px auto',padding:'24px 8px 32px 8px',background:'rgba(255,255,255,0.97)',borderRadius:18,boxShadow:'0 4px 32px #0003',border:'1.5px solid #a084e8',backdropFilter:'blur(2px)'}}>
      <h2 style={{textAlign:'center',color:'#7b2ff2',fontWeight:900,letterSpacing:1}}>Gestión de Productos</h2>
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
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,gap:12,flexWrap:'wrap'}}>
        <Link to="/producto/nuevo" style={{background:'#7b2ff2',color:'#fff',fontWeight:700,padding:'10px 22px',border:'none',borderRadius:8,cursor:'pointer',fontSize:'1.08rem',textDecoration:'none'}}>Agregar producto</Link>
        <input
          type="text"
          placeholder="Buscar producto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{padding:8,borderRadius:8,border:'1.5px solid #a084e8',fontSize:'1.05rem',minWidth:220}}
        />
      </div>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',background:'none'}}>
          <thead>
            <tr style={{background:'#f3eaff'}}>
              <th style={{padding:'10px 6px',fontWeight:800,color:'#7b2ff2'}}>Imagen</th>
              <th style={{padding:'10px 6px',fontWeight:800,color:'#7b2ff2'}}>Nombre</th>
              <th style={{padding:'10px 6px',fontWeight:800,color:'#7b2ff2'}}>Categoría</th>
              <th style={{padding:'10px 6px',fontWeight:800,color:'#7b2ff2'}}>Precio</th>
              <th style={{padding:'10px 6px',fontWeight:800,color:'#7b2ff2'}}>Stock</th>
              <th style={{padding:'10px 6px',fontWeight:800,color:'#7b2ff2'}}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.filter(prod => prod.name?.toLowerCase().includes(search.toLowerCase())).map(prod => (
              <tr key={prod.id} style={{borderBottom:'1px solid #eee',background:'#fff'}}>
                <td style={{textAlign:'center',padding:'8px'}}>
                  {prod.imageUrl ? <img src={prod.imageUrl} alt={prod.name} style={{width:60,borderRadius:8,boxShadow:'0 1px 4px #0001'}} /> : <span style={{color:'#aaa'}}>Sin imagen</span>}
                </td>
                <td style={{fontWeight:700,padding:'8px',color:'#393053'}}>{prod.name}</td>
                <td style={{padding:'8px',color:'#7b2ff2',fontWeight:600}}>{getCatName(prod.categoryId)}</td>
                <td style={{padding:'8px',color:'#222',fontWeight:600}}>
                  {prod.priceCLP ? `$${Number(prod.priceCLP).toLocaleString('es-CL')}` : prod.pricePrimariaCLP ? `$${Number(prod.pricePrimariaCLP).toLocaleString('es-CL')}` : prod.preciosPorMes && prod.preciosPorMes.length > 0 ? `$${Number(prod.preciosPorMes[0].clp).toLocaleString('es-CL')}` : <span style={{color:'#aaa'}}>Sin precio</span>}
                </td>
                <td style={{padding:'8px',color:'#222',fontWeight:600}}>{prod.stock ?? '-'}</td>
                <td style={{padding:'8px'}}>
                  <Link to={`/producto/editar/${prod.id}`} style={{background:'#ffd600',color:'#222',fontWeight:700,padding:'7px 16px',borderRadius:7,textDecoration:'none',marginRight:6}}>Editar</Link>
                  <button onClick={()=>setConfirmDelete(prod.id)} style={{background:'#ff4d4f',color:'#fff',fontWeight:700,padding:'7px 16px',border:'none',borderRadius:7,cursor:'pointer'}}>Eliminar</button>
                  {confirmDelete === prod.id && (
                    <div style={{position:'absolute',background:'#fff',border:'2px solid #ff4d4f',borderRadius:8,padding:'12px 18px',zIndex:10,boxShadow:'0 2px 12px #0002',top:40,left:'50%',transform:'translateX(-50%)'}}>
                      <div style={{fontWeight:700,marginBottom:8}}>¿Eliminar este producto?</div>
                      <button onClick={()=>handleDelete(prod.id)} style={{background:'#ff4d4f',color:'#fff',fontWeight:700,padding:'7px 16px',border:'none',borderRadius:7,marginRight:8}}>Sí, eliminar</button>
                      <button onClick={()=>setConfirmDelete(null)} style={{background:'#eee',color:'#a084e8',fontWeight:700,padding:'7px 16px',border:'none',borderRadius:7}}>Cancelar</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {productos.length === 0 && (
              <tr><td colSpan={6} style={{textAlign:'center',color:'#888',padding:24}}>No hay productos registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
