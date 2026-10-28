const fs = require('fs');
const https = require('https');

const PROJECT_ID = 'pandastoreupdate';
const URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/products`;
const SITEMAP_PATH = './public/sitemap.xml';
const SITE_URL = 'https://pandastoregaming.cl';

async function fetchProducts() {
  return new Promise((resolve, reject) => {
    https.get(URL, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.documents || []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function generateSitemap() {
  console.log('Generando sitemap...');
  try {
    const products = await fetchProducts();
    
    const today = new Date().toISOString().slice(0, 10);
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Rutas Estáticas y Categorías Principales -->
  <url>
    <loc>https://pandastoregaming.cl/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://pandastoregaming.cl/categoria/steam</loc>
    <changefreq>daily</changefreq>
    <priority>0.95</priority>
  </url>
  <url>
    <loc>https://pandastoregaming.cl/categoria/nintendo-switch</loc>
    <changefreq>daily</changefreq>
    <priority>0.95</priority>
  </url>
  <url>
    <loc>https://pandastoregaming.cl/categoria/playstation</loc>
    <changefreq>daily</changefreq>
    <priority>0.95</priority>
  </url>
  <url>
    <loc>https://pandastoregaming.cl/categoria/suscripciones</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://pandastoregaming.cl/promos</loc>
  </url>
  <url>
    <loc>https://pandastoregaming.cl/sagas</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://pandastoregaming.cl/packs-nintendo</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://pandastoregaming.cl/descargar-launcher</loc>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://pandastoregaming.cl/instalacion-activador</loc>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://pandastoregaming.cl/instalacion-nintendo</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://pandastoregaming.cl/instalacion-playstation</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://pandastoregaming.cl/preguntas-frecuentes</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://pandastoregaming.cl/testimonios</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://pandastoregaming.cl/categorias</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://pandastoregaming.cl/productos</loc>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://pandastoregaming.cl/sobre-nosotros</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://pandastoregaming.cl/terminos</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <!-- Fin Rutas Principales -->

  <!-- Rutas de Productos Dinámicas -->
`;

    products.forEach(doc => {
      const docPath = doc.name.split('/');
      const productId = docPath[docPath.length - 1];
      
      const name = doc.fields?.name?.stringValue || productId;
      const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
      const lastmod = doc.updateTime ? String(doc.updateTime).slice(0, 10) : today;
      xml += `  <url>
    <loc>${SITE_URL}/producto/${slug}--${productId}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
    });

    xml += `</urlset>`;

    fs.writeFileSync(SITEMAP_PATH, xml, 'utf8');
    console.log(`✅ Sitemap generado con éxito en ${SITEMAP_PATH} con ${products.length} productos.`);
  } catch (error) {
    console.error('❌ Error al generar el sitemap:', error);
  }
}

generateSitemap();
