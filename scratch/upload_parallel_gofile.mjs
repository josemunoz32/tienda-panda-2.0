import fs from 'fs';

async function uploadFile(filename) {
  const filePath = 'public/downloads/' + filename;
  const sRes = await fetch('https://api.gofile.io/servers');
  const sData = await sRes.json();
  const server = sData.data.servers[0].name;
  console.log(`Subiendo ${filename} a ${server}...`);

  const fileBlob = new Blob([fs.readFileSync(filePath)]);
  const formData = new FormData();
  formData.append('file', fileBlob, filename);

  const upRes = await fetch(`https://${server}.gofile.io/contents/uploadfile`, {
    method: 'POST',
    body: formData
  });

  const upData = await upRes.json();
  console.log(`RESULTADO_${filename}:`, JSON.stringify(upData));
  return upData;
}

Promise.all([
  uploadFile('PandaStoreSetup.exe'),
  uploadFile('PandaStoreDeckSetup.exe')
]).catch(console.error);
