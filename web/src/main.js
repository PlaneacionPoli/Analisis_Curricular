import 'bootstrap-icons/font/bootstrap-icons.css';
import 'tabulator-tables/dist/css/tabulator.min.css';
import './style.css';
import { cargar, leerArchivos, olvidar, restaurar } from './data/cargador.js';
import { cmp } from './data/util.js';
import { paginaDatos } from './pages/datos.js';
import { paginaInicio } from './pages/inicio.js';
import { paginaLanding } from './pages/landing.js';
import { paginaPendiente } from './pages/pendiente.js';
import { paginaPerfil, reiniciarPerfil } from './pages/perfil.js';
import { paginaCobertura } from './pages/cobertura.js';
import { paginaConfigTendencias, paginaTendencias } from './pages/tendencias.js';
import { paginaResumen } from './pages/resumen.js';
import { paginaFamilias } from './pages/familias.js';
import { paginaMineria } from './pages/mineria.js';
import { paginaTaxonomias } from './pages/taxonomias.js';
import { paginaTipoSaber } from './pages/tipoSaber.js';
import { nombreMatriz } from './data/parseMatrix.js';
import { actualizar, filasFiltradas, obtener, suscribir } from './store.js';
import { aviso, h, icono, selector } from './ui.js';

// [nombre, icono, descripción, fase en la que se porta]
const PAGINAS = [
  ['Inicio', 'house', 'Resumen general y métricas clave del currículo', 1],
  ['Resumen Ejecutivo', 'clipboard-data', 'Estado del conjunto, V1–V5, prioridades y informes PDF', 5, true],
  ['Tipo de Saber', 'bar-chart', 'Saber, SaberHacer y SaberSer por semestre y asignatura', 2, true],
  ['Perfil de Egreso (V1)', 'person-check', 'Asociación del perfil con competencias, RA y asignaturas', 4, true],
  ['Cobertura Temática', 'map', 'Núcleos temáticos: diversidad y densidad por programa', 2, true],
  ['Tendencias Globales', 'graph-up-arrow', 'Alineación con IA, Sostenibilidad, Innovación, etc.', 2, true],
  ['Taxonomías', 'diagram-3', 'Taxonomías, niveles de verbos y exigencia de los RA', 2, true],
  ['Familias Curriculares', 'diagram-2', 'Clustering jerárquico y familias de programas', 5, true],
  ['Minería de Texto', 'search', 'Asignaturas con contenido parecido y dónde se trabaja un tema', 2, true],
  ['Configurar Tendencias', 'sliders', 'Personalizar las tendencias globales a detectar', 2, true],
  ['Explorar Datos', 'table', 'Explorar y filtrar los registros cargados', 1],
];

async function procesar(archivos, rechazados = []) {
  reiniciarPerfil();
  actualizar({ progreso: { i: 0, n: archivos.length, nombre: '' }, mensaje: null });
  const datos = await cargar(archivos, (i, n, nombre) => actualizar({ progreso: { i, n, nombre } }));
  const avisos = [];
  if (rechazados.length) avisos.push(`${rechazados.length} archivo(s) descartados: ` + rechazados.map(r => `${r.nombre} (${r.causa})`).join('; '));
  if (!datos.guardado) avisos.push('Este navegador no permite guardar las matrices: tendrás que volver a cargarlas al recargar la página.');
  actualizar({
    archivos, datos, progreso: null,
    filtros: { facultad: 'Todos', programa: 'Todos', modalidad: 'Todos', sede: 'Todos', nivel: 'Todos' },
    mensaje: avisos.length ? { tipo: 'warning', texto: avisos.join('<br>') } : null,
  });
}

async function alSeleccionar(files) {
  const { archivos, rechazados } = await leerArchivos(files);
  if (!archivos.length) {
    actualizar({ mensaje: { tipo: 'error', texto: 'No se encontró ningún archivo .xlsx en la selección.' } });
    return;
  }
  await procesar(archivos, rechazados);
}

async function cambiarArchivos() {
  await olvidar();
  reiniciarPerfil();
  actualizar({ archivos: null, datos: null, mensaje: null, matriz: null,
    filtros: { facultad: 'Todos', programa: 'Todos', modalidad: 'Todos', sede: 'Todos', nivel: 'Todos' } });
}

/** Matrices (programa-sede) del consolidado, con su archivo de origen. */
function listaMatrices() {
  const { datos, archivos } = obtener();
  if (!datos) return [];
  const vistas = new Map();
  for (const f of datos.filas) {
    if (!vistas.has(f.Matriz)) vistas.set(f.Matriz, { id: f.Matriz, etiqueta: `${f.Programa} – ${f.Modalidad} – ${f.Sede}`, programa: f.Programa });
  }
  return [...vistas.values()].map(m => ({ ...m, archivo: archivos.find(a => nombreMatriz(a.nombre) === m.id) }))
    .sort((a, b) => cmp(a.etiqueta, b.etiqueta));
}

function barraLateral() {
  const { pagina } = obtener();
  const actual = PAGINAS.find(p => p[0] === pagina);
  return h('aside', { class: 'lateral' },
    h('img', { class: 'logo', src: `${import.meta.env.BASE_URL}logo_poli.png`, alt: 'Politécnico Grancolombiano' }),
    h('p', { class: 'creado-por' }, 'Creado por: Gerencia de Planeación y Gestión Institucional'),
    h('h2', {}, 'Configuración'),
    h('nav', {}, ...PAGINAS.map(([n, i]) => h('button', { type: 'button', class: n === pagina ? 'activo' : '',
      onclick: () => { actualizar({ pagina: n }); window.scrollTo(0, 0); } }, icono(i), n))),
    h('p', { class: 'nav-desc' }, actual[2]),
    h('p', { class: 'pie' }, 'Politécnico Grancolombiano', h('br'), 'Análisis Microcurricular v2.0'));
}

function selectorMatriz() {
  const { matriz } = obtener();
  const visibles = new Set(filasFiltradas().map(f => f.Matriz));
  const ms = listaMatrices().filter(m => visibles.has(m.id));
  const CONJUNTO = 'Conjunto (todas las matrices)';
  const actual = ms.find(m => m.id === matriz);
  return selector('Matriz', [CONJUNTO, ...ms.map(m => m.etiqueta)], actual ? actual.etiqueta : CONJUNTO,
    v => actualizar({ matriz: ms.find(m => m.etiqueta === v)?.id ?? null }), 'selector-matriz');
}

function filtrosGlobales() {
  const { datos, filtros } = obtener();
  const valores = col => ['Todos', ...[...new Set(datos.filas.map(f => f[col]).filter(v => v != null))].map(String).sort(cmp)];
  const campo = (etiqueta, col, clave) => selector(etiqueta, valores(col), filtros[clave],
    v => actualizar({ filtros: { ...filtros, [clave]: v }, matriz: null }));
  // al cambiar de facultad se limpia el programa elegido (podría no pertenecer a ella)
  const facultad = selector('Facultad', valores('Facultad'), filtros.facultad ?? 'Todos',
    v => actualizar({ filtros: { ...filtros, facultad: v, programa: 'Todos' }, matriz: null }));
  const programas = [...new Set(datos.filas.filter(f => !filtros.facultad || filtros.facultad === 'Todos' || f.Facultad === filtros.facultad).map(f => f.Programa).filter(Boolean))].sort(cmp);
  const programa = selector('Programa', ['Todos', ...programas], filtros.programa, v => actualizar({ filtros: { ...filtros, programa: v }, matriz: null }));
  return h('section', { class: 'filtros' }, h('b', {}, icono('funnel'), ' Filtros'),
    h('div', { class: 'columnas', style: { '--n': 3 } },
      facultad, programa, campo('Modalidad', 'Modalidad', 'modalidad'),
      campo('Sede', 'Sede', 'sede'), campo('Nivel', 'Nivel', 'nivel'), selectorMatriz()));
}

function contenido() {
  const { pagina, datos, archivos, mensaje } = obtener();
  const bloques = [];
  const fallidos = datos.fallidos;
  const cargados = archivos.length - fallidos.length;
  bloques.push(h('div', { class: 'barra-archivos' },
    aviso('success', fallidos.length
      ? `${cargados} archivos cargados correctamente, ${fallidos.length} archivo(s) no se pudieron cargar de ${archivos.length} archivos seleccionados`
      : `${cargados} archivos cargados correctamente`),
    h('button', { type: 'button', class: 'boton secundario', onclick: cambiarArchivos }, 'Cambiar archivos')));
  if (mensaje) bloques.push(aviso(mensaje.tipo, mensaje.texto));
  datos.avisos.forEach(a => bloques.push(aviso('warning', a)));
  if (fallidos.length) {
    bloques.push(aviso('error', `<b>${fallidos.length}</b> archivo(s) no se cargaron:`));
    fallidos.forEach(f => bloques.push(aviso('warning', `• ${f.nombre}: ${f.causa}`)));
  }
  if (!datos.filas.length) {
    bloques.push(aviso('error', "No se pudieron cargar datos. Verifica que los archivos tengan la hoja 'Paso 5 Estrategias micro' con encabezados en la fila 2."));
    return bloques;
  }
  bloques.push(filtrosGlobales());
  const filas = filasFiltradas();
  const p = PAGINAS.find(x => x[0] === pagina);
  if (pagina === 'Inicio') {
    const ids = new Set(filas.map(f => f.Matriz));
    const m = obtener().matriz;
    bloques.push(paginaInicio(filas, { todasFilas: datos.filas, seleccion: m && ids.has(m) ? m : null,
      etiqueta: new Map(listaMatrices().map(x => [x.id, x.etiqueta])) }));
  }
  else if (pagina === 'Explorar Datos') bloques.push(paginaDatos(filas, render));
  else if (pagina === 'Perfil de Egreso (V1)') {
    const todas = listaMatrices();
    const ids = new Set(filas.map(f => f.Matriz));
    const m = obtener().matriz;
    bloques.push(paginaPerfil({ matrices: todas, visibles: todas.filter(x => ids.has(x.id)), seleccion: m && ids.has(m) ? m : null, rerender: render }));
  }
  else if (pagina === 'Tipo de Saber') {
    const todas = listaMatrices();
    const ids = new Set(filas.map(f => f.Matriz));
    const m = obtener().matriz;
    bloques.push(paginaTipoSaber({ todas: datos.filas, filas, etiqueta: new Map(todas.map(x => [x.id, x.etiqueta])),
      seleccion: m && ids.has(m) ? m : null, rerender: render }));
  }
  else if (pagina === 'Cobertura Temática') {
    const todas = listaMatrices();
    const ids = new Set(filas.map(f => f.Matriz));
    const m = obtener().matriz;
    bloques.push(paginaCobertura({ todas: datos.filas, filas, etiqueta: new Map(todas.map(x => [x.id, x.etiqueta])),
      seleccion: m && ids.has(m) ? m : null, rerender: render }));
  }
  else if (pagina === 'Tendencias Globales') {
    const todas = listaMatrices();
    const ids = new Set(filas.map(f => f.Matriz));
    const m = obtener().matriz;
    bloques.push(paginaTendencias({ todas: datos.filas, filas, etiqueta: new Map(todas.map(x => [x.id, x.etiqueta])),
      seleccion: m && ids.has(m) ? m : null, rerender: render }));
  }
  else if (pagina === 'Configurar Tendencias') bloques.push(paginaConfigTendencias({ rerender: render }));
  else if (pagina === 'Taxonomías') {
    const todas = listaMatrices();
    const ids = new Set(filas.map(f => f.Matriz));
    const m = obtener().matriz;
    bloques.push(paginaTaxonomias({ filas, todasFilas: datos.filas, archivos, etiqueta: new Map(todas.map(x => [x.id, x.etiqueta])),
      programaDe: new Map(todas.map(x => [x.id, x.programa])), seleccion: m && ids.has(m) ? m : null, rerender: render }));
  }
  else if (pagina === 'Minería de Texto') {
    const todas = listaMatrices();
    const ids = new Set(filas.map(f => f.Matriz));
    const m = obtener().matriz;
    bloques.push(paginaMineria({ filas, etiqueta: new Map(todas.map(x => [x.id, x.etiqueta])), seleccion: m && ids.has(m) ? m : null, rerender: render }));
  }
  else if (pagina === 'Resumen Ejecutivo') {
    const todas = listaMatrices();
    const ids = new Set(filas.map(f => f.Matriz));
    const m = obtener().matriz;
    const f = obtener().filtros;
    const activos = Object.entries({ Facultad: f.facultad, Programa: f.programa, Modalidad: f.modalidad, Sede: f.sede, Nivel: f.nivel }).filter(([, v]) => v && v !== 'Todos').map(([k, v]) => `${k}: ${v}`);
    bloques.push(paginaResumen({ filas, todasFilas: datos.filas, archivos, archivoDe: new Map(todas.map(x => [x.id, x.archivo])), etiqueta: new Map(todas.map(x => [x.id, x.etiqueta])),
      seleccion: m && ids.has(m) ? m : null, descripcionFiltros: 'Filtros: ' + (activos.length ? activos.join('; ') : 'ninguno (conjunto completo)'), rerender: render }));
  }
  else if (pagina === 'Familias Curriculares') {
    const todas = listaMatrices();
    const ids = new Set(filas.map(f => f.Matriz));
    const m = obtener().matriz;
    bloques.push(paginaFamilias({ filas, todasFilas: datos.filas, etiqueta: new Map(todas.map(x => [x.id, x.etiqueta])), seleccion: m && ids.has(m) ? m : null, rerender: render }));
  }
  else bloques.push(paginaPendiente(p[0], p[2], p[3]));
  return bloques;
}

let ultimaPagina = null;

function render() {
  const { datos, progreso } = obtener();
  const raiz = document.getElementById('app');
  const hayDatos = !!datos && !progreso;
  raiz.replaceChildren(
    barraLateral(),
    h('main', { class: 'principal' }, ...(hayDatos ? contenido() : [paginaLanding(alSeleccionar)])));
  if (ultimaPagina !== obtener().pagina) { window.scrollTo(0, 0); ultimaPagina = obtener().pagina; }
}

suscribir(render);
render();

// Restaurar las matrices guardadas de una sesión anterior
restaurar().then(guardadas => { if (guardadas.length) procesar(guardadas); });
