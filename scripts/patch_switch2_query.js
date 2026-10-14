const fs = require('fs');
let content = fs.readFileSync('src/pages/Categorias/CategoriaPage.js', 'utf8');

const oldQuery = [
  '      const productsQuery = query(collection(db, "products"), where("categoryId", "==", id));',
  '      const snapshot = await getDocs(productsQuery);',
  '      setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));',
  '      setLoading(false);',
].join('\r\n');

const newQuery = [
  '      const catName = (catDoc.exists() ? catDoc.data().name || \'\' : \'\').toLowerCase();',
  '      const isSwitchVariantCat = catName.includes(\'switch 2\') || catName.includes(\'switch2\');',
  '      let productsSnap;',
  '      if (isSwitchVariantCat) {',
  '        const q2 = query(collection(db, "products"), where("switchCompat", "==", "switch2"));',
  '        productsSnap = await getDocs(q2);',
  '      } else {',
  '        const productsQuery = query(collection(db, "products"), where("categoryId", "==", id));',
  '        productsSnap = await getDocs(productsQuery);',
  '      }',
  '      setProductos(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));',
  '      setLoading(false);',
].join('\r\n');

if (!content.includes(oldQuery)) {
  console.error('ERROR: old query not found');
  // debug
  const idx = content.indexOf('where("categoryId", "==", id)');
  console.log('where clause at:', idx);
  process.exit(1);
}

content = content.replace(oldQuery, newQuery);
fs.writeFileSync('src/pages/Categorias/CategoriaPage.js', content, 'utf8');
console.log('Done!');
