import fs from 'fs';

const games = JSON.parse(fs.readFileSync('listado_juegos.json', 'utf8'));

if (!games.some(g => String(g.appId) === '33230')) {
  games.push({
    appId: '33230',
    name: "Assassin's Creed 2",
    steamFolderName: "Assassin's Creed 2"
  });
  games.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
  fs.writeFileSync('listado_juegos.json', JSON.stringify(games, null, 2), 'utf8');
  console.log("Restored Assassin's Creed 2!");
} else {
  console.log("Assassin's Creed 2 already present.");
}
