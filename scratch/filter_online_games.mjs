import fs from 'fs';

const products = JSON.parse(fs.readFileSync('scratch/all_steam_products.json', 'utf8'));

// Games that are purely online multiplayer, MMO, battle royale, or require dedicated servers
const ONLINE_PATTERNS = [
  /\brust\b/i,
  /\bdayz\b/i,
  /\bpubg\b/i,
  /\brainbow six\b/i,
  /\bdead by daylight\b/i,
  /\bsea of thieves\b/i,
  /\bhunt:?\s*showdown\b/i,
  /\bhelldivers\s*2\b/i,
  /\bbattlefield\s*2042\b/i,
  /\bwarzone\b/i,
  /\bthe division\b/i,
  /\bdestiny\s*2\b/i,
  /\boverwatch\b/i,
  /\bscum\b/i,
  /\bconan exiles\b/i,
  /\bhell let loose\b/i,
  /\bthrone and liberty\b/i,
  /\bthe first descendant\b/i,
  /\bonce human\b/i,
  /\belite dangerous\b/i,
  /\bcounter-strike\b/i,
  /\bdota\s*2\b/i,
  /\bteam fortress\b/i,
  /\bwarframe\b/i,
  /\bpaladins\b/i,
  /\bsmite\b/i,
  /\bnaraka\b/i,
  /\bblack desert\b/i,
  /\bskull and bones\b/i,
  /\bmarvel rivals\b/i,
  /\bmortal online\b/i,
  /\bfallout\s*76\b/i,
  /\bpayday\s*3\b/i,
  /\bchivalry\s*2\b/i,
  /\bmordhau\b/i,
  /\bfor honor\b/i,
  /\binsurgency\b/i,
  /\bwar thunder\b/i,
  /\bworld of tanks\b/i,
  /\bworld of warships\b/i,
  /\bparty animals\b/i,
  /\bamong us\b/i,
  /\bphasmophobia\b/i,
  /\blethal company\b/i,
  /\bdeceit\b/i,
  /\btexas chain saw\b/i,
  /\bfriday the 13th\b/i,
  /\bevil dead\b/i,
  /\bcrossout\b/i,
  /\benlisted\b/i,
  /\bfall guys\b/i,
  /\bv rising\b/i,
  /\bpath of exile\b/i,
  /\bnew world\b/i,
  /\blost ark\b/i,
  /\bfinal fantasy xiv\b/i,
  /\bstar wars:? the old republic\b/i,
  /\belder scrolls online\b/i,
  /\bguild wars\b/i,
  /\bark:\s*survival\b/i,
  /\bplanetside\b/i,
  /\bthe finals\b/i,
  /\bdelta force\b/i,
  /\bsupreme commander\b/i,
  /\bvrchat\b/i,
  /\bforza horizon 5 con online\b/i,
  /\bdemonologist\b/i,
  /\bforewarned\b/i,
  /\bdevour\b/i,
  /\bpacify\b/i,
  /\blabarynthine\b/i,
  /\bcontent warning\b/i,
  /\bchained together\b/i,
  /\bgolf with your friends\b/i,
  /\bgolf it\b/i,
  /\bpummel party\b/i,
  /\bduck game\b/i,
  /\bgang beasts\b/i,
  /\bhuman fall flat\b/i,
  /\bsquad\b/i,
  /\barma\s*3\b/i,
  /\bproject zomboid\b/i,
  /\bvalheim\b/i,
  /\bthe forest\b/i,
  /\bsons of the forest\b/i,
  /\braft\b/i,
  /\bterraria\b/i,
  /\bdead by daylight\b/i,
  /\bback 4 blood\b/i,
  /\bleft 4 dead\b/i,
  /\bwarhammer:\s*vermintide\b/i,
  /\bwarhammer 40,?000:\s*darktide\b/i,
  /\bdeep rock galactic\b/i,
  /\bkilling floor\b/i,
  /\brisk of rain\b/i,
  /\bremnhant\b/i,
  /\boutriders\b/i,
  /\bredfall\b/i,
  /\bgotham knights\b/i,
  /\banthem\b/i
];

// Single player exceptions that match the pattern above but DO have full offline single-player story
const ALLOWED_SINGLE_PLAYER = [
  'injustice: gods among us',
  'the wolf among us',
  'star wars™: squadrons',
  'suicide squad',
  'fallout', // other than fallout 76
  'the forest', // has full offline single player story
  'sons of the forest', // has full offline single player story
  'raft', // has full offline single player story
  'terraria', // has full offline single player
  'valheim', // has full offline solo mode
  'project zomboid', // has full offline solo mode
  'left 4 dead', // has full offline solo campaign with bots
  'left 4 dead 2', // has full offline solo campaign with bots
  'deep rock galactic', // has solo with bosco
  'risk of rain',
  'remnant',
  'remnant ii',
  'gotham knights', // full solo campaign
  'redfall' // solo playable
];

const flagged = [];

for (const p of products) {
  const name = (p.name || '').toLowerCase();
  for (const pat of ONLINE_PATTERNS) {
    if (pat.test(name)) {
      // Check if it's an allowed single player story game
      const isAllowed = ALLOWED_SINGLE_PLAYER.some(allowed => {
        if (allowed === 'fallout' && name.includes('fallout 76')) return false;
        return name.includes(allowed);
      });
      if (!isAllowed) {
        flagged.push({ id: p.id, name: p.name, app_id: p.app_id, matchedPattern: pat.toString() });
        break;
      }
    }
  }
}

console.log(`Encontrados ${flagged.length} juegos estrictamente online/servidores:`);
flagged.forEach(f => console.log(` - ID: ${f.id} | [AppID: ${f.app_id}] ${f.name} (Match: ${f.matchedPattern})`));
fs.writeFileSync('scratch/online_only_flagged.json', JSON.stringify(flagged, null, 2), 'utf8');
