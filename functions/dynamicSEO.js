const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Variable global para cachear el index.html en memoria
let cachedHtml = null;

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;",
  }[char]));
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
      const response = await fetch("https://pandastoreupdate.web.app/index.html");
      cachedHtml = await response.text();
    }

    let htmlStr = cachedHtml;

    if (productDoc.exists) {
      const p = productDoc.data();
      const rawPlat = (p.plataforma || p.platform || p.category || p.categoria || "").toLowerCase();
      const platLabel = rawPlat.includes("switch") || rawPlat.includes("nintendo") ? "Nintendo Switch" : (rawPlat.includes("ps4") || rawPlat.includes("ps5") || rawPlat.includes("playstation")) ? "PS5 / PS4" : "Steam PC";
      const title = `${p.name} (${platLabel}) Barato | Comprar Juego Digital - PandaStore`;
      const desc = p.description ? p.description.slice(0, 155) : `Compra ${p.name} para ${platLabel} barato en PandaStore. Entrega inmediata 24/7, soporte en español y garantía oficial.`;
      const price = p.priceUSD || p.pricePrimariaUSD || p.priceCLP || "";
      const currency = p.priceUSD || p.pricePrimariaUSD ? "USD" : "CLP";
      const image = p.imageUrl || "https://pandastoreupdate.web.app/favicon.png";
      const slug = String(p.slug || p.name || productId)
          .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
      const url = `https://pandastoreupdate.web.app/producto/${slug}--${productId}`;
      const safeTitle = escapeHtml(title);
      const safeDesc = escapeHtml(desc);
      const safeImage = escapeHtml(image);
      const productSchema = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        "name": p.name,
        "description": desc,
        "image": [image],
        "offers": price ? {"@type": "Offer", "price": String(price), "priceCurrency": currency, "availability": "https://schema.org/InStock", url} : undefined,
      }).replace(/</g, "\\u003c");

      // Inyectar metadatos OpenGraph y Twitter en el <head>
      const metaTags = `
        <title>${safeTitle}</title>
        <link rel="canonical" href="${url}" />
        <meta name="description" content="${safeDesc}" />
        <meta name="keywords" content="comprar ${safeTitle}, ${safeTitle} barato, ${platLabel.toLowerCase()} barato, juegos digitales, ofertas videojuegos, pandastore" />
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
