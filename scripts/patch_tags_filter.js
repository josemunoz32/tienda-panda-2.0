const fs = require('fs');
let content = fs.readFileSync('src/pages/Categorias/CategoriaPage.js', 'utf8');

// 1. Add AVAILABLE_TAGS import after existing imports
content = content.replace(
  'import { prodUrl, extractId } from \'../../utils/slugify\';\r\n',
  'import { prodUrl, extractId } from \'../../utils/slugify\';\r\nimport { AVAILABLE_TAGS } from \'../../utils/productTags\';\r\n'
);

// 2. Replace allTags computation: instead of computing from products, use AVAILABLE_TAGS
// But also keep the set of tags that products actually have (for highlighting or future use)
content = content.replace(
  "  const allTags = (() => { const tagSet = new Set(); productos.forEach(p => { if (Array.isArray(p.tags)) p.tags.forEach(t => tagSet.add(t)); }); return Array.from(tagSet); })();",
  "  const usedTags = new Set(); productos.forEach(p => { if (Array.isArray(p.tags)) p.tags.forEach(t => usedTags.add(t)); });"
);

// 3. Replace the tags section in the filter modal to always show AVAILABLE_TAGS
// Find: '              {allTags.length > 0 && (\r\n                <div className="catpage-fmodal-section">\r\n                  <span className="catpage-fmodal-label">Etiquetas</span>\r\n                  <div className="catpage-filter-scroller">\r\n                    {allTags.map(tag => (\r\n                      <button key={tag} type="button"\r\n                        className={`catpage-sort-pill${selectedTag === tag ? \' active\' : \'\'}`}\r\n                        onClick={() => { setSelectedTag(selectedTag === tag ? null : tag); setPage(1); }}\r\n                      >{tag}</button>\r\n                    ))}\r\n                  </div>\r\n                </div>\r\n              )}'

const oldTags = [
  '              {allTags.length > 0 && (',
  '                <div className="catpage-fmodal-section">',
  '                  <span className="catpage-fmodal-label">Etiquetas</span>',
  '                  <div className="catpage-filter-scroller">',
  '                    {allTags.map(tag => (',
  '                      <button key={tag} type="button"',
  "                        className={`catpage-sort-pill${selectedTag === tag ? ' active' : ''}`}",
  '                        onClick={() => { setSelectedTag(selectedTag === tag ? null : tag); setPage(1); }}',
  '                      >{tag}</button>',
  '                    ))}',
  '                  </div>',
  '                </div>',
  '              )}',
].join('\r\n');

const newTags = [
  '              <div className="catpage-fmodal-section">',
  '                <span className="catpage-fmodal-label">Etiquetas</span>',
  '                <div className="catpage-filter-scroller" style={{flexWrap:\'wrap\'}}>',
  '                  {AVAILABLE_TAGS.map(tag => (',
  '                    <button key={tag} type="button"',
  "                      className={`catpage-sort-pill${selectedTag === tag ? ' active' : ''}`}",
  '                      onClick={() => { setSelectedTag(selectedTag === tag ? null : tag); setPage(1); }}',
  '                    >{tag}</button>',
  '                  ))}',
  '                </div>',
  '              </div>',
].join('\r\n');

if (!content.includes(oldTags)) {
  console.error('ERROR: old tags section not found. Searching for partial...');
  const idx = content.indexOf('              {allTags.length > 0 && (');
  console.log('Partial found at:', idx);
  process.exit(1);
}

content = content.replace(oldTags, newTags);

fs.writeFileSync('src/pages/Categorias/CategoriaPage.js', content, 'utf8');
console.log('Done!');
