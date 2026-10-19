// Página «Taxonomías»: lo que declaran los RA (dominio y nivel), su exigencia y si el verbo con que inician corresponde a lo declarado.
// Unidad: RA único por matriz. Se muestra lo declarado (taxonomía, dominio y nivel); no se resume en un índice porque las taxonomías tienen distinto número de niveles.
import { libroTaxonomias } from '../export/libros.js';
import { MIME_XLSX } from '../export/excelMarca.js';
import { baseVerbos, contrastar, DOMINIOS, ESTADOS, indiceExigencia, leerRA, porGrupo, resumenContraste } from '../data/taxonomias.js';
import { ceder, cmp } from '../data/util.js';
import { aviso, botonDescarga, columnas, descargar, grafico, h, info, metrica, multiselect, selector, tabla, titulo } from '../ui.js';

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
const PESTANAS = ['Niveles de los RA', 'Revisión de verbos', 'Listado de RA'];

const local = { pestana: PESTANAS[0], cache: null, firma: '', cargando: false, avance: null, error: null, estados: ['Nivel difiere', 'Dominio difiere'], prog: [], dom: [], texto: '', domNivel: null, taxNivel: null };
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
      '<b>¿qué niveles declaran los RA?</b> y <b>¿el verbo con que inicia cada RA corresponde a lo que declara?</b> El contraste es una propuesta para revisar con el comité; un verbo puede admitir varias lecturas.')];
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
  const pctBak = Math.round(100 * ra.filter(r => r['Taxonomía'] === 'BAK').length / ra.length);
  const aRevisar = res.estados['Nivel difiere'] + res.estados['Dominio difiere'];

  const cuerpo = {
    'Niveles de los RA': () => niveles(ra, etiqueta, rerender, todasFilas.filter(f => vis.has(f.Matriz) && (!seleccion || f.Matriz === seleccion))),
    'Revisión de verbos': () => revision(ra, res, etiqueta, rerender),
    'Listado de RA': () => listado(ra, etiqueta, rerender),
  };

  return h('div', {}, ...cabecera,
    seleccion ? aviso('info', `<b>Vista de matriz:</b> ${etiqueta.get(seleccion)} (${ra.length} RA únicos).`) : null,
    columnas(metrica('RA únicos', miles(ra.length)),
      metrica('Taxonomía declarada', `${100 - pctBak} % Bloom · ${pctBak} % BAK`, 'Porcentaje de los RA únicos que declaran cada taxonomía en el Paso 3.'),
      metrica('Verbo coherente con lo declarado', `${(res.pct.Coincide ?? 0).toFixed(0)} %`, 'RA cuyo dominio y nivel coinciden con los que la base de verbos asigna a su verbo.'),
      metrica('RA por revisar', miles(aRevisar), 'Nivel o dominio distinto del que la base asigna al verbo.')),
    h('div', { class: 'pestanas' }, ...PESTANAS.map(p => h('button', { type: 'button', class: p === local.pestana ? 'activa' : '', onclick: () => { local.pestana = p; rerender(); } }, p))),
    cuerpo[local.pestana]());
}

function niveles(ra, etiqueta, rerender, filasDf) {
  const mixtas = [...new Set(ra.map(r => r.Matriz))].filter(m => new Set(ra.filter(r => r.Matriz === m).map(r => r['Taxonomía'])).size > 1).length;
  const pctBak = Math.round(100 * ra.filter(r => r['Taxonomía'] === 'BAK').length / ra.length);
  const doms = DOMINIOS.filter(d => ra.some(r => r['Dominio declarado'] === d));
  const progs = [...new Set(ra.map(r => r.Programa))].sort(cmp);
  if (!doms.includes(local.domNivel)) local.domNivel = doms[0];

  // Niveles posibles de un dominio según la taxonomía declarada en la plantilla: con Bloom valen los mismos seis niveles en los tres dominios;
  // BAK añade los propios de procedimental y actitudinal. Así cada RA cuenta en el nivel que declaró.
  const COLOR_TAX = { Bloom: '#0F385A', BAK: '#1FB2DE', '': '#8A94A0' };
  const categorias = d => [...NIVELES.Cognitivo.map(([k, etq]) => ({ k, etq, tax: 'Bloom' })), ...(d === 'Cognitivo' ? [] : NIVELES[d].map(([k, etq]) => ({ k, etq, tax: 'BAK' })))];
  const enCategoria = (r, c, d) => r['Nivel declarado'] === c.k && (d === 'Cognitivo' || (c.tax === 'BAK') === (r['Taxonomía'] === 'BAK'));
  const cuentaDe = (xs, d) => {
    const cats = categorias(d).map(c => ({ ...c, n: xs.filter(r => enCategoria(r, c, d)).length }));
    const otras = xs.length - cats.reduce((t, c) => t + c.n, 0);
    return otras > 0 ? [...cats, { k: '', etq: 'Otra combinación', tax: '', n: otras }] : cats;
  };
  const nivelesDe = d => cuentaDe(ra.filter(r => r['Dominio declarado'] === d), d);
  const totalDom = d => ra.filter(r => r['Dominio declarado'] === d).length;

  // Clasificación de los RA de cada matriz, separada por la taxonomía que usan: Bloom (seis niveles, comunes a los tres dominios) o BAK (niveles propios de cada dominio)
  const taxs = ['Bloom', 'BAK'].filter(t => ra.some(r => r['Taxonomía'] === t));
  if (!taxs.includes(local.taxNivel)) local.taxNivel = taxs[0];
  const tax = local.taxNivel;
  const TONOS = { Cognitivo: ['#C8E6F5', '#8CD3EE', '#1FB2DE', '#1565A7', '#0F385A', '#0A2540'], Procedimental: ['#C7F7F7', '#8FEAEA', '#42F2F2', '#17B3B3'], Actitudinal: ['#FDE9B8', '#FCD88A', '#FBC85C', '#FBAF17', '#C98A00'] };
  const clasif = tax === 'Bloom'
    ? NIVELES.Cognitivo.map(([k, etq], i) => ({ id: k, etq, color: TONOS.Cognitivo[i] }))
    : DOMINIOS.flatMap(d => NIVELES[d].map(([k, etq], i) => ({ id: `${d}|${k}`, etq: `${d}: ${etq}`, color: TONOS[d][i] })));
  const claveDe = r => (tax === 'Bloom' ? r['Nivel declarado'] : `${r['Dominio declarado']}|${r['Nivel declarado']}`);
  const usanTax = [...new Set(ra.filter(r => r['Taxonomía'] === tax).map(r => r.Matriz))].sort((a, b) => cmp(etiqueta.get(a) ?? a, etiqueta.get(b) ?? b));
  const porMat = usanTax.map(m => { const xs = ra.filter(r => r.Matriz === m && r['Taxonomía'] === tax); return { m, xs, n: xs.length }; });
  const hayOtra = porMat.some(x => x.xs.some(r => !clasif.some(c => c.id === claveDe(r))));
  const trazas = [...clasif, ...(hayOtra ? [{ id: '', etq: 'Otra combinación', color: '#8A94A0' }] : [])].map(c => {
    const cuenta = x => (c.id === '' ? x.xs.filter(r => !clasif.some(k => k.id === claveDe(r))).length : x.xs.filter(r => claveDe(r) === c.id).length);
    return { type: 'bar', orientation: 'h', name: c.etq, y: porMat.map(x => `${etiqueta.get(x.m) ?? x.m} (${x.n} RA)`), x: porMat.map(x => Math.round(1000 * cuenta(x) / x.n) / 10),
      marker: { color: c.color }, text: porMat.map(x => (cuenta(x) / x.n >= 0.08 ? `${Math.round(100 * cuenta(x) / x.n)} %` : '')), textposition: 'inside', insidetextanchor: 'middle', textfont: { size: 10 },
      customdata: porMat.map(x => [cuenta(x), x.n]), hovertemplate: `<b>%{y}</b><br>${c.etq}: %{x} % (%{customdata[0]} de %{customdata[1]} RA)<extra></extra>` };
  });

  return h('div', {},
    h('h3', {}, 'Clasificación de los RA de cada matriz'),
    h('p', { class: 'leyenda' }, 'Porcentaje de los RA de cada matriz en cada nivel de la taxonomía que usan; cada barra suma 100 %. Se separa por taxonomía porque cada una tiene sus propios niveles: ' +
      `Bloom usa los mismos seis niveles en los tres dominios y BAK tiene niveles propios para el dominio cognitivo, el procedimental y el actitudinal. ${pctBak} % de los RA usa BAK y ${mixtas} matriz(ces) combinan las dos taxonomías, por eso aparecen en ambas vistas con los RA de cada una.`),
    selector('Taxonomía', taxs.map(t => `${t} (${ra.filter(r => r['Taxonomía'] === t).length} RA en ${new Set(ra.filter(r => r['Taxonomía'] === t).map(r => r.Matriz)).size} matrices)`),
      `${tax} (${ra.filter(r => r['Taxonomía'] === tax).length} RA en ${usanTax.length} matrices)`, v => { local.taxNivel = taxs.find(t => v.startsWith(t)); rerender(); }),
    grafico(trazas, { height: Math.max(320, 26 * porMat.length + 150), barmode: 'stack', xaxis: { range: [0, 100], ticksuffix: ' %' }, yaxis: { autorange: 'reversed', automargin: true, tickfont: { size: 10.5 } },
      margin: { l: 10, r: 10, t: 10, b: 50 }, legend: { orientation: 'h', y: -0.06, font: { size: 10.5 } }, plot_bgcolor: 'white' }),
    h('hr'),
    h('h3', {}, 'Niveles declarados en cada dominio'),
    h('p', { class: 'leyenda' }, 'Cuántos RA declaran cada nivel, de menor a mayor complejidad dentro de su taxonomía. Si casi todos se concentran en los primeros niveles, los RA piden poco; ' +
      'si se concentran en los últimos, conviene revisar si son alcanzables.'),
    columnas(...doms.map(d => h('div', {}, h('b', {}, `${d} (${totalDom(d)} RA)`),
      grafico([{ type: 'bar', x: nivelesDe(d).map(x => x.etq), y: nivelesDe(d).map(x => x.n), text: nivelesDe(d).map(x => x.n || ''), textposition: 'outside', cliponaxis: false, marker: { color: nivelesDe(d).map(x => COLOR_TAX[x.tax]) }, customdata: nivelesDe(d).map(x => x.tax || '—'),
        hovertemplate: '%{x} (%{customdata}): %{y} RA<extra></extra>' }],
      { height: 300, margin: { l: 40, r: 10, t: 20, b: 80 }, xaxis: { tickangle: -40, tickfont: { size: 10 } }, yaxis: { title: 'RA', rangemode: 'tozero' } })))),
    h('p', { class: 'leyenda' }, 'Azul oscuro: niveles de Bloom; azul claro: niveles de BAK propios del dominio. Cada RA cuenta en el nivel que declaró según su taxonomía.'),
    h('hr'),
    h('h3', {}, 'Dominios que desarrolla cada programa'),
    h('p', { class: 'leyenda' }, 'Porcentaje de los RA de cada programa en cada dominio. Un programa sin RA actitudinales, o con muy pocos, puede estar dejando por fuera la formación en valores y actitudes.'),
    grafico(doms.map(d => ({ type: 'bar', orientation: 'h', name: d, y: progs, marker: { color: COLOR_DOM[d] },
      x: progs.map(p => { const g = ra.filter(r => r.Programa === p); return 100 * g.filter(r => r['Dominio declarado'] === d).length / g.length; }),
      hovertemplate: '%{y}<br>' + d + ': %{x:.0f} %<extra></extra>' })),
    { height: Math.max(320, 24 * progs.length + 120), barmode: 'stack', xaxis: { range: [0, 100], ticksuffix: ' %' }, yaxis: { automargin: true, tickfont: { size: 10.5 } }, margin: { l: 10, r: 10, t: 10, b: 40 }, legend: { orientation: 'h', y: 1.04 } }),
    progresion(ra, filasDf, { tax, clasif, claveDe }));
}

/**
 * ¿Qué niveles se trabajan en cada semestre? Por semestre, % de los RA (de la taxonomía elegida) que declara cada nivel; un RA cuenta una vez por matriz y semestre.
 * Usa la misma clasificación que la gráfica por matriz, sin resumirla en un índice.
 */
function progresion(ra, filasDf, { tax, clasif, claveDe }) {
  const clavePorMatriz = new Map(ra.filter(r => r['Taxonomía'] === tax).map(r => [`${r.Matriz}|${r.clave}`, r]));
  const vistos = new Set(), sem = [];
  for (const f of filasDf) {
    const s = Number(f.Semestre);
    if (f.Semestre === '' || f.Semestre == null || !Number.isFinite(s)) continue;
    const c = norm(f['Resultado de aprendizaje']);
    const key = `${f.Matriz}|${s}|${c}`;
    if (vistos.has(key)) continue;
    vistos.add(key);
    const r = clavePorMatriz.get(`${f.Matriz}|${c}`);
    if (r) sem.push({ s, k: claveDe(r) });
  }
  if (!sem.length) return null;
  const semestres = [...new Set(sem.map(x => x.s))].sort((a, b) => a - b);
  const n = Object.fromEntries(semestres.map(s => [s, sem.filter(x => x.s === s).length]));
  const otra = sem.filter(x => !clasif.some(c => c.id === x.k));
  const cats = [...clasif, ...(otra.length ? [{ id: '', etq: 'Otra combinación', color: '#8A94A0' }] : [])];
  const cuenta = (c, s) => sem.filter(x => x.s === s && (c.id === '' ? !clasif.some(k => k.id === x.k) : x.k === c.id)).length;
  return h('div', {}, h('hr'), h('h3', {}, '¿Qué niveles se trabajan en cada semestre?'),
    h('p', { class: 'leyenda' }, `Para cada semestre, qué porcentaje de los RA que se trabajan en sus asignaturas (Paso 5) declara cada nivel de la taxonomía ${tax}, elegida arriba. ` +
      'Un RA cuenta una vez por matriz y semestre. Debajo de cada semestre aparece cuántos RA se contaron; con pocos RA los porcentajes varían mucho.'),
    grafico(cats.map(c => ({ type: 'bar', name: c.etq, x: semestres, y: semestres.map(s => Math.round(1000 * cuenta(c, s) / n[s]) / 10), marker: { color: c.color },
      text: semestres.map(s => (cuenta(c, s) / n[s] >= 0.08 ? `${Math.round(100 * cuenta(c, s) / n[s])} %` : '')), textposition: 'inside', insidetextanchor: 'middle', textfont: { size: 10 },
      customdata: semestres.map(s => [cuenta(c, s), n[s]]), hovertemplate: `Semestre %{x}<br>${c.etq}: %{y} % (%{customdata[0]} de %{customdata[1]} RA)<extra></extra>` })),
    { height: 380, barmode: 'stack', xaxis: { title: 'Semestre', tickmode: 'array', tickvals: semestres, ticktext: semestres.map(s => `${s}<br>(${n[s]} RA)`) }, yaxis: { range: [0, 100], ticksuffix: ' %', title: '% de los RA del semestre' },
      margin: { l: 60, r: 10, t: 10, b: 70 }, legend: { orientation: 'h', y: -0.28, font: { size: 10.5 } }, plot_bgcolor: 'white' }));
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
    botonDescarga('Descargar el contraste (Excel)', async () => descargar('taxonomias_contraste.xlsx', await libroTaxonomias({ ra, grupos, etiqueta, alcance: 'RA únicos de las matrices de la vista' }), MIME_XLSX)));
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
