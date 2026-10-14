import fs from 'fs';

async function upload() {
  const filePath = 'c:\\Users\\Usuario\\proyectopandastore20\\PandaStoreLauncher\\Publish\\PandaStoreSetup.exe';
  const serverRes = await fetch('https://api.gofile.io/servers');
  const serverJson = await serverRes.json();
  const server = serverJson.data.servers[0].name;
  console.log('Selected GoFile server:', server);

  const buffer = fs.readFileSync(filePath);
  const fileBlob = new Blob([buffer]);
  const formData = new FormData();
  formData.append('file', fileBlob, 'PandaStoreSetup.exe');

  const uploadRes = await fetch(`https://${server}.gofile.io/contents/uploadfile`, {
    method: 'POST',
    body: formData
  });
  const uploadJson = await uploadRes.json();
  console.log('Upload result:', JSON.stringify(uploadJson, null, 2));
}

upload().catch(console.error);
