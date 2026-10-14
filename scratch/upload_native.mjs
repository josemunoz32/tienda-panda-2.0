import fs from 'fs';

async function upload() {
  const filePath = 'public/downloads/PandaStoreSetup.exe';
  console.log('Obteniendo servidor...');
  const sRes = await fetch('https://api.gofile.io/servers');
  const sData = await sRes.json();
  const server = sData.data.servers[0].name;
  console.log('Subiendo a:', server);

  const fileBlob = new Blob([fs.readFileSync(filePath)]);
  const formData = new FormData();
  formData.append('file', fileBlob, 'PandaStoreSetup.exe');

  const upRes = await fetch(`https://${server}.gofile.io/contents/uploadfile`, {
    method: 'POST',
    body: formData
  });

  const upData = await upRes.json();
  console.log('RESULTADO_GOFILE:', JSON.stringify(upData));
}

upload().catch(console.error);
