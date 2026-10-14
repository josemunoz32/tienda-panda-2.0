/**
 * steamCatalogService.js
 * Servicio en Memoria para Catálogo Completo de Steam (70k+ registros / 58k+ juegos base)
 * Conexión directa a API de Ryuk, DLCs oficiales, 55 Sagas, 100 VIPs y Promos Oficiales.
 */

const fs = require('fs');
const path = require('path');

const RYUU_GAMES_URL = 'https://generator.ryuu.lol/files/games.json';
const DLC_PRICE_UNIT = 1000;

// Palabras clave para excluir DLCs/soundtracks/demos del catálogo base
const NON_BASE_KEYWORDS = [
  'soundtrack', 'ost', 'artbook', 'dlc', 'expansion pack', 'bonus content',
  'wallpaper', 'demo', 'playtest', 'dedicated server', 'sdk', 'mod kit', 'add-on',
  'season pass', 'content pack', 'upgrade pack', 'cosmetic', 'skin pack',
  'supporter pack', 'sound track', 'digital artbook', 'original score', 'pre-order bonus'
];

// AppIDs 100% online con servidores dedicados que no funcionan offline
const ONLINE_ONLY_APPIDS = new Set([
  '359320', '578080', '1172470', '252490', '221100', '238960', '2694490',
  '1938090', '381210', '1063730', '552990', '444090', '386360', '2437170',
  '230410', '1085660', '1240440', '2357570', '2073850', '553850', '1599340',
  '204200', '306130', '1284210', '1097150', '730', '570', '440', '20', '240',
  '100', '945360', '1966720', '739630', '1172620', '1962663', '2074920',
  '1203220', '2124440', '582660', '323370', '1808450', '2507950', '1517290',
  '2115240', '1818750', '218230', '359550', '365590', '2221490', '346110',
  '2399830', '440900', '513710', '393380', '686810', '107410', '1151340',
  '594650', '1361210', '2726450', '1489970', '438740', '1493750', '1824220'
]);

const UBISOFT_APP_IDS = new Set(['66088', '1081', '4740', '5266', '6145', '17903', '1771']);

// Popular titles for featured list
const POPULAR_STEAM_APPIDS = [
  '1091500', // Cyberpunk 2077
  '1245620', // ELDEN RING
  '1174180', // Red Dead Redemption 2
  '1086940', // Baldur's Gate 3
  '1817070', // Marvel's Spider-Man Remastered
  '1593500', // God of War
  '812140',  // Assassin's Creed Odyssey
  '883710',  // Resident Evil 2
  '1196590', // Resident Evil Village
  '2050650', // Resident Evil 4 Remake
  '601150',  // Devil May Cry 5
  '1145360', // Hades
  '367520',  // Hollow Knight
  '413150',  // Stardew Valley
  '292030',  // The Witcher 3: Wild Hunt
  '582010',  // Monster Hunter: World
  '1446780', // Monster Hunter Rise
  '990080',  // Hogwarts Legacy
  '730',     // (Fallback)
  '1332010', // Stray
  '1238810', // Battlefield V
  '1172380', // STAR WARS Jedi: Fallen Order
  '1774580', // STAR WARS Jedi: Survivor
  '1687950'  // Persona 5 Royal
];

class SteamCatalogService {
  constructor() {
    this.rawCatalog = [];
    this.baseGames = [];
    this.gamesByAppId = new Map();
    this.sagas = [];
    this.vipGames = [];
    this.promotions = [];
    this.isLoaded = false;
    this.isLoading = false;
    this.lastUpdated = null;
  }

  async init() {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      this.loadStaticData();
      await this.refreshRyuuCatalog();

      // Refresco silencioso cada 24 horas en segundo plano
      setInterval(() => {
        this.refreshRyuuCatalog().catch(err => console.error('[SteamService] Error en refresco automático:', err));
      }, 24 * 60 * 60 * 1000);

      this.isLoaded = true;
      console.log(`[SteamService] ✅ Inicializado con éxito. ${this.baseGames.length} juegos base listos.`);
    } catch (err) {
      console.error('[SteamService] Error inicializando:', err);
    } finally {
      this.isLoading = false;
    }
  }

  loadStaticData() {
    // 1. Cargar Sagas (Sin imágenes, solo nombre, precio, juegos incluidos y vipExtras)
    try {
      const sagasPath = path.join(__dirname, '../data/sagasData.json');
      if (fs.existsSync(sagasPath)) {
        const rawSagas = JSON.parse(fs.readFileSync(sagasPath, 'utf8'));
        this.sagas = rawSagas.map(s => ({
          key: s.key,
          name: s.name,
          priceCLP: Number(s.priceCLP) || 4990,
          games: Array.isArray(s.games) ? s.games : [],
          vipExtras: Array.isArray(s.vipExtras) ? s.vipExtras : []
        }));
      }
    } catch (e) {
      console.warn('[SteamService] No se pudo cargar sagasData.json:', e.message);
    }

    // 2. Cargar VIP Games (100 juegos VIP organizados por Ubisoft / EA Sports / Normal)
    try {
      const vipsPath = path.join(__dirname, '../data/vipGamesData.json');
      if (fs.existsSync(vipsPath)) {
        const rawVips = JSON.parse(fs.readFileSync(vipsPath, 'utf8'));
        this.vipGames = rawVips.map(v => {
          const appId = String(v.app_id || '').trim();
          const name = v.name || '';
          const price = Number(v.priceCLP) || 8000;
          const platform = v.platform || 'Steam';

          const isEA = platform === 'EA' || price >= 15000 || name.toLowerCase().includes('ea sports');
          const isUbisoft = !isEA && (platform === 'Ubisoft' || price === 12000 || UBISOFT_APP_IDS.has(appId));

          let category = 'vip_normal';
          let extraInVipPack = 0;

          if (isEA) {
            category = 'ea_sports';
            extraInVipPack = 5000;
          } else if (isUbisoft) {
            category = 'ubisoft';
            extraInVipPack = 3000;
          }

          return {
            id: v.id || `vip-${appId}`,
            app_id: appId,
            name: name,
            priceCLP: price,
            platform: platform,
            category: category,
            extraInVipPack: extraInVipPack,
            imageUrl: appId
              ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`
              : (v.imageUrl || ''),
            verticalImageUrl: appId
              ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900_2x.jpg`
              : ''
          };
        });
      }
    } catch (e) {
      console.warn('[SteamService] No se pudo cargar vipGamesData.json:', e.message);
    }

    // 3. Promociones y Packs Oficiales
    this.promotions = [
      {
        key: 'promo-estreno-vip',
        name: 'Pack Juegos VIP',
        shortName: '⭐ Pack VIP',
        subtitle: '1 Estreno VIP + 2 Juegos Estándar de Regalo',
        priceCLP: 8000,
        count: 3,
        isVipPromo: true,
        rules: {
          basePriceCLP: 8000,
          vipIncludedCount: 1,
          bonusNormalGamesCount: 2,
          standardVipExtraCLP: 0,
          ubisoftExtraCLP: 3000,
          eaSportsExtraCLP: 5000
        }
      },
      {
        key: 'promo-steam-3x',
        name: 'Pack 3X Steam',
        shortName: 'Pack 3X',
        subtitle: 'Elige 3 juegos estándar a elección',
        priceCLP: 4990,
        count: 3,
        isCustomChoose: true
      },
      {
        key: 'promo-steam-5x',
        name: 'Pack 5X Steam',
        shortName: 'Pack 5X',
        subtitle: 'Elige 5 juegos estándar a elección',
        priceCLP: 6990,
        count: 5,
        isCustomChoose: true
      },
      {
        key: 'promo-steam-10x',
        name: 'Pack 10X Steam',
        shortName: 'Pack 10X',
        subtitle: 'Elige 10 juegos estándar a elección',
        priceCLP: 9990,
        count: 10,
        isCustomChoose: true
      },
      {
        key: 'promo-steam-23x',
        name: 'Pack 23X Steam',
        shortName: 'Pack 23X',
        subtitle: 'Elige 23 juegos estándar a elección',
        priceCLP: 17990,
        count: 23,
        isCustomChoose: true
      }
    ];
  }

  async refreshRyuuCatalog() {
    console.log('[SteamService] 🔄 Descargando catálogo de Ryuk API (games.json)...');
    const localBackupPath = path.join(__dirname, '../data/ryuu_games_backup.json');

    try {
      const response = await fetch(RYUU_GAMES_URL, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        this.rawCatalog = data;
        // Guardar respaldo local asíncrono
        fs.writeFile(localBackupPath, JSON.stringify(data), () => {});
      }
    } catch (err) {
      console.warn(`[SteamService] Advertencia al descargar de Ryuk: ${err.message}. Intentando respaldo local...`);
      if (fs.existsSync(localBackupPath)) {
        this.rawCatalog = JSON.parse(fs.readFileSync(localBackupPath, 'utf8'));
      }
    }

    if (!Array.isArray(this.rawCatalog) || this.rawCatalog.length === 0) {
      console.warn('[SteamService] El catálogo está vacío.');
      return;
    }

    // Indexación en Memoria para búsquedas instantáneas
    const newBaseGames = [];
    const newMap = new Map();

    for (const item of this.rawCatalog) {
      const appIdStr = String(item.appid || item.app_id || '');
      if (!appIdStr) continue;

      newMap.set(appIdStr, item);

      const type = (item.type || '').toLowerCase();
      const name = (item.name || '').trim();
      const nameLower = name.toLowerCase();

      // Filtrar para obtener juegos base limpios
      if (type && type !== 'game') continue;
      if (ONLINE_ONLY_APPIDS.has(appIdStr)) continue;
      if (NON_BASE_KEYWORDS.some(kw => nameLower.includes(kw))) continue;

      const dlcCount = item.dlc && typeof item.dlc === 'object' ? Object.keys(item.dlc).length : 0;

      newBaseGames.push({
        app_id: appIdStr,
        name: name,
        priceCLP: 2000,
        imageUrl: item.header_image || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appIdStr}/header.jpg`,
        verticalImageUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appIdStr}/library_600x900_2x.jpg`,
        dlcCount: dlcCount
      });
    }

    // Ordenar alfabéticamente
    newBaseGames.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

    this.baseGames = newBaseGames;
    this.gamesByAppId = newMap;
    this.lastUpdated = new Date().toISOString();

    console.log(`[SteamService] Indexados ${this.baseGames.length} juegos base listos para búsqueda.`);
  }

  // ── MÉTODOS PÚBLICOS DE CONSULTA ───────────────────────────────────────────

  searchGames(queryStr = '', page = 1, limit = 24) {
    const q = String(queryStr || '').trim().toLowerCase();
    let filtered = this.baseGames;

    if (q) {
      filtered = this.baseGames.filter(g =>
        g.name.toLowerCase().includes(q) || g.app_id === q
      );
    }

    const total = filtered.length;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 24));
    const offset = (pageNum - 1) * limitNum;
    const items = filtered.slice(offset, offset + limitNum);

    return {
      query: queryStr,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      games: items
    };
  }

  getFeaturedGames(limit = 24) {
    const featured = [];
    const addedIds = new Set();

    // 1. Priorizar títulos populares
    for (const appId of POPULAR_STEAM_APPIDS) {
      const found = this.baseGames.find(g => g.app_id === appId);
      if (found && !addedIds.has(found.app_id)) {
        featured.push(found);
        addedIds.add(found.app_id);
      }
    }

    // 2. Rellenar si faltan
    for (const g of this.baseGames) {
      if (featured.length >= limit) break;
      if (!addedIds.has(g.app_id)) {
        featured.push(g);
        addedIds.add(g.app_id);
      }
    }

    return featured.slice(0, limit);
  }

  getGameDetails(appId) {
    const idStr = String(appId).trim();
    const raw = this.gamesByAppId.get(idStr);
    const base = this.baseGames.find(g => g.app_id === idStr);

    if (!raw && !base) return null;

    const name = (base && base.name) || (raw && raw.name) || `Game ${idStr}`;
    const dlcs = this.getGameDlcs(idStr);

    return {
      app_id: idStr,
      name: name,
      priceCLP: (base && base.priceCLP) || 2000,
      imageUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${idStr}/header.jpg`,
      verticalImageUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${idStr}/library_600x900_2x.jpg`,
      heroImageUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${idStr}/library_hero.jpg`,
      dlcCount: dlcs.length,
      dlcs: dlcs
    };
  }

  getGameDlcs(appId) {
    const idStr = String(appId).trim();
    const game = this.gamesByAppId.get(idStr);
    if (!game || !game.dlc || typeof game.dlc !== 'object') return [];

    const entries = Object.entries(game.dlc);
    return entries.map(([dlcAppId, dlcInfo]) => {
      let dlcName = '';
      let headerImage = '';

      if (typeof dlcInfo === 'string') {
        const trimmed = dlcInfo.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            const parsed = JSON.parse(trimmed);
            dlcName = parsed.name || '';
            headerImage = parsed.header_image || '';
          } catch (e) {
            const nMatch = trimmed.match(/['"]name['"]\s*:\s*['"]([^'"]+)['"]/);
            if (nMatch) dlcName = nMatch[1];
          }
        } else {
          dlcName = trimmed;
        }
      } else if (typeof dlcInfo === 'object' && dlcInfo !== null) {
        dlcName = dlcInfo.name || '';
        headerImage = dlcInfo.header_image || '';
      }

      const isNumeric = !dlcName || /^\d+$/.test(dlcName.trim());
      const finalName = isNumeric ? `DLC ${dlcAppId}` : dlcName.trim();

      return {
        dlc_app_id: String(dlcAppId),
        name: finalName,
        priceCLP: DLC_PRICE_UNIT, // $1.000 CLP unitario
        imageUrl: headerImage || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${dlcAppId}/header.jpg`
      };
    });
  }

  calcDlcBundlePrice(count) {
    if (count <= 0) return 0;
    if (count === 1) return 1000;
    if (count === 2) return 1800;
    if (count === 3) return 2500;
    if (count === 4) return 3000;
    return 3500;
  }

  getSagas() {
    return this.sagas;
  }

  getVipGames() {
    return this.vipGames;
  }

  getPromotions() {
    return this.promotions;
  }
}

// Instancia única (Singleton)
const instance = new SteamCatalogService();
module.exports = instance;
