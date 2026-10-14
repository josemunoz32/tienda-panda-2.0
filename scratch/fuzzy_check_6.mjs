import fs from 'fs';

const currentGames = JSON.parse(fs.readFileSync('listado_juegos.json', 'utf8'));

const targetNames = ["mirage", "valhalla", "wukong", "far cry 6", "old country", "legion"];

targetNames.forEach(t => {
  const matches = currentGames.filter(g => g.name.toLowerCase().includes(t));
  console.log(`Búsqueda '${t}':`);
  matches.forEach(m => {
    console.log(` - ${m.name} | FixURL: '${m.fixDriveId}' | AppID: ${m.appId}`);
  });
});
