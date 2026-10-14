/**
 * steamRoutes.js
 * Rutas de la API de Steam para Onika Games Express Backend
 */

const express = require('express');
const router = express.Router();
const steamController = require('../controllers/steamController');

// Catálogo y Búsqueda
router.get('/search', steamController.searchGames);
router.get('/featured', steamController.getFeaturedGames);

// Promociones Oficiales (Packs 3X, 5X, 10X, 23X, VIP)
router.get('/promos', steamController.getPromotions);

// Sagas Oficiales (Sin imágenes, nombres + juegos incluidos + extras)
router.get('/sagas', steamController.getSagas);

// Catálogo de Juegos VIP (con categorías Ubisoft +$3k, EA Sports +$5k, Normal +$0)
router.get('/vips', steamController.getVipGames);

// Ficha de Juego y DLCs
router.get('/game/:appId', steamController.getGameDetails);
router.get('/game/:appId/dlcs', steamController.getGameDlcs);
router.get('/dlcs/pricing', steamController.calcDlcPricing);

module.exports = router;
