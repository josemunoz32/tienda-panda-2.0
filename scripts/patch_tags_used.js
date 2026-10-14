const fs = require('fs');
let content = fs.readFileSync('src/pages/Categorias/CategoriaPage.js', 'utf8');

// Replace AVAILABLE_TAGS section in modal with usedTags (only tags actually on products)
const oldSection = [
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

const newSection = [
  '              {usedTags.size > 0 && (',
  '                <div className="catpage-fmodal-section">',
  '                  <span className="catpage-fmodal-label">Etiquetas</span>',
  '                  <div className="catpage-filter-scroller" style={{flexWrap:\'wrap\'}}>',
  '                    {Array.from(usedTags).map(tag => (',
  '                      <button key={tag} type="button"',
  "                        className={`catpage-sort-pill${selectedTag === tag ? ' active' : ''}`}",
  '                        onClick={() => { setSelectedTag(selectedTag === tag ? null : tag); setPage(1); }}',
  '                      >{tag}</button>',
  '                    ))}',
  '                  </div>',
  '                </div>',
  '              )}',
].join('\r\n');

if (!content.includes(oldSection)) {
  console.error('ERROR: section not found');
  process.exit(1);
}

content = content.replace(oldSection, newSection);
fs.writeFileSync('src/pages/Categorias/CategoriaPage.js', content, 'utf8');
console.log('Done!');
