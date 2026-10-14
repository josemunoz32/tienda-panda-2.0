import fetch from 'node-fetch';

async function main() {
  const res = await fetch("https://generator.ryuu.lol/files/fixes.json");
  const data = await res.json();
  console.log(`Total games with fixes in fixes.json: ${data.length}`);
  
  // Find Resident Evil Requiem (AppID 3764200) or any AppID matching 3764200
  const re = data.find(g => g.appid === "3764200" || g.appid === 3764200 || g.name.toLowerCase().includes("requiem"));
  console.log("Resident Evil Requiem fixes entry:");
  console.log(JSON.stringify(re, null, 2));

  // Inspect first 5 games in fixes.json
  console.log("\nSample fixes entries:");
  console.log(JSON.stringify(data.slice(0, 5), null, 2));
}

main().catch(console.error);
