const steamService = require('./services/steamCatalogService');

async function test() {
  console.log('Iniciando steamCatalogService de prueba...');
  await steamService.init();

  console.log('\n--- 1. JUEGOS DESTACADOS ---');
  const featured = steamService.getFeaturedGames(5);
  console.log('Featured games count:', featured.length);
  console.log('Sample featured:', featured[0]);

  console.log('\n--- 2. BÚSQUEDA RÁPIDA (resident evil) ---');
  const searchRes = steamService.searchGames('resident evil', 1, 3);
  console.log('Total encontrados:', searchRes.total);
  console.log('Primeros resultados:', searchRes.games);

  console.log('\n--- 3. SAGAS OFICIALES (Sin imágenes) ---');
  const sagas = steamService.getSagas();
  console.log('Sagas count:', sagas.length);
  console.log('Sample Saga:', JSON.stringify(sagas[0], null, 2));

  console.log('\n--- 4. PROMOCIONES OFICIALES (Packs) ---');
  const promos = steamService.getPromotions();
  console.log('Promociones count:', promos.length);
  console.log('Sample Promo:', JSON.stringify(promos[0], null, 2));

  console.log('\n--- 5. JUEGOS VIP (Ubisoft / EA Sports / Normal) ---');
  const vips = steamService.getVipGames();
  console.log('VIPs count:', vips.length);
  console.log('Ubisoft sample:', vips.find(v => v.category === 'ubisoft'));
  console.log('EA sample:', vips.find(v => v.category === 'ea_sports'));

  console.log('\n--- 6. DETECCIÓN DE DLCs OFICIALES ---');
  const reVillageAppId = '1196590';
  const dlcs = steamService.getGameDlcs(reVillageAppId);
  console.log('Resident Evil Village DLCs count:', dlcs.length);
  if (dlcs.length > 0) {
    console.log('Sample DLC:', dlcs[0]);
  }

  console.log('\n--- 7. PRECIOS DE PACKS DE DLCs ---');
  console.log('Precio por 1 DLC:', steamService.calcDlcBundlePrice(1));
  console.log('Precio por 3 DLCs:', steamService.calcDlcBundlePrice(3));
  console.log('Precio por 5 DLCs:', steamService.calcDlcBundlePrice(5));

  console.log('\n✅ TEST COMPLETADO EXITOSAMENTE');
  process.exit(0);
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
