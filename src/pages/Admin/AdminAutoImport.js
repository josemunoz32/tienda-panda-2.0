import React, { useState, useEffect } from "react";
import { db, storage, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, addDoc, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import steamData from "../../assets/steam_import_data.json";
import "./AdminAutoImport.css";

function normalizeName(name) {
  return (name || '').toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Convert base64 data URL to Blob
function dataURLtoBlob(dataurl) {
  if (!dataurl) return null;
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export default function AdminAutoImport() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [logs, setLogs] = useState([]);
  const [importMode, setImportMode] = useState("steam"); // 'steam' | 'psn' | 'all'
  const [stats, setStats] = useState({ total: steamData.length, added: 0, skipped: 0, errors: 0 });
  const [loadedBatchData, setLoadedBatchData] = useState([]);

  // Carga diferida de batch_import_data.json desde public/
  const fetchBatchData = async () => {
    if (loadedBatchData.length > 0) return loadedBatchData;
    try {
      const res = await fetch("/batch_import_data.json");
      if (res.ok) {
        const data = await res.json();
        setLoadedBatchData(data);
        return data;
      }
    } catch (e) {
      console.warn("No se pudo cargar batch_import_data.json:", e);
    }
    return [];
  };

  const getActiveData = async (mode = importMode) => {
    if (mode === "steam") return steamData;
    const batch = await fetchBatchData();
    if (mode === "psn") return batch;
    return [...steamData, ...batch];
  };

  useEffect(() => {
    getActiveData().then(data => {
      setStats({ total: data.length, added: 0, skipped: 0, errors: 0 });
    });
  }, [importMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoadingCheck(false);
        return;
      }
      try {
        const uDoc = await getDoc(doc(db, "users", user.uid));
        if (uDoc.exists() && uDoc.data().role === "admin") {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error(err);
      }
      setLoadingCheck(false);
    });
    return () => unsubscribe();
  }, []);

  const addLog = (msg, type = "info") => {
    setLogs(prev => [{ msg, type, id: Math.random() }, ...prev]);
  };

  const handleStartImport = async () => {
    if (importing) return;
    const activeData = await getActiveData();
    setImporting(true);
    setLogs([]);
    setStats({ total: activeData.length, added: 0, skipped: 0, errors: 0 });
    addLog(`🚀 Iniciando proceso de importación masiva (${importMode.toUpperCase()}: ${activeData.length} juegos)...`, "info");

    try {
      // 1. Cargar Categorías
      addLog("Obteniendo categorías de Firestore...", "info");
      const catSnap = await getDocs(collection(db, "categories"));
      const categories = [];
      catSnap.forEach(d => categories.push({ id: d.id, ...d.data() }));

      const allData = activeData;
      setStats({ total: allData.length, added: 0, skipped: 0, errors: 0 });

      let ps4CatId = categories.find(c => c.name.toLowerCase().includes('ps4'))?.id;
      let ps5CatId = categories.find(c => c.name.toLowerCase().includes('ps5'))?.id;
      let steamCatId = categories.find(c => c.name.toLowerCase().includes('steam'))?.id;
      if (!ps5CatId && categories.length > 0) ps5CatId = categories[0].id;
      if (!ps4CatId && categories.length > 0) ps4CatId = categories[0].id;
      if (!steamCatId && categories.length > 0) steamCatId = categories[0].id;

      addLog(`Categorías detectadas -> PS5: ${ps5CatId}, PS4: ${ps4CatId}, Steam: ${steamCatId}`, "success");

      // 2. Cargar productos existentes para deduplicación
      addLog("Comprobando catálogo existente para evitar duplicar juegos...", "info");
      const prodSnap = await getDocs(collection(db, "products"));
      const existingNamesSet = new Set();
      prodSnap.forEach(d => {
        const p = d.data();
        if (p.name) existingNamesSet.add(normalizeName(p.name));
      });

      addLog(`Encontrados ${existingNamesSet.size} juegos en catálogo actual.`, "info");

      let added = 0;
      let skipped = 0;
      let errors = 0;

      for (let i = 0; i < allData.length; i++) {
        const item = allData[i];
        const currentNum = i + 1;
        const normName = normalizeName(item.name);
        setProgress(Math.round((currentNum / allData.length) * 100));

        if (existingNamesSet.has(normName)) {
          skipped++;
          setStats(s => ({ ...s, skipped }));
          addLog(`[${currentNum}/${allData.length}] OMITIDO (Ya existe en web): ${item.name}`, "warning");
          continue;
        }

        setStatusMsg(`Procesando (${currentNum}/${allData.length}): ${item.name}`);

        let imageUrl = "";
        if (item.imageBase64) {
          try {
            const blob = dataURLtoBlob(item.imageBase64);
            if (blob) {
              const fileRef = ref(storage, `products/${Date.now()}_${item.sku || 'game'}_cover.jpg`);
              await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
              imageUrl = await getDownloadURL(fileRef);
            }
          } catch (imgErr) {
            addLog(`Error al subir portada para ${item.name}: ${imgErr.message}`, "error");
          }
        }
        if (!imageUrl) {
          imageUrl = item.imageUrl || item.image || (item.app_id ? `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${item.app_id}/header.jpg` : '');
        }

        const platLower = (item.plataforma || '').toLowerCase();
        let targetCatId = ps5CatId;
        if (platLower === 'ps4' && ps4CatId) {
          targetCatId = ps4CatId;
        } else if (platLower === 'steam' && steamCatId) {
          targetCatId = steamCatId;
        }

        const mainCLP = item.pricePrimariaCLP || item.priceSecundariaCLP || "";
        const mainUSD = item.pricePrimariaUSD || item.priceSecundariaUSD || "";
        const cleanName = (item.name || '').replace(/\s*\((?:requiere\s*fix|requiere\s*parche|fix|parche)\)/gi, '').trim();

        const docData = {
          name: cleanName,
          app_id: item.app_id || null,
          description: item.comentario || 'ENTREGA INMEDIATA',
          stock: "1000",
          categoryId: targetCatId,
          imageUrl: imageUrl,
          image: imageUrl,
          priceCLP: mainCLP,
          priceUSD: mainUSD,
          pricePrimariaCLP: item.pricePrimariaCLP || "",
          pricePrimariaUSD: item.pricePrimariaUSD || "",
          priceSecundariaCLP: item.priceSecundariaCLP || "",
          priceSecundariaUSD: item.priceSecundariaUSD || "",
          switchCompat: "ambas",
          preciosPorMes: [],
          tags: [item.genero || "Acción", "Digital"],
          createdAt: new Date().toISOString()
        };

        try {
          await addDoc(collection(db, "products"), docData);
          existingNamesSet.add(normName);
          added++;
          setStats(s => ({ ...s, added }));
          addLog(`[${currentNum}/${allData.length}] ✓ SUBIDO: ${item.name} (Prim: $${item.pricePrimariaCLP || 'N/A'}, Sec: $${item.priceSecundariaCLP || 'N/A'})`, "success");
        } catch (dbErr) {
          errors++;
          setStats(s => ({ ...s, errors }));
          addLog(`[${currentNum}/${allData.length}] ✗ Error guardando en BD: ${item.name}`, "error");
        }
      }

      addLog(`🎉 IMPORTACIÓN FINALIZADA! Total nuevos subidos: ${added}, Omitidos: ${skipped}`, "success");
      setStatusMsg("¡Importación completada con éxito!");

    } catch (err) {
      addLog(`Error general en proceso: ${err.message}`, "error");
    } finally {
      setImporting(false);
    }
  };

  if (loadingCheck) {
    return <div className="autoimport-container"><p>Cargando panel de importación...</p></div>;
  }

  if (!isAdmin) {
    return (
      <div className="autoimport-container">
        <h2>Acceso restringido</h2>
        <p>Inicia sesión como administrador para acceder a esta herramienta.</p>
      </div>
    );
  }

  return (
    <div className="autoimport-container">
      <div className="autoimport-card">
        <h1 className="autoimport-title">📦 Carga Masiva de Productos</h1>
        <p className="autoimport-subtitle">
          Selecciona el origen de productos a importar (Steam o Excel PSN) con stock 1000 y desduplicación automática.
        </p>

        {/* Selector de modo */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: '20px 0 24px' }}>
          <button
            type="button"
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              border: importMode === 'steam' ? '2px solid #00f5d4' : '1px solid rgba(255,255,255,0.15)',
              background: importMode === 'steam' ? 'rgba(0,245,212,0.18)' : 'rgba(255,255,255,0.05)',
              color: importMode === 'steam' ? '#00f5d4' : '#ccc',
              transition: 'all 0.2s'
            }}
            onClick={() => !importing && setImportMode('steam')}
          >
            🎮 SOLO STEAM ({steamData.length} juegos)
          </button>
          <button
            type="button"
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              border: importMode === 'psn' ? '2px solid #a259ff' : '1px solid rgba(255,255,255,0.15)',
              background: importMode === 'psn' ? 'rgba(162,89,255,0.18)' : 'rgba(255,255,255,0.05)',
              color: importMode === 'psn' ? '#a259ff' : '#ccc',
              transition: 'all 0.2s'
            }}
            onClick={() => !importing && setImportMode('psn')}
          >
            🟦 SOLO EXCEL PSN {loadedBatchData.length > 0 ? `(${loadedBatchData.length} juegos)` : ''}
          </button>
          <button
            type="button"
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              border: importMode === 'all' ? '2px solid #ff007f' : '1px solid rgba(255,255,255,0.15)',
              background: importMode === 'all' ? 'rgba(255,0,127,0.18)' : 'rgba(255,255,255,0.05)',
              color: importMode === 'all' ? '#ff007f' : '#ccc',
              transition: 'all 0.2s'
            }}
            onClick={() => !importing && setImportMode('all')}
          >
            ⚡ TODOS {loadedBatchData.length > 0 ? `(${steamData.length + loadedBatchData.length} juegos)` : ''}
          </button>
        </div>

        <div className="autoimport-stats-grid">
          <div className="stat-box">
            <span className="stat-num">{stats.total}</span>
            <span className="stat-label">Total en Lote</span>
          </div>
          <div className="stat-box success">
            <span className="stat-num">{stats.added}</span>
            <span className="stat-label">Nuevos Subidos</span>
          </div>
          <div className="stat-box warning">
            <span className="stat-num">{stats.skipped}</span>
            <span className="stat-label">Omitidos (Existían)</span>
          </div>
          <div className="stat-box danger">
            <span className="stat-num">{stats.errors}</span>
            <span className="stat-label">Errores</span>
          </div>
        </div>

        {importing && (
          <div className="autoimport-progress-wrap">
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="progress-status">{progress}% - {statusMsg}</div>
          </div>
        )}

        <div className="autoimport-actions">
          <button 
            className="autoimport-btn"
            disabled={importing}
            onClick={handleStartImport}
          >
            {importing ? "⏳ Procesando e Importando Juegos..." : "🚀 COMENZAR IMPORTACIÓN MASIVA"}
          </button>
        </div>

        <div className="autoimport-logs-box">
          <h3>📋 Registro de Ejecución en Vivo</h3>
          <div className="logs-feed">
            {logs.length === 0 ? (
              <span className="logs-empty">Haz clic en el botón superior para iniciar el proceso...</span>
            ) : (
              logs.map(l => (
                <div key={l.id} className={`log-item ${l.type}`}>
                  {l.msg}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
