import fs from 'fs';

const localFolders = fs.readdirSync('fixes/Pack_Steam/archivos_juego');

const fixesZipNames = [
  'Borderlands 3',
  'Dragons Dogma 2',
  'Granblue Fantasy Relink',
  'Lies of P',
  'MonsterHunterRise',
  'NARUTO SHIPPUDEN Ultimate Ninja',
  'P5R',
  'Remnant2',
  'Tiny Tina\'s Wonderlands'
];

console.log('=== AUDITORÍA DE ARCHIVOS CON FIX (.zip) ===');
fixesZipNames.forEach(name => {
  const match = localFolders.find(f => f.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(f.toLowerCase()));
  console.log(`Fix Zip: '${name}' -> Carpeta LUA local: ${match ? match : 'NO ENCONTRADA'}`);
});
