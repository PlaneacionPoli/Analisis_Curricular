// Páginas «Tendencias Globales» y «Configurar Tendencias».
import { aciertosPorFila, cargarConfig, configActual, guardarConfig as guardar, hayConfig, resumirTendencias, restaurarConfig as restaurar, validarImportacion } from '../data/tendencias.js';
import { cmp } from '../data/util.js';
import { libroListado } from '../export/excelListado.js';
import { aviso, botonDescarga, columnas, descargar, envolver, grafico, h, info, metrica, selector, tabla, titulo } from '../ui.js';

const local = { pestana: 'Vista global', tendencia: null, tendenciaMatriz: null, matriz: null, cargando: false };
const corto = (t, n) => (t.length > n ? t.slice(0, n) + '…' : t);
const mediana = v => { const s = [...v].sort((a, b) => a - b); if (!s.length) return 0; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

function esperarConfig(rerender) {
  if (hayConfig()) return null;
  if (!local.cargando) { local.cargando = true; cargarConfig().then(() => { local.cargando = false; rerender(); }); }
  return aviso('info', 'Cargando la configuración de tendencias…');
}

function pestanas(nombres, actual, alCambiar) {
  return h('div', { class: 'pestanas' }, ...nombres.map(n => h('button', { type: 'button', class: n === actual ? 'activa' : '', onclick: () => alCambiar(n) }, n)));
}

/**
 * Matrices en filas y tendencias en columnas, con el % de asignaturas de cada matriz que abordan la tendencia.
 * Con porcentajes las matrices de distinto tamaño son comparables, y con los nombres de las matrices a la izquierda se leen completos.
 */
function mapaCalor(porMatriz, T, etiqueta, ids) {
  const tids = Object.keys(T).sort((a, b) => ids.reduce((s, i) => s + porMatriz[i].cobertura[b], 0) - ids.reduce((s, i) => s + porMatriz[i].cobertura[a], 0));
  const z = ids.map(i => tids.map(t => Math.round(porMatriz[i].cobertura[t])));
  const conteo = ids.map(i => tids.map(t => [porMatriz[i].conteo[t], porMatriz[i].total]));
  return grafico([{ type: 'heatmap', z, x: tids.map(t => corto(T[t].descripcion, 24)), y: ids.map(i => etiqueta.get(i)), customdata: conteo, zmin: 0, zmax: 100, xgap: 2, ygap: 2,
    text: z.map(r => r.map(v => (v > 0 ? String(v) : ''))), texttemplate: '%{text}', textfont: { size: 10 }, hoverongaps: false,
    colorscale: [[0, '#F0F4F8'], [0.05, '#C8E6F5'], [0.3, '#1FB2DE'], [0.65, '#1565A7'], [1, '#0F385A']],
    colorbar: { title: { text: '% de asignaturas' }, thickness: 12, len: 0.5 },
    hovertemplate: '<b>%{y}</b><br>%{x}<br>%{z} % de las asignaturas (%{customdata[0]} de %{customdata[1]})<extra></extra>' }],
  { height: Math.max(420, 26 * ids.length + 190), margin: { l: 10, r: 10, t: 10, b: 10 }, plot_bgcolor: 'white',
    xaxis: { side: 'top', tickangle: -35, tickfont: { size: 10 }, automargin: true }, yaxis: { autorange: 'reversed', tickfont: { size: 10.5 }, automargin: true } });
}

/**
 * Una sola gráfica: % de asignaturas únicas que abordan cada tendencia, con el número de asignaturas junto a la barra y los nombres completos
 * (partidos en varias líneas). `ref`: mediana del conjunto por tendencia (solo en la vista de una matriz), como rombo.
 */
function barrasTendencias(res, T, ref = null) {
  const d = Object.keys(T).map(t => ({ t, n: envolver(T[t].descripcion, 42), v: res.cobertura[t], c: res.conteo[t] })).sort((a, b) => a.v - b.v);
  const trazas = [{ type: 'bar', orientation: 'h', name: 'Esta vista', x: d.map(x => +x.v.toFixed(1)), y: d.map(x => x.n), text: d.map(x => `${x.v.toFixed(0)} % · ${x.c} asignaturas`), textposition: 'outside', cliponaxis: false,
    customdata: d.map(x => x.c), hovertemplate: '%{y}<br>%{x} % de las asignaturas (%{customdata})<extra></extra>',
    marker: { color: d.map(x => x.v), cmin: 0, cmax: Math.max(10, ...d.map(x => x.v)), colorscale: [[0, '#C8E6F5'], [0.5, '#1FB2DE'], [1, '#0F385A']] } }];
  if (ref) trazas.push({ type: 'scatter', mode: 'markers', name: 'Mediana de las matrices', x: d.map(x => +ref[x.t].toFixed(1)), y: d.map(x => x.n),
    marker: { symbol: 'diamond', size: 11, color: '#FBAF17', line: { width: 1, color: '#0F385A' } }, hovertemplate: 'Mediana de las matrices: %{x} %<extra></extra>' });
  return grafico(trazas, { height: Math.max(380, d.length * 46 + 70), margin: { l: 10, r: 150, t: 10, b: 50 }, showlegend: !!ref, legend: { orientation: 'h', y: -0.1 },
    xaxis: { range: [0, Math.min(100, Math.max(10, ...d.map(x => x.v), ...(ref ? Object.values(ref) : [0])) * 1.3)], ticksuffix: ' %', gridcolor: '#F0F0F0', title: '% de asignaturas únicas que abordan la tendencia' },
    yaxis: { automargin: true, tickfont: { size: 11 } }, plot_bgcolor: 'white' });
}

function detalleTendencia(res, T, etiqueta, tid, filasVista, filtroMatriz) {
  const porM = res.detalle[tid];
  const ids = [...porM.keys()].filter(i => !filtroMatriz || i === filtroMatriz).sort((a, b) => cmp(etiqueta.get(a), etiqueta.get(b)));
  if (!ids.length) return aviso('info', 'Esta tendencia no fue detectada en ninguna matriz de la vista.');
  const cuerpo = ids.map(i => {
    const porAsig = new Map();
    for (const hz of porM.get(i)) {
      if (hz.asignatura === 'Sin nombre') continue;
      if (!porAsig.has(hz.asignatura)) porAsig.set(hz.asignatura, { campos: new Set(), kws: new Set() });
      hz.campos.forEach(c => porAsig.get(hz.asignatura).campos.add(c));
      hz.keywords.forEach(k => porAsig.get(hz.asignatura).kws.add(k));
    }
    return h('details', {}, h('summary', {}, `${etiqueta.get(i)} — ${porAsig.size} asignatura(s)`),
      h('ul', {}, ...[...porAsig].sort((a, b) => cmp(a[0], b[0])).map(([a, o]) =>
        h('li', {}, h('b', {}, a), ` (detectada en: ${[...o.campos].join(', ') || 'texto general'}; términos: ${[...o.kws].join(', ')})`))));
  });
  void filasVista;
  return h('div', {}, ...cuerpo);
}

async function excelTendencia(res, T, vista, tid) {
  const programaDe = new Map(vista.map(f => [f.Matriz, f.Programa]));
  // filas del Paso 5 de las asignaturas que abordan la tendencia (mismos pares programa-asignatura que el mapa de calor)
  const pares = new Set();
  for (const [m, hs] of res.detalle[tid]) for (const hz of hs) if (hz.asignatura !== 'Sin nombre') pares.add(`${programaDe.get(m)}|${hz.asignatura}`);
  const filas = vista.filter(f => pares.has(`${f.Programa}|${String(f['Nombre asignatura o modulo']).trim()}`));
  const buf = await libroListado({ filas, detalle: res.detalle[tid], programaDe, tendenciaNombre: T[tid].descripcion.slice(0, 30) });
  descargar(`listado_${tid}.xlsx`, buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/**
 * @param {Array} p.todas  todas las filas cargadas (referencia)
 * @param {Array} p.filas  filas tras los filtros globales
 */
export function paginaTendencias({ todas, filas, etiqueta, seleccion, rerender }) {
  const espera = esperarConfig(rerender);
  if (espera) return h('div', {}, ...titulo('Alineación con Tendencias Globales'), espera);
  const { TENDENCIAS_GLOBALES: T } = configActual();
  const aciertos = aciertosPorFila(todas);
  const vista = seleccion ? filas.filter(f => f.Matriz === seleccion) : filas;
  const res = resumirTendencias(vista, aciertos);
  const ids = [...new Set(vista.map(f => f.Matriz))].sort((a, b) => cmp(etiqueta.get(a), etiqueta.get(b)));
  const tids = Object.keys(T);
  if (!tids.includes(local.tendencia)) local.tendencia = tids[0];
  const detectadas = tids.length - res.ausentes.length;

  // referencia del conjunto: mediana de la cobertura por matriz
  const porMatriz = ids.length ? null : null; void porMatriz;
  const refCob = {};
  if (seleccion) {
    const matrices = [...new Set(todas.map(f => f.Matriz))];
    const cobs = matrices.map(m => resumirTendencias(todas.filter(f => f.Matriz === m), aciertos).cobertura);
    for (const t of tids) refCob[t] = mediana(cobs.map(c => c[t]));
  }

  const global = h('div', {},
    h('h3', {}, seleccion ? 'Tendencias de la matriz' : 'Cobertura de tendencias por matriz'),
    seleccion ? null : h('p', { class: 'leyenda' }, 'Cada celda es el porcentaje de asignaturas de la matriz que abordan la tendencia (pasa el cursor para ver el número). Las tendencias están ordenadas de mayor a menor presencia en el conjunto; las celdas vacías indican que ninguna asignatura la aborda.'),
    seleccion ? null : mapaCalor(Object.fromEntries(ids.map(i => [i, resumirTendencias(vista.filter(f => f.Matriz === i), aciertos)])), T, etiqueta, ids),
    h('hr'),
    h('h3', {}, 'Cobertura por tendencia'),
    h('p', { class: 'leyenda' }, 'Porcentaje de asignaturas únicas que abordan cada tendencia; junto a cada barra, cuántas asignaturas son.' + (seleccion ? ' El rombo dorado es la mediana de todas las matrices cargadas.' : '')),
    barrasTendencias(res, T, seleccion ? refCob : null),
    res.ausentes.length ? h('div', {}, h('hr'), h('h3', {}, 'Brechas curriculares detectadas'),
      aviso('warning', 'Las siguientes tendencias <b>no fueron detectadas en ninguna asignatura</b>. Considere si deberían incorporarse:'),
      h('ul', {}, ...res.ausentes.map(t => h('li', {}, h('b', {}, T[t].descripcion))))) : null,
    h('hr'),
    h('h3', {}, 'Detalle por tendencia'),
    selector('Seleccionar tendencia:', tids.map(t => T[t].descripcion), T[local.tendencia].descripcion,
      v => { local.tendencia = tids.find(t => T[t].descripcion === v); rerender(); }),
    h('p', {}, h('b', {}, T[local.tendencia].descripcion), ` — presente en <b>${res.conteo[local.tendencia]} de ${res.total}</b> asignaturas (${res.cobertura[local.tendencia].toFixed(0)} % de cobertura)`.replace(/<\/?b>/g, '')),
    botonDescarga('Descargar listado (Excel)', () => excelTendencia(res, T, vista, local.tendencia)),
    detalleTendencia(res, T, etiqueta, local.tendencia));

  // vista «por matriz»
  if (!ids.includes(local.matriz)) local.matriz = ids[0];
  const sel = seleccion ?? local.matriz;
  const resM = resumirTendencias(vista.filter(f => f.Matriz === sel), aciertos);
  const dM = tids.map(t => ({ t, n: envolver(T[t].descripcion, 42), v: resM.cobertura[t], c: resM.conteo[t] })).sort((a, b) => b.v - a.v);
  const porMatrizTab = h('div', {},
    h('h3', {}, 'Análisis de tendencias por matriz'),
    h('p', { class: 'leyenda' }, 'Cuántas asignaturas cubren cada tendencia y cuáles son. Se usa la misma regla de asignación en todas las vistas (ver «Configurar Tendencias»).'),
    seleccion ? null : selector('Seleccionar matriz:', ids.map(i => etiqueta.get(i)), etiqueta.get(sel), v => { local.matriz = ids.find(i => etiqueta.get(i) === v); rerender(); }),
    columnas(metrica('Asignaturas de la matriz', resM.total), metrica('Tendencias detectadas', `${tids.length - resM.ausentes.length}/${tids.length}`),
      metrica('Cobertura promedio', `${(dM.reduce((s, x) => s + x.v, 0) / (dM.length || 1)).toFixed(0)}%`)),
    h('hr'),
    grafico([{ type: 'bar', orientation: 'h', x: [...dM].reverse().map(x => +x.v.toFixed(1)), y: [...dM].reverse().map(x => x.n),
      customdata: [...dM].reverse().map(x => x.c), hovertemplate: '%{y}<br>%{x}%<br>%{customdata} asignatura(s)<extra></extra>',
      marker: { color: [...dM].reverse().map(x => x.v), cmin: 0, cmax: 100, colorscale: [[0, '#C8E6F5'], [0.5, '#1FB2DE'], [1, '#0F385A']] },
      text: [...dM].reverse().map(x => `${x.v.toFixed(0)} % · ${x.c} asignaturas`), textposition: 'outside', cliponaxis: false }],
    { height: Math.max(480, dM.length * 46 + 90), title: { text: `Cobertura de tendencias en ${etiqueta.get(sel)}` }, xaxis: { title: '% de asignaturas', range: [0, Math.min(100, Math.max(10, ...dM.map(x => x.v)) * 1.3)] }, yaxis: { automargin: true }, margin: { l: 10, r: 150, t: 40, b: 50 } }),
    h('hr'),
    selector('Seleccionar tendencia:', tids.map(t => T[t].descripcion), T[local.tendenciaMatriz ?? tids[0]]?.descripcion ?? T[tids[0]].descripcion,
      v => { local.tendenciaMatriz = tids.find(t => T[t].descripcion === v); rerender(); }),
    (() => {
      const t = T[local.tendenciaMatriz] ? local.tendenciaMatriz : tids[0];
      const lista = [...resM.asig[t]].sort(cmp);
      return lista.length
        ? h('div', {}, h('p', {}, `${lista.length} asignatura(s) abordan «${T[t].descripcion}» (${resM.cobertura[t].toFixed(0)}%):`), h('ul', {}, ...lista.map(a => h('li', {}, a))))
        : aviso('info', 'Ninguna asignatura de la matriz aborda esta tendencia.');
    })());

  void info; void tabla;
  return h('div', {},
    ...titulo('Alineación con Tendencias Globales'),
    info('<b>¿Qué mide esta sección?</b> Identifica qué tendencias del mundo actual están presentes en los planes de estudio. La <b>cobertura</b> es el porcentaje ' +
      `de asignaturas (sobre ${res.total} en la vista) que abordan cada tendencia. Regla: un término en el <b>nombre</b> de la asignatura, o al menos dos puntos de términos ` +
      'en el contenido (RA, núcleos, indicadores y proceso). Es presencia declarativa por palabras clave, no calidad.'),
    seleccion ? aviso('info', `<b>Vista de matriz:</b> ${etiqueta.get(seleccion)}.`) : null,
    columnas(metrica('Tendencias evaluadas', tids.length, 'Tendencias configuradas'), metrica('Tendencias detectadas', detectadas, 'Presentes en al menos una asignatura'),
      metrica('Tendencias ausentes', res.ausentes.length, 'Sin ninguna asignatura: brechas'), metrica('Total asignaturas', res.total, 'Asignaturas únicas de la vista')),
    h('hr'),
    pestanas(['Vista global', 'Por matriz'], local.pestana, p => { local.pestana = p; rerender(); }),
    local.pestana === 'Vista global' ? global : porMatrizTab);
}

// ── Configurar Tendencias ───────────────────────────────────────────────────

export function paginaConfigTendencias({ rerender }) {
  const espera = esperarConfig(rerender);
  if (espera) return h('div', {}, ...titulo('Configurar Tendencias Globales'), espera);
  const cfg = configActual();
  const T = cfg.TENDENCIAS_GLOBALES;
  const guardarConfig = c => { guardar(c); rerender(); };
  const restaurarConfig = () => { restaurar(); rerender(); };
  const msg = h('div', {});
  const decir = (tipo, t) => msg.replaceChildren(aviso(tipo, t));

  const archivo = h('input', { type: 'file', accept: '.json,application/json', onchange: async e => {
    try {
      const nuevo = validarImportacion(JSON.parse(await e.target.files[0].text()));
      guardarConfig(nuevo);
    } catch (err) { decir('error', `Error al importar: ${err.message}`); }
  } });

  const f = { id: h('input', { type: 'text', placeholder: 'MI_TENDENCIA' }), desc: h('input', { type: 'text', placeholder: 'Mi nueva tendencia' }),
    color: h('input', { type: 'color', value: '#FF5733' }), kws: h('textarea', { rows: 5, placeholder: 'keyword1\nkeyword2\nfrase clave' }) };
  const agregar = () => {
    const id = f.id.value.trim().replace(/\s+/g, '_'), desc = f.desc.value.trim(), kws = f.kws.value.split('\n').map(k => k.trim()).filter(Boolean);
    if (!id || !desc || !kws.length) return decir('error', 'Completa el ID, la descripción y al menos una palabra clave.');
    guardarConfig({ TENDENCIAS_GLOBALES: { ...T, [id]: { keywords: kws, color: f.color.value, descripcion: desc } } });
  };
  const eliminar = h('select', {}, ...Object.entries(T).map(([id, t]) => h('option', { value: id }, t.descripcion)));

  return h('div', {},
    ...titulo('Configurar Tendencias Globales'),
    aviso('info', 'Los cambios se guardan en este navegador y se aplican de inmediato a «Tendencias Globales». Las matrices no se modifican.'),
    msg,
    h('h3', {}, 'Importar / exportar configuración'),
    columnas(h('div', {}, h('label', {}, 'Importar tendencias desde JSON:'), archivo),
      h('div', {}, botonDescarga('Descargar configuración actual (JSON)', () => descargar('config_tendencias.json',
        JSON.stringify({ VERSION: cfg.VERSION ?? '1.0', REGLA: cfg.REGLA, TENDENCIAS_GLOBALES: T }, null, 2), 'application/json')))),
    h('hr'),
    h('h3', {}, 'Regla de asignación'),
    h('p', { class: 'leyenda' }, `Una tendencia está presente en una asignatura si al menos ${cfg.REGLA.nombre_min_terminos} término aparece en su nombre, o si el contenido suma ` +
      `${cfg.REGLA.contenido_min_puntos} puntos (término compuesto = ${cfg.REGLA.peso_termino_compuesto}; simple = ${cfg.REGLA.peso_termino_simple}). La coincidencia es por palabra completa y sin tildes. La regla se modifica en el JSON importado (clave «REGLA»).`),
    h('hr'),
    h('h3', {}, `Tendencias actuales (${Object.keys(T).length})`),
    ...Object.entries(T).map(([id, t]) => h('details', {}, h('summary', {}, `${t.descripcion} (${t.keywords.length} palabras clave)`),
      h('p', {}, h('b', {}, 'ID: '), id), h('p', {}, h('b', {}, 'Color: '), t.color ?? '—', t.sector ? ` · Sector: ${t.sector}` : ''),
      h('p', {}, h('b', {}, 'Palabras clave: '), t.keywords.join(', ')))),
    h('hr'),
    h('h3', {}, 'Agregar nueva tendencia'),
    columnas(h('div', {}, h('label', {}, 'ID (sin espacios):'), f.id, h('label', {}, 'Descripción:'), f.desc),
      h('div', {}, h('label', {}, 'Color:'), f.color, h('label', {}, 'Palabras clave (una por línea):'), f.kws)),
    h('button', { type: 'button', class: 'boton', onclick: agregar }, 'Agregar tendencia'),
    h('hr'),
    h('h3', {}, 'Eliminar tendencia'),
    eliminar,
    h('button', { type: 'button', class: 'boton secundario', onclick: () => {
      const { [eliminar.value]: _quitada, ...resto } = T;
      if (Object.keys(resto).length) guardarConfig({ TENDENCIAS_GLOBALES: resto }); else decir('error', 'Debe quedar al menos una tendencia.');
    } }, 'Eliminar tendencia seleccionada'),
    h('hr'),
    h('button', { type: 'button', class: 'boton secundario', onclick: restaurarConfig }, 'Restaurar tendencias por defecto'));
}
