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

const version = "2.4.36";
const notes = "v2.4.36 - Corrección definitiva del error de descarga de 1 MB en juegos Steam: desbloqueo y preservación de todas las claves de desencriptado de depots y manifiestos de juego completo. Sistema de actualización reanudable (HTTP Range) con reconexión automática ante cortes de red.";

// 2. Crear y subir Tag git v2.4.36
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
      headers: { ...headers, "Content-Type": "application/octet-stream" },
      body: setupBytes
    });
    const upData = await upRes.json();
    console.log("PandaStoreSetup.exe subido con éxito:", upData.browser_download_url);
  } else {
    console.error("No se encontró PandaStoreSetup.exe en", setupPath);
  }

  if (fs.existsSync(actPath)) {
    console.log(`Subiendo PandaStoreActivator.exe...`);
    const actBytes = fs.readFileSync(actPath);
    const upRes = await fetch(`${uploadUrlBase}?name=PandaStoreActivator.exe`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/octet-stream" },
      body: actBytes
    });
    const upData = await upRes.json();
    console.log("PandaStoreActivator.exe subido con éxito:", upData.browser_download_url);
  }

  console.log("==========================================");
  console.log(`✅ RELEASE v${version} PUBLICADO CON ÉXITO EN GITHUB`);
  console.log("==========================================");
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
