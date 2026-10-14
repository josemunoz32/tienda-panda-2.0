import fs from 'fs';

const current = JSON.parse(fs.readFileSync('listado_juegos.json', 'utf8'));

console.log(`TOTAL DE JUEGOS EN TU BASE DE DATOS: ${current.length}`);

let report = `=== TUS ${current.length} JUEGOS ACTUALES EN BASE DE DATOS ===\n`;
current.forEach((g, i) => {
  report += `${i + 1}. [AppID: ${g.appId}] ${g.name}\n`;
});

fs.writeFileSync('mis_juegos_actuales.txt', report);
console.log('Escrito en mis_juegos_actuales.txt');
