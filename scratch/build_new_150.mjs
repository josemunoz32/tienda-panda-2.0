import fs from 'fs';
import path from 'path';

const ownedFolders = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scratch/owned_folders.json'), 'utf8'));

// Standardize helper function
function clean(str) {
  return (str || '')
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '');
}

const ownedCleanSet = new Set(ownedFolders.map(f => clean(f)));

// Massive list of popular & acclaimed single-player PC / Steam games
const candidateGames = [
  "Cyberpunk 2077", "The Witcher 3 Wild Hunt", "God of War", "God of War Ragnarok", "Ghost of Tsushima DIRECTOR'S CUT",
  "Horizon Zero Dawn", "Horizon Forbidden West", "Spider-Man Remastered", "Spider-Man Miles Morales", "The Last of Us Part I",
  "Uncharted Legacy of Thieves Collection", "Returnal", "Ratchet & Clank Rift Apart", "Death Stranding", "Days Gone",
  "Detroit Become Human", "Beyond Two Souls", "Heavy Rain", "Hogwarts Legacy", "Elden Ring",
  "Dark Souls Remastered", "Dark Souls II Scholar of the First Sin", "Dark Souls III", "Sekiro Shadows Die Twice", "Armored Core VI Fires of Rubicon",
  "Lies of P", "Black Myth Wukong", "Nioh Complete Edition", "Nioh 2 Complete Edition", "Wo Long Fallen Dynasty",
  "Lord of the Fallen", "Remnant From the Ashes", "Remnant II", "Code Vein", "Mortal Shell", "Thymesia",
  "Resident Evil 2 Remake", "Resident Evil 3 Remake", "Resident Evil 4 Remake", "Resident Evil 7 Biohazard", "Resident Evil Village",
  "Resident Evil Revelations", "Resident Evil Revelations 2", "Dead Space Remake", "The Callisto Protocol", "Silent Hill 2 Remake",
  "Alan Wake Remastered", "Alan Wake 2", "Control Ultimate Edition", "Quantum Break", "Deus Ex Mankind Divided",
  "Deus Ex Human Revolution", "Prey", "Dishonored Definitive Edition", "Dishonored 2", "Dishonored Death of the Outsider",
  "BioShock Remastered", "BioShock 2 Remastered", "BioShock Infinite", "Metro 2033 Redux", "Metro Last Light Redux",
  "Metro Exodus", "S.T.A.L.K.E.R. 2 Heart of Chornobyl", "Fallout 3 Game of the Year Edition", "Fallout New Vegas",
  "Fallout 4", "The Elder Scrolls V Skyrim Special Edition", "Starfield", "Dragon Age Origins", "Dragon Age Inquisition",
  "Dragon Age The Veilguard", "Mass Effect Legendary Edition", "Mass Effect Andromeda", "The Witcher 2 Assassins of Kings",
  "Kingdom Come Deliverance", "Kingdom Come Deliverance II", "Baldur's Gate 3", "Divinity Original Sin Enhanced Edition",
  "Divinity Original Sin II", "Pillars of Eternity", "Pillars of Eternity II Deadfire", "Pathfinder Kingmaker", "Pathfinder Wrath of the Righteous",
  "Wasteland 3", "GreedFall", "Elex", "Elex II", "Technomancer", "Outward Definitive Edition",
  "Final Fantasy VII Remake Intergrade", "Final Fantasy XVI", "Final Fantasy XV Windows Edition", "Final Fantasy XII The Zodiac Age",
  "Final Fantasy X X-2 HD Remaster", "Dragon Quest XI S Echoes of an Elusive Age", "Tales of Arise", "Tales of Berseria",
  "Tales of Vesperia Definitive Edition", "Ni no Kuni Wrath of the White Witch Remastered", "Ni no Kuni II Revenant Kingdom",
  "Persona 3 Reload", "Persona 4 Golden", "Persona 5 Royal", "Persona 5 Strikers", "Shin Megami Tensei V Vengeance",
  "Yakuza 0", "Yakuza Kiwami", "Yakuza Kiwami 2", "Yakuza 3 Remastered", "Yakuza 4 Remastered", "Yakuza 5 Remastered",
  "Yakuza 6 The Song of Life", "Yakuza Like a Dragon", "Like a Dragon Infinite Wealth", "Like a Dragon Gaiden The Man Who Erased His Name",
  "Judgment", "Lost Judgment", "Fist of the North Star Lost Paradise", "Sleeping Dogs Definitive Edition", "Grand Theft Auto IV Complete Edition",
  "Grand Theft Auto V", "Red Dead Redemption", "Red Dead Redemption 2", "Mafia Definitive Edition", "Mafia II Definitive Edition",
  "Mafia III Definitive Edition", "L.A. Noire", "Watch Dogs", "Watch Dogs 2", "Watch Dogs Legion",
  "Assassin's Creed Director's Cut", "Assassin's Creed II", "Assassin's Creed Brotherhood", "Assassin's Creed Revelations",
  "Assassin's Creed III Remastered", "Assassin's Creed IV Black Flag", "Assassin's Creed Rogue", "Assassin's Creed Unity",
  "Assassin's Creed Syndicate", "Assassin's Creed Origins", "Assassin's Creed Odyssey", "Assassin's Creed Valhalla",
  "Assassin's Creed Mirage", "Far Cry 3", "Far Cry 4", "Far Cry Primal", "Far Cry 5", "Far Cry New Dawn",
  "Far Cry 6", "Just Cause 2", "Just Cause 3", "Just Cause 4 Reloaded", "Mad Max", "Middle-earth Shadow of Mordor",
  "Middle-earth Shadow of War", "Batman Arkham Asylum GOTY", "Batman Arkham City GOTY", "Batman Arkham Origins",
  "Batman Arkham Knight", "Gotham Knights", "Suicide Squad Kill the Justice League", "Marvel's Avengers",
  "Marvel's Guardians of the Galaxy", "Star Wars Jedi Fallen Order", "Star Wars Jedi Survivor", "Star Wars Outlaws",
  "Tomb Raider Definitive Edition", "Rise of the Tomb Raider", "Shadow of the Tomb Raider", "Darksiders Warmastered Edition",
  "Darksiders II Deathinitive Edition", "Darksiders III", "Darksiders Genesis", "Devil May Cry HD Collection",
  "Devil May Cry 4 Special Edition", "DmC Devil May Cry", "Devil May Cry 5", "Bayonetta", "Vanquish",
  "Metal Gear Rising Revengeance", "Metal Gear Solid V The Phantom Pain", "Metal Gear Solid V Ground Zeroes",
  "Metal Gear Solid Master Collection Vol 1", "Castlevania Lords of Shadow Ultimate Edition", "Castlevania Lords of Shadow 2",
  "Hi-Fi RUSH", "NieR Replicant ver.1.22474487139...", "NieR Automata", "Astral Chain", "Scarlet Nexus",
  "Astral Ascent", "Hades", "Hades II", "Dead Cells", "Hollow Knight", "Hollow Knight Silksong",
  "Blasphemous", "Blasphemous 2", "Ori and the Blind Forest Definitive Edition", "Ori and the Will of the Wisps",
  "Ender Lilies Quietus of the Knights", "Ender Magnolia Bloom in the Mist", "Celeste", "Cuphead", "Nine Sols",
  "Salt and Sanctuary", "Salt and Sacrifice", "Katana ZERO", "Hotline Miami", "Hotline Miami 2 Wrong Number",
  "Little Nightmares", "Little Nightmares II", "Inside", "Limbo", "Brambly", "Trek to Yomi", "Sifu",
  "Ghostrunner", "Ghostrunner 2", "Bright Memory Infinite", "Shadow Warrior", "Shadow Warrior 2", "Shadow Warrior 3",
  "Doom 2016", "Doom Eternal", "Doom The Dark Ages", "Wolfenstein The New Order", "Wolfenstein The Old Blood",
  "Wolfenstein II The New Colossus", "Wolfenstein Youngblood", "RAGE", "RAGE 2", "Atomic Heart",
  "Bulletstorm Full Clip Edition", "Sniper Elite 3", "Sniper Elite 4", "Sniper Elite 5", "Sniper Ghost Warrior Contracts",
  "Sniper Ghost Warrior Contracts 2", "Hitman World of Assassination", "Hitman Absolution", "Hitman Blood Money",
  "Payday 2", "Payday 3", "Crime Boss Rockay City", "Cyber Shadow", "Bloodstained Ritual of the Night",
  "Teenage Mutant Ninja Turtles Shredder's Revenge", "Streets of Rage 4", "Double Dragon Gaiden", "Scott Pilgrim vs The World The Game",
  "SpongeBob SquarePants Battle for Bikini Bottom Rehydrated", "SpongeBob SquarePants The Cosmic Shake", "Psychonauts",
  "Psychonauts 2", "A Hat in Time", "Crash Bandicoot N. Sane Trilogy", "Crash Bandicoot 4 It's About Time",
  "Spyro Reignited Trilogy", "Sonic Frontiers", "Sonic Superstars", "Sonic Generations", "Sonic Colors Ultimate",
  "Ratchet & Clank", "Sackboy A Big Adventure", "Kena Bridge of Spirits", "Stray", "Tchia", "Subnautica",
  "Subnautica Below Zero", "The Long Dark", "Pacific Drive", "Green Hell", "Stranded Deep", "Raft", "Forever Skies",
  "Abzû", "Journey", "Gris", "Sea of Solitude", "What Remains of Edith Finch", "The Vanishing of Ethan Carter",
  "Firewatch", "Outer Wilds", "The Stanley Parable Ultra Deluxe", "Superliminal", "Manifold Garden", "Talos Principle",
  "Talos Principle II", "Portal", "Portal 2", "The Witness", "Braid Anniversary Edition", "Baba Is You", "Untitled Goose Game",
  "Stardew Valley", "Slime Rancher", "Slime Rancher 2", "Dave the Diver", "Dredge", "Cult of the Lamb",
  "Graveyard Keeper", "Core Keeper", "Terraria", "Starbound", "Necresse", "Sun Haven", "Roots of Pacha",
  "Moonlighter", "Loop Hero", "Inscryption", "Balatro", "Slay the Spire", "Monster Train", "Darkest Dungeon",
  "Darkest Dungeon II", "Wildfrost", "Slice & Dice", "Slice and Dice", "Luck be a Landlord", "Cobalt Core",
  "Frostpunk", "Frostpunk 2", "Cities Skylines", "Cities Skylines II", "Manor Lords", "Against the Storm",
  "Timberborn", "An置 1800", "Anno 1800", "Tropico 6", "Civilization V", "Civilization VI", "Crusader Kings III",
  "Europa Universalis IV", "Hearts of Iron IV", "Stellaris", "Victoria 3", "Age of Empires II Definitive Edition",
  "Age of Empires IV Anniversary Edition", "Age of Mythology Retold", "Command & Conquer Remastered Collection",
  "Company of Heroes 3", "Warhammer 40000 Dawn of War III", "Space Marine 2", "Warhammer 40000 Space Marine",
  "Aliens Dark Descent", "Aliens Fireteam Elite", "Alien Isolation", "Predator Hunting Grounds", "System Shock Remastered",
  "Dead Island Definitive Edition", "Dead Island Riptide Definitive Edition", "Dead Island 2", "Dying Light Definitive Edition",
  "Dying Light 2 Stay Human", "State of Decay Year-One Survival Edition", "State of Decay 2 Juggernaut Edition",
  "Days Gone", "Dead Rising", "Dead Rising 2", "Dead Rising 3 Apocalypse Edition", "Dead Rising 4", "Project Zomboid",
  "The Last of Us Part I", "Left 4 Dead 2", "Back 4 Blood", "World War Z Aftermath", "Zombie Army 4 Dead War",
  "Vampyr", "Vampire The Masquerade Bloodlines", "Vampire The Masquerade Swansong", "Legacy of Kain Soul Reaver 1&2 Remastered",
  "Kingdoms of Amalur Re-Reckoning", "Dragon's Dogma Dark Arisen", "Dragon's Dogma 2", "Ashen", "Mortal Shell",
  "The Surge", "The Surge 2", "Bound by Flame", "Mars War Logs", "Venetica", "Two Worlds II", "Risen 3 Titan Lords",
  "Gothic 3", "SpellForce 3 Reforced", "Disgaea 5 Complete", "Disgaea 6 Complete", "Disgaea 7 Vows of the Virtueless",
  "Octopath Traveler", "Octopath Traveler II", "Triangle Strategy", "Bravely Default II", "Tactics Ogre Reborn",
  "Live A Live", "Star Ocean The Second Story R", "Star Ocean The Divine Force", "Valkyrie Elysium", "Romancing SaGa 2 Revenge of the Seven",
  "Ys VIII Lacrimosa of DANA", "Ys IX Monstrum Nox", "Ys X Nordics", "Trails in the Sky", "Trails of Cold Steel",
  "Grandia HD Remaster", "Chrono Cross The Radical Dreamers Edition", "Sea of Stars", "Chained Echoes", "CrossCode",
  "Eastward", "Eiyuden Chronicle Hundred Heroes", "Eiyuden Chronicle Rising", "Cris Tales", "Ikenfell", "Cassette Beasts",
  "Monster Hunter World Iceborne", "Monster Hunter Rise Sunbreak", "Monster Hunter Stories", "Monster Hunter Stories 2 Wings of Ruin",
  "God Eater 2 Rage Burst", "God Eater 3", "Freedom Wars Remastered", "Toukiden 2", "WILDS", "Monster Hunter Wilds",
  "Granblue Fantasy Relink", "Granblue Fantasy Versus Rising", "Guilty Gear Strive", "Street Fighter 6", "Tekken 8",
  "Mortal Kombat 11", "Mortal Kombat 1", "Dragon Ball Xenoverse 2", "Dragon Ball Z Kakarot", "Dragon Ball FighterZ",
  "Dragon Ball Sparking ZERO", "Naruto Shippuden Ultimate Ninja Storm 4", "Naruto x Boruto Ultimate Ninja Storm Connections",
  "Demon Slayer Kimetsu no Yaiba The Hinokami Chronicles", "One Piece Pirate Warriors 4", "One Piece Odyssey",
  "My Hero One's Justice 2", "Jojo's Bizarre Adventure All Star Battle R", "Jujutsu Kaisen Cursed Clash", "BLEACH Rebirth of Souls",
  "SAO Alicization Lycoris", "SAO Last Recollection", "Fairy Tail", "Fairy Tail 2", "Attack on Titan 2 Final Battle",
  "Berserk and the Band of the Hawk", "Dynasty Warriors 9 Empires", "Samurai Warriors 5", "Warriors Orochi 4 Ultimate",
  "Hyrule Warriors", "Persona 5 Tactica", "Metaphor ReFantazio", "Catherine Full Body", "Danganronpa Trigger Happy Havoc",
  "Danganronpa 2 Goodbye Despair", "Danganronpa V3 Killing Harmony", "Zero Escape The Nonary Games", "Zero Escape Zero Time Dilemma",
  "AI The Somnium Files", "AI The Somnium Files nirvanA Initiative", "Ace Attorney Turnabout Collection", "The Great Ace Attorney Chronicles",
  "Ghost Trick Phantom Detective", "Steins Gate", "Doki Doki Literature Club Plus", "Clannad", "Master Detective Archives RAIN CODE Plus",
  "Slay the Princess", "Class of '09", "Needy Streamer Overload", "VA-11 Hall-A Cyberpunk Bartender Action", "Coffee Talk",
  "Coffee Talk Episode 2", "A Short Hike", "Lil Gator Game", "Donut County", "Turnip Boy Commits Tax Evasion",
  "Turnip Boy Robs a Bank", "Untitled Goose Game", "Webbed", "TOEM", "Unpacking", "Assembly Line", "PowerWash Simulator",
  "House Flipper", "House Flipper 2", "Supermarket Simulator", "Gas Station Simulator", "Car Mechanic Simulator 2021",
  "Euro Truck Simulator 2", "American Truck Simulator", "SnowRunner", "MudRunner", "Expeditions A MudRunner Game",
  "Construction Simulator", "Farming Simulator 22", "Farming Simulator 25", "Train Sim World 4", "Flight Simulator 2020",
  "Flight Simulator 2024", "PC Building Simulator 2", "Cooking Simulator", "Lawn Mowing Simulator", "Thief Simulator 2",
  "Contraband Police", "Internet Cafe Simulator 2", "Trader Life Simulator", "Drug Dealer Simulator 2", "Police Simulator Patrol Officers",
  "Firefighting Simulator The Squad", "Bus Simulator 21", "AirportSim", "Subway Sim", "Ship Graveyard Simulator 2"
];

// Deduplicate candidates and check against ownedCleanSet
const newCleanSet = new Set();
const uniqueCandidates = [];

for (const name of candidateGames) {
  const c = clean(name);
  if (!ownedCleanSet.has(c) && !newCleanSet.has(c)) {
    newCleanSet.add(c);
    uniqueCandidates.push(name);
  }
}

console.log(`CANDIDATES_AVAILABLE:${uniqueCandidates.length}`);
fs.writeFileSync(path.join(process.cwd(), 'scratch/recommended_150.json'), JSON.stringify(uniqueCandidates.slice(0, 150), null, 2));
