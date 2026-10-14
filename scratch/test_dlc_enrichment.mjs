import fs from "fs";

function parseDlcInfo(dlcAppId, dlcInfo) {
  let name = "";
  let header_image = "";

  if (typeof dlcInfo === "string") {
    const trimmed = dlcInfo.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        name = parsed.name || "";
        header_image = parsed.header_image || "";
      } catch (e) {
        const nameMatch = trimmed.match(/['"]name['"]\s*:\s*['"]([^'"]+)['"]/);
        if (nameMatch) name = nameMatch[1];
        const imgMatch = trimmed.match(/['"]header_image['"]\s*:\s*['"]([^'"]+)['"]/);
        if (imgMatch) header_image = imgMatch[1];
      }
    } else {
      name = trimmed;
    }
  } else if (typeof dlcInfo === "object" && dlcInfo !== null) {
    name = dlcInfo.name || "";
    header_image = dlcInfo.header_image || "";
  }

  if (!header_image && dlcAppId) {
    header_image = `https://cdn.akamai.steamstatic.com/steam/apps/${dlcAppId}/header.jpg`;
  }

  const isNumericOnly = !name || /^\d+$/.test(name.trim());
  const finalName = isNumericOnly ? `DLC ${dlcAppId}` : name.trim();

  return {
    dlc_app_id: String(dlcAppId),
    name: finalName,
    header_image,
    price_clp: 1000
  };
}

const ryuuRaw = JSON.parse(fs.readFileSync("scratch/temp_ryuu.json", "utf8"));
const ryuuMap = new Map();
ryuuRaw.forEach(r => { if (r.appid) ryuuMap.set(String(r.appid), r); });

const ron = ryuuMap.get("1144200");
console.log("RON in Ryuu:", ron ? "Found! Name: " + ron.name : "Not found");
if (ron && ron.dlc) {
  const dlcEntries = Object.entries(ron.dlc);
  const dlcsList = dlcEntries.map(([did, dinfo]) => parseDlcInfo(did, dinfo));
  console.log("RON DLC count:", dlcsList.length);
  dlcsList.forEach(d => console.log("  -", d.dlc_app_id, d.name));
}
