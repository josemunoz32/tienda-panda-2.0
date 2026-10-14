import fs from 'fs';

// 1. Cargar todas las carpetas locales en fixes/Pack_Steam/archivos_juego
const localFolders = fs.readdirSync('fixes/Pack_Steam/archivos_juego');

// 2. Cargar todos los juegos de Firestore
const dbGames = JSON.parse(fs.readFileSync('listado_juegos.json', 'utf8'));

// Normalizador estricto de nombres
function clean(str) {
  if (!str) return '';
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^a-z0-9]/g, ''); // quita espacios, guiones, dos puntos, puntos, etc.
}

const existingCleanSet = new Set();
const existingRawList = [];

localFolders.forEach(f => {
  existingRawList.push(f);
  existingCleanSet.add(clean(f));
});

dbGames.forEach(g => {
  existingRawList.push(g.name);
  existingCleanSet.add(clean(g.name));
});

// Gran lista de candidatos de Steam / PC
const candidates = [
  // AAA y Lanzamientos Recientes Destacados
  { name: "Black Myth: Wukong", cat: "Acción / RPG" },
  { name: "Warhammer 40,000: Space Marine 2", cat: "Acción / Shooter" },
  { name: "Dragon's Dogma 2", cat: "RPG / Acción" },
  { name: "S.T.A.L.K.E.R. 2: Heart of Chornobyl", cat: "FPS / Survival Horror" },
  { name: "Persona 3 Reload", cat: "JRPG" },
  { name: "Like a Dragon: Infinite Wealth", cat: "RPG / Acción" },
  { name: "The Last of Us Part I", cat: "Acción / Terror" },
  { name: "Baldur's Gate 3", cat: "RPG" },
  { name: "Starfield", cat: "RPG / Espacio" },
  { name: "Armored Core VI: Fires of Rubicon", cat: "Acción / Mechas" },
  { name: "Lies of P", cat: "Soulslike" },
  { name: "Remnant II", cat: "Shooter Soulslike" },
  { name: "Street Fighter 6", cat: "Lucha" },
  { name: "Dead Space Remake", cat: "Survival Horror" },
  { name: "Spider-Man: Miles Morales", cat: "Acción / Superhéroes" },
  { name: "Uncharted: Legacy of Thieves Collection", cat: "Acción / Aventura" },
  { name: "The Witcher 3: Wild Hunt", cat: "RPG / Mundo Abierto" },
  { name: "Sekiro: Shadows Die Twice", cat: "Soulslike" },
  { name: "Dark Souls III", cat: "Soulslike" },
  { name: "Dark Souls II: Scholar of the First Sin", cat: "Soulslike" },
  { name: "Monster Hunter Rise", cat: "Acción / RPG" },
  { name: "Nier: Automata", cat: "RPG / Acción" },
  { name: "Persona 5 Royal", cat: "JRPG" },
  { name: "Tales of Arise", cat: "JRPG" },
  { name: "Dragon Quest XI S", cat: "JRPG" },

  // FPS & Shooters Populares
  { name: "Doom Eternal", cat: "FPS / Acción" },
  { name: "Doom 2016", cat: "FPS / Acción" },
  { name: "Wolfenstein II: The New Colossus", cat: "FPS" },
  { name: "Wolfenstein: The New Order", cat: "FPS" },
  { name: "Metro Exodus", cat: "FPS / Survival" },
  { name: "Call of Duty: Modern Warfare II", cat: "FPS" },
  { name: "Call of Duty: Black Ops III", cat: "FPS" },
  { name: "Far Cry 6", cat: "FPS / Mundo Abierto" },
  { name: "Far Cry 5", cat: "FPS / Mundo Abierto" },
  { name: "Far Cry 3", cat: "FPS" },
  { name: "Borderlands 3", cat: "Looter Shooter" },
  { name: "Tiny Tina's Wonderlands", cat: "Looter Shooter" },
  { name: "PAYDAY 3", cat: "Shooter Co-op" },
  { name: "Ready or Not", cat: "FPS Táctico SWAT" },
  { name: "Insurgency: Sandstorm", cat: "FPS Táctico" },
  { name: "Titanfall 2", cat: "FPS / Mechas" },
  { name: "Half-Life: Alyx", cat: "FPS VR" },

  // Terror & Survival Horror
  { name: "Resident Evil Village", cat: "Terror FPS" },
  { name: "Resident Evil 2 Remake", cat: "Survival Horror" },
  { name: "Resident Evil 3 Remake", cat: "Survival Horror" },
  { name: "Resident Evil 7: Biohazard", cat: "Terror FPS" },
  { name: "The Evil Within 2", cat: "Survival Horror" },
  { name: "The Evil Within", cat: "Survival Horror" },
  { name: "Outlast 2", cat: "Terror" },
  { name: "Outlast", cat: "Terror" },
  { name: "The Outlast Trials", cat: "Terror Co-op" },
  { name: "Amnesia: The Bunker", cat: "Terror / Survival" },

  // Estrategia & Simulación
  { name: "Age of Empires IV", cat: "Estrategia RTS" },
  { name: "Age of Empires II: Definitive Edition", cat: "RTS" },
  { name: "Total War: Warhammer III", cat: "Estrategia Gran Escala" },
  { name: "Cities: Skylines II", cat: "Simulación de Ciudades" },
  { name: "Satisfactory", cat: "Construcción / Automatización" },
  { name: "RimWorld", cat: "Simulación de Colonia" },
  { name: "Frostpunk 2", cat: "Estrategia / Supervivencia" },
  { name: "Manor Lords", cat: "Estrategia Medieval" },
  { name: "Euro Truck Simulator 2", cat: "Simulación de Conducción" },

  // Carreras & Deportes
  { name: "Forza Motorsport", cat: "Simulación de Carreras" },
  { name: "EA SPORTS FC 24", cat: "Deportes / Fútbol" },
  { name: "Need for Speed Unbound", cat: "Carreras" },
  { name: "Assetto Corsa Competizione", cat: "Simulación de Carreras" },
  { name: "F1 24", cat: "Deportes / Conducción" },
  { name: "NBA 2K24", cat: "Deportes" },

  // Indies Top & Virales
  { name: "Hades II", cat: "Roguelike / Acción" },
  { name: "Hades", cat: "Roguelike / Acción" },
  { name: "Balatro", cat: "Roguelike de Cartas" },
  { name: "Dave the Diver", cat: "Aventura / Gestión" },
  { name: "Cult of the Lamb", cat: "Roguelite / Gestión" }
];

const percent100New = [];

candidates.forEach(c => {
  const cClean = clean(c.name);
  let isDup = false;

  for (const existing of existingCleanSet) {
    if (existing === cClean || existing.includes(cClean) || cClean.includes(existing)) {
      isDup = true;
      break;
    }
  }

  if (!isDup) {
    percent100New.push(c);
  }
});

console.log(`Buscando sobre ${localFolders.length} carpetas locales y ${dbGames.length} juegos DB.`);
console.log(`Juegos totalmente NUEVOS sin duplicados encontrados: ${percent100New.length}`);
fs.writeFileSync('scratch/zero_duplicates.json', JSON.stringify(percent100New, null, 2));
