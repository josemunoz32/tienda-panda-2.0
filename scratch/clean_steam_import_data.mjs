import fs from "fs";

const path = "src/assets/steam_import_data.json";
const list = JSON.parse(fs.readFileSync(path, "utf8"));

function cleanGameName(name) {
  if (!name) return "";
  let n = name;
  n = n.replace(/\s*\+\s*(?:aigis\s*)?dlc\b/gi, "");
  n = n.replace(/\s*\+\s*re\s*mind\s*\(\s*dlc\s*\)/gi, "");
  n = n.replace(/\s*\(\s*dlc\s*\)/gi, "");
  n = n.replace(/\s*\+\s*dlc\b/gi, "");
  n = n.replace(/\s*\|\s*[A-Z0-9]{2,6}$/g, ""); // quita sufijos como " | AFOP", " | FFXV", " | SWO", " | DSSB"
  n = n.replace(/\s*\((?:requiere\s*fix|requiere\s*parche|fix|parche)\)/gi, "");
  return n.trim();
}

let modified = 0;
list.forEach(item => {
  const orig = item.name;
  const cleaned = cleanGameName(orig);
  if (cleaned !== orig) {
    console.log(`Cleaned: "${orig}" -> "${cleaned}"`);
    item.name = cleaned;
    modified++;
  }
});

console.log(`Total cleaned in steam_import_data.json: ${modified}`);
fs.writeFileSync(path, JSON.stringify(list, null, 2), "utf8");
