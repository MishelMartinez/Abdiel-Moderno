# Biblioteca de Catecismos — versión moderna (7)

Nueva versión de [MishelMartinez/Abdiel](https://github.com/MishelMartinez/Abdiel), rediseñada para **celular, tableta y computadora** y pensada para una lectura cómoda a partir de los 40 años. Conserva todo el contenido y las funciones de la versión 6.

Sitio web estático, sin dependencias externas ni conexión a internet para funcionar.

## Qué hay de nuevo

| Para leer mejor | Para moverse mejor |
| --- | --- |
| Letra grande por defecto (20 px) con 5 tamaños, de 18 a 28 px | Botones y áreas táctiles de 48 px o más |
| 4 modos de color: Claro, Papel (sepia), Oscuro y Alto contraste | Índice «Ir a una pregunta» con los números 1–33 |
| **Escuchar**: lectura en voz alta de cada pregunta y de cada pasaje, con velocidad ajustable | Enlace directo a cada pregunta (`#pregunta-25`) y botón **Compartir** |
| Pasajes bíblicos en letra serif con buen interlineado | Barra superior fija y botón «Volver arriba» |
| Avisos claros para preguntas incompletas y notas del archivo | Se puede instalar en el celular como aplicación y usarse sin conexión |

Los ajustes de lectura se guardan en el dispositivo.

## Funciones que se conservan de la versión 6

- Las 33 preguntas (1–33) con sus respuestas, en orden numérico ascendente, **6 por página** (6 páginas). La paginación solo aparece si hay más de 6 resultados.
- Búsqueda: con solo dígitos (por ejemplo `25`) muestra únicamente esa pregunta; con palabras busca en preguntas, respuestas y referencias bíblicas, sin importar acentos. Buscar o cambiar de catecismo regresa a la página 1.
- Cada pregunta tiene su propio acordeón de **Referencias bíblicas** organizado por inciso. Cada cita con pasaje tiene el botón del ojo, que abre una ventana accesible (se cierra con la X, «Cerrar», clic fuera o Esc).
- Página del original y número de nota bíblica de cada pregunta.
- Catálogo de catecismos en `data/catalogo.json`, listo para agregar más.
- Abrir `index.html` con doble clic funciona sin servidor ni conexión.

## Datos

Los archivos `data/catecismo-menor.json` y `data/catalogo.json` son **idénticos** a los de la versión 6: no se modificó ninguna pregunta, respuesta, cita ni pasaje. Ahora además se muestran datos que antes solo estaban en el JSON:

- La referencia comparativa de la pregunta 23 (`2 Cor. 13:3`) con su pasaje.
- Las notas del archivo de las preguntas 26, 31 y 33.
- La sección «Acerca de este documento»: páginas del original (123–127), total de preguntas (33), preguntas completas (32) y observaciones generales.

La pregunta 33 está incompleta en el original y se marca como tal.

## Cómo abrirlo

- **En tu computadora:** abre `index.html` con doble clic.
- **En internet (GitHub Pages):** Settings > Pages > Deploy from a branch > `main` > `/ (root)`.
- **Servidor local:** `npm start` y abre http://localhost:8080.

## Cómo agregar o actualizar catecismos

1. Coloca el JSON en `data/`. Puede ser un arreglo de preguntas o `{ "preguntas": [...] }`.
2. Agrega a `catecismos` en `data/catalogo.json` un registro con `id`, `titulo`, `subtitulo`, `archivo` (por ejemplo `data/otro-catecismo.json`) y `activo: true`.
3. Publica en GitHub Pages. Los catecismos adicionales requieren servidor o GitHub Pages; el Catecismo Menor también va incluido en `data/catecismo-menor.js` para abrir con doble clic.
4. Si cambias `data/catecismo-menor.json`, ejecuta `npm run sync` para actualizar la copia sin conexión.

## Pruebas

```bash
npm install
npx playwright install chromium
npm test
```

`npm test` valida la integridad de los datos (estructura, numeración, 135 citas y que la copia embebida sea idéntica al JSON) y ejecuta pruebas automáticas en navegador de escritorio y móvil. Las pruebas cubren paginación, búsqueda, pasajes, avisos, índice, ajustes, desbordamiento en todos los tamaños de letra y apertura sin servidor. También corren en GitHub Actions en cada cambio.

## Estructura

```
index.html                 Página principal
assets/estilos.css         Diseño (temas, tamaños, adaptación a móvil)
assets/app.js              Funcionamiento
assets/icono*.{svg,png}    Íconos de la app
data/catalogo.json         Catálogo de catecismos
data/catecismo-menor.json  Datos originales
data/catecismo-menor.js    Copia embebida generada (npm run sync)
manifest.webmanifest, sw.js  Instalación en celular y uso sin conexión
scripts/                   Sincronización, validación, servidor local e íconos
tests/                     Pruebas automáticas (Playwright)
```
