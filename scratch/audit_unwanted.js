async function runAudit() {
  const res = await fetch("https://generator.ryuu.lol/files/games.json");
  const data = await res.json();
  const games = data.filter(g => (g.type || '').toLowerCase() === 'game');
  
  const groups = {
    "1. Minecraft & Microsoft Account": [],
    "2. Call of Duty Online / Live-Service (HQ / Ricochet)": [],
    "3. Shooters de Guerra 100% Multijugador / Sin Campaña Offline": [],
    "4. Ubisoft 100% Online (Requiere Ubisoft Connect + Servidores)": [],
    "5. EA Sports & 2K Sports (Denuvo / Verificación Online Permanente)": [],
    "6. Live-Service / MMO / Battle Royale (Incompatibles con Lua)": []
  };

  games.forEach(g => {
    const n = (g.name || '').toLowerCase();
    const id = String(g.appid);

    // 1. Minecraft
    if (n.includes('minecraft dungeons') || n.includes('minecraft legends')) {
      groups["1. Minecraft & Microsoft Account"].push({ id, name: g.name });
    }

    // 2. Call of Duty Online
    if (n.includes('call of duty')) {
      if (
        n.includes('warzone') || 
        n.includes('cold war') || 
        n.includes('vanguard') || 
        n.includes('modern warfare ii') || 
        n.includes('modern warfare iii') ||
        n.includes('multiplayer') ||
        n.includes('zombie') ||
        (n.includes('modern warfare') && !n.includes('2007') && !n.includes('2009') && !n.includes('2011') && !n.includes('remaster') && !n.includes('4:'))
      ) {
        groups["2. Call of Duty Online / Live-Service (HQ / Ricochet)"].push({ id, name: g.name });
      }
    }

    // 3. Guerra 100% Online
    if (
      n === 'squad' || 
      n === 'squad 44' || 
      n.includes('arma reforger') || 
      n.includes('hell let loose') || 
      n.includes('insurgency: sandstorm') || 
      n.includes('post scriptum') || 
      n.includes('world war 3') || 
      n.includes('beyond the wire')
    ) {
      groups["3. Shooters de Guerra 100% Multijugador / Sin Campaña Offline"].push({ id, name: g.name });
    }

    // 4. Ubisoft 100% Online
    if (
      n.includes('rainbow six siege') || 
      n.includes('rainbow six extraction') || 
      n.includes('the division') || 
      n.includes('for honor') || 
      n.includes('skull and bones') || 
      n.includes('riders republic') || 
      n.includes('xdefiant') || 
      n.includes('roller champions')
    ) {
      groups["4. Ubisoft 100% Online (Requiere Ubisoft Connect + Servidores)"].push({ id, name: g.name });
    }

    // 5. EA Sports / 2K Sports
    if (
      n.includes('ea sports fc') || 
      (n.includes('fifa') && !n.includes('legacy')) || 
      n.includes('nba 2k') || 
      n.includes('topspin') || 
      n.includes('pga tour 2k')
    ) {
      groups["5. EA Sports & 2K Sports (Denuvo / Verificación Online Permanente)"].push({ id, name: g.name });
    }

    // 6. Live Service
    if (
      n === 'pubg: battlegrounds' || 
      n === 'pubg' || 
      n === 'apex legends' || 
      n === 'destiny 2' || 
      n === 'warframe' || 
      n === 'dayz' || 
      n === 'rust' || 
      n.includes('hunt: showdown') || 
      n === 'helldivers 2' || 
      n === 'the finals' || 
      n === 'fall guys' ||
      n === 'dead by daylight'
    ) {
      groups["6. Live-Service / MMO / Battle Royale (Incompatibles con Lua)"].push({ id, name: g.name });
    }
  });

  console.log("================ INFORME DE AUDITORIA DE JUEGOS CON VERIFICACION ================\n");
  for (const [groupName, items] of Object.entries(groups)) {
    console.log(`\n### ${groupName} (${items.length} títulos detectados):`);
    items.forEach(it => console.log(`- [AppID ${it.id}] ${it.name}`));
  }
}

runAudit().catch(console.error);
