const fs = require('fs');
const path = require('path');

const publicPromosDir = path.join(__dirname, '..', 'public', 'promos');

if (!fs.existsSync(publicPromosDir)) {
  fs.mkdirSync(publicPromosDir, { recursive: true });
}

const sagasInfo = [
  { key: 'promo_assassins_creed', name: "ASSASSIN'S CREED", subtitle: "Colección Completa + VIP Shadows", color: '#e63946', icon: '🦅' },
  { key: 'promo_yakuza', name: "YAKUZA / LIKE A DRAGON", subtitle: "Historia de Kiryu + VIP Extras", color: '#ffb703', icon: '🐉' },
  { key: 'promo_sonic', name: "SONIC UNIVERSO", subtitle: "Colección Velocidad + VIP Frontiers", color: '#00b4d8', icon: '🦔' },
  { key: 'promo_monster_hunter', name: "MONSTER HUNTER", subtitle: "Colección Cacería + VIP Wilds", color: '#52b788', icon: '⚔️' },
  { key: 'promo_star_wars', name: "STAR WARS AVENTURA", subtitle: "Colección Galáctica + VIP Outlaws", color: '#48cae4', icon: '🚀' },
  { key: 'promo_borderlands', name: "BORDERLANDS", subtitle: "Colección Caos + VIP Borderlands 4", color: '#ffb703', icon: '🎯' },
  { key: 'promo_mafia', name: "MAFIA", subtitle: "Trilogía Definitiva + VIP Old Country", color: '#d62828', icon: '🎩' },
  { key: 'promo_civilization', name: "CIVILIZATION", subtitle: "Colección Estrategia + VIP Civ VII", color: '#a855f7', icon: '🏛️' },
  { key: 'promo_nfs', name: "NEED FOR SPEED", subtitle: "Colección Carreras + VIP Unbound", color: '#ff007f', icon: '🏎️' },
  { key: 'promo_mortal_kombat', name: "MORTAL KOMBAT", subtitle: "Colección Kombate + VIP MK1", color: '#ff4800', icon: '🐉' },
  { key: 'promo_sniper_elite', name: "SNIPER ELITE", subtitle: "Colección Francotirador + VIP 5", color: '#3a5a40', icon: '🎯' },
  { key: 'promo_life_is_strange', name: "LIFE IS STRANGE", subtitle: "Colección Narrativa + VIP Reunion", color: '#ec4899', icon: '🦋' },
  { key: 'promo_tierra_media', name: "TIERRA MEDIA", subtitle: "Sombras de Mordor + VIP Shadow of War", color: '#f59e0b', icon: '💍' },
  { key: 'promo_dragon_ball', name: "DRAGON BALL", subtitle: "Colección Saiyan + VIP Sparking! ZERO", color: '#f97316', icon: '💥' },
  { key: 'promo_prince_of_persia', name: "PRINCE OF PERSIA", subtitle: "Colección Arenas + VIP Lost Crown", color: '#eab308', icon: '⏳' },
  { key: 'promo_dead_space', name: "DEAD SPACE", subtitle: "Trilogía Terror + VIP Remake", color: '#06b6d4', icon: '🌌' },
  { key: 'promo_bioshock', name: "BIOSHOCK", subtitle: "Trilogía Rapture & Columbia", color: '#14b8a6', icon: '🗽' },
  { key: 'promo_metro', name: "METRO", subtitle: "Trilogía Post-Apocalíptica Redux", color: '#64748b', icon: '☣️' },
  { key: 'promo_dishonored', name: "DISHONORED", subtitle: "Colección Sigilo & Magia", color: '#8b5cf6', icon: '🗡️' },
  { key: 'promo_wolfenstein', name: "WOLFENSTEIN", subtitle: "Colección Acción Clásica", color: '#ef4444', icon: '⚡' },
  { key: 'promo_just_cause', name: "JUST CAUSE", subtitle: "Colección Caos & Explosiones", color: '#f97316', icon: '💥' },
  { key: 'promo_darksiders', name: "DARKSIDERS", subtitle: "Colección Jinetes del Apocalipsis", color: '#a855f7', icon: '💀' },
  { key: 'promo_the_witcher', name: "THE WITCHER", subtitle: "Trilogía Geralt de Rivia GOTY", color: '#eab308', icon: '🐺' },
  { key: 'promo_fallout', name: "FALLOUT", subtitle: "Colección Wasteland GOTY", color: '#84cc16', icon: '☢️' },
  { key: 'promo_elder_scrolls', name: "THE ELDER SCROLLS", subtitle: "Colección Tamriel Skyrim & Oblivion", color: '#3b82f6', icon: '🛡️' },
  { key: 'promo_doom', name: "DOOM", subtitle: "Colección Slayer Eternal", color: '#dc2626', icon: '🔥' },
  { key: 'promo_halo', name: "HALO", subtitle: "Master Chief Collection", color: '#10b981', icon: '🌌' },
  { key: 'promo_gears_of_war', name: "GEARS OF WAR", subtitle: "Colección Lancer + VIP Reloaded", color: '#b91c1c', icon: '⚙️' },
  { key: 'promo_hitman', name: "HITMAN", subtitle: "Colección Agente 47 Sigilo", color: '#475569', icon: '🎯' },
  { key: 'promo_naruto', name: "NARUTO STORM", subtitle: "Colección Ninja Completa", color: '#f97316', icon: '🌀' },
  { key: 'promo_one_piece', name: "ONE PIECE", subtitle: "Colección Piratas Pirate Warriors", color: '#ef4444', icon: '☠️' },
  { key: 'promo_lego_marvel', name: "LEGO MARVEL", subtitle: "Colección Superhéroes LEGO", color: '#3b82f6', icon: '🧱' },
  { key: 'promo_lego_batman', name: "LEGO BATMAN", subtitle: "Trilogía LEGO + VIP Legacy Dark Knight", color: '#6366f1', icon: '🦇' },
  { key: 'promo_walking_dead', name: "THE WALKING DEAD", subtitle: "Saga Telltale Completa", color: '#78716c', icon: '🧟' },
  { key: 'promo_dying_light', name: "DYING LIGHT", subtitle: "Colección Supervivencia Zombi", color: '#eab308', icon: '🏃' },
  { key: 'promo_plague_tale', name: "A PLAGUE TALE", subtitle: "Innocence & Requiem", color: '#a855f7', icon: '🐀' },
  { key: 'promo_nier', name: "NIER", subtitle: "Automata & Replicant", color: '#ec4899', icon: '🤖' },
  { key: 'promo_portal', name: "PORTAL", subtitle: "Portal 1 & Portal 2", color: '#06b6d4', icon: '🌀' },
  { key: 'promo_left_4_dead', name: "LEFT 4 DEAD", subtitle: "Left 4 Dead 1 & 2", color: '#84cc16', icon: '🧟' },
  { key: 'promo_subnautica', name: "SUBNAUTICA", subtitle: "Original & Below Zero", color: '#0ea5e9', icon: '🌊' },
  { key: 'promo_south_park', name: "SOUTH PARK", subtitle: "Colección Humor Stick of Truth", color: '#facc15', icon: '☃️' },
  { key: 'promo_kingdom_come', name: "KINGDOM COME", subtitle: "Deliverance Royal + KCD 2", color: '#d97706', icon: '⚔️' },
  { key: 'promo_watch_dogs', name: "WATCH DOGS", subtitle: "Trilogía Hackers Legion", color: '#10b981', icon: '💻' },
  { key: 'promo_ghost_recon', name: "GHOST RECON", subtitle: "Colección Táctica + VIP Wildlands", color: '#64748b', icon: '🎖️' }
];

function generateSVG(item) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a051b" />
      <stop offset="50%" stop-color="#140a33" />
      <stop offset="100%" stop-color="#06030e" />
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${item.color}" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#a259ff" stop-opacity="0.8"/>
    </linearGradient>
    <linearGradient id="cardBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${item.color}"/>
      <stop offset="100%" stop-color="#7b2ff2"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="${item.color}" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="800" height="450" fill="url(#bg)"/>
  
  <!-- Subtle Grid Pattern -->
  <path d="M0,75 H800 M0,150 H800 M0,225 H800 M0,300 H800 M0,375 H800" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
  <path d="M133,0 V450 M266,0 V450 M400,0 V450 M533,0 V450 M666,0 V450" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>

  <!-- Ambient Light Orbs -->
  <circle cx="150" cy="150" r="180" fill="${item.color}" opacity="0.15" filter="blur(50px)"/>
  <circle cx="650" cy="300" r="200" fill="#7b2ff2" opacity="0.12" filter="blur(60px)"/>

  <!-- Outer Frame -->
  <rect x="15" y="15" width="770" height="420" rx="20" fill="none" stroke="url(#cardBorder)" stroke-width="3" opacity="0.8"/>

  <!-- Top Badge -->
  <g transform="translate(40, 40)">
    <rect width="210" height="32" rx="16" fill="rgba(162, 89, 255, 0.2)" stroke="rgba(162, 89, 255, 0.5)" stroke-width="1.5"/>
    <text x="105" y="21" fill="#e0baff" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" text-anchor="middle" letter-spacing="1.5">PANDASTORE SAGA VIP</text>
  </g>

  <!-- Big Icon Center-Right -->
  <text x="600" y="260" font-size="140" text-anchor="middle" filter="url(#shadow)" opacity="0.9">${item.icon}</text>

  <!-- Content Left -->
  <g transform="translate(50, 190)">
    <!-- Main Title -->
    <text x="0" y="40" fill="#ffffff" font-family="'Inter', 'Segoe UI', sans-serif" font-size="38" font-weight="900" letter-spacing="0.5">${item.name}</text>
    
    <!-- Subtitle -->
    <text x="0" y="80" fill="#c4b5fd" font-family="'Segoe UI', sans-serif" font-size="20" font-weight="600">${item.subtitle}</text>

    <!-- Tag Pills -->
    <g transform="translate(0, 115)">
      <rect x="0" y="0" width="180" height="36" rx="8" fill="url(#glow)"/>
      <text x="90" y="23" fill="#ffffff" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="800" text-anchor="middle">🎮 COLECCIÓN COMPLETA</text>

      <rect x="195" y="0" width="160" height="36" rx="8" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
      <text x="275" y="23" fill="#00f5d4" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="800" text-anchor="middle">⚡ MODOS HISTORIA</text>
    </g>
  </g>

  <!-- Bottom Brand Watermark -->
  <text x="750" y="415" fill="rgba(255,255,255,0.3)" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="700" text-anchor="end">PandaStore 2.0 Premium Bundle</text>
</svg>`;
}

let createdCount = 0;
sagasInfo.forEach(item => {
  const filePathJpg = path.join(publicPromosDir, `${item.key}.jpg`);
  const filePathSvg = path.join(publicPromosDir, `${item.key}.svg`);

  // Remove old invalid fake jpg if exists
  if (fs.existsSync(filePathJpg)) {
    try {
      const content = fs.readFileSync(filePathJpg, 'utf8');
      if (content.includes('<svg')) {
        fs.unlinkSync(filePathJpg);
      }
    } catch (e) {}
  }

  // Write clean SVG file
  fs.writeFileSync(filePathSvg, generateSVG(item), 'utf8');
  createdCount++;
});

console.log(`Successfully generated ${createdCount} clean SVG saga covers!`);
