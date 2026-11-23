// Genera data/catecismo-heidelberg.json a partir de fuentes/heidelberg/original-de-1563.json (texto alemán de 1563),
// fuentes/heidelberg/traduccion-*.json (traducción propia), fuentes/heidelberg/citas-*.json (citas cotejadas con las
// notas al margen de 1563, el libro «La fe que confesamos» y reformededucation.org), fuentes/heidelberg/referencias-en.json
// (referencias de reformededucation.org, para las preguntas aún sin cotejar) y la Reina-Valera 1909.
// También escribe el reporte de validación.
// Ejecutar: npm run heidelberg
import { readdir, writeFile } from 'node:fs/promises';
import { citaRV1909, leer, raiz } from './rv1909.mjs';
import { analizar, analizarRE, combinar, leerIncisos } from './heidelberg-fuentes.mjs';

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
const archivos = (await readdir(new URL('fuentes/heidelberg/', raiz))).sort();
const traduccion = {}, cotejadas = {};
for (const f of archivos.filter((x) => /^traduccion-.*\.json$/.test(x))) Object.assign(traduccion, JSON.parse(await leer(`fuentes/heidelberg/${f}`)));
for (const f of archivos.filter((x) => /^citas-.*\.json$/.test(x))) {
  const { metodo, ...resto } = JSON.parse(await leer(`fuentes/heidelberg/${f}`));
  Object.assign(cotejadas, resto);
}
// Conjunto de versículos de una referencia («Romans 3:10, 20-23» → Romans 3:10, 3:20…); un capítulo completo es «Libro N:*».
function versos(ref) {
  const m = /^(.+?) (\d+)(?::(.+))?$/.exec(ref);
  if (!m[3]) return new Set([`${m[1]} ${m[2]}:*`]);
  const out = new Set();
  for (const parte of m[3].split(',')) {
    const [a, b = a] = parte.trim().split('-').map(Number);
    for (let v = a; v <= b; v++) out.add(`${m[1]} ${m[2]}:${v}`);
  }
  return out;
}
const TOTAL = 129;
const margen = await leerIncisos('fuentes/heidelberg/margen-1563.txt');
const libro = await leerIncisos('fuentes/heidelberg/libro-la-fe-que-confesamos.txt');
const aleman2 = JSON.parse(await leer('fuentes/heidelberg/referencias-de.json')).preguntas;
const ajustes = JSON.parse(await leer('fuentes/heidelberg/ajustes.json'));
const datosCuriosos = JSON.parse(await leer('fuentes/heidelberg/datos-curiosos.json'));
if (fuente.length !== TOTAL) throw new Error(`La fuente de referencias tiene ${fuente.length} preguntas y se esperaban ${TOTAL}`);
const erroresRV = [], incidencias = [], origen = [], omitidasRE = [], revisar = [], sinLibro = [];
let totalCitas = 0, totalVersiculos = 0, totalIncisos = 0;
const preguntas = [];
for (const o of fuente) {
  const t = traduccion[o.numero];
  if (!t) break;
  if (!aleman[o.numero]) throw new Error(`Pregunta ${o.numero}: falta el texto alemán de 1563`);
  const resolver = (ref, nota) => {
    let r;
    try { r = citaRV1909(ref, nota); } catch (e) { erroresRV.push(`Pregunta ${o.numero}: ${e.message}`); return { cita: '', Pasaje: '' }; }
    totalCitas++; totalVersiculos += r.versiculos;
    if (r.incidencia) incidencias.push(`Pregunta ${o.numero}, ${r.incidencia}`);
    return r.cita;
  };
  let grupos;
  if (cotejadas[o.numero]) {
    grupos = cotejadas[o.numero].map((citas, g) => ({ inciso: LETRAS[g % LETRAS.length], citas: citas.map((c) => {
      const cita = resolver(c.ref, c.nota || null);
      origen.push(`| ${o.numero} | ${LETRAS[g % LETRAS.length]} | ${cita.cita} | ${c.fuentes} |`);
      return cita;
    }) }));
    const incluidos = new Set(cotejadas[o.numero].flat().flatMap((c) => [...versos(c.ref)]));
    for (const p of o.pruebas) {
      const faltan = [...versos(normalizar(p))].filter((v) => !incluidos.has(v) && !incluidos.has(v.replace(/:\d+$/, ':*')));
      if (faltan.length) omitidasRE.push(`Pregunta ${o.numero}: ${p}${faltan.length < versos(normalizar(p)).size ? ` (${faltan.length > 1 ? "versículos" : "versículo"} ${faltan.map((v) => v.split(':')[1]).join(', ')})` : ''}`);
    }
  } else if (!t.incisos) {
    const re = o.pruebas.flatMap((p) => { try { return analizarRE(p); } catch (e) { incidencias.push(`Pregunta ${o.numero}: referencia de reformededucation.org no reconocida «${p}».`); return []; } });
    const c = combinar({ m: structuredClone(margen[o.numero] || []), l: libro[o.numero] || [], de: (aleman2[o.numero] || []).map((x) => analizar(x, true)), re, ajustes, numero: o.numero });
    for (const inc of c.incisos) inc.citas = inc.citas.filter((x) => {
      if (!x.ref.startsWith('Sirach')) return true;
      incidencias.push(`Pregunta ${o.numero}: la edición de 1563 cita «Syr. 3» (Eclesiástico), libro deuterocanónico que no forma parte de la Reina-Valera 1909; se muestra como «Dato curioso» con el texto de la Biblia de Casiodoro de Reina (1569).`);
      return false;
    });
    grupos = c.incisos.filter((inc) => inc.citas.length).map((inc, g) => ({ inciso: LETRAS[g % LETRAS.length], citas: inc.citas.map((x) => {
      const cita = resolver(x.ref, x.nota || null);
      if (x.cita) cita.cita = x.cita;
      origen.push(`| ${o.numero} | ${LETRAS[g % LETRAS.length]} | ${cita.cita} | ${x.fuentes} |`);
      return cita;
    }) }));
    for (const a of c.avisos) revisar.push(`Pregunta ${o.numero}: ${a}`);
    for (const x of c.omitidas) omitidasRE.push(`Pregunta ${o.numero}: ${x}`);
    if (!libro[o.numero]?.length) sinLibro.push(o.numero);
  } else {
    const tam = t.incisos || [];
    if (tam.reduce((s, n) => s + n, 0) !== o.pruebas.length) throw new Error(`Pregunta ${o.numero}: los incisos suman ${tam.reduce((s, n) => s + n, 0)} y la fuente tiene ${o.pruebas.length} referencias`);
    let i = 0;
    grupos = tam.map((n, g) => ({ inciso: LETRAS[g % LETRAS.length], citas: o.pruebas.slice(i, (i += n)).map((refOriginal) => {
      const [ref, nota] = t.correcciones?.[refOriginal] || [normalizar(refOriginal), null];
      return resolver(ref, nota);
    }) }));
  }
  totalIncisos += grupos.length;
  if (!grupos.length) incidencias.push(`Pregunta ${o.numero}: ninguna de las fuentes trae citas bíblicas para esta pregunta.`);
  preguntas.push({ numero: o.numero, pregunta: t.pregunta, respuesta: t.respuesta, referenciasBiblicas: grupos, ...(datosCuriosos[o.numero] ? { datoCurioso: datosCuriosos[o.numero] } : {}) });
}
if (erroresRV.length) { console.error(erroresRV.join('\n')); process.exit(1); }
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
    'Citas bíblicas cotejadas: las notas al margen de la edición de 1563 dan los incisos y los capítulos; el libro «La fe que confesamos», una edición alemana con versículos y reformededucation.org dan los versículos exactos. Se añaden también las citas del libro, cada una en su inciso.'
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
| Pasajes vacíos o no encontrados | 0 |
| Versión bíblica | Reina-Valera 1909 (eBible.org, spaRV1909) |

## Incidencias

${incidencias.length ? incidencias.map((i) => `- ${i}`).join('\n') : '- Ninguna.'}
- La traducción se hizo desde el alemán de 1563 y es propia; requiere revisión y aprobación.
- Método de las citas: incisos y capítulos según las notas al margen de 1563; versículos exactos según el libro «La fe que confesamos» (L), la edición alemana con versículos de heidelberger-katechismus.net (DE) y reformededucation.org (RE); se añaden las citas de L, cada una en su inciso. Las preguntas 1–10 se cotejaron a mano (fuentes/heidelberg/citas-001-010.json); las 11–129 se combinan con scripts/heidelberg-fuentes.mjs a partir de las transcripciones de fuentes/heidelberg/ y los ajustes de fuentes/heidelberg/ajustes.json.
- Preguntas sin notas en 1563 (4, 23, 24, 68, 75, 80, 83 y 92): se usan las citas del libro; si no hay, las de la edición alemana. La pregunta 80 no figura en la primera edición de 1563; su texto y las partes entre corchetes son de la segunda y la tercera edición. Las letras de 1563 vuelven a empezar en cada página del original; aquí se numeran seguidas en cada pregunta.
- En la pregunta 1, el margen de 1563 pone 1 Jn. 3 en el inciso de «me guarda»; se ubicó junto a «me libró de todo el poder del diablo», como en L, porque 1 Jn. 3:8 trata de las obras del diablo.
- Los capítulos completos (por ejemplo Gén. 3) se muestran completos de la RV1909, con la nota «Capítulo completo.».

## Citas de otras ediciones que no se incluyeron

Citas de reformededucation.org (preguntas 1–129) y de la edición alemana con versículos (preguntas 11–129) que no están en los capítulos de 1563 ni en el libro. Se registran aquí y no se muestran en la aplicación:

${omitidasRE.length ? omitidasRE.map((x) => `- ${x}`).join('\n') : '- Ninguna.'}

## Para revisar

${revisar.length ? revisar.map((x) => `- ${x}`).join('\n') : '- Nada.'}

## Preguntas sin cotejar con el libro

${sinLibro.length ? `Faltan las fotos del libro «La fe que confesamos» para las preguntas ${sinLibro[0]}–${sinLibro.at(-1)} (${sinLibro.length} preguntas). Sus citas siguen la edición de 1563, con los versículos de la edición alemana y de reformededucation.org.` : 'Ninguna.'}

## Origen de cada cita

| Pregunta | Inciso | Cita | Fuentes |
| --- | --- | --- | --- |
${origen.join('\n')}
`;
await writeFile(new URL('docs/heidelberg/reporte-validacion-heidelberg.md', raiz), reporte);
console.log(`Catecismo de Heidelberg: ${incluidas} preguntas, ${totalCitas} referencias, ${totalVersiculos} versículos.`);
