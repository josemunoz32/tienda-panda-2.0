const fs = require('fs');
let content = fs.readFileSync('src/pages/Categorias/CategoriaPage.js', 'utf8');

// 1. Add selectedLetter state after selectedTag
content = content.replace(
  '  const [selectedTag, setSelectedTag] = useState(null);\r\n',
  '  const [selectedTag, setSelectedTag] = useState(null);\r\n  const [selectedLetter, setSelectedLetter] = useState(null);\r\n'
);

// 2. Add letter filter in useEffect (after tag filter)
content = content.replace(
  '    // Orden o aleatorio similar a Home: si no hay filtros, mezclar',
  '    // Filtro por letra inicial\r\n    if (selectedLetter) {\r\n      results = results.filter(prod => prod.name && prod.name.trim()[0] && prod.name.trim()[0].toUpperCase() === selectedLetter);\r\n    }\r\n\r\n    // Orden o aleatorio similar a Home: si no hay filtros, mezclar'
);

// 3. Update noFiltros to include selectedLetter
content = content.replace(
  "const noFiltros = !searchInput && !minPrice && !maxPrice && !selectedTag && (!order || order === 'price-asc');",
  "const noFiltros = !searchInput && !minPrice && !maxPrice && !selectedTag && !selectedLetter && (!order || order === 'price-asc');"
);

// 4. Update main useEffect deps
content = content.replace(
  '  }, [searchInput, productos, minPrice, maxPrice, moneda, order, selectedTag]);',
  '  }, [searchInput, productos, minPrice, maxPrice, moneda, order, selectedTag, selectedLetter]);'
);

// 5. Update primeraCarga condition
content = content.replace(
  '    if (searchInput.trim() || minPrice || maxPrice || order !== "price-asc" || selectedTag) {',
  '    if (searchInput.trim() || minPrice || maxPrice || order !== "price-asc" || selectedTag || selectedLetter) {'
);

// 6. Update primeraCarga deps
content = content.replace(
  '  }, [searchInput, minPrice, maxPrice, order, primeraCarga, selectedTag]);',
  '  }, [searchInput, minPrice, maxPrice, order, primeraCarga, selectedTag, selectedLetter]);'
);

// 7. Update Row 1 clear btn visibility condition
content = content.replace(
  "{(filtroAplicado || search || minPrice || maxPrice || selectedTag || order !== 'price-asc') && (",
  "{(filtroAplicado || search || minPrice || maxPrice || selectedTag || selectedLetter || order !== 'price-asc') && ("
);

// 8. Update Row 1 clear btn onClick to include setSelectedLetter(null)
content = content.replace(
  'onClick={() => { setSearchInput(""); setSearch(""); setMinPrice(""); setMaxPrice(""); setOrder(\'price-asc\'); setFiltroAplicado(false); setSelectedTag(null); setPage(1); }}',
  'onClick={() => { setSearchInput(""); setSearch(""); setMinPrice(""); setMaxPrice(""); setOrder(\'price-asc\'); setFiltroAplicado(false); setSelectedTag(null); setSelectedLetter(null); setPage(1); }}'
);

// 9. Replace the entire filter section (divider through end of active filters summary)
const sectionStart = content.indexOf("\r\n\r\n          <div style={{height:1,background:'rgba(162,89,255,0.15)',margin:'12px 0 10px'}} />");
if (sectionStart === -1) { console.error('ERROR: Could not find section start!'); process.exit(1); }

const endMarker = "          )}\r\n        </div>";
const endPos = content.indexOf(endMarker, sectionStart);
if (endPos === -1) { console.error('ERROR: Could not find section end!'); process.exit(1); }
const replaceEnd = endPos + "          )}".length;

const L = [
  '',
  '',
  "          <div style={{height:1,background:'rgba(162,89,255,0.15)',margin:'12px 0 10px'}} />",
  '',
  '          {/* Row 2: Sort */}',
  '          <div>',
  "            <span className=\"catpage-sort-label\" style={{display:'block',marginBottom:7}}>Ordenar:</span>",
  '            <div className="catpage-filter-scroller">',
  '              {[',
  "                { val:'price-asc',  label:'↑ Precio' },",
  "                { val:'price-desc', label:'↓ Precio' },",
  "                { val:'az',         label:'A → Z' },",
  "                { val:'za',         label:'Z → A' },",
  '              ].map(opt => (',
  "                <button key={opt.val} className={`catpage-sort-pill${order === opt.val ? ' active' : ''}`}",
  '                  onClick={() => { setOrder(opt.val); setPage(1); }}',
  '                >{opt.label}</button>',
  '              ))}',
  '            </div>',
  '          </div>',
  '',
  "          <div style={{height:1,background:'rgba(162,89,255,0.15)',margin:'10px 0 8px'}} />",
  '',
  '          {/* Row 3: Price range */}',
  '          <div>',
  "            <span className=\"catpage-sort-label\" style={{display:'block',marginBottom:7}}>Precio rápido:</span>",
  '            <div className="catpage-filter-scroller">',
  '              {[',
  "                { label:'Todos',      min:'',     max:'' },",
  "                { label:'Hasta $15K', min:'',     max:'15000' },",
  "                { label:'$15K-$30K',  min:'15001',max:'30000' },",
  "                { label:'+$30K',      min:'30001',max:'' },",
  '              ].map(opt => {',
  '                const isActive = minPrice === opt.min && maxPrice === opt.max;',
  '                return (',
  "                  <button key={opt.label} className={`catpage-sort-pill${isActive ? ' active' : ''}`}",
  '                    onClick={() => { setMinPrice(opt.min); setMaxPrice(opt.max); setPage(1); }}',
  '                  >{opt.label}</button>',
  '                );',
  '              })}',
  '            </div>',
  '          </div>',
  '',
  '          {/* Row 4: Tag chips */}',
  '          {(() => {',
  '            const tagSet = new Set();',
  '            productos.forEach(p => { if (Array.isArray(p.tags)) p.tags.forEach(t => tagSet.add(t)); });',
  '            const allTags = Array.from(tagSet);',
  '            if (allTags.length === 0) return null;',
  '            return (',
  "              <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid rgba(162,89,255,0.12)'}}>",
  "                <span className=\"catpage-sort-label\" style={{display:'block',marginBottom:7}}>Etiquetas:</span>",
  '                <div className="catpage-filter-scroller">',
  '                  {allTags.map(tag => (',
  '                    <button key={tag} type="button"',
  "                      className={`catpage-sort-pill${selectedTag === tag ? ' active' : ''}`}",
  '                      onClick={() => { setSelectedTag(selectedTag === tag ? null : tag); setPage(1); }}',
  '                    >{tag}</button>',
  '                  ))}',
  '                </div>',
  '              </div>',
  '            );',
  '          })()}',
  '',
  '          {/* Row 5: Alphabetical filter */}',
  '          {(() => {',
  '            const letterSet = new Set();',
  '            productos.forEach(p => {',
  '              if (p.name) {',
  "                const first = p.name.trim()[0] && p.name.trim()[0].toUpperCase();",
  "                if (first && first >= 'A' && first <= 'Z') letterSet.add(first);",
  '              }',
  '            });',
  '            const letters = Array.from(letterSet).sort();',
  '            if (letters.length === 0) return null;',
  '            return (',
  "              <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid rgba(162,89,255,0.12)'}}>",
  "                <span className=\"catpage-sort-label\" style={{display:'block',marginBottom:7}}>Letra:</span>",
  '                <div className="catpage-filter-scroller">',
  '                  <button',
  "                    className={`catpage-sort-pill${!selectedLetter ? ' active' : ''}`}",
  '                    onClick={() => { setSelectedLetter(null); setPage(1); }}',
  '                  >Todas</button>',
  '                  {letters.map(l => (',
  '                    <button key={l}',
  "                      className={`catpage-sort-pill${selectedLetter === l ? ' active' : ''}`}",
  '                      onClick={() => { setSelectedLetter(selectedLetter === l ? null : l); setPage(1); }}',
  '                    >{l}</button>',
  '                  ))}',
  '                </div>',
  '              </div>',
  '            );',
  '          })()}',
  '',
  '          {/* Row 6: Active filters summary */}',
  "          {(searchInput.trim() || minPrice || maxPrice || selectedTag || selectedLetter || order !== 'price-asc') && (",
  "            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:10,paddingTop:10,borderTop:'1px solid rgba(162,89,255,0.12)',flexWrap:'wrap',gap:6}}>",
  "              <span style={{color:'#c4b5fd',fontSize:'0.82rem',fontWeight:600,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>",
  "                <span style={{background:'rgba(123,47,242,0.25)',border:'1px solid rgba(162,89,255,0.4)',borderRadius:20,padding:'2px 10px',color:'#fff',fontWeight:800}}>{searchResults.length}</span>",
  "                resultado{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''}",
  "                {selectedTag && <span style={{background:'rgba(123,47,242,0.2)',borderRadius:10,padding:'1px 8px',color:'#a259ff',fontSize:'0.75rem'}}>#{selectedTag}</span>}",
  "                {selectedLetter && <span style={{background:'rgba(123,47,242,0.2)',borderRadius:10,padding:'1px 8px',color:'#a259ff',fontSize:'0.75rem'}}>Letra: {selectedLetter}</span>}",
  '              </span>',
  '              <button type="button"',
  "                onClick={() => { setSearchInput(\"\"); setSearch(\"\"); setMinPrice(\"\"); setMaxPrice(\"\"); setOrder('price-asc'); setFiltroAplicado(false); setSelectedTag(null); setSelectedLetter(null); setPage(1); }}",
  "                style={{background:'rgba(255,100,100,0.1)',border:'1px solid rgba(255,100,100,0.3)',color:'#ff8080',borderRadius:8,padding:'4px 12px',fontSize:'0.8rem',fontWeight:700,cursor:'pointer'}}",
  '              >✕ Limpiar filtros</button>',
  '            </div>',
  '          )}',
];

const newSection = L.join('\r\n');
content = content.slice(0, sectionStart) + newSection + content.slice(replaceEnd);

fs.writeFileSync('src/pages/Categorias/CategoriaPage.js', content, 'utf8');
console.log('Done!');
console.log('sectionStart:', sectionStart, 'replaceEnd:', replaceEnd);
