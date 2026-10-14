import React, { useEffect, useState, useMemo } from "react";
import DataTable6 from "../../components/DataTable6/DataTable6";
import { Link, useNavigate } from "react-router-dom";
import {
  collectionGroup,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import "./AdminPreguntas.css";

export default function AdminPreguntas({ user, role }) {
  const [preguntas, setPreguntas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPregunta, setSelectedPregunta] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [isEditingAnswer, setIsEditingAnswer] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (role === undefined) return;
    if (!user || role !== "admin") {
      navigate("/home");
      return;
    }

    const fetchPreguntas = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collectionGroup(db, "questions"));
        const productCache = {};
        const arr = [];

        for (const docu of snap.docs) {
          const data = docu.data();
          const productId = docu.ref.parent.parent ? docu.ref.parent.parent.id : (data.productId || "unknown");

          if (!productCache[productId]) {
            try {
              const prodSnap = await getDoc(doc(db, "products", productId));
              productCache[productId] = prodSnap.exists()
                ? (prodSnap.data().name || "Sin nombre")
                : "Producto PandaStore";
            } catch {
              productCache[productId] = "Producto PandaStore";
            }
          }

          arr.push({
            id: docu.id,
            ...data,
            ref: docu.ref,
            productId,
            productName: productCache[productId],
          });
        }

        // Orden: pendientes primero, luego por fecha desc
        arr.sort((a, b) => {
          if (!a.answer && b.answer) return -1;
          if (a.answer && !b.answer) return 1;
          return (b.date || "").localeCompare(a.date || "");
        });

        setPreguntas(arr);
        if (arr.length > 0 && !selectedPregunta) {
          setSelectedPregunta(arr[0]);
          setResponseText(arr[0].answer || "");
        }
      } catch (e) {
        setError("Error al cargar preguntas");
      }
      setLoading(false);
    };

    fetchPreguntas();
  }, [user, role, navigate]);

  const handleSelectPregunta = (p) => {
    setSelectedPregunta(p);
    setResponseText(p?.answer || "");
    setIsEditingAnswer(false);
    setError("");
    setSuccess("");
  };

  const handleResponder = async (pregunta) => {
    const texto = responseText.trim();
    if (!texto) {
      setError("Por favor escribe una respuesta");
      return;
    }

    try {
      const answeredAt = new Date().toISOString();
      await setDoc(
        pregunta.ref,
        { answer: texto, answeredAt },
        { merge: true }
      );

      const updated = preguntas.map((p) =>
        p.id === pregunta.id ? { ...p, answer: texto, answeredAt } : p
      );

      setPreguntas(updated);
      setSelectedPregunta((prev) => ({ ...prev, answer: texto, answeredAt }));
      setSuccess("¡Respuesta enviada y publicada para los clientes!");
      setIsEditingAnswer(false);
    } catch {
      setError("Error al responder la pregunta");
    }
  };

  const handleEliminar = async (pregunta) => {
    if (!window.confirm("¿Seguro que deseas eliminar definitivamente esta pregunta?")) return;
    try {
      await deleteDoc(pregunta.ref);
      setSuccess("Pregunta eliminada con éxito");
      const filtered = preguntas.filter((p) => p.id !== pregunta.id);
      setPreguntas(filtered);
      setSelectedPregunta(filtered[0] || null);
    } catch {
      setError("Error al eliminar la pregunta");
    }
  };

  // ── Columnas DataTable 6 ──
  const columns = useMemo(() => [
    {
      key: "productName",
      label: "Producto / Videojuego",
      sortable: true,
      render: (p) => (
        <div className="pre-prod-cell">
          <span className="pre-game-icon">🎮</span>
          <span className="pre-prod-name" title={p.productName}>{p.productName}</span>
        </div>
      )
    },
    {
      key: "userName",
      label: "Cliente",
      render: (p) => (
        <div className="pre-user-cell">
          <strong>{p.userName || "Cliente Panda"}</strong>
          <span className="pre-user-sub">{p.userEmail || "Anónimo"}</span>
        </div>
      )
    },
    {
      key: "text",
      label: "Pregunta",
      render: (p) => (
        <div className="pre-question-snippet" title={p.text}>
          "{p.text}"
        </div>
      )
    },
    {
      key: "answer",
      label: "Estado",
      sortable: true,
      align: "center",
      render: (p) => (
        <span className={`dt6-chip ${p.answer ? "dt6-chip-active" : "dt6-chip-warning"}`}>
          {p.answer ? "✅ Respondida" : "⏳ Pendiente"}
        </span>
      )
    },
    {
      key: "date",
      label: "Fecha",
      sortable: true,
      render: (p) => {
        if (!p.date) return "-";
        const d = new Date(p.date);
        if (isNaN(d.getTime())) return String(p.date);
        return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
      }
    }
  ], []);

  // ── Filtros ──
  const filterOptions = useMemo(() => [
    { key: "all", label: "Todas", icon: "📋", count: preguntas.length, filterFn: () => true },
    {
      key: "pending",
      label: "Pendientes",
      icon: "⏳",
      count: preguntas.filter((p) => !p.answer).length,
      filterFn: (p) => !p.answer
    },
    {
      key: "answered",
      label: "Respondidas",
      icon: "✅",
      count: preguntas.filter((p) => p.answer).length,
      filterFn: (p) => !!p.answer
    }
  ], [preguntas]);

  // ── Renderer de Detalle Sincronizado ──
  const renderDetailPanel = (p) => {
    const isAnswered = Boolean(p.answer);

    return (
      <div className="pre-detail-wrap">
        {/* Hero Card */}
        <div className="pre-hero-card">
          <div className="pre-hero-badge-row">
            <span className={`dt6-chip ${isAnswered ? "dt6-chip-active" : "dt6-chip-warning"}`}>
              {isAnswered ? "✅ Pregunta Respondida" : "⏳ Requiere Respuesta"}
            </span>
            <span className="pre-hero-date">
              {p.date ? new Date(p.date).toLocaleString("es-CL") : ""}
            </span>
          </div>
          <h3 className="pre-hero-prod-title">{p.productName}</h3>
          <span className="pre-hero-user">
            Preguntado por: <strong>{p.userName || "Cliente"}</strong> ({p.userEmail || "Anónimo"})
          </span>
        </div>

        {/* Notificaciones */}
        {error && <div className="cup-alert cup-alert-error">⚠️ {error}</div>}
        {success && <div className="cup-alert cup-alert-success">✅ {success}</div>}

        {/* Quick Actions */}
        <div className="dt6-actions-row" style={{ marginTop: 6, marginBottom: 14 }}>
          <Link
            to={`/producto/${p.productId}`}
            className="dt6-btn-secondary"
            style={{ textDecoration: "none" }}
            title="Ver producto en la tienda"
          >
            <span className="material-icons" style={{ fontSize: 16 }}>launch</span>
            Ver Producto
          </Link>

          {isAnswered && (
            <button
              className="dt6-btn-secondary"
              onClick={() => setIsEditingAnswer(!isEditingAnswer)}
            >
              <span className="material-icons" style={{ fontSize: 16 }}>edit</span>
              {isEditingAnswer ? "Cancelar" : "Editar Respuesta"}
            </button>
          )}

          <button
            className="dt6-btn-danger"
            onClick={() => handleEliminar(p)}
            title="Eliminar pregunta"
          >
            <span className="material-icons" style={{ fontSize: 16 }}>delete</span>
          </button>
        </div>

        {/* Pregunta del Cliente */}
        <div className="dt6-detail-section">
          <div className="dt6-detail-section-title">
            <span className="material-icons" style={{ fontSize: 15 }}>help</span>
            Consulta del Cliente
          </div>
          <div className="pre-quote-box">
            <p>"{p.text}"</p>
          </div>
        </div>

        {/* Sección de Respuesta */}
        <div className="dt6-detail-section">
          <div className="dt6-detail-section-title">
            <span className="material-icons" style={{ fontSize: 15 }}>question_answer</span>
            Respuesta Oficial PandaStore
          </div>

          {isAnswered && !isEditingAnswer ? (
            <div className="pre-answer-box">
              <div className="pre-answer-meta">
                <span>🛡️ Respuesta del Equipo:</span>
                <small>{p.answeredAt ? new Date(p.answeredAt).toLocaleString("es-CL") : ""}</small>
              </div>
              <p>{p.answer}</p>
            </div>
          ) : (
            <div className="pre-reply-form">
              {/* Plantillas Rápidas */}
              <div className="pre-templates-row">
                <span className="pre-tpl-lbl">Plantillas rápidas:</span>
                <button
                  type="button"
                  className="pre-tpl-btn"
                  onClick={() => setResponseText("¡Hola! Sí, incluye activación inmediata, garantía permanente y soporte 24/7.")}
                >
                  Garantía & Entrega
                </button>
                <button
                  type="button"
                  className="pre-tpl-btn"
                  onClick={() => setResponseText("¡Hola! Es 100% compatible y cuenta con todas las actualizaciones oficiales.")}
                >
                  Compatibilidad
                </button>
              </div>

              <textarea
                className="pre-reply-textarea"
                rows={4}
                placeholder="Escribe aquí la respuesta oficial que se mostrará en la ficha del producto..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
              />

              <div className="dt6-actions-row">
                <button
                  type="button"
                  className="dt6-btn-primary"
                  onClick={() => handleResponder(p)}
                >
                  <span className="material-icons" style={{ fontSize: 16 }}>send</span>
                  {isAnswered ? "Guardar Respuesta" : "Publicar Respuesta"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="admin-preguntas-page">
      <DataTable6
        data={preguntas}
        columns={columns}
        idKey="id"
        title="Gestión de Preguntas"
        subtitle="Responde consultas de clientes con plantillas rápidas y sincronización en tiempo real con las fichas de producto"
        searchPlaceholder="Buscar por producto, cliente o consulta..."
        filterOptions={filterOptions}
        renderDetail={renderDetailPanel}
        selectedItem={selectedPregunta}
        onSelectItem={handleSelectPregunta}
        badgeText="DATA TABLE 6"
        emptyMessage="No se encontraron preguntas en este filtro"
      />
    </div>
  );
}
