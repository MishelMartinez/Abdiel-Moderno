// Añade a data/catecismo-menor.json los pasajes de la Biblia del Oso (Casiodoro de Reina, Basilea 1569),
// transcritos con su ortografía original del facsímil de archive.org (la-biblia-del-oso), desde
// fuentes/catecismo-menor/biblia-oso-1569-*.json. Ejecutar: npm run menor-oso
import { readFile, writeFile, readdir } from 'node:fs/promises';

const url = (ruta) => new URL(`../${ruta}`, import.meta.url);
const datos = JSON.parse(await readFile(url('data/catecismo-menor.json'), 'utf8'));
const fuentes = {};
for (const f of (await readdir(url('fuentes/catecismo-menor'))).filter((n) => /^biblia-oso-1569-.*\.json$/.test(n)).sort()) {
  Object.assign(fuentes, JSON.parse(await readFile(url(`fuentes/catecismo-menor/${f}`), 'utf8')));
}
let total = 0;
for (const [numero, citas] of Object.entries(fuentes)) {
  const q = datos.preguntas.find((p) => p.numero === Number(numero));
  if (!q) throw new Error(`No existe la pregunta ${numero}`);
  const todas = q.referenciasBiblicas.flatMap((g) => g.citas);
  for (const [etiqueta, valor] of Object.entries(citas)) {
    const c = todas.find((x) => x.cita === etiqueta);
    if (!c) throw new Error(`Pregunta ${numero}: no existe la cita «${etiqueta}»`);
    const { pasaje, nota } = typeof valor === 'string' ? { pasaje: valor } : valor;
    c.PasajeOso1569 = pasaje;
    if (nota) c.notaOso1569 = nota; else delete c.notaOso1569;
    total++;
  }
  const faltan = todas.filter((c) => !c.PasajeOso1569).map((c) => c.cita);
  if (faltan.length) throw new Error(`Pregunta ${numero}: faltan pasajes de 1569 para ${faltan.join(', ')}`);
}
await writeFile(url('data/catecismo-menor.json'), `${JSON.stringify(datos, null, 2)}\n`);
console.log(`Biblia del Oso 1569: ${total} citas en ${Object.keys(fuentes).length} preguntas.`);
