// Genera los íconos PNG de la app a partir de assets/icono.svg. Ejecutar: node scripts/generar-iconos.mjs
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const svg = await readFile(new URL('../assets/icono.svg', import.meta.url), 'utf8');
const navegador = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
for (const tam of [192, 512]) {
  const pagina = await navegador.newPage({ viewport: { width: tam, height: tam } });
  await pagina.setContent(`<style>html,body{margin:0}svg{display:block;width:${tam}px;height:${tam}px}</style>${svg}`);
  await pagina.screenshot({ path: new URL(`../assets/icono-${tam}.png`, import.meta.url).pathname, omitBackground: true });
}
await navegador.close();
