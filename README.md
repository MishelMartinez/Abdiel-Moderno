# Biblioteca de Catecismos — versión moderna (8)

Nueva versión de [MishelMartinez/Abdiel](https://github.com/MishelMartinez/Abdiel), rediseñada para **celular, tableta y computadora** y pensada para una lectura cómoda a partir de los 40 años. Conserva todas las funciones de la versión 6 e incluye el **Catecismo Menor de Westminster completo (107 preguntas)**. Está preparada para sumar más catecismos y confesiones (por ejemplo, Heidelberg), un JSON por documento.

Sitio web estático, sin dependencias externas ni conexión a internet para funcionar.

## Qué hay de nuevo

| Para leer mejor | Para moverse mejor |
| --- | --- |
| Letra grande por defecto (20 px) con 5 tamaños, de 18 a 28 px | Botones y áreas táctiles de 48 px o más |
| 4 modos de color: Claro, Papel (sepia), Oscuro y Alto contraste | Índice «Ir a una pregunta» con todos los números de pregunta |
| **Escuchar**: lectura en voz alta de cada pregunta y de cada pasaje, con velocidad ajustable | Enlace directo a cada pregunta (`#pregunta-25`) y botón **Compartir** |
| Pasajes bíblicos en letra serif con buen interlineado | Barra superior fija y botón «Volver arriba» |
| Avisos claros para preguntas incompletas, notas del archivo y citas con pasaje incompleto o faltante | Se puede instalar en el celular como aplicación y usarse sin conexión |

Los ajustes de lectura se guardan en el dispositivo.

## Funciones que se conservan de la versión 6

- Todas las preguntas con sus respuestas, en orden numérico ascendente, **6 por página**. La paginación solo aparece si hay más de 6 resultados.
- Búsqueda: con solo dígitos (por ejemplo `25`) muestra únicamente esa pregunta; con palabras busca en preguntas, respuestas y referencias bíblicas, sin importar acentos. Buscar o cambiar de catecismo regresa a la página 1.
- Cada pregunta tiene su propio acordeón de **Referencias bíblicas** organizado por inciso. Cada cita con pasaje tiene el botón del ojo, que abre una ventana accesible (se cierra con la X, «Cerrar», clic fuera o Esc).
- Catálogo de catecismos en `data/catalogo.json`, listo para agregar más.
- Abrir `index.html` con doble clic funciona sin servidor ni conexión.

## Datos

- `data/catecismo-menor.json`: Catecismo Menor de Westminster, 107 preguntas y 405 citas (Reina-Valera 1960). Se usa el archivo de 107 preguntas tal como se entregó, salvo 4 pasajes que estaban más completos en la versión anterior de 33 preguntas. Esos pasajes se recuperaron y cada uno lleva su nota en `observacionPasaje`:
  - Pregunta 9, Gén. 1: el texto venía cortado.
  - Pregunta 10, Ef. 4:24: venía sin texto.
  - Pregunta 23: faltaba el comparativo 2 Cor. 13:3.
  - Pregunta 29, Jn. 1:11,12: venía incompleto.
- `data/catecismo-menor-pendientes.json`: las 18 referencias pendientes de revisión, sin cambios. Se listan en «Acerca de este documento» con un enlace a cada pregunta; las 2 recuperadas aparecen como tales.
- Cada cita muestra su `estadoPasaje` («Incompleto», «Sin texto», «Por verificar» o «Revisar»). Al tocarla se ve el detalle y la `observacionPasaje`.
- «Acerca de este documento» muestra también la versión bíblica, las observaciones y las notas de extracción.

## Cómo abrirlo

- **En línea:** https://mishelmartinez.github.io/Abdiel-Moderno/
- **En tu computadora:** abre `index.html` con doble clic.
- **En internet (GitHub Pages):** Settings > Pages > Deploy from a branch > `main` > `/ (root)`.
- **Servidor local:** `npm start` y abre http://localhost:8080.

## Catecismo Mayor de Westminster

- `fuentes/catecismo-mayor/original-en.json`: las 196 preguntas en inglés con sus referencias, tal como las publica la fuente.
- `fuentes/catecismo-mayor/traduccion-*.json`: traducción propia por bloques; `incisos` indica cuántas referencias (en orden) forman cada inciso, y `correcciones` reemplaza una referencia errónea de la fuente con su nota.
- `npm run mayor` genera `data/catecismo-mayor-westminster.json` con los pasajes de la Reina-Valera 1909 (`fuentes/rv1909/`) y el reporte `docs/catecismo-mayor/reporte-validacion-catecismo-mayor.md`. Falla si una referencia no existe en la RV1909.
- Fuentes y licencias: `docs/catecismo-mayor/fuentes-y-licencias.md`.

## Confesión de Fe Belga

- `fuentes/confesion-belga/articulos-*.json`: por bloques de artículos, el texto francés revisado en Dort (1619) tal como lo imprime Schaff, *The Creeds of Christendom*, vol. III (1877), su traducción propia al español y, por cada nota al pie, la cita impresa y las referencias que se muestran (con `nota` si se corrigió o renumeró).
- `npm run belga` genera `data/confesion-belga.json`. El documento usa `"unidad": "artículo"`, así que la aplicación muestra «Artículo N» con su título y texto, sin «Respuesta».

## Catecismo de Heidelberg

- `fuentes/heidelberg/original-de-1563.json`: texto alemán de 1563 (fuente primaria de la traducción).
- `fuentes/heidelberg/margen-1563.txt`, `libro-la-fe-que-confesamos.txt`, `referencias-de.json` y `ajustes.json`: transcripciones de las citas que `scripts/heidelberg-fuentes.mjs` combina para las preguntas 11–129.
- `fuentes/heidelberg/referencias-en.json`: las referencias bíblicas de las 129 preguntas, tomadas de reformededucation.org.
- `fuentes/heidelberg/traduccion-*.json`: traducción propia por bloques.
- `fuentes/heidelberg/citas-*.json`: citas cotejadas por inciso (notas al margen de 1563, el libro «La fe que confesamos» y reformededucation.org), con las fuentes de cada cita y, si hace falta, una `nota`.
- `npm run heidelberg` genera `data/catecismo-heidelberg.json` y el reporte `docs/heidelberg/reporte-validacion-heidelberg.md`.
- `npm run menor-oso` añade al Catecismo Menor (`PasajeOso1569`) los pasajes de la Biblia del Oso (Casiodoro de Reina, 1569) transcritos con su ortografía original desde `fuentes/catecismo-menor/biblia-oso-1569-*.json`. En la Lectura bíblica se elige la versión; la de 1569 es solo lectura (sin «Escuchar»). Cada cita es un texto o un objeto `{ "pasaje", "nota", "comparativo" }`; si la cita tiene `pasajeComparativo`, el `comparativo` de 1569 es obligatorio (se guarda en `pasajeComparativoOso1569`).
- Fuentes y licencias: `docs/heidelberg/fuentes-y-licencias.md`.

## Cómo agregar catecismos y confesiones

1. Coloca el JSON en `data/` (por ejemplo `data/heidelberg.json`). Puede ser un arreglo de preguntas o un objeto `{ "titulo", "preguntas": [...] }`. Cada pregunta lleva `numero`, `pregunta`, `respuesta` y `referenciasBiblicas: [{ "inciso", "citas": [{ "cita", "Pasaje" }] }]`. Son opcionales: `pagina`/`paginas`, `numeroNotaBiblica`, `completa`, `observacion(es)`, y en cada cita `estadoPasaje`, `observacionPasaje`, `referenciaComparativa` y `pasajeComparativo`. En el documento: `presentacion` (textos introductorios, `[{ "titulo", "parrafos": [...], "firma" }]`, todos opcionales salvo `parrafos`), `paginas`, `totalPreguntas`, `preguntasCompletas`, `versionBiblica`, `observaciones` y `observacionesExtraccion`.
2. Agrega un registro a `catecismos` en `data/catalogo.json`:
   ```json
   { "id": "heidelberg", "titulo": "Catecismo de Heidelberg", "subtitulo": "…", "tipo": "Catecismo",
     "archivo": "data/heidelberg.json", "pendientes": "data/heidelberg-pendientes.json", "activo": true }
   ```
   `tipo` puede ser «Catecismo» o «Confesión». `pendientes` es opcional y usa el formato `[{ "pregunta", "cita", "motivo" }]`.
3. Ejecuta `npm run sync`. Esto actualiza `data/biblioteca-embebida.js`, la copia que permite abrir todos los documentos con doble clic.
4. Ejecuta `npm test` para validar los datos.

## Pruebas

```bash
npm install
npx playwright install chromium
npm test
```

`npm test` valida la integridad de los datos de cada documento del catálogo (estructura, numeración, que cada referencia pendiente exista y que la copia embebida sea idéntica a los JSON) y ejecuta pruebas automáticas en navegador de escritorio y móvil. Las pruebas cubren paginación, búsqueda, pasajes, avisos, índice, ajustes, desbordamiento en todos los tamaños de letra y apertura sin servidor. También corren en GitHub Actions en cada cambio.

## Estructura

```
index.html                 Página principal
assets/estilos.css         Diseño (temas, tamaños, adaptación a móvil)
assets/app.js              Funcionamiento
assets/icono*.{svg,png}    Íconos de la app
data/catalogo.json         Catálogo de catecismos y confesiones
data/catecismo-menor.json  Catecismo Menor de Westminster (107 preguntas)
data/catecismo-menor-pendientes.json  Referencias pendientes de revisión
data/biblioteca-embebida.js  Copia embebida generada (npm run sync)
manifest.webmanifest, sw.js  Instalación en celular y uso sin conexión
scripts/                   Sincronización, validación, servidor local e íconos
tests/                     Pruebas automáticas (Playwright)
```
