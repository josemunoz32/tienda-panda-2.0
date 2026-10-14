const admin = require("firebase-admin");

let sagasCatalog = [];
try {
  sagasCatalog = require("./sagasData.json");
} catch (e) {
  sagasCatalog = [];
}

let vipGamesData = [];
try {
  vipGamesData = require("./vipGamesData.json");
} catch (e) {
  vipGamesData = [];
}

// 7 Títulos oficiales de Ubisoft (LuaTools)
const UBISOFT_APP_IDS = new Set(["66088", "1081", "4740", "5266", "6145", "17903", "1771"]);

/**
 * Handler para la API del catálogo de Steam
 * Devuelve juegos base, VIPs (Denuvo, Ubisoft, EA Sports), Sagas y Promociones / Packs
 */
async function handleSteamCatalog(req, res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido. Usa GET." });
  }

  try {
    const db = admin.firestore();

    // 1. Promociones y Packs oficiales
    const promotions = [
      {
        key: "promo-estreno-vip",
        name: "Pack Juegos VIP",
        shortName: "⭐ Pack VIP",
        subtitle: "1 Estreno VIP + 2 Juegos Estándar de Regalo",
        priceCLP: 8000,
        count: 3,
        isVipPromo: true,
        rules: {
          basePriceCLP: 8000,
          vipIncludedCount: 1,
          bonusNormalGamesCount: 2,
          standardVipExtraCLP: 0,
          ubisoftExtraCLP: 3000,
          eaSportsExtraCLP: 5000,
        },
      },
      {
        key: "promo-steam-3x",
        name: "Pack 3X Steam",
        shortName: "Pack 3X",
        subtitle: "Elige 3 juegos estándar a elección",
        priceCLP: 4990,
        count: 3,
        isCustomChoose: true,
      },
      {
        key: "promo-steam-5x",
        name: "Pack 5X Steam",
        shortName: "Pack 5X",
        subtitle: "Elige 5 juegos estándar a elección",
        priceCLP: 6990,
        count: 5,
        isCustomChoose: true,
      },
      {
        key: "promo-steam-10x",
        name: "Pack 10X Steam",
        shortName: "Pack 10X",
        subtitle: "Elige 10 juegos estándar a elección",
        priceCLP: 9990,
        count: 10,
        isCustomChoose: true,
      },
      {
        key: "promo-steam-23x",
        name: "Pack 23X Steam",
        shortName: "Pack 23X",
        subtitle: "Elige 23 juegos estándar a elección",
        priceCLP: 17990,
        count: 23,
        isCustomChoose: true,
      },
    ];

    // 2. Sagas (sin imagen, solo nombre, precio y juegos incluidos)
    const sagas = sagasCatalog.map((s) => ({
      key: s.key,
      name: s.name,
      priceCLP: Number(s.priceCLP) || 4990,
      games: Array.isArray(s.games) ? s.games : [],
      vipExtras: Array.isArray(s.vipExtras) ? s.vipExtras : [],
    }));

    // 3. Juegos VIP estructurados (Normales, Ubisoft, EA Sports)
    const vipGames = vipGamesData.map((v) => {
      const appId = String(v.app_id || "").trim();
      const name = v.name || "";
      const price = Number(v.priceCLP) || 8000;
      const platform = v.platform || "Steam";

      const isEA = platform === "EA" || price >= 15000 || name.toLowerCase().includes("ea sports");
      const isUbisoft = !isEA && (platform === "Ubisoft" || price === 12000 || UBISOFT_APP_IDS.has(appId));

      let category = "vip_normal";
      let extraInVipPack = 0;

      if (isEA) {
        category = "ea_sports";
        extraInVipPack = 5000;
      } else if (isUbisoft) {
        category = "ubisoft";
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
          : (v.imageUrl || ""),
        verticalImageUrl: appId
          ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900_2x.jpg`
          : "",
      };
    });

    // 4. Catálogo de Juegos Base de Steam (Firestore 'games')
    const gamesSnap = await db.collection("games").get();
    const standardGames = [];

    gamesSnap.forEach((doc) => {
      const data = doc.data();
      const appId = String(data.app_id || doc.id).trim();
      const name = data.name || doc.id;

      standardGames.push({
        id: doc.id,
        app_id: appId,
        name: name,
        priceCLP: 4990,
        imageUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
        verticalImageUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900_2x.jpg`,
        technical_category: data.technical_category || "solo_lua",
      });
    });

    // Ordenar alfabéticamente por nombre
    standardGames.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));

    // Cache HTTP de 10 minutos para máximo rendimiento y velocidad
    res.set("Cache-Control", "public, max-age=600, s-maxage=1200");

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      counts: {
        standardGames: standardGames.length,
        vipGames: vipGames.length,
        sagas: sagas.length,
        promotions: promotions.length,
      },
      promotions,
      sagas,
      vipGames,
      standardGames,
    });
  } catch (error) {
    console.error("Error al generar catálogo Steam:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  handleSteamCatalog,
};
