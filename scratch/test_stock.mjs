import { getGameStockCount, resolveCanonical } from '../src/utils/switchStockHelper.js';

console.log('resolveCanonical("Super Mario Party Jamboree"):', resolveCanonical('Super Mario Party Jamboree'));
console.log('resolveCanonical("Super Mario Party"):', resolveCanonical('Super Mario Party'));

const dummyStockMap = new Map();
dummyStockMap.set('super mario party___base_game', { count: 9 });

console.log('Stock for Super Mario Party:', getGameStockCount('Super Mario Party', dummyStockMap));
console.log('Stock for Super Mario Party Jamboree:', getGameStockCount('Super Mario Party Jamboree', dummyStockMap));
