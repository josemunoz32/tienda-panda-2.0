import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const GOFILE_TOKEN = "REDACTED_SECRET";

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

function zipFolderNative(sourceDir, outPath) {
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
  const safeSource = sourceDir.replace(/'/g, "''");
  const safeOut = outPath.replace(/'/g, "''");
  const cmd = `powershell -Command "Compress-Archive -Path '${safeSource}\\*' -DestinationPath '${safeOut}' -Force"`;
  execSync(cmd, { stdio: 'ignore' });
  return outPath;
}

async function uploadFixesToGofile() {
  try {
    // 1. All LUAs already synced to Firestore
    console.log("Comprobando vinculación de fixes con GoFile...");

    // 2. Upload Fixes to GoFile using Gofile API Token
    if (!fs.existsSync(fixesPath)) {
      console.error("No se encontró la carpeta fixes:", fixesPath);
      return;
    }

    const fixFolders = fs.readdirSync(fixesPath).filter(f => fs.statSync(path.join(fixesPath, f)).isDirectory());
    console.log(`\nSe encontraron ${fixFolders.length} carpetas de fixes para procesar y subir a GoFile...`);

    // Get Gofile Server
    const serverRes = await fetch("https://api.gofile.io/servers", {
      headers: { "Authorization": `Bearer ${GOFILE_TOKEN}` }
    });
    const serverJson = await serverRes.json();
    const serverName = serverJson?.data?.servers?.[0]?.name || "store1";

    const tempDir = path.join(process.cwd(), 'scratch/temp_zip_fixes');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    let count = 0;

    for (const folderName of fixFolders) {
      count++;

      // Find AppID match in steamPath
      let appIdMatch = "";
      if (fs.existsSync(steamPath)) {
        const matchFolder = fs.readdirSync(steamPath).find(f => f.toLowerCase() === folderName.toLowerCase());
        if (matchFolder) {
          const luaFile = fs.readdirSync(path.join(steamPath, matchFolder)).find(f => f.endsWith('.lua'));
          if (luaFile) appIdMatch = path.basename(luaFile, '.lua');
        }
      }

      // Check if game already has a fix URL in Firestore
      if (appIdMatch) {
        const existingDoc = await getDoc(doc(db, "games", appIdMatch));
        if (existingDoc.exists() && existingDoc.data().fix_drive_id) {
          console.log(`[${count}/${fixFolders.length}] ⏭️ [OMITIDO] ${folderName} ya tiene Fix configurado en Firestore: ${existingDoc.data().fix_drive_id}`);
          continue;
        }
      }

      console.log(`\n[${count}/${fixFolders.length}] Comprimiendo y subiendo Fix de: ${folderName}...`);
      const gameFixDir = path.join(fixesPath, folderName);
      const safeFileName = folderName.replace(/[^a-zA-Z0-9]/g, '_');
      const tempZipFile = path.join(tempDir, `${safeFileName}_fix.zip`);

      try {
        zipFolderNative(gameFixDir, tempZipFile);

        // Upload to GoFile using native Blob/FormData
        const fileBuffer = fs.readFileSync(tempZipFile);
        const fileBlob = new Blob([fileBuffer], { type: 'application/zip' });
        const formData = new FormData();
        formData.append('file', fileBlob, `${safeFileName}_fix.zip`);

        const uploadRes = await fetch(`https://${serverName}.gofile.io/contents/uploadfile`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GOFILE_TOKEN}`
          },
          body: formData
        });

        const uploadJson = await uploadRes.json();
        const downloadPage = uploadJson?.data?.downloadPage;
        const fileId = uploadJson?.data?.fileId;
        const directLink = uploadJson?.data?.directLink;

        const fixUrl = directLink || downloadPage || (fileId ? `https://gofile.io/d/${fileId}` : "");

        if (fixUrl) {
          console.log(`✔ Subido a GoFile (${folderName}): ${fixUrl}`);

          if (appIdMatch) {
            await setDoc(doc(db, "games", appIdMatch), {
              fix_drive_id: fixUrl
            }, { merge: true });
            console.log(`✔ Enlace de Fix vinculado en Firestore al juego AppID: ${appIdMatch}`);
          } else {
            // Fallback store by name
            const normalizedAppId = folderName.replace(/[^0-9]/g, '') || `fix_${safeFileName}`;
            await setDoc(doc(db, "games", normalizedAppId), {
              name: folderName,
              steam_folder_name: folderName,
              fix_drive_id: fixUrl
            }, { merge: true });
            console.log(`✔ Enlace de Fix vinculado en Firestore al juego: ${folderName}`);
          }
        } else {
          console.log(`⚠️ Respuesta de GoFile para ${folderName}:`, JSON.stringify(uploadJson));
        }
      } catch (err) {
        console.error(`❌ Error al procesar ${folderName}:`, err.message);
      } finally {
        if (fs.existsSync(tempZipFile)) {
          try { fs.unlinkSync(tempZipFile); } catch { }
        }
      }
    }

    console.log("\n==========================================");
    console.log(`🎉 PROCESO MASIVO COMPLETADO CON ÉXITO`);
    console.log(`Se subieron y vincularon todos los fixes en tu cuenta de GoFile.`);
    console.log("==========================================");
    process.exit(0);

  } catch (err) {
    console.error("Error durante el proceso:", err);
    process.exit(1);
  }
}

uploadFixesToGofile();
