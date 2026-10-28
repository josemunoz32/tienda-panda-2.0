const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Variable global para cachear el index.html en memoria
let cachedHtml = null;

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

    // 3. Obtener el index.html base de la aplicación (cacheado en memoria)
    if (!cachedHtml) {
      // Usamos fetch nativo de Node.js (Node 18+) para obtener el index original
      const response = await fetch("https://pandastoregaming.cl/index.html");
      cachedHtml = await response.text();
    }

    let htmlStr = cachedHtml;

    if (productDoc.exists) {
      const p = productDoc.data();
      const rawPlat = (p.plataforma || p.platform || p.category || p.categoria || "").toLowerCase();
      const platLabel = rawPlat.includes("switch") || rawPlat.includes("nintendo") ? "Nintendo Switch" : (rawPlat.includes("ps4") || rawPlat.includes("ps5") || rawPlat.includes("playstation")) ? "PS5 / PS4" : "Steam PC";
      const productName = String(p.name || p.title || "Juego digital").trim();
      const title = `${productName} para ${platLabel} | Juego Digital | PandaStore Chile`;
      const desc = p.description ? String(p.description).replace(/\s+/g, " ").trim().slice(0, 155) : `Compra ${productName} para ${platLabel} en PandaStore Chile. Producto digital y soporte en español.`;
      const price = normalizePrice(p.priceUSD || p.pricePrimariaUSD || p.priceCLP);
      const currency = p.priceUSD || p.pricePrimariaUSD ? "USD" : "CLP";
      const image = p.imageUrl || "https://pandastoregaming.cl/favicon.png";
      const slug = String(p.slug || productName || productId)
          .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
      const url = `https://pandastoregaming.cl/producto/${slug}--${productId}`;
      const safeTitle = escapeHtml(title);
      const safeDesc = escapeHtml(desc);
      const safeImage = escapeHtml(image);
      const productSchema = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        "name": productName,
        "description": desc,
        "image": [image],
        "sku": productId,
        "brand": {"@type": "Brand", "name": "PandaStore Chile"},
        "category": platLabel,
        "offers": price ? {"@type": "Offer", "price": String(price), "priceCurrency": currency, "availability": Number(p.stock) === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock", "itemCondition": "https://schema.org/NewCondition", url} : undefined,
      }).replace(/</g, "\\u003c");

      // Inyectar metadatos OpenGraph y Twitter en el <head>
      const metaTags = `
        <title>${safeTitle}</title>
        <link rel="canonical" href="${url}" />
        <meta name="description" content="${safeDesc}" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <meta name="keywords" content="${escapeHtml(productName)}, comprar ${escapeHtml(productName)}, ${platLabel.toLowerCase()}, juegos digitales" />
        <meta property="og:title" content="${safeTitle}" />
        <meta property="og:description" content="${safeDesc}" />
        <meta property="og:image" content="${safeImage}" />
        <meta property="og:url" content="${url}" />
        <meta property="og:type" content="product" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${safeTitle}" />
        <meta name="twitter:description" content="${safeDesc}" />
        <meta name="twitter:image" content="${safeImage}" />
        ${price ? `<meta property="product:price:amount" content="${price}" />
                   <meta property="product:price:currency" content="${currency}" />` : ""}
        <script type="application/ld+json">${productSchema}</script>
      `;

      // Reemplazamos el title genérico por todos los tags meta
      // Buscamos <title>PandaStore... en el HTML base y lo reemplazamos
      htmlStr = htmlStr.replace(
          /<title>.*?<\/title>/i,
          metaTags,
      );
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
