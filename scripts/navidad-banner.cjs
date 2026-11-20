// Export two standalone illustrations, including all lettering and platform marks.
const fs = require('fs');
const embed = (path, type) => 'data:image/' + type + ';base64,' + fs.readFileSync(path).toString('base64');
const categories = [
  ['PlayStation 5','optimizadas/psn-160.webp'], ['PlayStation 4','optimizadas/psn-160.webp'],
  ['Steam','logos/logosteam.webp'], ['Nintendo Switch 1','optimizadas/switch-160.webp'],
  ['Nintendo Switch 2','optimizadas/switch-160.webp'], ['Streaming','optimizadas/streaming-160.webp']
];
for (const mode of ['pc','mobile']) {
  const mobile = mode === 'mobile';
  const w = mobile ? 960 : 1800, scene = mobile ? 320 : 415;
  const cols = mobile ? 3 : 6, row = mobile ? 58 : 52;
  const height = scene + row * (mobile ? 2 : 1);
  const labels = categories.map(([name, file], i) => {
    const x = (i % cols) * w / cols, y = scene + Math.floor(i / cols) * row;
    return `<g transform="translate(${x} ${y})"><path d="M0 8V${row-8}" stroke="#79663d"/><image x="13" y="8" width="40" height="${row-16}" href="${embed('src/assets/'+file,'webp')}"/><text x="62" y="${row/2+8}" fill="#fff1cd" font-size="${mobile?26:23}" font-weight="bold">${name}</text></g>`;
  }).join('');
  const title = mobile ? 69 : 94;
  fs.writeFileSync('public/navidad-gaming-'+mode+'.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}" font-family="Arial,sans-serif"><defs><linearGradient id="gold" x2="0" y2="1"><stop stop-color="#fffbe1"/><stop offset=".5" stop-color="#ffe2a1"/><stop offset="1" stop-color="#d79a48"/></linearGradient></defs><rect width="100%" height="100%" fill="#101c23"/><svg width="${w}" height="${scene}" viewBox="0 0 2172 724" preserveAspectRatio="xMidYMid slice"><image width="2172" height="724" href="${embed('public/banner-navidad-'+mode+'.png','png')}"/></svg><g text-anchor="middle" font-family="Georgia,serif" font-weight="bold"><text x="50%" y="${scene*.55}" fill="url(#gold)" font-size="${title}">Panda Store</text><text x="50%" y="${scene*.72}" fill="#fff1cf" font-size="${title*.52}" letter-spacing="6">GAMING</text></g><path d="M0 ${scene}H${w}" stroke="#dcb977" stroke-width="3"/>${labels}</svg>`);
}
