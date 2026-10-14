/**
 * upload_launcher_gofile.mjs
 * Sube PandaStoreLauncher.exe a GoFile y devuelve el link público.
 * Uso: node upload_launcher_gofile.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EXE_PATH = path.resolve(
  __dirname,
  "../PandaStoreLauncher/Publish/PandaStoreLauncher.exe"
);

// ── GoFile token (account token for uploading to your account) ──────────────
// If you have a GoFile account token paste it here, otherwise leave empty
// to upload as a guest (link expires after inactivity).
const GOFILE_TOKEN = process.env.GOFILE_TOKEN || "";

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, { headers: { "User-Agent": "PandaStore/1.0" } }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("Bad JSON: " + data.slice(0, 200)));
        }
      });
    }).on("error", reject);
  });
}

async function getBestServer() {
  const r = await fetchJson("https://api.gofile.io/servers");
  if (r.status !== "ok") throw new Error("GoFile server list failed: " + JSON.stringify(r));
  const servers = r.data.servers;
  // Prefer eu servers for speed from SA
  const best = servers.find((s) => s.zone === "eu") || servers[0];
  return best.name;
}

async function uploadFile(serverName, filePath) {
  const fileName = path.basename(filePath);
  const fileSize = fs.statSync(filePath).size;
  const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

  console.log(`\n📦 Subiendo: ${fileName}`);
  console.log(`   Tamaño:   ${fileSizeMB} MB`);
  console.log(`   Servidor: ${serverName}.gofile.io`);

  const boundary = "----PandaStoreBoundary" + Date.now();
  const uploadUrl = `https://${serverName}.gofile.io/contents/uploadfile`;

  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);

    // Build multipart body
    const header = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
      `Content-Type: application/octet-stream`,
      "",
      "",
    ].join("\r\n");

    const footer = `\r\n--${boundary}--\r\n`;
    const totalLength = Buffer.byteLength(header) + fileSize + Buffer.byteLength(footer);

    const options = {
      hostname: `${serverName}.gofile.io`,
      path: "/contents/uploadfile",
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": totalLength,
        "User-Agent": "PandaStore/1.0",
        ...(GOFILE_TOKEN ? { Authorization: `Bearer ${GOFILE_TOKEN}` } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("Upload response parse error: " + data.slice(0, 500)));
        }
      });
    });

    req.on("error", reject);

    // Write multipart manually
    req.write(header);

    let uploaded = 0;
    fileStream.on("data", (chunk) => {
      uploaded += chunk.length;
      const pct = ((uploaded / fileSize) * 100).toFixed(1);
      process.stdout.write(`\r   Progreso: ${pct}% (${(uploaded / 1024 / 1024).toFixed(1)} MB / ${fileSizeMB} MB)`);
      req.write(chunk);
    });

    fileStream.on("end", () => {
      process.stdout.write("\r   Progreso: 100% ✅                                    \n");
      req.write(footer);
      req.end();
    });

    fileStream.on("error", reject);
  });
}

async function main() {
  console.log("════════════════════════════════════════════");
  console.log("  PandaStore Launcher → GoFile Uploader");
  console.log("════════════════════════════════════════════");

  if (!fs.existsSync(EXE_PATH)) {
    console.error(`\n❌ No se encontró el EXE en:\n   ${EXE_PATH}`);
    console.error("   Ejecuta primero: publish.ps1");
    process.exit(1);
  }

  try {
    // 1. Get best upload server
    console.log("\n🌐 Obteniendo servidor GoFile más rápido...");
    const server = await getBestServer();

    // 2. Upload
    const result = await uploadFile(server, EXE_PATH);

    if (result.status !== "ok") {
      throw new Error("Upload falló: " + JSON.stringify(result));
    }

    const fileData = result.data;
    const downloadLink = `https://gofile.io/d/${fileData.parentFolder}`;
    const directLink = fileData.downloadPage || downloadLink;

    console.log("\n════════════════════════════════════════════");
    console.log("  ✅ SUBIDA EXITOSA");
    console.log("════════════════════════════════════════════");
    console.log(`  📎 Link GoFile:     ${downloadLink}`);
    console.log(`  📁 Folder ID:       ${fileData.parentFolder}`);
    console.log(`  🆔 File ID:         ${fileData.id}`);
    console.log(`  📝 MD5:             ${fileData.md5 || "N/A"}`);
    console.log("════════════════════════════════════════════");
    console.log("\n📋 Copia este link para LauncherDownloadPage.js:");
    console.log(`   const WIN_GOFILE_URL = "${downloadLink}";`);
    console.log("");

    // 3. Write result to a JSON file for automated patching
    const outFile = path.resolve(__dirname, "gofile_upload_result.json");
    fs.writeFileSync(
      outFile,
      JSON.stringify(
        {
          gofileUrl: downloadLink,
          folderId: fileData.parentFolder,
          fileId: fileData.id,
          uploadedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
    console.log(`💾 Resultado guardado en: ${outFile}`);
  } catch (err) {
    console.error("\n❌ Error durante la subida:", err.message);
    process.exit(1);
  }
}

main();
