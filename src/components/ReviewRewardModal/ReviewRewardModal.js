import React, { useEffect, useState } from "react";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import "./ReviewRewardModal.css";

const REVIEW_REWARD_KEY = "pandaReviewRewardClaimed";
const COUPON_CODE = "PANDA15";

export default function ReviewRewardModal({ visible, onClose }) {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const currentUser = auth.currentUser;
    setUser(currentUser);
    setError("");
    setCompleted(false);
    setComment("");
    setRating(5);

    if (!currentUser) {
      setName("");
      return;
    }

    const fallbackName = currentUser.displayName || currentUser.email?.split("@")[0] || "Cliente Panda";
    setName(fallbackName);
    getDoc(doc(db, "users", currentUser.uid))
      .then((snapshot) => {
        const profile = snapshot.data();
        const profileName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();
        if (profileName) setName(profileName);
      })
      .catch(() => {});
  }, [visible]);

  if (!visible) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanComment = comment.trim();
    if (cleanName.length < 2) return setError("Escribe tu nombre para continuar.");
    if (cleanComment.length < 10) return setError("Cuéntanos un poquito más: mínimo 10 caracteres.");

    setSending(true);
    setError("");
    const isGuest = !user?.uid;
    try {
      await addDoc(collection(db, "testimonios_reviews"), {
        rating: Number(rating),
        nombre: cleanName,
        categoria: "Experiencia PandaStore",
        juego: "Opinión sobre PandaStore",
        comentario: cleanComment,
        foto: null,
        userAvatar: user?.photoURL || null,
        isGuest,
        userId: user?.uid || "guest",
        userEmail: user?.email || null,
        createdAt: Date.now(),
        fecha: new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }),
        verified: Boolean(user?.uid),
        visible: false,
        source: "welcome-review-reward",
      });
      localStorage.setItem(REVIEW_REWARD_KEY, "true");
      setCompleted(true);
    } catch (submitError) {
      console.error("No se pudo enviar la reseña:", submitError);
      setError("No pudimos enviar tu reseña. Inténtalo nuevamente.");
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(COUPON_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("No se pudo copiar. El código es PANDA15.");
    }
  };

  return (
    <div className="review-reward-overlay" role="dialog" aria-modal="true" aria-labelledby="review-reward-title">
      <section className="review-reward-card">
        <button className="review-reward-close" type="button" onClick={onClose} aria-label="Cerrar">×</button>
        {completed ? (
          <div className="review-reward-success">
            <span className="review-reward-success-icon">✓</span>
            <p className="review-reward-kicker">¡Gracias por tu opinión!</p>
            <h2 id="review-reward-title">Tu cupón ya está listo</h2>
            <p>Tu reseña quedó enviada para revisión. Úsalo en tu próxima compra.</p>
            <div className="review-reward-coupon"><strong>{COUPON_CODE}</strong><span>15% OFF</span></div>
            <button className="review-reward-copy" type="button" onClick={handleCopy}>{copied ? "✓ Cupón copiado" : "Copiar cupón"}</button>
            <button className="review-reward-later" type="button" onClick={onClose}>Seguir explorando</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="review-reward-kicker">UN MINUTO PARA AYUDARNOS</p>
            <h2 id="review-reward-title">¿Cómo fue tu experiencia?</h2>
            <p className="review-reward-intro">Déjanos una reseña corta y recibe un cupón de descuento para tu próxima compra.</p>
            <label className="review-reward-label">Tu calificación</label>
            <div className="review-reward-stars" aria-label="Calificación">
              {[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" className={star <= rating ? "selected" : ""} onClick={() => setRating(star)} aria-label={`${star} estrellas`}>★</button>)}
            </div>
            <label className="review-reward-label" htmlFor="review-reward-name">Tu nombre</label>
            <input id="review-reward-name" value={name} onChange={(e) => setName(e.target.value)} maxLength="50" placeholder="¿Cómo te llamas?" />
            <label className="review-reward-label" htmlFor="review-reward-comment">Tu experiencia</label>
            <textarea id="review-reward-comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength="500" rows="3" placeholder="Cuéntanos brevemente qué te pareció PandaStore" />
            {error && <p className="review-reward-error">{error}</p>}
            <button className="review-reward-submit" type="submit" disabled={sending}>{sending ? "Enviando..." : "Enviar reseña y obtener cupón"}</button>
            <button className="review-reward-later" type="button" onClick={onClose}>Ahora no, gracias</button>
          </form>
        )}
      </section>
    </div>
  );
}

export { REVIEW_REWARD_KEY };
