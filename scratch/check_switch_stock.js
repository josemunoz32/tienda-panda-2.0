const admin = require('firebase-admin');
const serviceAccount = require('../chatbot/firebase-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function check() {
  const snap = await db.collection('products').get();
  console.log('Total products in db:', snap.size);
  let count = 0;
  snap.forEach(d => {
    const data = d.data();
    const cat = (data.categoryId || '').toLowerCase();
    const plat = (data.plataforma || '').toLowerCase();
    const cName = (data.categoria || '').toLowerCase();
    if (cat.includes('vtqa') || cat.includes('y7j7') || cat.includes('switch') || plat.includes('switch') || cName.includes('switch')) {
      if (count < 10) {
        console.log('ID:', d.id, '| Name:', data.name, '| catId:', data.categoryId, '| plataforma:', data.plataforma, '| categoria:', data.categoria, '| stock:', data.stock);
      }
      count++;
    }
  });
  console.log('Total switch products:', count);

  const packsSnap = await db.collection('packs_nintendo').get();
  console.log('Total packs in packs_nintendo collection right now:', packsSnap.size);
}
check().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
