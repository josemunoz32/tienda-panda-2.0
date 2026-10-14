import fs from 'fs';
import path from 'path';

const steamPath = path.join(process.cwd(), 'fixes/Pack_Steam/archivos_juego');
const gameFolders = fs.readdirSync(steamPath).filter(f => fs.statSync(path.join(steamPath, f)).isDirectory());

console.log(`TOTAL_GAMES_COUNT:${gameFolders.length}`);
fs.writeFileSync(path.join(process.cwd(), 'scratch/owned_folders.json'), JSON.stringify(gameFolders, null, 2));
