import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";

const styles = {
  container: {
    maxWidth: 800,
    margin: "40px auto",
    padding: 30,
    background: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    boxShadow: "0 8px 32px 0 rgba(0,0,0,0.10)",
    border: "2px solid #e2e8f0",
    backdropFilter: 'blur(4px)',
    fontFamily: 'Montserrat, sans-serif',
    textAlign: "center"
  },
  title: {
    fontWeight: 800,
    fontSize: 32,
    color: '#1e293b',
    marginBottom: 10,
  },
  subtitle: {
    color: "#64748b",
    fontSize: 16,
    marginBottom: 40,
    lineHeight: 1.6
  },
  listContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    alignItems: "center"
  },
  card: {
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    padding: "20px 25px",
    width: "100%",
    maxWidth: "650px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  cardInfo: {
    textAlign: "left",
    flex: 1,
    paddingRight: 20
  },
  cardTitle: {
    margin: "0 0 5px 0",
    color: "#0f172a",
    fontSize: "18px",
    fontWeight: "700"
  },
  cardDesc: {
    margin: 0,
    color: "#64748b",
    fontSize: "14px"
  },
  cardActions: {
    display: "flex",
    gap: "10px"
  },
  btnTest: {
    background: "linear-gradient(135deg, #a259ff 0%, #6d28d9 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 30,
    padding: "10px 15px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(162, 89, 255, 0.3)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "opacity 0.2s"
  },
  btnPreview: {
    background: "#f1f5f9",
    color: "#475569",
    border: "1px solid #cbd5e1",
    borderRadius: 30,
    padding: "10px 15px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "background 0.2s"
  },
  statusMsg: {
    marginTop: 20,
    padding: 15,
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 15
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    padding: "20px"
  },
  modalContent: {
    background: "#fff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "700px",
    height: "85vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 10px 40px rgba(0,0,0,0.4)"
  },
  modalHeader: {
    background: "#f8fafc",
    padding: "15px 25px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  modalTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "bold",
    color: "#1e293b"
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px",
    borderRadius: "50%"
  },
  modalBody: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    background: "#f1f5f9",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start"
  },
  iframeWrapper: {
    width: "100%",
    maxWidth: "600px", // Ancho de correo
    background: "#fff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
  }
};

const TEMPLATES = [
  { id: "confirmacion", title: "Confirmación de Compra", desc: "El correo que se envía al cliente tras un pago exitoso." },
  { id: "pendiente", title: "Pedido Pendiente", desc: "El correo para compras por transferencia manual (esperando pago)." },
  { id: "soporte_cliente", title: "Respuesta de Soporte", desc: "El correo que recibe el cliente cuando le respondes un ticket." },
  { id: "admin_pedido", title: "Aviso: Nuevo Pedido (Admin)", desc: "La notificación que te llega a ti cuando hay una nueva venta." },
  { id: "admin_ticket", title: "Aviso: Nuevo Ticket (Admin)", desc: "La notificación que te llega cuando un cliente pide soporte." }
];

export default function AdminExportEmails({ user, role }) {
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState(null);
  const [status, setStatus] = useState(null);
  
  // States para la vista previa
  const [previewsData, setPreviewsData] = useState(null);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const [previewModal, setPreviewModal] = useState({ open: false, html: "", title: "" });

  useEffect(() => {
    if (!user || role !== "admin") {
      navigate("/home");
    }
  }, [user, role, navigate]);

  const handleTest = async (id, title) => {
    setLoadingId(id);
    setStatus(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("https://us-central1-pandastoreupdate.cloudfunctions.net/enviarCorreosDePrueba", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
        body: JSON.stringify({ tipo: id })
      });
      const data = await response.json();
      if (data.success) {
        setStatus({ type: "success", text: `¡Se ha enviado la prueba de "${title}" a tu correo personal! Revisa tu bandeja.` });
      } else {
        setStatus({ type: "error", text: "Hubo un error al enviar la prueba: " + (data.error || "") });
      }
    } catch (e) {
      setStatus({ type: "error", text: "No se pudo conectar con el servidor." });
    }
    setLoadingId(null);
  };

  const handlePreview = async (id, title) => {
    setStatus(null);
    
    // Si ya tenemos las vistas previas cacheadas, solo abrimos el modal
    if (previewsData && previewsData[id]) {
      setPreviewModal({ open: true, html: previewsData[id], title: title });
      return;
    }

    // Si no las tenemos, hacemos fetch al backend
    setLoadingPreviews(true);
    try {
      const response = await fetch("https://us-central1-pandastoreupdate.cloudfunctions.net/obtenerVistasPreviasHTML");
      const data = await response.json();
      
      if (data.success && data.templates) {
        setPreviewsData(data.templates);
        setPreviewModal({ open: true, html: data.templates[id] || "No hay diseño disponible", title: title });
      } else {
        setStatus({ type: "error", text: "Hubo un error al obtener las vistas previas." });
      }
    } catch (e) {
      setStatus({ type: "error", text: "No se pudo conectar con el servidor para la vista previa." });
    }
    setLoadingPreviews(false);
  };

  const closePreview = () => setPreviewModal({ ...previewModal, open: false });

  return (
    <div style={styles.container}>
      <span className="material-icons" style={{ fontSize: 60, color: "#a259ff", marginBottom: 10 }}>palette</span>
      <h1 style={styles.title}>Probador de Plantillas de Correo</h1>
      <p style={styles.subtitle}>
        Aquí puedes ver todos los tipos de correos automáticos que la tienda envía.<br/>
        Haz clic en "Ver Vista Previa" para verlo aquí mismo o en "Enviar Prueba" para recibirlo en tu correo.
      </p>

      <div style={styles.listContainer}>
        {TEMPLATES.map((tpl) => (
          <div key={tpl.id} style={styles.card}>
            <div style={styles.cardInfo}>
              <h3 style={styles.cardTitle}>{tpl.title}</h3>
              <p style={styles.cardDesc}>{tpl.desc}</p>
            </div>
            <div style={styles.cardActions}>
              <button 
                style={styles.btnPreview} 
                onClick={() => handlePreview(tpl.id, tpl.title)}
                disabled={loadingPreviews}
              >
                <span className="material-icons">{loadingPreviews ? "hourglass_empty" : "visibility"}</span>
                Previa
              </button>

              <button 
                style={{...styles.btnTest, opacity: loadingId ? 0.6 : 1}} 
                onClick={() => handleTest(tpl.id, tpl.title)}
                disabled={loadingId !== null || loadingPreviews}
              >
                <span className="material-icons">{loadingId === tpl.id ? "hourglass_empty" : "send"}</span>
                {loadingId === tpl.id ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {status && (
        <div style={{...styles.statusMsg, background: status.type === 'success' ? '#dcfce7' : '#fee2e2', color: status.type === 'success' ? '#166534' : '#991b1b'}}>
          {status.text}
        </div>
      )}

      {/* Modal de Vista Previa */}
      {previewModal.open && (
        <div style={styles.modalOverlay} onClick={closePreview}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Vista Previa: {previewModal.title}</h2>
              <button style={styles.closeBtn} onClick={closePreview}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div style={styles.modalBody}>
              <div 
                style={styles.iframeWrapper} 
                dangerouslySetInnerHTML={{ __html: previewModal.html }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
