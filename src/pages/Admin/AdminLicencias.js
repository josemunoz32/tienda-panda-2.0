import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { getCachedSteamCatalog, setCachedSteamCatalog, isOnlineOnlyAppId } from "../../utils/steamCatalogCache";
import { isVipGame } from "../../utils/vipGames";
import vipGamesData from "../../utils/vipGamesData.json";
import steamImportData from "../../assets/steam_import_data.json";
import { parseDlcInfo } from "../../utils/ryuuDlcHelper";
import "./AdminLicencias.css";

// ─── CONSTANTES OFICIALES: 7 JUEGOS UBISOFT Y 7 JUEGOS EA (LuaTools) ─────────
export const UBISOFT_7_APP_IDS = new Set(["66088", "1081", "4740", "5266", "6145", "17903", "1771"]);
export const EA_7_APP_IDS = new Set(["16425677", "16425884", "16425751", "16425629", "198188", "1035208", "196787"]);

export function isUbisoftVipGame(game) {
  if (!game) return false;
  const appId = String(typeof game === "object" ? (game.app_id || game.appid || game.id || game.vip_app_id || "") : "");
  if (appId && UBISOFT_7_APP_IDS.has(appId)) return true;
  const rawName = typeof game === "string" ? game : (game.name || "");
  const clean = rawName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    clean.includes("blackflagresynced") ||
    (clean.includes("assassin") && clean.includes("blackflag")) ||
    (clean.includes("assassin") && clean.includes("shadows")) ||
    clean.includes("frontiersofpandora") ||
    clean === "farcry6" ||
    (clean.includes("princeofpersia") && clean.includes("lostcrown")) ||
    clean.includes("starwarsoutlaws") ||
    (clean.includes("ghostrecon") && clean.includes("wildlands"))
  );
}

export function isEaVipGame(game) {
  if (!game) return false;
  const appId = String(typeof game === "object" ? (game.app_id || game.appid || game.id || game.vip_app_id || "") : "");
  if (appId && (EA_7_APP_IDS.has(appId) || appId === "3405690" || appId === "4080220" || appId === "4407750")) return true;
  const rawName = typeof game === "string" ? game : (game.name || "");
  const clean = rawName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    clean.includes("fc26") ||
    clean.includes("fc27") ||
    clean.includes("fifa26") ||
    clean.includes("fifa27") ||
    clean.includes("maddennfl26") ||
    (clean.includes("pga") && clean.includes("tour")) ||
    clean.includes("lostinrandom") ||
    (clean.includes("needforspeed") && clean.includes("payback")) ||
    (clean.includes("needforspeed") && clean.includes("unbound"))
  );
}

export const SAGA_PRESETS = [
  {
    id: "fifa",
    name: "FIFA / EA FC",
    icon: "⚽",
    color: "#10b981",
    keywords: ["fifa", "ea sports fc", "fc 24", "fc 25", "fc 26", "fc 27", "fc24", "fc25", "fc26", "fc27"]
  },
  {
    id: "aoe",
    name: "Age of Empires",
    icon: "🏰",
    color: "#d97706",
    keywords: ["age of empires", "age of mythology", "aoe", "mythology"]
  },
  {
    id: "outlast",
    name: "Outlast",
    icon: "😱",
    color: "#059669",
    keywords: ["outlast", "whistleblower"]
  },
  {
    id: "cod",
    name: "Call of Duty",
    icon: "🪖",
    color: "#2563eb",
    keywords: ["call of duty", "black ops", "modern warfare", "infinite warfare", "advanced warfare", "world at war", "ghosts"]
  },
  {
    id: "re",
    name: "Resident Evil",
    icon: "🧟",
    color: "#dc2626",
    keywords: ["resident evil", "biohazard"]
  },
  {
    id: "gow",
    name: "God of War",
    icon: "🪓",
    color: "#ea580c",
    keywords: ["god of war"]
  },
  {
    id: "farcry",
    name: "Far Cry",
    icon: "🏝️",
    color: "#16a34a",
    keywords: ["far cry"]
  },
  {
    id: "mgs",
    name: "Metal Gear",
    icon: "🐍",
    color: "#64748b",
    keywords: ["metal gear"]
  },
  {
    id: "souls",
    name: "Souls & Elden",
    icon: "⚔️",
    color: "#7c3aed",
    keywords: ["dark souls", "elden ring", "sekiro", "bloodborne", "demon's souls", "armored core"]
  },
  {
    id: "gta",
    name: "GTA",
    icon: "🚗",
    color: "#ca8a04",
    keywords: ["grand theft auto", "gta "]
  },
  {
    id: "batman",
    name: "Batman Arkham",
    icon: "🦇",
    color: "#4f46e5",
    keywords: ["batman: arkham", "batman arkham", "arkham asylum", "arkham city", "arkham knight", "arkham origins"]
  },
  {
    id: "assassins",
    name: "Assassin's Creed",
    icon: "🗡️",
    color: "#b91c1c",
    keywords: ["assassin's creed", "assassins creed"]
  },
  {
    id: "nfs",
    name: "Need for Speed",
    icon: "🏎️",
    color: "#0284c7",
    keywords: ["need for speed"]
  }
];

export const KNOWN_GAME_NAMES = {
  "1548510": "Crash Bandicoot™ 4: It's About Time",
  "16425677": "EA SPORTS FC 26 (FIFA 26)",
  "16425884": "EA SPORTS FC 27 (FIFA 27)",
  "2669320": "EA SPORTS FC 25 (FIFA 25)",
  "2195250": "EA SPORTS FC 24 (FIFA 24)",
  "42700": "Call of Duty: Black Ops",
  "202970": "Call of Duty: Black Ops II",
  "311210": "Call of Duty: Black Ops III",
  "7940": "Call of Duty 4: Modern Warfare",
  "10180": "Call of Duty: Modern Warfare 2 (2009)",
  "115300": "Call of Duty: Modern Warfare 3 (2011)",
  "476600": "Call of Duty: Modern Warfare Remastered",
  "10090": "Call of Duty: World at War",
  "209160": "Call of Duty: Ghosts",
  "209650": "Call of Duty: Advanced Warfare",
  "292730": "Call of Duty: Infinite Warfare",
  "476620": "Call of Duty: WWII"
};

export const FALLBACK_COD_GAMES = [
  { id: "42700", app_id: "42700", name: "Call of Duty: Black Ops", steam_folder_name: "Call of Duty Black Ops", technical_category: "solo_lua", category: "Shooter", header_image: "https://cdn.akamai.steamstatic.com/steam/apps/42700/header.jpg" },
  { id: "202970", app_id: "202970", name: "Call of Duty: Black Ops II", steam_folder_name: "Call of Duty Black Ops II", technical_category: "solo_lua", category: "Shooter", header_image: "https://cdn.akamai.steamstatic.com/steam/apps/202970/header.jpg" },
  { id: "311210", app_id: "311210", name: "Call of Duty: Black Ops III", steam_folder_name: "Call of Duty Black Ops III", technical_category: "solo_lua", category: "Shooter", header_image: "https://cdn.akamai.steamstatic.com/steam/apps/311210/header.jpg" },
  { id: "7940", app_id: "7940", name: "Call of Duty 4: Modern Warfare", steam_folder_name: "Call of Duty 4 Web Edition", technical_category: "solo_lua", category: "Shooter", header_image: "https://cdn.akamai.steamstatic.com/steam/apps/7940/header.jpg" },
  { id: "10180", app_id: "10180", name: "Call of Duty: Modern Warfare 2 (2009)", steam_folder_name: "Call of Duty Modern Warfare 2", technical_category: "solo_lua", category: "Shooter", header_image: "https://cdn.akamai.steamstatic.com/steam/apps/10180/header.jpg" },
  { id: "115300", app_id: "115300", name: "Call of Duty: Modern Warfare 3 (2011)", steam_folder_name: "Call of Duty Modern Warfare 3", technical_category: "solo_lua", category: "Shooter", header_image: "https://cdn.akamai.steamstatic.com/steam/apps/115300/header.jpg" },
  { id: "476600", app_id: "476600", name: "Call of Duty: Modern Warfare Remastered", steam_folder_name: "Call of Duty Modern Warfare Remastered", technical_category: "solo_lua", category: "Shooter", header_image: "https://cdn.akamai.steamstatic.com/steam/apps/476600/header.jpg" },
  { id: "10090", app_id: "10090", name: "Call of Duty: World at War", steam_folder_name: "Call of Duty World at War", technical_category: "solo_lua", category: "Shooter", header_image: "https://cdn.akamai.steamstatic.com/steam/apps/10090/header.jpg" },
  { id: "209160", app_id: "209160", name: "Call of Duty: Ghosts", steam_folder_name: "Call of Duty Ghosts", technical_category: "solo_lua", category: "Shooter", header_image: "https://cdn.akamai.steamstatic.com/steam/apps/209160/header.jpg" },
  { id: "209650", app_id: "209650", name: "Call of Duty: Advanced Warfare", steam_folder_name: "Call of Duty Advanced Warfare", technical_category: "solo_lua", category: "Shooter", header_image: "https://cdn.akamai.steamstatic.com/steam/apps/209650/header.jpg" },
  { id: "292730", app_id: "292730", name: "Call of Duty: Infinite Warfare", steam_folder_name: "Call of Duty Infinite Warfare", technical_category: "solo_lua", category: "Shooter", header_image: "https://cdn.akamai.steamstatic.com/steam/apps/292730/header.jpg" },
  { id: "476620", app_id: "476620", name: "Call of Duty: WWII", steam_folder_name: "Call of Duty WWII", technical_category: "solo_lua", category: "Shooter", header_image: "https://cdn.akamai.steamstatic.com/steam/apps/476620/header.jpg" }
];

export const matchesSaga = (game, saga) => {
  if (!game || !saga) return false;
  const name = (game.name || "").toLowerCase();
  const folder = (game.steam_folder_name || "").toLowerCase();
  return saga.keywords.some(kw => name.includes(kw) || folder.includes(kw));
};

export default function AdminLicencias() {
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'licenses' | 'games' | 'guide'
  
  // Licenses State
  const [licenses, setLicenses] = useState([]);
  const [loadingLicenses, setLoadingLicenses] = useState(true);
  const [searchLicense, setSearchLicense] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'revoked' | 'bound' | 'unbound'
  const [dateSort, setDateSort] = useState("newest"); // 'newest' | 'oldest' | 'activated_newest'
  const [licenseViewMode, setLicenseViewMode] = useState("table"); // 'table' | 'by_hwid' | 'by_client'
  const [selectedSideLicense, setSelectedSideLicense] = useState(null);
  
  // New License Form State
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [editingLicense, setEditingLicense] = useState(null);
  const [newKey, setNewKey] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newLicenseType, setNewLicenseType] = useState("permanent"); // 'permanent' | 'monthly' | 'trial'
  const [newExpiryDate, setNewExpiryDate] = useState("");
  const [newStatus, setNewStatus] = useState("active"); // 'active' | 'suspended' | 'revoked'
  const [newHwid, setNewHwid] = useState("");
  const [isTrial, setIsTrial] = useState(false);
  const [trialMinutes, setTrialMinutes] = useState(15);
  const [isAllGames, setIsAllGames] = useState(false);
  const [selectedGameIds, setSelectedGameIds] = useState([]);
  const [selectedDlcIds, setSelectedDlcIds] = useState([]);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerVisibleLimit, setPickerVisibleLimit] = useState(40);
  const [formError, setFormError] = useState("");

  // Games State
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [searchGame, setSearchGame] = useState("");
  const [gameFilter, setGameFilter] = useState("all"); // 'all' | 'lua_only' | 'with_fix' | 'denuvo'
  const [gameSagaFilter, setGameSagaFilter] = useState("all"); // 'all' | saga.id
  const [gamesPage, setGamesPage] = useState(1);
  const gamesPerPage = 60;
  const [showGameModal, setShowGameModal] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  
  // Game Form State
  const [gameAppId, setGameAppId] = useState("");
  const [gameName, setGameName] = useState("");
  const [gameFolderName, setGameFolderName] = useState("");
  const [gameDriveId, setGameDriveId] = useState("");
  const [gameLuaContent, setGameLuaContent] = useState("");

  const [pickerFilter, setPickerFilter] = useState("all"); // 'all' | 'lua_only' | 'with_fix'
  const [pickerSagaFilter, setPickerSagaFilter] = useState("all"); // 'all' | saga.id
  const [expandedDlcGameId, setExpandedDlcGameId] = useState(null); // ID del juego cuyos DLCs individuales se están visualizando
  const [dlcSearch, setDlcSearch] = useState(""); // Filtro de búsqueda dentro del drawer de DLCs

  const [copiedKey, setCopiedKey] = useState(null);

  const dashboard = useMemo(() => {
    const now = Date.now();
    const dayKey = (value) => {
      const date = value ? new Date(value) : null;
      return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("sv-SE") : null;
    };
    const today = dayKey(new Date());
    const active = licenses.filter((lic) => String(lic.status || "active").toLowerCase() === "active");
    const permanent = active.filter((lic) => lic.license_type === "permanent" && !lic.is_trial);
    const expiring = active.filter((lic) => {
      const raw = lic.expires_at || lic.expiry_date;
      const time = raw ? new Date(raw).getTime() : NaN;
      return Number.isFinite(time) && time >= now && time - now <= 24 * 60 * 60 * 1000;
    });
    const seenToday = active.filter((lic) => dayKey(lic.last_seen) === today);
    const createdToday = licenses.filter((lic) => dayKey(lic.createdAt || lic.created_at || lic.deliveredAt) === today);
    const seenByDay = active.reduce((result, lic) => {
      const key = dayKey(lic.last_seen);
      if (key) result[key] = (result[key] || 0) + 1;
      return result;
    }, {});
    const busiest = Object.entries(seenByDay).sort((a, b) => b[1] - a[1])[0] || null;
    return { active, permanent, expiring, seenToday, createdToday, busiest };
  }, [licenses]);

  const copyKeyToClipboard = (keyText) => {
    if (!keyText) return;
    navigator.clipboard.writeText(keyText);
    setCopiedKey(keyText);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Helper formatting dates
  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return isoString;
    }
  };

  // Select Random Games for Offers (100, 200, 300, 400) - ESTRICTAMENTE SOLO LUA (sin fixes ni Denuvo)
  const selectRandomGames = (count) => {
    setIsAllGames(false);
    const luaOnlyGames = games.filter(g => {
      const isDenuvo = g.technical_category === "denuvo" || Boolean(g.isDenuvoActivation) || isVipGame(g);
      const hasFix = Boolean(g.fix_drive_id) || g.technical_category === "lua_fix" || g.technical_category === "bypass" || g.technical_category === "build_completa";
      return g.technical_category === "solo_lua" && !isDenuvo && !hasFix;
    });
    const candidateIds = luaOnlyGames.map(g => g.app_id || g.id);
    const shuffled = [...candidateIds].sort(() => 0.5 - Math.random());
    setSelectedGameIds(shuffled.slice(0, count));
  };

  useEffect(() => {
    fetchLicenses();
    fetchGames();
  }, []);

  // Fetch Licenses from Firestore
  const fetchLicenses = async () => {
    setLoadingLicenses(true);
    try {
      const snap = await getDocs(collection(db, "licenses"));
      const list = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      setLicenses(list);
    } catch (err) {
      console.error("Error al cargar licencias:", err);
    } finally {
      setLoadingLicenses(false);
    }
  };

  // Fetch Games from Firestore & Ryuu Global Catalog & VIP Denuvo Catalog
  const fetchGames = async () => {
    setLoadingGames(true);
    try {
      const [snap, prodSnap] = await Promise.all([
        getDocs(collection(db, "games")),
        getDocs(collection(db, "products"))
      ]);

      const denuvoNamesSet = new Set();
      prodSnap.forEach(d => {
        const data = d.data();
        if (data.isDenuvoActivation || (Array.isArray(data.tags) && data.tags.includes("Denuvo"))) {
          if (data.name) denuvoNamesSet.add(data.name.toLowerCase().replace(/[^a-z0-9]/g, ''));
        }
      });

      const list = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...d.data() };
        const appIdStr = String(item.app_id || item.id || "");
        if (KNOWN_GAME_NAMES[appIdStr] && (!item.name || item.name.trim() === "" || item.name === appIdStr || item.name.toLowerCase().includes("sin nombre") || appIdStr === "1548510")) {
          item.name = KNOWN_GAME_NAMES[appIdStr];
        }
        if (appIdStr === "1548510") {
          item.name = "Crash Bandicoot™ 4: It's About Time";
        }
        const cleanName = (item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (denuvoNamesSet.has(cleanName) || item.technical_category === "denuvo" || item.isDenuvoActivation) {
          item.technical_category = "denuvo";
          item.isDenuvoActivation = true;
        }
        list.push(item);
      });

      let ryuuMap = new Map();
      try {
        const NON_BASE_KEYWORDS = [
          'soundtrack', 'ost', 'artbook', 'dlc', 'expansion pack', 'bonus content',
          'wallpaper', 'demo', 'playtest', 'dedicated server', 'sdk', 'mod kit', 'add-on',
          'season pass', 'content pack', 'upgrade pack', 'cosmetic', 'skin pack',
          'supporter pack', 'sound track', 'digital artbook', 'original score', 'pre-order bonus',
          'multiplayer', 'multi-player', 'mod tools', 'zombies'
        ];

        let ryuuData = await getCachedSteamCatalog();
        const fixesPromise = fetch("https://generator.ryuu.lol/files/fixes.json").catch(() => null);
        let ryuuPromise = null;
        if (!ryuuData) {
          ryuuPromise = fetch("https://generator.ryuu.lol/files/games.json").catch(() => null);
        }

        const [ryuuRes, fixesRes] = await Promise.all([ryuuPromise, fixesPromise]);

        let fixesMap = new Map();
        if (fixesRes && fixesRes.ok) {
          const fixesData = await fixesRes.json();
          fixesData.forEach(item => {
            if (item.appid && item.fixes && item.fixes.length > 0) {
              fixesMap.set(String(item.appid), item.fixes);
            }
          });
        }

        if (!ryuuData && ryuuRes && ryuuRes.ok) {
          ryuuData = await ryuuRes.json();
          await setCachedSteamCatalog(ryuuData);
        }

        if (ryuuData && Array.isArray(ryuuData)) {
          ryuuData.forEach(r => {
            if (r.appid) ryuuMap.set(String(r.appid), r);
          });
        }

        if (ryuuData && Array.isArray(ryuuData)) {
          const existingIds = new Set(list.map(g => String(g.app_id || g.id)));

          ryuuData.forEach(r => {
            const appIdStr = String(r.appid);
            const rType = (r.type || '').toLowerCase();
            const rName = (r.name || '').toLowerCase();

            // REGLA ESTRICTA: Solo juegos base (no DLCs, no soundtracks, no demos) y EXCLUIR juegos 100% online/servidor obligatorio
            const isBase = rType === 'game' && !NON_BASE_KEYWORDS.some(kw => rName.includes(kw)) && !isOnlineOnlyAppId(appIdStr);
            if (!isBase) return;

            if (!existingIds.has(appIdStr)) {
              // Determinar categoría técnica con los datos de fixes de Ryuu
              const ryfixes = fixesMap.get(appIdStr);
              let techCategory = "solo_lua";
              let fixDownloadUrl = "";

              if (ryfixes && ryfixes.length > 0) {
                // Seleccionar estrictamente el fix más actual
                const primaryFix = ryfixes[0];
                fixDownloadUrl = `https://generator.ryuu.lol/fixes/${primaryFix.filename}?auth_code=RYUUMANIFEST1uypp1`;
                
                const badges = (primaryFix.badges || []).map(b => b.toLowerCase());
                if (badges.includes("bypass") || rName.includes("bypass")) {
                  techCategory = "bypass";
                } else if (badges.includes("build") || rName.includes("build")) {
                  techCategory = "build_completa";
                } else {
                  techCategory = "lua_fix";
                }
              }

              const cleanRName = rName.replace(/[^a-z0-9]/g, '');
              if (denuvoNamesSet.has(cleanRName)) {
                techCategory = "denuvo";
              }

              let gameDisplayName = r.name;
              if (KNOWN_GAME_NAMES[appIdStr]) {
                gameDisplayName = KNOWN_GAME_NAMES[appIdStr];
              }

              const dlcEntries = (r.dlc && typeof r.dlc === 'object') ? Object.entries(r.dlc) : [];
              const dlcsList = dlcEntries.map(([did, dinfo]) => parseDlcInfo(did, dinfo));
              const dlcKeys = dlcsList.map(d => d.dlc_app_id);

              list.push({
                id: appIdStr,
                app_id: appIdStr,
                name: gameDisplayName,
                steam_folder_name: gameDisplayName,
                category: r.tags?.[0] || "Steam",
                header_image: r.header_image,
                technical_category: techCategory,
                fix_drive_id: fixDownloadUrl,
                ryuu_manifest_api: `https://generator.ryuu.lol/secure_download?appid=${appIdStr}&auth_code=RYUUMANIFEST1uypp1`,
                ryuu_lua_api: `https://generator.ryuu.lol/resellerlua?appid=${appIdStr}&auth_code=RYUUMANIFEST1uypp1`,
                dlcsCount: dlcsList.length,
                dlcIds: dlcKeys,
                dlcs: dlcsList,
                hasDlcs: dlcsList.length > 0
              });
              existingIds.add(appIdStr);
            }
          });
        }

        // Integrar todos los juegos curados de steam_import_data.json
        if (Array.isArray(steamImportData)) {
          const existingIds = new Set(list.map(g => String(g.app_id || g.id)));
          steamImportData.forEach(s => {
            const appIdStr = String(s.app_id || s.id || "");
            if (!appIdStr) return;
            if (!existingIds.has(appIdStr)) {
              const rGame = ryuuMap.get(appIdStr);
              const dlcEntries = (rGame && rGame.dlc && typeof rGame.dlc === 'object') ? Object.entries(rGame.dlc) : [];
              const dlcsList = dlcEntries.map(([did, dinfo]) => parseDlcInfo(did, dinfo));
              const dlcKeys = dlcsList.map(d => d.dlc_app_id);
              list.push({
                id: appIdStr,
                app_id: appIdStr,
                name: (s.name || '').replace(/\s*\((?:requiere\s*fix|requiere\s*parche|fix|parche)\)/gi, '').trim(),
                steam_folder_name: s.name,
                category: s.genero || "Steam",
                header_image: s.imageUrl || s.image || `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appIdStr}/header.jpg`,
                technical_category: "solo_lua",
                dlcsCount: dlcsList.length,
                dlcIds: dlcKeys,
                dlcs: dlcsList,
                hasDlcs: dlcsList.length > 0
              });
              existingIds.add(appIdStr);
            }
          });
        }
      } catch (e) {
        console.error("Error al cargar catálogo global y fixes de Ryuu:", e);
      }

      // Asegurar que juegos emblemáticos de saga (Call of Duty) estén siempre disponibles
      FALLBACK_COD_GAMES.forEach(cod => {
        if (!list.some(g => String(g.app_id || g.id) === cod.app_id)) {
          list.push({ ...cod });
        }
      });

      // Integrar y asegurar todos los 100 juegos VIP Denuvo (86 Steam, 7 Ubisoft, 7 EA)
      if (Array.isArray(vipGamesData)) {
        vipGamesData.forEach(v => {
          const appIdStr = String(v.app_id || v.id);
          const cleanVipName = (v.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const existing = list.find(g => {
            const gAppId = String(g.app_id || g.id || "");
            if (gAppId && gAppId === appIdStr) return true;
            const gClean = (g.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            if (cleanVipName && cleanVipName.length > 8 && gClean && gClean.length > 8 && gClean === cleanVipName) {
              return true;
            }
            return false;
          });

          if (existing) {
            existing.technical_category = "denuvo";
            existing.isDenuvoActivation = true;
            existing.vip_platform = v.platform || "Steam";
            existing.platform = v.platform || existing.platform;
            existing.category = v.platform ? `${v.platform} VIP` : "Denuvo";
            existing.vip_app_id = v.app_id;
            if (v.priceCLP) existing.priceCLP = v.priceCLP;
            if (v.name && (!existing.name || existing.name === appIdStr || existing.name.toLowerCase().includes("sin nombre"))) {
              existing.name = v.name;
            }
            if (v.imageUrl && !existing.header_image) {
              existing.header_image = v.imageUrl;
            }
          } else {
            list.push({
              id: appIdStr,
              app_id: appIdStr,
              vip_app_id: v.app_id,
              name: v.name,
              steam_folder_name: v.name,
              category: v.platform ? `${v.platform} VIP` : "Denuvo",
              header_image: v.imageUrl,
              technical_category: "denuvo",
              isDenuvoActivation: true,
              vip_platform: v.platform || "Steam",
              platform: v.platform,
              priceCLP: v.priceCLP || 8000
            });
          }
        });
      }

      // Asegurar expresamente que FC 26 y FC 27 (tanto versión EA Play VIP como Steam) estén presentes e inmutables
      const MANDATORY_FC_GAMES = [
        {
          id: "16425677",
          app_id: "16425677",
          vip_app_id: "16425677",
          name: "EA SPORTS FC 26 (EA Play VIP / FIFA 26)",
          steam_folder_name: "EA SPORTS FC 26",
          category: "EA VIP",
          header_image: "https://cdn.akamai.steamstatic.com/steam/apps/16425677/header.jpg",
          technical_category: "denuvo",
          isDenuvoActivation: true,
          vip_platform: "EA",
          platform: "EA",
          priceCLP: 15000
        },
        {
          id: "16425884",
          app_id: "16425884",
          vip_app_id: "16425884",
          name: "EA SPORTS FC 27 (EA Play VIP / FIFA 27)",
          steam_folder_name: "EA SPORTS FC 27",
          category: "EA VIP",
          header_image: "https://cdn.akamai.steamstatic.com/steam/apps/16425884/header.jpg",
          technical_category: "denuvo",
          isDenuvoActivation: true,
          vip_platform: "EA",
          platform: "EA",
          priceCLP: 17000
        },
        {
          id: "3405690",
          app_id: "3405690",
          vip_app_id: "3405690",
          name: "EA SPORTS FC™ 26 (Steam / FIFA 26)",
          steam_folder_name: "EA SPORTS FC 26",
          category: "EA VIP",
          header_image: "https://cdn.akamai.steamstatic.com/steam/apps/3405690/header.jpg",
          technical_category: "denuvo",
          isDenuvoActivation: true,
          vip_platform: "EA",
          platform: "Steam",
          priceCLP: 15000
        },
        {
          id: "4080220",
          app_id: "4080220",
          vip_app_id: "4080220",
          name: "EA SPORTS FC™ 27 (Steam / FIFA 27)",
          steam_folder_name: "EA SPORTS FC 27",
          category: "EA VIP",
          header_image: "https://cdn.akamai.steamstatic.com/steam/apps/4080220/header.jpg",
          technical_category: "denuvo",
          isDenuvoActivation: true,
          vip_platform: "EA",
          platform: "Steam",
          priceCLP: 17000
        }
      ];

      MANDATORY_FC_GAMES.forEach(fc => {
        const found = list.find(g => String(g.app_id || g.id) === fc.app_id);
        if (found) {
          found.name = fc.name;
          found.technical_category = "denuvo";
          found.isDenuvoActivation = true;
          found.vip_platform = "EA";
          found.platform = fc.platform;
          found.category = "EA VIP";
          found.priceCLP = fc.priceCLP;
        } else {
          list.push({ ...fc });
        }
      });

      // Re-verificación de nombres, limpieza de sufijos "+ DLC" y vinculación universal de DLCs
      const NON_BASE_ITEM_REGEX = /\b(?:soundtrack|ost|original score|original soundtrack|digital artbook|artbook|demo|playtest|dedicated server|sdk|mod kit|content pack|skin pack|cosmetic pack|expansion pass|season pass|supporter pack)\b/i;

      list.forEach(item => {
        const aId = String(item.app_id || item.id || "").trim();
        if (aId === "1548510") {
          item.name = "Crash Bandicoot™ 4: It's About Time";
        } else if (KNOWN_GAME_NAMES[aId] && (!item.name || item.name.trim() === "" || item.name === aId || item.name.toLowerCase().includes("sin nombre"))) {
          item.name = KNOWN_GAME_NAMES[aId];
        }

        // LIMPIEZA RIGUROSA DE NOMBRE BASE: Quitar sufijos "+ DLC", "+ Aigis DLC", "(DLC)", etc.
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

        // VINCULACIÓN UNIVERSAL DE DLCS DESDE RYUU PARA TODOS LOS JUEGOS (Ready or Not, Firestore, VIP, etc.)
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
        } else if (!item.dlcs) {
          item.dlcs = [];
        }
      });

      // EXCLUSIÓN ESTRICTA DE ELEMENTOS QUE NO SON JUEGOS BASE (Betas, Multiplayer Standalone, Soundtracks, Demos, Artbooks, Tools, Servers)
      const COD_MP_APPIDS = new Set(["10190", "42690", "42710", "202990", "209170", "209660", "393100", "47830", "476620"]);
      const BETA_AND_MP_REGEX = /\b(?:open beta|closed beta|beta test|stress test|technical test|playtest|server test|pre-alpha|closed alpha|open alpha|alpha test)\b|(-\s*multiplayer|\(multiplayer\)|\bmultiplayer\s*$|\bbeta\b)/i;

      const baseOnlyList = list.filter(item => {
        const aId = String(item.app_id || item.id || "").trim();
        const name = (item.name || "").toLowerCase();
        const folder = (item.steam_folder_name || "").toLowerCase();

        // Excluir Call of Duty Multiplayers sueltos
        if (COD_MP_APPIDS.has(aId)) return false;

        // Excluir Betas, Playtests, Open Betas y Multiplayer standalone
        if (BETA_AND_MP_REGEX.test(name) || BETA_AND_MP_REGEX.test(folder)) return false;

        // Excepciones legítimas que tienen palabras como ghost, postal, osteya, wallpaper
        if (name === "wallpaper engine" || name.includes("ghost") || name.includes("postal") || name.includes("lost planet") || name.includes("frostpunk") || name.includes("ostfront") || name.includes("osteya")) {
          return true;
        }
        if (NON_BASE_ITEM_REGEX.test(name) || NON_BASE_ITEM_REGEX.test(folder)) {
          return false;
        }
        return true;
      });

      baseOnlyList.forEach(item => {
        const raw = `${item.name || ''} ${item.app_id || item.id || ''} ${item.steam_folder_name || ''}`.toLowerCase();
        const clean = raw.replace(/[^a-z0-9]/g, '');
        let aliases = "";
        if (raw.includes("ea sports fc") || raw.includes("fc 2") || clean.includes("fc2") || clean.includes("fifa")) {
          aliases += " fifa fifa 24 fifa 25 fifa 26 fifa 27 fifa24 fifa25 fifa26 fifa27 fc24 fc25 fc26 fc27 ea fc ea sports fútbol soccer";
        }
        item._search = `${raw} ${clean} ${aliases}`.trim();
      });

      // DEDUPLICACIÓN ESTRICTA: Eliminar duplicados por AppID y por Nombre Normalizado
      const seenAppIds = new Set();
      const seenCleanNames = new Map();
      const deduplicated = [];

      baseOnlyList.forEach(item => {
        const aId = String(item.app_id || item.id || "").trim();
        const cleanName = (item.name || "").toLowerCase().replace(/[^a-z0-9]/g, '');

        if (!aId && !cleanName) return;

        // Si ya vimos este AppID exacto, ignorar duplicado pero traspasar DLCs o fix si los tiene
        if (aId && seenAppIds.has(aId)) {
          const existingItem = deduplicated.find(g => String(g.app_id || g.id) === aId);
          if (existingItem) {
            if (!existingItem.fix_drive_id && item.fix_drive_id) {
              existingItem.fix_drive_id = item.fix_drive_id;
              existingItem.technical_category = item.technical_category;
            }
            if ((!existingItem.dlcsCount || existingItem.dlcsCount === 0) && item.dlcsCount > 0) {
              existingItem.dlcsCount = item.dlcsCount;
              existingItem.dlcIds = item.dlcIds;
              existingItem.dlcs = item.dlcs;
              existingItem.hasDlcs = true;
            }
            if (item.vip_platform) {
              existingItem.vip_platform = item.vip_platform;
              existingItem.platform = item.platform || item.vip_platform;
            }
            if (item.technical_category === "denuvo" || item.isDenuvoActivation) {
              existingItem.technical_category = "denuvo";
              existingItem.isDenuvoActivation = true;
            }
            if (item.category && item.category.includes("VIP")) {
              existingItem.category = item.category;
            }
            if (item.vip_app_id) {
              existingItem.vip_app_id = item.vip_app_id;
            }
            if (item.priceCLP) {
              existingItem.priceCLP = item.priceCLP;
            }
          }
          return;
        }

        // Si ya vimos este nombre idéntico (ej: "readyornot")
        const isMandatoryFc = aId === "16425677" || aId === "16425884" || aId === "3405690" || aId === "4080220";
        if (!isMandatoryFc && cleanName && seenCleanNames.has(cleanName)) {
          const existingIdx = seenCleanNames.get(cleanName);
          const existingItem = deduplicated[existingIdx];
          if (!existingItem.fix_drive_id && item.fix_drive_id) {
            existingItem.fix_drive_id = item.fix_drive_id;
            existingItem.technical_category = item.technical_category;
          }
          if ((!existingItem.dlcsCount || existingItem.dlcsCount === 0) && item.dlcsCount > 0) {
            existingItem.dlcsCount = item.dlcsCount;
            existingItem.dlcIds = item.dlcIds;
            existingItem.dlcs = item.dlcs;
            existingItem.hasDlcs = item.hasDlcs;
          }
          if (!existingItem.header_image && item.header_image) {
            existingItem.header_image = item.header_image;
          }
          if (item.vip_platform) {
            existingItem.vip_platform = item.vip_platform;
            existingItem.platform = item.platform || item.vip_platform;
          }
          if (item.technical_category === "denuvo" || item.isDenuvoActivation) {
            existingItem.technical_category = "denuvo";
            existingItem.isDenuvoActivation = true;
          }
          if (item.category && item.category.includes("VIP")) {
            existingItem.category = item.category;
          }
          if (item.vip_app_id) {
            existingItem.vip_app_id = item.vip_app_id;
          }
          if (item.priceCLP) {
            existingItem.priceCLP = item.priceCLP;
          }
          return;
        }

        if (aId) seenAppIds.add(aId);
        if (cleanName && cleanName.length > 3) {
          seenCleanNames.set(cleanName, deduplicated.length);
        }
        deduplicated.push(item);
      });

      deduplicated.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setGames(deduplicated);
    } catch (err) {
      console.error("Error al cargar juegos:", err);
    } finally {
      setLoadingGames(false);
    }
  };

  // Generar correo único y aleatorio para identificar al cliente (sin repetirse nunca)
  const generateUniqueRandomEmail = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    const adjectives = ["gamer", "panda", "pro", "master", "shadow", "cyber", "ultra", "hyper", "turbo", "nexus", "titan", "player"];
    const existingEmails = new Set(licenses.map(l => (l.client_email || "").toLowerCase().trim()));

    let generatedEmail = "";
    let attempts = 0;

    while (attempts < 100) {
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      let randomCode = "";
      for (let i = 0; i < 5; i++) {
        randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const timestampSuffix = Date.now().toString(36).slice(-3); // Único por milisegundo
      const candidate = `cliente.${adj}.${randomCode}${timestampSuffix}@pandastore.cl`.toLowerCase();

      if (!existingEmails.has(candidate)) {
        generatedEmail = candidate;
        break;
      }
      attempts++;
    }

    if (!generatedEmail) {
      generatedEmail = `cliente.${Date.now()}@pandastore.cl`;
    }

    setNewEmail(generatedEmail);
  };

  // Generate random Key PANDA-XXXX-YYYY
  const generateRandomKey = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let part1 = "";
    let part2 = "";
    for (let i = 0; i < 4; i++) {
      part1 += chars.charAt(Math.floor(Math.random() * chars.length));
      part2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewKey(`PANDA-${part1}-${part2}`);
  };

  const openCreateLicense = () => {
    setEditingLicense(null);
    setFormError("");
    setNewLicenseType("permanent");
    setNewExpiryDate("");
    setNewStatus("active");
    setNewHwid("");
    setIsTrial(false);
    setTrialMinutes(15);
    setIsAllGames(false);
    setSelectedGameIds([]);
    setSelectedDlcIds([]);
    setPickerSearch("");
    setPickerVisibleLimit(40);
    setExpandedDlcGameId(null);
    setDlcSearch("");
    generateRandomKey();
    generateUniqueRandomEmail();
    setShowLicenseModal(true);
  };

  // Crear Clave Rápida de Prueba (15 min)
  const openCreateTrialLicense = () => {
    setEditingLicense(null);
    setFormError("");
    setNewLicenseType("trial");
    setNewExpiryDate("");
    setNewStatus("active");
    setNewHwid("");
    setIsTrial(true);
    setTrialMinutes(15);
    setIsAllGames(true); // Por defecto todas o las que elija
    setSelectedGameIds([]);
    setSelectedDlcIds([]);
    setPickerSearch("");
    setPickerVisibleLimit(40);
    setExpandedDlcGameId(null);
    setDlcSearch("");
    generateRandomKey();
    generateUniqueRandomEmail();
    setShowLicenseModal(true);
  };

  const openEditLicense = (lic) => {
    setEditingLicense(lic);
    setFormError("");
    setNewKey(lic.key || lic.id);
    setNewEmail(lic.client_email || "");
    setNewLicenseType(lic.license_type || (lic.is_trial ? "trial" : "permanent"));
    setNewExpiryDate(lic.expiry_date || "");
    setNewStatus(lic.status || "active");
    setNewHwid(lic.hwid || "");
    setIsTrial(Boolean(lic.is_trial));
    setTrialMinutes(lic.trial_minutes || 15);
    setPickerSearch("");
    setPickerVisibleLimit(40);
    setExpandedDlcGameId(null);
    setDlcSearch("");

    const hasAll = lic.allowed_games?.includes("*");
    setIsAllGames(Boolean(hasAll));

    if (hasAll) {
      setSelectedGameIds([]);
    } else {
      const rawAllowed = Array.isArray(lic.allowed_games) ? lic.allowed_games : [];
      const resolvedIds = new Set();

      rawAllowed.forEach(item => {
        if (!item) return;
        const strItem = String(item).trim();
        if (strItem === "*") return;

        // 1. Coincidencia directa por app_id o id
        const directMatch = games.find(g => String(g.app_id || g.id) === strItem || String(g.id) === strItem);
        if (directMatch) {
          resolvedIds.add(String(directMatch.app_id || directMatch.id));
          return;
        }

        // 2. Coincidencia por nombre (normalizado)
        const normItem = strItem.toLowerCase().replace(/[^a-z0-9]/g, '');
        const nameMatch = games.find(g => {
          const gNorm = (g.name || "").toLowerCase().replace(/[^a-z0-9]/g, '');
          const gFolderNorm = (g.steam_folder_name || "").toLowerCase().replace(/[^a-z0-9]/g, '');
          return (gNorm && gNorm === normItem) || (gFolderNorm && gFolderNorm === normItem);
        });

        if (nameMatch) {
          resolvedIds.add(String(nameMatch.app_id || nameMatch.id));
          return;
        }

        // 3. Si es un pack con '+' (ej: "Pack VIP (DAYZ + Battlefield 1 + Monster Hunter)")
        if (strItem.includes("+")) {
          const subNames = strItem.replace(/^[^(]*\(/, '').replace(/\)[^)]*$/, '').split("+").map(s => s.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
          subNames.forEach(sub => {
            if (!sub || sub.length < 3) return;
            const subMatch = games.find(g => {
              const gNorm = (g.name || "").toLowerCase().replace(/[^a-z0-9]/g, '');
              return gNorm.includes(sub) || sub.includes(gNorm);
            });
            if (subMatch) {
              resolvedIds.add(String(subMatch.app_id || subMatch.id));
            }
          });
          return;
        }

        // 4. Si no se pudo mapear numéricamente, conservar el string original
        resolvedIds.add(strItem);
      });

      setSelectedGameIds(Array.from(resolvedIds));
    }

    setSelectedDlcIds(Array.isArray(lic.allowed_dlcs) ? lic.allowed_dlcs.map(String) : []);
    setShowLicenseModal(true);
  };

  // Upgrade a Trial key to Permanent (Pago confirmado por cliente)
  const handleUpgradeToPermanent = async (lic) => {
    if (window.confirm(`¿Confirmar pago y hacer PERMANENTE la licencia ${lic.key}?\n\nCliente: ${lic.client_email}\nSe removerá el temporizador de prueba y el cliente conservará sus juegos para siempre.`)) {
      try {
        await updateDoc(doc(db, "licenses", lic.id), {
          is_trial: false,
          license_type: "permanent",
          status: "active",
          trial_upgraded_at: new Date().toISOString()
        });
        alert(`¡Éxito! La clave ${lic.key} ahora es PERMANENTE.`);
        fetchLicenses();
      } catch (err) {
        alert(`Error al actualizar a permanente: ${err.message}`);
      }
    }
  };

  // Remote Purge & Revoke: Inmediatamente purga los archivos de Steam en el PC del cliente
  const handleRemotePurge = async (lic) => {
    const licKey = lic.key || lic.id;
    if (window.confirm(`⚠️ ¿BLOQUEAR Y PURGAR PC DE CLIENTE (${licKey})?\n\nAcción: El Launcher PandaStore en el computador del cliente borrará automáticamente todos los archivos .LUA, appmanifests y juegos inyectados de Steam, y cerrará su sesión.\n\n¿Deseas continuar?`)) {
      try {
        await updateDoc(doc(db, "licenses", lic.id), {
          status: "revoked",
          revoked_at: new Date().toISOString(),
          revocation_reason: "Bloqueado por administrador (Prueba no pagada o violación de términos)"
        });
        alert(`🚫 Clave ${licKey} revocada. En cuanto el cliente o el launcher haga contacto, Steam será purgado automáticamente.`);
        fetchLicenses();
      } catch (err) {
        alert(`Error al revocar y purgar: ${err.message}`);
      }
    }
  };

  // Save License (Create / Edit)
  const handleSaveLicense = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!newKey.trim()) {
      setFormError("Debes especificar o generar una Clave de Licencia.");
      return;
    }
    if (!newEmail.trim()) {
      setFormError("Debes especificar el correo del cliente.");
      return;
    }
    if (newLicenseType === "monthly" && !newExpiryDate) {
      setFormError("Para suscripciones mensuales, debes ingresar la fecha de vencimiento.");
      return;
    }
    if (!isAllGames && selectedGameIds.length === 0) {
      setFormError("Debes seleccionar al menos 1 juego o marcar 'Acceso a Todos los Juegos'.");
      return;
    }

    try {
      const allowedArr = isAllGames ? ["*"] : selectedGameIds;
      const nowStr = new Date().toISOString();
      const finalHwid = newHwid.trim() ? newHwid.trim() : null;
      const licenseData = {
        key: newKey.trim(),
        client_email: newEmail.trim(),
        license_type: isTrial ? "trial" : newLicenseType,
        is_trial: Boolean(isTrial),
        trial_minutes: Number(trialMinutes) || 15,
        expiry_date: newLicenseType === "monthly" ? newExpiryDate : null,
        hwid: finalHwid,
        status: newStatus,
        allowed_games: allowedArr,
        allowed_dlcs: selectedDlcIds,
        createdAt: editingLicense ? (editingLicense.createdAt || nowStr) : nowStr,
        deliveredAt: editingLicense ? (editingLicense.deliveredAt || nowStr) : nowStr,
        activatedAt: editingLicense ? (editingLicense.activatedAt || (finalHwid ? nowStr : null)) : (finalHwid ? nowStr : null),
        last_seen: editingLicense ? (editingLicense.last_seen || null) : null,
        updatedAt: nowStr
      };

      await setDoc(doc(db, "licenses", newKey.trim()), licenseData, { merge: true });
      setShowLicenseModal(false);
      setEditingLicense(null);
      setNewKey("");
      setNewEmail("");
      setNewLicenseType("permanent");
      setNewExpiryDate("");
      setNewStatus("active");
      setNewHwid("");
      setIsTrial(false);
      setTrialMinutes(15);
      setIsAllGames(false);
      setSelectedGameIds([]);
      setSelectedDlcIds([]);
      setPickerSearch("");
      fetchLicenses();
    } catch (err) {
      setFormError(`Error al guardar licencia: ${err.message}`);
    }
  };

  const toggleSelectGame = (appId) => {
    const idStr = String(appId);
    const g = games.find(game => String(game.app_id || game.id) === idStr);
    const gName = g?.name || "";
    const gNorm = gName.toLowerCase().replace(/[^a-z0-9]/g, '');

    const isCurrentlySelected = selectedGameIds.some(sel => {
      const s = String(sel);
      if (s === idStr) return true;
      if (g && (s === String(g.id) || s === String(g.app_id))) return true;
      if (gNorm && s.toLowerCase().replace(/[^a-z0-9]/g, '') === gNorm) return true;
      return false;
    });

    if (isCurrentlySelected) {
      setSelectedGameIds(prev => prev.filter(sel => {
        const s = String(sel);
        if (s === idStr) return false;
        if (g && (s === String(g.id) || s === String(g.app_id))) return false;
        if (gNorm && s.toLowerCase().replace(/[^a-z0-9]/g, '') === gNorm) return false;
        return true;
      }));
      if (g && Array.isArray(g.dlcIds)) {
        const dlcSet = new Set(g.dlcIds.map(String));
        setSelectedDlcIds(prev => prev.filter(id => String(id) !== idStr && !dlcSet.has(String(id))));
      }
    } else {
      setSelectedGameIds(prev => [...prev, idStr]);
    }
  };

  const toggleGameWithAllDlcs = (appId, dlcIds = []) => {
    const idStr = String(appId);
    const dlcStrList = dlcIds.map(String);
    const currentDlcs = selectedDlcIds.map(String);
    const hasAll = dlcStrList.length > 0 && dlcStrList.every(d => currentDlcs.includes(d));

    if (hasAll) {
      // Si ya tiene todos, pasar a Solo Base
      const removeSet = new Set([idStr, ...dlcStrList]);
      setSelectedDlcIds(prev => prev.filter(id => !removeSet.has(String(id))));
    } else {
      // Activar todos los DLCs y asegurar juego base seleccionado
      if (!selectedGameIds.includes(idStr)) {
        setSelectedGameIds(prev => [...prev, idStr]);
      }
      const combined = new Set([...currentDlcs, idStr, ...dlcStrList]);
      setSelectedDlcIds(Array.from(combined));
    }
  };

  const setGameBaseOnly = (appId, dlcIds = []) => {
    const idStr = String(appId);
    const dlcStrList = dlcIds.map(String);
    if (!selectedGameIds.includes(idStr)) {
      setSelectedGameIds(prev => [...prev, idStr]);
    }
    const removeSet = new Set([idStr, ...dlcStrList]);
    setSelectedDlcIds(prev => prev.filter(id => !removeSet.has(String(id))));
  };

  const toggleSpecificDlc = (appId, dlcId) => {
    const idStr = String(appId);
    const didStr = String(dlcId);
    if (!selectedGameIds.includes(idStr)) {
      setSelectedGameIds(prev => [...prev, idStr]);
    }

    setSelectedDlcIds(prev => {
      const prevStrs = prev.map(String);
      if (prevStrs.includes(didStr)) {
        return prevStrs.filter(id => id !== didStr);
      } else {
        return [...prevStrs, didStr];
      }
    });
  };

  const selectAllDlcsForGame = (appId, dlcIds = []) => {
    const idStr = String(appId);
    const dlcStrList = dlcIds.map(String);
    if (!selectedGameIds.includes(idStr)) {
      setSelectedGameIds(prev => [...prev, idStr]);
    }
    const combined = new Set([...selectedDlcIds.map(String), idStr, ...dlcStrList]);
    setSelectedDlcIds(Array.from(combined));
  };

  const clearDlcsForGame = (appId, dlcIds = []) => {
    const idStr = String(appId);
    const dlcStrList = dlcIds.map(String);
    const removeSet = new Set([idStr, ...dlcStrList]);
    setSelectedDlcIds(prev => prev.filter(id => !removeSet.has(String(id))));
  };

  const toggleSelectDlc = (appId) => {
    const g = games.find(game => String(game.app_id || game.id) === String(appId));
    toggleGameWithAllDlcs(appId, g?.dlcIds || []);
  };

  // Toggle License Status (active / suspended)
  const handleToggleStatus = async (lic) => {
    const nextStatus = (lic.status === "active") ? "suspended" : "active";
    try {
      await updateDoc(doc(db, "licenses", lic.id), { status: nextStatus });
      fetchLicenses();
    } catch (err) {
      alert(`Error al actualizar estado: ${err.message}`);
    }
  };

  // Reset HWID
  const handleResetHwid = async (lic) => {
    if (window.confirm(`¿Deseas desvincular el HWID de la licencia ${lic.key}? Esto permitirá al cliente iniciar sesión en otra PC.`)) {
      try {
        await updateDoc(doc(db, "licenses", lic.id), { hwid: null });
        fetchLicenses();
      } catch (err) {
        alert(`Error al resetear HWID: ${err.message}`);
      }
    }
  };

  // Quick Bind Known HWID
  const handleQuickBindKnownHwid = async (lic, hwidToBind) => {
    if (!window.confirm(`¿Vincular automáticamente la licencia ${lic.key} al computador conocido de ${lic.client_email}?\n\nHWID: ${hwidToBind}`)) return;
    try {
      const nowStr = new Date().toISOString();
      await updateDoc(doc(db, "licenses", lic.id), {
        hwid: hwidToBind,
        activatedAt: lic.activatedAt || nowStr,
        updatedAt: nowStr
      });
      fetchLicenses();
    } catch (err) {
      alert(`Error al vincular HWID: ${err.message}`);
    }
  };

  // Delete License
  const handleDeleteLicense = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar esta licencia definitivamente?")) {
      try {
        await deleteDoc(doc(db, "licenses", id));
        fetchLicenses();
      } catch (err) {
        alert(`Error al eliminar: ${err.message}`);
      }
    }
  };

  // Save Game (Create/Edit)
  const handleSaveGame = async (e) => {
    e.preventDefault();
    if (!gameAppId.trim()) {
      alert("Debes indicar el AppID de Steam.");
      return;
    }
    if (!gameName.trim()) {
      alert("Debes indicar el nombre del juego.");
      return;
    }

    try {
      const gameData = {
        app_id: gameAppId.trim(),
        name: gameName.trim(),
        steam_folder_name: gameFolderName.trim() || gameName.trim(),
        fix_drive_id: gameDriveId.trim(),
        lua_content: gameLuaContent,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "games", gameAppId.trim()), gameData, { merge: true });
      setShowGameModal(false);
      setEditingGame(null);
      resetGameForm();
      fetchGames();
    } catch (err) {
      alert(`Error al guardar juego: ${err.message}`);
    }
  };

  const openEditGame = (g) => {
    setEditingGame(g);
    setGameAppId(g.app_id || g.id);
    setGameName(g.name || "");
    setGameFolderName(g.steam_folder_name || "");
    setGameDriveId(g.fix_drive_id || "");
    setGameLuaContent(g.lua_content || "");
    setShowGameModal(true);
  };

  const resetGameForm = () => {
    setGameAppId("");
    setGameName("");
    setGameFolderName("");
    setGameDriveId("");
    setGameLuaContent("");
    setEditingGame(null);
  };

  const handleDeleteGame = async (id) => {
    if (window.confirm("¿Deseas eliminar la configuración de este juego?")) {
      try {
        await deleteDoc(doc(db, "games", id));
        fetchGames();
      } catch (err) {
        alert(`Error al eliminar juego: ${err.message}`);
      }
    }
  };

  // Filtered and sorted licenses list
  const hwidCounts = React.useMemo(() => {
    const map = new Map();
    licenses.forEach(l => {
      if (l.hwid) {
        map.set(l.hwid, (map.get(l.hwid) || 0) + 1);
      }
    });
    return map;
  }, [licenses]);

  // Mapeo de emails a HWIDs ya conocidos (para poder vincular con 1 click)
  const clientKnownHwids = useMemo(() => {
    const map = {};
    licenses.forEach(l => {
      const email = (l.client_email || "").toLowerCase().trim();
      if (email && l.hwid) {
        if (!map[email]) map[email] = [];
        if (!map[email].includes(l.hwid)) map[email].push(l.hwid);
      }
    });
    return map;
  }, [licenses]);

  const filteredLicenses = useMemo(() => {
    const q = searchLicense.toLowerCase().trim();
    return licenses
      .filter((l) => {
        if (q) {
          const matchesSearch =
            (l.key || "").toLowerCase().includes(q) ||
            (l.client_email || "").toLowerCase().includes(q) ||
            (l.hwid || "").toLowerCase().includes(q);
          if (!matchesSearch) return false;
        }

        if (statusFilter === "active") return l.status === "active";
        if (statusFilter === "revoked") return l.status === "revoked";
        if (statusFilter === "bound") return Boolean(l.hwid);
        if (statusFilter === "pending_pc") return !l.hwid && Boolean(l.client_email || l.orderId);
        if (statusFilter === "stock_free") return !l.hwid && !l.client_email && !l.orderId;
        if (statusFilter === "unbound") return !l.hwid;
        if (statusFilter === "duplicate_hwid") return Boolean(l.hwid && (hwidCounts.get(l.hwid) || 0) > 1);
        if (statusFilter === "all_games") return l.allowed_games?.includes("*");
        return true; // 'all'
      })
      .sort((a, b) => {
        if (dateSort === "newest") {
          const dateA = new Date(a.deliveredAt || a.createdAt || 0).getTime();
          const dateB = new Date(b.deliveredAt || b.createdAt || 0).getTime();
          return dateB - dateA;
        }
        if (dateSort === "oldest") {
          const dateA = new Date(a.deliveredAt || a.createdAt || 0).getTime();
          const dateB = new Date(b.deliveredAt || b.createdAt || 0).getTime();
          return dateA - dateB;
        }
        if (dateSort === "activated_newest") {
          const dateA = a.activatedAt ? new Date(a.activatedAt).getTime() : 0;
          const dateB = b.activatedAt ? new Date(b.activatedAt).getTime() : 0;
          return dateB - dateA;
        }
        if (dateSort === "client_az") {
          const emailA = (a.client_email || "").toLowerCase();
          const emailB = (b.client_email || "").toLowerCase();
          return emailA.localeCompare(emailB);
        }
        if (dateSort === "client_za") {
          const emailA = (a.client_email || "").toLowerCase();
          const emailB = (b.client_email || "").toLowerCase();
          return emailB.localeCompare(emailA);
        }
        if (dateSort === "hwid_grouped") {
          const hwidA = a.hwid || "ZZZZZZZZ";
          const hwidB = b.hwid || "ZZZZZZZZ";
          return hwidA.localeCompare(hwidB);
        }
        if (dateSort === "games_desc") {
          const countA = a.allowed_games?.includes("*") ? 999999 : (a.allowed_games?.length || 0);
          const countB = b.allowed_games?.includes("*") ? 999999 : (b.allowed_games?.length || 0);
          return countB - countA;
        }
        return 0;
      });
  }, [licenses, searchLicense, statusFilter, hwidCounts, dateSort]);

  // Agrupación por Computador / HWID (Detecta cuando 1 PC tiene 2 o más claves)
  const groupedByHwid = React.useMemo(() => {
    const map = new Map();
    filteredLicenses.forEach(lic => {
      const key = lic.hwid ? lic.hwid : "SIN_VINCULAR";
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(lic);
    });
    return Array.from(map.entries()).sort((a, b) => {
      // Poner primero los PCs que tienen 2 o más claves
      if (a[0] === "SIN_VINCULAR") return 1;
      if (b[0] === "SIN_VINCULAR") return -1;
      return b[1].length - a[1].length;
    });
  }, [filteredLicenses]);

  // Agrupación por Cliente (Detecta cuando 1 cliente tiene múltiples compras)
  const groupedByClient = React.useMemo(() => {
    const map = new Map();
    filteredLicenses.forEach(lic => {
      const email = (lic.client_email || "cliente_sin_correo").toLowerCase().trim();
      if (!map.has(email)) {
        map.set(email, []);
      }
      map.get(email).push(lic);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filteredLicenses]);

  const filteredGames = useMemo(() => {
    const query = searchGame.toLowerCase().trim();
    const cleanQ = query.replace(/[^a-z0-9]/g, "");
    const targetSaga = gameSagaFilter !== "all" ? SAGA_PRESETS.find(s => s.id === gameSagaFilter) : null;

    return games.filter((g) => {
      if (query) {
        const searchStr = (g._search || `${g.name || ''} ${g.steam_folder_name || ''} ${g.app_id || g.id || ''}`).toLowerCase();
        const matchesSearch =
          searchStr.includes(query) ||
          (cleanQ && searchStr.includes(cleanQ)) ||
          (g.name || "").toLowerCase().includes(query) ||
          (g.steam_folder_name || "").toLowerCase().includes(query) ||
          (g.app_id || g.id || "").includes(query);
        if (!matchesSearch) return false;
      }

      if (targetSaga && !matchesSaga(g, targetSaga)) return false;

      const cat = g.technical_category || "";
      const isUbisoftDenuvo = isUbisoftVipGame(g);
      const isEADenuvo = isEaVipGame(g);
      const isDenuvo = isUbisoftDenuvo || isEADenuvo || cat === "denuvo" || Boolean(g.isDenuvoActivation || (Array.isArray(g.tags) && g.tags.includes("Denuvo")));
      const isSteamDenuvo = isDenuvo && !isUbisoftDenuvo && !isEADenuvo;
      const isBypass = cat === "bypass" || (g.name || "").toLowerCase().includes("bypass");
      const isBuild = cat === "build_completa" || Boolean(g.is_build || g.build_url);
      const hasFix = Boolean(g.fix_drive_id || g.fix_download_url || g.has_fix) && !isBypass && !isBuild && !isDenuvo;
      const isLuaOnly = !hasFix && !isBypass && !isBuild && !isDenuvo;

      if (gameFilter === "denuvo") return isDenuvo;
      if (gameFilter === "denuvo_steam") return isSteamDenuvo;
      if (gameFilter === "denuvo_ubisoft") return isUbisoftDenuvo;
      if (gameFilter === "denuvo_ea") return isEADenuvo;
      if (gameFilter === "lua_only") return isLuaOnly;
      if (gameFilter === "with_fix") return hasFix;
      if (gameFilter === "bypass") return isBypass;
      if (gameFilter === "build_completa") return isBuild;

      return true; // 'all'
    });
  }, [games, searchGame, gameFilter, gameSagaFilter]);

  const gameCounts = useMemo(() => {
    let steamDenuvo = 0;
    let ubisoftDenuvo = 0;
    let eaDenuvo = 0;
    let bypass = 0;
    let builds = 0;
    let fix = 0;
    let withDlcs = 0;

    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      const cat = g.technical_category || "";
      const isUbi = isUbisoftVipGame(g);
      const isEA = isEaVipGame(g);
      const isDen = isUbi || isEA || cat === "denuvo" || Boolean(g.isDenuvoActivation || (Array.isArray(g.tags) && g.tags.includes("Denuvo")));
      if (isUbi) {
        ubisoftDenuvo++;
      } else if (isEA) {
        eaDenuvo++;
      } else if (isDen) {
        steamDenuvo++;
      } else if (cat === "bypass" || (g.name || "").toLowerCase().includes("bypass")) {
        bypass++;
      } else if (cat === "build_completa" || Boolean(g.is_build || g.build_url)) {
        builds++;
      } else if (Boolean(g.fix_drive_id || g.fix_download_url || g.has_fix)) {
        fix++;
      }

      if (g.hasDlcs) withDlcs++;
    }

    const denuvo = steamDenuvo + ubisoftDenuvo + eaDenuvo;
    const luaOnly = games.length - fix - bypass - builds - denuvo;
    const soloBase = games.length - withDlcs;

    return {
      countSteamDenuvo: steamDenuvo,
      countUbisoftDenuvo: ubisoftDenuvo,
      countEADenuvo: eaDenuvo,
      countDenuvo: denuvo,
      countBypass: bypass,
      countBuilds: builds,
      countFix: fix,
      countLuaOnly: luaOnly,
      countWithDlcs: withDlcs,
      countSoloBase: soloBase
    };
  }, [games]);

  const {
    countSteamDenuvo,
    countUbisoftDenuvo,
    countEADenuvo,
    countDenuvo,
    countBypass,
    countBuilds,
    countFix,
    countLuaOnly,
    countWithDlcs,
    countSoloBase
  } = gameCounts;

  const sagaCounts = useMemo(() => {
    const map = {};
    SAGA_PRESETS.forEach(s => {
      map[s.id] = 0;
    });
    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      for (let j = 0; j < SAGA_PRESETS.length; j++) {
        const s = SAGA_PRESETS[j];
        if (matchesSaga(g, s)) {
          map[s.id]++;
        }
      }
    }
    return map;
  }, [games]);

  const licenseFilterCounts = useMemo(() => {
    let bound = 0;
    let unbound = 0;
    let pendingPc = 0;
    let stockFree = 0;
    let dupHwid = 0;
    let allGames = 0;
    let active = 0;
    let revoked = 0;

    for (let i = 0; i < licenses.length; i++) {
      const l = licenses[i];
      if (l.hwid) {
        bound++;
        if ((hwidCounts.get(l.hwid) || 0) > 1) dupHwid++;
      } else {
        unbound++;
        if (l.client_email || l.orderId) pendingPc++;
        else stockFree++;
      }
      if (l.allowed_games?.includes("*")) allGames++;
      if (l.status === 'active') active++;
      if (l.status === 'revoked') revoked++;
    }

    return { bound, unbound, pendingPc, stockFree, dupHwid, allGames, active, revoked };
  }, [licenses, hwidCounts]);

  const duplicateHwidCount = useMemo(() => {
    return groupedByHwid.filter(g => g[0] !== 'SIN_VINCULAR' && g[1].length > 1).length;
  }, [groupedByHwid]);

  const filteredPickerGames = useMemo(() => {
    const query = (pickerSearch || "").toLowerCase().trim();
    const cleanQ = query.replace(/[^a-z0-9]/g, "");
    const targetSaga = pickerSagaFilter !== "all" ? SAGA_PRESETS.find(s => s.id === pickerSagaFilter) : null;

    return games.filter(g => {
      if (query) {
        const searchStr = (g._search || `${g.name || ''} ${g.steam_folder_name || ''} ${g.app_id || g.id || ''}`).toLowerCase();
        const matchesQuery =
          searchStr.includes(query) ||
          (cleanQ && searchStr.includes(cleanQ)) ||
          (g.name || "").toLowerCase().includes(query) ||
          (g.steam_folder_name || "").toLowerCase().includes(query) ||
          String(g.app_id || g.id || "").includes(query);
        if (!matchesQuery) return false;
      }

      if (targetSaga && !matchesSaga(g, targetSaga)) return false;

      if (pickerFilter === "with_dlcs") return g.hasDlcs;
      if (pickerFilter === "base_only") return !g.hasDlcs;

      const isUbiDen = isUbisoftVipGame(g);
      const isEADen = isEaVipGame(g);
      const isDenuvo = isUbiDen || isEADen || g.technical_category === "denuvo" || Boolean(g.isDenuvoActivation);
      const isBypass = g.technical_category === "bypass";
      const hasFix = Boolean(g.fix_drive_id || g.fix_download_url);
      const isSteamDen = isDenuvo && !isUbiDen && !isEADen;

      if (pickerFilter === "denuvo_steam") return isSteamDen;
      if (pickerFilter === "denuvo_ubisoft") return isUbiDen;
      if (pickerFilter === "denuvo_ea") return isEADen;
      if (pickerFilter === "bypass") return isBypass;
      if (pickerFilter === "lua_only") return !hasFix && !isDenuvo && !isBypass;
      if (pickerFilter === "with_fix") return hasFix && !isDenuvo;
      return true;
    });
  }, [games, pickerSearch, pickerFilter, pickerSagaFilter]);

  return (
    <div className="admin-licencias-container">
      <header className="lic-header">
        <div>
          <h2>🔐 Gestor de Licencias y Activaciones Steam (PandaStore Launcher)</h2>
          <p>Administra códigos de clientes, bloqueos por HWID, scripts .LUA y enlaces de GoFile / Google Drive.</p>
        </div>
        <div className="lic-tabs">
          <button
            className={`lic-tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            ◫ Resumen
          </button>
          <button
            className={`lic-tab-btn ${activeTab === "licenses" ? "active" : ""}`}
            onClick={() => setActiveTab("licenses")}
          >
            🔑 Licencias de Clientes ({licenses.length})
          </button>
          <button
            className={`lic-tab-btn ${activeTab === "games" ? "active" : ""}`}
            onClick={() => setActiveTab("games")}
          >
            🎮 Juegos & Activaciones Drive ({games.length})
          </button>
          <button
            className={`lic-tab-btn ${activeTab === "guide" ? "active active-guide-tab" : ""}`}
            onClick={() => setActiveTab("guide")}
            style={{ borderLeft: "1px solid rgba(255,215,0,0.3)" }}
          >
            📖 Guía de Activación (Paso a Paso)
          </button>
        </div>
      </header>

      {activeTab === "overview" && (
        <section className="lic-overview" aria-label="Resumen de licencias">
          <div className="lic-overview-heading">
            <div>
              <span className="lic-eyebrow">PANEL DE CONTROL</span>
              <h3>Estado de tu operación</h3>
              <p>Información calculada con las licencias y los últimos accesos registrados.</p>
            </div>
            <button type="button" className="lic-overview-refresh" onClick={fetchLicenses} disabled={loadingLicenses}>
              {loadingLicenses ? "Sincronizando…" : "⟳ Actualizar datos"}
            </button>
          </div>

          <div className="lic-overview-grid">
            <article className="lic-kpi-card lic-kpi-primary"><span>Licencias activas</span><strong>{dashboard.active.length}</strong><small>Disponibles para clientes</small></article>
            <article className="lic-kpi-card"><span>Planes permanentes</span><strong>{dashboard.permanent.length}</strong><small>Sin vencimiento configurado</small></article>
            <article className="lic-kpi-card lic-kpi-warning"><span>Vencen en 24 h</span><strong>{dashboard.expiring.length}</strong><small>Revisar antes de que expiren</small></article>
            <article className="lic-kpi-card lic-kpi-success"><span>Conexiones hoy</span><strong>{dashboard.seenToday.length}</strong><small>Según último acceso</small></article>
          </div>

          <div className="lic-insights-grid">
            <article className="lic-insight-card">
              <span className="lic-insight-icon">◉</span>
              <div><span className="lic-insight-label">Nuevas claves hoy</span><strong>{dashboard.createdToday.length}</strong><p>Se usa la fecha de creación o entrega de cada licencia.</p></div>
            </article>
            <article className="lic-insight-card">
              <span className="lic-insight-icon">↗</span>
              <div><span className="lic-insight-label">Día con más actividad</span><strong>{dashboard.busiest ? `${dashboard.busiest[0]} · ${dashboard.busiest[1]} accesos` : "Aún no hay actividad"}</strong><p>Basado en el último acceso reportado por el launcher.</p></div>
            </article>
          </div>

          <article className="lic-admin-note">
            <strong>Control de vencimientos</strong>
            <p>Las claves con fecha muestran su estado en este panel. La eliminación automática debe ejecutarse del lado del servidor para que siga funcionando aunque ningún administrador tenga abierta esta página.</p>
          </article>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 1: LICENCIAS DE CLIENTES                              */}
      {/* ========================================================= */}
      {activeTab === "licenses" && (
        <div className="lic-tab-content">
          <div className="lic-toolbar" style={{ flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 240px", minWidth: "220px" }}>
              <input
                type="text"
                placeholder="🔍 Buscar por Clave, Email o HWID..."
                value={searchLicense}
                onChange={(e) => setSearchLicense(e.target.value)}
                className="lic-search-input"
                style={{ width: "100%", boxSizing: "border-box" }}
              />
              {searchLicense && (
                <button
                  type="button"
                  onClick={() => setSearchLicense("")}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#a89ec4", cursor: "pointer", fontSize: 16 }}
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="lic-select-filter"
            >
              <option value="all">🔍 Todos los estados ({licenses.length})</option>
              <option value="bound">🔒 Activas en PC / HWID ({licenseFilterCounts.bound})</option>
              <option value="pending_pc">⏳ Entregadas esperando PC ({licenseFilterCounts.pendingPc})</option>
              <option value="stock_free">🟢 Stock Libre sin cliente ({licenseFilterCounts.stockFree})</option>
              <option value="unbound">🔓 Todas sin vincular ({licenseFilterCounts.unbound})</option>
              <option value="duplicate_hwid">⚠️ Mismo HWID en Varias Claves ({licenseFilterCounts.dupHwid})</option>
              <option value="all_games">⭐ Acceso Total a Todos los Juegos ({licenseFilterCounts.allGames})</option>
              <option value="active">✅ Estado Activo ({licenseFilterCounts.active})</option>
              <option value="revoked">🚫 Estado Revocado ({licenseFilterCounts.revoked})</option>
            </select>

            <select
              value={dateSort}
              onChange={(e) => setDateSort(e.target.value)}
              className="lic-select-filter"
            >
              <option value="newest">📅 Entregadas más recientes</option>
              <option value="activated_newest">⚡ Activadas recientemente (HWID)</option>
              <option value="client_az">👤 Agrupar por Cliente (A → Z)</option>
              <option value="client_za">👤 Agrupar por Cliente (Z → A)</option>
              <option value="hwid_grouped">💻 Agrupar por Mismo HWID</option>
              <option value="games_desc">🎮 Mayor cantidad de juegos</option>
              <option value="oldest">⏳ Más antiguas primero</option>
            </select>

            <div className="lic-view-mode-toggle" style={{ display: "flex", background: "rgba(18,12,38,0.9)", padding: "4px", borderRadius: "10px", border: "1px solid rgba(162,89,255,0.3)", gap: "4px" }}>
              <button
                type="button"
                onClick={() => setLicenseViewMode("table")}
                className={`picker-btn-small ${licenseViewMode === "table" ? "active-filter" : ""}`}
                style={{ background: licenseViewMode === "table" ? "#7c4dff" : "transparent", border: "none", color: "#fff", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}
              >
                📋 Lista Completa
              </button>
              <button
                type="button"
                onClick={() => setLicenseViewMode("by_hwid")}
                className={`picker-btn-small ${licenseViewMode === "by_hwid" ? "active-filter" : ""}`}
                style={{ background: licenseViewMode === "by_hwid" ? "#00f5d4" : "transparent", border: "none", color: licenseViewMode === "by_hwid" ? "#0d0b18" : "#00f5d4", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}
                title="Agrupar claves que comparten el mismo computador / HWID"
              >
                💻 Agrupar por HWID ({duplicateHwidCount} duplicados)
              </button>
              <button
                type="button"
                onClick={() => setLicenseViewMode("by_client")}
                className={`picker-btn-small ${licenseViewMode === "by_client" ? "active-filter" : ""}`}
                style={{ background: licenseViewMode === "by_client" ? "#ffd700" : "transparent", border: "none", color: licenseViewMode === "by_client" ? "#0d0b18" : "#ffd700", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}
                title="Agrupar compras y claves de cada cliente"
              >
                👤 Agrupar por Cliente
              </button>
            </div>

            <button
              className="btn-create-lic"
              onClick={openCreateTrialLicense}
              style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "#000", fontWeight: "bold" }}
              title="Crea una clave temporal de 15 minutos para que el cliente pruebe los juegos antes de pagar"
            >
              ⏱️ Crear Key de Prueba (15 min)
            </button>

            <button
              className="btn-create-lic"
              onClick={openCreateLicense}
            >
              ➕ Crear Nueva Licencia
            </button>
          </div>

          {loadingLicenses ? (
            <div className="lic-loading">Cargando licencias desde Firestore...</div>
          ) : licenseViewMode === "by_hwid" ? (
            /* ========================================================= */
            /* VISTA AGRUPADA POR COMPUTADOR / HWID                      */
            /* ========================================================= */
            <div className="hwid-grouped-container" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {groupedByHwid.map(([hwidKey, lics]) => {
                const isUnbound = hwidKey === "SIN_VINCULAR";
                const isDuplicate = !isUnbound && lics.length > 1;

                return (
                  <div
                    key={hwidKey}
                    style={{
                      background: isDuplicate ? "linear-gradient(135deg, rgba(35, 12, 35, 0.95) 0%, rgba(18, 9, 28, 0.98) 100%)" : "linear-gradient(135deg, rgba(20, 14, 40, 0.9) 0%, rgba(11, 7, 26, 0.95) 100%)",
                      border: isDuplicate ? "1.5px solid rgba(239, 68, 68, 0.55)" : "1px solid rgba(162, 89, 255, 0.25)",
                      borderRadius: 16,
                      padding: "16px 20px",
                      boxShadow: isDuplicate ? "0 4px 20px rgba(239, 68, 68, 0.15)" : "0 4px 16px rgba(0,0,0,0.3)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{isUnbound ? "🔓" : "💻"}</span>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: isUnbound ? "#fbbf24" : (isDuplicate ? "#fca5a5" : "#00f5d4"), fontWeight: 900, fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}>
                              {isUnbound ? "CLAVES PENDIENTES DE ACTIVACIÓN EN PC / STOCK" : `HWID: ${hwidKey}`}
                            </span>
                            {!isUnbound && (
                              <button
                                type="button"
                                onClick={() => copyKeyToClipboard(hwidKey)}
                                className="btn-copy-key"
                                title="Copiar HWID completo"
                              >
                                {copiedKey === hwidKey ? "✓ HWID Copiado" : "📋 Copiar HWID"}
                              </button>
                            )}
                          </div>
                          <span style={{ fontSize: 11, color: "rgba(226,217,255,0.6)" }}>
                            {lics.length} {lics.length === 1 ? "licencia asignada" : "licencias compartiendo este equipo"}
                          </span>
                        </div>
                      </div>

                      {isDuplicate && (
                        <div style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid #ef4444", color: "#fca5a5", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 900 }}>
                          ⚠️ ATENCIÓN: {lics.length} CLAVES DIFERENTES ACTIVADAS EN ESTE MISMO PC
                        </div>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                      {lics.map(lic => {
                        const licKey = lic.key || lic.id;
                        const isCopied = copiedKey === licKey;
                        const isAdmin = lic.hwid === "C891B1E9B6083CA5D20BD054024B813B6213FE59C613A55594F33CA065FFD36A" || lic.is_admin === true || (lic.client_email && lic.client_email.toLowerCase().includes("admin"));

                        return (
                          <div
                            key={lic.id}
                            style={{
                              background: "rgba(10, 6, 24, 0.75)",
                              border: "1px solid rgba(162, 89, 255, 0.2)",
                              borderRadius: 12,
                              padding: "12px 14px",
                              display: "flex",
                              flexDirection: "column",
                              gap: 8
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span className="key-badge" style={{ fontSize: 12 }}>{licKey}</span>
                              <button
                                type="button"
                                onClick={() => copyKeyToClipboard(licKey)}
                                className={`btn-copy-key ${isCopied ? 'copied' : ''}`}
                              >
                                {isCopied ? "✓ Copiado" : "📋"}
                              </button>
                            </div>

                            <div style={{ fontSize: 12, color: "#fff", fontWeight: 700, wordBreak: "break-all" }}>
                              ✉️ {lic.client_email || "Sin correo"}
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(196,181,253,0.7)" }}>
                              <span>Plan: <b style={{ color: "#ffd700" }}>{lic.license_type === "monthly" ? "Mensual" : "Permanente"}</b></span>
                              <span>Juegos: <b style={{ color: "#00f5d4" }}>{lic.allowed_games?.includes("*") ? "Todos (*)" : (lic.allowed_games?.length || 0)}</b></span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                              <span className={`status-badge ${lic.status === "active" ? "active" : "revoked"}`} style={{ padding: "2px 8px", fontSize: 10 }}>
                                {lic.status === "active" ? "ACTIVA" : "SUSPENDIDA"}
                              </span>
                              <div style={{ display: "flex", gap: 4 }}>
                                <button
                                  className="btn-action edit"
                                  style={{ padding: "4px 8px", fontSize: 11 }}
                                  onClick={() => openEditLicense(lic)}
                                >
                                  ✏️
                                </button>
                                {lic.hwid && (
                                  <button
                                    className="btn-action reset-hwid"
                                    style={{ padding: "4px 8px", fontSize: 11 }}
                                    onClick={() => handleResetHwid(lic)}
                                    title="Desvincular HWID"
                                  >
                                    🔄 Reset
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : licenseViewMode === "by_client" ? (
            /* ========================================================= */
            /* VISTA AGRUPADA POR CLIENTE / EMAIL                        */
            /* ========================================================= */
            <div className="client-grouped-container" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {groupedByClient.map(([email, lics]) => (
                <div
                  key={email}
                  style={{
                    background: "linear-gradient(135deg, rgba(20, 14, 40, 0.9) 0%, rgba(11, 7, 26, 0.95) 100%)",
                    border: "1px solid rgba(162, 89, 255, 0.25)",
                    borderRadius: 16,
                    padding: "16px 20px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: "#ffffff" }}>
                        👤 {email}
                      </div>
                      <span style={{ fontSize: 11, color: "#ffd700" }}>
                        {lics.length} {lics.length === 1 ? "licencia adquirida" : "licencias adquiridas"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                    {lics.map(lic => {
                      const licKey = lic.key || lic.id;
                      const isCopied = copiedKey === licKey;

                      return (
                        <div
                          key={lic.id}
                          style={{
                            background: "rgba(10, 6, 24, 0.75)",
                            border: "1px solid rgba(162, 89, 255, 0.2)",
                            borderRadius: 12,
                            padding: "12px 14px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 8
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span className="key-badge" style={{ fontSize: 12 }}>{licKey}</span>
                            <button
                              type="button"
                              onClick={() => copyKeyToClipboard(licKey)}
                              className={`btn-copy-key ${isCopied ? 'copied' : ''}`}
                            >
                              {isCopied ? "✓ Copiado" : "📋"}
                            </button>
                          </div>

                          <div style={{ fontSize: 11, color: "rgba(226,217,255,0.7)" }}>
                            HWID: <span style={{ fontFamily: "monospace", color: lic.hwid ? "#ffa726" : (lic.client_email || lic.orderId) ? "#fbbf24" : "#66bb6a" }}>
                              {lic.hwid
                                ? `${lic.hwid.substring(0, 12)}...`
                                : (lic.client_email || lic.orderId)
                                  ? "⏳ Entregada (Esperando PC)"
                                  : "🟢 Stock Libre"}
                            </span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(196,181,253,0.7)" }}>
                            <span>Juegos: <b style={{ color: "#00f5d4" }}>{lic.allowed_games?.includes("*") ? "Todos (*)" : (lic.allowed_games?.length || 0)}</b></span>
                            <span className={`status-badge ${lic.status === "active" ? "active" : "revoked"}`} style={{ padding: "2px 8px", fontSize: 10 }}>
                              {lic.status === "active" ? "ACTIVA" : "SUSPENDIDA"}
                            </span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: "auto", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            <button
                              className="btn-action edit"
                              style={{ padding: "4px 8px", fontSize: 11 }}
                              onClick={() => openEditLicense(lic)}
                            >
                              ✏️ Editar
                            </button>
                            {lic.hwid && (
                              <button
                                className="btn-action reset-hwid"
                                style={{ padding: "4px 8px", fontSize: 11 }}
                                onClick={() => handleResetHwid(lic)}
                              >
                                🔄 Reset
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ========================================================= */
            /* VISTA DE TABLA COMPLETA                                   */
            /* ========================================================= */
            <div className={`lic-dt6-wrapper ${selectedSideLicense ? "has-side-panel" : ""}`}>
              <div className="lic-table-wrapper">
                <table className="lic-table">
                <thead>
                  <tr>
                    <th>Clave de Licencia</th>
                    <th>Email Cliente</th>
                    <th>Tipo Plan</th>
                    <th>Vencimiento</th>
                    <th>Entregada / Creada</th>
                    <th>Estado HWID</th>
                    <th>Estado</th>
                    <th>Última Conexión</th>
                    <th>Juegos Autorizados</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLicenses.map((lic) => {
                    const isAdmin = lic.hwid === "C891B1E9B6083CA5D20BD054024B813B6213FE59C613A55594F33CA065FFD36A" || lic.is_admin === true || (lic.client_email && lic.client_email.toLowerCase().includes("admin"));
                    const licKey = lic.key || lic.id;
                    const isCopied = copiedKey === licKey;
                    const hwidDupCount = lic.hwid ? (hwidCounts.get(lic.hwid) || 0) : 0;
                    const isDuplicateHwid = hwidDupCount > 1;

                    return (
                    <tr
                      key={lic.id}
                      className={`${isAdmin ? "row-admin-highlight" : ""} ${isDuplicateHwid ? "row-hwid-duplicate" : ""} ${selectedSideLicense?.id === lic.id ? "row-selected-dt6" : ""}`}
                      onClick={() => setSelectedSideLicense(lic)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="key-badge">{licKey}</span>
                            <button
                              type="button"
                              onClick={() => copyKeyToClipboard(licKey)}
                              className={`btn-copy-key ${isCopied ? 'copied' : ''}`}
                              title="Copiar Clave al Portapapeles"
                            >
                              {isCopied ? "✓ Copiado" : "📋"}
                            </button>
                          </div>
                          {isAdmin ? (
                            <span className="role-badge admin-badge" title="Administrador Master del PandaStore Launcher">
                              👑 Master
                            </span>
                          ) : (
                            <span className="role-badge client-badge">
                              👤 Cliente
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontWeight: 700, color: "#ffffff", wordBreak: "break-all" }}>
                            {lic.client_email || "Sin correo"}
                          </span>
                          <span style={{ fontSize: "11px", color: "rgba(196,181,253,0.6)" }}>
                            ID: {lic.id.substring(0, 14)}...
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`plan-badge ${lic.is_trial ? "trial" : lic.license_type}`}>
                          {lic.is_trial ? `⏱️ Prueba (${lic.trial_minutes || 15}m)` : (lic.license_type === "monthly" ? "📅 Mensual" : "⭐ De por vida")}
                        </span>
                      </td>
                      <td>
                        {lic.is_trial ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontSize: "11px", fontWeight: 800, color: "#fbbf24" }}>
                              {lic.expires_at ? `Expira: ${formatDate(lic.expires_at)}` : `15 min tras primer inicio`}
                            </span>
                            {lic.activated_at && (
                              <span style={{ fontSize: "10px", color: "#a89ec4" }}>
                                Activada: {formatDate(lic.activated_at)}
                              </span>
                            )}
                          </div>
                        ) : lic.license_type === "monthly" ? (
                          <span style={{ fontSize: "12px", fontWeight: 800, color: "#f472b6" }}>
                            {lic.expiry_date || "Sin fecha"}
                          </span>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#34d399", fontWeight: 800 }}>
                            ∞ Infinito
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="date-badge delivered">
                          🕒 {formatDate(lic.deliveredAt || lic.createdAt)}
                        </span>
                      </td>
                      <td>
                        {lic.hwid ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                            <span className="hwid-badge bound" title={lic.hwid}>
                              🔒 {lic.hwid.substring(0, 10)}...
                            </span>
                            {isDuplicateHwid && (
                              <span className="hwid-dup-badge" title={`Este mismo computador/HWID tiene ${hwidDupCount} licencias registradas`}>
                                ⚠️ En {hwidDupCount} claves
                              </span>
                            )}
                          </div>
                        ) : (lic.client_email || lic.orderId) ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                            <span className="hwid-badge pending-pc" title="Juego entregado al cliente. Se vinculará automáticamente al abrir el Launcher, o puedes vincular su HWID ahora.">
                              ⏳ Entregada (Esperando PC)
                            </span>
                            {clientKnownHwids[(lic.client_email || "").toLowerCase().trim()]?.[0] && (
                              <button
                                type="button"
                                onClick={() => handleQuickBindKnownHwid(lic, clientKnownHwids[(lic.client_email || "").toLowerCase().trim()][0])}
                                style={{
                                  background: "rgba(124, 77, 255, 0.2)",
                                  border: "1px solid #7c4dff",
                                  color: "#c4b5fd",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "10px",
                                  cursor: "pointer",
                                  fontWeight: "bold",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px"
                                }}
                                title="El cliente ya tiene un PC registrado en otra compra. Click para vincular de inmediato."
                              >
                                🔗 Vincular PC Conocido
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="hwid-badge stock-free">🟢 Stock Libre</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${lic.status === "active" ? "active" : "revoked"}`}>
                          {lic.status === "active" ? (lic.is_trial ? "DEMO ACTIVA" : "ACTIVA") : (lic.status === "revoked" ? "REVOCADA / PURGADA" : "SUSPENDIDA")}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "11px", color: "#9a97b0", whiteSpace: "nowrap" }}>
                          {lic.last_seen ? formatDate(lic.last_seen) : (lic.activatedAt ? formatDate(lic.activatedAt) : "Sin registros")}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
                          <span className={`games-badge ${lic.allowed_games?.includes("*") ? "all-games" : ""}`}>
                            {lic.allowed_games?.includes("*")
                              ? "⭐ Todos (*)"
                              : `${lic.allowed_games?.length || 0} juegos`}
                          </span>
                          {Array.isArray(lic.allowed_dlcs) && lic.allowed_dlcs.length > 0 && (
                            <span style={{ fontSize: "10px", color: "#34d399", fontWeight: "bold", background: "rgba(16,185,129,0.15)", padding: "1px 6px", borderRadius: "4px", border: "1px solid rgba(16,185,129,0.3)" }}>
                              📦 {lic.allowed_dlcs.length} con DLCs
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="actions-cell">
                        {lic.is_trial && (
                          <button
                            className="btn-action"
                            style={{ background: "#10b981", color: "#fff", fontWeight: "bold", padding: "5px 9px", fontSize: "11px" }}
                            onClick={() => handleUpgradeToPermanent(lic)}
                            title="El cliente ya pagó: convertir a permanente y quitar límite de tiempo"
                          >
                            ⭐ Hacer Permanente
                          </button>
                        )}
                        <button
                          className="btn-action edit"
                          onClick={() => openEditLicense(lic)}
                          title="Editar juegos permitidos de esta licencia"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          className="btn-action"
                          style={{ background: "#ef4444", color: "#fff", fontWeight: "bold", padding: "5px 9px", fontSize: "11px" }}
                          onClick={() => handleRemotePurge(lic)}
                          title="Revoca la clave y ordena al PandaStore Launcher del cliente borrar todos los juegos y LUAs de Steam"
                        >
                          🚫 Purgar PC
                        </button>
                        <button
                          className={`btn-action ${lic.status === "active" ? "revoke" : "activate"}`}
                          onClick={() => handleToggleStatus(lic)}
                        >
                          {lic.status === "active" ? "⏸️ Pausar" : "✅ Activar"}
                        </button>
                        {lic.hwid ? (
                          <button className="btn-action reset-hwid" onClick={() => handleResetHwid(lic)} title="Desvincular HWID del equipo">
                            🔄 Reset HWID
                          </button>
                        ) : (
                          <button
                            className="btn-action"
                            style={{ background: "rgba(124, 77, 255, 0.2)", border: "1px solid rgba(168, 85, 247, 0.4)", color: "#c4b5fd", fontSize: "11px", padding: "5px 8px" }}
                            onClick={() => openEditLicense(lic)}
                            title="Vincular o asignar HWID manualmente a este juego"
                          >
                            💻 Vincular PC
                          </button>
                        )}
                        <button className="btn-action delete" onClick={() => handleDeleteLicense(lic.id)}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                  })}
                  {filteredLicenses.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: "center", padding: "24px" }}>
                        No se encontraron licencias registradas con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── PANEL LATERAL SINCRONIZADO (DATA TABLE 6) ── */}
            {selectedSideLicense && (
              <aside className="lic-dt6-side-panel">
                <div className="lic-dt6-side-header">
                  <div>
                    <span className="lic-dt6-pill">DATA TABLE 6 • DETALLE SINCRONIZADO</span>
                    <h3 className="lic-dt6-title">{selectedSideLicense.key || selectedSideLicense.id}</h3>
                  </div>
                  <button
                    type="button"
                    className="lic-dt6-close-btn"
                    onClick={() => setSelectedSideLicense(null)}
                    title="Cerrar panel lateral"
                  >
                    ✕
                  </button>
                </div>

                <div className="lic-dt6-side-body">
                  {/* Hero Card */}
                  <div className="lic-dt6-hero">
                    <div className="lic-dt6-hero-icon">
                      {selectedSideLicense.is_trial ? "⏱️" : selectedSideLicense.license_type === "monthly" ? "📅" : "⭐"}
                    </div>
                    <div className="lic-dt6-hero-meta">
                      <div className="lic-dt6-hero-status">
                        <span className={`status-badge ${selectedSideLicense.status === "active" ? "active" : "revoked"}`}>
                          {selectedSideLicense.status === "active" ? "🟢 LICENCIA ACTIVA" : "🔴 LICENCIA REVOCADA"}
                        </span>
                        {selectedSideLicense.is_trial && (
                          <span className="plan-badge trial" style={{ marginLeft: 6 }}>PRUEBA 15 MIN</span>
                        )}
                      </div>
                      <div className="lic-dt6-hero-client">{selectedSideLicense.client_email || "Sin cliente asignado"}</div>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="dt6-actions-block">
                    <span className="dt6-actions-label">Acciones rápidas</span>
                    <div className="dt6-actions-row">
                    {selectedSideLicense.is_trial && (
                      <button type="button" className="dt6-btn-success" onClick={() => handleUpgradeToPermanent(selectedSideLicense)} title="Convertir esta clave de prueba en licencia permanente">
                        <span className="material-icons" style={{ fontSize: 15 }}>workspace_premium</span>
                        Hacer permanente
                      </button>
                    )}
                    <button
                      type="button"
                      className="dt6-btn-secondary"
                      onClick={() => copyKeyToClipboard(selectedSideLicense.key || selectedSideLicense.id)}
                      title="Copiar clave completa"
                    >
                      <span className="material-icons" style={{ fontSize: 15 }}>content_copy</span>
                      {copiedKey === (selectedSideLicense.key || selectedSideLicense.id) ? "¡Copiada!" : "Copiar"}
                    </button>

                    <button
                      type="button"
                      className="dt6-btn-primary"
                      onClick={() => openEditLicense(selectedSideLicense)}
                      title="Abrir editor completo de licencia"
                    >
                      <span className="material-icons" style={{ fontSize: 15 }}>edit</span>
                      Editar
                    </button>

                    <button type="button" className="dt6-btn-warning dt6-btn-purge" onClick={() => handleRemotePurge(selectedSideLicense)} title="Revocar y borrar la instalación del equipo remoto">
                      <span className="material-icons" style={{ fontSize: 15 }}>delete_sweep</span>
                      Purgar PC
                    </button>

                    <button
                      type="button"
                      className={selectedSideLicense.status === "active" ? "dt6-btn-secondary dt6-btn-pause" : "dt6-btn-success"}
                      onClick={() => handleToggleStatus(selectedSideLicense)}
                      title={selectedSideLicense.status === "active" ? "Pausar la licencia" : "Activar la licencia"}
                    >
                      <span className="material-icons" style={{ fontSize: 15 }}>{selectedSideLicense.status === "active" ? "pause_circle" : "check_circle"}</span>
                      {selectedSideLicense.status === "active" ? "Pausar" : "Activar"}
                    </button>

                    {selectedSideLicense.hwid && (
                      <button
                        type="button"
                        className="dt6-btn-secondary dt6-btn-reset"
                        onClick={() => handleResetHwid(selectedSideLicense)}
                        title="Resetear HWID para permitir nuevo PC"
                      >
                        <span className="material-icons" style={{ fontSize: 15 }}>restart_alt</span>
                        Reset HWID
                      </button>
                    )}

                    {!selectedSideLicense.hwid && (
                      <button type="button" className="dt6-btn-secondary" onClick={() => openEditLicense(selectedSideLicense)} title="Asignar un computador o HWID manualmente">
                        <span className="material-icons" style={{ fontSize: 15 }}>computer</span>
                        Vincular PC
                      </button>
                    )}

                    <button
                      type="button"
                      className="dt6-btn-danger"
                      onClick={() => handleDeleteLicense(selectedSideLicense.id)}
                      title="Eliminar clave permanentemente"
                    >
                      <span className="material-icons" style={{ fontSize: 15 }}>delete_outline</span>
                      Eliminar
                    </button>
                    </div>
                  </div>

                  {/* Propiedades de activación */}
                  <div className="dt6-detail-section">
                    <div className="dt6-detail-section-title">
                      <span className="material-icons" style={{ fontSize: 14 }}>info</span>
                      Parámetros de Activación
                    </div>
                    <div className="dt6-properties-grid">
                      <div className="dt6-property-row">
                        <span className="dt6-property-key">ID de Licencia:</span>
                        <span className="dt6-property-val" style={{ fontFamily: "monospace" }}>{selectedSideLicense.id}</span>
                      </div>
                      <div className="dt6-property-row">
                        <span className="dt6-property-key">Hardware ID (HWID):</span>
                        <span className="dt6-property-val" style={{ fontFamily: "monospace", color: selectedSideLicense.hwid ? "#f59e0b" : (selectedSideLicense.client_email || selectedSideLicense.orderId) ? "#fbbf24" : "#4ade80" }}>
                          {selectedSideLicense.hwid
                            ? `${selectedSideLicense.hwid.slice(0, 14)}...`
                            : (selectedSideLicense.client_email || selectedSideLicense.orderId)
                              ? "⏳ Entregada (Esperando inicio en PC)"
                              : "🟢 Stock Libre (Sin PC)"}
                        </span>
                      </div>
                      <div className="dt6-property-row">
                        <span className="dt6-property-key">Tipo de Plan:</span>
                        <span className="dt6-property-val">
                          {selectedSideLicense.is_trial ? "Prueba Temporal (15 min)" : selectedSideLicense.license_type === "monthly" ? "Mensual" : "Vitalicia (Permanente)"}
                        </span>
                      </div>
                      <div className="dt6-property-row">
                        <span className="dt6-property-key">Última Conexión:</span>
                        <span className="dt6-property-val">
                          {selectedSideLicense.last_connected ? formatDate(selectedSideLicense.last_connected) : (selectedSideLicense.last_seen ? formatDate(selectedSideLicense.last_seen) : "Sin conexión")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Juegos Autorizados */}
                  <div className="dt6-detail-section">
                    <div className="dt6-detail-section-title">
                      <span className="material-icons" style={{ fontSize: 14 }}>sports_esports</span>
                      Juegos Autorizados en Launcher
                    </div>
                    {selectedSideLicense.allowed_games?.includes("*") ? (
                      <div style={{ padding: "10px 14px", background: "rgba(162, 89, 255, 0.15)", border: "1px solid rgba(162, 89, 255, 0.35)", borderRadius: "10px", color: "#c4b5fd", fontSize: "0.84rem", fontWeight: 700 }}>
                        ⭐ Acceso Ilimitado a Toda la Biblioteca Steam (400+ Juegos)
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "180px", overflowY: "auto", padding: "4px" }}>
                          {(selectedSideLicense.allowed_games || []).map((gid, idx) => {
                            const g = games.find(game => String(game.app_id || game.id) === String(gid));
                            const gDlcs = g?.dlcs || [];
                            const activeDlcsCount = gDlcs.filter(d => (selectedSideLicense.allowed_dlcs || []).map(String).includes(String(d.dlc_app_id))).length;
                            const hasDlc = Array.isArray(selectedSideLicense.allowed_dlcs) && (
                              selectedSideLicense.allowed_dlcs.map(String).includes(String(gid)) || activeDlcsCount > 0
                            );
                            return (
                              <span key={idx} style={{ padding: "3px 8px", background: hasDlc ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)", border: hasDlc ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", fontSize: "0.75rem", color: "#fff" }}>
                                🎮 {g?.name || gid} {hasDlc && <strong style={{ color: "#34d399", marginLeft: 4 }}>+ 📦 {activeDlcsCount > 0 ? `${activeDlcsCount} DLCs` : "DLCs"}</strong>}
                              </span>
                            );
                          })}
                        </div>
                        {Array.isArray(selectedSideLicense.allowed_dlcs) && selectedSideLicense.allowed_dlcs.length > 0 && (
                          <div style={{ fontSize: "11px", color: "#34d399", fontWeight: "bold", background: "rgba(16,185,129,0.1)", padding: "4px 8px", borderRadius: "6px", border: "1px solid rgba(16,185,129,0.25)" }}>
                            📦 {selectedSideLicense.allowed_dlcs.length} DLCs/juegos autorizados en Launcher
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            )}
          </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: JUEGOS STEAM & FIXES DRIVE                         */}
      {/* ========================================================= */}
      {activeTab === "games" && (
        <div className="lic-tab-content">
          <div className="lic-toolbar" style={{ flexWrap: "wrap", gap: "10px" }}>
            <input
              type="text"
              placeholder="Buscar por Nombre o AppID..."
              value={searchGame}
              onChange={(e) => setSearchGame(e.target.value)}
              className="lic-search-input"
            />

            <div className="game-filter-buttons" style={{ display: "flex", gap: "6px" }}>
              <button
                className={`picker-btn-small ${gameFilter === "all" ? "active-filter" : ""}`}
                onClick={() => setGameFilter("all")}
                style={{ background: gameFilter === "all" ? "#7b2ff2" : "rgba(255,255,255,0.08)", color: "#fff", padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", fontWeight: "bold" }}
              >
                🌐 Todos ({games.length})
              </button>
              <button
                className={`picker-btn-small ${gameFilter === "lua_only" ? "active-filter" : ""}`}
                onClick={() => setGameFilter("lua_only")}
                style={{ background: gameFilter === "lua_only" ? "#f59e0b" : "rgba(255,255,255,0.08)", color: "#fff", padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", fontWeight: "bold" }}
              >
                📄 Solo LUA ({countLuaOnly})
              </button>
              <button
                className={`picker-btn-small ${gameFilter === "with_fix" ? "active-filter" : ""}`}
                onClick={() => setGameFilter("with_fix")}
                style={{ background: gameFilter === "with_fix" ? "#10b981" : "rgba(255,255,255,0.08)", color: "#fff", padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", fontWeight: "bold" }}
              >
                🔧 LUA + FIX ({countFix})
              </button>
              <button
                className={`picker-btn-small ${gameFilter === "bypass" ? "active-filter" : ""}`}
                onClick={() => setGameFilter("bypass")}
                style={{ background: gameFilter === "bypass" ? "#ec4899" : "rgba(255,255,255,0.08)", color: "#fff", padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", fontWeight: "bold" }}
              >
                ⚡ BYPASS ({countBypass})
              </button>
              <button
                className={`picker-btn-small ${gameFilter === "denuvo_steam" ? "active-filter" : ""}`}
                onClick={() => { setGameFilter("denuvo_steam"); setGamesPage(1); }}
                style={{ background: gameFilter === "denuvo_steam" ? "#8b5cf6" : "rgba(255,255,255,0.08)", color: "#fff", padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(168,85,247,0.4)", cursor: "pointer", fontWeight: "bold" }}
              >
                🔑 Steam Denuvo ({countSteamDenuvo})
              </button>
              <button
                className={`picker-btn-small ${gameFilter === "denuvo_ubisoft" ? "active-filter" : ""}`}
                onClick={() => { setGameFilter("denuvo_ubisoft"); setGamesPage(1); }}
                style={{ background: gameFilter === "denuvo_ubisoft" ? "#0284c7" : "rgba(255,255,255,0.08)", color: "#fff", padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(2,132,199,0.4)", cursor: "pointer", fontWeight: "bold" }}
              >
                🦅 Ubisoft VIP ({countUbisoftDenuvo})
              </button>
              <button
                className={`picker-btn-small ${gameFilter === "denuvo_ea" ? "active-filter" : ""}`}
                onClick={() => { setGameFilter("denuvo_ea"); setGamesPage(1); }}
                style={{ background: gameFilter === "denuvo_ea" ? "#ea580c" : "rgba(255,255,255,0.08)", color: "#fff", padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(234,88,12,0.4)", cursor: "pointer", fontWeight: "bold" }}
              >
                ⚽ EA Play VIP ({countEADenuvo})
              </button>
              <button
                className={`picker-btn-small ${gameFilter === "build_completa" ? "active-filter" : ""}`}
                onClick={() => { setGameFilter("build_completa"); setGamesPage(1); }}
                style={{ background: gameFilter === "build_completa" ? "#3b82f6" : "rgba(255,255,255,0.08)", color: "#fff", padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", fontWeight: "bold" }}
              >
                📦 BUILD Completa ({countBuilds})
              </button>
            </div>

            <div className="saga-filter-pills" style={{ display: "flex", gap: "6px", flexWrap: "wrap", width: "100%", marginTop: "6px", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#c4b5fd", fontWeight: "bold", marginRight: "4px" }}>
                🎯 Filtrar por Saga:
              </span>
              <button
                type="button"
                className={`picker-btn-small ${gameSagaFilter === "all" ? "active-filter" : ""}`}
                onClick={() => { setGameSagaFilter("all"); setGamesPage(1); }}
                style={{
                  background: gameSagaFilter === "all" ? "#7b2ff2" : "rgba(255,255,255,0.06)",
                  color: "#fff",
                  padding: "5px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontWeight: gameSagaFilter === "all" ? "bold" : "normal"
                }}
              >
                Todas
              </button>
              {SAGA_PRESETS.map(s => {
                const count = sagaCounts[s.id] || 0;
                if (count === 0) return null;
                const isSelected = gameSagaFilter === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`picker-btn-small ${isSelected ? "active-filter" : ""}`}
                    onClick={() => { setGameSagaFilter(isSelected ? "all" : s.id); setGamesPage(1); }}
                    style={{
                      background: isSelected ? s.color : "rgba(255,255,255,0.06)",
                      color: "#fff",
                      border: `1px solid ${isSelected ? "#fff" : "rgba(255,255,255,0.12)"}`,
                      padding: "5px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      cursor: "pointer",
                      fontWeight: isSelected ? "bold" : "normal",
                      boxShadow: isSelected ? `0 0 10px ${s.color}88` : "none"
                    }}
                  >
                    {s.icon} {s.name} ({count})
                  </button>
                );
              })}
            </div>

            <button
              className="btn-create-lic"
              onClick={() => {
                resetGameForm();
                setShowGameModal(true);
              }}
            >
              ➕ Agregar Configuración de Juego
            </button>
          </div>

          {loadingGames ? (
            <div className="lic-loading">Cargando configuraciones de juegos...</div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', color: '#c4b5fd', fontSize: '13px' }}>
                <span>Mostrando {Math.min(filteredGames.length, (gamesPage - 1) * gamesPerPage + 1)} - {Math.min(filteredGames.length, gamesPage * gamesPerPage)} de {filteredGames.length} juegos</span>
                {Math.ceil(filteredGames.length / gamesPerPage) > 1 && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="picker-btn-small"
                      disabled={gamesPage === 1}
                      onClick={() => setGamesPage(p => Math.max(1, p - 1))}
                    >
                      ◀ Anterior
                    </button>
                    <span>Página {gamesPage} de {Math.ceil(filteredGames.length / gamesPerPage)}</span>
                    <button
                      className="picker-btn-small"
                      disabled={gamesPage >= Math.ceil(filteredGames.length / gamesPerPage)}
                      onClick={() => setGamesPage(p => Math.min(Math.ceil(filteredGames.length / gamesPerPage), p + 1))}
                    >
                      Siguiente ▶
                    </button>
                  </div>
                )}
              </div>

              <div className="games-grid">
                {filteredGames.slice((gamesPage - 1) * gamesPerPage, gamesPage * gamesPerPage).map((g) => {
                  const isUbi = isUbisoftVipGame(g);
                  const isEA = isEaVipGame(g);
                  const isDen = isUbi || isEA || g.technical_category === "denuvo" || Boolean(g.isDenuvoActivation || (Array.isArray(g.tags) && g.tags.includes("Denuvo")));
                  const borderCol = isUbi ? "#0284c7" : isEA ? "#ea580c" : isDen ? "#a855f7" : undefined;
                    return (
                    <div key={g.id} className="game-admin-card" style={{ border: borderCol ? `1.5px solid ${borderCol}` : undefined }}>
                      <div className="game-card-header">
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {g.name}
                          {isDen && (
                            <span style={{
                              fontSize: '10px',
                              background: isUbi ? 'rgba(2,132,199,0.25)' : isEA ? 'rgba(234,88,12,0.25)' : 'rgba(168,85,247,0.25)',
                              color: isUbi ? '#38bdf8' : isEA ? '#fb923c' : '#c084fc',
                              border: `1px solid ${borderCol}`,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 'bold'
                            }}>
                              {isUbi ? '🦅 Ubisoft VIP' : isEA ? '⚽ EA Play VIP' : '🔑 Steam Denuvo'}
                            </span>
                          )}
                        </h4>
                        <span className="appid-tag">AppID: {g.app_id || g.id}</span>
                      </div>
                      <div className="game-card-body">
                        <p>
                          <strong>Carpeta Steam:</strong> <code>{g.steam_folder_name}</code>
                        </p>
                        <p>
                          <strong>Tipo / Fix:</strong>{" "}
                          {isDen ? (
                            <span style={{ background: "rgba(168,85,247,0.2)", color: "#e9d5ff", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>
                              🔑 Requiere Código / Ticket
                            </span>
                          ) : g.fix_drive_id ? (
                            <span className="drive-link-badge">
                              {g.fix_drive_id.includes("ryuu.lol") ? "⚡ Ryuu API: " : "📁 "}
                              {g.fix_drive_id}
                            </span>
                          ) : (
                            <span className="no-drive-badge">Sin Fix (Juego Base LUA)</span>
                          )}
                        </p>
                        <p>
                          <strong>Script .LUA:</strong>{" "}
                          <span style={{ color: "#10b981", fontWeight: "bold" }}>
                            ✅ {g.lua_content ? "Personalizado" : "⚡ Ryuu Reseller API (Activo)"}
                          </span>
                        </p>
                      </div>
                      <div className="game-card-actions">
                        <button className="btn-action edit" onClick={() => openEditGame(g)}>
                          ✏️ Editar Configuración
                        </button>
                        <button className="btn-action delete" onClick={() => handleDeleteGame(g.id)}>
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredGames.length === 0 && (
                  <div className="empty-games">No se encontraron juegos con los filtros aplicados.</div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: GUÍA PRIVADA DE ACTIVACIÓN ADMIN (LUATOOLS/TOKEER) */}
      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* TAB 3: GUÍA PRIVADA DE ACTIVACIÓN STEAM (ADMIN EXCLUSIVO) */}
      {/* ========================================================= */}
      {activeTab === "guide" && (
        <div className="lic-tab-content admin-guide-container">
          <div className="admin-guide-header">
            <div className="guide-badge-lock">🔒 USO EXCLUSIVO ADMINISTRADOR</div>
            <h2>Paso a Paso Rápido: Activación de Juego</h2>
            <p>
              Instrucciones exactas y directas para validar y activar cualquier juego en la máquina.
            </p>
          </div>

          <div className="guide-steps-grid">
            {/* PASO 1: POWERSHELL */}
            <div className="guide-step-card">
              <div className="guide-step-number">1</div>
              <div className="guide-step-body">
                <h3>1. Ejecutar en PowerShell</h3>
                <p>
                  Abre <strong>PowerShell</strong> en Windows y pega el siguiente comando:
                </p>
                <div className="guide-code-box">
                  <code>
                    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $LuaToolsInstallOnly=1; irm 'https://luatools.vercel.app/LuaToolsValidator.ps1' | iex
                  </code>
                  <button
                    type="button"
                    className="guide-copy-btn"
                    onClick={() => copyKeyToClipboard("[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $LuaToolsInstallOnly=1; irm 'https://luatools.vercel.app/LuaToolsValidator.ps1' | iex")}
                  >
                    {copiedKey === "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $LuaToolsInstallOnly=1; irm 'https://luatools.vercel.app/LuaToolsValidator.ps1' | iex" ? "✅ Copiado!" : "📋 Copiar"}
                  </button>
                </div>
              </div>
            </div>

            {/* PASO 2: APPID & REPORTE */}
            <div className="guide-step-card">
              <div className="guide-step-number">2</div>
              <div className="guide-step-body">
                <h3>2. Validar con Steam AppID y Generar Código</h3>
                <p>
                  En la ventana que se abre, ingresa el <strong>AppID</strong> del juego y presiona el botón verde <strong>Run Validation</strong>. Esto generará un código en pantalla (ej: <code>ujngdolt</code>).
                </p>
              </div>
            </div>

            {/* PASO 3: ENVIAR CÓDIGO AL VENDEDOR */}
            <div className="guide-step-card" style={{ borderColor: "rgba(255, 215, 0, 0.45)", background: "linear-gradient(145deg, rgba(35, 25, 12, 0.8) 0%, rgba(18, 14, 8, 0.92) 100%)" }}>
              <div className="guide-step-number" style={{ background: "linear-gradient(135deg, #ffd700 0%, #f59e0b 100%)", color: "#0d0b18" }}>3</div>
              <div className="guide-step-body">
                <h3 style={{ color: "#ffd700" }}>3. Enviar el Código al Vendedor</h3>
                <p>
                  El cliente debe <strong>copiar y enviarte ese código</strong>. Tú se lo envías al bot y el bot te responderá con un <strong>código de activación de 6 caracteres</strong>, el cual le reenvías al cliente.
                </p>
                <div style={{ background: "rgba(0,0,0,0.4)", borderLeft: "3px solid #ffd700", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", color: "#fef08a" }}>
                  💬 <em>"Envíame el código que te apareció en pantalla. Yo te generaré y responderé de inmediato con tu código de 6 caracteres para activar."</em>
                </div>
              </div>
            </div>

            {/* PASO 4: DESCARGA .EXE & CÓDIGO 6 DÍGITOS */}
            <div className="guide-step-card highlight-card">
              <div className="guide-step-number" style={{ background: "linear-gradient(135deg, #00f5d4 0%, #3b82f6 100%)" }}>4</div>
              <div className="guide-step-body">
                <h3>4. Descargar App (.exe) y Canjear Código</h3>
                <p>
                  Descarga el ejecutable desde el enlace oficial. Abre la aplicación, ve a la pestaña <strong>Activate</strong> e ingresa el <strong>código de 6 caracteres</strong> que te entregó el vendedor:
                </p>
                
                <div className="guide-download-box" style={{ marginTop: "10px" }}>
                  <a
                    href="https://github.com/Tesla697/TokeerDRM-App/releases/latest"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="guide-link-btn"
                  >
                    📥 Descargar Ejecutable (.exe)
                  </a>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>
                    Enlace directo de descarga: <code>https://github.com/Tesla697/TokeerDRM-App/releases/latest</code>
                  </div>
                </div>

                <p style={{ marginTop: "14px", fontSize: "13px", color: "#cbd5e1" }}>
                  Presiona <strong>Apply ticket</strong>. Si aparece aviso de <em>"Enhanced DLL needed"</em>, haz clic en <strong>Fix DLL</strong> y listo.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL CREAR LICENCIA                                      */}
      {/* ========================================================= */}
      {showLicenseModal && (
        <div className="modal-overlay" onClick={() => setShowLicenseModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px 16px 28px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(22, 18, 38, 0.95)" }}>
              <h3 style={{ margin: 0, padding: 0, border: "none", background: "transparent" }}>
                {editingLicense ? "✏️ Editar Licencia y Juegos Autorizados" : "🔑 Crear Nueva Licencia de Cliente"}
              </h3>
              <button
                type="button"
                onClick={() => setShowLicenseModal(false)}
                style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#c4b5fd", width: "32px", height: "32px", borderRadius: "50%", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                title="Cerrar modal"
              >
                ✕
              </button>
            </div>
            {formError && <div className="modal-error">{formError}</div>}
            <form onSubmit={handleSaveLicense}>
              {/* FILA 1: Clave y Correo en 2 columnas compactas */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#c4b5fd" }}>Clave de Licencia:</label>
                  <div className="key-input-group" style={{ display: "flex", gap: "6px" }}>
                    <input
                      type="text"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder="PANDA-XXXX-YYYY"
                      readOnly={Boolean(editingLicense)}
                      required
                      style={{ padding: "8px 10px", fontSize: "12px", background: "#0d0b18", border: "1.5px solid #332b56", color: "#fff", borderRadius: "8px", flex: 1 }}
                    />
                    {!editingLicense && (
                      <button type="button" onClick={generateRandomKey} className="btn-gen-key" style={{ padding: "8px 10px", fontSize: "11px", whiteSpace: "nowrap" }}>
                        🎲 Clave
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#c4b5fd" }}>Correo del Cliente (ID Único):</label>
                  <div className="key-input-group" style={{ display: "flex", gap: "6px" }}>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="cliente@correo.com"
                      required
                      style={{ padding: "8px 10px", fontSize: "12px", background: "#0d0b18", border: "1.5px solid #332b56", color: "#fff", borderRadius: "8px", flex: 1 }}
                    />
                    {!editingLicense && (
                      <button type="button" onClick={generateUniqueRandomEmail} className="btn-gen-key" style={{ padding: "8px 10px", fontSize: "11px", whiteSpace: "nowrap" }} title="Generar un correo aleatorio único">
                        🎲 Correo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* FILA 2: Plan, Expiración y Estado en fila compacta */}
              <div style={{ display: "grid", gridTemplateColumns: isTrial || newLicenseType === "monthly" ? "1.2fr 1fr 1fr" : "1.5fr 1fr", gap: "10px", marginBottom: "12px", background: "rgba(14, 9, 28, 0.6)", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(162,89,255,0.2)" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#a78bfa" }}>Plan / Suscripción:</label>
                  <select
                    value={isTrial ? "trial" : newLicenseType}
                    onChange={(e) => {
                      if (e.target.value === "trial") {
                        setIsTrial(true);
                        setNewLicenseType("trial");
                      } else {
                        setIsTrial(false);
                        setNewLicenseType(e.target.value);
                      }
                    }}
                    style={{ background: "#0d0b18", border: "1.5px solid #332b56", color: "white", padding: "7px 10px", borderRadius: "8px", fontSize: "12px" }}
                  >
                    <option value="permanent">⭐ Permanente</option>
                    <option value="trial">⏱️ Prueba Temporal</option>
                    <option value="monthly">📅 Mensual</option>
                  </select>
                </div>

                {isTrial && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: "11px", fontWeight: "700", color: "#fbbf24" }}>Minutos de Prueba:</label>
                    <select
                      value={trialMinutes}
                      onChange={(e) => setTrialMinutes(Number(e.target.value))}
                      style={{ background: "#0d0b18", border: "1.5px solid #f59e0b", color: "#fbbf24", padding: "7px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold" }}
                    >
                      <option value={10}>⏳ 10 Min</option>
                      <option value={15}>⏳ 15 Min</option>
                      <option value={30}>⏳ 30 Min</option>
                      <option value={60}>⏳ 1 Hora</option>
                    </select>
                  </div>
                )}

                {newLicenseType === "monthly" && !isTrial && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: "11px", fontWeight: "700", color: "#60a5fa" }}>Vencimiento:</label>
                    <input
                      type="date"
                      value={newExpiryDate}
                      onChange={(e) => setNewExpiryDate(e.target.value)}
                      required={newLicenseType === "monthly"}
                      style={{ background: "#0d0b18", border: "1.5px solid #332b56", color: "white", padding: "7px 10px", borderRadius: "8px", fontSize: "12px" }}
                    />
                  </div>
                )}

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#a78bfa" }}>Estado:</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    style={{ background: "#0d0b18", border: "1.5px solid #332b56", color: "white", padding: "7px 10px", borderRadius: "8px", fontSize: "12px" }}
                  >
                    <option value="active">✅ Activa</option>
                    <option value="suspended">⏸️ Suspendida</option>
                    <option value="revoked">🚫 Revocada</option>
                  </select>
                </div>
              </div>

              {/* FILA 2.5: Hardware ID (HWID / PC del Cliente) */}
              <div style={{
                marginBottom: "12px",
                background: "rgba(14, 9, 28, 0.6)",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid rgba(162,89,255,0.2)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#c4b5fd" }}>
                    💻 Hardware ID (HWID / PC Vinculada):
                  </label>
                  {newHwid && (
                    <button
                      type="button"
                      onClick={() => setNewHwid("")}
                      style={{ background: "rgba(239,68,68,0.2)", border: "1px solid #ef4444", color: "#fca5a5", fontSize: "10px", padding: "2px 8px", borderRadius: "4px", cursor: "pointer" }}
                    >
                      🔓 Desvincular PC
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <input
                    type="text"
                    value={newHwid}
                    onChange={(e) => setNewHwid(e.target.value)}
                    placeholder="El PandaStore Launcher la vincula automáticamente, o escribe/pega el HWID aquí..."
                    style={{ padding: "8px 10px", fontSize: "11px", background: "#0d0b18", border: "1.5px solid #332b56", color: "#34d399", borderRadius: "8px", flex: 1, fontFamily: "monospace" }}
                  />
                  {(() => {
                    const normEmail = (newEmail || "").toLowerCase().trim();
                    const knownList = clientKnownHwids[normEmail];
                    const firstKnown = knownList && knownList.length > 0 ? knownList[0] : null;
                    if (firstKnown && firstKnown !== newHwid) {
                      return (
                        <button
                          type="button"
                          onClick={() => setNewHwid(firstKnown)}
                          style={{
                            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            whiteSpace: "nowrap"
                          }}
                          title={`Asignar el PC ya conocido de este cliente (${firstKnown})`}
                        >
                          🔗 Usar PC Conocido
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div style={{ fontSize: "10px", color: "#9a97b0", marginTop: "4px" }}>
                  {newHwid ? "🔒 Clave vinculada a este equipo." : "⏳ Clave sin PC vinculada. Se auto-vinculará al abrir el Launcher del cliente o puedes asignarla arriba."}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "#c4b5fd" }}>Seleccionar Juegos Autorizados ({isAllGames ? "TODOS" : `${selectedGameIds.length} seleccionados`}):</label>
                
                <label className="picker-badge-all" style={{ marginBottom: "10px" }}>
                  <input
                    type="checkbox"
                    checked={isAllGames}
                    onChange={(e) => {
                      setIsAllGames(e.target.checked);
                      if (e.target.checked) setSelectedGameIds([]);
                    }}
                  />
                  <span>⭐ ACCESO TOTAL A TODOS LOS JUEGOS (*)</span>
                </label>

                {/* ── PANEL DEDICADO: JUEGOS ASIGNADOS A ESTA LICENCIA ── */}
                <div style={{
                  marginBottom: "12px",
                  background: "linear-gradient(135deg, rgba(20, 16, 36, 0.95), rgba(15, 23, 42, 0.95))",
                  border: "1.5px solid rgba(168, 85, 247, 0.35)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "800", color: "#c4b5fd" }}>
                        🎯 Juegos Asignados a esta Clave:
                      </span>
                      <span style={{
                        background: isAllGames ? "#10b981" : selectedGameIds.length > 0 ? "#7c3aed" : "#ef4444",
                        color: "#fff",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "700"
                      }}>
                        {isAllGames ? "TODOS (*)" : `${selectedGameIds.length} juegos`}
                      </span>
                    </div>

                    {!isAllGames && selectedGameIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGameIds([]);
                          setSelectedDlcIds([]);
                        }}
                        style={{
                          background: "rgba(239, 68, 68, 0.15)",
                          color: "#f87171",
                          border: "1px solid rgba(239, 68, 68, 0.35)",
                          borderRadius: "6px",
                          padding: "3px 8px",
                          fontSize: "11px",
                          cursor: "pointer",
                          fontWeight: "600"
                        }}
                        title="Desasignar todos los juegos de esta clave"
                      >
                        🗑️ Quitar todos
                      </button>
                    )}
                  </div>

                  {isAllGames ? (
                    <div style={{
                      background: "rgba(16, 185, 129, 0.12)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      color: "#6ee7b7",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <span style={{ fontSize: "18px" }}>⭐</span>
                      <div>
                        <strong>ACCESO TOTAL PERMANENTE:</strong> El cliente puede descargar y activar cualquier juego del catálogo global de PandaStore sin restricciones.
                      </div>
                    </div>
                  ) : selectedGameIds.length === 0 ? (
                    <div style={{
                      background: "rgba(245, 158, 11, 0.08)",
                      border: "1px dashed rgba(245, 158, 11, 0.35)",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      color: "#fcd34d",
                      fontSize: "12px",
                      textAlign: "center"
                    }}>
                      ⚠️ <strong>Sin juegos asignados.</strong> Marca los juegos abajo en la lista o usa los botones rápidos para asociar juegos a esta clave.
                    </div>
                  ) : (
                    <div style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                      maxHeight: "150px",
                      overflowY: "auto",
                      padding: "4px 2px"
                    }}>
                      {selectedGameIds.map((gid) => {
                        const strGid = String(gid);
                        const gObj = games.find(g =>
                          String(g.app_id || g.id) === strGid ||
                          String(g.id) === strGid ||
                          (g.name && g.name.toLowerCase() === strGid.toLowerCase())
                        );
                        const displayName = gObj ? gObj.name : strGid;
                        const displayAppId = gObj ? (gObj.app_id || gObj.id) : strGid;
                        const hasDlc = Array.isArray(selectedDlcIds) && (
                          selectedDlcIds.map(String).includes(displayAppId) ||
                          (gObj && Array.isArray(gObj.dlcIds) && gObj.dlcIds.some(d => selectedDlcIds.map(String).includes(String(d))))
                        );

                        return (
                          <div
                            key={strGid}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              background: hasDlc
                                ? "linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.3))"
                                : "linear-gradient(135deg, rgba(123, 47, 242, 0.25), rgba(59, 130, 246, 0.25))",
                              border: hasDlc ? "1px solid #10b981" : "1px solid rgba(168, 85, 247, 0.45)",
                              borderRadius: "8px",
                              padding: "4px 10px",
                              fontSize: "11.5px",
                              color: "#f9fafb",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                            }}
                          >
                            <span>🎮 <strong>{displayName}</strong> <span style={{ opacity: 0.6, fontSize: "10px" }}>({displayAppId})</span> {hasDlc && <span style={{ color: "#34d399", fontWeight: "bold" }}>+ 📦 DLCs</span>}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedGameIds(prev => prev.filter(x => {
                                  const s = String(x);
                                  return s !== strGid && s !== displayAppId && (!gObj || s.toLowerCase() !== gObj.name.toLowerCase());
                                }));
                                if (gObj && Array.isArray(gObj.dlcIds)) {
                                  const dlcSet = new Set(gObj.dlcIds.map(String));
                                  setSelectedDlcIds(prev => prev.filter(d => !dlcSet.has(String(d)) && String(d) !== displayAppId));
                                }
                              }}
                              style={{
                                background: "rgba(255,255,255,0.15)",
                                border: "none",
                                color: "#ff7b72",
                                borderRadius: "50%",
                                width: "16px",
                                height: "16px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "10px",
                                cursor: "pointer",
                                padding: 0,
                                fontWeight: "bold"
                              }}
                              title="Quitar este juego"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {!isAllGames && (
                  <div className="game-picker-box">
                    <div className="offer-quick-buttons" style={{ display: "flex", gap: "6px", marginBottom: "10px", background: "rgba(123,47,242,0.12)", padding: "8px 12px", borderRadius: "10px", border: "1px solid rgba(162,89,255,0.3)", flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: "#34d399", fontWeight: "800", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        ⚡ Solo LUA:
                      </span>
                      <button
                        type="button"
                        style={{ background: "#2563eb", color: "#fff", border: "none", padding: "5px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                        onClick={() => selectRandomGames(100)}
                        title="Selecciona 100 juegos estrictamente Solo Lua sin Denuvo ni Fixes"
                      >
                        🎲 100
                      </button>
                      <button
                        type="button"
                        style={{ background: "#7c3aed", color: "#fff", border: "none", padding: "5px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                        onClick={() => selectRandomGames(200)}
                        title="Selecciona 200 juegos estrictamente Solo Lua sin Denuvo ni Fixes"
                      >
                        🎲 200
                      </button>
                      <button
                        type="button"
                        style={{ background: "#db2777", color: "#fff", border: "none", padding: "5px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                        onClick={() => selectRandomGames(300)}
                        title="Selecciona 300 juegos estrictamente Solo Lua sin Denuvo ni Fixes"
                      >
                        🎲 300
                      </button>
                      <button
                        type="button"
                        style={{ background: "#059669", color: "#fff", border: "none", padding: "5px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                        onClick={() => selectRandomGames(400)}
                        title="Selecciona 400 juegos estrictamente Solo Lua sin Denuvo ni Fixes"
                      >
                        🎲 400
                      </button>
                      <span style={{ fontSize: "10px", color: "#9ca3af", marginLeft: "auto" }}>
                        🔒 Filtrado: sin Denuvo ni Fixes
                      </span>
                    </div>



                    <div className="game-picker-toolbar" style={{ flexWrap: "wrap", gap: "8px" }}>
                      <input
                        type="text"
                        placeholder="Buscar juego por nombre o AppID..."
                        value={pickerSearch}
                        onChange={(e) => { setPickerSearch(e.target.value); setPickerVisibleLimit(40); }}
                        className="picker-search-input"
                      />
                      <div className="picker-filter-group" style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="picker-btn-small"
                          style={{ background: pickerFilter === "all" ? "#7b2ff2" : "rgba(255,255,255,0.1)", color: "#fff", fontWeight: "bold" }}
                          onClick={() => setPickerFilter("all")}
                        >
                          🌐 Todos ({games.length})
                        </button>
                        <button
                          type="button"
                          className="picker-btn-small"
                          style={{ background: pickerFilter === "with_dlcs" ? "#10b981" : "rgba(255,255,255,0.1)", color: "#fff", fontWeight: "bold" }}
                          onClick={() => setPickerFilter("with_dlcs")}
                        >
                          🎁 Con DLCs ({countWithDlcs})
                        </button>
                        <button
                          type="button"
                          className="picker-btn-small"
                          style={{ background: pickerFilter === "base_only" ? "#6366f1" : "rgba(255,255,255,0.1)", color: "#fff", fontWeight: "bold" }}
                          onClick={() => setPickerFilter("base_only")}
                        >
                          🎮 Solo Base ({countSoloBase})
                        </button>
                        <button
                          type="button"
                          className="picker-btn-small"
                          style={{ background: pickerFilter === "lua_only" ? "#f59e0b" : "rgba(255,255,255,0.1)", color: "#fff", fontWeight: "bold" }}
                          onClick={() => setPickerFilter("lua_only")}
                        >
                          📄 Solo LUA ({countLuaOnly})
                        </button>
                        <button
                          type="button"
                          className="picker-btn-small"
                          style={{ background: pickerFilter === "with_fix" ? "#3b82f6" : "rgba(255,255,255,0.1)", color: "#fff", fontWeight: "bold" }}
                          onClick={() => setPickerFilter("with_fix")}
                        >
                          🔧 LUA + FIX ({countFix})
                        </button>
                        <button
                          type="button"
                          className="picker-btn-small"
                          style={{ background: pickerFilter === "bypass" ? "#ec4899" : "rgba(255,255,255,0.1)", color: "#fff", fontWeight: "bold" }}
                          onClick={() => setPickerFilter("bypass")}
                        >
                          ⚡ BYPASS ({countBypass})
                        </button>
                        <button
                          type="button"
                          className="picker-btn-small"
                          style={{ background: pickerFilter === "denuvo_steam" ? "#8b5cf6" : "rgba(255,255,255,0.1)", color: "#fff", fontWeight: "bold" }}
                          onClick={() => setPickerFilter("denuvo_steam")}
                        >
                          🔑 Steam Denuvo ({countSteamDenuvo})
                        </button>
                        <button
                          type="button"
                          className="picker-btn-small"
                          style={{ background: pickerFilter === "denuvo_ubisoft" ? "#0284c7" : "rgba(255,255,255,0.1)", color: "#fff", fontWeight: "bold" }}
                          onClick={() => setPickerFilter("denuvo_ubisoft")}
                        >
                          🦅 Ubisoft VIP ({countUbisoftDenuvo})
                        </button>
                        <button
                          type="button"
                          className="picker-btn-small"
                          style={{ background: pickerFilter === "denuvo_ea" ? "#ea580c" : "rgba(255,255,255,0.1)", color: "#fff", fontWeight: "bold" }}
                          onClick={() => setPickerFilter("denuvo_ea")}
                        >
                          ⚽ EA Play VIP ({countEADenuvo})
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", width: "100%", marginTop: "4px", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "#c4b5fd", fontWeight: "bold" }}>Ver solo saga:</span>
                        <button
                          type="button"
                          className="picker-btn-small"
                          style={{ background: pickerSagaFilter === "all" ? "#7b2ff2" : "rgba(255,255,255,0.08)", color: "#fff" }}
                          onClick={() => setPickerSagaFilter("all")}
                        >
                          Todas
                        </button>
                        {SAGA_PRESETS.map(s => {
                          const sCount = sagaCounts[s.id] || 0;
                          if (sCount === 0) return null;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              className="picker-btn-small"
                              style={{
                                background: pickerSagaFilter === s.id ? s.color : "rgba(255,255,255,0.06)",
                                color: "#fff",
                                fontWeight: pickerSagaFilter === s.id ? "bold" : "normal"
                              }}
                              onClick={() => setPickerSagaFilter(pickerSagaFilter === s.id ? "all" : s.id)}
                            >
                              {s.icon} {s.name} ({sCount})
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", width: "100%", marginTop: "6px", alignItems: "center" }}>
                        <button
                          type="button"
                          className="picker-btn-small"
                          onClick={() => setSelectedGameIds(games.map(g => g.app_id || g.id))}
                        >
                          ☑️ Marcar Todos
                        </button>
                        <button
                          type="button"
                          className="picker-btn-small"
                          onClick={() => setSelectedGameIds([])}
                        >
                          ⏹️ Limpiar
                        </button>
                        <button
                          type="button"
                          className="picker-btn-small"
                          onClick={() => {
                            const newDlcs = new Set(selectedDlcIds);
                            selectedGameIds.forEach(gid => {
                              const g = games.find(game => String(game.app_id || game.id) === String(gid));
                              if (g) {
                                newDlcs.add(String(gid));
                                if (Array.isArray(g.dlcIds)) {
                                  g.dlcIds.forEach(did => newDlcs.add(String(did)));
                                }
                              }
                            });
                            setSelectedDlcIds(Array.from(newDlcs));
                          }}
                          style={{ background: "rgba(16, 185, 129, 0.2)", border: "1px solid #10b981", color: "#a7f3d0", fontWeight: "bold" }}
                          title="Activa todos los DLCs a los juegos que tengas marcados actualmente"
                        >
                          🎁 Activar Base + DLCs a seleccionados
                        </button>
                        <button
                          type="button"
                          className="picker-btn-small"
                          onClick={() => {
                            const dlcsToRemove = new Set(selectedGameIds.map(String));
                            selectedGameIds.forEach(gid => {
                              const g = games.find(game => String(game.app_id || game.id) === String(gid));
                              if (g && Array.isArray(g.dlcIds)) {
                                g.dlcIds.forEach(did => dlcsToRemove.add(String(did)));
                              }
                            });
                            setSelectedDlcIds(selectedDlcIds.filter(id => !dlcsToRemove.has(String(id))));
                          }}
                          style={{ background: "rgba(255, 255, 255, 0.08)", color: "#c4b5fd" }}
                          title="Deja solo juego base (quita los DLCs de los seleccionados)"
                        >
                          🎮 Solo Base a seleccionados
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: "6px", alignItems: "center", width: "100%", marginTop: "8px" }}>
                        <input
                          type="text"
                          placeholder="➕ ¿No lo encuentras? Escribe AppID o nombre (ej: 16425677 o FIFA 26)..."
                          id="quick-add-game-input"
                          className="picker-search-input"
                          style={{ flex: 1, padding: "5px 10px", fontSize: "11px" }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const val = e.currentTarget.value.trim();
                              if (!val) return;
                              const cleanVal = val.toLowerCase().replace(/[^a-z0-9]/g, "");
                              const found = games.find(g => 
                                String(g.app_id || g.id) === val || 
                                (g.name && g.name.toLowerCase().includes(val.toLowerCase())) ||
                                (g._search && (g._search.includes(val.toLowerCase()) || (cleanVal && g._search.includes(cleanVal))))
                              );
                              const toAdd = found ? String(found.app_id || found.id) : val;
                              if (!selectedGameIds.includes(toAdd)) {
                                setSelectedGameIds(prev => [...prev, toAdd]);
                              }
                              e.currentTarget.value = "";
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="picker-btn-small"
                          style={{ background: "#7c3aed", color: "#fff", fontWeight: "bold", padding: "5px 10px" }}
                          onClick={() => {
                            const input = document.getElementById("quick-add-game-input");
                            const val = input ? input.value.trim() : "";
                            if (!val) return;
                            const cleanVal = val.toLowerCase().replace(/[^a-z0-9]/g, "");
                            const found = games.find(g => 
                              String(g.app_id || g.id) === val || 
                              (g.name && g.name.toLowerCase().includes(val.toLowerCase())) ||
                              (g._search && (g._search.includes(val.toLowerCase()) || (cleanVal && g._search.includes(cleanVal))))
                            );
                            const toAdd = found ? String(found.app_id || found.id) : val;
                            if (!selectedGameIds.includes(toAdd)) {
                              setSelectedGameIds(prev => [...prev, toAdd]);
                            }
                            if (input) input.value = "";
                          }}
                        >
                          ➕ Asignar a Clave
                        </button>
                      </div>
                    </div>

                    {/* ── LISTA DE JUEGOS OPTIMIZADA CON SELECTOR GRANULAR DE DLCS ── */}
                    {(() => {
                      const visible = filteredPickerGames.slice(0, pickerVisibleLimit);
                      const hasMore = filteredPickerGames.length > pickerVisibleLimit;

                      return (
                        <>
                          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: 6, textAlign: "right" }}>
                            {filteredPickerGames.length === 0 ? "Sin resultados" : `Mostrando ${Math.min(pickerVisibleLimit, filteredPickerGames.length)} de ${filteredPickerGames.length} juegos`}
                          </div>
                          <div className="game-picker-list">
                            {visible.map(g => {
                              const appId = String(g.app_id || g.id);
                              const docId = String(g.id);
                              const gNameNorm = (g.name || "").toLowerCase().replace(/[^a-z0-9]/g, '');
                              const isChecked = selectedGameIds.some(sel => {
                                const s = String(sel).trim();
                                if (s === appId || s === docId) return true;
                                const sNorm = s.toLowerCase().replace(/[^a-z0-9]/g, '');
                                return sNorm && (sNorm === gNameNorm || (gNameNorm.length > 5 && (sNorm.includes(gNameNorm) || gNameNorm.includes(sNorm))));
                              });
                              const gDlcs = Array.isArray(g.dlcs) ? g.dlcs : [];
                              const gDlcIds = Array.isArray(g.dlcIds) ? g.dlcIds : [];
                              const selectedDlcsForGame = gDlcs.filter(d => selectedDlcIds.map(String).includes(String(d.dlc_app_id)));
                              const selectedDlcCount = selectedDlcsForGame.length;
                              const hasAllDlcs = g.dlcsCount > 0 && selectedDlcCount === g.dlcsCount;
                              const hasSomeDlcs = selectedDlcCount > 0 && !hasAllDlcs;
                              const isExpanded = expandedDlcGameId === appId;

                              const isUbi = isUbisoftVipGame(g);
                              const isEA = isEaVipGame(g);
                              const isDen = isUbi || isEA || g.technical_category === "denuvo" || Boolean(g.isDenuvoActivation);

                              return (
                                <div
                                  key={g.id}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "6px",
                                    padding: "9px 12px",
                                    background: isChecked ? "rgba(123, 47, 242, 0.14)" : "rgba(255,255,255,0.03)",
                                    border: isChecked ? "1px solid #7b2ff2" : "1px solid rgba(255,255,255,0.07)",
                                    borderRadius: "10px",
                                    marginBottom: "6px"
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                    <label
                                      className="game-picker-item"
                                      style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", margin: 0, padding: 0, border: "none", background: "none", flex: 1, minWidth: 0 }}
                                      onClick={(e) => { e.preventDefault(); toggleSelectGame(appId); }}
                                    >
                                      <input type="checkbox" checked={isChecked} onChange={() => {}} />
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                          <span style={{ fontWeight: 700, color: "#fff", fontSize: "13px" }}>{g.name}</span>
                                          {g.hasDlcs ? (
                                            <span style={{
                                              fontSize: "10px",
                                              background: "rgba(16, 185, 129, 0.2)",
                                              color: "#34d399",
                                              border: "1px solid rgba(16, 185, 129, 0.4)",
                                              padding: "1px 6px",
                                              borderRadius: "4px",
                                              fontWeight: 800
                                            }}>
                                              🎁 {g.dlcsCount} DLCs
                                            </span>
                                          ) : (
                                            <span style={{
                                              fontSize: "10px",
                                              background: "rgba(255, 255, 255, 0.08)",
                                              color: "#94a3b8",
                                              padding: "1px 6px",
                                              borderRadius: "4px"
                                            }}>
                                              🎮 Solo Base
                                            </span>
                                          )}
                                          {isDen && (
                                            <span style={{
                                              fontSize: "10px",
                                              background: isUbi ? "rgba(2,132,199,0.25)" : isEA ? "rgba(234,88,12,0.25)" : "rgba(168,85,247,0.25)",
                                              color: isUbi ? "#38bdf8" : isEA ? "#fb923c" : "#c084fc",
                                              border: `1px solid ${isUbi ? "#0284c7" : isEA ? "#ea580c" : "#a855f7"}`,
                                              padding: "1px 5px", borderRadius: "4px", fontWeight: "bold"
                                            }}>
                                              {isUbi ? "🦅 Ubisoft" : isEA ? "⚽ EA Play" : "🔑 Denuvo"}
                                            </span>
                                          )}
                                        </div>
                                        <div className="picker-game-appid" style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                                          AppID: {appId}
                                        </div>
                                      </div>
                                    </label>
                                  </div>

                                  {/* BOTONES DIRECTOS: SOLO BASE vs BASE + TODOS LOS DLCS vs ELEGIR DLCS */}
                                  {g.hasDlcs && (
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingLeft: "26px", paddingTop: "2px", flexWrap: "wrap" }}>
                                      {/* Botón Solo Base */}
                                      <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setGameBaseOnly(appId, gDlcIds); }}
                                        style={{
                                          display: "inline-flex", alignItems: "center", gap: "4px",
                                          padding: "3px 9px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer",
                                          background: (isChecked && selectedDlcCount === 0) ? "rgba(162, 89, 255, 0.25)" : "rgba(255, 255, 255, 0.05)",
                                          color: (isChecked && selectedDlcCount === 0) ? "#c4b5fd" : "#94a3b8",
                                          border: (isChecked && selectedDlcCount === 0) ? "1.5px solid #a259ff" : "1px solid rgba(255, 255, 255, 0.12)"
                                        }}
                                        title="Autoriza únicamente el juego base sin DLCs"
                                      >
                                        🎮 Solo Base {(isChecked && selectedDlcCount === 0) ? "✓" : ""}
                                      </button>

                                      {/* Botón Base + Todos los DLCs */}
                                      <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleGameWithAllDlcs(appId, gDlcIds); }}
                                        style={{
                                          display: "inline-flex", alignItems: "center", gap: "4px",
                                          padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer",
                                          background: hasAllDlcs ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(255, 255, 255, 0.06)",
                                          color: hasAllDlcs ? "#ffffff" : "#94a3b8",
                                          border: hasAllDlcs ? "1.5px solid #34d399" : "1px solid rgba(255, 255, 255, 0.15)",
                                          boxShadow: hasAllDlcs ? "0 0 10px rgba(16, 185, 129, 0.3)" : "none",
                                          transition: "all 0.15s ease"
                                        }}
                                        title="Autoriza el juego base y desbloquea todos sus DLCs en el Launcher"
                                      >
                                        🎁 Base + Todos ({g.dlcsCount}) {hasAllDlcs ? "✅" : ""}
                                      </button>

                                      {/* Botón Elegir DLCs específicos */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setExpandedDlcGameId(prev => prev === appId ? null : appId);
                                          setDlcSearch("");
                                        }}
                                        style={{
                                          display: "inline-flex", alignItems: "center", gap: "4px",
                                          padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer",
                                          background: hasSomeDlcs ? "rgba(59, 130, 246, 0.25)" : (isExpanded ? "rgba(162, 89, 255, 0.2)" : "rgba(255, 255, 255, 0.06)"),
                                          color: hasSomeDlcs ? "#60a5fa" : (isExpanded ? "#c4b5fd" : "#cbd5e1"),
                                          border: hasSomeDlcs ? "1.5px solid #3b82f6" : (isExpanded ? "1.5px solid #a259ff" : "1px solid rgba(255, 255, 255, 0.15)"),
                                          transition: "all 0.15s ease"
                                        }}
                                        title="Abre el selector para marcar o desmarcar DLCs específicos uno a uno"
                                      >
                                        📋 Elegir DLCs {selectedDlcCount > 0 ? `(${selectedDlcCount}/${g.dlcsCount})` : `(${g.dlcsCount})`} {isExpanded ? "▴" : "▾"}
                                      </button>

                                      {hasSomeDlcs && (
                                        <span style={{ fontSize: "10.5px", color: "#60a5fa", fontWeight: 700 }}>
                                          ✓ {selectedDlcCount} de {g.dlcsCount} DLCs seleccionados
                                        </span>
                                      )}
                                      {hasAllDlcs && (
                                        <span style={{ fontSize: "10.5px", color: "#34d399", fontWeight: 800 }}>
                                          ✓ Todos los {g.dlcsCount} DLCs incluidos en clave
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* DRAWER EXPANDIBLE: SELECTOR GRANULAR DE DLCS */}
                                  {g.hasDlcs && isExpanded && (
                                    <div className="admin-dlc-drawer" style={{
                                      marginTop: "8px",
                                      marginLeft: "26px",
                                      background: "rgba(10, 5, 20, 0.95)",
                                      border: "1.5px solid rgba(162, 89, 255, 0.4)",
                                      borderRadius: "10px",
                                      padding: "10px 12px",
                                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)"
                                    }}>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "6px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                          <span style={{ fontSize: "12px", fontWeight: 800, color: "#e2e8f0" }}>
                                            📦 DLCs Oficiales ({g.dlcsCount})
                                          </span>
                                          <span style={{
                                            fontSize: "10.5px",
                                            fontWeight: 700,
                                            background: selectedDlcCount > 0 ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.08)",
                                            color: selectedDlcCount > 0 ? "#34d399" : "#94a3b8",
                                            padding: "2px 8px",
                                            borderRadius: "12px",
                                            border: selectedDlcCount > 0 ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(255,255,255,0.1)"
                                          }}>
                                            {selectedDlcCount} seleccionados
                                          </span>
                                        </div>

                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                          <button
                                            type="button"
                                            onClick={() => selectAllDlcsForGame(appId, gDlcIds)}
                                            style={{ background: "rgba(16, 185, 129, 0.2)", border: "1px solid rgba(16, 185, 129, 0.5)", color: "#6ee7b7", padding: "2px 8px", borderRadius: "5px", fontSize: "10.5px", fontWeight: "bold", cursor: "pointer" }}
                                          >
                                            ☑️ Marcar todos
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => clearDlcsForGame(appId, gDlcIds)}
                                            style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5", padding: "2px 8px", borderRadius: "5px", fontSize: "10.5px", fontWeight: "bold", cursor: "pointer" }}
                                          >
                                            ⏹️ Desmarcar todos
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setExpandedDlcGameId(null)}
                                            style={{ background: "rgba(255, 255, 255, 0.08)", border: "none", color: "#cbd5e1", padding: "2px 8px", borderRadius: "5px", fontSize: "10.5px", cursor: "pointer" }}
                                          >
                                            ✕ Cerrar
                                          </button>
                                        </div>
                                      </div>

                                      {g.dlcsCount > 5 && (
                                        <div style={{ marginBottom: "8px" }}>
                                          <input
                                            type="text"
                                            placeholder="Filtrar DLCs por nombre o AppID..."
                                            value={dlcSearch}
                                            onChange={(e) => setDlcSearch(e.target.value)}
                                            style={{
                                              width: "100%",
                                              background: "rgba(255,255,255,0.06)",
                                              border: "1px solid rgba(255,255,255,0.12)",
                                              borderRadius: "6px",
                                              color: "#fff",
                                              padding: "5px 10px",
                                              fontSize: "11px"
                                            }}
                                          />
                                        </div>
                                      )}

                                      <div style={{
                                        maxHeight: "240px",
                                        overflowY: "auto",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "4px",
                                        paddingRight: "4px"
                                      }}>
                                        {gDlcs
                                          .filter(d => {
                                            if (!dlcSearch.trim()) return true;
                                            const q = dlcSearch.toLowerCase().trim();
                                            return (d.name || "").toLowerCase().includes(q) || String(d.dlc_app_id).includes(q);
                                          })
                                          .map(d => {
                                            const dIdStr = String(d.dlc_app_id);
                                            const isDlcSelected = selectedDlcIds.map(String).includes(dIdStr);

                                            return (
                                              <label
                                                key={dIdStr}
                                                style={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: "8px",
                                                  padding: "6px 8px",
                                                  background: isDlcSelected ? "rgba(123, 47, 242, 0.2)" : "rgba(255, 255, 255, 0.02)",
                                                  border: isDlcSelected ? "1px solid #7b2ff2" : "1px solid rgba(255, 255, 255, 0.05)",
                                                  borderRadius: "6px",
                                                  cursor: "pointer",
                                                  transition: "background 0.15s ease"
                                                }}
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  toggleSpecificDlc(appId, dIdStr);
                                                }}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isDlcSelected}
                                                  onChange={() => {}}
                                                  style={{ cursor: "pointer" }}
                                                />
                                                {d.header_image && (
                                                  <img
                                                    src={d.header_image}
                                                    alt=""
                                                    style={{ width: "36px", height: "20px", objectFit: "cover", borderRadius: "3px" }}
                                                    onError={(e) => { e.target.style.display = "none"; }}
                                                  />
                                                )}
                                                <span style={{ fontSize: "11.5px", fontWeight: isDlcSelected ? 700 : 500, color: isDlcSelected ? "#fff" : "#cbd5e1", flex: 1 }}>
                                                  {d.name}
                                                </span>
                                                <span style={{ fontSize: "10px", color: "#94a3b8", background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: "3px" }}>
                                                  ID: {dIdStr}
                                                </span>
                                              </label>
                                            );
                                          })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {hasMore && (
                            <button
                              type="button"
                              onClick={() => setPickerVisibleLimit(prev => prev + 40)}
                              style={{
                                width: "100%", marginTop: 8, padding: "8px",
                                background: "rgba(123,47,242,0.15)", color: "#c4b5fd",
                                border: "1px solid rgba(123,47,242,0.4)", borderRadius: 8,
                                cursor: "pointer", fontSize: "12px", fontWeight: 700
                              }}
                            >
                              ▼ Ver más ({filteredPickerGames.length - pickerVisibleLimit} restantes)
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowLicenseModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save">
                  Guardar Licencia en Firestore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL JUEGO & FIX DRIVE                                   */}
      {/* ========================================================= */}
      {showGameModal && (
        <div className="modal-overlay" onClick={() => setShowGameModal(false)}>
          <div className="modal-box wide" onClick={(e) => e.stopPropagation()}>
            <h3>🎮 {editingGame ? "Editar Juego / Fix Drive" : "Agregar Juego a Firestore"}</h3>
            <form onSubmit={handleSaveGame}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Steam AppID:</label>
                  <input
                    type="text"
                    value={gameAppId}
                    onChange={(e) => setGameAppId(e.target.value)}
                    placeholder="ej: 1888930"
                    disabled={!!editingGame}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Nombre del Juego:</label>
                  <input
                    type="text"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    placeholder="ej: The Last of Us Part I"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Nombre de la carpeta en <code>steamapps\common\</code>:</label>
                <input
                  type="text"
                  value={gameFolderName}
                  onChange={(e) => setGameFolderName(e.target.value)}
                  placeholder="ej: The Last of Us Part I"
                />
              </div>

              <div className="form-group">
                <label>Enlace Directo URL (Firebase Storage / Web) o ID de Google Drive (Fix / Parche):</label>
                <input
                  type="text"
                  value={gameDriveId}
                  onChange={(e) => setGameDriveId(e.target.value)}
                  placeholder="ej: https://firebasestorage.googleapis.com/.../fix.zip o ID de Google Drive"
                />
                <small className="help-text">
                  Puedes ingresar la URL directa del archivo .zip subido a Firebase Storage, Cloudflare R2, Pixeldrain o un ID de Google Drive.
                </small>
              </div>

              <div className="form-group">
                <label>Contenido del archivo .LUA Activador:</label>
                <textarea
                  rows="4"
                  value={gameLuaContent}
                  onChange={(e) => setGameLuaContent(e.target.value)}
                  placeholder='ej: addappid(1888930, 1, "9a674fb166f2ed6f6a7d9036f014e4b5")'
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowGameModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save">
                  Guardar Configuración en Firestore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
