/**
 * steamController.js
 * Controlador para la API de Steam en Onika Games (Express.js)
 */

const steamService = require('../services/steamCatalogService');

exports.searchGames = (req, res) => {
  try {
    const { q, page, limit } = req.query;
    const result = steamService.searchGames(q, page, limit);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getFeaturedGames = (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 24;
    const games = steamService.getFeaturedGames(limit);
    return res.json({ success: true, count: games.length, games });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getGameDetails = (req, res) => {
  try {
    const { appId } = req.params;
    const game = steamService.getGameDetails(appId);
    if (!game) {
      return res.status(404).json({ success: false, error: 'Juego no encontrado' });
    }
    return res.json({ success: true, game });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getGameDlcs = (req, res) => {
  try {
    const { appId } = req.params;
    const dlcs = steamService.getGameDlcs(appId);
    return res.json({ success: true, count: dlcs.length, dlcs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getSagas = (req, res) => {
  try {
    const sagas = steamService.getSagas();
    return res.json({ success: true, count: sagas.length, sagas });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getVipGames = (req, res) => {
  try {
    const vips = steamService.getVipGames();
    return res.json({ success: true, count: vips.length, vipGames: vips });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getPromotions = (req, res) => {
  try {
    const promos = steamService.getPromotions();
    return res.json({ success: true, count: promos.length, promotions: promos });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.calcDlcPricing = (req, res) => {
  try {
    const count = parseInt(req.query.count, 10) || 0;
    const bundlePrice = steamService.calcDlcBundlePrice(count);
    const regularPrice = count * 1000;
    return res.json({
      success: true,
      count,
      regularPriceCLP: regularPrice,
      bundlePriceCLP: bundlePrice,
      savingsCLP: regularPrice - bundlePrice,
      discountApplied: count >= 2
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
