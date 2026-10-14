import fs from 'fs';

const currentGames = JSON.parse(fs.readFileSync('listado_juegos.json', 'utf8'));

const targetNames = [
  "assassin's creed mirage",
  "assassin's creed valhalla",
  "blackmythwukong",
  "far cry 6",
  "mafia the old country",
  "watchdogs_legion"
];

console.log("=== ESTADO EN FIRESTORE DE LOS 6 JUEGOS ===");
targetNames.forEach(t => {
  const match = currentGames.find(g => g.name.toLowerCase().includes(t) || t.includes(g.name.toLowerCase()));
  if (match) {
    console.log(`✅ [VINCULADO] '${match.name}' (AppID: ${match.appId})`);
    console.log(`   └─ GoFile / Fix URL: ${match.fixDriveId || '❌ SIN LINK EN FIRESTORE'}`);
  } else {
    console.log(`⚠️ No encontrado en la base de datos: ${t}`);
  }
});
