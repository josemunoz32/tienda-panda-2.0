import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

// 1. Obtener token de GitHub desde Git Credential Manager
const cred = spawnSync("git", ["credential", "fill"], {
  input: "protocol=https\nhost=github.com\nusername=josemunoz32\n\n",
  encoding: "utf-8"
});

const pwdLine = (cred.stdout || "").split("\n").find(l => l.startsWith("password="));
if (!pwdLine) {
  console.error("No se pudo obtener el token de Git Credential Manager.");
  process.exit(1);
}

const token = pwdLine.substring(9).trim();
console.log("Token de GitHub obtenido con éxito.");

const version = "2.4.43";
const notes = `## PandaStore Launcher v${version}
- **Motor BitTorrent P2P integrado**: Descargas de juegos pesados (como Forza Horizon) a máxima velocidad directa.
- **Gestión inteligente de almacenamiento**: Medición previa de espacio y limpieza automática del instalador temporal una vez instalado.
- **Acceso directo en Escritorio**: Creación automática del acceso directo para jugar inmediatamente.
- **Desinstalador integrado**: Opción de desinstalación limpia y liberación de espacio desde el launcher.
- **Actualización de soporte**: Enlaces directos a WhatsApp y canal oficial de Telegram.`;

async function main() {
  const headers = {
    "Authorization": `token ${token}`,
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "PandaStoreReleasePublisher"
  };

  // Check if release exists
  const checkRes = await fetch(`https://api.github.com/repos/josemunoz32/tienda-panda-2.0/releases/tags/v${version}`, {
    headers
  });

  let rel;
  if (checkRes.ok) {
    rel = await checkRes.json();
    console.log(`Release v${version} ya existe: ${rel.html_url}`);
  } else {
    const releaseBody = {
      tag_name: `v${version}`,
      target_commitish: "main",
      name: `PandaStore v${version} Oficial`,
      body: notes,
      draft: false,
      prerelease: false
    };

    console.log("Creando Release en GitHub API...");
    const createRes = await fetch("https://api.github.com/repos/josemunoz32/tienda-panda-2.0/releases", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(releaseBody)
    });

    rel = await createRes.json();
    if (!createRes.ok) {
      console.error("Error al crear release:", rel);
      process.exit(1);
    }
    console.log(`Release creado: ${rel.html_url}`);
  }

  const uploadUrlBase = rel.upload_url.split("{")[0];
  const setupPath = path.resolve("PandaStoreLauncher/Publish/PandaStoreSetup.exe");
  const actPath = path.resolve("PandaStoreLauncher/Publish/PandaStoreActivator.exe");

  // Helper function to upload an asset
  async function uploadAsset(filePath, fileName) {
    if (!fs.existsSync(filePath)) {
      console.warn(`No existe ${filePath}`);
      return;
    }
    // Delete existing asset if present
    const existingAsset = (rel.assets || []).find(a => a.name === fileName);
    if (existingAsset) {
      console.log(`Eliminando asset existente ${fileName}...`);
      await fetch(existingAsset.url, {
        method: "DELETE",
        headers
      });
    }

    console.log(`Subiendo ${fileName} (${(fs.statSync(filePath).size / (1024 * 1024)).toFixed(1)} MB)...`);
    const fileBytes = fs.readFileSync(filePath);
    const upRes = await fetch(`${uploadUrlBase}?name=${fileName}`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/octet-stream",
        "Content-Length": fileBytes.length.toString()
      },
      body: fileBytes
    });

    if (upRes.ok) {
      console.log(`✅ ${fileName} subido con éxito.`);
    } else {
      console.error(`❌ Error subiendo ${fileName}:`, await upRes.text());
    }
  }

  await uploadAsset(setupPath, "PandaStoreSetup.exe");
  await uploadAsset(actPath, "PandaStoreActivator.exe");

  console.log(`\n🎉 Publicación v${version} en GitHub completada exitosamente: ${rel.html_url}`);
}

main().catch(err => {
  console.error("Error fatal en main():", err);
  process.exit(1);
});

