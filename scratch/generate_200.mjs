import fs from 'fs';

const localFolders = fs.readdirSync('fixes/Pack_Steam/archivos_juego');
const dbGames = JSON.parse(fs.readFileSync('listado_juegos.json', 'utf8'));

function clean(str) {
  if (!str) return '';
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '');
}

const existingCleanSet = new Set();
localFolders.forEach(f => existingCleanSet.add(clean(f)));
dbGames.forEach(g => {
  existingCleanSet.add(clean(g.name));
  if (g.appId) existingCleanSet.add(clean(g.appId.toString()));
});

// Ampliamos el pool a 260 juegos reconocidos en Steam
const extraPool = [
  // Mas RPGs y Aventuras AAA
  "Dragon's Dogma 2", "S.T.A.L.K.E.R. 2: Heart of Chornobyl", "Persona 3 Reload", "Like a Dragon: Infinite Wealth",
  "Baldur's Gate 3", "Starfield", "Lies of P", "Remnant II", "Dead Space Remake", "Monster Hunter Rise",
  "Nier: Automata", "Persona 5 Royal", "Tales of Arise", "Dragon Quest XI S", "Doom (2016)", "Borderlands 3",
  "Tiny Tina's Wonderlands", "PAYDAY 3", "Insurgency: Sandstorm", "Titanfall 2", "Half-Life: Alyx",
  "Resident Evil Village", "Resident Evil 7: Biohazard", "The Evil Within 2", "The Evil Within",
  "Age of Empires II: Definitive Edition", "Manor Lords", "Forza Motorsport", "EA SPORTS FC 24",
  "Need for Speed Unbound", "Assetto Corsa Competizione", "F1 24", "NBA 2K24",
  "Wolfenstein II: The New Colossus", "Wolfenstein: The New Order", "Wolfenstein: Youngblood",
  "Call of Duty: Black Ops III", "Call of Duty: Infinite Warfare", "Far Cry 6", "Far Cry 5", "Far Cry 4", "Far Cry 3",
  "Borderlands GOTY Enhanced", "Borderlands 2", "Prey", "Deus Ex: Mankind Divided", "Deus Ex: Human Revolution",
  "Shadow Warrior 3", "Shadow Warrior 2", "Sniper Elite 5", "Sniper Elite 4", "Sniper Ghost Warrior Contracts 2",
  "Zombie Army 4: Dead War", "Aliens: Fireteam Elite", "Hell Let Loose", "SQUAD", "ARMA 3",
  "Outlast 2", "Outlast", "The Outlast Trials", "Amnesia: The Bunker", "Amnesia: Rebirth", "Amnesia: The Dark Descent",
  "SOMA", "Layers of Fear (2023)", "Dead by Daylight", "Phasmophobia", "Devour", "Demonologist",
  "The Dark Pictures Anthology: House of Ashes", "The Dark Pictures Anthology: The Devil in Me",
  "The Dark Pictures Anthology: Man of Medan", "The Dark Pictures Anthology: Little Hope",
  "The Chant", "Slender: The Arrival", "Visage", "MADiSON",
  "Dark Souls II: Scholar of the First Sin", "Salt and Sanctuary", "Code Vein", "Mortal Shell",
  "The Surge 2", "The Surge", "Lord of the Fallen (2023)", "Thymesia", "Steelrising", "Ashen",
  "Dragon Ball Z: Kakarot", "Dragon Ball Xenoverse 2", "Naruto Shippuden: Ultimate Ninja STORM 4",
  "One Piece: Pirate Warriors 4", "One Piece Odyssey", "My Hero One's Justice 2", "Demon Slayer: Kimetsu no Yaiba",
  "Sword Art Online: Alicization Lycoris", "Scarlet Nexus", "Ys IX: Monstrum Nox", "Ys VIII: Lacrimosa of DANA",
  "Granblue Fantasy: Relink", "Visions of Mana", "Triangle Strategy", "Octopath Traveler II", "Octopath Traveler",
  "Live A Live", "Bravely Default II", "Disgaea 6 Complete", "Ni no Kuni II: Revenant Kingdom",
  "Age of Empires IV", "Age of Empires III: Definitive Edition", "Age of Mythology: Retold",
  "Total War: WARHAMMER III", "Total War: WARHAMMER II", "Total War: THREE KINGDOMS", "Total War: ROME II",
  "Company of Heroes 3", "Company of Heroes 2", "Command & Conquer Remastered Collection",
  "SpellForce 3 Reforced", "Anno 1800", "Tropico 6", "Crusader Kings III", "Hearts of Iron IV",
  "Europa Universalis IV", "Victoria 3", "Stellaris", "Cities: Skylines II", "Cities: Skylines",
  "Jurassic World Evolution 2", "Planet Zoo", "Planet Coaster", "Two Point Campus", "Two Point Hospital",
  "Subnautica: Below Zero", "Oxygen Not Included", "Raft", "Green Hell", "Stranded Deep",
  "The Forest", "Sons of the Forest", "Medieval Dynasty", "Sengoku Dynasty", "Bellwright",
  "WRC Generations", "EA SPORTS WRC", "DIRT 5", "DiRT Rally 2.0", "GRID Legends",
  "Project CARS 3", "Project CARS 2", "MotoGP 24", "RIDE 5", "RIDE 4",
  "PGA TOUR 2K23", "PGA TOUR 2K21", "TopSpin 2K25", "WWE 2K23", "WWE 2K22",
  "Hades II", "Hades", "Balatro", "Dave the Diver", "Cult of the Lamb", "Dredge",
  "Tunic", "Sea of Stars", "Chained Echoes", "Eiyuden Chronicle: Hundred Heroes",
  "Blasphemous 2", "Blasphemous", "Ender Lilies", "Ghostrunner 2", "Ghostrunner",
  "Risk of Rain Returns", "Risk of Rain 2", "Deep Rock Galactic", "Gunfire Reborn",
  "Roboquest", "Remnant: From the Ashes", "Strange Brigade", "Vermintide 2",
  "Darktide", "Astroneer", "Slime Rancher 2", "Slime Rancher", "Core Keeper",
  "Sun Haven", "My Time at Sandrock", "My Time at Portia", "Coral Island",
  "Potion Craft", "Kena: Bridge of Spirits", "Stray", "Solar Ash", "The Pathless",
  "Abzû", "Journey", "Gris", "Neva", "Cat Quest III", "Cat Quest II",
  "Torchlight III", "Torchlight II", "Grim Dawn", "Inscryption", "Loop Hero",
  "Monster Train", "Wildfrost", "Darkest Dungeon II", "Darkest Dungeon",
  "Frostpunk", "This War of Mine", "Six Days in Fallujah", "Police Simulator: Patrol Officers",
  // Títulos extra populares en Steam
  "Shadow of the Tomb Raider", "Rise of the Tomb Raider", "Tomb Raider (2013)", "Batman: Arkham Knight",
  "Batman: Arkham City", "Batman: Arkham Asylum", "Middle-earth: Shadow of War", "Middle-earth: Shadow of Mordor",
  "Watch Dogs 2", "Watch Dogs", "Assassins Creed Valhalla", "Assassins Creed Odyssey", "Assassins Creed Origins",
  "Assassins Creed Black Flag", "Assassins Creed Syndicate", "Splinter Cell Blacklist", "Ghost Recon Breakpoint",
  "Ghost Recon Wildlands", "Division 2", "The Division", "Just Cause 4", "Just Cause 3", "Mad Max",
  "Rage 2", "Rage", "Dishonored 2", "Dishonored: Death of the Outsider", "Dishonored",
  "BioShock Infinite", "BioShock Remastered", "BioShock 2 Remastered", "Borderlands: The Pre-Sequel",
  "Risk of Rain", "Synthetik: Legion of Rising", "Superhot", "Superhot VR", "Hotline Miami 2: Wrong Number",
  "Hotline Miami", "Katana Zero", "My Friend Pedro", "Enter the Gungeon", "Exit the Gungeon",
  "Dead Rising 4", "Dead Rising 3", "Dead Rising 2", "State of Decay 2", "State of Decay",
  "Generation Zero", "Scum", "DayZ", "Rust", "ARK: Survival Evolved", "ARK: Survival Ascended",
  "Conan Exiles", "7 Days to Die", "Don't Starve Together", "Don't Starve", "Unturned",
  "Terraria", "Starbound", "No Man's Sky", "Outer Wilds", "Subnautica", "Breathedge",
  "System Shock", "Control Ultimate Edition", "Quantum Break", "Death Stranding Director's Cut"
];

const cleanList = [];
const seenClean = new Set();

for (const name of extraPool) {
  const cName = clean(name);
  if (!existingCleanSet.has(cName) && !seenClean.has(cName)) {
    let isSubMatch = false;
    for (const existing of existingCleanSet) {
      if (existing.length > 5 && (existing.includes(cName) || cName.includes(existing))) {
        isSubMatch = true;
        break;
      }
    }
    if (!isSubMatch) {
      seenClean.add(cName);
      cleanList.push(name);
    }
  }
}

console.log(`Filtro estricto completado. Juegos 100% nuevos encontrados: ${cleanList.length}`);
fs.writeFileSync('scratch/listado_200_nuevos.json', JSON.stringify(cleanList.slice(0, 200), null, 2));
