import fs from 'fs';

const data = JSON.parse(fs.readFileSync('listado_juegos.json', 'utf8'));

let txt = `# LISTADO COMPLETO DE JUEGOS EN PANDASTORE (${data.length} JUEGOS)\n\n`;
data.forEach((g, idx) => {
  txt += `${idx + 1}. ${g.name} (AppID: ${g.appId}) ${g.hasFix ? '[TIENE FIX]' : ''}\n`;
});

fs.writeFileSync('catalogo_actual_pandastore.txt', txt);
console.log('Listado guardado en catalogo_actual_pandastore.txt');
