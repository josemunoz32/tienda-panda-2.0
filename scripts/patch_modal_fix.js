const fs = require('fs');
let content = fs.readFileSync('src/pages/Categorias/CategoriaPage.js', 'utf8');

// 1. Remove minPrice||maxPrice from activeFilterCount
content = content.replace(
  "  const activeFilterCount = [minPrice || maxPrice, selectedTag, selectedLetter, order !== 'price-asc'].filter(Boolean).length;",
  "  const activeFilterCount = [selectedTag, selectedLetter, order !== 'price-asc'].filter(Boolean).length;"
);

// 2. Remove the entire Precio section from the modal
const precioStart = content.indexOf("              <div className=\"catpage-fmodal-section\">\r\n                <span className=\"catpage-fmodal-label\">Precio</span>");
if (precioStart === -1) { console.error('ERROR: precio section not found'); process.exit(1); }
const precioEnd = content.indexOf("              {allTags.length > 0 && (", precioStart);
if (precioEnd === -1) { console.error('ERROR: precio end not found'); process.exit(1); }
content = content.slice(0, precioStart) + content.slice(precioEnd);

// 3. Remove the 💰 Precio badge from mini results indicator
content = content.replace(
  "\r\n              {(minPrice || maxPrice) && <span style={{background:'rgba(123,47,242,0.18)',borderRadius:10,padding:'1px 8px',color:'#a259ff',fontSize:'0.73rem',fontWeight:700}}>💰 Precio</span>}",
  ""
);

// 4. Simplify the footer clear button (no need to clear minPrice/maxPrice without UI)
content = content.replace(
  "                onClick={() => { setMinPrice(''); setMaxPrice(''); setOrder('price-asc'); setSelectedTag(null); setSelectedLetter(null); setPage(1); }}",
  "                onClick={() => { setOrder('price-asc'); setSelectedTag(null); setSelectedLetter(null); setPage(1); }}"
);

fs.writeFileSync('src/pages/Categorias/CategoriaPage.js', content, 'utf8');
console.log('Done!');
