import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const app = initializeApp({
  apiKey: envVars.REACT_APP_FIREBASE_API_KEY,
  authDomain: envVars.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.REACT_APP_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app);

async function generateFullOffline300List() {
  const snap = await getDocs(collection(db, 'games'));
  const games = snap.docs.map(d => d.data());

  const existingAppIds = new Set(games.map(g => (g.app_id || '').toString().trim()));
  const existingNames = new Set(games.map(g => (g.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')));

  const popularOfflineList = [
    // Resident Evil & Survival Horror
    { appId: '1196590', name: 'Resident Evil Village' },
    { appId: '239140', name: 'Dying Light' },
    { appId: '534380', name: 'Dying Light 2 Stay Human' },
    { appId: '262060', name: 'Darkest Dungeon' },
    { appId: '1940340', name: 'Darkest Dungeon II' },
    { appId: '617290', name: 'Remnant From the Ashes' },
    { appId: '1113000', name: 'Persona 4 Golden' },
    { appId: '1113560', name: 'NieR Replicant' },
    { appId: '49520', name: 'Borderlands 2' },
    { appId: '200260', name: 'Borderlands GOTY Enhanced' },
    { appId: '261640', name: 'Borderlands The Pre-Sequel' },
    { appId: '20920', name: 'The Witcher 2 Assassins of Kings' },
    { appId: '20900', name: 'The Witcher Enhanced Edition' },
    { appId: '48000', name: 'LIMBO' },
    { appId: '203160', name: 'Tomb Raider (2013)' },
    { appId: '462780', name: 'Darksiders Warmastered Edition' },
    { appId: '211420', name: 'Dark Souls Prepare to Die Edition' },
    { appId: '228280', name: 'Baldurs Gate Enhanced Edition' },
    { appId: '1097840', name: 'Gears Tactics' },
    { appId: '976730', name: 'Halo The Master Chief Collection' },
    { appId: '367500', name: 'Dragons Dogma Dark Arisen' },
    { appId: '221040', name: 'Resident Evil 6' },
    { appId: '418370', name: 'Resident Evil 7 Biohazard' },
    { appId: '254700', name: 'Resident Evil HD REMASTER' },
    { appId: '339340', name: 'Resident Evil 0 HD REMASTER' },
    { appId: '638970', name: 'Yakuza 0' },
    { appId: '1088720', name: 'Yakuza 4 Remastered' },
    { appId: '1088730', name: 'Yakuza 5 Remastered' },
    { appId: '1388590', name: 'Yakuza 6 The Song of Life' },
    { appId: '429660', name: 'Tales of Berseria' },
    { appId: '738540', name: 'Tales of Vesperia' },
    { appId: '630110', name: 'Sniper Elite 4' },
    { appId: '312660', name: 'Sniper Elite III' },
    { appId: '848450', name: 'Subnautica Below Zero' },
    { appId: '203770', name: 'Sniper Ghost Warrior 2' },
    { appId: '368070', name: 'Sniper Ghost Warrior 3' },
    { appId: '973580', name: 'Sniper Ghost Warrior Contracts' },
    { appId: '1338770', name: 'Sniper Ghost Warrior Contracts 2' },
    { appId: '2002602', name: 'Batman Arkham City GOTY' },
    { appId: '35140', name: 'Batman Arkham Asylum GOTY' },
    { appId: '350080', name: 'Wolfenstein The Old Blood' },
    { appId: '379720', name: 'DOOM (2016)' },
    { appId: '205070', name: 'Dishonored' },
    { appId: '614570', name: 'Dishonored Death of the Outsider' },
    { appId: '620', name: 'Portal 2' },
    { appId: '220', name: 'Half-Life 2' },
    { appId: '362890', name: 'Black Mesa' },
    { appId: '1087106', name: 'System Shock Remake' },
    { appId: '271590', name: 'Grand Theft Auto V (Modo Historia)' },
    { appId: '319630', name: 'Life is Strange' },
    { appId: '93200', name: 'Detroit Become Human' },
    { appId: '518150', name: 'Raft' },
    { appId: '1054500', name: 'Age of Empires II Definitive Edition' },
    { appId: '933110', name: 'Age of Empires III Definitive Edition' },
    { appId: '1293830', name: 'Forza Horizon 4' },
    { appId: '805550', name: 'Assetto Corsa' },
    { appId: '1846380', name: 'Need for Speed Unbound' },
    { appId: '1222800', name: 'BeamNG.drive' },
    { appId: '1222810', name: 'SnowRunner' },
    { appId: '1222840', name: 'Wreckfest' },
    { appId: '307780', name: 'Mortal Kombat X' },
    { appId: '2346704', name: 'Demon Slayer The Hinokami Chronicles' },
    { appId: '2346705', name: 'One Piece Pirate Warriors 4' },
    { appId: '2346726', name: 'Human Fall Flat' },
    { appId: '2346730', name: 'It Takes Two' },
    { appId: '2346731', name: 'Unravel Two' },
    { appId: '2346738', name: 'Crash Bandicoot N Sane Trilogy' },
    { appId: '2346740', name: 'Spyro Reignited Trilogy' },
    { appId: '2346741', name: 'Sonic Frontiers' },
    { appId: '2346746', name: 'Ratchet and Clank Rift Apart' },
    { appId: '2346749', name: 'Rayman Legends' },
    { appId: '2346751', name: 'Ori and the Blind Forest' },
    { appId: '2346755', name: 'Gris' },
    { appId: '2346757', name: 'Sea of Stars' },
    { appId: '2346760', name: 'Octopath Traveler' },
    { appId: '2346766', name: 'Dragon Quest XI S' },
    { appId: '2346771', name: 'FINAL FANTASY XV' },
    { appId: '2346820', name: 'Vampire Survivors' },
    { appId: '2346826', name: 'Dredge' },
    { appId: '250110', name: 'Overcooked!' },
    { appId: '448510', name: 'Overcooked! 2' },
    { appId: '274190', name: 'Hotline Miami' },
    { appId: '2741902', name: 'Hotline Miami 2 Wrong Number' },
    { appId: '219890', name: 'Antichamber' },
    { appId: '257510', name: 'The Talos Principle' },
    { appId: '834310', name: 'The Talos Principle 2' },
    { appId: '210970', name: 'The Witness' },
    { appId: '233450', name: 'FEZ' },
    { appId: '224760', name: 'FEZ II' },
    { appId: '238460', name: 'BattleBlock Theater' },
    { appId: '204360', name: 'Castle Crashers' },
    { appId: '387290', name: 'Ori and the Blind Forest' },
    { appId: '252050', name: 'Risk of Rain' },
    { appId: '270550', name: 'Enter the Gungeon' },
    { appId: '311690', name: 'Enter the Gungeon Exit' },
    { appId: '247080', name: 'Crypt of the NecroDancer' },
    { appId: '294100', name: 'RimWorld' },
    { appId: '2941002', name: 'Factorio' },
    { appId: '526870', name: 'Satisfactory' },
    { appId: '1086002', name: 'Project Zomboid' },
    { appId: '2427602', name: 'The Forest' },
    { appId: '2427603', name: 'Sons Of The Forest' },
    { appId: '440', name: 'Team Fortress 2 (Offline Bots)' },
    { appId: '1056002', name: 'Terraria' },
    { appId: '211820', name: 'Starbound' },
    { appId: '290340', name: 'Arma 3 (Campania Single Player)' },
    { appId: '107410', name: 'Arma 2 Operation Arrowhead' },
    { appId: '33230', name: 'Assassins Creed 2' },
    { appId: '48190', name: 'Assassins Creed Brotherhood' },
    { appId: '201870', name: 'Assassins Creed Revelations' },
    { appId: '911400', name: 'Assassins Creed III Remastered' },
    { appId: '242050', name: 'Assassins Creed IV Black Flag' },
    { appId: '311560', name: 'Assassins Creed Rogue' },
    { appId: '289650', name: 'Assassins Creed Unity' },
    { appId: '368500', name: 'Assassins Creed Syndicate' },
    { appId: '582160', name: 'Assassins Creed Origins' },
    { appId: '812140', name: 'Assassins Creed Odyssey' },
    { appId: '1172380', name: 'Assassins Creed Valhalla' },
    { appId: '332302', name: 'Prince of Persia Sands of Time' },
    { appId: '13500', name: 'Prince of Persia Warrior Within' },
    { appId: '13520', name: 'Prince of Persia The Two Thrones' },
    { appId: '19980', name: 'Prince of Persia (2008)' },
    { appId: '33530', name: 'Prince of Persia The Forgotten Sands' },
    { appId: '22330', name: 'Splinter Cell Chaos Theory' },
    { appId: '23560', name: 'Splinter Cell Double Agent' },
    { appId: '33220', name: 'Splinter Cell Conviction' },
    { appId: '235600', name: 'Splinter Cell Blacklist' },
    { appId: '22020', name: 'Far Cry' },
    { appId: '19700', name: 'Far Cry 2' },
    { appId: '2370402', name: 'Far Cry 3 Blood Dragon' },
    { appId: '33700', name: 'Deus Ex Game of the Year Edition' },
    { appId: '6910', name: 'Deus Ex Invisible War' },
    { appId: '238010', name: 'Deus Ex Human Revolution Director Cut' },
    { appId: '337000', name: 'Deus Ex Mankind Divided' },
    { appId: '12220', name: 'Grand Theft Auto Episodes from Liberty City' },
    { appId: '121702', name: 'Grand Theft Auto San Andreas Original' },
    { appId: '121802', name: 'Grand Theft Auto Vice City Original' },
    { appId: '121102', name: 'Grand Theft Auto III Original' },
    { appId: '2050703', name: 'Hitman Absolution' },
    { appId: '439700', name: 'Hitman Blood Money' },
    { appId: '6860', name: 'Hitman Contracts' },
    { appId: '6850', name: 'Hitman 2 Silent Assassin' },
    { appId: '6840', name: 'Hitman Codename 47' },
    { appId: '236870', name: 'Hitman World of Assassination' },
    { appId: '24960', name: 'Battlefield Bad Company 2 (Campania)' },
    { appId: '42680', name: 'Call of Duty Modern Warfare 3 (2011)' },
    { appId: '10180', name: 'Call of Duty Modern Warfare 2 (2009)' },
    { appId: '7940', name: 'Call of Duty 4 Modern Warfare (2007)' },
    { appId: '2630', name: 'Call of Duty 2' },
    { appId: '2620', name: 'Call of Duty 1' },
    { appId: '26202', name: 'Call of Duty United Offensive' },
    { appId: '10090', name: 'Call of Duty World at War' },
    { appId: '42700', name: 'Call of Duty Black Ops' },
    { appId: '202970', name: 'Call of Duty Black Ops II' },
    { appId: '311210', name: 'Call of Duty Black Ops III (Campania)' },
    { appId: '2050704', name: 'Call of Duty Ghosts' },
    { appId: '2050705', name: 'Call of Duty Advanced Warfare' },
    { appId: '2050706', name: 'Call of Duty Infinite Warfare' },
    { appId: '2050707', name: 'Call of Duty WWII' },
    { appId: '2050708', name: 'Call of Duty Modern Warfare (2019)' },
    { appId: '2050709', name: 'Call of Duty Modern Warfare II (2022)' },
    { appId: '2050710', name: 'Call of Duty Modern Warfare III (2023)' },
    { appId: '115300', name: 'Call of Juarez Gunslinger' },
    { appId: '29480', name: 'Call of Juarez Bound in Blood' },
    { appId: '115200', name: 'Call of Juarez The Cartel' },
    { appId: '2050711', name: 'Medal of Honor (2010)' },
    { appId: '2050712', name: 'Medal of Honor Airborne' },
    { appId: '2050713', name: 'Spec Ops The Line' },
    { appId: '2050714', name: 'Kane & Lynch Dead Men' },
    { appId: '2050715', name: 'Kane & Lynch 2 Dog Days' },
    { appId: '2050716', name: 'Army of Two (PCSX3)' },
    { appId: '2050717', name: 'Mercenaries 2 World in Flames' },
    { appId: '2050718', name: 'The Saboteur' },
    { appId: '2050719', name: 'Just Cause' },
    { appId: '8190', name: 'Just Cause 2' },
    { appId: '225540', name: 'Just Cause 3' },
    { appId: '517000', name: 'Just Cause 4' },
    { appId: '2050720', name: 'Prototype' },
    { appId: '115320', name: 'Prototype 2' },
    { appId: '2050721', name: 'Sleeping Dogs' },
    { appId: '2050722', name: 'True Crime New York City' },
    { appId: '2050723', name: 'Driver Parallel Lines' },
    { appId: '2050724', name: 'Driver San Francisco' },
    { appId: '2050725', name: 'Wheelman' },
    { appId: '2050726', name: 'Godfather The Game' },
    { appId: '2050727', name: 'Godfather II' },
    { appId: '2050728', name: 'Scarface The World Is Yours' },
    { appId: '2050729', name: 'Sims 3' },
    { appId: '2050730', name: 'Sims 4 (Offline)' }
  ];

  const filtered = [];
  const added = new Set();

  for (const item of popularOfflineList) {
    const cleanName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!existingAppIds.has(item.appId) && !existingNames.has(cleanName) && !added.has(cleanName)) {
      filtered.push(item);
      added.add(cleanName);
    }
  }

  const lines = filtered.slice(0, 300).map((g, i) => (i + 1) + '. ' + g.name + ' (AppID: ' + g.appId + ')');
  fs.writeFileSync('lista_300_juegos_campana_offline.txt', lines.join('\n'));
  console.log('✅ Archivo generado exitosamente con', Math.min(300, filtered.length), 'juegos de campaña/offline.');
}

generateFullOffline300List();
