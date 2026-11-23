// Genera data/catecismo-mayor-westminster.json a partir de fuentes/catecismo-mayor/original-en.json
// (texto inglés y referencias de la fuente) y fuentes/catecismo-mayor/traduccion-*.json (traducción propia e incisos) y de la Reina-Valera 1909 de eBible.org
// (fuentes/rv1909/spaRV1909_vpl.txt, dominio público). También escribe el reporte de validación.
// Ejecutar: npm run mayor
import { readdir, writeFile } from 'node:fs/promises';
import { citaRV1909, leer, raiz } from './rv1909.mjs';

const LETRAS = 'abcdefghiklmnopqrstuvwxyz'.split('');
const original = JSON.parse(await leer('fuentes/catecismo-mayor/original-en.json'));
const traduccion = {};
for (const f of (await readdir(new URL('fuentes/catecismo-mayor/', raiz))).filter((x) => /^traduccion-.*\.json$/.test(x)).sort()) {
  Object.assign(traduccion, JSON.parse(await leer(`fuentes/catecismo-mayor/${f}`)));
}
const incidencias = [];
let totalCitas = 0, totalVersiculos = 0, totalIncisos = 0;
const preguntas = [];
for (const o of original.preguntas) {
  const t = traduccion[o.numero];
  if (!t) break;
  const tam = t.incisos || [];
  if (tam.reduce((s, n) => s + n, 0) !== o.pruebas.length) throw new Error(`Pregunta ${o.numero}: los incisos suman ${tam.reduce((s, n) => s + n, 0)} y la fuente tiene ${o.pruebas.length} referencias`);
  let i = 0;
  const grupos = tam.map((n, g) => ({ inciso: LETRAS[g % LETRAS.length].repeat(Math.floor(g / LETRAS.length) + 1), citas: o.pruebas.slice(i, (i += n)).map((refOriginal) => {
    const [ref, nota] = t.correcciones?.[refOriginal] || [refOriginal, null];
    let r;
    try { r = citaRV1909(ref, nota); } catch (e) { throw new Error(`Pregunta ${o.numero}: ${e.message}`); }
    totalCitas++; totalVersiculos += r.versiculos;
    if (r.incidencia) incidencias.push(`Pregunta ${o.numero}, ${r.incidencia}`);
    return r.cita;
  }) }));
  totalIncisos += grupos.length;
  if (!o.pruebas.length) incidencias.push(`Pregunta ${o.numero}: la fuente no trae referencias bíblicas para esta pregunta.`);
  preguntas.push({ numero: o.numero, pregunta: t.pregunta, respuesta: t.respuesta, referenciasBiblicas: grupos });
}
const fuente = { titulo: 'Catecismo Mayor de Westminster', versionBiblica: 'Reina-Valera 1909', totalPreguntas: original.preguntas.length };

const nums = preguntas.map((q) => q.numero);
nums.forEach((n, i) => { if (n !== i + 1) throw new Error(`Numeración no consecutiva en la posición ${i + 1}: ${n}`); });
for (const q of preguntas) if (!q.pregunta.trim() || !q.respuesta.trim()) throw new Error(`Pregunta ${q.numero} vacía`);
const incluidas = preguntas.length;
const documento = {
  titulo: fuente.titulo,
  totalPreguntas: fuente.totalPreguntas,
  preguntasCompletas: incluidas,
  versionBiblica: fuente.versionBiblica,
  observaciones: [
    incluidas < fuente.totalPreguntas
      ? `Versión en revisión: incluye las preguntas 1 a ${incluidas} de ${fuente.totalPreguntas}.`
      : `Incluye las ${fuente.totalPreguntas} preguntas.`,
    'Traducción propia al español a partir del texto histórico en inglés (dominio público).',
    'La fuente en línea presenta las pruebas bíblicas sin letras: los incisos (a, b, c…) agrupan las referencias según las cláusulas de cada respuesta y deben cotejarse con una edición impresa.'
  ],
  observacionesExtraccion: [
    'Pasajes tomados de la Reina-Valera 1909 de eBible.org (dominio público), conservando su ortografía histórica.',
    'Las palabras entre corchetes son añadidas por los traductores de la Reina-Valera 1909 y se conservan como en la fuente.'
  ],
  preguntas
};
await writeFile(new URL('data/catecismo-mayor-westminster.json', raiz), `${JSON.stringify(documento, null, 2)}\n`);

const reporte = `# Reporte de validación — Catecismo Mayor de Westminster

Generado por \`npm run mayor\` (scripts/catecismo-mayor.mjs).

| Concepto | Resultado |
| --- | --- |
| Preguntas incluidas | ${incluidas} de ${fuente.totalPreguntas} (1–${incluidas}) |
| Numeración consecutiva y sin duplicados | Sí |
| Preguntas o respuestas vacías | 0 |
| Incisos | ${totalIncisos} |
| Referencias bíblicas | ${totalCitas} |
| Versículos con texto (RV1909) | ${totalVersiculos} |
| Referencias de la fuente sin cita en el JSON | ${original.preguntas.slice(0, incluidas).reduce((s, o) => s + o.pruebas.length, 0) - totalCitas} |
| Pasajes vacíos o no encontrados | 0 |
| Versión bíblica | ${fuente.versionBiblica} (eBible.org, spaRV1909) |

## Incidencias

${incidencias.length ? incidencias.map((i) => `- ${i}`).join('\n') : '- Ninguna.'}
- La fuente en línea (reformededucation.org) advierte que su transcripción aún no se ha cotejado con una edición estándar.
- La fuente presenta las pruebas bíblicas sin letras de inciso. Los incisos agrupan las referencias según las cláusulas de cada respuesta (en las preguntas 1–10, según la edición estándar de 1648); deben cotejarse con una edición impresa.
- Las correcciones de referencias se basan en las ediciones estándar de las pruebas bíblicas y conservan la referencia original en la nota de cada cita.
- La traducción al español es propia y requiere revisión y aprobación.
`;
await writeFile(new URL('docs/catecismo-mayor/reporte-validacion-catecismo-mayor.md', raiz), reporte);
console.log(`Catecismo Mayor: ${incluidas} preguntas, ${totalCitas} referencias, ${totalVersiculos} versículos.`);
