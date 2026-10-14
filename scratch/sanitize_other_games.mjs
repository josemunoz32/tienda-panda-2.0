import fs from 'fs';

const configs = [
  {
    valid: new Set(['354160', '354161', '398472', '398473']),
    paths: [
      'C:\\Program Files (x86)\\Steam\\config\\lua\\354160.lua',
      'C:\\Program Files (x86)\\Steam\\config\\st-plugin\\354160.lua',
      'C:\\Program Files (x86)\\Steam\\config\\stplug-in\\354160.lua',
      'C:\\Program Files (x86)\\Steam\\plugins\\354160.lua'
    ]
  },
  {
    valid: new Set(['1785650', '1785651']),
    paths: [
      'C:\\Program Files (x86)\\Steam\\config\\lua\\1785650.lua',
      'C:\\Program Files (x86)\\Steam\\config\\st-plugin\\1785650.lua',
      'C:\\Program Files (x86)\\Steam\\config\\stplug-in\\1785650.lua',
      'C:\\Program Files (x86)\\Steam\\plugins\\1785650.lua'
    ]
  }
];

for (const cfg of configs) {
  for (const p of cfg.paths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      const lines = content.split(/\r?\n/);
      const newLines = lines.map(line => {
        const trimmed = line.trim();
        const match = trimmed.match(/(?:addappid|setManifestid)\s*\(\s*(\d+)/i);
        if (match) {
          const id = match[1];
          if (!cfg.valid.has(id)) {
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
}
