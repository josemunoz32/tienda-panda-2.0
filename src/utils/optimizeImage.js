/**
 * optimizeImageUrl — pide versiones livianas de las portadas.
 *
 * - Fotos subidas a Firebase Storage (products/, testimonios/, reviews/): pesan 300 KB–1 MB.
 *   Se piden a /img (función "img" detrás de Firebase Hosting), que entrega un WebP del ancho
 *   pedido y queda cacheado en el CDN. Si falla, esa función redirige a la original.
 * - Portadas "hero" de assets.nintendo.com (1–2 MB): su CDN (Cloudinary) acepta parámetros en
 *   la URL para entregarlas redimensionadas (~90 KB).
 * Cualquier otra URL se devuelve sin cambios.
 */
const NINTENDO_UPLOAD = "assets.nintendo.com/image/upload/";
const STORAGE_RE = /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/pandastoreupdate\.firebasestorage\.app\/o\/((?:products|testimonios|reviews)%2F[^?]+)/;

// En desarrollo (localhost) /img no existe: se usa la original para no romper las imágenes
const IMG_ENDPOINT_AVAILABLE = typeof window === "undefined" || !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

export function optimizeImageUrl(url, width = 400) {
  if (!url || typeof url !== "string") return url;

  const storage = url.match(STORAGE_RE);
  if (storage) {
    if (!IMG_ENDPOINT_AVAILABLE) return url;
    // storage[1] ya viene codificado (products%2Farchivo.jpg): se pasa tal cual en el parámetro
    return `/img?p=${storage[1]}&w=${width}`;
  }

  const i = url.indexOf(NINTENDO_UPLOAD);
  if (i === -1) return url;
  const start = i + NINTENDO_UPLOAD.length;
  const next = url.slice(start).split("/")[0];
  // Ya trae transformaciones (c_fill, f_auto, w_500…): no duplicar
  if (/(^|,)(c|f|q|w|h)_/.test(next)) return url;
  return `${url.slice(0, start)}c_limit,f_auto,q_auto,w_${width}/${url.slice(start)}`;
}
