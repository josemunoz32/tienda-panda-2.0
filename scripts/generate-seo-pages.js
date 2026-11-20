/**
 * generate-seo-pages.js — se ejecuta en "postbuild", después de prerender-home.js.
 *
 * Genera con el catálogo REAL de la tienda:
 *  - Páginas de aterrizaje /juegos/<slug> (plataforma, género, tema, modo, saga, desarrolladora,
 *    precio, año y versiones por país de Latinoamérica). Solo se publica una página si tiene al
 *    menos MIN_PRODUCTS juegos y si su lista no es idéntica a otra (evita contenido duplicado).
 *  - Hub /juegos con todas las páginas, guías /guias/<slug> y hub /guias.
 *  - Fichas estáticas de los juegos de Steam (/producto/<slug>--steam_<id>), que antes no tenían
 *    metadatos propios porque no viven en Firestore.
 *  - seo-data/*.json para que React muestre la misma página de forma interactiva.
 *  - sitemap.xml (índice) + sitemaps por tipo, con imágenes.
 *
 * Los archivos se escriben como build/<ruta>.html: firebase.json usa "cleanUrls", así que
 * /juegos/steam-accion sirve build/juegos/steam-accion.html antes de los rewrites.
 */
const fs = require('fs');
const path = require('path');
const { loadCatalog, slugify, norm, DOLAR } = require('./seo/catalog');
const { PLATFORMS, GROUPS, SAGAS, COUNTRIES, CHILE_PAYMENTS } = require('./seo/content');
const GUIDES = require('./seo/guides');

const SITE = 'https://pandastoregaming.cl';
const BUILD = path.join(__dirname, '..', 'build');
const MIN_PRODUCTS = 6;
const HTML_LIST_LIMIT = 60;   // juegos listados en el HTML estático
const JSON_LIST_LIMIT = 150;  // juegos que recibe la vista React
const TODAY = new Date().toISOString().slice(0, 10);
const YEAR = new Date().getFullYear();

const esc = (s) => String(s ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const clp = (n) => `$${Math.round(n).toLocaleString('es-CL')}`;
const usd = (n) => `US$${Number(n).toFixed(2)}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const clip = (s, max) => (s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, '')}…`);
const listNames = (items, n = 4) => {
  const names = items.slice(0, n).map((p) => p.name);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}` : names[0] || '';
};

function writeFile(rel, content) {
  const file = path.join(BUILD, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// ───────────────────────── Definición de páginas ─────────────────────────

const GAME_PLATFORMS = ['steam', 'switch', 'switch2', 'ps5', 'ps4'];
const isGame = (p) => GAME_PLATFORMS.includes(p.platform);
const byPrice = (a, b) => (a.priceCLP || 9e9) - (b.priceCLP || 9e9);
// Orden "destacados": juegos con descripción/metacritic primero, luego por precio
const byFeatured = (a, b) => (b.metacritic || 0) - (a.metacritic || 0) || ((b.short || b.description ? 1 : 0) - (a.short || a.description ? 1 : 0)) || byPrice(a, b);

function buildDefinitions(products) {
  const games = products.filter(isGame).filter((p) => p.inStock);
  const plat = (key) => games.filter((p) => p.platform === key);
  const playstation = games.filter((p) => p.platform === 'ps5' || p.platform === 'ps4');
  const nintendo = games.filter((p) => p.platform === 'switch' || p.platform === 'switch2');
  const defs = [];
  const add = (d) => defs.push({ sort: byFeatured, ...d });

  // 1) Páginas principales por búsqueda (las que compiten por las palabras clave grandes)
  const hubs = [
    { slug: 'juegos-digitales-chile', h1: 'Juegos digitales en Chile', kw: 'juegos digitales', items: games, platform: null, family: 'principal' },
    { slug: 'juegos-digitales-baratos-chile', h1: 'Juegos digitales baratos en Chile', kw: 'juegos digitales baratos', items: games, sort: byPrice, platform: null, family: 'principal' },
    { slug: 'juegos-steam-chile', h1: 'Juegos de Steam en Chile', kw: 'juegos Steam', items: plat('steam'), platform: 'steam', family: 'principal' },
    { slug: 'juegos-steam-baratos-chile', h1: 'Juegos de Steam baratos en Chile', kw: 'juegos Steam baratos', items: plat('steam'), sort: byPrice, platform: 'steam', family: 'principal' },
    { slug: 'juegos-pc-baratos-chile', h1: 'Juegos de PC baratos en Chile', kw: 'juegos PC baratos', items: plat('steam'), sort: byPrice, platform: 'steam', family: 'principal' },
    { slug: 'juegos-nintendo-switch-digitales-chile', h1: 'Juegos de Nintendo Switch digitales en Chile', kw: 'juegos Nintendo Switch', items: plat('switch'), platform: 'switch', family: 'principal' },
    { slug: 'juegos-nintendo-switch-baratos-chile', h1: 'Juegos de Nintendo Switch baratos en Chile', kw: 'juegos Switch baratos', items: plat('switch'), sort: byPrice, platform: 'switch', family: 'principal' },
    { slug: 'juegos-nintendo-chile', h1: 'Juegos de Nintendo digitales en Chile', kw: 'juegos Nintendo', items: nintendo, platform: 'switch', family: 'principal' },
    { slug: 'juegos-nintendo-switch-2-chile', h1: 'Juegos de Nintendo Switch 2 en Chile', kw: 'juegos Nintendo Switch 2', items: plat('switch2'), platform: 'switch2', family: 'principal' },
    { slug: 'juegos-ps5-digitales-chile', h1: 'Juegos de PS5 digitales en Chile', kw: 'juegos PS5', items: plat('ps5'), platform: 'ps5', family: 'principal' },
    { slug: 'juegos-ps5-baratos-chile', h1: 'Juegos de PS5 baratos en Chile', kw: 'juegos PS5 baratos', items: plat('ps5'), sort: byPrice, platform: 'ps5', family: 'principal' },
    { slug: 'juegos-ps4-digitales-chile', h1: 'Juegos de PS4 digitales en Chile', kw: 'juegos PS4', items: plat('ps4'), platform: 'ps4', family: 'principal' },
    { slug: 'juegos-ps4-baratos-chile', h1: 'Juegos de PS4 baratos en Chile', kw: 'juegos PS4 baratos', items: plat('ps4'), sort: byPrice, platform: 'ps4', family: 'principal' },
    { slug: 'juegos-playstation-digitales-chile', h1: 'Juegos de PlayStation digitales en Chile', kw: 'juegos PlayStation', items: playstation, platform: 'ps5', family: 'principal' },
    { slug: 'juegos-steam-estrenos', h1: 'Estrenos de Steam: juegos nuevos para PC', kw: 'estrenos Steam', items: plat('steam').filter((p) => p.tier === 'estreno'), platform: 'steam', family: 'principal' },
  ];
  hubs.forEach((h) => add({ ...h, group: null, country: null }));

  // 2) Plataforma × género / tema / modo
  const platformKeys = ['steam', 'switch', 'ps5', 'ps4'];
  const facetKeys = Object.keys(GROUPS);
  platformKeys.forEach((pk) => {
    const pdef = PLATFORMS[pk];
    facetKeys.forEach((g) => {
      const items = plat(pk).filter((p) => p.genres.includes(g) || p.themes.includes(g) || p.modes.includes(g));
      add({ slug: `${pdef.slug}-${g}`, h1: `Juegos ${GROUPS[g][0]} para ${pdef.label}`, kw: `juegos ${GROUPS[g][0]} ${pdef.short}`, items, platform: pk, group: g, family: 'genero' });
    });
  });
  // PlayStation combinado por género
  facetKeys.forEach((g) => {
    const items = playstation.filter((p) => p.genres.includes(g) || p.themes.includes(g) || p.modes.includes(g));
    add({ slug: `playstation-${g}`, h1: `Juegos ${GROUPS[g][0]} para PlayStation (PS5 y PS4)`, kw: `juegos ${GROUPS[g][0]} PlayStation`, items, platform: 'ps5', group: g, family: 'genero' });
  });

  // 3) Género/tema en todas las plataformas
  facetKeys.forEach((g) => {
    const items = games.filter((p) => p.genres.includes(g) || p.themes.includes(g) || p.modes.includes(g));
    add({ slug: slugify(`juegos ${GROUPS[g][0].replace(/\(.*?\)/g, '')}`), h1: `Juegos ${GROUPS[g][0]} digitales`, kw: `juegos ${GROUPS[g][0]}`, items, platform: null, group: g, family: 'genero' });
  });

  // 4) Sagas: todas las plataformas y por plataforma
  SAGAS.forEach(([slug, label, re]) => {
    const all = games.filter((p) => re.test(norm(p.name)));
    add({ slug: `saga-${slug}`, h1: `Juegos de ${label}`, kw: `juegos ${label}`, items: all, platform: null, saga: label, family: 'saga' });
    platformKeys.forEach((pk) => {
      add({ slug: `${slug}-${PLATFORMS[pk].slug}`, h1: `Juegos de ${label} para ${PLATFORMS[pk].label}`, kw: `${label} ${PLATFORMS[pk].short}`, items: all.filter((p) => p.platform === pk), platform: pk, saga: label, family: 'saga' });
    });
  });

  // 5) Desarrolladoras y editoras (datos públicos de Steam)
  const companies = new Map();
  const cleanCompany = (c) => String(c).replace(/,?\s*(inc\.?|co\.?,?\s*ltd\.?|ltd\.?|llc|s\.?a\.?|gmbh|corporation|corp\.?|entertainment|games|studios?)$/gi, '').replace(/,?\s*(inc\.?|co\.?,?\s*ltd\.?|ltd\.?|llc|s\.?a\.?)$/gi, '').trim();
  games.forEach((p) => [...new Set([...p.developers, ...p.publishers].map(cleanCompany))].forEach((c) => {
    const key = slugify(c);
    if (!key) return;
    const entry = companies.get(key) || { name: c, items: [] };
    entry.items.push(p);
    companies.set(key, entry);
  }));
  companies.forEach((entry, key) => {
    add({ slug: `juegos-de-${key}`, h1: `Juegos de ${entry.name}`, kw: `juegos ${entry.name}`, items: entry.items, platform: null, company: entry.name, family: 'desarrolladora' });
  });

  // 6) Rangos de precio por plataforma
  const priceSteps = { steam: [2000, 3000, 5000, 8000], switch: [10000, 15000, 20000, 25000, 30000], ps5: [15000, 20000, 25000, 30000], ps4: [8000, 10000, 15000, 20000] };
  Object.entries(priceSteps).forEach(([pk, steps]) => steps.forEach((max) => {
    add({ slug: `${PLATFORMS[pk].slug}-hasta-${max}-pesos`, h1: `Juegos de ${PLATFORMS[pk].label} hasta ${clp(max)}`, kw: `juegos ${PLATFORMS[pk].short} baratos`, items: plat(pk).filter((p) => p.priceCLP && p.priceCLP <= max), sort: byPrice, platform: pk, maxPrice: max, family: 'precio' });
  }));

  // 7) Año de lanzamiento (Steam)
  const years = [...new Set(plat('steam').map((p) => p.year).filter(Boolean))];
  years.forEach((y) => add({ slug: `juegos-steam-${y}`, h1: `Juegos de Steam ${y}`, kw: `juegos Steam ${y}`, items: plat('steam').filter((p) => p.year === y), platform: 'steam', year: y, family: 'ano' }));

  // 8) Latinoamérica: versiones por país de las páginas principales
  const countryBases = hubs.filter((h) => !/estrenos|nintendo-chile/.test(h.slug));
  COUNTRIES.forEach((c) => countryBases.forEach((h) => {
    add({ ...h, slug: h.slug.replace(/-chile$/, `-${c.slug}`), h1: h.h1.replace(/ en Chile$/, ` en ${c.name}`), country: c, base: h.slug, family: 'pais' });
  }));

  return defs;
}

// ───────────────────────── Textos de cada página ─────────────────────────

function pageCopy(def, items) {
  const pdef = def.platform ? PLATFORMS[def.platform] : null;
  const where = def.country ? def.country.name : 'Chile';
  const priced = items.filter((p) => p.priceCLP);
  const minCLP = priced.length ? Math.min(...priced.map((p) => p.priceCLP)) : null;
  const minUSD = items.filter((p) => p.priceUSD).reduce((m, p) => Math.min(m, p.priceUSD), Infinity);
  const priceFrom = def.country ? (Number.isFinite(minUSD) ? usd(minUSD) : null) : (minCLP ? `${clp(minCLP)} CLP` : null);
  const platformsIn = [...new Set(items.map((p) => PLATFORMS[p.platform]?.label).filter(Boolean))];
  const count = items.length;

  // Título sin cortes: se agrega el precio solo si cabe
  const shortFrom = priceFrom ? priceFrom.replace(' CLP', '') : null;
  const title = [shortFrom ? `${def.h1} desde ${shortFrom} | PandaStore` : null, `${def.h1} | PandaStore`, def.h1]
    .filter(Boolean).find((t) => t.length <= 68) || clip(def.h1, 68);
  const deliveryShort = def.platform === 'steam' ? 'Entrega inmediata 24/7.' : (pdef ? 'Entrega en 1 a 9 horas.' : 'Entrega digital y soporte por WhatsApp.');
  const description = clip(`${count} ${def.kw} ${def.country ? `para ${where}` : 'en Chile'}${priceFrom ? ` desde ${priceFrom}` : ''}: ${listNames(items, 3)} y más. ${deliveryShort}`, 158);

  const intro = [];
  intro.push(`En PandaStore encuentras ${count} ${def.kw} disponibles hoy${def.country ? ` para jugadores de ${where}` : ' en Chile'}${priceFrom ? `, con precios desde ${priceFrom}` : ''}. Entre los títulos de esta lista están ${listNames(items, 5)}.`);
  if (def.group && GROUPS[def.group]) intro.push(GROUPS[def.group][1]);
  if (def.saga) intro.push(`Reunimos en una sola página los juegos de la saga ${def.saga} que puedes comprar en formato digital${platformsIn.length ? ` para ${platformsIn.join(', ')}` : ''}, para que compares versiones y precios sin buscar uno por uno.`);
  if (def.company) intro.push(`Estos son los juegos desarrollados o publicados por ${def.company} disponibles en nuestro catálogo, con su precio actual.`);
  if (def.maxPrice) intro.push(`Todos los juegos de esta lista cuestan ${clp(def.maxPrice)} o menos. Están ordenados del más barato al más caro.`);
  if (def.year) intro.push(`Juegos de Steam del año ${def.year} disponibles en la tienda, para mantenerte al día con los lanzamientos.`);
  if (pdef) intro.push(`${pdef.how} ${pdef.delivery}`);
  else intro.push('Cada juego indica su plataforma: los de Steam se activan en PC con el PandaStore Launcher y se entregan de inmediato; los de Nintendo y PlayStation se entregan mediante un usuario externo, normalmente en 1 a 9 horas.');
  intro.push(def.country
    ? `Desde ${where} puedes pagar con ${def.country.payments}. Los precios de referencia se muestran en dólares (USD).`
    : `En Chile puedes pagar con ${CHILE_PAYMENTS}, con precios en pesos chilenos.`);

  const faq = [
    [`¿Cuánto cuestan los ${def.kw} en PandaStore?`, priceFrom ? `Los precios parten desde ${priceFrom}. Esta página muestra ${count} juegos con su precio actualizado.` : `Esta página muestra ${count} juegos con su precio actualizado.`],
    ['¿Cómo recibo el juego?', pdef ? `${pdef.how} ${pdef.delivery}` : 'Los juegos de Steam se activan con PandaStore Launcher y la entrega es inmediata. Los de Nintendo y PlayStation se entregan mediante un usuario externo en 1 a 9 horas.'],
    [def.country ? `¿Puedo comprar desde ${where}?` : '¿Qué medios de pago aceptan?', def.country ? `Sí. Desde ${where} puedes pagar con ${def.country.payments}.` : `En Chile aceptamos ${CHILE_PAYMENTS}. Desde el resto de Latinoamérica se aceptan PayPal, Prex y USDT.`],
    ['¿Los juegos tienen garantía y soporte?', 'Sí. Todas las compras tienen soporte por WhatsApp y garantía de activación; si tienes un problema, el equipo te ayuda hasta dejar el juego funcionando.'],
  ];
  return { title, description, intro, faq, priceFrom, count };
}

// ───────────────────────── HTML ─────────────────────────

function shellWith(shell, { title, description, canonical, image, ogType = 'website', jsonLd, main, alternates = [], locale = 'es_CL', robots = 'index, follow, max-snippet:-1, max-image-preview:large' }) {
  const safeTitle = esc(title);
  const safeDesc = esc(description);
  const head = `<title>${safeTitle}</title>
    <link rel="canonical" href="${canonical}" />
    <meta name="description" content="${safeDesc}" />
    <meta name="robots" content="${robots}" />
    ${alternates.map(([lang, href]) => `<link rel="alternate" hreflang="${lang}" href="${href}" />`).join('\n    ')}
    <meta property="og:type" content="${ogType}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${esc(image || `${SITE}/banner.png`)}" />
    <meta property="og:site_name" content="PandaStore Gaming" />
    <meta property="og:locale" content="${locale}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${esc(image || `${SITE}/banner.png`)}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`;
  return shell
    .replace(/<meta\s+(?:name="(?:description|keywords|robots|twitter:[^"]*)"|property="og:[^"]*")[^>]*>\s*/gi, '')
    .replace(/<link rel="alternate" hreflang="[^"]*"[^>]*>\s*/gi, '')
    .replace(/<link rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<script type="application\/ld\+json">\s*\{\s*"@context":\s*"https:\/\/schema\.org",\s*"@type":\s*"(?:FAQPage|ItemList|WebPage|CollectionPage|BreadcrumbList)"[\s\S]*?<\/script>\s*/g, '')
    .replace(/<title>[\s\S]*?<\/title>/i, () => head)
    .replace(/<main>[\s\S]*?<\/main>/, () => main);
}

const priceLabel = (p, country) => (country ? (p.priceUSD ? usd(p.priceUSD) : '') : (p.priceCLP ? `${clp(p.priceCLP)} CLP` : ''));

function productListHtml(items, country) {
  return `<ul class="seo-product-list">${items.slice(0, HTML_LIST_LIMIT).map((p) => `<li><a href="${esc(p.url)}"><img src="${esc(p.image)}" alt="${esc(`${p.name} ${PLATFORMS[p.platform]?.label || ''}`)}" loading="lazy" width="184" height="86" /><span>${esc(p.name)}</span> <small>${esc(PLATFORMS[p.platform]?.label || '')}</small> <b>${esc(priceLabel(p, country))}</b></a></li>`).join('')}</ul>`;
}

function breadcrumbLd(trail) {
  return { '@type': 'BreadcrumbList', itemListElement: trail.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE}${url}` })) };
}
const faqLd = (faq) => ({ '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

function productLd(p, country) {
  const price = country ? p.priceUSD : p.priceCLP;
  return {
    '@type': 'Product',
    name: p.name,
    image: p.image ? [p.image] : undefined,
    url: `${SITE}${p.url}`,
    sku: p.id,
    category: PLATFORMS[p.platform]?.label,
    brand: p.publishers?.[0] ? { '@type': 'Brand', name: p.publishers[0] } : undefined,
    offers: price ? {
      '@type': 'Offer', price: String(price), priceCurrency: country ? 'USD' : 'CLP',
      availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition',
      url: `${SITE}${p.url}`, seller: { '@type': 'Organization', name: 'PandaStore Chile' },
    } : undefined,
  };
}

// ───────────────────────── Generación ─────────────────────────

async function main() {
  const appHtml = path.join(BUILD, 'app.html');
  if (!fs.existsSync(appHtml)) throw new Error('No existe build/app.html (ejecuta primero el build y prerender-home).');
  const shell = fs.readFileSync(appHtml, 'utf8');

  const products = await loadCatalog();
  // Steam: mismo precio que la tienda (lista VIP manda + promoción -20%). Solo juegos de Steam.
  const { getSteamListPrice: steamList, steamPromoPrice: steamPromo } = requireSrc('utils/vipGames.js');
  products.forEach((p) => {
    if (p.platform !== 'steam') return;
    const list = steamList({ app_id: p.appId, name: p.name, priceCLP: p.priceCLP });
    p.listPriceCLP = list;
    p.priceCLP = steamPromo(list);
    p.priceUSD = Math.round((p.priceCLP / 900) * 100) / 100;
  });
  const games = products.filter(isGame);
  console.log(`[seo] catálogo: ${products.length} productos (${games.length} juegos)`);

  // Resolver definiciones → páginas válidas, sin listas duplicadas
  const defs = buildDefinitions(products);
  const signatures = new Map();
  const pages = [];
  defs.forEach((def) => {
    const items = [...new Map(def.items.map((p) => [p.id, p])).values()].sort(def.sort);
    if (items.length < MIN_PRODUCTS) return;
    if (pages.some((p) => p.slug === def.slug)) return;
    // Las páginas por país comparten lista con su base a propósito (otra moneda/idioma regional)
    const sig = `${def.country ? def.country.code : ''}|${items.map((p) => p.id).sort().join(',')}`;
    if (signatures.has(sig) && def.family !== 'principal' && def.family !== 'pais') return;
    signatures.set(sig, def.slug);
    pages.push({ ...def, items });
  });

  // Enlaces relacionados: mismas plataforma/grupo/saga, priorizando páginas principales
  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  const related = (page) => {
    const sameCountry = pages.filter((p) => p !== page && (p.country?.code || null) === (page.country?.code || null));
    const score = (p) => (p.family === 'principal' ? 3 : 0) + (p.platform && p.platform === page.platform ? 2 : 0) + (p.group && p.group === page.group ? 3 : 0) + (p.saga && p.saga === page.saga ? 4 : 0);
    return sameCountry.map((p) => [score(p), p]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0] || b[1].items.length - a[1].items.length).slice(0, 12).map(([, p]) => p);
  };

  // Mapa juego → páginas donde aparece (para enlaces internos desde fichas de producto)
  const productLinks = {};

  pages.forEach((page) => {
    const copy = pageCopy(page, page.items);
    page.copy = copy;
    const url = `/juegos/${page.slug}`;
    const canonical = `${SITE}${url}`;
    const rel = related(page);
    // hreflang entre la versión chilena y sus versiones por país
    const baseSlug = page.base || page.slug;
    const variants = pages.filter((p) => (p.base || p.slug) === baseSlug && (p.family === 'pais' || p.slug === baseSlug));
    const alternates = variants.length > 1 ? [
      ...variants.map((v) => [v.country ? v.country.hreflang : 'es-CL', `${SITE}/juegos/${v.slug}`]),
      ['x-default', `${SITE}/juegos/${baseSlug}`],
    ] : [];
    const trail = [['Inicio', '/'], ['Juegos', '/juegos'], [page.h1, url]];
    const main = `<main>
      <nav aria-label="Ruta de navegación"><a href="/">Inicio</a> › <a href="/juegos">Juegos</a> › <span>${esc(page.h1)}</span></nav>
      <article>
        <h1>${esc(page.h1)}</h1>
        ${copy.intro.map((t) => `<p>${esc(t)}</p>`).join('\n        ')}
        <h2>${esc(page.h1)}: ${copy.count} juegos disponibles</h2>
        ${productListHtml(page.items, page.country)}
        <h2>Preguntas frecuentes</h2>
        ${copy.faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('\n        ')}
        <h2>También te puede interesar</h2>
        <ul>${rel.map((r) => `<li><a href="/juegos/${r.slug}">${esc(r.h1)}</a></li>`).join('')}</ul>
      </article>
    </main>`;
    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'CollectionPage', name: page.h1, description: copy.description, url: canonical, inLanguage: page.country ? page.country.hreflang : 'es-CL', isPartOf: { '@type': 'WebSite', name: 'PandaStore Gaming', url: SITE } },
        { '@type': 'ItemList', name: page.h1, numberOfItems: page.items.length, itemListElement: page.items.slice(0, 30).map((p, i) => ({ '@type': 'ListItem', position: i + 1, item: productLd(p, page.country) })) },
        breadcrumbLd(trail),
        faqLd(copy.faq),
      ],
    };
    writeFile(`juegos/${page.slug}.html`, shellWith(shell, {
      title: copy.title, description: copy.description, canonical, image: page.items[0]?.image, jsonLd, main, alternates,
      locale: page.country ? page.country.hreflang.replace('-', '_').replace('419', 'LA') : 'es_CL',
    }));
    writeFile(`seo-data/juegos/${page.slug}.json`, JSON.stringify({
      slug: page.slug, h1: page.h1, title: copy.title, description: copy.description, intro: copy.intro, faq: copy.faq,
      currency: page.country ? 'USD' : 'CLP', country: page.country ? page.country.name : null,
      related: rel.map((r) => ({ slug: r.slug, h1: r.h1 })),
      items: page.items.slice(0, JSON_LIST_LIMIT).map((p) => ({ id: p.id, name: p.name, url: p.url, image: p.image, platform: PLATFORMS[p.platform]?.label || '', priceCLP: p.priceCLP, priceUSD: p.priceUSD })),
      total: page.items.length,
    }));
    if (!page.country) page.items.forEach((p) => {
      const list = productLinks[p.id] || (productLinks[p.id] = []);
      list.push({ slug: page.slug, h1: page.h1, family: page.family, n: page.items.length });
    });
  });

  // Fichas: priorizar sagas y géneros específicos (listas más pequeñas = más relevantes)
  const familyRank = { saga: 0, genero: 1, desarrolladora: 2, precio: 3, ano: 4, principal: 5 };
  Object.keys(productLinks).forEach((id) => {
    productLinks[id] = productLinks[id].sort((a, b) => familyRank[a.family] - familyRank[b.family] || a.n - b.n).slice(0, 8).map(({ slug, h1 }) => ({ slug, h1 }));
  });
  writeFile('seo-data/product-links.json', JSON.stringify(productLinks));

  // Hub /juegos
  const FAMILY_TITLES = { principal: 'Lo más buscado', genero: 'Por género y modo de juego', saga: 'Por saga', desarrolladora: 'Por desarrolladora', precio: 'Por precio', ano: 'Por año', pais: 'Latinoamérica' };
  const groups = Object.entries(FAMILY_TITLES).map(([family, title]) => ({ family, title, pages: pages.filter((p) => p.family === family).map((p) => ({ slug: p.slug, h1: p.h1, n: p.items.length })) })).filter((g) => g.pages.length);
  writeFile('seo-data/juegos/index.json', JSON.stringify({ groups, total: pages.length }));
  const hubMain = `<main>
      <nav aria-label="Ruta de navegación"><a href="/">Inicio</a> › <span>Juegos</span></nav>
      <h1>Todos los juegos digitales por plataforma, género y saga</h1>
      <p>Explora el catálogo de PandaStore organizado en ${pages.length} listas: juegos de Steam, Nintendo Switch, PS5 y PS4 por género, saga, desarrolladora, precio y país.</p>
      ${groups.map((g) => `<h2>${esc(g.title)}</h2><ul>${g.pages.map((p) => `<li><a href="/juegos/${p.slug}">${esc(p.h1)}</a> (${p.n})</li>`).join('')}</ul>`).join('\n      ')}
    </main>`;
  writeFile('juegos.html', shellWith(shell, {
    title: 'Juegos digitales por plataforma, género y saga | PandaStore',
    description: `Explora ${pages.length} listas de juegos digitales para Steam, Nintendo Switch, PS5 y PS4: por género, saga, precio y país. Precios en pesos chilenos.`,
    canonical: `${SITE}/juegos`, jsonLd: { '@context': 'https://schema.org', '@graph': [{ '@type': 'CollectionPage', name: 'Juegos digitales', url: `${SITE}/juegos` }, breadcrumbLd([['Inicio', '/'], ['Juegos', '/juegos']])] }, main: hubMain,
  }));

  // Guías
  const guideItems = (filter) => {
    const g = games.filter((p) => p.inStock);
    const map = {
      all: g.slice().sort(byPrice), steam: g.filter((p) => p.platform === 'steam').sort(byFeatured), 'steam-cheap': g.filter((p) => p.platform === 'steam').sort(byPrice),
      'steam-indie': g.filter((p) => p.platform === 'steam' && p.genres.includes('indie')).sort(byFeatured), switch: g.filter((p) => p.platform === 'switch').sort(byFeatured),
      ps5: g.filter((p) => p.platform === 'ps5').sort(byFeatured), coop: g.filter((p) => p.modes.includes('cooperativo') || p.modes.includes('multijugador')).sort(byFeatured),
    };
    return (map[filter] || []).slice(0, 12);
  };
  const validJuegos = new Set(pages.map((p) => `/juegos/${p.slug}`));
  GUIDES.forEach((g) => {
    const items = g.dynamic ? guideItems(g.dynamic.filter) : [];
    const links = g.links.filter(([href]) => !href.startsWith('/juegos/') || validJuegos.has(href));
    const url = `/guias/${g.slug}`;
    const main = `<main>
      <nav aria-label="Ruta de navegación"><a href="/">Inicio</a> › <a href="/guias">Guías</a> › <span>${esc(g.title)}</span></nav>
      <article>
        <h1>${esc(g.title)}</h1>
        <p>${esc(g.description)}</p>
        ${g.sections.map(([h, ps]) => `<h2>${esc(h)}</h2>${ps.map((t) => `<p>${esc(t)}</p>`).join('')}`).join('\n        ')}
        ${items.length ? `<h2>${esc(g.dynamic.title)}</h2>${productListHtml(items)}` : ''}
        ${g.faq.length ? `<h2>Preguntas frecuentes</h2>${g.faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}` : ''}
        <h2>Enlaces útiles</h2><ul>${links.map(([href, label]) => `<li><a href="${href}">${esc(label)}</a></li>`).join('')}</ul>
      </article>
    </main>`;
    const jsonLd = { '@context': 'https://schema.org', '@graph': [
      { '@type': 'Article', headline: g.title, description: g.description, inLanguage: 'es-CL', datePublished: TODAY, dateModified: TODAY, author: { '@type': 'Organization', name: 'PandaStore Gaming' }, publisher: { '@type': 'Organization', name: 'PandaStore Gaming', logo: { '@type': 'ImageObject', url: `${SITE}/icon-512.png` } }, mainEntityOfPage: `${SITE}${url}` },
      breadcrumbLd([['Inicio', '/'], ['Guías', '/guias'], [g.title, url]]),
      ...(g.faq.length ? [faqLd(g.faq)] : []),
    ] };
    writeFile(`guias/${g.slug}.html`, shellWith(shell, { title: clip(`${g.title} | PandaStore`, 70), description: g.description, canonical: `${SITE}${url}`, ogType: 'article', jsonLd, main, image: items[0]?.image }));
    writeFile(`seo-data/guias/${g.slug}.json`, JSON.stringify({ ...g, links, items: items.map((p) => ({ id: p.id, name: p.name, url: p.url, image: p.image, platform: PLATFORMS[p.platform]?.label || '', priceCLP: p.priceCLP, priceUSD: p.priceUSD })) }));
  });
  writeFile('seo-data/guias/index.json', JSON.stringify(GUIDES.map((g) => ({ slug: g.slug, title: g.title, description: g.description }))));
  writeFile('guias.html', shellWith(shell, {
    title: 'Guías para comprar y activar juegos digitales | PandaStore',
    description: 'Guías de PandaStore: cómo comprar juegos digitales en Chile, activar juegos de Steam, descargar juegos de Switch, cuentas PS5 y medios de pago en Latinoamérica.',
    canonical: `${SITE}/guias`, jsonLd: { '@context': 'https://schema.org', '@graph': [{ '@type': 'CollectionPage', name: 'Guías', url: `${SITE}/guias` }, breadcrumbLd([['Inicio', '/'], ['Guías', '/guias']])] },
    main: `<main><nav aria-label="Ruta de navegación"><a href="/">Inicio</a> › <span>Guías</span></nav><h1>Guías de juegos digitales</h1><ul>${GUIDES.map((g) => `<li><h2><a href="/guias/${g.slug}">${esc(g.title)}</a></h2><p>${esc(g.description)}</p></li>`).join('')}</ul></main>`,
  }));

  // Fichas estáticas de juegos de Steam (las de Firestore las sirve la función dynamicSEO)
  const steamGames = games.filter((p) => p.source === 'steam');
  steamGames.forEach((p) => {
    const links = productLinks[p.id] || [];
    const priceText = p.priceCLP ? `${clp(p.priceCLP)} CLP` : '';
    const title = [
      `${p.name} Steam PC Digital ${clp(p.priceCLP)} | Comprar en Chile | PandaStore`,
      `${p.name} Steam PC ${clp(p.priceCLP)} | PandaStore Chile`,
      `${p.name} Steam PC | PandaStore`,
    ].find((t) => t.length <= 70) || clip(`${p.name} | PandaStore`, 70);
    const extra = [p.developers?.length ? `Desarrollado por ${p.developers.join(', ')}` : '', p.release ? `lanzado el ${p.release}` : ''].filter(Boolean).join(', ');
    const description = clip(`Compra ${p.name} para Steam PC en Chile${priceText ? ` a ${priceText}` : ''}. Entrega inmediata 24/7 y activación con PandaStore Launcher.${p.short ? ` ${p.short}` : ''}`, 158);
    const canonical = `${SITE}${p.url}`;
    const faq = [
      [`¿Cuánto cuesta ${p.name} en PandaStore?`, priceText ? `${p.name} para Steam PC cuesta ${priceText}.` : `Revisa el precio actualizado en esta página.`],
      [`¿Cómo activo ${p.name}?`, PLATFORMS.steam.how],
      ['¿Cuánto demora la entrega?', PLATFORMS.steam.delivery],
    ];
    const main = `<main>
      <nav aria-label="Ruta de navegación"><a href="/">Inicio</a> › <a href="/juegos/juegos-steam-chile">Juegos Steam</a> › <span>${esc(p.name)}</span></nav>
      <article>
        <h1>${esc(p.name)} — Steam PC digital</h1>
        <img src="${esc(p.image)}" alt="${esc(`${p.name} Steam PC`)}" width="460" height="215" />
        ${p.short ? `<p>${esc(p.short)}</p>` : ''}
        <p>${priceText ? `Precio: ${esc(priceText)}. ` : ''}Compra ${esc(p.name)} para Steam PC en PandaStore Chile. ${esc(PLATFORMS.steam.delivery)}${extra ? ` ${esc(extra)}.` : ''}${p.idioma ? ` Idioma: ${esc(p.idioma)}.` : ''}</p>
        <p>${esc(PLATFORMS.steam.how)} <a href="/guias/como-activar-juegos-steam-con-pandastore-launcher">Ver guía de activación</a>.</p>
        <h2>Preguntas frecuentes</h2>
        ${faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}
        ${links.length ? `<h2>Más juegos como ${esc(p.name)}</h2><ul>${links.map((l) => `<li><a href="/juegos/${l.slug}">${esc(l.h1)}</a></li>`).join('')}</ul>` : ''}
      </article>
    </main>`;
    const jsonLd = { '@context': 'https://schema.org', '@graph': [
      { ...productLd(p), description, ...(p.developers?.length ? { manufacturer: { '@type': 'Organization', name: p.developers[0] } } : {}) },
      breadcrumbLd([['Inicio', '/'], ['Juegos Steam', '/juegos/juegos-steam-chile'], [p.name, p.url]]),
      faqLd(faq),
    ] };
    writeFile(`${p.url.slice(1)}.html`, shellWith(shell, { title, description, canonical, image: p.image, ogType: 'product', jsonLd, main }));
  });

  // Sitemaps (índice + uno por tipo, con imágenes)
  const urlXml = (loc, { lastmod = TODAY, changefreq = 'weekly', priority = '0.7', image } = {}) => `  <url>\n    <loc>${esc(SITE + loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>${image ? `\n    <image:image><image:loc>${esc(image)}</image:loc></image:image>` : ''}\n  </url>`;
  const urlset = (entries) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.join('\n')}\n</urlset>\n`;
  const STATIC_PAGES = [['/', 'daily', '1.0'], ['/juegos', 'daily', '0.95'], ['/guias', 'weekly', '0.8'], ['/promos', 'daily', '0.9'], ['/sagas', 'daily', '0.85'], ['/packs-nintendo', 'daily', '0.85'], ['/productos', 'daily', '0.85'], ['/categorias', 'weekly', '0.8'], ['/descargar-launcher', 'weekly', '0.85'], ['/instalacion-nintendo', 'weekly', '0.7'], ['/instalacion-playstation', 'weekly', '0.7'], ['/preguntas-frecuentes', 'weekly', '0.7'], ['/testimonios', 'weekly', '0.7'], ['/desarrollo-web', 'weekly', '0.6'], ['/provedores', 'monthly', '0.5'], ['/sobre-nosotros', 'monthly', '0.5'], ['/terminos', 'monthly', '0.3']];
  const categories = [...new Set(products.map((p) => p.categoryName).filter(Boolean))].map((c) => `/categoria/${slugify(c)}`);
  const sitemaps = {
    'sitemap-paginas.xml': urlset([...STATIC_PAGES.map(([u, f, pr]) => urlXml(u, { changefreq: f, priority: pr })), ...categories.map((u) => urlXml(u, { changefreq: 'daily', priority: '0.9' }))]),
    'sitemap-juegos-listas.xml': urlset(pages.map((p) => urlXml(`/juegos/${p.slug}`, { changefreq: 'daily', priority: p.family === 'principal' ? (p.country ? '0.85' : '0.95') : '0.8', image: p.items[0]?.image }))),
    'sitemap-productos.xml': urlset(products.filter((p) => p.source === 'firestore').map((p) => urlXml(p.url, { priority: '0.8', image: p.image }))),
    'sitemap-steam.xml': urlset(steamGames.map((p) => urlXml(p.url, { priority: '0.75', image: p.image }))),
    'sitemap-guias.xml': urlset(GUIDES.map((g) => urlXml(`/guias/${g.slug}`, { changefreq: 'monthly', priority: '0.75' }))),
  };
  // Estrenos de Steam para el home: ordenados por fecha de lanzamiento real (datos públicos de Steam).
  // Se escribe también en public/ para que el servidor de desarrollo y el próximo build lo incluyan.
  const MONTHS = { ene: 0, jan: 0, feb: 1, mar: 2, abr: 3, apr: 3, may: 4, jun: 5, jul: 6, ago: 7, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dic: 11, dec: 11 };
  const parseRelease = (s) => {
    const m = norm(s).match(/(\d{1,2})\s+([a-z]+)\.?,?\s+(\d{4})/);
    if (!m || MONTHS[m[2].slice(0, 4)] === undefined && MONTHS[m[2].slice(0, 3)] === undefined) return null;
    const month = MONTHS[m[2].slice(0, 4)] ?? MONTHS[m[2].slice(0, 3)];
    return new Date(Number(m[3]), month, Number(m[1])).getTime();
  };
  const now = Date.now();
  const trending = games
    .filter((p) => p.source === 'steam' && p.release)
    .map((p) => ({ p, t: parseRelease(p.release) }))
    .filter(({ t }) => t && t <= now)
    .sort((a, b) => b.t - a.t)
    .slice(0, 24)
    .map(({ p }) => ({ id: p.id, app_id: p.appId, name: p.name, imageUrl: p.image, priceCLP: p.priceCLP, steamListPriceCLP: p.listPriceCLP, release: p.release }));
  const trendingJson = JSON.stringify({ updatedAt: TODAY, steam: trending });
  writeFile('seo-data/home-trending.json', trendingJson);
  try {
    fs.mkdirSync(path.join(__dirname, '..', 'public', 'seo-data'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, '..', 'public', 'seo-data', 'home-trending.json'), trendingJson);
  } catch (_) {}
  console.log(`[seo] estrenos Steam para el home: ${trending.slice(0, 5).map((t) => `${t.name} (${t.release})`).join(', ')}`);

  // Catálogo extendido de Steam (Ryuu, ~63 mil juegos): índice compacto para dynamicSEO + sitemaps.
  // Se excluyen del índice de Google los juegos para adultos (nsfw) y los gratuitos (Free To Play).
  const ryuu = await loadRyuuCatalog(new Set(products.map((p) => String(p.appId || '')).filter(Boolean)));
  if (ryuu.length) {
    const index = {};
    ryuu.forEach((r) => { index[r.appid] = [r.name, r.tags.slice(0, 4).join(','), r.nsfw ? 1 : 0, r.price]; });
    writeFile('seo-data/ryuu-index.json', JSON.stringify(index));
    const indexable = ryuu.filter((r) => !r.nsfw && !r.tags.includes('Free To Play'));
    for (let i = 0; i * 45000 < indexable.length; i++) {
      sitemaps[`sitemap-steam-catalogo-${i + 1}.xml`] = urlset(indexable.slice(i * 45000, (i + 1) * 45000)
        .map((r) => urlXml(`/producto/${slugify(r.name) || `ryuu_${r.appid}`}--ryuu_${r.appid}`, { priority: '0.5', changefreq: 'monthly' })));
    }
    console.log(`[seo] catálogo Steam extendido: ${ryuu.length} juegos (${indexable.length} en sitemap)`);
  }
  Object.entries(sitemaps).forEach(([name, xml]) => writeFile(name, xml));
  writeFile('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(sitemaps).map((n) => `  <sitemap><loc>${SITE}/${n}</loc><lastmod>${TODAY}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`);

  const families = pages.reduce((m, p) => ({ ...m, [p.family]: (m[p.family] || 0) + 1 }), {});
  console.log(`[seo] ${pages.length} páginas de aterrizaje`, families);
  console.log(`[seo] ${GUIDES.length} guías, ${steamGames.length} fichas Steam estáticas, sitemaps: ${Object.keys(sitemaps).join(', ')}`);
}

// Carga un módulo ES de src/ (utilidades de la tienda) para reutilizar sus reglas sin duplicarlas
function requireSrc(rel) {
  const Module = require('module');
  const babel = require('@babel/core');
  const file = path.join(__dirname, '..', 'src', rel);
  const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), { filename: file, babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] });
  const m = new Module(file, module);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  m._compile(code, file);
  return m.exports;
}

// Mismos filtros que CategoriaPage al mostrar el catálogo Ryuu: solo juegos base que la tienda vende
async function loadRyuuCatalog(skipAppIds) {
  const NON_BASE = /\b(soundtrack|original sound track|artbook|digital artbook|wallpaper pack|dedicated server|mod kit|sdk)\b/i;
  const { isOnlineOnlyAppId, isOnlineOnlySteamProduct } = requireSrc('utils/steamCatalogCache.js');
  const { getVipPrice, isRetiredSteamTitle, steamPromoPrice } = requireSrc('utils/vipGames.js');
  try {
    const res = await fetch(`${SITE}/api/ryuu/games.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const seen = new Set();
    return (Array.isArray(data) ? data : []).filter((r) => {
      const id = String(r.appid || '');
      if (!id || !r.name || seen.has(id) || skipAppIds.has(id)) return false;
      if (String(r.type || 'game').toLowerCase() !== 'game' || NON_BASE.test(r.name)) return false;
      if (isOnlineOnlyAppId(id) || isOnlineOnlySteamProduct(r) || isRetiredSteamTitle(r)) return false;
      seen.add(id);
      return true;
    }).map((r) => ({
      appid: String(r.appid), name: String(r.name).replace(/\s+/g, ' ').trim(), tags: Array.isArray(r.tags) ? r.tags.map(String) : [], nsfw: Boolean(r.nsfw),
      price: steamPromoPrice(getVipPrice({ app_id: String(r.appid), name: r.name }) || 2000), // con promoción -20%
    }));
  } catch (err) {
    console.warn('[seo] No se pudo cargar el catálogo Ryuu:', err.message);
    return [];
  }
}

main().catch((err) => {
  // Si falla (sin internet, etc.) el sitio sigue funcionando con el build normal.
  console.error('[seo] Error generando páginas SEO:', err);
  process.exitCode = 1;
});
