const fs = require('fs');
const path = require('path');

const rawText = `3DMark	Battlefield 3™	Anno 1800	
Atomfall + DLC
EA SPORTS FC™ 24 | FC24
60 Seconds! Reatomized	Battlefield™ V	Assassin's Creed: Brotherhood	
Anno 117: Pax Romana
Battlefield VI
7 Days to Die	Burnout Paradise: The Ultimate Box	Assassin's Creed II	
Atomic Heart + DLC
Arc Raiders
911 Operator	Command & Conquer™ Remastered Collection	Assassin's Creed III	
Avatar: Frontiers Of Pandora + DLC | AFOP
HellDivers 2
Resident Evil Requiem	Dragon Age: Origins - Ultimate Edition	Assassin's Creed IV: Black Flag	
Assassin's Creed Shadows + DLC
EA Sports - FC25 | FC25
A Plague Tale: Innocence	Dragon Age™: Inquisition	Assassin's Creed Mirage | ACM	
Black Myth: Wukong
EA SPORTS FC™ 26
DOOM: The Dark Ages
A Plague Tale: Requiem	Dragon Age™: Inquisition	Assassin's Creed: Syndicate	
Demon Slayer -Kimetsu no Yaiba- The Hinokami Chronicles
RUST
Age of Empires: Definitive Edition	Mass Effect (2007)	Assassin's Creed: Unity	
Demon Slayer The Hinokami Chronicles 2 + DLC
DAYZ
Aka Manto	Mass Effect 2 (2010)	Far Cry	
Digimon Story Time Stranger + DLC
PHASMOPHOBIA
Alan Wake	Mirror's Edge	Far Cry 3	
Dragon's Dogma 2 | DD2
Alan Wake's American Nightmare	Mirror's Edge™ Catalyst	Far Cry 3 - Blood Dragon	
DRAGON QUEST I & II HD-2D Remake
Alien: Isolation	
Need for Speed™ Heat
$5.000	Far Cry 4	
FAR Changing Tides
GTA V
Aliens: Dark Descent	
Need for Speed™ Hot Pursuit Remastered
$5.000	Far Cry 6	
Final Fantasy XV + DLC | FFXV
DRAGON BALL FIGHTERTZ
Aliens vs. Predator	
Need for Speed™ Payback | NFSP
$5.000	Far Cry: New Dawn	
Football Manager 26
Borderlands 4 + DLC
Among the Sleep - Enhanced Edition	
STAR WARS Jedi: Fallen Order™
Ghost Recon: Wildlands	
Jurassic World Evolution 3 + DLC
Batman: Arkham Knight
Among Us	
Forza horizon 5
$6.000	Prince of Persia: The Sands of Time	
Like A Dragon: Infinite Wealth + DLC
Call of Duty 4: Modern Warfare
Animal Shelter				Prince of Persia: The Forgotten Sands	
Like A Dragon Gaiden: The Man Who Erased His Name
Call of Duty: Advanced Warfare - Gold Edition
Aragami 2				Prince of Persia: Warrior Within	
Like A Dragon: Ishin! + DLC
Call of Duty: Modern Warfare Remastered
ARK: Survival Evolved				The Division	
Like a Dragon: Pirate Yakuza in Hawaii Deluxe Edition
NARUTO TO BORUTO: SHINOBI STRIKER
ARSLAN: THE WARRIORS OF LEGEND				Tom Clancy's Splinter Cell: Conviction	
Lost Judgement + DLC
No Man's Sky
ASTRONEER				Splinter Cell: Blacklist	
Lost in Random
Outlast trials
Atomic Heart				Watch Dogs	
Marvel's Midnight Suns
Elden Ring Nightreign
Attack on Titan: A.O.T. Wings of Freedom				Watch Dogs 2	
Metaphor: ReFantazio + DLC
Middle-earth: Shadow of War
Avion Venge							
Mortal Kombat 1 + DLC
Resident evil 5
Bakery Simulator							
Need for Speed™ Payback
A Way Out
Baldur's Gate 3							
Need for Speed™ Hot Pursuit Remastered
Battlefield 1
Baldur's Gate II: Enhanced Edition							
Need For Speed Unbound
Unravel Two
Barony							
STAR WARS™: Squadrons
Assassin's Creed Valhalla
Barotrauma							
Octopath Traveler 0 + DLC
Far Cry: New Dawn
Batman: Arkham Asylum GOTY Edition							
Onimusha 2: Samurai's Destiny
Batman: Arkham City GOTY							
Persona 3 Portable
Persona 3 Reload + Aigis DLC
Batman: Arkham Origins							
Persona 4 Arena Ultimax
Beamng Drive							
Persona 4 Golden
Bendy and the Dark Revival							
Persona 4 Golden
Bendy and the Ink Machine							
Persona 5 Royal
Beyond: Two Souls							
Persona 5 Strikers
BioShock Infinite							
Persona 5 Tactica + DLC
Black Mesa							Planet Zoo							
Resident Evil Requiem					
Black Myth: Wukong							Redfall							
Blade & Sorcery							
RAIDOU Remastered: TMSA
Blasphemous							
Shin Megami Tensei III: Nocturne HD Remaster
Blasphemous 2							
Crimson Desert
Borderlands 2							
SHINOBI: Art of Vengeance DELUXE
Borderlands 3							
Sniper Elite 5
Sniper Elite: Resistance
Borderlands: The Pre-Sequel							
Sonic Colors Ultimate
Bright Memory							
Sonic Frontiers + DLC
Bright Memory: Infinite							
Sonic Superstars + DLC
Broforce							
Sonic X Shadow Generations + DLC
Brothers: A Tale of Two Sons							
Soul Hackers 2 + DLC
Bus Simulator 18							
Stranded Alien Dawn
Clair Obscur: Expedition 33							
Stellar Blade Complete Edition
Call of Duty (2003)							
Star Wars Outlaws + DLC | SWO
Call of Duty 2							
SUPER ROBOT WARS Y
Call of Duty: Black Ops							The Bus							
Call of Duty: Black Ops II							
The First Berserker: Khazan + DLC
Call of Duty: Black Ops III							
Two Point Campus
Call of Duty: United Offensive							
Two Point Museum
Call of Duty: Modern Warfare 2							Pragmata							
Call of Duty: Ghost							Forza Horizon 6					
Call of Duty: World at War							
SOLO LEVELING ARISE
Call of Juarez							
Warhammer Age of Sigmar: Realms of Ruin
Call to Arms - Gates of Hell: Ostfront							
Warhammer Chaos Gate - Daemonhunters
Car Mechanic Simulator 2015							Wild Hearts							
Car Mechanic Simulator 2021							
Forza Horizon 5 (CON ONLINE)
Castlevania: Lords of Shadow - Ultimate Edition							
Total warhamer 3 +dlc
Cat Quest							
Yakuza Kiwami 3
Celeste							F1 23							
Cities in Motion 2							F1 24							
Cities: Skylines							
Construction simulator
Cloudpunk							Dirt 5							
Company of Heroes 2							
Mafia The Old Country
Contraband Police							
Street Fighter 6
Control Ultimate Edition							Undisputed							
Counter-Strike: Condition Zero Deleted Scenes							Life is Strange: Reunion					
Counter-Strike: Source							Mega Man Star Force Legacy Collection					
Crash Bandicoot™ N. Sane Trilogy							
LEGO® Batman™: El Legado del Caballero Oscuro
Crashlands							
007 First Light
Crime Scene Cleaner							
Halo Campaign evolved
Cairn							
007 First Light
Crimson Desert														
Crusader Kings III														
Clover Pit														
Cuphead														
Death Stranding														
Death Stranding 2														
Crysis Remastered														
Crysis 2 Remastered														
Crysis 3 Remastered														
Cyberpunk 2077														
Deltarune														
Danganronpa 2: Goodbye Despair														
Danganronpa Another Episode: Ultra Despair Girls														
Danganronpa V3: Killing Harmony														
Danganronpa: Trigger Happy Havoc														
DARK SOULS II: Scholar of the First Sin														
DARK SOULS III														
DARK SOULS: REMASTERED														
Dark Souls II														
Darkest Dungeon														
Darkest Dungeon II
Darksiders II: Deathinitive Edition														
Darksiders III														
Darksiders: Warmastered Edition														
Dawn of Man														
Day of Defeat														
Day of Defeat: Source												
Days Gone														
Dispatch														
Dave the diver														
Dead Cells														
Dead Island 2															
Dead Island: Definitive Edition														
Dead Island: Riptide Definitive Edition														
DEAD OR ALIVE 6														
DEAD OR ALIVE Xtreme Venus Vacation														
DEAD RISING														
Dead Rising 2														
Dead Rising 2: Off the Record														
Dead Rising 3: Apocalypse Edition														
Dead Rising 4														
Dead Space (2008)														
Dead Space Remake														
Dead Space 3														
Demon Slayer Sweep the Board! | DSSB														
Demon Slayer The Hinokami Chronicles
Demon Slayer The Hinokami Chronicles II														
DESOLATE														
Desperados 2														
Desperados III														
Desperados: Wanted Dead or Alive														
Destroy All Humans!														
Detroit: Become Human														
Deus Ex: Mankind Divided														
Devil May Cry 3: Special Edition														
Devil May Cry 4: Special Edition														
Devil May Cry 5														
Devil May Cry HD Collection														
DIRT 2														
DIRT 4														
DIRT Rally 2.0														
Dishonored														
Dishonored 2														
Dishonored: Death of the Outsider														
Disneyland Adventures														
DmC: Devil May Cry														
Don't Starve Together														
DOOM (2016)														
DOOM Eternal														
DOOM: The Dark Ages														
DOOM I & II														
Door Kickers 2														
DRAGON BALL XENOVERSE														
DRAGON BALL XENOVERSE 2														
Dragon Ball Sparking Zero														
DRAGON BALL Z: KAKAROT														
DRAGON QUEST BUILDERS™ 2														
DRAGON QUEST HEROES II														
Dragon's Dogma: Dark Arisen														
DreadOut														
DreadOut 2														
Drug Dealer Simulator														
Dying Light														
Dying Light: The Beast														
DYSMANTLE														
Elden Ring + DLC														
Enshrouded														
Escape Simulator														
Escape the backrooms														
Euro Truck Simulator 2														
Europa Universalis IV														
EVERSPACE														
EVERSPACE™ 2														
Evil West														
Exit the Gungeon														
Forza Horizon 4
Forza Horizon 5														
Forza Horizon 6														
F.E.A.R. 3														
Factorio														
FAIRY TAIL														
Fallout														
Fallout 2														
Fallout 3 (REQUIERE FIX)														
Fallout 3 - Game of the Year Edition														
Fallout Tactics														
Fallout: New Vegas														
FAR Changing Tides														
FAR: Lone Sails														
Farming Simulator 17														
Farming Simulator 19														
Farming Simulator 25														
FINAL FANTASY I														
FINAL FANTASY II														
FINAL FANTASY III														
FINAL FANTASY IV														
FINAL FANTASY V														
FINAL FANTASY VI														
FINAL FANTASY VII REBIRTH														
FINAL FANTASY VII REMAKE INTERGRADE														
FINAL FANTASY VIII														
FINAL FANTASY IX														
FINAL FANTASY X														
FINAL FANTASY TYPE-0 HD														
FINAL FANTASY X/X-2 HD Remaster														
FINAL FANTASY XI														
FINAL FANTASY XII														
FINAL FANTASY XIII														
FINAL FANTASY XII THE ZODIAC AGE														
FINAL FANTASY XIII-2														
FINAL FANTASY XIV Online														
FINAL FANTASY XV WINDOWS EDITION														
Firefight														
Firewatch														
Fireworks Mania														
Five Nights at Freddy's														
Five Nights at Freddy's 2														
Five Nights at Freddy's 3														
Five Nights at Freddy's 4														
FIVE NIGHTS AT FREDDY'S: HELP WANTED														
Five Nights at Freddy's: Security Breach														
Five Nights at Freddy's: Sister Location														
Flashing Lights														
FlatOut 2														
FlatOut 4: Total Insanity														
Forager														
Frostpunk														
Game Dev Tycoon														
Gang Beasts														
Garfield Kart														
Garry's Mod														
Gears of War: Reloaded														
Gears 5														
Geometry Dash														
Getting Over It with Bennett Foddy														
Ghostrunner														
Goat Simulator														
Goat Simulator 3														
God of War														
God of War Ragnarok														
Golf It														
Gothic 1 Classic														
Gothic II: Gold Classic														
Grand Theft Auto III														
Grand Theft Auto IV: The Complete Edition														
Grand Theft Auto: San Andreas														
Grand Theft Auto: Vice City														
Grainy														
GreedFall														
Ghost of Tsushima														
Green Hell														
GRID 2														
GRID Autosport														
GROUND BRANCH														
Grounded														
Gunsmith Simulator														
Guts and Glory														
Hades														
Hades II														
Half-Life 2														
Half-Life: Alyx														
Half-Life: Blue Shift														
Half-Life: Opposing Force														
Half-Life: Source														
Halo: Spartan Assault														
Hatsune Miku: Project DIVA + DLC
Hearts of Iron IV														
Heavy Rain														
Hello Neighbor														
Hello Neighbor: Hide and Seek														
Hidden Deep														
Hitman 2: Silent Assassin														
Hi-Fi Rush														
Hitman: Absolution														
Hitman: Blood Money														
Hitman: Codename 47														
Hitman: Contracts														
HITMAN World of Assassination														
HITMAN™ 2														
Hogwarts Legacy														
Hollow Knight														
Hollow knight: Silksong														
Home Sweet Home														
Home Sweet Home EP2														
Horizon Zero Dawn™ Complete Edition														
Horizon Forbidden West™ Complete Edition														
Hotline Miami														
Hotline Miami 2: Wrong Number														
House Flipper														
Human: Fall Flat														
HUMANKIND														
It Takes Two														
inzoi														
I Am Alive														
Injustice 2														
Injustice: Gods Among Us Ultimate Edition														
INSIDE														
Is this seat taken														
Jotun: Valhalla Edition														
Journey														
JDM: Japanese Drift Master														
JUMP FORCE														
Jurassic World Evolution														
Jurassic World Evolution 2 + DLC
Jurassic World Evolution 3 + DLC
Just Cause														
Just Cause 2														
Just Cause 3														
Just Cause 4: Reloaded														
Kane & Lynch 2: Dog Days														
Katana ZERO														
Kenshi														
Kerbal Space Program														
Kerbal Space Program 2														
Kerbal Space Program: Breaking Ground Expansion														
Killing Floor 2														
Kingdom Come: Deliverance														
Kingdom Come: Deliverance II														
Kingdom Rush - Tower Defense														
Kingdom: Two Crowns														
KINGDOM HEARTS -HD 1.5+2.5 ReMIX-														
KINGDOM HEARTS HD 2.8 Final Chapter Prologue														
KINGDOM HEARTS III + Re Mind (DLC)														
KovaaK's														
Left 4 Dead														
Left 4 Dead 2														
LEGO Batman 2: DC Super Heroes														
LEGO Batman 3: Beyond Gotham														
LEGO City Undercover														
LEGO Harry Potter: Years 5-7														
LEGO Jurassic World														
LEGO MARVEL's Avengers														
LEGO The Hobbit														
LEGO The Lord of the Rings														
LEGO Worlds														
LEGO® Batman™: The Videogame														
LEGO® DC Super-Villains														
LEGO® MARVEL Super Heroes														
LEGO® MARVEL Super Heroes 2														
LEGO® Star Wars™ III: The Clone Wars™														
LEGO® Star Wars™: The Complete Saga														
LEGO® Star Wars™: The Skywalker Saga														
LEGO® The Incredibles														
LEGO® Indiana Jones™: The Original Adventures														
Lethal Company														
Life is Strange: Before the Storm														
Life is Strange Reunion														
Lies of P + DLC														
Like A Dragon Gaiden: T.M.W.E.H.N														
Like A Dragon: Infinite Wealth + DLC
Like A Dragon: Ishin! + DLC
Like a Dragon: P.Y.I.H (Deluxe Edition)														
LIMBO														
Little Nightmares														
Little Nightmares II														
Lossless Scaling														
Lost Judgement + DLC
Lost Planet 2														
Mount & Blade II: Bannerlord														
Mad Max														
Mafia														
Mafia II (Classic)														
Mafia II: Definitive Edition														
Mafia III: Definitive Edition														
Mafia: Definitive Edition														
Maid of Sker														
Marvel's Guardians of the Galaxy														
Mafia: el viejo continente
Marvel's Midnight Suns														
Max Payne														
Max Payne 2														
Max Payne 3														
METAL GEAR RISING: REVENGEANCE														
METAL GEAR SOLID V: GROUND ZEROES														
METAL GEAR SOLID Δ: SNAKE EATER														
METAL GEAR SURVIVE														
Megabonk														
Mewgenics														
METAL SLUG														
Metaphor: ReFantazio + DLC
Metro 2033														
Metro 2033 Redux														
Metro: Exodus														
Middle-earth: Shadow of Mordor														
Middle-earth: Shadow of War														
Monster Hunter Wilds														
Monster Hunter: World														
Mortal Kombat 11														
Mortal Kombat X														
My Friend Pedro														
My Summer Car														
My Time at Portia														
NARUTO SHIPPUDEN: Ultimate Ninja STORM 2														
NARUTO SHIPPUDEN: Ultimate Ninja STORM 3 Full Burst														
NARUTO SHIPPUDEN: Ultimate Ninja STORM 4														
NARUTO SHIPPUDEN: Ultimate Ninja STORM Revolution														
NARUTO: Ultimate Ninja STORM														
Neon Abyss														
Ni no Kuni™ II: Revenant Kingdom														
NieR: Automata														
NieR Replicant														
Nioh: Complete Edition														
Nioh 2														
Nioh 3																
Nocturnals														
Notia														
UNCHARTED™: Colección Legado de los Ladrones														
ONE PIECE ODYSSEY														
ONE PIECE: World Seeker														
ONE PUNCH MAN: A HERO NOBODY KNOWS														
One Piece: Unlimited World Red - Deluxe Edition														
Onimusha 2: Samurai's Destiny														
Operator														
Ori and the Blind Forest														
Ori and the Blind Forest: Definitive Edition														
Ori and the Will of the Wisps														
Osteya														
Outcast - A New Beginning														
Outer Wilds														
Outlast														
Outlast 2														
Overcooked														
Overcooked! 2														
Overgrowth														
Oxygen Not Included														
Pragmata														
Pacify														
Papers, Please														
PAYDAY 2														
PC Building Simulator														
Peggle Deluxe														
Persona 3 Portable														
Persona 3 Reload + Aigis DLC
Persona 4 Arena Ultimax														
Persona 4 Golden														
Persona 5 Royal														
Persona 5 Strikers														
Persona 5 Tactica + DLC
Phasmophobia														
Phoenix Wright: Ace Attorney Trilogy														
Pikuniku														
Plague Inc: Evolved														
Planet Coaster 2														
Police Simulator: Patrol Officers														
Poly Bridge														
Poly Bridge 2														
Portal														
Portal 2														
Possessed														
POSTAL 4: No Regerts														
POSTAL Redux														
Postal 3														
Prey														
Prison Simulator														
Project Zomboid														
Psychonauts 2														
Quantum Break														
Radiation Island														
Raft														
RAIDOU Remastered: TMSA														
Rain World														
Rayman: Raving Rabbids														
Ready or Not														
Red Dead Redemption 1														
Red Dead Redemption 2														
Redfall														
Remember Me														
Ratchet & Clank: Una dimensión aparte														
Rimworld														
Returnal														
Resident Evil 0														
Resident Evil 2 Remake														
Resident Evil 3 Remake														
Resident Evil 4														
Resident Evil 4 Remake														
Resident Evil 6														
Resident Evil 7: Biohazard														
Resident Evil Village														
Resident Evil: Revelations 1														
Resident Evil: Revelations 2														
Retro Game Crunch														
Rise of the Tomb Raider														
RoadCraft														
RUSH: A Disney-PIXAR Adventure														
S.T.A.L.K.E.R.: Clear Sky														
Saints Row														
Saints Row: The Third Remastered														
Salt and Sanctuary														
Scars Above														
Sea of Thieves														
Sekiro™: Shadows Die Twice														
Serious Sam 4														
Shadow of the Tomb Raider														
Shadow Warrior														
Shadow Warrior 2														
Shadow Warrior 3: Definitive Edition														
Shin Megami Tensei III: Nocturne HD Remaster														
Shin Megami Tensei V: Vengeance + DLC
SHINOBI: Art of Vengeance DELUXE														
Sherlock Holmes: Nemesis														
Sherlock Holmes: The Awakened														
Sherlock Holmes: The Secret of the Silver Earring														
Sid Meier's Civilization IV														
Sid Meier's Civilization VII														
Shotgun King: The Final Checkmate														
Satisfactory														
Silent Hill F														
Silent Hill 2														
Silent Hill: Homecoming														
Skate Story														
Tony Hawk's™ Pro Skater™ 1 + 2														
Skater XL														
Starfield														
Sleeping Dogs														
Sleeping Dogs: Definitive Edition														
Slender: The Arrival														
Slime Rancher														
Sniper Elite 3														
Sniper Elite 4														
Sniper Elite 5														
Sniper Elite: Resistance														
SOMA														
Sonic Adventure DX														
Sonic Frontiers + DLC
Sonic Generations														
Sonic Mania														
Sonic Origins Plus														
Sonic Racing: CrossWorlds + DLC
Sonic Superstars + DLC
Sonic The Hedgehog 4- Episode I														
Sonic the Hedgehog 4 - Episode II														
Sonic X Shadow Generations + DLC
SOULCALIBUR VI														
SnowRunnner														
Samurai Shodown														
Soundpad														
SOUTH PARK: SNOW DAY!														
South Park: The Stick of Truth														
Space Engine														
Spider Man: 2														
Spider Man: Remastered														
Spider Man: Miles Morales														
SpongeBob SquarePants: Battle for Bikini Bottom														
Split Fiction														
Stardew Valley														
State of Decay: Year One Survival Edition														
STEINS;GATE: Linear Bounded Phenogram														
Stellaris														
Stick Fight: The Game														
Supermarket Simulator														
Super Bunny Man														
Stray														
Stray														
Street Fighter IV														
Street Fighter V														
Street Fighter VI														
Street Fighter X Tekken														
Strider														
Stronghold 2														
Subnautica														
Subnautica: Below Zero														
Subnautica 2														
SUCCUBUS														
Tales of Arise														
Team Fortress 2														
Team Fortress Classic														
Team Sonic Racing														
TEKKEN 7														
Terminator: Resistance														
Terraria														
The Amazing Spider-Man														
The Amazing Spider-Man 2														
The Ascent														
The Binding of Isaac														
The Binding of Isaac: Rebirth														
The Caligula Effect: Overdose														
The Dark Pictures Anthology: Man of Medan														
The Elder Scrolls III: Morrowind														
The Elder Scrolls V: Skyrim														
The Elder Scrolls V: Skyrim Special Edition														
The Escapists														
The Evil Within														
The Evil Within 2														
The Forest														
The Guest														
THE KING OF FIGHTERS '97 GLOBAL MATCH														
THE KING OF FIGHTERS '98 ULTIMATE MATCH														
THE KING OF FIGHTERS 2002 UNLIMITED MATCH														
THE KING OF FIGHTERS XIII STEAM EDITION														
THE KING OF FIGHTERS XIV STEAM EDITION														
The Long Dark														
The Mortuary Assistant														
The Outer Worlds														
The Room														
The Room Three														
The Room Two														
The Sinking City Remastered														
The Stanley Parable														
The Surge														
The Talos Principle 2														
The Typing of The Dead: Overkill														
THE LAST OF US 1 REMASTERED														
THE LAST OF US 2 REMASTERED														
The Walking Dead														
The Walking Dead: A New Frontier														
The Walking Dead: Michonne - A Telltale Series														
The Walking Dead: Season Two														
The Walking Dead: The Final Season														
The Wild Eight														
The Witcher 2: Assassins of Kings Enhanced Edition														
The Witcher 3: Wild Hunt														
The Witcher: Enhanced Edition														
The Wolf Among Us														
The Hunter: Call of the Wild														
Thief Simulator														
This War of Mine														
TOGETHER BnB														
Tomb Raider														
Tomb Raider (VI): The Angel of Darkness														
Tomb Raider II														
Tomb Raider III														
Tomb Raider: Legend														
Tomb Raider: Underworld														
Torchlight II														
Total War: ATTILA														
Total War: NAPOLEON - Definitive Edition														
Total War: ROME REMASTERED														
Total War: WARHAMMER														
Totally Accurate Battle Simulator														
Toy Story 3: The Video Game														
Train Simulator Classic														
Trine														
Trine 2														
Tropico 4														
Tropico 5														
Tropico 6														
Twelve Minutes														
Two Worlds II HD														
Ultimate Chicken Horse														
Ultra Street Fighter IV														
ULTRAKILL														
Undertale														
Until Dawn														
Unpacking														
Untitled Goose Game														
Vanquish														
Victoria 3														
Victoria II														
Visage														
Viscera Cleanup Detail														
Windrose														
Wallpaper Engine														
Warhammer 40,000: Inquisitor - Martyr														
Wasteland 1 - The Original Classic														
Wasteland 3														
We Happy Few														
We Were Here Too														
White Day: A Labyrinth Named School														
Wolfenstein II: The New Colossus														
Wolfenstein: The New Order														
Wolfenstein: The Old Blood														
Wolfenstein: Youngblood														
Wo long: fallen dynasty														
World War Z														
Wreckfest														
X4: Foundations														
XCOM 2														
XCOM: Enemy Unknown														
Yaiba: Ninja Gaiden Z														
Yakuza 0														
Yakuza 3 Remastered														
Yakuza 4 Remastered														
Yakuza 5 Remastered														
Yakuza Kiwami														
Yakuza Kiwami 2														
Yakuza: Like a Dragon														
Zombie Army Trilogy														
Dragon Ball Sparking Zero														
Dragon Ball KAKAROT														
Dragon Ball XENOVERSE 2														
THE LAST OF US 1														
THE LAST OF US 2 REMASTERED`;

const greenKeywords = [
  'resident evil requiem', 'a plague tale', 'atomic heart', 'black myth: wukong',
  'black ops', 'modern warfare 2', 'ghost', 'crimson desert', 'death stranding 2',
  'burnout paradise', 'need for speed', 'nfs', 'star wars jedi', 'forza horizon 5',
  'forza horizon 6', 'assassin', 'far cry', 'ghost recon', 'prince of persia',
  'the division', 'splinter cell', 'watch dogs', 'atomfall', 'anno 117',
  'avatar', 'doom: the dark ages', 'demon slayer', 'digimon', 'dragon\'s dogma 2',
  'dragon quest', 'far changing tides', 'final fantasy xv', 'football manager',
  'jurassic world evolution', 'like a dragon', 'yakuza', 'lost judgement',
  'lost in random', 'marvel\'s midnight suns', 'metaphor', 'mortal kombat 1',
  'squadrons', 'octopath traveler', 'onimusha 2', 'persona', 'planet coaster 2',
  'planet zoo', 'redfall', 'raidou', 'shin megami', 'shinobi', 'sniper elite 5',
  'sniper elite: resistance', 'sonic', 'soul hackers 2', 'stranded alien dawn',
  'stellar blade', 'star wars outlaws', 'super robot wars', 'the bus',
  'khazan', 'two point', 'pragmata', 'solo leveling', 'warhammer', 'wild hearts',
  'total warhamer 3', 'f1 23', 'f1 24', 'construction simulator', 'dirt 5',
  'mafia the old country', 'street fighter 6', 'undisputed', 'life is strange: reunion',
  'mega man star force', 'lego® batman™: el legado', '007 first light', 'halo campaign evolved'
];

function normalize(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function isGreenGame(name) {
  const norm = (name || '').toLowerCase();
  return greenKeywords.some(k => norm.includes(k));
}

const lines = rawText.split('\n');
const extracted = [];

lines.forEach(line => {
  const parts = line.split('\t');
  parts.forEach(p => {
    let cleaned = p.trim();
    if (!cleaned) return;
    if (cleaned.startsWith('$') || /^\d+$/.test(cleaned)) return;
    if (cleaned.includes('JUEGOS DISPONIBLES') || cleaned.includes('SE VENDEN APARTE') || cleaned.includes('NO DISPONIBLES')) return;
    if (cleaned === 'Steam' || cleaned === 'Electronic Arts' || cleaned === 'Ubisoft') return;
    cleaned = cleaned.replace(/\s+\$\d+[\d.,]*/g, '').trim();
    if (cleaned) extracted.push(cleaned);
  });
});

const map = new Map();
extracted.forEach(name => {
  const norm = normalize(name);
  if (!map.has(norm)) {
    map.set(norm, name);
  }
});

const uniqueList = Array.from(map.values());

const finalJson = uniqueList.map(name => {
  const isGreen = isGreenGame(name);
  const priceCLP = isGreen ? "4990" : "2000";
  const priceUSD = isGreen ? "5.54" : "2.22";
  return {
    name: name,
    priceCLP: priceCLP,
    priceUSD: priceUSD,
    pricePrimariaCLP: priceCLP,
    pricePrimariaUSD: priceUSD,
    priceSecundariaCLP: priceCLP,
    priceSecundariaUSD: priceUSD,
    plataforma: "Steam",
    genero: isGreen ? "Steam Premium" : "Steam Normal",
    idioma: "Español / Multilenguaje",
    anio: "2026",
    comentario: isGreen ? "JUEGO DESTACADO / SE VENDEN APARTE ($4.990)" : "JUEGO STEAM NORMAL ($2.000)",
    tags: isGreen ? ["Steam", "Premium", "4990"] : ["Steam", "Normal", "2000"],
    isGreenTier: isGreen,
    stock: "1000",
    imageUrl: ""
  };
});

fs.writeFileSync(path.join(process.cwd(), 'src/assets/steam_import_data.json'), JSON.stringify(finalJson, null, 2), 'utf8');

const greenCount = finalJson.filter(j => j.isGreenTier).length;
const normalCount = finalJson.filter(j => !j.isGreenTier).length;

console.log('Total de juegos ÚNICOS sin duplicados:', finalJson.length);
console.log('Juegos VERDES (Precio $4.990):', greenCount);
console.log('Juegos NORMALES (Precio $2.000):', normalCount);
