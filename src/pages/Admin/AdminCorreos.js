import React, { useEffect, useState, useMemo, useCallback } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import "./AdminCorreos.css";
const FUNCTIONS_BASE = "https://us-central1-pandastoreupdate.cloudfunctions.net";
/* ── Utility: Formatting Dates ── */
function formatDate(val) {
  if (!val) return "—";
  const d = val.toDate ? val.toDate() : new Date(val);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}
function formatRelativeTime(val) {
  if (!val) return "—";
  const d = val.toDate ? val.toDate() : new Date(val);
  if (isNaN(d.getTime())) return "—";
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 30) return `Hace ${diffDays} días`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
  return formatDate(val);
}
function formatCLP(amount) {
  if (!amount || isNaN(amount)) return "$0 CLP";
  return `$${Math.round(amount).toLocaleString("es-CL")} CLP`;
}
/* ── Generador de Plantilla: Pedir Reseña con Cupón ── */
function buildReviewTemplate(codigoCupon = "", descuento = "") {
  const cuponHtml = codigoCupon ? `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0; background-color: #170d2c; border: 2px dashed #a855f7; border-radius: 16px;">
  <tr>
    <td align="center" style="padding: 24px 20px;">
      <p style="margin: 0 0 6px 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: #c084fc; text-transform: uppercase; letter-spacing: 2px;">
        🎁 Beneficio de Agradecimiento
      </p>
      <h3 style="margin: 0 0 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 19px; font-weight: bold; color: #ffffff;">
        Cupón especial para tu próxima compra
      </h3>
      <p style="margin: 0 0 16px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #cbd5e1;">
        Usa este código en tu carrito y obtén <strong style="color: #facc15;">${descuento ? `${descuento}% de descuento` : 'un descuento especial'}</strong>:
      </p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; background-color: #0c0618; border: 2px solid #a855f7; border-radius: 10px;">
        <tr>
          <td align="center" style="padding: 12px 32px; font-family: 'Courier New', Courier, monospace; font-size: 24px; font-weight: 900; color: #38bdf8; letter-spacing: 4px;">
            ${codigoCupon}
          </td>
        </tr>
      </table>
      <p style="margin: 14px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #94a3b8;">
        ✅ Válido para cualquier videojuego o suscripción en toda la tienda.
      </p>
    </td>
  </tr>
</table>` : '';
  return {
    asunto: 'PandaStore: Muchas gracias por tu compra (Tu beneficio especial)',
    htmlBody: `
<div style="background-color: #1a0f30; border-left: 4px solid #a855f7; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
  <h2 style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 20px; font-weight: bold; color: #ffffff;">
    ¡Muchas gracias por tu compra, {{nombre}}! 👋🎮
  </h2>
</div>
<p style="margin: 0 0 16px 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #f1f5f9;">
  Esperamos que ya estés disfrutando al máximo de tus nuevos juegos. En <strong>PandaStore</strong> trabajamos día a día para entregarte la mejor experiencia: activación inmediata, soporte gamer dedicado y los mejores precios de Chile.
</p>
<p style="margin: 0 0 24px 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #f1f5f9;">
  Tu opinión es fundamental para nosotros y ayuda a toda la comunidad gamer a comprar con total confianza. <strong>¿Nos regalas 1 minuto para dejarnos tu reseña?</strong> ⭐
</p>
<!-- CTA BUTTON 1: RESEÑA -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0;">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; background-color: #ec4899; border-radius: 12px;">
        <tr>
          <td align="center" bgcolor="#ec4899" style="border-radius: 12px; background-color: #ec4899;">
            <a href="https://pandastoreupdate.web.app/testimonios" target="_blank" rel="noopener noreferrer" style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 15px 32px; border-radius: 12px; display: inline-block; background-color: #ec4899; letter-spacing: 0.5px;">
              ⭐ Dejar mi reseña de compra →
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
${cuponHtml}
    `.trim()
  };
}
/* ── Preview renders the edited body inside the fixed header/footer ── */
/* ── Generador de Plantilla: Recuperación de Carrito Abandonado con Cupón ── */
function buildAbandonedCartTemplate(codigoCupon = "", descuento = "", gameName = "tus juegos seleccionados") {
  const cuponHtml = codigoCupon ? `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0; background-color: #170d2c; border: 2px dashed #ec4899; border-radius: 16px;">
  <tr>
    <td align="center" style="padding: 24px 20px;">
      <p style="margin: 0 0 6px 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: #f472b6; text-transform: uppercase; letter-spacing: 2px;">
        🛒 Tu Beneficio Exclusivo de Recuperación
      </p>
      <h3 style="margin: 0 0 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 19px; font-weight: bold; color: #ffffff;">
        Completa tu pedido hoy con descuento extra
      </h3>
      <p style="margin: 0 0 16px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #cbd5e1;">
        Usa este cupón en el checkout para desbloquear <strong style="color: #facc15;">${descuento ? `${descuento}% de descuento` : 'un descuento especial'}</strong>:
      </p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; background-color: #0c0618; border: 2px solid #ec4899; border-radius: 10px;">
        <tr>
          <td align="center" style="padding: 12px 32px; font-family: 'Courier New', Courier, monospace; font-size: 24px; font-weight: 900; color: #f472b6; letter-spacing: 4px;">
            ${codigoCupon}
          </td>
        </tr>
      </table>
      <p style="margin: 14px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #94a3b8;">
        ⚡ Entrega inmediata 24/7 y garantía total de activación.
      </p>
    </td>
  </tr>
</table>` : '';
  return {
    asunto: `{{nombre}}, ¡dejaste juegos en tu carrito! Completa tu pedido con descuento 🛒`,
    htmlBody: `
<div style="background-color: #1a0f30; border-left: 4px solid #ec4899; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
  <h2 style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 20px; font-weight: bold; color: #ffffff;">
    ¡Hola {{nombre}}! Notamos que dejaste juegos en tu carrito 🎮
  </h2>
</div>
<p style="margin: 0 0 16px 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #f1f5f9;">
  Vimos que guardaste <strong>${gameName}</strong> en tu carrito de compras de <strong>PandaStore</strong> pero aún no completas tu pedido.
</p>
<p style="margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #f1f5f9;">
  Para que no te quedes con las ganas de estrenar y disfrutar hoy mismo, te preparamos un regalo gamer exclusivo para que finalices tu compra al mejor precio de Chile.
</p>
${cuponHtml}
<!-- CTA BUTTON: FINALIZAR COMPRA -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0;">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; background-color: #00f5d4; border-radius: 12px;">
        <tr>
          <td align="center" bgcolor="#00f5d4" style="border-radius: 12px; background-color: #00f5d4;">
            <a href="https://pandastoreupdate.web.app/checkout" target="_blank" rel="noopener noreferrer" style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 900; color: #041c18; text-decoration: none; padding: 16px 36px; border-radius: 12px; display: inline-block; background-color: #00f5d4; letter-spacing: 0.5px;">
              🛒 Ir a mi carrito y finalizar compra →
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
    `.trim()
  };
}
/* ── Generador de Plantilla: Oferta de Juego Visto (Remarketing) ── */
function buildViewedGameTemplate(codigoCupon = "", descuento = "", gameName = "el juego que te interesó") {
  const cuponHtml = codigoCupon ? `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0; background-color: #170d2c; border: 2px dashed #38bdf8; border-radius: 16px;">
  <tr>
    <td align="center" style="padding: 24px 20px;">
      <p style="margin: 0 0 6px 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: #38bdf8; text-transform: uppercase; letter-spacing: 2px;">
        👀 Vimos que te gustó este título
      </p>
      <h3 style="margin: 0 0 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 19px; font-weight: bold; color: #ffffff;">
        Descuento especial en tu próxima orden
      </h3>
      <p style="margin: 0 0 16px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #cbd5e1;">
        Usa este cupón y ahorra <strong style="color: #facc15;">${descuento ? `${descuento}% OFF` : 'un porcentaje exclusivo'}</strong>:
      </p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; background-color: #0c0618; border: 2px solid #38bdf8; border-radius: 10px;">
        <tr>
          <td align="center" style="padding: 12px 32px; font-family: 'Courier New', Courier, monospace; font-size: 24px; font-weight: 900; color: #38bdf8; letter-spacing: 4px;">
            ${codigoCupon}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>` : '';
  return {
    asunto: `{{nombre}}, ¿aún pensando en ${gameName}? ¡Tenemos una oferta especial para ti! 🎮`,
    htmlBody: `
<div style="background-color: #1a0f30; border-left: 4px solid #38bdf8; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
  <h2 style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 20px; font-weight: bold; color: #ffffff;">
    ¡Hola {{nombre}}! ¿Buscando tu próxima gran partida? 🎮✨
  </h2>
</div>
<p style="margin: 0 0 16px 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #f1f5f9;">
  Vimos que estuviste viendo <strong>${gameName}</strong> en nuestra tienda. ¡Es una tremenda elección gamer!
</p>
<p style="margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #f1f5f9;">
  En <strong>PandaStore</strong> queremos que juegues sin gastar de más. Por eso te activamos este cupón exclusivo para que te lleves este o cualquier otro juego con entrega instantánea.
</p>
${cuponHtml}
<!-- CTA BUTTON: VER JUEGOS -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0;">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; background-color: #ec4899; border-radius: 12px;">
        <tr>
          <td align="center" bgcolor="#ec4899" style="border-radius: 12px; background-color: #ec4899;">
            <a href="https://pandastoreupdate.web.app/home" target="_blank" rel="noopener noreferrer" style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 900; color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 12px; display: inline-block; background-color: #ec4899; letter-spacing: 0.5px;">
              🎮 Explorar Catálogo y Comprar con Descuento →
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
    `.trim()
  };
}
function EmailPreview({ body, asunto, previewName = "Cliente PandaStore" }) {
  const logoSrc = require("../../assets/logos/miicono.png");
  const processedBody = (body || "")
    .replace(/{{nombre}}/gi, `<span style="color:#ec4899;font-weight:800">${previewName}</span>`)
    .replace(/{{name}}/gi, `<span style="color:#ec4899;font-weight:800">${previewName}</span>`);
  const processedAsunto = (asunto || "")
    .replace(/{{nombre}}/gi, previewName)
    .replace(/{{name}}/gi, previewName);
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #2d184d", boxShadow: "0 16px 48px rgba(0,0,0,0.5)", background: "#120b22" }}>
      {/* Top gradient bar */}
      <div style={{ height: 5, backgroundColor: "#ec4899" }} />
      {/* Header with Circular White Logo Badge */}
      <div style={{ background: "#1a0f33", padding: "30px 24px 24px", textAlign: "center", borderBottom: "1px solid #2e1a54" }}>
        <div style={{ width: 76, height: 76, borderRadius: "50%", background: "#ffffff", margin: "0 auto", padding: 4, border: "3px solid #a855f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={logoSrc} alt="PandaStore" style={{ width: 68, height: 68, borderRadius: "50%", objectFit: "cover" }} />
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#ffffff", letterSpacing: 2, marginTop: 12, textTransform: "uppercase" }}>PandaStore</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#c084fc", letterSpacing: 2, marginTop: 3, textTransform: "uppercase" }}>Tienda Digital Oficial de Videojuegos</div>
        {processedAsunto && (
          <div style={{ marginTop: 18, borderLeft: "4px solid #ec4899", background: "rgba(123,47,242,0.18)", borderRadius: "0 12px 12px 0", padding: "12px 18px", textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#ffffff" }}>{processedAsunto}</p>
          </div>
        )}
      </div>
      {/* Body */}
      <div
        style={{ background: "#120b22", padding: "28px 24px", color: "#f1f5f9", fontSize: 14.5, lineHeight: 1.6, minHeight: 80 }}
        dangerouslySetInnerHTML={{
          __html: processedBody || "<em style='color:#666'>El contenido del correo aparecerá aquí…</em>",
        }}
      />
      {/* Categories Grid with real brand icons */}
      <div style={{ background: "#150d2b", padding: "22px 20px 14px", borderTop: "1px solid #231640", textAlign: "center" }}>
        <p style={{ margin: "0 0 16px 0", fontSize: 13, fontWeight: "bold", color: "#a78bfa", textTransform: "uppercase", letterSpacing: 1.5 }}>
          Explora las categorías más buscadas
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <a href="https://pandastoreupdate.web.app/categoria/nintendo-switch" target="_blank" rel="noreferrer" style={{ textDecoration: "none", background: "#1a0f33", border: "1px solid #3b226e", borderRadius: 12, padding: "16px 10px", display: "block" }}>
            <img src="https://img.icons8.com/color/48/nintendo-switch.png" width="36" height="36" alt="Nintendo Switch" style={{ display: "block", margin: "0 auto 8px auto" }} />
            <div style={{ fontSize: 14, fontWeight: "bold", color: "#fff" }}>Nintendo Switch</div>
            <div style={{ fontSize: 12, color: "#ec4899", fontWeight: "bold", marginTop: 4 }}>Ver Juegos →</div>
          </a>
          <a href="https://pandastoreupdate.web.app/categoria/playstation" target="_blank" rel="noreferrer" style={{ textDecoration: "none", background: "#1a0f33", border: "1px solid #3b226e", borderRadius: 12, padding: "16px 10px", display: "block" }}>
            <img src="https://img.icons8.com/color/48/play-station.png" width="36" height="36" alt="PlayStation" style={{ display: "block", margin: "0 auto 8px auto" }} />
            <div style={{ fontSize: 14, fontWeight: "bold", color: "#fff" }}>PlayStation 5 & 4</div>
            <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: "bold", marginTop: 4 }}>Ver Catálogo →</div>
          </a>
          <a href="https://pandastoreupdate.web.app/categoria/steam" target="_blank" rel="noreferrer" style={{ textDecoration: "none", background: "#1a0f33", border: "1px solid #3b226e", borderRadius: 12, padding: "16px 10px", display: "block" }}>
            <img src="https://img.icons8.com/color/48/steam.png" width="36" height="36" alt="Steam PC" style={{ display: "block", margin: "0 auto 8px auto" }} />
            <div style={{ fontSize: 14, fontWeight: "bold", color: "#fff" }}>Steam PC</div>
            <div style={{ fontSize: 12, color: "#34d399", fontWeight: "bold", marginTop: 4 }}>Ver Ofertas →</div>
          </a>
          <a href="https://pandastoreupdate.web.app/packs-nintendo" target="_blank" rel="noreferrer" style={{ textDecoration: "none", background: "#1a0f33", border: "1px solid #3b226e", borderRadius: 12, padding: "16px 10px", display: "block" }}>
            <img src="https://img.icons8.com/color/48/fire-element.png" width="36" height="36" alt="Packs & Sagas" style={{ display: "block", margin: "0 auto 8px auto" }} />
            <div style={{ fontSize: 14, fontWeight: "bold", color: "#fff" }}>Packs & Sagas</div>
            <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: "bold", marginTop: 4 }}>Ver Promos →</div>
          </a>
        </div>
      </div>
      {/* CTA Button Ver Catálogo */}
      <div style={{ background: "#120b22", padding: "20px 24px", textAlign: "center" }}>
        <a href="https://pandastoreupdate.web.app/home" target="_blank" rel="noreferrer" style={{ display: "inline-block", background: "#7b2ff2", color: "#fff", fontSize: 15, fontWeight: "bold", padding: "15px 36px", borderRadius: 12, textDecoration: "none", letterSpacing: 0.5 }}>
          🛒 Ver Catálogo Completo de la Tienda →
        </a>
      </div>
      {/* Footer */}
      <div style={{ background: "#0b0714", borderTop: "1px solid #231640", padding: "24px 20px", textAlign: "center" }}>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "#a855f7", fontWeight: "bold", letterSpacing: 1.5, textTransform: "uppercase" }}>¿Dudas o consultas? Contáctanos:</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <a href="https://wa.me/56974751810" target="_blank" rel="noreferrer" style={{ background: "#1e293b", border: "1px solid #334155", color: "#22c55e", fontSize: 12, fontWeight: "bold", padding: "8px 14px", borderRadius: 8, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            <img src="https://img.icons8.com/color/48/whatsapp--v1.png" width="18" height="18" alt="WhatsApp" /> WhatsApp
          </a>
          <a href="https://t.me/NintendoChile2" target="_blank" rel="noreferrer" style={{ background: "#1e293b", border: "1px solid #334155", color: "#38bdf8", fontSize: 12, fontWeight: "bold", padding: "8px 14px", borderRadius: 8, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            <img src="https://img.icons8.com/color/48/telegram-app.png" width="18" height="18" alt="Telegram" /> Telegram
          </a>
        </div>
        <div style={{ borderTop: "1px solid #1a102b", marginTop: 16, paddingTop: 12 }}>
          <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>© {new Date().getFullYear()} PandaStore. Todos los derechos reservados.</p>
          <p style={{ margin: "4px 0 0", fontSize: 10, color: "#475569" }}>Recibes este correo porque eres un cliente registrado de PandaStore.</p>
          <p style={{ margin: "6px 0 0", fontSize: 10, color: "#64748b" }}>
            Si prefieres no recibir más promociones, puedes <span style={{ color: "#c084fc", textDecoration: "underline" }}>darte de baja aquí</span>.
          </p>
        </div>
      </div>
      {/* Bottom accent bar */}
      <div style={{ height: 5, backgroundColor: "#ec4899" }} />
    </div>
  );
}
/* ════════════════════════════════════════════════════════════ */
export default function AdminCorreos({ user, role }) {
  const navigate = useNavigate();
  /* ── Guards ── */
  useEffect(() => {
    if (!user || role !== "admin") navigate("/home");
  }, [user, role, navigate]);
  /* ── Unified Clients State ── */
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [segmentoActivo, setSegmentoActivo] = useState("todos"); // 'todos' | 'registrados' | 'invitados' | 'steam' | 'switch' | 'playstation' | 'sagas' | 'sin_compras' | 'recientes_30d'
  const [criterioOrden, setCriterioOrden] = useState("fecha_reciente"); // 'fecha_reciente' | 'fecha_antigua' | 'monto_desc' | 'pedidos_desc' | 'alfabetico'
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [clienteDetalleModal, setClienteDetalleModal] = useState(null); // Cliente para ver historial detallado
  /* ── Plantilla predeterminada ── */
  const plantillaInicial = useMemo(() => buildReviewTemplate(), []);
  /* ── State: form ── */
  const [asunto, setAsunto] = useState(plantillaInicial.asunto);
  const [htmlBody, setHtmlBody] = useState(plantillaInicial.htmlBody);
  const [tab, setTab] = useState("editor"); // "editor" | "preview"
  const [tipoPlantilla, setTipoPlantilla] = useState("resena"); // "resena" | "carrito" | "juego_visto"
  const [juegoContexto, setJuegoContexto] = useState("");
  /* ── State: send ── */
  const [enviando, setEnviando] = useState(false);
  const [enviandoPreview, setEnviandoPreview] = useState(false);
  const [alerta, setAlerta] = useState(null); // {tipo, msg}
  /* ── State: history ── */
  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  /* ── State: cupones ── */
  const [cupones, setCupones] = useState([]);
  const [cuponSeleccionado, setCuponSeleccionado] = useState("");
  /* ── LOAD UNIFIED CLIENTS: Users + Orders + Carts ── */
  useEffect(() => {
    (async () => {
      setLoadingClientes(true);
      try {
        const [usersSnap, ordersSnap, cartsSnap] = await Promise.allSettled([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "orders")),
          getDocs(collection(db, "abandonedCarts"))
        ]);
        const mapClientes = new Map();
        const getOrCreate = (rawEmail) => {
          if (!rawEmail || typeof rawEmail !== 'string') return null;
          const cleanEmail = rawEmail.trim().toLowerCase();
          if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) return null;
          if (!mapClientes.has(cleanEmail)) {
            mapClientes.set(cleanEmail, {
              id: cleanEmail,
              email: cleanEmail,
              displayName: '',
              tipo: 'invitado', // 'registrado' | 'invitado' | 'lead'
              isRegistered: false,
              isGuest: true,
              ordersCount: 0,
              totalSpentCLP: 0,
              orders: [],
              itemsComprados: new Set(),
              categoriasCompradas: new Set(),
              hasBoughtSteam: false,
              hasBoughtNintendo: false,
              hasBoughtPlaystation: false,
              hasBoughtSagas: false,
              createdAt: null,
              lastOrderDate: null,
              lastActivityDate: null
            });
          }
          return mapClientes.get(cleanEmail);
        };
        // 1. Process Registered Users
        if (usersSnap.status === 'fulfilled') {
          usersSnap.value.docs.forEach((d) => {
            const u = d.data();
            const client = getOrCreate(u.email);
            if (!client) return;
            client.tipo = 'registrado';
            client.isRegistered = true;
            client.isGuest = false;
            client.uid = d.id;
            const fullName = u.displayName || [u.firstName, u.lastName].filter(Boolean).join(" ");
            if (fullName && fullName.trim()) {
              client.displayName = fullName.trim();
            }
            if (u.createdAt) {
              const regDate = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
              if (!isNaN(regDate.getTime())) {
                client.createdAt = regDate;
                client.lastActivityDate = regDate;
              }
            }
          });
        }
        // 2. Process Orders (Both Guests & Registered)
        if (ordersSnap.status === 'fulfilled') {
          ordersSnap.value.docs.forEach((d) => {
            const o = d.data();
            const orderEmail = o.email || o.guestEmail || o.clienteEmail || o.shipping?.email;
            const client = getOrCreate(orderEmail);
            if (!client) return;
            // Name fallback from order
            if (!client.displayName) {
              const orderName = o.nombre || o.nombreCliente || o.clientName || o.shipping?.nombre;
              if (orderName && orderName.trim()) {
                client.displayName = orderName.trim();
              }
            }
            client.ordersCount += 1;
            const orderTotal = Number(o.totalCLP || o.total || 0);
            if (!isNaN(orderTotal) && orderTotal > 0) {
              client.totalSpentCLP += orderTotal;
            }
            // Order Date
            const rawDate = o.fecha || o.createdAt;
            if (rawDate) {
              const orderDate = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
              if (!isNaN(orderDate.getTime())) {
                if (!client.lastOrderDate || orderDate > client.lastOrderDate) {
                  client.lastOrderDate = orderDate;
                }
                if (!client.lastActivityDate || orderDate > client.lastActivityDate) {
                  client.lastActivityDate = orderDate;
                }
                if (!client.createdAt || orderDate < client.createdAt) {
                  client.createdAt = orderDate;
                }
              }
            }
            // Order Items & Categories
            const items = Array.isArray(o.items) ? o.items : [];
            items.forEach((it) => {
              const itemName = it.name || it.title || '';
              if (itemName) client.itemsComprados.add(itemName);
              const rawCat = (it.categoria || it.category || it.plataforma || it.platform || '').toLowerCase();
              const nameLower = itemName.toLowerCase();
              if (rawCat.includes('steam') || nameLower.includes('steam') || it.appId) {
                client.categoriasCompradas.add('Steam PC');
                client.hasBoughtSteam = true;
              }
              if (rawCat.includes('nintendo') || rawCat.includes('switch') || nameLower.includes('switch') || nameLower.includes('nintendo')) {
                client.categoriasCompradas.add('Nintendo Switch');
                client.hasBoughtNintendo = true;
              }
              if (rawCat.includes('playstation') || rawCat.includes('ps4') || rawCat.includes('ps5') || nameLower.includes('ps4') || nameLower.includes('ps5')) {
                client.categoriasCompradas.add('PlayStation');
                client.hasBoughtPlaystation = true;
              }
              if (rawCat.includes('saga') || nameLower.includes('saga') || nameLower.includes('pack') || rawCat.includes('pack')) {
                client.categoriasCompradas.add('Sagas / Packs');
                client.hasBoughtSagas = true;
              }
            });
            client.orders.push({
              id: d.id,
              fecha: rawDate,
              total: orderTotal,
              itemsCount: items.length,
              items: items.map(i => i.name || i.title || 'Producto')
            });
          });
        }
        // 3. Process Abandoned Carts / Leads & Viewed Products
        if (cartsSnap.status === 'fulfilled') {
          cartsSnap.value.docs.forEach((d) => {
            const c = d.data();
            const client = getOrCreate(c.email || c.customerEmail);
            if (!client) return;
            client.hasAbandonedCart = c.status === "abandoned" || (c.items && c.items.length > 0);
            client.cartItems = c.items || [];
            client.cartTotal = c.totalCLP || 0;
            client.viewedProducts = c.viewedProducts || [];
            if (!client.displayName && c.customerName) {
              client.displayName = c.customerName;
            }
            if (!client.customerPhone && c.customerPhone) {
              client.customerPhone = c.customerPhone;
            }
            if (!client.isRegistered && client.ordersCount === 0) {
              client.tipo = 'lead';
            }
            const rawDate = c.lastUpdated || c.updatedAt || c.abandonedAt;
            if (rawDate) {
              const cartDate = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
              if (!client.lastActivityDate || cartDate > client.lastActivityDate) {
                client.lastActivityDate = cartDate;
              }
            }
          });
        }
        // Convert Map to Array & format arrays
        const unifiedList = Array.from(mapClientes.values()).map(c => ({
          ...c,
          itemsComprados: Array.from(c.itemsComprados),
          categoriasCompradas: Array.from(c.categoriasCompradas),
          hasOrders: c.ordersCount > 0,
          bestName: c.displayName || c.email.split('@')[0]
        }));
        setClientes(unifiedList);
      } catch (err) {
        console.error("Error al cargar clientes unificados:", err);
      }
      setLoadingClientes(false);
    })();
  }, []);
  // Detectar parametros para recuperacion directa de carrito o juego visto
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const recEmail = params.get("recuperarEmail");
    const recNombre = params.get("nombre");
    const recJuego = params.get("juego");
    if (recEmail) {
      const cleanE = recEmail.trim().toLowerCase();
      setBusqueda(cleanE);
      setSeleccionados(new Set([cleanE]));
      setSegmentoActivo("carritos_abandonados");
      if (recJuego) setJuegoContexto(recJuego);
      const cuponObj = cupones.find(c => c.codigo === cuponSeleccionado);
      const tpl = buildAbandonedCartTemplate(cuponObj?.codigo || "", cuponObj?.descuento || "", recJuego || "tus juegos seleccionados");
      setAsunto(tpl.asunto);
      setHtmlBody(tpl.htmlBody);
      setTipoPlantilla("carrito");
    }
  }, [cupones, cuponSeleccionado]);
    /* ── Handler de Selección de Plantillas ── */
  const aplicarPlantilla = (tipo) => {
    setTipoPlantilla(tipo);
    const cuponObj = cupones.find((c) => c.codigo === cuponSeleccionado) || cupones[0];
    const cod = cuponObj?.codigo || "";
    const desc = cuponObj?.descuento || "";
    if (tipo === "resena") {
      const tpl = buildReviewTemplate(cod, desc);
      setAsunto(tpl.asunto);
      setHtmlBody(tpl.htmlBody);
    } else if (tipo === "carrito") {
      const tpl = buildAbandonedCartTemplate(cod, desc, juegoContexto || "tus juegos seleccionados");
      setAsunto(tpl.asunto);
      setHtmlBody(tpl.htmlBody);
    } else if (tipo === "juego_visto") {
      const tpl = buildViewedGameTemplate(cod, desc, juegoContexto || "el juego que estuviste viendo");
      setAsunto(tpl.asunto);
      setHtmlBody(tpl.htmlBody);
    }
  };
  /* ── Load cupones activos & pre-aplicar a la plantilla ── */
  useEffect(() => {
    getDocs(collection(db, 'cupones')).then(snap => {
      const activos = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.activo !== false);
      setCupones(activos);
      if (activos.length > 0) {
        const primerCupon = activos[0];
        setCuponSeleccionado(primerCupon.codigo);
        const tpl = buildReviewTemplate(primerCupon.codigo, primerCupon.descuento);
        setAsunto(tpl.asunto);
        setHtmlBody(tpl.htmlBody);
      }
    }).catch(() => {});
  }, []);
  /* ── Load campaign history ── */
  useEffect(() => {
    (async () => {
      setLoadingHistorial(true);
      try {
        const q = query(collection(db, "emailCampaigns"), orderBy("fecha", "desc"));
        const snap = await getDocs(q);
        setHistorial(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        /* ignore */
      }
      setLoadingHistorial(false);
    })();
  }, []);
  /* ── Dynamic Segment Counts ── */
  const segmentCounts = useMemo(() => {
    const now = new Date();
    const daysAgo30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const daysAgo7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      todos: clientes.length,
      carritos_abandonados: clientes.filter(c => c.hasAbandonedCart).length,
      vieron_juegos: clientes.filter(c => c.viewedProducts && c.viewedProducts.length > 0).length,
      registrados: clientes.filter(c => c.isRegistered).length,
      invitados: clientes.filter(c => c.isGuest && c.hasOrders).length,
      steam: clientes.filter(c => c.hasBoughtSteam).length,
      switch: clientes.filter(c => c.hasBoughtNintendo).length,
      playstation: clientes.filter(c => c.hasBoughtPlaystation).length,
      sagas: clientes.filter(c => c.hasBoughtSagas).length,
      sin_compras: clientes.filter(c => c.isRegistered && !c.hasOrders).length,
      recientes_30d: clientes.filter(c => c.lastActivityDate && new Date(c.lastActivityDate) >= daysAgo30).length,
      recientes_7d: clientes.filter(c => c.lastActivityDate && new Date(c.lastActivityDate) >= daysAgo7).length
    };
  }, [clientes]);
  /* ── Filtered & Sorted Clients ── */
  const clientesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    let res = [...clientes];
    // 1. Filtrar por segmento activo
    if (segmentoActivo === "carritos_abandonados") {
      res = res.filter(c => c.hasAbandonedCart);
    } else if (segmentoActivo === "vieron_juegos") {
      res = res.filter(c => c.viewedProducts && c.viewedProducts.length > 0);
    } else if (segmentoActivo === "registrados") {
      res = res.filter(c => c.isRegistered);
    } else if (segmentoActivo === "invitados") {
      res = res.filter(c => c.isGuest && c.hasOrders);
    } else if (segmentoActivo === "steam") {
      res = res.filter(c => c.hasBoughtSteam);
    } else if (segmentoActivo === "switch") {
      res = res.filter(c => c.hasBoughtNintendo);
    } else if (segmentoActivo === "playstation") {
      res = res.filter(c => c.hasBoughtPlaystation);
    } else if (segmentoActivo === "sagas") {
      res = res.filter(c => c.hasBoughtSagas);
    } else if (segmentoActivo === "sin_compras") {
      res = res.filter(c => c.isRegistered && !c.hasOrders);
    } else if (segmentoActivo === "recientes_30d") {
      const daysAgo30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      res = res.filter(c => c.lastActivityDate && new Date(c.lastActivityDate) >= daysAgo30);
    } else if (segmentoActivo === "recientes_7d") {
      const daysAgo7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      res = res.filter(c => c.lastActivityDate && new Date(c.lastActivityDate) >= daysAgo7);
    }
    // 2. Búsqueda por texto (Email, Nombre, o Producto comprado)
    if (q) {
      res = res.filter(c =>
        c.email.toLowerCase().includes(q) ||
        (c.displayName || "").toLowerCase().includes(q) ||
        c.itemsComprados.some(item => item.toLowerCase().includes(q))
      );
    }
    // 3. Ordenamiento
    res.sort((a, b) => {
      if (criterioOrden === "fecha_reciente") {
        const da = a.lastActivityDate ? new Date(a.lastActivityDate).getTime() : 0;
        const db = b.lastActivityDate ? new Date(b.lastActivityDate).getTime() : 0;
        return db - da;
      }
      if (criterioOrden === "fecha_antigua") {
        const da = a.lastActivityDate ? new Date(a.lastActivityDate).getTime() : Infinity;
        const db = b.lastActivityDate ? new Date(b.lastActivityDate).getTime() : Infinity;
        return da - db;
      }
      if (criterioOrden === "monto_desc") {
        return (b.totalSpentCLP || 0) - (a.totalSpentCLP || 0);
      }
      if (criterioOrden === "pedidos_desc") {
        return (b.ordersCount || 0) - (a.ordersCount || 0);
      }
      if (criterioOrden === "alfabetico") {
        return a.email.localeCompare(b.email);
      }
      return 0;
    });
    return res;
  }, [clientes, busqueda, segmentoActivo, criterioOrden]);
  /* ── Cambiar cupón en tiempo real ── */
  const handleCambiarCupon = (codigo) => {
    setCuponSeleccionado(codigo);
    const cup = cupones.find(c => c.codigo === codigo);
    const tpl = buildReviewTemplate(codigo, cup?.descuento || "");
    setAsunto(tpl.asunto);
    setHtmlBody(tpl.htmlBody);
  };
  /* ── Selection Helpers ── */
  const toggleCliente = useCallback((id) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const selectOnlyCliente = (id) => {
    setSeleccionados(new Set([id]));
    setTab("preview");
  };
  const selectAllFiltrados = () => {
    setSeleccionados(new Set(clientesFiltrados.map((c) => c.id)));
  };
  const deselectAll = () => {
    setSeleccionados(new Set());
  };
  /* ── Export CSV Helper ── */
  const exportarCSV = () => {
    if (clientesFiltrados.length === 0) {
      alert("No hay clientes en el filtro actual para exportar.");
      return;
    }
    const headers = ["Email", "Nombre", "Tipo", "Total Pedidos", "Total Gastado CLP", "Categorias", "Ultima Actividad"];
    const rows = clientesFiltrados.map(c => [
      `"${c.email}"`,
      `"${c.displayName || ''}"`,
      `"${c.tipo}"`,
      c.ordersCount,
      c.totalSpentCLP,
      `"${c.categoriasCompradas.join(', ')}"`,
      `"${formatDate(c.lastActivityDate)}"`
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pandastore_clientes_${segmentoActivo}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  /* ── Copy Emails to Clipboard ── */
  const copiarEmailsFiltrados = () => {
    const emails = clientesFiltrados.map(c => c.email).filter(Boolean);
    if (emails.length === 0) return;
    navigator.clipboard.writeText(emails.join(", "));
    setAlerta({
      tipo: "success",
      msg: `📋 Se copiaron ${emails.length} correos al portapapeles con éxito.`
    });
    setTimeout(() => setAlerta(null), 4000);
  };
  /* ── Compute single selected client for preview name ── */
  const selectedClientForPreview = useMemo(() => {
    if (seleccionados.size === 1) {
      const id = Array.from(seleccionados)[0];
      return clientes.find(c => c.id === id);
    }
    return null;
  }, [seleccionados, clientes]);
  const previewName = selectedClientForPreview
    ? (selectedClientForPreview.displayName || selectedClientForPreview.email.split('@')[0])
    : "Cliente PandaStore";
  /* ── Preview to self ── */
  const handleEnviarPreview = async () => {
    if (!asunto.trim() || !htmlBody.trim()) {
      return setAlerta({ tipo: 'error', msg: 'Completa el asunto y el cuerpo antes de enviar el preview.' });
    }
    setEnviandoPreview(true);
    setAlerta(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const previewAsunto = `(Vista Previa) ${asunto.replace(/{{nombre}}/gi, 'Roberto').replace(/{{name}}/gi, 'Roberto')}`;
      const previewHtml = htmlBody.replace(/{{nombre}}/gi, 'Roberto').replace(/{{name}}/gi, 'Roberto');
      const res = await fetch(`${FUNCTIONS_BASE}/enviarCorreoPromocional`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          asunto: previewAsunto,
          htmlBody: previewHtml,
          destinatarios: ['joseroberto999999@gmail.com']
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar preview');
      setAlerta({ tipo: 'success', msg: '📨 Preview enviado a joseroberto999999@gmail.com con éxito.' });
    } catch (err) {
      setAlerta({ tipo: 'error', msg: 'Error al enviar preview: ' + err.message });
    }
    setEnviandoPreview(false);
  };
  /* ── Send Campaign Handler (Personalized by Name) ── */
  const handleEnviar = async () => {
    if (!asunto.trim()) return setAlerta({ tipo: "error", msg: "Escribe un asunto para el correo." });
    if (!htmlBody.trim()) return setAlerta({ tipo: "error", msg: "El cuerpo del correo no puede estar vacío." });
    if (seleccionados.size === 0) return setAlerta({ tipo: "error", msg: "Selecciona al menos un destinatario de la lista." });
    const confirmar = window.confirm(
      `¿Enviar la campaña "${asunto}" a los ${seleccionados.size} clientes seleccionados?`
    );
    if (!confirmar) return;
    setEnviando(true);
    setAlerta(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const targetClients = clientes.filter((c) => seleccionados.has(c.id) && c.email);
      // Si es un solo cliente seleccionado, personalizar directamente
      if (targetClients.length === 1) {
        const c = targetClients[0];
        const clientName = c.displayName || c.email.split('@')[0] || "Cliente PandaStore";
        const finalAsunto = asunto.replace(/{{nombre}}/gi, clientName).replace(/{{name}}/gi, clientName);
        const finalHtml = htmlBody.replace(/{{nombre}}/gi, clientName).replace(/{{name}}/gi, clientName);
        const res = await fetch(`${FUNCTIONS_BASE}/enviarCorreoPromocional`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            asunto: finalAsunto,
            htmlBody: finalHtml,
            destinatarios: [c.email]
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al enviar");
        setAlerta({
          tipo: "success",
          msg: `✅ Correo enviado con éxito a ${c.email} (${clientName}).`,
        });
      } else {
        // Múltiples destinatarios
        const fallbackAsunto = asunto.replace(/{{nombre}}/gi, "Cliente PandaStore").replace(/{{name}}/gi, "Cliente PandaStore");
        const fallbackHtml = htmlBody.replace(/{{nombre}}/gi, "Cliente PandaStore").replace(/{{name}}/gi, "Cliente PandaStore");
        const emailList = targetClients.map((c) => c.email);
        const res = await fetch(`${FUNCTIONS_BASE}/enviarCorreoPromocional`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            asunto: fallbackAsunto,
            htmlBody: fallbackHtml,
            destinatarios: emailList
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al enviar");
        const errMsg =
          data.errores && data.errores.length > 0
            ? ` (${data.errores.length} no llegaron)`
            : "";
        setAlerta({
          tipo: "success",
          msg: `✅ Correo enviado con éxito a ${data.enviados} cliente${data.enviados !== 1 ? "s" : ""}${errMsg}.`,
        });
      }
      /* Refresh campaign history */
      const q = query(collection(db, "emailCampaigns"), orderBy("fecha", "desc"));
      const snap = await getDocs(q);
      setHistorial(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      setAlerta({ tipo: "error", msg: err.message });
    }
    setEnviando(false);
  };
  return (
    <div className="admin-correos-wrap">
      <div className="admin-correos-top-header">
        <h1 className="admin-correos-title">📧 Centro de Campañas & Clientes PandaStore</h1>
        <p className="admin-correos-subtitle">
          Gestiona y envía promociones a <strong>todos tus clientes</strong>: compradores invitados, usuarios con cuenta registrada y clientes con comprobante.
        </p>
      </div>
      {/* Alerta de acción */}
      {alerta && (
        <div className={`admin-correos-alert ${alerta.tipo}`} style={{ marginBottom: 20 }}>
          {alerta.msg}
        </div>
      )}
      <div className="admin-correos-layout">
        {/* ── COLUMNA IZQUIERDA: Editor de Campaña & Vista Previa ── */}
        <div className="admin-correos-card">
          <p className="admin-correos-section-title">✉️ Redactar Campaña de Correo</p>
          {/* Selector de Cupón Inteligente */}
          <div className="form-row" style={{ marginBottom: 14, background: 'rgba(236,72,153,0.08)', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(236,72,153,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ color: '#f472b6', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                🎟️ Insertar Cupón de Descuento en la Plantilla:
              </label>
              <button
                type="button"
                onClick={() => {
                  const tpl = buildReviewTemplate(cuponSeleccionado, cupones.find(c => c.codigo === cuponSeleccionado)?.descuento || "");
                  setAsunto(tpl.asunto);
                  setHtmlBody(tpl.htmlBody);
                  setAlerta({ tipo: 'success', msg: '🔄 Plantilla regenerada con el cupón.' });
                }}
                className="btn-reload-tpl"
              >
                🔄 Restaurar texto
              </button>
            </div>
            <select
              className="admin-correos-input"
              value={cuponSeleccionado}
              onChange={(e) => handleCambiarCupon(e.target.value)}
              style={{ background: '#120d24', border: '1px solid rgba(236,72,153,0.4)', color: '#fff', fontSize: '0.85rem' }}
            >
              <option value="">(Sin cupón de regalo)</option>
              {cupones.map(c => (
                <option key={c.id} value={c.codigo}>
                  {c.codigo} — {c.descuento ? `${c.descuento}% OFF` : 'Descuento especial'}
                </option>
              ))}
            </select>
          </div>
          {/* Selector de Plantillas Prediseñadas */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#c4b5fd", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
              📋 Elegir Objetivo de Campaña / Plantilla
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => aplicarPlantilla("resena")}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: tipoPlantilla === "resena" ? "1.5px solid #a855f7" : "1px solid rgba(255,255,255,0.15)",
                  background: tipoPlantilla === "resena" ? "rgba(168,85,247,0.25)" : "rgba(255,255,255,0.04)",
                  color: tipoPlantilla === "resena" ? "#fff" : "#cbd5e1",
                  transition: "all 0.2s"
                }}
              >
                ⭐ Pedir Reseña
              </button>
              <button
                type="button"
                onClick={() => aplicarPlantilla("carrito")}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: tipoPlantilla === "carrito" ? "1.5px solid #ec4899" : "1px solid rgba(255,255,255,0.15)",
                  background: tipoPlantilla === "carrito" ? "rgba(236,72,153,0.25)" : "rgba(255,255,255,0.04)",
                  color: tipoPlantilla === "carrito" ? "#fff" : "#cbd5e1",
                  transition: "all 0.2s"
                }}
              >
                🛒 Recuperar Carrito Abandonado
              </button>
              <button
                type="button"
                onClick={() => aplicarPlantilla("juego_visto")}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: tipoPlantilla === "juego_visto" ? "1.5px solid #38bdf8" : "1px solid rgba(255,255,255,0.15)",
                  background: tipoPlantilla === "juego_visto" ? "rgba(56,189,248,0.25)" : "rgba(255,255,255,0.04)",
                  color: tipoPlantilla === "juego_visto" ? "#fff" : "#cbd5e1",
                  transition: "all 0.2s"
                }}
              >
                👀 Oferta de Juego Visto
              </button>
            </div>
          </div>
          {/* Switcher: Editor / Vista Previa */}
          <div className="editor-tab-switcher">
            <button
              className={`tab-switch-btn ${tab === "editor" ? "active" : ""}`}
              onClick={() => setTab("editor")}
            >
              ✏️ Editor de Texto
            </button>
            <button
              className={`tab-switch-btn ${tab === "preview" ? "active" : ""}`}
              onClick={() => setTab("preview")}
            >
              👁️ Vista Previa ({selectedClientForPreview ? selectedClientForPreview.email : "Diseño Real"})
            </button>
          </div>
          {tab === "editor" ? (
            <div className="admin-correos-form">
              <div className="form-row">
                <label className="field-label">Asunto del correo</label>
                <input
                  className="admin-correos-input"
                  placeholder="ej. ⭐ ¡Muchas gracias por tu compra en PandaStore!"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="form-row">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label className="field-label">Cuerpo del correo (HTML permitido)</label>
                  <span style={{ fontSize: "0.72rem", color: "#a08ab8" }}>
                    Etiqueta dinámica: <b style={{ color: "#f357a8" }}>{"{{nombre}}"}</b>
                  </span>
                </div>
                <textarea
                  className="admin-correos-textarea"
                  placeholder="Escribe el mensaje aquí..."
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  style={{ minHeight: 250 }}
                />
                <span className="editor-note">
                  💡 El logotipo oficial de PandaStore, botones de categorías y pie con redes sociales se incluyen automáticamente.
                </span>
              </div>
            </div>
          ) : (
            <div className="preview-container">
              <p style={{ margin: "0 0 10px", fontSize: "0.82rem", color: "#a08ab8" }}>
                Visualizando para: <strong style={{ color: "#f357a8" }}>{previewName}</strong>
              </p>
              <EmailPreview body={htmlBody} asunto={asunto} previewName={previewName} />
            </div>
          )}
          {/* Botones de Envío */}
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              className="admin-correos-send-btn"
              disabled={enviando || seleccionados.size === 0}
              onClick={handleEnviar}
            >
              {enviando
                ? "⏳ Enviando campaña..."
                : `🚀 Enviar Campaña a ${seleccionados.size} destinatario${seleccionados.size !== 1 ? "s" : ""}`}
            </button>
            <button
              type="button"
              disabled={enviandoPreview}
              onClick={handleEnviarPreview}
              className="btn-send-preview"
            >
              {enviandoPreview ? '⏳ Enviando preview…' : '📨 Enviar prueba a mi correo (joseroberto999999@gmail.com)'}
            </button>
          </div>
        </div>
        {/* ── COLUMNA DERECHA: Segmentación & Lista Unificada de Clientes ── */}
        <div className="admin-correos-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <p className="admin-correos-section-title" style={{ margin: 0 }}>
              👥 Base Unificada de Clientes
            </p>
            <div className="bulk-badge-group">
              <span className="stat-pill">{clientes.length} Clientes Totales</span>
              <span className="stat-pill sel">{seleccionados.size} Seleccionados</span>
            </div>
          </div>
          {/* Chips de Segmentación con Conteo en Tiempo Real */}
                    {/* Banner de Acceso Rápido a Carritos en Vivo */}
          <div style={{
            background: "linear-gradient(135deg, rgba(236,72,153,0.2), rgba(56,189,248,0.2))",
            border: "1.5px solid rgba(236,72,153,0.4)",
            borderRadius: 14,
            padding: "14px 18px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12
          }}>
            <div>
              <div style={{ fontWeight: 800, color: "#fff", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span>🛒 {segmentCounts.carritos_abandonados} Carritos con Productos</span>
                <span style={{ color: "#38bdf8" }}>· 👀 {segmentCounts.vieron_juegos} Clientes que Vieron Juegos</span>
              </div>
              <div style={{ color: "#cbd5e1", fontSize: 12.5, marginTop: 4 }}>
                Haz clic en los botones <strong style={{ color: "#ec4899" }}>🛒 Carritos Abandonados</strong> o <strong style={{ color: "#38bdf8" }}>👀 Vieron Juegos</strong> para ver exactamente qué juegos tienen o vieron.
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/admin/actividad")}
              style={{
                background: "linear-gradient(135deg, #ec4899, #a855f7)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "8px 16px",
                fontWeight: 800,
                fontSize: 12.5,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(236,72,153,0.3)"
              }}
            >
              👀 Ver Fotos y Detalles en Vivo →
            </button>
          </div>

          <div className="segmentos-container">
            <button
              className={`segment-chip ${segmentoActivo === "carritos_abandonados" ? "active" : ""}`}
              onClick={() => setSegmentoActivo("carritos_abandonados")}
              style={{
                border: "1.5px solid #ec4899",
                background: segmentoActivo === "carritos_abandonados" ? "#ec4899" : "rgba(236,72,153,0.22)",
                color: "#fff",
                fontWeight: 800
              }}
            >
              🛒 Carritos Abandonados ({segmentCounts.carritos_abandonados})
            </button>
            <button
              className={`segment-chip ${segmentoActivo === "vieron_juegos" ? "active" : ""}`}
              onClick={() => setSegmentoActivo("vieron_juegos")}
              style={{
                border: "1.5px solid #38bdf8",
                background: segmentoActivo === "vieron_juegos" ? "#38bdf8" : "rgba(56,189,248,0.22)",
                color: "#fff",
                fontWeight: 800
              }}
            >
              👀 Vieron Juegos ({segmentCounts.vieron_juegos})
            </button>
            <button
              className={`segment-chip ${segmentoActivo === "todos" ? "active" : ""}`}
              onClick={() => setSegmentoActivo("todos")}
            >
              🌟 Todos ({segmentCounts.todos})
            </button>
            <button
              className={`segment-chip ${segmentoActivo === "invitados" ? "active" : ""}`}
              onClick={() => setSegmentoActivo("invitados")}
            >
              🛒 Invitados ({segmentCounts.invitados})
            </button>
            <button
              className={`segment-chip ${segmentoActivo === "registrados" ? "active" : ""}`}
              onClick={() => setSegmentoActivo("registrados")}
            >
              👤 Con Cuenta ({segmentCounts.registrados})
            </button>
            <button
              className={`segment-chip ${segmentoActivo === "steam" ? "active" : ""}`}
              onClick={() => setSegmentoActivo("steam")}
            >
              🎮 Steam PC ({segmentCounts.steam})
            </button>
            <button
              className={`segment-chip ${segmentoActivo === "switch" ? "active" : ""}`}
              onClick={() => setSegmentoActivo("switch")}
            >
              🔴 Switch ({segmentCounts.switch})
            </button>
            <button
              className={`segment-chip ${segmentoActivo === "playstation" ? "active" : ""}`}
              onClick={() => setSegmentoActivo("playstation")}
            >
              🔵 PlayStation ({segmentCounts.playstation})
            </button>
            <button
              className={`segment-chip ${segmentoActivo === "sagas" ? "active" : ""}`}
              onClick={() => setSegmentoActivo("sagas")}
            >
              📦 Sagas/Packs ({segmentCounts.sagas})
            </button>
            <button
              className={`segment-chip ${segmentoActivo === "sin_compras" ? "active" : ""}`}
              onClick={() => setSegmentoActivo("sin_compras")}
            >
              🆕 Sin Compras ({segmentCounts.sin_compras})
            </button>
            <button
              className={`segment-chip ${segmentoActivo === "recientes_30d" ? "active" : ""}`}
              onClick={() => setSegmentoActivo("recientes_30d")}
            >
              ⚡ Últimos 30 días ({segmentCounts.recientes_30d})
            </button>
          </div>
          {/* Barra de Filtros, Orden y Acciones Rápidas */}
          <div className="client-controls-bar">
            <input
              className="correos-search-input"
              placeholder="🔍 Buscar por email, nombre o juego comprado..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <select
              className="sort-select"
              value={criterioOrden}
              onChange={(e) => setCriterioOrden(e.target.value)}
            >
              <option value="fecha_reciente">📅 Más reciente primero</option>
              <option value="fecha_antigua">⏳ Más antiguo primero</option>
              <option value="monto_desc">💰 Mayor monto gastado ($)</option>
              <option value="pedidos_desc">🛍️ Más pedidos realizados</option>
              <option value="alfabetico">🔤 Email (A-Z)</option>
            </select>
          </div>
          {/* Botones de Selección Rápida y Exportación */}
          <div className="action-buttons-row">
            <button className="btn-action sel-all" onClick={selectAllFiltrados}>
              ✓ Seleccionar Filtrados ({clientesFiltrados.length})
            </button>
            <button className="btn-action desel" onClick={deselectAll}>
              ✕ Deseleccionar Todo
            </button>
            <button className="btn-action copy" onClick={copiarEmailsFiltrados} title="Copiar lista de correos al portapapeles">
              📋 Copiar Emails
            </button>
            <button className="btn-action export" onClick={exportarCSV} title="Descargar archivo Excel / CSV">
              📥 Exportar CSV
            </button>
          </div>
          {/* Tabla de Clientes Unificada */}
          {loadingClientes ? (
            <div className="loading-state">
              <span className="loader-spin">⏳</span>
              <p>Unificando clientes registrados, compras de invitados y comprobantes...</p>
            </div>
          ) : (
            <div className="correos-user-table-wrap">
              <table className="correos-user-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>✓</th>
                    <th>Cliente / Correo</th>
                    <th>Detalles / Categorías</th>
                    <th>Historial</th>
                    <th style={{ textAlign: "right" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={5} className="no-results-td">
                        No se encontraron clientes para el filtro o búsqueda seleccionada.
                      </td>
                    </tr>
                  )}
                  {clientesFiltrados.map((c) => {
                    const checked = seleccionados.has(c.id);
                    return (
                      <tr
                        key={c.id}
                        className={`${checked ? "active" : ""} client-row`}
                        onClick={() => toggleCliente(c.id)}
                      >
                        <td>
                          <input
                            type="checkbox"
                            className="user-check"
                            checked={checked}
                            onChange={() => toggleCliente(c.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td>
                          <div className="client-email-box">
                            <span className="email-text">{c.email}</span>
                            <div className="client-tags-row">
                              {c.isRegistered ? (
                                <span className="chip-type registered">👤 Con Cuenta</span>
                              ) : (
                                <span className="chip-type guest">🛒 Invitado</span>
                              )}
                              {c.displayName && (
                                <span className="client-subname">{c.displayName}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="client-categories-box">
                            {c.categoriasCompradas.length > 0 ? (
                              c.categoriasCompradas.map((cat, idx) => (
                                <span
                                  key={idx}
                                  className={`cat-pill cat-${cat.toLowerCase().replace(/[^a-z]/g, '')}`}
                                >
                                  {cat}
                                </span>
                              ))
                            ) : (
                              <span className="cat-pill empty">Sin compras aún</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="client-history-box">
                            <span className="history-orders">
                              {c.ordersCount > 0 ? (
                                <strong>{c.ordersCount} pedido{c.ordersCount !== 1 ? 's' : ''} ({formatCLP(c.totalSpentCLP)})</strong>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>0 pedidos</span>
                              )}
                            </span>
                            <span className="history-date">
                              Activo: {formatRelativeTime(c.lastActivityDate)}
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="row-actions" style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
  {(c.cartItems?.length > 0 || c.viewedProducts?.length > 0) && (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        const targetGame = c.cartItems?.[0]?.name || c.viewedProducts?.[0]?.name || "tus juegos";
        setJuegoContexto(targetGame);
        if (c.email && c.email.includes("@")) {
          setBusqueda(c.email);
          setSeleccionados(new Set([c.id]));
        }
        const isCart = c.cartItems?.length > 0;
        aplicarPlantilla(isCart ? "carrito" : "juego_visto");
        setTab("editor");
      }}
      style={{
        padding: "5px 10px",
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 800,
        background: "linear-gradient(135deg, #a855f7, #ec4899)",
        color: "#fff",
        border: "none",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(236,72,153,0.3)",
        whiteSpace: "nowrap"
      }}
      title="Cargar correo personalizado con estos juegos"
    >
      ✉️ Cargar Oferta
    </button>
  )}
  {c.customerPhone && (
    <a
      href={`https://wa.me/${c.customerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
        `¡Hola ${c.displayName || ""}! Te escribimos de PandaStore 🐼 Vimos que te interesaron ${c.cartItems?.[0]?.name || c.viewedProducts?.[0]?.name || "nuestros juegos"}. ¿Te gustaría un cupón de descuento especial para tu compra?`
      )}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{
        padding: "4px 10px",
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 800,
        background: "#25D366",
        color: "#fff",
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        whiteSpace: "nowrap"
      }}
    >
      💬 WhatsApp
    </a>
  )}
                            <button
                              type="button"
                              className="btn-row-preview"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectOnlyCliente(c.id);
                              }}
                              title="Seleccionar y ver vista previa con su nombre"
                            >
                              👁️
                            </button>
                            {c.ordersCount > 0 && (
                              <button
                                type="button"
                                className="btn-row-detail"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setClienteDetalleModal(c);
                                }}
                                title="Ver productos comprados"
                              >
                                📦
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* ── HISTORIAL DE CAMPAÑAS ENVIADAS (Ancho Completo) ── */}
        <div className="admin-correos-card full-width">
          <p className="admin-correos-section-title">📊 Historial de Campañas Enviadas</p>
          {loadingHistorial ? (
            <p style={{ color: "#7dd3fc", fontSize: 14 }}>Cargando historial…</p>
          ) : historial.length === 0 ? (
            <p style={{ color: "#a08ab8", fontSize: 14 }}>Aún no has enviado ninguna campaña de correo.</p>
          ) : (
            <div className="campaign-history-list">
              {historial.map((h) => (
                <div key={h.id} className="campaign-item">
                  <span className="camp-icon">📬</span>
                  <div className="camp-info">
                    <div className="camp-subject">{h.asunto || "(Sin asunto)"}</div>
                    <div className="camp-meta">
                      Enviado por <strong>{h.enviadoPor || "Admin"}</strong> • {formatDate(h.fecha)}
                    </div>
                  </div>
                  <span className="camp-badge">
                    {h.totalDestinatarios} destinatario{h.totalDestinatarios !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* ── MODAL DETALLE DE COMPRAS DEL CLIENTE ── */}
      {clienteDetalleModal && (
        <div className="modal-backdrop-correos" onClick={() => setClienteDetalleModal(null)}>
          <div className="modal-content-correos" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-correos">
              <div>
                <h3 style={{ margin: 0, color: "#fff", fontSize: "1.2rem" }}>Historial del Cliente</h3>
                <span style={{ fontSize: "0.85rem", color: "#38bdf8" }}>{clienteDetalleModal.email}</span>
              </div>
              <button className="btn-close-modal" onClick={() => setClienteDetalleModal(null)}>✕</button>
            </div>
            <div className="modal-body-correos">
              <div className="client-modal-stats">
                <div className="modal-stat-box">
                  <span>Tipo:</span>
                  <strong>{clienteDetalleModal.isRegistered ? "👤 Con Cuenta" : "🛒 Invitado (Checkout)"}</strong>
                </div>
                <div className="modal-stat-box">
                  <span>Total Pedidos:</span>
                  <strong>{clienteDetalleModal.ordersCount}</strong>
                </div>
                <div className="modal-stat-box">
                  <span>Total Gastado:</span>
                  <strong>{formatCLP(clienteDetalleModal.totalSpentCLP)}</strong>
                </div>
              </div>
              <h4 style={{ color: "#c4b5fd", margin: "16px 0 8px", fontSize: "0.95rem" }}>
                Videojuegos / Artículos Adquiridos ({clienteDetalleModal.itemsComprados.length}):
              </h4>
              <div className="modal-items-list">
                {clienteDetalleModal.itemsComprados.length > 0 ? (
                  clienteDetalleModal.itemsComprados.map((it, idx) => (
                    <div key={idx} className="modal-item-badge">
                      🎮 {it}
                    </div>
                  ))
                ) : (
                  <p style={{ color: "#94a3b8" }}>No hay registros específicos de items.</p>
                )}
              </div>
            </div>
            <div className="modal-footer-correos">
              <button
                className="btn-select-and-close"
                onClick={() => {
                  selectOnlyCliente(clienteDetalleModal.id);
                  setClienteDetalleModal(null);
                }}
              >
                ✉️ Enviar correo a este cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}