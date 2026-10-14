import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const GOFILE_PREMIUM_TOKEN = 'ZtkBWxSMe9wsPfJJGl8i6j77x6LgbwoQ';
const setupPath = path.resolve('PandaStoreLauncher/Publish/PandaStoreSetup.exe');

async function main() {
  console.log('1. Verificando PandaStoreSetup.exe:', setupPath);
  if (!fs.existsSync(setupPath)) throw new Error('No existe: ' + setupPath);
  const stats = fs.statSync(setupPath);
  console.log(`Tamaño: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

  console.log('2. Obteniendo servidor GoFile...');
  const serverRes = await fetch('https://api.gofile.io/servers');
  const serverJson = await serverRes.json();
  if (serverJson.status !== 'ok') throw new Error('Error al obtener servidor');
  const server = serverJson.data.servers[0].name;
  console.log('Servidor asignado:', server);

  console.log('3. Subiendo con curl y token premium...');
  const curlCmd = `curl -# -X POST "https://${server}.gofile.io/contents/uploadfile" -H "Authorization: Bearer ${GOFILE_PREMIUM_TOKEN}" -F "file=@${setupPath.replace(/\\/g, '/')};filename=PandaStoreSetup.exe"`;

  const output = execSync(curlCmd, { maxBuffer: 10 * 1024 * 1024, encoding: 'utf8' });
  const res = JSON.parse(output);

  if (res.status === 'ok') {
    console.log('\n=============================================');
    console.log('✅ PandaStoreSetup.exe SUBIDO A GOFILE:');
    console.log('Download Page:', res.data.downloadPage);
    console.log('Direct Link:', res.data.directLink || 'N/A');
    console.log('File ID:', res.data.fileId);
    console.log('=============================================\n');
    fs.writeFileSync('scratch/last_setup_gofile.json', JSON.stringify(res.data, null, 2));
  } else {
    throw new Error('GoFile error: ' + output);
  }
}

main().catch(console.error);
