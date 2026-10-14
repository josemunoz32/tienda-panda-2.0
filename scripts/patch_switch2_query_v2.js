const fs = require('fs');
let content = fs.readFileSync('src/pages/Categorias/CategoriaPage.js', 'utf8');

// Fix NS2 category to show switch2 + ambas products (not just switch2)
const old = [
  "      if (isSwitchVariantCat) {",
  "        const q2 = query(collection(db, \"products\"), where(\"switchCompat\", \"==\", \"switch2\"));",
  "        productsSnap = await getDocs(q2);",
  "      } else {",
  "        const productsQuery = query(collection(db, \"products\"), where(\"categoryId\", \"==\", id));",
  "        productsSnap = await getDocs(productsQuery);",
  "      }",
  "      setProductos(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));",
  "      setLoading(false);",
].join('\r\n');

const neu = [
  "      let prodDocs;",
  "      if (isSwitchVariantCat) {",
  "        // Find the Nintendo Switch base category and get its products excluding switch1-only",
  "        const switchBaseCat = cats.find(c => {",
  "          const n = (c.name || '').toLowerCase();",
  "          return n.includes('nintendo switch') && !n.includes('switch 2') && !n.includes('switch2');",
  "        });",
  "        if (switchBaseCat) {",
  "          const snap = await getDocs(query(collection(db, \"products\"), where(\"categoryId\", \"==\", switchBaseCat.id)));",
  "          prodDocs = snap.docs.filter(d => (d.data().switchCompat || 'ambas') !== 'switch1');",
  "        } else {",
  "          const snap = await getDocs(query(collection(db, \"products\"), where(\"switchCompat\", \"in\", [\"switch2\", \"ambas\"])));",
  "          prodDocs = snap.docs;",
  "        }",
  "      } else {",
  "        const snap = await getDocs(query(collection(db, \"products\"), where(\"categoryId\", \"==\", id)));",
  "        prodDocs = snap.docs;",
  "      }",
  "      setProductos(prodDocs.map(doc => ({ id: doc.id, ...doc.data() })));",
  "      setLoading(false);",
].join('\r\n');

if (!content.includes(old)) {
  console.error('ERROR: query block not found');
  const idx = content.indexOf('isSwitchVariantCat');
  console.log('isSwitchVariantCat at:', idx);
  process.exit(1);
}
content = content.replace(old, neu);
fs.writeFileSync('src/pages/Categorias/CategoriaPage.js', content, 'utf8');
console.log('Done!');
