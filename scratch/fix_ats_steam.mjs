import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';

console.log('1. Cerrando procesos de Steam...');
try {
  execSync('taskkill /F /IM steam.exe /IM steamwebhelper.exe /T', { stdio: 'ignore' });
} catch (e) {}

const steamPath = 'C:\\Program Files (x86)\\Steam';
const depotCache = path.join(steamPath, 'depotcache');
const configDepotCache = path.join(steamPath, 'config', 'depotcache');

if (!fs.existsSync(depotCache)) fs.mkdirSync(depotCache, { recursive: true });
if (!fs.existsSync(configDepotCache)) fs.mkdirSync(configDepotCache, { recursive: true });

console.log('2. Copiando los 68 manifiestos de Ryuu a depotcache y config/depotcache...');
const srcDir = 'scratch/ats_extracted';
const files = fs.readdirSync(srcDir);
let count = 0;

for (const file of files) {
  if (file.endsWith('.manifest')) {
    const src = path.join(srcDir, file);
    fs.copyFileSync(src, path.join(depotCache, file));
    fs.copyFileSync(src, path.join(configDepotCache, file));
    count++;
  }
}
console.log(`Copiados ${count} manifiestos correctamente.`);

// Asegurar que 270880.lua esté en todos los plugins
const luaSrc = path.join(srcDir, '270880.lua');
if (fs.existsSync(luaSrc)) {
  const luaDirs = [
    path.join(steamPath, 'config', 'st-plugin'),
    path.join(steamPath, 'config', 'stplug-in'),
    path.join(steamPath, 'plugins'),
    path.join(steamPath, 'config', 'lua')
  ];
  for (const d of luaDirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    fs.copyFileSync(luaSrc, path.join(d, '270880.lua'));
  }
  console.log('270880.lua asegurado en todos los directorios de plugins.');
}

console.log('3. Eliminando archivos corruptos de descarga anterior...');
const downloadingPath = path.join(steamPath, 'steamapps', 'downloading', '270880');
const tempPath = path.join(steamPath, 'steamapps', 'temp', '270880');
const appmanifestPath = path.join(steamPath, 'steamapps', 'appmanifest_270880.acf');

if (fs.existsSync(downloadingPath)) {
  fs.rmSync(downloadingPath, { recursive: true, force: true });
  console.log('✔ Eliminado: steamapps/downloading/270880');
}
if (fs.existsSync(tempPath)) {
  fs.rmSync(tempPath, { recursive: true, force: true });
  console.log('✔ Eliminado: steamapps/temp/270880');
}
if (fs.existsSync(appmanifestPath)) {
  fs.unlinkSync(appmanifestPath);
  console.log('✔ Eliminado: appmanifest_270880.acf corrupto');
}

console.log('4. Reiniciando Steam...');
const steamExe = path.join(steamPath, 'steam.exe');
spawn(steamExe, [], { detached: true, stdio: 'ignore' }).unref();
console.log('✔ Steam iniciado limpiamente con todos los manifiestos en su lugar.');
