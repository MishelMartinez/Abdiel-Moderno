// Genera data/catecismo-mayor-westminster.json a partir de fuentes/catecismo-mayor/preguntas.json
// (traducción propia + referencias del original en inglés) y de la Reina-Valera 1909 de eBible.org
// (fuentes/rv1909/spaRV1909_vpl.txt, dominio público). También escribe el reporte de validación.
// Ejecutar: npm run mayor
import { readFile, writeFile } from 'node:fs/promises';

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
  Hebrews: ['HEB', 'Heb.'], James: ['JAM', 'Sant.'], '1 Peter': ['1PE', '1 Ped.'], '2 Peter': ['2PE', '2 Ped.'], '1 John': ['1JO', '1 Jn.'],
  '2 John': ['2JO', '2 Jn.'], '3 John': ['3JO', '3 Jn.'], Jude: ['JUD', 'Jud.'], Revelation: ['REV', 'Apoc.']
};

const biblia = new Map();
for (const linea of (await leer('fuentes/rv1909/spaRV1909_vpl.txt')).split('\n')) {
  const m = /^(\S+) (\d+):(\d+) (.*)$/.exec(linea.trim());
  if (m) biblia.set(`${m[1]} ${m[2]}:${m[3]}`, m[4].trim());
}

function versiculos(lista) {
  const out = [];
  for (const parte of lista.split(',').map((s) => s.trim())) {
    const [a, b] = parte.split('-').map(Number);
    if (!a || (parte.includes('-') && !(b > a))) throw new Error(`versículos inválidos «${lista}»`);
    for (let v = a; v <= (b || a); v++) out.push(v);
  }
  return out;
}

const fuente = JSON.parse(await leer('fuentes/catecismo-mayor/preguntas.json'));
const incidencias = [];
let totalCitas = 0, totalVersiculos = 0;
const preguntas = fuente.preguntas.map((q) => {
  const grupos = Object.entries(q.incisos).map(([inciso, refs]) => ({
    inciso,
    citas: refs.map((ref) => {
      const equivalente = q.equivalencias?.[ref];
      const m = /^(.+?) (\d+):([\d,\s-]+)$/.exec(equivalente || ref);
      const libro = m && LIBROS[m[1]];
      if (!libro) throw new Error(`Pregunta ${q.numero}: referencia no reconocida «${ref}»`);
      const vs = versiculos(m[3]);
      const lineas = vs.map((v) => {
        const t = biblia.get(`${libro[0]} ${m[2]}:${v}`);
        if (!t) throw new Error(`Pregunta ${q.numero}: «${ref}» no existe en la RV1909 (${libro[0]} ${m[2]}:${v})`);
        return `${v}. ${t}`;
      });
      totalCitas++; totalVersiculos += vs.length;
      const cita = { cita: `${libro[1]} ${m[2]}:${m[3].replace(/\s+/g, '')}`, Pasaje: lineas.join('\n') };
      const correccion = [q.correcciones?.[ref], equivalente && `En inglés «${ref}»; en la Reina-Valera 1909 este versículo es ${cita.cita}.`].filter(Boolean).join(' ');
      if (correccion) { cita.observacionPasaje = correccion; incidencias.push(`Pregunta ${q.numero}, ${cita.cita}: ${correccion}`); }
      return cita;
    })
  }));
  return { numero: q.numero, pregunta: q.pregunta, respuesta: q.respuesta, referenciasBiblicas: grupos };
});

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
| Incisos | ${preguntas.reduce((s, q) => s + q.referenciasBiblicas.length, 0)} |
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
