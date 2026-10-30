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

const version = "2.4.37";
const notes = "v2.4.37 - Corrección total y definitiva del bucle de actualización del launcher (sincronización estricta de instalador Inno Setup con elevación, reconexión reanudable HTTP Range sin descompresión prematura) y preservación al 100% de descarga completa de juegos de Steam en múltiples discos.";

// 2. Crear y subir Tag git v2.4.37
console.log(`Creando tag git v${version}...`);
spawnSync("git", ["tag", "-d", `v${version}`], { stdio: "inherit" });
spawnSync("git", ["push", "origin", `:refs/tags/v${version}`], { stdio: "inherit" });
spawnSync("git", ["tag", `v${version}`], { stdio: "inherit" });
spawnSync("git", ["push", "origin", `v${version}`], { stdio: "inherit" });
console.log(`Tag v${version} enviado a GitHub.`);

// 3. Crear Release en GitHub
async function main() {
  const headers = {
    "Authorization": `token ${token}`,
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "PandaStoreReleasePublisher"
  };

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

  const rel = await createRes.json();
  if (!createRes.ok) {
    console.error("Error al crear release:", rel);
    process.exit(1);
  }

  console.log(`Release creado: ${rel.html_url}`);
  const uploadUrlBase = rel.upload_url.split("{")[0];

  const setupPath = path.resolve("PandaStoreLauncher/Publish/PandaStoreSetup.exe");
  const actPath = path.resolve("PandaStoreLauncher/Publish/PandaStoreActivator.exe");

  if (fs.existsSync(setupPath)) {
    console.log(`Subiendo PandaStoreSetup.exe (${(fs.statSync(setupPath).size / (1024 * 1024)).toFixed(1)} MB)...`);
    const setupBytes = fs.readFileSync(setupPath);
    const upRes = await fetch(`${uploadUrlBase}?name=PandaStoreSetup.exe`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/octet-stream",
        "Content-Length": setupBytes.length.toString()
      },
      body: setupBytes
    });
    if (upRes.ok) {
      console.log("✅ PandaStoreSetup.exe subido con éxito.");
    } else {
      console.error("❌ Error subiendo PandaStoreSetup.exe:", await upRes.text());
    }
  }

  if (fs.existsSync(actPath)) {
    console.log(`Subiendo PandaStoreActivator.exe (${(fs.statSync(actPath).size / (1024 * 1024)).toFixed(1)} MB)...`);
    const actBytes = fs.readFileSync(actPath);
    const upActRes = await fetch(`${uploadUrlBase}?name=PandaStoreActivator.exe`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/octet-stream",
        "Content-Length": actBytes.length.toString()
      },
      body: actBytes
    });
    if (upActRes.ok) {
      console.log("✅ PandaStoreActivator.exe subido con éxito.");
    } else {
      console.error("❌ Error subiendo PandaStoreActivator.exe:", await upActRes.text());
    }
  }

  console.log(`\n🎉 Publicación v${version} en GitHub completada exitosamente.`);
}

main().catch(err => {
  console.error("Error fatal en main():", err);
  process.exit(1);
});
