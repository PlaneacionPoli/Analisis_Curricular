// Página «Taxonomías»: lo que declara el Paso 3 (Bloom o BAK, dominio, nivel), su exigencia y su coherencia con la base de
// verbos. Unidad: RA único por matriz. La referencia (mediana del índice de exigencia) es siempre la del conjunto cargado.
import * as XLSX from 'xlsx';
import { baseVerbos, contrastar, DOMINIOS, ESTADOS, indiceExigencia, leerRA, porGrupo, resumenContraste } from '../data/taxonomias.js';
import { cmp } from '../data/util.js';
import { aviso, botonDescarga, columnas, descargar, grafico, h, info, metrica, multiselect, tabla, titulo } from '../ui.js';

const COLOR_DOM = { Cognitivo: '#2E86C1', Procedimental: '#1E8449', Actitudinal: '#42F2F2', 'Sin dominio': '#BDC3C7' };
const COLOR_CONTRASTE = { Coincide: '#1FB2DE', 'Nivel difiere': '#FBAF17', 'Dominio difiere': '#EC0677', 'Verbo fuera de la base': '#8A94A0' };
const ORDEN_NIVELES = ['conocimiento', 'comprension', 'aplicacion', 'analisis', 'sintesis', 'evaluacion', 'imitacion', 'manipulacion', 'precision',
  'control', 'percepcion', 'responder', 'valorar', 'organizar', 'caracterizar'];
const PESTANAS = ['Resumen', 'Dominio y nivel', 'Coherencia verbo–nivel', 'Verbos', 'Progresión', 'Explorar RA'];

const local = { pestana: 'Resumen', cache: null, firma: '', cargando: false, avance: null, error: null, estados: ESTADOS.slice(1), prog: [], dom: [], texto: '' };
const norm = t => String(t ?? '').normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const mediana = v => { const s = v.filter(x => x != null).sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const fmt = x => (x == null ? '—' : x);

async function calcular(archivos, rerender) {
  local.cargando = true; local.error = null;
  try {
    const base = await baseVerbos();
    const ra = [];
    for (let i = 0; i < archivos.length; i++) {
      local.avance = [i, archivos.length]; rerender();
      await new Promise(r => setTimeout(r, 0));
      try { ra.push(...leerRA(new Uint8Array(archivos[i].buffer), archivos[i].nombre)); } catch { /* archivo sin Paso 3 legible */ }
    }
    local.cache = contrastar(ra, base);
  } catch (e) { local.error = String(e?.message ?? e); }
  local.cargando = false; local.avance = null; rerender();
}

const BARRA = { height: 320, margin: { l: 10, r: 10, t: 10, b: 10 } };

export function paginaTaxonomias({ filas, todasFilas, archivos, etiqueta, programaDe, seleccion, rerender }) {
  const cabecera = [...titulo('Taxonomías Curriculares'),
    info('Cada <b>resultado de aprendizaje (RA) único</b> declara en el Paso 3 su taxonomía (<b>Bloom</b> o <b>BAK</b>), su dominio (cognitivo, ' +
      'procedimental, actitudinal) y su nivel. Esta sección resume lo declarado, calcula el <b>índice de exigencia</b> y contrasta cada RA con la ' +
      '<b>base de verbos</b> (646 verbos): ¿el dominio y el nivel declarados son coherentes con el verbo? El contraste es una propuesta para revisar ' +
      'con el comité; un verbo puede admitir varias lecturas.')];
  const firma = archivos.map(a => a.huella ?? a.nombre).join('|');
  if (local.firma !== firma) { local.firma = firma; local.cache = null; }
  if (!local.cache) {
    if (!local.cargando) calcular(archivos, rerender);
    return h('div', {}, ...cabecera, local.error ? aviso('error', local.error)
      : aviso('info', `Leyendo las taxonomías declaradas en el Paso 3… ${local.avance ? `${local.avance[0]} de ${local.avance[1]} archivos` : ''}`));
  }

  const vis = new Set(filas.map(f => f.Matriz));
  const todas = local.cache.map(r => ({ ...r, Programa: programaDe.get(r.Matriz) ?? r.Programa }));
  const ra = todas.filter(r => vis.has(r.Matriz) && (!seleccion || r.Matriz === seleccion));
  if (!ra.length) return h('div', {}, ...cabecera, aviso('warning', 'Las matrices de la vista no tienen resultados de aprendizaje en el Paso 3.'));

  const res = resumenContraste(ra);
  const porM = porGrupo(ra, 'Matriz');
  const refExig = mediana(porGrupo(todas, 'Matriz').map(x => x['Índice de exigencia']));
  const pctTax = t => `${Math.round(100 * ra.filter(r => r['Taxonomía'] === t).length / ra.length)}%`;

  const cuerpo = {
    'Resumen': () => resumen(ra, porM, refExig, seleccion, etiqueta),
    'Dominio y nivel': () => dominioNivel(ra),
    'Coherencia verbo–nivel': () => coherencia(ra, res, rerender),
    'Verbos': () => verbos(ra),
    'Progresión': () => progresion(ra, todasFilas.filter(f => vis.has(f.Matriz) && (!seleccion || f.Matriz === seleccion))),
    'Explorar RA': () => explorar(ra, rerender),
  };

  return h('div', {}, ...cabecera,
    seleccion ? aviso('info', `<b>Vista de matriz:</b> ${etiqueta.get(seleccion)} (${ra.length} RA únicos). La referencia del índice es la mediana de las matrices cargadas.`) : null,
    columnas(metrica('RA únicos', ra.length), metrica('Bloom', pctTax('Bloom')), metrica('BAK', pctTax('BAK')),
      metrica('Índice de exigencia', fmt(indiceExigencia(ra.map(r => r['Exigencia declarada']))),
        '(nivel medio − 1) / 5 × 100, con cada nivel en la escala común de 1 a 6. Es descriptivo: la exigencia adecuada depende del nivel de formación.' +
        (seleccion ? ` Mediana de las matrices: ${fmt(refExig)}.` : '')),
      metrica('Coherentes con el verbo', `${(res.pct.Coincide ?? 0).toFixed(0)}%`, 'RA cuyo dominio y nivel declarados coinciden con los de la base para su verbo.')),
    h('div', { class: 'pestanas' }, ...PESTANAS.map(p => h('button', { type: 'button', class: p === local.pestana ? 'activa' : '', onclick: () => { local.pestana = p; rerender(); } }, p))),
    cuerpo[local.pestana]());
}

function resumen(ra, porM, refExig, seleccion, etiqueta) {
  const orden = [...porM].sort((a, b) => (a['Índice de exigencia'] ?? 0) - (b['Índice de exigencia'] ?? 0));
  const mixtas = [...new Set(ra.map(r => r.Matriz))].filter(m => new Set(ra.filter(r => r.Matriz === m).map(r => r['Taxonomía'])).size > 1).length;
  return h('div', {},
    h('h3', {}, 'Índice de exigencia por matriz'),
    h('p', { class: 'leyenda' }, 'Cada nivel declarado se traduce a una escala común de 1 a 6 según su posición en la progresión de su dominio (Bloom: 6 niveles; BAK procedimental: 4; ' +
      'BAK actitudinal: 5). La equivalencia entre escalas es un supuesto del método. Color: % de RA con BAK.'),
    grafico([{ type: 'bar', orientation: 'h', x: orden.map(x => x['Índice de exigencia']), y: orden.map(x => etiqueta.get(x.Matriz) ?? x.Matriz),
      marker: { color: orden.map(x => x['% BAK']), colorscale: [[0, '#0F385A'], [1, '#42F2F2']], colorbar: { title: { text: '% BAK' } } },
      hovertemplate: '%{y}<br>Exigencia %{x}<extra></extra>' }],
    { height: Math.max(300, 22 * orden.length + 100), xaxis: { range: [0, 100], title: 'Índice de exigencia' }, margin: { l: 280, r: 10, t: 10, b: 40 },
      shapes: refExig == null ? [] : [{ type: 'line', x0: refExig, x1: refExig, yref: 'paper', y0: 0, y1: 1, line: { dash: 'dot', color: '#FBAF17', width: 2 } }] }),
    h('p', { class: 'leyenda' }, `${mixtas} matriz(ces) combinan Bloom y BAK entre sus RA.` + (seleccion ? '' : ' Línea punteada = mediana de las matrices.')),
    tabla(porM.map(x => ({ ...x, Matriz: etiqueta.get(x.Matriz) ?? x.Matriz })),
      ['Matriz', 'RA únicos', '% Bloom', '% BAK', 'Índice de exigencia'].map(c => ({ title: c, field: c, ...(c === 'Matriz' ? { minWidth: 260 } : { hozAlign: 'right' }) })), { height: 360 }));
}

function dominioNivel(ra) {
  const cuenta = new Map();
  ra.forEach(r => { const d = r['Dominio declarado'] || 'Sin dominio'; cuenta.set(d, (cuenta.get(d) ?? 0) + 1); });
  const niv = new Map();
  ra.filter(r => r['Nivel declarado']).forEach(r => { const k = `${r['Dominio declarado'] || 'Sin dominio'}|${r['Nivel declarado']}`; niv.set(k, (niv.get(k) ?? 0) + 1); });
  const niveles = [...new Set([...niv.keys()].map(k => k.split('|')[1]))].sort((a, b) => (ORDEN_NIVELES.indexOf(a) + 100) % 100 - (ORDEN_NIVELES.indexOf(b) + 100) % 100);
  const doms = [...cuenta.keys()];
  const progs = [...new Set(ra.map(r => r.Programa))].sort(cmp);
  return h('div', {},
    columnas(
      h('div', {}, h('h3', {}, 'Dominio declarado'), grafico([{ type: 'pie', labels: [...cuenta.keys()], values: [...cuenta.values()], hole: 0.4, textinfo: 'label+percent',
        marker: { colors: [...cuenta.keys()].map(d => COLOR_DOM[d] ?? '#BDC3C7') } }], { ...BARRA, height: 340, showlegend: false })),
      h('div', {}, h('h3', {}, 'Nivel declarado por dominio'), grafico(doms.map(d => ({ type: 'bar', name: d, x: niveles, y: niveles.map(n => niv.get(`${d}|${n}`) ?? 0), marker: { color: COLOR_DOM[d] } })),
        { ...BARRA, height: 340, barmode: 'stack', yaxis: { title: 'RA' } }))),
    h('h3', {}, 'Composición por dominio en cada programa'),
    grafico(doms.map(d => ({ type: 'bar', orientation: 'h', name: d, y: progs, marker: { color: COLOR_DOM[d] },
      x: progs.map(p => { const g = ra.filter(r => r.Programa === p); return 100 * g.filter(r => (r['Dominio declarado'] || 'Sin dominio') === d).length / g.length; }) })),
    { height: Math.max(320, 24 * progs.length + 120), barmode: 'stack', xaxis: { range: [0, 100], ticksuffix: ' %' }, margin: { l: 280, r: 10, t: 10, b: 40 } }));
}

function coherencia(ra, res, rerender) {
  const grupos = porGrupo(ra, 'Programa');
  const rev = ra.filter(r => local.estados.includes(r.Contraste));
  const cols = ['Matriz', 'Verbo', 'Taxonomía', 'Dominio declarado', 'Nivel declarado', 'Dominio(s) según la base', 'Nivel según la base', 'Diferencia de nivel (declarado − base)', 'Contraste', 'RA'];
  return h('div', {},
    h('h3', {}, '¿El dominio y el nivel declarados son coherentes con el verbo del RA?'),
    h('p', { class: 'leyenda' }, 'Dominio: el declarado debe estar entre los que la base asigna al verbo. Nivel: si el dominio coincide, se compara el nivel declarado con el de la base en la escala común de 1 a 6 ' +
      '(coincide si la diferencia es menor de 0,5). «Difiere» pide revisión, no declara un error.'),
    columnas(...ESTADOS.map(e => metrica(e, `${res.estados[e]} (${(res.pct[e] ?? 0).toFixed(0)}%)`))),
    grafico(ESTADOS.map(e => ({ type: 'bar', orientation: 'h', name: e, y: grupos.map(g => g.Programa), x: grupos.map(g => g[`% ${e}`]), marker: { color: COLOR_CONTRASTE[e] } })),
      { height: Math.max(320, 24 * grupos.length + 120), barmode: 'stack', xaxis: { range: [0, 100], ticksuffix: ' %' }, margin: { l: 280, r: 10, t: 10, b: 40 } }),
    multiselect('Mostrar RA con resultado', ESTADOS, local.estados, v => { local.estados = v; }),
    h('button', { type: 'button', class: 'boton secundario', onclick: rerender }, 'Aplicar'),
    h('p', { class: 'leyenda' }, `${rev.length} RA para revisar.`),
    tabla(rev, cols.map(c => ({ title: c, field: c, ...(c === 'RA' ? { minWidth: 360, tooltip: true } : {}) })), { height: Math.min(520, 35 * rev.length + 60) }),
    botonDescarga('Descargar el contraste (Excel)', () => {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ra.map(({ clave, ...r }) => r)), 'Contraste');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(grupos), 'Por programa');
      descargar('taxonomias_contraste.xlsx', XLSX.write(wb, { bookType: 'xlsx', type: 'array' }), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }));
}

function verbos(ra) {
  const moda = a => { const c = new Map(); a.forEach(x => c.set(x, (c.get(x) ?? 0) + 1)); const m = Math.max(...c.values()); return [...c].filter(([, n]) => n === m).map(x => x[0]).sort()[0] ?? ''; };
  const g = new Map();
  ra.forEach(r => { const v = r.Verbo.toLowerCase(); if (!g.has(v)) g.set(v, []); g.get(v).push(r); });
  const filas = [...g].map(([Verbo, d]) => ({ Verbo, RA: d.length, 'Dominio más declarado': moda(d.map(x => x['Dominio declarado'])), 'Nivel más declarado': moda(d.map(x => x['Nivel declarado'])),
    'Dominio(s) según la base': moda(d.map(x => x['Dominio(s) según la base'])) })).sort((a, b) => b.RA - a.RA);
  const top = filas.slice(0, 20).reverse();
  const doms = [...new Set(top.map(x => x['Dominio más declarado'] || 'Sin dominio'))];
  return h('div', {}, h('h3', {}, 'Verbos de los RA'),
    h('p', { class: 'leyenda' }, 'Verbo con el que inicia cada RA (Paso 3), su frecuencia y el dominio y nivel que más se le declara.'),
    grafico(doms.map(d => ({ type: 'bar', orientation: 'h', name: d, marker: { color: COLOR_DOM[d] ?? '#BDC3C7' },
      y: top.filter(x => (x['Dominio más declarado'] || 'Sin dominio') === d).map(x => x.Verbo), x: top.filter(x => (x['Dominio más declarado'] || 'Sin dominio') === d).map(x => x.RA) })),
    { height: 520, margin: { l: 120, r: 10, t: 10, b: 40 }, yaxis: { categoryorder: 'array', categoryarray: top.map(x => x.Verbo) } }),
    tabla(filas, Object.keys(filas[0]).map(c => ({ title: c, field: c })), { height: 400 }));
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
    if (r) sem.push({ s, dom: r['Dominio declarado'], ex: r['Exigencia declarada'] });
  }
  if (!sem.length) return aviso('info', 'No se pudo vincular los RA del Paso 3 con los semestres del Paso 5.');
  const semestres = [...new Set(sem.map(x => x.s))].sort((a, b) => a - b);
  const doms = [...new Set(sem.map(x => x.dom || 'Sin dominio'))];
  return h('div', {}, h('h3', {}, 'Progresión por semestre'),
    h('p', { class: 'leyenda' }, 'Exigencia y dominio de los RA declarados según el semestre en que se trabajan las asignaturas (Paso 5). Cada RA cuenta una vez por matriz y semestre.'),
    grafico([{ type: 'scatter', mode: 'lines+markers', x: semestres, y: semestres.map(s => indiceExigencia(sem.filter(x => x.s === s).map(x => x.ex))) }],
      { height: 320, yaxis: { range: [0, 100], title: 'Índice de exigencia' }, xaxis: { title: 'Semestre', dtick: 1 }, margin: { l: 50, r: 10, t: 10, b: 40 } }),
    grafico(doms.map(d => ({ type: 'bar', name: d, x: semestres, marker: { color: COLOR_DOM[d] ?? '#BDC3C7' },
      y: semestres.map(s => { const g = sem.filter(x => x.s === s); return 100 * g.filter(x => (x.dom || 'Sin dominio') === d).length / g.length; }) })),
    { height: 320, barmode: 'stack', yaxis: { range: [0, 100], ticksuffix: ' %' }, xaxis: { title: 'Semestre', dtick: 1 }, margin: { l: 50, r: 10, t: 10, b: 40 } }));
}

function explorar(ra, rerender) {
  const progs = [...new Set(ra.map(r => r.Programa))].sort(cmp);
  const caja = h('input', { type: 'text', value: local.texto, placeholder: 'Buscar en el texto del RA',
    onkeydown: e => { if (e.key === 'Enter') { local.texto = e.target.value; rerender(); } } });
  let v = ra;
  if (local.prog.length) v = v.filter(r => local.prog.includes(r.Programa));
  if (local.dom.length) v = v.filter(r => local.dom.includes(r['Dominio declarado']));
  if (local.texto.trim()) v = v.filter(r => r.RA.toLowerCase().includes(local.texto.trim().toLowerCase()));
  const cols = ['Matriz', 'Verbo', 'Taxonomía', 'Dominio declarado', 'Nivel declarado', 'Tipo de saber', 'Contraste', 'RA'];
  return h('div', {}, h('h3', {}, 'Explorar resultados de aprendizaje'),
    columnas(multiselect('Programa', progs, local.prog, x => { local.prog = x; }),
      multiselect('Dominio declarado', DOMINIOS, local.dom, x => { local.dom = x; }), h('div', { class: 'campo' }, h('label', {}, 'Buscar (Enter)'), caja)),
    h('button', { type: 'button', class: 'boton secundario', onclick: () => { local.texto = caja.value; rerender(); } }, 'Aplicar filtros'),
    h('p', { class: 'leyenda' }, `${v.length} de ${ra.length} RA.`),
    tabla(v, cols.map(c => ({ title: c, field: c, ...(c === 'RA' ? { minWidth: 400, tooltip: true } : {}) })), { height: 520 }));
}
