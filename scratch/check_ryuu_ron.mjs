import fs from "fs";

async function checkRyuuAndFirestore() {
  console.log("Fetching Ryuu games.json...");
  const res = await fetch("https://generator.ryuu.lol/files/games.json");
  const games = await res.json();
  const ron = games.find(g => String(g.appid) === "1144200");
  if (ron) {
    console.log("Found Ready or Not in Ryuu:", {
      appid: ron.appid,
      name: ron.name,
      type: ron.type,
      dlcCount: ron.dlc ? Object.keys(ron.dlc).length : 0,
      dlcs: ron.dlc
    });
  } else {
    console.log("Ready or Not NOT found in Ryuu!");
  }
}

checkRyuuAndFirestore().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
