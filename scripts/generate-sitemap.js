/**
 * generate-sitemap.js — `npm run sitemap`
 * Genera public/sitemap.xml con las páginas estáticas, todas las categorías y TODO el catálogo de
 * productos de Firestore (paginado: la API REST devuelve máximo 300 documentos por página).
 * Las URLs usan el mismo slug que src/utils/slugify.js para coincidir con los enlaces del sitio.
 */
const fs = require('fs');
const https = require('https');

const PROJECT_ID = 'pandastoreupdate';
const API = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const SITEMAP_PATH = './public/sitemap.xml';
const SITE_URL = 'https://pandastoregaming.cl';

// Copia de slugify() en src/utils/slugify.js (este script corre en Node, fuera del bundle)
function slugify(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function fetchAll(collection) {
  const docs = [];
  let pageToken = '';
  do {
    const json = await getJson(`${API}/${collection}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`);
    docs.push(...(json.documents || []));
    pageToken = json.nextPageToken || '';
  } while (pageToken);
  return docs;
}

const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function urlEntry(path, { lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${escapeXml(SITE_URL + path)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    '  </url>',
  ].filter(Boolean).join('\n');
}

// Páginas estáticas indexables (sin redirecciones ni rutas privadas bloqueadas en robots.txt)
const STATIC_PAGES = [
  ['/', 'daily', '1.0'],
  ['/promos', 'daily', '0.9'],
  ['/sagas', 'daily', '0.9'],
  ['/packs-nintendo', 'daily', '0.9'],
  ['/desarrollo-web', 'weekly', '0.9'],
  ['/descargar-launcher', 'weekly', '0.85'],
  ['/productos', 'daily', '0.85'],
  ['/categorias', 'weekly', '0.8'],
  ['/instalacion-nintendo', 'weekly', '0.8'],
  ['/instalacion-playstation', 'weekly', '0.8'],
  ['/preguntas-frecuentes', 'weekly', '0.8'],
  ['/testimonios', 'weekly', '0.8'],
  ['/provedores', 'weekly', '0.7'],
  ['/sobre-nosotros', 'monthly', '0.6'],
  ['/terminos', 'monthly', '0.5'],
];

async function generateSitemap() {
  console.log('Generando sitemap...');
  try {
    const [products, categories] = await Promise.all([fetchAll('products'), fetchAll('categories')]);
    const today = new Date().toISOString().slice(0, 10);
    const entries = [];

    STATIC_PAGES.forEach(([path, changefreq, priority]) => entries.push(urlEntry(path, { lastmod: today, changefreq, priority })));

    const categoryPaths = new Set();
    categories.forEach((doc) => {
      const name = doc.fields?.name?.stringValue;
      const slug = slugify(name);
      if (!slug || categoryPaths.has(slug)) return;
      categoryPaths.add(slug);
      entries.push(urlEntry(`/categoria/${slug}`, { lastmod: today, changefreq: 'daily', priority: '0.95' }));
    });

    let productCount = 0;
    products.forEach((doc) => {
      const productId = doc.name.split('/').pop();
      const name = doc.fields?.name?.stringValue || productId;
      const slug = slugify(name);
      const lastmod = doc.updateTime ? String(doc.updateTime).slice(0, 10) : today;
      entries.push(urlEntry(`/producto/${slug}--${productId}`, { lastmod, changefreq: 'weekly', priority: '0.8' }));
      productCount++;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
    fs.writeFileSync(SITEMAP_PATH, xml, 'utf8');
    console.log(`✅ Sitemap generado en ${SITEMAP_PATH}: ${STATIC_PAGES.length} páginas, ${categoryPaths.size} categorías y ${productCount} productos.`);
  } catch (error) {
    console.error('❌ Error al generar el sitemap:', error);
    process.exitCode = 1;
  }
}

generateSitemap();
