import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const leer = (ruta) => JSON.parse(readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8'));
const datos = leer('data/catecismo-menor.json');
const pendientes = leer('data/catecismo-menor-pendientes.json');
const ordenadas = [...datos.preguntas].sort((a, b) => a.numero - b.numero);
const N = ordenadas.length;
const PAGINAS = Math.ceil(N / 6);
const totalCitas = ordenadas.reduce((s, q) => s + q.referenciasBiblicas.reduce((t, g) => t + g.citas.length, 0), 0);
const tarjetas = (page) => page.locator('#preguntas article');
const cita = (n, etiqueta) => ordenadas[n - 1].referenciasBiblicas.flatMap((g) => g.citas).find((c) => c.cita === etiqueta);
const abrirRefs = (page, n) => page.locator(`#pregunta-${n}`).getByText('Referencias bíblicas').click();

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test(`muestra ${N} preguntas en ${PAGINAS} páginas de 6, en orden ascendente`, async ({ page }) => {
  expect(N).toBe(107);
  await expect(page.locator('#totalPreguntas')).toHaveText(`${N} preguntas`);
  await expect(page.locator('#totalPortada')).toHaveText(`${N} preguntas`);
  await expect(tarjetas(page)).toHaveCount(6);
  await expect(page.locator('#resultado')).toHaveText(`Mostrando 1–6 de ${N} preguntas · Orden ascendente`);
  await expect(page.locator('#paginacion')).toContainText(`Página 1 de ${PAGINAS} · 6 preguntas por página`);
  await expect(page.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
  await page.getByRole('button', { name: `Ir a página ${PAGINAS}` }).click();
  await expect(tarjetas(page)).toHaveCount(N - (PAGINAS - 1) * 6);
  await expect(page.locator('#resultado')).toHaveText(`Mostrando ${(PAGINAS - 1) * 6 + 1}–${N} de ${N} preguntas · Orden ascendente`);
  await expect(page.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
});

test('no omite ningún dato: preguntas, respuestas, citas y estados', async ({ page }) => {
  test.setTimeout(120_000);
  let citasVistas = 0;
  for (let p = 1; p <= PAGINAS; p++) {
    if (p > 1) await page.getByRole('button', { name: 'Página siguiente' }).click();
    const lote = ordenadas.slice((p - 1) * 6, p * 6);
    await expect(tarjetas(page)).toHaveCount(lote.length);
    for (const [i, q] of lote.entries()) {
      const t = tarjetas(page).nth(i);
      await expect(t.locator('.pregunta')).toHaveText(q.pregunta);
      await expect(t.locator('.respuesta p')).toHaveText(q.respuesta);
      await expect(t).not.toContainText('Nota bíblica');
      const todas = q.referenciasBiblicas.flatMap((g) => g.citas);
      await expect(t.locator('.ref-cuenta')).toHaveText(`${todas.length} ${todas.length === 1 ? 'cita' : 'citas'}`);
      await expect(t.locator('.cita-etiqueta')).toHaveText(todas.map((c) => c.cita), { useInnerText: false });
      await expect(t.locator('.cita-estado')).toHaveCount(todas.filter((c) => c.estadoPasaje).length);
      await expect(t.locator('.inciso')).toHaveText(q.referenciasBiblicas.map((g) => `${g.inciso}.`), { useInnerText: false });
      for (const nota of [q.observacion, q.observaciones].flat().filter(Boolean)) await expect(t.locator('.aviso-nota')).toContainText([nota]);
      citasVistas += todas.length;
    }
  }
  expect(citasVistas).toBe(totalCitas);
  expect(totalCitas).toBe(405);
});

test('cada pasaje abre en ventana con su texto exacto y se cierra con Esc', async ({ page }) => {
  await abrirRefs(page, 1);
  const boton = page.locator('#pregunta-1').getByRole('button', { name: 'Ver pasaje bíblico Sal. 73:25-28' });
  await boton.click();
  const ventana = page.locator('#ventanaPasaje');
  await expect(ventana).toBeVisible();
  await expect(page.locator('#tituloPasaje')).toHaveText('Sal. 73:25-28');
  expect(await page.locator('#textoPasaje').textContent()).toBe(cita(1, 'Sal. 73:25-28').Pasaje);
  await expect(page.locator('#comparativo')).toBeHidden();
  await expect(page.locator('#estadoPasaje')).toBeHidden();
  await expect(page.locator('#versionPasaje')).toHaveText(`Versión: ${datos.versionBiblica}`);
  await page.keyboard.press('Escape');
  await expect(ventana).toBeHidden();
  await expect(boton).toBeFocused();
});

test('pasajes recuperados de la versión anterior (preguntas 9, 10, 23 y 29)', async ({ page }) => {
  for (const [n, etiqueta, inicio] of [[9, 'Gén. 1', '1. En el principio creó Dios'], [10, 'Ef. 4:24', '24. y renovaos'], [29, 'Jn. 1:11,12', '11. A lo suyo vino']]) {
    expect(cita(n, etiqueta).estadoPasaje).toBeUndefined();
    await page.locator('#buscar').fill(String(n));
    await abrirRefs(page, n);
    await page.locator(`#pregunta-${n}`).getByRole('button', { name: `Ver pasaje bíblico ${etiqueta}` }).click();
    await expect(page.locator('#textoPasaje')).toContainText(inicio);
    await expect(page.locator('#notaPasaje')).toContainText('recuperado de la versión anterior');
    await page.keyboard.press('Escape');
  }
  await page.locator('#buscar').fill('23');
  await abrirRefs(page, 23);
  await page.locator('#pregunta-23').getByRole('button', { name: /Heb\. 12:25/ }).click();
  await expect(page.locator('#tituloComparativo')).toHaveText('2 Cor. 13:3');
  await expect(page.locator('#textoComparativo')).toContainText('pues buscáis una prueba de que habla Cristo en mí');
  await expect(page.locator('#notaPasaje')).toContainText('se recuperó de la versión anterior');
  await page.getByRole('button', { name: 'Cerrar pasaje' }).click();
  await expect(page.locator('#ventanaPasaje')).toBeHidden();
});

test('citas con pasaje faltante o incompleto muestran su estado', async ({ page }) => {
  await page.locator('#buscar').fill('34');
  await abrirRefs(page, 34);
  const sinTexto = page.locator('#pregunta-34').getByRole('button', { name: /Ver estado de la cita Jn\. 1:12/ });
  await expect(sinTexto.locator('.cita-estado')).toHaveText('Sin texto');
  await sinTexto.click();
  await expect(page.locator('#estadoPasaje')).toHaveText(cita(34, 'Jn. 1:12').estadoPasaje);
  await expect(page.locator('#textoPasaje')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.locator('#buscar').fill('42');
  await abrirRefs(page, 42);
  const incompleto = page.locator('#pregunta-42').getByRole('button', { name: /Ver pasaje bíblico Mat\. 22:37-40/ });
  await expect(incompleto.locator('.cita-estado')).toHaveText('Incompleto');
  await incompleto.click();
  await expect(page.locator('#estadoPasaje')).toHaveText('Incompleto: faltan versículos 37');
  expect(await page.locator('#textoPasaje').textContent()).toBe(cita(42, 'Mat. 22:37-40').Pasaje);
});

test('búsqueda por número exacto y por palabras (sin importar acentos)', async ({ page }) => {
  await page.locator('#buscar').fill('25');
  await expect(tarjetas(page)).toHaveCount(1);
  await expect(page.locator('#pregunta-25')).toBeVisible();
  await expect(page.locator('#paginacion')).toBeHidden();
  await page.locator('#buscar').fill('107');
  await expect(page.locator('#pregunta-107')).toBeVisible();
  await page.locator('#buscar').fill('justificacion');
  await expect(page.locator('#pregunta-33')).toBeVisible();
  await expect(page.locator('#resultado')).toContainText('encontradas');
  await page.locator('#buscar').fill('Rom. 11:36');
  await expect(page.locator('#pregunta-1')).toBeVisible();
  await page.locator('#buscar').fill('zzzz');
  await expect(page.locator('#vacio')).toBeVisible();
  await page.getByRole('button', { name: 'Limpiar búsqueda' }).click();
  await expect(tarjetas(page)).toHaveCount(6);
  await expect(page.locator('#buscar')).toHaveValue('');
});

test('la búsqueda reinicia la paginación a la primera página', async ({ page }) => {
  await page.getByRole('button', { name: 'Ir a página 2' }).click();
  await expect(page.locator('#resultado')).toContainText('Mostrando 7–12');
  await page.locator('#buscar').fill('Dios');
  await expect(page.locator('#paginacion button[aria-current="page"]')).toHaveText('1');
});

test('observaciones del archivo en cada pregunta', async ({ page }) => {
  await page.locator('#buscar').fill('33');
  await expect(page.locator('#pregunta-33 .aviso-alerta')).toHaveCount(0);
  await expect(page.locator('#pregunta-33 .aviso-nota')).toContainText(ordenadas[32].observaciones);
  await page.locator('#buscar').fill('26');
  await expect(page.locator('#pregunta-26 .aviso-nota')).toContainText('inciso d está cortada');
  await page.locator('#buscar').fill('77');
  await expect(page.locator('#pregunta-77 .aviso-nota')).toContainText('Zab.');
  await page.locator('#buscar').fill('30');
  await expect(page.locator('#pregunta-30 .aviso')).toHaveCount(0);
});

test('acerca del documento: versión, notas y referencias pendientes', async ({ page }) => {
  await page.getByText('Acerca de este documento').click();
  const notas = page.locator('#notasCuerpo');
  const presentacion = notas.locator('.presentacion');
  await expect(presentacion).toHaveCount(datos.presentacion.length);
  await expect(presentacion.first()).toContainText('Acordado por la Asamblea de Teólogos en Westminster');
  await expect(notas.getByRole('heading', { name: 'Acta aprobando el Catecismo Menor.' })).toBeVisible();
  await expect(notas.locator('.presentacion-firma')).toHaveText('Asamblea en Edimburgo, 28 julio 1648. Sesión 19.');
  await expect(notas).toContainText(datos.paginas);
  await expect(notas).toContainText(datos.versionBiblica);
  for (const o of [...datos.observaciones, ...datos.observacionesExtraccion]) await expect(notas).toContainText(o);
  const items = notas.locator('.pendientes li');
  await expect(items).toHaveCount(pendientes.length);
  for (const [i, p] of pendientes.entries()) await expect(items.nth(i)).toContainText(`Pregunta ${p.pregunta} · ${p.cita}`);
  await expect(notas.locator('.pendiente-resuelta')).toHaveCount(2);
  await expect(notas).toContainText('18 referencias señaladas en el archivo de revisión · 2 ya recuperadas');
  await items.filter({ hasText: 'Pregunta 82' }).getByRole('button').click();
  await expect(page.locator('#pregunta-82')).toBeInViewport();
  await expect(page.locator('#pregunta-82 details.referencias')).toHaveAttribute('open', '');
});

test('índice: ir directamente a una pregunta', async ({ page }) => {
  await page.getByRole('button', { name: 'Ir a una pregunta' }).click();
  await expect(page.locator('#indiceNumeros button')).toHaveCount(N);
  await page.getByRole('button', { name: 'Ir a la pregunta 100', exact: true }).click();
  await expect(page.locator('#pregunta-100')).toBeInViewport();
  await expect(page.locator('#resultado')).toContainText('Mostrando 97–102');
  await expect(page.locator('#indice')).toBeHidden();
});

test('enlace directo a una pregunta (#pregunta-30 y #pregunta-104)', async ({ page }) => {
  await page.goto('/#pregunta-30');
  await expect(page.locator('#pregunta-30')).toBeInViewport();
  await page.goto('/#pregunta-104');
  await expect(page.locator('#pregunta-104')).toBeInViewport();
});

test('ajustes de letra y colores se guardan', async ({ page }) => {
  const tamano = () => page.evaluate(() => getComputedStyle(document.body).fontSize);
  expect(await tamano()).toBe('20px');
  await page.getByRole('button', { name: 'Ajustes de lectura' }).click();
  await page.getByRole('button', { name: 'Ampliar letra' }).click();
  await page.getByRole('button', { name: 'Ampliar letra' }).click();
  await expect(page.locator('#letraValor')).toHaveText('Muy grande');
  await page.getByRole('radio', { name: /Oscuro/ }).check();
  await page.getByRole('button', { name: 'Listo' }).click();
  await page.reload();
  expect(await tamano()).toBe('25px');
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'oscuro');
});

test('sin desbordamiento horizontal en ningún tamaño de letra y botones de tamaño cómodo', async ({ page }) => {
  await page.locator('#buscar').fill('82');
  await abrirRefs(page, 82);
  await page.getByRole('button', { name: 'Ir a una pregunta' }).click();
  await page.getByText('Acerca de este documento').click();
  for (const px of [18, 20, 22, 25, 28]) {
    await page.evaluate((v) => document.documentElement.style.setProperty('--letra', `${v}px`), px);
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(ancho, `letra ${px}px`).toBeLessThanOrEqual(0);
  }
  await page.evaluate(() => document.documentElement.style.setProperty('--letra', '20px'));
  await page.getByRole('button', { name: 'Ir a una pregunta' }).click();
  await page.getByRole('button', { name: 'Limpiar búsqueda' }).click();
  const alturas = await page.locator('#preguntas button, #paginacion button, #buscar, .enlace-pendiente').evaluateAll((els) =>
    els.filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect().height));
  expect(Math.min(...alturas)).toBeGreaterThanOrEqual(44);
});

test('funciona abriendo index.html con doble clic (sin servidor)', async ({ page }) => {
  await page.goto(pathToFileURL(new URL('../index.html', import.meta.url).pathname).href);
  await expect(page.locator('#totalPreguntas')).toHaveText(`${N} preguntas`);
  await expect(tarjetas(page)).toHaveCount(6);
  await page.locator('#buscar').fill('107');
  await expect(page.locator('#pregunta-107')).toBeVisible();
  await page.getByText('Acerca de este documento').click();
  await expect(page.locator('#notasCuerpo .pendientes li')).toHaveCount(pendientes.length);
});

test('al abrir un enlace #pregunta-N la tarjeta queda visible bajo las barras fijas', async ({ page }) => {
  await page.goto('/#pregunta-23');
  await page.reload();
  const t = page.locator('#pregunta-23');
  await expect(t).toBeInViewport();
  await page.waitForTimeout(300);
  const { tope, fijo } = await page.evaluate(() => {
    const herr = document.querySelector('.herramientas');
    const barra = document.querySelector('.barra').getBoundingClientRect().bottom;
    const fijo = getComputedStyle(herr).position === 'sticky' ? Math.max(barra, herr.getBoundingClientRect().bottom) : barra;
    return { tope: document.getElementById('pregunta-23').getBoundingClientRect().top, fijo };
  });
  expect(tope).toBeGreaterThanOrEqual(fijo);
});

test('Catecismo Mayor: se elige, muestra sus 196 preguntas y pasajes RV1909, también sin servidor', async ({ page }) => {
  const mayor = leer('data/catecismo-mayor-westminster.json');
  expect(mayor.preguntas).toHaveLength(196);
  for (const url of ['/', pathToFileURL(new URL('../index.html', import.meta.url).pathname).href]) {
    await page.goto(url);
    await page.locator('#catalogo').getByRole('button', { name: /Catecismo Mayor de Westminster/ }).click();
    await expect(page.locator('#tituloEstudio')).toHaveText('Catecismo Mayor de Westminster');
    await expect(page.locator('#totalPreguntas')).toHaveText(`${mayor.preguntas.length} preguntas`);
    await expect(page.locator('#pregunta-1 .pregunta')).toHaveText(mayor.preguntas[0].pregunta);
    await abrirRefs(page, 1);
    await page.locator('#pregunta-1').getByRole('button', { name: 'Ver pasaje bíblico Rom. 11:36' }).click();
    await expect(page.locator('#textoPasaje')).toHaveText(mayor.preguntas[0].referenciasBiblicas[0].citas[0].Pasaje);
    await expect(page.locator('#versionPasaje')).toHaveText('Versión: Reina-Valera 1909');
    await page.keyboard.press('Escape');
    await page.locator('#selectorCatecismo').selectOption('catecismo-menor');
    await expect(page.locator('#totalPreguntas')).toHaveText(`${N} preguntas`);
  }
});

test('Catecismo de Heidelberg: se elige y muestra sus pasajes RV1909, también sin servidor', async ({ page }) => {
  const hc = leer('data/catecismo-heidelberg.json');
  for (const url of ['/', pathToFileURL(new URL('../index.html', import.meta.url).pathname).href]) {
    await page.goto(url);
    await page.locator('#catalogo').getByRole('button', { name: /Catecismo de Heidelberg/ }).click();
    await expect(page.locator('#tituloEstudio')).toHaveText('Catecismo de Heidelberg');
    await expect(page.locator('#totalPreguntas')).toHaveText(`${hc.preguntas.length} preguntas`);
    await expect(page.locator('#pregunta-1 .pregunta')).toHaveText(hc.preguntas[0].pregunta);
    await abrirRefs(page, 1);
    await page.locator('#pregunta-1').getByRole('button', { name: 'Ver pasaje bíblico 1 Cor. 6:19-20' }).click();
    await expect(page.locator('#textoPasaje')).toHaveText(hc.preguntas[0].referenciasBiblicas[0].citas[0].Pasaje);
    await expect(page.locator('#versionPasaje')).toHaveText('Versión: Reina-Valera 1909');
    await page.keyboard.press('Escape');
  }
  await page.locator('#buscar').fill('105');
  await expect(page.locator('#pregunta-105 .dato-curioso')).toContainText('Dato curioso');
  await expect(page.locator('#pregunta-105 .dato-curioso-pasaje')).toContainText(hc.preguntas[104].datoCurioso.pasaje);
  await page.locator('#buscar').fill('Eclesiástico 3:27');
  await expect(page.locator('#pregunta-105')).toBeVisible();
});

test('un catecismo o confesión nuevo en catalogo.json aparece y se recuerda', async ({ page }) => {
  const catalogo = leer('data/catalogo.json');
  catalogo.catecismos.push({ id: 'prueba', titulo: 'Confesión de prueba', subtitulo: 'Documento de ejemplo', tipo: 'Confesión', archivo: 'data/prueba.json', activo: true });
  const doc = { titulo: 'Confesión de prueba', preguntas: [
    { numero: 1, pregunta: '¿Primera pregunta de prueba?', respuesta: 'Respuesta uno.', referenciasBiblicas: [{ inciso: 'a', citas: [{ cita: 'Jn. 3:16', Pasaje: '16. Porque de tal manera amó Dios al mundo…' }] }] },
    { numero: 2, pregunta: '¿Segunda pregunta de prueba?', respuesta: 'Respuesta dos.', referenciasBiblicas: [] }
  ] };
  await page.route('**/data/catalogo.json', (r) => r.fulfill({ json: catalogo }));
  await page.route('**/data/prueba.json', (r) => r.fulfill({ json: doc }));
  await page.goto('/');
  await expect(page.locator('#catalogo .libro')).toHaveCount(catalogo.catecismos.length);
  await expect(page.locator('#catalogo')).toContainText('Confesión');
  await page.locator('#catalogo').getByRole('button', { name: /Confesión de prueba/ }).click();
  await expect(page.locator('#tituloEstudio')).toHaveText('Confesión de prueba');
  await expect(page.locator('#totalPreguntas')).toHaveText('2 preguntas');
  await expect(page.locator('#pregunta-2')).toContainText('Respuesta dos.');
  await page.goto('/?documento=prueba#pregunta-2');
  await expect(page.locator('#tituloEstudio')).toHaveText('Confesión de prueba');
  await expect(page.locator('#pregunta-2')).toBeInViewport();
  await page.locator('#selectorCatecismo').selectOption('catecismo-menor');
  await expect(page.locator('#totalPreguntas')).toHaveText(`${N} preguntas`);
});

test('al cambiar de documento después de abrir un enlace compartido, recargar conserva el documento elegido', async ({ page }) => {
  await page.goto('/?documento=catecismo-menor#pregunta-5');
  await page.locator('#selectorCatecismo').selectOption('catecismo-mayor');
  await expect(page.locator('#tituloEstudio')).toHaveText('Catecismo Mayor de Westminster');
  expect(new URL(page.url()).search + new URL(page.url()).hash).toBe('');
  await page.reload();
  await expect(page.locator('#tituloEstudio')).toHaveText('Catecismo Mayor de Westminster');
});

test('Lectura bíblica: cambia entre Reina-Valera 1960 y la Biblia del Oso 1569, sin audio en 1569', async ({ page }) => {
  for (const q of ordenadas.slice(0, 60)) {
    for (const c of q.referenciasBiblicas.flatMap((g) => g.citas)) expect(c.PasajeOso1569?.trim(), `P${q.numero} ${c.cita}`).toBeTruthy();
  }
  expect(cita(42, 'Mat. 22:37-40').PasajeOso1569).toMatch(/^37\. /);
  expect(cita(49, 'Ex. 20:4-6').PasajeOso1569).toMatch(/^4\. /);
  expect(datos.versionBiblica).toBe('Reina-Valera 1960');
  await abrirRefs(page, 1);
  await page.locator('#pregunta-1').getByRole('button', { name: 'Ver pasaje bíblico Rom. 11:36' }).click();
  const versiones = page.locator('#versionesPasaje');
  const rv = versiones.getByRole('button', { name: 'Reina-Valera 1960' });
  const oso = versiones.getByRole('button', { name: 'Biblia del Oso 1569' });
  const escuchar = page.locator('#escucharPasaje');
  await expect(rv).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('#textoPasaje').textContent()).toBe(cita(1, 'Rom. 11:36').Pasaje);
  await expect(page.locator('#versionPasaje')).toHaveText('Versión: Reina-Valera 1960');
  const hayVoz = await page.evaluate(() => 'speechSynthesis' in window);
  if (hayVoz) await expect(escuchar).toBeVisible();
  await oso.click();
  await expect(oso).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('#textoPasaje').textContent()).toBe(cita(1, 'Rom. 11:36').PasajeOso1569);
  await expect(page.locator('#textoPasaje')).toContainText('ſon todas las coſas');
  await expect(page.locator('#versionPasaje')).toContainText('Biblia del Oso, Casiodoro de Reina (Basilea, 1569)');
  await expect(escuchar).toBeHidden();
  await expect(page.locator('#ventanaPasaje')).not.toContainText('PDF proporcionado');
  await page.keyboard.press('Escape');
  // La versión elegida se mantiene al abrir otro pasaje
  await page.locator('#pregunta-1').getByRole('button', { name: 'Ver pasaje bíblico Sal. 73:25-28' }).click();
  expect(await page.locator('#textoPasaje').textContent()).toBe(cita(1, 'Sal. 73:25-28').PasajeOso1569);
  await expect(escuchar).toBeHidden();
  await rv.click();
  expect(await page.locator('#textoPasaje').textContent()).toBe(cita(1, 'Sal. 73:25-28').Pasaje);
  expect(cita(1, 'Sal. 73:25-28').Pasaje).not.toContain('Masquil');
  if (hayVoz) await expect(escuchar).toBeVisible();
  await page.keyboard.press('Escape');
  // El texto comparativo también se muestra en la versión de 1569
  const hebreos = cita(23, 'Heb. 12:25 (compare con 2 Cor. 13:3)');
  expect(hebreos.pasajeComparativoOso1569?.trim()).toBeTruthy();
  await page.goto('/#pregunta-23');
  await abrirRefs(page, 23);
  await page.locator('#pregunta-23').getByRole('button', { name: /^Ver pasaje bíblico Heb\. 12:25/ }).click();
  await oso.click();
  await expect(page.locator('#comparativo')).toBeVisible();
  expect(await page.locator('#textoComparativo').textContent()).toBe(hebreos.pasajeComparativoOso1569);
  await rv.click();
  expect(await page.locator('#textoComparativo').textContent()).toBe(hebreos.pasajeComparativo);
  await page.keyboard.press('Escape');
  // Sin pasaje de 1569 todavía (pregunta 61): no se muestra el selector
  await page.goto('/#pregunta-61');
  await abrirRefs(page, 61);
  await page.locator('#pregunta-61').getByRole('button', { name: /^Ver pasaje bíblico/ }).first().click();
  await expect(versiones).toBeHidden();
  if (hayVoz) await expect(escuchar).toBeVisible();
});
