import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

const GOFILE_TOKEN = "19qIvNHm7hdOCeLa4XJucl1VlYeqJM2F";

const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const firebaseConfig = {
  apiKey: envVars.REACT_APP_FIREBASE_API_KEY,
  authDomain: envVars.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: envVars.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.REACT_APP_FIREBASE_APP_ID,
  measurementId: envVars.REACT_APP_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const fixesPath = path.join(process.cwd(), 'fixes/Pack_Fixes/fixes');
const steamPath = path.join(process.cwd(), 'fixes/Pack_Steam/archivos_juego');

async function uploadZipFixesOnly() {
  try {
    const zipFiles = fs.readdirSync(fixesPath).filter(f => f.endsWith('.zip'));
    console.log(`Se encontraron ${zipFiles.length} archivos .zip de fixes.`);

    const serverRes = await fetch("https://api.gofile.io/servers", {
      headers: { "Authorization": `Bearer ${GOFILE_TOKEN}` }
    });
    const serverJson = await serverRes.json();
    const serverName = serverJson?.data?.servers?.[0]?.name || "store1";
    console.log(`Servidor de GoFile asignado: ${serverName}`);

    let count = 0;

    for (const zipFile of zipFiles) {
      count++;
      const baseName = path.basename(zipFile, '.zip');
      const fullZipPath = path.join(fixesPath, zipFile);
      const stat = fs.statSync(fullZipPath);
      const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);

      let appIdMatch = "";
      if (fs.existsSync(steamPath)) {
        const matchFolder = fs.readdirSync(steamPath).find(f => f.toLowerCase() === baseName.toLowerCase());
        if (matchFolder) {
          const luaFile = fs.readdirSync(path.join(steamPath, matchFolder)).find(f => f.endsWith('.lua'));
          if (luaFile) appIdMatch = path.basename(luaFile, '.lua');
        }
      }

      const percent = ((count / zipFiles.length) * 100).toFixed(1);
      console.log(`\n[${count}/${zipFiles.length}] (${percent}%) Subiendo ${zipFile} (${sizeMB} MB)...`);

      try {
        const fileBuffer = fs.readFileSync(fullZipPath);
        const fileBlob = new Blob([fileBuffer], { type: 'application/zip' });
        const formData = new FormData();
        formData.append('file', fileBlob, zipFile);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 600000); // 10 min timeout per file

        const uploadRes = await fetch(`https://${serverName}.gofile.io/contents/uploadfile`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${GOFILE_TOKEN}` },
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeout);
        const uploadJson = await uploadRes.json();
        const downloadPage = uploadJson?.data?.downloadPage;
        const fileId = uploadJson?.data?.fileId;
        const directLink = uploadJson?.data?.directLink;

        const fixUrl = directLink || downloadPage || (fileId ? `https://gofile.io/d/${fileId}` : "");

        if (fixUrl) {
          console.log(`✔ [${percent}%] Subido con éxito: ${fixUrl}`);
          if (appIdMatch) {
            await setDoc(doc(db, "games", appIdMatch), {
              fix_drive_id: fixUrl,
              has_local_fix: true
            }, { merge: true });
            console.log(`✔ Vinculado a AppID ${appIdMatch} (${baseName})`);
          }
        } else {
          console.log(`⚠️ Error en GoFile para ${zipFile}:`, JSON.stringify(uploadJson));
        }
      } catch (err) {
        console.error(`❌ Error al subir ${zipFile}:`, err.message);
      }
    }

    console.log("\n==========================================");
    console.log(`🎉 PROCESO COMPLETADO AL 100%`);
    console.log("==========================================");
    process.exit(0);

  } catch (err) {
    console.error("Error durante el proceso:", err);
    process.exit(1);
  }
}

uploadZipFixesOnly();
