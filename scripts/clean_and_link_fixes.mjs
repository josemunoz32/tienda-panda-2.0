import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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

function zipFolderNative(sourceDir, outPath) {
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
  const safeSource = sourceDir.replace(/'/g, "''");
  const safeOut = outPath.replace(/'/g, "''");
  const cmd = `powershell -Command "Compress-Archive -Path '${safeSource}\\*' -DestinationPath '${safeOut}' -Force"`;
  execSync(cmd, { stdio: 'ignore' });
  return outPath;
}

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function cleanAndLink() {
  try {
    const snap = await getDocs(collection(db, "games"));
    const firestoreDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log("1. Limpiando documentos huérfanos con prefijo 'fix_' y migrando sus enlaces...");
    const orphanDocs = firestoreDocs.filter(d => d.id.startsWith("fix_"));

    for (const orphan of orphanDocs) {
      if (orphan.fix_drive_id) {
        // Find matching main game doc by name
        const matchGame = firestoreDocs.find(g => !g.id.startsWith("fix_") && normalize(g.name) === normalize(orphan.name));
        if (matchGame) {
          console.log(` Migrando Fix de '${orphan.name}' a DocID principal (${matchGame.id}): ${orphan.fix_drive_id}`);
          await setDoc(doc(db, "games", matchGame.id), {
            fix_drive_id: orphan.fix_drive_id
          }, { merge: true });
        }
      }

      console.log(` 🗑️ Eliminando documento duplicado: ${orphan.id}`);
      await deleteDoc(doc(db, "games", orphan.id));
    }

    console.log("\n2. Procesando los 8 fixes faltantes...");
    const updatedSnap = await getDocs(collection(db, "games"));
    const currentGames = updatedSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const fixFolders = fs.readdirSync(fixesPath).filter(f => fs.statSync(path.join(fixesPath, f)).isDirectory());

    // Get Gofile Server
    const serverRes = await fetch("https://api.gofile.io/servers", {
      headers: { "Authorization": `Bearer ${GOFILE_TOKEN}` }
    });
    const serverJson = await serverRes.json();
    const serverName = serverJson?.data?.servers?.[0]?.name || "store1";

    const tempDir = path.join(process.cwd(), 'scratch/temp_zip_fixes');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    let processedCount = 0;

    for (const folderName of fixFolders) {
      const normFolder = normalize(folderName);
      const matchedDoc = currentGames.find(g => normalize(g.name) === normFolder || normalize(g.steam_folder_name) === normFolder);

      if (matchedDoc && matchedDoc.fix_drive_id) {
        // Already linked
        continue;
      }

      console.log(`\nComprimiendo y subiendo Fix pendiente: ${folderName}...`);
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
          headers: { 'Authorization': `Bearer ${GOFILE_TOKEN}` },
          body: formData
        });

        const uploadJson = await uploadRes.json();
        const downloadPage = uploadJson?.data?.downloadPage;
        const fileId = uploadJson?.data?.fileId;
        const directLink = uploadJson?.data?.directLink;
        const fixUrl = directLink || downloadPage || (fileId ? `https://gofile.io/d/${fileId}` : "");

        if (fixUrl && matchedDoc) {
          await setDoc(doc(db, "games", matchedDoc.id), {
            fix_drive_id: fixUrl
          }, { merge: true });
          console.log(`✔ Vinculado Fix de ${folderName} a DocID ${matchedDoc.id}: ${fixUrl}`);
          processedCount++;
        }
      } catch (err) {
        console.error(`❌ Error con ${folderName}:`, err.message);
      } finally {
        if (fs.existsSync(tempZipFile)) {
          try { fs.unlinkSync(tempZipFile); } catch { }
        }
      }
    }

    console.log("\n==========================================");
    console.log("🎉 AUDITORÍA Y LIMPIEZA FINALIZADA");
    console.log("==========================================");
    process.exit(0);

  } catch (err) {
    console.error("Error en proceso de limpieza:", err);
    process.exit(1);
  }
}

cleanAndLink();
