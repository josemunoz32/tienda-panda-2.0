import React, { useEffect, useState, useMemo } from "react";
import DataTable6 from "../../components/DataTable6/DataTable6";
import { useNavigate, Link } from "react-router-dom";
import { collection, collectionGroup, getDocs, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import pandaGamerAvatar from "../../assets/logos/miicono.png";
import "./AdminResenas.css";

export default function AdminResenas({ user, role }) {
  const [resenas, setResenas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResena, setSelectedResena] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (role === undefined) return;
    if (!user || role !== "admin") {
      navigate("/home");
      return;
    }

    const fetchResenas = async () => {
      setLoading(true);
      setError("");
      const allList = [];

      // 1. Reseñas reales de testimonios enviadas por clientes (con fotos y avatares)
      try {
        const snapTesti = await getDocs(collection(db, "testimonios_reviews"));
        snapTesti.docs.forEach(d => {
          const data = d.data();
          allList.push({
            id: d.id,
            ...data,
            ref: d.ref,
            origen: "testimonio",
            origenLabel: "⭐ Testimonios Web",
            categoria: data.categoria || null,
            productoId: data.juego || "Testimonio Web",
            userName: data.nombre || "Cliente Verificado",
            userEmail: data.userEmail || (data.isGuest ? "Invitado (Sin login)" : "Usuario Registrado"),
            userAvatar: data.userAvatar || null,
            comment: data.comentario || "",
            foto: data.foto || null,
            date: data.createdAt ? new Date(data.createdAt) : null,
            visible: data.visible === true
          });
        });
      } catch (e) {
        console.warn("Error cargando testimonios_reviews:", e);
      }

      // 2. Reseñas individuales de productos
      try {
        const snapProd = await getDocs(collectionGroup(db, "reviews"));
        snapProd.docs.forEach(d => {
          const data = d.data();
          allList.push({
            id: d.id,
            ...data,
            ref: d.ref,
            origen: "producto",
            origenLabel: "📦 Ficha Producto",
            productoId: d.ref.parent?.parent ? d.ref.parent.parent.id : (data.productId || "desconocido"),
            userName: data.userName || data.nombre || "Cliente",
            userEmail: data.userEmail || "Anónimo",
            userAvatar: data.userAvatar || null,
            comment: data.comment || data.comentario || data.texto || "",
            foto: data.foto || null,
            date: data.date?.toDate ? data.date.toDate() : (data.createdAt ? new Date(data.createdAt) : null),
            visible: data.visible === true
          });
        });
      } catch (e) {
        console.warn("Error cargando reviews individuales:", e);
      }

      // Ordenar por fecha más reciente primero
      allList.sort((a, b) => {
        const tA = a.date ? a.date.getTime() : 0;
        const tB = b.date ? b.date.getTime() : 0;
        return tB - tA;
      });

      setResenas(allList);
      if (allList.length > 0 && !selectedResena) {
        setSelectedResena(allList[0]);
      }
      setLoading(false);
    };

    fetchResenas();
  }, [user, role, navigate]);

  const eliminarResena = async (item) => {
    if (!window.confirm("¿Seguro que deseas eliminar definitivamente esta reseña?")) return;
    try {
      await deleteDoc(item.ref);
      setSuccess("Reseña eliminada con éxito");
      const filtered = resenas.filter(r => r.id !== item.id);
      setResenas(filtered);
      setSelectedResena(filtered[0] || null);
    } catch (e) {
      setError("Error al eliminar reseña");
    }
  };

  const toggleVisible = async (item) => {
    try {
      const newVisible = item.visible !== true;
      await updateDoc(item.ref, { visible: newVisible });
      setSuccess(`Reseña ahora está ${newVisible ? "PUBLICADA y visible al público en la tienda" : "OCULTA (en revisión)"}`);
      const updated = resenas.map(r => r.id === item.id ? { ...r, visible: newVisible } : r);
      setResenas(updated);
      if (selectedResena?.id === item.id) {
        setSelectedResena(prev => ({ ...prev, visible: newVisible }));
      }
    } catch (e) {
      setError("Error al actualizar visibilidad");
    }
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Columnas DataTable 6 ──
  const columns = useMemo(() => [
    {
      key: "origen",
      label: "Sección",
      sortable: true,
      align: "center",
      render: (r) => (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 8,
            background: r.origen === "testimonio" ? "rgba(243,87,168,0.15)" : "rgba(162,89,255,0.15)",
            color: r.origen === "testimonio" ? "#f472b6" : "#c084fc",
            border: `1px solid ${r.origen === "testimonio" ? "rgba(243,87,168,0.3)" : "rgba(162,89,255,0.3)"}`
          }}
        >
          {r.origen === "testimonio" ? "⭐ Testimonios" : "📦 Producto"}
        </span>
      )
    },
    {
      key: "user",
      label: "Cliente / Autor",
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", border: "1.5px solid #a259ff", flexShrink: 0, background: "#1c1335" }}>
            {r.userAvatar ? (
              <img src={r.userAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <img src={pandaGamerAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#fff" }}>
              {r.userName || "Cliente"}
            </div>
            <div style={{ fontSize: 11, color: "#a78bfa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {r.userEmail}
            </div>
          </div>
        </div>
      )
    },
    {
      key: "productoId",
      label: "Juego / Producto",
      sortable: true,
      render: (r) => (
        <div className="res-prod-cell">
          {r.categoria && (
            <span style={{ fontSize: 10, background: "rgba(168,85,247,0.2)", color: "#d8b4fe", border: "1px solid rgba(168,85,247,0.4)", padding: "2px 6px", borderRadius: 6, fontWeight: 700, marginRight: 5, whiteSpace: "nowrap" }}>
              {r.categoria}
            </span>
          )}
          <span className="res-prod-name" title={r.productoId}>{r.productoId}</span>
        </div>
      )
    },
    {
      key: "rating",
      label: "Calificación",
      sortable: true,
      align: "center",
      render: (r) => {
        const rating = Number(r.rating || r.stars || 5);
        return (
          <div className="res-stars-cell">
            <span className="res-stars-gold">{"★".repeat(Math.min(5, Math.max(1, rating)))}</span>
            <span className="res-rating-num">{rating}/5</span>
          </div>
        );
      }
    },
    {
      key: "foto",
      label: "Captura",
      align: "center",
      render: (r) => (
        r.foto ? (
          <span style={{ fontSize: 11, background: "rgba(0,245,212,0.15)", color: "#00f5d4", border: "1px solid rgba(0,245,212,0.3)", padding: "2px 7px", borderRadius: 8, fontWeight: 700 }}>
            📸 Con Foto
          </span>
        ) : (
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>—</span>
        )
      )
    },
    {
      key: "visible",
      label: "Estado",
      sortable: true,
      align: "center",
      render: (r) => {
        const isVisible = r.visible === true;
        return (
          <span className={`dt6-chip ${isVisible ? "dt6-chip-active" : "dt6-chip-warning"}`}>
            {isVisible ? "🟢 Publicada" : "🟡 Pendiente"}
          </span>
        );
      }
    },
    {
      key: "actions",
      label: "Moderación",
      align: "center",
      render: (r) => {
        const isVisible = r.visible === true;
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleVisible(r); }}
            style={{
              background: isVisible ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.2)",
              border: `1px solid ${isVisible ? "rgba(245,158,11,0.4)" : "rgba(16,185,129,0.5)"}`,
              color: isVisible ? "#fbbf24" : "#34d399",
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4
            }}
          >
            <span className="material-icons" style={{ fontSize: 13 }}>
              {isVisible ? "visibility_off" : "check_circle"}
            </span>
            {isVisible ? "Ocultar" : "Aprobar y Publicar"}
          </button>
        );
      }
    }
  ], []);

  // ── Filtros ──
  const filterOptions = useMemo(() => [
    { key: "all", label: "Todas", icon: "⭐", count: resenas.length, filterFn: () => true },
    {
      key: "testimonios",
      label: "Testimonios Web",
      icon: "🌐",
      count: resenas.filter(r => r.origen === "testimonio").length,
      filterFn: r => r.origen === "testimonio"
    },
    {
      key: "productos",
      label: "Fichas de Juegos",
      icon: "📦",
      count: resenas.filter(r => r.origen === "producto").length,
      filterFn: r => r.origen === "producto"
    },
    {
      key: "visible",
      label: "Publicadas",
      icon: "🟢",
      count: resenas.filter(r => r.visible === true).length,
      filterFn: r => r.visible === true
    },
    {
      key: "hidden",
      label: "Pendientes / Ocultas",
      icon: "🟡",
      count: resenas.filter(r => r.visible !== true).length,
      filterFn: r => r.visible !== true
    },
    {
      key: "conFoto",
      label: "Con Fotos",
      icon: "📸",
      count: resenas.filter(r => Boolean(r.foto)).length,
      filterFn: r => Boolean(r.foto)
    }
  ], [resenas]);

  // ── Renderer de Detalle Sincronizado ──
  const renderDetailPanel = (r) => {
    const isVisible = r.visible === true;
    const commentText = r.comment || r.comentario || r.texto || r.text || "Sin comentario escrito.";
    const rating = Number(r.rating || r.stars || 5);

    return (
      <div className="res-detail-wrap">
        {/* Hero Card */}
        <div className="res-hero-card">
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", border: "2px solid #a259ff", background: "#1c1335", flexShrink: 0 }}>
              {r.userAvatar ? (
                <img src={r.userAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <img src={pandaGamerAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
            <div>
              <h3 className="res-hero-author" style={{ margin: 0 }}>{r.userName || "Cliente Verificado"}</h3>
              <div style={{ fontSize: 12, color: "#c4b5fd" }}>{r.userEmail}</div>
              <span style={{ fontSize: 11, color: "#00f5d4", fontWeight: 700 }}>
                {r.origen === "testimonio" ? "⭐ Testimonio de la Web" : "📦 Reseña de Producto"}
              </span>
            </div>
          </div>

          <div className="res-hero-stars">
            {"★".repeat(Math.min(5, Math.max(1, rating)))}
          </div>
          <div className="res-hero-meta">
            <span className={`dt6-chip ${isVisible ? "dt6-chip-active" : "dt6-chip-warning"}`}>
              {isVisible ? "🟢 Publicada en la Web" : "🟡 Pendiente de Moderación"}
            </span>
          </div>
        </div>

        {/* Notificaciones */}
        {error && <div className="cup-alert cup-alert-error">⚠️ {error}</div>}
        {success && <div className="cup-alert cup-alert-success">✅ {success}</div>}

        {/* Quick Actions */}
        <div className="dt6-actions-row" style={{ marginTop: 6, marginBottom: 14 }}>
          <button
            className={`dt6-btn-secondary ${isVisible ? "" : "active"}`}
            onClick={() => toggleVisible(r)}
            style={{
              background: isVisible ? "rgba(245,158,11,0.2)" : "linear-gradient(90deg, #10b981, #059669)",
              color: isVisible ? "#fbbf24" : "#ffffff",
              borderColor: isVisible ? "rgba(245,158,11,0.5)" : "#10b981",
              fontWeight: 800
            }}
            title={isVisible ? "Ocultar de la tienda" : "Aprobar y hacer pública en la tienda"}
          >
            <span className="material-icons" style={{ fontSize: 16 }}>
              {isVisible ? "visibility_off" : "check_circle"}
            </span>
            {isVisible ? "Ocultar de la Tienda" : "Aprobar y Publicar"}
          </button>

          <button
            className="dt6-btn-secondary"
            onClick={() => handleCopyText(commentText)}
            title="Copiar texto de la reseña"
          >
            <span className="material-icons" style={{ fontSize: 16 }}>content_copy</span>
            {copied ? "¡Copiado!" : "Copiar"}
          </button>

          {r.origen === "producto" && (
            <Link
              to={`/producto/${r.productoId}`}
              className="dt6-btn-secondary"
              style={{ textDecoration: "none" }}
              title="Ver ficha del producto"
            >
              <span className="material-icons" style={{ fontSize: 16 }}>launch</span>
              Ver Juego
            </Link>
          )}

          {r.origen === "testimonio" && (
            <Link
              to="/testimonios"
              className="dt6-btn-secondary"
              style={{ textDecoration: "none" }}
              title="Ver en la página de testimonios"
            >
              <span className="material-icons" style={{ fontSize: 16 }}>open_in_new</span>
              Ver en Testimonios
            </Link>
          )}

          <button
            className="dt6-btn-danger"
            onClick={() => eliminarResena(r)}
            title="Eliminar permanentemente"
          >
            <span className="material-icons" style={{ fontSize: 16 }}>delete</span>
            Eliminar
          </button>
        </div>

        {/* Texto Completo de la Reseña */}
        <div className="dt6-detail-section">
          <div className="dt6-detail-section-title">
            <span className="material-icons" style={{ fontSize: 15 }}>rate_review</span>
            Opinión del Comprador
          </div>
          <div className="res-comment-blockquote">
            <p>"{commentText}"</p>
          </div>
        </div>

        {/* Captura enviada por el cliente si subió foto */}
        {r.foto && (
          <div className="dt6-detail-section">
            <div className="dt6-detail-section-title">
              <span className="material-icons" style={{ fontSize: 15 }}>photo_camera</span>
              Captura del Juego adjuntada por el cliente
            </div>
            <div style={{ marginTop: 10, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.15)" }}>
              <a href={r.foto} target="_blank" rel="noreferrer" title="Abrir imagen completa">
                <img
                  src={r.foto}
                  alt="Captura cliente"
                  style={{ width: "100%", maxHeight: 280, objectFit: "cover", display: "block" }}
                />
              </a>
            </div>
          </div>
        )}

        {/* Metadatos y Producto */}
        <div className="dt6-detail-section">
          <div className="dt6-detail-section-title">
            <span className="material-icons" style={{ fontSize: 15 }}>info</span>
            Detalles del Registro
          </div>
          <div className="dt6-properties-grid">
            <div className="dt6-property-row">
              <span className="dt6-property-key">Tipo de Reseña:</span>
              <span className="dt6-property-val">{r.origenLabel}</span>
            </div>
            {r.categoria && (
              <div className="dt6-property-row">
                <span className="dt6-property-key">Categoría:</span>
                <span className="dt6-property-val" style={{ color: "#d8b4fe", fontWeight: 700 }}>{r.categoria}</span>
              </div>
            )}
            <div className="dt6-property-row">
              <span className="dt6-property-key">Juego / Título:</span>
              <span className="dt6-property-val">{r.productoId}</span>
            </div>
            <div className="dt6-property-row">
              <span className="dt6-property-key">ID de Documento:</span>
              <span className="dt6-property-val" style={{ fontFamily: "monospace" }}>{r.id}</span>
            </div>
            <div className="dt6-property-row">
              <span className="dt6-property-key">Fecha:</span>
              <span className="dt6-property-val">
                {r.date ? r.date.toLocaleString("es-CL") : "-"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-resenas-page">
      <DataTable6
        data={resenas}
        columns={columns}
        idKey="id"
        title="Moderación de Reseñas"
        subtitle="Monitorea, aprueba u oculta las reseñas y fotos enviadas por los clientes en la tienda y en la página de testimonios"
        searchPlaceholder="Buscar por cliente, juego o comentario..."
        filterOptions={filterOptions}
        renderDetail={renderDetailPanel}
        selectedItem={selectedResena}
        onSelectItem={(r) => {
          setSelectedResena(r);
          setError("");
          setSuccess("");
        }}
        badgeText="MODERACIÓN PANDA"
        emptyMessage="No se encontraron reseñas registradas"
      />
    </div>
  );
}
