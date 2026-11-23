// Genera data/biblioteca-embebida.js: copia de data/catalogo.json y de cada documento (y su lista de
// referencias pendientes) para abrir index.html con doble clic, sin servidor. Ejecutar: npm run sync
import { readFile, writeFile } from 'node:fs/promises';

const leer = async (ruta) => JSON.parse(await readFile(new URL(`../${ruta}`, import.meta.url), 'utf8'));
const { catecismos } = await leer('data/catalogo.json');
const biblioteca = { catalogo: catecismos, documentos: {}, pendientes: {} };
for (const c of catecismos) {
  biblioteca.documentos[c.id] = await leer(c.archivo);
  if (c.pendientes) biblioteca.pendientes[c.id] = await leer(c.pendientes);
}
const out = `// Archivo generado por scripts/sincronizar-datos.mjs. No editar a mano.\nwindow.BIBLIOTECA_EMBEBIDA = ${JSON.stringify(biblioteca)};\n`;
await writeFile(new URL('../data/biblioteca-embebida.js', import.meta.url), out);
for (const c of catecismos) {
  const d = biblioteca.documentos[c.id];
  console.log(`${c.titulo}: ${(Array.isArray(d) ? d : d.preguntas).length} preguntas incluidas en la copia sin conexión.`);
}
