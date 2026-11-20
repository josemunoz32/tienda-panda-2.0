import React, { useState, useEffect, useCallback } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth } from "../../firebase";
import { storage } from "../../firebaseServices";
import "./AdminTelegramPosts.css";

const PROJECT_ID = process.env.REACT_APP_FIREBASE_PROJECT_ID || "pandastoreupdate";
const FUNCTIONS_BASE = `https://us-central1-${PROJECT_ID}.cloudfunctions.net`;

const DAYS_OPTIONS = [
  { id: 1, label: "Lun" },
  { id: 2, label: "Mar" },
  { id: 3, label: "Mié" },
  { id: 4, label: "Jue" },
  { id: 5, label: "Vie" },
  { id: 6, label: "Sáb" },
  { id: 0, label: "Dom" },
];

const BUTTON_PRESETS = [
  { label: "Nintendo Switch", url: "https://pandastoregaming.cl/categoria/nintendo-switch" },
  { label: "Steam PC", url: "https://pandastoregaming.cl/categoria/steam" },
  { label: "PlayStation", url: "https://pandastoregaming.cl/categoria/playstation" },
  { label: "Streaming", url: "https://pandastoregaming.cl/categoria/streaming" },
  { label: "Packs Nintendo", url: "https://pandastoregaming.cl/packs-nintendo" },
  { label: "Launcher PC", url: "https://pandastoregaming.cl/descargar-launcher" },
  { label: "Promociones", url: "https://pandastoregaming.cl/promos" },
  { label: "Sin botón", url: "" },
];

const MINUTE_OPTIONS = [0, 15, 30, 45];

const DEFAULT_CHANNEL_TITLE = "🐼 PandaStore · Nintendo Switch y Steam PC";
const DEFAULT_CHANNEL_DESC =
  "🎮 Tu canal oficial de juegos digitales para Nintendo Switch y Steam PC. Packs Switch, PandaStore Launcher, entregas rápidas y soporte directo en pandastoregaming.cl";

const emptyForm = {
  title: "",
  description: "",
  imageUrl: "",
  buttonText: "Nintendo Switch",
  buttonUrl: "https://pandastoregaming.cl/categoria/nintendo-switch",
  recurringEnabled: false,
  scheduleHour: 10,
  scheduleMinute: 0,
  scheduleDays: [0, 1, 2, 3, 4, 5, 6],
  deletePrevious: true,
};

function formatTime(h, m) {
  return `${String(Number(h || 0)).padStart(2, "0")}:${String(Number(m || 0)).padStart(2, "0")}`;
}

export default function AdminTelegramPosts() {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [localPreview, setLocalPreview] = useState("");

  const [posts, setPosts] = useState([]);
  const [channelId, setChannelId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [channelTitle, setChannelTitle] = useState(DEFAULT_CHANNEL_TITLE);
  const [channelDesc, setChannelDesc] = useState(DEFAULT_CHANNEL_DESC);
  const [savingMeta, setSavingMeta] = useState(false);

  const callTelegramAdmin = useCallback(async (action, payload = {}) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Sesión no iniciada.");
    const token = await currentUser.getIdToken(true);
    const res = await fetch(`${FUNCTIONS_BASE}/adminTelegramPostHttp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `Error HTTP ${res.status}`);
    }
    return data;
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callTelegramAdmin("list");
      setPosts(data.posts || []);
      setChannelId(data.channelId || "");
    } catch (e) {
      setFeedback({ type: "err", text: `No se pudieron cargar los posts: ${e.message}` });
    } finally {
      setLoading(false);
    }
  }, [callTelegramAdmin]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFeedback({ type: "err", text: "Selecciona un archivo de imagen válido (JPG, PNG, WEBP)." });
      return;
    }
    if (localPreview) URL.revokeObjectURL(localPreview);
    setImageFile(file);
    setLocalPreview(URL.createObjectURL(file));
    setForm((prev) => ({ ...prev, imageUrl: "" }));
  };

  const clearImage = () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setImageFile(null);
    setLocalPreview("");
    setForm((prev) => ({ ...prev, imageUrl: "" }));
  };

  const uploadImageIfNeeded = async () => {
    if (!imageFile) return form.imageUrl.trim();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Debes iniciar sesión como admin.");
    const token = await currentUser.getIdToken(true);
    const claimRes = await fetch(`${FUNCTIONS_BASE}/syncAdminStorageClaimHttp`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!claimRes.ok) {
      const detail = await claimRes.json().catch(() => ({}));
      throw new Error(detail.error || "No se pudo autorizar la subida de imagen.");
    }
    await currentUser.getIdToken(true);
    const cleanName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileRef = ref(storage, `products/telegram_posts/${Date.now()}_${cleanName}`);
    await uploadBytes(fileRef, imageFile);
    return await getDownloadURL(fileRef);
  };

  const toggleDay = (dayId) => {
    setForm((prev) => {
      const exists = prev.scheduleDays.includes(dayId);
      const next = exists
        ? prev.scheduleDays.filter((d) => d !== dayId)
        : [...prev.scheduleDays, dayId];
      return { ...prev, scheduleDays: next.length ? next : [dayId] };
    });
  };

  const handleSubmit = async (sendNow) => {
    setFeedback(null);
    if (!imageFile && !form.imageUrl.trim() && !form.description.trim() && !form.title.trim()) {
      setFeedback({ type: "err", text: "Agrega al menos una imagen o una descripción para el post." });
      return;
    }
    setSubmitting(true);
    try {
      const uploadedUrl = await uploadImageIfNeeded();
      const payload = {
        ...form,
        imageUrl: uploadedUrl,
      };

      if (editingId) {
        await callTelegramAdmin("update", { postId: editingId, ...payload });
        if (sendNow) {
          await callTelegramAdmin("run_now", { postId: editingId });
        }
        setFeedback({
          type: "ok",
          text: sendNow
            ? "Post actualizado y publicado en el canal de Telegram."
            : "Programación del post actualizada correctamente.",
        });
      } else {
        const res = await callTelegramAdmin("create", { ...payload, sendNow });
        setFeedback({
          type: "ok",
          text: sendNow
            ? `Post publicado en el canal (ID mensaje: ${res.messageId || "OK"})${
                form.recurringEnabled
                  ? ` y programado diariamente a las ${formatTime(form.scheduleHour, form.scheduleMinute)} hrs.`
                  : "."
              }`
            : `Post programado correctamente para las ${formatTime(form.scheduleHour, form.scheduleMinute)} hrs (Chile).`,
        });
      }

      setForm(emptyForm);
      setEditingId(null);
      if (localPreview) URL.revokeObjectURL(localPreview);
      setImageFile(null);
      setLocalPreview("");
      await fetchPosts();
    } catch (e) {
      setFeedback({ type: "err", text: e.message || "Error procesando el post." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (post) => {
    setEditingId(post.id);
    if (localPreview) URL.revokeObjectURL(localPreview);
    setImageFile(null);
    setLocalPreview("");
    setForm({
      title: post.title || "",
      description: post.description || "",
      imageUrl: post.imageUrl || "",
      buttonText: post.buttonText || "",
      buttonUrl: post.buttonUrl || "",
      recurringEnabled: Boolean(post.recurringEnabled),
      scheduleHour: Number(post.scheduleHour ?? 10),
      scheduleMinute: Number(post.scheduleMinute ?? 0),
      scheduleDays: Array.isArray(post.scheduleDays) && post.scheduleDays.length
        ? post.scheduleDays
        : [0, 1, 2, 3, 4, 5, 6],
      deletePrevious: Boolean(post.deletePrevious),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRunNow = async (postId) => {
    setFeedback(null);
    try {
      const res = await callTelegramAdmin("run_now", { postId });
      setFeedback({ type: "ok", text: `Post enviado al canal correctamente (ID mensaje: ${res.messageId || "OK"}).` });
      await fetchPosts();
    } catch (e) {
      setFeedback({ type: "err", text: e.message });
    }
  };

  const handleToggle = async (post) => {
    setFeedback(null);
    try {
      await callTelegramAdmin("toggle", { postId: post.id, recurringEnabled: !post.recurringEnabled });
      await fetchPosts();
    } catch (e) {
      setFeedback({ type: "err", text: e.message });
    }
  };

  const handleDelete = async (post) => {
    if (!window.confirm("¿Eliminar este post de la lista programada?")) return;
    setFeedback(null);
    try {
      await callTelegramAdmin("delete", { postId: post.id });
      if (editingId === post.id) {
        setEditingId(null);
        setForm(emptyForm);
      }
      await fetchPosts();
    } catch (e) {
      setFeedback({ type: "err", text: e.message });
    }
  };

  const handleApplyChannelMeta = async () => {
    setFeedback(null);
    setSavingMeta(true);
    try {
      await callTelegramAdmin("update_channel_meta", {
        chatTitle: channelTitle,
        chatDescription: channelDesc,
      });
      setFeedback({ type: "ok", text: "Nombre y descripción del canal de Telegram actualizados correctamente." });
    } catch (e) {
      setFeedback({
        type: "err",
        text: `Telegram no pudo actualizar el canal automáticamente (${e.message}). Verifica que el bot tenga permiso "Cambiar info del grupo/canal".`,
      });
    } finally {
      setSavingMeta(false);
    }
  };

  const previewImg = localPreview || form.imageUrl.trim();
  const maxChars = previewImg ? 1024 : 4096;
  const composedLength =
    (form.title.trim() ? form.title.trim().length + 2 : 0) + form.description.trim().length;
  const activeAutoCount = posts.filter((p) => p.recurringEnabled).length;

  return (
    <div className="adm-tg-wrap">
      <div className="adm-tg-header">
        <div className="adm-tg-header-copy">
          <h1 className="adm-tg-title">
            <span className="adm-tg-title-icon">
              <span className="material-icons">campaign</span>
            </span>
            <span>Publicaciones y Programación · Canal Telegram</span>
          </h1>
          <p className="adm-tg-subtitle">
            Sube posts con imagen, descripción y botón directo al canal, o déjalos programados para repetirse automáticamente a la misma hora (Chile).
          </p>
        </div>

        <div className="adm-tg-stats-row">
          <div className="adm-tg-channel-badge">
            <span className="material-icons" style={{ fontSize: "1rem" }}>podcasts</span>
            <span>Canal: {channelId || "..."}</span>
          </div>
          <div className="adm-tg-stat-pill">
            <span className="material-icons" style={{ fontSize: "1rem" }}>schedule</span>
            <span>{activeAutoCount} auto activos</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`adm-tg-alert ${feedback.type}`}>
          <span className="material-icons" style={{ fontSize: "1.15rem" }}>
            {feedback.type === "ok" ? "check_circle" : "error_outline"}
          </span>
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="adm-tg-grid">
        {/* Formulario creador */}
        <div className="adm-tg-card">
          <div className="adm-tg-card-title">
            <span className="adm-tg-card-title-left">
              <span className="material-icons" style={{ color: "#c084fc", fontSize: "1.2rem" }}>
                {editingId ? "edit" : "add_circle_outline"}
              </span>
              {editingId ? "Editar post programado" : "Nuevo post para Telegram"}
            </span>
            {editingId && (
              <button
                type="button"
                className="adm-tg-chip"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                  clearImage();
                }}
              >
                Cancelar edición
              </button>
            )}
          </div>

          <div className="adm-tg-field">
            <div className="adm-tg-label">
              <span>Imagen del post (opcional)</span>
            </div>

            {previewImg ? (
              <div className="adm-tg-upload-preview">
                <img src={previewImg} alt="Vista previa" />
                <button type="button" className="adm-tg-remove-img" onClick={clearImage}>
                  <span className="material-icons" style={{ fontSize: "0.95rem" }}>close</span>
                  Quitar
                </button>
              </div>
            ) : (
              <label className="adm-tg-upload-box">
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <span className="material-icons" style={{ fontSize: "2.1rem", color: "#c084fc" }}>
                  add_photo_alternate
                </span>
                <div style={{ fontWeight: 700, marginTop: 6 }}>
                  Haz clic para subir una imagen desde tu PC
                </div>
                <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>
                  PNG, JPG o WEBP · Almacenamiento seguro en Firebase
                </div>
              </label>
            )}

            <input
              type="url"
              className="adm-tg-input"
              style={{ marginTop: 10 }}
              placeholder="O pega una URL directa de imagen (https://...)"
              value={form.imageUrl}
              onChange={(e) => {
                if (localPreview) URL.revokeObjectURL(localPreview);
                setImageFile(null);
                setLocalPreview("");
                setForm((prev) => ({ ...prev, imageUrl: e.target.value }));
              }}
            />
          </div>

          <div className="adm-tg-field">
            <div className="adm-tg-label">
              <span>Título destacado (opcional)</span>
            </div>
            <input
              type="text"
              className="adm-tg-input"
              placeholder="Ej: 🐼 OFERTA NINTENDO SWITCH · PACKS DISPONIBLES"
              value={form.title}
              maxLength={160}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div className="adm-tg-field">
            <div className="adm-tg-label">
              <span>Descripción del mensaje</span>
              <span className={`adm-tg-counter ${composedLength > maxChars ? "over" : ""}`}>
                {composedLength} / {maxChars}
              </span>
            </div>
            <textarea
              className="adm-tg-textarea"
              placeholder="Escribe la oferta, juegos destacados, precios o instrucciones..."
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="adm-tg-field">
            <div className="adm-tg-label">
              <span>Botón de enlace debajo del post (opcional)</span>
            </div>
            <div className="adm-tg-row-2">
              <input
                type="text"
                className="adm-tg-input"
                placeholder="Texto del botón (ej: Nintendo Switch)"
                value={form.buttonText}
                maxLength={64}
                onChange={(e) => setForm((prev) => ({ ...prev, buttonText: e.target.value }))}
              />
              <input
                type="url"
                className="adm-tg-input"
                placeholder="URL destino (https://pandastoregaming.cl/...)"
                value={form.buttonUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, buttonUrl: e.target.value }))}
              />
            </div>
            <div className="adm-tg-chips">
              {BUTTON_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={`adm-tg-chip ${
                    (p.url === "" && !form.buttonText) ||
                    (p.url && form.buttonUrl === p.url)
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      buttonText: p.url ? p.label : "",
                      buttonUrl: p.url,
                    }))
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Programación diaria */}
          <div className="adm-tg-schedule-box">
            <label className="adm-tg-toggle-row">
              <span>Publicar siempre a la misma hora (automático)</span>
              <span className="adm-tg-switch">
                <input
                  type="checkbox"
                  checked={form.recurringEnabled}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, recurringEnabled: e.target.checked }))
                  }
                />
                <span className="adm-tg-slider" />
              </span>
            </label>

            {form.recurringEnabled && (
              <div style={{ marginTop: 14 }}>
                <div className="adm-tg-row-2">
                  <div>
                    <div className="adm-tg-label">Hora (Chile)</div>
                    <select
                      className="adm-tg-select"
                      value={form.scheduleHour}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, scheduleHour: Number(e.target.value) }))
                      }
                    >
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")} hrs
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="adm-tg-label">Minuto</div>
                    <select
                      className="adm-tg-select"
                      value={form.scheduleMinute}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, scheduleMinute: Number(e.target.value) }))
                      }
                    >
                      {MINUTE_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          :{String(m).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div className="adm-tg-label">
                    <span>Días de publicación</span>
                    <button
                      type="button"
                      className="adm-tg-chip"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, scheduleDays: [0, 1, 2, 3, 4, 5, 6] }))
                      }
                    >
                      Todos los días
                    </button>
                  </div>
                  <div className="adm-tg-days-grid">
                    {DAYS_OPTIONS.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        className={`adm-tg-day-btn ${
                          form.scheduleDays.includes(d.id) ? "active" : ""
                        }`}
                        onClick={() => toggleDay(d.id)}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label
                  className="adm-tg-toggle-row"
                  style={{ marginTop: 14, fontSize: "0.82rem", color: "#cbd5e1" }}
                >
                  <span>Borrar publicación anterior antes de subir la nueva</span>
                  <span className="adm-tg-switch">
                    <input
                      type="checkbox"
                      checked={form.deletePrevious}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, deletePrevious: e.target.checked }))
                      }
                    />
                    <span className="adm-tg-slider" />
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="adm-tg-actions">
            <button
              type="button"
              className="adm-tg-btn adm-tg-btn-primary"
              disabled={submitting || composedLength > maxChars}
              onClick={() => handleSubmit(true)}
            >
              <span className="material-icons" style={{ fontSize: "1.1rem" }}>send</span>
              {submitting
                ? "Publicando..."
                : editingId
                ? "Guardar y Publicar Ahora"
                : "Subir al Canal Ahora"}
            </button>

            {form.recurringEnabled && (
              <button
                type="button"
                className="adm-tg-btn adm-tg-btn-secondary"
                disabled={submitting || composedLength > maxChars}
                onClick={() => handleSubmit(false)}
              >
                <span className="material-icons" style={{ fontSize: "1.1rem" }}>schedule</span>
                Solo Guardar Programación
              </button>
            )}
          </div>
        </div>

        {/* Vista previa + Identidad del canal */}
        <div className="adm-tg-side-stack">
          <div className="adm-tg-card">
            <div className="adm-tg-card-title">
              <span className="adm-tg-card-title-left">
                <span className="material-icons" style={{ color: "#38bdf8", fontSize: "1.15rem" }}>
                  visibility
                </span>
                Vista previa en Telegram
              </span>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Tiempo real</span>
            </div>

            <div className="adm-tg-preview-stage">
              <div className="adm-tg-preview-topbar">
                <div className="adm-tg-preview-avatar">🐼</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.86rem", color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {channelTitle || "PandaStore Canal"}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#7d96ad" }}>Canal de Telegram</div>
                </div>
              </div>

              <div className="adm-tg-bubble">
                <div className="adm-tg-bubble-author">PandaStore</div>
                {previewImg && (
                  <div className="adm-tg-bubble-img-wrap">
                    <img className="adm-tg-bubble-img" src={previewImg} alt="Preview Telegram" />
                  </div>
                )}
                <div className="adm-tg-bubble-body">
                  {form.title.trim() && (
                    <div style={{ fontWeight: 800, marginBottom: form.description.trim() ? 8 : 0 }}>
                      {form.title.trim()}
                    </div>
                  )}
                  {form.description.trim() || (
                    <span style={{ color: "#64748b" }}>
                      Tu descripción aparecerá aquí...
                    </span>
                  )}
                </div>
                <div className="adm-tg-bubble-meta">
                  <span>👁 1</span>
                  <span>{formatTime(form.scheduleHour, form.scheduleMinute)}</span>
                </div>
              </div>

              {form.buttonText.trim() && form.buttonUrl.trim() && (
                <a
                  className="adm-tg-bubble-btn"
                  href={form.buttonUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{form.buttonText}</span>
                  <span style={{ fontSize: "0.78rem", opacity: 0.85 }}>↗</span>
                </a>
              )}
            </div>
          </div>

          <div className="adm-tg-card">
            <div className="adm-tg-card-title">
              <span className="adm-tg-card-title-left">
                <span className="material-icons" style={{ color: "#10b981", fontSize: "1.15rem" }}>
                  badge
                </span>
                Nombre y descripción del canal
              </span>
            </div>
            <div className="adm-tg-field">
              <div className="adm-tg-label">Nombre del canal (Nintendo & Steam)</div>
              <input
                type="text"
                className="adm-tg-input"
                maxLength={128}
                value={channelTitle}
                onChange={(e) => setChannelTitle(e.target.value)}
              />
            </div>
            <div className="adm-tg-field">
              <div className="adm-tg-label">Descripción del canal (máx. 255)</div>
              <textarea
                className="adm-tg-textarea"
                style={{ minHeight: 88 }}
                maxLength={255}
                value={channelDesc}
                onChange={(e) => setChannelDesc(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="adm-tg-btn adm-tg-btn-secondary"
              style={{ width: "100%" }}
              disabled={savingMeta}
              onClick={handleApplyChannelMeta}
            >
              <span className="material-icons" style={{ fontSize: "1.05rem" }}>edit_note</span>
              {savingMeta ? "Aplicando en Telegram..." : "Aplicar Nombre y Descripción al Canal"}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de posts programados / historial */}
      <div className="adm-tg-card">
        <div className="adm-tg-card-title">
          <span className="adm-tg-card-title-left">
            <span className="material-icons" style={{ color: "#facc15", fontSize: "1.15rem" }}>
              view_agenda
            </span>
            Posts guardados y programados ({posts.length})
          </span>
          <button type="button" className="adm-tg-chip" onClick={fetchPosts}>
            Actualizar lista
          </button>
        </div>

        {loading ? (
          <p style={{ color: "#94a3b8" }}>Cargando publicaciones...</p>
        ) : posts.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>
            Aún no hay posts guardados. Crea uno arriba para publicarlo o dejarlo programado diariamente.
          </p>
        ) : (
          <div className="adm-tg-posts-grid">
            {posts.map((post) => {
              const statusClass = post.recurringEnabled ? "active" : "manual";
              return (
                <div key={post.id} className="adm-tg-post-item">
                  {post.imageUrl && (
                    <img className="adm-tg-post-thumb" src={post.imageUrl} alt={post.title || "Post"} />
                  )}
                  <div className="adm-tg-post-content">
                    <span className={`adm-tg-status-pill ${statusClass}`}>
                      {post.recurringEnabled
                        ? `Automático · ${formatTime(post.scheduleHour, post.scheduleMinute)} CL`
                        : "Publicación manual"}
                    </span>

                    {post.title && (
                      <div style={{ fontWeight: 800, color: "#fff", fontSize: "0.95rem" }}>
                        {post.title}
                      </div>
                    )}

                    <div
                      style={{
                        color: "#cbd5e1",
                        fontSize: "0.83rem",
                        lineHeight: 1.45,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {post.description || "Sin descripción"}
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                      Enviado {post.send_count || 0} {post.send_count === 1 ? "vez" : "veces"}
                      {post.last_sent_date ? ` · Último: ${post.last_sent_date}` : ""}
                    </div>

                    <div className="adm-tg-post-actions">
                      <button
                        type="button"
                        className="adm-tg-btn-primary"
                        style={{ border: "none", padding: "8px 10px", minHeight: "36px" }}
                        onClick={() => handleRunNow(post.id)}
                      >
                        Publicar ahora
                      </button>
                      <button
                        type="button"
                        className="adm-tg-btn-secondary"
                        onClick={() => handleToggle(post)}
                      >
                        {post.recurringEnabled ? "Pausar auto" : "Activar auto"}
                      </button>
                      <button
                        type="button"
                        className="adm-tg-btn-ghost"
                        onClick={() => handleEdit(post)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="adm-tg-btn-danger"
                        onClick={() => handleDelete(post)}
                      >
                        Borrar
                      </button>
                    </div>
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
