import { execSync } from 'child_process';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.resolve();

const input = 'protocol=https\nhost=github.com\n\n';
const out = execSync('git credential fill', { input, encoding: 'utf8' });
const lines = out.split('\n');
const passLine = lines.find(l => l.startsWith('password='));
if (!passLine) {
  console.error('No token found');
  process.exit(1);
}
const token = passLine.replace('password=', '').trim();

const tag = 'v2.4.25';
const owner = 'josemunoz32';
const repo = 'tienda-panda-2.0';

async function createRelease() {
  console.log('Creando release v2.4.25 en GitHub...');
  const payload = JSON.stringify({
    tag_name: tag,
    target_commitish: 'main',
    name: 'PandaStore v2.4.25 Oficial',
    body: 'PandaStore Launcher v2.4.25:\n- Catálogo ultra-rápido instantáneo (0.05s) con caché pre-empaquetada.\n- Purga Remota Profunda Automática en Segundo Plano (elimina juegos instalados, archivos descargados, manifiestos y scripts inmediatamente al revocar la clave en el panel web, sin requerir abrir el launcher).\n- Menú de 3 puntitos limpio con Reparar Descarga / Manifiestos.\n- Optimización de renderizado en UI sin I/O en hilo principal.',
    draft: false,
    prerelease: false
  });

  const res = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/releases`,
      method: 'POST',
      headers: {
        'User-Agent': 'PandaStorePublisher',
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        try {
          resolve({ status: resp.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: resp.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  console.log('Create Release Status:', res.status);
  let uploadUrl = '';
  if (res.status === 201 || res.status === 200) {
    uploadUrl = res.data.upload_url.split('{')[0];
  } else {
    // Check if release already exists
    console.log('Buscando release existente...');
    const existing = await new Promise((resolve, reject) => {
      https.get({
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/releases/tags/${tag}`,
        headers: {
          'User-Agent': 'PandaStorePublisher',
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }, (resp) => {
        let d = '';
        resp.on('data', c => d += c);
        resp.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });
    if (existing && existing.upload_url) {
      uploadUrl = existing.upload_url.split('{')[0];
    } else {
      console.error('Error al obtener release:', res.data);
      throw new Error('No se pudo crear ni encontrar release');
    }
  }

  console.log('Upload URL base:', uploadUrl);

  const files = [
    { name: 'PandaStoreSetup.exe', filePath: path.join(__dirname, 'PandaStoreLauncher', 'Publish', 'PandaStoreSetup.exe') },
    { name: 'PandaStoreActivator.exe', filePath: path.join(__dirname, 'PandaStoreLauncher', 'Publish', 'PandaStoreActivator.exe') }
  ];

  for (const f of files) {
    if (fs.existsSync(f.filePath)) {
      const stat = fs.statSync(f.filePath);
      console.log(`Subiendo ${f.name} (${(stat.size / 1024 / 1024).toFixed(2)} MB)...`);
      const urlObj = new URL(`${uploadUrl}?name=${f.name}`);
      
      await new Promise((resolve, reject) => {
        const upReq = https.request({
          hostname: urlObj.hostname,
          path: urlObj.pathname + urlObj.search,
          method: 'POST',
          headers: {
            'User-Agent': 'PandaStorePublisher',
            'Authorization': `token ${token}`,
            'Content-Type': 'application/octet-stream',
            'Content-Length': stat.size
          }
        }, (upRes) => {
          let upData = '';
          upRes.on('data', d => upData += d);
          upRes.on('end', () => {
            console.log(`Resultado de subida ${f.name}: Status ${upRes.statusCode}`);
            resolve();
          });
        });
        upReq.on('error', reject);
        const stream = fs.createReadStream(f.filePath);
        stream.pipe(upReq);
      });
    } else {
      console.log(`Archivo no encontrado: ${f.filePath}`);
    }
  }

  console.log('==============================================');
  console.log(' ¡RELEASE v2.4.23 Y ASSETS PUBLICADOS CON EXITO! ');
  console.log('==============================================');
}

createRelease().catch(err => {
  console.error('ERROR FATAL:', err);
  process.exit(1);
});
