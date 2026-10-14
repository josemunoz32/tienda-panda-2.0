import fs from 'fs';

async function uploadSeparateFiles() {
  const filePath = 'c:/Users/Usuario/proyectopandastore20/PandaStoreLauncher/bin/Release/net8.0-windows/win-x64/publish/PandaStoreLauncher.exe';
  
  console.log('Obteniendo servidor GoFile...');
  const sRes = await fetch('https://api.gofile.io/servers');
  const sData = await sRes.json();
  const server = sData.data.servers[0].name;

  // 1. Upload Windows version
  console.log('Subiendo versión Windows...');
  const fileBlobWin = new Blob([fs.readFileSync(filePath)]);
  const formDataWin = new FormData();
  formDataWin.append('file', fileBlobWin, 'PandaStoreSetup.exe');

  const winRes = await fetch(`https://${server}.gofile.io/contents/uploadfile`, {
    method: 'POST',
    body: formDataWin
  });
  const winData = await winRes.json();
  console.log('WINDOWS_GOFILE:', JSON.stringify(winData));

  // 2. Upload Steam Deck version
  console.log('Subiendo versión Steam Deck...');
  const fileBlobDeck = new Blob([fs.readFileSync(filePath)]);
  const formDataDeck = new FormData();
  formDataDeck.append('file', fileBlobDeck, 'PandaStoreDeckSetup.exe');

  const deckRes = await fetch(`https://${server}.gofile.io/contents/uploadfile`, {
    method: 'POST',
    body: formDataDeck
  });
  const deckData = await deckRes.json();
  console.log('DECK_GOFILE:', JSON.stringify(deckData));
}

uploadSeparateFiles().catch(console.error);
