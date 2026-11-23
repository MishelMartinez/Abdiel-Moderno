// Genera data/catecismo-heidelberg.json a partir de fuentes/heidelberg/original-de-1563.json (texto alemán de 1563),
// fuentes/heidelberg/traduccion-*.json (traducción propia e incisos), fuentes/heidelberg/referencias-en.json
// (referencias bíblicas de reformededucation.org) y la Reina-Valera 1909. También escribe el reporte de validación.
// Ejecutar: npm run heidelberg
import { readdir, writeFile } from 'node:fs/promises';
import { citaRV1909, leer, raiz } from './rv1909.mjs';

// Abreviaturas de la fuente → nombre inglés que entiende citaRV1909.
const ABREV = {
  Gen: 'Genesis', Ex: 'Exodus', Lev: 'Leviticus', Num: 'Numbers', Deut: 'Deuteronomy', Josh: 'Joshua', 'I Sam': '1 Samuel', 'II Sam': '2 Samuel',
  'I Kings': '1 Kings', 'II Kings': '2 Kings', 'I Chron': '1 Chronicles', 'II Chron': '2 Chronicles', Job: 'Job', Ps: 'Psalm', Prov: 'Proverbs',
  Eccles: 'Ecclesiastes', Is: 'Isaiah', Jer: 'Jeremiah', Ez: 'Ezekiel', Ezek: 'Ezekiel', Dan: 'Daniel', Joel: 'Joel', Mic: 'Micah', Nah: 'Nahum',
  Hab: 'Habakkuk', Zach: 'Zechariah', Zech: 'Zechariah', Matt: 'Matthew', Mark: 'Mark', Luke: 'Luke', John: 'John', Joh: 'John', Acts: 'Acts',
  Rom: 'Romans', 'I Cor': '1 Corinthians', 'II Cor': '2 Corinthians', Gal: 'Galatians', Eph: 'Ephesians', Phil: 'Philippians', Col: 'Colossians',
  'I Thess': '1 Thessalonians', 'II Thess': '2 Thessalonians', 'I Tim': '1 Timothy', 'II Tim': '2 Timothy', Tit: 'Titus', Heb: 'Hebrews',
  James: 'James', 'I Pet': '1 Peter', 'I Peter': '1 Peter', 'II Pet': '2 Peter', 'I John': '1 John', Jude: 'Jude', Rev: 'Revelation'
};
function normalizar(ref) {
  const m = /^((?:I{1,3} )?[A-Za-z]+)\.?\s+(\d.*)$/.exec(ref.trim());
  if (!m || !ABREV[m[1]]) throw new Error(`referencia no reconocida «${ref}»`);
  return `${ABREV[m[1]]} ${m[2].replace(/\s*:\s*/g, ':').replace(/\s*,\s*/g, ', ').trim()}`;
}

const LETRAS = 'abcdefghiklmnopqrstuvwxyz'.split('');
const { preguntas: fuente } = JSON.parse(await leer('fuentes/heidelberg/referencias-en.json'));
const aleman = JSON.parse(await leer('fuentes/heidelberg/original-de-1563.json'));
const traduccion = {};
for (const f of (await readdir(new URL('fuentes/heidelberg/', raiz))).filter((x) => /^traduccion-.*\.json$/.test(x)).sort()) {
  Object.assign(traduccion, JSON.parse(await leer(`fuentes/heidelberg/${f}`)));
}
const TOTAL = 129;
if (fuente.length !== TOTAL) throw new Error(`La fuente de referencias tiene ${fuente.length} preguntas y se esperaban ${TOTAL}`);
const incidencias = [];
let totalCitas = 0, totalVersiculos = 0, totalIncisos = 0;
const preguntas = [];
for (const o of fuente) {
  const t = traduccion[o.numero];
  if (!t) break;
  if (!aleman[o.numero]) throw new Error(`Pregunta ${o.numero}: falta el texto alemán de 1563`);
  const tam = t.incisos || [];
  if (tam.reduce((s, n) => s + n, 0) !== o.pruebas.length) throw new Error(`Pregunta ${o.numero}: los incisos suman ${tam.reduce((s, n) => s + n, 0)} y la fuente tiene ${o.pruebas.length} referencias`);
  let i = 0;
  const grupos = tam.map((n, g) => ({ inciso: LETRAS[g % LETRAS.length], citas: o.pruebas.slice(i, (i += n)).map((refOriginal) => {
    const [ref, nota] = t.correcciones?.[refOriginal] || [normalizar(refOriginal), null];
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
preguntas.forEach((q, i) => { if (q.numero !== i + 1) throw new Error(`Numeración no consecutiva en la posición ${i + 1}: ${q.numero}`); });
for (const q of preguntas) if (!q.pregunta.trim() || !q.respuesta.trim()) throw new Error(`Pregunta ${q.numero} vacía`);
const incluidas = preguntas.length;
const documento = {
  titulo: 'Catecismo de Heidelberg',
  totalPreguntas: TOTAL,
  preguntasCompletas: incluidas,
  versionBiblica: 'Reina-Valera 1909',
  observaciones: [
    incluidas < TOTAL ? `Versión en revisión: incluye las preguntas 1 a ${incluidas} de ${TOTAL}.` : `Incluye las ${TOTAL} preguntas.`,
    'Traducción propia al español a partir del texto original alemán de 1563 (dominio público).',
    'Las referencias bíblicas provienen de reformededucation.org, que las presenta sin letras: los incisos (a, b, c…) agrupan las referencias según las cláusulas de cada respuesta y deben cotejarse con una edición impresa.'
  ],
  observacionesExtraccion: [
    'Pasajes tomados de la Reina-Valera 1909 de eBible.org (dominio público), conservando su ortografía histórica.',
    'Las palabras entre corchetes son añadidas por los traductores de la Reina-Valera 1909 y se conservan como en la fuente.'
  ],
  preguntas
};
await writeFile(new URL('data/catecismo-heidelberg.json', raiz), `${JSON.stringify(documento, null, 2)}\n`);

const reporte = `# Reporte de validación — Catecismo de Heidelberg

Generado por \`npm run heidelberg\` (scripts/heidelberg.mjs).

| Concepto | Resultado |
| --- | --- |
| Preguntas incluidas | ${incluidas} de ${TOTAL} (1–${incluidas}) |
| Numeración consecutiva y sin duplicados | Sí |
| Preguntas o respuestas vacías | 0 |
| Texto alemán de 1563 disponible para cada pregunta incluida | Sí |
| Incisos | ${totalIncisos} |
| Referencias bíblicas | ${totalCitas} |
| Versículos con texto (RV1909) | ${totalVersiculos} |
| Referencias de la fuente sin cita en el JSON | ${fuente.slice(0, incluidas).reduce((s, o) => s + o.pruebas.length, 0) - totalCitas} |
| Pasajes vacíos o no encontrados | 0 |
| Versión bíblica | Reina-Valera 1909 (eBible.org, spaRV1909) |

## Incidencias

${incidencias.length ? incidencias.map((i) => `- ${i}`).join('\n') : '- Ninguna.'}
- La traducción se hizo desde el alemán de 1563; las referencias bíblicas son las de reformededucation.org (no las notas marginales de 1563, que son menos y solo indican capítulos).
- La fuente de referencias las presenta sin letras de inciso. Los incisos agrupan las referencias según las cláusulas de cada respuesta; deben cotejarse con una edición impresa.
- Los capítulos completos citados por la fuente (por ejemplo Sal. 8 y Gén. 3) se muestran completos de la RV1909, con la nota «Capítulo completo.».
- La traducción al español es propia y requiere revisión y aprobación.
`;
await writeFile(new URL('docs/heidelberg/reporte-validacion-heidelberg.md', raiz), reporte);
console.log(`Catecismo de Heidelberg: ${incluidas} preguntas, ${totalCitas} referencias, ${totalVersiculos} versículos.`);
