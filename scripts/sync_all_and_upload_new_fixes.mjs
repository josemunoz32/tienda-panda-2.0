import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const GOFILE_TOKEN = "REDACTED_SECRET";

// Read Firebase config from .env
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

const steamPath = path.join(process.cwd(), 'fixes/Pack_Steam/archivos_juego');
const fixesPath = path.join(process.cwd(), 'fixes/Pack_Fixes/fixes');

function zipFolderNative(sourceDir, outPath) {
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
  const safeSource = sourceDir.replace(/'/g, "''");
  const safeOut = outPath.replace(/'/g, "''");
  const cmd = `powershell -Command "Compress-Archive -Path '${safeSource}\\*' -DestinationPath '${safeOut}' -Force"`;
  execSync(cmd, { stdio: 'ignore' });
  return outPath;
}

async function runSync() {
  console.log("==========================================");
  console.log("🚀 INICIANDO SINCRONIZACIÓN Y CARGA DE FIXES");
  console.log("==========================================");

  let luaSynced = 0;
  // 1. SYNC ALL LUA & MANIFEST FILES TO FIRESTORE
  if (fs.existsSync(steamPath)) {
    const gameFolders = fs.readdirSync(steamPath).filter(f => fs.statSync(path.join(steamPath, f)).isDirectory());
    console.log(`\n📁 Encontradas ${gameFolders.length} carpetas de juegos con LUA en Pack_Steam...`);

    for (const folderName of gameFolders) {
      const fullFolder = path.join(steamPath, folderName);
      const files = fs.readdirSync(fullFolder);
      const luaFile = files.find(f => f.endsWith('.lua'));
      if (!luaFile) continue;

      const appId = path.basename(luaFile, '.lua');
      const luaContent = fs.readFileSync(path.join(fullFolder, luaFile), 'utf8');

      // Check for manifest files
      const manifestFiles = [];
      const manifestList = files.filter(f => f.endsWith('.manifest'));
      for (const mFile of manifestList) {
        const mBuffer = fs.readFileSync(path.join(fullFolder, mFile));
        manifestFiles.push({
          filename: mFile,
          content_b64: mBuffer.toString('base64')
        });
      }

      await setDoc(doc(db, "games", appId), {
        app_id: appId,
        name: folderName,
        steam_folder_name: folderName,
        lua_content: luaContent,
        manifest_files: manifestFiles,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      luaSynced++;
    }
    console.log(`✅ ¡ÉXITO! Se sincronizaron ${luaSynced} activadores LUA en Firebase Firestore.`);
  } else {
    console.warn("⚠️ No se encontró la carpeta steamPath:", steamPath);
  }

  // 2. UPLOAD MISSING FIXES TO GOFILE
  if (!fs.existsSync(fixesPath)) {
    console.error("❌ No se encontró la carpeta de fixes:", fixesPath);
    return;
  }

  const fixFolders = fs.readdirSync(fixesPath).filter(f => fs.statSync(path.join(fixesPath, f)).isDirectory());
  console.log(`\n📁 Encontradas ${fixFolders.length} carpetas de Fixes en Pack_Fixes...`);

  // Fetch GoFile Server
  let serverName = "store1";
  try {
    const serverRes = await fetch("https://api.gofile.io/servers", {
      headers: { "Authorization": `Bearer ${GOFILE_TOKEN}` }
    });
    const serverJson = await serverRes.json();
    serverName = serverJson?.data?.servers?.[0]?.name || "store1";
  } catch (err) {
    console.warn("⚠️ No se pudo obtener servidor GoFile dinámico, usando store1 por defecto.");
  }

  const tempDir = path.join(process.cwd(), 'scratch/temp_zip_fixes');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  let uploadedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < fixFolders.length; i++) {
    const folderName = fixFolders[i];
    const index = i + 1;

    // Find AppID match in steamPath
    let appIdMatch = "";
    if (fs.existsSync(steamPath)) {
      const matchFolder = fs.readdirSync(steamPath).find(f => f.toLowerCase() === folderName.toLowerCase());
      if (matchFolder) {
        const luaFile = fs.readdirSync(path.join(steamPath, matchFolder)).find(f => f.endsWith('.lua'));
        if (luaFile) appIdMatch = path.basename(luaFile, '.lua');
      }
    }

    // Special Mappings fallback
    if (!appIdMatch) {
      if (folderName.toLowerCase().includes("avatar") || folderName.toLowerCase() === "afop") appIdMatch = "2840770";
      if (folderName.toLowerCase().includes("requiem")) appIdMatch = "3764200";
      if (folderName.toLowerCase() === "sekiro") appIdMatch = "814380";
    }

    // Check Firestore if fix_drive_id is already configured
    if (appIdMatch) {
      const existingDoc = await getDoc(doc(db, "games", appIdMatch));
      if (existingDoc.exists() && existingDoc.data().fix_drive_id) {
        console.log(`[${index}/${fixFolders.length}] ⏭️ [OMITIDO] ${folderName} ya tiene Fix configurado: ${existingDoc.data().fix_drive_id}`);
        skippedCount++;
        continue;
      }
    }

    console.log(`\n[${index}/${fixFolders.length}] 📦 Comprimiendo y subiendo nuevo Fix: ${folderName}...`);
    const gameFixDir = path.join(fixesPath, folderName);
    const safeFileName = folderName.replace(/[^a-zA-Z0-9]/g, '_');
    const tempZipFile = path.join(tempDir, `${safeFileName}_fix.zip`);

    try {
      zipFolderNative(gameFixDir, tempZipFile);

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
        console.log(`✅ Subido a GoFile (${folderName}): ${fixUrl}`);

        const targetId = appIdMatch || folderName.replace(/[^0-9]/g, '') || `fix_${safeFileName}`;
        await setDoc(doc(db, "games", targetId), {
          name: folderName,
          steam_folder_name: folderName,
          fix_drive_id: fixUrl,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        console.log(`✅ Vinculado en Firestore para el juego: ${folderName} (ID: ${targetId})`);
        uploadedCount++;
      } else {
        console.warn(`⚠️ Error al obtener URL de GoFile para ${folderName}:`, JSON.stringify(uploadJson));
      }
    } catch (err) {
      console.error(`❌ Error procesando ${folderName}:`, err.message);
    } finally {
      if (fs.existsSync(tempZipFile)) {
        try { fs.unlinkSync(tempZipFile); } catch { }
      }
    }
  }

  console.log("\n==========================================");
  console.log(`🎉 PROCESO COMPLETADO EXITOSAMENTE`);
  console.log(`- Juegos LUA Sincronizados: ${luaSynced}`);
  console.log(`- Fixes Nuevos Subidos a GoFile: ${uploadedCount}`);
  console.log(`- Fixes Ya Existentes (Omitidos): ${skippedCount}`);
  console.log("==========================================");
  process.exit(0);
}

runSync().catch(err => {
  console.error("Error fatal durante la sincronización:", err);
  process.exit(1);
});
