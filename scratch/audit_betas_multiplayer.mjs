import fs from "fs";

const steamImport = JSON.parse(fs.readFileSync("src/assets/steam_import_data.json", "utf8"));
const suspect = [];
steamImport.forEach(item => {
  const name = (item.name || "").toLowerCase();
  if (/\b(?:beta|open beta|closed beta|alpha|pre-alpha|playtest|multiplayer|dedicated server|server test)\b/i.test(name)) {
    suspect.push({ app_id: item.app_id || item.id, name: item.name });
  }
});
console.log("Betas / Multiplayer / Tests in steam_import_data:", suspect.length);
suspect.forEach(s => console.log("  -", s.app_id, `"${s.name}"`));
