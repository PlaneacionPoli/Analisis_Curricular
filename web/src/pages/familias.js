// Página «Familias Curriculares»: asignaturas compartidas entre programas y consistencia de su contenido.
// Conjunto = lo que reporta el artículo; matriz = qué parte de la matriz es compartida, cuál es propia y cuál se parece poco a su homónima.
// El modelo de tópicos (LDA) queda pendiente.
import { compararInterPrograma, consolidarAsignaturas, deduplicarPares, divergenciaHomonimas, UMBRAL_SIMILAR } from '../data/compartidas.js';
import { cmp } from '../data/util.js';
import { aviso, columnas, grafico, h, info, metrica, tabla, titulo } from '../ui.js';

const local = { pestana: 'Asignaturas homónimas', firma: '', calc: null };
const COL = 'Nombre asignatura o modulo';

function calcular(filas, ancla) {
  const firma = `${ancla}|${filas.length}|${filas[0]?.Matriz}|${filas.at(-1)?.Matriz}`;
  if (local.firma !== firma || !local.calc) {
    const asigs = consolidarAsignaturas(filas);
    local.calc = { asigs, homo: divergenciaHomonimas(asigs), pares: deduplicarPares(compararInterPrograma(asigs).filter(p => !p.mismo_nombre)) };
    local.firma = firma;
  }
  return local.calc;
}

/** Asignaturas que aparecen (por nombre exacto) en 2 o más programas. */
function compartidasPorNombre(filas) {
  const m = new Map();
  for (const f of filas) {
    const a = f[COL];
    if (a == null || String(a).trim() === '') continue;
    if (!m.has(a)) m.set(a, new Set());
    m.get(a).add(f.Programa);
  }
  return [...m].map(([Asignatura, ps]) => ({ Asignatura, programas: [...ps].sort(cmp), n: ps.size })).filter(x => x.n > 1).sort((a, b) => b.n - a.n || cmp(a.Asignatura, b.Asignatura));
}

function histograma(comp) {
  const c = new Map();
  comp.forEach(x => c.set(x.n, (c.get(x.n) ?? 0) + 1));
  const ks = [...c.keys()].sort((a, b) => a - b);
  return grafico([{ type: 'bar', x: ks, y: ks.map(k => c.get(k)), text: ks.map(k => c.get(k)), textposition: 'outside', marker: { color: '#1FB2DE' } }],
    { height: 320, xaxis: { title: 'Programas que comparten la asignatura', dtick: 1 }, yaxis: { title: 'Cantidad de asignaturas' }, margin: { l: 50, r: 10, t: 20, b: 50 } });
}

function tablaHomonimas(homo) {
  const cols = [['asignatura', 'Asignatura', 300], ['programas', 'Programas', 0], ['versiones', 'Versiones', 0], ['similitud_media', 'Similitud media', 0], ['divergente', 'Divergente', 0]];
  return tabla(homo.map(x => ({ ...x, divergente: x.divergente ? 'Sí' : 'No' })), cols.map(([f, t, w]) => ({ title: t, field: f, ...(w ? { minWidth: w } : { hozAlign: 'right' }) })), { height: 420 });
}

function tablaPares(pares) {
  const cols = ['programa_a', 'asignatura_a', 'programa_b', 'asignatura_b', 'similitud'];
  return tabla(pares.slice(0, 300), cols.map(c => ({ title: c.replace('_', ' '), field: c, ...(c === 'similitud' ? { hozAlign: 'right' } : { minWidth: 200, tooltip: true }) })), { height: 420 });
}

export function paginaFamilias({ filas, todasFilas, etiqueta, seleccion, rerender }) {
  const cab = [...titulo('Familias Curriculares'),
    info('<b>¿Qué son las familias curriculares?</b> Conjuntos de programas que comparten asignaturas. La matriz muestra qué asignaturas están en varios programas y en cuáles. ' +
      'La consistencia de contenido compara núcleos temáticos e indicadores de logro (coseno TF-IDF) entre versiones de programas distintos, sin electivas; ' +
      `«divergente» es una similitud media inferior a ${UMBRAL_SIMILAR.toFixed(2)}, un umbral operativo sin calibración experta: son candidatos para revisión disciplinar.`)];
  if (new Set(todasFilas.map(f => f.Programa)).size < 2) return h('div', {}, ...cab, aviso('info', 'Se necesitan al menos dos programas cargados para comparar asignaturas entre programas.'));
  return seleccion ? vistaMatriz({ cab, todasFilas, etiqueta, seleccion, rerender }) : vistaConjunto({ cab, filas, etiqueta, rerender });
}

function vistaConjunto({ cab, filas, rerender }) {
  const comp = compartidasPorNombre(filas);
  const programas = [...new Set(filas.map(f => f.Programa))].sort(cmp);
  const { homo, pares } = calcular(filas, 'conjunto');
  const pivote = comp.map(x => ({ Asignatura: x.Asignatura, 'Total Programas': x.n, ...Object.fromEntries(programas.map(p => [p, x.programas.includes(p) ? 'X' : ''])) }));
  const heat = comp.slice(0, 120);
  const divergentes = homo.filter(x => x.divergente);
  return h('div', {}, ...cab,
    comp.length ? h('div', {},
      columnas(metrica('Asignaturas compartidas', comp.length)),
      h('p', { class: 'leyenda' }, `De ${programas.length} programas cargados, ${comp.length} asignaturas se repiten (mismo nombre) en 2 o más programas.`),
      tabla(pivote, [{ title: 'Asignatura', field: 'Asignatura', minWidth: 260, frozen: true }, { title: 'Total', field: 'Total Programas', hozAlign: 'right', width: 80 },
        ...programas.map(p => ({ title: p, field: p, hozAlign: 'center', width: 70, headerSort: false }))], { height: 420, nestedFieldSeparator: false }),
      h('hr'), h('h3', {}, 'Mapa de calor: asignaturas × programas'),
      comp.length > heat.length ? h('p', { class: 'leyenda' }, `Se muestran las ${heat.length} más compartidas de ${comp.length}.`) : null,
      grafico([{ type: 'heatmap', z: heat.map(x => programas.map(p => (x.programas.includes(p) ? 1 : 0))), x: programas.map(p => p.slice(0, 30)), y: heat.map(x => x.Asignatura.slice(0, 60)),
        colorscale: [[0, '#C8E6F5'], [1, '#0F385A']], showscale: false, hovertemplate: '%{y}<br>%{x}<extra></extra>' }],
      { height: Math.max(300, heat.length * 16 + 140), margin: { l: 280, r: 20, t: 20, b: 160 }, xaxis: { tickangle: 40, tickfont: { size: 9 } }, yaxis: { autorange: 'reversed', tickfont: { size: 9 } } }),
      h('hr'), h('h3', {}, 'Asignaturas por cantidad de programas'), histograma(comp))
      : aviso('success', 'No se encontraron asignaturas compartidas entre programas.'),
    h('hr'), h('h3', {}, 'Consistencia de contenido entre programas'),
    h('div', { class: 'pestanas' }, ...['Asignaturas homónimas', 'Nombre distinto, contenido similar'].map(p =>
      h('button', { type: 'button', class: p === local.pestana ? 'activa' : '', onclick: () => { local.pestana = p; rerender(); } }, p))),
    local.pestana === 'Asignaturas homónimas'
      ? (homo.length ? h('div', {}, columnas(metrica('Homónimas', homo.length), metrica('Divergentes', divergentes.length, `${(100 * divergentes.length / homo.length).toFixed(0)} % de las homónimas`),
        metrica('Similitud media', (homo.reduce((s, x) => s + x.similitud_media, 0) / homo.length).toFixed(3))), tablaHomonimas(homo))
        : aviso('info', 'No hay asignaturas homónimas entre los programas cargados.'))
      : (pares.length ? h('div', {}, metrica('Pares candidatos a homologación', pares.length),
        h('p', { class: 'leyenda' }, 'Incluye variantes de una misma denominación y falsos positivos léxicos: requieren validación disciplinar. Cada par cuenta una vez por matriz y asignatura (no por cada fila de RA).'),
        tablaPares(pares))
        : aviso('info', 'No hay pares de asignaturas con nombre distinto y contenido similar.')));
}

function vistaMatriz({ cab, todasFilas, etiqueta, seleccion }) {
  const { asigs, homo, pares } = calcular(todasFilas, 'todas');
  const comp = compartidasPorNombre(todasFilas);
  const compPor = new Map(comp.map(x => [x.Asignatura, x]));
  const propias = new Map();
  for (const a of asigs.filter(x => x.Matriz === seleccion)) if (!propias.has(a.clave)) propias.set(a.clave, a);
  const hom = new Map(homo.map(x => [x.asignatura, x]));
  const filasM = [...propias.values()].map(a => {
    const c = compPor.get(a.asignatura), hm = hom.get(a.asignatura);
    return { Asignatura: a.asignatura, 'Programas que la comparten': c ? c.n : 1, 'Estado': c ? 'Compartida' : 'Propia', 'Similitud media con homónimas': hm?.similitud_media ?? null, Divergente: hm ? (hm.divergente ? 'Sí' : 'No') : '—' };
  }).sort((a, b) => b['Programas que la comparten'] - a['Programas que la comparten'] || cmp(a.Asignatura, b.Asignatura));
  const nComp = filasM.filter(f => f.Estado === 'Compartida').length, nProp = filasM.length - nComp;
  const nDiv = filasM.filter(f => f.Divergente === 'Sí').length;
  const mias = pares.filter(p => p.matriz_a === seleccion || p.matriz_b === seleccion);
  const programa = asigs.find(a => a.Matriz === seleccion)?.Programa;
  const gemelas = [...new Set(todasFilas.filter(f => f.Programa === programa && f.Matriz !== seleccion).map(f => f.Matriz))];
  return h('div', {}, ...cab,
    aviso('info', `<b>Vista de matriz:</b> ${etiqueta.get(seleccion)}. «Compartida» = el mismo nombre aparece en otro programa del conjunto cargado (sin electivas).`),
    gemelas.length ? aviso('warning', `Misma matriz en otras sedes: ${gemelas.map(m => etiqueta.get(m) ?? m).join('; ')}. Las sedes de un mismo programa no se comparan entre sí.`) : null,
    columnas(metrica('Asignaturas de la matriz', filasM.length), metrica('Compartidas con otros programas', nComp, filasM.length ? `${(100 * nComp / filasM.length).toFixed(0)} % de la matriz` : ''),
      metrica('Propias', nProp), metrica('Homónimas divergentes', nDiv)),
    grafico([{ type: 'pie', labels: ['Compartidas', 'Propias'], values: [nComp, nProp], hole: 0.55, marker: { colors: ['#1FB2DE', '#0F385A'] }, textinfo: 'label+value+percent' }],
      { height: 300, showlegend: false, margin: { t: 10, b: 10, l: 10, r: 10 } }),
    h('h3', {}, 'Asignaturas de la matriz'),
    tabla(filasM, Object.keys(filasM[0] ?? {}).map(c => ({ title: c, field: c, ...(c === 'Asignatura' ? { minWidth: 300 } : { hozAlign: c.startsWith('Prog') || c.startsWith('Sim') ? 'right' : 'left' }) })), { height: 420 }),
    h('h3', {}, 'Pares con nombre distinto y contenido similar (candidatos a homologación)'),
    mias.length ? h('div', {}, h('p', { class: 'leyenda' }, `${mias.length} pares donde participa la matriz. Falsos positivos léxicos posibles: requieren validación disciplinar.`), tablaPares(mias))
      : aviso('info', 'La matriz no tiene pares de nombre distinto y contenido similar con otros programas.'),
    h('p', { class: 'leyenda' }, 'La similitud media de una homónima es la del conjunto cargado, no solo de esta matriz.'));
}
