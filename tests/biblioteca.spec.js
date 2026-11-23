import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const datos = JSON.parse(readFileSync(new URL('../data/catecismo-menor.json', import.meta.url), 'utf8'));
const ordenadas = [...datos.preguntas].sort((a, b) => a.numero - b.numero);
const totalCitas = ordenadas.reduce((s, q) => s + q.referenciasBiblicas.reduce((t, g) => t + g.citas.length, 0), 0);
const tarjetas = (page) => page.locator('#preguntas article');

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('muestra 33 preguntas en 6 páginas de 6, en orden ascendente', async ({ page }) => {
  await expect(page.locator('#totalPreguntas')).toHaveText('33 preguntas');
  await expect(page.locator('#totalPortada')).toHaveText('33 preguntas');
  await expect(tarjetas(page)).toHaveCount(6);
  await expect(page.locator('#resultado')).toHaveText('Mostrando 1–6 de 33 preguntas · Orden ascendente');
  await expect(page.locator('#paginacion')).toContainText('Página 1 de 6 · 6 preguntas por página');
  await expect(page.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
  await page.getByRole('button', { name: 'Ir a página 6' }).click();
  await expect(tarjetas(page)).toHaveCount(3);
  await expect(page.locator('#resultado')).toHaveText('Mostrando 31–33 de 33 preguntas · Orden ascendente');
  await expect(page.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
});

test('no omite ningún dato: preguntas, respuestas, citas, pasajes y metadatos', async ({ page }) => {
  let citasVistas = 0;
  for (let p = 1; p <= 6; p++) {
    if (p > 1) await page.getByRole('button', { name: 'Página siguiente' }).click();
    const lote = ordenadas.slice((p - 1) * 6, p * 6);
    await expect(tarjetas(page)).toHaveCount(lote.length);
    for (const [i, q] of lote.entries()) {
      const t = tarjetas(page).nth(i);
      await expect(t.locator('.pregunta')).toHaveText(q.pregunta);
      await expect(t.locator('.respuesta p')).toHaveText(q.respuesta);
      await expect(t.locator('.meta').first()).toHaveText(`Página ${q.pagina} · Nota bíblica ${q.numeroNotaBiblica}`);
      const n = q.referenciasBiblicas.reduce((s, g) => s + g.citas.length, 0);
      await expect(t.locator('.ref-cuenta')).toHaveText(`${n} ${n === 1 ? 'cita' : 'citas'}`);
      const etiquetas = q.referenciasBiblicas.flatMap((g) => g.citas.map((c) => c.cita));
      await expect(t.locator('.cita')).toHaveText(etiquetas, { useInnerText: false });
      await expect(t.locator('.inciso')).toHaveText(q.referenciasBiblicas.map((g) => `${g.inciso}.`), { useInnerText: false });
      citasVistas += n;
    }
  }
  expect(citasVistas).toBe(totalCitas);
  expect(totalCitas).toBe(135);
});

test('cada pasaje abre en ventana con su texto exacto y se cierra con Esc', async ({ page }) => {
  const q1 = ordenadas[0];
  const tarjeta = page.locator('#pregunta-1');
  await tarjeta.getByText('Referencias bíblicas').click();
  const boton = tarjeta.getByRole('button', { name: 'Ver pasaje bíblico Sal. 73:25-28' });
  await boton.click();
  const ventana = page.locator('#ventanaPasaje');
  await expect(ventana).toBeVisible();
  await expect(page.locator('#tituloPasaje')).toHaveText('Sal. 73:25-28');
  expect(await page.locator('#textoPasaje').textContent()).toBe(q1.referenciasBiblicas[1].citas[0].Pasaje);
  await expect(page.locator('#comparativo')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(ventana).toBeHidden();
  await expect(boton).toBeFocused();
});

test('muestra la referencia comparativa (pregunta 23)', async ({ page }) => {
  await page.locator('#buscar').fill('23');
  const t = page.locator('#pregunta-23');
  await t.getByText('Referencias bíblicas').click();
  await t.getByRole('button', { name: /Heb\. 12:25/ }).click();
  await expect(page.locator('#tituloComparativo')).toHaveText('2 Cor. 13:3');
  await expect(page.locator('#textoComparativo')).toContainText('pues buscáis una prueba de que habla Cristo en mí');
  await page.getByRole('button', { name: 'Cerrar pasaje' }).click();
  await expect(page.locator('#ventanaPasaje')).toBeHidden();
});

test('búsqueda por número exacto y por palabras (sin importar acentos)', async ({ page }) => {
  await page.locator('#buscar').fill('25');
  await expect(tarjetas(page)).toHaveCount(1);
  await expect(page.locator('#pregunta-25')).toBeVisible();
  await expect(page.locator('#paginacion')).toBeHidden();
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

test('avisos del archivo: pregunta incompleta y observaciones', async ({ page }) => {
  await page.locator('#buscar').fill('33');
  await expect(page.locator('#pregunta-33 .aviso-alerta')).toContainText('incompleta');
  await expect(page.locator('#pregunta-33 .aviso-nota')).toContainText('La respuesta continúa en la página 128');
  await expect(page.locator('#pregunta-33')).toContainText('El archivo todavía no contiene referencias bíblicas');
  await page.locator('#buscar').fill('26');
  await expect(page.locator('#pregunta-26 .aviso-nota')).toContainText('inciso d está cortada');
  await page.locator('#buscar').fill('31');
  await expect(page.locator('#pregunta-31 .aviso-nota')).toContainText('sin añadir un inciso e');
  await page.locator('#buscar').fill('30');
  await expect(page.locator('#pregunta-30 .aviso')).toHaveCount(0);
});

test('notas generales del documento', async ({ page }) => {
  await page.getByText('Acerca de este documento').click();
  const notas = page.locator('#notasCuerpo');
  await expect(notas).toContainText('123, 124, 125, 126, 127');
  await expect(notas).toContainText('32');
  for (const o of datos.observaciones) await expect(notas).toContainText(o);
});

test('índice: ir directamente a una pregunta', async ({ page }) => {
  await page.getByRole('button', { name: 'Ir a una pregunta' }).click();
  await expect(page.locator('#indiceNumeros button')).toHaveCount(33);
  await page.getByRole('button', { name: 'Ir a la pregunta 25', exact: true }).click();
  await expect(page.locator('#pregunta-25')).toBeInViewport();
  await expect(page.locator('#resultado')).toContainText('Mostrando 25–30');
  await expect(page.locator('#indice')).toBeHidden();
});

test('enlace directo a una pregunta (#pregunta-30)', async ({ page }) => {
  await page.goto('/#pregunta-30');
  await expect(page.locator('#pregunta-30')).toBeInViewport();
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
  await page.locator('#pregunta-4').getByText('Referencias bíblicas').click();
  await page.getByRole('button', { name: 'Ir a una pregunta' }).click();
  for (const px of [18, 20, 22, 25, 28]) {
    await page.evaluate((v) => document.documentElement.style.setProperty('--letra', `${v}px`), px);
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(ancho, `letra ${px}px`).toBeLessThanOrEqual(0);
  }
  await page.evaluate(() => document.documentElement.style.setProperty('--letra', '20px'));
  await page.getByRole('button', { name: 'Ir a una pregunta' }).click();
  const alturas = await page.locator('#preguntas button, #paginacion button, #buscar').evaluateAll((els) =>
    els.filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect().height));
  expect(Math.min(...alturas)).toBeGreaterThanOrEqual(44);
});

test('funciona abriendo index.html con doble clic (sin servidor)', async ({ page }) => {
  await page.goto(pathToFileURL(new URL('../index.html', import.meta.url).pathname).href);
  await expect(page.locator('#totalPreguntas')).toHaveText('33 preguntas');
  await expect(tarjetas(page)).toHaveCount(6);
  await page.locator('#buscar').fill('33');
  await expect(page.locator('#pregunta-33')).toBeVisible();
});
