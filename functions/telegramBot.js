const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp();
}
const fetch = (...args) => import("node-fetch").then(({default: f}) => f(...args));

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "";
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || "ninte2Bot";
const CANAL_PUBLICO_ID = process.env.CANAL_PUBLICO_ID || "-1002444204789";
const CANAL_REVENDEDORES_ID = process.env.CANAL_REVENDEDORES_ID || "-1004390385564";
const ADMIN_ID = process.env.ADMIN_ID || "5158777962";
const TELEGRAM_CONTACT = process.env.TELEGRAM_CONTACT || "NintendoChile2";
const WEBSITE_URL = process.env.WEBSITE_URL || "https://pandastoreupdate.web.app";
const INSTAGRAM_URL = "https://instagram.com/pandastoregaming";
const TESTIMONIOS_URL = `${WEBSITE_URL}/testimonios`;
const PROMOS_URL = `${WEBSITE_URL}/promos`;
const GUIA_NINTENDO_URL = `${WEBSITE_URL}/instalacion-nintendo`;
const GUIA_PSN_URL = `${WEBSITE_URL}/instalacion-playstation`;
const GUIA_STEAM_URL = `${WEBSITE_URL}/descargar-launcher`;

// Márgenes de ganancia solicitados:
// Canal Normal: 15.000 CLP (Ganas de 12 a 15 mil)
// Canal Proveedores / Revendedores: 5.000 CLP (Ganas 5 mil por pack)
const MARGEN_PUBLICO = 15000;
const MARGEN_REVENDEDOR = 5000;
const crypto = require("crypto");

function calcularPreciosPublico(precioUsd) {
  const precioClp = (precioUsd * 1000) + MARGEN_PUBLICO;
  const precioUsdt = Math.floor((precioClp / 1000) + 4);
  return {precioClp, precioUsdt};
}

function calcularPreciosRevendedor(precioUsd) {
  const precioClp = (precioUsd * 1000) + MARGEN_REVENDEDOR;
  const precioUsdt = Math.floor((precioClp / 1000) + 4);
  return {precioClp, precioUsdt};
}

function calcularPrecios(precioUsd) {
  return calcularPreciosPublico(precioUsd);
}

function calcularHuellaPack(pack) {
  const titulo = (pack.titulo || "").trim().toLowerCase();
  const juegos = (pack.juegos || []).map((j) => j.trim().toLowerCase()).sort();
  const firma = `${titulo}:::${juegos.join("|")}`;
  return crypto.createHash("sha256").update(firma).digest("hex");
}

function parsearTipo1(texto) {
  if (!texto || !texto.includes("---- List Game ----")) return null;
  const lineas = texto.trim().split("\n");
  const codigo = lineas[0].trim();
  const matchJuegos = texto.match(/---- List Game ----([\s\S]*?)----End Game List ----/);
  if (!matchJuegos) return null;
  const juegos = matchJuegos[1].split("\n").map((j) => j.trim()).filter(Boolean);
  if (juegos.length < 1) return null;
  const matchPrecio = texto.match(/Price\s*:\s*(\d+)\$/);
  if (!matchPrecio) return null;
  const precioUsd = parseInt(matchPrecio[1], 10);
  const {precioClp, precioUsdt} = calcularPrecios(precioUsd);
  return {
    titulo: `Código: ${codigo}`,
    juegos,
    precio_usd: precioUsd,
    precio_clp: precioClp,
    precio_usdt: precioUsdt,
    horario_limitado: false,
  };
}

function parsearTipo2(texto) {
  if (!texto.includes("Nickname :") || !texto.includes("Linked Consoles :")) return null;
  const matchConsoles = texto.match(/Linked Consoles\s*:\s*(\d+)/);
  if (!matchConsoles || parseInt(matchConsoles[1], 10) >= 3) return null;
  const matchNick = texto.match(/Nickname\s*:\s*(.+)/);
  if (!matchNick) return null;
  const nickname = matchNick[1].trim();
  const matchPrecio = texto.match(/PRICE\s*(\d+)\$/);
  if (!matchPrecio) return null;
  const precioUsd = parseInt(matchPrecio[1], 10);
  const {precioClp, precioUsdt} = calcularPrecios(precioUsd);
  const juegos = [];
  let enLista = false;
  for (const linea of texto.split("\n")) {
    if (linea.includes("==============Transaction")) {
      enLista = true;
      continue;
    }
    if (linea.startsWith("====")) enLista = false;
    if (enLista) {
      const limpia = linea.trim();
      if (limpia && !limpia.toLowerCase().includes("no games found")) {
        juegos.push(limpia);
      }
    }
  }
  if (juegos.length < 1) return null;
  return {
    titulo: `Nickname: ${nickname}`,
    juegos,
    precio_usd: precioUsd,
    precio_clp: precioClp,
    precio_usdt: precioUsdt,
    horario_limitado: false,
  };
}

function parsearTipo3(texto) {
  if (!texto.includes("💎 NUEVA CUENTA DISPONIBLE 💎")) return null;
  const secciones = texto.split(/\n━{10,}\s*\n/);
  if (secciones.length < 4) return null;
  const datosCuenta = secciones[1].trim();
  const matchDevices = datosCuenta.match(/Devices:\s*\[(.*?)\]/i);
  if (matchDevices) {
    const devStr = matchDevices[1].trim();
    if (devStr.toLowerCase() !== "none") {
      const devList = devStr.split(",").map((d) => d.trim()).filter(Boolean);
      if (devList.length !== 1) return null;
    }
  } else {
    return null;
  }
  const matchNick = datosCuenta.match(/Nickname:\s*(.+)/i);
  const matchId = datosCuenta.match(/ID:\s*#?(\d+)/i);
  let titulo = "";
  if (matchNick) titulo = `Nickname: ${matchNick[1].trim()}`;
  else if (matchId) titulo = `ID: #${matchId[1].trim()}`;
  else return null;

  const juegos = secciones[2].split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("ID:") && !l.startsWith("Child:") && !l.startsWith("Balance:") && !l.startsWith("Gold points:") && !l.startsWith("CC:") && !l.startsWith("Orders:") && !l.startsWith("Devices:") && !l.startsWith("Country:") && !l.startsWith("Active Plan:") && !l.startsWith("Game Voucher:"));

  if (!juegos.length) return null;
  const matchPrecio = secciones[3].match(/💰\s*PRECIO:\s*([\d.]+)\s*USDT/i);
  if (!matchPrecio) return null;
  const precioUsd = Math.round(parseFloat(matchPrecio[1]));
  const {precioClp, precioUsdt} = calcularPrecios(precioUsd);
  return {
    titulo,
    juegos,
    precio_usd: precioUsd,
    precio_clp: precioClp,
    precio_usdt: precioUsdt,
    horario_limitado: false,
  };
}

function parsearTipo4(texto) {
  const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lineas.length || !/^[A-Z0-9]{3,10}$/.test(lineas[0])) return null;
  const codigo = lineas[0];
  if (!texto.includes("Country:US") && !texto.includes("Country: US")) return null;
  const matchJuegos = texto.match(/---- List Game ----([\s\S]*?)----End Game List ----/);
  if (!matchJuegos) return null;
  const juegos = matchJuegos[1].split("\n").map((j) => j.trim()).filter(Boolean);
  if (juegos.length < 3) return null;
  const matchPrecio = texto.match(/Price\s*:\s*(\d+)\$/);
  if (!matchPrecio) return null;
  const precioUsd = parseInt(matchPrecio[1], 10);
  const {precioClp, precioUsdt} = calcularPrecios(precioUsd);
  return {
    titulo: `Código: ${codigo}`,
    juegos,
    precio_usd: precioUsd,
    precio_clp: precioClp,
    precio_usdt: precioUsdt,
    horario_limitado: true,
  };
}

function parsearTipo5(texto) {
  if (!texto.includes("NUEVA CUENTA DISPONIBLE")) return null;
  const matchNick = texto.match(/Nickname:\s*([^\n]+)/i);
  if (!matchNick) return null;
  const nickname = matchNick[1].trim();
  const matchGames = texto.match(/country:\s*us\s*[\n\r]+([\s\S]*?)(?=\n(?:precio:|💰 precio:)|\n[━]+)/i);
  if (!matchGames) return null;
  const juegos = matchGames[1].split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !/^(Child:|Devices:|CC:|Active Plan:|Game Voucher:)/i.test(l));
  if (!juegos.length) return null;
  const matchPrecio = texto.match(/(?:Precio:|💰 PRECIO:)\s*([\d.]+)\s*USDT/i);
  if (!matchPrecio) return null;
  const precioUsd = Math.round(parseFloat(matchPrecio[1]));
  const {precioClp, precioUsdt} = calcularPrecios(precioUsd);
  return {
    titulo: `Nickname: ${nickname}`,
    juegos,
    precio_usd: precioUsd,
    precio_clp: precioClp,
    precio_usdt: precioUsdt,
    horario_limitado: false,
  };
}

function parsearPackCualquiera(texto) {
  return parsearTipo5(texto) ||
         parsearTipo4(texto) ||
         parsearTipo1(texto) ||
         parsearTipo2(texto) ||
         parsearTipo3(texto);
}

// ── Obtener correlativo desde Firestore con incremento seguro ──
async function obtenerSiguienteIdPackFirestore() {
  const ref = admin.firestore().collection("configuraciones").doc("contador_packs");
  return await admin.firestore().runTransaction(async (t) => {
    const doc = await t.get(ref);
    let num = 7399;
    if (doc.exists && doc.data().numero) {
      num = doc.data().numero;
    }
    t.set(ref, {numero: num + 1}, {merge: true});
    const strNum = String(num).padStart(3, "0");
    return `#PACK-${strNum}`;
  });
}

// ── Enviar pack formateado al canal de Telegram (Público o Revendedores) ──
async function publicarPackAlCanal(pack, esRevendedor = false) {
  const idStr = pack.id_pack;
  const idParam = idStr.replace("#", "").replace(/-/g, "_");
  const horario = pack.horario_limitado ? "De 12:00 a 20:00 hrs" : "Las 24 horas";
  const juegos = pack.juegos || [];
  const topJuegos = juegos.slice(0, 25);

  let msg = "";
  let targetChatId = CANAL_PUBLICO_ID;

  if (esRevendedor) {
    targetChatId = CANAL_REVENDEDORES_ID;
    const {precioClp: clpRev, precioUsdt: usdtRev} = calcularPreciosRevendedor(pack.precio_usd);
    const precioClpStr = `$${Number(clpRev).toLocaleString("es-CL")} CLP`;
    const precioUsdtStr = `${usdtRev} USDT`;

    msg = `🐼 <b>PANDA STORE | PROVEEDOR DIRECTO 👑</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `ID: ${idStr}  |  Cuenta Primaria (Juega desde tu propio usuario)\n\n` +
          `🔥 <b>JUEGOS INCLUIDOS:</b>\n`;

    for (const j of topJuegos) {
      msg += `• ${j}\n`;
    }
    if (juegos.length > 25) {
      msg += `• ... y ${juegos.length - 25} títulos más incluidos\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
           `💰 <b>PRECIO MAYORISTA:</b> ${precioClpStr} | ${precioUsdtStr}\n` +
           `⏰ <b>DISPONIBILIDAD:</b> ${horario}\n` +
           `💳 <b>PAGO:</b> BancoEstado • Mercado Pago • USDT • PayPal\n`;
  } else {
    targetChatId = CANAL_PUBLICO_ID;
    const precioClpStr = `$${Number(pack.precio_clp).toLocaleString("es-CL")} CLP`;
    const precioUsdtStr = `${pack.precio_usdt} USDT`;

    msg = `🎮 <b>PANDA STORE • PACK NINTENDO SWITCH</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `ID: ${idStr}  |  Cuenta Primaria (Juega desde tu propio usuario)\n\n` +
          `🔥 <b>JUEGOS INCLUIDOS:</b>\n`;

    for (const j of topJuegos) {
      msg += `• ${j}\n`;
    }
    if (juegos.length > 25) {
      msg += `• ... y ${juegos.length - 25} títulos más incluidos\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
           `💰 <b>PRECIO:</b> ${precioClpStr} / ${precioUsdtStr}\n` +
           `⏰ <b>DISPONIBILIDAD:</b> ${horario}\n` +
           `💳 <b>PAGO:</b> BancoEstado • Mercado Pago • USDT • PayPal\n`;
  }

  const teclado = {
    inline_keyboard: [
      [
        {text: "🛒 COMPRAR PACK", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=buy_${idParam}`},
        {text: "📸 VENTAS ANTERIORES", url: TESTIMONIOS_URL},
      ],
      [
        {text: "📩 CONTACTO DIRECTO", url: `https://t.me/${TELEGRAM_CONTACT}?text=Hola!%20Deseo%20comprar%20el%20${encodeURIComponent(idStr)}`},
      ],
    ],
  };

  if (!targetChatId || targetChatId === "0") return null;

  const res = await callTelegram("sendMessage", {
    chat_id: targetChatId,
    text: msg,
    reply_markup: teclado,
    parse_mode: "HTML",
  });

  return (res && res.ok && res.result) ? res.result.message_id : null;
}

// ── Procesar archivo JSON subido por el Administrador al Chat ──
async function procesarArchivoJsonSubido(chatId, fileId, fileName) {
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: `⏳ <b>Analizando archivo <code>${fileName}</code>...</b>\nDescargando y extrayendo packs con el filtro anti-duplicados...`,
    parse_mode: "HTML",
  });

  try {
    // 1. Obtener la URL de descarga del archivo desde Telegram
    const fileInfo = await callTelegram("getFile", {file_id: fileId});
    if (!fileInfo || !fileInfo.ok || !fileInfo.result || !fileInfo.result.file_path) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: "❌ No se pudo obtener el archivo desde los servidores de Telegram.",
      });
      return;
    }

    const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${fileInfo.result.file_path}`;
    const resp = await fetch(downloadUrl);
    if (!resp.ok) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `❌ Error al descargar el archivo: HTTP ${resp.status}`,
      });
      return;
    }

    const contenidoRaw = await resp.text();
    let data;
    try {
      data = JSON.parse(contenidoRaw);
    } catch (e) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: "❌ El archivo recibido no es un JSON válido.",
      });
      return;
    }

    // 2. Extraer mensajes del formato exportado de Telegram
    let rawMessages = [];
    if (data && Array.isArray(data.messages)) {
      rawMessages = data.messages;
    } else if (Array.isArray(data)) {
      rawMessages = data;
    } else {
      rawMessages = [data];
    }

    // 3. Parsear cada mensaje con el parser multi-formato
    const packsEncontrados = [];
    for (const msgItem of rawMessages) {
      let texto = "";
      if (typeof msgItem === "string") {
        texto = msgItem;
      } else if (msgItem && typeof msgItem.text === "string") {
        texto = msgItem.text;
      } else if (msgItem && Array.isArray(msgItem.text)) {
        texto = msgItem.text.map((part) => (typeof part === "string" ? part : (part.text || ""))).join("");
      }

      if (!texto) continue;
      const parsed = parsearPackCualquiera(texto);
      if (parsed && parsed.juegos && parsed.juegos.length > 0) {
        parsed.huella = calcularHuellaPack(parsed);
        packsEncontrados.push(parsed);
      }
    }

    if (packsEncontrados.length === 0) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `⚠️ <b>No se encontraron packs válidos</b> en <code>${fileName}</code>.\nAsegúrate de que contenga el formato de packs de Nintendo.`,
        parse_mode: "HTML",
      });
      return;
    }

    // 4. Filtrar duplicados contra Firestore por huella SHA-256
    const huellasFirestore = new Set();
    const snapFirestore = await admin.firestore().collection("packs_nintendo").select("huella").get();
    snapFirestore.docs.forEach((d) => {
      const h = d.data().huella;
      if (h) huellasFirestore.add(h);
    });

    const packsNuevos = [];
    const huellasEnEsteArchivo = new Set();

    for (const pack of packsEncontrados) {
      if (!huellasFirestore.has(pack.huella) && !huellasEnEsteArchivo.has(pack.huella)) {
        huellasEnEsteArchivo.add(pack.huella);
        packsNuevos.push(pack);
      }
    }

    if (packsNuevos.length === 0) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `ℹ️ Se encontraron <b>${packsEncontrados.length} packs</b>, pero <b>todos ya están subidos a Firestore</b> (Duplicados omitidos).`,
        parse_mode: "HTML",
      });
      return;
    }

    // 5. Guardar temporalmente en Firestore para que el admin elija lote
    await admin.firestore().collection("configuraciones").doc("admin_pending_import").set({
      packs: packsNuevos,
      total_encontrados: packsEncontrados.length,
      creado: admin.firestore.FieldValue.serverTimestamp(),
    });

    const teclado = {
      inline_keyboard: [
        [
          {text: "🔟 Subir 10", callback_data: "cloud_import_10"},
          {text: "⚡ Subir 50", callback_data: "cloud_import_50"},
          {text: "💯 Subir 100", callback_data: "cloud_import_100"},
        ],
        [
          {text: `🚀 Subir Todos (${packsNuevos.length})`, callback_data: "cloud_import_todos"},
        ],
        [
          {text: "❌ Cancelar", callback_data: "cloud_cancel_import"},
        ],
      ],
    };

    const textoRespuesta = `🐼 <b>¡ARCHIVO JSON PROCESADO CON ÉXITO!</b>\n━━━━━━━━━━━━━━━━━━━━━━━━\n📁 <b>Archivo:</b> <code>${fileName}</code>\n📦 <b>Packs detectados:</b> ${packsEncontrados.length}\n✨ <b>Packs NUEVOS sin duplicados:</b> <b>${packsNuevos.length}</b>\n━━━━━━━━━━━━━━━━━━━━━━━━\n👉 <b>¿Cuántos packs deseas publicar en el canal oficial ahora?</b>`;

    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: textoRespuesta,
      reply_markup: teclado,
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error("Error procesando archivo JSON subido:", error);
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `❌ <b>Ocurrió un error al procesar el archivo:</b>\n<code>${error.message}</code>`,
      parse_mode: "HTML",
    });
  }
}

// ── Ejecutar publicación según la selección del administrador ──
async function ejecutarImportacionDesdeCloud(chatId, messageId, opcion, req) {
  const pendingDoc = await admin.firestore().collection("configuraciones").doc("admin_pending_import").get();
  if (!pendingDoc.exists) {
    await callTelegram("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: "⚠️ No hay un archivo pendiente de importación o ya caducó. Vuelve a arrastrar el archivo JSON.",
    });
    return;
  }

  const data = pendingDoc.data();
  const todosLosPacks = data.packs || [];
  if (todosLosPacks.length === 0) {
    await callTelegram("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: "⚠️ No hay packs nuevos para importar.",
    });
    return;
  }

  // Activar bandera de importación en curso
  await admin.firestore().collection("configuraciones").doc("admin_pending_import").set({
    cancelar: false,
    en_proceso: true,
  }, {merge: true});

  let limite = todosLosPacks.length;
  if (opcion === "10") limite = Math.min(10, todosLosPacks.length);
  if (opcion === "50") limite = Math.min(50, todosLosPacks.length);
  if (opcion === "100") limite = Math.min(100, todosLosPacks.length);

  const packsASubir = todosLosPacks.slice(0, limite);
  const packsRestantes = todosLosPacks.slice(limite);

  const tecladoProgreso = {
    inline_keyboard: [
      [{text: "⏹️ DETENER / CANCELAR SUBIDA", callback_data: "cloud_cancel_now"}],
    ],
  };

  await callTelegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: `🚀 <b>Publicando ${packsASubir.length} packs en simultáneo...</b>\n\n📢 <b>Canal Público:</b> Ganancia 15.000 CLP\n👑 <b>Canal Proveedores:</b> Ganancia 5.000 CLP\n\n⏳ <i>Progreso: 0 de ${packsASubir.length} subidos (Faltan: ${packsASubir.length})...</i>`,
    reply_markup: tecladoProgreso,
    parse_mode: "HTML",
  });

  let subidos = 0;
  let cancelado = false;
  let tiempoAgotado = false;
  const startTime = Date.now();

  for (let i = 0; i < packsASubir.length; i++) {
    // Protección contra timeout de Google Cloud Functions (máx 540s / 9 min).
    // Si han pasado 400 segundos (~6.6 min), pausamos limpiamente para guardar el progreso.
    if (Date.now() - startTime > 400000) {
      tiempoAgotado = true;
      const noSubidos = packsASubir.slice(i);
      packsRestantes.unshift(...noSubidos);
      break;
    }

    const pack = packsASubir[i];

    // Verificar si el administrador pulsó Detener
    const checkCancelDoc = await admin.firestore().collection("configuraciones").doc("admin_pending_import").get();
    if (checkCancelDoc.exists && checkCancelDoc.data().cancelar === true) {
      cancelado = true;
      // Los packs que no alcanzaron a subirse se devuelven a los restantes
      const noSubidos = packsASubir.slice(i);
      packsRestantes.unshift(...noSubidos);
      break;
    }

    try {
      const idPack = await obtenerSiguienteIdPackFirestore();
      pack.id_pack = idPack;

      // 1. Publicar en Canal Público (Margen 15.000)
      const msgIdPublico = await publicarPackAlCanal(pack, false);
      pack.telegram_msg_id = msgIdPublico;

      // 2. Publicar en Canal Proveedores / Revendedores (Margen 5.000)
      let msgIdRevendedor = null;
      if (CANAL_REVENDEDORES_ID && CANAL_REVENDEDORES_ID !== "0") {
        msgIdRevendedor = await publicarPackAlCanal(pack, true);
        pack.telegram_msg_id_revendedor = msgIdRevendedor;
      }

      // Precios de revendedor calculados para registro
      const {precioClp: clpRev, precioUsdt: usdtRev} = calcularPreciosRevendedor(pack.precio_usd);

      // 3. Guardar en Firestore
      await admin.firestore().collection("packs_nintendo").add({
        id_pack: idPack,
        titulo: pack.titulo,
        juegos: pack.juegos,
        precio_usd: pack.precio_usd,
        precio_clp: pack.precio_clp,
        precio_usdt: pack.precio_usdt,
        precio_revendedor_clp: clpRev,
        precio_revendedor_usdt: usdtRev,
        horario_limitado: pack.horario_limitado || false,
        disponible: true,
        huella: pack.huella,
        telegram_msg_id: msgIdPublico,
        telegram_msg_id_revendedor: msgIdRevendedor,
        fecha_creacion: admin.firestore.FieldValue.serverTimestamp(),
      });

      subidos++;
      const faltanEsteLote = packsASubir.length - subidos;

      // Actualizar progreso cada 5 packs para dar feedback en vivo
      if (subidos % 5 === 0 || subidos === packsASubir.length) {
        try {
          await callTelegram("editMessageText", {
            chat_id: chatId,
            message_id: messageId,
            text: `🚀 <b>Publicando en Canal Público y Proveedores...</b>\n\n✅ <b>Subidos:</b> ${subidos} de ${packsASubir.length}\n⏳ <b>Faltan de este lote:</b> ${faltanEsteLote}\n📦 <b>Total pendientes en archivo:</b> ${packsRestantes.length + faltanEsteLote}`,
            reply_markup: tecladoProgreso,
            parse_mode: "HTML",
          });
        } catch (errEdit) {
          // Ignorar si el mensaje no pudo editarse a tiempo
          console.log("No se pudo editar mensaje de progreso:", errEdit.message);
        }
      }

      // Pausa prudente para respetar límites de Telegram
      await new Promise((r) => setTimeout(r, 700));
    } catch (e) {
      console.error("Error subiendo pack en cloud import:", e);
    }
  }

  // Actualizar o borrar pendientes en Firestore
  if (packsRestantes.length > 0) {
    await admin.firestore().collection("configuraciones").doc("admin_pending_import").set({
      packs: packsRestantes,
      cancelar: false,
      en_proceso: false,
    });
  } else {
    await admin.firestore().collection("configuraciones").doc("admin_pending_import").delete();
  }

  // Si la opción fue "todos" y quedan packs pendientes (y no fue cancelado por el admin),
  // pausamos 5 segundos y lanzamos el siguiente lote automáticamente.
  if (opcion === "todos" && !cancelado && packsRestantes.length > 0) {
    try {
      await callTelegram("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: `🔄 <b>Lote finalizado con éxito (${subidos} packs publicados).</b>\n\n⏳ <i>Tomando una pausa de 5 segundos para proteger el canal...</i>\n📦 <b>Packs restantes en cola:</b> <b>${packsRestantes.length}</b>\n🚀 <b>El siguiente lote se iniciará automáticamente sin que tengas que presionar nada.</b>`,
        reply_markup: tecladoProgreso,
        parse_mode: "HTML",
      });
    } catch (eEdit) {
      console.log("No se pudo editar aviso de auto-lote:", eEdit.message);
    }

    await new Promise((r) => setTimeout(r, 5000));

    const webhookUrl = getWebhookUrl(req);
    fetch(webhookUrl, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        callback_query: {
          id: "auto_" + Date.now(),
          data: "cloud_import_todos",
          from: {id: Number(ADMIN_ID)},
          message: {
            chat: {id: chatId},
            message_id: messageId,
          },
        },
      }),
    }).catch((err) => console.error("Error al auto-invocar siguiente lote:", err));
    return;
  }

  let textoFinal = "";
  if (cancelado) {
    textoFinal = `⏹️ <b>SUBIDA DETENIDA POR EL ADMINISTRADOR</b>\n━━━━━━━━━━━━━━━━━━━━━━━━\n✅ <b>Packs publicados antes de pausar:</b> ${subidos}\n📦 <b>Packs restantes guardados en cola:</b> <b>${packsRestantes.length}</b>\n(No se perdieron, puedes reanudar cuando quieras).`;
  } else if (tiempoAgotado) {
    textoFinal = `⏳ <b>LOTE COMPLETADO (${subidos} PACKS)</b>\n━━━━━━━━━━━━━━━━━━━━━━━━\n✅ <b>Packs publicados recién:</b> ${subidos}\n📦 <b>Packs restantes esperando:</b> <b>${packsRestantes.length}</b>\n\n👉 <i>Presiona el botón de abajo para continuar con el siguiente lote de inmediato:</i>`;
  } else {
    textoFinal = `🎉 <b>¡PUBLICACIÓN EXITOSA EN AMBOS CANALES!</b>\n━━━━━━━━━━━━━━━━━━━━━━━━\n📢 <b>Canal Público:</b> ${subidos} packs (+15.000 CLP)\n👑 <b>Canal Proveedores:</b> ${subidos} packs (+5.000 CLP)\n`;
    if (packsRestantes.length > 0) {
      textoFinal += `📦 <b>Faltan por subir del archivo:</b> <b>${packsRestantes.length} packs</b>.`;
    } else {
      textoFinal += `✨ <b>¡Completado al 100%!</b> Todos los packs fueron publicados.`;
    }
  }

  if (packsRestantes.length > 0) {
    const tecladoRestante = {
      inline_keyboard: [
        [
          {text: "🔟 Subir 10 Más", callback_data: "cloud_import_10"},
          {text: "⚡ Subir 50 Más", callback_data: "cloud_import_50"},
          {text: "💯 Subir 100 Más", callback_data: "cloud_import_100"},
        ],
        [
          {text: `🚀 Subir Todos Automático (${packsRestantes.length})`, callback_data: "cloud_import_todos"},
        ],
        [
          {text: "❌ Borrar Restantes / Cancelar", callback_data: "cloud_cancel_import"},
        ],
      ],
    };
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: textoFinal,
      reply_markup: tecladoRestante,
      parse_mode: "HTML",
    });
  } else {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: textoFinal,
      parse_mode: "HTML",
    });
  }
}

function getWebhookUrl(req) {
  if (req && req.headers && req.headers.host) {
    const proto = req.headers["x-forwarded-proto"] || "https";
    return `${proto}://${req.headers.host}${req.originalUrl || "/telegramBotWebhook"}`;
  }
  return "https://us-central1-pandastoreupdate.cloudfunctions.net/telegramBotWebhook";
}

const DATOS_PAGO = {
  bancoestado: {
    nombre: "BancoEstado (Cuenta RUT)",
    texto: `🏦 <b>BANCOESTADO — CUENTA RUT</b>\n━━━━━━━━━━━━━━━━━━━━━━━━\n👤 <b>Titular:</b> Matías Muñoz\n🆔 <b>RUT:</b> <code>236326845</code>\n🔢 <b>N° Cuenta:</b> <code>236326845</code>\n💳 <b>Tipo:</b> Cuenta RUT / Cuenta Vista\n✉️ <b>Email:</b> <code>comprobantesswitch2@gmail.com</code>\n━━━━━━━━━━━━━━━━━━━━━━━━\n💡 <i>Haz clic en el RUT o N° de cuenta para copiarlo.</i>`,
  },
  mercadopago: {
    nombre: "Mercado Pago",
    texto: `💙 <b>MERCADO PAGO — TRANSFERENCIA</b>\n━━━━━━━━━━━━━━━━━━━━━━━━\n👤 <b>Titular:</b> José Roberto Muñoz Osses\n🆔 <b>RUT:</b> <code>21.715.187-2</code>\n🔢 <b>N° Cuenta:</b> <code>1095508563</code>\n💳 <b>Tipo:</b> Cuenta Vista\n✉️ <b>Email:</b> <code>comprobantesswitch2@gmail.com</code>\n━━━━━━━━━━━━━━━━━━━━━━━━\n💡 <i>Haz clic en el RUT o N° de cuenta para copiarlo.</i>`,
  },
  crypto: {
    nombre: "USDT (Crypto - BEP20)",
    texto: `🪙 <b>USDT — CRYPTO (BINANCE SMART CHAIN)</b>\n━━━━━━━━━━━━━━━━━━━━━━━━\n🌐 <b>Red:</b> BEP20 (BNB Smart Chain)\n📬 <b>Billetera:</b> <code>0x7320E27e6FEB10d2bA387928c5bb6675b2AD2965</code>\n━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ <i>Envía únicamente USDT por red BEP20.</i>`,
  },
};

async function callTelegram(method, body) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (e) {
    console.error(`Error en callTelegram (${method}):`, e);
    return null;
  }
}

async function sendPhotoTelegram(chatId, photoFileId, caption, replyMarkup) {
  return await callTelegram("sendPhoto", {
    chat_id: chatId,
    photo: photoFileId,
    caption: caption,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  });
}

// ── Control de pack en Firestore ──
async function desmarcarPackFirestore(idPack) {
  try {
    const snap = await admin.firestore().collection("packs_nintendo").where("id_pack", "==", idPack).get();
    const batch = admin.firestore().batch();
    snap.docs.forEach((doc) => batch.update(doc.ref, {disponible: false}));
    await batch.commit();
  } catch (e) {
    console.error("Error desmarcando pack en Firestore:", e);
  }
}

async function obtenerPackDeFirestore(idPack) {
  try {
    const snap = await admin.firestore().collection("packs_nintendo").where("id_pack", "==", idPack).limit(1).get();
    if (!snap.empty) {
      return snap.docs[0].data();
    }
  } catch (e) {
    console.error("Error buscando pack en Firestore:", e);
  }
  return null;
}

// ── Manejo de Webhook principal ──
async function handleTelegramWebhook(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  const update = req.body;
  if (!update) return res.status(200).send("OK");
  console.log("📨 Update recibido en Webhook:", JSON.stringify(update));

  try {
    // 1. Manejo de Callback Queries (Botonera)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query, req);
      return res.status(200).send("OK");
    }

    // 2. Manejo de Mensajes (Texto / Fotos / Comprobantes)
    if (update.message) {
      await handleMessage(update.message, req);
      return res.status(200).send("OK");
    }
  } catch (error) {
    console.error("Error procesando Webhook Telegram:", error);
  }

  return res.status(200).send("OK");
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const fromUser = msg.from || {};
  const userId = fromUser.id;
  const text = (msg.text || "").trim();

  // A. Si el cliente envía una foto (Comprobante de pago)
  if (msg.photo && msg.photo.length > 0) {
    const userDoc = await admin.firestore().collection("telegram_sessions").doc(String(userId)).get();
    const sessionData = userDoc.exists ? userDoc.data() : {};
    const idPack = sessionData.comprando_pack || "NO_ESPECIFICADO";
    const metodo = sessionData.metodo_pago || "Transferencia";

    // Enviar foto más grande
    const photoId = msg.photo[msg.photo.length - 1].file_id;

    // Confirmar al cliente
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `✅ <b>¡Comprobante recibido con éxito!</b> 🐼🎉\n\n📦 <b>Pack:</b> <code>${idPack}</code>\n👨‍💻 El administrador ya fue notificado y está validando la transferencia.\nTe entregaremos los datos de acceso de tu cuenta por este mismo chat a la brevedad.`,
      parse_mode: "HTML",
    });

    // Notificar al ADMIN con foto y botones
    const usernameStr = fromUser.username ? `@${fromUser.username}` : `ID: ${userId}`;
    const captionAdmin = `🚨 <b>¡NUEVO COMPROBANTE DE PAGO RECIBIDO!</b> 💰\n━━━━━━━━━━━━━━━━━━━━━━━━\n📦 <b>Pack:</b> <code>${idPack}</code>\n👤 <b>Cliente:</b> ${fromUser.first_name || "Cliente"} (${usernameStr})\n💳 <b>Método:</b> ${metodo}\n━━━━━━━━━━━━━━━━━━━━━━━━\n👉 Si la transferencia es correcta, presiona el botón para marcar como vendido y retirarlo del canal.`;

    const urlChat = fromUser.username ? `https://t.me/${fromUser.username}` : `tg://user?id=${userId}`;
    const keyboardAdmin = {
      inline_keyboard: [
        [{text: "🔴 Marcar como Vendido (Borrar del canal)", callback_data: `admin_vendido_${idPack}`}],
        [{text: "💬 Abrir Chat con Cliente", url: urlChat}],
      ],
    };

    await sendPhotoTelegram(ADMIN_ID, photoId, captionAdmin, keyboardAdmin);
    return;
  }

  // B. Si el Administrador envía un archivo JSON (result.json) directamente al chat
  if (msg.document && String(userId) === String(ADMIN_ID)) {
    const fileName = msg.document.file_name || "";
    if (fileName.toLowerCase().endsWith(".json")) {
      await procesarArchivoJsonSubido(chatId, msg.document.file_id, fileName);
      return;
    }
  }

  // C. Comando /start
  if (text.startsWith("/start")) {
    const parts = text.split(" ");
    if (parts.length > 1 && parts[1].startsWith("buy_")) {
      const rawId = parts[1].replace("buy_", "").replace(/_/g, "-");
      const idPack = rawId.startsWith("#") ? rawId : `#${rawId}`;
      await iniciarFlujoCompra(chatId, userId, idPack);
      return;
    }

    // Menú Principal
    const teclado = [
      [
        {text: "🎮 Ver Catálogos", callback_data: "menu_catalogos"},
        {text: "🎁 Ver Promociones", callback_data: "menu_promos"},
      ],
      [
        {text: "📖 Guías de Instalación", callback_data: "menu_guias"},
        {text: "📸 Ventas Anteriores", url: TESTIMONIOS_URL},
      ],
      [
        {text: "🌐 Visitar Tienda Web", url: WEBSITE_URL},
      ],
      [
        {text: "👤 Soporte Humano Directo", url: `https://t.me/${TELEGRAM_CONTACT}`},
      ],
    ];

    if (String(userId) === String(ADMIN_ID)) {
      teclado.push([
        {text: "⚙️ Panel Admin / Ayuda JSON", callback_data: "menu_admin_info"},
      ]);
    }

    const textoBienvenida = `👋 ¡Hola, <b>${fromUser.first_name || "Gamer"}</b>! Bienvenido a <b>Panda Store</b> 🐼🎮\n\nSomos especialistas en videojuegos digitales, cuentas primarias y ofertas exclusivas con entrega rápida.\n\n¿Qué deseas realizar hoy? Selecciona una opción:`;

    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: textoBienvenida,
      reply_markup: {inline_keyboard: teclado},
      parse_mode: "HTML",
    });
    return;
  }

  // C. Comandos de Admin
  if (String(userId) === String(ADMIN_ID)) {
    if (text.startsWith("/vendido")) {
      const parts = text.split(" ");
      if (parts.length > 1) {
        let idPack = parts[1].trim();
        if (!idPack.startsWith("#")) idPack = `#${idPack}`;
        await marcarVendidoAction(chatId, null, idPack);
      } else {
        await callTelegram("sendMessage", {chat_id: chatId, text: "Uso: /vendido #PACK-001"});
      }
      return;
    }

    if (text.startsWith("/borrarpacks")) {
      const tecladoConfirm = {
        inline_keyboard: [
          [{text: "⚠️ Sí, Borrar TODOS los Packs", callback_data: "admin_do_borrar_packs"}],
          [{text: "🔙 Cancelar y Volver", callback_data: "menu_admin_info"}],
        ],
      };
      const textoConfirm = `⚠️ <b>¿CONFIRMAS BORRAR SOLO LOS PACKS?</b>\n━━━━━━━━━━━━━━━━━━━━━━━━\nEsta acción:\n• Eliminará <b>TODOS</b> los packs registrados en la colección <code>packs_nintendo</code> de Firestore.\n• Limpiará cualquier cola de importación pendiente.\n• Reiniciará el contador correlativo de packs.\n\n🛡️ <b>Tus usuarios, pedidos, juegos de Steam y configuraciones NO serán afectados.</b>\n\n¿Estás completamente seguro de continuar?`;

      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: textoConfirm,
        reply_markup: tecladoConfirm,
        parse_mode: "HTML",
      });
      return;
    }
  }
}

async function iniciarFlujoCompra(chatId, userId, idPack) {
  // Guardar sesión
  await admin.firestore().collection("telegram_sessions").doc(String(userId)).set({
    comprando_pack: idPack,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  }, {merge: true});

  // Obtener info del pack
  const pack = await obtenerPackDeFirestore(idPack);
  const precioCLP = pack && pack.precio_clp ? `$${Number(pack.precio_clp).toLocaleString("es-CL")} CLP` : "Consultar";
  const precioUSDT = pack && pack.precio_usdt ? `${pack.precio_usdt} USDT` : "";
  const titulo = pack && pack.titulo ? pack.titulo : "Cuenta Nintendo Switch";

  const teclado = {
    inline_keyboard: [
      [
        {text: "🏦 BancoEstado (Cuenta RUT)", callback_data: `pagar_bancoestado_${idPack}`},
        {text: "💙 Mercado Pago", callback_data: `pagar_mercadopago_${idPack}`},
      ],
      [
        {text: "🪙 USDT (BEP20)", callback_data: `pagar_crypto_${idPack}`},
        {text: "👤 Ayuda / Soporte", url: `https://t.me/${TELEGRAM_CONTACT}`},
      ],
      [
        {text: "🔙 Volver al Menú", callback_data: "volver_menu"},
      ],
    ],
  };

  const texto = `🛒 <b>DETALLES DE TU COMPRA</b>\n━━━━━━━━━━━━━━━━━━━━━━━━\n📦 <b>Pack:</b> <code>${idPack}</code>\n👤 <b>Detalle:</b> ${titulo}\n💰 <b>Total a Transferir:</b> ${precioCLP} ${precioUSDT ? `| ${precioUSDT}` : ""}\n━━━━━━━━━━━━━━━━━━━━━━━━\n👉 <b>Selecciona el método de pago que prefieres usar:</b>`;

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: texto,
    reply_markup: teclado,
    parse_mode: "HTML",
  });
}

async function handleCallbackQuery(cb, req) {
  const queryId = cb.id;
  const data = cb.data || "";
  const chatId = cb.message.chat.id;
  const messageId = cb.message.message_id;
  const userId = cb.from.id;

  await callTelegram("answerCallbackQuery", {callback_query_id: queryId});

  if (data === "volver_menu") {
    const teclado = [
      [
        {text: "🎮 Ver Catálogos", callback_data: "menu_catalogos"},
        {text: "🎁 Ver Promociones", callback_data: "menu_promos"},
      ],
      [
        {text: "📖 Guías de Instalación", callback_data: "menu_guias"},
        {text: "📸 Ventas Anteriores", url: TESTIMONIOS_URL},
      ],
      [
        {text: "🌐 Visitar Tienda Web", url: WEBSITE_URL},
      ],
      [
        {text: "👤 Soporte Humano Directo", url: `https://t.me/${TELEGRAM_CONTACT}`},
      ],
    ];
    if (String(userId) === String(ADMIN_ID)) {
      teclado.push([
        {text: "⚙️ Panel Admin / Ayuda JSON", callback_data: "menu_admin_info"},
      ]);
    }
    await callTelegram("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: `👋 ¡Hola! Bienvenido a <b>Panda Store</b> 🐼🎮\n\n¿Qué deseas realizar hoy? Selecciona una opción:`,
      reply_markup: {inline_keyboard: teclado},
      parse_mode: "HTML",
    });
    return;
  }

  // Submenú Catálogos
  if (data === "menu_catalogos") {
    const teclado = {
      inline_keyboard: [
        [
          {text: "🔴 Nintendo Switch", url: `${WEBSITE_URL}/categoria/nintendo-switch`},
          {text: "🔵 PlayStation (PS4/PS5)", url: `${WEBSITE_URL}/categoria/playstation`},
        ],
        [
          {text: "🟣 Steam PC", url: `${WEBSITE_URL}/categoria/steam`},
          {text: "🎬 Streaming & Series", url: `${WEBSITE_URL}/categoria/streaming`},
        ],
        [
          {text: "📦 Packs Nintendo Disponibles", url: `${WEBSITE_URL}/packs-nintendo`},
        ],
        [
          {text: "🔙 Volver al Menú", callback_data: "volver_menu"},
        ],
      ],
    };
    const textoCatalogos = `🎮 <b>CATÁLOGOS OFICIALES — PANDA STORE</b>\n━━━━━━━━━━━━━━━━━━━━━━━━\nExplora cientos de videojuegos digitales y suscripciones originales:\n\n• <b>Nintendo Switch:</b> Cuentas primarias listas para descargar.\n• <b>PlayStation:</b> Juegos para PS4 y PS5.\n• <b>Steam:</b> Packs masivos y juegos individuales con nuestro Launcher.\n• <b>Streaming:</b> Cuentas y suscripciones premium.\n\n👇 <i>Selecciona el catálogo que deseas ver:</i>`;

    await callTelegram("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: textoCatalogos,
      reply_markup: teclado,
      parse_mode: "HTML",
    });
    return;
  }

  // Submenú Guías de Instalación
  if (data === "menu_guias") {
    const teclado = {
      inline_keyboard: [
        [{text: "🔴 Guía Nintendo Switch", url: GUIA_NINTENDO_URL}],
        [{text: "🔵 Guía PlayStation 4 / 5", url: GUIA_PSN_URL}],
        [{text: "🟣 Descargar Launcher Steam", url: GUIA_STEAM_URL}],
        [{text: "🔙 Volver al Menú", callback_data: "volver_menu"}],
      ],
    };
    const textoGuias = `📖 <b>GUÍAS DE INSTALACIÓN PASO A PASO</b>\n━━━━━━━━━━━━━━━━━━━━━━━━\nSelecciona tu plataforma para ver el tutorial con imágenes y soporte:`;

    await callTelegram("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: textoGuias,
      reply_markup: teclado,
      parse_mode: "HTML",
    });
    return;
  }

  // Submenú Admin Info
  if (data === "menu_admin_info") {
    const teclado = {
      inline_keyboard: [
        [{text: "🗑️ Borrar Solo los Packs (Firestore)", callback_data: "admin_confirm_borrar_packs"}],
        [{text: "❌ Cancelar Cola Pendiente", callback_data: "cloud_cancel_import"}],
        [{text: "🔙 Volver", callback_data: "volver_menu"}],
      ],
    };
    const textoAdmin = `⚙️ <b>PANEL ADMINISTRADOR PANDA STORE</b>\n━━━━━━━━━━━━━━━━━━━━━━━━\n👤 <b>ID Admin:</b> <code>${ADMIN_ID}</code>\n📢 <b>Canal Oficial:</b> <code>${CANAL_PUBLICO_ID}</code>\n\n📤 <b>¿Cómo publicar packs desde JSON?</b>\n¡Ahora es 100% automático y directo!\nSimplemente <b>arrastra y suelta tu archivo <code>result.json</code> a este chat</b>.\nEl bot extraerá los packs, filtrará duplicados y te preguntará cuántos deseas publicar (🔟 10, 💯 100 o 🚀 Todos).\n\n📌 <b>Comandos en chat:</b>\n• <code>/vendido #PACK-XXX</code>: Borra el pack del canal y lo marca vendido en Firestore.\n• <code>/borrarpacks</code>: Elimina todos los packs de Nintendo en Firestore.\n\n⚙️ <b>Acciones Rápidas:</b>\nPuedes usar el botón <b>🗑️ Borrar Solo los Packs</b> aquí abajo para limpiar únicamente la colección de packs de Nintendo sin afectar usuarios ni configuraciones.`;

    await callTelegram("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: textoAdmin,
      reply_markup: teclado,
      parse_mode: "HTML",
    });
    return;
  }

  // Confirmación de borrado de packs
  if (data === "admin_confirm_borrar_packs") {
    if (String(userId) !== String(ADMIN_ID)) {
      await callTelegram("answerCallbackQuery", {
        callback_query_id: queryId,
        text: "⛔ Acción reservada exclusivamente para el Administrador.",
        show_alert: true,
      });
      return;
    }

    const tecladoConfirm = {
      inline_keyboard: [
        [{text: "⚠️ Sí, Borrar TODOS los Packs", callback_data: "admin_do_borrar_packs"}],
        [{text: "🔙 Cancelar y Volver", callback_data: "menu_admin_info"}],
      ],
    };

    const textoConfirm = `⚠️ <b>¿CONFIRMAS BORRAR SOLO LOS PACKS?</b>\n━━━━━━━━━━━━━━━━━━━━━━━━\nEsta acción:\n• Eliminará <b>TODOS</b> los mensajes de los packs publicados en tus canales de Telegram (Público y Proveedores).\n• Eliminará los registros en la colección <code>packs_nintendo</code> de Firestore.\n• Limpiará cualquier cola de importación pendiente.\n• Reiniciará el contador correlativo de packs.\n\n🛡️ <b>Tus usuarios, pedidos, juegos de Steam y configuraciones NO serán afectados.</b>\n\n¿Estás completamente seguro de continuar?`;

    await callTelegram("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: textoConfirm,
      reply_markup: tecladoConfirm,
      parse_mode: "HTML",
    });
    return;
  }

  // Ejecución de borrado de packs
  if (data === "admin_do_borrar_packs") {
    if (String(userId) !== String(ADMIN_ID)) {
      await callTelegram("answerCallbackQuery", {
        callback_query_id: queryId,
        text: "⛔ Acción no autorizada.",
        show_alert: true,
      });
      return;
    }

    await callTelegram("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: `⏳ <b>Eliminando packs y mensajes de canales...</b>\nBorrando publicaciones en Telegram y registros en Firestore. Espera un momento...`,
      parse_mode: "HTML",
    });

    try {
      let totalBorrados = 0;
      let totalMensajesBorrados = 0;
      let hayMas = true;

      // Borrado en lotes de Firestore y eliminación de mensajes en Telegram
      while (hayMas) {
        const snapshot = await admin.firestore().collection("packs_nintendo").limit(200).get();
        if (snapshot.empty) {
          hayMas = false;
          break;
        }

        const batch = admin.firestore().batch();
        for (const doc of snapshot.docs) {
          const packData = doc.data();

          // Borrar mensaje del Canal Público de Telegram
          if (packData.telegram_msg_id && CANAL_PUBLICO_ID) {
            try {
              await callTelegram("deleteMessage", {
                chat_id: CANAL_PUBLICO_ID,
                message_id: Number(packData.telegram_msg_id),
              });
              totalMensajesBorrados++;
            } catch (eMsg) {
              // Puede que ya haya sido borrado manualmente
            }
          }

          // Borrar mensaje del Canal de Revendedores / Proveedores
          if (packData.telegram_msg_id_revendedor && CANAL_REVENDEDORES_ID && CANAL_REVENDEDORES_ID !== "0") {
            try {
              await callTelegram("deleteMessage", {
                chat_id: CANAL_REVENDEDORES_ID,
                message_id: Number(packData.telegram_msg_id_revendedor),
              });
              totalMensajesBorrados++;
            } catch (eRev) {
              console.warn("No se pudo borrar el mensaje de revendedores:", eRev.message);
            }
          }

          batch.delete(doc.ref);
          totalBorrados++;
        }
        await batch.commit();

        // Breve pausa para no saturar la API de Telegram
        await new Promise((r) => setTimeout(r, 400));
      }

      // Limpiar cola pendiente de importación si existía
      await admin.firestore().collection("configuraciones").doc("admin_pending_import").delete().catch(() => {});

      // Reiniciar contador de packs al inicio por defecto (7399)
      await admin.firestore().collection("configuraciones").doc("contador_packs").set({
        numero: 7399,
        ultimo_numero: 7399,
        actualizado_en: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true}).catch(() => {});

      const tecladoFinal = {
        inline_keyboard: [
          [{text: "⚙️ Volver al Panel Admin", callback_data: "menu_admin_info"}],
          [{text: "🔙 Menú Principal", callback_data: "volver_menu"}],
        ],
      };

      await callTelegram("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: `✅ <b>¡Limpieza Total Completada!</b> 🐼🧹\n━━━━━━━━━━━━━━━━━━━━━━━━\n• <b>${totalBorrados}</b> packs eliminados de Firestore.\n• <b>${totalMensajesBorrados}</b> mensajes borrados de los canales de Telegram.\n• Cola de subida reiniciada.\n• Contador de correlativo reiniciado para nuevos packs.\n• Usuarios, configuraciones y juegos de Steam intactos.`,
        reply_markup: tecladoFinal,
        parse_mode: "HTML",
      });
    } catch (err) {
      console.error("Error borrando packs:", err);
      await callTelegram("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: `❌ <b>Error al intentar borrar packs:</b> <code>${err.message}</code>`,
        reply_markup: {
          inline_keyboard: [[{text: "🔙 Volver", callback_data: "menu_admin_info"}]],
        },
        parse_mode: "HTML",
      });
    }
    return;
  }

  if (data === "menu_promos") {
    const teclado = {
      inline_keyboard: [
        [{text: "🔥 Ver Catálogo Web de Promociones", url: PROMOS_URL}],
        [{text: "🔙 Volver", callback_data: "volver_menu"}],
      ],
    };
    const textoPromos = `🎁 <b>PROMOCIONES DESTACADAS — PANDA STORE</b>\n━━━━━━━━━━━━━━━━━━━━━━━━\n🔥 <b>Pack 3X Steam:</b> Lleva 3 juegos a elección por $4.990 CLP\n🔥 <b>Pack 10X Steam:</b> Lleva 10 juegos por $9.990 CLP\n🔥 <b>Pack 2X Nintendo Switch:</b> 2 juegos por $25.000 CLP\n🔥 <b>Pack 3X Nintendo Switch:</b> 3 juegos por $35.000 CLP\n━━━━━━━━━━━━━━━━━━━━━━━━\nPuedes ver todas las promociones activas y armar tu pack en la tienda web:`;

    await callTelegram("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: textoPromos,
      reply_markup: teclado,
      parse_mode: "HTML",
    });
    return;
  }

  if (data.startsWith("pagar_")) {
    const parts = data.split("_");
    const metodo = parts[1];
    const idPack = parts.slice(2).join("_");
    const info = DATOS_PAGO[metodo];

    if (info) {
      await admin.firestore().collection("telegram_sessions").doc(String(userId)).set({
        comprando_pack: idPack,
        metodo_pago: info.nombre,
      }, {merge: true});

      const teclado = {
        inline_keyboard: [
          [
            {text: "🔄 Cambiar Método de Pago", callback_data: `buy_volver_${idPack}`},
            {text: "👤 Contactar al Admin", url: `https://t.me/${TELEGRAM_CONTACT}`},
          ],
        ],
      };

      const textoPago = `${info.texto}\n\n📸 <b>PASO FINAL — SUBIR COMPROBANTE:</b>\nUna vez realizada la transferencia, <b>envía una captura de pantalla del comprobante directamente a este chat</b>.\n\n🤖 Nuestro sistema notificará al administrador de inmediato para validarlo y entregarte tu cuenta.`;

      await callTelegram("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: textoPago,
        reply_markup: teclado,
        parse_mode: "HTML",
      });
    }
    return;
  }

  if (data.startsWith("cloud_import_")) {
    const opcion = data.replace("cloud_import_", "");
    await ejecutarImportacionDesdeCloud(chatId, messageId, opcion, req);
    return;
  }

  if (data === "cloud_cancel_now") {
    // Señal para frenar el bucle que está subiendo packs activamente
    await admin.firestore().collection("configuraciones").doc("admin_pending_import").set({
      cancelar: true,
    }, {merge: true});

    await callTelegram("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: "⏳ <b>Deteniendo subida...</b> Esperando a que finalice el pack actual.",
      parse_mode: "HTML",
    });
    return;
  }

  if (data === "cloud_cancel_import") {
    await admin.firestore().collection("configuraciones").doc("admin_pending_import").delete();
    await callTelegram("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: "❌ <b>Cola cancelada y descartada.</b> No se publicarán más packs de este archivo.",
      parse_mode: "HTML",
    });
    return;
  }

  if (data.startsWith("buy_volver_")) {
    const idPack = data.replace("buy_volver_", "");
    await iniciarFlujoCompra(chatId, userId, idPack);
    return;
  }

  if (data.startsWith("admin_vendido_")) {
    const idPack = data.replace("admin_vendido_", "");
    await marcarVendidoAction(chatId, messageId, idPack);
    return;
  }
}

async function marcarVendidoAction(chatId, messageId, idPack) {
  // 1. Obtener telegram_msg_id de Firestore
  const pack = await obtenerPackDeFirestore(idPack);
  let borrado = false;

  // 1. Borrar de Canal Público y Canal de Proveedores
  if (pack) {
    if (pack.telegram_msg_id && CANAL_PUBLICO_ID) {
      try {
        await callTelegram("deleteMessage", {
          chat_id: CANAL_PUBLICO_ID,
          message_id: Number(pack.telegram_msg_id),
        });
        borrado = true;
      } catch (e) {
        console.error("No se pudo borrar del canal público:", e);
      }
    }

    if (pack.telegram_msg_id_revendedor && CANAL_REVENDEDORES_ID && CANAL_REVENDEDORES_ID !== "0") {
      try {
        await callTelegram("deleteMessage", {
          chat_id: CANAL_REVENDEDORES_ID,
          message_id: Number(pack.telegram_msg_id_revendedor),
        });
        borrado = true;
      } catch (e) {
        console.error("No se pudo borrar del canal de revendedores:", e);
      }
    }
  }

  // 2. Desmarcar en Firestore
  await desmarcarPackFirestore(idPack);

  const respuesta = `✅ <b>Pack ${idPack} marcado como VENDIDO</b>\n${borrado ? "• Mensaje eliminado de ambos canales (Público y Proveedores)\n" : "• (Los mensajes ya no existían en los canales)\n"}• Estado actualizado a 'No disponible' en la Tienda / Firestore.`;

  if (messageId) {
    await callTelegram("editMessageCaption", {
      chat_id: chatId,
      message_id: messageId,
      caption: respuesta,
      parse_mode: "HTML",
    });
  } else {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: respuesta,
      parse_mode: "HTML",
    });
  }
}

// ── Publicación Diaria Automática (10:00 AM) ──
async function publicarCatalogosDiarios() {
  if (!CANAL_PUBLICO_ID) return;

  // Si había un mensaje previo registrado, lo borramos primero
  const configDoc = await admin.firestore().collection("configuraciones").doc("telegram_diario").get();
  if (configDoc.exists) {
    const data = configDoc.data();
    if (data.ultimo_mensaje_id) {
      try {
        await callTelegram("deleteMessage", {
          chat_id: CANAL_PUBLICO_ID,
          message_id: Number(data.ultimo_mensaje_id),
        });
      } catch (e) {
        console.log("Mensaje diario previo ya no existía o no se pudo borrar:", e);
      }
    }
  }

  const texto = `🐼 <b>PANDA STORE • ACCESOS DIRECTOS Y CATÁLOGOS</b> 🎮\n━━━━━━━━━━━━━━━━━━━━━━━━\n¡Encuentra tus videojuegos favoritos al mejor precio, con entrega rápida y garantía oficial!\n\n👇 <b>Selecciona la categoría que deseas explorar:</b>`;

  const teclado = {
    inline_keyboard: [
      [
        {text: "🎁 Ver Promociones (2x1, 3x1)", url: PROMOS_URL},
        {text: "📸 Ventas Anteriores", url: TESTIMONIOS_URL},
      ],
      [
        {text: "🔴 Catálogo Nintendo Switch", url: `${WEBSITE_URL}/categoria/nintendo-switch`},
      ],
      [
        {text: "🔵 Catálogo PlayStation (PS4 / PS5)", url: `${WEBSITE_URL}/categoria/playstation`},
      ],
      [
        {text: "🟣 Catálogo Steam PC", url: `${WEBSITE_URL}/categoria/steam`},
      ],
      [
        {text: "🎬 Streaming y Suscripciones", url: `${WEBSITE_URL}/categoria/streaming`},
      ],
      [
        {text: "👤 Dudas / Soporte Directo", url: `https://t.me/${TELEGRAM_CONTACT}`},
      ],
    ],
  };

  const res = await callTelegram("sendMessage", {
    chat_id: CANAL_PUBLICO_ID,
    text: texto,
    reply_markup: teclado,
    parse_mode: "HTML",
  });

  if (res && res.ok && res.result) {
    await admin.firestore().collection("configuraciones").doc("telegram_diario").set({
      ultimo_mensaje_id: res.result.message_id,
      fecha_publicacion: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("✅ Catálogo diario publicado con éxito en el canal. Message ID:", res.result.message_id);
  }
}

// ── Borrado Diario Automático (05:00 AM) ──
async function borrarCatalogosDiarios() {
  if (!CANAL_PUBLICO_ID) return;
  const configDoc = await admin.firestore().collection("configuraciones").doc("telegram_diario").get();
  if (configDoc.exists) {
    const data = configDoc.data();
    if (data.ultimo_mensaje_id) {
      try {
        await callTelegram("deleteMessage", {
          chat_id: CANAL_PUBLICO_ID,
          message_id: Number(data.ultimo_mensaje_id),
        });
        console.log("🧹 Mensaje de catálogo diario borrado a las 5:00 AM");
      } catch (e) {
        console.log("No se pudo borrar el mensaje diario (ya eliminado o expirado):", e);
      }
      await admin.firestore().collection("configuraciones").doc("telegram_diario").delete();
    }
  }
}

module.exports = {
  handleTelegramWebhook,
  publicarCatalogosDiarios,
  borrarCatalogosDiarios,
};
