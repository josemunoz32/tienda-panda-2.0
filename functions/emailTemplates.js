const colorMain = "#11021c"; // Fondo oscuro principal
const colorSecondary = "#1A0B2E"; // Fondo de contenedor
const colorAccent = "#a259ff"; // Morado PandaStore
const colorText = "#f8fafc"; // Texto claro
const colorTextMuted = "#94a3b8"; // Texto secundario

const baseHeader = `
<div style="background-color: ${colorMain}; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px 20px; text-align: center; color: ${colorText};">
  <div style="max-width: 600px; margin: 0 auto; background-color: ${colorSecondary}; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.5); border: 1px solid #331557;">
    <div style="background: linear-gradient(135deg, #a259ff 0%, #6d28d9 100%); padding: 28px 20px; text-align: center;">
      <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; background-color: #ffffff; border-radius: 50%; border: 3px solid #a855f7;">
        <tr>
          <td align="center" valign="middle" width="76" height="76" style="background-color: #ffffff; border-radius: 50%; padding: 4px;">
            <img src="https://pandastoreupdate.web.app/miicono.png" alt="PandaStore Logo" width="68" height="68" style="display: block; width: 68px; height: 68px; border-radius: 50%; border: 0;" />
          </td>
        </tr>
      </table>
      <h1 style="margin: 12px 0 0 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 1px;">PandaStore</h1>
    </div>
    <div style="padding: 40px 30px; text-align: left; color: ${colorText};">
`;

const baseFooter = `
    </div>
    <div style="background-color: #0f0318; padding: 25px 20px; text-align: center; border-top: 1px solid #331557;">
      <div style="margin-bottom: 20px;">
        <a href="https://wa.me/56974751810" target="_blank" style="display: inline-block; margin: 0 12px; text-decoration: none;">
          <img src="https://img.icons8.com/color/48/whatsapp--v1.png" alt="WhatsApp" style="width: 35px; height: 35px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); border-radius: 8px;"/>
        </a>
      </div>
      <p style="margin: 0; color: ${colorTextMuted}; font-size: 14px; font-weight: bold;">© ${new Date().getFullYear()} PandaStore. Todos los derechos reservados.</p>
      <p style="margin: 8px 0 0 0; color: ${colorTextMuted}; font-size: 13px;">Tu tienda digital de confianza para videojuegos.</p>
    </div>
  </div>
</div>
`;

// 1. Confirmación de Compra (Cliente)
exports.htmlConfirmacionCompra = (nombre, orderId, totalLine, metodoPagoLabel, productosTxt) => {
  // Convertir los productos de texto a lista HTML bonita
  const productosHtml = productosTxt.split("\\n").filter((p) => p.trim() !== "").map((p) => {
    return `<li style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: #e2e8f0;">${p.replace("- ", "🎮 ")}</li>`;
  }).join("");

  return `
    ${baseHeader}
    <h2 style="color: ${colorAccent}; margin-top: 0;">¡Compra Confirmada! 🎉</h2>
    <p style="font-size: 16px; line-height: 1.6;">Hola <strong>${nombre || "Gamer"}</strong>,</p>
    <p style="font-size: 16px; line-height: 1.6;">¡Gracias por tu compra en PandaStore! Tu pago ha sido verificado correctamente y tu pedido está procesándose.</p>
    
    <div style="background-color: rgba(162, 89, 255, 0.1); border-left: 4px solid ${colorAccent}; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Nº de Pedido:</strong> #${orderId}</p>
      <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Método de pago:</strong> ${metodoPagoLabel}</p>
      <p style="margin: 0; font-size: 16px; font-weight: bold; color: #d8b4fe;">${totalLine}</p>
    </div>

    <h3 style="color: #cbd5e1; border-bottom: 1px solid #331557; padding-bottom: 10px;">Tus Productos</h3>
    <ul style="list-style-type: none; padding: 0; margin: 0 0 30px 0;">
      ${productosHtml}
    </ul>

    <p style="font-size: 16px; line-height: 1.6;">Si compraste juegos para <strong>Nintendo Switch, PlayStation o Streaming</strong>, contáctanos directamente a nuestro WhatsApp oficial para coordinar tu entrega o instalación inmediata:</p>
    <div style="text-align: center; margin: 25px 0;">
      <a href="https://wa.me/56974751810" style="background: linear-gradient(135deg, #25D366, #128C7E); color: #fff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 30px; display: inline-block;">
        📲 Coordinar Entrega por WhatsApp
      </a>
    </div>
    <p style="font-size: 14px; line-height: 1.5; color: #94a3b8;">Si tu compra es de Steam, tu clave oficial te llegará en un correo independiente con el acceso al PandaStore Launcher.</p>
    <p style="font-size: 16px; line-height: 1.6;">¡Prepárate para jugar!</p>
    ${baseFooter}
  `;
};

// 2. Pedido Pendiente (Cliente - Transferencia)
exports.htmlPedidoPendiente = (nombre, orderId, totalLine, metodoPagoLabel, productosTxt) => {
  const productosHtml = productosTxt.split("\\n").filter((p) => p.trim() !== "").map((p) => {
    return `<li style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: #e2e8f0;">${p.replace("- ", "🛒 ")}</li>`;
  }).join("");

  return `
    ${baseHeader}
    <h2 style="color: #f59e0b; margin-top: 0;">⏳ Tu pedido está en espera</h2>
    <p style="font-size: 16px; line-height: 1.6;">Hola <strong>${nombre || "Gamer"}</strong>,</p>
    <p style="font-size: 16px; line-height: 1.6;">Hemos recibido tu solicitud de compra. Como elegiste <strong>${metodoPagoLabel}</strong>, estamos esperando a que confirmes el pago para enviarte los juegos.</p>
    
    <div style="background-color: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Nº de Pedido:</strong> #${orderId}</p>
      <p style="margin: 0; font-size: 16px; font-weight: bold; color: #fcd34d;">${totalLine}</p>
    </div>

    <h3 style="color: #cbd5e1; border-bottom: 1px solid #331557; padding-bottom: 10px;">Productos a llevar</h3>
    <ul style="list-style-type: none; padding: 0; margin: 0 0 30px 0;">
      ${productosHtml}
    </ul>

    <p style="font-size: 16px; line-height: 1.6;">Recuerda enviar el comprobante de pago por WhatsApp o a nuestro correo para poder activar tu compra lo antes posible.</p>
    ${baseFooter}
  `;
};

// 3. Respuesta de Soporte Técnico
exports.htmlRespuestaSoporte = (respuesta) => {
  return `
    ${baseHeader}
    <h2 style="color: ${colorAccent}; margin-top: 0;">Actualización de Soporte Técnico 🛠️</h2>
    <p style="font-size: 16px; line-height: 1.6;">Hola,</p>
    <p style="font-size: 16px; line-height: 1.6;">Nuestro equipo ha respondido a tu consulta de soporte:</p>
    
    <div style="background-color: rgba(255, 255, 255, 0.05); padding: 20px; margin: 25px 0; border-radius: 8px; font-style: italic; color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1);">
      "${respuesta.replace(/\\n/g, "<br>")}"
    </div>

    <p style="font-size: 16px; line-height: 1.6;">Si necesitas más ayuda, puedes responder directamente en nuestra página en la sección de Soporte.</p>
    ${baseFooter}
  `;
};

// 4. Nuevo Ticket de Soporte (Admin)
exports.htmlNuevoTicketAdmin = (nombre, email, mensaje) => {
  return `
    ${baseHeader}
    <h2 style="color: #38bdf8; margin-top: 0;">🚨 Nuevo Ticket Recibido</h2>
    <p style="font-size: 16px; line-height: 1.6;">Se ha creado un nuevo ticket de soporte en la tienda.</p>
    
    <div style="background-color: rgba(56, 189, 248, 0.1); border-left: 4px solid #38bdf8; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Nombre:</strong> ${nombre}</p>
      <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 0; font-size: 15px;"><strong>Mensaje:</strong></p>
      <p style="margin: 10px 0 0 0; color: #e2e8f0;">${mensaje.replace(/\\n/g, "<br>")}</p>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="https://pandastoreupdate.web.app/admin/soporte" style="background-color: #38bdf8; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 30px; display: inline-block;">Ir al Panel de Soporte</a>
    </div>
    ${baseFooter}
  `;
};

// 5. Notificación Genérica Admin
exports.htmlAdminNotificacion = (titulo, contenido) => {
  return `
    ${baseHeader}
    <h2 style="color: #ef4444; margin-top: 0;">${titulo}</h2>
    <div style="font-size: 16px; line-height: 1.6; color: #e2e8f0;">
      ${contenido.replace(/\\n/g, "<br>")}
    </div>
    <div style="text-align: center; margin-top: 30px;">
      <a href="https://pandastoreupdate.web.app/admin" style="background-color: ${colorAccent}; color: #fff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 30px; display: inline-block;">Abrir Panel de Admin</a>
    </div>
    ${baseFooter}
  `;
};

// 6. Entrega de Clave PandaStore Launcher (Steam) con Juegos y Tutorial
exports.htmlEntregaKeySteam = ({nombre, key, juegosList, orderId}) => {
  const juegosHtml = (juegosList && juegosList.length > 0) ?
    juegosList.map((j) => {
      const nombreJuego = typeof j === "string" ? j : (j.name || j.title || "Juego de Steam");
      return `<li style="padding: 10px 14px; margin-bottom: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(162,89,255,0.2); border-radius: 10px; color: #f8fafc; font-size: 15px; display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 18px;">🎮</span>
        <strong style="color: #ffffff;">${nombreJuego}</strong>
      </li>`;
    }).join("") :
    `<li style="padding: 10px 14px; background: rgba(0,245,212,0.06); border: 1px solid rgba(0,245,212,0.25); border-radius: 10px; color: #00f5d4; font-weight: bold;">
        ⭐ Acceso Completo a Todo el Catálogo de Steam (+69.000 Juegos)
      </li>`;

  return `
    ${baseHeader}
    <div style="text-align: center; margin-bottom: 25px;">
      <div style="display: inline-block; background: rgba(0, 245, 212, 0.12); color: #00f5d4; font-weight: 800; font-size: 12px; letter-spacing: 2px; padding: 6px 16px; border-radius: 20px; border: 1px solid rgba(0, 245, 212, 0.35); text-transform: uppercase; margin-bottom: 12px;">
        ✓ Pago Confirmado • Pedido #${orderId || "OK"}
      </div>
      <h2 style="color: #ffffff; font-size: 26px; font-weight: 800; margin: 0 0 10px 0; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
        ¡Tu Clave de PandaStore Launcher está Lista! 🎮✨
      </h2>
      <p style="color: ${colorTextMuted}; font-size: 15px; margin: 0; line-height: 1.5;">
        Hola <strong style="color: #ffffff;">${nombre || "Gamer"}</strong>, tu pago ha sido verificado con éxito. A continuación tienes tu Clave Oficial y el acceso para descargar tus juegos.
      </p>
    </div>

    <!-- TARJETA DE LA CLAVE -->
    <div style="background: linear-gradient(135deg, rgba(162, 89, 255, 0.18) 0%, rgba(30, 15, 60, 0.8) 100%); border: 2px solid #a259ff; border-radius: 18px; padding: 26px 20px; text-align: center; margin: 25px 0; box-shadow: 0 8px 32px rgba(162, 89, 255, 0.25);">
      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #d8b4fe; font-weight: 700; margin-bottom: 10px;">
        🔑 TU CLAVE DE ACTIVACIÓN EXCLUSIVA
      </div>
      <div style="font-family: 'Consolas', 'Courier New', monospace; font-size: 32px; font-weight: 900; letter-spacing: 4px; color: #00f5d4; text-shadow: 0 0 16px rgba(0, 245, 212, 0.5); background: rgba(0,0,0,0.45); padding: 14px 20px; border-radius: 12px; display: inline-block; border: 1px solid rgba(0, 245, 212, 0.4); margin: 6px 0 12px 0;">
        ${key}
      </div>
      <div style="font-size: 13px; color: #cbd5e1; line-height: 1.4;">
        Esta clave activa de por vida tus juegos en el Launcher PandaStore.
      </div>
    </div>

    <!-- JUEGOS INCLUIDOS -->
    <div style="margin: 30px 0;">
      <h3 style="color: #cbd5e1; font-size: 16px; font-weight: 700; margin: 0 0 14px 0; display: flex; align-items: center; gap: 8px;">
        🎮 Juegos Incluidos en esta Clave:
      </h3>
      <ul style="list-style-type: none; padding: 0; margin: 0;">
        ${juegosHtml}
      </ul>
    </div>

    <!-- BOTON DE DESCARGA CON TUTORIAL -->
    <div style="text-align: center; margin: 35px 0 25px 0; background: rgba(162, 89, 255, 0.08); border-radius: 18px; padding: 25px 20px; border: 1px solid rgba(162,89,255,0.25);">
      <h4 style="color: #ffffff; font-size: 17px; margin: 0 0 8px 0;">¿Cómo empezar a jugar?</h4>
      <p style="color: ${colorTextMuted}; font-size: 14px; margin: 0 0 20px 0;">
        Descarga nuestro Launcher oficial donde encontrarás el video tutorial guiado paso a paso.
      </p>
      <a href="https://pandastoreupdate.web.app/descargar-launcher" 
         target="_blank" 
         style="display: inline-block; background: linear-gradient(135deg, #a259ff 0%, #7b2ff2 100%); color: #ffffff; font-weight: 800; font-size: 16px; padding: 16px 36px; text-decoration: none; border-radius: 50px; box-shadow: 0 8px 24px rgba(123, 47, 242, 0.4); letter-spacing: 0.5px;">
        📥 Descargar Launcher & Ver Tutorial
      </a>
    </div>

    <!-- PASOS DE INSTALACION RAPIDA -->
    <div style="background: rgba(0,0,0,0.25); border-radius: 14px; padding: 20px; margin-bottom: 25px;">
      <div style="color: #a259ff; font-weight: bold; font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">
        ⚡ Guía Rápida en 3 Pasos:
      </div>
      <table cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
        <tr>
          <td style="vertical-align: top; width: 30px; font-size: 18px;">1️⃣</td>
          <td style="padding-bottom: 10px;"><strong style="color: #ffffff;">Descarga e instala</strong> el Launcher desde el enlace superior.</td>
        </tr>
        <tr>
          <td style="vertical-align: top; width: 30px; font-size: 18px;">2️⃣</td>
          <td style="padding-bottom: 10px;"><strong style="color: #ffffff;">Abre PandaStore</strong> y pega tu Clave: <code style="color: #00f5d4; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">${key}</code>.</td>
        </tr>
        <tr>
          <td style="vertical-align: top; width: 30px; font-size: 18px;">3️⃣</td>
          <td><strong style="color: #ffffff;">Haz clic en tu juego</strong>, pulsa "Fix / Parche" o "Jugar" ¡y a disfrutar!</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 14px; color: ${colorTextMuted}; line-height: 1.5; margin: 20px 0 0 0; text-align: center;">
      ¿Tienes alguna duda o necesitas ayuda? Escríbenos directamente por WhatsApp y te asistiremos con gusto.
    </p>
    ${baseFooter}
  `;
};

