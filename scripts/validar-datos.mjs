// Valida cada documento del catálogo: estructura, numeración, referencias pendientes
// y que la copia embebida (data/biblioteca-embebida.js) sea idéntica a los JSON.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const texto = (ruta) => readFile(new URL(`../${ruta}`, import.meta.url), 'utf8');
const leer = async (ruta) => JSON.parse(await texto(ruta));
const catalogo = await leer('data/catalogo.json');
const sandbox = { window: {} };
vm.runInNewContext(await texto('data/biblioteca-embebida.js'), sandbox);
const embebida = JSON.parse(JSON.stringify(sandbox.window.BIBLIOTECA_EMBEBIDA));
const resincroniza = 'Ejecuta: npm run sync';

assert.ok(Array.isArray(catalogo.catecismos) && catalogo.catecismos.length > 0, 'catalogo.json sin documentos');
assert.deepEqual(embebida.catalogo, catalogo.catecismos, `La copia embebida no tiene el catálogo actual. ${resincroniza}`);
const ids = catalogo.catecismos.map((c) => c.id);
assert.equal(new Set(ids).size, ids.length, 'Catálogo: ids repetidos');

for (const c of catalogo.catecismos) {
  for (const campo of ['id', 'titulo', 'archivo']) assert.ok(c[campo], `Catálogo: falta «${campo}» en ${JSON.stringify(c)}`);
  const datos = await leer(c.archivo);
  assert.deepEqual(embebida.documentos[c.id], datos, `${c.archivo} no coincide con la copia embebida. ${resincroniza}`);
  const preguntas = Array.isArray(datos) ? datos : datos.preguntas;
  if (datos.presentacion !== undefined) {
    assert.ok(Array.isArray(datos.presentacion), `${c.archivo}: presentacion debe ser un arreglo`);
    for (const s of datos.presentacion) assert.ok([s.parrafos].flat().some((p) => p?.trim()), `${c.archivo}: sección de presentación sin párrafos`);
  }
  assert.ok(Array.isArray(preguntas) && preguntas.length, `${c.archivo}: sin preguntas`);
  if (datos.totalPreguntas != null) assert.ok(preguntas.length <= datos.totalPreguntas, `${c.archivo}: hay más preguntas que totalPreguntas`);
  if (datos.preguntasCompletas == null || datos.preguntasCompletas === datos.totalPreguntas) assert.equal(preguntas.length, datos.totalPreguntas ?? preguntas.length, `${c.archivo}: totalPreguntas no coincide`);
  const numeros = preguntas.map((q) => q.numero);
  assert.equal(new Set(numeros).size, numeros.length, `${c.archivo}: números de pregunta repetidos`);
  let citas = 0;
  const etiquetas = new Map();
  for (const q of preguntas) {
    const donde = `${c.archivo}, pregunta ${q.numero}`;
    assert.ok(Number.isInteger(q.numero), `${c.archivo}: pregunta sin número: ${JSON.stringify(q).slice(0, 80)}`);
    assert.ok(q.pregunta?.trim(), `${donde}: sin texto`);
    assert.ok(q.respuesta?.trim(), `${donde}: sin respuesta`);
    assert.ok(Array.isArray(q.referenciasBiblicas), `${donde}: referenciasBiblicas no es arreglo`);
    etiquetas.set(q.numero, new Set());
    for (const g of q.referenciasBiblicas) {
      assert.ok(Array.isArray(g.citas), `${donde}, inciso ${g.inciso}: sin citas`);
      for (const cita of g.citas) {
        const etiqueta = typeof cita === 'string' ? cita : cita.cita;
        assert.ok(etiqueta?.trim(), `${donde}, inciso ${g.inciso}: cita vacía`);
        if (datos.versionBiblica === 'Reina-Valera 1909') assert.ok(cita.Pasaje?.trim(), `${donde}, ${etiqueta}: pasaje vacío`);
        if (typeof cita === 'object' && 'PasajeOso1569' in cita) assert.ok(String(cita.PasajeOso1569).trim(), `${donde}, ${etiqueta}: pasaje de 1569 vacío`);
        if (typeof cita === 'object' && 'PasajeOso1569' in cita && cita.pasajeComparativo) assert.ok(String(cita.pasajeComparativoOso1569 ?? '').trim(), `${donde}, ${etiqueta}: falta el pasaje comparativo de 1569`);
        etiquetas.get(q.numero).add(etiqueta);
        citas++;
      }
    }
  }
  let pendientes = 0;
  if (c.pendientes) {
    const lista = await leer(c.pendientes);
    assert.deepEqual(embebida.pendientes[c.id], lista, `${c.pendientes} no coincide con la copia embebida. ${resincroniza}`);
    assert.ok(Array.isArray(lista), `${c.pendientes}: debe ser un arreglo`);
    for (const p of lista) {
      assert.ok(etiquetas.get(p.pregunta)?.has(p.cita), `${c.pendientes}: la cita «${p.cita}» no existe en la pregunta ${p.pregunta}`);
      assert.ok(p.motivo?.trim(), `${c.pendientes}: falta motivo en pregunta ${p.pregunta}`);
    }
    pendientes = lista.length;
  }
  console.log(`${c.titulo}: ${preguntas.length} preguntas (${numeros[0]}–${numeros.at(-1)}), ${citas} citas${c.pendientes ? `, ${pendientes} referencias pendientes` : ''}.`);
}
console.log(`Datos válidos: ${catalogo.catecismos.length} documento(s) en el catálogo.`);
