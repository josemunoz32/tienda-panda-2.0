import fs from "fs";

async function inspectRyuuTypes() {
  const res = await fetch("https://generator.ryuu.lol/files/games.json");
  const games = await res.json();
  console.log(`Total items in Ryuu: ${games.length}`);

  const types = new Map();
  games.forEach(g => {
    const t = String(g.type || 'unknown').toLowerCase();
    types.set(t, (types.get(t) || 0) + 1);
  });
  console.log("Types in Ryuu:", Object.fromEntries(types));

  let nonGameCount = 0;
  games.forEach(g => {
    const t = String(g.type || '').toLowerCase();
    if (t !== 'game') {
      nonGameCount++;
      if (nonGameCount <= 10) {
        console.log(`Sample non-game: appid=${g.appid} | type="${g.type}" | name="${g.name}"`);
      }
    }
  });
}

inspectRyuuTypes().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
