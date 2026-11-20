/**
 * Proxy del catálogo Ryuu (games.json / fixes.json).
 *
 * Motivo: generator.ryuu.lol envía la cabecera CORS duplicada ("*, *") y el
 * navegador bloquea la respuesta. Desde el servidor CORS no aplica, así que
 * descargamos aquí y servimos desde nuestro propio dominio (/api/ryuu/...).
 *
 * Resiliencia:
 *  - Caché en memoria (instancia caliente) durante FRESH_MS.
 *  - Copia de respaldo en Cloud Storage: si Ryuu está caído o lento, se sirve
 *    la última copia buena aunque esté vencida.
 *  - Timeout hacia Ryuu y respuesta comprimida en gzip (games.json ~33 MB).
 */
const admin = require("firebase-admin");
const zlib = require("zlib");

const FILES = {
  games: "https://generator.ryuu.lol/files/games.json",
  fixes: "https://generator.ryuu.lol/files/fixes.json",
};
const FRESH_MS = 6 * 60 * 60 * 1000; // 6 horas
const UPSTREAM_TIMEOUT_MS = 150000; // games.json pesa ~33 MB y tarda ~60 s
const BACKUP_PREFIX = "ryuu_cache/";

// { games: { body: Buffer (gzip), ts: number } }
const memCache = {};

async function fetchUpstream(name) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(FILES[name], {signal: controller.signal});
    if (!res.ok) throw new Error(`Ryuu respondió ${res.status}`);
    const body = await res.text();
    const parsed = JSON.parse(body); // valida que sea JSON
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Ryuu devolvió un catálogo vacío o inválido");
    }
    return zlib.gzipSync(Buffer.from(body, "utf8"));
  } finally {
    clearTimeout(timer);
  }
}

function backupFile(name) {
  return admin.storage().bucket().file(`${BACKUP_PREFIX}${name}.json.gz`);
}

async function saveBackup(name, body) {
  try {
    await backupFile(name).save(body, {
      contentType: "application/gzip",
      resumable: false,
    });
  } catch (e) {
    console.warn(`No se pudo guardar respaldo Ryuu ${name}:`, e.message);
  }
}

async function loadBackup(name) {
  try {
    const [buf] = await backupFile(name).download();
    return buf;
  } catch (e) {
    return null;
  }
}

async function getCatalog(name) {
  const cached = memCache[name];
  if (cached && Date.now() - cached.ts < FRESH_MS) {
    return {body: cached.body, source: "memory"};
  }
  try {
    const body = await fetchUpstream(name);
    memCache[name] = {body, ts: Date.now()};
    saveBackup(name, body); // sin await: no retrasa la respuesta
    return {body, source: "upstream"};
  } catch (err) {
    console.warn(`Fallo al descargar Ryuu ${name}:`, err.message);
    if (cached) return {body: cached.body, source: "memory-stale"};
    const backup = await loadBackup(name);
    if (backup) {
      memCache[name] = {body: backup, ts: Date.now() - FRESH_MS + 10 * 60 * 1000};
      return {body: backup, source: "backup"};
    }
    throw err;
  }
}

async function handleRyuuCatalog(req, res) {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET");
    return res.status(204).send("");
  }
  if (req.method !== "GET") return res.status(405).send("Método no permitido");

  // Acepta /api/ryuu/games.json, /api/ryuu/fixes.json o ?file=games
  const match = (req.path || "").match(/(games|fixes)(\.json)?\/?$/);
  const name = (match && match[1]) || req.query.file;
  if (!FILES[name]) return res.status(404).json({error: "Archivo no válido"});

  try {
    const {body, source} = await getCatalog(name);
    res.set("Content-Type", "application/json; charset=utf-8");
    res.set("Content-Encoding", "gzip");
    res.set("Vary", "Accept-Encoding");
    // La CDN de Firebase Hosting guarda la respuesta 1 hora
    res.set("Cache-Control", "public, max-age=1800, s-maxage=3600");
    res.set("X-Ryuu-Source", source);
    return res.status(200).send(body);
  } catch (err) {
    return res.status(502).json({error: "Catálogo Ryuu no disponible"});
  }
}

module.exports = {handleRyuuCatalog};
