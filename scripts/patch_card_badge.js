const fs = require('fs');
let content = fs.readFileSync('src/pages/Categorias/CategoriaPage.js', 'utf8');

// Replace the small tag chips on cards with a prominent priority badge
const oldTagChips = [
  "                  {Array.isArray(prod.tags) && prod.tags.length > 0 && (",
  "                    <div style={{display:'flex',flexWrap:'wrap',gap:4,margin:'2px 0 4px'}}>",
  "                      {prod.tags.slice(0,3).map(tag => (",
  "                        <span key={tag} style={{background:'rgba(123,47,242,0.2)',color:'#c4b5fd',border:'1px solid rgba(162,89,255,0.3)',borderRadius:10,padding:'2px 9px',fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.02em'}}>{tag}</span>",
  "                      ))}",
  "                    </div>",
  "                  )}",
].join('\r\n');

const newBadge = [
  "                  {(() => {",
  "                    const BADGE_TAGS = [",
  "                      { tag:'Oferta',      icon:'🔥', color:'#ff6b6b', bg:'rgba(255,80,80,0.18)',    border:'rgba(255,80,80,0.45)' },",
  "                      { tag:'Más vendido', icon:'⭐', color:'#ffd700', bg:'rgba(255,215,0,0.14)',   border:'rgba(255,215,0,0.45)' },",
  "                      { tag:'Bestseller',  icon:'⭐', color:'#ffd700', bg:'rgba(255,215,0,0.14)',   border:'rgba(255,215,0,0.45)' },",
  "                      { tag:'Nuevo',       icon:'✨', color:'#4ade80', bg:'rgba(74,222,128,0.14)',  border:'rgba(74,222,128,0.45)' },",
  "                      { tag:'Exclusivo',   icon:'💎', color:'#c084fc', bg:'rgba(192,132,252,0.14)',border:'rgba(192,132,252,0.45)' },",
  "                      { tag:'Preventa',    icon:'⏰', color:'#60a5fa', bg:'rgba(96,165,250,0.14)', border:'rgba(96,165,250,0.45)' },",
  "                      { tag:'Promo',       icon:'🏷️', color:'#fb923c', bg:'rgba(251,146,60,0.14)', border:'rgba(251,146,60,0.45)' },",
  "                    ];",
  "                    if (!Array.isArray(prod.tags) || !prod.tags.length) return null;",
  "                    const match = BADGE_TAGS.find(b => prod.tags.includes(b.tag));",
  "                    if (!match) return null;",
  "                    return (",
  "                      <span className=\"catpage-card-badge\" style={{background:match.bg,border:`1px solid ${match.border}`,color:match.color}}>",
  "                        {match.icon} {match.tag}",
  "                      </span>",
  "                    );",
  "                  })()}",
].join('\r\n');

if (!content.includes(oldTagChips)) {
  console.error('ERROR: tag chips section not found');
  process.exit(1);
}

content = content.replace(oldTagChips, newBadge);
fs.writeFileSync('src/pages/Categorias/CategoriaPage.js', content, 'utf8');
console.log('Done!');
