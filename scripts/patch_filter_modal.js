const fs = require('fs');
let content = fs.readFileSync('src/pages/Categorias/CategoriaPage.js', 'utf8');

// 1. Add showFilterModal state after showAuthModal
content = content.replace(
  '  const [showAuthModal, setShowAuthModal] = useState(false);\r\n',
  '  const [showAuthModal, setShowAuthModal] = useState(false);\r\n  const [showFilterModal, setShowFilterModal] = useState(false);\r\n'
);

// 2. Add computed values after isSwitch
content = content.replace(
  "  const isSwitch = (categoria?.name || '').toLowerCase().includes('switch');\r\n",
  "  const isSwitch = (categoria?.name || '').toLowerCase().includes('switch');\r\n  const activeFilterCount = [minPrice || maxPrice, selectedTag, selectedLetter, order !== 'price-asc'].filter(Boolean).length;\r\n  const allTags = (() => { const tagSet = new Set(); productos.forEach(p => { if (Array.isArray(p.tags)) p.tags.forEach(t => tagSet.add(t)); }); return Array.from(tagSet); })();\r\n  const allLetters = (() => { const letterSet = new Set(); productos.forEach(p => { if (p.name) { const first = p.name.trim()[0] && p.name.trim()[0].toUpperCase(); if (first && first >= 'A' && first <= 'Z') letterSet.add(first); } }); return Array.from(letterSet).sort(); })();\r\n"
);

// 3. Replace the catpage-search-card content (keeping card opening tag)
const cardStart = content.indexOf('        <div className="catpage-search-card">');
if (cardStart === -1) { console.error('ERROR: card start not found'); process.exit(1); }
const cardEndMarker = "          )}\r\n        </div>\r\n\r\n        {/* Autocomplete dropdown */}";
const cardEndPos = content.indexOf(cardEndMarker, cardStart);
if (cardEndPos === -1) { console.error('ERROR: card end not found'); process.exit(1); }
const cardReplaceEnd = cardEndPos + "          )}\r\n        </div>".length;

const newCard = [
  '        <div className="catpage-search-card">',
  '          <div className="catpage-search-row">',
  '            <div className="catpage-search-field">',
  '              <span className="catpage-search-icon">&#128269;</span>',
  '              <input',
  '                type="text"',
  '                className="catpage-search-input"',
  "                placeholder={`Buscar en ${categoria?.name || 'categor\\u00eda'}...`}",
  '                value={searchInput}',
  '                onChange={e => { setSearchInput(e.target.value); setFiltroAplicado(false); }}',
  '                onKeyDown={e => {',
  "                  if (e.key === 'Enter') {",
  '                    const term = searchInput.trim();',
  '                    if (!term) return;',
  '                    setSearch(term);',
  '                    setFiltroAplicado(true);',
  '                  }',
  '                }}',
  '              />',
  '            </div>',
  '            <button',
  '              className="catpage-filter-toggle-btn"',
  '              onClick={() => setShowFilterModal(true)}',
  '            >',
  '              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>',
  '              Filtros',
  "              {activeFilterCount > 0 && <span className=\"catpage-filter-badge\">{activeFilterCount}</span>}",
  '            </button>',
  '            <button',
  '              className="catpage-search-btn"',
  '              disabled={!searchInput.trim().length}',
  '              onClick={() => {',
  '                const term = searchInput.trim();',
  '                if (!term) return;',
  '                setSearch(term);',
  '                setFiltroAplicado(true);',
  '              }}',
  '            >Buscar</button>',
  "            {(filtroAplicado || search || minPrice || maxPrice || selectedTag || selectedLetter || order !== 'price-asc') && (",
  '              <button',
  '                className="catpage-clear-btn"',
  '                title="Limpiar todo"',
  '                onClick={() => { setSearchInput(""); setSearch(""); setMinPrice(""); setMaxPrice(""); setOrder(\'price-asc\'); setFiltroAplicado(false); setSelectedTag(null); setSelectedLetter(null); setPage(1); }}',
  '              >&#10005;</button>',
  '            )}',
  '          </div>',
  "          {(searchInput.trim() || minPrice || maxPrice || selectedTag || selectedLetter || order !== 'price-asc') && (",
  "            <div style={{display:'flex',alignItems:'center',gap:6,marginTop:7,flexWrap:'wrap'}}>",
  "              <span style={{background:'rgba(123,47,242,0.25)',border:'1px solid rgba(162,89,255,0.4)',borderRadius:20,padding:'1px 9px',color:'#fff',fontWeight:800,fontSize:'0.8rem'}}>{searchResults.length}</span>",
  "              <span style={{color:'rgba(196,181,253,0.7)',fontSize:'0.78rem'}}>resultado{searchResults.length !== 1 ? 's' : ''}</span>",
  "              {selectedTag && <span style={{background:'rgba(123,47,242,0.18)',borderRadius:10,padding:'1px 8px',color:'#a259ff',fontSize:'0.73rem',fontWeight:700}}>#{selectedTag}</span>}",
  "              {selectedLetter && <span style={{background:'rgba(123,47,242,0.18)',borderRadius:10,padding:'1px 8px',color:'#a259ff',fontSize:'0.73rem',fontWeight:700}}>Letra: {selectedLetter}</span>}",
  "              {(minPrice || maxPrice) && <span style={{background:'rgba(123,47,242,0.18)',borderRadius:10,padding:'1px 8px',color:'#a259ff',fontSize:'0.73rem',fontWeight:700}}>💰 Precio</span>}",
  "              {order !== 'price-asc' && <span style={{background:'rgba(123,47,242,0.18)',borderRadius:10,padding:'1px 8px',color:'#a259ff',fontSize:'0.73rem',fontWeight:700}}>⇅ Orden</span>}",
  '            </div>',
  '          )}',
  '        </div>',
].join('\r\n');

content = content.slice(0, cardStart) + newCard + content.slice(cardReplaceEnd);

// 4. Insert filter modal between search-wrap closing </div> and product grid
const modalInsertMarker = "      </div>\r\n\r\n      {/* Product grid */}";
const modalInsertPos = content.indexOf(modalInsertMarker);
if (modalInsertPos === -1) { console.error('ERROR: modal insert point not found'); process.exit(1); }

const modalLines = [
  '      </div>',
  '',
  '      {/* Filter Modal */}',
  '      {showFilterModal && (',
  '        <div className="catpage-fmodal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowFilterModal(false); }}>',
  '          <div className="catpage-fmodal">',
  '            <div className="catpage-fmodal-header">',
  '              <h3 className="catpage-fmodal-title">Filtros</h3>',
  '              <button className="catpage-fmodal-close" onClick={() => setShowFilterModal(false)}>&#10005;</button>',
  '            </div>',
  '            <div className="catpage-fmodal-body">',
  '              <div className="catpage-fmodal-section">',
  '                <span className="catpage-fmodal-label">Ordenar por</span>',
  '                <div className="catpage-filter-scroller">',
  '                  {[',
  "                    { val:'price-asc',  label:'↑ Precio' },",
  "                    { val:'price-desc', label:'↓ Precio' },",
  "                    { val:'az',         label:'A → Z' },",
  "                    { val:'za',         label:'Z → A' },",
  '                  ].map(opt => (',
  "                    <button key={opt.val} className={`catpage-sort-pill${order === opt.val ? ' active' : ''}`}",
  '                      onClick={() => { setOrder(opt.val); setPage(1); }}',
  '                    >{opt.label}</button>',
  '                  ))}',
  '                </div>',
  '              </div>',
  '              <div className="catpage-fmodal-section">',
  '                <span className="catpage-fmodal-label">Precio</span>',
  '                <div className="catpage-filter-scroller">',
  '                  {[',
  "                    { label:'Todos',      min:'',     max:'' },",
  "                    { label:'Hasta $15K', min:'',     max:'15000' },",
  "                    { label:'$15K-$30K',  min:'15001',max:'30000' },",
  "                    { label:'+$30K',      min:'30001',max:'' },",
  '                  ].map(opt => {',
  '                    const isActive = minPrice === opt.min && maxPrice === opt.max;',
  '                    return (',
  "                      <button key={opt.label} className={`catpage-sort-pill${isActive ? ' active' : ''}`}",
  '                        onClick={() => { setMinPrice(opt.min); setMaxPrice(opt.max); setPage(1); }}',
  '                      >{opt.label}</button>',
  '                    );',
  '                  })}',
  '                </div>',
  '              </div>',
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
  '              {allLetters.length > 0 && (',
  '                <div className="catpage-fmodal-section">',
  '                  <span className="catpage-fmodal-label">Letra inicial</span>',
  '                  <div className="catpage-filter-scroller">',
  '                    <button',
  "                      className={`catpage-sort-pill${!selectedLetter ? ' active' : ''}`}",
  '                      onClick={() => { setSelectedLetter(null); setPage(1); }}',
  '                    >Todas</button>',
  '                    {allLetters.map(l => (',
  '                      <button key={l}',
  "                        className={`catpage-sort-pill${selectedLetter === l ? ' active' : ''}`}",
  '                        onClick={() => { setSelectedLetter(selectedLetter === l ? null : l); setPage(1); }}',
  '                      >{l}</button>',
  '                    ))}',
  '                  </div>',
  '                </div>',
  '              )}',
  '            </div>',
  '            <div className="catpage-fmodal-footer">',
  '              <button className="catpage-fmodal-clear-btn"',
  "                onClick={() => { setMinPrice(''); setMaxPrice(''); setOrder('price-asc'); setSelectedTag(null); setSelectedLetter(null); setPage(1); }}",
  '              >Limpiar todo</button>',
  '              <button className="catpage-fmodal-apply-btn"',
  '                onClick={() => setShowFilterModal(false)}',
  "              >Ver {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}</button>",
  '            </div>',
  '          </div>',
  '        </div>',
  '      )}',
  '',
  '      {/* Product grid */}',
];

content = content.slice(0, modalInsertPos) + modalLines.join('\r\n') + content.slice(modalInsertPos + modalInsertMarker.length);

fs.writeFileSync('src/pages/Categorias/CategoriaPage.js', content, 'utf8');
console.log('Done!');
