// Genera data/catecismo-menor.js (copia embebida para abrir index.html con doble clic, sin servidor)
// a partir de data/catecismo-menor.json. Ejecutar: npm run sync
import { readFile, writeFile } from 'node:fs/promises';

const json = await readFile(new URL('../data/catecismo-menor.json', import.meta.url), 'utf8');
const data = JSON.parse(json);
const out = `// Archivo generado por scripts/sincronizar-datos.mjs. No editar a mano.\nwindow.CATECISMO_EMBEBIDO = ${JSON.stringify(data)};\n`;
await writeFile(new URL('../data/catecismo-menor.js', import.meta.url), out);
console.log(`Copia embebida actualizada: ${data.preguntas.length} preguntas.`);
