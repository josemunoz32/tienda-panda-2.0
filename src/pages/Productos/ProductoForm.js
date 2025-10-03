import React, { useEffect, useState } from "react";
import { db, auth, storage } from "../../firebase";
import { collection, getDocs, addDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

export default function ProductoForm() {
  const [categorias, setCategorias] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    stock: "",
    categoryId: "",
    // Switch
    priceCLP: "",
    priceUSD: "",
    // PS4/PS5
    pricePrimariaCLP: "",
    pricePrimariaUSD: "",
    priceSecundariaCLP: "",
    priceSecundariaUSD: "",
    // Streaming/Suscripcion
    preciosPorMes: [],
    imageUrl: "",
  });
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nuevoPrecioMes, setNuevoPrecioMes] = useState({ meses: "", clp: "", usd: "" });
  const [imageFile, setImageFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

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
        setLoading(false);
      } else {
        setRole("user");
        setLoading(false);
      }
    };
    checkAdmin();
    getDocs(collection(db, "categories")).then(snapshot => {
      setCategorias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    if (id) {
      getDoc(doc(db, "products", id)).then(docSnap => {
        if (docSnap.exists()) setForm(docSnap.data());
      });
    } else if (searchParams.get("categoria")) {
      setForm(f => ({ ...f, categoryId: searchParams.get("categoria") }));
    }
  }, [id, searchParams, navigate]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => {
      // Si cambia la categoría, limpiar los precios para forzar el render de los campos correctos
      if (name === "categoryId") {
        return {
          ...prev,
          categoryId: value,
          priceCLP: "",
          priceUSD: "",
          pricePrimariaCLP: "",
          pricePrimariaUSD: "",
          priceSecundariaCLP: "",
          priceSecundariaUSD: "",
          preciosPorMes: [],
        };
      }
      return { ...prev, [name]: value };
    });
  };

  // Imagen
  const handleImageChange = e => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  // Precios por mes (streaming/suscripcion)
  const handleAddPrecioMes = () => {
    if (!nuevoPrecioMes.meses || (!nuevoPrecioMes.clp && !nuevoPrecioMes.usd)) return;
    setForm(f => ({
      ...f,
      preciosPorMes: [
        ...f.preciosPorMes,
        {
          meses: Number(nuevoPrecioMes.meses),
          clp: Number(nuevoPrecioMes.clp) || 0,
          usd: Number(nuevoPrecioMes.usd) || 0,
        },
      ],
    }));
    setNuevoPrecioMes({ meses: "", clp: "", usd: "" });
  };

  const handleRemovePrecioMes = idx => {
    setForm(f => ({
      ...f,
      preciosPorMes: f.preciosPorMes.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setMsgType("");
    try {
      let imageUrl = form.imageUrl;
      if (imageFile) {
        const fileRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
        await uploadBytes(fileRef, imageFile);
        imageUrl = await getDownloadURL(fileRef);
      }
      const data = { ...form, imageUrl };
      if (id) {
        await updateDoc(doc(db, "products", id), data);
        setMsg("¡Producto actualizado!"); setMsgType("success");
      } else {
        await addDoc(collection(db, "products"), data);
        setMsg("¡Producto agregado!"); setMsgType("success");
      }
      setTimeout(()=>navigate(-1), 1200);
    } catch {
      setMsg("Error al guardar. Intenta de nuevo."); setMsgType("error");
    }
    setLoading(false);
    setTimeout(()=>{ setMsg(""); setMsgType(""); }, 2000);
  };

  if (loading) return <div>Cargando...</div>;
  if (role !== "admin") return <div>No tienes permisos para acceder a esta página.</div>;

  // Detecta la categoría seleccionada
  const categoriaSeleccionada = categorias.find(cat => cat.id === form.categoryId);
  const nombreCat = categoriaSeleccionada ? categoriaSeleccionada.name.toLowerCase() : "";

  // Considerar variantes de nombre para Nintendo Switch
  const esSwitch = nombreCat.includes("switch");

  return (
    <div style={{maxWidth:'600px',width:'98vw',margin:'40px auto',padding:'24px 8px 32px 8px',background:'rgba(255,255,255,0.97)',borderRadius:18,boxShadow:'0 4px 32px #0003',border:'1.5px solid #a084e8',backdropFilter:'blur(2px)'}}>
      <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:16}}>
        <h2 style={{textAlign:'center',color:'#7b2ff2',fontWeight:900,letterSpacing:1}}>{id ? "Editar" : "Nuevo"} Producto</h2>
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
        <input name="name" placeholder="Título" value={form.name} onChange={handleChange} required style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8',fontSize:'1.08rem',fontWeight:500}} />
        <input name="description" placeholder="Descripción" value={form.description} onChange={handleChange} style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8',fontSize:'1.08rem'}} />
        <input name="stock" type="number" placeholder="Stock" value={form.stock} onChange={handleChange} min="0" style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8',fontSize:'1.08rem'}} />

        <select name="categoryId" value={form.categoryId} onChange={handleChange} required style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8',fontSize:'1.08rem'}}>
          <option value="">Selecciona categoría</option>
          {categorias.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        {/* Imagen */}
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          <label style={{fontWeight:600,color:'#7b2ff2'}}>Imagen</label>
          <input type="file" accept="image/*" onChange={handleImageChange} style={{padding:6}} />
          {form.imageUrl && <img src={form.imageUrl} alt="Producto" style={{ width: 80, marginTop: 8, borderRadius:8, boxShadow:'0 1px 4px #0001' }} />}
        </div>

        {/* Switch */}
        {esSwitch && (
          <div style={{display:'flex',gap:10}}>
            <input
              name="priceCLP"
              type="number"
              placeholder="Precio CLP"
              value={form.priceCLP}
              onChange={handleChange}
              min="0"
              required
              style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8',fontSize:'1.08rem',flex:1}}
            />
            <input
              name="priceUSD"
              type="number"
              placeholder="Precio USD"
              value={form.priceUSD}
              onChange={handleChange}
              min="0"
              required
              style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8',fontSize:'1.08rem',flex:1}}
            />
          </div>
        )}

        {/* PS4/PS5 */}
        {(nombreCat === "ps4" || nombreCat === "ps5") && (
          <>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <label style={{fontWeight:600,minWidth:90}}>Primaria</label>
              <input
                name="pricePrimariaCLP"
                type="number"
                placeholder="Primaria CLP"
                value={form.pricePrimariaCLP}
                onChange={handleChange}
                min="0"
                style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8',fontSize:'1.08rem',flex:1}}
              />
              <input
                name="pricePrimariaUSD"
                type="number"
                placeholder="Primaria USD"
                value={form.pricePrimariaUSD}
                onChange={handleChange}
                min="0"
                style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8',fontSize:'1.08rem',flex:1}}
              />
            </div>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <label style={{fontWeight:600,minWidth:90}}>Secundaria</label>
              <input
                name="priceSecundariaCLP"
                type="number"
                placeholder="Secundaria CLP"
                value={form.priceSecundariaCLP}
                onChange={handleChange}
                min="0"
                style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8',fontSize:'1.08rem',flex:1}}
              />
              <input
                name="priceSecundariaUSD"
                type="number"
                placeholder="Secundaria USD"
                value={form.priceSecundariaUSD}
                onChange={handleChange}
                min="0"
                style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8',fontSize:'1.08rem',flex:1}}
              />
            </div>
          </>
        )}

        {/* Streaming/Suscripcion */}
        {(nombreCat.includes("streaming") || nombreCat.includes("suscrip")) && (
          <div style={{background:'#f3eaff',borderRadius:10,padding:'12px 10px',marginTop:8}}>
            <h4 style={{color:'#7b2ff2',fontWeight:800,margin:'0 0 8px 0'}}>Precios por meses</h4>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                type="number"
                placeholder="Meses"
                value={nuevoPrecioMes.meses}
                onChange={e => setNuevoPrecioMes({ ...nuevoPrecioMes, meses: e.target.value })}
                min="1"
                style={{ width: 70, padding:8, borderRadius:8, border:'1.5px solid #a084e8' }}
              />
              <input
                type="number"
                placeholder="CLP"
                value={nuevoPrecioMes.clp}
                onChange={e => setNuevoPrecioMes({ ...nuevoPrecioMes, clp: e.target.value })}
                min="0"
                style={{ width: 90, padding:8, borderRadius:8, border:'1.5px solid #a084e8' }}
              />
              <input
                type="number"
                placeholder="USD"
                value={nuevoPrecioMes.usd}
                onChange={e => setNuevoPrecioMes({ ...nuevoPrecioMes, usd: e.target.value })}
                min="0"
                style={{ width: 90, padding:8, borderRadius:8, border:'1.5px solid #a084e8' }}
              />
              <button type="button" onClick={handleAddPrecioMes} style={{background:'#7b2ff2',color:'#fff',fontWeight:700,padding:'8px 18px',border:'none',borderRadius:8,cursor:'pointer'}}>Agregar</button>
            </div>
            <ul style={{margin:0,paddingLeft:18}}>
              {form.preciosPorMes && form.preciosPorMes.map((p, idx) => (
                <li key={idx} style={{marginBottom:4}}>
                  {p.meses} mes(es): <b>{p.clp} CLP</b> / <b>{p.usd} USD</b>
                  <button type="button" onClick={() => handleRemovePrecioMes(idx)} style={{background:'#ff4d4f',color:'#fff',fontWeight:700,padding:'2px 10px',border:'none',borderRadius:7,marginLeft:10,cursor:'pointer'}}>Eliminar</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button type="submit" disabled={loading} style={{background:'#7b2ff2',color:'#fff',fontWeight:700,padding:'12px 0',border:'none',borderRadius:8,cursor:'pointer',fontSize:'1.08rem',marginTop:10}}>{loading ? "Guardando..." : "Guardar"}</button>
      </form>
    </div>
  );
}
