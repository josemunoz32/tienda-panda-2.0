import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { db, auth, storage } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, deleteDoc, doc, getDoc, updateDoc, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Link, useNavigate } from "react-router-dom";
import "./ProductosList.css";

export default function ProductosList() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterPricePreset, setFilterPricePreset] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [categorias, setCategorias] = useState([]);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState([]);

  // Quick Photo Modal state
  const [photoModalProd, setPhotoModalProd] = useState(null);
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Quick Edit Modal state
  const [quickEditProd, setQuickEditProd] = useState(null);
  const [focusField, setFocusField] = useState(null);
  const [quickForm, setQuickForm] = useState({
    name: "",
    categoryId: "",
    imageUrl: "",
    priceCLP: "",
    priceStandardCLP: "",
    pricePrimariaCLP: "",
    priceSecundariaCLP: "",
    stock: "",
    plataforma: "",
  });
  const [savingQuickEdit, setSavingQuickEdit] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const snapshot = await getDocs(collection(db, "products"));
        setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error al cargar productos:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchCategorias = async () => {
      try {
        const snapshot = await getDocs(collection(db, "categories"));
        setCategorias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error al cargar categorías:", err);
      }
    };

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
          fetchProductos();
          fetchCategorias();
        } else {
          setRole("user");
          setLoading(false);
        }
      } catch (err) {
        console.error("Error al verificar admin:", err);
        setRole("user");
        setLoading(false);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "products", id));
      setProductos(productos.filter(p => p.id !== id));
      setSelectedIds(prev => prev.filter(i => i !== id));
      setMsg("Producto eliminado."); setMsgType("success");
    } catch {
      setMsg("Error al eliminar."); setMsgType("error");
    }
    setConfirmDelete(null);
    setTimeout(()=>{ setMsg(""); setMsgType(""); }, 2500);
  };

  // 1-Click Stock Toggle
  const handleToggleStock = async (prod) => {
    const currentStock = Number(prod.stock || 0);
    const newStock = currentStock > 0 ? 0 : 10;
    try {
      await updateDoc(doc(db, "products", prod.id), { stock: newStock });
      setProductos(prev => prev.map(p => p.id === prod.id ? { ...p, stock: newStock } : p));
      setMsg(`Stock de "${prod.name}" a ${newStock > 0 ? 'En Stock (10)' : 'Agotado (0)'}`);
      setMsgType("success");
    } catch (e) {
      setMsg("Error al actualizar stock");
      setMsgType("error");
    }
    setTimeout(()=>{ setMsg(""); setMsgType(""); }, 2000);
  };

  // Duplicate Product
  const handleDuplicateProduct = async (prod) => {
    try {
      // eslint-disable-next-line no-unused-vars
      const { id, ...copyData } = prod;
      copyData.name = `${prod.name || 'Producto'} (Copia)`;
      copyData.createdAt = new Date().toISOString();

      const docRef = await addDoc(collection(db, "products"), copyData);
      const newProduct = { id: docRef.id, ...copyData };
      setProductos(prev => [newProduct, ...prev]);
      setMsg(`📋 Producto duplicado: "${newProduct.name}"`);
      setMsgType("success");
    } catch (err) {
      setMsg("Error al duplicar producto");
      setMsgType("error");
    }
    setTimeout(()=>{ setMsg(""); setMsgType(""); }, 2500);
  };

  // Open Quick Edit Modal
  const openQuickEdit = (prod, fieldToFocus = null) => {
    setQuickEditProd(prod);
    setFocusField(fieldToFocus);
    setQuickForm({
      name: prod.name || "",
      categoryId: prod.categoryId || "",
      imageUrl: prod.imageUrl || "",
      priceCLP: prod.priceCLP ?? "",
      pricePrimariaCLP: prod.pricePrimariaCLP ?? "",
      priceSecundariaCLP: prod.priceSecundariaCLP ?? "",
      stock: prod.stock ?? "",
      plataforma: prod.plataforma || prod.platform || "",
    });
  };

  // Save Quick Edit Modal
  const handleSaveQuickEdit = async (e) => {
    e.preventDefault();
    if (!quickEditProd) return;
    setSavingQuickEdit(true);

    const updatedData = {
      name: quickForm.name,
      categoryId: quickForm.categoryId,
      imageUrl: quickForm.imageUrl,
      stock: quickForm.stock === "" ? 0 : Number(quickForm.stock),
      plataforma: quickForm.plataforma,
    };
    
    updatedData.priceCLP = quickForm.priceCLP !== "" ? Number(quickForm.priceCLP) : null;
    updatedData.pricePrimariaCLP = quickForm.pricePrimariaCLP !== "" ? Number(quickForm.pricePrimariaCLP) : null;
    updatedData.priceSecundariaCLP = quickForm.priceSecundariaCLP !== "" ? Number(quickForm.priceSecundariaCLP) : null;

    try {
      await updateDoc(doc(db, "products", quickEditProd.id), updatedData);
      setProductos(prev => prev.map(p => p.id === quickEditProd.id ? { ...p, ...updatedData } : p));
      setMsg("⚡ Producto actualizado ultra-rápido");
      setMsgType("success");
      setQuickEditProd(null);
    } catch (err) {
      setMsg("Error al guardar edición rápida");
      setMsgType("error");
    } finally {
      setSavingQuickEdit(false);
      setTimeout(()=>{ setMsg(""); setMsgType(""); }, 2500);
    }
  };

  // Open Quick Photo Swap Modal
  const openPhotoModal = (prod) => {
    setPhotoModalProd(prod);
    setPhotoUrlInput(prod.imageUrl || "");
    setPhotoPreview(prod.imageUrl || "");
    setPhotoFile(null);
  };

  // Handle Photo File Pick
  const handlePhotoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Handle Paste Clipboard URL
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith("http://") || text.startsWith("https://") || text.startsWith("data:image"))) {
        setPhotoUrlInput(text.trim());
        setPhotoPreview(text.trim());
        setPhotoFile(null);
        setMsg("📋 ¡URL de foto pegada del portapapeles!");
        setMsgType("success");
      } else {
        setMsg("El portapapeles no contiene un enlace de imagen válido.");
        setMsgType("error");
      }
    } catch {
      setMsg("Pega el enlace directamente en el campo de texto.");
      setMsgType("error");
    }
    setTimeout(() => { setMsg(""); setMsgType(""); }, 2200);
  };

  // Save Photo Swap
  const handleSavePhoto = async (e) => {
    if (e) e.preventDefault();
    if (!photoModalProd) return;
    setUploadingPhoto(true);

    try {
      let finalUrl = photoUrlInput.trim();
      if (photoFile) {
        await auth.currentUser?.getIdToken(true);
        const fileRef = ref(storage, `products/${Date.now()}_${photoFile.name}`);
        await uploadBytes(fileRef, photoFile);
        finalUrl = await getDownloadURL(fileRef);
      }

      await updateDoc(doc(db, "products", photoModalProd.id), { imageUrl: finalUrl });
      setProductos(prev => prev.map(p => p.id === photoModalProd.id ? { ...p, imageUrl: finalUrl } : p));
      setMsg(`📸 ¡Foto de "${photoModalProd.name}" actualizada al instante!`);
      setMsgType("success");
      setPhotoModalProd(null);
    } catch (err) {
      setMsg("Error al guardar la nueva foto.");
      setMsgType("error");
    } finally {
      setUploadingPhoto(false);
      setTimeout(() => { setMsg(""); setMsgType(""); }, 2500);
    }
  };

  // Bulk Actions
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelectId = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkSetStock = async (newStock) => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map(id => updateDoc(doc(db, "products", id), { stock: newStock })));
      setProductos(prev => prev.map(p => selectedIds.includes(p.id) ? { ...p, stock: newStock } : p));
      setMsg(`⚡ ${selectedIds.length} productos actualizados a Stock = ${newStock}`);
      setMsgType("success");
      setSelectedIds([]);
    } catch (e) {
      setMsg("Error en actualización masiva de stock");
      setMsgType("error");
    }
    setTimeout(()=>{ setMsg(""); setMsgType(""); }, 2500);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`¿Seguro que deseas eliminar ${selectedIds.length} productos seleccionados?`)) return;
    try {
      await Promise.all(selectedIds.map(id => deleteDoc(doc(db, "products", id))));
      setProductos(prev => prev.filter(p => !selectedIds.includes(p.id)));
      setMsg(`🗑️ ${selectedIds.length} productos eliminados`);
      setMsgType("success");
      setSelectedIds([]);
    } catch (e) {
      setMsg("Error al eliminar productos seleccionados");
      setMsgType("error");
    }
    setTimeout(()=>{ setMsg(""); setMsgType(""); }, 2500);
  };

  if (loading) return <div style={{ color: '#fff', textAlign: 'center', padding: '50px', fontSize: '1.2rem' }}>Cargando catálogo admin...</div>;
  if (role !== "admin") return <div style={{ color: '#fff', textAlign: 'center', padding: '50px' }}>No tienes permisos de administrador.</div>;

  const getCatName = (catId) => {
    const cat = categorias.find(c => c.id === catId);
    return cat ? cat.name : "-";
  };

  // Helper missing price checks
  const isPlaystation = (p) => {
    if (!p) return false;
    const plat = (p.plataforma || p.platform || "").toLowerCase();
    const catName = getCatName(p.categoryId).toLowerCase();
    const name = (p.name || "").toLowerCase();
    const tags = Array.isArray(p.tags) ? p.tags.join(" ").toLowerCase() : "";
    const hasPSMention = plat.includes("ps") || plat.includes("playstation") ||
                         catName.includes("ps") || catName.includes("playstation") ||
                         name.includes("ps4") || name.includes("ps5") ||
                         tags.includes("ps4") || tags.includes("ps5");
    const hasAccountPrices = Boolean((p.pricePrimariaCLP && Number(p.pricePrimariaCLP) > 0) || (p.priceSecundariaCLP && Number(p.priceSecundariaCLP) > 0));
    return hasPSMention || hasAccountPrices;
  };

  const hasPri = (p) => Boolean(p && p.pricePrimariaCLP && Number(p.pricePrimariaCLP) > 0);
  const hasSec = (p) => Boolean(p && p.priceSecundariaCLP && Number(p.priceSecundariaCLP) > 0);
  const hasStd = (p) => Boolean(p && p.priceCLP && Number(p.priceCLP) > 0);

  const lacksSecundaria = (p) => {
    if (!p) return false;
    if (hasSec(p)) return false;
    if (hasPri(p)) return true;
    if (isPlaystation(p) && (hasStd(p) || hasPri(p))) return true;
    return false;
  };

  const lacksPrimaria = (p) => {
    if (!p) return false;
    if (hasPri(p)) return false;
    if (hasSec(p)) return true;
    if (isPlaystation(p) && (hasStd(p) || hasSec(p))) return true;
    return false;
  };

  const lacksAllPrices = (p) => {
    if (!p) return true;
    const hasMeses = Array.isArray(p.preciosPorMes) && p.preciosPorMes.some(m => m.clp || m.usd);
    return !hasStd(p) && !hasPri(p) && !hasSec(p) && !hasMeses;
  };

  const isDenuvo = (p) => Boolean(p && (p.isDenuvoActivation || (Array.isArray(p.tags) && p.tags.includes("Denuvo"))));

  // Stats Counters
  const countTotal = productos.length;
  const countDenuvo = productos.filter(isDenuvo).length;
  const countFaltaSec = productos.filter(lacksSecundaria).length;
  const countFaltaPri = productos.filter(lacksPrimaria).length;
  const countSinPrecio = productos.filter(lacksAllPrices).length;
  const countOutStock = productos.filter(p => Number(p.stock || 0) <= 0).length;
  const countInStock = productos.filter(p => Number(p.stock || 0) > 0).length;

  // Filtered List
  const filteredProducts = productos.filter(prod => {
    const catName = getCatName(prod.categoryId);
    const matchesCat = !filterCat || 
      prod.categoryId === filterCat || 
      (Array.isArray(prod.categoryIds) && prod.categoryIds.includes(filterCat)) ||
      (prod.categoria && String(prod.categoria).toLowerCase() === filterCat.toLowerCase()) ||
      (catName && catName.toLowerCase() === filterCat.toLowerCase());

    const matchesSearch = !search || 
      prod.name?.toLowerCase().includes(search.toLowerCase()) || 
      prod.plataforma?.toLowerCase().includes(search.toLowerCase()) ||
      catName.toLowerCase().includes(search.toLowerCase()) ||
      (isDenuvo(prod) && search.toLowerCase().includes("denuvo"));
    
    let matchesPreset = true;
    if (filterPricePreset === "denuvo") matchesPreset = isDenuvo(prod);
    else if (filterPricePreset === "faltaSecundaria") matchesPreset = lacksSecundaria(prod);
    else if (filterPricePreset === "faltaPrimaria") matchesPreset = lacksPrimaria(prod);
    else if (filterPricePreset === "sinPrecio") matchesPreset = lacksAllPrices(prod);
    else if (filterPricePreset === "inStock") matchesPreset = Number(prod.stock || 0) > 0;
    else if (filterPricePreset === "outStock") matchesPreset = Number(prod.stock || 0) <= 0;

    return matchesCat && matchesSearch && matchesPreset;
  });

  return (
    <div className="adm-prod-container">
      {/* Header */}
      <div className="adm-prod-header">
        <h2 className="adm-prod-title">
          <span className="material-icons">inventory_2</span>
          Gestión de Productos
        </h2>
        <div className="adm-prod-actions">
          <Link to="/producto/nuevo" className="adm-btn-add">
            <span className="material-icons">add_circle</span>
            Nuevo Producto
          </Link>
        </div>
      </div>

      {/* Stats Summary Cards Bar */}
      <div className="adm-stats-grid">
        <div
          className={`adm-stat-card ${filterPricePreset === 'all' ? 'active' : ''}`}
          onClick={() => setFilterPricePreset('all')}
        >
          <div className="adm-stat-value">{countTotal}</div>
          <div className="adm-stat-label">Todos los Productos</div>
        </div>

        <div
          className={`adm-stat-card ${filterPricePreset === 'denuvo' ? 'active' : ''}`}
          onClick={() => setFilterPricePreset('denuvo')}
          style={{ border: filterPricePreset === 'denuvo' ? '2px solid #a855f7' : '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.12)' }}
          title="Ver todos los juegos de Steam que cuentan con activación VIP"
        >
          <div className="adm-stat-value" style={{ color: '#c084fc' }}>{countDenuvo}</div>
          <div className="adm-stat-label" style={{ color: '#e9d5ff', fontWeight: 'bold' }}>🔑 Activación VIP</div>
        </div>

        <div
          className={`adm-stat-card warning-sec ${filterPricePreset === 'faltaSecundaria' ? 'active' : ''}`}
          onClick={() => setFilterPricePreset('faltaSecundaria')}
          title="Ver productos de PlayStation que no tienen precio de cuenta Secundaria"
        >
          <div className="adm-stat-value">{countFaltaSec}</div>
          <div className="adm-stat-label">⚠️ Falta Secundaria</div>
        </div>

        <div
          className={`adm-stat-card warning-pri ${filterPricePreset === 'faltaPrimaria' ? 'active' : ''}`}
          onClick={() => setFilterPricePreset('faltaPrimaria')}
          title="Ver productos de PlayStation que no tienen precio de cuenta Primaria"
        >
          <div className="adm-stat-value">{countFaltaPri}</div>
          <div className="adm-stat-label">⚠️ Falta Primaria</div>
        </div>

        <div
          className={`adm-stat-card danger-noprice ${filterPricePreset === 'sinPrecio' ? 'active' : ''}`}
          onClick={() => setFilterPricePreset('sinPrecio')}
        >
          <div className="adm-stat-value">{countSinPrecio}</div>
          <div className="adm-stat-label">🚫 Sin Precio</div>
        </div>

        <div
          className={`adm-stat-card stock-out ${filterPricePreset === 'outStock' ? 'active' : ''}`}
          onClick={() => setFilterPricePreset('outStock')}
        >
          <div className="adm-stat-value">{countOutStock}</div>
          <div className="adm-stat-label">❌ Agotados</div>
        </div>

        <div
          className={`adm-stat-card stock-in ${filterPricePreset === 'inStock' ? 'active' : ''}`}
          onClick={() => setFilterPricePreset('inStock')}
        >
          <div className="adm-stat-value">{countInStock}</div>
          <div className="adm-stat-label">✅ En Stock</div>
        </div>
      </div>

      {/* Center Screen Modal Alert (Portal to document.body so it pops up in the dead center of the screen above everything!) */}
      {msg && createPortal(
        <div className="adm-center-alert-overlay" onClick={() => setMsg("")}>
          <div className={`adm-center-alert-card ${msgType === 'success' ? 'success' : 'error'}`} onClick={e => e.stopPropagation()}>
            <div className="adm-center-alert-icon">
              {msgType === 'success' ? '🎉' : '⚠️'}
            </div>
            <div className="adm-center-alert-text">{msg}</div>
            <button className="adm-center-alert-btn" onClick={() => setMsg("")}>
              Entendido
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="adm-bulk-bar">
          <div className="adm-bulk-count">
            ⚡ {selectedIds.length} producto(s) seleccionado(s)
          </div>
          <div className="adm-bulk-buttons">
            <button onClick={() => handleBulkSetStock(10)} className="adm-btn-bulk">
              ✅ Poner en Stock (10)
            </button>
            <button onClick={() => handleBulkSetStock(0)} className="adm-btn-bulk">
              ❌ Marcar Agotados (0)
            </button>
            <button onClick={handleBulkDelete} className="adm-btn-bulk danger">
              🗑️ Eliminar Seleccionados
            </button>
          </div>
        </div>
      )}

      {/* Toolbar / Filters */}
      <div className="adm-prod-toolbar">
        <input
          type="text"
          placeholder="🔍 Buscar por nombre o plataforma..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="adm-search-input"
        />

        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="adm-select-filter"
        >
          <option value="">Todas las categorías</option>
          {categorias.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <select
          value={filterPricePreset}
          onChange={e => setFilterPricePreset(e.target.value)}
          className="adm-select-filter"
        >
          <option value="all">🔍 Todos los estados de precio</option>
          <option value="faltaSecundaria">⚠️ Falta Precio Secundaria</option>
          <option value="faltaPrimaria">⚠️ Falta Precio Primaria</option>
          <option value="sinPrecio">🚫 Sin Precio Registrado</option>
          <option value="inStock">✅ En Stock</option>
          <option value="outStock">❌ Agotados</option>
        </select>
      </div>

      {/* Desktop Table View */}
      <div className="adm-table-wrapper">
        <table className="adm-table">
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th>Imagen</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precios & Faltantes</th>
              <th>Stock</th>
              <th>Plataforma</th>
              <th style={{ textAlign: 'right' }}>Acciones Rápida</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(prod => {
              const inStock = Number(prod.stock || 0) > 0;
              const missingSec = lacksSecundaria(prod);
              const missingPri = lacksPrimaria(prod);
              const missingNone = lacksAllPrices(prod);
              const isSelected = selectedIds.includes(prod.id);

              return (
                <tr key={prod.id} style={{ background: isSelected ? 'rgba(162, 89, 255, 0.08)' : undefined }}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectId(prod.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div 
                      className="adm-img-thumb-container"
                      onClick={() => openPhotoModal(prod)}
                      title="⚡ Clic para cambiar foto rápida"
                    >
                      {prod.imageUrl ? (
                        <img src={prod.imageUrl} alt={prod.name} className="adm-prod-img" />
                      ) : (
                        <div className="adm-no-img-box">🖼️</div>
                      )}
                      <div className="adm-img-hover-overlay">
                        <span className="material-icons" style={{ fontSize: '0.9rem' }}>photo_camera</span>
                        <span>Foto</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {prod.name}
                      {isDenuvo(prod) && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            padding: '2px 7px',
                            borderRadius: '6px',
                            background: 'rgba(168,85,247,0.2)',
                            color: '#c084fc',
                            border: '1px solid #a855f7',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title="Este juego cuenta con activación VIP garantizada"
                        >
                          🔑 Activación VIP
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{ color: '#a259ff', fontWeight: 600, fontSize: '0.85rem' }}>{getCatName(prod.categoryId)}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                      {prod.priceCLP ? <div>Standard: <strong>${Number(prod.priceCLP).toLocaleString('es-CL')}</strong></div> : null}
                      {prod.pricePrimariaCLP ? <div>Primaria: <strong>${Number(prod.pricePrimariaCLP).toLocaleString('es-CL')}</strong></div> : null}
                      {prod.priceSecundariaCLP ? <div>Secundaria: <strong>${Number(prod.priceSecundariaCLP).toLocaleString('es-CL')}</strong></div> : null}
                      
                      {missingSec && (
                        <button className="adm-missing-tag missing-sec" onClick={() => openQuickEdit(prod, 'priceSecundariaCLP')}>
                          ⚠️ + Agregar Secundaria
                        </button>
                      )}
                      {missingPri && (
                        <button className="adm-missing-tag missing-pri" onClick={() => openQuickEdit(prod, 'pricePrimariaCLP')}>
                          ⚠️ + Agregar Primaria
                        </button>
                      )}
                      {missingNone && (
                        <button className="adm-missing-tag missing-none" onClick={() => openQuickEdit(prod, 'priceCLP')}>
                          🚫 Sin precio (+ Clic aquí)
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <button
                      className={`adm-badge-stock ${inStock ? 'in-stock' : 'out-stock'}`}
                      onClick={() => handleToggleStock(prod)}
                      title="Clic para cambiar stock de 0 a 10"
                    >
                      {inStock ? `✅ En Stock (${prod.stock})` : `❌ Agotado (0)`}
                    </button>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: 6 }}>
                      {prod.plataforma || prod.platform || 'General'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => openPhotoModal(prod)}
                      className="adm-btn-quickphoto"
                      title="Cambiar foto rápidamente"
                    >
                      <span className="material-icons" style={{ fontSize: '0.9rem' }}>photo_camera</span>
                      Foto
                    </button>

                    <button
                      onClick={() => openQuickEdit(prod)}
                      className="adm-btn-quickedit"
                      title="Edición ultra rápida"
                    >
                      <span className="material-icons" style={{ fontSize: '0.9rem' }}>bolt</span>
                      Rápida
                    </button>

                    <button
                      onClick={() => handleDuplicateProduct(prod)}
                      className="adm-btn-duplicate"
                      title="Duplicar producto"
                    >
                      📋 Duplicar
                    </button>

                    <Link to={`/producto/editar/${prod.id}`} className="adm-btn-fulledit" title="Editar completo">
                      <span className="material-icons" style={{ fontSize: '0.9rem' }}>edit</span>
                    </Link>

                    <button onClick={() => setConfirmDelete(prod.id)} className="adm-btn-delete">
                      <span className="material-icons" style={{ fontSize: '0.9rem' }}>delete</span>
                    </button>

                    {confirmDelete === prod.id && (
                      <div style={{
                        position: 'absolute',
                        background: '#18142c',
                        border: '1px solid #ff4d4f',
                        borderRadius: 12,
                        padding: '12px 18px',
                        zIndex: 10,
                        boxShadow: '0 8px 30px #0009',
                        right: 20
                      }}>
                        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.9rem' }}>¿Eliminar producto?</div>
                        <button onClick={() => handleDelete(prod.id)} style={{ background: '#ff4d4f', color: '#fff', fontWeight: 700, padding: '5px 12px', border: 'none', borderRadius: 6, marginRight: 6, cursor: 'pointer' }}>Eliminar</button>
                        <button onClick={() => setConfirmDelete(null)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, padding: '5px 12px', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cancelar</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#888', padding: 30 }}>
                  No se encontraron productos con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View (< 768px) */}
      <div className="adm-cards-grid">
        {filteredProducts.map(prod => {
          const inStock = Number(prod.stock || 0) > 0;
          const missingSec = lacksSecundaria(prod);
          const missingPri = lacksPrimaria(prod);

          return (
            <div key={prod.id} className="adm-prod-card">
              <div className="adm-card-top">
                <div 
                  className="adm-img-thumb-container"
                  onClick={() => openPhotoModal(prod)}
                  title="⚡ Clic para cambiar foto rápida"
                >
                  {prod.imageUrl ? (
                    <img src={prod.imageUrl} alt={prod.name} className="adm-prod-img" />
                  ) : (
                    <div className="adm-no-img-box">🖼️</div>
                  )}
                  <div className="adm-img-hover-overlay">
                    <span className="material-icons" style={{ fontSize: '0.8rem' }}>photo_camera</span>
                  </div>
                </div>

                <div className="adm-card-details">
                  <div className="adm-card-title">{prod.name}</div>
                  <div className="adm-card-category">{getCatName(prod.categoryId)}</div>
                </div>
              </div>

              <div className="adm-card-prices">
                {prod.priceCLP ? <span>Std: <strong>${Number(prod.priceCLP).toLocaleString('es-CL')}</strong></span> : null}
                {prod.pricePrimariaCLP ? <span>Prim: <strong>${Number(prod.pricePrimariaCLP).toLocaleString('es-CL')}</strong></span> : null}
                {prod.priceSecundariaCLP ? <span>Sec: <strong>${Number(prod.priceSecundariaCLP).toLocaleString('es-CL')}</strong></span> : null}
              </div>

              {missingSec && (
                <button className="adm-missing-tag missing-sec" onClick={() => openQuickEdit(prod, 'priceSecundariaCLP')}>
                  ⚠️ + Agregar Secundaria
                </button>
              )}
              {missingPri && (
                <button className="adm-missing-tag missing-pri" onClick={() => openQuickEdit(prod, 'pricePrimariaCLP')}>
                  ⚠️ + Agregar Primaria
                </button>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  className={`adm-badge-stock ${inStock ? 'in-stock' : 'out-stock'}`}
                  onClick={() => handleToggleStock(prod)}
                >
                  {inStock ? `Stock: ${prod.stock}` : `Agotado`}
                </button>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                  {prod.plataforma || 'General'}
                </span>
              </div>

              <div className="adm-card-actions">
                <button onClick={() => openPhotoModal(prod)} className="adm-btn-quickphoto">
                  📸 Foto
                </button>
                <button onClick={() => openQuickEdit(prod)} className="adm-btn-quickedit">
                  ⚡ Rápida
                </button>
                <button onClick={() => handleDuplicateProduct(prod)} className="adm-btn-duplicate">
                  📋 Duplicar
                </button>
                <Link to={`/producto/editar/${prod.id}`} className="adm-btn-fulledit">
                  ✏️ Editar
                </Link>
                <button onClick={() => handleDelete(prod.id)} className="adm-btn-delete">
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* QUICK PHOTO MODAL (Portal to document.body so it pops up in the dead center of the viewport!) */}
      {photoModalProd && createPortal(
        <div className="adm-modal-overlay" onClick={() => setPhotoModalProd(null)}>
          <div className="adm-modal-content adm-photo-modal-content" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <div className="adm-modal-title">
                📸 Cambiar Foto Rápida: {photoModalProd.name}
              </div>
              <button className="adm-modal-close" onClick={() => setPhotoModalProd(null)}>&times;</button>
            </div>

            <form onSubmit={handleSavePhoto} className="adm-photo-form">
              {/* Preview */}
              <div className="adm-photo-preview-wrap">
                {photoPreview ? (
                  <img src={photoPreview} alt="Vista previa" className="adm-photo-preview-img" />
                ) : (
                  <div className="adm-photo-preview-empty">
                    <span className="material-icons" style={{ fontSize: '2.5rem', color: 'rgba(255,255,255,0.3)' }}>hide_image</span>
                    <span>Sin vista previa</span>
                  </div>
                )}
              </div>

              {/* URL & File Options */}
              <div className="adm-photo-inputs">
                <div className="adm-form-group">
                  <label className="adm-form-label">🔗 Pegar Enlace (URL) de Imagen</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={photoUrlInput}
                      onChange={e => {
                        setPhotoUrlInput(e.target.value);
                        setPhotoPreview(e.target.value);
                        setPhotoFile(null);
                      }}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      className="adm-form-input"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="adm-btn-paste"
                      onClick={handlePasteClipboard}
                      title="Pegar enlace del portapapeles"
                    >
                      📋 Pegar
                    </button>
                  </div>
                </div>

                <div className="adm-photo-divider">O SUBIR DESDE TU EQUIPO</div>

                <div className="adm-form-group">
                  <label className="adm-btn-upload-file">
                    📁 Seleccionar archivo de imagen...
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {photoFile && (
                    <div style={{ fontSize: '0.8rem', color: '#00e676', fontWeight: 600, marginTop: 4 }}>
                      📄 Archivo listo: {photoFile.name}
                    </div>
                  )}
                </div>
              </div>

              <div className="adm-modal-footer full-width" style={{ marginTop: 20 }}>
                <button type="button" className="adm-btn-cancel" onClick={() => setPhotoModalProd(null)}>
                  Cancelar
                </button>
                <button type="submit" className="adm-btn-save" disabled={uploadingPhoto}>
                  {uploadingPhoto ? "Guardando Foto..." : "💾 Guardar Nueva Foto"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* QUICK EDIT MODAL (Portal to document.body so it pops up in the dead center of the viewport!) */}
      {quickEditProd && createPortal(
        <div className="adm-modal-overlay" onClick={() => setQuickEditProd(null)}>
          <div className="adm-modal-content" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <div className="adm-modal-title">
                ⚡ Edición Rápida: {quickEditProd.name}
              </div>
              <button className="adm-modal-close" onClick={() => setQuickEditProd(null)}>&times;</button>
            </div>

            <form onSubmit={handleSaveQuickEdit} className="adm-form-grid">
              <div className="adm-form-group full-width">
                <label className="adm-form-label">Nombre del Producto</label>
                <input
                  type="text"
                  value={quickForm.name}
                  onChange={e => setQuickForm({ ...quickForm, name: e.target.value })}
                  className="adm-form-input"
                  required
                />
              </div>

              <div className="adm-form-group full-width">
                <label className="adm-form-label">URL de Imagen del Producto</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={quickForm.imageUrl}
                    onChange={e => setQuickForm({ ...quickForm, imageUrl: e.target.value })}
                    className="adm-form-input"
                    placeholder="https://..."
                    style={{ flex: 1 }}
                  />
                  {quickForm.imageUrl && (
                    <img src={quickForm.imageUrl} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)' }} />
                  )}
                </div>
              </div>

              <div className="adm-form-group">
                <label className="adm-form-label">Categoría</label>
                <select
                  value={quickForm.categoryId}
                  onChange={e => setQuickForm({ ...quickForm, categoryId: e.target.value })}
                  className="adm-form-select"
                >
                  <option value="">Selecciona categoría</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="adm-form-group">
                <label className="adm-form-label">Stock Actual</label>
                <input
                  type="number"
                  value={quickForm.stock}
                  onChange={e => setQuickForm({ ...quickForm, stock: e.target.value })}
                  className="adm-form-input"
                  placeholder="ej. 10"
                />
              </div>

              <div className="adm-form-group">
                <label className="adm-form-label">Plataforma (ej. PS5, PS4, Switch)</label>
                <input
                  type="text"
                  value={quickForm.plataforma}
                  onChange={e => setQuickForm({ ...quickForm, plataforma: e.target.value })}
                  className="adm-form-input"
                  placeholder="ej. PS4, PS5"
                />
              </div>

              <div className="adm-form-group">
                <label className="adm-form-label">Precio Standard (CLP)</label>
                <input
                  type="number"
                  value={quickForm.priceCLP}
                  onChange={e => setQuickForm({ ...quickForm, priceCLP: e.target.value })}
                  className="adm-form-input"
                  placeholder="ej. 25000"
                  autoFocus={focusField === 'priceCLP'}
                />
              </div>

              <div className="adm-form-group">
                <label className="adm-form-label">
                  Precio Primaria (CLP) {lacksPrimaria(quickEditProd) && <span style={{ color: '#ff8a65' }}>⚠️ FALTANTE</span>}
                </label>
                <input
                  type="number"
                  value={quickForm.pricePrimariaCLP}
                  onChange={e => setQuickForm({ ...quickForm, pricePrimariaCLP: e.target.value })}
                  className="adm-form-input"
                  placeholder="ej. 32990"
                  autoFocus={focusField === 'pricePrimariaCLP'}
                />
              </div>

              <div className="adm-form-group">
                <label className="adm-form-label">
                  Precio Secundaria (CLP) {lacksSecundaria(quickEditProd) && <span style={{ color: '#ffb74d' }}>⚠️ FALTANTE</span>}
                </label>
                <input
                  type="number"
                  value={quickForm.priceSecundariaCLP}
                  onChange={e => setQuickForm({ ...quickForm, priceSecundariaCLP: e.target.value })}
                  className="adm-form-input"
                  placeholder="ej. 22990"
                  autoFocus={focusField === 'priceSecundariaCLP'}
                />
              </div>

              <div className="adm-modal-footer full-width">
                <button type="button" className="adm-btn-cancel" onClick={() => setQuickEditProd(null)}>
                  Cancelar
                </button>
                <button type="submit" className="adm-btn-save" disabled={savingQuickEdit}>
                  {savingQuickEdit ? "Guardando..." : "💾 Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
