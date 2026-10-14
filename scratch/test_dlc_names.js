const fs = require('fs');

async function test() {
  const res = await fetch('https://generator.ryuu.lol/files/games.json');
  const data = await res.json();
  let total = 0;
  let hasRealName = 0;
  let isRawNumber = 0;

  for (const g of data) {
    if (!g.dlc) continue;
    for (const [k, v] of Object.entries(g.dlc)) {
      total++;
      let name = '';
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (trimmed.startsWith('{')) {
          const match = trimmed.match(/['"]name['"]\s*:\s*['"]([^'"]+)['"]/);
          if (match) name = match[1];
        } else {
          name = trimmed;
        }
      } else if (typeof v === 'object' && v !== null) {
        name = v.name || '';
      }
      if (name && !/^\d+$/.test(name.trim())) {
        hasRealName++;
      } else {
        isRawNumber++;
      }
    }
  }
  console.log({ total, hasRealName, isRawNumber, percentageWithRealName: (hasRealName/total*100).toFixed(2)+'%' });
}

test().catch(console.error);
