// Utilidades compartidas por los generadores de catecismos: resuelve una referencia bíblica en inglés
// («Romans 8:28», «Psalm 8», «Hebrews chapters 8, 9, 10 (entire)») con el texto de la Reina-Valera 1909
// de eBible.org (fuentes/rv1909/spaRV1909_vpl.txt, dominio público).
import { readFile } from 'node:fs/promises';

export const raiz = new URL('../', import.meta.url);
export const leer = (r) => readFile(new URL(r, raiz), 'utf8');

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
const DESPLAZADOS = { '1SA 24': 1, 'JON 2': 1, 'HOS 12': 1 };
// Capítulos con numeración distinta aún sin verificar: si una referencia cae en ellos, se detiene la generación.
const POR_VERIFICAR = new Set(['NUM 13', 'NUM 30', 'JOB 39', 'JOB 40', 'JOB 41']);

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

// Convierte una referencia en inglés en { cita: {cita, Pasaje, observacionPasaje?}, versiculos, incidencia }.
// `nota` es la explicación de una corrección de la referencia, si la hubo. Lanza un error si la referencia no
// existe en la RV1909, para no inventar ni dejar pasajes vacíos.
export function citaRV1909(ref, nota = null) {
  const solo = /^(Jude|2 John|3 John|Philemon|Obadiah) (\d+(?:-\d+)?)$/.exec(ref);
  if (solo) ref = `${solo[1]} 1:${solo[2]}`;
  else if (/^[^:]+ \d+$/.test(ref)) ref = `${ref} (entire)`;
  const m = /^(.+?) ((?:chapters? )?\d.*)$/.exec(ref);
  const libro = m && LIBROS[m[1]];
  if (!libro) throw new Error(`libro no reconocido «${ref}»`);
  const { out, varios } = versiculos(libro[0], m[2]);
  const notas = nota ? [nota] : [];
  const lineas = out.map(({ cap, v }) => {
    const capitulo = `${libro[0]} ${cap}`;
    if (POR_VERIFICAR.has(capitulo)) throw new Error(`«${ref}» cae en ${capitulo}, cuya numeración en la RV1909 debe verificarse`);
    if (DESPLAZADOS[capitulo]) {
      const n = `En inglés «${ref}»; en la Reina-Valera 1909 este capítulo se numera ${DESPLAZADOS[capitulo]} versículo(s) más adelante.`;
      if (!notas.includes(n)) notas.push(n);
      v += DESPLAZADOS[capitulo];
    }
    let clave = `${capitulo}:${v}`;
    if (!biblia.has(clave) && VERSIFICACION[clave]) {
      notas.push(`En inglés «${ref}»; en la Reina-Valera 1909 este versículo es el ${VERSIFICACION[clave].split(':')[1]}.`);
      clave = VERSIFICACION[clave]; v = Number(clave.split(':')[1]);
    }
    const texto = biblia.get(clave);
    if (!texto) throw new Error(`«${ref}» no existe en la RV1909 (${clave})`);
    return `${varios ? `${cap}:` : ''}${v}. ${texto}`;
  });
  const etiqueta = m[2].replace(/^chapters? ([\d,\s]+) \(entire\)$/, (_, c) => c.replace(/\s+/g, '')).replace(/ \(entire\)$/, '').replace(/\s+/g, '');
  const cita = { cita: `${libro[1]} ${etiqueta}`, Pasaje: lineas.join('\n') };
  if (/\(entire\)/.test(m[2])) notas.unshift('Capítulo completo.');
  let incidencia = null;
  if (notas.length) {
    cita.observacionPasaje = notas.join(' ');
    if (nota || notas.some((x) => x.startsWith('En inglés'))) incidencia = `${cita.cita}: ${notas.filter((x) => x !== 'Capítulo completo.').join(' ')}`;
  }
  return { cita, versiculos: lineas.length, incidencia };
}
