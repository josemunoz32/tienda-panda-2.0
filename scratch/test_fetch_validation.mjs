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

async function testFetch() {
  const steamImportData = JSON.parse(fs.readFileSync("src/assets/steam_import_data.json", "utf8"));
  const vipGamesData = JSON.parse(fs.readFileSync("src/utils/vipGamesData.json", "utf8"));
  
  // Simular Ryuu
  console.log("Fetching Ryuu catalog...");
  const res = await fetch("https://generator.ryuu.lol/files/games.json");
  const ryuuData = await res.json();
  const ryuuMap = new Map();
  ryuuData.forEach(r => { if (r.appid) ryuuMap.set(String(r.appid), r); });

  // Lista simulada con Firestore games (incluyendo 1144200 Ready or Not)
  const list = [
    { id: "1144200", app_id: "1144200", name: "Ready or Not", category: "Acción" },
    { id: "1285190", app_id: "1285190", name: "Borderlands 4 + DLC", category: "Shooter" },
    { id: "801800", app_id: "801800", name: "Atomfall + DLC", category: "Aventura" },
    { id: "1237320", app_id: "1237320", name: "Sonic Frontiers + DLC", category: "Plataformas" },
    { id: "999991", app_id: "999991", name: "Cyberpunk 2077 Original Soundtrack", category: "Music" },
    { id: "999992", app_id: "999992", name: "Half-Life 2 Dedicated Server", category: "Tool" },
    { id: "999993", app_id: "999993", name: "Resident Evil 4 Chainsaw Demo", category: "Demo" }
  ];

  // Integrar steamImportData
  steamImportData.forEach(s => {
    list.push({
      id: String(s.app_id || s.id),
      app_id: String(s.app_id || s.id),
      name: s.name,
      steam_folder_name: s.name,
      category: s.genero || "Steam"
    });
  });

  const NON_BASE_ITEM_REGEX = /\b(?:soundtrack|ost|original score|original soundtrack|digital artbook|artbook|demo|playtest|dedicated server|sdk|mod kit|content pack|skin pack|cosmetic pack|expansion pass|season pass|supporter pack)\b/i;

  list.forEach(item => {
    const aId = String(item.app_id || item.id || "").trim();

    if (item.name) {
      item.name = item.name
        .replace(/\s*\+\s*(?:aigis\s*)?dlc\b/gi, "")
        .replace(/\s*\+\s*re\s*mind\s*\(\s*dlc\s*\)/gi, "")
        .replace(/\s*\(\s*dlc\s*\)/gi, "")
        .replace(/\s*\+\s*dlc\b/gi, "")
        .replace(/\s*\|\s*[A-Z0-9]{2,6}$/g, "")
        .replace(/\s*\((?:requiere\s*fix|requiere\s*parche|fix|parche)\)/gi, "")
        .trim();
    }

    const rGame = ryuuMap.get(aId);
    if (rGame && rGame.dlc && typeof rGame.dlc === 'object') {
      const dlcEntries = Object.entries(rGame.dlc);
      if (dlcEntries.length > 0) {
        const dlcsList = dlcEntries.map(([did, dinfo]) => parseDlcInfo(did, dinfo));
        const dlcKeys = dlcsList.map(d => d.dlc_app_id);
        item.dlcsCount = dlcsList.length;
        item.dlcIds = dlcKeys;
        item.dlcs = dlcsList;
        item.hasDlcs = true;
      }
    }

    if (item.dlcsCount === undefined) {
      item.dlcsCount = 0;
      item.dlcIds = [];
      item.dlcs = [];
      item.hasDlcs = false;
    }
  });

  const baseOnlyList = list.filter(item => {
    const name = (item.name || "").toLowerCase();
    const folder = (item.steam_folder_name || "").toLowerCase();
    if (name === "wallpaper engine" || name.includes("ghost") || name.includes("postal") || name.includes("lost planet") || name.includes("frostpunk") || name.includes("ostfront") || name.includes("osteya")) {
      return true;
    }
    if (NON_BASE_ITEM_REGEX.test(name) || NON_BASE_ITEM_REGEX.test(folder)) {
      return false;
    }
    return true;
  });

  const seenAppIds = new Set();
  const seenCleanNames = new Map();
  const deduplicated = [];

  baseOnlyList.forEach(item => {
    const aId = String(item.app_id || item.id || "").trim();
    const cleanName = (item.name || "").toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!aId && !cleanName) return;

    if (aId && seenAppIds.has(aId)) {
      const existingItem = deduplicated.find(g => String(g.app_id || g.id) === aId);
      if (existingItem) {
        if ((!existingItem.dlcsCount || existingItem.dlcsCount === 0) && item.dlcsCount > 0) {
          existingItem.dlcsCount = item.dlcsCount;
          existingItem.dlcIds = item.dlcIds;
          existingItem.dlcs = item.dlcs;
          existingItem.hasDlcs = true;
        }
      }
      return;
    }

    if (cleanName && seenCleanNames.has(cleanName)) {
      const existingIdx = seenCleanNames.get(cleanName);
      const existingItem = deduplicated[existingIdx];
      if ((!existingItem.dlcsCount || existingItem.dlcsCount === 0) && item.dlcsCount > 0) {
        existingItem.dlcsCount = item.dlcsCount;
        existingItem.dlcIds = item.dlcIds;
        existingItem.dlcs = item.dlcs;
        existingItem.hasDlcs = item.hasDlcs;
      }
      return;
    }

    if (aId) seenAppIds.add(aId);
    if (cleanName && cleanName.length > 3) {
      seenCleanNames.set(cleanName, deduplicated.length);
    }
    deduplicated.push(item);
  });

  console.log(`Deduplicated games: ${deduplicated.length}`);

  // Test Ready or Not
  const ron = deduplicated.find(g => String(g.app_id || g.id) === "1144200");
  console.log("Ready or Not in results:", ron ? {
    name: ron.name,
    appId: ron.app_id,
    hasDlcs: ron.hasDlcs,
    dlcsCount: ron.dlcsCount,
    dlcs: ron.dlcs.map(d => `${d.dlc_app_id}: ${d.name}`)
  } : "NOT FOUND");

  // Test cleaned titles
  const bl4 = deduplicated.find(g => String(g.app_id || g.id) === "1285190");
  console.log("Borderlands 4 title:", bl4?.name);

  const atom = deduplicated.find(g => String(g.app_id || g.id) === "801800");
  console.log("Atomfall title:", atom?.name);

  // Check if non-base items leaked
  const leaked = deduplicated.filter(g => ["999991", "999992", "999993"].includes(String(g.app_id)));
  console.log("Leaked non-base items (should be 0):", leaked.length);
}

testFetch().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
