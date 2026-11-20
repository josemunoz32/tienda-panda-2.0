/**
 * catalog.js — catálogo unificado para el generador SEO.
 * Junta los productos de Firestore (API REST pública, igual que generate-sitemap.js) con el
 * catálogo curado de Steam (src/assets/steam_import_data.json) y su enriquecimiento público de la
 * tienda Steam (scripts/data/steam_enrichment.json: géneros, modos, desarrolladora, descripción).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_ID = 'pandastoreupdate';
const API = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const ROOT = path.join(__dirname, '..', '..');
const DOLAR = 900;

// Igual que src/utils/slugify.js: las URLs deben coincidir con los enlaces del sitio
function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
// Nombres guardados todo en minúscula o todo en MAYÚSCULA se muestran en formato título
const KEEP_UPPER = new Set(['II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XI', 'XII', 'XIII', 'XV', 'XVI', 'GTA', 'NBA', 'FIFA', 'EA', 'FC', 'WWE', 'UFC', 'LEGO', 'DLC', 'HD', 'VR', 'DOOM', 'NFS', 'MX', 'PS4', 'PS5', 'GOTY', 'TMNT', 'DX', 'RPG', '2K', 'PGA', 'F1', 'NHL', 'MLB', 'NFL', 'UNO']);
function displayName(name) {
  const s = String(name || '').replace(/\s+/g, ' ').trim();
  const letters = s.replace(/[^a-zA-Z]/g, '');
  if (!letters || (s !== s.toLowerCase() && s !== s.toUpperCase())) return s;
  return s.toLowerCase().split(' ').map((w) => {
    const up = w.toUpperCase();
    if (KEEP_UPPER.has(up.replace(/[^A-Z0-9]/g, ''))) return up;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const nameKey = (s) => norm(s).replace(/™|®|©/g, '').replace(/[^a-z0-9]/g, '');

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function fetchAll(collection) {
  const docs = [];
  let token = '';
  do {
    const json = await getJson(`${API}/${collection}?pageSize=300${token ? `&pageToken=${token}` : ''}`);
    docs.push(...(json.documents || []));
    token = json.nextPageToken || '';
  } while (token);
  return docs;
}

// Convierte un documento REST de Firestore a objeto plano
function plain(value) {
  if (!value || typeof value !== 'object') return value;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(plain);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, plain(v)]));
  return null;
}

function num(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  const raw = String(value || '').replace(/[^0-9.,]/g, '');
  if (!raw) return null;
  const n = Number(/[.,]\d{1,2}$/.test(raw) ? raw.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.') : raw.replace(/[.,]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}
const minOf = (...values) => {
  const list = values.map(num).filter(Boolean);
  return list.length ? Math.min(...list) : null;
};

function platformOf(categoryName, p) {
  const s = norm(`${categoryName} ${p.plataforma || ''} ${p.platform || ''}`);
  if (s.includes('switch 2')) return 'switch2';
  if (s.includes('switch') || s.includes('nintendo')) return 'switch';
  if (s.includes('ps5')) return 'ps5';
  if (s.includes('ps4')) return 'ps4';
  if (s.includes('streaming')) return 'streaming';
  if (s.includes('suscrip')) return 'suscripcion';
  return 'steam';
}

// Temas inferidos de nombre + descripción + etiquetas (se usan solo para agrupar páginas)
const THEMES = [
  ['terror', /terror|horror|miedo|zombi|survival horror|escalofri/],
  ['mundo-abierto', /mundo abierto|open world|sandbox/],
  ['supervivencia', /superviv|survival/],
  ['shooter', /disparos|shooter|\bfps\b|tirador|tiroteo/],
  ['lucha', /\blucha\b|pelea|fighting|combate uno contra uno|torneo de lucha/],
  ['plataformas', /plataformas|platformer/],
  ['puzzle', /puzle|puzzle|rompecabezas|acertijo/],
  ['anime', /anime|manga/],
  ['sigilo', /sigilo|stealth/],
  ['roguelike', /roguelike|roguelite/],
  ['ciencia-ficcion', /ciencia ficci|sci-fi|galaxia|espacial|alien|ciberpunk|cyberpunk/],
  ['fantasia', /fantas[ií]a|dragon|magia|hechic/],
  ['guerra', /guerra|militar|soldado|segunda guerra|ww2|ejercito/],
  ['infantil', /infantil|ninos|familia|familiar|para toda la familia/],
  ['futbol', /futbol|football|fifa|\bfc 2|efootball/],
];

const GENRE_MAP = [
  ['accion', /accion|action/],
  ['aventura', /aventura|adventure/],
  ['rpg', /\brol\b|rpg|juegos de rol/],
  ['estrategia', /estrategia|strategy/],
  ['simulacion', /simula/],
  ['deportes', /deporte|sport/],
  ['carreras', /carreras|conduccion|racing/],
  ['indie', /indie/],
  ['casual', /casual/],
  ['terror', /terror|horror/],
  ['shooter', /shooter|fps/],
  ['lucha', /lucha|pelea/],
  ['plataformas', /plataformas/],
  ['infantil', /infantil/],
  ['puzzle', /puzzle|puzle/],
  ['supervivencia', /superviv|survival/],
];

const MODE_MAP = [
  ['cooperativo', /cooperativo|co-op|coop/],
  ['multijugador', /multijugador|multiplayer|pvp/],
  ['un-jugador', /un jugador|single/],
  ['pantalla-dividida', /pantalla compartida|pantalla dividida|split/],
  ['con-control', /compat\. total con controlador|controlador/],
];

function classify(text, map) {
  const t = norm(text);
  return map.filter(([, re]) => re.test(t)).map(([key]) => key);
}

async function loadCatalog() {
  const [docs, catDocs] = await Promise.all([fetchAll('products'), fetchAll('categories')]);
  const categories = new Map(catDocs.map((d) => [d.name.split('/').pop(), plain(d.fields?.name) || '']));
  const steam = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'assets', 'steam_import_data.json'), 'utf8'));
  let enrichment = {};
  try { enrichment = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'steam_enrichment.json'), 'utf8')); } catch (_) {}
  // Géneros de Steam por nombre: sirven para clasificar la versión de consola del mismo juego
  const steamGenresByName = new Map();
  steam.forEach((s) => {
    const e = enrichment[String(s.app_id)];
    if (e && !e.missing) steamGenresByName.set(nameKey(s.name), e);
  });

  const products = [];
  const seenSteamIds = new Set();

  docs.forEach((d) => {
    const id = d.name.split('/').pop();
    const p = Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, plain(v)]));
    const name = displayName(p.name || p.title || '');
    if (!name) return;
    if (p.status && /oculto|hidden|draft|borrador/i.test(String(p.status))) return;
    const categoryName = categories.get(p.categoryId) || p.categoria || '';
    const platform = platformOf(categoryName, p);
    const priceCLP = minOf(p.priceCLP, p.pricePrimariaCLP, p.priceSecundariaCLP, ...(Array.isArray(p.preciosPorMes) ? p.preciosPorMes.map((m) => m && m.clp) : []));
    let priceUSD = minOf(p.priceUSD, p.pricePrimariaUSD, p.priceSecundariaUSD);
    if (!priceUSD && priceCLP) priceUSD = Math.round((priceCLP / DOLAR) * 100) / 100;
    if (p.app_id) seenSteamIds.add(String(p.app_id));
    const tags = (Array.isArray(p.tags) ? p.tags : []).map(String);
    const e = steamGenresByName.get(nameKey(name));
    const text = [name, p.description, tags.join(' '), e ? `${e.genres.join(' ')} ${e.short}` : ''].join(' ');
    products.push({
      id,
      name,
      url: `/producto/${slugify(name) || id}--${id}`,
      image: p.imageUrl || p.image || '',
      platform,
      categoryName,
      priceCLP,
      priceUSD,
      inStock: p.agotado !== true, // siempre en stock salvo que el admin lo marque agotado
      tags,
      genres: [...new Set([...classify(tags.join(' '), GENRE_MAP), ...(e ? classify(e.genres.join(' '), GENRE_MAP) : [])])],
      themes: classify(text, THEMES),
      modes: e ? classify(e.categories.join(' | '), MODE_MAP) : (tags.some((t) => /multijugador/i.test(t)) ? ['multijugador'] : []),
      developers: e ? e.developers : [],
      publishers: e ? e.publishers : [],
      description: String(p.description || '').replace(/\s+/g, ' ').trim(),
      short: e ? e.short : '',
      year: null,
      tier: null,
      switchCompat: p.switchCompat || p.switchCompatibility || null,
      source: 'firestore',
    });
  });

  steam.forEach((s) => {
    const appId = String(s.app_id || '');
    if (!appId || seenSteamIds.has(appId)) return;
    seenSteamIds.add(appId);
    const e = enrichment[appId] && !enrichment[appId].missing ? enrichment[appId] : null;
    const name = displayName(s.name || '');
    const id = `steam_${appId}`;
    const priceCLP = num(s.priceCLP) || 2000;
    const tags = (s.tags || []).map(String);
    const text = [name, e ? `${e.genres.join(' ')} ${e.short}` : ''].join(' ');
    products.push({
      id,
      appId,
      name,
      url: `/producto/${slugify(name) || id}--${id}`,
      image: s.imageUrl || s.image || `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
      platform: 'steam',
      categoryName: 'Juegos Steam',
      priceCLP,
      priceUSD: num(s.priceUSD) || Math.round((priceCLP / DOLAR) * 100) / 100,
      inStock: true,
      tags,
      genres: e ? classify(e.genres.join(' '), GENRE_MAP) : [],
      themes: classify(text, THEMES),
      modes: e ? classify(e.categories.join(' | '), MODE_MAP) : [],
      developers: e ? e.developers : [],
      publishers: e ? e.publishers : [],
      description: '',
      short: e ? e.short : '',
      metacritic: e ? e.metacritic : null,
      release: e ? e.release : '',
      year: /^\d{4}$/.test(String(s.anio || '')) ? Number(s.anio) : null,
      tier: tags.includes('Estreno') || s.isDenuvoActivation ? 'estreno' : (/premium/i.test(s.genero || '') ? 'premium' : 'normal'),
      idioma: s.idioma || '',
      source: 'steam',
    });
  });

  return products;
}

module.exports = { loadCatalog, slugify, norm, nameKey, DOLAR };
