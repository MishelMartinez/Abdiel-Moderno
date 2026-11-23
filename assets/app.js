'use strict';

const POR_PAGINA = 6;
const TAMANOS = [
  { px: 18, nombre: 'Pequeña' },
  { px: 20, nombre: 'Normal' },
  { px: 22, nombre: 'Grande' },
  { px: 25, nombre: 'Muy grande' },
  { px: 28, nombre: 'Máxima' }
];
const TEMAS = ['claro', 'sepia', 'oscuro', 'contraste'];
const COLOR_TEMA = { claro: '#0b4f8a', sepia: '#6b4e2e', oscuro: '#111a24', contraste: '#000000' };
const CATALOGO_INICIAL = [{
  id: 'catecismo-menor',
  titulo: 'Catecismo Menor de Westminster',
  subtitulo: 'Preguntas, respuestas y referencias bíblicas',
  archivo: 'data/catecismo-menor.json',
  activo: true
}];

const $ = (id) => document.getElementById(id);
const embebido = window.CATECISMO_EMBEBIDO;
const estado = {
  catalogo: CATALOGO_INICIAL,
  activo: 'catecismo-menor',
  documento: embebido,
  preguntas: extraerPreguntas(embebido) || [],
  pagina: 1,
  tamano: leerAjuste('tamano', 1, (v) => Number.isInteger(v) && v >= 0 && v < TAMANOS.length),
  tema: leerAjuste('tema', 'claro', (v) => TEMAS.includes(v)),
  velocidad: leerAjuste('velocidad', 0.9, (v) => typeof v === 'number' && v >= 0.6 && v <= 1.2)
};

function leerAjuste(clave, defecto, valido) {
  try {
    const v = JSON.parse(localStorage.getItem(`catecismos.${clave}`));
    return valido(v) ? v : defecto;
  } catch { return defecto; }
}
function guardarAjuste(clave, valor) {
  try { localStorage.setItem(`catecismos.${clave}`, JSON.stringify(valor)); } catch { /* almacenamiento no disponible */ }
}

function extraerPreguntas(datos) {
  const arr = Array.isArray(datos) ? datos : datos?.preguntas;
  return Array.isArray(arr) ? arr : null;
}
const etiquetaCita = (c) => (typeof c === 'string' ? c : String(c?.cita ?? ''));
const textoCita = (c) => (c && typeof c === 'object' ? String(c.Pasaje ?? '') : '');
const normalizar = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const contarCitas = (q) => (q.referenciasBiblicas || []).reduce((s, g) => s + (Array.isArray(g.citas) ? g.citas.length : 0), 0);
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function el(tag, clase, texto) {
  const n = document.createElement(tag);
  if (clase) n.className = clase;
  if (texto !== undefined) n.textContent = String(texto);
  return n;
}
function icono(trazos, clase = 'ico') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  if (clase) svg.setAttribute('class', clase);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = trazos;
  return svg;
}
const ICONO_OJO = '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>';
const ICONO_VOZ = '<path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>';
const ICONO_LIBRO = '<path d="M3 5.5C6 4.5 9 5 12 7v13c-3-2-6-2.5-9-1.5Z"/><path d="M21 5.5C18 4.5 15 5 12 7v13c3-2 6-2.5 9-1.5Z"/>';
const ICONO_ALERTA = '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/>';
const ICONO_NOTA = '<path d="M5 3h10l4 4v14H5Z"/><path d="M9 12h6M9 16h6"/>';
const ICONO_FLECHA = '<path d="m6 9 6 6 6-6"/>';
const ICONO_COMPARTIR = '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/>';

/* ---------- Búsqueda y orden ---------- */
function filtrar() {
  const termino = normalizar($('buscar').value.trim());
  const seleccion = estado.preguntas.filter((q) => {
    if (!termino) return true;
    if (/^\d+$/.test(termino)) return Number(q.numero) === Number(termino);
    const textos = [q.numero, q.pregunta, q.respuesta];
    for (const g of q.referenciasBiblicas || []) {
      textos.push(g.inciso);
      for (const c of g.citas || []) textos.push(etiquetaCita(c), textoCita(c), c?.referenciaComparativa, c?.pasajeComparativo);
    }
    return normalizar(textos.join(' ')).includes(termino);
  });
  return { termino, lista: seleccion.sort((a, b) => Number(a.numero) - Number(b.numero)) };
}

/* ---------- Tarjetas ---------- */
function tarjeta(q) {
  const art = el('article', 'tarjeta');
  art.id = `pregunta-${q.numero}`;
  art.tabIndex = -1;

  const cab = el('div', 'tarjeta-cabecera');
  cab.append(el('span', 'numero', q.numero ?? '—'));
  const titulos = el('div');
  titulos.append(el('span', 'etiqueta-pregunta', `Pregunta ${q.numero ?? '—'}`), el('h3', 'pregunta', q.pregunta || 'Pregunta sin texto'));
  cab.append(titulos);
  art.append(cab);

  const resp = el('div', 'respuesta');
  resp.append(el('span', 'etiqueta-respuesta', 'Respuesta'), el('p', '', q.respuesta || 'No se incluyó respuesta.'));
  art.append(resp);

  if (q.completa === false) {
    const aviso = el('p', 'aviso aviso-alerta');
    aviso.append(icono(ICONO_ALERTA), el('span', '', 'Esta pregunta está incompleta en el documento proporcionado. El texto podría continuar en otra página.'));
    art.append(aviso);
  }
  for (const nota of [q.observacion, q.observaciones].flat().filter(Boolean)) {
    const aviso = el('p', 'aviso aviso-nota');
    aviso.append(icono(ICONO_NOTA), el('span', '', `Nota del archivo: ${nota}`));
    art.append(aviso);
  }

  const meta = [];
  if (q.pagina != null) meta.push(`Página ${q.pagina}`);
  if (q.numeroNotaBiblica != null) meta.push(`Nota bíblica ${q.numeroNotaBiblica}`);
  if (meta.length) art.append(el('p', 'meta', meta.join(' · ')));

  const acciones = el('div', 'acciones');
  const escuchar = el('button', 'boton boton-suave');
  escuchar.type = 'button';
  escuchar.dataset.voz = '';
  escuchar.append(icono(ICONO_VOZ), el('span', '', 'Escuchar'));
  escuchar.setAttribute('aria-label', `Escuchar pregunta ${q.numero} y su respuesta`);
  escuchar.addEventListener('click', () => alternarVoz(`Pregunta ${q.numero}. ${q.pregunta || ''} Respuesta: ${q.respuesta || ''}`, escuchar));
  const compartir = el('button', 'boton boton-suave');
  compartir.type = 'button';
  compartir.append(icono(ICONO_COMPARTIR), el('span', '', 'Compartir'));
  compartir.setAttribute('aria-label', `Compartir pregunta ${q.numero}`);
  compartir.addEventListener('click', () => compartirPregunta(q, compartir));
  acciones.append(escuchar, compartir);
  art.append(acciones);

  art.append(referencias(q));
  return art;
}

function referencias(q) {
  const grupos = Array.isArray(q.referenciasBiblicas) ? q.referenciasBiblicas : [];
  const det = el('details', 'referencias');
  const sum = el('summary');
  const izq = el('span', 'ref-titulo');
  const etiquetaRef = el('span');
  etiquetaRef.append(icono(ICONO_LIBRO), ' Referencias bíblicas');
  izq.append(etiquetaRef, el('span', 'ref-cuenta', plural(contarCitas(q), 'cita', 'citas')));
  const flecha = el('span', 'flecha');
  flecha.setAttribute('aria-hidden', 'true');
  flecha.append(icono(ICONO_FLECHA, ''));
  sum.append(izq, flecha);
  det.append(sum);

  const cuerpo = el('div', 'ref-cuerpo');
  if (!grupos.length) cuerpo.append(el('p', 'meta', 'El archivo todavía no contiene referencias bíblicas para esta pregunta.'));
  for (const g of grupos) {
    const fila = el('div', 'ref-fila');
    fila.append(el('span', 'inciso', g.inciso ? `${g.inciso}.` : '•'));
    const citas = el('div', 'citas');
    for (const c of g.citas || []) {
      const etiqueta = etiquetaCita(c);
      const pasaje = textoCita(c);
      if (pasaje.trim()) {
        const b = el('button', 'cita cita-boton');
        b.type = 'button';
        b.title = `Leer ${etiqueta}`;
        b.setAttribute('aria-label', `Ver pasaje bíblico ${etiqueta}`);
        b.append(el('span', '', etiqueta), icono(ICONO_OJO));
        b.addEventListener('click', () => mostrarPasaje(c, b));
        citas.append(b);
      } else {
        citas.append(el('span', 'cita', etiqueta));
      }
    }
    fila.append(citas);
    cuerpo.append(fila);
  }
  det.append(cuerpo);
  return det;
}

/* ---------- Render principal ---------- */
function render() {
  const { termino, lista } = filtrar();
  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  estado.pagina = Math.min(Math.max(1, estado.pagina), totalPaginas);
  const inicio = (estado.pagina - 1) * POR_PAGINA;
  const visibles = lista.slice(inicio, inicio + POR_PAGINA);

  detenerVoz();
  $('preguntas').replaceChildren(...visibles.map(tarjeta));
  $('vacio').hidden = lista.length !== 0;
  const primero = lista.length ? inicio + 1 : 0;
  const ultimo = Math.min(inicio + POR_PAGINA, lista.length);
  $('resultado').textContent = lista.length
    ? `Mostrando ${primero}–${ultimo} de ${lista.length} preguntas${lista.length !== estado.preguntas.length ? ' encontradas' : ''} · Orden ascendente`
    : 'Sin resultados';
  $('limpiar').hidden = !termino;
  const total = plural(estado.preguntas.length, 'pregunta', 'preguntas');
  $('totalPreguntas').textContent = total;
  $('totalPortada').textContent = total;
  renderPaginacion(totalPaginas);
  actualizarVozDisponible();
}

function renderPaginacion(totalPaginas) {
  const nav = $('paginacion');
  nav.replaceChildren();
  nav.hidden = totalPaginas <= 1;
  if (totalPaginas <= 1) return;
  const fila = el('div', 'paginacion-fila');
  const boton = (texto, destino, { deshabilitado = false, actual = false, aria = '', clase = '' } = {}) => {
    const b = el('button', `pagina ${clase}`.trim(), texto);
    b.type = 'button';
    b.disabled = deshabilitado;
    if (actual) b.setAttribute('aria-current', 'page');
    if (aria) b.setAttribute('aria-label', aria);
    b.addEventListener('click', () => irAPagina(destino));
    fila.append(b);
  };
  boton('‹ Anterior', estado.pagina - 1, { deshabilitado: estado.pagina === 1, aria: 'Página anterior', clase: 'pagina-paso' });
  const paginas = [...new Set([1, totalPaginas, estado.pagina - 1, estado.pagina, estado.pagina + 1])]
    .filter((p) => p >= 1 && p <= totalPaginas).sort((a, b) => a - b);
  let previa = 0;
  for (const p of paginas) {
    if (previa && p - previa > 1) fila.append(el('span', 'puntos', '…'));
    boton(p, p, { actual: p === estado.pagina, aria: `Ir a página ${p}` });
    previa = p;
  }
  boton('Siguiente ›', estado.pagina + 1, { deshabilitado: estado.pagina === totalPaginas, aria: 'Página siguiente', clase: 'pagina-paso' });
  nav.append(fila, el('p', 'paginacion-nota', `Página ${estado.pagina} de ${totalPaginas} · ${POR_PAGINA} preguntas por página`));
}

function irAPagina(p) {
  estado.pagina = p;
  render();
  $('resultado').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- Índice e ir a pregunta ---------- */
function renderIndice() {
  const cont = $('indiceNumeros');
  const numeros = estado.preguntas.map((q) => Number(q.numero)).filter(Number.isFinite).sort((a, b) => a - b);
  cont.replaceChildren(...numeros.map((n) => {
    const b = el('button', 'indice-numero', n);
    b.type = 'button';
    b.setAttribute('aria-label', `Ir a la pregunta ${n}`);
    b.addEventListener('click', () => irAPregunta(n));
    return b;
  }));
}

function irAPregunta(numero, { suave = true } = {}) {
  const orden = [...estado.preguntas].sort((a, b) => Number(a.numero) - Number(b.numero));
  const pos = orden.findIndex((q) => Number(q.numero) === Number(numero));
  if (pos < 0) return false;
  $('buscar').value = '';
  estado.pagina = Math.floor(pos / POR_PAGINA) + 1;
  render();
  alternarIndice(false);
  const art = $(`pregunta-${numero}`);
  if (art) {
    art.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' });
    art.focus({ preventScroll: true });
    art.classList.remove('resaltada');
    void art.offsetWidth;
    art.classList.add('resaltada');
  }
  return true;
}

function alternarIndice(abrir) {
  const indice = $('indice');
  const mostrar = abrir ?? indice.hidden;
  indice.hidden = !mostrar;
  $('abrirIndice').setAttribute('aria-expanded', String(mostrar));
}

/* ---------- Notas del documento ---------- */
function renderNotas() {
  const doc = estado.documento && !Array.isArray(estado.documento) ? estado.documento : null;
  const det = $('notasDocumento');
  const cuerpo = $('notasCuerpo');
  cuerpo.replaceChildren();
  if (!doc) { det.hidden = true; return; }
  const datos = el('dl', 'notas-datos');
  const agregar = (dt, dd) => { if (dd == null || dd === '') return; datos.append(el('dt', '', dt), el('dd', '', dd)); };
  agregar('Título', doc.titulo);
  agregar('Páginas del original', Array.isArray(doc.paginas) ? doc.paginas.join(', ') : doc.paginas);
  agregar('Total de preguntas', doc.totalPreguntas);
  agregar('Preguntas completas', doc.preguntasCompletas);
  if (datos.childElementCount) cuerpo.append(datos);
  const obs = [doc.observaciones].flat().filter(Boolean);
  if (obs.length) {
    cuerpo.append(el('h3', '', 'Observaciones'));
    const ul = el('ul');
    for (const o of obs) ul.append(el('li', '', o));
    cuerpo.append(ul);
  }
  det.hidden = !cuerpo.childElementCount;
}

/* ---------- Catálogo ---------- */
async function leerJson(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function renderCatalogo() {
  const activos = estado.catalogo.filter((c) => c.activo !== false);
  const select = $('selectorCatecismo');
  select.replaceChildren(...activos.map((c) => { const o = el('option', '', c.titulo); o.value = c.id; return o; }));
  select.value = estado.activo;
  $('catalogo').replaceChildren(...activos.map((c) => {
    const b = el('button', `libro${c.id === estado.activo ? ' activo' : ''}`);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(c.id === estado.activo));
    const texto = el('span', 'libro-texto');
    texto.append(el('strong', '', c.titulo), el('small', '', c.subtitulo || 'Preguntas, respuestas y referencias bíblicas'));
    const ic = el('span', 'libro-icono');
    ic.append(icono(ICONO_LIBRO));
    b.append(ic, texto);
    b.addEventListener('click', () => elegir(c.id));
    return b;
  }));
  $('selectorCatecismo').closest('.selector').hidden = activos.length <= 1;
}

async function elegir(id) {
  const c = estado.catalogo.find((x) => x.id === id);
  if (!c) return;
  const error = $('errorCarga');
  error.hidden = true;
  let datos;
  if (id === 'catecismo-menor') {
    datos = embebido;
    try { if (location.protocol !== 'file:') datos = await leerJson(c.archivo); } catch { datos = embebido; }
  } else {
    try { datos = await leerJson(c.archivo); } catch (e) {
      error.textContent = `No se pudo leer el archivo de «${c.titulo}»: ${e.message}. Publica la web en GitHub Pages para cargar archivos adicionales.`;
      error.hidden = false;
      renderCatalogo();
      return;
    }
  }
  const preguntas = extraerPreguntas(datos);
  if (!preguntas) {
    error.textContent = 'El JSON debe contener un arreglo de preguntas o un objeto con la propiedad preguntas.';
    error.hidden = false;
    renderCatalogo();
    return;
  }
  estado.activo = id;
  estado.documento = datos;
  estado.preguntas = preguntas;
  estado.pagina = 1;
  $('tituloEstudio').textContent = c.titulo;
  $('subtituloEstudio').textContent = c.subtitulo || 'Preguntas, respuestas y referencias bíblicas';
  $('buscar').value = '';
  renderCatalogo();
  renderNotas();
  renderIndice();
  render();
}

/* ---------- Ventanas ---------- */
let focoPrevio = null;
function abrirVentana(dialogo, disparador) {
  focoPrevio = disparador || document.activeElement;
  if (typeof dialogo.showModal === 'function') dialogo.showModal(); else dialogo.setAttribute('open', '');
}
function prepararVentana(dialogo) {
  dialogo.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', () => dialogo.close()));
  dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); });
  dialogo.addEventListener('close', () => {
    detenerVoz();
    if (focoPrevio?.isConnected) focoPrevio.focus();
    focoPrevio = null;
  });
}

function mostrarPasaje(cita, disparador) {
  const etiqueta = etiquetaCita(cita);
  const pasaje = textoCita(cita);
  $('tituloPasaje').textContent = etiqueta;
  $('textoPasaje').textContent = pasaje;
  const comp = cita?.pasajeComparativo;
  $('comparativo').hidden = !comp;
  $('tituloComparativo').textContent = cita?.referenciaComparativa || '';
  $('textoComparativo').textContent = comp || '';
  const escuchar = $('escucharPasaje');
  escuchar.onclick = () => alternarVoz(`${etiqueta}. ${pasaje}${comp ? ` Compare con ${cita.referenciaComparativa || ''}. ${comp}` : ''}`, escuchar);
  abrirVentana($('ventanaPasaje'), disparador);
}

/* ---------- Voz ---------- */
const voz = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window ? window.speechSynthesis : null;
let botonHablando = null;

function vozEspanol() {
  const voces = voz?.getVoices() || [];
  return voces.find((v) => /^es[-_](MX|US|419)/i.test(v.lang)) || voces.find((v) => /^es/i.test(v.lang)) || null;
}
function marcarBoton(boton, hablando) {
  if (!boton) return;
  boton.classList.toggle('hablando', hablando);
  const texto = boton.querySelector('span') || boton;
  if (!boton.dataset.textoOriginal) boton.dataset.textoOriginal = texto.textContent;
  texto.textContent = hablando ? 'Detener' : boton.dataset.textoOriginal;
}
function detenerVoz() {
  if (!voz) return;
  voz.cancel();
  marcarBoton(botonHablando, false);
  botonHablando = null;
}
function alternarVoz(texto, boton) {
  if (!voz) return;
  const eraEste = botonHablando === boton;
  detenerVoz();
  if (eraEste) return;
  const u = new SpeechSynthesisUtterance(texto.replace(/(^|\n)\d+\.\s/g, '$1'));
  u.lang = 'es-MX';
  u.rate = estado.velocidad;
  const v = vozEspanol();
  if (v) u.voice = v;
  u.onend = u.onerror = () => { if (botonHablando === boton) { marcarBoton(boton, false); botonHablando = null; } };
  botonHablando = boton;
  marcarBoton(boton, true);
  voz.speak(u);
}
function actualizarVozDisponible() {
  document.querySelectorAll('[data-voz]').forEach((b) => { b.hidden = !voz; });
  $('opcionVoz').hidden = !voz;
}

/* ---------- Compartir ---------- */
async function compartirPregunta(q, boton) {
  const url = new URL(location.href);
  url.hash = `pregunta-${q.numero}`;
  const local = url.protocol === 'file:';
  const texto = `Pregunta ${q.numero}: ${q.pregunta}\n${q.respuesta}`;
  try {
    if (navigator.share && !local) { await navigator.share({ title: `Pregunta ${q.numero}`, text: texto, url: url.href }); return; }
    await navigator.clipboard.writeText(local ? texto : `${texto}\n${url.href}`);
    avisoTemporal(boton, '✓ Copiado');
  } catch (e) {
    if (e?.name !== 'AbortError') avisoTemporal(boton, 'No se pudo copiar');
  }
}
function avisoTemporal(boton, texto) {
  const span = boton.querySelector('span');
  const original = span.textContent;
  span.textContent = texto;
  setTimeout(() => { span.textContent = original; }, 2200);
}

/* ---------- Ajustes ---------- */
function aplicarAjustes() {
  const t = TAMANOS[estado.tamano];
  document.documentElement.style.setProperty('--letra', `${t.px}px`);
  $('letraValor').textContent = t.nombre;
  $('letraMenos').disabled = estado.tamano === 0;
  $('letraMas').disabled = estado.tamano === TAMANOS.length - 1;
  document.documentElement.dataset.tema = estado.tema;
  document.querySelector('meta[name="theme-color"]').content = COLOR_TEMA[estado.tema];
  document.querySelectorAll('input[name="tema"]').forEach((r) => { r.checked = r.value === estado.tema; });
  $('velocidadVoz').value = estado.velocidad;
  $('velocidadValor').textContent = `${estado.velocidad.toFixed(1)}×`;
}
function cambiarTamano(paso) {
  estado.tamano = Math.min(TAMANOS.length - 1, Math.max(0, estado.tamano + paso));
  guardarAjuste('tamano', estado.tamano);
  aplicarAjustes();
}

/* ---------- Eventos ---------- */
$('buscar').addEventListener('input', () => { estado.pagina = 1; render(); });
$('limpiar').addEventListener('click', () => { $('buscar').value = ''; estado.pagina = 1; render(); $('buscar').focus(); });
$('abrirIndice').addEventListener('click', () => alternarIndice());
$('selectorCatecismo').addEventListener('change', (e) => elegir(e.target.value));
$('abrirAjustes').addEventListener('click', (e) => abrirVentana($('ajustes'), e.currentTarget));
$('letraMenos').addEventListener('click', () => cambiarTamano(-1));
$('letraMas').addEventListener('click', () => cambiarTamano(1));
document.querySelectorAll('input[name="tema"]').forEach((r) => r.addEventListener('change', () => {
  estado.tema = r.value; guardarAjuste('tema', estado.tema); aplicarAjustes();
}));
$('velocidadVoz').addEventListener('input', (e) => {
  estado.velocidad = Number(e.target.value); guardarAjuste('velocidad', estado.velocidad); aplicarAjustes();
});
prepararVentana($('ajustes'));
prepararVentana($('ventanaPasaje'));

const arriba = $('arriba');
arriba.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); $('contenido').focus({ preventScroll: true }); });
window.addEventListener('scroll', () => { arriba.hidden = window.scrollY < 600; }, { passive: true });

function abrirDesdeEnlace() {
  const m = /^#pregunta-(\d+)$/.exec(location.hash);
  if (m) irAPregunta(Number(m[1]), { suave: false });
}
window.addEventListener('hashchange', abrirDesdeEnlace);

/* ---------- Inicio ---------- */
function medirFijos() {
  const barra = document.querySelector('.barra').offsetHeight;
  const herr = document.querySelector('.herramientas');
  const fija = getComputedStyle(herr).position === 'sticky' ? herr.offsetHeight + 10 : 0;
  document.documentElement.style.setProperty('--alto-barra', `${barra}px`);
  document.documentElement.style.setProperty('--alto-fijo', `${barra + fija}px`);
}
if ('ResizeObserver' in window) {
  const observador = new ResizeObserver(medirFijos);
  observador.observe(document.querySelector('.barra'));
  observador.observe(document.querySelector('.herramientas'));
}
window.addEventListener('resize', medirFijos);
aplicarAjustes();
medirFijos();
renderCatalogo();
renderNotas();
renderIndice();
render();
if (/^#pregunta-\d+$/.test(location.hash)) {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  abrirDesdeEnlace();
  window.addEventListener('load', abrirDesdeEnlace, { once: true });
}

if (location.protocol !== 'file:') {
  leerJson('data/catalogo.json').then((cat) => {
    if (Array.isArray(cat.catecismos) && cat.catecismos.length) { estado.catalogo = cat.catecismos; renderCatalogo(); }
  }).catch((e) => console.warn('Catálogo adicional no disponible. Se conserva el catecismo inicial.', e));
  leerJson('data/catecismo-menor.json').then((datos) => {
    const preguntas = extraerPreguntas(datos);
    if (estado.activo === 'catecismo-menor' && preguntas && JSON.stringify(datos) !== JSON.stringify(estado.documento)) {
      estado.documento = datos;
      estado.preguntas = preguntas;
      renderNotas();
      renderIndice();
      render();
    }
  }).catch(() => { /* se usa la copia embebida */ });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
