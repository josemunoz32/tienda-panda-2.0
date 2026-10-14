import fetch from 'node-fetch';

async function main() {
  const res = await fetch("https://generator.ryuu.lol/files/fixes.json");
  const data = await res.json();
  
  const multiFixGames = data.filter(g => g.fixes && g.fixes.length > 1);
  console.log(`Total games with 2+ fixes: ${multiFixGames.length} of ${data.length}`);
  
  console.log("\nSample games with 2+ fixes:");
  for (const g of multiFixGames.slice(0, 10)) {
    console.log(`\nAppID: ${g.appid} | Name: ${g.name} (${g.fixes.length} fixes)`);
    for (const f of g.fixes) {
      console.log(`  - [${f.size}] ${f.filename} (${f.href})`);
    }
  }
}

main().catch(console.error);
