const fs = require('fs');
let content = fs.readFileSync('src/pages/Categorias/CategoriaPage.js', 'utf8');

// Add switchCompat badge right after the priority badge block, before the cart name
// Find the end of priority badge block
const anchor = "                  })()}\r\n\r\n                  {(() => {\r\n                    // Siempre usar CLP como base";
if (!content.includes(anchor)) {
  // Try to find alternate anchor
  const alt = content.indexOf('                  {(() => {\r\n                    // Siempre usar CLP como base');
  console.log('Alt anchor at:', alt);
  if (alt === -1) { console.error('ERROR: anchor not found'); process.exit(1); }
}

const oldAnchor = "                  })()}\r\n\r\n                  {(() => {\r\n                    // Siempre usar CLP como base";
const newAnchor = [
  "                  })()}",
  "",
  "                  {/* Switch compat badge */}",
  "                  {isSwitch && prod.switchCompat && prod.switchCompat !== 'ambas' && (",
  "                    <span style={{",
  "                      display:'inline-flex',alignItems:'center',gap:3,",
  "                      background:'rgba(228,0,15,0.13)',border:'1px solid rgba(228,0,15,0.35)',",
  "                      color:'#ff7070',borderRadius:7,padding:'2px 8px',",
  "                      fontSize:'0.65rem',fontWeight:800,letterSpacing:'0.05em',",
  "                      textTransform:'uppercase',marginBottom:3,",
  "                    }}>",
  "                      {prod.switchCompat === 'switch1' ? '🎮 Solo NS1' : '🎮 Solo NS2'}",
  "                    </span>",
  "                  )}",
  "",
  "                  {(() => {",
  "                    // Siempre usar CLP como base",
].join('\r\n');

if (!content.includes(oldAnchor)) {
  console.error('ERROR: anchor not found!');
  console.log('Searching for partial...');
  const idx = content.indexOf('                  })()}');
  console.log('First })() at:', idx);
  process.exit(1);
}

content = content.replace(oldAnchor, newAnchor);
fs.writeFileSync('src/pages/Categorias/CategoriaPage.js', content, 'utf8');
console.log('Done!');
