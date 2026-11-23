// Valida la integridad de los datos: estructura, numeración y que la copia embebida sea idéntica al JSON.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const leer = (ruta) => readFile(new URL(`../${ruta}`, import.meta.url), 'utf8');
const datos = JSON.parse(await leer('data/catecismo-menor.json'));
const catalogo = JSON.parse(await leer('data/catalogo.json'));

const sandbox = { window: {} };
vm.runInNewContext(await leer('data/catecismo-menor.js'), sandbox);
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.CATECISMO_EMBEBIDO)), datos,
  'data/catecismo-menor.js no coincide con el JSON. Ejecuta: npm run sync');

assert.ok(Array.isArray(catalogo.catecismos) && catalogo.catecismos.length > 0, 'catalogo.json sin catecismos');
for (const c of catalogo.catecismos) {
  for (const campo of ['id', 'titulo', 'archivo']) assert.ok(c[campo], `Catálogo: falta «${campo}»`);
  await leer(c.archivo);
}

const preguntas = datos.preguntas;
assert.equal(preguntas.length, datos.totalPreguntas, 'totalPreguntas no coincide');
const numeros = preguntas.map((q) => q.numero);
assert.equal(new Set(numeros).size, numeros.length, 'Números de pregunta repetidos');
let citas = 0;
for (const q of preguntas) {
  assert.ok(Number.isInteger(q.numero), `Pregunta sin número: ${JSON.stringify(q).slice(0, 80)}`);
  assert.ok(q.pregunta?.trim(), `Pregunta ${q.numero}: sin texto`);
  assert.ok(q.respuesta?.trim(), `Pregunta ${q.numero}: sin respuesta`);
  assert.ok(Array.isArray(q.referenciasBiblicas), `Pregunta ${q.numero}: referenciasBiblicas no es arreglo`);
  for (const g of q.referenciasBiblicas) {
    assert.ok(Array.isArray(g.citas), `Pregunta ${q.numero}, inciso ${g.inciso}: sin citas`);
    for (const c of g.citas) {
      const etiqueta = typeof c === 'string' ? c : c.cita;
      assert.ok(etiqueta?.trim(), `Pregunta ${q.numero}, inciso ${g.inciso}: cita vacía`);
      citas++;
    }
  }
}
console.log(`Datos válidos: ${preguntas.length} preguntas (${numeros[0]}–${numeros.at(-1)}), ${citas} citas, ${catalogo.catecismos.length} catecismo(s) en catálogo.`);
