import fs from "fs";

const res = await fetch("https://generator.ryuu.lol/files/games.json");
const ryuuGames = await res.json();

const NON_BASE_OR_BETA_REGEX = /\b(?:open beta|closed beta|beta test|stress test|technical test|playtest|server test|pre-alpha|closed alpha|open alpha|alpha test)\b/i;
const MULTIPLAYER_OR_BETA_SUFFIX = /(?:-\s*multiplayer|\(multiplayer\)|\bmultiplayer\s*$|\bbeta\b|\bplaytest\b)/i;

const COD_MP_APPIDS = new Set([
  "10190", // MW2 MP
  "42690", // MW3 MP
  "42710", // BO MP
  "202990", // BO2 MP
  "209170", // Ghosts MP
  "209660", // AW MP
  "393100", // MWR MP
  "47830"   // Medal of Honor MP
]);

function shouldExclude(r) {
  const appId = String(r.appid);
  if (COD_MP_APPIDS.has(appId)) return true;

  const name = (r.name || "").trim();
  if (NON_BASE_OR_BETA_REGEX.test(name)) return true;
  if (MULTIPLAYER_OR_BETA_SUFFIX.test(name)) return true;

  return false;
}

let excludedCount = 0;
const excludedList = [];
const keptLegit = [];

ryuuGames.forEach(r => {
  if (r.type?.toLowerCase() === 'game') {
    if (shouldExclude(r)) {
      excludedCount++;
      if (excludedCount <= 25) excludedList.push(`${r.appid}: ${r.name}`);
    } else {
      if (r.name?.toLowerCase().includes("alpha") || r.name?.toLowerCase().includes("protocol")) {
        keptLegit.push(`${r.appid}: ${r.name}`);
      }
    }
  }
});

console.log(`Total excluded betas / multiplayer standalone: ${excludedCount}`);
console.log("Samples of excluded:");
excludedList.forEach(s => console.log("  [X]", s));
console.log("\nSamples of kept legitimate games with 'alpha':");
keptLegit.slice(0, 10).forEach(s => console.log("  [OK]", s));
