const fs = require('fs');
let content = fs.readFileSync('src/pages/Categorias/CategoriaPage.js', 'utf8');

const old = [
  "                    {/* Priority tag badge - bottom-left pill */}",
  "                    {(() => {",
  "                      const BADGE_TAGS = [",
  "                        { tag:'Oferta',      icon:'🔥', color:'#fff', bg:'rgba(220,30,30,0.88)',    border:'rgba(255,80,80,0.7)' },",
  "                        { tag:'Más vendido', icon:'⭐', color:'#fff', bg:'rgba(160,110,0,0.88)',    border:'rgba(255,200,0,0.7)' },",
  "                        { tag:'Bestseller',  icon:'⭐', color:'#fff', bg:'rgba(160,110,0,0.88)',    border:'rgba(255,200,0,0.7)' },",
  "                        { tag:'Nuevo',       icon:'✨', color:'#fff', bg:'rgba(20,130,60,0.88)',    border:'rgba(74,222,128,0.7)' },",
  "                        { tag:'Exclusivo',   icon:'💎', color:'#fff', bg:'rgba(100,20,160,0.88)',   border:'rgba(192,132,252,0.7)' },",
  "                        { tag:'Preventa',    icon:'⏰', color:'#fff', bg:'rgba(20,60,160,0.88)',    border:'rgba(96,165,250,0.7)' },",
  "                        { tag:'Promo',       icon:'🏷️', color:'#fff', bg:'rgba(180,80,10,0.88)',    border:'rgba(251,146,60,0.7)' },",
  "                      ];",
  "                      if (!Array.isArray(prod.tags) || !prod.tags.length) return null;",
  "                      const match = BADGE_TAGS.find(b => prod.tags.includes(b.tag));",
  "                      if (!match) return null;",
  "                      return (",
  "                        <span className=\"catpage-card-badge\" style={{color:match.color,background:match.bg,border:`1px solid ${match.border}`}}>",
  "                          {match.icon} {match.tag}",
  "                        </span>",
  "                      );",
  "                    })()}",
  "                    {/* Switch compat badge - bottom-right pill */}",
  "                    {isSwitch && (() => {",
  "                      const compat = prod.switchCompat || 'ambas';",
  "                      const COMPAT_MAP = {",
  "                        switch1: { label:'Switch 1', color:'#fff', bg:'rgba(180,20,20,0.88)',   border:'rgba(228,0,15,0.7)' },",
  "                        switch2: { label:'Switch 2', color:'#fff', bg:'rgba(10,60,160,0.88)',   border:'rgba(0,120,215,0.7)' },",
  "                        ambas:   { label:'S1 + S2',  color:'#fff', bg:'rgba(10,100,40,0.88)',   border:'rgba(74,222,128,0.7)' },",
  "                      };",
  "                      const c = COMPAT_MAP[compat] || COMPAT_MAP.ambas;",
  "                      return (",
  "                        <span className=\"catpage-compat-badge\" style={{color:c.color,background:c.bg,border:`1px solid ${c.border}`}}>",
  "                          🎮 {c.label}",
  "                        </span>",
  "                      );",
  "                    })()}",
].join('\r\n');

const neu = [
  "                    {/* Priority tag - diagonal ribbon top-left */}",
  "                    {(() => {",
  "                      const BADGE_TAGS = [",
  "                        { tag:'Oferta',      icon:'🔥', bg:'#c0180c' },",
  "                        { tag:'Más vendido', icon:'⭐', bg:'#9a6500' },",
  "                        { tag:'Bestseller',  icon:'⭐', bg:'#9a6500' },",
  "                        { tag:'Nuevo',       icon:'✨', bg:'#0f7a38' },",
  "                        { tag:'Exclusivo',   icon:'💎', bg:'#6b0fa8' },",
  "                        { tag:'Preventa',    icon:'⏰', bg:'#0f4db5' },",
  "                        { tag:'Promo',       icon:'🏷️', bg:'#b54d0a' },",
  "                      ];",
  "                      if (!Array.isArray(prod.tags) || !prod.tags.length) return null;",
  "                      const match = BADGE_TAGS.find(b => prod.tags.includes(b.tag));",
  "                      if (!match) return null;",
  "                      return (",
  "                        <div className=\"catpage-ribbon-wrap\">",
  "                          <span className=\"catpage-ribbon\" style={{background:match.bg}}>",
  "                            {match.icon} {match.tag}",
  "                          </span>",
  "                        </div>",
  "                      );",
  "                    })()}",
  "                    {/* Switch compat - bottom strip */}",
  "                    {isSwitch && (() => {",
  "                      const compat = prod.switchCompat || 'ambas';",
  "                      const COMPAT_MAP = {",
  "                        switch1: { label:'Solo Switch 1', bg:'rgba(140,10,10,0.92)',  border:'rgba(228,0,15,0.5)' },",
  "                        switch2: { label:'Solo Switch 2', bg:'rgba(8,45,130,0.92)',   border:'rgba(0,120,215,0.5)' },",
  "                        ambas:   { label:'Switch 1 y 2',  bg:'rgba(8,80,30,0.92)',    border:'rgba(74,222,128,0.5)' },",
  "                      };",
  "                      const c = COMPAT_MAP[compat] || COMPAT_MAP.ambas;",
  "                      return (",
  "                        <div className=\"catpage-compat-strip\" style={{background:c.bg,borderTop:`1px solid ${c.border}`}}>",
  "                          🎮 {c.label}",
  "                        </div>",
  "                      );",
  "                    })()}",
].join('\r\n');

if (!content.includes(old)) {
  // Try to identify exact mismatch
  const lines = old.split('\r\n');
  for (let i = 0; i < lines.length; i++) {
    if (!content.includes(lines[i])) {
      console.error('First missing line:', JSON.stringify(lines[i]));
      break;
    }
  }
  process.exit(1);
}
content = content.replace(old, neu);
fs.writeFileSync('src/pages/Categorias/CategoriaPage.js', content, 'utf8');
console.log('Done!');
