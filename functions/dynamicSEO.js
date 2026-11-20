const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Variable global para cachear el index.html en memoria
let cachedHtml = null;
let cachedHtmlAt = 0;
const SHELL_TTL_MS = 2 * 60 * 1000;
// Mapa producto → listas /juegos/<slug> generado en el build (scripts/generate-seo-pages.js)
let productLinks = null;
let productLinksAt = 0;
async function getProductLinks() {
  if (productLinks && Date.now() - productLinksAt < 30 * 60 * 1000) return productLinks;
  try {
    const r = await fetch("https://pandastoregaming.cl/seo-data/product-links.json");
    if (r.ok) {
      productLinks = await r.json();
      productLinksAt = Date.now();
    }
  } catch (_) {
    // Sin enlaces relacionados la ficha se sirve igual
  }
  return productLinks || {};
}

// Índice compacto del catálogo Steam extendido (appid → [nombre, etiquetas, nsfw]), generado en el build
let ryuuIndex = null;
let ryuuIndexAt = 0;
async function getRyuuIndex() {
  if (ryuuIndex && Date.now() - ryuuIndexAt < 6 * 60 * 60 * 1000) return ryuuIndex;
  try {
    const r = await fetch("https://pandastoregaming.cl/seo-data/ryuu-index.json");
    if (r.ok) {
      ryuuIndex = await r.json();
      ryuuIndexAt = Date.now();
    }
  } catch (_) {
    // Sin índice se sirve el shell normal
  }
  return ryuuIndex || {};
}

const TAG_LISTS = {
  "Action": ["steam-accion", "Juegos de acción para Steam PC"],
  "Adventure": ["steam-aventura", "Juegos de aventura para Steam PC"],
  "RPG": ["steam-rpg", "Juegos de rol (RPG) para Steam PC"],
  "Strategy": ["steam-estrategia", "Juegos de estrategia para Steam PC"],
  "Simulation": ["steam-simulacion", "Juegos de simulación para Steam PC"],
  "Sports": ["steam-deportes", "Juegos de deportes para Steam PC"],
  "Racing": ["steam-carreras", "Juegos de carreras para Steam PC"],
  "Indie": ["steam-indie", "Juegos indie para Steam PC"],
  "Casual": ["steam-casual", "Juegos casuales para Steam PC"],
};
const TAG_ES = {"Action": "acción", "Adventure": "aventura", "RPG": "rol", "Strategy": "estrategia", "Simulation": "simulación", "Sports": "deportes", "Racing": "carreras", "Indie": "indie", "Casual": "casual", "Early Access": "acceso anticipado", "Massively Multiplayer": "multijugador masivo"};

function renderRyuuGame(shell, appid, [rawName, tagStr, nsfw, rawPrice]) {
  const price = Number(rawPrice) || 2000;
  const priceText = `$${price.toLocaleString("es-CL")}`;
  const name = String(rawName || "").trim();
  const tags = String(tagStr || "").split(",").filter(Boolean);
  const genres = tags.map((t) => TAG_ES[t]).filter(Boolean);
  const url = `https://pandastoregaming.cl/producto/${slugify(name) || `ryuu_${appid}`}--ryuu_${appid}`;
  const image = `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`;
  const title = [`${name} Steam PC ${priceText} | Comprar en Chile | PandaStore`, `${name} Steam PC ${priceText} | PandaStore`, `${name} | PandaStore`]
      .find((t) => t.length <= 70) || `${name.slice(0, 55)} | PandaStore`;
  const desc = `Compra ${name} para Steam PC en Chile a ${priceText} CLP${genres.length ? `, juego de ${genres.slice(0, 3).join(", ")}` : ""}. Entrega inmediata 24/7 y activación con PandaStore Launcher.`.slice(0, 158);
  const lists = tags.map((t) => TAG_LISTS[t]).filter(Boolean).slice(0, 4);
  const faq = [
    [`¿Cuánto cuesta ${name} en PandaStore?`, `${name} para Steam PC cuesta ${priceText} CLP.`],
    [`¿Cómo activo ${name}?`, "Con el PandaStore Launcher para Windows: con un clic el juego queda configurado y listo para jugar. Tus partidas y logros funcionan con normalidad."],
    ["¿Cuánto demora la entrega?", "La entrega es inmediata y 100% digital, las 24 horas."],
  ];
  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product", "name": name, "image": [image], "sku": `ryuu_${appid}`, "category": "Steam PC", "url": url, "description": desc,
        "offers": {"@type": "Offer", "price": String(price), "priceCurrency": "CLP", "availability": "https://schema.org/InStock", "itemCondition": "https://schema.org/NewCondition", "url": url, "seller": {"@type": "Organization", "name": "PandaStore Chile"}},
      },
      {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pandastoregaming.cl/"},
        {"@type": "ListItem", "position": 2, "name": "Juegos Steam", "item": "https://pandastoregaming.cl/juegos/juegos-steam-chile"},
        {"@type": "ListItem", "position": 3, "name": name, "item": url},
      ]},
      {"@type": "FAQPage", "mainEntity": faq.map(([q, a]) => ({"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}))},
    ],
  }).replace(/</g, "\\u003c");
  const t = escapeHtml(title);
  const d = escapeHtml(desc);
  const n = escapeHtml(name);
  // Juegos para adultos: se sirven pero no se indexan, para no asociar la tienda a ese contenido
  const robots = Number(nsfw) ? "noindex, follow" : "index, follow, max-snippet:-1, max-image-preview:large";
  const head = `<title>${t}</title>
        <link rel="canonical" href="${url}" />
        <meta name="description" content="${d}" />
        <meta name="robots" content="${robots}" />
        <meta property="og:title" content="${t}" />
        <meta property="og:description" content="${d}" />
        <meta property="og:image" content="${image}" />
        <meta property="og:url" content="${url}" />
        <meta property="og:type" content="product" />
        <meta property="og:site_name" content="PandaStore Chile" />
        <meta property="og:locale" content="es_CL" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${t}" />
        <meta name="twitter:description" content="${d}" />
        <meta name="twitter:image" content="${image}" />
        <script type="application/ld+json">${ld}</script>`;
  const main = `<main>
            <nav aria-label="Ruta de navegación"><a href="/">Inicio</a> › <a href="/juegos/juegos-steam-chile">Juegos Steam</a> › <span>${n}</span></nav>
            <article>
              <h1>${n} — Steam PC digital</h1>
              <img src="${image}" alt="${n} Steam PC" width="460" height="215" />
              <p>Precio: ${priceText} CLP. Compra ${n} para Steam PC en PandaStore Chile${genres.length ? `, un juego de ${escapeHtml(genres.join(", "))}` : ""}. La entrega es inmediata y 100% digital, las 24 horas.</p>
              <p>Los juegos de Steam se activan con el PandaStore Launcher oficial para Windows: con un clic el juego queda configurado y listo para jugar. <a href="/guias/como-activar-juegos-steam-con-pandastore-launcher">Ver guía de activación</a>.</p>
              <h2>Preguntas frecuentes</h2>
              ${faq.map(([q, a]) => `<h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p>`).join("")}
              <h2>Más juegos como ${n}</h2>
              <ul>${lists.map(([s, l]) => `<li><a href="/juegos/${s}">${l}</a></li>`).join("")}<li><a href="/juegos/juegos-steam-baratos-chile">Juegos de Steam baratos en Chile</a></li></ul>
            </article>
          </main>`;
  return shell
      .replace(/<meta\s+(?:name="(?:description|keywords|robots|twitter:[^"]*)"|property="og:[^"]*")[^>]*>\s*/gi, "")
      .replace(/<script type="application\/ld\+json">\s*\{\s*"@context":\s*"https:\/\/schema\.org",\s*"@type":\s*"(?:FAQPage|ItemList)"[\s\S]*?<\/script>\s*/g, "")
      .replace(/<title>.*?<\/title>/i, () => head)
      .replace(/<main>[\s\S]*?<\/main>/, () => main);
}

// Nombres guardados todo en MAYÚSCULA o minúscula se muestran en formato título
const KEEP_UPPER = new Set(["II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII", "XIII", "XV", "XVI", "GTA", "NBA", "FIFA", "EA", "FC", "WWE", "UFC", "LEGO", "DLC", "HD", "VR", "DOOM", "MX", "PS4", "PS5", "GOTY", "DX", "RPG", "2K", "F1", "NHL", "MLB", "NFL", "UNO"]);
function displayName(value) {
  const s = String(value || "").replace(/\s+/g, " ").trim();
  if (!/[a-zA-Z]/.test(s) || (s !== s.toLowerCase() && s !== s.toUpperCase())) return s;
  return s.toLowerCase().split(" ").map((w) => KEEP_UPPER.has(w.toUpperCase().replace(/[^A-Z0-9]/g, "")) ?
    w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// " $12.990" con el menor precio CLP del producto, para el título
function priceShortTitle(p) {
  const values = [p.priceCLP, p.pricePrimariaCLP, p.priceSecundariaCLP].map(normalizePrice).filter(Boolean);
  return values.length ? ` $${Math.round(Math.min(...values)).toLocaleString("es-CL")}` : "";
}

const DELIVERY = {
  "Steam PC": "Entrega inmediata 24/7 y activación con PandaStore Launcher.",
  "default": "Entrega digital en 1 a 9 horas mediante usuario externo, con cuenta primaria o secundaria.",
};

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;",
  }[char]));
}

function normalizePrice(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const raw = value.trim().replace(/[^0-9,.-]/g, "");
  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let normalized = raw;
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    normalized = raw.replace(decimal === "," ? /\./g : /,/g, "").replace(decimal, ".");
  } else if (lastComma >= 0) {
    normalized = /,\d{1,2}$/.test(raw) ? raw.replace(",", ".") : raw.replace(/,/g, "");
  } else if (/\.\d{3}(\.\d{3})+$/.test(raw) || /\.\d{3}$/.test(raw)) normalized = raw.replace(/\./g, "");
  const result = Number(normalized);
  return Number.isFinite(result) && result > 0 ? result : null;
}

// Igual que slugify() en src/utils/slugify.js: las URLs canónicas deben coincidir con los enlaces del sitio
function slugify(str) {
  return String(str || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
}

// Nombres de categoría (id → nombre) cacheados en memoria por instancia
const categoryNames = new Map();
async function getCategoryName(db, categoryId) {
  if (!categoryId) return "";
  if (!categoryNames.has(categoryId)) {
    const snap = await db.collection("categories").doc(categoryId).get().catch(() => null);
    categoryNames.set(categoryId, snap && snap.exists ? String(snap.data().name || "") : "");
  }
  return categoryNames.get(categoryId);
}

// Los productos guardan categoryId; la plataforma se deduce del nombre de su categoría
function platformLabel(categoryName, p) {
  const s = `${categoryName} ${p.plataforma || ""} ${p.platform || ""}`.toLowerCase();
  if (s.includes("switch 2")) return "Nintendo Switch 2";
  if (s.includes("switch") || s.includes("nintendo")) return "Nintendo Switch";
  if (s.includes("ps5")) return "PS5";
  if (s.includes("ps4")) return "PS4";
  if (s.includes("playstation")) return "PlayStation";
  if (s.includes("streaming")) return "Streaming";
  if (s.includes("suscrip")) return "Suscripción";
  return "Steam PC";
}

exports.dynamicSEO = functions.https.onRequest(async (req, res) => {
  try {
    // 1. Extraer el ID del producto de la URL (ej: /producto/12345)
    // path será "/12345" si el rewrite quita "/producto", o "/producto/12345"
    const pathParts = req.path.split("/");
    const rawProductId = pathParts[pathParts.length - 1];
    const productId = rawProductId.includes("--") ? rawProductId.split("--").pop() : rawProductId;

    if (!productId) {
      return res.redirect("/");
    }

    // 2. Obtener el producto de Firestore
    const db = admin.firestore();
    const productDoc = await db.collection("products").doc(productId).get();

    // 3. Obtener el shell base de la aplicación (cacheado en memoria).
    // app.html es el shell vacío de la SPA; index.html trae /home prerenderizado
    // (scripts/prerender-home.js), así que solo se usa como respaldo.
    // El shell se renueva cada 2 minutos: antes se cacheaba para siempre y, tras cada despliegue,
    // las fichas servidas por esta función seguían cargando el JavaScript (y los precios) anteriores.
    if (!cachedHtml || Date.now() - cachedHtmlAt > SHELL_TTL_MS) {
      try {
        // ?v= evita recibir una copia vieja del CDN
        let response = await fetch(`https://pandastoregaming.cl/app.html?v=${Date.now()}`);
        if (!response.ok) response = await fetch(`https://pandastoregaming.cl/index.html?v=${Date.now()}`);
        if (response.ok) {
          cachedHtml = await response.text();
          cachedHtmlAt = Date.now();
        }
      } catch (e) {
        if (!cachedHtml) throw e;
      }
    }

    let htmlStr = cachedHtml;

    if (productDoc.exists) {
      const p = productDoc.data();
      const categoryName = await getCategoryName(db, p.categoryId);
      const platLabel = platformLabel(categoryName, p);
      const isGame = !["Streaming", "Suscripción"].includes(platLabel);
      const productName = displayName(p.name || p.title || "Juego digital");
      const title = isGame ?
        `${productName} ${platLabel} Digital${priceShortTitle(p)} | Comprar en Chile | PandaStore` :
        `${productName} | ${platLabel} en Chile | PandaStore`;
      const fullDesc = p.description ? String(p.description).replace(/\s+/g, " ").trim() : "";
      const priceCLP = normalizePrice(p.priceCLP || p.pricePrimariaCLP || p.priceSecundariaCLP ||
        (Array.isArray(p.preciosPorMes) && p.preciosPorMes[0] ? p.preciosPorMes[0].clp : null));
      const priceUSD = normalizePrice(p.priceUSD || p.pricePrimariaUSD);
      const allCLP = [p.priceCLP, p.pricePrimariaCLP, p.priceSecundariaCLP].map(normalizePrice).filter(Boolean);
      const minCLP = allCLP.length ? Math.min(...allCLP) : priceCLP;
      const priceShort = minCLP ? `$${Math.round(minCLP).toLocaleString("es-CL")}` : "";
      const delivery = DELIVERY[platLabel] || DELIVERY.default;
      // Muchas descripciones son solo "ENTREGA INMEDIATA" o el peso del juego: se arma una útil
      const desc = fullDesc.length >= 90 ?
        fullDesc.slice(0, 155) :
        `Compra ${productName} para ${platLabel} en Chile${priceShort ? ` desde ${priceShort} CLP` : ""}. ${delivery} Soporte por WhatsApp.`.slice(0, 158);
      const price = minCLP || priceUSD;
      const currency = minCLP ? "CLP" : "USD";
      const related = ((await getProductLinks())[productId] || []).slice(0, 8);
      const faq = [
        [`¿Cuánto cuesta ${productName} para ${platLabel}?`, priceShort ? `${productName} para ${platLabel} cuesta desde ${priceShort} CLP en PandaStore.` : "Revisa el precio actualizado en esta página."],
        ["¿Cómo recibo el juego?", delivery],
        ["¿Qué medios de pago aceptan?", "En Chile: WebPay, MercadoPago, transferencia y USDT. Desde Latinoamérica: PayPal, Prex y USDT."],
      ];
      const image = p.imageUrl || "https://pandastoregaming.cl/icon-512.png";
      const url = `https://pandastoregaming.cl/producto/${slugify(productName) || productId}--${productId}`;
      const categoryPath = categoryName ? `/categoria/${slugify(categoryName)}` : "/categorias";
      const safeTitle = escapeHtml(title);
      const safeDesc = escapeHtml(desc);
      const safeImage = escapeHtml(image);
      const safeName = escapeHtml(productName);
      const safeCategory = escapeHtml(categoryName || platLabel);

      const structuredData = JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Product",
            "name": productName,
            "description": desc,
            "image": [image],
            "sku": productId,
            "category": platLabel,
            "url": url,
            "offers": price ? {
              "@type": "Offer",
              "price": String(price),
              "priceCurrency": currency,
              // Siempre en stock salvo que el admin lo marque agotado
              "availability": p.agotado === true ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
              "itemCondition": "https://schema.org/NewCondition",
              "url": url,
              "seller": {"@type": "Organization", "name": "PandaStore Chile"},
            } : undefined,
          },
          {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {"@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pandastoregaming.cl/"},
              {"@type": "ListItem", "position": 2, "name": categoryName || platLabel, "item": `https://pandastoregaming.cl${categoryPath}`},
              {"@type": "ListItem", "position": 3, "name": productName, "item": url},
            ],
          },
          {
            "@type": "FAQPage",
            "mainEntity": faq.map(([q, a]) => ({"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}})),
          },
        ],
      }).replace(/</g, "\\u003c");

      const metaTags = `
        <title>${safeTitle}</title>
        <link rel="canonical" href="${url}" />
        <meta name="description" content="${safeDesc}" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <meta property="og:title" content="${safeTitle}" />
        <meta property="og:description" content="${safeDesc}" />
        <meta property="og:image" content="${safeImage}" />
        <meta property="og:url" content="${url}" />
        <meta property="og:type" content="product" />
        <meta property="og:site_name" content="PandaStore Chile" />
        <meta property="og:locale" content="es_CL" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${safeTitle}" />
        <meta name="twitter:description" content="${safeDesc}" />
        <meta name="twitter:image" content="${safeImage}" />
        ${price ? `<meta property="product:price:amount" content="${price}" />
                   <meta property="product:price:currency" content="${currency}" />` : ""}
        <script type="application/ld+json">${structuredData}</script>
      `;

      // Contenido indexable propio del producto: reemplaza el texto genérico del home que trae el shell
      // (React lo reemplaza al montar; Google lo lee en el HTML inicial).
      const priceText = price ?
        `Precio: ${currency === "CLP" ? `$${Math.round(price).toLocaleString("es-CL")} CLP` : `US$${price}`}. ` :
        "";
      const productMain = `<main>
            <nav aria-label="Ruta de navegación"><a href="/">Inicio</a> › <a href="${categoryPath}">${safeCategory}</a> › <span>${safeName}</span></nav>
            <article>
              <h1>${safeName} — ${escapeHtml(platLabel)} ${isGame ? "digital" : ""}</h1>
              <img src="${safeImage}" alt="${safeName} ${escapeHtml(platLabel)}" width="300" height="380" />
              ${fullDesc ? `<p>${escapeHtml(fullDesc.slice(0, 3000))}</p>` : `<p>${safeDesc}</p>`}
              <p>${priceText}Compra ${safeName} ${isGame ? `para ${escapeHtml(platLabel)} ` : ""}en PandaStore Chile con entrega digital inmediata, garantía y soporte en español por WhatsApp.</p>
              <p><a href="${categoryPath}">Ver más de ${safeCategory}</a> · <a href="/promos">Ofertas y packs</a> · <a href="/juegos">Explorar juegos</a></p>
              <h2>Preguntas frecuentes</h2>
              ${faq.map(([q, a]) => `<h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p>`).join("")}
              ${related.length ? `<h2>Más juegos como ${safeName}</h2><ul>${related.map((l) => `<li><a href="/juegos/${escapeHtml(l.slug)}">${escapeHtml(l.h1)}</a></li>`).join("")}</ul>` : ""}
            </article>
          </main>`;

      htmlStr = htmlStr
      // Quitar metadatos genéricos del home para no duplicarlos
          .replace(/<meta\s+(?:name="(?:description|keywords|twitter:[^"]*)"|property="og:[^"]*")[^>]*>\s*/gi, "")
      // Datos estructurados que describen solo el home (sus FAQ e índice de categorías)
          .replace(/<script type="application\/ld\+json">\s*\{\s*"@context":\s*"https:\/\/schema\.org",\s*"@type":\s*"(?:FAQPage|ItemList)"[\s\S]*?<\/script>\s*/g, "")
          .replace(/<title>.*?<\/title>/i, () => metaTags)
          .replace(/<main>[\s\S]*?<\/main>/, () => productMain);
    } else {
      // Catálogo extendido de Steam (Ryuu): /producto/<slug>--ryuu_<appid> o --steam_<appid>
      const match = String(productId).match(/^(?:ryuu_|steam_)?(\d+)$/);
      const entry = match ? (await getRyuuIndex())[match[1]] : null;
      if (entry) htmlStr = renderRyuuGame(htmlStr, match[1], entry);
    }

    // Devolvemos el HTML con los metadatos inyectados.
    // React se hidratará normalmente cuando se cargue la página.
    res.set("Cache-Control", "public, max-age=300, s-maxage=600");
    res.status(200).send(htmlStr);
  } catch (err) {
    console.error("Error en dynamicSEO:", err);
    // Fallback: Si algo falla, redirigimos a la home para no mostrar un error feo
    res.redirect("/");
  }
});
