import React, { useEffect, useState } from "react";
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
  const [tab, setTab] = useState("pending"); // pending | answered | all
  const [search, setSearch] = useState("");
  const [respuestas, setRespuestas] = useState({}); // { questionId: text }
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
          const productId = docu.ref.parent.parent.id;

          // Cache product names to avoid repeated fetches
          if (!productCache[productId]) {
            try {
              const prodSnap = await getDoc(doc(db, "products", productId));
              productCache[productId] = prodSnap.exists()
                ? prodSnap.data().name || "Sin nombre"
                : "Producto eliminado";
            } catch {
              productCache[productId] = "Producto no disponible";
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

        // Sort: pending first, then by date desc
        arr.sort((a, b) => {
          if (!a.answer && b.answer) return -1;
          if (a.answer && !b.answer) return 1;
          return (b.date || "").localeCompare(a.date || "");
        });

        setPreguntas(arr);
      } catch (e) {
        console.error("Error al cargar preguntas:", e);
      }
      setLoading(false);
    };

    fetchPreguntas();
  }, [user, role, navigate]);

  const handleResponder = async (pregunta) => {
    const texto = (respuestas[pregunta.id] || "").trim();
    if (!texto) return;
    try {
      await setDoc(
        pregunta.ref,
        { answer: texto, answeredAt: new Date().toISOString() },
        { merge: true }
      );
      setPreguntas((prev) =>
        prev.map((p) =>
          p.id === pregunta.id
            ? { ...p, answer: texto, answeredAt: new Date().toISOString() }
            : p
        )
      );
      setRespuestas((prev) => ({ ...prev, [pregunta.id]: "" }));
    } catch {
      alert("Error al responder la pregunta");
    }
  };

  const handleEliminar = async (pregunta) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta pregunta?")) return;
    try {
      await deleteDoc(pregunta.ref);
      setPreguntas((prev) => prev.filter((p) => p.id !== pregunta.id));
    } catch {
      alert("Error al eliminar la pregunta");
    }
  };

  // Filter by tab and search
  const filtered = preguntas.filter((p) => {
    if (tab === "pending" && p.answer) return false;
    if (tab === "answered" && !p.answer) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return (
        (p.productName || "").toLowerCase().includes(s) ||
        (p.userName || "").toLowerCase().includes(s) ||
        (p.text || "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  const pendingCount = preguntas.filter((p) => !p.answer).length;
  const answeredCount = preguntas.filter((p) => p.answer).length;

  return (
    <div className="admpre-container">
      <Link to="/admin/dashboard" className="admpre-back">
        ← Volver al Dashboard
      </Link>
      <h1 className="admpre-title">Gestión de Preguntas</h1>
      <p className="admpre-subtitle">
        Responde las preguntas de los clientes sobre los productos
      </p>

      {/* Tabs */}
      <div className="admpre-tabs">
        <button
          className={`admpre-tab ${tab === "pending" ? "active" : ""}`}
          onClick={() => setTab("pending")}
        >
          ⏳ Pendientes <span className="badge">{pendingCount}</span>
        </button>
        <button
          className={`admpre-tab ${tab === "answered" ? "active" : ""}`}
          onClick={() => setTab("answered")}
        >
          ✅ Respondidas <span className="badge">{answeredCount}</span>
        </button>
        <button
          className={`admpre-tab ${tab === "all" ? "active" : ""}`}
          onClick={() => setTab("all")}
        >
          📋 Todas <span className="badge">{preguntas.length}</span>
        </button>
      </div>

      {/* Search */}
      <input
        className="admpre-search"
        type="text"
        placeholder="Buscar por producto, usuario o pregunta..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="admpre-loading">Cargando preguntas...</div>
      ) : filtered.length === 0 ? (
        <div className="admpre-empty">
          <div className="admpre-empty-icon">💬</div>
          {tab === "pending"
            ? "No hay preguntas pendientes"
            : tab === "answered"
            ? "No hay preguntas respondidas"
            : "No se encontraron preguntas"}
        </div>
      ) : (
        <div className="admpre-list">
          {filtered.map((p) => (
            <div className="admpre-card" key={p.id}>
              <div className="admpre-card-header">
                <div>
                  <Link
                    to={`/producto/${p.productId}`}
                    className="admpre-product-name"
                  >
                    🎮 {p.productName}
                  </Link>
                  <span className="admpre-date" style={{ marginLeft: 10 }}>
                    {p.date ? p.date.substring(0, 10) : ""}
                  </span>
                </div>
                <span
                  className={`admpre-status ${p.answer ? "answered" : "pending"}`}
                >
                  {p.answer ? "Respondida" : "Pendiente"}
                </span>
              </div>

              <div className="admpre-user">
                <strong>💬 {p.userName || "Usuario"}:</strong>
              </div>
              <div className="admpre-question-text">{p.text}</div>

              {p.answer ? (
                <div className="admpre-answer-box">
                  <strong>Respuesta: </strong>
                  {p.answer}
                  {p.answeredAt && (
                    <div className="admpre-answer-date">
                      Respondido el {p.answeredAt.substring(0, 10)}
                    </div>
                  )}
                </div>
              ) : (
                <form
                  className="admpre-reply-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleResponder(p);
                  }}
                >
                  <textarea
                    className="admpre-reply-input"
                    placeholder="Escribe tu respuesta..."
                    value={respuestas[p.id] || ""}
                    onChange={(e) =>
                      setRespuestas((prev) => ({
                        ...prev,
                        [p.id]: e.target.value,
                      }))
                    }
                    rows={2}
                  />
                  <button
                    type="submit"
                    className="admpre-reply-btn"
                    disabled={!(respuestas[p.id] || "").trim()}
                  >
                    Responder
                  </button>
                </form>
              )}

              <button
                className="admpre-delete-btn"
                onClick={() => handleEliminar(p)}
              >
                🗑️ Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
