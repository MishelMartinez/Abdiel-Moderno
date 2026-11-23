// Lee las fuentes de citas del Catecismo de Heidelberg y las convierte a referencias { libro, cap, versos }:
// notas al margen de 1563 (margen-1563.txt), libro «La fe que confesamos» (libro-la-fe-que-confesamos.txt),
// edición alemana con versículos (referencias-de.json) y reformededucation.org (referencias-en.json).
import { leer } from './rv1909.mjs';

const NOMBRES = {
  Genesis: ['gen', 'gén', '1 mose'], Exodus: ['exo', 'exod', 'ex', 'éx', '2 mose'], Leviticus: ['leui', 'leuit', 'lev', '3 mose'], Numbers: ['num', 'núm', '4 mose'],
  Deuteronomy: ['deut', 'deu', '5 mose'], Joshua: ['jos', 'josh'], '1 Samuel': ['1 sam'], '2 Samuel': ['2 sam'], '1 Kings': ['1 reg', '1 rey', '1 kön', '1 kings'],
  '2 Kings': ['2 reg', '2 rey', '2 kön', '2 kings'], '1 Chronicles': ['1 par', '1 chr', '1 chron', '1 cron', '1 crón'], '2 Chronicles': ['2 par', '2 pa', '2 chr', '2 chron', '2 crón'],
  Job: ['job', 'iob', 'hiob'], Psalm: ['psal', 'psa', 'psalm', 'sal', 'ps'], Proverbs: ['prou', 'prov', 'spr'], Ecclesiastes: ['eccl', 'ecl', 'eccles', 'pred'],
  Isaiah: ['esai', 'isai', 'isa', 'is', 'jes'], Jeremiah: ['iere', 'ierem', 'jer'], Ezekiel: ['ezech', 'eze', 'ez', 'ezek', 'hes'], Daniel: ['dan'], Hosea: ['os', 'hos'],
  Joel: ['ioel', 'joel'], Micah: ['mq', 'miq', 'mic', 'mi'], Nahum: ['nah'], Habakkuk: ['hab', 'habac'], Zechariah: ['zach', 'zac', 'zech', 'sach'], Malachi: ['ml', 'mal'],
  Matthew: ['matt', 'matth', 'mat', 'mt'], Mark: ['mar', 'marc', 'mc', 'mk', 'mark'], Luke: ['luc', 'lc', 'lk', 'luke'], John: ['ioan', 'iohan', 'ioha', 'ioh', 'joh', 'jn', 'john'],
  Acts: ['act', 'hch', 'hech', 'apg', 'acts'], Romans: ['rom', 'röm'], '1 Corinthians': ['1 cor', '1 kor'], '2 Corinthians': ['2 cor', '2 kor'],
  Galatians: ['gal', 'gala', 'galat', 'gál'], Ephesians: ['ephes', 'eph', 'ef'], Philippians: ['phil', 'fil'], Colossians: ['coloss', 'col', 'kol'],
  '1 Thessalonians': ['1 thess', '1 tes'], '2 Thessalonians': ['2 thess', '2 tes'], '1 Timothy': ['1 tim', '1 ti'], '2 Timothy': ['2 tim', '2 ti'], Titus: ['tit'],
  Hebrews: ['heb', 'hebr'], James: ['iacob', 'iac', 'stg', 'sant', 'jak', 'james'], '1 Peter': ['1 pet', '1 ped', '1 petr', '1 peter'], '2 Peter': ['2 pet', '2 ped', '2 petr'],
  '1 John': ['1 ioan', '1 ioh', '1 joh', '1 jn', '1 john'], '2 John': ['2 ioan', '2 iohan', '2 joh', '2 john'], Jude: ['iudae', 'jud', 'jude', 'judas'],
  Revelation: ['apoc', 'apo', 'offb', 'rev'], Sirach: ['syr', 'sir']
};
// Salmos cuyo título ocupa versículos propios en la numeración hebrea (la que usa la edición alemana):
// versículo alemán − desplazamiento = versículo de la Reina-Valera 1909.
const TITULO_SALMO = Object.fromEntries([
  ...[3, 4, 5, 6, 7, 8, 9, 12, 13, 18, 19, 20, 21, 22, 30, 31, 34, 36, 38, 39, 40, 41, 42, 44, 45, 46, 47, 48, 49, 53, 55, 56, 57, 58, 59, 61, 62, 63, 64, 65,
    67, 68, 69, 70, 75, 76, 77, 80, 81, 83, 84, 85, 88, 89, 92, 102, 108, 140, 142].map((n) => [n, 1]),
  ...[51, 52, 54, 60].map((n) => [n, 2])
]);
export function salmoRV(ref) {
  const d = ref.libro === 'Psalm' && ref.versos && TITULO_SALMO[ref.cap];
  return d ? { ...ref, versos: new Set([...ref.versos].map((v) => Math.max(1, v - d))) } : ref;
}
const LIBRO = new Map(Object.entries(NOMBRES).flatMap(([en, abrevs]) => abrevs.map((a) => [a, en])));
const UN_CAPITULO = new Set(['Jude', '2 John']);

function libro(s) {
  const k = s.toLowerCase().replace(/\./g, ' ').replace(/^([1-5])\s*/, '$1 ').replace(/\s+/g, ' ').trim();
  return LIBRO.get(k) || LIBRO.get(k.replace(/^i /, '1 ').replace(/^ii /, '2 '));
}
// «Rom. 3:10, 20, 23; 1 Jn. 1:8,10; Gén. 3; 23:7» o «Röm 14, 8 / 1. Kor 6, 19; 15, 22» → [{ libro, cap, versos: Set|null }]
export function analizar(texto, aleman = false) {
  const out = [];
  let actual = null;
  const notasTexto = [];
  const limpio = texto.replace(/\[([^\]]*)\]/g, (_, n) => `{${notasTexto.push(n) - 1}}`).replace(/,\s*(?=(?:[1-5]\s*\.?\s*)?[A-Za-zÁÉÍÓÚÄÖÜáéíóúñäöü]{2,}\.?\s*\d)/g, ';');
  for (let parte of limpio.split(aleman ? /[;/]/ : /;/)) {
    const nota = notasTexto[/\{(\d+)\}/.exec(parte)?.[1]];
    parte = parte.replace(/\{[^}]*\}/g, '').replace(/\([^)]*\)/g, '').trim().replace(/\.$/, '');
    const n0 = out.length;
    if (!parte) continue;
    const m = /^((?:[1-5I]{1,2}\s*\.?\s*)?[A-Za-zÁÉÍÓÚÄÖÜáéíóúñäöü]+)\.?\s*(.*)$/.exec(parte);
    let resto = parte;
    if (m && libro(m[1])) { actual = libro(m[1]); resto = m[2]; }
    if (!actual) throw new Error(`referencia sin libro «${parte}» en «${texto}»`);
    resto = resto.replace(/\s+/g, '');
    if (aleman) resto = resto.replace(/^(\d+),/, '$1:').replace(/\./g, ',');
    if (!resto) { out.push({ libro: actual, cap: UN_CAPITULO.has(actual) ? 1 : null, versos: null }); continue; }
    const capRango = /^(\d+)-(\d+)$/.exec(resto);
    if (capRango && !UN_CAPITULO.has(actual)) { for (let c = +capRango[1]; c <= +capRango[2]; c++) out.push({ libro: actual, cap: c, versos: null }); continue; }
    for (const trozo of resto.split(/&|y(?=\d)|and/)) {
      if (UN_CAPITULO.has(actual) && !trozo.includes(':')) { out.push({ libro: actual, cap: 1, versos: versos(trozo) }); continue; }
      const mm = /^(\d+)(?::(.+))?$/.exec(trozo);
      if (!mm) throw new Error(`no se entiende «${trozo}» en «${texto}»`);
      out.push({ libro: actual, cap: Number(mm[1]), versos: mm[2] ? versos(mm[2]) : null });
    }
    if (nota) for (let i = n0; i < out.length; i++) out[i].nota = nota;
  }
  return out;
}
function versos(s) {
  const r = new Set();
  for (const p of s.split(',').filter(Boolean)) {
    const [a, b = a] = p.split('-').map(Number);
    if (!a || b < a || b - a > 200) throw new Error(`versículos inválidos «${s}»`);
    for (let v = a; v <= b; v++) r.add(v);
  }
  return r;
}
// Archivos de texto «P<n> | a «ancla»: citas | b …»
export async function leerIncisos(ruta) {
  const res = {};
  for (const linea of (await leer(ruta)).split('\n')) {
    const m = /^P(\d+)(?: \(cont\.\))?\s*\|(.*)$/.exec(linea.trim());
    if (!m) continue;
    const lista = (res[m[1]] ||= []);
    for (const seg of m[2].split(' | ')) {
      const s = /^\s*\|?\s*(\w)(?:\(\w\))?\s*«(.*?)»(?:\s*\([^)]*\))?:\s*(.*)$/.exec(seg);
      if (!s || /^nota\b/.test(s[3])) continue;
      const citas = s[3].replace(/\s+\((?:¿|lectura|letras|errata|Eclesi)[^)]*\)/g, '').replace(/\s+\[(?:ilegible|posible|lectura|texto cortado)[^\]]*\]/g, '');
      lista.push({ letra: s[1], ancla: s[2], refs: analizar(citas) });
    }
  }
  return res;
}

// Referencias de reformededucation.org («I Cor. 6:19, 20», «Ps 7:10», «Gen. 1 and 2») → mismas estructuras.
export function analizarRE(ref) {
  const t = ref.trim().replace(/^Col IPet\./, 'I Pet.').replace(/^I{1,3}(?=\s)/, (x) => String(x.length)).replace(/^(\d)\s*([A-Z])/, '$1 $2')
    .replace(/\s*\(entire\)/, '').replace(/(\d)\.\s.*$/, '$1').replace(/\bI(?=Pet)/, '1 ').replace(/^([A-Za-z]+):\s*/, '$1. ');
  return analizar(t.replace(/^([1-5]?\s?[A-Za-z]+)\.?(?=\s|\d)/, '$1.').replace(/^Col 1 Pet\./, '1 Pet.'));
}
const clave = (r) => `${r.libro} ${r.cap}`;
const texto = (r) => `${r.libro} ${r.cap}${r.versos ? `:${compactar(r.versos)}` : ''}`;
export { versos };
export function compactar(set) {
  const v = [...set].sort((a, b) => a - b), out = [];
  for (let i = 0; i < v.length; i++) {
    let j = i;
    while (j + 1 < v.length && v[j + 1] === v[j] + 1) j++;
    out.push(j > i + 1 ? `${v[i]}-${v[j]}` : j === i + 1 ? `${v[i]}, ${v[j]}` : `${v[i]}`);
    i = j;
  }
  return out.join(', ');
}
// Método aprobado: incisos y capítulos de 1563; versículos exactos del libro (L), de la edición alemana (DE)
// y de reformededucation.org (RE); se añaden las citas de L, cada una en su inciso.
const posicion = (i, total) => (i + 0.5) / Math.max(total, 1);
// Método aprobado: incisos y capítulos de 1563; versículos exactos del libro (L), de la edición alemana (DE)
// y de reformededucation.org (RE); se añaden las citas de L, cada una en su inciso.
export function combinar({ m = [], l = [], de = [], re = [], ajustes = {}, numero }) {
  const avisos = [], usados = new Set();
  // Cada referencia de las ediciones cotejadas lleva su posición relativa (inciso o línea) en la respuesta.
  const conPos = (grupos) => grupos.flatMap((g, i) => g.map((r) => ({ ...r, pos: posicion(i, grupos.length) })));
  const fuentesDe = [['L', conPos(l.map((i) => i.refs))], ['DE', conPos(de.map((g) => g.map(salmoRV)))], ['RE', re.map((r, i) => ({ ...r, pos: posicion(i, re.length) }))]];
  if (!m.length) m = (l.length ? l : de.map((refs) => ({ refs, ancla: '' }))).map((i) => ({ ancla: i.ancla, refs: i.refs, sin1563: true }));
  const ocurrencias = {};
  m.forEach((i, n) => i.refs.forEach((r) => (ocurrencias[clave(r)] ||= []).push(posicion(n, m.length))));
  const incisos = m.map((i, n) => ({ ancla: i.ancla, citas: i.refs.map((r) => {
    const k = clave(r), f = [i.sin1563 ? null : '1563'], vs = new Set(), notas = [];
    const occ = ocurrencias[k], aqui = posicion(n, m.length);
    if (r.nota) notas.push(r.nota);
    let completo = false;
    const reunir = (repartir) => {
      for (const [nombre, refs] of fuentesDe) {
        let iguales = refs.filter((x) => clave(x) === k);
        // Capítulo repetido en varios incisos: cada versículo va al inciso más cercano a su posición en esa edición.
        if (repartir) iguales = iguales.filter((x) => occ.reduce((b, p) => (Math.abs(p - x.pos) < Math.abs(b - x.pos) ? p : b)) === aqui);
        if (!iguales.length) continue;
        if (!f.includes(nombre)) f.push(nombre);
        for (const x of iguales) { x.versos ? x.versos.forEach((v) => vs.add(v)) : (completo = true); if (x.nota && !notas.includes(x.nota)) notas.push(x.nota); }
      }
    };
    reunir(occ.length > 1);
    if (occ.length > 1 && !vs.size && !completo) reunir(false);
    usados.add(k);
    if (occ.length > 1) avisos.push(`${k} aparece en ${occ.length} incisos de 1563: los versículos se repartieron según su lugar en cada edición; revisar.`);
    const ajuste = ajustes[`${numero}|${k}`];
    if (ajuste?.versosFijos) { vs.clear(); versos(ajuste.versosFijos).forEach((v) => vs.add(v)); }
    if (!vs.size && ajuste?.versos) versos(ajuste.versos).forEach((v) => vs.add(v));
    if (ajuste?.nota) { notas.length = 0; notas.push(ajuste.nota); }
    else if (!vs.size && !completo) { notas.push('La edición de 1563 indica solo el capítulo y ninguna de las ediciones cotejadas precisa los versículos: se muestra el capítulo completo.'); avisos.push(`${k}: capítulo completo.`); }
    return { ref: texto({ libro: r.libro, cap: r.cap, versos: vs.size ? vs : null }), fuentes: f.filter(Boolean).join(', '), ...(notas.length ? { nota: notas.join(' ') } : {}) };
  }) }));
  // Citas del libro fuera de los capítulos de 1563: van al inciso con más capítulos en común, o a uno nuevo.
  const enM = new Set(m.flatMap((i) => i.refs.map(clave)));
  let ultimo = -1;
  for (const li of m[0]?.sin1563 ? [] : l) {
    let d = -1, mejor = 0;
    m.forEach((mi, n) => { const c = mi.refs.filter((r) => li.refs.some((x) => clave(x) === clave(r))).length; if (c && c >= mejor) { mejor = c; d = n; } });
    const extra = li.refs.filter((x) => !enM.has(clave(x)));
    if (d < 0 && extra.length) { d = ultimo + 1; incisos.splice(d, 0, { ancla: li.ancla, citas: [] }); m.splice(d, 0, { refs: [] }); }
    if (d >= 0) ultimo = d;
    for (const x of extra) {
      const f = ['L', ...fuentesDe.slice(1).filter(([, refs]) => refs.some((y) => clave(y) === clave(x))).map(([n]) => n)];
      incisos[d].citas.push({ ref: texto(x), fuentes: f.join(', '), ...(x.nota ? { nota: x.nota } : {}) });
      usados.add(clave(x));
    }
  }
  const omitidas = [...de.flat(), ...re].filter((x) => !usados.has(clave(x))).map(texto);
  return { incisos: incisos.filter((i) => i.citas.length), avisos: [...new Set(avisos)], omitidas: [...new Set(omitidas)] };
}
