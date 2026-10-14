import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { db, auth, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import pandaGamerAvatar from "../assets/logos/miicono.png";
import PandaModalAlert from "./PandaModalAlert/PandaModalAlert";
import "./TestimoniosCrud.css";

const PER_PAGE = 20;

// Helper para extraer el nombre base de la imagen almacenada en Firebase Storage
const extractTestimonioFileName = (url) => {
  if (!url) return "";
  try {
    const decoded = decodeURIComponent(url);
    const fileNameWithQuery = decoded.split("/").pop();
    const fileName = fileNameWithQuery.split("?")[0];
    return fileName.replace(/^[0-9]+_/, "").toLowerCase().trim();
  } catch (e) {
    return "";
  }
};

export const CATEGORIAS_CONFIG = {
  "Nintendo Switch": { id: "nintendo", icon: "sports_esports", color: "#ef4444", bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.35)", label: "Nintendo Switch" },
  "PlayStation 5": { id: "ps5", icon: "sports_esports", color: "#3b82f6", bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.35)", label: "PlayStation 5" },
  "PlayStation 4": { id: "ps4", icon: "sports_esports", color: "#6366f1", bg: "rgba(99,102,241,0.15)", border: "rgba(99,102,241,0.35)", label: "PlayStation 4" },
  "Steam PC": { id: "steam", icon: "laptop_chromebook", color: "#14b8a6", bg: "rgba(20,184,166,0.15)", border: "rgba(20,184,166,0.35)", label: "Steam PC" },
  "Packs & Promociones": { id: "packs", icon: "local_fire_department", color: "#f59e0b", bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.35)", label: "Packs & Promociones" },
  "Suscripciones & Streaming": { id: "streaming", icon: "tv", color: "#ec4899", bg: "rgba(236,72,153,0.15)", border: "rgba(236,72,153,0.35)", label: "Suscripciones & Streaming" },
  "Proveedores / Emprendedores": { id: "proveedores", icon: "inventory_2", color: "#10b981", bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.35)", label: "Proveedores / Emprendedores" },
  "Otro Producto": { id: "otro", icon: "stars", color: "#a855f7", bg: "rgba(168,85,247,0.15)", border: "rgba(168,85,247,0.35)", label: "Otro Producto" },
};

export default function TestimoniosCrud() {
  const [testimonios, setTestimonios] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);

  // Custom Modal Alert / Confirm (replaces browser alerts)
  const [modalAlert, setModalAlert] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    confirmText: "Aceptar",
    cancelText: "Cancelar",
    danger: false,
    onConfirm: null,
    onCancel: null,
  });

  const showAlert = ({ type = "info", title, message, confirmText = "Aceptar", onConfirm }) => {
    setModalAlert({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText: "Cancelar",
      danger: false,
      onConfirm: () => {
        setModalAlert(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: null,
    });
  };

  const showConfirm = ({ title, message, confirmText = "Confirmar", cancelText = "Cancelar", danger = false, onConfirm }) => {
    setModalAlert({
      isOpen: true,
      type: "confirm",
      title,
      message,
      confirmText,
      cancelText,
      danger,
      onConfirm: () => {
        setModalAlert(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: () => setModalAlert(prev => ({ ...prev, isOpen: false })),
    });
  };

  // Filtros de reseñas
  const [reviewFilter, setReviewFilter] = useState("all"); // 'all' | 'photos' | '5stars'
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal para escribir reseña
  const [modalOpen, setModalOpen] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    categoria: "Nintendo Switch",
    comentario: "",
  });
  const [reviewPhoto, setReviewPhoto] = useState(null);
  const [reviewPhotoPreview, setReviewPhotoPreview] = useState(null);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState("");
  const [brokenPhotos, setBrokenPhotos] = useState({});

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState(null);

  // Pagination galería de entregas
  const [page, setPage] = useState(1);

  // Admin upload capturas oficiales
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    (async () => {
      const currentUser = auth.currentUser;
      setUser(currentUser);
      if (currentUser) {
        try {
          const tokenResult = await currentUser.getIdTokenResult(true);
          setRole(tokenResult.claims.role);
        } catch (e) {}
      }

      // 1. Cargar capturas de entregas oficiales
      try {
        const snapTesti = await getDocs(collection(db, "testimonios"));
        setTestimonios(snapTesti.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn("Error cargando testimonios:", err);
      }

      // 2. Cargar reseñas VERDADERAS enviadas por clientes reales desde Firestore
      try {
        const snapReviews = await getDocs(collection(db, "testimonios_reviews"));
        const dbReviews = snapReviews.docs.map(d => ({ id: d.id, ...d.data() }));
        // Ordenar más recientes primero
        dbReviews.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setReviews(dbReviews);
      } catch (err) {
        console.warn("Error cargando testimonios_reviews:", err);
        setReviews([]);
      }

      setLoading(false);
    })();
  }, []);

  const reloadTestimonios = async () => {
    const snapshot = await getDocs(collection(db, "testimonios"));
    setTestimonios(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const reloadReviews = async () => {
    try {
      const snapReviews = await getDocs(collection(db, "testimonios_reviews"));
      const dbReviews = snapReviews.docs.map(d => ({ id: d.id, ...d.data() }));
      dbReviews.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setReviews(dbReviews);
    } catch (e) {}
  };

  // ── FILTRADO DE RESEÑAS SEGÚN VISIBILIDAD ──
  // En la tienda pública SOLO se muestran reseñas expresamente APROBADAS (visible === true)
  const visibleReviews = useMemo(() => {
    return reviews.filter(r => r.visible === true);
  }, [reviews]);

  // Conteo de reseñas pendientes para aviso exclusivo de administración
  const pendingReviewsCount = useMemo(() => {
    return reviews.filter(r => r.visible !== true).length;
  }, [reviews]);

  // ── ESTADÍSTICAS DINÁMICAS BASADAS EN RESEÑAS REALES APROBADAS ──
  const stats = useMemo(() => {
    // Calculamos única y exclusivamente sobre las aprobadas públicas
    const pool = reviews.filter(r => r.visible === true);
    const total = pool.length;
    if (total === 0) {
      return {
        avg: "5.0",
        total: 0,
        counts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        pct: { 5: 100, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    pool.forEach(r => {
      const score = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
      counts[score] = (counts[score] || 0) + 1;
      sum += (r.rating || 5);
    });
    const avg = (sum / total).toFixed(1);
    const pct = {
      5: Math.round((counts[5] / total) * 100),
      4: Math.round((counts[4] / total) * 100),
      3: Math.round((counts[3] / total) * 100),
      2: Math.round((counts[2] / total) * 100),
      1: Math.round((counts[1] / total) * 100),
    };
    return { avg, total, counts, pct };
  }, [reviews]);

  // Reseñas filtradas por la barra de pestañas y categorías
  const filteredReviews = useMemo(() => {
    let list = visibleReviews;
    if (reviewFilter === "photos") {
      list = list.filter(r => Boolean(r.foto));
    } else if (reviewFilter === "5stars") {
      list = list.filter(r => (r.rating || 5) >= 5);
    }
    if (categoryFilter !== "all") {
      list = list.filter(r => (r.categoria || "Nintendo Switch") === categoryFilter);
    }
    return list;
  }, [visibleReviews, reviewFilter, categoryFilter]);

  // ── MODAL PARA ENVIAR RESEÑA (INVITADOS Y USUARIOS LOGUEADOS) ──
  const openReviewModal = () => {
    setReviewForm({
      rating: 5,
      categoria: "Nintendo Switch",
      comentario: "",
    });
    setReviewPhoto(null);
    setReviewPhotoPreview(null);
    setReviewSuccessMsg("");
    setModalOpen(true);
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setReviewPhoto(file);
      setReviewPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveReviewPhoto = () => {
    if (reviewPhotoPreview) URL.revokeObjectURL(reviewPhotoPreview);
    setReviewPhoto(null);
    setReviewPhotoPreview(null);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.comentario.trim()) {
      showAlert({
        type: "warning",
        title: "Reseña vacía",
        message: "Por favor escribe tu reseña o comentario para poder compartir tu experiencia.",
      });
      return;
    }

    setSubmittingReview(true);
    try {
      if (!user?.uid) {
        throw new Error("Inicia sesión para publicar una reseña.");
      }
      let photoUrl = null;
      if (reviewPhoto) {
        try {
          const cleanName = reviewPhoto.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          const photoRef = ref(storage, `reviews/${user.uid}/${Date.now()}_${cleanName}`);
          await uploadBytes(photoRef, reviewPhoto);
          photoUrl = await getDownloadURL(photoRef);
        } catch (photoErr) {
          console.warn("No se pudo subir la foto adjunta, se guardará la reseña de todas formas:", photoErr);
        }
      }

      // Asignar avatar: Si inició sesión con Google/Gmail y tiene photoURL, usar su foto real.
      // Si es invitado o no tiene photoURL, dejar null (la UI usará el avatar predeterminado de Panda Gamer).
      const userAvatar = user && user.photoURL ? user.photoURL : null;

      const autoNombre = user
        ? (user.displayName || (user.email ? user.email.split("@")[0] : "Cliente Verificado"))
        : (localStorage.getItem("panda_guest_name") || "Gamer Invitado");

      const newReviewData = {
        rating: Number(reviewForm.rating) || 5,
        nombre: autoNombre,
        categoria: reviewForm.categoria || "Nintendo Switch",
        juego: reviewForm.categoria || "Juego Digital PandaStore",
        comentario: reviewForm.comentario.trim(),
        foto: photoUrl,
        userAvatar: userAvatar,
        isGuest: false,
        userId: user.uid,
        userEmail: user.email || null,
        createdAt: Date.now(),
        fecha: new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }),
        verified: true,
        visible: false, // SIEMPRE entra OCULTA / PENDIENTE DE APROBACIÓN POR EL ADMIN
      };

      await addDoc(collection(db, "testimonios_reviews"), newReviewData);

      setReviewSuccessMsg("¡Muchas gracias! Tu reseña fue recibida y quedó en espera de revisión. Será publicada en la tienda una vez aprobada por el administrador ⭐");
      setTimeout(() => {
        setModalOpen(false);
        setReviewSuccessMsg("");
        if (reviewPhotoPreview) URL.revokeObjectURL(reviewPhotoPreview);
        setReviewPhoto(null);
        setReviewPhotoPreview(null);
      }, 3000);
    } catch (err) {
      console.error("Error al publicar reseña:", err);
      showAlert({
        type: "error",
        title: "Detalle al enviar reseña",
        message: "Hubo un detalle al enviar la reseña. Por favor intenta de nuevo.",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  // ── MODERACIÓN ADMIN DIRECTA EN LA PÁGINA ──
  const toggleReviewVisibility = async (rev) => {
    if (role !== "admin") return;
    try {
      const newVisible = rev.visible === false;
      await updateDoc(doc(db, "testimonios_reviews", rev.id), { visible: newVisible });
      setReviews(prev => prev.map(r => r.id === rev.id ? { ...r, visible: newVisible } : r));
    } catch (err) {
      showAlert({
        type: "error",
        title: "Error de moderación",
        message: "No se pudo actualizar la visibilidad de la reseña.",
      });
    }
  };

  const handleDeleteReview = (reviewId) => {
    if (role !== "admin") return;
    showConfirm({
      title: "¿Eliminar reseña?",
      message: "¿Seguro que deseas eliminar definitivamente esta reseña? Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      danger: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "testimonios_reviews", reviewId));
          setReviews(prev => prev.filter(r => r.id !== reviewId));
          showAlert({
            type: "success",
            title: "Reseña eliminada",
            message: "La reseña ha sido eliminada con éxito.",
          });
        } catch (err) {
          showAlert({
            type: "error",
            title: "Error al eliminar",
            message: "No se pudo eliminar la reseña: " + err.message,
          });
        }
      },
    });
  };

  // ── DETECCIÓN INTELIGENTE DE DUPLICADOS EN LA BASE DE DATOS ──
  const existingDuplicates = useMemo(() => {
    const seen = new Map();
    const dupes = [];
    testimonios.forEach(t => {
      let name = t.nombreOriginal
        ? t.nombreOriginal.toLowerCase().trim()
        : extractTestimonioFileName(t.imagen);

      const key = name || t.imagen;
      if (!key) return;

      if (seen.has(key)) {
        dupes.push(t);
      } else {
        seen.set(key, t);
      }
    });
    return dupes;
  }, [testimonios]);

  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);

  const handleCleanDuplicates = () => {
    if (role !== "admin" || existingDuplicates.length === 0) return;
    showConfirm({
      title: "¿Depurar fotos duplicadas?",
      message: `Se detectaron ${existingDuplicates.length} fotos repetidas en la galería oficial. Se conservará una copia única de cada captura y se eliminarán los repetidos. ¿Deseas depurarlas ahora?`,
      confirmText: `Eliminar ${existingDuplicates.length} duplicados`,
      danger: true,
      onConfirm: async () => {
        setCleaningDuplicates(true);
        try {
          const idsToDelete = existingDuplicates.map(d => d.id);
          // Eliminación por bloques de 10 concurrentes
          for (let i = 0; i < idsToDelete.length; i += 10) {
            const chunk = idsToDelete.slice(i, i + 10);
            await Promise.all(chunk.map(id => deleteDoc(doc(db, "testimonios", id))));
          }
          await reloadTestimonios();
          showAlert({
            type: "success",
            title: "¡Galería depurada con éxito!",
            message: `Se eliminaron ${idsToDelete.length} fotos duplicadas. Ahora todas las capturas de entregas son 100% únicas.`,
          });
        } catch (err) {
          showAlert({
            type: "error",
            title: "Error al depurar",
            message: "Ocurrió un error al eliminar los duplicados: " + err.message,
          });
        } finally {
          setCleaningDuplicates(false);
        }
      },
    });
  };

  // ── SECCIÓN DE CAPTURAS OFICIALES (ORDENADAS MÁS ACTUALES PRIMERO) ──
  const sortedTestimonios = useMemo(() => {
    return [...testimonios].reverse();
  }, [testimonios]);

  const addFiles = useCallback((fileList) => {
    const rawFiles = Array.from(fileList).filter(f => f.type.startsWith("image/"));
    if (rawFiles.length === 0) return;

    // 1. Construir conjunto de nombres ya existentes en la BD
    const dbFileNames = new Set();
    testimonios.forEach(t => {
      const orig = t.nombreOriginal
        ? t.nombreOriginal.toLowerCase().trim()
        : extractTestimonioFileName(t.imagen);
      if (orig) {
        dbFileNames.add(orig);
        const clean = orig.replace(/[^a-zA-Z0-9.-]/g, "_");
        dbFileNames.add(clean);
      }
    });

    // 2. Construir conjunto de nombres ya seleccionados en la cola
    const pendingNames = new Set(
      pendingFiles.map(e => e.file.name.toLowerCase().trim())
    );

    let skippedAlreadyUploaded = 0;
    let skippedBatchDuplicates = 0;
    const newEntries = [];
    const seenInBatch = new Set();

    for (const file of rawFiles) {
      const name = file.name.toLowerCase().trim();
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase().trim();

      // ¿Ya está en la base de datos de testimonios?
      if (dbFileNames.has(name) || dbFileNames.has(cleanName)) {
        skippedAlreadyUploaded++;
        continue;
      }

      // ¿Ya está en los archivos pendientes de subir?
      if (pendingNames.has(name) || pendingNames.has(cleanName)) {
        skippedBatchDuplicates++;
        continue;
      }

      // ¿Repetido dentro de la misma selección de 500 fotos?
      if (seenInBatch.has(name) || seenInBatch.has(cleanName)) {
        skippedBatchDuplicates++;
        continue;
      }

      seenInBatch.add(name);
      seenInBatch.add(cleanName);

      newEntries.push({
        file,
        preview: URL.createObjectURL(file),
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      });
    }

    if (newEntries.length > 0) {
      setPendingFiles(prev => [...prev, ...newEntries]);
    }

    const totalSkipped = skippedAlreadyUploaded + skippedBatchDuplicates;
    if (totalSkipped > 0) {
      showAlert({
        type: "info",
        title: "Filtro Inteligente Anti-Duplicados",
        message: `Se agregaron ${newEntries.length} fotos nuevas. Se omitieron automáticamente ${totalSkipped} fotos (${skippedAlreadyUploaded} ya estaban subidas a la web y ${skippedBatchDuplicates} repetidas en tu selección).`,
      });
    }

    setErrorMsg("");
  }, [testimonios, pendingFiles]);

  const removeFile = (key) => {
    setPendingFiles(prev => {
      const entry = prev.find(e => e.key === key);
      if (entry) URL.revokeObjectURL(entry.preview);
      return prev.filter(e => e.key !== key);
    });
  };

  const clearFiles = () => {
    pendingFiles.forEach(e => URL.revokeObjectURL(e.preview));
    setPendingFiles([]);
    setUploadProgress({ done: 0, total: 0 });
    setErrorMsg("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (!pendingFiles.length || role !== "admin") return;
    setUploading(true);
    setErrorMsg("");
    const total = pendingFiles.length;
    setUploadProgress({ done: 0, total });
    let done = 0;
    const errors = [];

    // Pool de subida concurrente de 6 archivos en paralelo (sube 500 fotos en tiempo récord)
    const CONCURRENCY = 6;
    const queue = [...pendingFiles];

    const worker = async () => {
      while (queue.length > 0) {
        const entry = queue.shift();
        if (!entry) break;
        try {
          const cleanName = entry.file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          const storageRef = ref(storage, `testimonios/${Date.now()}_${cleanName}`);
          await uploadBytes(storageRef, entry.file);
          const url = await getDownloadURL(storageRef);
          await addDoc(collection(db, "testimonios"), {
            imagen: url,
            nombreOriginal: entry.file.name,
            tamano: entry.file.size,
            createdAt: Date.now(),
          });
          done++;
          setUploadProgress({ done, total });
        } catch (err) {
          console.error("Error subiendo captura:", entry.file.name, err);
          errors.push(entry.file.name);
        }
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker());
    await Promise.all(workers);

    if (errors.length) {
      setErrorMsg(`No se pudieron subir ${errors.length} fotos: ${errors.slice(0, 5).join(", ")}${errors.length > 5 ? "…" : ""}`);
    } else {
      showAlert({
        type: "success",
        title: "¡Subida masiva completada!",
        message: `Se subieron exitosamente las ${done} fotos de entregas a la galería sin ningún duplicado.`,
      });
    }

    pendingFiles.forEach(e => URL.revokeObjectURL(e.preview));
    setPendingFiles([]);
    setUploadProgress({ done: 0, total: 0 });
    setUploading(false);
    setPage(1);
    await reloadTestimonios();
  };

  const handleDeleteDelivery = (id) => {
    if (role !== "admin") return;
    showConfirm({
      title: "¿Eliminar entrega?",
      message: "¿Seguro que deseas eliminar esta captura de entrega de la galería?",
      confirmText: "Eliminar",
      danger: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "testimonios", id));
          setTestimonios(prev => prev.filter(t => t.id !== id));
          if (lightboxImage) setLightboxImage(null);
        } catch (err) {
          showAlert({
            type: "error",
            title: "Error",
            message: "No se pudo eliminar la entrega: " + err.message,
          });
        }
      },
    });
  };

  const totalPages = Math.ceil(sortedTestimonios.length / PER_PAGE);
  const pageItems = sortedTestimonios.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const progressPct = uploadProgress.total > 0
    ? Math.round((uploadProgress.done / uploadProgress.total) * 100)
    : 0;

  return (
    <div className="test-root">
      {/* ── HERO PRINCIPAL ── */}
      <div className="test-hero">
        <div className="test-hero-tag">
          <span className="material-icons" style={{ fontSize: 14 }}>verified</span>
          Opiniones Reales de Clientes
        </div>
        <h2 className="test-hero-title">
          Experiencias y <span>Reseñas de la Comunidad</span>
        </h2>
        <p className="test-hero-sub">
          Descubre lo que opinan quienes ya compran en PandaStore • Juegos para Steam PC, Switch y PlayStation
        </p>

        <div className="test-stats-row">
          <div className="test-stat">
            <span className="material-icons" style={{ fontSize: 16, color: "#facc15" }}>star</span>
            <span><span className="test-stat-num">{stats.avg}</span> / 5.0 Valoración</span>
          </div>
          <div className="test-stat">
            <span className="material-icons" style={{ fontSize: 16, color: "#4ade80" }}>rate_review</span>
            <span><span className="test-stat-num">{stats.total}</span> Reseñas Verificadas</span>
          </div>
          <div className="test-stat">
            <span className="material-icons" style={{ fontSize: 16, color: "#a259ff" }}>photo_library</span>
            <span><span className="test-stat-num">{testimonios.length}</span> Entregas en Galería</span>
          </div>
        </div>
      </div>

      {/* Banner de aviso para el administrador si hay reseñas pendientes de aprobación */}
      {role === "admin" && pendingReviewsCount > 0 && (
        <div style={{
          maxWidth: 1200,
          margin: "0 auto 20px auto",
          padding: "14px 20px",
          background: "rgba(245, 158, 11, 0.15)",
          border: "1.5px solid rgba(245, 158, 11, 0.45)",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#fcd34d", fontWeight: 700, fontSize: 14 }}>
            <span className="material-icons" style={{ fontSize: 20 }}>pending_actions</span>
            <span>Tienes <strong>{pendingReviewsCount}</strong> reseña(s) pendiente(s) de revisión en el panel. No son visibles al público hasta que las apruebes.</span>
          </div>
          <Link
            to="/admin/resenas"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#ffffff",
              padding: "8px 18px",
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 13,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span className="material-icons" style={{ fontSize: 16 }}>rate_review</span>
            Ir al Panel de Reseñas →
          </Link>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          1. GOOGLE-STYLE REVIEWS WIDGET & CARDS
      ══════════════════════════════════════════════ */}
      <section className="google-reviews-section">
        <div className="google-summary-card">
          {/* Col 1: Puntuación grande */}
          <div className="google-score-box">
            <div className="google-score-val">{stats.avg}</div>
            <div className="google-score-stars">
              {"★".repeat(5)}
            </div>
            <div className="google-score-sub">
              {stats.total > 0 ? `Basado en ${stats.total} opiniones reales` : "Sé el primero en calificar"}
            </div>
            <div className="google-score-badge">
              <span className="material-icons" style={{ fontSize: 13 }}>shield</span>
              Calificación Verificada
            </div>
          </div>

          {/* Col 2: Barras de distribución estilo Google */}
          <div className="google-bars-box">
            {[5, 4, 3, 2, 1].map(num => (
              <div key={num} className="google-bar-row">
                <span className="google-bar-label">
                  {num} <span style={{ color: "#facc15", fontSize: 12 }}>★</span>
                </span>
                <div className="google-bar-track">
                  <div
                    className="google-bar-fill"
                    style={{ width: `${stats.pct[num] || 0}%` }}
                  />
                </div>
                <span className="google-bar-count">{stats.counts[num] || 0}</span>
              </div>
            ))}
          </div>

          {/* Col 3: Botón para abrir el formulario */}
          <div className="google-cta-box">
            <button
              type="button"
              className="google-write-btn"
              onClick={openReviewModal}
            >
              <span className="material-icons" style={{ fontSize: 20 }}>rate_review</span>
              Escribir Reseña + Foto
            </button>
            <span className="google-cta-note">
              {user ? `Conectado como: ${user.displayName || user.email}` : "¡Clientes registrados e invitados son bienvenidos!"}
            </span>
          </div>
        </div>

        {/* Filtros de Reseñas */}
        {visibleReviews.length > 0 && (
          <>
            <div className="reviews-filters">
              <button
                type="button"
                className={`review-filter-btn ${reviewFilter === "all" ? "active" : ""}`}
                onClick={() => setReviewFilter("all")}
              >
                <span className="material-icons" style={{ fontSize: 16 }}>apps</span>
                Todas ({visibleReviews.length})
              </button>
              <button
                type="button"
                className={`review-filter-btn ${reviewFilter === "photos" ? "active" : ""}`}
                onClick={() => setReviewFilter("photos")}
              >
                <span className="material-icons" style={{ fontSize: 16 }}>photo_camera</span>
                Con fotos del juego ({visibleReviews.filter(r => Boolean(r.foto)).length})
              </button>
              <button
                type="button"
                className={`review-filter-btn ${reviewFilter === "5stars" ? "active" : ""}`}
                onClick={() => setReviewFilter("5stars")}
              >
                <span className="material-icons" style={{ fontSize: 16, color: "#facc15" }}>star</span>
                5 Estrellas ({visibleReviews.filter(r => (r.rating || 5) >= 5).length})
              </button>
            </div>

            {/* Filtro horizontal por Categorías */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              overflowX: "auto",
              padding: "4px 2px 14px",
              marginBottom: 20,
              scrollbarWidth: "none"
            }}>
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  border: categoryFilter === "all" ? "1.5px solid #a855f7" : "1px solid rgba(255,255,255,0.1)",
                  background: categoryFilter === "all" ? "rgba(168,85,247,0.25)" : "rgba(255,255,255,0.04)",
                  color: categoryFilter === "all" ? "#ffffff" : "rgba(255,255,255,0.65)",
                  transition: "all 0.2s ease"
                }}
              >
                🎮 Todas las categorías
              </button>
              {Object.keys(CATEGORIAS_CONFIG).map(catName => {
                const cat = CATEGORIAS_CONFIG[catName];
                const count = visibleReviews.filter(r => (r.categoria || "Nintendo Switch") === catName).length;
                if (count === 0 && categoryFilter !== catName) return null;
                const isSelected = categoryFilter === catName;
                return (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => setCategoryFilter(isSelected ? "all" : catName)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "6px 14px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      border: isSelected ? `1.5px solid ${cat.color}` : "1px solid rgba(255,255,255,0.1)",
                      background: isSelected ? cat.bg : "rgba(255,255,255,0.04)",
                      color: isSelected ? "#ffffff" : "rgba(255,255,255,0.65)",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: 14, color: cat.color }}>{cat.icon}</span>
                    {catName} ({count})
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Grid de Reseñas */}
        {loading ? (
          <div className="test-loading">Cargando opiniones de clientes…</div>
        ) : filteredReviews.length === 0 ? (
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1.5px dashed rgba(162,89,255,0.25)",
            borderRadius: 18,
            padding: "40px 20px",
            textAlign: "center",
            marginBottom: 30
          }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(162,89,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <span className="material-icons" style={{ fontSize: 32, color: "#facc15" }}>rate_review</span>
            </div>
            <h4 style={{ margin: "0 0 6px", fontSize: 18, color: "#fff", fontWeight: 800 }}>¡Aún no hay reseñas en esta vista!</h4>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "#c4b5fd" }}>
              Sé el primero en compartir tu opinión y la foto de tu juego en PC o consola.
            </p>
            <button
              type="button"
              className="google-write-btn"
              onClick={openReviewModal}
              style={{ margin: "0 auto" }}
            >
              <span className="material-icons" style={{ fontSize: 18 }}>add_comment</span>
              Dejar la Primera Reseña
            </button>
          </div>
        ) : (
          <div className="reviews-grid">
            {filteredReviews.map((rev) => (
              <div
                key={rev.id}
                className="review-card"
                style={{
                  opacity: rev.visible === false ? 0.6 : 1,
                  border: rev.visible === false ? "1.5px dashed rgba(239,68,68,0.5)" : undefined
                }}
              >
                <div>
                  <div className="review-card-top-row">
                    <div className="review-avatar">
                      {rev.userAvatar ? (
                        <img src={rev.userAvatar} alt={rev.nombre} />
                      ) : (
                        <img src={pandaGamerAvatar} alt="Invitado Panda" style={{ background: "#1c1335", padding: 2 }} />
                      )}
                    </div>
                    <div className="review-author-info">
                      <div className="review-author-name">
                        <span className="review-author-name-text">{rev.nombre || "Cliente Verificado"}</span>
                        {rev.verified && (
                          <span className="review-verified-badge" title="Compra confirmada">
                            <span className="material-icons" style={{ fontSize: 11 }}>verified</span>
                            Verificado
                          </span>
                        )}
                        {rev.isGuest && (
                          <span className="review-guest-badge" title="Opinión enviada como invitado">
                            Invitado
                          </span>
                        )}
                        {role === "admin" && rev.visible === false && (
                          <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 6, textTransform: "uppercase" }}>
                            🚫 Oculta
                          </span>
                        )}
                      </div>
                      <div className="review-date">{rev.fecha || "Reciente"}</div>
                    </div>

                    {role === "admin" && (
                      <button
                        type="button"
                        className="review-delete-btn"
                        onClick={() => handleDeleteReview(rev.id)}
                        title="Eliminar reseña definitivamente"
                      >
                        <span className="material-icons" style={{ fontSize: 14 }}>delete</span>
                      </button>
                    )}
                  </div>

                  {/* Estrellas */}
                  <div className="review-stars-row">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        style={{ color: i < (rev.rating || 5) ? "#facc15" : "rgba(255,255,255,0.2)" }}
                      >
                        ★
                      </span>
                    ))}
                  </div>

                  {/* Chips de Categoría y Producto */}
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, margin: "8px 0 10px" }}>
                    {rev.categoria && (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "3px 9px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        color: (CATEGORIAS_CONFIG[rev.categoria] || CATEGORIAS_CONFIG["Otro Producto"]).color,
                        background: (CATEGORIAS_CONFIG[rev.categoria] || CATEGORIAS_CONFIG["Otro Producto"]).bg,
                        border: `1px solid ${(CATEGORIAS_CONFIG[rev.categoria] || CATEGORIAS_CONFIG["Otro Producto"]).border}`
                      }}>
                        <span className="material-icons" style={{ fontSize: 13 }}>
                          {(CATEGORIAS_CONFIG[rev.categoria] || CATEGORIAS_CONFIG["Otro Producto"]).icon}
                        </span>
                        {rev.categoria}
                      </span>
                    )}

                    {rev.juego && rev.juego !== rev.categoria && (
                      <div className="review-game-chip">
                        <span className="material-icons" style={{ fontSize: 13 }}>sports_esports</span>
                        {rev.juego}
                      </div>
                    )}
                  </div>

                  {/* Texto */}
                  <p className="review-text">"{rev.comentario}"</p>
                </div>

                {/* Foto adjunta del cliente */}
                {rev.foto && !brokenPhotos[rev.id] && (
                  <div
                    className="review-photo-container"
                    onClick={() => setLightboxImage(rev.foto)}
                    title="Ver captura en tamaño completo"
                  >
                    <img
                      src={rev.foto}
                      alt={`Captura del juego de ${rev.nombre || "cliente"}`}
                      loading="lazy"
                      onError={() => {
                        setBrokenPhotos(prev => ({ ...prev, [rev.id]: true }));
                      }}
                    />
                    <div className="review-photo-badge">
                      <span className="material-icons" style={{ fontSize: 13 }}>zoom_in</span>
                      Foto del cliente
                    </div>
                  </div>
                )}

                {/* Controles para Administrador: Ocultar / Mostrar y Eliminar */}
                {role === "admin" && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 14,
                    paddingTop: 10,
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    gap: 8
                  }}>
                    <button
                      type="button"
                      onClick={() => toggleReviewVisibility(rev)}
                      style={{
                        background: rev.visible === false ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                        border: `1px solid ${rev.visible === false ? "rgba(16,185,129,0.4)" : "rgba(245,158,11,0.4)"}`,
                        color: rev.visible === false ? "#34d399" : "#fbbf24",
                        borderRadius: 8,
                        padding: "5px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}
                      title={rev.visible === false ? "Hacer visible en la tienda" : "Ocultar de la tienda"}
                    >
                      <span className="material-icons" style={{ fontSize: 13 }}>
                        {rev.visible === false ? "visibility" : "visibility_off"}
                      </span>
                      {rev.visible === false ? "Mostrar en tienda" : "Ocultar"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteReview(rev.id)}
                      style={{
                        background: "rgba(239,68,68,0.15)",
                        border: "1px solid rgba(239,68,68,0.35)",
                        color: "#f87171",
                        borderRadius: 8,
                        padding: "5px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}
                      title="Eliminar permanentemente"
                    >
                      <span className="material-icons" style={{ fontSize: 13 }}>delete</span>
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════
          2. GALERÍA DE ENTREGAS Y COMPROBANTES OFICIALES
             (Ordenadas con las más actuales primero)
      ══════════════════════════════════════════════ */}
      <section className="official-gallery-section">
        <div className="official-gallery-header">
          <div className="official-gallery-divider" />
          <h3 className="official-gallery-title">
            📸 Comprobantes & Entregas Oficiales
          </h3>
          <p className="official-gallery-sub">
            Capturas de chat y entregas de pedidos verificadas por PandaStore (más recientes primero)
          </p>
        </div>

        {/* Panel Admin de Subida de Fotos */}
        {role === "admin" && (
          <div className="test-admin-panel">
            <div className="test-admin-panel-header">
              <div className="test-admin-panel-title">
                <span className="material-icons" style={{ fontSize: 22, color: "#a259ff" }}>cloud_upload</span>
                Subir nuevas capturas de entregas (Hasta 500 fotos del tirón)
              </div>
              <span className="test-admin-batch-badge">
                <span className="material-icons" style={{ fontSize: 13, color: "#34d399" }}>verified_user</span>
                Filtro Inteligente Anti-Duplicados Activo
              </span>
            </div>

            {/* Banner de Duplicados Existentes en BD */}
            {existingDuplicates.length > 0 && (
              <div className="test-admin-dup-banner">
                <div className="test-admin-dup-left">
                  <span className="material-icons" style={{ color: "#f59e0b", fontSize: 28 }}>auto_delete</span>
                  <div>
                    <div className="test-admin-dup-title">
                      Se detectaron <strong>{existingDuplicates.length} fotos duplicadas repetidas</strong> en la galería
                    </div>
                    <div className="test-admin-dup-sub">
                      Detectamos capturas idénticas en la base de datos. Puedes depurarlas con 1 clic para dejar solo fotos únicas.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="test-admin-cleanup-btn"
                  onClick={handleCleanDuplicates}
                  disabled={cleaningDuplicates || uploading}
                >
                  <span className="material-icons" style={{ fontSize: 18 }}>delete_sweep</span>
                  {cleaningDuplicates ? "Depurando…" : `Eliminar ${existingDuplicates.length} Duplicados`}
                </button>
              </div>
            )}

            <div
              className={`test-upload-zone${dragOver ? " drag-over" : ""}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={e => { addFiles(e.target.files); e.target.value = ""; }}
              />
              <div className="test-upload-zone-icon">
                <span className="material-icons" style={{ fontSize: 44, color: "#a259ff" }}>add_photo_alternate</span>
              </div>
              <div className="test-upload-zone-text">
                <strong>Haz clic o arrastra hasta 500 fotos</strong> desde tu celular o computador
              </div>
              <div className="test-upload-zone-hint">
                JPG, PNG, WEBP · Si seleccionas fotos que ya están subidas, se omiten automáticamente
              </div>
            </div>

            {pendingFiles.length > 0 && (
              <div className="test-batch-preview-wrapper">
                <div className="test-batch-info-strip">
                  <div className="test-batch-info-left">
                    <span className="material-icons" style={{ color: "#34d399", fontSize: 20 }}>check_circle</span>
                    <span><strong>{pendingFiles.length} capturas únicas listas</strong> para subir</span>
                  </div>
                  {!uploading && (
                    <button
                      type="button"
                      className="test-batch-discard-btn"
                      onClick={clearFiles}
                    >
                      <span className="material-icons" style={{ fontSize: 14 }}>delete_outline</span>
                      Descartar selección
                    </button>
                  )}
                </div>

                <div className="test-preview-grid">
                  {pendingFiles.slice(0, 36).map(entry => (
                    <div key={entry.key} className="test-preview-thumb">
                      <img src={entry.preview} alt="" />
                      <button
                        className="test-preview-thumb-remove"
                        onClick={() => removeFile(entry.key)}
                        type="button"
                        aria-label="Quitar imagen"
                        disabled={uploading}
                      >
                        <span className="material-icons" style={{ fontSize: 12 }}>close</span>
                      </button>
                    </div>
                  ))}
                  {pendingFiles.length > 36 && (
                    <div className="test-preview-thumb-more">
                      <span>+{pendingFiles.length - 36}</span>
                      <small>fotos más</small>
                    </div>
                  )}
                </div>
              </div>
            )}

            {uploading && (
              <div className="test-progress-box">
                <div className="test-progress-wrap">
                  <div className="test-progress-bar" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="test-progress-label">
                  <span className="material-icons" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>sync</span>
                  Subiendo en paralelo: {uploadProgress.done} de {uploadProgress.total} fotos ({progressPct}%)…
                </div>
              </div>
            )}

            <div className="test-upload-footer">
              {pendingFiles.length > 0 && (
                <button
                  className="test-upload-btn"
                  onClick={handleUpload}
                  disabled={uploading}
                  type="button"
                >
                  <span className="material-icons" style={{ fontSize: 19 }}>
                    {uploading ? "hourglass_top" : "cloud_upload"}
                  </span>
                  {uploading
                    ? `Subiendo ${uploadProgress.done} de ${uploadProgress.total}…`
                    : `Subir ${pendingFiles.length} foto${pendingFiles.length !== 1 ? "s" : ""} ahora`}
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="test-error">
                <span className="material-icons" style={{ fontSize: 16 }}>error_outline</span>
                {errorMsg}
              </div>
            )}
          </div>
        )}

        {/* Grid de Fotos de Entregas */}
        {loading ? (
          <div className="test-loading">Cargando galería de testimonios…</div>
        ) : sortedTestimonios.length === 0 ? (
          <div className="test-empty">
            <div className="test-empty-icon">
              <span className="material-icons" style={{ fontSize: 48 }}>photo_library</span>
            </div>
            <p>Aún no hay capturas en la galería</p>
          </div>
        ) : (
          <>
            <div className="test-grid">
              {pageItems.map((t) => (
                <div
                  key={t.id}
                  className="test-card"
                  onClick={() => setLightboxImage(t.imagen)}
                >
                  <img src={t.imagen} alt="Entrega verificada PandaStore" loading="lazy" />
                  <div className="test-card-overlay">
                    <span className="material-icons test-card-zoom-icon">zoom_in</span>
                  </div>
                  {role === "admin" && (
                    <button
                      className="test-card-delete-btn"
                      onClick={e => { e.stopPropagation(); handleDeleteDelivery(t.id); }}
                      aria-label="Eliminar testimonio"
                      type="button"
                    >
                      <span className="material-icons" style={{ fontSize: 14, color: "#fff" }}>delete</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="test-pagination">
                <button
                  className="test-page-btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Anterior
                </button>
                <span className="test-page-info">Página {page} de {totalPages}</span>
                <button
                  className="test-page-btn"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ══════════════════════════════════════════════
          MODAL PARA PUBLICAR RESEÑA + FOTO DEL JUEGO
      ══════════════════════════════════════════════ */}
      {modalOpen && (
        <div className="review-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="review-modal-card" onClick={e => e.stopPropagation()}>
            <button
              className="review-modal-close"
              onClick={() => setModalOpen(false)}
              aria-label="Cerrar"
            >
              ✕
            </button>

            <h3 className="review-modal-title">
              ⭐ Deja tu Reseña en PandaStore
            </h3>
            <p className="review-modal-sub">
              Tu opinión es 100% real y ayuda a otros gamers. Puedes adjuntar una foto de tu juego corriendo en tu consola o PC.
            </p>

            {reviewSuccessMsg ? (
              <div style={{ padding: "30px 20px", textAlign: "center", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 16 }}>
                <span className="material-icons" style={{ fontSize: 48, color: "#34d399", display: "block", marginBottom: 10 }}>check_circle</span>
                <h4 style={{ margin: "0 0 6px", fontSize: 18, color: "#fff" }}>¡Reseña Enviada con Éxito!</h4>
                <p style={{ margin: 0, color: "#34d399", fontSize: 14 }}>{reviewSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview}>
                {/* Selector de Estrellas */}
                <div className="modal-form-group">
                  <label className="modal-form-label">Calificación *</label>
                  <div className="modal-star-picker">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`modal-star-btn ${s <= reviewForm.rating ? "active" : ""}`}
                        onClick={() => setReviewForm(prev => ({ ...prev, rating: s }))}
                        title={`${s} estrellas`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Usuario que publica (Automático) */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", padding: "6px 14px", borderRadius: 20, fontSize: 12, color: "#e2e8f0", marginBottom: 14 }}>
                  <span className="material-icons" style={{ fontSize: 16, color: "#34d399" }}>verified_user</span>
                  <span>Publicando como: <strong style={{ color: "#ffffff" }}>{user ? (user.displayName || user.email?.split("@")[0]) : "Gamer Invitado"}</strong></span>
                </div>

                {/* Categoría Comprada */}
                <div className="modal-form-group">
                  <label className="modal-form-label">¿Qué categoría compraste? *</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8, marginTop: 6 }}>
                    {Object.keys(CATEGORIAS_CONFIG).map((catName) => {
                      const cat = CATEGORIAS_CONFIG[catName];
                      const isSelected = reviewForm.categoria === catName;
                      return (
                        <button
                          key={catName}
                          type="button"
                          onClick={() => setReviewForm(prev => ({ ...prev, categoria: catName }))}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 10px",
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            textAlign: "left",
                            border: isSelected ? `2px solid ${cat.color}` : "1px solid rgba(255,255,255,0.1)",
                            background: isSelected ? cat.bg : "rgba(255,255,255,0.03)",
                            color: isSelected ? "#ffffff" : "rgba(255,255,255,0.7)",
                            boxShadow: isSelected ? `0 0 12px ${cat.border}` : "none",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <span className="material-icons" style={{ fontSize: 16, color: cat.color }}>
                            {cat.icon}
                          </span>
                          <span style={{ lineHeight: 1.2 }}>{catName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comentario */}
                <div className="modal-form-group">
                  <label className="modal-form-label">Tu Experiencia o Comentario *</label>
                  <textarea
                    rows={4}
                    className="modal-textarea"
                    value={reviewForm.comentario}
                    onChange={e => setReviewForm(prev => ({ ...prev, comentario: e.target.value }))}
                    placeholder="Escribe qué tal fue la compra, la rapidez de entrega y el funcionamiento del juego..."
                    required
                  />
                </div>

                {/* Foto del juego corriendo */}
                <div className="modal-form-group">
                  <label className="modal-form-label">Foto de tu juego corriendo o setup (Opcional)</label>
                  {!reviewPhotoPreview ? (
                    <label className="modal-photo-drop">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        style={{ display: "none" }}
                      />
                      <span className="material-icons modal-photo-icon">add_a_photo</span>
                      <strong className="modal-photo-title">
                        Sube una captura de tu juego corriendo
                      </strong>
                      <span className="modal-photo-hint">
                        JPG, PNG, WEBP (pantallazo, foto a tu monitor o consola)
                      </span>
                    </label>
                  ) : (
                    <div className="modal-photo-preview">
                      <img src={reviewPhotoPreview} alt="Preview" />
                      <button
                        type="button"
                        className="modal-photo-remove"
                        onClick={handleRemoveReviewPhoto}
                        title="Quitar foto"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="modal-submit-btn"
                  disabled={submittingReview}
                >
                  <span className="material-icons" style={{ fontSize: 18 }}>
                    {submittingReview ? "hourglass_top" : "send"}
                  </span>
                  {submittingReview ? "Enviando Reseña…" : "Publicar mi Reseña"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          LIGHTBOX ZOOM UNIVERSAL
      ══════════════════════════════════════════════ */}
      {lightboxImage && (
        <div
          className="test-lightbox-overlay"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="test-lightbox-close"
            onClick={() => setLightboxImage(null)}
            aria-label="Cerrar"
          >
            <span className="material-icons" style={{ fontSize: 22 }}>close</span>
          </button>

          <img
            src={lightboxImage}
            alt="Captura ampliada"
            className="test-lightbox-img"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── MODAL ALERT & CONFIRM PERSONALIZADO GAMER ── */}
      <PandaModalAlert
        isOpen={modalAlert.isOpen}
        type={modalAlert.type}
        title={modalAlert.title}
        message={modalAlert.message}
        confirmText={modalAlert.confirmText}
        cancelText={modalAlert.cancelText}
        danger={modalAlert.danger}
        onConfirm={modalAlert.onConfirm}
        onCancel={modalAlert.onCancel}
      />
    </div>
  );
}
