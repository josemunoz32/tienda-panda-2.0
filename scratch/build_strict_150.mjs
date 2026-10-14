import fs from 'fs';
import path from 'path';

// 1. Load exact owned game folder names
const ownedFolders = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scratch/owned_folders.json'), 'utf8'));

// Strict normalization for comparison
function clean(str) {
  return (str || '')
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '');
}

// Tokenize to check word overlap
function getTokens(str) {
  return clean(str).split(/[^a-z0-9]+/).filter(t => t.length > 2);
}

const ownedCleanList = ownedFolders.map(f => clean(f));

// Comprehensive pool of acclaimed single-player PC games across all genres
const candidatePool = [
  "Shadow of the Colossus", "Bloodborne", "Demon's Souls", "Stellaris Nexus", "Frostpunk 2",
  "Kingdom Come Deliverance II", "Dragon Age The Veilguard", "Star Wars Outlaws", "Avowed", "Fable",
  "Indiana Jones and the Great Circle", "Subnautica 2", "LightNoFire", "Judas", "Pragmata",
  "Black Myth Wukong", "Phantom Blade Zero", "Where Waves Meet", "Crimson Desert", "Dune Awakening",
  "Slitterhead", "Lollipops Chainsaw RePOP", "Epic Mickey Rebrushed", "Dead Rising Deluxe Remaster", "Clock Tower Rewind",
  "Tomb Raider I-III Remastered", "Apollo Justice Ace Attorney Trilogy", "Brothers A Tale of Two Sons Remake", "Until Dawn Remake",
  "Paper Mario The Thousand Year Door", "Luigi's Mansion 2 HD", "Super Mario RPG", "Princess Peach Showtime", "Mario vs Donkey Kong",
  "Another Crab's Treasure", "Pacific Drive", "Banishers Ghosts of New Eden", "Sker Ritual", "Harold Halibut",
  "The Plucky Squire", "Neva", "Manor Lords", "Hades II", "Nine Sols",
  "Ender Magnolia Bloom in the Mist", "Mullet MadJack", "Crow Country", "Animal Well", "Lorelei and the Laser Eyes",
  "Duck Detective The Secret Salami", "1000xRESIST", "Indika", "Selaco", "Shadows of Doubt",
  "Tactics Ogre Reborn", "Live A Live", "Star Ocean The Second Story R", "Romancing SaGa 2 Revenge of the Seven", "Chrono Cross The Radical Dreamers Edition",
  "Grandia HD Remaster", "Persona 3 Reload", "Shin Megami Tensei V Vengeance", "Disgaea 7 Vows of the Virtueless", "Dragon Quest III HD-2D Remake",
  "Sea of Stars", "Chained Echoes", "CrossCode", "Eastward", "Eiyuden Chronicle Hundred Heroes",
  "Cassette Beasts", "Monster Hunter Stories 2 Wings of Ruin", "God Eater 3", "Freedom Wars Remastered", "Granblue Fantasy Relink",
  "Fatal Frame Maiden of Black Water", "Fatal Frame Mask of the Lunar Eclipse", "System Shock Remake", "Dead Space 2", "Dead Space 3",
  "Fear 1", "Fear 2 Project Origin", "Fear 3", "Condemned Criminal Origins", "The Evil Within",
  "The Evil Within 2", "Outlast", "Outlast 2", "SOMA", "Observer System Redux",
  "Layers of Fear 2023", "Visage", "MADiSON", "Tormented Souls", "Inscryption",
  "Balatro", "Slay the Spire", "Monster Train", "Darkest Dungeon II", "Loop Hero",
  "Dredge", "Dave the Diver", "Cult of the Lamb", "Graveyard Keeper", "Core Keeper",
  "Sun Haven", "Roots of Pacha", "Moonlighter", "Potion Permit", "Slime Rancher 2",
  "Cat Quest III", "Tunic", "Death's Door", "Hyper Light Drifter", "Solar Ash",
  "Risk of Rain Returns", "Returnal", "Remnant II", "Flintlock The Siege of Dawn", "Enshrouded",
  "Nightingale", "Smalland Survive the Wilds", "Grounded", "Green Hell", "Stranded Deep",
  "The Long Dark", "Ancestors The Humankind Odyssey", "Medieval Dynasty", "Sengoku Dynasty", "Bellwright",
  "Cities Skylines II", "Timberborn", "Against the Storm", "Frostpunk", "Anvil",
  "Warhammer 40000 Rogue Trader", "Warhammer 40000 Boltgun", "Necromunda Hired Gun", "Warhammer Realm of Ruin", "Space Marine 2",
  "Sniper Ghost Warrior Contracts 2", "Trepidation", "RoboCop Rogue City", "Terminator Resistance", "Aliens Dark Descent", "Alien Isolation",
  "Predator Hunting Grounds", "Ghostrunner 2", "Bright Memory Infinite", "Ultrakill", "Trepang2",
  "Prodeus", "Amid Evil", "Dusk", "Ion Fury", "Turbo Overkill",
  "Warstride Challenges", "Fashion Police Squad", "Post Void", "Severed Steel", "Forgive Me Father 2",
  "A Plague Tale Requiem", "Hellblade II Senua's Saga", "Plague Inc Evolved", "Rebel Inc Escalation", "Civilization VI",
  "Age of Mythology Retold", "Command & Conquer Remastered Collection", "Company of Heroes 3", "Desperados III", "Shadow Tactics Blades of the Shogun",
  "Shadow Tactics Aiko's Choice", "Mimimi", "Shadow Gambit The Cursed Crew", "Mutant Year Zero Road to Eden", "Miasma Chronicles", "Gears Tactics",
  "Troubleshooter Abandoned Children", "XCOM 2", "XCOM Chimera Squad", "Hard West II", "Phoenix Point",
  "Midnight Suns", "Marvel's Midnight Suns", "South Park The Stick of Truth", "South Park The Fractured But Whole", "Superhot VR",
  "Superhot Mind Control Delete", "My Friend Pedro", "Hotline Miami 2 Wrong Number", "Police Stories", "Ruiner",
  "Synthetik Ultimate", "Synthetik 2", "Enter the Gungeon", "Exit the Gungeon", "Brotato",
  "Vampire Survivors", "Twenty Minutes Till Dawn", "Hall of Torment", "Death Must Die", "Army of Ruin",
  "Soulstone Survivors", "Deep Rock Galactic Survivor", "Voidigo", "Revita", "Doomsday Hunters",
  "Children of Morta", "Wizard of Legend", "Wizard of Legend 2", "Undermine", "Caveblazers",
  "Spelunky 2", "Noita", "Risk of Rain 2", "Gunfire Reborn", "Roboquest",
  "Deadlink", "Risk of Rain 1", "Risk of Rain Returns", "Crypt of the NecroDancer", "Cadence of Hyrule"
];

const final150 = [];
const seenClean = new Set();

for (const candidate of candidatePool) {
  if (final150.length >= 150) break;

  const cClean = clean(candidate);
  if (seenClean.has(cClean)) continue;

  // Strict check against ALL 375 owned folders
  let isDuplicate = false;
  for (const ownedClean of ownedCleanList) {
    // Check if one contains the other or exact match
    if (cClean === ownedClean) {
      isDuplicate = true;
      break;
    }
    // Check significant substring matches (e.g. "horizon" in "horizonzerodawn")
    if (cClean.length > 5 && ownedClean.length > 5) {
      if (cClean.includes(ownedClean) || ownedClean.includes(cClean)) {
        isDuplicate = true;
        break;
      }
    }
  }

  if (!isDuplicate) {
    seenClean.add(cClean);
    final150.push(candidate);
  }
}

console.log(`STRICT_UNIQUE_RECOMMENDATIONS_COUNT:${final150.length}`);
fs.writeFileSync(path.join(process.cwd(), 'scratch/clean_150_games.json'), JSON.stringify(final150, null, 2));
