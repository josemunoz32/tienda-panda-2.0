import React, { useEffect, useState } from "react";
import { AVAILABLE_TAGS } from "../../utils/productTags";
import { db, auth, storage } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, addDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMoneda } from "../../context/MonedaContext";

export default function ProductoForm() {
  const { valorDolar, actualizarValorDolar } = useMoneda();
  const rate = valorDolar || 900;
  const [editingDolar, setEditingDolar] = useState(false);
  const [dolarInput, setDolarInput] = useState(String(rate));
  const [categorias, setCategorias] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    stock: "",
    categoryId: "",
    // Switch
    priceCLP: "",
    priceUSD: "",
    costo_clp: "",
    costo_usd: "",
    switchCompat: "ambas",
    // PS4/PS5
    pricePrimariaCLP: "",
    pricePrimariaUSD: "",
    priceSecundariaCLP: "",
    priceSecundariaUSD: "",
    costoPrimariaCLP: "",
    costoPrimariaUSD: "",
    costoSecundariaCLP: "",
    costoSecundariaUSD: "",
    // Streaming/Suscripcion
    modalidadServicio: "perfil",
    preciosPorMes: [],
    imageUrl: "",
  });
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nuevoPrecioMes, setNuevoPrecioMes] = useState({ meses: "", clp: "", usd: "", costoClp: "", costoUsd: "" });
  const [imageFile, setImageFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");
  const [tags, setTags] = useState([]);
  const [customTag, setCustomTag] = useState("");
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/iniciar-sesion");
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const uRole = String(userDoc.data()?.role || "").trim().toLowerCase();
        if (userDoc.exists() && ["admin", "super_admin", "superadmin"].includes(uRole)) {
          setRole("admin");
        } else {
          setRole("user");
        }
      } catch (err) {
        console.error("Error al verificar admin:", err);
        setRole("user");
      } finally {
        setLoading(false);
      }
    });

    getDocs(collection(db, "categories")).then(snapshot => {
      setCategorias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    if (id) {
      getDoc(doc(db, "products", id)).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setForm(data);
          if (Array.isArray(data.tags)) setTags(data.tags);
        }
      });
    } else if (searchParams.get("categoria")) {
      setForm(f => ({ ...f, categoryId: searchParams.get("categoria") }));
    }

    return () => unsubscribe();
  }, [id, searchParams, navigate]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => {
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
          costo_clp: "",
          costo_usd: "",
          costoPrimariaCLP: "",
          costoPrimariaUSD: "",
          costoSecundariaCLP: "",
          costoSecundariaUSD: "",
          preciosPorMes: [],
        };
      }
      const updated = { ...prev, [name]: value };
      const numVal = Number(value);
      if (name === "priceCLP") {
        updated.priceUSD = value && !isNaN(numVal) && numVal > 0 ? (numVal / rate).toFixed(2) : "";
      } else if (name === "pricePrimariaCLP") {
        updated.pricePrimariaUSD = value && !isNaN(numVal) && numVal > 0 ? (numVal / rate).toFixed(2) : "";
      } else if (name === "priceSecundariaCLP") {
        updated.priceSecundariaUSD = value && !isNaN(numVal) && numVal > 0 ? (numVal / rate).toFixed(2) : "";
      } else if (name === "costo_clp") {
        updated.costo_usd = value && !isNaN(numVal) && numVal > 0 ? (numVal / rate).toFixed(2) : "";
      } else if (name === "costoPrimariaCLP") {
        updated.costoPrimariaUSD = value && !isNaN(numVal) && numVal > 0 ? (numVal / rate).toFixed(2) : "";
      } else if (name === "costoSecundariaCLP") {
        updated.costoSecundariaUSD = value && !isNaN(numVal) && numVal > 0 ? (numVal / rate).toFixed(2) : "";
      }
      return updated;
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
          costoClp: Number(nuevoPrecioMes.costoClp) || 0,
          costoUsd: Number(nuevoPrecioMes.costoUsd) || 0,
        },
      ],
    }));
    setNuevoPrecioMes({ meses: "", clp: "", usd: "", costoClp: "", costoUsd: "" });
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
        // Validación contra el servidor (no contra la caché local). Si el rol
        // fue modificado recientemente, evita intentar una subida inválida.
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Debes iniciar sesión nuevamente antes de subir una imagen.");
        const serverProfile = await getDoc(doc(db, "users", currentUser.uid), { source: "server" });
        const sRole = String(serverProfile.data()?.role || "").trim().toLowerCase();
        if (!serverProfile.exists() || !["admin", "super_admin", "superadmin"].includes(sRole)) {
          throw new Error("Tu cuenta no tiene el rol administrador activo en el servidor.");
        }
        // Fuerza un token vigente antes de que Storage evalúe el rol del panel.
        // Esto evita fallos 403 cuando la pestaña quedó abierta tras un cambio de permisos.
        const token = await currentUser.getIdToken(true);
        const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID || "pandastoreupdate";
        const claimResponse = await fetch(
          `https://us-central1-${projectId}.cloudfunctions.net/syncAdminStorageClaimHttp`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: "{}",
          }
        );
        if (!claimResponse.ok) {
          const detail = await claimResponse.json().catch(() => ({}));
          throw new Error(detail.error || "No se pudo validar el permiso de subida.");
        }
        await currentUser.getIdToken(true);
        const fileRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
        await uploadBytes(fileRef, imageFile);
        imageUrl = await getDownloadURL(fileRef);
      }
      const numericFields = [
        "stock", "priceCLP", "priceUSD", "costo_clp", "costo_usd",
        "pricePrimariaCLP", "pricePrimariaUSD", "priceSecundariaCLP", "priceSecundariaUSD",
        "costoPrimariaCLP", "costoPrimariaUSD", "costoSecundariaCLP", "costoSecundariaUSD"
      ];
      const data = { ...form, imageUrl, tags };
      numericFields.forEach((field) => {
        if (data[field] !== "" && data[field] !== undefined) data[field] = Number(data[field]) || 0;
      });

      // Protección contra pérdidas (Margen Negativo)
      if (data.costo_clp > 0 && data.priceCLP > 0 && data.priceCLP < data.costo_clp) {
        setMsg(`🚫 No puedes guardar este producto porque estás perdiendo plata con el cliente: El precio ($${data.priceCLP.toLocaleString('es-CL')}) es menor al costo ($${data.costo_clp.toLocaleString('es-CL')}).`);
        setMsgType("error");
        setLoading(false);
        return;
      }
      if (data.costoPrimariaCLP > 0 && data.pricePrimariaCLP > 0 && data.pricePrimariaCLP < data.costoPrimariaCLP) {
        setMsg(`🚫 No puedes guardar este producto porque estás perdiendo plata con la cuenta primaria: El precio ($${data.pricePrimariaCLP.toLocaleString('es-CL')}) es menor al costo ($${data.costoPrimariaCLP.toLocaleString('es-CL')}).`);
        setMsgType("error");
        setLoading(false);
        return;
      }
      if (data.costoSecundariaCLP > 0 && data.priceSecundariaCLP > 0 && data.priceSecundariaCLP < data.costoSecundariaCLP) {
        setMsg(`🚫 No puedes guardar este producto porque estás perdiendo plata con la cuenta secundaria: El precio ($${data.priceSecundariaCLP.toLocaleString('es-CL')}) es menor al costo ($${data.costoSecundariaCLP.toLocaleString('es-CL')}).`);
        setMsgType("error");
        setLoading(false);
        return;
      }
      data.preciosPorMes = (data.preciosPorMes || []).map((price) => ({
        ...price,
        meses: Number(price.meses) || 0,
        clp: Number(price.clp) || 0,
        usd: Number(price.usd) || 0,
        costoClp: Number(price.costoClp) || 0,
        costoUsd: Number(price.costoUsd) || 0,
      }));
      // Estos metadatos permiten al motor B2B reconocer PlayStation,
      // Streaming y Suscripciones aunque la categoría use un ID de Firestore.
      if (esSwitch || esPlayStation || esStreaming || esSuscripcion) {
        data.categoria = categoriaSeleccionada?.name || data.categoria || "";
        data.plataforma = esSwitch ? "Nintendo Switch" : esPlayStation ? categoriaSeleccionada?.name : esStreaming ? "Streaming" : "Suscripciones";
      }
      if (id) {
        await updateDoc(doc(db, "products", id), data);
        setMsg("¡Producto actualizado!"); setMsgType("success");
      } else {
        await addDoc(collection(db, "products"), data);
        setMsg("¡Producto agregado!"); setMsgType("success");
      }
      setTimeout(()=>navigate(-1), 1200);
    } catch (error) {
      console.error("Error al guardar producto:", error);
      const isStoragePermissionError = error?.code === "storage/unauthorized" || error?.code === "storage/unauthenticated";
      const friendlyMessage = isStoragePermissionError
        ? "Firebase Storage rechazó la imagen. Cierra sesión, vuelve a entrar y reintenta; si persiste, copia el código exacto mostrado en consola."
        : (error?.message || "Error al guardar. Intenta de nuevo.");
      setMsg(friendlyMessage); setMsgType("error");
    }
    setLoading(false);
    setTimeout(()=>{ setMsg(""); setMsgType(""); }, 2000);
  };

  if (loading) return <div>Cargando...</div>;
  if (role !== "admin") return <div>No tienes permisos para acceder a esta página.</div>;

  // Detecta la categoría seleccionada
  const categoriaSeleccionada = categorias.find(cat => cat.id === form.categoryId);
  const nombreCat = categoriaSeleccionada ? categoriaSeleccionada.name.toLowerCase() : "";

  const esSwitch = nombreCat.includes("switch");
  const esPlayStation = /ps4|ps5|playstation/.test(nombreCat);
  const esStreaming = nombreCat.includes("streaming");
  const esSuscripcion = nombreCat.includes("suscrip");
  const toggleTag = (tag) => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

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
        
        {/* Banner de Dólar Fijo Centralizado */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(162, 89, 255, 0.12), rgba(97, 0, 255, 0.08))',
          border: '1.5px solid rgba(162, 89, 255, 0.35)',
          borderRadius: 12,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          margin: '4px 0 12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.2rem' }}>💵</span>
            <div>
              <div style={{ fontWeight: 800, color: '#7b2ff2', fontSize: '0.92rem' }}>
                Dólar fijo del sistema: ${rate} CLP
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                Solo ingresa el valor en CLP y la conversión a USD se calcula automáticamente.
              </div>
            </div>
          </div>
          {editingDolar ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number"
                value={dolarInput}
                onChange={e => setDolarInput(e.target.value)}
                style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1.5px solid #7b2ff2', fontSize: '0.9rem' }}
              />
              <button
                type="button"
                onClick={async () => {
                  const n = Number(dolarInput);
                  if (n > 0) {
                    await actualizarValorDolar(n);
                    setEditingDolar(false);
                  }
                }}
                style={{ background: '#7b2ff2', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setEditingDolar(false)}
                style={{ background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setDolarInput(String(rate)); setEditingDolar(true); }}
              style={{ background: 'rgba(123, 47, 242, 0.1)', color: '#7b2ff2', border: '1px solid #7b2ff2', borderRadius: 8, padding: '4px 12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
            >
              ⚙️ Cambiar valor dólar
            </button>
          )}
        </div>

        {esSwitch && (
          <div style={{display:'flex',flexDirection:'column',gap:10,background:'#f3eaff',borderRadius:12,padding:'14px 16px',border:'1.5px solid #a084e844'}}>
            <div style={{fontWeight:800,color:'#7b2ff2',marginBottom:2}}>Compatibilidad</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {[
                { val:'switch1', label:'🎮 Solo Switch 1' },
                { val:'switch2', label:'🎮 Solo Switch 2' },
                { val:'ambas',   label:'🎮 Switch 1 + 2' },
              ].map(opt => (
                <button key={opt.val} type="button"
                  onClick={() => setForm(f => ({ ...f, switchCompat: opt.val }))}
                  style={{
                    padding:'7px 16px', borderRadius:20, fontWeight:700, fontSize:'0.88rem', cursor:'pointer', transition:'all 0.15s',
                    border: form.switchCompat === opt.val ? '2px solid #7b2ff2' : '2px solid #a084e8',
                    background: form.switchCompat === opt.val ? '#7b2ff2' : '#fff',
                    color: form.switchCompat === opt.val ? '#fff' : '#7b2ff2',
                  }}
                >{opt.label}</button>
              ))}
            </div>
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
            <div style={{display:'flex',gap:10}}>
              <input name="costo_clp" type="number" placeholder="Costo proveedor CLP" value={form.costo_clp} onChange={handleChange} min="0" required style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8',fontSize:'1.08rem',flex:1}} />
              <input name="costo_usd" type="number" placeholder="Costo proveedor USD" value={form.costo_usd} onChange={handleChange} min="0" style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8',fontSize:'1.08rem',flex:1}} />
            </div>
            <small style={{color:'#6b21a8'}}>Nintendo Switch usa una sola modalidad: cuenta primaria. El costo se guarda para proteger el margen B2B.</small>
          </div>
        )}

        {/* Tags */}
        <div style={{background:'#f3eaff',borderRadius:12,padding:'14px 16px',border:'1.5px solid #a084e844'}}>
          <div style={{fontWeight:800,color:'#7b2ff2',marginBottom:10}}>Etiquetas</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10}}>
            {AVAILABLE_TAGS.map(tag => (
              <button key={tag} type="button" onClick={()=>toggleTag(tag)} style={{padding:'4px 14px',borderRadius:20,border:tags.includes(tag)?'2px solid #7b2ff2':'2px solid #a084e8',background:tags.includes(tag)?'#7b2ff2':'#fff',color:tags.includes(tag)?'#fff':'#7b2ff2',fontWeight:700,cursor:'pointer',fontSize:'0.86rem',transition:'all 0.15s'}}>{tag}</button>
            ))}
          </div>
          <div style={{display:'flex',gap:8}}>
            <input type="text" placeholder="Etiqueta personalizada..." value={customTag} onChange={e=>setCustomTag(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(customTag.trim()&&!tags.includes(customTag.trim())){setTags(p=>[...p,customTag.trim()]);setCustomTag("");}}}} style={{flex:1,padding:'6px 12px',borderRadius:8,border:'1.5px solid #a084e8',fontSize:'0.95rem'}} />
            <button type="button" onClick={()=>{if(customTag.trim()&&!tags.includes(customTag.trim())){setTags(p=>[...p,customTag.trim()]);setCustomTag("");}}} style={{background:'#a084e8',color:'#fff',fontWeight:700,padding:'6px 16px',border:'none',borderRadius:8,cursor:'pointer'}}>+</button>
          </div>
          {tags.length>0 && (
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:10}}>
              {tags.map(tag=>(
                <span key={tag} style={{background:'#7b2ff2',color:'#fff',padding:'3px 12px',borderRadius:16,fontSize:'0.84rem',fontWeight:700,display:'flex',alignItems:'center',gap:6}}>
                  {tag}
                  <button type="button" onClick={()=>toggleTag(tag)} style={{background:'none',border:'none',color:'#ffffffcc',cursor:'pointer',padding:0,fontSize:'1rem',lineHeight:1,fontWeight:900}}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* PS4/PS5 */}
        {esPlayStation && (
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
            <div style={{display:'grid',gridTemplateColumns:'90px 1fr 1fr',gap:10,alignItems:'center'}}>
              <label style={{fontWeight:600}}>Costo Prim.</label>
              <input name="costoPrimariaCLP" type="number" placeholder="Costo primaria CLP" value={form.costoPrimariaCLP} onChange={handleChange} min="0" style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8'}} />
              <input name="costoPrimariaUSD" type="number" placeholder="Costo primaria USD" value={form.costoPrimariaUSD} onChange={handleChange} min="0" style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8'}} />
              <label style={{fontWeight:600}}>Costo Sec.</label>
              <input name="costoSecundariaCLP" type="number" placeholder="Costo secundaria CLP" value={form.costoSecundariaCLP} onChange={handleChange} min="0" style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8'}} />
              <input name="costoSecundariaUSD" type="number" placeholder="Costo secundaria USD" value={form.costoSecundariaUSD} onChange={handleChange} min="0" style={{padding:10,borderRadius:8,border:'1.5px solid #a084e8'}} />
            </div>
          </>
        )}

        {/* Streaming/Suscripcion */}
        {(esStreaming || esSuscripcion) && (
          <div style={{background:'#f3eaff',borderRadius:10,padding:'12px 10px',marginTop:8}}>
            <h4 style={{color:'#7b2ff2',fontWeight:800,margin:'0 0 8px 0'}}>{esStreaming ? 'Modalidad y precios por meses' : 'Suscripción y precios por meses'}</h4>
            {esStreaming && <select name="modalidadServicio" value={form.modalidadServicio || 'perfil'} onChange={handleChange} style={{padding:8,borderRadius:8,border:'1.5px solid #a084e8',marginBottom:10}}><option value="perfil">Perfil</option><option value="cuenta">Cuenta completa</option><option value="dispositivo">Dispositivo</option></select>}
            {esStreaming && form.modalidadServicio === "dispositivo" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "0 0 10px" }}>
                <span style={{ fontSize: "0.78rem", color: "#5b21b6", fontWeight: 700 }}>Duración por dispositivo:</span>
                {[1, 3].map((months) => (
                  <button
                    key={months}
                    type="button"
                    onClick={() => setNuevoPrecioMes((current) => ({ ...current, meses: String(months) }))}
                    style={{ border: "1px solid #a084e8", background: Number(nuevoPrecioMes.meses) === months ? "#7b2ff2" : "#fff", color: Number(nuevoPrecioMes.meses) === months ? "#fff" : "#5b21b6", borderRadius: 999, padding: "4px 10px", fontWeight: 700, cursor: "pointer", fontSize: "0.76rem" }}
                  >
                    {months} {months === 1 ? "mes" : "meses"}
                  </button>
                ))}
                <span style={{ fontSize: "0.72rem", color: "#7c3aed" }}>Puedes editar meses y precios si necesitas otra duración.</span>
              </div>
            )}
            <p style={{margin:'0 0 8px',fontSize:'0.78rem',color:'#5b21b6'}}>“Cliente” es lo que cobras. “Pagas” es lo que te cobra tu proveedor.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 8 }}>
              <input type="number" placeholder="Meses" value={nuevoPrecioMes.meses} onChange={e => setNuevoPrecioMes({ ...nuevoPrecioMes, meses: e.target.value })} min="1" style={{ minWidth:0, padding:8, borderRadius:8, border:'1.5px solid #a084e8' }} />
              <input type="number" placeholder="Cliente CLP" value={nuevoPrecioMes.clp} onChange={e => { const val = e.target.value; setNuevoPrecioMes(prev => ({ ...prev, clp: val, usd: val && !isNaN(val) ? (Number(val) / rate).toFixed(2) : "" })); }} min="0" style={{ minWidth:0, padding:8, borderRadius:8, border:'1.5px solid #a084e8' }} />
              <input type="number" placeholder="Cliente USD" value={nuevoPrecioMes.usd} onChange={e => setNuevoPrecioMes({ ...nuevoPrecioMes, usd: e.target.value })} min="0" style={{ minWidth:0, padding:8, borderRadius:8, border:'1.5px solid #a084e8' }} />
              <input type="number" placeholder="Pagas CLP" value={nuevoPrecioMes.costoClp} onChange={e => { const val = e.target.value; setNuevoPrecioMes(prev => ({ ...prev, costoClp: val, costoUsd: val && !isNaN(val) ? (Number(val) / rate).toFixed(2) : "" })); }} min="0" style={{ minWidth:0, padding:8, borderRadius:8, border:'1.5px solid #a084e8' }} />
              <input type="number" placeholder="Pagas USD" value={nuevoPrecioMes.costoUsd} onChange={e => setNuevoPrecioMes({ ...nuevoPrecioMes, costoUsd: e.target.value })} min="0" style={{ minWidth:0, padding:8, borderRadius:8, border:'1.5px solid #a084e8' }} />
              <button type="button" onClick={handleAddPrecioMes} style={{background:'#7b2ff2',color:'#fff',fontWeight:700,padding:'8px 10px',border:'none',borderRadius:8,cursor:'pointer'}}>Agregar</button>
            </div>
            <ul style={{margin:0,paddingLeft:18}}>
              {form.preciosPorMes && form.preciosPorMes.map((p, idx) => (
                <li key={idx} style={{marginBottom:4}}>
                  {p.meses} mes(es): venta <b>{p.clp} CLP</b> / <b>{p.usd} USD</b> · costo <b>{p.costoClp || 0} CLP</b> / <b>{p.costoUsd || 0} USD</b>
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
