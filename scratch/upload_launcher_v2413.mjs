import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const GOFILE_PREMIUM_TOKEN = 'ZtkBWxSMe9wsPfJJGl8i6j77x6LgbwoQ';
const filePath = path.resolve('PandaStoreLauncher/bin/Release/net8.0-windows/win-x64/publish/PandaStoreLauncher.exe');

async function main() {
  console.log('1. Verificando archivo ejecutable:', filePath);
  if (!fs.existsSync(filePath)) {
    throw new Error('Archivo no existe: ' + filePath);
  }
  const stats = fs.statSync(filePath);
  console.log(`Tamaño: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

  console.log('2. Obteniendo mejor servidor GoFile...');
  const serverRes = await fetch('https://api.gofile.io/servers');
  const serverJson = await serverRes.json();
  if (serverJson.status !== 'ok') throw new Error('Error al obtener servidor de GoFile');
  const server = serverJson.data.servers[0].name;
  console.log('Servidor asignado:', server);

  console.log('3. Subiendo PandaStoreLauncher.exe con token premium via curl...');
  const curlCmd = `curl -# -X POST "https://${server}.gofile.io/contents/uploadfile" -H "Authorization: Bearer ${GOFILE_PREMIUM_TOKEN}" -F "file=@${filePath};filename=PandaStoreLauncher.exe"`;
  
  const output = execSync(curlCmd, { maxBuffer: 10 * 1024 * 1024, encoding: 'utf8' });
  console.log('Respuesta de GoFile:\n', output);

  const resJson = JSON.parse(output);
  if (resJson.status === 'ok') {
    const downloadPage = resJson.data.downloadPage;
    console.log('\n=============================================');
    console.log('✅ SUBIDA EXITOSA A GOFILE:');
    console.log('Download Page URL:', downloadPage);
    console.log('File ID:', resJson.data.fileId);
    console.log('=============================================\n');

    fs.writeFileSync('scratch/last_gofile_launcher.json', JSON.stringify(resJson.data, null, 2));
  } else {
    throw new Error('GoFile devolvió error: ' + output);
  }
}

main().catch(err => {
  console.error('❌ Error en proceso:', err);
  process.exit(1);
});
