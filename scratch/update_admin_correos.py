import re

with open('src/pages/Admin/AdminCorreos.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add new templates right after buildReviewTemplate
new_templates = '''
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
'''

content_norm = content.replace('\r\n', '\n')

target_after_review = 'function EmailPreview({ body, asunto, previewName = "Cliente PandaStore" }) {'
if target_after_review in content_norm and 'buildAbandonedCartTemplate' not in content_norm:
    content_norm = content_norm.replace(target_after_review, new_templates + '\n' + target_after_review)
    print("Added new templates successfully")

# 2. Update state to support template selection
old_state_tpl = '  const [tab, setTab] = useState("editor"); // "editor" | "preview"'
new_state_tpl = '''  const [tab, setTab] = useState("editor"); // "editor" | "preview"
  const [tipoPlantilla, setTipoPlantilla] = useState("resena"); // "resena" | "carrito" | "juego_visto"
  const [juegoContexto, setJuegoContexto] = useState("");'''

if old_state_tpl in content_norm and 'tipoPlantilla' not in content_norm:
    content_norm = content_norm.replace(old_state_tpl, new_state_tpl)
    print("Added tipoPlantilla state")

# 3. Add function to switch templates
helper_tpl_switch = '''
  const aplicarPlantilla = (tipo, overrideGame = "") => {
    setTipoPlantilla(tipo);
    const cuponObj = cupones.find(c => c.codigo === cuponSeleccionado);
    const cod = cuponObj?.codigo || "";
    const desc = cuponObj?.descuento || "";
    const game = overrideGame || juegoContexto || "tus juegos seleccionados";

    let tpl;
    if (tipo === "carrito") {
      tpl = buildAbandonedCartTemplate(cod, desc, [], game);
    } else if (tipo === "juego_visto") {
      tpl = buildViewedGameTemplate(cod, desc, game);
    } else {
      tpl = buildReviewTemplate(cod, desc);
    }
    setAsunto(tpl.asunto);
    setHtmlBody(tpl.htmlBody);
    setAlerta({ tipo: "success", msg: `Plantilla "${tipo === 'carrito' ? 'Recuperar Carrito' : tipo === 'juego_visto' ? 'Juego Visto' : 'Pedir Reseña'}" aplicada.` });
  };
'''

if 'const aplicarPlantilla =' not in content_norm:
    target_place = '  const handleCambiarCupon = (nuevoCodigo) => {'
    content_norm = content_norm.replace(target_place, helper_tpl_switch + '\n' + target_place)
    print("Added aplicarPlantilla helper")

# 4. Handle URL query params
query_handler = '''
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
      const tpl = buildAbandonedCartTemplate(cuponObj?.codigo || "", cuponObj?.descuento || "", [], recJuego || "tus juegos");
      setAsunto(tpl.asunto);
      setHtmlBody(tpl.htmlBody);
      setTipoPlantilla("carrito");
    }
  }, [cupones, cuponSeleccionado]);
'''

if 'const recEmail = params.get("recuperarEmail");' not in content_norm:
    target_load = '  /* ── Load cupones activos & pre-aplicar a la plantilla ── */'
    content_norm = content_norm.replace(target_load, query_handler + '\n' + target_load)
    print("Added query params handler")

# 5. Enrich cartsSnap processing in load
old_carts_proc = '''        // 3. Process Abandoned Carts / Leads
        if (cartsSnap.status === 'fulfilled') {
          cartsSnap.value.docs.forEach((d) => {
            const c = d.data();
            const client = getOrCreate(c.email || c.customerEmail);
            if (!client) return;
            if (!client.isRegistered && client.ordersCount === 0) {
              client.tipo = 'lead';
            }
            if (c.updatedAt) {
              const cartDate = c.updatedAt.toDate ? c.updatedAt.toDate() : new Date(c.updatedAt);
              if (!client.lastActivityDate || cartDate > client.lastActivityDate) {
                client.lastActivityDate = cartDate;
              }
            }
          });
        }'''

new_carts_proc = '''        // 3. Process Abandoned Carts / Leads & Viewed Products
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
        }'''

if old_carts_proc in content_norm:
    content_norm = content_norm.replace(old_carts_proc, new_carts_proc)
    print("Enriched cartsSnap processing")

# 6. Update segmentCounts
old_seg_counts = '''    return {
      todos: clientes.length,
      registrados: clientes.filter(c => c.isRegistered).length,
      invitados: clientes.filter(c => c.isGuest && c.hasOrders).length,
      steam: clientes.filter(c => c.hasBoughtSteam).length,
      switch: clientes.filter(c => c.hasBoughtNintendo).length,
      playstation: clientes.filter(c => c.hasBoughtPlaystation).length,
      sagas: clientes.filter(c => c.hasBoughtSagas).length,
      sin_compras: clientes.filter(c => c.isRegistered && !c.hasOrders).length,
      recientes_30d: clientes.filter(c => c.lastActivityDate && new Date(c.lastActivityDate) >= daysAgo30).length,
      recientes_7d: clientes.filter(c => c.lastActivityDate && new Date(c.lastActivityDate) >= daysAgo7).length
    };'''

new_seg_counts = '''    return {
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
    };'''

if old_seg_counts in content_norm:
    content_norm = content_norm.replace(old_seg_counts, new_seg_counts)
    print("Updated segment counts")

# 7. Update clientesFiltrados
old_filtro_seg = '''    // 1. Filtrar por segmento activo
    if (segmentoActivo === "registrados") {
      res = res.filter(c => c.isRegistered);
    } else if (segmentoActivo === "invitados") {
      res = res.filter(c => c.isGuest && c.hasOrders);'''

new_filtro_seg = '''    // 1. Filtrar por segmento activo
    if (segmentoActivo === "carritos_abandonados") {
      res = res.filter(c => c.hasAbandonedCart);
    } else if (segmentoActivo === "vieron_juegos") {
      res = res.filter(c => c.viewedProducts && c.viewedProducts.length > 0);
    } else if (segmentoActivo === "registrados") {
      res = res.filter(c => c.isRegistered);
    } else if (segmentoActivo === "invitados") {
      res = res.filter(c => c.isGuest && c.hasOrders);'''

if old_filtro_seg in content_norm:
    content_norm = content_norm.replace(old_filtro_seg, new_filtro_seg)
    print("Updated clientesFiltrados")

# 8. Add template switcher UI in Editor
target_editor_header = '          {/* Switcher: Editor / Vista Previa */}'
new_editor_header = '''          {/* Selector de Plantillas Prediseñadas */}
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

          {/* Switcher: Editor / Vista Previa */}'''

if target_editor_header in content_norm and 'Elegir Objetivo de Campaña' not in content_norm:
    content_norm = content_norm.replace(target_editor_header, new_editor_header)
    print("Added template switcher UI")

# 9. Add Segment buttons for Carritos Abandonados and Vieron Juegos
target_seg_buttons = '''            <button
              className={`segment-chip ${segmentoActivo === "todos" ? "active" : ""}`}
              onClick={() => setSegmentoActivo("todos")}
            >
              🌟 Todos ({segmentCounts.todos})
            </button>'''

new_seg_buttons = '''            <button
              className={`segment-chip ${segmentoActivo === "todos" ? "active" : ""}`}
              onClick={() => setSegmentoActivo("todos")}
            >
              🌟 Todos ({segmentCounts.todos})
            </button>
            <button
              className={`segment-chip ${segmentoActivo === "carritos_abandonados" ? "active" : ""}`}
              onClick={() => setSegmentoActivo("carritos_abandonados")}
              style={{ borderColor: segmentoActivo === "carritos_abandonados" ? "#ec4899" : "rgba(236,72,153,0.4)" }}
            >
              🛒 Carritos Abandonados ({segmentCounts.carritos_abandonados || 0})
            </button>
            <button
              className={`segment-chip ${segmentoActivo === "vieron_juegos" ? "active" : ""}`}
              onClick={() => setSegmentoActivo("vieron_juegos")}
              style={{ borderColor: segmentoActivo === "vieron_juegos" ? "#38bdf8" : "rgba(56,189,248,0.4)" }}
            >
              👀 Vieron Juegos ({segmentCounts.vieron_juegos || 0})
            </button>'''

if target_seg_buttons in content_norm and 'carritos_abandonados' not in content_norm:
    content_norm = content_norm.replace(target_seg_buttons, new_seg_buttons)
    print("Added segment chip buttons")

with open('src/pages/Admin/AdminCorreos.js', 'w', encoding='utf-8') as f:
    f.write(content_norm.replace('\n', '\r\n'))

print("All modifications written to AdminCorreos.js successfully!")
