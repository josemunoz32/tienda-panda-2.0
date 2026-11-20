/**
 * imageResize.js — versiones livianas de las fotos de productos, generadas al pedirlas.
 *
 *   GET /img?p=products/<archivo>&w=400   (rewrite de Firebase Hosting → función "img")
 *
 * Descarga la foto original de Storage, la achica al ancho pedido y la entrega en WebP.
 * La respuesta se cachea un año en el CDN de Hosting: solo la primera petición de cada
 * tamaño ejecuta la función. Si algo falla, redirige a la foto original (nunca una imagen rota).
 * Solo se permiten carpetas públicas y anchos fijos, para que nadie pueda abusar del servicio.
 */
const admin = require("firebase-admin");

const BUCKET = "pandastoreupdate.firebasestorage.app";
const ALLOWED_DIRS = /^(products|testimonios|reviews)\//;
const WIDTHS = [160, 240, 320, 400, 600, 800];

function originalUrl(path) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media`;
}

async function handleImage(req, res) {
  const path = String(req.query.p || "");
  const requested = Number(req.query.w) || 400;
  if (!ALLOWED_DIRS.test(path) || path.includes("..") || path.length > 400) {
    res.status(400).send("Ruta no permitida");
    return;
  }
  // Ancho permitido más cercano por arriba
  const width = WIDTHS.find((w) => w >= requested) || WIDTHS[WIDTHS.length - 1];
  try {
    const sharp = require("sharp");
    const [buffer] = await admin.storage().bucket(BUCKET).file(path).download();
    const out = await sharp(buffer, {failOn: "none", animated: false})
        .rotate()
        .resize({width, withoutEnlargement: true})
        .webp({quality: 78, effort: 4})
        .toBuffer();
    res.set("Content-Type", "image/webp");
    res.set("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
    res.status(200).send(out);
  } catch (err) {
    console.warn("[img] usando original:", path, err.message);
    res.set("Cache-Control", "public, max-age=300, s-maxage=300");
    res.redirect(302, originalUrl(path));
  }
}

module.exports = {handleImage};
