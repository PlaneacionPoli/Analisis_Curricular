// Página «Taxonomías»: lo que declaran los RA (dominio y nivel), su exigencia y si el verbo con que inician corresponde a lo declarado.
// Unidad: RA único por matriz. La referencia (mediana del índice de exigencia) es siempre la del conjunto cargado.
import * as XLSX from 'xlsx';
import { baseVerbos, contrastar, DOMINIOS, ESTADOS, indiceExigencia, leerRA, porGrupo, resumenContraste } from '../data/taxonomias.js';
import { ceder, cmp } from '../data/util.js';
import { aviso, botonDescarga, columnas, descargar, grafico, h, info, metrica, multiselect, tabla, titulo } from '../ui.js';

// Paleta institucional: navy #0F385A, azul #1FB2DE, cian #42F2F2, dorado #FBAF17, magenta #EC0677 (gris para «sin dato»)
const COLOR_DOM = { Cognitivo: '#0F385A', Procedimental: '#1FB2DE', Actitudinal: '#FBAF17', 'Sin dominio': '#8A94A0' };
const COLOR_CONTRASTE = { Coincide: '#1FB2DE', 'Nivel difiere': '#FBAF17', 'Dominio difiere': '#EC0677', 'Verbo fuera de la base': '#8A94A0' };
// nombres que ve el usuario (los datos y el Excel conservan los originales)
const ETIQUETA = { Coincide: 'Coherente', 'Nivel difiere': 'Revisar nivel', 'Dominio difiere': 'Revisar dominio', 'Verbo fuera de la base': 'Verbo sin clasificar' };
const NIVELES = {
  Cognitivo: [['conocimiento', 'Conocimiento'], ['comprension', 'Comprensión'], ['aplicacion', 'Aplicación'], ['analisis', 'Análisis'], ['sintesis', 'Síntesis'], ['evaluacion', 'Evaluación']],
  Procedimental: [['imitacion', 'Imitación'], ['manipulacion', 'Manipulación'], ['precision', 'Precisión'], ['control', 'Control']],
  Actitudinal: [['percepcion', 'Percepción'], ['responder', 'Responder'], ['valorar', 'Valorar'], ['organizar', 'Organizar'], ['caracterizar', 'Caracterizar']],
};
const PESTANAS = ['Exigencia de los RA', 'Revisión de verbos', 'Listado de RA'];

const local = { pestana: PESTANAS[0], cache: null, firma: '', cargando: false, avance: null, error: null, estados: ['Nivel difiere', 'Dominio difiere'], prog: [], dom: [], texto: '' };
const norm = t => String(t ?? '').normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const mediana = v => { const s = v.filter(x => x != null).sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const fmt = x => (x == null ? '—' : x);
const miles = n => n.toLocaleString('es-CO');

async function leerTodas(archivos, alAvance = null) {
  const base = await baseVerbos();
  const ra = [];
  for (let i = 0; i < archivos.length; i++) {
    alAvance?.(i, archivos.length);
    await ceder();
    try { ra.push(...leerRA(new Uint8Array(archivos[i].buffer), archivos[i].nombre)); } catch { /* archivo sin Paso 3 legible */ }
  }
  return contrastar(ra, base);
}

/** RA únicos con su contraste frente a la base de verbos (compartido con el Resumen Ejecutivo y los informes PDF). */
export async function taxonomiasRA(archivos) {
  const firma = archivos.map(a => a.huella ?? a.nombre).join('|');
  if (local.firma === firma && local.cache) return local.cache;
  const ra = await leerTodas(archivos);
  local.firma = firma; local.cache = ra;
  return ra;
}

async function calcular(archivos, rerender) {
  local.cargando = true; local.error = null;
  try {
    local.cache = await leerTodas(archivos, (i, n) => { local.avance = [i, n]; rerender(); });
  } catch (e) { local.error = String(e?.message ?? e); }
  local.cargando = false; local.avance = null; rerender();
}

export function paginaTaxonomias({ filas, todasFilas, archivos, etiqueta, programaDe, seleccion, rerender }) {
  const cabecera = [...titulo('Taxonomías Curriculares'),
    info('Cada resultado de aprendizaje (RA) declara en el Paso 3 su <b>dominio</b> (cognitivo, procedimental o actitudinal) y su <b>nivel</b>. Esta sección responde dos preguntas: ' +
      '<b>¿qué tan exigentes son los RA declarados?</b> y <b>¿el verbo con que inicia cada RA corresponde a lo que declara?</b> El contraste es una propuesta para revisar con el comité; un verbo puede admitir varias lecturas.')];
  const firma = archivos.map(a => a.huella ?? a.nombre).join('|');
  if (local.firma !== firma) { local.firma = firma; local.cache = null; }
  if (!local.cache) {
    if (!local.cargando) calcular(archivos, rerender);
    return h('div', {}, ...cabecera, local.error ? aviso('error', local.error)
      : aviso('info', `Leyendo los RA del Paso 3… ${local.avance ? `${local.avance[0]} de ${local.avance[1]} archivos` : ''}`));
  }

  const vis = new Set(filas.map(f => f.Matriz));
  const todas = local.cache.map(r => ({ ...r, Programa: programaDe.get(r.Matriz) ?? r.Programa }));
  const ra = todas.filter(r => vis.has(r.Matriz) && (!seleccion || r.Matriz === seleccion));
  if (!ra.length) return h('div', {}, ...cabecera, aviso('warning', 'Las matrices de la vista no tienen resultados de aprendizaje en el Paso 3.'));

  const res = resumenContraste(ra);
  const porM = porGrupo(ra, 'Matriz');
  const refExig = mediana(porGrupo(todas, 'Matriz').map(x => x['Índice de exigencia']));
  const aRevisar = res.estados['Nivel difiere'] + res.estados['Dominio difiere'];

  const cuerpo = {
    'Exigencia de los RA': () => exigencia(ra, porM, refExig, etiqueta, todasFilas.filter(f => vis.has(f.Matriz) && (!seleccion || f.Matriz === seleccion))),
    'Revisión de verbos': () => revision(ra, res, etiqueta, rerender),
    'Listado de RA': () => listado(ra, etiqueta, rerender),
  };

  return h('div', {}, ...cabecera,
    seleccion ? aviso('info', `<b>Vista de matriz:</b> ${etiqueta.get(seleccion)} (${ra.length} RA únicos). La referencia del índice es la mediana de las matrices cargadas.`) : null,
    columnas(metrica('RA únicos', miles(ra.length)),
      metrica('Índice de exigencia', fmt(indiceExigencia(ra.map(r => r['Exigencia declarada']))),
        'Escala de 0 a 100: 0 es el nivel más básico y 100 el más alto de cada taxonomía. Es descriptivo; la exigencia adecuada depende del nivel de formación.' + (seleccion ? ` Mediana de las matrices: ${fmt(refExig)}.` : '')),
      metrica('Verbo coherente con lo declarado', `${(res.pct.Coincide ?? 0).toFixed(0)} %`, 'RA cuyo dominio y nivel coinciden con los que la base de verbos asigna a su verbo.'),
      metrica('RA por revisar', miles(aRevisar), 'Nivel o dominio distinto del que la base asigna al verbo.')),
    h('div', { class: 'pestanas' }, ...PESTANAS.map(p => h('button', { type: 'button', class: p === local.pestana ? 'activa' : '', onclick: () => { local.pestana = p; rerender(); } }, p))),
    cuerpo[local.pestana]());
}

function exigencia(ra, porM, refExig, etiqueta, filasDf) {
  const orden = [...porM].filter(x => x['Índice de exigencia'] != null).sort((a, b) => a['Índice de exigencia'] - b['Índice de exigencia']);
  const mixtas = [...new Set(ra.map(r => r.Matriz))].filter(m => new Set(ra.filter(r => r.Matriz === m).map(r => r['Taxonomía'])).size > 1).length;
  const pctBak = Math.round(100 * ra.filter(r => r['Taxonomía'] === 'BAK').length / ra.length);
  const doms = DOMINIOS.filter(d => ra.some(r => r['Dominio declarado'] === d));
  const progs = [...new Set(ra.map(r => r.Programa))].sort(cmp);

  const niveles = d => {
    const cuenta = new Map();
    ra.filter(r => r['Dominio declarado'] === d).forEach(r => cuenta.set(r['Nivel declarado'], (cuenta.get(r['Nivel declarado']) ?? 0) + 1));
    return NIVELES[d].map(([k, etq]) => ({ etq, n: cuenta.get(k) ?? 0 }));
  };
  const totalDom = d => ra.filter(r => r['Dominio declarado'] === d).length;

  return h('div', {},
    h('h3', {}, 'Índice de exigencia por matriz'),
    h('p', { class: 'leyenda' }, 'Cada RA declara un nivel de su taxonomía (por ejemplo, Aplicación o Análisis). El índice lleva esos niveles a una escala común de 0 a 100 y promedia los de la matriz. ' +
      `Úsalo para comparar matrices entre sí y con la mediana (línea punteada), no como una nota. Cuidado: las taxonomías con menos niveles (BAK procedimental y actitudinal) elevan el índice; ${pctBak} % de los RA usa BAK, y ${mixtas} matriz(ces) combinan Bloom y BAK.`),
    grafico([{ type: 'bar', orientation: 'h', x: orden.map(x => x['Índice de exigencia']), y: orden.map(x => etiqueta.get(x.Matriz) ?? x.Matriz),
      text: orden.map(x => (x['% BAK'] > 0 ? `BAK ${Math.round(x['% BAK'])} %` : 'Bloom')), textposition: 'inside', insidetextanchor: 'start', textfont: { color: '#fff', size: 10 },
      customdata: orden.map(x => [x['RA únicos'], x['% BAK']]), marker: { color: '#1FB2DE' },
      hovertemplate: '<b>%{y}</b><br>Exigencia %{x}<br>%{customdata[0]} RA · %{customdata[1]} % con BAK<extra></extra>' }],
    { height: Math.max(300, 24 * orden.length + 90), xaxis: { range: [0, 100], title: 'Índice de exigencia (0–100)' }, yaxis: { automargin: true, tickfont: { size: 10.5 } }, margin: { l: 10, r: 20, t: 20, b: 50 },
      shapes: refExig == null ? [] : [{ type: 'line', x0: refExig, x1: refExig, yref: 'paper', y0: 0, y1: 1, line: { dash: 'dot', color: '#FBAF17', width: 2 } }],
      annotations: refExig == null ? [] : [{ x: refExig, y: 1, yref: 'paper', text: `Mediana ${refExig.toFixed(0)}`, showarrow: false, yanchor: 'bottom', font: { color: '#8C6000', size: 11 } }] }),
    h('hr'),
    h('h3', {}, 'Niveles declarados en cada dominio'),
    h('p', { class: 'leyenda' }, 'Cuántos RA declaran cada nivel, de menor a mayor complejidad dentro de su dominio. Si casi todos se concentran en los primeros niveles, los RA piden poco; ' +
      'si se concentran en los últimos, conviene revisar si son alcanzables.'),
    columnas(...doms.map(d => h('div', {}, h('b', {}, `${d} (${totalDom(d)} RA)`),
      grafico([{ type: 'bar', x: niveles(d).map(x => x.etq), y: niveles(d).map(x => x.n), text: niveles(d).map(x => x.n || ''), textposition: 'outside', cliponaxis: false, marker: { color: COLOR_DOM[d] },
        hovertemplate: '%{x}: %{y} RA<extra></extra>' }],
      { height: 280, margin: { l: 40, r: 10, t: 20, b: 70 }, xaxis: { tickangle: -30 }, yaxis: { title: 'RA', rangemode: 'tozero' } })))),
    h('hr'),
    h('h3', {}, 'Dominios que desarrolla cada programa'),
    h('p', { class: 'leyenda' }, 'Porcentaje de los RA de cada programa en cada dominio. Un programa sin RA actitudinales, o con muy pocos, puede estar dejando por fuera la formación en valores y actitudes.'),
    grafico(doms.map(d => ({ type: 'bar', orientation: 'h', name: d, y: progs, marker: { color: COLOR_DOM[d] },
      x: progs.map(p => { const g = ra.filter(r => r.Programa === p); return 100 * g.filter(r => r['Dominio declarado'] === d).length / g.length; }),
      hovertemplate: '%{y}<br>' + d + ': %{x:.0f} %<extra></extra>' })),
    { height: Math.max(320, 24 * progs.length + 120), barmode: 'stack', xaxis: { range: [0, 100], ticksuffix: ' %' }, yaxis: { automargin: true, tickfont: { size: 10.5 } }, margin: { l: 10, r: 10, t: 10, b: 40 }, legend: { orientation: 'h', y: 1.04 } }),
    progresion(ra, filasDf));
}

function progresion(ra, filasDf) {
  const clavePorMatriz = new Map(ra.map(r => [`${r.Matriz}|${r.clave}`, r]));
  const vistos = new Set(), sem = [];
  for (const f of filasDf) {
    const s = Number(f.Semestre);
    if (f.Semestre === '' || f.Semestre == null || !Number.isFinite(s)) continue;
    const c = norm(f['Resultado de aprendizaje']);
    const key = `${f.Matriz}|${s}|${c}`;
    if (vistos.has(key)) continue;
    vistos.add(key);
    const r = clavePorMatriz.get(`${f.Matriz}|${c}`);
    if (r) sem.push({ s, ex: r['Exigencia declarada'] });
  }
  if (!sem.length) return null;
  const semestres = [...new Set(sem.map(x => x.s))].sort((a, b) => a - b);
  return h('div', {}, h('hr'), h('h3', {}, '¿Crece la exigencia a lo largo del plan de estudios?'),
    h('p', { class: 'leyenda' }, 'Índice de exigencia de los RA según el semestre en que se trabajan las asignaturas (Paso 5). En general se espera que suba en los semestres avanzados.'),
    grafico([{ type: 'scatter', mode: 'lines+markers', x: semestres, y: semestres.map(s => indiceExigencia(sem.filter(x => x.s === s).map(x => x.ex))), line: { color: '#0F385A', width: 3 }, marker: { color: '#1FB2DE', size: 9 },
      hovertemplate: 'Semestre %{x}: %{y}<extra></extra>' }],
    { height: 300, yaxis: { range: [0, 100], title: 'Índice de exigencia' }, xaxis: { title: 'Semestre', dtick: 1 }, margin: { l: 50, r: 10, t: 10, b: 40 } }));
}

function revision(ra, res, etiqueta, rerender) {
  const rev = ra.filter(r => local.estados.includes(r.Contraste));
  const grupos = porGrupo(ra, 'Programa');
  const top = grupos.map(g => ({ p: g.Programa, nivel: Math.round(g['% Nivel difiere'] * g['RA únicos'] / 100), dominio: Math.round(g['% Dominio difiere'] * g['RA únicos'] / 100) }))
    .filter(x => x.nivel + x.dominio > 0).sort((a, b) => b.nivel + b.dominio - (a.nivel + a.dominio)).slice(0, 12).reverse();
  const decl = r => (r['Dominio declarado'] ? `${r['Dominio declarado']} · ${r['Nivel declarado'] || 'sin nivel'}` : 'Sin dominio');
  const base = r => (r['Dominio(s) según la base'] ? `${r['Dominio(s) según la base']} · ${r['Nivel según la base'] || '—'}` : 'No está en la base');
  const filasTabla = rev.map(r => ({ Matriz: etiqueta.get(r.Matriz) ?? r.Matriz, RA: r.RA, Verbo: r.Verbo, 'Lo que declara': decl(r), 'Lo que indica el verbo': base(r), Resultado: ETIQUETA[r.Contraste] }));
  const colorEstado = c => { const v = c.getValue(), k = Object.keys(ETIQUETA).find(e => ETIQUETA[e] === v); c.getElement().style.color = COLOR_CONTRASTE[k] ?? '#0F385A'; c.getElement().style.fontWeight = 'bold'; return v; };

  return h('div', {},
    h('h3', {}, '¿El verbo del RA corresponde al dominio y al nivel que declara?'),
    h('p', { class: 'leyenda' }, 'Cada RA inicia con un verbo (por ejemplo, «Analizar» o «Diseñar»). La base institucional de verbos indica en qué dominio y nivel se ubica. Se compara con lo que el RA declara en el Paso 3. ' +
      '«Revisar» no significa que el RA esté mal: indica que declaración y verbo no coinciden y conviene validarlo con el programa.'),
    columnas(...ESTADOS.map(e => metrica(ETIQUETA[e], `${miles(res.estados[e])} (${(res.pct[e] ?? 0).toFixed(0)} %)`,
      { Coincide: 'Dominio y nivel coinciden con la base.', 'Nivel difiere': 'Mismo dominio, otro nivel.', 'Dominio difiere': 'El verbo pertenece a otro dominio.', 'Verbo fuera de la base': 'La base no tiene este verbo.' }[e]))),
    top.length ? h('div', {}, h('h3', {}, 'Programas con más RA por revisar'),
      grafico([{ type: 'bar', orientation: 'h', name: ETIQUETA['Nivel difiere'], y: top.map(x => x.p), x: top.map(x => x.nivel), marker: { color: COLOR_CONTRASTE['Nivel difiere'] } },
        { type: 'bar', orientation: 'h', name: ETIQUETA['Dominio difiere'], y: top.map(x => x.p), x: top.map(x => x.dominio), marker: { color: COLOR_CONTRASTE['Dominio difiere'] } }],
      { height: Math.max(260, 28 * top.length + 100), barmode: 'stack', xaxis: { title: 'RA por revisar' }, yaxis: { automargin: true, tickfont: { size: 10.5 } }, margin: { l: 10, r: 10, t: 10, b: 50 }, legend: { orientation: 'h', y: 1.1 } })) : null,
    h('h3', {}, 'RA por revisar'),
    multiselect('Mostrar', ESTADOS.map(e => ETIQUETA[e]), local.estados.map(e => ETIQUETA[e]), v => { local.estados = ESTADOS.filter(e => v.includes(ETIQUETA[e])); }),
    h('button', { type: 'button', class: 'boton secundario', onclick: rerender }, 'Aplicar'),
    h('p', { class: 'leyenda' }, `${miles(rev.length)} RA con el resultado elegido. Pasa el cursor sobre el texto del RA para leerlo completo.`),
    filasTabla.length ? tabla(filasTabla, [{ title: 'Matriz', field: 'Matriz' }, { title: 'Verbo', field: 'Verbo', width: 110 }, { title: 'RA', field: 'RA', minWidth: 340, tooltip: true },
      { title: 'Lo que declara', field: 'Lo que declara', width: 190 }, { title: 'Lo que indica el verbo', field: 'Lo que indica el verbo', width: 210 }, { title: 'Resultado', field: 'Resultado', width: 150, formatter: colorEstado }],
    { height: Math.min(520, 46 * Math.min(filasTabla.length, 10) + 60) }) : aviso('success', 'No hay RA con el resultado elegido.'),
    botonDescarga('Descargar el contraste (Excel)', () => {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ra.map(({ clave, ...r }) => r)), 'Contraste');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(grupos), 'Por programa');
      descargar('taxonomias_contraste.xlsx', XLSX.write(wb, { bookType: 'xlsx', type: 'array' }), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }));
}

function listado(ra, etiqueta, rerender) {
  const progs = [...new Set(ra.map(r => r.Programa))].sort(cmp);
  const caja = h('input', { type: 'text', value: local.texto, placeholder: 'Buscar en el texto del RA',
    onkeydown: e => { if (e.key === 'Enter') { local.texto = e.target.value; rerender(); } } });
  let v = ra;
  if (local.prog.length) v = v.filter(r => local.prog.includes(r.Programa));
  if (local.dom.length) v = v.filter(r => local.dom.includes(r['Dominio declarado']));
  if (local.texto.trim()) v = v.filter(r => r.RA.toLowerCase().includes(local.texto.trim().toLowerCase()));
  const filasTabla = v.map(r => ({ Matriz: etiqueta.get(r.Matriz) ?? r.Matriz, Verbo: r.Verbo, Dominio: r['Dominio declarado'] || '—', Nivel: r['Nivel declarado'] || '—', Verificación: ETIQUETA[r.Contraste], RA: r.RA }));
  return h('div', {}, h('h3', {}, 'Listado de resultados de aprendizaje'),
    h('p', { class: 'leyenda' }, 'Todos los RA de la vista con su dominio, nivel y verificación del verbo. Filtra por programa o dominio, o busca una palabra del RA.'),
    columnas(multiselect('Programa', progs, local.prog, x => { local.prog = x; }),
      multiselect('Dominio', DOMINIOS, local.dom, x => { local.dom = x; }), h('div', { class: 'campo' }, h('label', {}, 'Buscar (Enter)'), caja)),
    h('button', { type: 'button', class: 'boton secundario', onclick: () => { local.texto = caja.value; rerender(); } }, 'Aplicar filtros'),
    h('p', { class: 'leyenda' }, `${miles(v.length)} de ${miles(ra.length)} RA.`),
    tabla(filasTabla, [{ title: 'Matriz', field: 'Matriz' }, { title: 'Verbo', field: 'Verbo', width: 110 }, { title: 'Dominio', field: 'Dominio', width: 130 }, { title: 'Nivel', field: 'Nivel', width: 130 },
      { title: 'Verificación', field: 'Verificación', width: 150 }, { title: 'RA', field: 'RA', minWidth: 360, tooltip: true }], { height: 520 }));
}
