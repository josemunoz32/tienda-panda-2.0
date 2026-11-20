/**
 * prerender-home.js — se ejecuta después de `npm run build` (script "postbuild").
 *
 * 1. Copia build/index.html → build/app.html: el shell vacío de la SPA que Firebase Hosting sirve
 *    para todas las rutas (ver rewrites en firebase.json) y que usa la función dynamicSEO.
 * 2. Abre /home en Chrome headless (móvil y escritorio), toma una foto del HTML ya renderizado
 *    por React y la inyecta en build/index.html. Así "/" y "/home" muestran el contenido antes de
 *    que descargue y ejecute el bundle JS (LCP en celulares lentos). React reemplaza ese HTML al montar.
 *
 * Si no hay Chrome o algo falla, se deja index.html como shell normal: el sitio funciona igual.
 * Ruta de Chrome configurable con la variable de entorno PRERENDER_CHROME.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const BUILD = path.join(__dirname, '..', 'build');
const INDEX = path.join(BUILD, 'index.html');
const APP = path.join(BUILD, 'app.html');

const CHROME_CANDIDATES = [
  process.env.PRERENDER_CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const VIEWPORTS = {
  mobile: { width: 412, height: 823, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true },
  desktop: { width: 1350, height: 940 },
};

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain',
};

// Servidor estático mínimo con fallback SPA al shell (app.html)
function serveBuild() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      let file = path.join(BUILD, urlPath);
      if (!file.startsWith(BUILD) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = APP;
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// Se ejecuta dentro de la página: devuelve el HTML de #root listo para servir estático.
function snapshotRoot() {
  const root = document.getElementById('root').cloneNode(true);
  // Overlays que dependen del visitante (consentimiento de cookies, etc.)
  root.querySelectorAll('.panda-cookie-banner-wrapper, #app-initial-preloader').forEach((el) => el.remove());
  // Solo la primera sección (Promociones, imágenes estáticas) va completa; las de productos quedan
  // como placeholders con su altura reservada para no mostrar precios/catálogo desactualizados.
  root.querySelectorAll('.home-section').forEach((sec, i) => {
    if (i === 0) return;
    const empty = document.createElement('section');
    empty.className = sec.className.replace(/\s*home-section--pending/, '') + ' home-section--pending';
    sec.replaceWith(empty);
  });
  // Tarjetas traseras del carrusel (atenuadas detrás de la principal): sus imágenes se dejan para
  // cuando monte React, así no compiten con la tarjeta principal en redes lentas.
  root.querySelectorAll('.depth-carousel__img:not([fetchpriority="high"])').forEach((img) => {
    img.removeAttribute('srcset');
    img.setAttribute('src', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
  });
  // Element Timing: el cargador del bundle espera a que estas imágenes se pinten (ver loader abajo)
  root.querySelectorAll('img[fetchpriority="high"]').forEach((img) => img.setAttribute('elementtiming', 'hero'));
  root.querySelectorAll('[id]').forEach((el) => {
    if (el.id !== 'root') el.removeAttribute('id');
  });
  return root.innerHTML;
}

async function capture(browser, port, viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  // Con movimiento reducido los títulos quedan en su estado final y los carruseles no avanzan solos
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(`http://127.0.0.1:${port}/home`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('.home-section .depth-carousel__img', { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1500));
  const html = await page.evaluate(snapshotRoot);
  // El modal de bienvenida se monta con un portal fuera de #root
  // Sin animación de entrada en la copia estática: se ve completo desde el primer pintado
  const welcome = await page.evaluate(() => {
    const el = document.querySelector('.welcome-modal-overlay');
    if (!el) return '';
    el.classList.add('welcome-modal--instant');
    return el.outerHTML;
  });
  await page.close();
  return { html, welcome };
}

async function main() {
  if (!fs.existsSync(INDEX)) throw new Error('No existe build/index.html (¿corrió el build?)');
  const shell = fs.readFileSync(INDEX, 'utf8');
  fs.writeFileSync(APP, shell);
  console.log('[prerender] build/app.html creado (shell SPA)');

  const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!chrome) {
    console.warn('[prerender] Chrome no encontrado: index.html queda como shell normal.');
    return;
  }

  const puppeteer = require('puppeteer-core');
  const server = await serveBuild();
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
  try {
    const { port } = server.address();
    const { html: mobile, welcome } = await capture(browser, port, VIEWPORTS.mobile);
    const { html: desktop } = await capture(browser, port, VIEWPORTS.desktop);
    // Los ids de clipPath de StrokeText se duplicarían entre ambas copias
    const desktopUnique = desktop.replace(/stroke-text-wipe-/g, 'stroke-text-wipe-d-');

    const marker = '<div id="root">';
    const start = shell.indexOf(marker);
    const seoStart = shell.indexOf('<div class="seo-semantic-crawler-only"', start);
    if (start < 0 || seoStart < 0) throw new Error('No se encontró #root o el bloque SEO en index.html');

    // Modal de bienvenida: visible desde el primer pintado, igual que lo muestra React en /home.
    // Si ya se cerró en esta sesión se quita antes de pintar; la ✕, "Explorar" y el fondo oscuro
    // funcionan aun antes de que cargue React (guardan el mismo flag que usa Home.js).
    const welcomeBlock = welcome ? `<div class="prerender-welcome">${welcome}</div><script>
      (function () {
        var box = document.currentScript.previousElementSibling;
        try {
          if (sessionStorage.getItem('pandaWelcomeModalClosed') === 'true') { box.remove(); return; }
        } catch (e) {}
        window.__welcomePrerendered = true;
        box.addEventListener('click', function (e) {
          var t = e.target;
          if (t.classList.contains('welcome-modal-overlay') || t.closest('.welcome-modal-close-btn, .welcome-btn-explore')) {
            try { sessionStorage.setItem('pandaWelcomeModalClosed', 'true'); } catch (err) {}
            window.__welcomePrerendered = false;
            box.remove();
          }
        });
      })();
    </script>` : '';

    const prerendered =
      welcomeBlock +
      '<div class="prerender prerender--mobile">' + mobile + '</div>' +
      '<div class="prerender prerender--desktop">' + desktopUnique + '</div>\n      ';
    // Se reemplaza el preloader (spinner) por el contenido real; el bloque SEO se conserva.
    let out = shell.slice(0, start + marker.length) + '\n      ' + prerendered + shell.slice(seoStart);

    // El bundle (~300 KB) se pide recién cuando el navegador ya pintó el contenido prerenderizado
    // y sus imágenes principales (fetchpriority=high visibles, medido con Element Timing; si el
    // navegador no lo soporta, cuando terminan de cargar). Si se pidiera antes, compite por ancho de
    // banda con esas imágenes en redes lentas y retrasa su pintado. Respaldo: a los 2.5 s se carga igual.
    const scriptTag = out.match(/<script defer="defer" src="([^"]+\/main\.[^"]+\.js)"><\/script>/);
    if (!scriptTag) throw new Error('No se encontró el <script> del bundle principal');
    const loader = `<script>
      (function () {
        var started = false;
        window.__pandaPrerendered = true;
        function boot() {
          if (started) return;
          started = true;
          window.__pandaBooted = true;
          window.dispatchEvent(new Event('panda:boot'));
          var s = document.createElement('script');
          s.src = '${scriptTag[1]}';
          document.head.appendChild(s);
        }
        function bootSoon() { requestAnimationFrame(function () { setTimeout(boot, 0); }); }
        function heroImages() {
          return Array.prototype.filter.call(document.querySelectorAll('img[fetchpriority="high"]'), function (img) {
            return img.getClientRects().length > 0;
          });
        }
        function whenHeroImagesLoad() {
          var imgs = heroImages().filter(function (img) { return !img.complete; });
          var pending = imgs.length;
          if (!pending) return bootSoon();
          imgs.forEach(function (img) {
            var done = function () { if (--pending === 0) bootSoon(); };
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          });
        }
        function whenHeroImagesPaint() {
          var types = (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes) || [];
          if (types.indexOf('element') < 0) return whenHeroImagesLoad();
          var pending = heroImages().filter(function (img) { return img.hasAttribute('elementtiming'); });
          if (!pending.length) return whenHeroImagesLoad();
          new PerformanceObserver(function (list, obs) {
            list.getEntries().forEach(function (e) {
              var i = pending.indexOf(e.element);
              if (i >= 0) pending.splice(i, 1);
            });
            if (!pending.length) { obs.disconnect(); bootSoon(); }
          }).observe({ type: 'element', buffered: true });
        }
        try {
          new PerformanceObserver(function (list, obs) {
            if (list.getEntriesByName('first-contentful-paint').length) { obs.disconnect(); whenHeroImagesPaint(); }
          }).observe({ type: 'paint', buffered: true });
        } catch (e) {
          window.addEventListener('load', boot, { once: true });
        }
        setTimeout(boot, 2500);
      })();
    </script>`;
    out = out.replace(scriptTag[0], loader);

    fs.writeFileSync(INDEX, out);
    console.log(`[prerender] build/index.html con /home prerenderizado (móvil ${Math.round(mobile.length / 1024)} KB, escritorio ${Math.round(desktop.length / 1024)} KB)`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  // Nunca romper el build: sin prerender el sitio funciona como antes
  console.warn('[prerender] Omitido:', err.message);
  if (!fs.existsSync(APP) && fs.existsSync(INDEX)) fs.copyFileSync(INDEX, APP);
});
