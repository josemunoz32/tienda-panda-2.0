import fs from 'fs';

const rawList = JSON.parse(fs.readFileSync('scratch/listado_200_nuevos.json', 'utf8'));

// Lista de palabras clave o títulos de juegos netamente multijugador / requeridores de servidores dedicados
const onlineKeywords = [
  "rust", "scum", "dayz", "dead by daylight", "phasmophobia", "devour", "demonologist",
  "hell let loose", "squad", "arma 3", "payday 3", "aliens: fireteam elite",
  "six days in fallujah", "ea sports fc", "nba 2k", "f1 24", "wwe 2k", "pga tour", "motogp 24"
];

const offlineSinglePlayerOnly = [];

rawList.forEach(game => {
  const gLower = game.toLowerCase();
  let isOnlineOnly = false;

  for (const kw of onlineKeywords) {
    if (gLower.includes(kw)) {
      isOnlineOnly = true;
      break;
    }
  }

  if (!isOnlineOnly) {
    offlineSinglePlayerOnly.push(game);
  }
});

console.log(`Filtrados juegos online/servidores. Juegos 100% Modo Historia / Offline restantes: ${offlineSinglePlayerOnly.length}`);
fs.writeFileSync('scratch/singleplayer_offline_200.json', JSON.stringify(offlineSinglePlayerOnly, null, 2));
