// Genera data/confesion-belga.json a partir de fuentes/confesion-belga/articulos-*.json (traducción propia del texto
// francés revisado en Dort, 1619, con las notas al pie de Schaff) y la Reina-Valera 1909.
// Ejecutar: npm run belga
import { readdir, writeFile } from 'node:fs/promises';
import { citaRV1909, leer, raiz } from './rv1909.mjs';

const TOTAL = 37;
const archivos = (await readdir(new URL('fuentes/confesion-belga/', raiz))).filter((f) => /^articulos-.*\.json$/.test(f)).sort();
const articulos = {};
let metodo = '';
for (const f of archivos) {
  const fuente = JSON.parse(await leer(`fuentes/confesion-belga/${f}`));
  metodo ||= fuente.metodo;
  Object.assign(articulos, fuente.articulos);
}

const preguntas = Object.entries(articulos)
  .map(([n, a]) => {
    const numero = Number(n);
    if (!a.titulo?.trim() || !a.texto?.trim()) throw new Error(`Artículo ${n}: falta el título o el texto`);
    const referenciasBiblicas = a.notas.map((nota, i) => ({
      inciso: String(i + 1),
      citas: nota.citas.map((c) => {
        const { ref, nota: aclaracion } = typeof c === 'string' ? { ref: c } : c;
        try { return citaRV1909(ref, aclaracion).cita; } catch (e) { throw new Error(`Artículo ${n}, nota ${i + 1}: ${e.message}`); }
      })
    }));
    return { numero, pregunta: a.titulo, respuesta: a.texto, referenciasBiblicas };
  })
  .sort((a, b) => a.numero - b.numero);
preguntas.forEach((q, i) => { if (q.numero !== i + 1) throw new Error(`Falta el artículo ${i + 1}`); });

const datos = {
  titulo: 'Confesión de Fe Belga',
  unidad: 'artículo',
  totalPreguntas: TOTAL,
  preguntasCompletas: preguntas.length,
  versionBiblica: 'Reina-Valera 1909',
  observaciones: [
    preguntas.length === TOTAL ? `Incluye los ${TOTAL} artículos.` : `Incluye los artículos 1 a ${preguntas.length} de ${TOTAL}; los demás se agregarán por etapas.`,
    'Escrita en francés por Guido de Brès en 1561 y revisada por el Sínodo de Dort en 1619.',
    metodo
  ],
  observacionesExtraccion: [
    'Pasajes tomados de la Reina-Valera 1909 de eBible.org (dominio público), conservando su ortografía histórica.',
    'Las palabras entre corchetes son añadidas por los traductores de la Reina-Valera 1909 y se conservan como en la fuente.'
  ],
  preguntas
};
await writeFile(new URL('data/confesion-belga.json', raiz), `${JSON.stringify(datos, null, 2)}\n`);
const citas = preguntas.reduce((s, q) => s + q.referenciasBiblicas.reduce((t, g) => t + g.citas.length, 0), 0);
console.log(`Confesión de Fe Belga: ${preguntas.length} artículos, ${citas} citas.`);
