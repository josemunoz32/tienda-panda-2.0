const fs = require('fs');
let content = fs.readFileSync('src/pages/Categorias/CategoriaPage.js', 'utf8');

const oldBadge = [
  "                  {/* Switch compat badge */}",
  "                  {isSwitch && (() => {",
  "                    const catName = (categoria?.name || '').toLowerCase();",
  "                    const inferred = prod.switchCompat ||",
  "                      (catName.includes('switch 2') || catName.includes('switch2') ? 'switch2' :",
  "                       catName.includes('switch 1') || catName.includes('switch1') ? 'switch1' : 'ambas');",
  "                    if (inferred === 'ambas') return null;",
  "                    return (",
  "                      <span style={{",
  "                        display:'inline-flex',alignItems:'center',gap:3,",
  "                        background: inferred === 'switch2' ? 'rgba(0,120,215,0.15)' : 'rgba(228,0,15,0.13)',",
  "                        border: inferred === 'switch2' ? '1px solid rgba(0,120,215,0.4)' : '1px solid rgba(228,0,15,0.35)',",
  "                        color: inferred === 'switch2' ? '#60a5fa' : '#ff7070',",
  "                        borderRadius:7,padding:'2px 8px',",
  "                        fontSize:'0.65rem',fontWeight:800,letterSpacing:'0.05em',",
  "                        textTransform:'uppercase',marginBottom:3,",
  "                      }}>",
  "                        {inferred === 'switch1' ? '🎮 Solo NS1' : '🎮 Solo NS2'}",
  "                      </span>",
  "                    );",
  "                  })()}",
].join('\r\n');

const newBadge = [
  "                  {/* Switch compat badge */}",
  "                  {isSwitch && (() => {",
  "                    const compat = prod.switchCompat || 'ambas';",
  "                    const COMPAT_MAP = {",
  "                      switch1: { label:'🎮 Solo NS1', color:'#ff7070', bg:'rgba(228,0,15,0.13)', border:'rgba(228,0,15,0.35)' },",
  "                      switch2: { label:'🎮 Solo NS2', color:'#60a5fa', bg:'rgba(0,120,215,0.15)', border:'rgba(0,120,215,0.4)' },",
  "                      ambas:   { label:'🎮 NS1 + NS2', color:'#4ade80', bg:'rgba(74,222,128,0.13)', border:'rgba(74,222,128,0.35)' },",
  "                    };",
  "                    const c = COMPAT_MAP[compat] || COMPAT_MAP.ambas;",
  "                    return (",
  "                      <span style={{",
  "                        display:'inline-flex',alignItems:'center',gap:3,",
  "                        background:c.bg, border:`1px solid ${c.border}`, color:c.color,",
  "                        borderRadius:7,padding:'2px 8px',",
  "                        fontSize:'0.65rem',fontWeight:800,letterSpacing:'0.05em',",
  "                        textTransform:'uppercase',marginBottom:3,",
  "                      }}>",
  "                        {c.label}",
  "                      </span>",
  "                    );",
  "                  })()}",
].join('\r\n');

if (!content.includes(oldBadge)) {
  console.error('ERROR: old badge not found');
  process.exit(1);
}

content = content.replace(oldBadge, newBadge);
fs.writeFileSync('src/pages/Categorias/CategoriaPage.js', content, 'utf8');
console.log('Done!');
