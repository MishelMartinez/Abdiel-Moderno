// Servidor estático mínimo para probar la web localmente: node scripts/servidor.mjs [puerto]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const puerto = Number(process.argv[2] || process.env.PORT || 8080);
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };

createServer(async (req, res) => {
  let ruta;
  try { ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
  if (ruta.split('/').some((s) => s.startsWith('.') || s === 'node_modules')) { res.writeHead(404).end('No encontrado'); return; }
  const archivo = normalize(join(raiz, ruta.endsWith('/') ? `${ruta}index.html` : ruta));
  if (!archivo.startsWith(raiz)) { res.writeHead(403).end(); return; }
  try {
    const cuerpo = await readFile(archivo);
    res.writeHead(200, { 'Content-Type': tipos[extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(cuerpo);
  } catch { res.writeHead(404).end('No encontrado'); }
}).listen(puerto, () => console.log(`Biblioteca disponible en http://localhost:${puerto}`));
