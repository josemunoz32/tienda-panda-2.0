import fs from 'fs';

const myGames = JSON.parse(fs.readFileSync('listado_juegos.json', 'utf8'));
const myNamesLower = new Set(myGames.map(g => g.name.toLowerCase().trim()));
const myAppIds = new Set(myGames.map(g => g.appId.toString().trim()));

// Gran catálogo de juegos top / AAA / Populares de PC & Steam
const catalogCandidates = [
  // AAA Recientes & Éxitos Grandes
  { name: "Black Myth: Wukong", category: "Acción / RPG", year: 2024 },
  { name: "Helldivers 2", category: "Shooter Co-op", year: 2024 },
  { name: "Warhammer 40,000: Space Marine 2", category: "Acción / Shooter", year: 2024 },
  { name: "Dragon's Dogma 2", category: "RPG / Acción", year: 2024 },
  { name: "Palworld", category: "Supervivencia / Aventura", year: 2024 },
  { name: "S.T.A.L.K.E.R. 2: Heart of Chornobyl", category: "Shooter / FPS / Terror", year: 2024 },
  { name: "Persona 3 Reload", category: "JRPG", year: 2024 },
  { name: "Like a Dragon: Infinite Wealth", category: "RPG / Acción", year: 2024 },
  { name: "Tekken 8", category: "Lucha", year: 2024 },
  { name: "Final Fantasy XVI", category: "RPG / Acción", year: 2024 },
  { name: "God of War Ragnarök", category: "Acción / Aventura", year: 2024 },
  { name: "Ghost of Tsushima Director's Cut", category: "Acción / Aventura", year: 2024 },
  { name: "Silent Hill 2 Remake", category: "Terror / Horror", year: 2024 },
  { name: "Horizon Forbidden West Complete Edition", category: "Acción / RPG", year: 2024 },
  { name: "The Last of Us Part I", category: "Acción / Terror", year: 2023 },
  { name: "Baldur's Gate 3", category: "RPG", year: 2023 },
  { name: "Cyberpunk 2077: Phantom Liberty", category: "RPG / Acción", year: 2023 },
  { name: "Starfield", category: "RPG / Espacio", year: 2023 },
  { name: "Armored Core VI: Fires of Rubicon", category: "Acción / Mecha", year: 2023 },
  { name: "Lies of P", category: "Soulslike / Acción", year: 2023 },
  { name: "Remnant II", category: "Shooter Soulslike", year: 2023 },
  { name: "Alan Wake 2", category: "Terror / Survival Horror", year: 2023 },
  { name: "Street Fighter 6", category: "Lucha", year: 2023 },
  { name: "Mortal Kombat 1", category: "Lucha", year: 2023 },
  { name: "Dead Space Remake", category: "Terror / Sci-Fi", year: 2023 },
  { name: "Resident Evil 4 Remake", category: "Terror / Acción", year: 2023 },
  { name: "Hogwarts Legacy", category: "RPG / Mundo Abierto", year: 2023 },
  { name: "System Shock Remake", category: "FPS / Sci-Fi", year: 2023 },
  { name: "Atomic Heart", category: "FPS / Acción", year: 2023 },

  // Grandes Clásicos & Imprescindibles
  { name: "Elden Ring", category: "RPG / Soulslike", year: 2022 },
  { name: "God of War", category: "Acción / Aventura", year: 2022 },
  { name: "Spider-Man Remastered", category: "Acción / Superhéroes", year: 2022 },
  { name: "Spider-Man: Miles Morales", category: "Acción / Superhéroes", year: 2022 },
  { name: "Uncharted: Legacy of Thieves Collection", category: "Acción / Aventura", year: 2022 },
  { name: "Red Dead Redemption 2", category: "Mundo Abierto / Acción", year: 2019 },
  { name: "The Witcher 3: Wild Hunt", category: "RPG / Mundo Abierto", year: 2015 },
  { name: "Grand Theft Auto V", category: "Mundo Abierto / Acción", year: 2015 },
  { name: "Red Dead Redemption", category: "Acción / Western", year: 2024 },
  { name: "Sekiro: Shadows Die Twice", category: "Soulslike / Acción", year: 2019 },
  { name: "Dark Souls III", category: "Soulslike / RPG", year: 2016 },
  { name: "Dark Souls Remastered", category: "Soulslike / RPG", year: 2018 },
  { name: "Dark Souls II: Scholar of the First Sin", category: "Soulslike / RPG", year: 2015 },
  { name: "Monster Hunter: World", category: "Acción / RPG", year: 2018 },
  { name: "Monster Hunter Rise", category: "Acción / RPG", year: 2021 },
  { name: "Devil May Cry 5", category: "Acción / Hack and Slash", year: 2019 },
  { name: "Nier: Automata", category: "RPG / Acción", year: 2017 },
  { name: "Persona 5 Royal", category: "JRPG", year: 2022 },
  { name: "Tales of Arise", category: "JRPG", year: 2021 },
  { name: "Dragon Quest XI S", category: "JRPG", year: 2020 },

  // Shooters & FPS Populares
  { name: "Doom Eternal", category: "FPS / Acción", year: 2020 },
  { name: "Doom (2016)", category: "FPS / Acción", year: 2016 },
  { name: "Wolfenstein II: The New Colossus", category: "FPS / Acción", year: 2017 },
  { name: "Wolfenstein: The New Order", category: "FPS", year: 2014 },
  { name: "Metro Exodus", category: "FPS / Supervivencia", year: 2019 },
  { name: "Call of Duty: Modern Warfare II", category: "FPS", year: 2022 },
  { name: "Call of Duty: Black Ops III", category: "FPS", year: 2015 },
  { name: "Far Cry 6", category: "FPS / Mundo Abierto", year: 2021 },
  { name: "Far Cry 5", category: "FPS / Mundo Abierto", year: 2018 },
  { name: "Far Cry 3", category: "FPS", year: 2012 },
  { name: "Borderlands 3", category: "Looter Shooter", year: 2019 },
  { name: "Tiny Tina's Wonderlands", category: "Looter Shooter", year: 2022 },
  { name: "PAYDAY 3", category: "Shooter Co-op", year: 2023 },
  { name: "Left 4 Dead 2", category: "Shooter Co-op / Zombis", year: 2009 },
  { name: "Ready or Not", category: "FPS Táctico", year: 2023 },
  { name: "Insurgency: Sandstorm", category: "FPS Táctico", year: 2018 },
  { name: "Hunt: Showdown 1896", category: "Shooter PvPvE", year: 2019 },
  { name: "Titanfall 2", category: "FPS / Mecha", year: 2016 },
  { name: "Half-Life: Alyx", category: "FPS VR", year: 2020 },

  // Terror & Survival Horror
  { name: "Resident Evil Village", category: "Terror / FPS", year: 2021 },
  { name: "Resident Evil 2 Remake", category: "Survival Horror", year: 2019 },
  { name: "Resident Evil 3 Remake", category: "Survival Horror", year: 2020 },
  { name: "Resident Evil 7: Biohazard", category: "Terror FPS", year: 2017 },
  { name: "The Evil Within 2", category: "Survival Horror", year: 2017 },
  { name: "The Evil Within", category: "Survival Horror", year: 2014 },
  { name: "Outlast 2", category: "Terror", year: 2017 },
  { name: "Outlast", category: "Terror", year: 2013 },
  { name: "The Outlast Trials", category: "Terror Co-op", year: 2024 },
  { name: "Dead by Daylight", category: "Terror Asimétrico", year: 2016 },
  { name: "Phasmophobia", category: "Terror Co-op", year: 2020 },
  { name: "Alien: Isolation", category: "Terror / Sci-Fi", year: 2014 },
  { name: "Amnesia: The Bunker", category: "Terror / Survival", year: 2023 },

  // Estrategia, Simulación & Gestión
  { name: "Civilization VI", category: "Estrategia 4X", year: 2016 },
  { name: "Age of Empires IV", category: "Estrategia RTS", year: 2021 },
  { name: "Age of Empires II: Definitive Edition", category: "RTS", year: 2019 },
  { name: "Total War: Warhammer III", category: "Estrategia", year: 2022 },
  { name: "Crusader Kings III", category: "Estrategia Gran Escala", year: 2020 },
  { name: "Hearts of Iron IV", category: "Estrategia Bélica", year: 2016 },
  { name: "Stellaris", category: "Estrategia Espacial 4X", year: 2016 },
  { name: "Cities: Skylines II", category: "Simulación de Ciudades", year: 2023 },
  { name: "Cities: Skylines", category: "Simulación de Ciudades", year: 2015 },
  { name: "Satisfactory", category: "Construcción / Automatización", year: 2024 },
  { name: "Factorio", category: "Construcción / Automatización", year: 2020 },
  { name: "RimWorld", category: "Simulación de Colonia", year: 2018 },
  { name: "Frostpunk 2", category: "Estrategia / Supervivencia", year: 2024 },
  { name: "Frostpunk", category: "Estrategia / Supervivencia", year: 2018 },
  { name: "Manor Lords", category: "Estrategia Medieval", year: 2024 },
  { name: "Farming Simulator 22", category: "Simulación", year: 2021 },
  { name: "Euro Truck Simulator 2", category: "Simulación de Conducción", year: 2012 },

  // Carreras, Deportes & Conducción
  { name: "Forza Horizon 5", category: "Carreras / Mundo Abierto", year: 2021 },
  { name: "Forza Horizon 4", category: "Carreras", year: 2018 },
  { name: "Forza Motorsport", category: "Simulación de Carreras", year: 2023 },
  { name: "EA SPORTS FC 24", category: "Deportes / Fútbol", year: 2023 },
  { name: "Need for Speed Unbound", category: "Carreras", year: 2022 },
  { name: "Need for Speed Heat", category: "Carreras", year: 2019 },
  { name: "Assetto Corsa Competizione", category: "Simulación de Carreras", year: 2019 },
  { name: "Assetto Corsa", category: "Simulación de Carreras", year: 2014 },
  { name: "F1 24", category: "Deportes / Conducción", year: 2024 },
  { name: "NBA 2K24", category: "Deportes", year: 2023 },
  { name: "WWE 2K24", category: "Deportes / Lucha", year: 2024 },
  { name: "Riders Republic", category: "Deportes Extremos", year: 2021 },

  // Indies de Culto & Éxitos Virales
  { name: "Hades II", category: "Roguelike / Acción", year: 2024 },
  { name: "Hades", category: "Roguelike / Acción", year: 2020 },
  { name: "Hollow Knight", category: "Metroidvania", year: 2017 },
  { name: "Celeste", category: "Plataformas", year: 2018 },
  { name: "Dead Cells", category: "Roguelite / Metroidvania", year: 2018 },
  { name: "Balatro", category: "Roguelike de Cartas", year: 2024 },
  { name: "Vampire Survivors", category: "Acción Casual", year: 2022 },
  { name: "Dave the Diver", category: "Aventura / Gestión", year: 2023 },
  { name: "Dredge", category: "Aventura / Pesca / Terror", year: 2023 },
  { name: "Cult of the Lamb", category: "Roguelite / Gestión", year: 2022 },
  { name: "Subnautica", category: "Supervivencia Submarina", year: 2018 },
  { name: "Subnautica: Below Zero", category: "Supervivencia Submarina", year: 2021 },
  { name: "Valheim", category: "Supervivencia / Vikingos", year: 2021 },
  { name: "Project Zomboid", category: "Survival Horror / Zombis", year: 2013 },
  { name: "Slay the Spire", category: "Roguelike de Cartas", year: 2019 },
  { name: "Stardew Valley", category: "Simulación de Vida / Granja", year: 2016 },
  { name: "Cuphead", category: "Acción / Run and Gun", year: 2017 },
  { name: "Terraria", category: "Sandbox / Aventura", year: 2011 },
  { name: "Sea of Thieves", category: "Aventura Pirata / Co-op", year: 2020 },
  { name: "Deep Rock Galactic", category: "Shooter Co-op", year: 2020 },
  { name: "Risk of Rain 2", category: "Roguelike 3D", year: 2020 },
  { name: "Outer Wilds", category: "Exploración / Misterio", year: 2019 },
  { name: "Kena: Bridge of Spirits", category: "Acción / Aventura", year: 2021 },
  { name: "Ori and the Will of the Wisps", category: "Metroidvania", year: 2020 },
  { name: "Ori and the Blind Forest", category: "Metroidvania", year: 2015 },
  { name: "Little Nightmares II", category: "Terror / Puzles", year: 2021 },
  { name: "Inside", category: "Puzles / Plataformas", year: 2016 },
  { name: "Stray", category: "Aventura / Gato Cyberpunk", year: 2022 },
  { name: "High on Life", category: "FPS / Comedia", year: 2022 },
  { name: "It Takes Two", category: "Co-op / Aventura", year: 2021 },
  { name: "A Way Out", category: "Co-op / Acción", year: 2018 }
];

const missing = [];

for (const cand of catalogCandidates) {
  const nameLower = cand.name.toLowerCase().trim();
  // Verificar si ya lo tenemos por coincidencia exacta o parecida
  let exists = false;
  for (const myName of myNamesLower) {
    if (myName === nameLower || myName.includes(nameLower) || nameLower.includes(myName)) {
      exists = true;
      break;
    }
  }
  if (!exists) {
    missing.push(cand);
  }
}

console.log(`PandaStore tiene actualmente: ${myGames.length} juegos.`);
console.log(`Se identificaron ${missing.length} juegos faltantes sugeridos.\n`);

fs.writeFileSync('scratch/missing_games.json', JSON.stringify(missing, null, 2));
