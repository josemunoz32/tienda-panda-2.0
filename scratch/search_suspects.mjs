import fs from 'fs';

const prods = JSON.parse(fs.readFileSync('scratch/all_steam_products.json', 'utf8'));

// Let's check for any game that might be multiplayer / online / MMO / survival
const SUSPECT_KEYWORDS = [
  'online', 'multiplayer', 'mmo', 'battle', 'siege', 'strike', 'war', 'surviv', 'craft',
  'arena', 'tarkov', 'hunt', 'fallout', 'elder', 'destiny', 'overwatch', 'apex', 'pubg',
  'rust', 'dayz', 'scum', 'squad', 'dead', 'thieves', 'division', 'warfare', 'front',
  'corps', 'royale', 'clancy', 'elite', 'company', 'crew', 'knights', 'valorant',
  'payday', 'chivalry', 'mordhau', 'conan', 'ark', 'paladins', 'smite', 'warframe',
  'borderlands', 'zomboid', 'deep rock', 'forest', 'lethal', 'phasmo', 'deceit',
  'outlast', 'among', 'fall guys', 'party', 'gang', 'golf', 'duck', 'prop'
];

const matches = [];
for (const p of prods) {
  const n = (p.name || '').toLowerCase();
  for (const kw of SUSPECT_KEYWORDS) {
    if (n.includes(kw)) {
      matches.push({ id: p.id, name: p.name, app_id: p.app_id, matched: kw });
      break;
    }
  }
}

console.log(`Encontrados ${matches.length} productos con palabras clave sospechosas de 812:`);
fs.writeFileSync('scratch/suspects_812.json', JSON.stringify(matches, null, 2), 'utf8');
matches.forEach(m => console.log(` - [${m.id}] ${m.name} (${m.matched})`));
