import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  Timestamp,
  query,
  orderBy
} from "firebase/firestore";
import "./AdminArmarPack.css";
import { isOnlineOnlySteamProduct } from "../../utils/steamCatalogCache";

function formatCLP(n) {
  if (!n || isNaN(n)) return "$0 CLP";
  return `$${Number(n).toLocaleString("es-CL")} CLP`;
}

export default function AdminArmarPack() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchGame, setSearchGame] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedGames, setSelectedGames] = useState([]);
  
  const [titulo, setTitulo] = useState("");
  const [precioCLP, setPrecioCLP] = useState("");
  const [precioUSD, setPrecioUSD] = useState("");
  const [descripcion, setDescripcion] = useState("");
  
  const [customPacks, setCustomPacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Cargar productos y categorías
  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      try {
        const prodSnap = await getDocs(collection(db, "products"));
        const prods = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProducts(prods);

        const catSnap = await getDocs(collection(db, "categories"));
        setCategories(catSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error al cargar datos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    fetchCustomPacks();
  }, []);

  // Cargar packs creados anteriormente
  const fetchCustomPacks = async () => {
    try {
      const q = query(collection(db, "customPacks"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setCustomPacks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      try {
        const snap = await getDocs(collection(db, "customPacks"));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setCustomPacks(list);
      } catch (err) {
        console.error("Error al obtener packs:", err);
      }
    }
  };

  // Filtrar catálogo de juegos
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (isOnlineOnlySteamProduct(p)) return false;
      const isDenuvo = Boolean(p && (p.isDenuvoActivation || (Array.isArray(p.tags) && p.tags.includes("Denuvo"))));
      if (categoryFilter === "denuvo") {
        if (!isDenuvo) return false;
      } else if (categoryFilter !== "all" && p.categoryId !== categoryFilter) {
        return false;
      }

      if (searchGame.trim()) {
        const queryStr = searchGame.toLowerCase();
        const matchesName = (p.name || "").toLowerCase().includes(queryStr);
        const matchesDenuvo = isDenuvo && queryStr.includes("denuvo");
        return matchesName || matchesDenuvo;
      }
      return true;
    });
  }, [products, categoryFilter, searchGame]);

  // Agregar juego al pack
  const handleAddGame = (game) => {
    if (selectedGames.find((g) => g.id === game.id)) return;
    const newSelected = [...selectedGames, game];
    setSelectedGames(newSelected);
    
    // Auto-generar sugerencia de título si está vacío
    if (!titulo || titulo.startsWith("Pack de")) {
      const names = newSelected.map(g => g.name).join(" + ");
      setTitulo(`Pack de ${newSelected.length} Juegos: ${names.slice(0, 50)}${names.length > 50 ? '...' : ''}`);
    }
  };

  // Quitar juego del pack
  const handleRemoveGame = (id) => {
    const newSelected = selectedGames.filter((g) => g.id !== id);
    setSelectedGames(newSelected);
  };

  // Guardar pack y generar link
  const handleGeneratePack = async (e) => {
    e.preventDefault();
    if (selectedGames.length === 0) {
      alert("Por favor selecciona al menos 1 juego para armar el pack.");
      return;
    }
    if (!titulo.trim()) {
      alert("Por favor ingresa un título para el pack.");
      return;
    }
    if (!precioCLP || Number(precioCLP) <= 0) {
      alert("Por favor ingresa un precio válido en CLP.");
      return;
    }

    setSaving(true);
    try {
      const packData = {
        titulo: titulo.trim(),
        precio_clp: Number(precioCLP),
        precio_usd: precioUSD ? Number(precioUSD) : Math.round((Number(precioCLP) / 900) * 100) / 100,
        descripcion: descripcion.trim(),
        juegos: selectedGames.map((g) => {
          let aid = g.app_id || g.appId || null;
          if (!aid && g.id) {
            const m = String(g.id).match(/^(?:ryuu_|vip-|promo-steam-)?(\d+)$/);
            if (m) aid = m[1];
          }
          return {
            id: g.id,
            name: g.name || "",
            app_id: aid,
            appId: aid,
            imageUrl: g.imageUrl || g.image || "",
            platform: g.platform || g.category || ""
          };
        }),
        createdAt: Timestamp.now(),
        activo: true
      };

      const docRef = await addDoc(collection(db, "customPacks"), packData);
      const fullUrl = `${window.location.origin}/pack/${docRef.id}`;
      setGeneratedLink({
        id: docRef.id,
        url: fullUrl,
        titulo: packData.titulo,
        precio_clp: packData.precio_clp
      });

      // Reset campos de creación
      setSelectedGames([]);
      setTitulo("");
      setPrecioCLP("");
      setPrecioUSD("");
      setDescripcion("");

      fetchCustomPacks();
    } catch (err) {
      console.error("Error al guardar el pack:", err);
      alert("Ocurrió un error al guardar el pack. Inténtalo nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  // Copiar link al portapapeles
  const handleCopyLink = (url, packId) => {
    navigator.clipboard.writeText(url);
    setCopiedId(packId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Eliminar pack
  const handleDeletePack = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este pack personalizado? El link dejará de funcionar.")) return;
    try {
      await deleteDoc(doc(db, "customPacks", id));
      fetchCustomPacks();
    } catch (err) {
      console.error("Error al eliminar pack:", err);
    }
  };

  return (
    <div className="aap-container">
      {/* Banner / Header */}
      <div className="aap-header">
        <div className="aap-header-title">
          <span className="aap-header-icon">🎁</span>
          <div>
            <h1>Armar Pack Personalizado de Promociones</h1>
            <p>Selecciona juegos del catálogo, define el precio total y envía un link directo al cliente para que pague.</p>
          </div>
        </div>
      </div>

      {/* Modal de Link Generado Éxitosamente */}
      {generatedLink && (
        <div className="aap-modal-overlay">
          <div className="aap-modal-card">
            <button className="aap-modal-close" onClick={() => setGeneratedLink(null)}>✕</button>
            <div className="aap-modal-badge">🎉 ¡Pack Creado Éxitosamente!</div>
            <h3>{generatedLink.titulo}</h3>
            <div className="aap-modal-price">{formatCLP(generatedLink.precio_clp)}</div>
            
            <div className="aap-link-box">
              <input type="text" readOnly value={generatedLink.url} />
              <button
                className="aap-btn-copy"
                onClick={() => handleCopyLink(generatedLink.url, generatedLink.id)}
              >
                {copiedId === generatedLink.id ? "¡Copiado! ✓" : "Copiar Link"}
              </button>
            </div>

            <div className="aap-share-buttons">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `🎮 ¡Hola! Aquí tienes el link para tu pack personalizado *${generatedLink.titulo}* por ${formatCLP(generatedLink.precio_clp)}:\n\n👉 ${generatedLink.url}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="aap-share-btn aap-share-wa"
              >
                🟢 Enviar por WhatsApp
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(generatedLink.url)}&text=${encodeURIComponent(
                  `🎮 Pack personalizado: ${generatedLink.titulo} por ${formatCLP(generatedLink.precio_clp)}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="aap-share-btn aap-share-tg"
              >
                🔵 Enviar por Telegram
              </a>
              <a
                href={generatedLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="aap-share-btn aap-share-preview"
              >
                👁️ Ver Vista Previa
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="aap-grid">
        {/* Columna Izquierda: Buscador y Catálogo de Juegos */}
        <div className="aap-card aap-catalog-section">
          <h2>1. Seleccionar Juegos ({selectedGames.length} seleccionados)</h2>
          
          <div className="aap-filters">
            <input
              type="text"
              placeholder="🔍 Buscar juego por nombre..."
              value={searchGame}
              onChange={(e) => setSearchGame(e.target.value)}
              className="aap-input-search"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="aap-select-cat"
            >
              <option value="all">Todas las Categorías</option>
              <option value="denuvo">🔑 Juegos con Activación VIP</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="aap-loading">Cargando catálogo...</div>
          ) : (
            <div className="aap-products-list">
              {filteredProducts.slice(0, 40).map((prod) => {
                const isSelected = selectedGames.some((g) => g.id === prod.id);
                return (
                  <div key={prod.id} className={`aap-prod-item ${isSelected ? "selected" : ""}`}>
                    <img src={prod.imageUrl || prod.image || "/logo.png"} alt={prod.name} />
                    <div className="aap-prod-info">
                      <span className="aap-prod-name" style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                        {prod.name}
                        {(prod.isDenuvoActivation || (Array.isArray(prod.tags) && prod.tags.includes("Denuvo"))) && (
                          <span style={{ fontSize: '10px', background: 'rgba(168,85,247,0.2)', color: '#c084fc', border: '1px solid #a855f7', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                            🔑 Activación VIP
                          </span>
                        )}
                      </span>
                      <span className="aap-prod-price">
                        {prod.priceCLP ? formatCLP(prod.priceCLP) : "Sin precio"}
                      </span>
                    </div>
                    <button
                      className={`aap-btn-add ${isSelected ? "added" : ""}`}
                      onClick={() => (isSelected ? handleRemoveGame(prod.id) : handleAddGame(prod))}
                    >
                      {isSelected ? "✔ Quitar" : "+ Agregar"}
                    </button>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="aap-empty">No se encontraron juegos con esa búsqueda.</div>
              )}
            </div>
          )}
        </div>

        {/* Columna Derecha: Configuración y Vista Previa del Pack */}
        <div className="aap-card aap-builder-section">
          <h2>2. Configurar Detalle y Precio del Pack</h2>

          {selectedGames.length === 0 ? (
            <div className="aap-placeholder">
              <span className="aap-placeholder-icon">🕹️</span>
              <p>Selecciona juegos a la izquierda para armar el pack.</p>
            </div>
          ) : (
            <div className="aap-selected-games">
              <h3>Juegos incluidos:</h3>
              <div className="aap-selected-tags">
                {selectedGames.map((g) => (
                  <div key={g.id} className="aap-tag">
                    <img src={g.imageUrl || g.image || "/logo.png"} alt={g.name} />
                    <span>{g.name}</span>
                    <button onClick={() => handleRemoveGame(g.id)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleGeneratePack} className="aap-form">
            <div className="aap-field">
              <label>Título / Nombre del Pack *</label>
              <input
                type="text"
                placeholder="Ej: Pack Especial 3 Juegos - Para Juan"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
            </div>

            <div className="aap-form-row">
              <div className="aap-field">
                <label>Precio Total CLP ($) *</label>
                <input
                  type="number"
                  placeholder="Ej: 35000"
                  value={precioCLP}
                  onChange={(e) => setPrecioCLP(e.target.value)}
                  required
                />
              </div>

              <div className="aap-field">
                <label>Precio USD ($) (Opcional)</label>
                <input
                  type="number"
                  placeholder={precioCLP ? `${(Number(precioCLP) / 900).toFixed(2)}` : "Ej: 38.88"}
                  value={precioUSD}
                  onChange={(e) => setPrecioUSD(e.target.value)}
                />
              </div>
            </div>

            <div className="aap-field">
              <label>Nota o Descripción para el Cliente (Opcional)</label>
              <textarea
                placeholder="Ej: Pack armado exclusivamente para ti con precio especial. Válido por 24 horas."
                rows="2"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>

            <button type="submit" className="aap-btn-generate" disabled={saving || selectedGames.length === 0}>
              {saving ? "Generando Link..." : "⚡ Guardar y Generar Link del Pack"}
            </button>
          </form>
        </div>
      </div>

      {/* Historial de Packs Generados */}
      <div className="aap-card aap-history-section">
        <h2>Packs Armados Recientemente ({customPacks.length})</h2>
        {customPacks.length === 0 ? (
          <div className="aap-empty">Aún no has generado packs personalizados.</div>
        ) : (
          <div className="aap-history-list">
            {customPacks.map((pack) => {
              const fullUrl = `${window.location.origin}/pack/${pack.id}`;
              const isCopied = copiedId === pack.id;
              return (
                <div key={pack.id} className="aap-history-item">
                  <div className="aap-history-main">
                    <span className="aap-history-title">{pack.titulo}</span>
                    <div className="aap-history-games">
                      🎮 {(pack.juegos || []).map((j) => j.name).join(", ")}
                    </div>
                  </div>

                  <div className="aap-history-price">
                    {formatCLP(pack.precio_clp)}
                  </div>

                  <div className="aap-history-actions">
                    <button
                      className="aap-btn-action aap-btn-copy-sm"
                      onClick={() => handleCopyLink(fullUrl, pack.id)}
                    >
                      {isCopied ? "¡Copiado! ✓" : "📋 Copiar Link"}
                    </button>
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `🎮 ¡Hola! Aquí tienes el link para tu pack personalizado *${pack.titulo}* por ${formatCLP(pack.precio_clp)}:\n\n👉 ${fullUrl}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aap-btn-action aap-btn-wa-sm"
                    >
                      🟢 WhatsApp
                    </a>
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aap-btn-action aap-btn-view-sm"
                    >
                      👁️ Ver
                    </a>
                    <button
                      className="aap-btn-action aap-btn-delete-sm"
                      onClick={() => handleDeletePack(pack.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
