import React from "react";
import "./Terminos.css";

export default function Terminos() {
  return (
    <div className="terminos-root">
      {/* ── Título ── */}
      <h1 className="terminos-title">
        <span className="terminos-title-icon">📜</span>
        <span className="terminos-title-text">Términos y Condiciones</span>
      </h1>
      <p className="terminos-title-sub">Vigentes para todos los productos digitales de Panda Store</p>
      <div className="terminos-divider" />

      {/* ── Banner de aceptación ── */}
      <div className="terminos-banner">
        <span className="terminos-banner-icon">🛒</span>
        <span>Al comprar en nuestra tienda, aceptas automáticamente todos los términos y condiciones descritos en esta página.</span>
      </div>

      {/* ══════════════════════════════════════
          SECCIÓN: NINTENDO SWITCH
      ══════════════════════════════════════ */}
      <div className="terminos-section terminos-section--nintendo">
        <div className="terminos-section-header">
          🎮 Nintendo Switch — Juegos Digitales
        </div>
        <div className="terminos-section-body">

          <div className="terminos-sub-label">📦 Naturaleza del Producto</div>
          <p className="terminos-desc">
            Recibirás una <strong>cuenta externa de Nintendo</strong> con el juego ya adquirido y listo para instalar en tu consola.
          </p>
          <ul className="terminos-list">
            <li><span className="t-icon">🚫</span><span>Esta cuenta <strong>no debe</strong> modificarse, compartirse ni revenderse bajo ninguna circunstancia.</span></li>
          </ul>

          <div className="terminos-sub-label">▶️ Modo de Uso</div>
          <ul className="terminos-list">
            <li><span className="t-icon">✅</span><span>Añade la cuenta proporcionada a tu consola Nintendo Switch.</span></li>
            <li><span className="t-icon">✅</span><span>Instala el juego y luego juégalo desde tu usuario personal habitual.</span></li>
            <li><span className="t-icon">🚫</span><span>Prohibido modificar la contraseña o eliminar la cuenta antes y después de activar el juego.</span></li>
          </ul>

          <div className="terminos-sub-label">⚙️ Condiciones de Uso</div>
          <ul className="terminos-list">
            <li><span className="t-icon">📌</span><span>Nintendo permite múltiples cuentas en una misma consola, pero el mal uso puede ocasionar bloqueo de la cuenta.</span></li>
            <li><span className="t-icon">📌</span><span>Si se manipulan las credenciales entregadas, se perderá el acceso sin derecho a garantía.</span></li>
          </ul>

          <div className="terminos-alert">
            <div className="terminos-alert-title">⚠️ Riesgos importantes a considerar</div>
            <ul>
              <li><span>⚠️</span><span>Nintendo puede detectar actividad sospechosa y suspender la cuenta.</span></li>
              <li><span>⚠️</span><span>Las cuentas no son permanentes — duran tiempo indefinido. Seguir correctamente el modo de uso maximiza su duración.</span></li>
              <li><span>🚫</span><span><strong>Causas de pérdida del juego NO cubiertas por garantía:</strong> cerrar sesión de la cuenta entregada, eliminarla, o cambiarle la contraseña. Esto explica el bajo costo del servicio.</span></li>
            </ul>
          </div>

          <div className="terminos-sub-label">💻 Requisitos Técnicos</div>
          <ul className="terminos-list">
            <li><span className="t-icon">✅</span><span>Mantener la cuenta activa en la consola para poder jugar.</span></li>
            <li><span className="t-icon">✅</span><span>Conexión a internet ocasional para validar la licencia del juego.</span></li>
          </ul>

          <div className="terminos-tip">
            <div className="terminos-tip-title">✈️ Tip: Jugar en Modo Avión</div>
            <p>Jugar con el <strong>modo avión activado</strong> puede ayudar a extender la duración de la cuenta, ya que reduce la exposición a validaciones en línea de Nintendo. Sin embargo, <strong>no garantiza permanencia</strong> — la cuenta sigue siendo de duración indefinida y sujeta a las condiciones descritas arriba.</p>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════
          SECCIÓN: PLAYSTATION
      ══════════════════════════════════════ */}
      <div className="terminos-section terminos-section--playstation">
        <div className="terminos-section-header">
          🎮 PlayStation PS4 / PS5 — Juegos y Suscripciones
        </div>
        <div className="terminos-section-body">

          <div className="terminos-sub-label">📦 Naturaleza del Producto</div>
          <p className="terminos-desc">
            Recibirás acceso mediante una <strong>cuenta de PlayStation Network (PSN)</strong> en modalidad <strong>Principal</strong> o <strong>Secundaria</strong>, según lo adquirido.
            También ofrecemos suscripciones digitales como <strong>PlayStation Plus (PS Plus)</strong> y otras membresías, entregadas de manera legal y segura.
          </p>

          <div className="terminos-sub-label">▶️ Modo de Uso</div>
          <ul className="terminos-list">
            <li><span className="t-icon">✅</span><span>Recibirás las credenciales de acceso (usuario y contraseña) de la cuenta PSN correspondiente.</span></li>
            <li><span className="t-icon">🟦</span><span><strong>Cuenta Principal:</strong> puedes jugar desde tu usuario personal con conexión a internet sin restricciones.</span></li>
            <li><span className="t-icon">🟦</span><span><strong>Cuenta Secundaria:</strong> deberás ingresar siempre con la cuenta entregada para acceder al contenido.</span></li>
            <li><span className="t-icon">🚫</span><span>Prohibido modificar la contraseña, cambiar datos o revender la cuenta entregada.</span></li>
          </ul>

          <div className="terminos-sub-label">⚙️ Condiciones de Uso</div>
          <ul className="terminos-list">
            <li><span className="t-icon">✅</span><span>Las cuentas PSN entregadas son legales, adquiridas de manera oficial.</span></li>
            <li><span className="t-icon">📌</span><span>Sony permite compartir juegos en una misma consola mediante la modalidad principal/secundaria.</span></li>
            <li><span className="t-icon">🚫</span><span>El mal uso (cambio de credenciales, compartir fuera de lo permitido) puede generar suspensión de la cuenta.</span></li>
          </ul>

          <div className="terminos-alert">
            <div className="terminos-alert-title">⚠️ Riesgos importantes a considerar</div>
            <ul>
              <li><span>⚠️</span><span>En cuentas <strong>Secundarias</strong>, si se cierra sesión, puede perderse el acceso al contenido.</span></li>
              <li><span>⚠️</span><span>Es responsabilidad del cliente mantener la cuenta configurada según las instrucciones entregadas.</span></li>
            </ul>
          </div>

          <div className="terminos-sub-label">💻 Requisitos Técnicos</div>
          <ul className="terminos-list">
            <li><span className="t-icon">✅</span><span>Conexión a internet estable para validar licencias y actualizaciones.</span></li>
            <li><span className="t-icon">✅</span><span>Respetar estrictamente la modalidad adquirida (Principal o Secundaria).</span></li>
          </ul>

        </div>
      </div>

      {/* ══════════════════════════════════════
          SECCIÓN: POLÍTICA DE REEMBOLSO
      ══════════════════════════════════════ */}
      <div className="terminos-section terminos-section--reembolso">
        <div className="terminos-section-header">
          💰 Política de Reembolso
        </div>
        <div className="terminos-section-body">
          <p className="terminos-desc">
            Dado que se trata de <strong>productos digitales con entrega inmediata</strong>, no se aceptan devoluciones ni reembolsos, salvo en los siguientes casos:
          </p>
          <ul className="terminos-list">
            <li><span className="t-icon">✅</span><span>Las credenciales entregadas sean incorrectas o inválidas.</span></li>
            <li><span className="t-icon">✅</span><span>El acceso no funcione por errores directamente atribuibles a nuestra tienda.</span></li>
            <li><span className="t-icon">🚫</span><span>No aplica reembolso por errores del cliente al seguir las instrucciones de instalación.</span></li>
            <li><span className="t-icon">🚫</span><span>No aplica reembolso si la cuenta fue manipulada (contraseña cambiada, sesión cerrada, etc.).</span></li>
          </ul>
        </div>
      </div>

      {/* ══════════════════════════════════════
          FOOTER DE ACEPTACIÓN
      ══════════════════════════════════════ */}
      <div className="terminos-footer-card">
        <span className="terminos-footer-icon">📌</span>
        <span>
          Al <strong>confirmar tu compra</strong>, aceptas plenamente estas condiciones tanto para productos de Nintendo Switch como de PlayStation (PS4 / PS5).
          Si tienes dudas antes de comprar, contáctanos por WhatsApp — estamos para ayudarte.
        </span>
      </div>
    </div>
  );
}
