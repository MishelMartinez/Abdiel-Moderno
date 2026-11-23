// Genera data/catecismo-mayor-westminster.json a partir de fuentes/catecismo-mayor/original-en.json
// (texto inglés y referencias de la fuente) y fuentes/catecismo-mayor/traduccion-*.json (traducción propia e incisos) y de la Reina-Valera 1909 de eBible.org
// (fuentes/rv1909/spaRV1909_vpl.txt, dominio público). También escribe el reporte de validación.
// Ejecutar: npm run mayor
import { readdir, readFile, writeFile } from 'node:fs/promises';

const raiz = new URL('../', import.meta.url);
const leer = (r) => readFile(new URL(r, raiz), 'utf8');
const LIBROS = {
  Genesis: ['GEN', 'Gén.'], Exodus: ['EXO', 'Éx.'], Leviticus: ['LEV', 'Lev.'], Numbers: ['NUM', 'Núm.'], Deuteronomy: ['DEU', 'Deut.'],
  Joshua: ['JOS', 'Jos.'], Judges: ['JDG', 'Jue.'], Ruth: ['RUT', 'Rut'], '1 Samuel': ['1SA', '1 Sam.'], '2 Samuel': ['2SA', '2 Sam.'],
  '1 Kings': ['1KI', '1 Rey.'], '2 Kings': ['2KI', '2 Rey.'], '1 Chronicles': ['1CH', '1 Crón.'], '2 Chronicles': ['2CH', '2 Crón.'],
  Ezra: ['EZR', 'Esd.'], Nehemiah: ['NEH', 'Neh.'], Esther: ['EST', 'Est.'], Job: ['JOB', 'Job'], Psalm: ['PSA', 'Sal.'], Psalms: ['PSA', 'Sal.'],
  Proverbs: ['PRO', 'Prov.'], Ecclesiastes: ['ECC', 'Ecl.'], 'Song of Solomon': ['SOL', 'Cant.'], Isaiah: ['ISA', 'Isa.'], Jeremiah: ['JER', 'Jer.'],
  Lamentations: ['LAM', 'Lam.'], Ezekiel: ['EZE', 'Ez.'], Daniel: ['DAN', 'Dan.'], Hosea: ['HOS', 'Os.'], Joel: ['JOE', 'Joel'], Amos: ['AMO', 'Amós'],
  Obadiah: ['OBA', 'Abd.'], Jonah: ['JON', 'Jon.'], Micah: ['MIC', 'Miq.'], Nahum: ['NAH', 'Nah.'], Habakkuk: ['HAB', 'Hab.'], Zephaniah: ['ZEP', 'Sof.'],
  Haggai: ['HAG', 'Hag.'], Zechariah: ['ZEC', 'Zac.'], Malachi: ['MAL', 'Mal.'], Matthew: ['MAT', 'Mat.'], Mark: ['MAR', 'Mar.'], Luke: ['LUK', 'Luc.'],
  John: ['JOH', 'Jn.'], Acts: ['ACT', 'Hech.'], Romans: ['ROM', 'Rom.'], '1 Corinthians': ['1CO', '1 Cor.'], '2 Corinthians': ['2CO', '2 Cor.'],
  Galatians: ['GAL', 'Gál.'], Ephesians: ['EPH', 'Ef.'], Philippians: ['PHI', 'Fil.'], Colossians: ['COL', 'Col.'], '1 Thessalonians': ['1TH', '1 Tes.'],
  '2 Thessalonians': ['2TH', '2 Tes.'], '1 Timothy': ['1TI', '1 Tim.'], '2 Timothy': ['2TI', '2 Tim.'], Titus: ['TIT', 'Tit.'], Philemon: ['PHM', 'Filem.'],
  'Exod.': ['EXO', 'Éx.'], Hebrews: ['HEB', 'Heb.'], James: ['JAM', 'Sant.'], '1 Peter': ['1PE', '1 Ped.'], '2 Peter': ['2PE', '2 Ped.'], '1 John': ['1JO', '1 Jn.'],
  '2 John': ['2JO', '2 Jn.'], '3 John': ['3JO', '3 Jn.'], Jude: ['JUD', 'Jud.'], Revelation: ['REV', 'Apoc.']
};

const biblia = new Map();
const capitulos = new Map();
for (const linea of (await leer('fuentes/rv1909/spaRV1909_vpl.txt')).split('\n')) {
  const m = /^(\S+) (\d+):(\d+) (.*)$/.exec(linea.trim());
  if (!m || !m[4].trim()) continue;
  biblia.set(`${m[1]} ${m[2]}:${m[3]}`, m[4].trim());
  const k = `${m[1]} ${m[2]}`;
  capitulos.set(k, Math.max(capitulos.get(k) || 0, Number(m[3])));
}
// Versículos que la Reina-Valera 1909 numera distinto que la versión inglesa.
const VERSIFICACION = { '2CO 13:14': '2CO 13:13' };
// Capítulos que la RV1909 numera desde el versículo final del capítulo anterior (versículo inglés N = N + desplazamiento).
const DESPLAZADOS = { '1SA 24': 1 };
// Capítulos con numeración distinta aún sin verificar: si una referencia cae en ellos, se detiene la generación.
const POR_VERIFICAR = new Set(['NUM 13', 'NUM 30', 'HOS 12', 'JON 2', 'JOB 39', 'JOB 40', 'JOB 41']);

// Devuelve [{cap, v}] para «36», «24-28», «6-7, 13», «1 (entire)», «chapters 8, 9, 10 (entire)», «3:1-4:2».
function versiculos(codigo, espec) {
  const out = [];
  const entero = /^(?:chapters? )?([\d,\s]+) \(entire\)$/.exec(espec);
  if (entero) {
    for (const cap of entero[1].split(',').map((x) => Number(x.trim()))) {
      const n = capitulos.get(`${codigo} ${cap}`);
      if (!n) throw new Error(`capítulo inexistente ${codigo} ${cap}`);
      for (let v = 1; v <= n; v++) out.push({ cap, v });
    }
    return { out, varios: entero[1].includes(',') };
  }
  const m = /^(\d+):(.+)$/.exec(espec);
  if (!m) throw new Error(`referencia no reconocida «${espec}»`);
  let cap = Number(m[1]);
  let varios = false;
  for (const parte of m[2].split(',').map((x) => x.trim())) {
    const r = /^(\d+)(?:-(?:(\d+):)?(\d+))?$/.exec(parte);
    if (!r) throw new Error(`versículos inválidos «${espec}»`);
    const a = Number(r[1]);
    if (r[2]) {
      varios = true;
      for (let v = a; v <= capitulos.get(`${codigo} ${cap}`); v++) out.push({ cap, v });
      cap = Number(r[2]);
      for (let v = 1; v <= Number(r[3]); v++) out.push({ cap, v });
    } else {
      const b = r[3] ? Number(r[3]) : a;
      if (b < a) throw new Error(`rango inválido «${espec}»`);
      for (let v = a; v <= b; v++) out.push({ cap, v });
    }
  }
  return { out, varios };
}

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
    let [ref, nota] = t.correcciones?.[refOriginal] || [refOriginal, null];
    const solo = /^(Jude|2 John|3 John|Philemon|Obadiah) (\d+(?:-\d+)?)$/.exec(ref);
    if (solo) ref = `${solo[1]} 1:${solo[2]}`;
    else if (/^[^:]+ \d+$/.test(ref)) ref = `${ref} (entire)`;
    const m = /^(.+?) ((?:chapters? )?\d.*)$/.exec(ref);
    const libro = m && LIBROS[m[1]];
    if (!libro) throw new Error(`Pregunta ${o.numero}: libro no reconocido «${ref}»`);
    const { out, varios } = versiculos(libro[0], m[2]);
    const notas = nota ? [nota] : [];
    const lineas = out.map(({ cap, v }) => {
      const capitulo = `${libro[0]} ${cap}`;
      if (POR_VERIFICAR.has(capitulo)) throw new Error(`Pregunta ${o.numero}: «${ref}» cae en ${capitulo}, cuya numeración en la RV1909 debe verificarse`);
      if (DESPLAZADOS[capitulo]) {
        const nota = `En inglés «${ref}»; en la Reina-Valera 1909 este capítulo se numera ${DESPLAZADOS[capitulo]} versículo(s) más adelante.`;
        if (!notas.includes(nota)) notas.push(nota);
        v += DESPLAZADOS[capitulo];
      }
      let clave = `${capitulo}:${v}`;
      if (!biblia.has(clave) && VERSIFICACION[clave]) {
        notas.push(`En inglés «${ref}»; en la Reina-Valera 1909 este versículo es el ${VERSIFICACION[clave].split(':')[1]}.`);
        clave = VERSIFICACION[clave]; v = Number(clave.split(':')[1]);
      }
      const texto = biblia.get(clave);
      if (!texto) throw new Error(`Pregunta ${o.numero}: «${ref}» no existe en la RV1909 (${clave})`);
      return `${varios ? `${cap}:` : ''}${v}. ${texto}`;
    });
    totalCitas++; totalVersiculos += lineas.length;
    const etiqueta = m[2].replace(/^chapters? ([\d,\s]+) \(entire\)$/, (_, c) => c.replace(/\s+/g, '')).replace(/ \(entire\)$/, '').replace(/\s+/g, '');
    const cita = { cita: `${libro[1]} ${etiqueta}`, Pasaje: lineas.join('\n') };
    if (/\(entire\)/.test(m[2])) notas.unshift('Capítulo completo.');
    if (notas.length) {
      cita.observacionPasaje = notas.join(' ');
      if (nota || notas.some((x) => x.startsWith('En inglés'))) incidencias.push(`Pregunta ${o.numero}, ${cita.cita}: ${notas.filter((x) => x !== 'Capítulo completo.').join(' ')}`);
    }
    return cita;
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
    'Las letras de los incisos siguen la edición estándar de las pruebas bíblicas; la fuente en línea las presenta sin letras.'
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
| Pasajes vacíos o no encontrados | 0 |
| Versión bíblica | ${fuente.versionBiblica} (eBible.org, spaRV1909) |

## Incidencias

${incidencias.length ? incidencias.map((i) => `- ${i}`).join('\n') : '- Ninguna.'}
- La fuente en línea (reformededucation.org) advierte que su transcripción aún no se ha cotejado con una edición estándar.
- La fuente presenta las pruebas bíblicas sin letras de inciso; las letras se asignaron según la edición estándar y deben revisarse.
- La traducción al español es propia y requiere revisión y aprobación.
`;
await writeFile(new URL('docs/catecismo-mayor/reporte-validacion-catecismo-mayor.md', raiz), reporte);
console.log(`Catecismo Mayor: ${incluidas} preguntas, ${totalCitas} referencias, ${totalVersiculos} versículos.`);
