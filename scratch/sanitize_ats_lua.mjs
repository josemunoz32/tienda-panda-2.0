import fs from 'fs';

const validDepots = new Set([
  '270880', '270881', '270882', '270883', '270884',
  '421090', '463740', '684630', '800370', '1015160',
  '1104880', '1209470', '1209471', '1415692', '1465750',
  '1811080', '2209650', '2298430', '2543810', '2585150',
  '2730870', '3012580', '3025440', '3486960', '3749870'
]);

const paths = [
  'C:\\Program Files (x86)\\Steam\\config\\lua\\270880.lua',
  'C:\\Program Files (x86)\\Steam\\config\\st-plugin\\270880.lua',
  'C:\\Program Files (x86)\\Steam\\config\\stplug-in\\270880.lua',
  'C:\\Program Files (x86)\\Steam\\plugins\\270880.lua'
];

for (const p of paths) {
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    const lines = content.split(/\r?\n/);
    const newLines = lines.map(line => {
      const trimmed = line.trim();
      const match = trimmed.match(/(?:addappid|setManifestid)\s*\(\s*(\d+)/i);
      if (match) {
        const id = match[1];
        if (!validDepots.has(id)) {
          if (!trimmed.startsWith('--')) {
            return '-- [NO_MANIFEST] ' + line;
          }
        }
      }
      return line;
    });
    fs.writeFileSync(p, newLines.join('\r\n'), 'utf8');
    console.log('Sanitized:', p);
  }
}
