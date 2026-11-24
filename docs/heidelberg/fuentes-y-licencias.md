# Fuentes y licencias — Catecismo de Heidelberg

| Material | Fuente | Licencia |
| --- | --- | --- |
| Texto del catecismo (alemán, 1563), fuente primaria de la traducción (preguntas 1–10) | *Catechismus Oder Christlicher Vnderricht* (Heidelberg, 1563), en el facsímil de A. Wolters, *Der Heidelberger Katechismus in seiner ursprünglichen Gestalt* (Bonn, 1864): https://archive.org/details/derheidelbergerk00unse_0 | Dominio público (obra de 1563; edición de 1864) |
| Texto alemán de 1563, preguntas 11–129 | Philip Schaff, *The Creeds of Christendom*, vol. III (Nueva York, 1877), págs. 307–355, columna alemana, en la transcripción de https://reformedconfessions.org/heidelbergcatechism/text | Dominio público |
| Citas bíblicas: incisos y capítulos | Notas al margen de la edición de 1563 (mismo facsímil) | Dominio público |
| Citas bíblicas: versículos exactos y citas añadidas | Libro *La fe que confesamos* (ejemplar de la solicitante, preguntas 1–129), la edición alemana con versículos de https://www.heidelberger-katechismus.net/ y https://reformededucation.org/catechisms/heidelberg/ | Solo se usaron las referencias, que son datos; no se copió el texto del libro ni el de la página |
| Traducción al español de preguntas y respuestas | Traducción propia de este proyecto, hecha desde el alemán de 1563 | No se copió ninguna traducción española ni inglesa existente |
| Pasajes bíblicos | Reina-Valera 1909, eBible.org (`spaRV1909_vpl.zip`, https://ebible.org/spaRV1909/) | Dominio público (ficha de eBible.org) |

## Notas

- reformededucation.org publica un texto inglés moderno que parece ser una traducción protegida (la del *Book of Praise*). Por eso no se usó su texto inglés ni su texto bíblico (King James Version): solo su lista de referencias.
- El texto alemán se guarda en `fuentes/heidelberg/original-de-1563.json` con ortografía modernizada para facilitar la lectura, cotejado con el facsímil.
- Las notas al margen de 1563 indican solo capítulos; los versículos exactos vienen del libro y de reformededucation.org. Cuando ninguno de los dos los trae, el editor los eligió y lo indica en la cita.
- La Reina-Valera 1909 se conserva tal cual, con su ortografía histórica y las palabras entre corchetes de sus traductores. No se usó la Reina-Valera 1960.

- Transcripciones de trabajo, para poder revisarlas: notas al margen de 1563 en `fuentes/heidelberg/margen-1563.txt`, citas del libro en `fuentes/heidelberg/libro-la-fe-que-confesamos.txt`, edición alemana en `fuentes/heidelberg/referencias-de.json` y ajustes del editor en `fuentes/heidelberg/ajustes.json`.
- La pregunta 80 no está en la primera edición de 1563; se añadió en la segunda y la tercera del mismo año. Los pasajes entre corchetes son de la tercera edición.
- La edición de 1563 cita una vez el Eclesiástico (P105, «Syr. 3»), que no forma parte de la Reina-Valera 1909. Se muestra como «Dato curioso» (`fuentes/heidelberg/datos-curiosos.json`) con Eclesiástico 3:27 de la Biblia del Oso de Casiodoro de Reina (Basilea, 1569; dominio público, https://archive.org/details/biblia_reina_1569), leído del facsímil digital con ortografía modernizada.
